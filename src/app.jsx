import React, {useState, useEffect, useRef, useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {THEMES, Symbol, SymbolDialog, EditionBar, useEdition, VerseText, OnlinePassage, EditionSources, rangeIds, downloadJson, onlineUrl, getText} from './editions.jsx';

const BOOKS=['Matt','Mark','Luke','John'];
const NAMES={Matt:'Matthew',Mark:'Mark',Luke:'Luke',John:'John'};
// The accessible set is Okabe-Ito, chosen so red/green confusion does not hide a distinction.
const PALETTES={
  standard:{Matt:'#3e7598',Mark:'#b25c51',Luke:'#4e8875',John:'#866a9f',shared:'#b49a4b'},
  accessible:{Matt:'#0072b2',Mark:'#d55e00',Luke:'#009e73',John:'#cc79a7',shared:'#e69f00'}
};
const COLORS={...PALETTES.standard};
const SHORT={Matt:'Mt',Mark:'Mk',Luke:'Lk',John:'Jn'};
const fmt=n=>n.toLocaleString('en-GB');
const bookOf=r=>r.split('.')[0];
const refLabel=r=>r.split('-').map((part,i)=>{
  const [b,c,v]=part.split('.');
  const start=r.split('-')[0].split('.');
  return i && b===start[0] ? (c===start[1]?v:`${c}:${v}`) : `${NAMES[b]||b} ${c}:${v}`;
}).join('–');
const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
// Keeps letters of every script and collapses punctuation to spaces, so Scripture
// text search works in Hindi, Tamil, Arabic, Chinese and the rest, not only Latin.
// Ligatures and accents are folded as well, so "Zacchaeus" finds the ASV's "Zacchæus".
const textNorm=s=>(s||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ø/g,'o').replace(/ß/g,'ss').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const MIN_TEXT_QUERY=3;
const icon=(name)=> name==='search'?<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
function Mask({story}) {return <span className="mask" aria-label={BOOKS.filter(b=>story.sources[b]).map(b=>NAMES[b]).join(', ')}>{BOOKS.map(b=><span key={b} title={NAMES[b]} className={story.sources[b]?'present':''} style={{'--book':COLORS[b]}}>{SHORT[b]}</span>)}</span>}

function GospelCanvas({book,verses,stories,selected,selectedVerse,onSelect,hover,onHover,matching,focus,columns,palette}) {
  const ref=useRef(null),frame=useRef(null),geometry=useRef([]),keyboard=useRef(0);
  const [width,setWidth]=useState(260),[height,setHeight]=useState(400);
  useEffect(()=>{const ro=new ResizeObserver(e=>setWidth(e[0].contentRect.width));ro.observe(frame.current);return()=>ro.disconnect()},[]);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas || !width)return;
    const left=24,right=10,step=(width-left-right)/columns,size=Math.max(2,step-1.35),gap=5;
    let y=14;
    const boxes=[],labels=[];
    const chapters=[...new Set(verses.map(v=>v.chapter))];
    for(const chapter of chapters){
      const vs=verses.filter(v=>v.chapter===chapter);
      labels.push({text:chapter,y:y+size/2});
      vs.forEach((v,i)=>boxes.push({x:left+(i%columns)*step,y:y+Math.floor(i/columns)*step,w:size,h:size,v}));
      y+=Math.ceil(vs.length/columns)*step+gap;
    }
    const h=Math.ceil(y+8);setHeight(h);geometry.current=boxes;
    const dpr=window.devicePixelRatio||1;canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(h*dpr);
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,h);
    ctx.font='9px system-ui';ctx.textBaseline='middle';ctx.fillStyle='#8b8e88';
    labels.forEach(l=>ctx.fillText(String(l.text).padStart(2,'0'),2,l.y));
    const active=hover?.story ?? selected;
    for(const box of boxes){
      const sid=box.v.stories[0],s=stories[sid],isActive=sid===active;
      ctx.globalAlpha=matching.has(sid) ? ((hover||focus) && !isActive ? .13 : 1) : .09;
      ctx.fillStyle=s?(s.count>1?COLORS.shared:COLORS[book]):'#9b9d99';
      ctx.fillRect(box.x,box.y,box.w,box.h);
      if(isActive && matching.has(sid)){
        ctx.globalAlpha=1;ctx.strokeStyle='#253b34';ctx.lineWidth=.85;ctx.strokeRect(box.x-.45,box.y-.45,box.w+.9,box.h+.9);
      }
      if(box.v.id===selectedVerse){ctx.globalAlpha=1;ctx.fillStyle='#263e34';ctx.fillRect(box.x+box.w*.3,box.y+box.h*.3,box.w*.4,box.h*.4)}
    }
    ctx.globalAlpha=1;
  },[width,verses,stories,selected,selectedVerse,hover,matching,focus,columns,book,palette]);
  function hit(e){const r=ref.current.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;return geometry.current.find(b=>x>=b.x-1&&x<=b.x+b.w+1&&y>=b.y-1&&y<=b.y+b.h+1)}
  function selectBox(box){if(box){keyboard.current=verses.indexOf(box.v);onSelect(box.v.stories[0],box.v.id)}}
  function move(e){const box=hit(e);onHover(box?{story:box.v.stories[0],verse:box.v.id,x:e.clientX,y:e.clientY}:null)}
  function keydown(e){
    let n=keyboard.current;
    if(e.key==='ArrowRight')n++;else if(e.key==='ArrowLeft')n--;else if(e.key==='ArrowDown')n+=columns;else if(e.key==='ArrowUp')n-=columns;else if(e.key==='Home')n=0;else if(e.key==='End')n=verses.length-1;else if(e.key==='Enter'||e.key===' '){e.preventDefault();const v=verses[n];onSelect(v.stories[0],v.id);return}else return;
    e.preventDefault();keyboard.current=Math.min(verses.length-1,Math.max(0,n));const v=verses[keyboard.current];onSelect(v.stories[0],v.id);
  }
  return <div ref={frame} className="canvas-frame"><canvas ref={ref} style={{width:'100%',height}} role="img" tabIndex="0" aria-label={`${NAMES[book]}: ${verses.length} verse cells, one square per verse. Arrow keys select verses; Home and End jump to the start and end. The story browser below offers the same passages as text.`} onPointerMove={e=>{if(e.pointerType!=='touch')move(e)}} onPointerLeave={()=>onHover(null)} onClick={e=>selectBox(hit(e))} onKeyDown={keydown}/></div>
}

