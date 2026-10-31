// コース: 二重橋前から反時計回りに皇居を一周する道路 (OpenStreetMap の内堀通り・靖国通り)
// 位置は s (スタートからの距離 m) と u (道路の中心線からの横の位置 m、進行方向の右がプラス) で表す。
//   u < 歩道の端          … お濠側の柵 (通れない)
//   歩道 (左)              … 歩行者 (ふつう WALK_W m、千鳥ヶ淵緑道は WALK_W_WIDE m)
//   こちら向きの車線 (u < 0) … ランナーに開放された車線 (車線数は場所ごとに実際の数)
//   中心線 (u = 0)          … 対向のバイクが走る
//   対向車線 (u > 0)        … 向こうから車が来る
// ただし都道301号 (祝田橋 → 二重橋前 → 大手門 → 竹橋) は4車線の一方通行: いちばん左の車線だけランナー、
// 残りの3車線は後ろから車が追い抜いていく (対向車線はない)
import { PTS, LABELS, ELEV } from './course-data.js?v=20261031174642';

export const LANE_W = 3.2;   // 1車線の幅
export const WALK_W = 3.6;   // 歩道の幅
export const WALK_W_WIDE = 6.5; // 千鳥ヶ淵の歩道 (千鳥ヶ淵緑道) は広い
export const CURB_H = 0.15;  // 歩道の段差
// 一方通行 (都道301号) の区間: [始まりの地名, 終わりの地名] (null はスタート / ゴール)
const ONEWAY = [['祝田橋', null], [null, '竹橋']];
const STEP = 1;              // 1m ごとに持つ

