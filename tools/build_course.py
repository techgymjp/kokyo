# lanes.json (コースの点と車線数) と route3.json (地名) と標高から js/course-data.js を作る
import json, math, sys
exec(open('dem.py').read())
OUT = sys.argv[1]
L = json.load(open('lanes.json')); route = json.load(open('route3.json'))
n = len(L)
nl = [r[2] for r in L]; nr = [r[3] for r in L]
def fill(a):
  for _ in range(n):
    for i in range(n):
      if a[i] is None: a[i] = a[i - 1] if a[i - 1] is not None else a[(i + 1) % n]
  return a
nl = [max(1, min(4, v)) for v in fill(nl)]; nr = [max(1, min(4, v)) for v in fill(nr)]
pts = []
for i, r in enumerate(L):
  p = [r[0], r[1], nl[i], nr[i]]
  # 千鳥ヶ淵の道は全体で1車線 (幅約3.8m): ランナーと、向こうから来る車・バイクが同じ1車線を使う
  if r[4] == '千鳥ヶ淵の道': p[2] = p[3] = 0.6
  if pts and math.dist(pts[-1][:2], p[:2]) < 1.5: continue
  pts.append(p)
labels = []
for r in route:
  if len(r) > 2:
    x, z = xy(r[0], r[1]) if 'xy' in globals() else ((r[1] - O[1]) * KX, -(r[0] - O[0]) * KZ)
    i = min(range(len(pts)), key=lambda k: math.dist(pts[k][:2], (x, z)))
    labels.append([i, r[2]])
m = len(pts)
cum = [0]
for i in range(m): cum.append(cum[-1] + math.dist(pts[i][:2], pts[(i + 1) % m][:2]))
Ltot = cum[-1]; E = []; i = 0
for k in range(int(Ltot / 5)):
  s = k * 5
  while cum[i + 1] < s: i += 1
  t = (s - cum[i]) / (cum[i + 1] - cum[i]); a = pts[i]; b = pts[(i + 1) % m]
  x = a[0] + (b[0] - a[0]) * t; z = a[1] + (b[1] - a[1]) * t
  l = math.dist(a[:2], b[:2]) or 1; nx = -(b[1] - a[1]) / l; nz = (b[0] - a[0]) / l
  vals = sorted(v for v in (H(x + nx * o, z + nz * o) for o in (-8, -4, 0, 4, 8)) if v is not None)
  E.append(vals[len(vals) // 2 + 1] if len(vals) > 2 else vals[-1])
q = len(E)
mx = [max(E[(k + j) % q] for j in range(-3, 4)) for k in range(q)]
S = [min(mx[(k + j) % q] for j in range(-3, 4)) for k in range(q)]
for _ in range(3): S = [sum(S[(k + j) % q] for j in range(-4, 5)) / 9 for k in range(q)]
with open(OUT, 'w') as f:
  f.write('// 自動生成 (tools/build_course.py)。出典: © OpenStreetMap contributors (ODbL)、国土地理院 標高タイル (DEM5A)\n')
  f.write('// 皇居ランのコース (二重橋前から反時計回り)。PTS: [x, z, こちら向きの車線数, 対向の車線数] (街の座標 m, x: 東, z: 南)\n')
  f.write('export const PTS = ' + json.dumps(pts, separators=(',', ':')) + ';\n')
  f.write('export const LABELS = ' + json.dumps(labels, ensure_ascii=False, separators=(',', ':')) + ';\n')
  f.write('// 道路の高さ (m)。コースの線に沿って 5m ごと (国土地理院 DEM5A をならしたもの)\n')
  f.write('export const ELEV = ' + json.dumps([round(v, 2) for v in S]) + ';\n')
print('points', m, 'length', round(Ltot), labels, file=sys.stderr)
