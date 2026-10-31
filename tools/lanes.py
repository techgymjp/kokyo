import json,math
T=json.load(open('trace2.json')); W=json.load(open('osm_roads.json'))
O=(35.674,139.745); KX=111320*math.cos(math.radians(O[0])); KZ=110574
xy=lambda a,b:((b-O[1])*KX,-(a-O[0])*KZ)
nodes=T['nodes']; pos=T['pos']; seq=T['seq']
segs=[]
for w in W:
  if w['tags']['highway'] not in ('primary','secondary','trunk','tertiary','unclassified'): continue
  if w['tags'].get('tunnel')=='yes': continue
  P=[xy(*p) for p in w['pts']]
  for a,b in zip(P,P[1:]): segs.append((a,b,w['tags'].get('lanes'),w['tags'].get('oneway'),w['tags'].get('name'),w['id']))
ids_on=set(s[5] for s in seq)
def opp(x,z,hx,hz):
  best=None
  for a,b,l,ow,nm,wid in segs:
    if wid in ids_on: continue
    ex,ez=b[0]-a[0],b[1]-a[1];L=math.hypot(ex,ez) or 1
    if ow=='yes' and (ex*hx+ez*hz)/L>-0.7: continue
    if ow!='yes': continue
    t=max(0,min(1,((x-a[0])*ex+(z-a[1])*ez)/L/L)); d=math.hypot(x-a[0]-ex*t,z-a[1]-ez*t)
    if d<60 and (best is None or d<best[0]): best=(d,l,nm)
  return best
out=[]
for (a,b,nm,l,ow,wid) in seq:
  A=pos[a];B=pos[b];L=math.dist(A,B) or 1
  hx,hz=(B[0]-A[0])/L,(B[1]-A[1])/L
  m=((A[0]+B[0])/2,(A[1]+B[1])/2)
  if ow=='no' or ow is None:
    nl=nr=max(1,int(l or 2)//2); o=None
  else:
    nl=int(l) if l else None
    o=opp(m[0],m[1],hx,hz)
    nr=int(o[1]) if o and o[1] else None
  out.append([round(A[0],1),round(A[1],1),nl,nr,nm,round(o[0]) if o else None, round(L)])
for i,r in enumerate(out): print(i,r)
json.dump(out,open('lanes.json','w'),ensure_ascii=False)
