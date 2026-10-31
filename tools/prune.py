import json,math
T=json.load(open('trace.json'))
nodes=T['nodes']; pos=T['pos']; seq=T['seq']
P=[pos[n] for n in nodes]
changed=True
while changed:
  changed=False
  cum=[0]
  for a,b in zip(P,P[1:]): cum.append(cum[-1]+math.dist(a,b))
  n=len(P)
  for i in range(n):
    for j in range(n-1,i+2,-1):
      L=cum[j]-cum[i]
      if L>1500: continue
      if math.dist(P[i],P[j])<25 and L>4*math.dist(P[i],P[j])+30:
        print('cut',i,j,round(L)); P=P[:i+1]+P[j:]; nodes=nodes[:i+1]+nodes[j:]; seq=seq[:i]+seq[j-1:] if False else seq; changed=True; break
    if changed: break
# rebuild seq from edges list mapping
emap={(s[0],s[1]):s for s in T['seq']}
newseq=[]
for a,b in zip(nodes,nodes[1:]):
  s=emap.get((a,b))
  if s is None:
    # connector created by cut; borrow tags from next edge
    s=[a,b,None,None,'yes','cut']
  newseq.append(s)
tot=sum(math.dist(pos[a],pos[b]) for a,b in zip(nodes,nodes[1:]))
print('total',round(tot))
json.dump({'nodes':nodes,'pos':pos,'seq':newseq},open('trace2.json','w'),ensure_ascii=False)
