import React,{useState,useRef,useEffect} from 'react';
const BOOKS=['Matt','Mark','Luke','John'];
const NAMES={Matt:'Matthew',Mark:'Mark',Luke:'Luke',John:'John'};
export const THEMES={
 Matt:{title:'King',symbol:'lion',position:'100% 0%',refs:['Matt.2.1-Matt.2.6','Matt.21.1-Matt.21.11','Matt.27.11-Matt.27.14']},
 Mark:{title:'Servant',symbol:'ox',position:'0% 100%',refs:['Mark.10.42-Mark.10.45','Mark.1.29-Mark.1.34','Mark.9.33-Mark.9.37']},
 Luke:{title:'Son of Man',symbol:'human figure',position:'0% 0%',refs:['Luke.19.1-Luke.19.10','Luke.2.40-Luke.2.52','Luke.22.39-Luke.22.46']},
 John:{title:'Son of God',symbol:'eagle',position:'100% 100%',refs:['John.20.30-John.20.31','John.1.1-John.1.18','John.5.19-John.5.29']}
};
export const referenceLabel=r=>r.split('-').map((p,i)=>{const[b,c,v]=p.split('.');const first=r.split('-')[0].split('.');return i&&b===first[0]?(c===first[1]?v:c+':'+v):(NAMES[b]||window.ATLAS.meta.bookNames[b]||b)+' '+c+':'+v}).join('–');
export function onlineUrl(ed,ref){
 const full=ref.split('-').map(p=>{const[b,c,v]=p.split('.');return (NAMES[b]||window.ATLAS.meta.bookNames[b]||b)+' '+c+':'+v}).join('-');
 if(ed.id==='TCL02'){
  const keys='Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev'.split(' ');const codes='GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split(' ');const map=Object.fromEntries(keys.map((k,i)=>[k,codes[i]]));const parts=ref.split('-');const[b,c,v]=parts[0].split('.');const end=parts[1]?.split('.');
  const osis=map[b]||b.toUpperCase();const range=end&&end[1]===c?'-'+end[2]:'';
  return 'https://www.bible.com/bible/170/'+osis+'.'+c+'.'+v+range+'.TCL02';
 }
 if(ed.gateway)return 'https://www.biblegateway.com/passage/?search='+encodeURIComponent(full)+'&version='+encodeURIComponent(ed.gateway);
 return null;
}
export function getText(ed,id){const v=ed.verses?.[id];return typeof v==='string'?v:v?.text;}
export function VerseText({ed,id}){
 const v=ed.verses?.[id];
 if(typeof v==='string')return v;
 if(v?.continued)return <span className="missing-verse">Included with {referenceLabel(v.continued)}.</span>;
 if(v?.text)return <>{v.sourceRef&&<span className="range-note">[Edition: {referenceLabel(v.sourceRef)}] </span>}{v.range&&<span className="range-note">[{v.range}] </span>}{v.text}</>;
 return <span className="missing-verse">{ed.offline?'This verse is not present in the included edition.':'Read this edition online.'}</span>;
}
export function rangeIds(ref){
 const [first,last=first]=ref.split('-'),[book,c1,v1]=first.split('.'),[,c2,v2]=last.split('.');
 return Object.keys(window.BASELINE).filter(k=>{const[b,c,v]=k.split('.');return b===book&&(+c>+c1||+c===+c1&&+v>=+v1)&&(+c<+c2||+c===+c2&&+v<=+v2)});
}
export function downloadJson(obj,name){const u=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
// The old range gave A− a single step before it greyed out, which reads as a broken
// button rather than a limit. It now runs from small enough to fit a long passage on
// one screen to large enough to read from the back of a room.
export const TEXT_MIN=11,TEXT_MAX=35,TEXT_KEY='gospel-atlas-text-size';
export function useEdition(){
 const versions=window.EDITIONS;
 const [id,setId]=useState('asv'),[custom,setCustom]=useState(null),[message,setMessage]=useState('');
 // Text size is remembered, like the palette. Someone who needs larger type needs it
 // every time they open the file, not once per session, and this file is opened from
 // disk again and again rather than left running.
 const [scale,setRawScale]=useState(()=>{try{const n=+localStorage.getItem(TEXT_KEY);return n>=TEXT_MIN&&n<=TEXT_MAX?n:17}catch{return 17}});
 const setScale=n=>{setRawScale(n);try{localStorage.setItem(TEXT_KEY,n)}catch{}};
 const ed=custom&&id==='custom'?custom:versions.find(e=>e.id===id)||versions[0];
 const all=custom?[...versions,custom]:versions;
 return {ed,all,id,setId,scale,setScale,message,setMessage,setCustom};
}
export function parseImport(obj){
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||!obj.verses||typeof obj.verses!=='object'||Array.isArray(obj.verses))throw Error('Use the JSON format shown in the import example.');
 const verses={};let excluded=0;
 for(const[k,v]of Object.entries(obj.verses)){
  if(!Object.hasOwn(window.BASELINE,k)||typeof v!=='string'||!v.trim()||v.length>15000){excluded++;continue}
  verses[k]=v;
 }
 if(!Object.keys(verses).some(k=>BOOKS.includes(k.split('.')[0])))throw Error('No Gospel verses were found. Use references such as Mark.10.45.');
 return {edition:{id:'custom',lang:typeof obj.language==='string'?obj.language.slice(0,40):'custom',language:typeof obj.languageName==='string'?obj.languageName.slice(0,80):'Imported language',name:typeof obj.name==='string'?obj.name.slice(0,100):'My translation',short:'Imported',dir:obj.direction==='rtl'?'rtl':'ltr',offline:true,license:typeof obj.license==='string'?obj.license.slice(0,500):'User-supplied text; permissions remain with its rights holder.',verses},excluded};
}
export function EditionBar({state}){
 const {ed,all,setId,scale,setScale,message,setMessage,setCustom}=state;const input=useRef(null),help=useRef(null);
 const langs=[...new Map(all.map(e=>[e.lang,e.language])).entries()];
 async function importFile(e){const f=e.target.files?.[0];if(!f)return;try{if(f.size>25000000)throw Error('Choose a JSON file under 25 MB.');const {edition,excluded}=parseImport(JSON.parse(await f.text()));setCustom(edition);setId('custom');setMessage(Object.keys(edition.verses).length.toLocaleString()+' verses loaded for this session.'+(excluded?' '+excluded+' unsupported entries skipped.':''));help.current.close()}catch(err){setMessage(err.message)}finally{e.target.value=''}}
 return <section className="edition-panel" aria-label="Reading settings"><div className="edition-controls">
 <label>Bible language<select aria-label="Bible language" value={ed.lang} onChange={e=>setId(all.find(x=>x.lang===e.target.value).id)}>{langs.map(([code,name])=><option value={code} key={code}>{name}{all.some(e=>e.lang===code&&e.offline)?' · offline available':' · online'}</option>)}</select></label>
 <label>Bible translation<select aria-label="Bible translation" value={ed.id} onChange={e=>setId(e.target.value)}>{all.filter(x=>x.lang===ed.lang).map(x=><option key={x.id} value={x.id}>{x.name} · {x.offline?'offline':'online'}</option>)}</select></label>
 <div className="reading-tools"><button aria-label="Decrease text size" disabled={scale<=TEXT_MIN} onClick={()=>setScale(Math.max(TEXT_MIN,scale-2))}>A−</button><span className="text-size" aria-live="polite" aria-label={`Scripture text size ${scale} pixels`}>{scale}px</span><button aria-label="Increase text size" disabled={scale>=TEXT_MAX} onClick={()=>setScale(Math.min(TEXT_MAX,scale+2))}>A+</button><button onClick={()=>window.print()}>Print passages</button><button onClick={()=>help.current.showModal()}>Use my translation</button></div></div>
 <div className="edition-status"><span className={ed.offline?'offline-badge':'online-badge'}>{ed.offline?'● INCLUDED OFFLINE':'↗ ONLINE READER'}</span><span>{ed.offline?ed.id==='asv'?'Full ASV Bible included for cross-references.':ed.id==='custom'?'Imported text stays in this browser session.':'Four Gospels included. Other books are available in ASV.':'Passage buttons open '+(ed.id==='TCL02'?'YouVersion':'Bible Gateway')+'. Internet required.'}</span></div>
 <p className="edition-footnote">English + 20 widely used languages. Published Bible translations; interface and story titles are in English. <a href="https://www.bible.com/languages" target="_blank" rel="noreferrer">Find another language ↗</a></p>
 {message&&<p className="import-message" role="status">{message}</p>}
 <dialog ref={help} className="method-dialog"><div className="dialog-top"><span className="eyebrow">YOUR BIBLE TRANSLATION</span><button aria-label="Close import help" onClick={()=>help.current.close()}>×</button></div><h2>Read your own text.</h2><p>Import a JSON Bible file you are permitted to use. It is read on your computer, never uploaded, and removed when you close or reload this app. Your imported text is not added to the shareable app file.</p><p>Verse keys use the reference format below. You can include one passage or a whole Bible. Missing verses are labelled; another translation is never silently substituted.</p><pre>{JSON.stringify({name:'My translation',language:'en',languageName:'English',direction:'ltr',verses:{'Mark.10.45':window.BASELINE['Mark.10.45']}},null,2)}</pre><div className="download-row"><button onClick={()=>input.current.click()}>Choose JSON file</button><button onClick={()=>downloadJson({name:'ASV example',language:'en',languageName:'English',direction:'ltr',license:'Public domain',verses:Object.fromEntries(rangeIds('Mark.10.42-Mark.10.45').map(k=>[k,window.BASELINE[k]]))},'translation-example.json')}>Download example</button></div><p className="small">Supported book codes: {Object.keys(window.ATLAS.meta.bookNames).join(', ')}. Use direction “rtl” for right-to-left text.</p><p role="status">{message}</p></dialog><input ref={input} type="file" accept=".json,application/json" hidden onChange={importFile}/></section>
}
export function Symbol({book}){return <span className="gospel-symbol" aria-hidden="true" style={{backgroundImage:'url('+window.SYMBOL_IMAGE+')',backgroundPosition:THEMES[book].position}}/>}
export function OnlinePassage({ed,refId}){const url=onlineUrl(ed,refId);return url?<div className="online-passage"><span>{ed.name}</span><a href={url} target="_blank" rel="noreferrer">Read {referenceLabel(refId)} ↗</a><small>Opens online · Internet required</small></div>:<p className="missing-verse">No online reader is configured for this edition.</p>}
export function SymbolDialog({book,onClose,ed,scale,onLocate}){
 const dialog=useRef(null);const [range,setRange]=useState(0);
 useEffect(()=>{setRange(0);if(book)dialog.current?.showModal();else dialog.current?.close()},[book]);
 if(!book)return null;const theme=THEMES[book],ref=theme.refs[range]||theme.refs[0];
 return <dialog ref={dialog} className="symbol-dialog" onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose()}}><div className="dialog-top"><span className="eyebrow">{NAMES[book].toUpperCase()} · SCRIPTURE</span><button onClick={onClose} aria-label="Close Scripture passages">×</button></div><div className="symbol-title"><Symbol book={book}/><div><h2>{theme.title}</h2><p>{ed.name} · {ed.offline?'Offline':'Online'}</p></div></div><div className="symbol-tabs" aria-label="Passages for this symbol">{theme.refs.map((r,i)=><button key={r} className={range===i?'active':''} aria-pressed={range===i} onClick={()=>setRange(i)}>{referenceLabel(r)}</button>)}</div>
 <div className="symbol-scripture" lang={ed.lang} dir={ed.dir} style={{fontSize:scale}}>{ed.offline?rangeIds(ref).map(id=><p key={id}><sup>{id.split('.').slice(1).join(':')}</sup> <VerseText ed={ed} id={id}/></p>):<OnlinePassage ed={ed} refId={ref}/>}</div><div className="symbol-actions"><button onClick={()=>{onLocate(ref.split('-')[0]);onClose()}}>Locate in Gospel map ↗</button><button onClick={()=>window.print()}>Print passage</button></div></dialog>
}
export function EditionSources(){return <><h3>Bible editions</h3><p>The map retains its ASV verse coordinates across editions. Some translations omit or combine verses. Those differences are labelled; wording is not automatically translated or filled from another edition. The four heading symbols follow the selected King / Servant / Son of Man / Son of God arrangement.</p><p>Online editions are links only: their text is not redistributed. ESV and NASB full-text redistribution requires the relevant publisher’s permission. <a href="https://www.crossway.org/permissions/" target="_blank" rel="noreferrer">Crossway permissions</a> · <a href="https://www.lockman.org/permission-to-quote-copyright-trademark-information/" target="_blank" rel="noreferrer">Lockman permissions</a>.</p><div className="edition-source-list">{window.EDITIONS.map(e=><div key={e.id}><strong>{e.language} — {e.name}</strong><p>{e.copyright} · {e.license}</p>{e.coordinateMappings&&<p>Source numbering: Mark 9:50–51 and 10:52–53 are displayed together at map coordinates Mark 9:50 and 10:52, with source references labelled. Wording is unchanged.</p>}{e.source&&<a href={e.source} target="_blank" rel="noreferrer">Source & permissions ↗</a>}</div>)}</div><p>Gospel texts are extracted from their named editions, with source verse numbering retained. Layout is changed and headings/footnotes supplied separately by the source may be omitted. Indian Revised Version extracts and their formatting contributions retain CC BY-SA 4.0. They are separate from the CC BY-NC-SA Gospel index. No translation or index publisher endorses this app.</p><p>Software uses React under its MIT licence. Required notices are embedded in this HTML file. Icon artwork supplied by David Lee.</p></>}
