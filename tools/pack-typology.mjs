// Builds docs/typology.html, a self-contained teaching page, from data/typology.json.
//
// Only the correspondences a verse of Scripture asserts are carried over; the ones
// attributed to the typological tradition are left out, because the page's whole claim
// is that it shows what Scripture says about itself rather than what is said about
// Scripture. Every reference is resolved against the ASV and every quotation checked
// against the verse that is cited, exactly as tools/typology.mjs does, so nothing can
// reach the page unverified.
//
//   node tools/pack-typology.mjs
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const meta = JSON.parse(await readFile('data/metadata.json', 'utf8'));
const DB = JSON.parse(await readFile('data/typology.json', 'utf8'));

const name = code => (meta.bookNames?.[code] || code).replace('Revelation of John', 'Revelation');
const label = ref => { const [b, c, v] = ref.split('.'); return `${name(b)} ${c}:${v}`; };
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// chapter index, for the attestation marks
const chapterOf = new Map(); let nch = 0; const verseChapter = new Map();
for (const key of Object.keys(bible)) {
  const [b, c] = key.split('.'), id = b + '.' + c;
  if (!chapterOf.has(id)) chapterOf.set(id, nch++);
  verseChapter.set(key, chapterOf.get(id));
}
const pairs = new Set();
for (const line of execFileSync('unzip', ['-p', 'source-data/cross-references-2026-11-02.zip'], {maxBuffer: 1 << 28}).toString('utf8').split('\n')) {
  const [f, t] = line.trim().split('\t');
  if (!f || !t || f === 'From Verse') continue;
  const a = verseChapter.get(f), b = verseChapter.get(t.split('-')[0]);
  if (a !== undefined && b !== undefined) pairs.add(a * 2000 + b);
}
const joined = (r1, r2) => {
  const a = verseChapter.get(r1), b = verseChapter.get(r2);
  return pairs.has(a * 2000 + b) || pairs.has(b * 2000 + a);
};

const problems = [];
const need = new Set();
const out = [];
for (const t of DB.typologies) {
  if (t.asserted_by !== 'scripture') continue;
  const check = (where, ref, quote) => {
    const text = bible[ref];
    if (text === undefined) { problems.push(`${where}: ${ref} is not a verse in the ASV`); return false; }
    if (quote && !norm(text).includes(norm(quote))) {
      problems.push(`${where}: quotation is not in ${ref}`); return false;
    }
    need.add(ref); return true;
  };
  if (!check(t.id + ' assertion', t.assertion.ref, t.assertion.quote)) continue;
  let ok = true;
  for (const side of ['type', 'antitype'])
    for (const m of t[side].motifs) if (!check(`${t.id}.${side}`, m.ref, m.quote)) ok = false;
  if (!ok) continue;

  // Which pairs the cross-references join, and whether the answer runs in reverse.
  const A = t.type.motifs.map(m => m.motif), B = t.antitype.motifs.map(m => m.motif);
  const shared = A.filter(m => B.includes(m));
  const a = shared, b = B.filter(m => shared.includes(m));
  const lcs = (X, Y) => {
    const d = Array.from({length: X.length + 1}, () => new Int32Array(Y.length + 1));
    for (let i = 1; i <= X.length; i++) for (let j = 1; j <= Y.length; j++)
      d[i][j] = X[i - 1] === Y[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
    return d[X.length][Y.length];
  };
  const pairMarks = {};
  for (const m of shared) {
    const r1 = t.type.motifs.find(x => x.motif === m).ref;
    const r2 = t.antitype.motifs.find(x => x.motif === m).ref;
    pairMarks[m] = joined(r1, r2);
  }
  const side = s => t[s].motifs.filter(m => shared.includes(m.motif)).map(m => ({
    motif: m.motif, ref: label(m.ref), text: bible[m.ref], label: m.quote
  }));
  out.push({
    id: t.id, name: t.name,
    assertion: {label: label(t.assertion.ref), text: bible[t.assertion.ref]},
    type: {label: t.type.label, motifs: side('type')},
    antitype: {label: t.antitype.label, motifs: side('antitype')},
    pairs: pairMarks,
    chiastic: lcs(a, [...b].reverse()) > lcs(a, b)
  });
}
if (problems.length) {
  console.error('FAILED verification:\n  ' + problems.join('\n  '));
  process.exit(1);
}

const payload = {
  typologies: out,
  verses: need.size,
  built: new Date().toISOString().slice(0, 10)
};
const template = await readFile('src/typology-page.html', 'utf8');
await mkdir('docs', {recursive: true});
const html = template.replace('__DATA__', JSON.stringify(payload));
await writeFile('docs/typology.html', html);
console.log(JSON.stringify({
  asserted: out.length, skippedAsTradition: DB.typologies.length - out.length,
  versesEmbedded: need.size, chiastic: out.filter(t => t.chiastic).length,
  pagePretty: (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB'
}));
