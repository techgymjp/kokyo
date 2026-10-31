#!/usr/bin/env python3
"""ターザン大東京 (techgymjp/tarzan) の街のデータから、皇居のまわりだけを切り出す。

  git clone --depth 1 https://github.com/techgymjp/tarzan ../tarzan
  python3 tools/crop_from_tarzan.py ../tarzan

js/city-data.js (PLATEAU の建物と首都高)・js/water-data.js (お濠と川)・js/road-data.js (幹線道路) を書き出す。
座標系 (原点・x: 東、z: 南、0.5m 単位) はターザン大東京と同じ。
"""
import json, math, os, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '../tarzan'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js')
# 切り出す範囲 (緯度・経度)。皇居 (約 35.685, 139.752) から東西南北に約 3km
BOX = (35.655, 35.716, 139.718, 139.790)


def load(name, var):
    s = open(os.path.join(SRC, 'js', name), encoding='utf-8').read()
    head = s[:s.index('export')]
    m = re.search(r'export const ' + var + r' = ', s)
    i = m.end()
    j = s.index(';\n', i) if ';\n' in s[i:] else s.rindex(';')
    return head, json.loads(s[i:j])


head, CITY = load('city-data.js', 'CITY')
O = CITY['origin']
KX = 111320 * math.cos(math.radians(O[0]))
KZ = 110574
X0 = (BOX[2] - O[1]) * KX * 2
X1 = (BOX[3] - O[1]) * KX * 2
Z0 = -(BOX[1] - O[0]) * KZ * 2
Z1 = -(BOX[0] - O[0]) * KZ * 2
inbox = lambda x, z: X0 <= x <= X1 and Z0 <= z <= Z1

# 建物: [高さ*2, 頂点数, x0, z0, dx1, dz1, ...]
b, names = CITY['b'], dict((i, n) for i, n in CITY['names'])
nb, nnames = [], []
i = k = kept = 0
while i < len(b):
    n = b[i + 1]
    rec = b[i:i + 2 + 2 * n]
    if inbox(rec[2], rec[3]):
        if k in names:
            nnames.append([kept, names[k]])
        nb.extend(rec)
        kept += 1
    i += 2 + 2 * n
    k += 1
roads = []
for r in CITY['roads']:
    if any(inbox(x * 2, z * 2) for x, z in zip(r['x'], r['z'])):
        roads.append(r)
CITY.update(b=nb, names=nnames, roads=roads, count=kept, box=[BOX[0], BOX[1], BOX[2], BOX[3]])
with open(os.path.join(OUT, 'city-data.js'), 'w', encoding='utf-8') as f:
    f.write(head.replace('tools/build_city.py', 'ターザン大東京の tools/build_city.py → tools/crop_from_tarzan.py'))
    f.write('export const CITY = ' + json.dumps(CITY, ensure_ascii=False, separators=(',', ':')) + ';\n')

whead, WATER = load('water-data.js', 'WATER')
W = [p for p in WATER if any(inbox(p[0][j], p[0][j + 1]) for j in range(0, len(p[0]), 2))]
rhead, ROADS = load('road-data.js', 'ROADS')
_, HIGHWAYS = load('road-data.js', 'HIGHWAYS')
R = [r for r in ROADS if any(inbox(r[j], r[j + 1]) for j in range(1, len(r) - 1, 2))]
H = [r for r in HIGHWAYS if any(inbox(r[j], r[j + 1]) for j in range(1, len(r) - 1, 2))]
with open(os.path.join(OUT, 'water-data.js'), 'w', encoding='utf-8') as f:
    f.write(whead + 'export const WATER = ' + json.dumps(W, separators=(',', ':')) + ';\n')
with open(os.path.join(OUT, 'road-data.js'), 'w', encoding='utf-8') as f:
    f.write(rhead + 'export const ROADS = ' + json.dumps(R, separators=(',', ':')) + ';\n')
    f.write('export const HIGHWAYS = ' + json.dumps(H, separators=(',', ':')) + ';\n')
print(f'buildings {kept}/{k}, names {len(nnames)}, highways {len(roads)}, water {len(W)}, roads {len(R)}, elevated {len(H)}', file=sys.stderr)
