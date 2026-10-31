import json, math, heapq
W=json.load(open('osm_roads.json')); import sys; route=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'route2.json'))
O=(35.674,139.745); KX=111320*math.cos(math.radians(O[0])); KZ=110574
xy=lambda a,b:((b-O[1])*KX,-(a-O[0])*KZ)
main={'primary','secondary','trunk','tertiary','unclassified','primary_link','secondary_link','tertiary_link'}
pos={}; adj={}
edges={}  # (a,b)->way
for w in W:
  if w['tags']['highway'] not in main: continue
  if w['tags'].get('tunnel') in ('yes',): continue
  nds=[n for n in w['nodes']]
  pts=w['pts']
  if len(pts)!=len(nds): continue
  for n,p in zip(nds,pts): pos[n]=xy(*p)
  ow=w['tags'].get('oneway')
  for a,b in zip(nds,nds[1:]):
    d=math.dist(pos[a],pos[b])
    if ow=='-1': a,b=b,a
    adj.setdefault(a,[]).append((b,d)); edges[(a,b)]=w
    if ow not in ('yes','-1'): adj.setdefault(b,[]).append((a,d)); edges[(b,a)]=w
# rotate route to start at 二重橋前
i0=[i for i,r in enumerate(route) if len(r)>2 and r[2]=='二重橋前'][0]
R=route[i0:]+route[:i0]
P=[xy(r[0],r[1]) for r in R]
def heading(i):
  a=P[i-1]; b=P[(i+1)%len(P)]; d=math.dist(a,b); return ((b[0]-a[0])/d,(b[1]-a[1])/d)
def snap(i):
  h=heading(i); best=None
  for (a,b),w in edges.items():
    ax,az=pos[a]; bx,bz=pos[b]; L=math.dist(pos[a],pos[b]) or 1
    if ((bx-ax)*h[0]+(bz-az)*h[1])/L<0.6: continue
    d=min(math.dist(pos[a],P[i]),math.dist(pos[b],P[i]))
    if best is None or d<best[0]: best=(d,b)
  return best
snaps=[snap(i) for i in range(len(P))]
for i,s in enumerate(snaps): print(i, R[i][2:] , round(s[0]))
def dij(s,t):
  dist={s:0}; prev={}; q=[(0,s)]
  while q:
    d,u=heapq.heappop(q)
    if u==t: break
    if d>dist[u]: continue
    for v,w in adj.get(u,[]):
      nd=d+w
      if nd<dist.get(v,1e18): dist[v]=nd; prev[v]=u; heapq.heappush(q,(nd,v))
  path=[t]
  while path[-1]!=s: path.append(prev[path[-1]])
  return path[::-1], dist[t]
full=[snaps[0][1]]; tot=0
for i in range(len(snaps)):
  a=snaps[i][1]; b=snaps[(i+1)%len(snaps)][1]
  if a==b: continue
  p,d=dij(a,b); tot+=d
  if d>3*math.dist(P[i],P[(i+1)%len(P)])+100: print('detour',i,round(d))
  full+=p[1:]
print('total',round(tot), len(full))
seq=[]
for a,b in zip(full,full[1:]):
  w=edges[(a,b)]; seq.append((a,b,w['tags'].get('name'),w['tags'].get('lanes'),w['tags'].get('oneway'),w['id']))
json.dump({'nodes':full,'pos':{n:pos[n] for n in full},'seq':seq},open('trace.json','w'),ensure_ascii=False)
last=None
for s in seq:
  k=s[2:5]
  if k!=last: print(k, s[5]); last=k
