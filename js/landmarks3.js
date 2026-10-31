// コースから見える著名な建物 (手作り)。PLATEAU では箱になってしまうので、実際の形と色に近づける
//   パレスホテル東京 (和田倉門)・パレスサイドビル (竹橋)・国立劇場・最高裁判所 (三宅坂)・法務省 赤れんが棟 (桜田門)
import * as THREE from '../vendor/three.module.min.js';
import { ll } from './city.js?v=20261031181253';
import { hipGeo, canvasTex } from './landmarks.js?v=20261031181253';

// 手作りに置き換える所 (この半径の中の PLATEAU の建物は描かない)
export const FAMOUS_SITES = [
  [35.68470, 139.76130, 70],  // パレスホテル東京
  [35.69155, 139.75770, 110], // パレスサイドビル
  [35.68110, 139.74330, 75],  // 国立劇場
  [35.67960, 139.74330, 70],  // 最高裁判所
  [35.67580, 139.75285, 55],  // 法務省 赤れんが棟
  [35.67973, 139.75457, 45],  // 二重橋 (正門石橋) のまわり
  [35.68077, 139.75380, 40],  // 正門鉄橋のまわり
  [35.68530, 139.74560, 70],  // 半蔵門のまわり
  [35.68528, 139.74505, 40],  // 半蔵門の土橋
  [35.67770, 139.75250, 45],  // 外桜田門
  [35.69332, 139.74983, 190], // 日本武道館のまわり (両隣の建物を描かない)
  [35.68602, 139.75962, 75],  // 大手門 (PLATEAU の高麗門・渡櫓門・塀は手作りに置き換える)
];
// 手作りの細長い名所 (線分のまわり) : 東京駅 丸の内駅舎 (ターザン大東京の addTokyoStation と同じ位置)
const FAMOUS_LINES = [[35.67976, 139.76524, 35.68296, 139.76684, 70]];
export function hideFamousSites(city) {
  for (const [lat, lon, r] of FAMOUS_SITES) {
    const [X, Z] = ll(lat, lon);
    for (const bd of city.bld) if (bd.plateau && (bd.cx - X) ** 2 + (bd.cz - Z) ** 2 < r * r) { bd.plateau = false; bd.hidden = true; }
  }
  for (const [la1, lo1, la2, lo2, r] of FAMOUS_LINES) {
    const [ax, az] = ll(la1, lo1), [bx, bz] = ll(la2, lo2);
    const ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez;
    for (const bd of city.bld) {
      if (!bd.plateau) continue;
      const t = Math.max(0, Math.min(1, ((bd.cx - ax) * ex + (bd.cz - az) * ez) / L2));
      if (Math.hypot(bd.cx - ax - ex * t, bd.cz - az - ez * t) < r) { bd.plateau = false; bd.hidden = true; }
    }
  }
}

