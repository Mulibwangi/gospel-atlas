// Checks the Hebrew and Greek datasets against the text they claim to describe.
//
//   node tools/originals.mjs
//
// The packer checks its own work as it goes; this checks the written files, the way the
// apps will read them, and it exists for the same reason the typology verifier does.
// Two independently numbered texts have been joined here. If that join were off by one
// anywhere, every word after it would be attributed to the wrong verse, and a tool whose
// whole claim is that it shows what the text says would be quietly lying. So the claims
// are re-tested from the files rather than trusted because the build said so.
import {readFile} from 'node:fs/promises';

const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const I = JSON.parse(await readFile('data/interlinear.json', 'utf8'));
const fail = [];
const ok = [];
const check = (cond, what, detail = '') => (cond ? ok : fail).push(what + (detail ? ' — ' + detail : ''));

// ---- the interlinear -------------------------------------------------------
check(I.verses.length === I.offsets.length, 'every verse in the interlinear has a starting offset');
check(I.offsets.every((o, i) => i === 0 || o > I.offsets[i - 1]), 'the offsets run forward');
check(I.offsets[I.offsets.length - 1] < I.words, 'the last verse starts inside the word list');
check(I.verses.every(v => bible[v] !== undefined), 'every interlinear verse exists in the text',
  I.verses.filter(v => bible[v] === undefined).slice(0, 3).join(', '));
check(I.verses.every(v => /^(Matt|Mark|Luke|John)\./.test(v)), 'the interlinear covers the four Gospels and nothing else');
for (const k of Object.keys(I.cols))
  check(I.cols[k].length === I.words, `the ${k} column has one entry per word`, `${I.cols[k].length} vs ${I.words}`);
for (const k of Object.keys(I.cols))
  check(I.cols[k].every(i => i >= 0 && i < I.pools[k].length), `every ${k} index points into its pool`);

// Verses are in canonical order within each book, and each book appears once.
const bookRun = [...new Set(I.verses.map(v => v.split('.')[0]))];
check(bookRun.join() === 'Matt,Mark,Luke,John', 'the Gospels are in order and unbroken', bookRun.join(', '));

// Spot checks that can be read against any printed Greek New Testament. If the join
// ever slips, these are what notice.
const wordsAt = ref => {
  const vi = I.verses.indexOf(ref);
  if (vi < 0) return null;
  const a = I.offsets[vi], b = vi + 1 < I.offsets.length ? I.offsets[vi + 1] : I.words;
  return Array.from({length: b - a}, (_, j) => I.pools.greek[I.cols.greek[a + j]]);
};
const SPOT = [
  ['John.1.1', 'Ἐν ἀρχῇ ἦν ὁ λόγος'],
  ['Mark.1.1', 'Ἀρχὴ τοῦ εὐαγγελίου'],
  ['Matt.1.1', 'Βίβλος γενέσεως'],
  ['Luke.1.1', 'Ἐπειδήπερ πολλοὶ']
];
for (const [ref, opening] of SPOT) {
  // Compared after Unicode normalisation: the same Greek can be spelled with composed
  // or combining accents, and a mismatch there would say nothing about the text.
  const nf = t => t.normalize('NFC');
  const got = nf((wordsAt(ref) || []).join(' '));
  check(got.startsWith(nf(opening)), `${ref} opens as the Greek text does`, got.slice(0, 40) || '(nothing)');
}
check(I.morph && Object.keys(I.morph).length > 700, 'morphology codes carry STEPBible\'s own expansion',
  Object.keys(I.morph || {}).length + ' codes');
const morphUsed = new Set(I.pools.morph.filter(Boolean));
const explained = [...morphUsed].filter(c => I.morph[c]).length;
check(explained / morphUsed.size > 0.95, 'nearly every morphology code in use is explained',
  `${explained} of ${morphUsed.size}`);

const C = JSON.parse(await readFile('data/concordance.json', 'utf8'));
// ---- the Hebrew -------------------------------------------------------------
const H = JSON.parse(await readFile('data/hebrew.json', 'utf8'));
check(H.verses.length === H.offsets.length, 'every Hebrew verse has a starting offset');
check(H.offsets.every((o, i) => i === 0 || o > H.offsets[i - 1]), 'the Hebrew offsets run forward');
check(H.verses.every(v => bible[v] !== undefined), 'every Hebrew verse exists in the text',
  H.verses.filter(v => bible[v] === undefined).slice(0, 3).join(', '));
