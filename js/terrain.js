// 地面の高さ (国土地理院の標高タイルから作った 20m 格子)。コースの道路の所は道路の高さにならす
import { TERRAIN } from './terrain-data.js?v=20261102102851';
import { LANE_W } from './course.js?v=20261102102851';

export class Terrain {
  constructor(course) {
    const T = TERRAIN;
    this.x0 = T.x0; this.z0 = T.z0; this.step = T.step; this.nx = T.nx; this.nz = T.nz;
    const bin = atob(T.data);
    const n = T.nx * T.nz;
    const h = this.h = new Float32Array(n);
    for (let i = 0; i < n; i++) h[i] = (bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8)) / 10 - 20;
    if (course) this.flatten(course);
  }
  // 道路のまわりは道路の高さに合わせる (格子が粗いので、道路の端から 22m までは道路の高さ、その先 18m でもとの高さへ)
  flatten(course) {
    const { nx, nz, step, x0, z0, h } = this;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * step, z = z0 + j * step;
      const n = course.nearest(x, z, 90);
      if (!n) continue;
      const left = course.NL[n.i] * LANE_W + course.WW[n.i], right = course.NR[n.i] * LANE_W + 3.5;
      const out = n.u < 0 ? Math.max(0, -n.u - left) : Math.max(0, n.u - right);
      const k = out < 22 ? 1 : out < 40 ? 1 - (out - 22) / 18 : 0;
      if (k <= 0) continue;
      // 道路の面より少し下げる (20m の格子の地面が、カーブや坂で道路の上に突き出て灰色の三角に見えないように)
      const y = course.Y[n.i] - (out < 6 ? 0.45 : 0.2);
      h[j * nx + i] = h[j * nx + i] * (1 - k) + y * k;
    }
  }
  at(x, z) {
    const { nx, nz, step, x0, z0, h } = this;
    let fx = (x - x0) / step, fz = (z - z0) / step;
    fx = Math.max(0, Math.min(nx - 1.001, fx)); fz = Math.max(0, Math.min(nz - 1.001, fz));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const a = h[j * nx + i], b = h[j * nx + i + 1], c = h[(j + 1) * nx + i], d = h[(j + 1) * nx + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }
}