const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
function box(g, w, h, d, x, y, z, mat, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}
// 面ごとに貼る窓のテクスチャ (repeat で大きさを合わせる)
function facade(w, h, draw, rx, ry) {
  const t = canvasTex(w, h, draw);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

export function addFamous(scene, G) {
  const out = {};
  const at = (lat, lon, rot) => {
    const [X, Z] = ll(lat, lon);
    const g = new THREE.Group();
    g.position.set(X, G(X, Z) - 0.5, Z);
    g.rotation.y = rot;
    scene.add(g);
    return g;
  };

  // ---- パレスホテル東京: ベージュの石の縦の格子と濃いガラス。23階 (約100m)、低層の基壇 ----
  {
    const g = at(35.68470, 139.76130, -0.42);
    const tex = facade(128, 128, (c, w, h) => {
      c.fillStyle = '#2c3640'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#d9cfbd';
      for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 9, h);
      for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 6);
    }, 24, 26);
    const wall = M(0xffffff, { map: tex });
    const stone = M(0xd6ccb8);
    box(g, 120, 14, 48, 0, 0, 0, stone);
    box(g, 104, 84, 34, 0, 14, 0, wall);
    box(g, 96, 4, 28, 0, 98, 0, stone);
    box(g, 30, 6, 16, -20, 102, 0, M(0x8a8a86));
    // 和田倉噴水公園側の白い軒
    box(g, 124, 1.2, 52, 0, 14, 0, M(0xf2efe8));
    out.palaceHotel = g.position;
  }

  // ---- パレスサイドビル (毎日新聞): 長い横長のビル。横に走るアルミのひさし (ルーバー) と、両端の白い円筒の塔 ----
  {
    const g = at(35.69155, 139.75770, -0.33);
    const tex = facade(64, 64, (c, w, h) => {
      c.fillStyle = '#3e4a52'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#c9ced2';
      c.fillRect(0, 0, w, 14);
      c.fillStyle = '#7b868d';
      for (let x = 0; x < w; x += 16) c.fillRect(x, 14, 2, h - 14);
    }, 60, 9);
    const wall = M(0xffffff, { map: tex });
    box(g, 200, 38, 44, 0, 0, 0, wall);
    box(g, 196, 1.5, 40, 0, 38, 0, M(0x9aa2a8));
    for (const x of [-60, 60]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 52, 28), M(0xf4f4f0));
      t.position.set(x, 26, 24);
      g.add(t);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.4, 1.2, 28), M(0xbfc4c8));
      cap.position.set(x, 52.6, 24);
      g.add(cap);
    }
    out.palaceSide = g.position;
  }

  // ---- 国立劇場: 校倉造 (正倉院の倉) をかたどった焦げ茶の壁と、張り出した大屋根 ----
  {
    const g = at(35.68110, 139.74330, 0.55);
    const tex = facade(64, 64, (c, w, h) => {
      // 三角の材を横に積んだ模様
      c.fillStyle = '#4a3528'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 8) {
        const gr = c.createLinearGradient(0, y, 0, y + 8);
        gr.addColorStop(0, '#6b4e3a'); gr.addColorStop(0.5, '#4a3528'); gr.addColorStop(1, '#2a1d15');
        c.fillStyle = gr; c.fillRect(0, y, w, 8);
      }
    }, 20, 3);
    const wall = M(0xffffff, { map: tex });
    box(g, 130, 3, 70, 0, 0, 0, M(0x8d8a84));
    box(g, 120, 20, 58, 0, 3, 0, wall);
    box(g, 136, 2.2, 74, 0, 23, 0, M(0x3b3530));
    box(g, 70, 8, 40, 10, 25.2, 0, wall);
    box(g, 76, 1.6, 46, 10, 33.2, 0, M(0x3b3530));
    // 前庭 (白い石畳)
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(90, 30), M(0xd8d4cc));
    yard.rotation.x = -Math.PI / 2; yard.position.set(0, 0.6, 50);
    g.add(yard);
    out.theater = g.position;
  }

  // ---- 最高裁判所: 花崗岩のかたまりを組み合わせた要塞のような建物。細長い縦のすき間の窓 ----
  {
    const g = at(35.67960, 139.74330, 0.55);
    const tex = facade(64, 128, (c, w, h) => {
      c.fillStyle = '#b9b1a5'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(0,0,0,0.08)';
      for (let y = 0; y < h; y += 16) c.fillRect(0, y, w, 1);
      c.fillStyle = '#4b4c50';
      c.fillRect(28, 10, 8, h - 20);
    }, 14, 3);
    const granite = M(0xffffff, { map: tex });
    const plain = M(0xbab2a6);
    box(g, 110, 22, 90, 0, 0, 0, granite);
    box(g, 60, 34, 50, 0, 0, 0, plain);
    box(g, 30, 46, 30, 0, 0, 0, granite);
    for (const [x, z] of [[-48, -38], [48, -38], [-48, 38], [48, 38]]) box(g, 16, 28, 16, x, 0, z, plain);
    out.court = g.position;
  }

  // ---- 法務省 赤れんが棟 (旧司法省): 赤れんがと白い帯、黒いスレートの屋根、中央の塔 ----
  {
    const g = at(35.67580, 139.75285, 0.62);
    const tex = facade(64, 64, (c, w, h) => {
      c.fillStyle = '#a2412c'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#e8e0d0'; c.fillRect(0, 0, w, 5); c.fillRect(0, 34, w, 4);
      c.fillStyle = '#26303a';
      c.fillRect(10, 10, 12, 20); c.fillRect(42, 10, 12, 20); c.fillRect(10, 42, 12, 18); c.fillRect(42, 42, 12, 18);
    }, 18, 2);
    const brick = M(0xffffff, { map: tex });
    const slate = M(0x3a3f45);
    box(g, 110, 18, 22, 0, 0, 0, brick);
    for (const x of [-48, 48]) box(g, 16, 18, 34, x, 0, 4, brick);
    box(g, 22, 22, 26, 0, 0, 2, brick);
    const roof = new THREE.Mesh(hipGeo, slate);
    roof.scale.set(112, 7, 24); roof.position.set(0, 21.5, 0); g.add(roof);
    const troof = new THREE.Mesh(hipGeo, slate);
    troof.scale.set(24, 10, 28); troof.position.set(0, 27, 2); g.add(troof);
    for (const x of [-48, 48]) { const r = new THREE.Mesh(hipGeo, slate); r.scale.set(18, 8, 36); r.position.set(x, 22, 4); g.add(r); }
    out.redBrick = g.position;
  }
  return out;
}