check(H.verses.every(v => !/^(Matt|Mark|Luke|John|Acts|Rom|[123]?(Cor|Thess|Tim|Pet|John)|Gal|Eph|Phil|Col|Titus|Phlm|Heb|Jas|Jude|Rev)\./.test(v)),
  'the Hebrew is Old Testament only');
for (const k of Object.keys(H.cols))
  check(H.cols[k].length === H.words, `the Hebrew ${k} column has one entry per morpheme`);
for (const k of Object.keys(H.cols))
  check(H.cols[k].every(i => i >= 0 && i < H.pools[k].length), `every Hebrew ${k} index points into its pool`);

// The Atlas shows Old Testament text in exactly one place: a cross-reference preview.
// So what it carries must cover every Old Testament verse its cross-references reach —
// not most of them, all of them, or a reader meets an empty panel.
const crossrefs = JSON.parse(await readFile('data/crossrefs.json', 'utf8'));
const NT = new Set(['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph',
  'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet',
  '2Pet', '1John', '2John', '3John', 'Jude', 'Rev']);
const order = Object.keys(bible), at = new Map(order.map((k, i) => [k, i]));
const reach = new Set();
for (const list of Object.values(crossrefs)) for (const [target] of list) {
  const [from, to] = String(target).split('-');
  const a = at.get(from);
  if (a === undefined) continue;
  const b = to === undefined ? a : (at.get(to) ?? a);
  for (let i = a; i <= b; i++) if (!NT.has(order[i].split('.')[0])) reach.add(order[i]);
}
const have = new Set(H.verses);
const short = [...reach].filter(v => !have.has(v));
check(short.length === 0, 'every Old Testament verse the Atlas can show has its Hebrew',
  short.length + ' missing, e.g. ' + short.slice(0, 4).join(', '));
check(H.verses.every(v => reach.has(v)), 'and nothing is carried that the Atlas cannot show');

// Spot checks anyone can read against a Hebrew Bible.
const heAt = ref => {
  const vi = H.verses.indexOf(ref);
  if (vi < 0) return null;
  const a = H.offsets[vi], b = vi + 1 < H.offsets.length ? H.offsets[vi + 1] : H.words;
  return Array.from({length: b - a}, (_, j) => ({
    word: H.pools.word[H.cols.word[a + j]],
    translit: H.pools.translit[H.cols.translit[a + j]],
    strong: H.pools.strong[H.cols.strong[a + j]]
  }));
};
const gen = heAt('Gen.1.1');
check(!!gen, 'Genesis 1:1 is carried');
if (gen) {
  check(gen.length >= 10, 'Genesis 1:1 has its morphemes, prefixes included', gen.length + ' of them');
  check(gen.map(w => w.word).join('').normalize('NFC').includes('בְּ'.normalize('NFC')),
    'it opens with the preposition written as part of the word');
  check(gen.some(w => w.strong === 'H7225G'), 'rēʾšît is tagged in Genesis 1:1');
  check(gen.some(w => w.strong === 'H1254A' || /^H1254/.test(w.strong || '')), 'bārāʾ is tagged in Genesis 1:1');
  check(gen.every(w => /[֐-׿]/.test(w.word) || !w.word), 'every Hebrew box holds Hebrew script');
}
// Every morpheme that has a Strong number should be one the concordance knows.
const CC = JSON.parse(await readFile('data/concordance.json', 'utf8'));
const unknown = [...new Set(H.pools.strong)].filter(k => k && !CC.lex[k]);
check(unknown.length === 0, 'every Hebrew Strong number is in the shared lexicon', unknown.slice(0, 4).join(', '));

// ---- the concordance -------------------------------------------------------
check(C.keys.length === C.occ.length, 'every Strong number has an occurrence list');
// Four digits for Strong's own range, five for STEPBible's extensions past it.
check(C.keys.every(k => /^[HG]\d{4,5}[A-Za-z]?$/.test(k)), 'every key is a Strong number',
  C.keys.filter(k => !/^[HG]\d{4,5}[A-Za-z]?$/.test(k)).slice(0, 3).join(', '));
check(C.keys.every(k => C.lex[k]), 'every Strong number has a lexicon entry');
check(C.keys.every(k => C.lex[k][1] && C.lex[k][3]), 'every lexicon entry has a word and a gloss',
  C.keys.filter(k => !(C.lex[k][1] && C.lex[k][3])).slice(0, 3).join(', '));
