// 皇居ランナー: ロードバイクで皇居を一周 (二重橋前 → 大手門 → 竹橋 → 九段下 → 千鳥ヶ淵 → 半蔵門 → 三宅坂 → 桜田門 → 二重橋前)
import * as THREE from '../vendor/three.module.min.js';
import { Course, LANE_W } from './course.js';
import { ll } from './city.js';
import { Terrain } from './terrain.js';
import { createWorld, TOD_NAMES } from './world.js';
import { Crowd, Bike, CAR_TYPES, carGeometry, lightsGeometry, motoGeometry, carriageGeometry, runnerColors, walkerColors, samuraiColors, hikyakuColors } from './actors.js';
import { Sfx, Bgm } from './audio.js';
import { Chaser } from './oni.js';
import { Fireworks } from './fireworks.js';
import { WATER } from './water-data.js';

const $ = (id) => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) document.body.classList.add('touch');
const DEBUG = location.search.includes('debug');
// ?tour: 見せ場ツアー (見せ場を順に自動で回る。ぶつかってもゲームオーバーにならない)
const TOUR = location.search.includes('tour');
const store = {
  get(k, d) { try { const v = localStorage.getItem('kokyo.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kokyo.' + k, JSON.stringify(v)); } catch (e) { /* 保存できなくても遊べる */ } },
};
const kmh = (v) => v * 3.6;
const fmtTime = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };

// ---------- 速さ (m/s) ----------
const V_CRUISE = 40 / 3.6;  // ふつうに走る (自動でこぐ。体力は使わない)
const V_DASH = 62 / 3.6;    // ダッシュでこいで出せる速さ (下り坂ではもっと出る)
const V_WALK = 22 / 3.6;    // 歩道の上
const G_AMP = 3.5;          // 坂の効き目 (三宅坂の下りで時速80km くらい)
const DRAG = 0.0022;        // 空気抵抗 (v^2)
// 当たり判定の左右の幅 (自転車の中心から相手の中心まで)。
// 深く当たったら衝突 (ゲームオーバー)、端をかすめただけなら「かすった」(効果音を変えて減速)
const HIT_PERSON = 0.24, GRAZE_PERSON = 0.42;   // 人
const HIT_VEH = -0.1, GRAZE_VEH = 0.15;         // 車とバイク (車幅の半分 + この値)
const GRAZE_SLOW = 0.55;                        // かすったときに残る速さの割合
const DASH_DRAIN = 22, DASH_RECOVER = 14; // 体力 (100) の減り方・戻り方 /秒

// ステージ = 時間帯。朝 (ふつう) → 昼 → 夕方 → 夜 の順に人も車も増える。ゴールすると次のステージが開く
const STAGES = ['morning', 'day', 'dusk', 'night'];
const DIFF = {
  morning: { runners: 9, walkers: 5, carGap: 54, motoGap: 270, motoBehind: 11, carV: [11, 14.5] },
  day: { runners: 11, walkers: 6, carGap: 46, motoGap: 230, motoBehind: 9.5, carV: [11.5, 15] },
  dusk: { runners: 13, walkers: 7, carGap: 40, motoGap: 195, motoBehind: 8, carV: [12, 15.5] },
  night: { runners: 15, walkers: 8, carGap: 34, motoGap: 160, motoBehind: 6.5, carV: [12.5, 16.5] },
};

// ---------- 描画の準備 ----------
const renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance', stencil: true });
let pixelRatio = Math.min(devicePixelRatio, isTouch ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight);
$('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.2, 12000);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

const loadMsg = (m) => { const e = $('loadMsg'); if (e) e.textContent = m; };
loadMsg('コースを作っています…');
const course = new Course();
const terrain = new Terrain(course);
loadMsg('街を組み立てています…');
const world = createWorld({ renderer, scene, course, terrain, isTouch });
const crowd = new Crowd(scene, 460);
const bike = new Bike(scene);
const oni = new Chaser(scene);
const fireworks = new Fireworks(scene);
function launchFireworks(n, big, gap) { for (const t of fireworks.show(camera, n, big, gap)) sfx.firework(t); }
const sfx = new Sfx();
const bgm = new Bgm(sfx);
const SAKURADA = course.labels.find((l) => l.name === '桜田門').s;
const EVENT_S = SAKURADA - 18; // 行列が横断する所 (警視庁の前 → 外桜田門)
const KUDAN = [course.labels.find((l) => l.name === '九段下').s, course.labels.find((l) => l.name === '九段坂上').s];
const MIYAKE = [course.labels.find((l) => l.name === '国立劇場').s, SAKURADA - 150];
// 千鳥ヶ淵の歩道は石畳 (ずっとガタガタして、少しだけ遅くなる)
const COBBLE = [course.labels.find((l) => l.name === '九段坂上').s + 15, course.labels.find((l) => l.name === '千鳥ヶ淵交差点').s - 10];
// ---------- 見せ場: 名所が見えるカメラ (プレイヤーの後ろからは保ったまま、少し高く引いて名所の方へ目を向ける) ----------
const lab = (n) => course.labels.find((l) => l.name === n).s;
const at = (x, z, h) => [x, terrain.at(x, z) + h, z];
// mode: 'behind' (後ろから、少し高く引いて名所へ目を寄せる) / 'side' (通過するときだけ横から、プレイヤー越しに名所を見る)
// 名所にいちばん近づく所 (side の中心)
const closestS = (p, a, b) => { let best = a, bd = 1e18; for (let d = a; d <= b; d += 2) { const f = course.frame(d); const q = (f.x - p[0]) ** 2 + (f.z - p[2]) ** 2; if (q < bd) { bd = q; best = d; } } return best; };
const sideAt = (name, p, a, b, half = 55, opt = {}) => { const c = closestS(p, a, b); return { name, mode: 'side', s0: c - half, s1: c + half, c, p, dist: 9, look: 0.08, up: 2.4, ...opt }; };
// 千鳥ヶ淵の見せ場: お濠の上 (道路の左 70m)
const chidoriView = (() => { const d = lab('千鳥ヶ淵') - 40; const p = course.world(d, course.walkEdge(d) - 70); return [p.x, p.y - 2, p.z]; })();
const balloonSide = sideAt('テックジム東京本校', world.balloonPos, lab('半蔵門') - 100, lab('三宅坂'), 45, { dist: 14, look: 0.5, up: 16, fov: 70, labelUp: 75 });
const SHOW = [
  sideAt('東京駅 丸の内駅舎', at(...world.tstation.pos, 18), lab('二重橋前'), lab('大手門'), 40, { dist: 26, up: 14, look: 0.2, fov: 30, labelUp: 26, clear: 21 }),
  sideAt('大手門', [world.castle.otemon.pos[0], world.castle.otemon.y + 8, world.castle.otemon.pos[1]], lab('和田倉門'), lab('竹橋'), 45, { clear: 20, look: 0.25, dist: 12, up: 3.5, fov: 55, labelUp: 16 }),
  sideAt('和気清麻呂像', [world.wake.pos[0], world.wake.y + 10, world.wake.pos[1]], lab('大手門'), lab('竹橋'), 35, { clear: 12, look: 0.25, dist: 9, up: 2.5, fov: 55, labelUp: 6 }),
  sideAt('平川門', at(...world.castle.hirakawa, 10), lab('大手門'), lab('竹橋'), 45, { clear: 18, look: 0.12 }),
  // 九段坂を上がるところ: 斜め後ろから武道館
  { name: '日本武道館', mode: 'diag', s0: lab('九段下') + 110, s1: lab('田安門') - 35, p: at(...world.budokan.pos, 30), up: 9, look: 0.5, clear: 26 },
  sideAt('日本武道館', at(...world.budokan.pos, 30), lab('九段下'), lab('九段坂上'), 60, { dist: 16, up: 4, fov: 50, clear: 30 }), // 田安門の前で横から
  sideAt('千鳥ヶ淵', chidoriView, lab('九段坂上'), lab('千鳥ヶ淵交差点'), 60, { dist: 10, up: 3.5, look: 0.35, fov: 62, labelUp: 14 }),
  // 半蔵門: 近づくところで斜め後ろから (土手の上の門と石垣)
  (() => { const p = [world.castle.hanzo.pos[0], world.castle.hanzo.y + 4, world.castle.hanzo.pos[1]]; const c = closestS(p, lab('千鳥ヶ淵交差点'), lab('国立劇場')); return { name: '半蔵門', mode: 'diag', s0: c - 90, s1: c + 5, p, up: 6, look: 0.45, clear: 18, labelUp: 10 }; })(),

  // 国会議事堂: 桜田門の手前、国会前の交差点で、国会議事堂正門前の通りの奥 (進行方向の後ろ) に見える。このシーンだけ前アングル
  (() => {
    const p = at(...ll(35.67590, 139.74480), 40);
    let best = lab('三宅坂'), bc = 2;
    for (let d = lab('三宅坂'); d < lab('桜田門'); d += 4) {
      const f = course.frame(d), dx = p[0] - f.x, dz = p[2] - f.z;
      const c = (dx * f.tx + dz * f.tz) / Math.hypot(dx, dz); // -1 がまうしろ
      if (c < bc) { bc = c; best = d; }
    }
    return { name: '国会議事堂', mode: 'front', s0: best - 45, s1: best + 45, c: best, p, look: 0.14, fov: 34, up: 3.2, dist: 20, clear: 30 };
  })(),
  balloonSide,
  sideAt('桜田門', [world.castle.sakurada.pos[0], world.castle.sakurada.y + 9, world.castle.sakurada.pos[1]], lab('三宅坂'), lab('祝田橋'), 40, { clear: 20, look: 0.25, dist: 12, up: 3.5, fov: 55 }),
  sideAt('二重橋', world.nijubashi.pos.toArray(), lab('祝田橋'), course.L - 20, 55, { clear: 30, look: 0.35, up: 4, dist: 30, fov: 13, labelUp: 14 }),
].map((o) => ({ ...o, v: new THREE.Vector3(...o.p) }));
// 見せ場の視線 (カメラ → プレイヤー → 名所) をさえぎる木を取り除く
world.clearTrees(SHOW.map((o) => {
  const c = o.mode === 'side' ? o.c : (o.s0 + o.s1) / 2;
  const f = course.frame(c);
  const ax = o.v.x - f.x, az = o.v.z - f.z, l = Math.hypot(ax, az) || 1;
  const back = o.mode === 'side' ? (o.dist || 9) + 8 : 12;
  return [f.x - ax / l * back, f.z - az / l * back, o.v.x - ax / l * 25, o.v.z - az / l * 25, o.clear || (o.mode === 'side' ? 14 : 10)];
}));
function showcase(d) {
  let best = null, w = 0;
  for (const o of SHOW) {
    const R = o.mode === 'side' ? 25 : 60; // 切り替えにかける距離
    const k = Math.min(1, (d - o.s0) / R, (o.s1 - d) / R);
    if (k > w) { w = k; best = o; }
  }
  return { o: best, w: Math.max(0, w) };
}

// 千鳥ヶ淵の道: 一方通行を逆に走る狭い道 (車もバイクも向こうから来る)。歩道は石畳で歩行者が多い。どちらを通るか選ぶ難しい区間
const inChidori = (d) => { const x = ((d % course.L) + course.L) % course.L; return x > COBBLE[0] - 20 && x < COBBLE[1] + 10; };
const onCobble = (d, u) => d > COBBLE[0] && d < COBBLE[1] && u < course.leftEdge(d);

// 影 (足元の丸)
const blobGeo = new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
const bikeShadow = new THREE.Mesh(blobGeo, blobMat);
bikeShadow.scale.set(0.35, 1, 0.9);
scene.add(bikeShadow);

// ---------- 時間帯 ----------
let unlocked = store.get('unlocked', 0); // 開いているステージ (0: 朝だけ)
let tod = store.get('tod', 'morning');
if (!(STAGES.indexOf(tod) >= 0 && STAGES.indexOf(tod) <= unlocked)) tod = 'morning';
function setTod(k) {
  if (STAGES.indexOf(k) > unlocked) { flash('🔒 前のステージをゴールすると開きます', 1.6); return; }
  tod = k;
  world.applyTod(k);
  headMat.opacity = k === 'night' ? 1 : k === 'dusk' ? 0.7 : 0.25;
  document.querySelectorAll('#tod button').forEach((b) => {
    const i = STAGES.indexOf(b.dataset.v);
    b.classList.toggle('on', b.dataset.v === k);
    b.classList.toggle('locked', i > unlocked);
    b.textContent = (i > unlocked ? '🔒 ' : '') + TOD_NAMES[b.dataset.v];
  });
  store.set('tod', k);
  showBest();
}

// ---------- 車とバイク ----------
const vehMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.25, fog: false });
const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
const kagoGeo = carriageGeometry();
const MOTO_COLORS = [0xd8342c, 0x111111, 0x1e88ff, 0xf2f2f2, 0x2c8a4b];

