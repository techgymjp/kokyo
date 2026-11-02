// 景色: PLATEAU の街・地形 (標高)・お濠 (水面の映り込み)・幹線道路・木・名所・コースの道路
// 街の描画はターザン大東京 (techgymjp/tarzan) の main.js を元に、地面の高さに合わせて組み直した
import * as THREE from '../vendor/three.module.min.js';
import { City, ll } from './city.js?v=20261102102851';
import { CITY } from './city-data.js?v=20261102102851';
import { ROADS } from './road-data.js?v=20261102102851';
import { WATER, WATER_LEVEL } from './water-data.js?v=20261102102851';
import { LANE_W, CURB_H } from './course.js?v=20261102102851';
import { addTokyoTower, addDiet, addSkytree, addFuji, addDistant, addTechGym, addBudokan, addImperialPalace, addPalaceGates, hipGeo, canvasTex, JP } from './landmarks.js?v=20261102102851';
import { addTokyoStation, addYotsuyaKudan, addAkasaka, addNewOtani } from './landmarks2.js?v=20261102102851';
import { hideFamousSites, addFamous, addNijubashi, addOtemon, addWakeNoKiyomaro, addHanzomon, addSakuradamon, addWadakuraFountain } from './landmarks3.js?v=20261102102851';

const TOD = {
  morning: { top: 0x4f8fd8, hor: 0xf3d9c0, fog: 0xdfe3e6, sun: 0xfff1d8, sunI: 1.5, hemi: 0.85, sunDir: [0.75, 0.3, 0.2], emi: 0, fogFar: 2600 },
  day: { top: 0x3f86d6, hor: 0xcfe0ee, fog: 0xc6d8ea, sun: 0xffffff, sunI: 1.7, hemi: 0.95, sunDir: [-0.4, 0.8, 0.45], emi: 0, fogFar: 2800 },
  dusk: { top: 0x2b3f7a, hor: 0xffa66b, fog: 0xd9a587, sun: 0xffb27a, sunI: 1.5, hemi: 0.6, sunDir: [-0.85, 0.18, 0.35], emi: 0.12, fogFar: 2600 },
  night: { top: 0x050a1c, hor: 0x1d2a4a, fog: 0x141c33, sun: 0x8ea6ff, sunI: 0.35, hemi: 0.3, sunDir: [0.3, 0.7, -0.5], emi: 1.0, fogFar: 2200 },
};
export const TOD_NAMES = { morning: '朝', day: '昼', dusk: '夕方', night: '夜' };

