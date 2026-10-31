import xml.etree.ElementTree as ET, glob, json
nodes={}; ways={}
for f in glob.glob('osm/*.osm'):
  r=ET.parse(f).getroot()
  for n in r.iter('node'): nodes[n.get('id')]=(float(n.get('lat')),float(n.get('lon')))
  for w in r.iter('way'):
    tags={t.get('k'):t.get('v') for t in w.iter('tag')}
    if tags.get('highway') in ('primary','secondary','trunk','tertiary','primary_link','secondary_link','tertiary_link','unclassified','residential'):
      ways[w.get('id')]=( [nd.get('ref') for nd in w.iter('nd')], tags)
out=[]
for wid,(nds,tags) in ways.items():
  pts=[nodes[n] for n in nds if n in nodes]
  out.append({'id':wid,'pts':pts,'nodes':nds,'tags':{k:tags[k] for k in tags if k in ('highway','name','lanes','lanes:forward','lanes:backward','oneway','ref','width','layer','bridge','tunnel','sidewalk')}})
json.dump(out,open('osm_roads.json','w'),ensure_ascii=False)
print(len(out))
from collections import Counter
c=Counter((w['tags'].get('name'),w['tags'].get('lanes'),w['tags'].get('oneway')) for w in out if w['tags']['highway'] in ('primary','secondary','trunk','tertiary'))
for k,v in sorted(c.items(),key=lambda x:str(x)): print(k,v)