// ---------- ゲームの状態 ----------
const P = { D: 0, U: -1.6, v: 0, lat: 0, stamina: 100, dashLock: false, onWalk: false };
const game = {
  state: 'title', t: 0, countdown: 0, score: 0, passed: 0, nearMiss: 0, maxSpeed: 0,
  people: [], vehicles: [], frontier: 0, laneTimers: [0, 0, 0, 0], motoTimer: 0, motoBehindTimer: 0,
  event: null, msgT: 0, lastLabel: null, crashT: 0, crashBy: '', dashHeld: false, finishT: 0, shake: 0,
};
let seed = 12345;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + rnd() * (b - a);
const expGap = (mean) => -Math.log(1 - rnd() * 0.999) * mean;

// 人を置く。kind 0: ランナー (ソロ・2人組・3人組・疲れて歩いている人・飛脚)、1: 歩行者
// 2人組・3人組は並んで走るので、間はすり抜けられない
function addPerson(d, u, v, kind, opt = {}) {
  const tired = opt.tired, hik = opt.hikyaku;
  const p = {
    d, u, tu: u, v, kind, stand: !!opt.stand, phase: rnd() * 6.3, drift: rr(2, 8), passed: d < P.D + 1, grp: opt.grp || null, off: opt.off || 0,
    c: hik ? hikyakuColors() : kind === 0 ? runnerColors(rnd) : walkerColors(rnd),
    amp: tired || kind === 1 ? 0.45 : 1, lean: tired ? 0.12 : kind === 0 ? 0.18 : 0.02, hikyaku: hik,
  };
  game.people.push(p);
  return p;
}
function spawnRunners(d) {
  const L = course.leftEdge(d), R = course.runnerRight(d);
  const r = rnd();
  if (r < 0.04) { addPerson(d, rr(L + 0.6, R - 0.6), rr(4.6, 5.6), 0, { hikyaku: true }); return; }          // 飛脚
  if (r < 0.2) { addPerson(d, rr(L + 0.5, R - 0.5), rr(1.1, 1.8), 0, { tired: true }); return; }             // 疲れて歩いている
  const n = r < 0.62 ? 1 : r < 0.86 ? 2 : 3;
  const v = n === 1 ? rr(2.0, 4.9) : rr(2.3, 3.6);
  const w = (n - 1) * 0.62; // 並んで走る間隔 (すり抜けられない)
  const u0 = rr(L + 0.5, Math.max(L + 0.5, R - 0.5 - w));
  if (n === 1) { addPerson(d, u0, v, 0); return; }
  const grp = { tu: u0 + w / 2, drift: rr(3, 9), w, members: [] };
  for (let k = 0; k < n; k++) grp.members.push(addPerson(d + rr(-0.15, 0.15), u0 + k * 0.62, v, 0, { grp, off: k * 0.62 - w / 2 }));
}
function spawnWalker(d) {
  const L = course.leftEdge(d), Wk = course.walkEdge(d);
  const stand = rnd() < 0.1;
  addPerson(d, rr(Wk + 0.6, L - 0.5), stand ? 0 : rr(0.9, 1.6), 1, { stand });
}
// 前の方に人を足していく (ランナーはランナーの車線の数に比例)
function fillPeople(to) {
  const D = DIFF[tod];
  while (game.frontier < to) {
    const nl = Math.max(1, (course.runnerRight(game.frontier) - course.leftEdge(game.frontier)) / LANE_W);
    const ch = inChidori(game.frontier);
    const rr0 = D.runners * nl / 2 * (ch ? 1.3 : 1), wk = D.walkers * (ch ? 1.8 : 1), rate = (rr0 + wk) / 100; // 1m あたり
    game.frontier += expGap(1 / rate);
    const d = game.frontier;
    // スタート直後のすぐ前は空けておく
    if (game.state !== 'play' && d > P.D - 5 && d < P.D + 25) continue;
    if (d > P.D - 4 && d < P.D + 8) continue;
    if (rnd() < wk / (rr0 + wk)) spawnWalker(d); else spawnRunners(d);
  }
}

