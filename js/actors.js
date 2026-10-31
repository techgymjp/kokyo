// 登場するもの: ランナー・歩行者・大名行列の人 (まとめて InstancedMesh で描く)、車・バイク、プレイヤーのロードバイク
import * as THREE from '../vendor/three.module.min.js';

const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const _c = new THREE.Color();

// ---------- 人 (ランナー・歩行者・侍) ----------
// 部品: 胴・腰・頭・帽子 (髪)・もも×2・すね×2・腕×2。kind ごとに色と動き
export class Crowd {
  constructor(scene, max = 420) {
    this.max = max;
    const box = (w, h, d, top = true) => { const g = new THREE.BoxGeometry(w, h, d); if (top) g.translate(0, -h / 2, 0); return g; };
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mk = (geo, n) => { const m = new THREE.InstancedMesh(geo, mat, max * n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; scene.add(m); return m; };
    const torso = new THREE.BoxGeometry(0.38, 0.55, 0.22); torso.translate(0, 0.27, 0);
    this.torso = mk(torso, 1);
    this.hips = mk(box(0.36, 0.24, 0.24), 1);
    const head = new THREE.IcosahedronGeometry(0.12, 1);
    this.head = mk(head, 1);
    const hat = new THREE.SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    this.hat = mk(hat, 1);
    this.thigh = mk(box(0.14, 0.44, 0.15), 2);
    this.shin = mk(box(0.11, 0.46, 0.12), 2);
    this.arm = mk(box(0.09, 0.56, 0.09), 2);
    // 侍の笠 (平たい円すい) と 毛槍・駕籠は別に
    const kasa = new THREE.ConeGeometry(0.3, 0.16, 12);
    this.kasa = mk(kasa, 1);
    const yari = new THREE.CylinderGeometry(0.02, 0.02, 3.2, 4); yari.translate(0, 1.6, 0);
    this.yari = mk(yari, 1);
    const tuft = new THREE.SphereGeometry(0.22, 8, 6); tuft.scale(1, 1.5, 1);
    this.tuft = mk(tuft, 1);
    // 飛脚の担ぎ棒と文箱
    const pole = new THREE.CylinderGeometry(0.025, 0.025, 1.3, 5); pole.rotateX(Math.PI / 2);
    this.pole = mk(pole, 1);
    this.box = mk(new THREE.BoxGeometry(0.28, 0.24, 0.34), 1);
    this.meshes = [this.torso, this.hips, this.head, this.hat, this.thigh, this.shin, this.arm, this.kasa, this.yari, this.tuft, this.pole, this.box];
  }
  // list: [{x,y,z,yaw,phase,amp,kind,c: {shirt,pants,skin,hat}, stand, spear}]
  draw(list) {
    const n = Math.min(this.max, list.length);
    let ky = 0, kh = 0;
    for (let i = 0; i < n; i++) {
      const p = list[i];
      const amp = p.amp, ph = p.phase;
      const bob = Math.abs(Math.sin(ph)) * 0.06 * amp;
      _e.set(0, p.yaw, 0); _q.setFromEuler(_e);
      const body = _m.compose(_v.set(p.x, p.y + bob, p.z), _q, _s);
      const lean = p.lean || 0;
      const put = (mesh, idx, lx, ly, lz, rx, color) => {
        _e.set(rx, 0, 0); _q.setFromEuler(_e);
        _m2.compose(_v.set(lx, ly, lz), _q, _s);
        _m2.premultiply(body);
        mesh.setMatrixAt(idx, _m2);
        mesh.setColorAt(idx, color);
      };
      put(this.torso, i, 0, 0.98, 0, lean, p.c.shirt);
      put(this.hips, i, 0, 1.0, 0, 0, p.c.pants);
      put(this.head, i, 0, 1.68 + lean * 0.1, lean * 0.25, 0, p.c.skin);
      put(this.hat, i, 0, 1.7 + lean * 0.1, lean * 0.25, 0, p.c.hat);
      put(this.kasa, i, 0, p.kind === 2 ? 1.84 : -50, 0, 0, p.c.hat);
      for (let k = 0; k < 2; k++) {
        const sd = k ? 1 : -1;
        const sw = Math.sin(ph + k * Math.PI) * 0.7 * amp;
        const knee = (0.25 + 0.9 * Math.max(0, Math.cos(ph + k * Math.PI))) * amp;
        // もも: 腰から前後に振る (前がマイナス)
        put(this.thigh, i * 2 + k, sd * 0.1, 0.98, 0, -sw, p.c.pants);
        // すね: ひざから
        const ky2 = 0.98 - Math.cos(sw) * 0.44, kz = Math.sin(sw) * 0.44;
        put(this.shin, i * 2 + k, sd * 0.1, ky2, kz, -sw + knee, p.c.skin2 || p.c.skin);
        const as = p.stand ? (k ? -1.4 : -1.2) : -Math.sin(ph + k * Math.PI) * 0.8 * amp;
        put(this.arm, i * 2 + k, sd * 0.24, 1.5, 0, as + (p.kind === 0 ? -0.5 : 0), p.c.arm || p.c.skin);
      }
      if (p.hikyaku) {
        // 右肩に担いだ棒の後ろに文箱
        put(this.pole, kh, 0.2, 1.52, -0.25, 0.25, POLE_C);
        put(this.box, kh, 0.2, 1.36, -0.82, 0, BOX_C);
        kh++;
      }
      if (p.spear) {
        put(this.yari, ky, 0.3, 1.0, 0.1, 0, p.c.pants);
        put(this.tuft, ky, 0.3, 4.1, 0.1, 0, SPEAR_C);
        ky++;
      }
    }
    for (const m of this.meshes) {
      m.count = m === this.thigh || m === this.shin || m === this.arm ? n * 2 : m === this.yari || m === this.tuft ? ky : m === this.pole || m === this.box ? kh : n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}
const SPEAR_C = new THREE.Color(0x15110e), POLE_C = new THREE.Color(0x8a6a3a), BOX_C = new THREE.Color(0x1a1a1a);

const C = (h) => new THREE.Color(h);
const SHIRTS = [0xff4f7b, 0xffa62b, 0xd8f238, 0x2ec4ff, 0xffffff, 0x222428, 0x7a5cff, 0x30d47a, 0xff5a36, 0x1c3f94, 0xf2f2f2, 0xfde047];
const PANTS = [0x1d1f24, 0x2b2f3a, 0x3a3f4b, 0x101010, 0x1f2b4a];
const SKIN = [0xf1c9a5, 0xe0ac85, 0xc98e66, 0xf6d7bd];
const HAIR = [0x1a1410, 0x3a2a1c, 0x101010, 0xffffff, 0xff4f7b, 0x2ec4ff];
const WALK_SHIRT = [0x9aa3ad, 0x6b5a4a, 0xe6e0d4, 0x2f3d4c, 0x8c2f39, 0x445a3a, 0xc9b28d, 0x111111];
export function runnerColors(rnd) {
  const sk = SKIN[Math.floor(rnd() * SKIN.length)];
  const tights = rnd() < 0.4;
  return { shirt: C(SHIRTS[Math.floor(rnd() * SHIRTS.length)]), pants: C(PANTS[Math.floor(rnd() * PANTS.length)]), skin: C(sk), skin2: tights ? C(0x15161a) : C(sk), hat: C(HAIR[Math.floor(rnd() * HAIR.length)]) };
}
export function walkerColors(rnd) {
  const sk = C(SKIN[Math.floor(rnd() * SKIN.length)]);
  const sh = C(WALK_SHIRT[Math.floor(rnd() * WALK_SHIRT.length)]);
  const pants = C([0x2b2f3a, 0x4a4036, 0x1d1f24, 0x6b6f78][Math.floor(rnd() * 4)]);
  return { shirt: sh, pants, skin: sk, skin2: pants, arm: sh, hat: C(HAIR[Math.floor(rnd() * 3)]) };
}
// 飛脚: 裸に近い (ふんどしと はちまき)、ちょんまげ
export function hikyakuColors() {
  const sk = C(0xd9a57a);
  return { shirt: sk, pants: C(0xf4f1e8), skin: sk, skin2: sk, arm: sk, hat: C(0x15110e) };
}
export function samuraiColors(rnd, rank) {
  const kimono = C(rank ? 0x2a2d4a : [0x1f2a44, 0x2c2c2c, 0x3b3550][Math.floor(rnd() * 3)]);
  const hakama = C([0x4a4a52, 0x2e3440, 0x55463a][Math.floor(rnd() * 3)]);
  return { shirt: kimono, pants: hakama, skin: C(0xe6b894), skin2: C(0xf0ece2), arm: kimono, hat: C(0xcdb88a) };
}

// ---------- 車とバイク (箱を1つの形にまとめ、色は頂点色) ----------
function merge(parts) {
  const pos = [], nor = [], col = [];
  for (const { g, color } of parts) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.attributes.position.array, n = ng.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) col.push(color.r, color.g, color.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
const B = (w, h, d, x, y, z, color, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); return { g, color: C(color) }; };
const W = (r, w, x, y, z) => { const g = new THREE.CylinderGeometry(r, r, w, 12); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return { g, color: C(0x161616) }; };

// 車の形 (前が +z)。len/wid は当たり判定の大きさ
export const CAR_TYPES = [
  { name: 'sedan', len: 4.6, wid: 1.8, w: 5, colors: [0xf4f4f4, 0x1a1a1a, 0xa9adb3, 0x2b3f6b, 0x8c1c1c, 0x5d6a5a] },
  { name: 'taxi', len: 4.7, wid: 1.75, w: 3, colors: [0x15171c, 0xf2c200, 0x1f6b3a] },
  { name: 'van', len: 4.8, wid: 1.85, w: 2, colors: [0xffffff, 0x9aa0a6] },
  { name: 'bus', len: 10.5, wid: 2.5, w: 1, colors: [0xe9e6dc] },
  { name: 'truck', len: 6.5, wid: 2.1, w: 1, colors: [0xf0f0f0, 0x2a5aa8] },
];
const carGeoCache = new Map();
export function carGeometry(type, color) {
  const key = type.name + color;
  if (carGeoCache.has(key)) return carGeoCache.get(key);
  const L = type.len, Wd = type.wid, glass = 0x26323d, parts = [];
  if (type.name === 'bus') {
    parts.push(B(Wd, 2.6, L, 0, 1.75, 0, color), B(Wd + 0.02, 0.9, L - 1.2, 0, 2.2, -0.2, glass), B(Wd - 0.2, 1.2, 0.05, 0, 2.0, L / 2 + 0.01, glass), B(Wd + 0.03, 0.25, L, 0, 1.15, 0, 0x2f7d4f));
    for (const z of [L / 2 - 2, -L / 2 + 2.2]) parts.push(W(0.5, Wd + 0.1, 0, 0.5, z));
  } else if (type.name === 'truck') {
    parts.push(B(Wd, 2.2, L * 0.62, 0, 1.6, -L * 0.19, color), B(Wd, 1.8, L * 0.3, 0, 1.4, L * 0.33, 0xffffff), B(Wd - 0.1, 0.7, 0.05, 0, 1.75, L / 2 + 0.01, glass));
    for (const z of [L / 2 - 1, -L / 2 + 1.3]) parts.push(W(0.45, Wd + 0.1, 0, 0.45, z));
  } else {
    const roofC = type.name === 'taxi' && color === 0x15171c ? 0x15171c : color;
    const h = type.name === 'van' ? 1.25 : 0.62;
    parts.push(B(Wd, 0.72, L, 0, 0.65, 0, color));
    parts.push(B(Wd - 0.1, h, L * (type.name === 'van' ? 0.72 : 0.5), 0, 1.0 + h / 2, type.name === 'van' ? -0.4 : -0.15, roofC));
    parts.push(B(Wd - 0.06, h * 0.7, L * (type.name === 'van' ? 0.73 : 0.51), 0, 1.02 + h / 2, type.name === 'van' ? -0.4 : -0.15, glass));
    if (type.name === 'taxi') parts.push(B(0.5, 0.18, 0.25, 0, 1.0 + h + 0.09, -0.1, 0xffd23f));
    for (const z of [L / 2 - 0.9, -L / 2 + 0.9]) parts.push(W(0.33, Wd + 0.06, 0, 0.33, z));
  }
  const g = merge(parts);
  carGeoCache.set(key, g);
  return g;
}
export function lightsGeometry(L, Wd, y) {
  // 前照灯 (+z) と尾灯 (-z)
  return {
    head: merge([B(0.35, 0.14, 0.05, -Wd / 2 + 0.3, y, L / 2 + 0.02, 0xffffff), B(0.35, 0.14, 0.05, Wd / 2 - 0.3, y, L / 2 + 0.02, 0xffffff)]),
    tail: merge([B(0.3, 0.14, 0.05, -Wd / 2 + 0.25, y, -L / 2 - 0.02, 0xff2a2a), B(0.3, 0.14, 0.05, Wd / 2 - 0.25, y, -L / 2 - 0.02, 0xff2a2a)]),
  };
}
export function motoGeometry(color, jacket) {
  return merge([
    W(0.32, 0.12, 0, 0.32, 0.72), W(0.32, 0.14, 0, 0.32, -0.68),
    B(0.32, 0.4, 1.0, 0, 0.72, 0, color), B(0.36, 0.3, 0.5, 0, 0.98, 0.25, color), B(0.5, 0.06, 0.08, 0, 1.15, 0.55, 0x222222),
    B(0.36, 0.6, 0.3, 0, 1.35, -0.1, jacket, -0.35), B(0.3, 0.3, 0.3, 0, 1.78, 0.05, 0x111111),
    B(0.12, 0.5, 0.12, -0.18, 0.95, 0.05, 0x22252c, 0.9), B(0.12, 0.5, 0.12, 0.18, 0.95, 0.05, 0x22252c, 0.9),
    B(0.1, 0.5, 0.1, -0.22, 1.35, 0.3, jacket, -1.1), B(0.1, 0.5, 0.1, 0.22, 1.35, 0.3, jacket, -1.1),
  ]);
}

// ---------- 井伊直弼の馬車 (大名行列)。前 (+z) に馬、後ろに黒塗りの車 ----------
export function carriageGeometry() {
  const horse = 0x6b3e22, lac = 0x1a120e, gold = 0xc9a23a;
  const leg = (x, z) => B(0.16, 1.1, 0.16, x, 0.55, z, horse);
  return merge([
    // 馬
    B(0.6, 0.7, 1.8, 0, 1.45, 2.3, horse), B(0.35, 0.8, 0.45, 0, 1.95, 3.25, horse, -0.6), B(0.3, 0.32, 0.65, 0, 2.3, 3.6, horse, 0.3),
    B(0.08, 0.6, 0.5, 0, 2.05, 3.0, 0x15110e, -0.6), leg(-0.2, 1.6), leg(0.2, 1.6), leg(-0.2, 3.0), leg(0.2, 3.0),
    B(0.06, 0.06, 1.8, -0.4, 1.1, 1.5, 0x5a3a20), B(0.06, 0.06, 1.8, 0.4, 1.1, 1.5, 0x5a3a20),
    // 車 (屋形)
    B(1.5, 1.4, 2.2, 0, 1.6, -0.2, lac), B(1.8, 0.14, 2.6, 0, 2.38, -0.2, lac), B(1.2, 0.18, 1.9, 0, 2.54, -0.2, gold),
    B(1.52, 0.6, 1.0, 0, 1.75, -0.2, 0xb88a3a), B(0.05, 0.9, 0.9, 0.77, 1.55, 0.6, 0x7a1c1c), B(0.05, 0.9, 0.9, -0.77, 1.55, 0.6, 0x7a1c1c),
    W(0.6, 0.12, -0.85, 0.6, -0.2), W(0.6, 0.12, 0.85, 0.6, -0.2), B(1.9, 0.1, 0.1, 0, 0.6, -0.2, 0x3a2a1a),
  ]);
}

// ---------- プレイヤーのロードバイク ----------
export class Bike {
  constructor(scene) {
    const g = this.group = new THREE.Group();
    const frameM = new THREE.MeshLambertMaterial({ color: 0x1e88ff });
    const blackM = new THREE.MeshLambertMaterial({ color: 0x151515 });
    const silverM = new THREE.MeshLambertMaterial({ color: 0xbfc4c9 });
    const jerseyM = new THREE.MeshLambertMaterial({ color: 0xff3d2e });
    const skinM = new THREE.MeshLambertMaterial({ color: 0xf0c49c });
    const bibM = new THREE.MeshLambertMaterial({ color: 0x15171c });
    const helmM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const R = 0.34, WB = 1.0;
    // 車輪 (タイヤ + スポーク)
    this.wheels = [];
    for (const z of [WB / 2, -WB / 2]) {
      const w = new THREE.Group();
      w.position.set(0, R, z);
      const tire = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022, 8, 32), blackM);
      tire.rotation.y = Math.PI / 2;
      w.add(tire);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.03, 0.012, 6, 32), silverM);
      rim.rotation.y = Math.PI / 2;
      w.add(rim);
      for (let k = 0; k < 8; k++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.006, R * 2 - 0.06, 0.006), silverM);
        sp.rotation.x = k * Math.PI / 8;
        w.add(sp);
      }
      g.add(w);
      this.wheels.push(w);
    }
    // フレーム (ダイヤモンド形)
    const tube = (a, b, r, m) => {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b);
      const len = A.distanceTo(Bv);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), m);
      mesh.position.copy(A).add(Bv).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
      g.add(mesh);
      return mesh;
    };
    const BB = [0, 0.3, 0.02], ST = [0, 0.82, -0.14], HT = [0, 0.8, 0.4], HTb = [0, 0.62, 0.44];
    tube(BB, ST, 0.022, frameM); tube(ST, HT, 0.02, frameM); tube(BB, HTb, 0.026, frameM);
    tube(BB, [0, R, -WB / 2], 0.014, frameM); tube(ST, [0, R, -WB / 2], 0.012, frameM);
    tube(HTb, [0, R, WB / 2], 0.014, silverM); tube(HT, HTb, 0.024, frameM);
    tube([0, 0.82, -0.14], [0, 0.95, -0.2], 0.012, silverM);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.26), blackM);
    saddle.position.set(0, 0.97, -0.2);
    g.add(saddle);
    tube([0, 0.8, 0.4], [0, 0.86, 0.5], 0.012, silverM);
    // ドロップハンドル
    tube([-0.2, 0.86, 0.5], [0.2, 0.86, 0.5], 0.012, blackM);
    for (const s of [-1, 1]) tube([s * 0.2, 0.86, 0.5], [s * 0.2, 0.74, 0.56], 0.012, blackM);
    // 乗り手 (前傾)
    const rider = this.rider = new THREE.Group();
    g.add(rider);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.62, 0.22), jerseyM);
    torso.position.set(0, 1.18, 0.08);
    torso.rotation.x = 1.0;
    rider.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), skinM);
    head.position.set(0, 1.42, 0.4);
    rider.add(head);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), helmM);
    helm.position.set(0, 1.45, 0.38);
    helm.scale.set(1, 0.9, 1.3);
    rider.add(helm);
    for (const s of [-1, 1]) {
      const arm = tube([s * 0.17, 1.33, 0.3], [s * 0.2, 0.9, 0.52], 0.04, jerseyM);
      arm.userData.k = s;
    }
    // 脚 (ペダルをこぐ): 腰 → ひざ → 足
    this.legs = [];
    for (const s of [-1, 1]) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.44, 6), bibM);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.44, 6), skinM);
      rider.add(thigh, shin);
      this.legs.push({ s, thigh, shin });
    }
    this.crank = 0;
    scene.add(g);
    this.lean = 0;
  }
  // x,y,z: 地面の位置、yaw: 向き、v: 速さ、lat: 横の速さ、t: 時間
  update(x, y, z, yaw, v, lat, dt, pitch = 0) {
    const g = this.group;
    g.position.set(x, y, z);
    this.lean += ((-lat * 0.09) - this.lean) * Math.min(1, dt * 8);
    g.rotation.set(0, 0, 0);
    g.rotateY(yaw);
    g.rotateX(-pitch);
    g.rotateZ(this.lean);
    for (const w of this.wheels) w.rotation.x += v / 0.34 * dt;
    this.crank += v / 0.34 * dt / 2.6;
    // ペダル (クランク 0.17m) と脚の角度 (2本のリンクの逆運動学)
    const hip = new THREE.Vector3(0, 0.98, -0.12);
    for (const L of this.legs) {
      const a = this.crank + (L.s > 0 ? Math.PI : 0);
      const foot = new THREE.Vector3(L.s * 0.11, 0.3 + Math.sin(a) * 0.17, 0.02 + Math.cos(a) * 0.17);
      const h = hip.clone().setX(L.s * 0.11);
      const d = Math.min(0.86, foot.distanceTo(h));
      const mid = h.clone().add(foot).multiplyScalar(0.5);
      const dir = foot.clone().sub(h).normalize();
      const off = Math.sqrt(Math.max(0, 0.44 * 0.44 - (d / 2) ** 2));
      const knee = mid.add(new THREE.Vector3(0, dir.z, -dir.y).normalize().multiplyScalar(-off));
      const set = (m, A, Bv) => { m.position.copy(A).add(Bv).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize()); };
      set(L.thigh, h, knee);
      set(L.shin, knee, foot);
    }
  }
}
