// The parts of the notebook that are the same in both apps.
//
// The Cross-Reference Lab and the Gospel Atlas keep different things — one keeps a
// diagram and a chapter, the other keeps a story unit and four parallel columns — but
// a slide is a slide, and a lesson is usually made of both. So the deck is built here
// once, from items of a common shape, and both apps hand it the same fields:
//
//   kind     'note' or 'bookmark'
//   eyebrow  the small line above the title
//   title    what the slide is about
//   sub      the numbers behind it, if any
//   img      a data URL, if the view was worth a picture
//   quote    Scripture itself, where a note is about one passage
//   cite     where that quotation is from, and in which edition
//   original the Greek or Hebrew of the passage, word by word: a list of
//            {lang, label, words: [[word, transliteration, gloss], …]}
//   body     the words typed into the notebook — this is what the slide says
//   atText   the view it was kept from, already written out
//   app      which app kept it, so a mixed deck says so
//
// atText is stored rather than recomputed because a deck may hold items from the other
// app, whose view state this app cannot read. The sentence it wrote is carried along.
//
// This file is a module for the Atlas, which bundles it, and is inlined verbatim into
// the Lab's single file by tools/pack-crossrefs.mjs, which strips the export keywords.
// So it must stay plain: declarations only, no imports, nothing that assumes a bundler.

export const APP_NAMES = {'cross-reference-lab': 'Cross-Reference Lab', 'gospel-atlas': 'Gospel Atlas'};

