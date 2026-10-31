// コースから見える著名な建物 (手作り)。PLATEAU では箱になってしまうので、実際の形と色に近づける
//   パレスホテル東京 (和田倉門)・パレスサイドビル (竹橋)・国立劇場・最高裁判所 (三宅坂)・法務省 赤れんが棟 (桜田門)
import * as THREE from '../vendor/three.module.min.js';
import { ll } from './city.js';
import { hipGeo, canvasTex } from './landmarks.js';

// 手作りに置き換える所 (この半径の中の PLATEAU の建物は描かない)
export const FAMOUS_SITES = [
  [35.68470, 139.76130, 70],  // パレスホテル東京
  [35.69155, 139.75770, 110], // パレスサイドビル
  [35.68110, 139.74330, 75],  // 国立劇場
  [35.67960, 139.74330, 70],  // 最高裁判所
  [35.67580, 139.75285, 55],  // 法務省 赤れんが棟
];
// 手作りの細長い名所 (線分のまわり) : 東京駅 丸の内駅舎 (ターザン大東京の addTokyoStation と同じ位置)
const FAMOUS_LINES = [[35.67960, 139.76630, 35.68280, 139.76790, 24]];
export function hideFamousSites(city) {
  for (const [lat, lon, r] of FAMOUS_SITES) {
    const [X, Z] = ll(lat, lon);
    for (const bd of city.bld) if (bd.plateau && (bd.cx - X) ** 2 + (bd.cz - Z) ** 2 < r * r) bd.plateau = false;
  }
  for (const [la1, lo1, la2, lo2, r] of FAMOUS_LINES) {
    const [ax, az] = ll(la1, lo1), [bx, bz] = ll(la2, lo2);
    const ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez;
    for (const bd of city.bld) {
      if (!bd.plateau) continue;
      const t = Math.max(0, Math.min(1, ((bd.cx - ax) * ex + (bd.cz - az) * ez) / L2));
      if (Math.hypot(bd.cx - ax - ex * t, bd.cz - az - ez * t) < r) bd.plateau = false;
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
export function addNijubashi(scene, G, waterLevelAt) {
  const [AX, AZ] = ll(35.67960, 139.75470); // 石橋の広場側
  const [BX, BZ] = ll(35.68010, 139.75405); // 石橋の正門側
  const [TX, TZ] = ll(35.68060, 139.75345); // 正門鉄橋
  const g = new THREE.Group();
  const cx = (AX + BX) / 2, cz = (AZ + BZ) / 2;
  const L = Math.hypot(BX - AX, BZ - AZ);
  const lv = (waterLevelAt && waterLevelAt(cx, cz)) ?? (G(cx, cz) - 5);
  const deckY = Math.max(G(AX, AZ), G(BX, BZ));
  g.position.set(cx, 0, cz);
  g.rotation.y = Math.atan2(BX - AX, BZ - AZ);
  const granite = M(0xe4e0d6), shade = M(0xc9c4b8), iron = M(0x2a2a2a), lamp = M(0xfff3cf, { emissive: 0x6a5a30 });
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
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), lamp);
      globe.position.set(side * (W / 2 - 0.3), deckY + 5.9, z);
      g.add(globe);
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
  scene.add(g);
  // 正門鉄橋 (奥の鉄の橋)
  const t = new THREE.Group();
  t.position.set(TX, Math.max(G(TX, TZ), deckY) + 4, TZ);
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
  return { pos: new THREE.Vector3(cx, deckY + 4, cz) };
}

// ---- 大手門: 内堀通りからお濠を渡る土橋の先に高麗門、その右に石垣の上の大きな白い渡櫓門 (枡形)。両わきは白い塀 ----
// course: コース (道路の向きと位置に合わせて置く)
export function addOtemon(scene, course, G) {
  const [GX, GZ] = ll(35.68630, 139.75905);
  const n = course.nearest(GX, GZ, 300);
  const f = course.frame(n.s);
  const roadP = course.world(n.s, course.walkEdge(n.s) - 1);
  // 高麗門は道路から左 (お濠側) へ 58m。+z が道路の方
  const away = new THREE.Vector3(f.tz, 0, -f.tx); // 道路の左
  const gx = roadP.x + away.x * 58, gz = roadP.z + away.z * 58;
  const base = roadP.y;
  const g = new THREE.Group();
  g.position.set(gx, base, gz);
  g.rotation.y = Math.atan2(-away.x, -away.z);
  const stone = M(0x8f8a80), white = M(0xf3f1ea), roofM = M(0x4a5054), dark = M(0x2b2e2c), cap = M(0x5a6064);
  const path = M(0x9a9894), wood = M(0x8a7a64), pine = M(0x3f6a3a);
  // 土橋 (お濠を渡る道) と柵、両わきの刈り込んだ松
  box(g, 11, 0.6, 52, 0, -0.3, 28, path);
  for (const sx of [-1, 1]) {
    box(g, 0.15, 0.9, 52, sx * 5.3, 0, 28, wood);
    for (let z = 8; z < 52; z += 9) {
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
  // 渡櫓門 (右): 高い石垣の上の白い2階建て、入母屋の屋根。妻 (三角の面) が道路の方を向く
  box(g, 22, 8, 40, 24, -0.5, -16, stone);
  box(g, 20, 8.5, 37, 24, 7.5, -16, white);
  for (let z = -30; z <= -2; z += 7) box(g, 20.2, 1.2, 1.4, 24, 12, z, dark); // 窓
  const yr = new THREE.Mesh(hipGeo, roofM);
  yr.scale.set(25, 6.5, 43); yr.position.set(24, 19.2, -16); g.add(yr);
  const gable = new THREE.Mesh(new THREE.ConeGeometry(6, 4, 3), white);
  gable.rotation.set(Math.PI / 2, 0, 0); gable.scale.set(1.2, 0.2, 1); gable.position.set(24, 19.5, 5.3);
  g.add(gable);
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
