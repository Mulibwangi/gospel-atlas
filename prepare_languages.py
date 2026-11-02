import urllib.request, json, pathlib, hashlib, time
from concurrent.futures import ThreadPoolExecutor, as_completed
P=pathlib.Path(__file__).parent
S=P/'source-data'; D=P/'data'; S.mkdir(exist_ok=True)
books={'matthew':('Matt',28),'mark':('Mark',16),'luke':('Luke',24),'john':('John',21)}
manifest={x['id']:x for x in json.loads((S/'manifest.json').read_text())['translations']}
free=[('web','en','English'),('cuv','zh','中文 · Chinese'),('rv1909','es','Español · Spanish'),('vandyck','ar','العربية · Arabic'),('pt','pt','Português · Portuguese'),('synodal','ru','Русский · Russian'),('segond','fr','Français · French'),('luther','de','Deutsch · German'),('kougo','ja','日本語 · Japanese')]
irvs=[('hi_irvhin','hi','हिन्दी · Hindi','hin2017','2017, 2018, 2019'),('ta_irvtam','ta','தமிழ் · Tamil','tam2017','2017, 2019'),('pa_irvpun','pa','ਪੰਜਾਬੀ · Punjabi','pan','2017, 2019')]
def retrieve(url,path):
 if path.exists():return path.read_bytes()
 for attempt in range(3):
  try:
   raw=urllib.request.urlopen(url,timeout=25).read();path.write_bytes(raw);return raw
  except Exception:
   if attempt==2:raise
   time.sleep(1)
def task(x):
 vid,book,c=x
 u=f'https://free.bible/bible/{vid}/{book}/{c}.json'
 p=S/f'{vid}_{book}_{c}.json'
 return x,json.loads(retrieve(u,p))
alltext={x[0]:{} for x in free}; errors=[]
work=[(vid,b,c) for vid,_,_ in free for b,(_,n) in books.items() for c in range(1,n+1)]
with ThreadPoolExecutor(max_workers=10) as pool:
 for i,f in enumerate(as_completed([pool.submit(task,x) for x in work]),1):
  try:
   (vid,b,c),j=f.result();code=books[b][0]
   assert j['book']==b and j['chapter']==c
   for v in j['verses']:
    key=f'{code}.{c}.{v["v"]}';text=v['t'];alltext[vid][key]=text
    # A bridged verse retains its combined text and carries an explicit range marker.
    if v.get('ve',v['v'])>v['v']:
     alltext[vid][key]={'text':text,'range':f'{v["v"]}–{v["ve"]}'}
     for n in range(v['v']+1,v['ve']+1):alltext[vid][f'{code}.{c}.{n}']={'continued':key}
  except Exception as e:errors.append(str(e))
  if i%100==0:print('Chapters',i,'/',len(work),flush=True)
if errors:raise RuntimeError(errors)
versions=[]
for vid,lang,label in free:
 m=manifest[vid]
 versions.append({'id':vid,'lang':lang,'language':label,'name':m['name'],'short':m.get('shortName',vid),'dir':m.get('dir','ltr'),'offline':True,'license':m['license'],'copyright':m['name']+' · '+m['year'],'source':m['source'],'dataSource':f'https://free.bible/bible/{vid}/','verses':alltext[vid]})
def irv(x):
 vid,lang,label,ebid,years=x;u=f'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/{vid}.json'
 raw=retrieve(u,S/f'{vid}.json');j=json.loads(raw.decode('utf-8-sig'));out={};names={}
 for bc,code in [('mt','Matt'),('mc','Mark'),('lc','Luke'),('jo','John')]:
  b=next(x for x in j if x['abbrev']==bc);names[code]=b['name']
  for c,vs in enumerate(b['chapters'],1):
   for v,t in enumerate(vs,1):
    if t.strip():out[f'{code}.{c}.{v}']=t
 return {'id':vid,'lang':lang,'language':label,'name':'Indian Revised Version (2019)','short':'IRV 2019','dir':'ltr','offline':True,'license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','copyright':f'© {years} Bridge Connectivity Solutions Pvt. Ltd.','source':f'https://ebible.org/{ebid}/copyright.htm','dataSource':u,'sourceSha256':hashlib.sha256(raw).hexdigest(),'bookNames':names,'verses':out}
with ThreadPoolExecutor(max_workers=6) as pool:
 for v in pool.map(irv,irvs):versions.append(v);print('IRV',v['lang'],len(v['verses']),flush=True)
asv=json.loads((D/'bible.json').read_text());versions.insert(0,{'id':'asv','lang':'en','language':'English','name':'American Standard Version (1901)','short':'ASV 1901','dir':'ltr','offline':True,'license':'Public domain','copyright':'American Standard Version (1901)','source':'https://github.com/scrollmapper/bible_databases','verses':asv})
online=[('BERV','bn','বাংলা · Bengali','Bengali: পবিত্র বাইবেল'),('ERV-MR','mr','मराठी · Marathi','Marathi Bible: Easy-to-Read Version'),('TERV','te','తెలుగు · Telugu','Telugu Holy Bible: Easy-to-Read Version'),('ESV','en','English','English Standard Version'),('NASB','en','English','New American Standard Bible (2020)'),('NASB1995','en','English','New American Standard Bible (1995)'),('ERV-UR','ur','اردو · Urdu','Urdu Bible: Easy-to-Read Version'),('AMD','id','Bahasa Indonesia · Indonesian','Alkitab Mudah Dibaca'),('SNT','sw','Kiswahili · Swahili','Swahili New Testament'),('TR','tr','Türkçe · Turkish','Yeni Çeviri'),('BD2011','vi','Tiếng Việt · Vietnamese','Bản Dịch 2011'),('KLB','ko','한국어 · Korean','Korean Living Bible')]
for vid,lang,label,name in online:versions.append({'id':vid,'lang':lang,'language':label,'name':name,'short':vid,'dir':'rtl' if lang=='ur' else 'ltr','offline':False,'gateway':vid,'license':'Online reading at Bible Gateway; text is not bundled','source':'https://www.biblegateway.com/versions/'})
for e in versions:
 if e['id']=='segond':
  mappings=[]
  for a,b in [('Mark.9.50','Mark.9.51'),('Mark.10.52','Mark.10.53')]:
   e['verses'][a]={'text':e['verses'][a]+' '+e['verses'].pop(b),'sourceRef':a+'-'+b}
   mappings.append({'mapReference':a,'editionReferences':a+'-'+b,'change':'Display both source verse segments together; wording unchanged.'})
  e['coordinateMappings']=mappings
raw=retrieve('https://raw.githubusercontent.com/scrollmapper/bible_databases/refs/heads/master/sources/ja/JapKougo/JapKougo.json',S/'JapKougo.json')
j=json.loads(raw);out={}
for name,code in [('Matthew','Matt'),('Mark','Mark'),('Luke','Luke'),('John','John')]:
 b=next(x for x in j['books'] if x['name']==name)
 for c in b['chapters']:
  for v in c['verses']:out[f'{code}.{c["chapter"]}.{v["verse"]}']=v['text']
e=next(x for x in versions if x['id']=='kougo');e['verses']=out;e['dataSource']='https://raw.githubusercontent.com/scrollmapper/bible_databases/refs/heads/master/sources/ja/JapKougo/JapKougo.json';e['sourceSha256']=hashlib.sha256(raw).hexdigest()
(D/'translations.json').write_text(json.dumps(versions,ensure_ascii=False,separators=(',',':')))
print('Versions',len(versions),'Languages',len(set(v['lang'] for v in versions)),flush=True)
