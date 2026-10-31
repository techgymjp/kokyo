import json,math,base64,struct,re,sys
exec(open('dem.py').read())
# box (same as crop)
BOX=(35.655,35.716,139.718,139.790)
x0=(BOX[2]-O[1])*KX; x1=(BOX[3]-O[1])*KX; z0=-(BOX[1]-O[0])*KZ; z1=-(BOX[0]-O[0])*KZ
STEP=20
nx=int((x1-x0)/STEP)+1; nz=int((z1-z0)/STEP)+1
offs=[-15,-7.5,0,7.5,15]
vals=[]
for j in range(nz):
  z=z0+j*STEP
  for i in range(nx):
    x=x0+i*STEP
    m=-100
    for dx in offs:
      for dz in offs:
        h=H(x+dx,z+dz)
        if h is not None and h>m: m=h
    if m==-100: m=0
    vals.append(max(0,min(65535,int(round((m+20)*10)))))
  if j%50==0: print(j,nz,file=sys.stderr)
b=base64.b64encode(struct.pack('<%dH'%len(vals),*vals)).decode()
json.dump({'x0':round(x0,1),'z0':round(z0,1),'step':STEP,'nx':nx,'nz':nz},open('terrain_meta.json','w'))
open('terrain_b64.txt','w').write(b)
print(nx,nz,len(b))