// ---- 二重橋 (正門石橋): 白い花崗岩の2連アーチの石橋と、欄干の飾り灯。奥に正門鉄橋、その上に伏見櫓 ----
// face: 橋を正面 (横腹) から見る位置 [x, z]。皇居前広場から見ると、2つのアーチが並んで見える
export function addNijubashi(scene, G, waterLevelAt, face) {
  // 位置は国土地理院の地図 (ズーム18) の橋の記号から
  const [AX, AZ] = ll(35.67962, 139.75476); // 石橋の広場側
  const [BX, BZ] = ll(35.67985, 139.75438); // 石橋の正門側
  const [TX, TZ] = ll(35.68077, 139.75380); // 正門鉄橋
  const g = new THREE.Group();
  let cx = (AX + BX) / 2, cz = (AZ + BZ) / 2;
  const L = Math.hypot(BX - AX, BZ - AZ);
  // 橋の向き: face の方へ横腹 (アーチ) を見せる
  let ax = BX - AX, az = BZ - AZ;
  if (face) { const vx = face[0] - cx, vz = face[1] - cz; ax = -vz; az = vx; }
  // 橋はお濠 (国土地理院の水面) の上に架ける: 広場の方へたどって最初に水面がある所
  let lv = null;
  if (face) {
    const vx = face[0] - cx, vz = face[1] - cz, l = Math.hypot(vx, vz);
    for (let t = 0; t < 120 && lv === null; t += 2) {
      const px = cx + vx / l * t, pz = cz + vz / l * t, w = waterLevelAt && waterLevelAt(px, pz);
      if (w !== null && w !== undefined) { lv = w; cx = px + vx / l * 4; cz = pz + vz / l * 4; }
    }
  }
  if (lv === null) lv = G(cx, cz) - 3;
  const ground = lv; // 水面の高さ
  g.position.set(cx, 0, cz);
  const deckY = ground + 7; // アーチが見える高さ
  g.rotation.y = Math.atan2(ax, az);
  // 暗い灰色の花崗岩 (写真の色)
  const granite = M(0x6e6c68), shade = M(0x5c5a56), iron = M(0x2a3a34), lamp = M(0xfff3cf, { emissive: 0x6a5a30 });
  const H = deckY - lv;
  // 橋の側面 (アーチの穴をあけた壁を、アーチごとに組み立てる)
  const W = 12;
  const archR = Math.min(H * 0.8, L / 4.4);
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-L / 2, -H); shape.lineTo(L / 2, -H); shape.lineTo(L / 2, 1.2); shape.lineTo(-L / 2, 1.2); shape.lineTo(-L / 2, -H);
    for (const ax of [-L / 4, L / 4]) {
      const hole = new THREE.Path();
      hole.moveTo(ax + archR, -H);
      hole.absarc(ax, -H + archR * 0.35, archR, 0, Math.PI, false);
      hole.lineTo(ax - archR, -H);
      shape.holes.push(hole);
    }
    const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false }), granite);
    wall.rotation.y = Math.PI / 2;
    wall.position.set(side * (W / 2) - (side > 0 ? 1.2 : 0), deckY, 0);
    g.add(wall);
    // 欄干と飾り灯 (6基)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, L), shade);
    rail.position.set(side * (W / 2 - 0.3), deckY + 1.75, 0);
    g.add(rail);
    for (let k = 0; k < 3; k++) {
      const z = -L / 2 + 4 + k * (L - 8) / 2;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.5, 8), iron);
      post.position.set(side * (W / 2 - 0.3), deckY + 3.4, z);
      g.add(post);
      // 飾り灯: 柱の上に5つの灯 (まん中と四方)
      for (const [ox, oy, oz] of [[0, 6.3, 0], [0.7, 5.6, 0], [-0.7, 5.6, 0], [0, 5.6, 0.7], [0, 5.6, -0.7]]) {
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lamp);
        globe.position.set(side * (W / 2 - 0.3) + ox, deckY + oy, z + oz);
        g.add(globe);
      }
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), granite);
      pier.position.set(side * (W / 2 - 0.3), deckY + 1.6, z);
      g.add(pier);
    }
  }
  // 橋の上 (路面) とアーチの裏
  const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 1.2, L), shade);
  deck.position.set(0, deckY + 0.6, 0);
  g.add(deck);
  for (const ax of [-L / 4, L / 4]) {
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(archR, archR, W - 2.4, 20, 1, true, -Math.PI / 2, Math.PI), shade);
    vault.rotation.z = Math.PI / 2;
    vault.position.set(0, deckY - H + archR * 0.35, ax);
    vault.material.side = THREE.DoubleSide;
    g.add(vault);
  }
  // お濠の水面 (橋の両側へ広く) と、岸の石垣
  // お濠の水面 (橋の下を左右へ)。手前の芝生のすぐ奥が水面、その奥に橋
  const water = new THREE.Mesh(new THREE.PlaneGeometry(26, L + 70), M(0x3a6a6e, { emissive: 0x0c1a1c }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, ground + 0.05, 0);
  g.add(water);
  // 両端と真ん中の四角い石の柱 (欄干より高く)
  for (const z of [-L / 2, 0, L / 2]) for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, deckY - ground + 3.2, 2.6), granite);
    p.position.set(sx * (W / 2 - 0.2), (ground + deckY + 3.2) / 2, z);
    g.add(p);
  }
  // 両端の石垣 (橋のたもと)
  for (const z of [-L / 2 - 6, L / 2 + 6]) {
    const abut = new THREE.Mesh(new THREE.BoxGeometry(W + 6, deckY - ground + 1.2, 12), shade);
    abut.position.set(0, (ground + deckY + 1.2) / 2 - 0.6, z);
    g.add(abut);
  }
  scene.add(g);
  // 正門鉄橋 (奥の鉄の橋)
  const t = new THREE.Group();
  // 正門鉄橋は、正面から見て石橋の奥
  let tx = TX, tz = TZ;
  if (face) { const vx = cx - face[0], vz = cz - face[1], l = Math.hypot(vx, vz); tx = cx + vx / l * 70 + ax / Math.hypot(ax, az) * 25; tz = cz + vz / l * 70 + az / Math.hypot(ax, az) * 25; }
  t.position.set(tx, Math.max(G(tx, tz), deckY) + 4, tz);
  t.rotation.y = g.rotation.y;
  const tdeck = new THREE.Mesh(new THREE.BoxGeometry(10, 1.4, 34), M(0x7a7f84));
  t.add(tdeck);
  for (const side of [-1, 1]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 34), iron);
    r.position.set(side * 4.8, 1.4, 0);
    t.add(r);
  }
  const pier = new THREE.Mesh(new THREE.BoxGeometry(6, 14, 4), granite);
  pier.position.set(0, -7.5, 0);
  t.add(pier);
  scene.add(t);
  // お濠の範囲 (木を植えないように)
  const ux = Math.cos(g.rotation.y), uz = -Math.sin(g.rotation.y);
  return { pos: new THREE.Vector3(cx, deckY + 4, cz), moat: [cx - ux * 13, cz - uz * 13, cx + ux * 13, cz + uz * 13, L / 2 + 30] };
}