function makeVehicle(kind, dir, d, u, v, lane) {
  let mesh, len, wid, head, tail;
  if (kind === 'car') {
    const pool = [];
    for (const t of CAR_TYPES) for (let i = 0; i < t.w; i++) pool.push(t);
    const type = pool[Math.floor(rnd() * pool.length)];
    const color = type.colors[Math.floor(rnd() * type.colors.length)];
    mesh = new THREE.Mesh(carGeometry(type, color), vehMat);
    len = type.len; wid = type.wid;
    const lg = lightsGeometry(len, wid, type.name === 'bus' ? 0.9 : 0.72);
    head = new THREE.Mesh(lg.head, headMat); tail = new THREE.Mesh(lg.tail, tailMat);
    mesh.add(head, tail);
    if (type.name === 'bus') v *= 0.85;
  } else {
    mesh = new THREE.Mesh(motoGeometry(new THREE.Color(MOTO_COLORS[Math.floor(rnd() * MOTO_COLORS.length)]), new THREE.Color([0x222222, 0x3a3f4b, 0x7a1c1c][Math.floor(rnd() * 3)])), vehMat);
    len = 1.9; wid = 0.7;
    const lg = lightsGeometry(len, 0.5, 0.95);
    head = new THREE.Mesh(lg.head, headMat); tail = new THREE.Mesh(lg.tail, tailMat);
    mesh.add(head, tail);
  }
  scene.add(mesh);
  const o = { kind, dir, d, u, tu: u, v, v0: v, lane, len, wid, mesh, passed: false, honk: false, warned: false };
  game.vehicles.push(o);
  return o;
}
// 対向車線の k 番目の車線の真ん中
const carLaneU = (k, d) => Math.min((k + 0.5) * LANE_W, (course.nr(d) - 0.5) * LANE_W);
// 一方通行 (301号) の車の車線 (k = 1..3。0 はランナー)
const owLaneU = (k, d) => course.leftEdge(d) + (k + 0.5) * LANE_W;
function spawnCar(k, d) {
  if (course.oneway(d) || course.nr(d) < k + 0.6) return;
  const [a, b] = DIFF[tod].carV;
  makeVehicle('car', -1, d, carLaneU(k, d), rr(a, b), k);
}
// 後ろから追い抜いていく車 (301号の一方通行)
function spawnCarBehind(k, d) {
  if (!course.oneway(d)) return;
  const o = makeVehicle('car', 1, d, owLaneU(k, d), rr(14, 18.5), k);
  o.ow = true;
}
function spawnMoto(dir, d) {
  // 中央線の上、または車線と車線の間 (すり抜け)。一方通行の区間は追い抜きだけ
  const ow = course.oneway(d);
  if (dir < 0 && ow) return;
  let u;
  if (ow) u = course.leftEdge(d) + LANE_W * (1 + Math.floor(rnd() * 3));
  else if (dir < 0) u = course.nr(d) < 0.9 ? rr(0.2, 0.5) : course.nr(d) > 1.6 && rnd() < 0.4 ? LANE_W : rr(-0.15, 0.25);
  else u = course.nl(d) > 1.6 && rnd() < 0.4 ? -LANE_W : rr(-0.25, 0.15);
  const o = makeVehicle('moto', dir, d, u, dir < 0 ? rr(13, 17) : rr(19, 24), -1);
  o.ow = ow;
}
function clearActors() {
  fireworks.clear();
  for (const o of game.vehicles) scene.remove(o.mesh);
  game.vehicles.length = 0;
  game.people.length = 0;
  if (game.event) for (const k of game.event.kagos) scene.remove(k.mesh);
  game.event = null;
}

// ---------- スペシャルイベント: 桜田門外の変 (井伊直弼の行列が警視庁の前から外桜田門へ横断) ----------
function startEvent() {
  const ev = { members: [], kagos: [], speed: 1.25, t: 0, said: false };
  const R = course.rightEdge(EVENT_S) + 2;
  // 行列の並び (u の向きに): 毛槍・徒士・駕籠・徒士… ところどころに すり抜けられる隙間 (4m)
  const plan = ['yari', 'yari', 'yari', 'gap', 'samurai', 'samurai', 'samurai', 'samurai', 'gap', 'samurai', 'samurai', 'kago', 'samurai', 'samurai', 'gap', 'gap',
    'samurai', 'samurai', 'samurai', 'gap', 'yari', 'yari', 'samurai', 'samurai', 'samurai', 'gap', 'samurai', 'samurai', 'samurai', 'samurai', 'gap', 'yari', 'samurai', 'samurai', 'samurai'];
  let off = 0;
  for (const it of plan) {
    if (it === 'gap') { off += 4.2; continue; }
    if (it === 'kago') {
      // 井伊直弼の馬車 (馬が前 = u の小さい方)。両わきに供の侍
      const k = { off: off + 4.4, mesh: new THREE.Mesh(kagoGeo, vehMat) };
      scene.add(k.mesh);
      ev.kagos.push(k);
      for (const [dd, oo] of [[-1.6, 1.0], [1.6, 1.0], [-1.6, 4.4], [1.6, 4.4]]) ev.members.push({ off: off + oo, dd, c: samuraiColors(rnd, 1), spear: false });
      off += 6.8;
      continue;
    }
    for (const dd of [-0.65, 0.65]) ev.members.push({ off, dd, c: samuraiColors(rnd, it === 'kago'), spear: it === 'yari' });
    off += 1.35;
  }
  ev.head = R;
  ev.len = off;
  game.event = ev;
  flash('⚠ 桜田門外の変！ 井伊直弼の行列が横断中', 4, 'warn');
  try {
    if ('speechSynthesis' in window && !sfx.muted) {
      const u = new SpeechSynthesisUtterance('したにー、したにー');
      u.lang = 'ja-JP'; u.rate = 0.7; u.pitch = 0.6;
      speechSynthesis.speak(u);
    }
  } catch (e) { /* 読み上げできなくても遊べる */ }
}
// 行列がふさいでいる横の範囲 (s のあたりに来た人や車を止める)
function eventBlocks(u, margin = 1) {
  const ev = game.event;
  if (!ev) return false;
  return u > ev.head - margin && u < ev.head + ev.len + margin;
}

// ---------- 稲妻 (鬼が降りてくるとき) ----------
const bolt = (() => {
  const mat = new THREE.MeshBasicMaterial({ color: 0xfff6b0, transparent: true, opacity: 1, fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, mat, t: 0 };
})();
function strike(big) {
  // 鬼の手から、プレイヤーのそばの地面へ、ジグザグの光の帯
  const from = oni.g.position.clone().add(new THREE.Vector3(0, 3, 0));
  const f = course.world(P.D + (big ? 0 : Math.random() * 6 - 1), P.U + (big ? 0 : (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 2)), {});
  const to = new THREE.Vector3(f.x, f.y, f.z);
  const pts = [], N = 10;
  for (let i = 0; i <= N; i++) {
    const p = from.clone().lerp(to, i / N);
    if (i > 0 && i < N) p.add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 3));
    pts.push(p);
  }
  const pos = [], w = big ? 0.6 : 0.35;
  const side = new THREE.Vector3().subVectors(camera.position, from).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(w);
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[i + 1];
    const A1 = a.clone().add(side), A2 = a.clone().sub(side), B1 = b.clone().add(side), B2 = b.clone().sub(side);
    pos.push(...A1.toArray(), ...A2.toArray(), ...B2.toArray(), ...A1.toArray(), ...B2.toArray(), ...B1.toArray());
  }
  bolt.mesh.geometry.dispose();
  bolt.mesh.geometry = new THREE.BufferGeometry();
  bolt.mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bolt.mesh.visible = true;
  bolt.t = big ? 0.6 : 0.3;
  $('flashFx').classList.remove('on'); void $('flashFx').offsetWidth; $('flashFx').classList.add('on');
  sfx.thunder(big);
  game.shake = Math.max(game.shake, big ? 0.5 : 0.2);
  try { if (navigator.vibrate) navigator.vibrate(big ? 200 : 60); } catch (e) { /* 振動できない端末 */ }
}