export function createWorld({ renderer, scene, course, terrain, isTouch }) {
  const G = (x, z) => terrain.at(x, z);
  const DRAW_R = isTouch ? 1500 : 2200;
  scene.fog = new THREE.Fog(0xbfd2e6, 300, DRAW_R);
  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x6a6458, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  scene.add(sun);

  // ---------- 空 ----------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, night: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){ float y = max(vP.y, 0.0); vec3 c = mix(hor, top, pow(y, 0.55));
        float s = max(dot(vP, normalize(sunDir)), 0.0);
        c += sunCol * (pow(s, 600.0) * 2.0 + pow(s, 8.0) * 0.35 * (1.0 - night));
        if (night > 0.5 && vP.y > 0.05) { vec3 q = floor(vP * 400.0); float st = step(0.9985, h(q)); c += vec3(st) * 0.8; }
        if (vP.y < 0.0) c = hor * 0.9;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), skyMat);
  sky.renderOrder = -3;
  scene.add(sky);

  // ---------- ビル ----------
  function windowTex(kind, lit) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    let s = kind === 'glass' ? 7 : 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.fillStyle = lit ? '#000' : (kind === 'glass' ? '#e8eef4' : '#ffffff');
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const on = rnd() < (kind === 'glass' ? 0.45 : 0.35);
      if (lit) {
        if (!on) continue;
        const w = rnd();
        g.fillStyle = w < 0.6 ? '#ffd9a0' : w < 0.85 ? '#fff4dc' : '#bfe0ff';
      } else {
        const t = 0.75 + rnd() * 0.25;
        g.fillStyle = kind === 'glass' ? `rgb(${120 * t},${140 * t},${165 * t})` : `rgb(${80 * t},${92 * t},${110 * t})`;
      }
      if (kind === 'glass') g.fillRect(x * 32 + 1, y * 32 + 3, 30, 27);
      else g.fillRect(x * 32 + 6, y * 32 + 8, 20, 17);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const mats = {
    glass: new THREE.MeshLambertMaterial({ map: windowTex('glass'), vertexColors: true, emissiveMap: windowTex('glass', true), emissive: 0xffffff, emissiveIntensity: 0 }),
    office: new THREE.MeshLambertMaterial({ map: windowTex('office'), vertexColors: true, emissiveMap: windowTex('office', true), emissive: 0xffffff, emissiveIntensity: 0 }),
    roof: new THREE.MeshLambertMaterial({ vertexColors: true }),
  };
  const city = new City();
  city.groundAt = G;
  // コースの道路にはみ出す建物は描かない (道路の線と建物の輪郭のずれ)
  for (const bd of city.bld) {
    if (!bd.plateau) continue;
    let base = Infinity, hit = false;
    for (let i = 0; i < bd.n; i++) {
      const x = bd.pts[i * 2], z = bd.pts[i * 2 + 1];
      base = Math.min(base, G(x, z));
      if (!hit && course.onRoad(x, z, 0.5)) hit = true;
    }
    if (!hit && course.onRoad(bd.cx, bd.cz, 0.5)) hit = true;
    bd.base = base;
    if (hit) { bd.plateau = false; bd.hidden = true; } // 道路にかかる建物は描かず、地面にも塗らない
  }
  hideFamousSites(city);
  city.buildMeshes(scene, mats);
  city.skipPier = (x, z) => course.onRoad(x, z, 3);
  // 首都高 都心環状線は北の丸公園の下をトンネルで通る (代官町〜竹橋)。北の丸の上に高架は描かない
  {
    const [ax, az] = ll(35.6962, 139.7468), [bx, bz] = ll(35.6888, 139.7549);
    for (const r of CITY.roads) for (let i = 0; i < r.x.length; i++) if (r.x[i] > ax && r.x[i] < bx && r.z[i] > az && r.z[i] < bz) r.t[i] = 1;
  }
  city.buildRoads(scene);

  // 名所 (ターザン大東京の手作りモデル)。原点に置いた部品は地面の高さへ持ち上げる
  const place = (fn) => {
    const before = new Set(scene.children);
    const r = fn(scene, city);
    for (const o of scene.children) {
      if (before.has(o)) continue;
      if (o.position.x || o.position.z) o.position.y += G(o.position.x, o.position.z);
      else for (const c of o.children) c.position.y += G(c.position.x, c.position.z);
    }
    return r;
  };
  const tower = place(addTokyoTower);
  place(addDiet);
  const techgym = place((sc, c) => addTechGym(sc, c, { noBalloon: true }));
  const balloon = addBalloon(scene, city);
  const budokan = place(addBudokan);
  const palace = place(addImperialPalace);
  const gates = place(addPalaceGates);
  const tstation = place(addTokyoStation);
  const yk = place(addYotsuyaKudan);
  place(addAkasaka);
  place(addNewOtani);
  const skytreeMat = addSkytree(scene);
  const fuji = addFuji(scene);
  const distant = addDistant(scene);
  const castle = addCastleGates(scene, course, G);
  castle.otemon = addOtemon(scene, course, G);
  castle.sakurada = addSakuradamon(scene, course, G);
  const fountain = addWadakuraFountain(scene, course, G);
  const wake = addWakeNoKiyomaro(scene, course, G);
  castle.hanzo = addHanzomon(scene, course, G);
  place(() => addKusunoki(scene, G));
  const famous = addFamous(scene, G);

  // ---------- 地面 (標高つき) ----------
  const GB = { x0: terrain.x0, z0: terrain.z0, x1: terrain.x0 + (terrain.nx - 1) * terrain.step, z1: terrain.z0 + (terrain.nz - 1) * terrain.step };
  const groundCanvas = document.createElement('canvas');
  const GW = 4096, GH = Math.round(GW * (GB.z1 - GB.z0) / (GB.x1 - GB.x0));
  groundCanvas.width = GW; groundCanvas.height = GH;
  const gsx = GW / (GB.x1 - GB.x0), gsz = GH / (GB.z1 - GB.z0);
  const gx = (x) => (x - GB.x0) * gsx, gz = (z) => (z - GB.z0) * gsz;
  {
    const g = groundCanvas.getContext('2d');
    g.fillStyle = '#5f7a4c';
    g.fillRect(0, 0, GW, GH);
    g.fillStyle = '#7d7c78';
    g.strokeStyle = '#7d7c78';
    g.lineJoin = 'round';
    g.lineWidth = 30 * gsx;
    for (const bd of city.bld) {
      if ((!bd.plateau && bd.base === undefined) || bd.hidden) continue; // 手作りに置き換えた所は塗らない
      if (bd.y0 > 0) continue;
      g.beginPath();
      for (let i = 0; i < bd.n; i++) {
        const x = gx(bd.pts[i * 2]), z = gz(bd.pts[i * 2 + 1]);
        if (i) g.lineTo(x, z); else g.moveTo(x, z);
      }
      g.closePath();
      g.fill(); g.stroke();
    }
    // 皇居前広場: 砂利の広場を、砂利道で区切った芝生の区画に
    const [PX0, PZ0] = ll(35.6832, 139.7556), [PX1, PZ1] = ll(35.6784, 139.7604);
    g.fillStyle = '#d3ccba';
    g.fillRect(gx(PX0), gz(PZ0), (PX1 - PX0) * gsx, (PZ1 - PZ0) * gsz);
    g.fillStyle = '#6f9a4a';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const cw = (PX1 - PX0) / 3, ch = (PZ1 - PZ0) / 4;
      g.fillRect(gx(PX0 + i * cw + 14), gz(PZ0 + j * ch + 14), (cw - 28) * gsx, (ch - 28) * gsz);
    }
    // 道 (幹線道路)
    g.strokeStyle = '#6d6e72';
    g.lineCap = 'round';
    // コースの道路と重なる所は塗らない (地図の道の線とコースの道路が少しずれて、道路の横に灰色の帯が出ないように)
    for (const r of ROADS) {
      g.lineWidth = r[0] * gsx;
      g.beginPath();
      let pen = false;
      for (let i = 1; i + 1 < r.length; i += 2) {
        const X = r[i] / 2, Z2 = r[i + 1] / 2;
        if (course.onRoad(X, Z2, r[0] / 2 + 4)) { pen = false; continue; }
        const x = gx(X), z = gz(Z2);
        if (pen) g.lineTo(x, z); else { g.moveTo(x, z); pen = true; }
      }
      g.stroke();
    }
    // コースの道路の下 (道路のメッシュのすき間から緑が見えないように)
    g.strokeStyle = '#6d6e72';
    g.lineWidth = 24 * gsx;
    g.beginPath();
    for (let i = 0; i <= course.N; i += 4) { const k = i % course.N; const x = gx(course.X[k]), z = gz(course.Z[k]); if (i) g.lineTo(x, z); else g.moveTo(x, z); }
    g.stroke();
    // 水面
    g.fillStyle = '#3d6f80';
    for (const poly of WATER) {
      g.beginPath();
      for (const ring of poly) {
        for (let i = 0; i < ring.length; i += 2) { const x = gx(ring[i] / 2), z = gz(ring[i + 1] / 2); if (i) g.lineTo(x, z); else g.moveTo(x, z); }
        g.closePath();
      }
      g.fill('evenodd');
    }
  }
  const groundTex = new THREE.CanvasTexture(groundCanvas);
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.anisotropy = 8;
  {
    const { nx, nz, step, x0, z0, h } = terrain;
    const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = x0 + i * step, z = z0 + j * step;
      pos[k * 3] = x; pos[k * 3 + 1] = h[k]; pos[k * 3 + 2] = z;
      uv[k * 2] = (x - GB.x0) / (GB.x1 - GB.x0); uv[k * 2 + 1] = 1 - (z - GB.z0) / (GB.z1 - GB.z0);
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
    let p = 0;
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx[p++] = a; idx[p++] = c; idx[p++] = b; idx[p++] = b; idx[p++] = c; idx[p++] = d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    var ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: groundTex }));
    scene.add(ground);
  }
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshLambertMaterial({ color: 0x5f7a4c }));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 1;
  outer.material.depthWrite = false;
  outer.renderOrder = -2;
  scene.add(outer);

  // ---------- お濠と川: 水の形の穴を地面にあけ (ステンシル)、水面と石垣を描く。水面には景色が映る ----------
  const waterInfo = buildWater();
  function buildWater() {
    const pos = [], wall = [], mask = [];
    const toV = (ring) => { const v = []; for (let i = 0; i < ring.length; i += 2) v.push(new THREE.Vector2(ring[i] / 2, ring[i + 1] / 2)); return v; };
    const WC = 64, wgrid = new Map();
    const rings = WATER.map((poly) => poly.map((r) => { const a = new Float32Array(r.length); for (let i = 0; i < r.length; i++) a[i] = r[i] / 2; return a; }));
    rings.forEach((poly, pi) => {
      const r = poly[0];
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); z0 = Math.min(z0, r[i + 1]); z1 = Math.max(z1, r[i + 1]); }
      for (let a = Math.floor(x0 / WC); a <= Math.floor(x1 / WC); a++) for (let b = Math.floor(z0 / WC); b <= Math.floor(z1 / WC); b++) {
        const k = a + ',' + b;
        if (!wgrid.has(k)) wgrid.set(k, []);
        wgrid.get(k).push(pi);
      }
    });
    const inRing = (r, x, z) => {
      let c = false;
      for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
        if ((r[i + 1] > z) !== (r[j + 1] > z) && x < (r[j] - r[i]) * (z - r[i + 1]) / (r[j + 1] - r[i + 1]) + r[i]) c = !c;
      }
      return c;
    };
    // (x, z) が水の上なら、その水面の高さ。でなければ null
    const levelAt = (x, z) => {
      const l = wgrid.get(Math.floor(x / WC) + ',' + Math.floor(z / WC));
      if (l) for (const pi of l) {
        const poly = rings[pi];
        if (inRing(poly[0], x, z) && !poly.slice(1).some((h) => inRing(h, x, z))) return WATER_LEVEL[pi];
      }
      return null;
    };
    WATER.forEach((poly, pi) => {
      const lv = WATER_LEVEL[pi];
      const outer = toV(poly[0]);
      const holes = poly.slice(1).map(toV);
      let tris;
      try { tris = THREE.ShapeUtils.triangulateShape(outer, holes); } catch (e) { return; }
      const all = outer.concat(...holes);
      for (const [a, b, c] of tris) {
        const A = all[a], B = all[b], C = all[c];
        const ny = (B.y - A.y) * (C.x - A.x) - (B.x - A.x) * (C.y - A.y);
        const tri = ny >= 0 ? [A, B, C] : [A, C, B];
        for (const p of tri) { pos.push(p.x, lv, p.y); mask.push(p.x, G(p.x, p.y) + 0.05, p.y); }
      }
      // 岸の石垣 (水面から地面まで)。両側とも水の継ぎ目には立てない
      for (const ring of [outer, ...holes]) {
        for (let k = 0; k < ring.length; k++) {
          const A = ring[k], B = ring[(k + 1) % ring.length];
          const L = Math.hypot(B.x - A.x, B.y - A.y);
          if (L < 0.01) continue;
          const mx = (A.x + B.x) / 2, mz = (A.y + B.y) / 2, nx = (B.y - A.y) / L * 1.5, nz = -(B.x - A.x) / L * 1.5;
          if (levelAt(mx + nx, mz + nz) !== null && levelAt(mx - nx, mz - nz) !== null) continue;
          const ta = Math.max(lv + 0.3, G(A.x, A.y) + 0.05), tb = Math.max(lv + 0.3, G(B.x, B.y) + 0.05);
          const da = lv - 1, db = lv - 1;
          wall.push(A.x, da, A.y, B.x, db, B.y, B.x, tb, B.y, A.x, da, A.y, B.x, tb, B.y, A.x, ta, A.y);
        }
      }
    });
    const geo = (arr) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
    const maskMesh = new THREE.Mesh(geo(mask), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }));
    maskMesh.renderOrder = -1;
    scene.add(maskMesh);
    Object.assign(ground.material, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.KeepStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp });
    // 水面: 鏡に映した景色 (下の reflect) を、さざ波でゆらして重ねる
    const rt = new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType });
    const waterMat = new THREE.ShaderMaterial({
      uniforms: {
        tReflect: { value: rt.texture }, texMat: { value: new THREE.Matrix4() }, time: { value: 0 },
        color: { value: new THREE.Color(0x2f5a63) }, fogColor: { value: new THREE.Color() }, fogNear: { value: 300 }, fogFar: { value: 2000 },
        camPos: { value: new THREE.Vector3() }, strength: { value: 0.75 },
      },
      vertexShader: `uniform mat4 texMat; varying vec4 vR; varying vec3 vW; varying float vDepth;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vR = texMat * w;
          vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D tReflect; uniform float time; uniform vec3 color; uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; uniform vec3 camPos; uniform float strength;
        varying vec4 vR; varying vec3 vW; varying float vDepth;
        void main(){
          vec2 p = vW.xz;
          float w1 = sin(p.x * 0.35 + time * 1.3) + sin(p.y * 0.42 - time * 1.1) + sin((p.x + p.y) * 0.9 + time * 2.1) * 0.5;
          float w2 = cos(p.y * 0.31 + time * 1.2) + cos(p.x * 0.47 + time * 0.9) + cos((p.x - p.y) * 1.1 - time * 1.7) * 0.5;
          vec4 r = vR; r.xy += vec2(w1, w2) * 0.012 * r.w;
          vec3 refl = texture2DProj(tReflect, r).rgb;
          vec3 v = normalize(camPos - vW);
          float fres = 0.25 + 0.75 * pow(1.0 - max(v.y, 0.0), 3.0);
          vec3 c = mix(color, refl, clamp(fres * strength + 0.15, 0.0, 0.95));
          c += vec3(0.04) * (w1 * 0.5 + 0.5) * (1.0 - fres);
          float f = smoothstep(fogNear, fogFar, vDepth);
          gl_FragColor = vec4(mix(c, fogColor, f), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const water = new THREE.Mesh(geo(pos), waterMat);
    scene.add(water);
    const sc = document.createElement('canvas');
    sc.width = 128; sc.height = 64;
    ((c, w, h) => {
      c.fillStyle = '#8f8b80';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(50,45,40,0.45)';
      c.lineWidth = 2;
      for (let y = 0; y < h; y += 16) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
        for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 16); c.stroke(); }
      }
    })(sc.getContext('2d'), 128, 64);
    const stoneTex = new THREE.CanvasTexture(sc);
    stoneTex.colorSpace = THREE.SRGBColorSpace;
    stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
    const wg = geo(wall);
    const uv = [];
    for (let i = 0; i < wall.length; i += 18) {
      const L = Math.hypot(wall[i + 3] - wall[i], wall[i + 5] - wall[i + 2]) / 4;
      const ha = (wall[i + 16] - wall[i + 1]) / 2, hb = (wall[i + 7] - wall[i + 4]) / 2;
      uv.push(0, 0, L, 0, L, hb, 0, 0, L, hb, 0, ha);
    }
    wg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    scene.add(new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ map: stoneTex, side: THREE.DoubleSide })));
    return { levelAt, water, waterMat, rt };
  }
  city.waterAt = (x, z) => (waterInfo.levelAt(x, z) !== null ? 1 : 0);
  // 二重橋は皇居前広場 (内堀通り) の方へ横腹を見せる (広場から2つのアーチが見える)
  const nijuFace = (() => {
    // ゴール手前 (祝田橋 → 二重橋前) の内堀通りで、橋にいちばん近い所
    const [x, z] = ll(35.67973, 139.75457);
    let best = null, bd = 1e18;
    for (let d = course.L - 300; d < course.L; d += 2) { const p = course.frame(d); const q = (p.x - x) ** 2 + (p.z - z) ** 2; if (q < bd) { bd = q; best = [p.x, p.z]; } }
    return best;
  })();
  const nijubashi = addNijubashi(scene, G, waterInfo.levelAt, nijuFace);

  // 水面の映り込み: いちばん近い水面の高さを鏡にして、カメラを上下反転した所から描く (three.js の Reflector と同じ方法)
  const mirrorCam = new THREE.PerspectiveCamera();
  const rScale = isTouch ? 0.33 : 0.5;
  const _v = new THREE.Vector3(), _t = new THREE.Vector3(), _n = new THREE.Vector3(0, 1, 0), _rm = new THREE.Matrix4(), _la = new THREE.Vector3();
  const _plane = new THREE.Plane(), _clip = new THREE.Vector4(), _q = new THREE.Vector4();
  let mirrorLevel = 3;
  function reflect(camera) {
    const w = Math.max(64, Math.floor(renderer.domElement.width * rScale)), h = Math.max(64, Math.floor(renderer.domElement.height * rScale));
    if (waterInfo.rt.width !== w || waterInfo.rt.height !== h) waterInfo.rt.setSize(w, h);
    // 近くの水面の高さ (前の方を少し探す)
    const cp = camera.position;
    let best = null;
    for (let r = 0; r <= 120 && best === null; r += 15) {
      for (let a = 0; a < 8 && best === null; a++) {
        const lv = waterInfo.levelAt(cp.x + Math.cos(a * 0.785) * r, cp.z + Math.sin(a * 0.785) * r);
        if (lv !== null) best = lv;
      }
    }
    if (best !== null) mirrorLevel += (best - mirrorLevel) * 0.1;
    const P = new THREE.Vector3(0, mirrorLevel, 0);
    camera.updateMatrixWorld();
    _v.subVectors(P, cp);
    if (_v.dot(_n) > 0) return;
    _v.reflect(_n).negate().add(P);
    _rm.extractRotation(camera.matrixWorld);
    _la.set(0, 0, -1).applyMatrix4(_rm).add(cp);
    _t.subVectors(P, _la).reflect(_n).negate().add(P);
    mirrorCam.position.copy(_v);
    mirrorCam.up.set(0, 1, 0).applyMatrix4(_rm).reflect(_n);
    mirrorCam.lookAt(_t);
    mirrorCam.far = camera.far;
    mirrorCam.updateMatrixWorld();
    mirrorCam.projectionMatrix.copy(camera.projectionMatrix);
    const tm = waterInfo.waterMat.uniforms.texMat.value;
    tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    tm.multiply(mirrorCam.projectionMatrix).multiply(mirrorCam.matrixWorldInverse);
    // 水面より下を切り落とす (斜めのクリップ面)
    _plane.setFromNormalAndCoplanarPoint(_n, P).applyMatrix4(mirrorCam.matrixWorldInverse);
    _clip.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
    const pm = mirrorCam.projectionMatrix.elements;
    _q.x = (Math.sign(_clip.x) + pm[8]) / pm[0];
    _q.y = (Math.sign(_clip.y) + pm[9]) / pm[5];
    _q.z = -1;
    _q.w = (1 + pm[10]) / pm[14];
    _clip.multiplyScalar(2 / _clip.dot(_q));
    pm[2] = _clip.x; pm[6] = _clip.y; pm[10] = _clip.z + 1 - 0.003; pm[14] = _clip.w;
    waterInfo.water.visible = false;
    const fogFar = scene.fog.far;
    scene.fog.far = Math.min(fogFar, 1200);
    renderer.setRenderTarget(waterInfo.rt);
    renderer.clear();
    renderer.render(scene, mirrorCam);
    renderer.setRenderTarget(null);
    scene.fog.far = fogFar;
    waterInfo.water.visible = true;
    const u = waterInfo.waterMat.uniforms;
    u.camPos.value.copy(cp);
  }

  // ---------- 幹線道路 (コース以外) ----------
  {
    const pos = [], col = [];
    const asphalt = [0.36, 0.37, 0.39], white = [0.92, 0.92, 0.9];
    const strip = (x1, z1, x2, z2, w, dy, c) => {
      const L = Math.hypot(x2 - x1, z2 - z1);
      if (L < 0.1) return;
      const ux = (x2 - x1) / L, uz = (z2 - z1) / L;
      const lx = uz * w / 2, lz = -ux * w / 2, ex = ux * w * 0.35, ez = uz * w * 0.35;
      const P = [[x1 + lx - ex, z1 + lz - ez], [x1 - lx - ex, z1 - lz - ez], [x2 - lx + ex, z2 - lz + ez], [x2 + lx + ex, z2 + lz + ez]];
      const V = P.map(([x, z]) => [x, G(x, z) + dy, z]);
      pos.push(...V[0], ...V[1], ...V[2], ...V[0], ...V[2], ...V[3]);
      for (let k = 0; k < 6; k++) col.push(...c);
    };
    for (const r of ROADS) {
      const w = r[0];
      for (let i = 1; i + 3 < r.length; i += 2) {
        let x1 = r[i] / 2, z1 = r[i + 1] / 2;
        const x2 = r[i + 2] / 2, z2 = r[i + 3] / 2;
        const L = Math.hypot(x2 - x1, z2 - z1), k = Math.max(1, Math.ceil(L / 20));
        for (let j = 0; j < k; j++) {
          const ax = x1 + (x2 - x1) * j / k, az = z1 + (z2 - z1) * j / k, bx = x1 + (x2 - x1) * (j + 1) / k, bz = z1 + (z2 - z1) * (j + 1) / k;
          const mx = (ax + bx) / 2, mz = (az + bz) / 2;
          if (waterInfo.levelAt(mx, mz) !== null || course.onRoad(mx, mz, 2)) continue;
          strip(ax, az, bx, bz, w, 0.12, asphalt);
          if (w >= 16) strip(ax, az, bx, bz, 0.45, 0.14, white);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  }

  // ---------- コースの道路 (歩道・ランナーに開放した車線・中央線・対向車線) ----------
  const roadMeshes = buildCourseRoad(scene, course);

  // ---------- 木 ----------
  let clearTrees = () => {};
  const gyokoLamps = [];
  const insideBuilding = (x, z) => { const l = city.cell(x, z); if (l) for (const bd of l) if (bd.plateau && city.inside(bd, x, z)) return true; return false; };
  {
    const img = groundCanvas.getContext('2d').getImageData(0, 0, GW, GH).data;
    const pts = [];
    let s = 99;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const isGreen = (x, z) => { const i = (Math.floor(gz(z)) * GW + Math.floor(gx(x))) * 4; return img[i + 1] > img[i] + 12 && img[i + 1] > img[i + 2]; };
    // 公園・皇居・北の丸の緑 (コースのまわり 1.6km)
    const [CX, CZ] = ll(35.6855, 139.7530);
    for (let k = 0; k < 90000 && pts.length < 11000; k++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 1700;
      const x = CX + Math.cos(a) * r, z = CZ + Math.sin(a) * r;
      if (!isGreen(x, z) || waterInfo.levelAt(x, z) !== null || insideBuilding(x, z) || course.onRoad(x, z, 2.5)) continue;
      // 301号の街側の歩道ぎわにも植えない
      const nr = course.nearest(x, z, 30);
      if (nr && course.oneway(nr.s) && nr.u > 0 && nr.u < 3.5 + 12) continue;
      pts.push([x, z, rnd(), 0]);
    }
    // 皇居前広場の芝生には黒松をたくさん
    const [QX0, QZ0] = ll(35.6832, 139.7556), [QX1, QZ1] = ll(35.6784, 139.7604);
    for (let k = 0; k < 2600; k++) {
      const x = QX0 + rnd() * (QX1 - QX0), z = QZ0 + rnd() * (QZ1 - QZ0);
      if (isGreen(x, z) && !course.onRoad(x, z, 2)) pts.push([x, z, rnd(), 1]);
    }
    // 沿道: お濠側は松と桜 (千鳥ヶ淵・半蔵門は桜並木)、街側は銀杏 (10月の終わりなので黄色くなりはじめ)。
    const chidori = course.labels.find((l) => l.name === '九段坂上'), hanzo = course.labels.find((l) => l.name === '半蔵門');
    // 都道301号 (一方通行の区間) には街路樹がない
    for (let d = 0; d < course.L; d += 9 + rnd() * 5) {
      if (course.oneway(d)) continue;
      // 竹橋〜清水門のお濠側は木を植えない (武道館が見えるように)
      const openView = d > course.labels.find((l) => l.name === '竹橋').s && d < course.labels.find((l) => l.name === '九段下').s;
      const ul = course.walkEdge(d) - 2.4 - rnd() * 2;
      const pl = course.world(d, ul);
      const sakura = d > chidori.s && d < hanzo.s + 150;
      if (!openView && waterInfo.levelAt(pl.x, pl.z) === null && !insideBuilding(pl.x, pl.z)) pts.push([pl.x, pl.z, rnd(), sakura ? 2 : 1, pl.y]);
      const ur = course.rightEdge(d) + 3.5 + 1.2;
      const pr = course.world(d, ur);
      if (rnd() < 0.8 && waterInfo.levelAt(pr.x, pr.z) === null && !insideBuilding(pr.x, pr.z)) pts.push([pr.x, pr.z, rnd(), 3, pr.y]);
    }
    // 行幸通り: 和田倉門から東京駅へまっすぐ。両側に銀杏並木と街灯 (真ん中は駅舎が見えるように空ける)
    {
      const [SX, SZ] = tstation.pos;
      const n = course.nearest(SX, SZ, 1000) || null;
      let best = 0, bd = 1e18;
      for (let d = 0; d < 800; d += 2) { const f = course.frame(d); const q = (f.x - SX) ** 2 + (f.z - SZ) ** 2; if (q < bd) { bd = q; best = d; } }
      void n;
      const a = course.world(best, course.rightEdge(best) + 8), L = Math.hypot(SX - a.x, SZ - a.z);
      const ux = (SX - a.x) / L, uz = (SZ - a.z) / L;
      for (let t = 0; t < L - 40; t += 11) for (const side of [-1, 1]) for (const off of [24, 30]) {
        const x = a.x + ux * t - uz * side * off, z = a.z + uz * t + ux * side * off;
        if (!insideBuilding(x, z)) pts.push([x, z, rnd(), 3, G(x, z)]);
        if (off === 24 && Math.floor(t / 11) % 2 === 0) gyokoLamps.push([x - uz * side * -3, z + ux * side * -3]);
      }
    }
    const crown = new THREE.IcosahedronGeometry(1, 0);
    crown.translate(0, 1.6, 0);
    // 黒松: 斜めの幹から、平たい葉のかたまりが段になって横に張り出す
    const pineParts = [];
    for (const [x, y, z, r] of [[0.0, 0.0, 0.0, 1.0], [0.75, -0.35, 0.25, 0.7], [-0.6, -0.55, -0.35, 0.65], [0.25, 0.42, -0.2, 0.6], [-0.3, -0.15, 0.6, 0.55]]) {
      const c = new THREE.IcosahedronGeometry(r, 1);
      c.scale(1.25, 0.42, 1.25);
      c.translate(x, y, z);
      pineParts.push(c.toNonIndexed());
    }
    const pineGeo = new THREE.BufferGeometry();
    {
      const arr = [];
      for (const g of pineParts) arr.push(...g.attributes.position.array);
      pineGeo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      pineGeo.computeVertexNormals();
    }
    const trunk = new THREE.CylinderGeometry(0.18, 0.25, 1, 5);
    trunk.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(crown, new THREE.MeshLambertMaterial({ color: 0xffffff }), pts.length);
    const pm = new THREE.InstancedMesh(pineGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), pts.length);
    let np = 0;
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    const pineIdx = new Int32Array(pts.length).fill(-1);
    const tm = new THREE.InstancedMesh(trunk, new THREE.MeshLambertMaterial({ color: 0x5a4636 }), pts.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    pts.forEach(([x, z, r, kind, yy], i) => {
      const y = yy !== undefined ? yy : G(x, z);
      const sc = kind === 3 ? 2.2 + r * 1.1 : 2.6 + r * 3.2; // 樹冠の大きさ (公園の木は直径およそ5〜11m)
      if (kind === 1) {
        // 黒松 (段になった平たい葉のかたまり、濃い緑)。幹は少し傾ける
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r * 6.28, 0));
        m4.compose(new THREE.Vector3(x, y + sc * 0.62 + 1.2, z), q, new THREE.Vector3(sc * 0.6, sc * 0.75, sc * 0.6));
        pm.setMatrixAt(np, m4);
        pineIdx[i] = np;
        pm.setColorAt(np, col.setHSL(0.3 + r * 0.04, 0.32, 0.15 + r * 0.06));
        np++;
        im.setMatrixAt(i, hide);
        im.setColorAt(i, col);
        m4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((r - 0.5) * 0.35, 0, (r - 0.3) * 0.3)), new THREE.Vector3(0.9, sc * 0.62 + 1.2, 0.9));
        tm.setMatrixAt(i, m4);
        return;
      } else if (kind === 2) {
        // 桜 (秋: 赤茶に色づいた葉)
        m4.makeScale(sc * 1.1, sc * 0.75, sc * 1.1).setPosition(x, y + 1.4, z);
        col.setHSL(0.04 + r * 0.04, 0.5, 0.32 + r * 0.08);
      } else if (kind === 3) {
        // 銀杏: 細長い円すいっぽい形、黄緑〜黄色
        m4.makeScale(sc * 0.8, sc * 1.6, sc * 0.8).setPosition(x, y + 1.2, z);
        col.setHSL(0.13 + r * 0.06, 0.7, 0.42);
      } else {
        m4.makeScale(sc, sc * 1.1, sc).setPosition(x, y, z);
        if (r < 0.12) col.setHex(0xe0b52a); else if (r < 0.18) col.setHex(0xc4512c); else col.setHSL(0.27 + r * 0.06, 0.45, 0.22 + r * 0.1);
      }
      im.setMatrixAt(i, m4);
      im.setColorAt(i, col);
      m4.makeScale(1, kind === 0 ? 2 : 3.2, 1).setPosition(x, y, z);
      tm.setMatrixAt(i, m4);
    });
    pm.count = np;
    scene.add(im, tm, pm);
    // 見せ場の視線をさえぎる木を取り除く (segs: [[ax, az, bx, bz, 半径], ...])
    clearTrees = (segs) => {
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      pts.forEach(([x, z, r, kind], i) => {
        for (const [ax, az, bx, bz, rad] of segs) {
          const ex = bx - ax, ez = bz - az, L2 = ex * ex + ez * ez || 1;
          const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2));
          if (Math.hypot(x - ax - ex * t, z - az - ez * t) < rad) {
            tm.setMatrixAt(i, zero);
            im.setMatrixAt(i, zero);
            if (pineIdx[i] >= 0) pm.setMatrixAt(pineIdx[i], zero);
            break;
          }
        }
      });
      tm.instanceMatrix.needsUpdate = im.instanceMatrix.needsUpdate = pm.instanceMatrix.needsUpdate = true;
    };
    // 二重橋のお濠の上には木を植えない
    clearTrees([nijubashi.moat]);
  }

  // ---------- 街灯 (歩道のお濠側) ----------
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xfff3d0, emissive: 0xffe6a8, emissiveIntensity: 0 });
  {
    const list = [];
    for (let d = 5; d < course.L; d += 32) list.push(course.world(d, course.walkEdge(d) + 0.5));
    for (const [x, z] of gyokoLamps) list.push({ x, y: G(x, z), z });
    const pole = new THREE.CylinderGeometry(0.07, 0.1, 5, 6);
    pole.translate(0, 2.5, 0);
    const head = new THREE.SphereGeometry(0.32, 10, 8);
    const pm = new THREE.InstancedMesh(pole, new THREE.MeshLambertMaterial({ color: 0x2c3530 }), list.length);
    const hm = new THREE.InstancedMesh(head, lampMat, list.length);
    const m4 = new THREE.Matrix4();
    list.forEach((p, i) => {
      pm.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z));
      hm.setMatrixAt(i, m4.makeTranslation(p.x, p.y + 5.1, p.z));
    });
    scene.add(pm, hm);
  }

  // ---------- スタート / ゴールのゲート (二重橋前) ----------
  addStartGate(scene, course);

  // ---------- 時間帯 ----------
  function applyTod(k) {
    const t = TOD[k];
    skyMat.uniforms.top.value.setHex(t.top);
    skyMat.uniforms.hor.value.setHex(t.hor);
    skyMat.uniforms.sunCol.value.setHex(t.sun);
    skyMat.uniforms.sunDir.value.set(...t.sunDir).normalize();
    skyMat.uniforms.night.value = k === 'night' ? 1 : 0;
    scene.fog.color.setHex(t.fog);
    scene.fog.far = Math.min(t.fogFar, DRAW_R);
    distant.setTod(k === 'morning' ? 'day' : k, t.fog);
    fuji.setTod(k === 'morning' ? 'day' : k);
    sun.color.setHex(t.sun);
    sun.intensity = t.sunI;
    sun.position.set(...t.sunDir).multiplyScalar(1000);
    hemi.intensity = t.hemi;
    mats.glass.emissiveIntensity = t.emi;
    mats.office.emissiveIntensity = t.emi * 0.9;
    tower.light.intensity = k === 'night' ? 60000 : 0;
    tower.mats[0].emissive.setHex(k === 'day' || k === 'morning' ? 0x000000 : 0xffd59a);
    tower.mats[0].emissiveIntensity = k === 'night' ? 0.8 : 0.3;
    for (const m of tower.glow) m.emissive.setHex(k === 'night' ? 0xc0480c : k === 'dusk' ? 0x2a0e04 : 0x000000);
    techgym.setNight(k === 'morning' ? 'day' : k);
    balloon.setNight(k);
    skytreeMat.color.setHex(k === 'night' ? 0x6a86b8 : 0xd8e2ea);
    lampMat.emissiveIntensity = k === 'night' ? 1.2 : k === 'dusk' ? 0.5 : 0;
    waterInfo.waterMat.uniforms.color.value.setHex(k === 'night' ? 0x0c1a22 : k === 'dusk' ? 0x3a4a52 : 0x2f5a63);
    waterInfo.waterMat.uniforms.strength.value = k === 'night' ? 0.95 : 0.75;
    roadMeshes.setNight(k === 'night');
    return t;
  }

  function update(dt, camera, time) {
    while (city.streamTiles(camera.position.x, camera.position.z, DRAW_R, 1) > 0 && false);
    city.streamTiles(camera.position.x, camera.position.z, DRAW_R, 2);
    techgym.update(time);
    balloon.update(time);
    fountain.update(time);
    distant.follow(camera);
    fuji.follow(camera);
    sky.position.copy(camera.position);
    const u = waterInfo.waterMat.uniforms;
    u.time.value = time;
    u.fogColor.value.copy(scene.fog.color);
    u.fogNear.value = scene.fog.near;
    u.fogFar.value = scene.fog.far;
  }
  // スタート地点のまわりのタイルを先に組み立てる
  function prebuild(x, z) { while (city.streamTiles(x, z, 900, 4) > 0); }

  return { fountain, wake, nijubashi, famous, castle, clearTrees: (segs) => clearTrees(segs), city, applyTod, update, reflect, prebuild, DRAW_R, budokan, gates, palace, yk, tstation, balloonPos: balloon.pos, waterLevelAt: waterInfo.levelAt };
}

// コースの道路のメッシュ
function buildCourseRoad(scene, course) {
  const pos = [], col = [], mpos = [], mcol = [];
  const C = {
    walk: [0.72, 0.66, 0.58], walkEdge: [0.62, 0.6, 0.56], curb: [0.78, 0.78, 0.76], lane: [0.33, 0.34, 0.37], runner: [0.4, 0.33, 0.33],
    onc: [0.31, 0.32, 0.35], rwalk: [0.66, 0.66, 0.66], white: [0.94, 0.94, 0.92], yellow: [0.98, 0.78, 0.15], orange: [1.0, 0.5, 0.1], cob1: [0.55, 0.52, 0.48], cob2: [0.66, 0.62, 0.56], green: [0.25, 0.35, 0.3],
  };
  const P = {};
  const pt = (s, u, dy) => { course.world(s, u, P); return [P.x, course.heightAt(s) + dy, P.z]; };
  const quad = (arr, carr, a, b, c, d, color) => { arr.push(...a, ...b, ...c, ...a, ...c, ...d); for (let k = 0; k < 6; k++) carr.push(...color); };
  // 1区間 (s0→s1) の帯 (u0→u1、高さ dy)
  const band = (s0, s1, u0a, u1a, u0b, u1b, dy, color, arr = pos, carr = col) => {
    quad(arr, carr, pt(s0, u0a, dy), pt(s1, u0b, dy), pt(s1, u1b, dy), pt(s0, u1a, dy), color);
  };
  const wall = (s0, s1, ua, ub, y0, y1, color) => {
    quad(pos, col, pt(s0, ua, y0), pt(s0, ua, y1), pt(s1, ub, y1), pt(s1, ub, y0), color);
  };
  const ST = 2;
  const cobble = [course.labels.find((l) => l.name === '九段坂上').s + 15, course.labels.find((l) => l.name === '千鳥ヶ淵交差点').s - 10];
  for (let s = 0; s < course.L; s += ST) {
    const s1 = Math.min(course.L, s + ST);
    const la = course.leftEdge(s), lb = course.leftEdge(s1), ra = course.rightEdge(s), rb = course.rightEdge(s1);
    const wa = la - course.walkW(s), wb = lb - course.walkW(s1);
    // お濠側の縁石 (柵の土台)
    band(s, s1, wa - 0.5, wa, wb - 0.5, wb, CURB_H + 0.35, C.walkEdge);
    wall(s, s1, wa - 0.5, wb - 0.5, -1.5, CURB_H + 0.35, C.walkEdge);
    // 歩道 (千鳥ヶ淵は石畳: 濃淡の石を並べる)
    if (s > cobble[0] && s < cobble[1]) {
      const n = 4;
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n;
        const tone = ((Math.floor(s / ST) + k) % 2) ? C.cob1 : C.cob2;
        band(s, s1, wa + (la - wa) * t0, wa + (la - wa) * t1, wb + (lb - wb) * t0, wb + (lb - wb) * t1, CURB_H, tone);
      }
    } else band(s, s1, wa, la, wb, lb, CURB_H, C.walk);
    wall(s, s1, la, lb, -0.6, CURB_H, C.curb);
    // ランナーに開放した車線 / 対向車線
    band(s, s1, la, 0, lb, 0, 0, C.runner);
    band(s, s1, 0, ra, 0, rb, 0, C.onc);
    // 右の歩道
    wall(s, s1, rb, ra, -0.6, CURB_H, C.curb);
    band(s, s1, ra, ra + 3.5, rb, rb + 3.5, CURB_H, C.rwalk);
    // 白線: 外側の線、車線の境目 (破線)、中央線 (黄色の2本線)
    const dash = Math.floor(s / 4) % 3 !== 0;
    band(s, s1, la + 0.15, la + 0.3, lb + 0.15, lb + 0.3, 0.02, C.white, mpos, mcol);
    band(s, s1, ra - 0.3, ra - 0.15, rb - 0.3, rb - 0.15, 0.02, C.white, mpos, mcol);
    if (course.nr(s) > 0.8 && course.nr(s1) > 0.8) {
      band(s, s1, -0.3, -0.15, -0.3, -0.15, 0.02, C.yellow, mpos, mcol);
      band(s, s1, 0.15, 0.3, 0.15, 0.3, 0.02, C.yellow, mpos, mcol);
    }
    // 一方通行 (301号) のランナーの車線と車の車線の境目 (オレンジの線)
    if (course.oneway(s) && course.oneway(s1)) band(s, s1, la + LANE_W - 0.1, la + LANE_W + 0.1, lb + LANE_W - 0.1, lb + LANE_W + 0.1, 0.025, C.orange, mpos, mcol);
    if (dash) {
      for (let k = 1; k < 4; k++) {
        if (course.nl(s) > k + 0.5 && course.nl(s1) > k + 0.5 && !(course.oneway(s) && k === course.nl(s) - 1 - 0 && false)) band(s, s1, -k * LANE_W - 0.07, -k * LANE_W + 0.07, -k * LANE_W - 0.07, -k * LANE_W + 0.07, 0.02, C.white, mpos, mcol);
        if (course.nr(s) > k + 0.5 && course.nr(s1) > k + 0.5) band(s, s1, k * LANE_W - 0.07, k * LANE_W + 0.07, k * LANE_W - 0.07, k * LANE_W + 0.07, 0.02, C.white, mpos, mcol);
      }
    }
    // 柵の手すり
    band(s, s1, wa - 0.3, wa - 0.2, wb - 0.3, wb - 0.2, CURB_H + 1.0, C.green, mpos, mcol);
  }
  const mk = (p, c, opt) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, ...opt }));
    scene.add(m);
    return m;
  };
  const road = mk(pos, col, { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -12 });
  const marks = mk(mpos, mcol, { polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -24 });
  // 柵の柱
  const posts = [];
  for (let s = 0; s < course.L; s += 2.5) posts.push(course.world(s, course.walkEdge(s) - 0.25));
  const pg = new THREE.BoxGeometry(0.1, 1.0, 0.1);
  pg.translate(0, 0.5, 0);
  const pm = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: 0x3c4a40 }), posts.length);
  const m4 = new THREE.Matrix4();
  posts.forEach((p, i) => pm.setMatrixAt(i, m4.makeTranslation(p.x, p.y + 0.15 + 0.35 - 0.15, p.z)));
  scene.add(pm);
  return { setNight(n) { marks.material.emissive = new THREE.Color(n ? 0x222222 : 0x000000); } };
}

// スタート / ゴールの門 (二重橋前、こちら向きの車線と歩道にまたがる)
function addStartGate(scene, course) {
  const s = 0.5;
  const ul = course.walkEdge(s) - 0.2, ur = 0.6;
  const A = course.world(s, ul), B = course.world(s, ur), M = course.world(s, (ul + ur) / 2);
  const g = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xd8342c });
  for (const P of [A, B]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), red);
    p.position.set(P.x, P.y + 3, P.z);
    g.add(p);
  }
  const W = ur - ul;
  const tex = canvasTex(1024, 128, (c, w, h) => {
    c.fillStyle = '#d8342c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    // 幅に収まる大きさの文字で
    const text = '皇居ラン  START / GOAL';
    let fs = 84;
    c.font = `bold ${fs}px ${JP}`;
    while (c.measureText(text).width > w - 60 && fs > 20) { fs -= 2; c.font = `bold ${fs}px ${JP}`; }
    c.fillText(text, w / 2, h / 2 + 4);
  });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(W, 1.6), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  banner.position.set(M.x, M.y + 5.4, M.z);
  banner.rotation.y = M.yaw + Math.PI;
  g.add(banner);
  scene.add(g);
}

// 沿道の江戸城の門: 高麗門 + 渡櫓門 (石垣の上の白い櫓)。道路の方を向ける
function addCastleGates(scene, course, G) {
  const stone = new THREE.MeshLambertMaterial({ color: 0x9a958b });
  const white = new THREE.MeshLambertMaterial({ color: 0xf4f2ec });
  const roofM = new THREE.MeshLambertMaterial({ color: 0x3e4448 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2f2a26 });
  const g = new THREE.Group();
  const gate = (lat, lon, w, big) => {
    let [X, Z] = ll(lat, lon);
    const n = course.nearest(X, Z, 300);
    let rot = 0;
    if (n) {
      const f = course.frame(n.s);
      rot = Math.atan2(f.tx, f.tz);
      // 道路にかからないよう、お濠側の歩道の外へ
      const umin = course.walkEdge(n.s) - 14;
      if (n.u > umin) { const p = course.world(n.s, umin); X = p.x; Z = p.z; }
    }
    const b = new THREE.Group();
    b.position.set(X, G(X, Z), Z);
    b.rotation.y = rot + Math.PI / 2;
    // 石垣
    for (const s of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 6, big ? 16 : 10), stone);
      wall.position.set(s * (w / 2 + 6), 3, 0);
      b.add(wall);
    }
    // 高麗門
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.5, 1.1), dark);
      post.position.set(s * w / 2, 3.25, -3);
      b.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.9, 1.3), dark);
    beam.position.set(0, 6.5, -3);
    b.add(beam);
    const kr = new THREE.Mesh(hipGeo, roofM);
    kr.scale.set(w + 4, 2.2, 4.5);
    kr.position.set(0, 7.9, -3);
    b.add(kr);
    // 渡櫓門
    if (big) {
      const yag = new THREE.Mesh(new THREE.BoxGeometry(w + 24, 5, 10), white);
      yag.position.set(0, 8.5, 4);
      b.add(yag);
      const op = new THREE.Mesh(new THREE.BoxGeometry(w, 6, 10.2), dark);
      op.position.set(0, 3, 4);
      b.add(op);
      const r = new THREE.Mesh(hipGeo, roofM);
      r.scale.set(w + 28, 3.5, 14);
      r.position.set(0, 12.7, 4);
      b.add(r);
    }
    g.add(b);
    return [X, Z, rot];
  };
  // 大手門は addOtemon (landmarks3.js) で作る
  const hirakawa = gate(35.68895, 139.75730, 6, true);   // 平川門
  // 平川橋: 内堀通りからお濠を渡って平川門へ行く木の橋 (擬宝珠の欄干)
  {
    const [HX, HZ] = hirakawa;
    const n = course.nearest(HX, HZ, 300);
    if (n) {
      const p = course.world(n.s, course.walkEdge(n.s) - 0.5);
      const dx = HX - p.x, dz = HZ - p.z, L = Math.hypot(dx, dz);
      const br = new THREE.Group();
      br.position.set(p.x, p.y, p.z);
      br.rotation.y = Math.atan2(dx, dz);
      const wood = new THREE.MeshLambertMaterial({ color: 0x7a5a3a }), dark = new THREE.MeshLambertMaterial({ color: 0x4a3524 });
      const gold = new THREE.MeshLambertMaterial({ color: 0xc9a23a });
      const deck = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, L - 8), wood);
      deck.position.set(0, 0.3, (L - 8) / 2);
      br.add(deck);
      for (const sx of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, L - 8), dark);
        rail.position.set(sx * 2.4, 1.3, (L - 8) / 2);
        br.add(rail);
        for (let z = 0; z <= L - 8; z += (L - 8) / 6) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 0.3), dark);
          post.position.set(sx * 2.4, 0.9, z);
          br.add(post);
          const giboshi = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), gold);
          giboshi.position.set(sx * 2.4, 1.7, z);
          br.add(giboshi);
        }
      }
      for (let z = 6; z < L - 10; z += 7) for (const sx of [-1.8, 1.8]) {
        const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8, 6), dark);
        pier.position.set(sx, -3.8, z);
        br.add(pier);
      }
      scene.add(br);
    }
  }
  gate(35.69215, 139.75385, 6, true);   // 清水門
  gate(35.69380, 139.74995, 7, true);   // 田安門
  gate(35.68220, 139.75700, 6, false);  // 坂下門
  scene.add(g);
  return { hirakawa: [hirakawa[0], hirakawa[1]] };
}

// 楠木正成像 (皇居外苑): 台座の上の騎馬像
function addKusunoki(scene, G) {
  const [X, Z] = ll(35.67980, 139.75760);
  const g = new THREE.Group();
  g.position.set(X, G(X, Z), Z);
  const stone = new THREE.MeshLambertMaterial({ color: 0xa8a39a });
  const bronze = new THREE.MeshLambertMaterial({ color: 0x3f3b2e });
  const base = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 8), stone);
  base.position.y = 2;
  g.add(base);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 4), bronze);
  body.position.y = 5.6;
  g.add(body);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.9), bronze);
  neck.position.set(0, 6.8, 2);
  neck.rotation.x = 0.6;
  g.add(neck);
  for (const [x, z] of [[-0.5, -1.5], [0.5, -1.5], [-0.5, 1.5], [0.5, 1.6]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 0.3), bronze);
    leg.position.set(x, 4.9, z);
    g.add(leg);
  }
  const rider = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.8), bronze);
  rider.position.set(0, 7.3, -0.2);
  g.add(rider);
  g.rotation.y = 0.9;
  scene.add(g);
}

// テックジムのアドバルーン: 平河町森タワー (千代田区平河町2-16-1) の屋上から上げる。半蔵門〜三宅坂から見える
function addBalloon(scene, city) {
  const [X, Z] = ll(35.68000, 139.74140);
  let top = null, bd2 = 1e18;
  for (const bd of city.bld) {
    if (!bd.plateau || bd.h < 60) continue;
    const d = (bd.cx - X) ** 2 + (bd.cz - Z) ** 2;
    if (d < bd2 && d < 120 * 120) { bd2 = d; top = bd; }
  }
  const rx = top ? top.cx : X, rz = top ? top.cz : Z, roof = top ? top.h + (top.base || 0) : 140;
  const BR = 24, BY = roof + 88; // 大きく。垂れ幕の下が屋上の少し上に来る高さ
  const g = new THREE.Group();
  const ballTex = canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#ff6a00'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.fillRect(0, h * 0.36, w, h * 0.28);
    c.fillStyle = '#0b1a2e'; c.font = `900 ${h * 0.2}px ${JP}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('TECH GYM', w * 0.25, h / 2 + 4); c.fillText('TECH GYM', w * 0.75, h / 2 + 4);
  });
  const ballMat = new THREE.MeshLambertMaterial({ map: ballTex, emissive: 0x2a1000 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BR, 32, 20), ballMat);
  ball.position.y = BY;
  g.add(ball);
  const bannerTex = canvasTex(160, 1024, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff6a00'; c.fillRect(0, 0, 12, h); c.fillRect(w - 12, 0, 12, h);
    c.fillStyle = '#0b1a2e';
    const txt = [...'テックジム東京本校'];
    const st = (h - 40) / txt.length;
    c.font = `900 ${Math.min(96, st * 0.9)}px ${JP}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    txt.forEach((ch, i) => c.fillText(ch, w / 2, 20 + st * (i + 0.5)));
  });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(10, 56), new THREE.MeshLambertMaterial({ map: bannerTex, side: THREE.DoubleSide }));
  banner.position.y = BY - BR - 30;
  g.add(banner);
  // 回っても見えるように、十字にもう1枚
  const banner2 = banner.clone();
  banner2.rotation.y = Math.PI / 2;
  g.add(banner2);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, BY - BR - roof, 4), new THREE.MeshBasicMaterial({ color: 0x555555 }));
  rope.position.set(1.5, roof + (BY - BR - roof) / 2, 0);
  g.add(rope);
  g.position.set(rx, 0, rz);
  scene.add(g);
  return {
    pos: [rx, BY - 35, rz], // 見せ場では玉と垂れ幕のまん中を見る
    update(t) {
      g.rotation.y = t * 0.08;
      ball.position.x = Math.sin(t * 0.5) * 1.2;
      banner.position.x = banner2.position.x = ball.position.x * 0.8;
    },
    setNight(k) { ballMat.emissive.setHex(k === 'night' ? 0x803000 : k === 'dusk' ? 0x4a1c00 : 0x2a1000); },
  };
}