// ---- 大手門: 内堀通りからお濠を渡る土橋の先に高麗門、その右に石垣の上の大きな白い渡櫓門 (枡形)。両わきは白い塀 ----
// course: コース (道路の向きと位置に合わせて置く)
// 位置は PLATEAU の大手門の建物 (渡櫓門) の所。道路からの距離は実際の位置から計算する
export function addOtemon(scene, course, G) { return addMasugata(scene, course, G, { lat: 35.68602, lon: 139.75962 }); }
// 外桜田門 (桜田門): 大手門と同じ枡形。交差点の近くで、道路から少し入った所に高麗門
export function addSakuradamon(scene, course, G) { return addMasugata(scene, course, G, { lat: 35.67770, lon: 139.75250, dist: 34, plain: true }); }
// 枡形の城門: 土橋の先に高麗門、その右奥に石垣の上の渡櫓門、両わきに白い塀
function addMasugata(scene, course, G, o) {
  const [GX, GZ] = ll(o.lat, o.lon);
  const n = course.nearest(GX, GZ, 300);
  const f = course.frame(n.s);
  const roadP = course.world(n.s, course.walkEdge(n.s) - 1);
  // 高麗門は道路から左 (お濠側) へ o.dist m。+z が道路の方
  const away = new THREE.Vector3(f.tz, 0, -f.tx); // 道路の左
  if (!o.dist) o.dist = Math.max(30, (GX - roadP.x) * away.x + (GZ - roadP.z) * away.z);
  const gx = roadP.x + away.x * o.dist, gz = roadP.z + away.z * o.dist;
  const base = roadP.y;
  const g = new THREE.Group();
  g.position.set(gx, base, gz);
  g.rotation.y = Math.atan2(-away.x, -away.z);
  const stone = M(0x8f8a80), white = M(0xf3f1ea), roofM = M(0x4a5054), dark = M(0x2b2e2c), cap = M(0x5a6064);
  const path = M(0x9a9894), wood = M(0x8a7a64), pine = M(0x3f6a3a);
  // 土橋 (お濠を渡る道) と柵、両わきの刈り込んだ松
  const BL = o.dist - 6;
  box(g, 11, 0.6, BL, 0, -0.3, BL / 2 + 2, path);
  for (const sx of [-1, 1]) {
    box(g, 0.15, 0.9, BL, sx * 5.3, 0, BL / 2 + 2, wood);
    for (let z = 8; z < BL && !o.plain; z += 9) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), pine);
      p.scale.set(1.3, 0.75, 1.3);
      p.position.set(sx * 3.8, 1.1, z);
      g.add(p);
    }
  }
  // 高麗門 (2本の太い柱と冠木、本瓦の屋根)。扉は開いている
  for (const sx of [-1, 1]) box(g, 1.1, 6.2, 1.1, sx * 3.2, 0, 0, dark);
  box(g, 8.4, 0.9, 1.3, 0, 6.2, 0, dark);
  const kr = new THREE.Mesh(hipGeo, roofM);
  kr.scale.set(11, 2.4, 5.2); kr.position.set(0, 8.3, 0); g.add(kr);
  // 両わきの石垣と白い塀 (瓦の笠)
  const wall = (x0, x1, h) => {
    const w = Math.abs(x1 - x0), cx = (x0 + x1) / 2;
    box(g, w, h, 3.2, cx, -0.5, -0.8, stone);
    box(g, w, 3, 0.8, cx, h - 0.5, -0.8, white);
    box(g, w + 0.4, 0.5, 1.8, cx, h + 2.5, -0.8, cap);
  };
  wall(-48, -4, 3.5);
  wall(4, 13, 3.5);
  // 枡形: 高麗門の奥を、白い塀 (石垣の上) で四角く囲む。右の辺が渡櫓門
  box(g, 3.2, 3.5, 32, -14, -0.5, -16, stone);
  box(g, 0.8, 3, 32, -14, 3, -16, white);
  box(g, 1.8, 0.5, 32.4, -14, 6, -16, cap);
  box(g, 28, 3.5, 3.2, 0, -0.5, -32, stone);
  box(g, 28, 3, 0.8, 0, 3, -32, white);
  box(g, 28.4, 0.5, 1.8, 0, 6, -32, cap);
  box(g, 26, 0.2, 30, 0, -0.1, -16, path); // 枡形の中の広場
  // 渡櫓門 (右): 高い石垣の上の白い2階建て、入母屋の屋根。妻 (三角の面) が道路の方を向く
  box(g, 22, 8, 40, 24, -0.5, -16, stone);
  box(g, 20, 8.5, 37, 24, 7.5, -16, white);
  for (let z = -30; z <= -2; z += 7) box(g, 20.2, 1.2, 1.4, 24, 12, z, dark); // 窓
  const yr = new THREE.Mesh(hipGeo, roofM);
  yr.scale.set(25, 6.5, 43); yr.position.set(24, 19.2, -16); g.add(yr);
  // 渡櫓門の先の石垣 (右へ続く)
  box(g, 30, 6.5, 4, 50, -0.5, 2, stone);
  scene.add(g);
  return { pos: [gx, gz], y: base };
}