// ---------- 雪 (桜田門外の変は雪の日だった) ----------
const snow = (() => {
  const N = isTouch ? 1200 : 2500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 80; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 80; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0, depthWrite: false });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  scene.add(pts);
  return { pts, pos, N, m };
})();

// ---------- 入力 ----------
const keys = new Set();
const touch = { left: false, right: false, brake: false, dash: false };
addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyR' && (game.state === 'play' || game.state === 'result' || game.state === 'pause')) startGame();
  if ((e.code === 'Enter' || e.code === 'Space') && game.state === 'title') startGame();
});
addEventListener('keyup', (e) => keys.delete(e.code));
const steerInput = () => (keys.has('ArrowLeft') || keys.has('KeyA') || touch.left ? -1 : 0) + (keys.has('ArrowRight') || keys.has('KeyD') || touch.right ? 1 : 0);
const brakeInput = () => keys.has('ArrowDown') || keys.has('KeyS') || touch.brake;
const dashInput = () => keys.has('ArrowUp') || keys.has('KeyW') || keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('Space') || touch.dash;
for (const [id, k] of [['tLeft', 'left'], ['tRight', 'right'], ['tBrake', 'brake'], ['tDash', 'dash']]) {
  const el = $(id);
  const on = (e) => { e.preventDefault(); touch[k] = true; el.classList.add('on'); sfx.resume(); };
  const off = (e) => { e.preventDefault(); touch[k] = false; el.classList.remove('on'); };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
}

// ---------- 画面 ----------
let flashTimer = null;
function flash(text, sec = 1.4, cls = '') {
  const el = $('msg');
  el.textContent = text;
  el.className = 'show ' + cls;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.className = ''; }, sec * 1000);
}
function popup(text, cls = '') {
  const el = document.createElement('div');
  el.className = 'pop ' + cls;
  el.textContent = text;
  $('pops').appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
function showBest() {
  const b = store.get('best.' + tod, null);
  $('best').textContent = b ? `ベスト（${TOD_NAMES[tod]}）: ${fmtTime(b.time)}　スコア ${b.score}` : `ベスト（${TOD_NAMES[tod]}）: まだ記録なし`;
}
function toggleMute() {
  sfx.setMuted(!sfx.muted);
  $('muteBtn').textContent = sfx.muted ? '🔇' : '🔊';
  if (sfx.muted) bgm.stop(); else if (game.state === 'play') bgm.start();
}
function togglePause() {
  if (game.state === 'play' || game.state === 'countdown') { game.prevState = game.state; game.state = 'pause'; $('pause').classList.remove('hidden'); bgm.stop(); }
  else if (game.state === 'pause') { game.state = game.prevState; $('pause').classList.add('hidden'); if (!sfx.muted) bgm.start(); }
}
$('startBtn').onclick = () => startGame();
$('retryBtn').onclick = () => startGame();
$('titleBtn').onclick = () => toTitle();
$('pauseBtn').onclick = () => togglePause();
$('resumeBtn').onclick = () => togglePause();
$('quitBtn').onclick = () => { $('pause').classList.add('hidden'); toTitle(); };
$('muteBtn').onclick = () => toggleMute();
document.querySelectorAll('#tod button').forEach((b) => { b.onclick = () => setTod(b.dataset.v); });
$('nextBtn').onclick = () => { const i = STAGES.indexOf(tod); if (i < unlocked) { setTod(STAGES[i + 1]); startGame(); } };
$('shareBtn').onclick = () => {
  const text = $('shareText').textContent;
  const url = location.href.split('?')[0];
  if (navigator.share) navigator.share({ text, url }).catch(() => {});
  else open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank');
};

function toTitle() {
  game.state = 'title';
  clearActors();
  $('title').classList.remove('hidden');
  $('result').classList.add('hidden');
  $('hud').classList.add('hidden');
  bgm.stop();
  showBest();
  resetPlayer();
  game.frontier = P.D - 40;
  fillPeople(P.D + 360);
  initTraffic();
  oni.reset('morning', P.D);
}
function resetPlayer() {
  P.D = -14; P.U = course.leftEdge(0) + 1.6; P.v = 0; P.lat = 0; P.stamina = 100; P.dashLock = false; P.onWalk = false;
}
function initTraffic() {
  const D = DIFF[tod];
  for (let k = 0; k < 4; k++) {
    let d = P.D + 30 + rnd() * 30;
    while (d < P.D + 420) { spawnCar(k, d); d += D.carGap * (0.5 + rnd()); }
    game.laneTimers[k] = rnd() * 2;
  }
  let d = P.D + 80;
  while (d < P.D + 420) { spawnMoto(-1, d); d += D.motoGap * (0.5 + rnd()); }
  // 一方通行の区間: 前を走っている車
  for (let k = 1; k < 4; k++) {
    let d2 = P.D + 20 + rnd() * 40;
    while (d2 < P.D + 400) { spawnCarBehind(k, d2); d2 += D.carGap * 1.4 * (0.5 + rnd()); }
  }
  game.carBehindTimer = 1;
  game.motoTimer = 3;
  game.motoBehindTimer = D.motoBehind * 0.6;
}
function startGame() {
  sfx.resume();
  clearActors();
  seed = (Date.now() % 100000) + 1;
  resetPlayer();
  Object.assign(game, { state: 'countdown', countdown: 3.2, t: 0, grazes: 0, score: 0, passed: 0, nearMiss: 0, maxSpeed: 0, lastLabel: null, crashT: 0, eventDone: false, finishT: 0 });
  game.frontier = P.D - 40;
  fillPeople(P.D + 360);
  initTraffic();
  oni.reset(tod, P.D);
  game.oniGap = Infinity;
  $('title').classList.add('hidden');
  $('result').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (!sfx.muted) bgm.start();
  flash('二重橋前 スタート！ 大手門へ', 2);
}

function finish(ok) {
  game.state = 'result';
  bgm.stop();
  const dist = Math.min(course.L, P.D);
  let title, stars = 0;
  if (ok) {
    sfx.finish();
    const t = game.t;
    stars = t < 8 * 60 ? 3 : t < 9.5 * 60 ? 2 : 1;
    game.score += Math.max(0, Math.round((12 * 60 - t) * 20));
    title = '🏁 皇居一周 ゴール！';
    // ゴールの花火 (何回かに分けて、大きいのも)
    launchFireworks(5, false, 0.3);
    setTimeout(() => launchFireworks(4, true, 0.45), 1400);
    setTimeout(() => launchFireworks(7, false, 0.22), 2900);
    setTimeout(() => launchFireworks(3, true, 0.5), 4300);
    flash('🎆 ゴール！', 2.5, 'place');
  } else title = '💥 ' + game.crashBy;
  const score = Math.round(game.score);
  $('resTitle').textContent = title;
  $('resStars').textContent = ok ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
  $('resTime').textContent = ok ? fmtTime(game.t) : `${(dist / 1000).toFixed(2)} km 地点（${course.labelAt(dist)?.name || ''}のあたり）`;
  $('resStats').innerHTML = `スコア <b>${score}</b><br>抜いた人 ${game.passed} 人 ／ ヒヤリ ${game.nearMiss} 回 ／ かすった ${game.grazes || 0} 回 ／ 最高 時速${Math.round(kmh(game.maxSpeed))}km`;
  let best = store.get('best.' + tod, null), isBest = false;
  if (ok && (!best || game.t < best.time)) { best = { time: game.t, score }; store.set('best.' + tod, best); isBest = true; }
  $('resBest').textContent = isBest ? '🎉 ベストタイム更新！' : best ? `ベスト ${fmtTime(best.time)}` : '';
  // ゴールしたら次のステージが開く
  const si = STAGES.indexOf(tod);
  if (ok && si === unlocked && unlocked < STAGES.length - 1) {
    unlocked++;
    store.set('unlocked', unlocked);
    $('resBest').textContent += `　🔓 次のステージ「${TOD_NAMES[STAGES[unlocked]]}」が開きました！`;
  }
  $('nextBtn').classList.toggle('hidden', !(ok && si < unlocked));
  if (ok && si === STAGES.length - 1) $('resBest').textContent += '　🏆 全ステージ制覇！';
  $('shareText').textContent = ok
    ? `#皇居ランナー でロードバイク皇居一周 ${fmtTime(game.t)}（${TOD_NAMES[tod]}のステージ）${'★'.repeat(stars)} スコア${score}`
    : `#皇居ランナー で${(dist / 1000).toFixed(2)}km 地点で${game.crashBy}…（${TOD_NAMES[tod]}のステージ）`;
  setTimeout(() => $('result').classList.remove('hidden'), ok ? 4200 : 1400);
}

// かすった: ゲームオーバーにはせず、ガリッという音と減速 (同じ相手には1回だけ)
function graze(o) {
  if (o.grazed || game.state !== 'play') return;
  o.grazed = true;
  P.v *= GRAZE_SLOW;
  game.grazes = (game.grazes || 0) + 1;
  game.shake = Math.max(game.shake, 0.3);
  sfx.graze();
  popup('かすった！', 'graze');
  try { if (navigator.vibrate) navigator.vibrate([20, 20, 40]); } catch (e) { /* 振動できない端末 */ }
}

function crash(by) {
  if (game.state !== 'play') return;
  if (TOUR || location.search.includes('nocrash')) return;
  game.state = 'crash';
  game.crashBy = by;
  game.crashT = 0;
  sfx.crash();
  flash(by, 2, 'warn');
  setTimeout(() => finish(false), 300);
}

// ---------- ミニマップ (お濠とコース。進行方向が上) ----------
const mini = (() => {
  const S = 0.32; // px / m
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < course.N; i += 10) { x0 = Math.min(x0, course.X[i]); x1 = Math.max(x1, course.X[i]); z0 = Math.min(z0, course.Z[i]); z1 = Math.max(z1, course.Z[i]); }
  x0 -= 400; x1 += 400; z0 -= 400; z1 += 400;
  const c = document.createElement('canvas');
  c.width = Math.ceil((x1 - x0) * S); c.height = Math.ceil((z1 - z0) * S);
  const g = c.getContext('2d');
  g.fillStyle = '#e9ece4'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#9dc3d6';
  for (const poly of WATER) {
    g.beginPath();
    for (const ring of poly) { for (let i = 0; i < ring.length; i += 2) { const x = (ring[i] / 2 - x0) * S, y = (ring[i + 1] / 2 - z0) * S; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); }
    g.fill('evenodd');
  }
  g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i <= course.N; i += 3) { const k = i % course.N; const x = (course.X[k] - x0) * S, y = (course.Z[k] - z0) * S; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.closePath(); g.stroke();
  g.strokeStyle = '#e0533d'; g.lineWidth = 2.5; g.stroke();
  const el = $('minimap'), ctx = el.getContext('2d');
  return {
    draw() {
      const W = el.width, H = el.height, f = course.frame(P.D);
      const px = (f.x - x0) * S, py = (f.z - z0) * S;
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); ctx.clip();
      ctx.translate(W / 2, H / 2 + 20);
      ctx.rotate(-Math.atan2(f.tx, -f.tz));
      ctx.translate(-px, -py);
      ctx.drawImage(c, 0, 0);
      // 車・バイク
      for (const o of game.vehicles) {
        const p = course.world(o.d, o.u);
        ctx.fillStyle = o.kind === 'car' ? '#3355aa' : '#aa3366';
        ctx.fillRect((p.x - x0) * S - 2, (p.z - z0) * S - 2, 4, 4);
      }
      ctx.restore();
      // 自分 (青い矢印)
      ctx.fillStyle = '#1e6bff';
      ctx.beginPath(); ctx.moveTo(W / 2, H / 2 + 12); ctx.lineTo(W / 2 - 7, H / 2 + 28); ctx.lineTo(W / 2 + 7, H / 2 + 28); ctx.fill();
    },
  };
})();