check(C.keys.every((k, i) => i === 0 || k > C.keys[i - 1]), 'the keys are sorted, so a lookup can rely on it');

// Deltas must stay inside the verse list and never run backwards.
let bad = 0, total = 0, maxSeen = -1;
for (const list of C.occ) {
  let p = 0;
  for (const d of list) {
    if (d <= 0 && p !== 0) bad++;
    p += d; total++;
    if (p >= C.verses.length) bad++;
    if (p > maxSeen) maxSeen = p;
  }
}
check(bad === 0, 'every occurrence lands on a real verse, in order', bad + ' bad deltas');
check(total === C.versePairs, 'the index holds the word-in-verse entries it says it does',
  total.toLocaleString() + ' vs ' + C.versePairs.toLocaleString());
// A canary. It was 542,487 until a backslash join was found to be swallowing one Hebrew
// word in seven; the punctuation marks behind those backslashes are now indexed too, as
// the lexicon documents them. If this moves again, something changed in the reading of
// the source and should be understood before the number is edited.
check(C.occurrences === 681423, 'the source carries the occurrence count it did when this was written',
  C.occurrences.toLocaleString());

const canonical = order;
check(C.verses.slice(0, canonical.length).every((v, i) => v === canonical[i]),
  'the concordance numbers verses exactly as the rest of the project does');
const extra = C.verses.slice(canonical.length);
check(extra.every(v => /^Ps\.\d+\.0$/.test(v)), 'anything past the end is a Psalm superscription',
  extra.filter(v => !/^Ps\.\d+\.0$/.test(v)).slice(0, 3).join(', '));
check(extra.length === C.titles.length, 'the superscriptions are listed as such');

// Which verses got nothing, and are they the eight the build says they should be?
const covered = new Set();
for (const list of C.occ) { let p = 0; for (const d of list) { p += d; covered.add(C.verses[p]); } }
const gaps = canonical.filter(v => !covered.has(v));
check(gaps.length === C.joins.length && gaps.every(g => C.joins.includes(g)),
  'the only verses without original-language words are the known versification joins',
  gaps.join(', '));

// Spot checks a reader can verify in any concordance.
const versesOf = k => { const i = C.keys.indexOf(k); if (i < 0) return []; let p = 0; return C.occ[i].map(d => C.verses[p += d]); };
const LEX = [
  ['H2617A', 'che.sed', 'kindness'],
  ['G0026', 'agapē', 'love'],
  ['H7225G', 're.shit', 'beginning'],
  ['G3056', 'logos', 'word']
];
for (const [k, translit, gloss] of LEX) {
  const e = C.lex[k];
  check(!!e, `${k} is in the lexicon`);
  if (!e) continue;
  check(e[2].toLowerCase() === translit.toLowerCase(), `${k} carries its citation transliteration, not an inflected one`, e[2]);
  check(e[3].toLowerCase().includes(gloss), `${k} is glossed as the lexicon glosses it`, e[3]);
  check(versesOf(k).length > 0, `${k} has occurrences`);
}
check(versesOf('H7225G').includes('Gen.1.1'), 'rēʾšît stands in Genesis 1:1');
check(versesOf('G3056').includes('John.1.1'), 'logos stands in John 1:1');
check(versesOf('H4210').some(v => v === 'Ps.3.0'), 'a Psalm superscription is searchable');

// Hebrew affixes are marked, so a search for a word is not buried under the article.
check(C.affixes.length > 0 && C.affixes.every(k => /^H9\d{3}/.test(k)),
  'the Hebrew prefixes, endings and marks are set apart', C.affixes.length + ' codes');
// The punctuation that the backslash joins carries real lexicon entries, and losing it
// again would mean the word it attaches to had gone missing too.
for (const mark of ['H9014', 'H9016'])
  check(!!C.lex[mark] && C.lex[mark][3], `${mark} is indexed with its description`, (C.lex[mark] || [])[3]);
check(!C.affixes.includes('H2617A'), 'a real word is not marked as an affix');

console.log(`${ok.length} checks passed`);
if (fail.length) {
  console.error('\nFAILED:\n  ' + fail.join('\n  '));
  process.exit(1);
}
console.log('Hebrew and Greek data agree with the text they describe.');
