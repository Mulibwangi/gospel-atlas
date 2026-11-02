// Builds docs/cross-references.html from src/crossrefs-page.html.
//
//   node tools/pack-crossrefs.mjs                     → the Gospel-originating subset in data/
//   node tools/pack-crossrefs.mjs --full <path>       → the complete OpenBible dataset
//
// <path> is cross-references.zip as downloaded from
// https://a.openbible.info/data/cross-references.zip, or the cross_references.txt
// inside it.
//
// The payload carries the links at verse level, delta-encoded, together with the
// ASV text, so the page can both draw the chapter-to-chapter picture and show the
// actual passages behind any link. Chapter pairs are derived in the browser rather
// than shipped twice. Everything is gzipped and embedded, so the page stays one
// self-contained file that works offline.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const args = process.argv.slice(2);
const fullAt = args.indexOf('--full');
const fullPath = fullAt >= 0 ? args[fullAt + 1] : null;

const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const meta = JSON.parse(await readFile('data/metadata.json', 'utf8'));

// Canonical order, chapter sizes, book names and a global verse index, all from the ASV.
const verseKeys = Object.keys(bible);
const verseIndex = new Map(verseKeys.map((k, i) => [k, i]));
const books = [], chapterVerses = [], chapterIndex = new Map(), bookIndex = new Map();
for (const key of verseKeys) {
  const [b, c] = key.split('.');
  if (!bookIndex.has(b)) { bookIndex.set(b, books.length); books.push({code: b, name: meta.bookNames?.[b] || b, first: chapterVerses.length, chapters: 0}); }
  const id = b + '.' + c;
  if (!chapterIndex.has(id)) { chapterIndex.set(id, chapterVerses.length); chapterVerses.push(0); books[bookIndex.get(b)].chapters++; }
  chapterVerses[chapterIndex.get(id)]++;
}

// The last verse the ASV has in each chapter, for clamping a range whose end the
// ASV does not reach — 3 John 1:15, for instance, where the ASV stops at verse 14.
const lastVerseOfChapter = new Map();
verseKeys.forEach((k, i) => { const [b, c] = k.split('.'); lastVerseOfChapter.set(b + '.' + c, i); });

const rows = [];
const unmapped = [];
let dropped = 0, clamped = 0, scope, sourceNote, sourceHash = null, snapshot = null;

function add(from, to, votes) {
  const a = verseIndex.get(from);
  const parts = to.split('-');
  const s = verseIndex.get(parts[0]);
  if (a === undefined || s === undefined) {
    dropped++;
    const missing = a === undefined ? from : parts[0];
    if (!unmapped.includes(missing)) unmapped.push(missing);
    return;
  }
  let e = s;
  if (parts[1] !== undefined) {
    const exact = verseIndex.get(parts[1]);
    if (exact !== undefined) e = exact;
    else {
      // Keep the range rather than collapsing it to its first verse.
      const [b, c] = parts[1].split('.');
      const fallback = lastVerseOfChapter.get(b + '.' + c);
      if (fallback !== undefined && fallback > s) { e = fallback; clamped++; }
      if (!unmapped.includes(parts[1])) unmapped.push(parts[1]);
    }
  }
  rows.push([a, s, Math.max(s, e) - s, votes]);
}

if (fullPath) {
  const raw = await readFile(fullPath);
  sourceHash = createHash('sha256').update(raw).digest('hex');
  let text, stamp = null;
  if (fullPath.endsWith('.zip')) {
    try {
      const listing = execFileSync('unzip', ['-l', fullPath]).toString();
      const m = listing.match(/(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}\s+cross_references/);
      if (m) stamp = m[1];
      text = execFileSync('unzip', ['-p', fullPath], {maxBuffer: 1 << 28}).toString('utf8');
    } catch {
      throw new Error('Could not unzip ' + fullPath + '. Unzip it yourself and pass the cross_references.txt inside it instead.');
    }
  } else {
    text = raw.toString('utf8');
  }
  for (const line of text.split('\n')) {
    const [from, to, votes] = line.trim().split('\t');
    if (!from || !to || from === 'From Verse') continue;
    add(from, to, Number(votes) || 0);
  }
  scope = 'complete';
  snapshot = stamp || new Date().toISOString().slice(0, 10);
  sourceNote = 'The complete OpenBible.info cross-reference dataset.';
  sourceNote += sourceHash === meta.hashes?.['cross-references.zip']
    ? ' This is the same file recorded in the Atlas release audit.'
    : ' This is a later download than the one in the Atlas release audit, so a few vote counts differ; the links themselves are the same.';
} else {
  const crossrefs = JSON.parse(await readFile('data/crossrefs.json', 'utf8'));
  for (const [source, targets] of Object.entries(crossrefs)) for (const [target, votes] of targets) add(source, target, votes);
  scope = 'gospels';
  snapshot = meta.snapshot || '';
  sourceNote = 'Only the cross-references that originate in Matthew, Mark, Luke or John.';
}

rows.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
const flat = [];
let previous = 0;
for (const r of rows) { flat.push(r[0] - previous, r[1], r[2], r[3]); previous = r[0]; }

const payload = {
  scope, sourceNote, snapshot, sourceSha256: sourceHash,
  built: new Date().toISOString().replace('T',' ').slice(0, 16) + ' UTC',
  unmapped, dropped,
  testamentSplit: books.findIndex(b => b.code === 'Matt'),
  books: books.map(b => [b.code, b.name, b.first, b.chapters]),
  chapterVerses,
  links: flat,                               // [Δfrom, toStart, toSpan, votes] × n, verse indices
  text: verseKeys.map(k => bible[k]).join('\n')
};

const encoded = gzipSync(Buffer.from(JSON.stringify(payload)), {level: 9}).toString('base64');
const template = await readFile('src/crossrefs-page.html', 'utf8');
await mkdir('docs', {recursive: true});
const html = template.replace('__PAYLOAD__', encoded);
await writeFile('docs/cross-references.html', html);

const chapterOfVerse = [];
for (let c = 0; c < chapterVerses.length; c++) for (let v = 0; v < chapterVerses[c]; v++) chapterOfVerse.push(c);
const pairs = new Set(rows.map(r => chapterOfVerse[r[0]] * 2000 + chapterOfVerse[r[1]]));
console.log(JSON.stringify({
  scope, verseLinks: rows.length, dropped, clamped, unmapped, chapterPairs: pairs.size,
  verses: verseKeys.length, sourceSha256: sourceHash,
  payloadBytes: encoded.length, pageBytes: Buffer.byteLength(html)
}));
