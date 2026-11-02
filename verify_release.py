import json,re,gzip,base64,pathlib,collections,hashlib
P=pathlib.Path(__file__).parent
h=(P/'dist/index.html').read_text();m=re.search(r'<script id="atlas-payload" type="application/octet-stream">([^<]+)</script>',h);assert m
x=json.loads(gzip.decompress(base64.b64decode(m[1])))
a=x['ATLAS'];b=x['BASELINE'];v=x['EDITIONS'];books=['Matt','Mark','Luke','John']
assert len(set(e['lang'] for e in v))==21
assert len(v)==25
assert all(e.get('verses') is None for e in v if not e['offline'])
assert len(set(e['lang'] for e in v if e['offline']))==12
assert not re.search(r'(chatgpt|openai|codex)',h,re.I)
assert not re.search(r'<(?:script|link)\b[^>]*(?:src|href)=["\'](?!data:)',h,re.I)
assert "connect-src 'none'" in h
allvs=[vv for vs in a['verses'].values() for vv in vs];assert len(allvs)==3779
assert len(a['stories'])==355
assert sum(map(len,x['CROSSREFS'].values()))==44469
lookup={s['id']:s for s in a['stories']}
assert all(len(vv['stories'])==1 and vv['id'] in b for vv in allvs)
for e in v:
 if not e['offline']:continue
 d=e['verses'];keys=[key for key in d if key.split('.')[0] in books]
 assert all(key in b for key in keys),(e['id'],'unknown verse')
 for code in books:
  count=sum(key.startswith(code+'.') for key in keys);assert count>600,(e['id'],code,count)
 print(e['id'],'Gospel verses:',len(keys),'missing:',3779-len(keys))
 if e['id'].endswith(('irvhin','irvtam','irvpun')):
  raw=json.loads((P/'source-data'/f'{e["id"]}.json').read_text(encoding='utf-8-sig'))
  for ab,code in [('mt','Matt'),('mc','Mark'),('lc','Luke'),('jo','John')]:
   book=next(z for z in raw if z['abbrev']==ab)
   for c,vs in enumerate(book['chapters'],1):assert len(vs)==sum(key.startswith(f'{code}.{c}.') for key in b),(e['id'],code,c)
for r in ['Matt.2.1-Matt.2.6','Matt.21.1-Matt.21.11','Matt.27.11-Matt.27.14','Mark.10.42-Mark.10.45','Mark.1.29-Mark.1.34','Mark.9.33-Mark.9.37','Luke.19.1-Luke.19.10','Luke.2.40-Luke.2.52','Luke.22.39-Luke.22.46','John.20.30-John.20.31','John.1.1-John.1.18','John.5.19-John.5.29']:
 for part in r.split('-'):assert part in b
report={'passed':True,'languages':21,'offlineLanguages':12,'editions':25,'gospelVerses':3779,'storyUnits':355,'gospelCrossReferences':44469,'standaloneBytes':len(h.encode()),'sha256':hashlib.sha256(h.encode()).hexdigest(),'excludedOfflineMirrors':{'bn_irvben':'Chapter lengths differed; source has no explicit per-verse IDs to resolve alignment','mr_irvmar':'Chapter lengths differed; source has no explicit per-verse IDs to resolve alignment','te_irvtel':'Chapter lengths differed; source has no explicit per-verse IDs to resolve alignment'}}
(P/'verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