function App({data}){
  const {meta,verses}=data;
  const editionState=useEdition(),ed=editionState.ed;
  const [symbolBook,setSymbolBook]=useState(null);
  const stories=useMemo(()=>Object.fromEntries(data.stories.map(s=>[s.id,s])),[data]);
  const verseById=useMemo(()=>Object.fromEntries(Object.values(verses).flat().map(v=>[v.id,v])),[verses]);
  const params=new URLSearchParams(location.search);
  const verseParam=params.get('verse');
  const openVerse=verseParam&&verseById[verseParam]?verseParam:null;
  const storyParam=Number(params.get('story'));
  // A shared link carries both; if they disagree the verse wins, since that is what was pointed at.
  const initial=openVerse?verseById[openVerse].stories[0]:stories[storyParam]?storyParam:122;
  const [selected,setSelected]=useState(initial),[selectedVerse,setSelectedVerse]=useState(openVerse);
  const [hover,setHover]=useState(null),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[focus,setFocus]=useState(false),[columns,setColumns]=useState(40);
  const [compare,setCompare]=useState({a:'',b:''});
  const [palette,setPalette]=useState(()=>{try{return localStorage.getItem('gospel-atlas-palette')==='accessible'?'accessible':'standard'}catch{return 'standard'}});
  Object.assign(COLORS,PALETTES[palette]);
  const [crossrefs,setCrossrefs]=useState(null),[crossError,setCrossError]=useState(''),[crossScope,setCrossScope]=useState('all'),[crossLimit,setCrossLimit]=useState(12);
  const [expanded,setExpanded]=useState(null),[bible,setBible]=useState(null),[bibleError,setBibleError]=useState(''),[bibleLoading,setBibleLoading]=useState(false);
  const [shareMessage,setShareMessage]=useState('');
  const dialog=useRef(null),reader=useRef(null),connectionSection=useRef(null),storyList=useRef(null);
  const s=stories[selected];
  const storyVerses=BOOKS.flatMap(b=>(s.sources[b]||[]).flatMap(r=>r.verses));
  const currentVerse=selectedVerse&&storyVerses.includes(selectedVerse)?selectedVerse:storyVerses[0];
  const q=normalize(query).replace(/^matthew/,'matt').replace(/^mt(?=\d)/,'matt').replace(/^mk(?=\d)/,'mark').replace(/^lk(?=\d)/,'luke').replace(/^jn(?=\d)/,'john');
  // Scripture text of the reading edition, normalised once per edition so that typing
  // stays responsive. Online editions hold no text here, so their search falls back to the ASV.
  const searchEdition=ed.offline?ed:null;
  const textIndex=useMemo(()=>{
    const index={};
    // Each verse is held twice: spaced, and with separators removed, so that
    // "moneychangers" finds "money-changers" and "bread of life" finds it hyphenated.
    for(const v of Object.values(verses).flat()){
      const spaced=textNorm(searchEdition&&getText(searchEdition,v.id)||window.BASELINE[v.id]);
      index[v.id]={spaced,tight:spaced.replace(/ /g,'')};
    }
    return index;
  },[verses,searchEdition]);
  const textQuery=textNorm(query);
  const tightQuery=textQuery.replace(/ /g,'');
  const searchesText=tightQuery.length>=MIN_TEXT_QUERY;
  const textHit=id=>{const e=textIndex[id];return !!e&&(e.spaced.includes(textQuery)||e.tight.includes(tightQuery))};
  const storyVerseIds=story=>Object.values(story.sources).flat().flatMap(r=>r.verses);
  const matchingVerse=story=>{
    const ids=storyVerseIds(story);
    return (q&&ids.find(v=>normalize(v)===q))||(searchesText&&ids.find(textHit))||null;
  };
  const comparing=compare.a&&compare.b&&compare.a!==compare.b;
  const visibleStories=useMemo(()=>data.stories.filter(story=>{
    const correctFilter=filter==='all'||filter==='shared'&&story.count>1||filter==='unique'&&story.count===1||filter==='four'&&story.count===4||BOOKS.includes(filter)&&story.count===1&&story.sources[filter];
    if(!correctFilter)return false;
    if(comparing&&!(story.sources[compare.a]&&!story.sources[compare.b]))return false;
    if(!query.trim())return true;
    if(q&&(normalize(story.title).includes(q)||Object.values(story.sources).flat().some(r=>r.verses.some(v=>normalize(v).includes(q)))))return true;
    return searchesText&&Object.values(story.sources).flat().some(r=>r.verses.some(textHit));
  }),[data.stories,filter,q,query,textQuery,searchesText,textIndex,comparing,compare.a,compare.b]);
  const matching=useMemo(()=>new Set(visibleStories.map(s=>s.id)),[visibleStories]);
  const uniqueCount=data.stories.filter(s=>s.count===1).length;
  const refs=(crossrefs?.[currentVerse]||[]).filter(r=>crossScope==='all'||(crossScope==='gospels'?BOOKS.includes(bookOf(r[0])):!BOOKS.includes(bookOf(r[0]))));
  const selectedIndex=data.stories.findIndex(x=>x.id===selected);
  const loadCrossrefs=()=>{setCrossrefs(window.CROSSREFS)};
  useEffect(loadCrossrefs,[]);
  useEffect(()=>{setCrossLimit(12);setExpanded(null)},[currentVerse,crossScope]);
  useEffect(()=>{const item=storyList.current?.querySelector('.selected');const box=storyList.current;if(item&&box){const top=item.getBoundingClientRect().top-box.getBoundingClientRect().top+box.scrollTop;box.scrollTop=Math.max(0,top-45)}},[selected,visibleStories]);
  useEffect(()=>{reader.current?.querySelectorAll('.passage-text').forEach(el=>{el.scrollTop=0})},[selected]);
  useEffect(()=>{const el=reader.current?.querySelector('.active-verse');if(el){const box=el.parentElement;const top=el.getBoundingClientRect().top-box.getBoundingClientRect().top+box.scrollTop;box.scrollTop=Math.max(0,top-8)}},[selected,currentVerse]);
  useEffect(()=>{document.title=`${s.title} · Gospel Atlas`;const u=new URL(location.href);u.searchParams.set('story',selected);if(currentVerse)u.searchParams.set('verse',currentVerse);else u.searchParams.delete('verse');(()=>{try{history.replaceState(null,'',u)}catch{}})()},[selected,s.title,currentVerse]);
  useEffect(()=>{if(!shareMessage)return;const t=setTimeout(()=>setShareMessage(''),2500);return()=>clearTimeout(t)},[shareMessage]);
  function select(id,vid){if(!stories[id])return;setSelected(id);setSelectedVerse(vid||null);setHover(null)}
  function jump(id){setFilter('all');setQuery('');setCompare({a:'',b:''});select(id)}
  function expandRef(ref){
    setExpanded(expanded===ref?null:ref);
    if(!bible)setBible(window.BASELINE);
  }
  function targetText(ref){
    if(!bible)return [];
    const [first,last=first]=ref.split('-'),[book,c1,v1]=first.split('.'),[,c2,v2]=last.split('.');
    return Object.entries(bible).filter(([k])=>{const[b,c,v]=k.split('.');return b===book && (+c>+c1||+c===+c1&&+v>=+v1) && (+c<+c2||+c===+c2&&+v<=+v2)});
  }
  async function share(){const text=s.title+'\n'+Object.values(s.sources).flat().map(r=>refLabel(r.ref)).join(' · ')+'\n'+ed.name+(location.protocol==='file:'?'':'\n'+location.href);try{await navigator.clipboard.writeText(text);setShareMessage('References copied')}catch{window.prompt('Copy these references:',text)}}

  return <>
    <header className="site-header"><a className="brand" href="#top" aria-label="Gospel Atlas home"><span className="brand-mark">{BOOKS.map(b=><i key={b} style={{background:COLORS[b]}}/>)}</span>Gospel Atlas</a><nav><a href="#atlas">Explore</a><button onClick={()=>dialog.current.showModal()}>How to read & sources</button></nav><span className="edition">STANDALONE EDITION · DAVID LEE</span></header>
    <main id="top">
      <section className="hero"><div><div className="eyebrow">MATTHEW · MARK · LUKE · JOHN</div><h1>Four Gospels, <em>in pixels.</em></h1><p>Read the accounts side by side.<br className="mobile-break"/> Follow their shared and distinctive passages.</p></div><div className="hero-stats"><div><strong>{fmt(meta.verseCount)}</strong><span>VERSE PIXELS</span></div><div><strong>{meta.storyCount}</strong><span>STORY UNITS</span></div><div><strong>{fmt(meta.crossReferenceCount)}</strong><span>SOURCE CROSS-REFERENCES</span></div></div></section>
      <EditionBar state={editionState}/><section className="atlas-section" id="atlas" aria-label="Gospel pixel maps">
        <div className="section-heading"><div><span className="section-number">01</span><h2>The four accounts</h2></div><p>One square = one verse · Chapters read top to bottom</p></div>
        <div className="controls"><label className="search-label">{icon('search')}<input type="search" aria-label="Find a story, a reference or words in the text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a story, a reference, or words…"/>{query&&<button className="clear-search" aria-label="Clear search" onClick={()=>setQuery('')}>×</button>}</label><div className="filter-tabs" aria-label="Filter stories">{[['all','All material'],['shared','Shared'],['unique','Distinctive'],['four','In all four']].map(([value,label])=><button key={value} className={filter===value?'active':''} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><label className="density">Pixels <select value={columns} onChange={e=>setColumns(Number(e.target.value))} aria-label="Pixel density"><option value={52}>Small</option><option value={40}>Medium</option><option value={28}>Large</option></select></label></div>
        <div className="compare-row"><span className="compare-label">COMPARE</span><label>Told in <select value={compare.a} aria-label="Gospel that records the story" onChange={e=>setCompare({a:e.target.value,b:compare.b===e.target.value?'':compare.b})}><option value="">—</option>{BOOKS.map(b=><option key={b} value={b}>{NAMES[b]}</option>)}</select></label><label>but not in <select value={compare.b} aria-label="Gospel that does not record the story" onChange={e=>setCompare({a:compare.a===e.target.value?'':compare.a,b:e.target.value})}><option value="">—</option>{BOOKS.map(b=><option key={b} value={b}>{NAMES[b]}</option>)}</select></label>{comparing?<><strong>{visibleStories.length} {visibleStories.length===1?'unit':'units'}</strong><button className="compare-clear" onClick={()=>setCompare({a:'',b:''})}>Clear</button></>:<span className="compare-hint">Choose both to see what one Gospel records and another does not.</span>}</div>
        {query.trim()&&<p className="search-note">{searchesText?`Searching story titles, references and the Gospel text of ${searchEdition?searchEdition.short:'the ASV 1901, because the selected edition is read online'}.`:`Searching story titles and references. Type ${MIN_TEXT_QUERY} letters or more to search the Scripture text as well.`}</p>}
        <div className="legend"><button onClick={()=>setFilter('shared')} className={filter==='shared'?'legend-active':''}><i style={{background:COLORS.shared}}/>Shared by 2–4 Gospels</button><span className="legend-divider"/>{BOOKS.map(b=><button key={b} className={filter===b?'legend-active':''} onClick={()=>setFilter(filter===b?'all':b)}><i style={{background:COLORS[b]}}/>{NAMES[b]} only</button>)}<button className="palette-toggle" aria-pressed={palette==='accessible'} onClick={()=>{const next=palette==='standard'?'accessible':'standard';setPalette(next);try{localStorage.setItem('gospel-atlas-palette',next)}catch{}}}>{palette==='accessible'?'Standard colours':'Colour-blind palette'}</button><span className="legend-note">Story-level classification</span></div>
        <p className="swipe-hint">Swipe sideways to move between the four Gospels.</p>
        <div className="gospel-grid">{BOOKS.map((b,i)=>{
          const exclusive=verses[b].filter(v=>stories[v.stories[0]]?.count===1).length;
          const match=verses[b].filter(v=>matching.has(v.stories[0])).length;
          const ranges=s.sources[b];
          return <article className="gospel-card" key={b} style={{'--book':COLORS[b]}}><div className="gospel-card-heading"><div><button className="symbol-button" onClick={()=>setSymbolBook(b)} aria-label={`${NAMES[b]}: ${THEMES[b].title}. Open Scripture passages`} title={`${THEMES[b].title} · Read passages`}><Symbol book={b}/></button><div className="gospel-heading-text"><h3>{NAMES[b]}</h3><button className="theme-label" onClick={()=>setSymbolBook(b)}>{THEMES[b].title} ↗</button></div></div><span>{fmt(verses[b].length)} verses</span></div><div className="book-summary"><div className="proportion"><i style={{width:`${100*exclusive/verses[b].length}%`,background:COLORS[b]}}/><i style={{flex:1,background:COLORS.shared}}/></div><span>{Math.round(100*exclusive/verses[b].length)}% in distinctive units</span></div><GospelCanvas book={b} verses={verses[b]} stories={stories} selected={selected} selectedVerse={currentVerse} onSelect={select} hover={hover} onHover={setHover} matching={matching} focus={focus} columns={columns} palette={palette}/><div className="card-footer"><span className={ranges?'has-passage':''}>{ranges?ranges.map(r=>refLabel(r.ref).replace(NAMES[b]+' ','')).join(', '):'No parallel in this unit'}</span><span>{filter!=='all'||q?`${fmt(match)} visible`:`${Object.keys(s.sources).includes(b)?'Selected passage':'—'}`}</span></div></article>
        })}</div>
        <div className="atlas-bottom"><p><span className="cursor-mark">↗</span> Select a square to connect the same story across the four accounts.</p><label><input type="checkbox" checked={focus} onChange={e=>setFocus(e.target.checked)}/> Focus selected story</label></div>
        <div className="try-row"><span>EXPLORE A STORY</span>{[122,37,data.stories.find(s=>s.title.toLowerCase().includes('good samaritan'))?.id,1].filter(Boolean).map((id,i)=><button key={id} onClick={()=>jump(id)}>{['Feeding the five thousand','Woman at the well','The Good Samaritan','The Word'][i]} <span>↗</span></button>)}</div>
      </section>
      <section className="story-section" ref={reader} id="reader"><aside className="story-browser"><div className="browser-top"><h2>Story index</h2><span>{visibleStories.length} / {meta.storyCount}</span></div><p className="small">Browse the index or search above.</p><div className="story-list" ref={storyList} role="group" aria-label="Gospel story index">{visibleStories.length?visibleStories.map(story=>{const hit=query.trim()?matchingVerse(story):null;return <button key={story.id} className={story.id===selected?'story-option selected':'story-option'} aria-current={story.id===selected?'true':undefined} onClick={()=>select(story.id,hit)}><span className="story-id">{String(story.id).padStart(3,'0')}</span><span className="story-option-body"><span>{story.title}</span><Mask story={story}/>{hit&&<span className="story-match">{refLabel(hit)}</span>}</span></button>}):<div className="empty-state">{comparing?`No unit is told in ${NAMES[compare.a]} but not in ${NAMES[compare.b]} under the current filter.`:'No stories match this search.'}<button onClick={()=>{setQuery('');setFilter('all');setCompare({a:'',b:''})}}>Clear filters</button></div>}</div></aside>
      <div className="story-detail"><div className="detail-top"><div className="eyebrow">SELECTED STORY · {String(s.id).padStart(3,'0')}</div><div className="story-arrows"><button aria-label="Previous story" disabled={selectedIndex===0} onClick={()=>select(data.stories[selectedIndex-1].id)}>←</button><button aria-label="Next story" disabled={selectedIndex===data.stories.length-1} onClick={()=>select(data.stories[selectedIndex+1].id)}>→</button></div></div><h2>{s.title}</h2><div className="detail-summary"><Mask story={s}/><span>{s.count===1?`Distinctive to ${NAMES[Object.keys(s.sources)[0]]} in this index`:`Recorded in ${s.count} Gospels in this index`}</span><button className="text-button" onClick={share}>{shareMessage||'Copy references ↗'}</button></div>{!matching.has(selected)&&<div className="filter-notice">This selected story is outside the current filter. <button onClick={()=>{setFilter('all');setQuery('');setCompare({a:'',b:''})}}>Show all material</button></div>}
        <div className="reader-bar"><span>PARALLEL PASSAGES</span><span>{ed.short} · Tap a verse number for its connections</span></div><p className="swipe-hint">Swipe sideways to read the accounts alongside each other.</p><div className="passage-grid">{BOOKS.map(b=><article key={b} className={`passage-card ${s.sources[b]?'':'absent'}`} style={{'--book':COLORS[b]}}><header><h3>{NAMES[b]}</h3><span>{s.sources[b]?.map(r=>refLabel(r.ref).replace(NAMES[b]+' ','')).join(', ')||'—'}</span></header><div className="passage-text" lang={ed.lang} dir={ed.dir} style={{fontSize:editionState.scale}}>{s.sources[b]?(ed.offline?s.sources[b].flatMap(r=>r.verses).map(vid=>{const v=verseById[vid];return <p className={vid===currentVerse?'active-verse':''} key={vid}><button title={`Show connections for ${refLabel(vid)}`} aria-label={`Select ${refLabel(vid)} for cross-references`} onClick={()=>setSelectedVerse(vid)}>{v.chapter}:{v.verse}</button><VerseText ed={ed} id={vid}/></p>}):s.sources[b].map(r=><OnlinePassage key={r.ref} ed={ed} refId={r.ref}/>)):<div className="absent-message"><span>—</span><p>No passage assigned<br/>to this story unit.</p></div>}</div></article>)}</div><p className="reader-note">Shared episodes can differ in wording, detail and order. Gold indicates an indexed parallel, not identical information.</p>
      </div></section>
      <section className="connections-section" ref={connectionSection} id="connections"><div className="section-heading"><div><span className="section-number">02</span><h2>Follow the connections</h2></div><span className="source-tag">OPENBIBLE.INFO</span></div><div className="connection-intro"><p>Explore related themes, people and passages beyond the story itself.</p><div className="connection-controls"><label>From <select aria-label="Cross-reference source verse" value={currentVerse} onChange={e=>setSelectedVerse(e.target.value)}>{storyVerses.map(v=><option key={v} value={v}>{refLabel(v)}</option>)}</select></label><label>To <select value={crossScope} onChange={e=>setCrossScope(e.target.value)} aria-label="Cross-reference scope"><option value="all">All Scripture</option><option value="gospels">Four Gospels</option><option value="other">Rest of Scripture</option></select></label></div></div><div className="selected-verse-quote"><span>{refLabel(currentVerse)}</span><div className="selected-text" lang={ed.lang} dir={ed.dir}><span className="translation-label">{ed.short}</span>{ed.offline?<p style={{fontSize:editionState.scale}}><VerseText ed={ed} id={currentVerse}/></p>:<OnlinePassage ed={ed} refId={currentVerse}/>}</div><strong>{crossrefs?`${refs.length} connections`:'Loading connections…'}</strong></div>
      {crossError?<div className="empty-state">{crossError} <button onClick={loadCrossrefs}>Retry</button></div>:crossrefs?<><div className="reference-grid">{refs.slice(0,crossLimit).map(([r,votes])=><div key={r} className={'reference-card '+(expanded===r?'expanded':'')}><button className="reference-trigger" onClick={()=>expandRef(r)} aria-expanded={expanded===r}><span className="reference-dot" style={{background:COLORS[bookOf(r)]||'#a5aaa1'}}/><span>{refLabel(r)}</span><span className="ref-votes" title="OpenBible community votes, not a similarity percentage">{votes} votes</span><span>{expanded===r?'−':'+'}</span></button>{expanded===r&&<div className="reference-preview">{!ed.offline?<OnlinePassage ed={ed} refId={r}/>:BOOKS.includes(bookOf(r))||ed.id==='asv'||rangeIds(r).some(id=>ed.verses?.[id])?<div lang={ed.lang} dir={ed.dir}><span className="translation-label">{ed.short}</span>{rangeIds(r).map(id=><p key={id} style={{fontSize:editionState.scale}}><sup>{id.split('.').slice(1).join(':')}</sup> <VerseText ed={ed} id={id}/></p>)}</div>:<div><span className="translation-label">ASV 1901 · English · This book is not included in {ed.short}</span>{rangeIds(r).map(id=><p key={id} style={{fontSize:editionState.scale}}><sup>{id.split('.').slice(1).join(':')}</sup> {window.BASELINE[id]}</p>)}</div>}<div className="reference-actions">{verseById[r.split('-')[0]]&&<button onClick={()=>{jump(verseById[r.split('-')[0]].stories[0]);setSelectedVerse(r.split('-')[0]);reader.current.scrollIntoView({behavior:'smooth'})}}>Locate in Gospel map ↗</button>}{onlineUrl(ed,r)&&<a target="_blank" rel="noreferrer" href={onlineUrl(ed,r)}>Open {ed.short} online ↗</a>}</div></div>}</div>)}</div>{!refs.length&&<p className="empty-state">No outgoing references for this verse in the selected scope. This does not establish that it is unique.</p>}{refs.length>crossLimit&&<button className="load-more" onClick={()=>setCrossLimit(crossLimit+24)}>Show more connections ({refs.length-crossLimit} remaining) ↓</button>}</>:<div className="loading-inline">Loading cross-reference data…</div>}
      <p className="connection-note">{fmt(meta.gospelCrossReferenceCount)} outgoing Gospel links from {fmt(meta.crossReferenceCount)} source records. Ranked by source votes; these links do not determine the map colours.</p></section>
      <footer><div className="brand"><span className="brand-mark small-mark">{BOOKS.map(b=><i key={b} style={{background:COLORS[b]}}/>)}</span>Gospel Atlas</div><p><strong>Coder: David Lee</strong><br/>Story index: Sean Boisen / SemanticBible · Connections: OpenBible.info</p><button onClick={()=>dialog.current.showModal()}>Method, sources & data ↗</button></footer>
    </main>
    <SymbolDialog book={symbolBook} onClose={()=>setSymbolBook(null)} ed={ed} scale={editionState.scale} onLocate={vid=>{setFilter("all");setQuery("");select(verseById[vid].stories[0],vid);reader.current.scrollIntoView({behavior:"smooth"})}}/>
    {hover&&<div className="map-tooltip" style={{left:Math.max(8,Math.min(hover.x+16,window.innerWidth-295)),top:Math.max(8,Math.min(hover.y+16,window.innerHeight-130))}}><strong>{refLabel(hover.verse)}</strong><p>{stories[hover.story]?.title}</p>{stories[hover.story]&&<Mask story={stories[hover.story]}/>}</div>}
    <dialog ref={dialog} className="method-dialog" onClick={e=>{if(e.target===dialog.current)dialog.current.close()}}><div className="dialog-top"><span className="eyebrow">READING THE ATLAS</span><button aria-label="Close sources" onClick={()=>dialog.current.close()}>×</button></div><h2>A map of stories,<br/><em>not a claim of sameness.</em></h2><p>Each square is one verse, in its Gospel’s own order. Chapter numbers appear down the left of each frame. Select a square to highlight its story unit across the four accounts.</p><h3>Five colours, fifteen possible combinations</h3><p>Gold means the index assigns an episode or teaching to more than one Gospel. Blue, red, green and purple identify units assigned to Matthew, Mark, Luke or John alone. The Mt / Mk / Lk / Jn badges show the exact combination. Hovering temporarily highlights a unit; Focus selected story dims everything else. Colour-blind palette switches to the Okabe-Ito colours, so no distinction depends on telling red from green; the Mt / Mk / Lk / Jn badges carry the same information in text either way.</p>
    <h3>Searching and comparing</h3><p>The search box matches story titles, references such as John 4:7, and — from three letters upwards — the Scripture text itself in the edition you are reading. Online editions hold no text in this file, so their searches fall back to the ASV 1901. Matched units show the first verse that contains your words.</p><p>Told in / but not in filters the index to the units one Gospel records and another does not, which is the comparison the maps show but cannot answer precisely. It reports the chosen index's assignments: a unit absent from one Gospel may still share details with something that Gospel records elsewhere.</p><h3>What “distinctive” means</h3><p>It means “assigned only to this Gospel in the chosen story index.” It does not prove that every idea or detail is unique. Shared units can contain unique details, and different synopses can group accounts differently. No literary dependence, chronology or factual agreement is inferred from the colours.</p><h3>The two data layers</h3><p><a href="https://semanticbible.com/cgi/cgi-view.html" target="_blank" rel="noreferrer">Sean Boisen’s Composite Gospel Index 1.2</a> supplies {meta.storyCount} units covering all {fmt(meta.verseCount)} Gospel verses. Its episode groupings determine the colours. The story browser follows the index sequence, while each map retains its Gospel’s sequence.</p><p><a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noreferrer">OpenBible.info</a> supplies {fmt(meta.crossReferenceCount)} directed links in the 26 October 2026 snapshot, chiefly derived from the Treasury of Scripture Knowledge. {fmt(meta.gospelCrossReferenceCount)} originate in the four Gospels and are available here. They may connect words, themes, people or events. Missing links do not establish uniqueness; votes are not confidence or similarity scores.</p><h3>Text and verification</h3><p>The reference map uses the public-domain American Standard Version (1901), supplied through <a href="https://github.com/scrollmapper/bible_databases" target="_blank" rel="noreferrer">Scrollmapper</a>. All {fmt(meta.verseCount)} Gospel verses have exactly one index assignment, with no gaps or overlaps. Source hashes are recorded in the downloadable metadata.</p><p>One documented source typo was corrected: unit 102 labels its source as Mark but starts the range “Matt.4.33”. The atlas uses Mark 4:33–34. No other source groupings were altered. Traditional passages with disputed manuscript support remain present in this ASV-based map.</p><EditionSources/><h3>Attribution and downloads</h3><p>The story index and its adapted metadata are attributed to Sean Boisen / SemanticBible under <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 2.0</a>. Cross-reference data is attributed to OpenBible.info under its <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY licence</a>. Adaptations: verse expansion, colour categories, interface and the correction above. This is a non-commercial study tool.</p><div className="download-row"><button onClick={()=>downloadJson(window.ATLAS,"gospel-atlas-data.json")}>Story & verse data ↓</button><button onClick={()=>downloadJson(window.AUDIT,"gospel-atlas-audit.json")}>Audit & sources ↓</button><button onClick={()=>downloadJson(window.CROSSREFS,"gospel-cross-references.json")}>Gospel cross-references ↓</button></div><p className="small">Keyboard: tab to a map; use arrow keys to select verses. The searchable story list and passage reader provide a text alternative to the canvas. Standalone edition · 2 November 2026. Free to share for non-commercial use with source notices retained.</p></dialog>
  </>
}

createRoot(document.getElementById('root')).render(<App data={window.ATLAS}/>);
