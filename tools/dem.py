import math, os
D='dem'
cache={}
def tile(kind,z,x,y):
  k=(kind,x,y)
  if k not in cache:
    f=f'{D}/{kind}_{x}_{y}.txt'
    rows=[]
    if os.path.exists(f):
      for line in open(f).read().strip().split('\n'):
        rows.append([None if v=='e' else float(v) for v in line.split(',')])
    cache[k]=rows
  return cache[k]
def raw(lat,lon):
  for kind,z in (('5a',15),('10b',14)):
    n=2**z; X=(lon+180)/360*n; r=math.radians(lat); Y=(1-math.log(math.tan(r)+1/math.cos(r))/math.pi)/2*n
    tx,ty=int(X),int(Y); px=(X-tx)*256-0.5; py=(Y-ty)*256-0.5
    t=tile(kind,z,tx,ty)
    if not t: continue
    i=min(255,max(0,int(py))); j=min(255,max(0,int(px)))
    fi=min(1,max(0,py-i)); fj=min(1,max(0,px-j))
    i1=min(255,i+1); j1=min(255,j+1)
    vals=[(t[i][j],(1-fi)*(1-fj)),(t[i][j1],(1-fi)*fj),(t[i1][j],fi*(1-fj)),(t[i1][j1],fi*fj)]
    s=sum(v*w for v,w in vals if v is not None); W=sum(w for v,w in vals if v is not None)
    if W>0.3: return s/W
  return None
O=(35.674,139.745); KX=111320*math.cos(math.radians(O[0])); KZ=110574
def H(x,z): return raw(O[0]-z/KZ, O[1]+x/KX)