// ---- 和気清麻呂像 (大手濠緑地): 高い石の台座の上に、束帯姿で笏を持って立つ銅像 ----
export function addWakeNoKiyomaro(scene, course, G) {
  const [WX, WZ] = ll(35.68760, 139.76040);
  const n = course.nearest(WX, WZ, 300);
  const p = course.world(n.s, course.walkEdge(n.s) - 9);
  const g = new THREE.Group();
  g.position.set(p.x, p.y, p.z);
  g.rotation.y = p.yaw - Math.PI / 2; // 道路の方を向く
  const granite = M(0xb7b2a8), bronze = M(0x3c4a3e);
  box(g, 6, 1, 6, 0, 0, 0, granite);
  box(g, 4, 5.5, 4, 0, 1, 0, granite);
  box(g, 4.6, 0.6, 4.6, 0, 6.5, 0, granite);
  // 袍 (すそが広がった衣) と体
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.35, 3.0, 12), bronze);
  robe.position.set(0, 8.6, 0); g.add(robe);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.8, 1.3, 12), bronze);
  chest.position.set(0, 10.6, 0); g.add(chest);
  for (const sx of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.9, 1.1), bronze);
    sleeve.position.set(sx * 0.95, 10.0, 0.25); sleeve.rotation.x = -0.25; g.add(sleeve);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), bronze);
  head.position.set(0, 11.75, 0); g.add(head);
  const kanmuri = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.55), bronze);
  kanmuri.position.set(0, 12.45, -0.05); g.add(kanmuri);
  const shaku = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.05), bronze);
  shaku.position.set(0, 10.4, 0.9); shaku.rotation.x = -0.3; g.add(shaku);
  scene.add(g);
  return { pos: [p.x, p.z], y: p.y };
}