// The three pages of the suite go by one set of names in the emailed archive and another
// on the published site, and the same bytes serve both. So a page works out which set it
// is living under from its own file name, and links to its neighbours accordingly. On
// the site index.html is the landing page, not the Atlas, so the published Atlas is
// gospel-atlas.html; change that here and in package.json's publish:docs together. A
// link can carry a word across: every page that searches words reads "#word=H5923" when
// it opens, so "the Lab has this across the whole Bible" is a link and not a suggestion.
export function suiteLinks() {
  let here = '';
  try { here = decodeURIComponent(location.pathname.split('/').pop() || ''); } catch (e) {}
  return /^(Gospel_Atlas_David_Lee|Cross_Reference_Lab|Shadow_and_Substance)\.html$/i.test(here)
    ? {atlas: 'Gospel_Atlas_David_Lee.html', lab: 'Cross_Reference_Lab.html', types: 'Shadow_and_Substance.html'}
    : {atlas: 'gospel-atlas.html', lab: 'cross-references.html', types: 'typology.html'};
}
// The word a link carried, if any: "#word=G2218" gives "G2218".
export function wordFromHash() {
  const m = /[#&]word=([^&]+)/.exec(location.hash || '');
  try { return m ? decodeURIComponent(m[1]) : ''; } catch (e) { return ''; }
}

export const nbNow = () => new Date().toISOString().slice(0, 16).replace('T', ' ');

// For a filename: keeps letters, digits and the mildest punctuation, since this ends up
// in a download on an unknown filesystem.
export const safeName = t => String(t || '').replace(/[^\w .,'-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);

export function download(name, blob) {
  const u = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

// One self-contained HTML file: arrow keys to present, print for a PDF. It carries no
// script from anywhere else and no network request, so it opens from a memory stick on
// a classroom machine with nothing installed, which is the only place it has to work.
export function deckHtml(items, title) {
  const esc = t => String(t == null ? '' : t).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
  const apps = [...new Set(items.map(i => i.app).filter(Boolean))];
  const mixed = apps.length > 1;
  const slides = items.map((it, n) => {
    const from = mixed && it.app ? esc(APP_NAMES[it.app] || it.app) + ' · ' : '';
    return '<section>' +
      '<p class="k">' + from + esc(it.kind === 'bookmark' ? 'VIEW' : (it.eyebrow || 'NOTE')) + '</p>' +
      '<h2>' + esc(it.title) + '</h2>' +
      (it.sub ? '<p class="s">' + esc(it.sub) + '</p>' : '') +
      (it.img ? '<img alt="" src="' + it.img + '">' : '') +
      (it.quote ? '<blockquote>' + esc(it.quote) + (it.cite ? '<cite>' + esc(it.cite) + '</cite>' : '') + '</blockquote>' : '') +
      (it.original ? it.original.map(o => '<div class="o"><p class="ol">' + esc(o.label) + '</p>' +
        '<div class="ow" lang="' + esc(o.lang) + '" dir="' + (o.lang === 'he' ? 'rtl' : 'ltr') + '">' +
        o.words.map(w => '<span><b>' + esc(w[0]) + '</b><i>' + esc(w[1]) + '</i><u>' + esc(w[2]) + '</u></span>').join('') +
        '</div></div>').join('') : '') +
      (it.body ? '<p class="b">' + esc(it.body).replace(/\n+/g, '</p><p class="b">') + '</p>' : '') +
      '<p class="f">' + esc(it.atText || '') + ' · ' + (n + 1) + ' of ' + items.length + '</p></section>';
  }).join('\n');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><style>' +
  ':root{--p:#f7f6f1;--i:#26362f;--m:#747b73;--l:#dedfd5;--g:#b49a4b;color-scheme:light}' +
  '*{box-sizing:border-box}html,body{margin:0;height:100%;background:#1d231f;color:var(--i);' +
  "font-family:Inter,ui-sans-serif,-apple-system,'Segoe UI',sans-serif}" +
  'section{display:none;background:var(--p);width:min(100%,1120px);aspect-ratio:16/9;margin:auto;' +
  'padding:5vmin 6vmin;flex-direction:column;border-radius:4px}section.on{display:flex}' +
  'body{display:flex;align-items:center;justify-content:center;padding:3vmin}' +
  '.k{font-size:.72rem;letter-spacing:.15em;color:var(--m);margin:0 0 .4rem;font-weight:700}' +
  "h2{font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:clamp(1.3rem,3.4vmin,2.5rem);margin:0 0 .4rem}" +
  '.s{color:var(--m);font-size:clamp(.78rem,1.7vmin,1rem);margin:0 0 .8rem}' +
  'img{max-height:52%;object-fit:contain;align-self:center;border:1px solid var(--l);border-radius:3px;background:#fff}' +
  ".b{font-family:Georgia,'Times New Roman',serif;font-size:clamp(.9rem,2.1vmin,1.3rem);line-height:1.45;margin:.7rem 0 0}" +
  "blockquote{font-family:Georgia,'Times New Roman',serif;font-size:clamp(.95rem,2.4vmin,1.5rem);line-height:1.5;" +
  'margin:.6rem 0 0;padding-left:1rem;border-left:3px solid var(--g);overflow:auto}' +
  'blockquote cite{display:block;margin-top:.5rem;font:400 .7rem/1 Inter,ui-sans-serif,sans-serif;font-style:normal;color:var(--m);letter-spacing:.08em}' +
  // The original language, word over sound over gloss. Hebrew runs right to left, but the
  // sound and the gloss under each word are English and stay left to right.
  '.o{margin:.7rem 0 0}.ol{margin:0 0 .25rem;font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--m);font-weight:700}' +
  '.ow{display:flex;flex-wrap:wrap;gap:.3em .8em}.ow span{display:grid}' +
  ".ow b{font:400 clamp(1rem,2.7vmin,1.75rem)/1.3 Georgia,'Times New Roman',serif}" +
  '.ow i{font-style:normal;font-size:clamp(.5rem,1.2vmin,.7rem);color:var(--m)}' +
  '.ow u{text-decoration:none;font-size:clamp(.58rem,1.4vmin,.82rem);color:#5e7050}' +
  '.ow[dir=rtl] i,.ow[dir=rtl] u{direction:ltr;text-align:right}' +
  'section{overflow:auto}' +
  '.f{margin-top:auto;font-size:.68rem;color:var(--m);border-top:1px solid var(--l);padding-top:.5rem}' +
  '#n{position:fixed;bottom:12px;right:16px;color:#8d978f;font-size:.72rem}' +
  '@media print{body{display:block;padding:0;background:#fff}section{display:flex!important;' +
  'page-break-after:always;width:100%;border-radius:0;aspect-ratio:auto;height:100vh}#n{display:none}}' +
  '</style></head><body>' + slides + '<div id="n"></div><script>' +
  'var s=[].slice.call(document.querySelectorAll("section")),i=0;' +
  'function go(n){i=Math.max(0,Math.min(s.length-1,n));s.forEach(function(e,k){e.classList.toggle("on",k===i)});' +
  'document.getElementById("n").textContent=(i+1)+" / "+s.length+"  —  arrow keys, or print for PDF"}' +
  'addEventListener("keydown",function(e){if(e.key==="ArrowRight"||e.key===" ")go(i+1);' +
  'if(e.key==="ArrowLeft")go(i-1);if(e.key==="Home")go(0);if(e.key==="End")go(s.length-1)});' +
  'addEventListener("click",function(e){go(i+(e.clientX<innerWidth/3?-1:1))});go(0);' +
  '<\/script></body></html>';
}

// Reading a saved notebook back. Anything whose shape is not an item is dropped rather
// than trusted, and the app it came from is remembered so this app knows which views it
// can actually restore.
export function readNotebook(text, fallbackApp) {
  const d = JSON.parse(text);
  const got = Array.isArray(d) ? d : (d.items || []);
  if (!Array.isArray(got)) throw new Error('no items');
  return got.filter(x => x && (x.kind === 'note' || x.kind === 'bookmark'))
            .map(x => ({...x, app: x.app || d.app || fallbackApp}));
}
