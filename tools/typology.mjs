// Measures claimed typological correspondences in data/typology.json.
//
// A typology is not something this can confirm or deny. What it can do is check
// that every reference is real and every quotation is actually in the verse it
// cites, and then report four things about each claim — none of which is a verdict:
//
//   shared        how many motifs both sequences carry
//   order         of the shared motifs, the longest run that appears in the same
//                 order on both sides, as a fraction. A reading that lines two
//                 narratives up step by step scores high; one that collects
//                 scattered resemblances scores low.
//   p             how often shuffling one side at random reaches that order score.
//                 This is the guard against the annotator, not against the text.
//   attested      the fraction of shared motifs whose two passages have a direct
//                 cross-reference between their chapters in the OpenBible data.
//
// Run:  node tools/typology.mjs
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const meta = JSON.parse(await readFile('data/metadata.json', 'utf8'));
const DB = JSON.parse(await readFile('data/typology.json', 'utf8'));

// ---- references and quotations must be real -------------------------------
const chapterOf = new Map();
let nch = 0;
const verseChapter = new Map();
for (const key of Object.keys(bible)) {
  const [b, c] = key.split('.');
  const id = b + '.' + c;
  if (!chapterOf.has(id)) chapterOf.set(id, nch++);
  verseChapter.set(key, chapterOf.get(id));
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const vocab = new Set(DB.vocabulary);
let checked = 0;
const problems = [];
const visit = (where, m) => {
  checked++;
  if (!vocab.has(m.motif)) problems.push(`${where}: motif "${m.motif}" is not in the vocabulary`);
  const text = bible[m.ref];
  if (text === undefined) { problems.push(`${where}: ${m.ref} is not a verse in the ASV`); return; }
  if (!norm(text).includes(norm(m.quote)))
    problems.push(`${where}: quotation not found in ${m.ref}\n      cited: ${m.quote}\n      ASV:   ${text.slice(0, 120)}`);
};
for (const t of DB.typologies) {
  if (t.assertion) visit(t.id + ' assertion', {motif: t.type.motifs[0].motif, ...t.assertion});
  for (const side of ['type', 'antitype'])
    for (const m of t[side].motifs) visit(`${t.id}.${side}`, m);
  const seen = new Set();
  for (const side of ['type', 'antitype']) {
    seen.clear();
    for (const m of t[side].motifs) {
      if (seen.has(m.motif)) problems.push(`${t.id}.${side}: motif "${m.motif}" appears twice`);
      seen.add(m.motif);
    }
  }
  if (t.asserted_by === 'scripture' && !t.assertion) problems.push(`${t.id}: claims scripture asserts it but gives no verse`);
  if (t.asserted_by === 'tradition' && t.assertion) problems.push(`${t.id}: attributed to tradition but carries an assertion`);
}
if (problems.length) { console.error('FAILED verification:\n  ' + problems.join('\n  ')); process.exit(1); }

// ---- the cross-reference data, for attestation ----------------------------
const pairs = new Set();
for (const line of execFileSync('unzip', ['-p', 'source-data/cross-references-2026-11-02.zip'], {maxBuffer: 1 << 28}).toString('utf8').split('\n')) {
  const [f, t] = line.trim().split('\t');
  if (!f || !t || f === 'From Verse') continue;
  const a = verseChapter.get(f), b = verseChapter.get(t.split('-')[0]);
  if (a === undefined || b === undefined) continue;
  pairs.add(a * 2000 + b);
}
const linked = (r1, r2) => {
  const a = verseChapter.get(r1), b = verseChapter.get(r2);
  return pairs.has(a * 2000 + b) || pairs.has(b * 2000 + a);
};

// ---- order preservation ---------------------------------------------------
const lcs = (A, B) => {
  const n = A.length, m = B.length;
  const d = Array.from({length: n + 1}, () => new Int32Array(m + 1));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
    d[i][j] = A[i - 1] === B[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[n][m];
};
const shuffle = (a, rnd) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const mulberry = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const TRIALS = 20000;
const rows = [];
for (const t of DB.typologies) {
  const A = t.type.motifs.map(m => m.motif), B = t.antitype.motifs.map(m => m.motif);
  const common = new Set(A.filter(m => B.includes(m)));
  const a = A.filter(m => common.has(m)), b = B.filter(m => common.has(m));
  const run = lcs(a, b);
  const order = common.size ? run / common.size : 0;
  // null: how often does a random ordering of one side do as well?
  const rnd = mulberry(20261105);
  let ge = 0;
  for (let i = 0; i < TRIALS; i++) if (lcs(a, shuffle(b, rnd)) >= run) ge++;
  const p = (ge + 1) / (TRIALS + 1);
  // attestation of the shared motifs
  let att = 0;
  for (const m of common) {
    const r1 = t.type.motifs.find(x => x.motif === m).ref, r2 = t.antitype.motifs.find(x => x.motif === m).ref;
    if (linked(r1, r2)) att++;
  }
  rows.push({id: t.id, name: t.name, by: t.asserted_by, nA: A.length, nB: B.length,
             shared: common.size, run, order, p, att, attFrac: common.size ? att / common.size : 0});
}

// ---- controls: the same measure on pairings nobody claims -----------------
const control = [];
for (let i = 0; i < DB.typologies.length; i++) for (let j = 0; j < DB.typologies.length; j++) {
  if (i === j) continue;
  const A = DB.typologies[i].type.motifs.map(m => m.motif);
  const B = DB.typologies[j].antitype.motifs.map(m => m.motif);
  const common = new Set(A.filter(m => B.includes(m)));
  const a = A.filter(m => common.has(m)), b = B.filter(m => common.has(m));
  control.push({pair: DB.typologies[i].type.label + ' / ' + DB.typologies[j].antitype.label,
                shared: common.size, order: common.size ? lcs(a, b) / common.size : null});
}

// ---- report ---------------------------------------------------------------
console.log(JSON.stringify({checked, verified: true, typologies: DB.typologies.length,
  scripture: rows.filter(r => r.by === 'scripture').length, tradition: rows.filter(r => r.by === 'tradition').length}));
console.log('\n  order   p      attested  shared  asserted by  typology');
for (const r of [...rows].sort((x, y) => y.order - x.order || y.shared - x.shared))
  console.log('   ' + r.order.toFixed(2) + '   ' + (r.p < 0.001 ? '<.001' : r.p.toFixed(3)) +
    '   ' + String(r.att + '/' + r.shared).padStart(6) + '   ' + String(r.shared).padStart(4) +
    '    ' + r.by.padEnd(11) + '  ' + r.name);
const mean = xs => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const big = rows.filter(r => r.shared >= 4);
for (const [label, set] of [['all', rows], ['4 or more shared motifs', big]]) {
  const s = set.filter(r => r.by === 'scripture'), t = set.filter(r => r.by === 'tradition');
  console.log(`\n${label}:  scripture-asserted order ${mean(s.map(r => r.order)).toFixed(2)} (n=${s.length})` +
    `   tradition-asserted order ${mean(t.map(r => r.order)).toFixed(2)} (n=${t.length})`);
  console.log(`${' '.repeat(label.length + 1)} scripture attested ${(mean(s.map(r => r.attFrac)) * 100).toFixed(0)}%` +
    `   tradition attested ${(mean(t.map(r => r.attFrac)) * 100).toFixed(0)}%`);
}
// How much structure do unclaimed pairings have to work with at all?
const usable = control.filter(c => c.shared >= 4);
console.log('\ncontrol — the type of one claim against the antitype of another, ' + control.length + ' pairings:');
console.log('   shared motifs: mean ' + mean(control.map(c => c.shared)).toFixed(1) +
            ', most ' + Math.max(...control.map(c => c.shared)) +
            ', with 4 or more: ' + usable.length);
console.log('   (a claimed typology here shares ' + mean(rows.map(r => r.shared)).toFixed(1) + ' on average)');
if (usable.length) {
  usable.sort((a, b) => b.order - a.order);
  console.log('   order among those: mean ' + mean(usable.map(c => c.order)).toFixed(2) +
              ', highest ' + usable[0].order.toFixed(2) + ' (' + usable[0].pair + ')');
} else {
  console.log('   none has enough shared motifs to order, so this control cannot discriminate.');
}
// The order test only carries information where chance alone would rarely line
// the motifs up: a random permutation of n motifs is in perfect order 1/n! of
// the time, so four shared motifs is the floor for p < 0.05.
const informative = rows.filter(r => r.shared >= 4);
console.log('\nonly ' + informative.length + ' of ' + rows.length +
            ' claims have 4 or more shared motifs, the point below which a perfect');
console.log('order is commoner than 1 in 20 by chance alone. Of those, significant at p<0.05:');
for (const r of informative.filter(r => r.p < 0.05).sort((a, b) => a.p - b.p))
  console.log('   p=' + (r.p < 0.001 ? '<.001' : r.p.toFixed(3)) + '  order ' + r.order.toFixed(2) +
              '  ' + String(r.shared).padStart(2) + ' shared  ' + r.by.padEnd(10) + '  ' + r.name);