// ---- 半蔵門: 内堀通りから土橋の道がまっすぐ奥へ。両わきは生け垣と松、奥に黒い木の高麗門と白い塀。道路ぎわに茶色い屋根の詰所 ----
export function addHanzomon(scene, course, G) {
  // 門は実際の位置 (二つのお濠のあいだの土手を渡った先)。土手の道は内堀通りから門までまっすぐ
  const [GX, GZ] = ll(35.68530, 139.74560);
  const n = course.nearest(GX, GZ, 400);
  const roadP = course.world(n.s, course.walkEdge(n.s) - 0.5);
  const D = Math.hypot(GX - roadP.x, GZ - roadP.z); // 門までの距離 (約100m)
  const g = new THREE.Group();
  g.position.set(roadP.x, roadP.y, roadP.z);
  g.rotation.y = Math.atan2(GX - roadP.x, GZ - roadP.z); // +z が門の方
  const path = M(0xa8a59c), pine = M(0x2f5a32), dark = M(0x2a2622), roofM = M(0x3a3e40), white = M(0xf0eee6);
  const brown = M(0x7a4a32), wallC = M(0xd9d2c2), glass = M(0x5a6a72), lawn = M(0x7aa64e), fenceM = M(0x5a3a28), bush = M(0x5c8f3e);
  const tree = M(0x355f34);
  // 土手 (二つのお濠のあいだ): 上は芝生、両側はお濠へ下る芝生の斜面
  box(g, 26, 0.3, D, 0, -0.35, D / 2, lawn);
  for (const sx of [-1, 1]) {
    const slope = new THREE.Mesh(new THREE.PlaneGeometry(24, D + 20), lawn);
    slope.rotation.set(-Math.PI / 2, 0, 0);
    slope.rotateY(sx * 0.62);
    slope.position.set(sx * (13 + 9.5), -7, D / 2 + 6);
    slope.material.side = THREE.DoubleSide;
    g.add(slope);
  }
  box(g, 11, 0.4, D, 0, -0.2, D / 2, path);
  // 道路ぎわの茶色い鉄柵の門
  box(g, 12, 0.12, 0.12, 0, 1.6, 2.5, fenceM);
  box(g, 12, 0.12, 0.12, 0, 0.4, 2.5, fenceM);
  for (let x = -6; x <= 6; x += 1) box(g, 0.08, 1.6, 0.08, x, 0, 2.5, fenceM);
  for (const sx of [-1, 1]) {
    box(g, 10, 1.8, 0.12, sx * 11, 0, 2.5, fenceM);
    // 道の両わきの丸く刈り込んだ植え込み
    for (let z = 8; z < D - 6; z += 3.2) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 8), bush);
      b.scale.set(1, 0.85, 1.1);
      b.position.set(sx * 9, 1.1, z);
      g.add(b);
    }
    // 門の両わき: 木の茂った土手と、白い塀
    box(g, 30, 7, 18, sx * 21, -0.5, D + 6, M(0x4e7a3c));
    for (let k = 0; k < 5; k++) {
      const t = new THREE.Mesh(new THREE.IcosahedronGeometry(6 + (k % 2) * 2, 1), tree);
      t.scale.set(1, 1.1, 1);
      t.position.set(sx * (12 + k * 5), 13 + (k % 3), D + 4 + (k % 2) * 6);
      g.add(t);
    }
    // 門の左右の石垣 (左は高く長い)
    box(g, sx < 0 ? 34 : 14, sx < 0 ? 6 : 4, 3, sx * (sx < 0 ? 21 : 11), -2, D - 2, M(0x7d786e));
    box(g, 16, 3.2, 0.8, sx * 12, 0, D - 0.5, white);
    box(g, 16.6, 0.5, 1.6, sx * 12, 3.2, D - 0.5, roofM);
  }
  // 高麗門 (黒い木の柱と扉、本瓦の屋根) と、その奥の大きな木
  for (const sx of [-1, 1]) box(g, 1.0, 5.8, 1.0, sx * 3, 0, D, dark);
  box(g, 7.8, 0.8, 1.2, 0, 5.8, D, dark);
  box(g, 5.6, 4.6, 0.3, 0, 0, D + 0.2, dark);
  const kr = new THREE.Mesh(hipGeo, roofM);
  kr.scale.set(10, 2.2, 4.8); kr.position.set(0, 7.6, D); g.add(kr);
  const big = new THREE.Mesh(new THREE.IcosahedronGeometry(11, 1), tree);
  big.position.set(4, 15, D + 18); g.add(big);
  // 道路ぎわの詰所 (茶色の寄棟屋根)
  box(g, 7, 3, 6, -11, 0, -2, wallC);
  box(g, 7.05, 1.3, 6.05, -11, 1.2, -2, glass);
  const r = new THREE.Mesh(hipGeo, brown);
  r.scale.set(10.5, 3.2, 9); r.position.set(-11, 4.6, -2); g.add(r);
  scene.add(g);
  return { pos: [GX, GZ], y: roadP.y };
}
