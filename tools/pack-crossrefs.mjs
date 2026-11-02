// Builds docs/cross-references.html from src/crossrefs-page.html.
//
//   node tools/pack-crossrefs.mjs                     → the Gospel-originating subset in data/
//   node tools/pack-crossrefs.mjs --full <path>       → the complete OpenBible dataset
//
// <path> is cross-references.zip as downloaded from
// https://a.openbible.info/data/cross-references.zip, or the cross_references.txt
// inside it. The links are aggregated to directed chapter pairs, then gzipped and
// embedded in the page, the same way the Atlas carries its own data.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';

const args = process.argv.slice(2);
const fullAt = args.indexOf('--full');
const fullPath = fullAt >= 0 ? args[fullAt + 1] : null;

const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const meta = JSON.parse(await readFile('data/metadata.json', 'utf8'));

// Canonical order, chapter sizes and book names come from the ASV itself.
const books = [], chapters = [], chapterIndex = new Map(), bookIndex = new Map();
for (const key of Object.keys(bible)) {
  const [b, c] = key.split('.');
  if (!bookIndex.has(b)) { bookIndex.set(b, books.length); books.push({code: b, name: meta.bookNames?.[b] || b, first: chapters.length, chapters: 0}); }
  const id = b + '.' + c;
  if (!chapterIndex.has(id)) {
    chapterIndex.set(id, chapters.length);
    chapters.push(0);
    books[bookIndex.get(b)].chapters++;
  }
  chapters[chapterIndex.get(id)]++;
}
const chapterOf = ref => {
  const [b, c] = ref.split('-')[0].split('.');
  return chapterIndex.get(b + '.' + c);
};

const pairs = new Map();
let verseLinks = 0, dropped = 0, scope, sourceNote, sourceHash = null, snapshot = null;

function add(from, to, votes) {
  const a = chapterOf(from), b = chapterOf(to);
  if (a === undefined || b === undefined) { dropped++; return; }
  const key = a * 2000 + b;
  const row = pairs.get(key) || [a, b, 0, 0];
  row[2]++; row[3] += votes;
  pairs.set(key, row);
  verseLinks++;
}

if (fullPath) {
  const raw = await readFile(fullPath);
  sourceHash = createHash('sha256').update(raw).digest('hex');
  let text, stamp = null;
  if (fullPath.endsWith('.zip')) {
    // The archive's own entry date is the snapshot date; the file's mtime is only when it was copied.
    try {
      const listing = execFileSync('unzip', ['-l', fullPath]).toString();
      const m = listing.match(/(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}\s+cross_references/);
      if (m) stamp = m[1];
    } catch {}
    try {
      text = execFileSync('unzip', ['-p', fullPath], {maxBuffer: 1 << 28}).toString('utf8');
    } catch {
      throw new Error('Could not unzip ' + fullPath + '. Unzip it yourself and pass the cross_references.txt inside it instead.');
    }
  } else {
    text = raw.toString('utf8');
  }
  for (const line of text.split('\n')) {
    const [from, to, votes] = line.trim().split('\t');
    if (!from || !to || from === 'From Verse') continue;         // header and blank lines
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

const links = [...pairs.values()].sort((a, b) => b[2] - a[2]);
const payload = {
  scope, sourceNote,
  snapshot, sourceSha256: sourceHash,
  testamentSplit: books.findIndex(b => b.code === 'Matt'),
  books: books.map(b => [b.code, b.name, b.first, b.chapters]),
  chapterVerses: chapters,
  links
};

const encoded = gzipSync(Buffer.from(JSON.stringify(payload)), {level: 9}).toString('base64');
const template = await readFile('src/crossrefs-page.html', 'utf8');
await mkdir('docs', {recursive: true});
const html = template.replace('__PAYLOAD__', encoded);
await writeFile('docs/cross-references.html', html);

console.log(JSON.stringify({
  scope, verseLinks, dropped, chapterPairs: links.length,
  sourceChapters: new Set(links.map(l => l[0])).size,
  targetChapters: new Set(links.map(l => l[1])).size,
  sourceSha256: sourceHash,
  payloadBytes: encoded.length, pageBytes: Buffer.byteLength(html)
}));