// ---------- 1コマの更新 ----------
const F = {}, F2 = {};
function step(dt) {
  const D = DIFF[tod];
  const playing = game.state === 'play';
  if (game.state === 'countdown') {
    const before = Math.ceil(game.countdown);
    game.countdown -= dt;
    const after = Math.ceil(game.countdown);
    if (after !== before && after >= 0) { sfx.count(after === 0); $('count').textContent = after > 0 ? after : 'GO!'; $('count').classList.add('show'); }
    if (game.countdown <= 0) { game.state = 'play'; setTimeout(() => $('count').classList.remove('show'), 600); }
  }
  // ---- プレイヤー ----
  if (playing) {
    game.t += dt;
    const steer = steerInput();
    const L = course.leftEdge(P.D), Wk = course.walkEdge(P.D), R = course.rightEdge(P.D);
    // 横の動き (速いほどよく曲がる)
    const latMax = Math.min(5.5, 1.8 + P.v * 0.22);
    P.lat += (steer * latMax - P.lat) * Math.min(1, dt * 9);
    P.U += P.lat * dt;
    if (P.U < Wk + 0.45) { P.U = Wk + 0.45; P.lat = 0; }
    if (P.U > R + 0.2) { P.U = R + 0.2; P.lat = 0; }
    const onWalk = P.U < L;
    if (onWalk !== P.onWalk) {
      // 歩道と車道の段差: ガタッ (音・画面の揺れ・スマホの振動)
      sfx.curb(); game.shake = 0.3; P.v *= 0.94; P.onWalk = onWalk;
      try { if (navigator.vibrate) navigator.vibrate([35, 30, 25]); } catch (e) { /* 振動できない端末 */ }
    }
    // 前の動き: 時速40km までは自動でこぐ (体力は使わない)。ダッシュは体力を使う。坂は実際の勾配で
    const cruise = onWalk ? V_WALK : V_CRUISE;
    let a = 0;
    if (P.v < cruise) a += Math.min((cruise - P.v) * 3, 1 + 2 * (1 - P.v / cruise));
    const wantDash = dashInput() && !brakeInput();
    if (!wantDash) P.dashLock = false;
    // ダッシュ: 時速40km までの加速は体力を使わない (体力ゼロでもできる)。40km を超えて速くするときだけ体力を使う
    const vmax = onWalk ? V_WALK * 1.3 : V_DASH;
    const free = P.v < V_CRUISE;
    // 40km を超えてダッシュを押している間は、最高速 (62km) に達していても体力は減り続ける
    const dashing = wantDash && (free || (P.stamina > 0 && !P.dashLock));
    if (dashing) {
      if (P.v < vmax) a += 3.2;
      if (!free) {
        P.stamina = Math.max(0, P.stamina - DASH_DRAIN * dt);
        if (P.stamina <= 0) { P.dashLock = true; flash('体力ぎれ！ ダッシュを離して回復', 1.2); }
      }
    }
    if (!(dashing && !free)) P.stamina = Math.min(100, P.stamina + DASH_RECOVER * dt);
    game.dashing = dashing && !free;
    const grade = course.grade(P.D);
    a -= 9.8 * grade * G_AMP;
    a -= DRAG * P.v * P.v + 0.05;
    // ダッシュしていないときは、時速40km を超えた分だけ減速して40km に戻る (下り坂 (勾配 -1% より急) では坂の勢いにまかせる)
    if (!dashing && P.v > cruise) a -= (P.v - cruise) * 0.3 * Math.min(1, Math.max(0, (grade + 0.012) / 0.012));
    if (brakeInput()) a -= 8;
    // 石畳: ガタガタ (揺れ・音・振動) と少しの減速
    if (onCobble(P.D, P.U) && P.v > 1) {
      a -= 0.7;
      game.cobT = (game.cobT || 0) - dt;
      if (game.cobT <= 0) {
        game.cobT = Math.max(0.07, 0.6 / (P.v + 1));
        game.shake = Math.max(game.shake, 0.08);
        sfx.cobble();
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* 振動できない端末 */ }
      }
    }
    P.v = Math.max(0, P.v + a * dt);
    P.D += P.v * dt;
    game.maxSpeed = Math.max(game.maxSpeed, P.v);
    game.score += P.v * dt * (dashing ? 1.5 : 1);
    if (P.D >= course.L && !TOUR) { finish(true); }
    // 地名
    const lb = course.labelAt(P.D);
    if (lb && lb !== game.lastLabel) {
      game.lastLabel = lb;
      if (lb.name === '九段坂上') flash('千鳥ヶ淵へ：狭い道は対向車、歩道は石畳。どっちを行く？', 3, 'warn');
      else if (P.D > 5) flash(lb.name, 1.6, 'place');
    }
    if (!game.eventDone && P.D > EVENT_S - 260) { game.eventDone = true; startEvent(); }
  } else if (game.state === 'crash') {
    game.crashT += dt;
    P.v = Math.max(0, P.v - 20 * dt);
    P.D += P.v * dt;
  }
  // ---- 人 ----
  if (game.state !== 'pause') {
    fillPeople(P.D + 360);
    const ev = game.event;
    for (const p of game.people) {
      const L = course.leftEdge(p.d);
      let v = p.v;
      // 行列の手前で止まる
      if (ev && p.d < EVENT_S && p.d > EVENT_S - 4 && eventBlocks(p.u)) v = 0;
      p.d += v * dt;
      p.phase += dt * (p.kind === 0 ? 2.6 * Math.PI * (0.8 + p.v * 0.08) : 2 * Math.PI * 0.9) * (v > 0 ? 1 : 0);
      // ときどき横に少しずれる (組は組ごとに)
      const R = course.runnerRight(p.d);
      if (p.grp) {
        const g = p.grp;
        if (p.off === -g.w / 2) {
          g.drift -= dt;
          if (g.drift < 0) { g.drift = rr(3, 9); g.tu = p.u + g.w / 2 + rr(-1, 1); }
          g.tu = Math.min(R - 0.5 - g.w / 2, Math.max(L + 0.5 + g.w / 2, g.tu));
        }
        p.tu = g.tu + p.off;
      } else {
        p.drift -= dt;
        if (p.drift < 0) {
          p.drift = rr(3, 9);
          p.tu = p.kind === 0 ? p.u + rr(-1.2, 1.2) : p.u + rr(-0.8, 0.8);
        }
        // 車線が減る所では、はみ出さないように寄る
        if (p.kind === 0) p.tu = Math.min(R - 0.5, Math.max(p.tu, L + 0.5)); else p.tu = Math.max(Math.min(p.tu, L - 0.5), course.walkEdge(p.d) + 0.6);
      }
      p.u += Math.max(-0.5, Math.min(0.5, p.tu - p.u)) * dt;
    }
    game.people = game.people.filter((p) => p.d > P.D - 50);
    // ---- 車とバイク ----
    for (let k = 0; k < 4; k++) {
      game.laneTimers[k] -= dt;
      if (game.laneTimers[k] <= 0) {
        game.laneTimers[k] = D.carGap * (inChidori(P.D + 430) ? 0.55 : 1) * (0.4 + rnd() * 1.2) / (12 + Math.max(P.v, 4));
        spawnCar(k, P.D + 430);
      }
    }
    game.carBehindTimer -= dt;
    if (game.carBehindTimer <= 0) {
      game.carBehindTimer = D.carGap * 1.3 * (0.4 + rnd() * 1.2) / Math.max(3, 16 - P.v + 2);
      if (P.v < 15) spawnCarBehind(1 + Math.floor(rnd() * 3), P.D - 120);
    }
    game.motoTimer -= dt;
    if (game.motoTimer <= 0) { game.motoTimer = D.motoGap * (inChidori(P.D + 430) ? 0.4 : 1) * (0.4 + rnd() * 1.2) / (15 + Math.max(P.v, 4)); spawnMoto(-1, P.D + 430); }
    if (playing) {
      game.motoBehindTimer -= dt;
      if (game.motoBehindTimer <= 0) { game.motoBehindTimer = D.motoBehind * (0.5 + rnd()); if (P.v < 18) spawnMoto(1, P.D - 110); }
    }
    for (const o of game.vehicles) {
      // 前の車に近づいたら速さを合わせる
      let v = o.v0;
      for (const q of game.vehicles) {
        if (q === o || q.dir !== o.dir || Math.abs(q.u - o.u) > 1.6) continue;
        const gap = (q.d - o.d) * o.dir - (q.len + o.len) / 2;
        if (gap > 0 && gap < 12) v = Math.min(v, q.v * Math.max(0, (gap - 2) / 10));
      }
      // 行列の前では止まる
      if (game.event) {
        const stopAt = o.dir < 0 ? EVENT_S + 3.5 + o.len / 2 : EVENT_S - 3.5 - o.len / 2;
        const dist = (stopAt - o.d) * o.dir;
        if (dist > -1 && dist < 40 && eventBlocks(o.u, 2)) v = Math.min(v, Math.max(0, dist) * 0.6);
      }
      o.v += (v - o.v) * Math.min(1, dt * 2);
      o.d += o.v * o.dir * dt;
      if (o.kind === 'car') o.tu = o.ow ? owLaneU(o.lane, o.d) : carLaneU(o.lane, o.d);
      // 一方通行の区間に入る対向車は、その手前の交差点で曲がって消える
      if (o.dir < 0 && course.oneway(o.d)) o.gone = true;
      if (o.ow && !course.oneway(o.d) && o.kind === 'car') o.gone = true;
      o.u += Math.max(-1, Math.min(1, o.tu - o.u)) * dt;
    }
    game.vehicles = game.vehicles.filter((o) => {
      const keep = !o.gone && (o.dir < 0 ? o.d > P.D - 60 : o.d < P.D + 500 && o.d > P.D - 200);
      if (!keep) scene.remove(o.mesh);
      return keep;
    });
    // ---- 行列 ----
    if (ev) {
      ev.t += dt;
      ev.head -= ev.speed * dt;
      if (ev.head + ev.len < course.walkEdge(EVENT_S) - 6) { for (const k of ev.kagos) scene.remove(k.mesh); game.event = null; }
      else if (Math.floor(ev.t / 1.2) !== Math.floor((ev.t - dt) / 1.2) && Math.abs(P.D - EVENT_S) < 200) sfx.drum();
    }
  }
  // ---- 鬼 (昼・夕方・夜) ----
  if (playing && oni.active) {
    const gap = oni.update(dt, P, true);
    if (game.oniGap > 60 && gap <= 60) { sfx.oniLaugh(); popup('👹 鬼が近い！ ダッシュ！', 'warn'); }
    game.oniGap = gap;
    game.beatT = (game.beatT || 0) - dt;
    if (gap < 70 && game.beatT <= 0) { sfx.heartbeat(); game.beatT = 0.35 + gap / 100; }
    // 降りてくるときは稲妻を落とす
    game.boltT = (game.boltT || 0) - dt;
    if (gap < 18 && game.boltT <= 0) { strike(); game.boltT = 0.9 + Math.random() * 0.6; }
    if (gap < 2.5) { strike(true); crash('鬼に捕まった！'); }
  }
  // ---- 当たり判定・抜いた・ヒヤリ ----
  if (playing) {
    for (const p of game.people) {
      const dd = p.d - P.D, du = p.u - P.U;
      // 当たり判定: 前後はそのまま、左右は緩め (体の端をかすめるくらいはセーフ)
      // 2人組・3人組の間をすり抜けたときは、衝突ではなく「かすった」(組の全員と、1回だけ)
      if (p.grp && Math.abs(dd) < 1.0) {
        const us = p.grp.members.map((q) => q.u);
        if (P.U > Math.min(...us) && P.U < Math.max(...us)) {
          if (!p.grp.grazed) { p.grp.grazed = true; for (const q of p.grp.members) q.grazed = false; graze(p); }
          for (const q of p.grp.members) q.grazed = true;
          continue;
        }
      }
      if (Math.abs(dd) < 1.0 && Math.abs(du) < HIT_PERSON) { crash(p.hikyaku ? '飛脚と衝突！' : p.kind === 0 ? 'ランナーと衝突！' : '歩行者と衝突！'); break; }
      if (Math.abs(dd) < 1.0 && Math.abs(du) < GRAZE_PERSON) graze(p);
      if (!p.passed && dd < -0.8) {
        p.passed = true;
        game.passed++;
        const close = Math.abs(du) < 1.1;
        game.score += close ? 50 : 10;
        if (close) { popup('すり抜け +50'); sfx.pass(); }
      }
    }
    for (const o of game.vehicles) {
      const dd = o.d - P.D, du = o.u - P.U;
      if (Math.abs(dd) < 0.85 + o.len / 2 && Math.abs(du) < o.wid / 2 + HIT_VEH) { crash(o.kind === 'car' ? (o.dir > 0 ? '後ろから来た車にはねられた！' : '車にはねられた！') : 'バイクと衝突！'); break; }
      if (Math.abs(dd) < 0.85 + o.len / 2 && Math.abs(du) < o.wid / 2 + GRAZE_VEH) { graze(o); o.passed = true; }
      // 向こうから来る車: 進路に入っていたらクラクション
      if (o.dir < 0 && !o.honk && dd > 0 && dd < 50 && Math.abs(du) < 1.2 + o.wid / 2) { o.honk = true; o.kind === 'car' ? sfx.horn() : sfx.moto(0.3); }
      if (o.dir > 0 && !o.warned && dd < 0 && dd > -55 && Math.abs(du) < 1.5 + o.wid / 2) {
        o.warned = true;
        if (o.kind === 'car') { sfx.horn(); popup('後ろから車！', 'warn'); } else { sfx.moto(0.35); popup('後ろからバイク！', 'warn'); }
      }
      const passedNow = o.dir < 0 ? dd < -0.5 : dd > 0.5 || dd < -0.5;
      if (!o.passed && ((o.dir < 0 && dd < 0) || (o.dir > 0 && Math.abs(dd) < 0.3))) {
        o.passed = true;
        if (Math.abs(du) < 1.3 + o.wid / 2) { game.nearMiss++; game.score += 300; popup('ヒヤリ！ +300', 'near'); sfx.near(); }
        else if (Math.abs(du) < 4) sfx.whoosh(o.kind === 'car' ? 0.25 : 0.18);
      }
      void passedNow;
    }
    const ev = game.event;
    if (ev && game.state === 'play') {
      for (const m of ev.members) {
        const dd = EVENT_S + m.dd - P.D, du = ev.head + m.off - P.U;
        if (Math.abs(dd) < 1.0 && Math.abs(du) < HIT_PERSON) { crash('井伊直弼の行列に突っこんだ！'); break; }
        if (Math.abs(dd) < 1.0 && Math.abs(du) < GRAZE_PERSON) graze(m);
      }
      for (const k of ev.kagos) {
        const dd = EVENT_S - P.D, du = ev.head + k.off - 1.3 - P.U;
        if (Math.abs(dd) < 1.8 && Math.abs(du) < 2.6) { crash('井伊直弼の馬車に突っこんだ！'); break; }
      }
    }
  }
}

