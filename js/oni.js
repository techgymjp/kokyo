// 後ろから追いかけてくる鬼 (昼・夕方・夜のステージ)。雲に乗ってコースの上を飛んでくる。捕まったらアウト
// 鬼の形はターザン大東京 (techgymjp/tarzan) の js/oni.js (元は 清水の舞台から飛び降りるつもり) から
import * as THREE from '../vendor/three.module.min.js';

const SCALE = 1.6;
function tigerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f6b51e';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#1b1b1f';
  for (let x = -20; x < 140; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + 14, 64, x, 128);
    ctx.lineTo(x + 8, 128);
    ctx.quadraticCurveTo(x + 22, 64, x + 8, 0);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeOni(color) {
  const g = new THREE.Group();
  const M = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const skin = M(color), white = M(0xffffff), horn = M(0xfff1c4), hair = M(0x1b1b1f), iron = M(0x3a3a44);
  const black = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const tiger = new THREE.MeshLambertMaterial({ map: tigerTexture() });
  const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  // 雲
  const cloud = new THREE.Group();
  const cloudMat = M(0xffffff, { emissive: 0x666666 });
  for (const [x, y, z, r] of [[0, 0, 0, 1.1], [1, 0.1, 0.3, 0.8], [-1, 0.05, -0.2, 0.85], [0.4, 0.2, -0.8, 0.7], [-0.5, 0.15, 0.8, 0.7], [1.6, -0.1, -0.4, 0.55], [-1.6, -0.1, 0.4, 0.55]]) {
    add(cloud, new THREE.SphereGeometry(r, 12, 10), cloudMat, x, y, z).scale.y = 0.7;
  }
  cloud.position.y = -1.0;
  cloud.name = 'cloud';
  g.add(cloud);
  // 体
  add(g, new THREE.CapsuleGeometry(0.55, 0.7, 6, 12), skin, 0, 0.6, 0);
  add(g, new THREE.CylinderGeometry(0.62, 0.66, 0.5, 14), tiger, 0, 0.2, 0);
  for (const sx of [-1, 1]) add(g, new THREE.CapsuleGeometry(0.2, 0.3, 4, 8), skin, sx * 0.3, -0.25, 0);
  // 頭
  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = 1.65;
  g.add(head);
  add(head, new THREE.SphereGeometry(0.55, 16, 12), skin, 0, 0, 0);
  for (const sx of [-1, 1]) {
    add(head, new THREE.ConeGeometry(0.13, 0.55, 10), horn, sx * 0.28, 0.5, 0).rotation.z = -sx * 0.3;
    add(head, new THREE.SphereGeometry(0.15, 10, 8), white, sx * 0.2, 0.08, -0.45);
    add(head, new THREE.SphereGeometry(0.07, 8, 6), black, sx * 0.2, 0.08, -0.59);
    add(head, new THREE.CylinderGeometry(0.035, 0.035, 0.3, 6), black, sx * 0.2, 0.28, -0.48).rotation.z = Math.PI / 2 + sx * 0.4;
    add(head, new THREE.ConeGeometry(0.05, 0.16, 6), white, sx * 0.15, -0.28, -0.46).rotation.x = Math.PI;
  }
  add(head, new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16, 1, false, 0, Math.PI), black, 0, -0.2, -0.5).rotation.x = Math.PI / 2;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    add(head, new THREE.SphereGeometry(0.2, 8, 6), hair, Math.cos(a) * 0.42, 0.3, Math.sin(a) * 0.42 + 0.1);
  }
  // 腕と金棒
  add(g, new THREE.CapsuleGeometry(0.16, 0.6, 4, 8), skin, -0.75, 0.75, 0).rotation.z = 0.5;
  const arm = new THREE.Group();
  arm.name = 'arm';
  arm.position.set(0.7, 1.05, 0);
  g.add(arm);
  add(arm, new THREE.CapsuleGeometry(0.16, 0.6, 4, 8), skin, 0.15, 0.3, 0).rotation.z = -0.5;
  add(arm, new THREE.CylinderGeometry(0.16, 0.09, 2.0, 8), iron, 0.35, 1.1, 0).rotation.z = -0.2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(arm, new THREE.ConeGeometry(0.06, 0.14, 5), white, 0.35 + Math.cos(a) * 0.15, 1.5 - (i % 3) * 0.3, Math.sin(a) * 0.15).rotation.z = -Math.PI / 2;
  }
  // 描画を軽くするため、部位ごとに1つのメッシュにまとめる
  for (const part of [g, cloud, head, arm]) flatten(part);
  g.scale.setScalar(SCALE);
  return g;
}

const flatMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
// group の直下にある単色のメッシュを、頂点カラー付きの1つのメッシュにまとめる
function flatten(group) {
  const pos = [], nor = [], col = [];
  for (const child of [...group.children]) {
    if (!child.isMesh || child.material.map) continue;
    child.updateMatrix();
    const geo = child.geometry.clone().applyMatrix4(child.matrix).toNonIndexed();
    const c = child.material.color;
    const p = geo.attributes.position.array, n = geo.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) col.push(c.r, c.g, c.b);
    group.remove(child);
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  group.add(new THREE.Mesh(g, flatMaterial));
}


// ステージごとの鬼の速さ (m/s)。時間がたつと少しずつ速くなる
export const ONI_SPEED = { day: 10.3, dusk: 10.8, night: 11.3 };
export const ONI_START_GAP = 130;

export class Chaser {
  constructor(scene) {
    this.g = makeOni(0xd83a2e);
    this.g.visible = false;
    this.arm = this.g.getObjectByName('arm');
    this.head = this.g.getObjectByName('head');
    this.cloud = this.g.getObjectByName('cloud');
    scene.add(this.g);
    this.active = false;
  }
  reset(stage, d) {
    this.active = stage in ONI_SPEED;
    this.base = ONI_SPEED[stage] || 0;
    this.d = d - ONI_START_GAP;
    this.u = 0;
    this.t = 0;
    this.g.visible = this.active;
  }
  // 戻り値: プレイヤーとの距離 (m)
  update(dt, P, moving) {
    if (!this.active) return Infinity;
    this.t += dt;
    if (moving) {
      const gap = P.D - this.d;
      // 時間とともに速く。離れすぎたら追いつく
      const v = this.base + this.t * 0.004 + Math.max(0, gap - 170) * 0.05;
      this.d += v * dt;
      this.u += (P.U - this.u) * Math.min(1, dt * 0.8);
    }
    return P.D - this.d;
  }
  // 離れているときは頭上の高い所を飛び、追いつくにつれて降りてくる (プレイヤーが隠れないように)
  draw(course, time, P) {
    if (!this.active) return;
    const w = course.world(this.d, this.u);
    const gap = P ? P.D - this.d : 100;
    const h = 3.2 + Math.min(1, Math.max(0, (gap - 4) / 45)) ** 0.8 * 26;
    this.g.position.set(w.x, w.y + h + Math.sin(time * 2) * 0.4, w.z);
    // 鬼の顔は -z 向きなので、進む向きの反対に回す
    this.g.rotation.set(0, w.yaw + Math.PI, 0);
    this.arm.rotation.z = Math.sin(time * 6) * 0.6;
    this.head.rotation.y = Math.sin(time * 1.7) * 0.3;
    this.cloud.rotation.y = time * 0.8;
  }
}
