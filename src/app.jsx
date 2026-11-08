import React, {useState, useEffect, useRef, useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {THEMES, Symbol, SymbolDialog, EditionBar, useEdition, VerseText, OnlinePassage, EditionSources, rangeIds, downloadJson, onlineUrl, getText} from './editions.jsx';
import {deckHtml, download, readNotebook, nbNow, safeName, APP_NAMES} from './notebook-kit.js';

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


// ---- the Greek underneath -------------------------------------------------
// One verse of the Greek, word by word: the word as it stands, how it sounds, what it
// is doing grammatically, and the dictionary word behind it. The English under each
// Greek word is a gloss, not a translation — a lexicon's choice of one English word for
// a Greek one, which is why it is set apart and labelled rather than run together into
// a sentence. The grammar is STEPBible's expansion of its own code; where they do not
// expand a code, the bare code is shown rather than a guess.
//
// Data is packed as pools of distinct strings plus one index per word, because 66,935
// words of the Gospels draw on only about 12,000 forms and under 3,000 lemmas.
const IL_AT = new Map();
function ilWords(ref){
  const I=window.INTERLINEAR;
  if(!I||!ref)return null;
  if(!IL_AT.size)I.verses.forEach((v,i)=>IL_AT.set(v,i));
  const vi=IL_AT.get(ref);
  if(vi===undefined)return null;
  const a=I.offsets[vi], b=vi+1<I.offsets.length?I.offsets[vi+1]:I.words;
  const out=[];
  for(let i=a;i<b;i++){
    const g=k=>I.pools[k][I.cols[k][i]];
    out.push({i,greek:g('greek'),translit:g('translit'),gloss:g('gloss'),strong:g('strong'),
              morph:g('morph'),lemma:g('lemma'),lgloss:g('lgloss'),ms:g('ms')});
  }
  return out;
}
// "NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz" means every edition carries it. Anything shorter
// means the editions differ there, which is a fact about the manuscripts and not a
// verdict on which reading is right.
const IL_ALL='NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz';
const ilVaries=w=>!!w.ms&&w.ms!==IL_ALL;

function Interlinear({refId,words,scale,onWord,shared,variants}){
  if(!words)return <p className="il-none">The editions this comes from do not number a verse here, so there is no Greek to show. {refId==='John.7.53'?'John 7:53 begins the passage about the woman taken in adultery, which these editions start at 8:1.':'The English and the Greek divide the verses differently at this point.'}</p>;
  return <>
    <ol className="il" style={{'--il':scale+'px'}}>{words.map(w=>{
      const same=shared&&shared.has(w.lemma);
      return <li key={w.i} className={(same?'agree ':'')+(variants&&ilVaries(w)?'varies':'')}>
        <button type="button" onClick={()=>onWord(w)}
          title={(window.INTERLINEAR.morph[w.morph]||w.morph||'')+(w.strong?' · '+w.strong:'')}>
          <span className="il-greek" lang="el">{w.greek}</span>
          <span className="il-translit">{w.translit}</span>
          <span className="il-gloss">{w.gloss}</span>
          <span className="il-morph">{w.morph}</span>
        </button>
      </li>;
    })}</ol>
    {variants&&words.some(ilVaries)&&<p className="il-variants">{words.filter(ilVaries).map(w=>
      <span key={w.i}><b lang="el">{w.greek}</b> in {w.ms.replace(/\+/g,', ')}</span>)}</p>}
  </>;
}

// ---- notebook ------------------------------------------------------------
// Two kinds of thing are worth keeping, and they are not the same. A bookmark keeps
// *where you were* - the story, the verse, the filter, the edition - so one click brings
// the whole arrangement back. A note keeps *what you found* - a story unit with the four
// maps as they stood, or a verse with its connections and the verse itself - so it can be
// carried out of here into a lesson. Notes, and the words typed under them, are what the
// slide deck is made of, and the deck builder is shared with the Cross-Reference Lab so
// one lesson can be built from notes kept in either.
//
// Everything lives in this browser and nowhere else. Browser storage is per-machine and
// is refused outright by some browsers reading a file from disk, so it is a convenience
// and the saved file is the real copy: every path here works with storage throwing.
const APP='gospel-atlas';
const NB_KEY='gospel-atlas-notebook';
const FILTER_WORDS={shared:'shared units',unique:'distinctive units',four:'units in all four'};

function Notebook({items,onChange,onRestore,onDeck,onSave,onLoad,onClose,note,describe,scale}){
  const notes=items.filter(x=>x.kind==='note').length,marks=items.length-notes;
  const move=(from,to)=>{const n=items.slice();n.splice(to,0,n.splice(from,1)[0]);onChange(n)};
  return <section className="notebook" id="notebook" aria-label="Notebook">
    <div className="nb-top">
      <div>
        <p className="eyebrow">NOTEBOOK</p>
        <h2>{items.length?`${notes} note${notes===1?'':'s'}, ${marks} bookmark${marks===1?'':'s'}`:'Nothing kept yet'}</h2>
        <p className="nb-sub">Keep a story or a verse with <b>+ Note</b>, or the whole arrangement with <b>+ Bookmark</b>. The slide deck is made of the notes and the words you type under them.</p>
      </div>
      <div className="nb-actions">
        <button onClick={onDeck}>Slide deck ↓</button>
        <button onClick={onSave}>Save file ↓</button>
        <label className="nb-file">Open file<input type="file" accept="application/json,.json" onChange={onLoad} hidden/></label>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
    <ol className="nb-list">{items.map((it,i)=>{
      const mine=!it.app||it.app===APP;
      const kindClass='nb-kind'+(it.kind==='bookmark'?' mark':'');
      return <li className="nb-item" key={it.id||i}>
        <div>{it.img?<img alt="" src={it.img}/>:<span className={'nb-thumb '+kindClass}>{it.kind==='bookmark'?'VIEW':'NOTE'}</span>}</div>
        <div>
          <p className={kindClass}>{(mine?'':(APP_NAMES[it.app]||it.app)+' · ')+(it.kind==='bookmark'?'BOOKMARK':(it.eyebrow||'NOTE'))+' · '+(it.when||'')}</p>
          <h3>{it.title}</h3>
          {(()=>{const meta=(it.kind==='note'&&it.sub?it.sub+' — ':'')+(it.atText||describe(it.at));
            return meta&&meta!==it.title?<p className="nb-meta">{meta}</p>:null})()}
          {it.quote&&<blockquote className="nb-quote" style={{fontSize:scale}}>{it.quote}<cite>{it.cite}</cite></blockquote>}
          <textarea value={it.body||''} aria-label={'Your words about '+it.title}
            placeholder="Your own words — this is what the slide will say."
            onChange={e=>onChange(items.map((x,k)=>k===i?{...x,body:e.target.value}:x))}/>
        </div>
        <div className="nb-ops">
          {mine?<button onClick={()=>onRestore(it.at)}>Open</button>:null}
          <button disabled={i===0} onClick={()=>move(i,i-1)}>Up</button>
          <button disabled={i===items.length-1} onClick={()=>move(i,i+1)}>Down</button>
          <button onClick={()=>onChange(items.filter((_,k)=>k!==i))}>Remove</button>
        </div>
      </li>;
    })}</ol>
    <p className="nb-foot">{note||(items.length
      ?'Kept in this browser only. Save the file to move these to another machine, or to keep them at all.'
      :'Nothing kept yet.')}</p>
  </section>;
}

function GospelCanvas({book,verses,stories,selected,selectedVerse,onSelect,hover,onHover,matching,focus,columns,palette,onSpans,alignment}) {
  const ref=useRef(null),frame=useRef(null),geometry=useRef([]),keyboard=useRef(0);
  const byStory=useMemo(()=>{const m=new Map();for(const v of verses){const a=m.get(v.stories[0]);a?a.push(v):m.set(v.stories[0],[v])}return m},[verses]);
  const [width,setWidth]=useState(260),[height,setHeight]=useState(400);
  useEffect(()=>{const ro=new ResizeObserver(e=>setWidth(e[0].contentRect.width));ro.observe(frame.current);return()=>ro.disconnect()},[]);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas || !width)return;
    const left=24,right=10,step=(width-left-right)/columns,size=Math.max(2,step-1.35),gap=5;
    let y=14;
    const boxes=[],labels=[];
    if(alignment){
      // Every Gospel uses the same bands, so parallels sit on one row and the
      // absences show as the empty space they are.
      for(const band of alignment){
        const vs=byStory.get(band.id)||[];
        vs.forEach((v,i)=>boxes.push({x:left+(i%columns)*step,y:14+(band.startRow+Math.floor(i/columns))*step,w:size,h:size,v}));
        if(band.label)labels.push({text:band.label,y:14+band.startRow*step+size/2});
      }
      y=14+alignment.total*step+10;
    }else{
      const chapters=[...new Set(verses.map(v=>v.chapter))];
      for(const chapter of chapters){
        const vs=verses.filter(v=>v.chapter===chapter);
        labels.push({text:chapter,y:y+size/2});
        vs.forEach((v,i)=>boxes.push({x:left+(i%columns)*step,y:y+Math.floor(i/columns)*step,w:size,h:size,v}));
        y+=Math.ceil(vs.length/columns)*step+gap;
      }
    }
    const h=Math.ceil(alignment?y:y+8);setHeight(h);geometry.current=boxes;
    // Where each story unit sits down this map, for the ribbons between the Gospels.
    if(onSpans){
      const spans=new Map();
      for(const box of boxes){
        const id=box.v.stories[0],had=spans.get(id);
        if(had){had[0]=Math.min(had[0],box.y);had[1]=Math.max(had[1],box.y+box.h)}
        else spans.set(id,[box.y,box.y+box.h]);
      }
      onSpans(book,spans,canvas);
    }
    const dpr=window.devicePixelRatio||1;canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(h*dpr);
    const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,h);
    ctx.font='9px system-ui';ctx.textBaseline='middle';ctx.fillStyle='#8b8e88';
    labels.forEach(l=>ctx.fillText(alignment?String(l.text):String(l.text).padStart(2,'0'),2,l.y));
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
  },[width,verses,stories,selected,selectedVerse,hover,matching,focus,columns,book,palette,onSpans,alignment,byStory]);
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
  const [ribbons,setRibbons]=useState(false);
  const [aligned,setAligned]=useState(false);
  const spans=useRef({}),ribbonCanvas=useRef(null),gridWrap=useRef(null);
  const [spanTick,setSpanTick]=useState(0);
  const noteSpans=useMemo(()=>(book,map,el)=>{spans.current[book]={map,el};setSpanTick(t=>t+1)},[]);
  // Synopsis order: one band per story unit, tall enough for whichever Gospel tells it
  // at greatest length, so the four maps read across as well as down.
  const alignment=useMemo(()=>{
    if(!aligned)return null;
    const bands=[];let row=0;
    data.stories.forEach((story,i)=>{
      const longest=Math.max(1,...BOOKS.map(b=>Math.ceil((story.sources[b]||[]).reduce((n,r)=>n+r.verses.length,0)/columns)));
      bands.push({id:story.id,startRow:row,rows:longest,label:i%20===0?String(story.id).padStart(3,'0'):''});
      row+=longest+0.4;
    });
    bands.total=row;
    return bands;
  },[aligned,data.stories,columns]);
  const [palette,setPalette]=useState(()=>{try{return localStorage.getItem('gospel-atlas-palette')==='accessible'?'accessible':'standard'}catch{return 'standard'}});
  Object.assign(COLORS,PALETTES[palette]);
  const [crossrefs,setCrossrefs]=useState(null),[crossError,setCrossError]=useState(''),[crossScope,setCrossScope]=useState('all'),[crossLimit,setCrossLimit]=useState(12);
  const [expanded,setExpanded]=useState(null),[bible,setBible]=useState(null),[bibleError,setBibleError]=useState(''),[bibleLoading,setBibleLoading]=useState(false);
  const [shareMessage,setShareMessage]=useState('');
  const [kept,setKept]=useState(()=>{try{const r=localStorage.getItem(NB_KEY);const a=r?JSON.parse(r):null;return Array.isArray(a)?a:[]}catch{return []}});
  const [nbOpen,setNbOpen]=useState(false),[nbNote,setNbNote]=useState('');
  const [pngMsg,setPngMsg]=useState('');
  const [greek,setGreek]=useState(false),[variants,setVariants]=useState(false);
  const [wordQuery,setWordQuery]=useState(''),[word,setWord]=useState(null);
  const dialog=useRef(null),reader=useRef(null),connectionSection=useRef(null),storyList=useRef(null),notebook=useRef(null);
  const s=stories[selected];
  const storyVerses=BOOKS.flatMap(b=>(s.sources[b]||[]).flatMap(r=>r.verses));
  const currentVerse=selectedVerse&&storyVerses.includes(selectedVerse)?selectedVerse:storyVerses[0];
  // Which lemmas of the verse in hand also appear in the same story as another Gospel
  // tells it. This is the synoptic question made countable: not whether two accounts
  // "agree", but which words are literally the same word.
  const ilHere=useMemo(()=>greek?ilWords(currentVerse):null,[greek,currentVerse]);
  const sharedLemmas=useMemo(()=>{
    if(!ilHere)return null;
    const mine=new Set(ilHere.map(w=>w.lemma)), book=currentVerse.split('.')[0], out=new Set();
    for(const b of BOOKS){
      if(b===book||!s.sources[b])continue;
      for(const r of s.sources[b])for(const vid of r.verses){
        const w=ilWords(vid); if(!w)continue;
        for(const x of w)if(mine.has(x.lemma))out.add(x.lemma);
      }
    }
    return out;
  },[ilHere,currentVerse,s]);
  // lemma -> the Gospel verses it stands in. Built once, on the first search.
  const gospelIndex=useMemo(()=>{
    if(!wordQuery.trim()&&!word)return null;
    const I=window.INTERLINEAR; if(!I)return null;
    const byLemma=new Map(), firstAt=new Map();
    let v=0;
    for(let i=0;i<I.words;i++){
      while(v+1<I.offsets.length&&i>=I.offsets[v+1])v++;
      const key=I.cols.lemma[i];
      let a=byLemma.get(key);
      if(!a){byLemma.set(key,a=[]);firstAt.set(key,i)}
      const ref=I.verses[v];
      if(a[a.length-1]!==ref)a.push(ref);
    }
    return {byLemma,firstAt};
  },[wordQuery,word]);
  // A search matches the Greek itself, the way it sounds, or the dictionary gloss.
  // Nothing is ranked by importance; results are in canonical order.
  const wordMatches=useMemo(()=>{
    const q=wordQuery.trim().toLowerCase();
    if(q.length<2||!gospelIndex)return null;
    const I=window.INTERLINEAR, hits=[];
    const strongWanted=/^[gG]?0*(\d{1,4})$/.exec(q);
    for(let li=0;li<I.pools.lemma.length;li++){
      const lemma=I.pools.lemma[li]; if(!lemma)continue;
      const refs=gospelIndex.byLemma.get(li); if(!refs||!refs.length)continue;
      // the lemma's gloss and Strong number come from the first word that uses it
      const sample=gospelIndex.firstAt.get(li);
      const lgloss=I.pools.lgloss[I.cols.lgloss[sample]]||'';
      const strong=I.pools.strong[I.cols.strong[sample]]||'';
      const translit=I.pools.translit[I.cols.translit[sample]]||'';
      const hay=(lemma+' '+lgloss+' '+translit).toLowerCase();
      const ok=strongWanted?strong.replace(/^G0*/,'')===strongWanted[1].replace(/^0+/,'')
                           :hay.includes(q);
      if(ok)hits.push({lemma,lgloss,strong,translit,refs});
    }
    hits.sort((a,b)=>b.refs.length-a.refs.length);
    return hits.slice(0,40);
  },[wordQuery,gospelIndex]);
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
  useEffect(()=>{if(!nbNote)return;const t=setTimeout(()=>setNbNote(''),5000);return()=>clearTimeout(t)},[nbNote]);
  useEffect(()=>{if(!pngMsg)return;const t=setTimeout(()=>setPngMsg(''),1800);return()=>clearTimeout(t)},[pngMsg]);
  // Bands joining the same story unit across the four maps. Drawn behind the cards,
  // so only the gutters show them: a horizontal band means both Gospels put the unit
  // in the same place, a steep one means they do not.
  useEffect(()=>{
    const canvas=ribbonCanvas.current,wrap=gridWrap.current;
    if(!canvas||!wrap)return;
    const box=wrap.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    canvas.width=Math.ceil(box.width*dpr);canvas.height=Math.ceil(box.height*dpr);
    canvas.style.width=box.width+'px';canvas.style.height=box.height+'px';
    const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
    c.clearRect(0,0,box.width,box.height);
    if(!ribbons||aligned)return;
    const place={};
    for(const b of BOOKS){
      const entry=spans.current[b];
      if(!entry||!entry.el)return;
      const r=entry.el.getBoundingClientRect();
      place[b]={map:entry.map,left:r.left-box.left,right:r.right-box.left,top:r.top-box.top};
    }
    const band=(story,alpha,colour)=>{
      for(let i=0;i<BOOKS.length-1;i++){
        const A=place[BOOKS[i]],B=place[BOOKS[i+1]];
        const a=A.map.get(story.id),z=B.map.get(story.id);
        if(!a||!z)continue;
        const x1=A.right,x2=B.left,mx=(x1+x2)/2;
        const y1=A.top+a[0],y2=A.top+a[1],y3=B.top+z[1],y4=B.top+z[0];
        c.globalAlpha=alpha;c.fillStyle=colour;
        c.beginPath();
        c.moveTo(x1,y1);c.bezierCurveTo(mx,y1,mx,y4,x2,y4);
        c.lineTo(x2,y3);c.bezierCurveTo(mx,y3,mx,y2,x1,y2);
        c.closePath();c.fill();
      }
    };
    for(const story of data.stories)if(story.count>1&&matching.has(story.id))band(story,.09,COLORS.shared);
    const chosen=stories[selected];
    if(chosen&&chosen.count>1)band(chosen,.8,COLORS.shared);
    c.globalAlpha=1;
  },[ribbons,aligned,spanTick,selected,columns,palette,matching,data.stories,stories]);
  useEffect(()=>{if(!ribbons)return;const f=()=>setSpanTick(t=>t+1);addEventListener('resize',f);return()=>removeEventListener('resize',f)},[ribbons]);

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
  // ---- notebook ----------------------------------------------------------
  // Storage is attempted and its refusal ignored: the notebook is held in React state,
  // so it keeps working for this session either way, and the saved file is the real copy.
  const keep=next=>{setKept(next);try{localStorage.setItem(NB_KEY,JSON.stringify(next))}catch{}};
  const flash=msg=>{setNbNote(msg);setNbOpen(true)};
  const openNotebook=()=>{setNbOpen(true);setTimeout(()=>notebook.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),0)};
  // Everything needed to put the page back as it was. The edition is held by id, so a
  // view kept under an imported translation can say so rather than silently reading
  // something else.
  const viewState=()=>({app:APP,story:selected,verse:currentVerse,filter,query:query.trim(),
    compare:{a:compare.a,b:compare.b},columns,aligned,ribbons,focus,palette,crossScope,edition:editionState.id});
  function describeState(v){
    if(!v)return '';
    const bits=[v.aligned?'Synopsis order':'Four maps'];
    if(v.ribbons&&!v.aligned)bits.push('order bands');
    if(v.focus)bits.push('selected story only');
    if(v.filter&&v.filter!=='all')bits.push(FILTER_WORDS[v.filter]||((NAMES[v.filter]||v.filter)+' only'));
    if(v.compare&&v.compare.a&&v.compare.b&&v.compare.a!==v.compare.b)bits.push('in '+NAMES[v.compare.a]+' but not '+NAMES[v.compare.b]);
    if(v.query)bits.push('searching “'+v.query+'”');
    if(v.verse)bits.push('holding '+refLabel(v.verse));
    if(v.crossScope==='gospels')bits.push('links within the Gospels');
    if(v.crossScope==='other')bits.push('links outside the Gospels');
    const e=editionState.all.find(x=>x.id===v.edition);
    if(e)bits.push(e.short);
    return bits.join(' · ');
  }
  // The four maps drawn into one picture, each under its own name, because the four
  // together are the thing worth looking at and a single column means nothing on its own.
  // The canvases are the ones the cards already drew; nothing is redrawn.
  function composeMaps(maxW){
    const got=BOOKS.map(b=>[b,spans.current[b]&&spans.current[b].el]).filter(([,c])=>c&&c.width&&c.height);
    if(!got.length)return null;
    const pad=12,head=16,gap=8;
    const raw=got.reduce((n,[,c])=>n+c.width,0)+gap*(got.length-1);
    const k=Math.max(.05,Math.min(1,((maxW||1100)-pad*2)/raw));
    const o=document.createElement('canvas');
    o.width=Math.round(raw*k)+pad*2;
    o.height=Math.round(Math.max(...got.map(([,c])=>c.height))*k)+head+pad*2;
    const x=o.getContext('2d');
    x.fillStyle='#f7f6f1';x.fillRect(0,0,o.width,o.height);
    x.font='700 11px Inter,ui-sans-serif,system-ui,sans-serif';x.textBaseline='top';
    let left=pad;
    for(const [b,c] of got){
      const w=Math.round(c.width*k);
      x.fillStyle=COLORS[b];x.fillRect(left,pad+4,16,3);
      x.fillStyle='#55605a';x.fillText(NAMES[b],left+21,pad);
      x.drawImage(c,left,pad+head,w,Math.round(c.height*k));
      left+=w+gap;
    }
    return o;
  }
  // Full size is well over a megabyte, which a deck of twenty would not survive, so the
  // copy kept in a note is scaled down on the way in.
  const snapshot=maxW=>{const c=composeMaps(maxW);if(!c)return null;try{return c.toDataURL('image/jpeg',.85)}catch{return null}};
  const nbItem=rest=>{const v=viewState();return {id:Date.now()+''+kept.length,app:APP,at:v,atText:describeState(v),when:nbNow(),body:'',...rest}};
  function addStoryNote(){
    const where=BOOKS.filter(b=>s.sources[b]).flatMap(b=>s.sources[b].map(r=>refLabel(r.ref))).join(' · ');
    keep([...kept,nbItem({kind:'note',
      eyebrow:'STORY UNIT '+String(s.id).padStart(3,'0'),title:s.title,
      sub:(s.count===1?'Told only by '+NAMES[Object.keys(s.sources)[0]]+' in this index'
                      :'Told in '+s.count+' Gospels in this index')+(where?' · '+where:''),
      img:snapshot(1100)})]);
    flash('Note kept — this unit, its references, and the four maps as they stand.');
  }
  function addVerseNote(){
    const id=currentVerse;
    if(!id)return;
    const own=ed.offline?getText(ed,id):null;
    const scope=crossScope==='gospels'?' within the four Gospels':crossScope==='other'?' outside the Gospels':'';
    keep([...kept,nbItem({kind:'note',eyebrow:'CROSS-REFERENCES',title:refLabel(id),
      sub:refs.length+' connection'+(refs.length===1?'':'s')+scope
         +(refs.length?' · '+refs.slice(0,6).map(r=>refLabel(r[0])).join(', ')+(refs.length>6?' …':''):''),
      quote:(own||window.BASELINE[id]||'').trim(),
      cite:refLabel(id)+' · '+(own?ed.short:'ASV 1901')})]);
    flash('Note kept — '+refLabel(id)+', its text, and its connections.');
  }
  function addMark(){
    const v=viewState();
    keep([...kept,nbItem({kind:'bookmark',title:describeState(v)})]);
    flash('Bookmark kept — Open brings this arrangement back.');
  }
  function restore(v){
    if(!v)return;
    setFilter(v.filter||'all');setQuery(v.query||'');
    setCompare({a:(v.compare&&v.compare.a)||'',b:(v.compare&&v.compare.b)||''});
    setColumns(v.columns||40);setAligned(!!v.aligned);setRibbons(!!v.ribbons);setFocus(!!v.focus);
    setCrossScope(v.crossScope||'all');
    const want=v.palette==='accessible'?'accessible':'standard';
    if(want!==palette){setPalette(want);try{localStorage.setItem('gospel-atlas-palette',want)}catch{}}
    if(v.edition&&v.edition!==editionState.id){
      if(editionState.all.some(e=>e.id===v.edition))editionState.setId(v.edition);
      else setNbNote('That view was kept in an edition this file no longer holds, so the text stays as it is. Everything else is back.');
    }
    if(stories[v.story]){setSelected(v.story);setSelectedVerse(v.verse&&verseById[v.verse]?v.verse:null)}
    setHover(null);
    document.getElementById('atlas')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  // Encoding four full-resolution maps takes a second or two, and a button that does
  // nothing visible for two seconds reads as a button that does not work.
  // A verse found by searching is a verse in a story, so going to it means selecting
  // that story as well, or the parallel columns would still be showing something else.
  function jumpTo(ref){
    const v=verseById[ref];
    if(!v){setNbNote('That verse is not in this index.');return}
    const story=(v.stories||[])[0];
    if(story!==undefined&&stories[story])setSelected(story);
    setSelectedVerse(ref);
    connectionSection.current?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function savePng(){
    const c=composeMaps(Infinity);
    if(!c){flash('The maps are not drawn yet — give the page a moment.');return}
    setPngMsg('Saving…');
    try{c.toBlob(b=>{
      if(!b)return setPngMsg('Not saved');
      download(safeName(describeState(viewState())).replace(/ /g,'_')+'.png',b);setPngMsg('Saved');
    },'image/png')}catch{setPngMsg('Not saved')}
  }
  function deck(){
    const items=kept.filter(x=>x.kind==='note'||x.body);
    if(!items.length){flash('Add a note or two first — the deck is made of them.');return}
    const title='Gospel Atlas notes '+new Date().toISOString().slice(0,10);
    download(safeName(title).replace(/ /g,'_')+'.html',new Blob([deckHtml(items,title)],{type:'text/html'}));
    flash('Deck saved — '+items.length+' slide'+(items.length===1?'':'s')+'. Open it in any browser; print it for a PDF.');
  }
  const saveNotebook=()=>download('gospel-atlas-notebook-'+new Date().toISOString().slice(0,10)+'.json',
    new Blob([JSON.stringify({app:APP,version:1,saved:nbNow(),items:kept},null,1)],{type:'application/json'}));
  function loadNotebook(e){
    const f=e.target.files&&e.target.files[0];
    if(!f)return;
    const r=new FileReader();
    r.onload=()=>{try{
      const got=readNotebook(r.result,APP);
      keep([...kept,...got]);
      flash('Added '+got.length+' from the file.');
    }catch{flash('That file could not be read as a notebook.')}};
    r.readAsText(f);e.target.value='';
  }

  async function share(){const text=s.title+'\n'+Object.values(s.sources).flat().map(r=>refLabel(r.ref)).join(' · ')+'\n'+ed.name+(location.protocol==='file:'?'':'\n'+location.href);try{await navigator.clipboard.writeText(text);setShareMessage('References copied')}catch{window.prompt('Copy these references:',text)}}

  return <>
    <header className="site-header"><a className="brand" href="#top" aria-label="Gospel Atlas home"><span className="brand-mark">{BOOKS.map(b=><i key={b} style={{background:COLORS[b]}}/>)}</span>Gospel Atlas</a><nav><a href="#atlas">Explore</a><button onClick={openNotebook} aria-expanded={nbOpen}>Notebook <span className="nb-pill">{kept.length}</span></button><button onClick={()=>dialog.current.showModal()}>How to read & sources</button></nav><span className="edition">STANDALONE EDITION · DAVID LEE</span></header>
    <main id="top">
      <section className="hero"><div><div className="eyebrow">MATTHEW · MARK · LUKE · JOHN</div><h1>Four Gospels, <em>in pixels.</em></h1><p>Read the accounts side by side.<br className="mobile-break"/> Follow their shared and distinctive passages.</p></div><div className="hero-stats"><div><strong>{fmt(meta.verseCount)}</strong><span>VERSE PIXELS</span></div><div><strong>{meta.storyCount}</strong><span>STORY UNITS</span></div><div><strong>{fmt(meta.crossReferenceCount)}</strong><span>SOURCE CROSS-REFERENCES</span></div></div></section>
      <EditionBar state={editionState}/><section className="atlas-section" id="atlas" aria-label="Gospel pixel maps">
        <div className="section-heading"><div><span className="section-number">01</span><h2>The four accounts</h2></div><p>One square = one verse · Chapters read top to bottom</p></div>
        <div className="controls"><label className="search-label">{icon('search')}<input type="search" aria-label="Find a story, a reference or words in the text" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a story, a reference, or words…"/>{query&&<button className="clear-search" aria-label="Clear search" onClick={()=>setQuery('')}>×</button>}</label><div className="filter-tabs" aria-label="Filter stories">{[['all','All material'],['shared','Shared'],['unique','Distinctive'],['four','In all four']].map(([value,label])=><button key={value} className={filter===value?'active':''} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><label className="density">Pixels <select value={columns} onChange={e=>setColumns(Number(e.target.value))} aria-label="Pixel density"><option value={52}>Small</option><option value={40}>Medium</option><option value={28}>Large</option></select></label></div>
        <div className="compare-row"><span className="compare-label">COMPARE</span><label>Told in <select value={compare.a} aria-label="Gospel that records the story" onChange={e=>setCompare({a:e.target.value,b:compare.b===e.target.value?'':compare.b})}><option value="">—</option>{BOOKS.map(b=><option key={b} value={b}>{NAMES[b]}</option>)}</select></label><label>but not in <select value={compare.b} aria-label="Gospel that does not record the story" onChange={e=>setCompare({a:compare.a===e.target.value?'':compare.a,b:e.target.value})}><option value="">—</option>{BOOKS.map(b=><option key={b} value={b}>{NAMES[b]}</option>)}</select></label>{comparing?<><strong>{visibleStories.length} {visibleStories.length===1?'unit':'units'}</strong><button className="compare-clear" onClick={()=>setCompare({a:'',b:''})}>Clear</button></>:<span className="compare-hint">Choose both to see what one Gospel records and another does not.</span>}</div>
        {query.trim()&&<p className="search-note">{searchesText?`Searching story titles, references and the Gospel text of ${searchEdition?searchEdition.short:'the ASV 1901, because the selected edition is read online'}.`:`Searching story titles and references. Type ${MIN_TEXT_QUERY} letters or more to search the Scripture text as well.`}</p>}
        <div className="legend"><button onClick={()=>setFilter('shared')} className={filter==='shared'?'legend-active':''}><i style={{background:COLORS.shared}}/>Shared by 2–4 Gospels</button><span className="legend-divider"/>{BOOKS.map(b=><button key={b} className={filter===b?'legend-active':''} onClick={()=>setFilter(filter===b?'all':b)}><i style={{background:COLORS[b]}}/>{NAMES[b]} only</button>)}<button className="palette-toggle" aria-pressed={palette==='accessible'} onClick={()=>{const next=palette==='standard'?'accessible':'standard';setPalette(next);try{localStorage.setItem('gospel-atlas-palette',next)}catch{}}}>{palette==='accessible'?'Standard colours':'Colour-blind palette'}</button><span className="legend-note">Story-level classification</span></div>
        <div className="keepbar"><button className="keep" onClick={addMark} title="Keep this arrangement so you can come straight back to it">+ Bookmark this view</button><button className="keep" onClick={savePng} disabled={pngMsg==='Saving…'} title="Save the four maps as they stand">{pngMsg||'Save maps as image'}</button><span className="keep-note">{describeState(viewState())}</span></div>
        <p className="swipe-hint">Swipe sideways to move between the four Gospels.</p>
        <div className={'grid-wrap'+(ribbons&&!aligned?' with-ribbons':'')+(aligned?' aligned':'')} ref={gridWrap}>
        <canvas className="ribbon-layer" ref={ribbonCanvas} aria-hidden="true"/>
        <div className="gospel-grid">{BOOKS.map((b,i)=>{
          const exclusive=verses[b].filter(v=>stories[v.stories[0]]?.count===1).length;
          const match=verses[b].filter(v=>matching.has(v.stories[0])).length;
          const ranges=s.sources[b];
          return <article className="gospel-card" key={b} style={{'--book':COLORS[b]}}><div className="gospel-card-heading"><div><button className="symbol-button" onClick={()=>setSymbolBook(b)} aria-label={`${NAMES[b]}: ${THEMES[b].title}. Open Scripture passages`} title={`${THEMES[b].title} · Read passages`}><Symbol book={b}/></button><div className="gospel-heading-text"><h3>{NAMES[b]}</h3><button className="theme-label" onClick={()=>setSymbolBook(b)}>{THEMES[b].title} ↗</button></div></div><span>{fmt(verses[b].length)} verses</span></div><div className="book-summary"><div className="proportion"><i style={{width:`${100*exclusive/verses[b].length}%`,background:COLORS[b]}}/><i style={{flex:1,background:COLORS.shared}}/></div><span>{Math.round(100*exclusive/verses[b].length)}% in distinctive units</span></div><GospelCanvas book={b} verses={verses[b]} stories={stories} selected={selected} selectedVerse={currentVerse} onSelect={select} hover={hover} onHover={setHover} matching={matching} focus={focus} columns={columns} palette={palette} onSpans={noteSpans} alignment={alignment}/><div className="card-footer"><span className={ranges?'has-passage':''}>{ranges?ranges.map(r=>refLabel(r.ref).replace(NAMES[b]+' ','')).join(', '):'No parallel in this unit'}</span><span>{filter!=='all'||q?`${fmt(match)} visible`:`${Object.keys(s.sources).includes(b)?'Selected passage':'—'}`}</span></div></article>
        })}</div></div>
        <div className="atlas-bottom"><p><span className="cursor-mark">↗</span> {aligned?'Synopsis order: every row is one story unit, so parallels sit level and a Gospel\u2019s silences are the blank space beside them. Numbers down the left are unit numbers.':ribbons?'Each band joins one story unit across the Gospels. Level bands mean the same position; steep ones mean the accounts place it differently.':'Select a square to connect the same story across the four accounts.'}</p><label><input type="checkbox" checked={aligned} onChange={e=>setAligned(e.target.checked)}/> Align parallels</label><label><input type="checkbox" checked={ribbons} onChange={e=>setRibbons(e.target.checked)}/> Show order</label><label><input type="checkbox" checked={focus} onChange={e=>setFocus(e.target.checked)}/> Focus selected story</label></div>
        <div className="try-row"><span>EXPLORE A STORY</span>{[122,37,data.stories.find(s=>s.title.toLowerCase().includes('good samaritan'))?.id,1].filter(Boolean).map((id,i)=><button key={id} onClick={()=>jump(id)}>{['Feeding the five thousand','Woman at the well','The Good Samaritan','The Word'][i]} <span>↗</span></button>)}</div>
      </section>
      <section className="story-section" ref={reader} id="reader"><aside className="story-browser"><div className="browser-top"><h2>Story index</h2><span>{visibleStories.length} / {meta.storyCount}</span></div><p className="small">Browse the index or search above.</p><div className="story-list" ref={storyList} role="group" aria-label="Gospel story index">{visibleStories.length?visibleStories.map(story=>{const hit=query.trim()?matchingVerse(story):null;return <button key={story.id} className={story.id===selected?'story-option selected':'story-option'} aria-current={story.id===selected?'true':undefined} onClick={()=>select(story.id,hit)}><span className="story-id">{String(story.id).padStart(3,'0')}</span><span className="story-option-body"><span>{story.title}</span><Mask story={story}/>{hit&&<span className="story-match">{refLabel(hit)}</span>}</span></button>}):<div className="empty-state">{comparing?`No unit is told in ${NAMES[compare.a]} but not in ${NAMES[compare.b]} under the current filter.`:'No stories match this search.'}<button onClick={()=>{setQuery('');setFilter('all');setCompare({a:'',b:''})}}>Clear filters</button></div>}</div></aside>
      <div className="story-detail"><div className="detail-top"><div className="eyebrow">SELECTED STORY · {String(s.id).padStart(3,'0')}</div><div className="story-arrows"><button aria-label="Previous story" disabled={selectedIndex===0} onClick={()=>select(data.stories[selectedIndex-1].id)}>←</button><button aria-label="Next story" disabled={selectedIndex===data.stories.length-1} onClick={()=>select(data.stories[selectedIndex+1].id)}>→</button></div></div><h2>{s.title}</h2><div className="detail-summary"><Mask story={s}/><span>{s.count===1?`Distinctive to ${NAMES[Object.keys(s.sources)[0]]} in this index`:`Recorded in ${s.count} Gospels in this index`}</span><button className="keep" onClick={addStoryNote} title="Keep this story unit, its references and the maps as they stand">+ Note</button><button className="text-button" onClick={share}>{shareMessage||'Copy references ↗'}</button></div>{!matching.has(selected)&&<div className="filter-notice">This selected story is outside the current filter. <button onClick={()=>{setFilter('all');setQuery('');setCompare({a:'',b:''})}}>Show all material</button></div>}
        <div className="reader-bar"><span>PARALLEL PASSAGES</span><span>{ed.short} · Tap a verse number for its connections</span></div><p className="swipe-hint">Swipe sideways to read the accounts alongside each other.</p><div className="passage-grid">{BOOKS.map(b=><article key={b} className={`passage-card ${s.sources[b]?'':'absent'}`} style={{'--book':COLORS[b]}}><header><h3>{NAMES[b]}</h3><span>{s.sources[b]?.map(r=>refLabel(r.ref).replace(NAMES[b]+' ','')).join(', ')||'—'}</span></header><div className="passage-text" lang={ed.lang} dir={ed.dir} style={{fontSize:editionState.scale}}>{s.sources[b]?(ed.offline?s.sources[b].flatMap(r=>r.verses).map(vid=>{const v=verseById[vid];return <p className={vid===currentVerse?'active-verse':''} key={vid}><button title={`Show connections for ${refLabel(vid)}`} aria-label={`Select ${refLabel(vid)} for cross-references`} onClick={()=>setSelectedVerse(vid)}>{v.chapter}:{v.verse}</button><VerseText ed={ed} id={vid}/></p>}):s.sources[b].map(r=><OnlinePassage key={r.ref} ed={ed} refId={r.ref}/>)):<div className="absent-message"><span>—</span><p>No passage assigned<br/>to this story unit.</p></div>}</div></article>)}</div><p className="reader-note">Shared episodes can differ in wording, detail and order. Gold indicates an indexed parallel, not identical information.</p>
      </div></section>
      <section className="connections-section" ref={connectionSection} id="connections"><div className="section-heading"><div><span className="section-number">02</span><h2>Follow the connections</h2></div><span className="source-tag">OPENBIBLE.INFO</span></div><div className="connection-intro"><p>Explore related themes, people and passages beyond the story itself.</p><div className="connection-controls"><label>From <select aria-label="Cross-reference source verse" value={currentVerse} onChange={e=>setSelectedVerse(e.target.value)}>{storyVerses.map(v=><option key={v} value={v}>{refLabel(v)}</option>)}</select></label><label>To <select value={crossScope} onChange={e=>setCrossScope(e.target.value)} aria-label="Cross-reference scope"><option value="all">All Scripture</option><option value="gospels">Four Gospels</option><option value="other">Rest of Scripture</option></select></label><button className="keep" onClick={addVerseNote} title="Keep this verse, its text and its connections">+ Note</button></div></div><div className="selected-verse-quote"><span>{refLabel(currentVerse)}</span><div className="selected-text" lang={ed.lang} dir={ed.dir}><span className="translation-label">{ed.short}</span>{ed.offline?<p style={{fontSize:editionState.scale}}><VerseText ed={ed} id={currentVerse}/></p>:<OnlinePassage ed={ed} refId={currentVerse}/>}</div><strong>{crossrefs?`${refs.length} connections`:'Loading connections…'}</strong></div>
        <div className="il-bar">
          <label><input type="checkbox" checked={greek} onChange={e=>setGreek(e.target.checked)}/> Greek, word by word</label>
          {greek&&<label><input type="checkbox" checked={variants} onChange={e=>setVariants(e.target.checked)}/> Mark words the editions differ over</label>}
          {greek&&sharedLemmas&&sharedLemmas.size>0&&<span className="il-agree-key">{sharedLemmas.size} word{sharedLemmas.size===1?'':'s'} also in another Gospel&rsquo;s telling of this story</span>}
        </div>
        {greek&&<div className="il-panel">
          <Interlinear refId={currentVerse} words={ilHere} scale={editionState.scale}
            shared={sharedLemmas} variants={variants} onWord={w=>{setWord(w);setWordQuery('')}}/>
          <p className="il-note">Greek: STEPBible / Tyndale House, Cambridge (CC BY 4.0). The small English word under each Greek word is a lexicon&rsquo;s gloss, not a translation — one English word stood in for one Greek one, outside the sentence it belongs to.</p>
        </div>}
        <div className="wordsearch">
          <label className="ws-label">Find a Greek word
            <input type="search" value={wordQuery} placeholder="love, agapē, ἀγάπη, or G26"
              onChange={e=>{setWordQuery(e.target.value);setWord(null)}}/>
          </label>
          {word&&<div className="ws-one">
            <p className="ws-head"><b lang="el">{word.lemma}</b> <span>{word.translit}</span> <span className="ws-strong">{word.strong}</span></p>
            <p className="ws-gloss">{word.lgloss}</p>
            <p className="ws-morph">{(window.INTERLINEAR.morph[word.morph]||word.morph)||''}</p>
            {(()=>{const refs=gospelIndex&&gospelIndex.byLemma.get(window.INTERLINEAR.pools.lemma.indexOf(word.lemma));
              return refs?<p className="ws-count">{refs.length} verse{refs.length===1?'':'s'} in the four Gospels: {refs.slice(0,24).map((r,i)=>
                <button key={r} onClick={()=>jumpTo(r)}>{refLabel(r)}</button>)}{refs.length>24?<span> and {refs.length-24} more</span>:null}</p>:null})()}
            <button className="ws-clear" onClick={()=>setWord(null)}>Close</button>
          </div>}
          {wordMatches&&<ul className="ws-list">{wordMatches.length?wordMatches.map(h=>
            <li key={h.strong+h.lemma}>
              <b lang="el">{h.lemma}</b> <span className="ws-tr">{h.translit}</span>
              <span className="ws-gl">{h.lgloss}</span>
              <span className="ws-strong">{h.strong}</span>
              <span className="ws-n">{h.refs.length} verse{h.refs.length===1?'':'s'}</span>
              <span className="ws-refs">{h.refs.slice(0,12).map(r=>
                <button key={r} onClick={()=>jumpTo(r)}>{refLabel(r)}</button>)}{h.refs.length>12?<em> +{h.refs.length-12}</em>:null}</span>
            </li>):<li className="ws-none">Nothing in the Gospels matches that. Try the English gloss, the transliteration, the Greek itself, or a Strong number.</li>}</ul>}
        </div>
      {crossError?<div className="empty-state">{crossError} <button onClick={loadCrossrefs}>Retry</button></div>:crossrefs?<><div className="reference-grid">{refs.slice(0,crossLimit).map(([r,votes])=><div key={r} className={'reference-card '+(expanded===r?'expanded':'')}><button className="reference-trigger" onClick={()=>expandRef(r)} aria-expanded={expanded===r}><span className="reference-dot" style={{background:COLORS[bookOf(r)]||'#a5aaa1'}}/><span>{refLabel(r)}</span><span className="ref-votes" title="OpenBible community votes, not a similarity percentage">{votes} votes</span><span>{expanded===r?'−':'+'}</span></button>{expanded===r&&<div className="reference-preview">{!ed.offline?<OnlinePassage ed={ed} refId={r}/>:BOOKS.includes(bookOf(r))||ed.id==='asv'||rangeIds(r).some(id=>ed.verses?.[id])?<div lang={ed.lang} dir={ed.dir}><span className="translation-label">{ed.short}</span>{rangeIds(r).map(id=><p key={id} style={{fontSize:editionState.scale}}><sup>{id.split('.').slice(1).join(':')}</sup> <VerseText ed={ed} id={id}/></p>)}</div>:<div><span className="translation-label">ASV 1901 · English · This book is not included in {ed.short}</span>{rangeIds(r).map(id=><p key={id} style={{fontSize:editionState.scale}}><sup>{id.split('.').slice(1).join(':')}</sup> {window.BASELINE[id]}</p>)}</div>}<div className="reference-actions">{verseById[r.split('-')[0]]&&<button onClick={()=>{jump(verseById[r.split('-')[0]].stories[0]);setSelectedVerse(r.split('-')[0]);reader.current.scrollIntoView({behavior:'smooth'})}}>Locate in Gospel map ↗</button>}{onlineUrl(ed,r)&&<a target="_blank" rel="noreferrer" href={onlineUrl(ed,r)}>Open {ed.short} online ↗</a>}</div></div>}</div>)}</div>{!refs.length&&<p className="empty-state">No outgoing references for this verse in the selected scope. This does not establish that it is unique.</p>}{refs.length>crossLimit&&<button className="load-more" onClick={()=>setCrossLimit(crossLimit+24)}>Show more connections ({refs.length-crossLimit} remaining) ↓</button>}</>:<div className="loading-inline">Loading cross-reference data…</div>}
      <p className="connection-note">{fmt(meta.gospelCrossReferenceCount)} outgoing Gospel links from {fmt(meta.crossReferenceCount)} source records. Ranked by source votes; these links do not determine the map colours.</p></section>
      {nbOpen&&<div ref={notebook}><Notebook items={kept} onChange={keep} onRestore={restore} onDeck={deck} onSave={saveNotebook} onLoad={loadNotebook} onClose={()=>setNbOpen(false)} note={nbNote} describe={describeState} scale={editionState.scale}/></div>}
      <footer><div className="brand"><span className="brand-mark small-mark">{BOOKS.map(b=><i key={b} style={{background:COLORS[b]}}/>)}</span>Gospel Atlas</div><p><strong>Developer: DAVID LEE</strong><br/>Story index: Sean Boisen / SemanticBible · Connections: OpenBible.info · Greek: STEPBible / Tyndale House</p><button onClick={()=>dialog.current.showModal()}>Method, sources & data ↗</button></footer>
    </main>
    <SymbolDialog book={symbolBook} onClose={()=>setSymbolBook(null)} ed={ed} scale={editionState.scale} onLocate={vid=>{setFilter("all");setQuery("");select(verseById[vid].stories[0],vid);reader.current.scrollIntoView({behavior:"smooth"})}}/>
    {hover&&<div className="map-tooltip" style={{left:Math.max(8,Math.min(hover.x+16,window.innerWidth-295)),top:Math.max(8,Math.min(hover.y+16,window.innerHeight-130))}}><strong>{refLabel(hover.verse)}</strong><p>{stories[hover.story]?.title}</p>{stories[hover.story]&&<Mask story={stories[hover.story]}/>}</div>}
    <dialog ref={dialog} className="method-dialog" onClick={e=>{if(e.target===dialog.current)dialog.current.close()}}><div className="dialog-top"><span className="eyebrow">READING THE ATLAS</span><button aria-label="Close sources" onClick={()=>dialog.current.close()}>×</button></div><h2>A map of stories,<br/><em>not a claim of sameness.</em></h2><p>Each square is one verse, in its Gospel’s own order. Chapter numbers appear down the left of each frame. Select a square to highlight its story unit across the four accounts.</p><h3>Five colours, fifteen possible combinations</h3><p>Gold means the index assigns an episode or teaching to more than one Gospel. Blue, red, green and purple identify units assigned to Matthew, Mark, Luke or John alone. The Mt / Mk / Lk / Jn badges show the exact combination. Hovering temporarily highlights a unit; Focus selected story dims everything else. Colour-blind palette switches to the Okabe-Ito colours, so no distinction depends on telling red from green; the Mt / Mk / Lk / Jn badges carry the same information in text either way.</p>
    <h3>Searching and comparing</h3><p>The search box matches story titles, references such as John 4:7, and — from three letters upwards — the Scripture text itself in the edition you are reading. Online editions hold no text in this file, so their searches fall back to the ASV 1901. Matched units show the first verse that contains your words.</p><p>Told in / but not in filters the index to the units one Gospel records and another does not, which is the comparison the maps show but cannot answer precisely. It reports the chosen index's assignments: a unit absent from one Gospel may still share details with something that Gospel records elsewhere.</p><h3>What “distinctive” means</h3><p>It means “assigned only to this Gospel in the chosen story index.” It does not prove that every idea or detail is unique. Shared units can contain unique details, and different synopses can group accounts differently. No literary dependence, chronology or factual agreement is inferred from the colours.</p><h3>The two data layers</h3><p><a href="https://semanticbible.com/cgi/cgi-view.html" target="_blank" rel="noreferrer">Sean Boisen’s Composite Gospel Index 1.2</a> supplies {meta.storyCount} units covering all {fmt(meta.verseCount)} Gospel verses. Its episode groupings determine the colours. The story browser follows the index sequence, while each map retains its Gospel’s sequence.</p><p><a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noreferrer">OpenBible.info</a> supplies {fmt(meta.crossReferenceCount)} directed links in the 26 October 2026 snapshot, chiefly derived from the Treasury of Scripture Knowledge. {fmt(meta.gospelCrossReferenceCount)} originate in the four Gospels and are available here. They may connect words, themes, people or events. Missing links do not establish uniqueness; votes are not confidence or similarity scores.</p><h3>Text and verification</h3><p>The reference map uses the public-domain American Standard Version (1901), supplied through <a href="https://github.com/scrollmapper/bible_databases" target="_blank" rel="noreferrer">Scrollmapper</a>. All {fmt(meta.verseCount)} Gospel verses have exactly one index assignment, with no gaps or overlaps. Source hashes are recorded in the downloadable metadata.</p><p>One documented source typo was corrected: unit 102 labels its source as Mark but starts the range “Matt.4.33”. The atlas uses Mark 4:33–34. No other source groupings were altered. Traditional passages with disputed manuscript support remain present in this ASV-based map.</p><EditionSources/><h3>The Greek underneath</h3><p>Turning on <em>Greek, word by word</em> under a selected verse shows the Greek of that verse: the word as it stands, a transliteration, the dictionary word behind it, and the grammar. {fmt(window.INTERLINEAR.words)} words of Matthew to John, from <a href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noreferrer">STEPBible&rsquo;s Translators Amalgamated Greek New Testament</a>, the work of Tyndale House, Cambridge, under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. The grammar is expanded in STEPBible&rsquo;s own words; the sixteen codes they do not expand, where two words have merged into one, are shown as the bare code rather than guessed at.</p><p>The small English word under each Greek word is a <em>gloss</em>: one English word standing in for one Greek one, outside the sentence it belongs to. It is a lexicon&rsquo;s choice and not a translation, which is why it is set in a different type and labelled rather than run together into a readable line. Where it disagrees with the translation above, the translation is the considered reading and the gloss is the raw material.</p><p>Gold marks a word whose dictionary form also stands in another Gospel&rsquo;s telling of the same story unit. That is a count of shared words and nothing more: it does not say that one writer copied another, or which came first, only that the same word is there in both. Words the Greek editions differ over can be marked separately; the note then says which editions carry the word. Neither mark judges which reading is right.</p><h3>Attribution and downloads</h3><p>The story index and its adapted metadata are attributed to Sean Boisen / SemanticBible under <a href="https://creativecommons.org/licenses/by-nc-sa/2.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 2.0</a>. Cross-reference data is attributed to OpenBible.info under its <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY licence</a>. Adaptations: verse expansion, colour categories, interface and the correction above. This is a non-commercial study tool.</p><div className="download-row"><button onClick={()=>downloadJson(window.ATLAS,"gospel-atlas-data.json")}>Story & verse data ↓</button><button onClick={()=>downloadJson(window.AUDIT,"gospel-atlas-audit.json")}>Audit & sources ↓</button><button onClick={()=>downloadJson(window.CROSSREFS,"gospel-cross-references.json")}>Gospel cross-references ↓</button></div><p className="small">Keyboard: tab to a map; use arrow keys to select verses. The searchable story list and passage reader provide a text alternative to the canvas. Standalone edition · 2 November 2026. Free to share for non-commercial use with source notices retained.</p></dialog>
  </>
}

createRoot(document.getElementById('root')).render(<App data={window.ATLAS}/>);
