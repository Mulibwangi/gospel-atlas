import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {makeZip} from './zipwriter.mjs';
const APP_FILE='Gospel_Atlas_David_Lee.html',LAUNCHER_FILE='1 START HERE - Open Gospel Atlas.html',HOWTO_FILE='2 HOW TO OPEN.txt',ZIP_FILE='Gospel_Atlas_David_Lee.zip',LAB_FILE='Cross_Reference_Lab.html';
const readJSON=async p=>JSON.parse(await readFile(p,'utf8'));
await mkdir('dist',{recursive:true});
const bundled=await build({entryPoints:['src/app.jsx'],bundle:true,minify:true,write:false,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},legalComments:'inline',target:['es2020'],format:'iife'});
const ATLAS=await readJSON('data/atlas.json'),CROSSREFS=await readJSON('data/crossrefs.json'),BASELINE=await readJSON('data/bible.json');
const EDITIONS=await readJSON('data/translations.json');
for(const ed of EDITIONS){
 if(ed.id==='TR'){ed.id='TCL02';ed.short='TCL02';ed.name='Kutsal Kitap Yeni Çeviri 2001, 2008';delete ed.gateway;ed.source='https://www.bible.com/versions/170';ed.license='Online reading at YouVersion; text is not bundled'}
 if(ed.id==='SNT')ed.name='Neno: Bibilia Takatifu';
}
const AUDIT={...(await readJSON('data/metadata.json')),standalonePrepared:'2026-11-02',coder:'David Lee',languages:EDITIONS.filter((x,i,a)=>a.findIndex(y=>y.lang===x.lang)===i).length,editions:EDITIONS.map(({verses,...x})=>({...x,verseCount:verses?Object.keys(verses).length:0,textSha256:verses?createHash('sha256').update(JSON.stringify(verses)).digest('hex'):null})),headingSymbols:{Matthew:'Lion · King',Mark:'Ox · Servant',Luke:'Human figure · Son of Man',John:'Eagle · Son of God'}};
await writeFile('data/release-audit.json',JSON.stringify(AUDIT,null,2));
const SYMBOL_IMAGE='data:image/jpeg;base64,'+(await readFile('src/symbols.jpg')).toString('base64');
const encoded=gzipSync(JSON.stringify({ATLAS,CROSSREFS,BASELINE,EDITIONS,AUDIT,SYMBOL_IMAGE}),{level:9}).toString('base64');
const css=await readFile('src/styles.css','utf8');
const mit=await readFile('node_modules/react/LICENSE','utf8');
const js=('/* React / React DOM — '+mit+' */\n'+bundled.outputFiles[0].text).replace(/<\/script/gi,'<\\/script');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="David Lee"><meta name="description" content="Four Gospel pixel maps, parallel passages and biblical cross-references. Coder: David Lee."><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Gospel Atlas · David Lee</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='2' y='2' width='12' height='12' fill='%233e7598'/%3E%3Crect x='18' y='2' width='12' height='12' fill='%23b25c51'/%3E%3Crect x='2' y='18' width='12' height='12' fill='%234e8875'/%3E%3Crect x='18' y='18' width='12' height='12' fill='%23866a9f'/%3E%3C/svg%3E"><style>${css}</style></head><body><div id="root"><div class="loading"><h1>Gospel Atlas</h1><p>Opening your offline edition…</p><small>Coder: David Lee</small></div></div><noscript>This app needs JavaScript enabled in your browser.</noscript><script id="atlas-payload" type="application/octet-stream">${encoded}</script><script>(async()=>{try{if(!window.DecompressionStream)throw new Error('Please open this file in an up-to-date version of Chrome, Firefox, Edge or Safari.');const bytes=Uint8Array.from(atob(document.getElementById('atlas-payload').textContent),c=>c.charCodeAt(0));const payload=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();Object.assign(window,payload);${js}\n}catch(e){const root=document.getElementById('root');root.textContent='Gospel Atlas could not open. '+e.message;root.style.padding='48px';}})();</script></body></html>`;
await writeFile('dist/index.html',html);await writeFile('dist/'+APP_FILE,html);
// Opening instructions travel with the app: a launcher page carrying one Open button,
// the same steps in plain text, and the README. Numbered so a file listing reads in order.
const launcher=(await readFile('src/launcher.html','utf8')).replace(/Gospel_Atlas_David_Lee\.html/g,APP_FILE).replace(/2 HOW TO OPEN\.txt/g,HOWTO_FILE);
const howto=(await readFile('src/how-to-open.txt','utf8')).replace(/Gospel_Atlas_David_Lee\.html/g,APP_FILE).replace(/1 START HERE - Open Gospel Atlas\.html/g,LAUNCHER_FILE).replace(/2 HOW TO OPEN\.txt/g,HOWTO_FILE);
const readme=await readFile('GUIDE.md','utf8');// shipped to recipients as README.md; the repository README.md is the project page
await writeFile('dist/'+LAUNCHER_FILE,launcher);await writeFile('dist/'+HOWTO_FILE,howto);await writeFile('dist/README.md',readme);
// docs/cross-references.html is built by tools/pack-crossrefs.mjs; ship it when it is there.
let lab=null;try{lab=await readFile('docs/cross-references.html','utf8')}catch{}
const entries=[{name:LAUNCHER_FILE,data:launcher},{name:HOWTO_FILE,data:howto},{name:APP_FILE,data:html}];
if(lab){entries.push({name:LAB_FILE,data:lab});await writeFile('dist/'+LAB_FILE,lab)}
entries.push({name:'README.md',data:readme});
const zip=makeZip(entries);
await writeFile('dist/'+ZIP_FILE,zip);
console.log(JSON.stringify({bytes:Buffer.byteLength(html),languages:AUDIT.languages,editions:EDITIONS.length,offlineLanguages:new Set(EDITIONS.filter(e=>e.offline).map(e=>e.lang)).size,zip:ZIP_FILE,zipBytes:zip.length,lab:!!lab}));