// ---------- 描画の更新 ----------
const crowdList = [];
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let showW = 0;
// 見せ場の名所の上に浮かぶ名前
const showLabel = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, fog: false, sizeAttenuation: false }));
showLabel.renderOrder = 10;
scene.add(showLabel);
function setShowLabel(name) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  // 札に収まる大きさの文字で
  let fs = 70; // 短い名前は大きく、長い名前は札に収まるまで小さく
  const font = () => `bold ${fs}px "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
  g.font = font();
  while (g.measureText(name).width > 450 && fs > 24) { fs -= 2; g.font = font(); }
  const w = Math.min(500, g.measureText(name).width + 40);
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.beginPath(); g.roundRect((512 - w) / 2, 4, w, 88, 44); g.fill();
  g.fillStyle = '#ffd36b'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name, 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (showLabel.material.map) showLabel.material.map.dispose();
  showLabel.material.map = t;
  showLabel.material.needsUpdate = true;
  showLabel.scale.set(0.95, 0.178, 1);
  showLabel.userData.name = name;
}
let camInit = false;
function render(dt, time) {
  // 自転車
  const f = course.world(P.D, P.U, F);
  const pitch = Math.atan(course.grade(P.D));
  const lat = game.state === 'play' ? P.lat : 0;
  const yaw = f.yaw + Math.atan2(lat, Math.max(2, P.v)) * 0.8;
  if (game.state === 'crash') {
    bike.group.position.set(f.x, f.y, f.z);
    bike.group.rotation.z = Math.min(1.4, game.crashT * 4);
  } else bike.update(f.x, f.y, f.z, yaw, P.v, lat, dt, pitch);
  bikeShadow.position.set(f.x, f.y + 0.02, f.z);
  bikeShadow.rotation.y = yaw;
  // 人
  crowdList.length = 0;
  for (const p of game.people) {
    if (p.d > P.D + 330 || p.d < P.D - 40) continue;
    const w = course.world(p.d, p.u, F2);
    crowdList.push({ x: w.x, y: w.y, z: w.z, yaw: w.yaw, phase: p.phase, amp: p.v > 0 ? p.amp : 0, kind: p.hikyaku ? 3 : p.kind, c: p.c, stand: p.stand, lean: p.lean, hikyaku: p.hikyaku });
  }
  const ev = game.event;
  if (ev) {
    const fr = course.frame(EVENT_S);
    const yawL = Math.atan2(fr.tz, -fr.tx); // 左 (お濠の方) へ歩く
    for (const m of ev.members) {
      const w = course.world(EVENT_S + m.dd, ev.head + m.off, F2);
      crowdList.push({ x: w.x, y: w.y, z: w.z, yaw: yawL, phase: ev.t * 5 + m.off, amp: 0.5, kind: 2, c: m.c, spear: m.spear, lean: 0.05 });
    }
    for (const k of ev.kagos) {
      const w = course.world(EVENT_S, ev.head + k.off, F2);
      k.mesh.position.set(w.x, w.y + Math.abs(Math.sin(ev.t * 4)) * 0.03, w.z);
      k.mesh.rotation.y = yawL;
    }
  }
  crowd.draw(crowdList);
  oni.draw(course, time, P);
  fireworks.update(dt);
  if (bolt.t > 0) { bolt.t -= dt; bolt.mat.opacity = Math.max(0, Math.min(1, bolt.t * 5)) * (0.6 + Math.random() * 0.4); if (bolt.t <= 0) bolt.mesh.visible = false; }
  // 車
  for (const o of game.vehicles) {
    const w = course.world(o.d, o.u, F2);
    o.mesh.position.set(w.x, w.y, w.z);
    o.mesh.rotation.set(0, w.yaw + (o.dir < 0 ? Math.PI : 0), 0);
    o.mesh.visible = Math.abs(o.d - P.D) < 450;
  }
  // カメラ (後ろから)
  // ふだんのカメラ: プレイヤーが大きく見えるよう、後ろ 4.9m・高さ 2.0m (前の 3/4)
  const CAM_BACK = 4.9, CAM_UP = 1.95;
  const back = course.world(P.D - CAM_BACK, P.U * 0.85, F2);
  const ahead = course.world(P.D + 10, P.U * 0.9, {});
  const sp = Math.min(1, P.v / 22);
  camPos.set(back.x, back.y + CAM_UP - sp * 0.35, back.z);
  camLook.set(ahead.x, ahead.y + 1.0, ahead.z);
  // 見せ場: 後ろからのまま、少し高く・後ろへ引いて、名所の方へ目を寄せる (プレイヤーが画面から出ない範囲で)
  const sc = showcase(P.D);
  showW += ((game.state === 'play' || game.state === 'countdown' ? sc.w : 0) - showW) * Math.min(1, dt * 1.5);
  if (sc.o && showW > 0.01) {
    const pl = new THREE.Vector3(f.x, f.y + 1, f.z);
    if (sc.o.mode === 'side') {
      // 横から: 名所と反対側の斜め後ろにカメラを置き、プレイヤー越しに名所を見る
      const away = pl.clone().sub(sc.o.v).setY(0).normalize();
      const fwd = new THREE.Vector3(f.tx, 0, f.tz);
      const sidePos = pl.clone().addScaledVector(away, sc.o.dist).addScaledVector(fwd, -3).add(new THREE.Vector3(0, sc.o.up, 0));
      const sideLook = pl.clone().lerp(sc.o.v, sc.o.look).add(new THREE.Vector3(0, 1.5, 0));
      camPos.lerp(sidePos, showW);
      camLook.lerp(sideLook, showW);
    } else if (sc.o.mode === 'front') {
      // 前から: プレイヤーの前に回り込み、自転車越しに後ろの名所を見る
      // 名所 → プレイヤー の延長線上 (プレイヤーの前方) にカメラ。こちらへ走ってくるプレイヤーの後ろに名所
      const fromL = pl.clone().sub(sc.o.v).setY(0).normalize();
      const fPos = pl.clone().addScaledVector(fromL, sc.o.dist || 10).add(new THREE.Vector3(0, sc.o.up || 2.2, 0));
      const fLook = pl.clone().lerp(sc.o.v, sc.o.look ?? 0.1);
      camPos.lerp(fPos, showW);
      camLook.lerp(fLook, showW);
    } else if (sc.o.mode === 'diag') {
      // 斜め後ろから: 名所と反対側へ少しずらして高く、プレイヤーの先と名所のあいだを見る
      const fwd = new THREE.Vector3(f.tx, 0, f.tz), right = new THREE.Vector3(-f.tz, 0, f.tx);
      const toL = sc.o.v.clone().sub(pl).setY(0);
      const side = toL.dot(right) > 0 ? -1 : 1;
      const dPos = pl.clone().addScaledVector(fwd, -8).addScaledVector(right, side * 6).add(new THREE.Vector3(0, sc.o.up || 4.5, 0));
      const dLook = pl.clone().addScaledVector(fwd, 12).lerp(sc.o.v, sc.o.look || 0.3);
      camPos.lerp(dPos, showW);
      camLook.lerp(dLook, showW);
    } else {
      const bk = course.world(P.D - CAM_BACK - 3.5 * showW, P.U * 0.85, F2);
      camPos.set(bk.x, bk.y + CAM_UP - sp * 0.35 + (sc.o.up ?? 5) * showW, bk.z);
      const toL = sc.o.v.clone().sub(camPos).normalize().multiplyScalar(40).add(camPos);
      // プレイヤーと名所のあいだを見る (寄せすぎると自分が見えなくなるので、ふつうは半分まで)
      camLook.lerp(toL.lerp(pl, 0.35), (sc.o.look ?? 0.5) * showW);
    }
      if ($('showName').textContent !== sc.o.name) $('showName').textContent = sc.o.name;
  }
  // 名所の名前は画面の上部に (被写体を隠さないように)
  $('showName').style.opacity = Math.min(1, showW * 1.5).toFixed(2);
  showLabel.visible = false;
  if (!camInit) { camera.position.copy(camPos); camInit = true; }
  camera.position.lerp(camPos, Math.min(1, dt * (showW > 0.05 ? 3 : 6)));
  if (game.shake > 0) { game.shake -= dt; camera.position.y += (Math.random() - 0.5) * 0.25 * game.shake / 0.3; camera.position.x += (Math.random() - 0.5) * 0.1 * game.shake / 0.3; }
  camera.lookAt(camLook);
  // 確認用 (?debug のときだけ): dbg.cam = [x, y, z, tx, ty, tz] でカメラを固定
  if (DEBUG && window.dbg && dbg.cam) { camera.position.set(dbg.cam[0], dbg.cam[1], dbg.cam[2]); camera.lookAt(dbg.cam[3], dbg.cam[4], dbg.cam[5]); }
  let fov = 68 + sp * 18;
  // 横アングルで遠くの名所を写すときは望遠に (画角を狭く)
  const scf = showcase(P.D);
  if (scf.o && scf.o.fov) fov += (scf.o.fov - fov) * showW;
  if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  // 雪 (桜田門のあたり)
  const sn = THREE.MathUtils.clamp(1 - (Math.abs(P.D - EVENT_S) - 150) / 250, 0, 1);
  snow.m.opacity = sn * 0.9;
  snow.pts.visible = sn > 0;
  if (sn > 0) {
    const a = snow.pos;
    for (let i = 0; i < snow.N; i++) {
      a[i * 3 + 1] -= dt * (1.6 + (i % 7) * 0.15);
      a[i * 3] += Math.sin(time + i) * dt * 0.3;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] += 30;
    }
    snow.pts.geometry.attributes.position.needsUpdate = true;
    snow.pts.position.set(camera.position.x, camera.position.y - 12, camera.position.z);
  }
  world.update(dt, camera, time);
  sfx.wind(kmh(P.v));
  bgm.setEnergy(Math.min(1, P.v / 20));
}

function updateHud() {
  if (game.state === 'title') return;
  $('hTime').textContent = fmtTime(game.t);
  $('hSpeed').textContent = Math.round(kmh(P.v));
  $('hDist').textContent = `${(Math.max(0, Math.min(P.D, course.L)) / 1000).toFixed(2)} / ${(course.L / 1000).toFixed(2)} km`;
  $('hBar').style.width = (Math.max(0, Math.min(1, P.D / course.L)) * 100).toFixed(1) + '%';
  $('hScore').textContent = Math.round(game.score);
  $('hPassed').textContent = game.passed;
  const st = $('hStamina');
  st.style.width = P.stamina.toFixed(0) + '%';
  st.className = P.dashLock || P.stamina < 20 ? 'low' : game.dashing ? 'dash' : '';
  const nx = course.nextLabel(P.D);
  $('hNext').textContent = nx ? `次: ${nx.name} ${Math.round(nx.s - P.D)}m` : 'ゴール 二重橋前';
  const L = course.leftEdge(P.D);
  const RR = course.runnerRight(P.D), ow = course.oneway(P.D);
  const inCar = P.U >= RR;
  const zone = P.U < L ? (onCobble(P.D, P.U) ? '歩道（石畳）' : '歩道') : !inCar ? 'ランナー車線' : ow ? '車線（後ろから車）⚠' : '対向車線 ⚠';
  $('hLane').textContent = zone;
  $('hLane').className = inCar ? 'danger' : '';
  document.body.classList.toggle('danger', inCar && game.state === 'play');
  const oe = $('hOni');
  oe.classList.toggle('hidden', !oni.active);
  if (oni.active) { const gap = Math.max(0, P.D - oni.d); oe.textContent = `👹 鬼まで ${Math.round(gap)}m`; oe.className = gap < 40 ? 'near' : ''; }
  document.body.classList.toggle('oni', oni.active && game.state === 'play' && P.D - oni.d < 40);
  const g = course.grade(P.D) * 100;
  $('hGrade').textContent = g > 1.2 ? `上り坂 ${g.toFixed(1)}%` : g < -1.2 ? `下り坂 ${(-g).toFixed(1)}%` : '';
  $('hGrade').className = g > 1.2 ? 'up' : 'down';
  mini.draw();
}

// ---------- ループ ----------
const clock = new THREE.Clock();
let fpsT = 0, fpsN = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  const time = clock.elapsedTime;
  if (game.state !== 'pause') {
    // 細かく分けて動かす (速いときにすり抜けないように)
    const n = Math.ceil(dt / 0.02);
    for (let i = 0; i < n; i++) step(dt / n);
  }
  if (game.state === 'title') { P.D += dt * 0; }
  render(game.state === 'pause' ? 0 : dt, time);
  world.reflect(camera);
  renderer.render(scene, camera);
  updateHud();
  // 重いときは解像度を下げる
  fpsT += dt; fpsN++;
  if (fpsT > 2) {
    const fps = fpsN / fpsT;
    if (fps < 40 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); }
    fpsT = 0; fpsN = 0;
  }
}

setTod(tod);
toTitle();
{
  const f = course.frame(P.D);
  world.prebuild(f.x, f.z);
}
$('loading').classList.add('hidden');
loop();

// ---------- 見せ場ツアー ----------
if (TOUR) {
  const stops = SHOW.map((o) => ({ name: o.name, mode: o.mode, d: o.mode === 'side' || o.mode === 'front' ? o.c - 45 : o.s0 + 20 })).sort((a, b) => a.d - b.d);
  let k = 0;
  const go = () => {
    if (game.state !== 'play' && game.state !== 'countdown') { startGame(); game.countdown = 0.05; }
    const st = stops[k % stops.length];
    P.D = st.d; P.U = course.leftEdge(st.d) + 1.4; P.v = V_CRUISE;
    game.people = game.people.filter((p) => Math.abs(p.d - P.D) > 30);
    game.frontier = Math.max(game.frontier, P.D + 30);
    for (const o of game.vehicles) scene.remove(o.mesh);
    game.vehicles.length = 0;
    oni.active = false; oni.g.visible = false;
    camInit = false;
    flash(`見せ場ツアー ${k % stops.length + 1}/${stops.length}: ${st.name}（${{ side: '横アングル', front: '前アングル', diag: '斜め後ろ', behind: '後ろから' }[st.mode]}）`, 3, 'warn');
    k++;
  };
  setTimeout(() => { go(); setInterval(go, 9000); }, 500);
}

if (DEBUG) window.dbg = { SHOW, oni, strike, snapCam: () => { camInit = false; }, THREE, scene, camera, course, terrain, world, game, P, startGame, crash, finish, setTod, renderer };