export class Course {
  constructor() {
    const n = PTS.length;
    // 1) 2m ごとに細かくする (車線数と、元の線に沿った距離 (標高の表を引く) も持つ)
    const dx = [], dz = [], dl = [], dr = [], drs = [];
    let raw = 0;
    for (let i = 0; i < n; i++) {
      const a = PTS[i], b = PTS[(i + 1) % n];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const k = Math.max(1, Math.ceil(L / 2));
      for (let j = 0; j < k; j++) {
        const t = j / k;
        dx.push(a[0] + (b[0] - a[0]) * t); dz.push(a[1] + (b[1] - a[1]) * t);
        dl.push(a[2]); dr.push(a[3]); drs.push(raw + L * t);
      }
      raw += L;
    }
    const rawL = raw, m = dx.length;
    // 2) 角を丸める (移動平均を何回か。輪なのでつなげて)
    let sx = Float64Array.from(dx), sz = Float64Array.from(dz);
    for (let pass = 0; pass < 4; pass++) {
      const nx = new Float64Array(m), nz = new Float64Array(m);
      for (let i = 0; i < m; i++) {
        let ax = 0, az = 0;
        for (let j = -4; j <= 4; j++) { const k = (i + j + m) % m; ax += sx[k]; az += sz[k]; }
        nx[i] = ax / 9; nz[i] = az / 9;
      }
      sx = nx; sz = nz;
    }
    // 3) 1m ごとに取り直す
    const cum = new Float64Array(m + 1);
    for (let i = 0; i < m; i++) cum[i + 1] = cum[i] + Math.hypot(sx[(i + 1) % m] - sx[i], sz[(i + 1) % m] - sz[i]);
    this.L = cum[m];
    const N = this.N = Math.floor(this.L / STEP);
    this.X = new Float32Array(N); this.Z = new Float32Array(N); this.Y = new Float32Array(N);
    this.TX = new Float32Array(N); this.TZ = new Float32Array(N);
    this.NL = new Float32Array(N); this.NR = new Float32Array(N);
    const rawNL = new Float32Array(N), rawNR = new Float32Array(N);
    let j = 0;
    for (let i = 0; i < N; i++) {
      const s = i * STEP;
      while (cum[j + 1] < s) j++;
      const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1), k = (j + 1) % m;
      this.X[i] = sx[j] + (sx[k] - sx[j]) * t;
      this.Z[i] = sz[j] + (sz[k] - sz[j]) * t;
      const rs = drs[j] + ((k ? drs[k] : rawL) - drs[j]) * t;
      // 標高 (5m ごとの表を線形補間)
      const e = rs / 5, e0 = Math.floor(e) % ELEV.length, e1 = (e0 + 1) % ELEV.length;
      this.Y[i] = ELEV[e0] + (ELEV[e1] - ELEV[e0]) * (e - Math.floor(e));
      rawNL[i] = dl[j]; rawNR[i] = dr[j];
    }
    // 地名 (コースの元の点の番号 → s)
    this.labels = LABELS.map(([idx, name]) => {
      const [px, pz] = PTS[idx];
      let best = 0, bd = 1e18;
      for (let i = 0; i < N; i++) { const d = (this.X[i] - px) ** 2 + (this.Z[i] - pz) ** 2; if (d < bd) { bd = d; best = i; } }
      return { s: best * STEP, name };
    }).sort((a, b) => a.s - b.s);
    // 一方通行の区間 (4車線、対向なし)
    const ls = (n) => this.labels.find((l) => l.name === n).s;
    this.oneways = ONEWAY.map(([a, b]) => [a ? ls(a) : 0, b ? ls(b) : this.L]);
    this.OW = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (this.oneways.some(([a, b]) => i * STEP >= a && i * STEP < b)) { this.OW[i] = 1; rawNL[i] = 4; rawNR[i] = 0; }
    }
    for (let i = 0; i < N; i++) {
      const a = (i + N - 2) % N, b = (i + 2) % N;
      const ex = this.X[b] - this.X[a], ez = this.Z[b] - this.Z[a], l = Math.hypot(ex, ez) || 1;
      this.TX[i] = ex / l; this.TZ[i] = ez / l;
      // 車線の増減は 40m かけてなめらかに
      let al = 0, ar = 0;
      for (let k = -20; k <= 20; k++) { al += rawNL[(i + k + N) % N]; ar += rawNR[(i + k + N) % N]; }
      this.NL[i] = al / 41; this.NR[i] = ar / 41;
    }
    // 歩道の幅 (1車線の千鳥ヶ淵の道の所は広い。前後 20m でなめらかに)
    this.WW = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let a = 0;
      for (let k = -20; k <= 20; k++) a += rawNL[(i + k + N) % N] < 0.9 ? WALK_W_WIDE : WALK_W;
      this.WW[i] = a / 41;
    }
    // 近くの点を探す格子
    this.G = 24;
    this.grid = new Map();
    for (let i = 0; i < N; i++) {
      const k = Math.floor(this.X[i] / this.G) + ',' + Math.floor(this.Z[i] / this.G);
      let l = this.grid.get(k);
      if (!l) this.grid.set(k, l = []);
      l.push(i);
    }
  }

  idx(s) { s = ((s % this.L) + this.L) % this.L; return s / STEP; }
  // s での中心線の点・向き・車線数 (線形補間)
  frame(s, o = {}) {
    const f = this.idx(s), i = Math.floor(f) % this.N, k = (i + 1) % this.N, t = f - Math.floor(f);
    o.x = this.X[i] + (this.X[k] - this.X[i]) * t;
    o.z = this.Z[i] + (this.Z[k] - this.Z[i]) * t;
    o.y = this.Y[i] + (this.Y[k] - this.Y[i]) * t;
    o.tx = this.TX[i] + (this.TX[k] - this.TX[i]) * t;
    o.tz = this.TZ[i] + (this.TZ[k] - this.TZ[i]) * t;
    const l = Math.hypot(o.tx, o.tz) || 1;
    o.tx /= l; o.tz /= l;
    o.nl = this.NL[i] + (this.NL[k] - this.NL[i]) * t;
    o.nr = this.NR[i] + (this.NR[k] - this.NR[i]) * t;
    return o;
  }
  // 右向きのベクトルは (-tz, tx)
  world(s, u, o = {}) {
    this.frame(s, o);
    o.x += -o.tz * u;
    o.z += o.tx * u;
    o.y += this.lift(u, o.nl);
    o.yaw = Math.atan2(o.tx, o.tz);
    return o;
  }
  heightAt(s) { const f = this.idx(s), i = Math.floor(f) % this.N, k = (i + 1) % this.N; return this.Y[i] + (this.Y[k] - this.Y[i]) * (f - Math.floor(f)); }
  // 勾配 (上りがプラス)
  grade(s) { return (this.heightAt(s + 12) - this.heightAt(s - 12)) / 24; }
  nl(s) { const i = Math.floor(this.idx(s)) % this.N; return this.NL[i]; }
  nr(s) { const i = Math.floor(this.idx(s)) % this.N; return this.NR[i]; }
  leftEdge(s) { return -this.nl(s) * LANE_W; }       // ランナー車線の左端 (歩道との段差)
  walkW(s) { return this.WW[Math.floor(this.idx(s)) % this.N]; }
  walkEdge(s) { return this.leftEdge(s) - this.walkW(s); }  // 歩道の左端 (お濠側の柵)
  rightEdge(s) { return this.nr(s) * LANE_W; }       // 対向車線の右端 (一方通行では 0)
  oneway(s) { return this.OW[Math.floor(this.idx(s)) % this.N] === 1; }
  // ランナーが走る範囲の右端 (一方通行ではいちばん左の車線だけ)
  // 千鳥ヶ淵の道 (1車線) では左端だけ (右寄りを向こうから車が来る)
  runnerRight(s) { return this.oneway(s) ? this.leftEdge(s) + LANE_W : Math.min(0, this.rightEdge(s) - 2.4); }
  lift(u, nl) { return u < -nl * LANE_W ? CURB_H : 0; } // 歩道は少し高い

  // (x, z) にいちばん近いコースの点。u: 横の位置 (右がプラス)、d: 中心線からの距離
  nearest(x, z, maxD = 60) {
    let best = -1, bd = maxD * maxD;
    const gx = Math.floor(x / this.G), gz = Math.floor(z / this.G), r = Math.ceil(maxD / this.G);
    for (let a = gx - r; a <= gx + r; a++) for (let b = gz - r; b <= gz + r; b++) {
      const l = this.grid.get(a + ',' + b);
      if (l) for (const i of l) { const d = (this.X[i] - x) ** 2 + (this.Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    }
    if (best < 0) return null;
    const u = (x - this.X[best]) * -this.TZ[best] + (z - this.Z[best]) * this.TX[best];
    return { s: best * STEP, u, d: Math.sqrt(bd), i: best };
  }
  // 道路 (歩道を含む) の上か、その近く (pad m) か
  onRoad(x, z, pad = 0) {
    const n = this.nearest(x, z, 40 + pad);
    if (!n) return false;
    return n.u > -(this.NL[n.i] * LANE_W + this.WW[n.i]) - pad && n.u < Math.max(this.NR[n.i] * LANE_W, 0) + 3.5 + pad;
  }
  labelAt(s) {
    let cur = null;
    for (const l of this.labels) if (l.s <= s) cur = l;
    return cur;
  }
  nextLabel(s) { return this.labels.find((l) => l.s > s + 1) || null; }
}
