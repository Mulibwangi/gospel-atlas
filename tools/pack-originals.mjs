// Builds the two original-language datasets the apps embed, from the vendored
// STEPBible extract, and refuses to write either one if the alignment is wrong.
//
//   node tools/pack-originals.mjs
//
//   data/interlinear.json  the Greek of Matthew–John, word by word, for the Atlas
//   data/concordance.json  every Hebrew and Greek word of the whole Bible, by Strong
//                          number, for the Cross-Reference Lab's word search
//
// The verification matters more than the packing. Two independently numbered texts are
// being joined, and a quiet off-by-one in Psalms or at a versification join would attach
// Hebrew to the wrong English verse — in a tool whose whole claim is that it shows what
// the text says, that is the worst failure available. So every reference is resolved
// against data/bible.json, the count of verses that receive no words is compared with
// the eight joins that are known and listed below, and anything else stops the build.
//
// The eight are places where the ASV and the Greek editions divide verses differently,
// not places where text is missing:
//   John 7:53      STEPBible begins the pericope adulterae at 8:1
//   Rom 16:25-27   the doxology, placed elsewhere in the editions STEPBible follows
//   2Cor 13:13-14  NA28 closes the letter in two verses where the ASV uses three
//   Phil 1:16-17   the ASV follows the Traditional order, which swaps these two
import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const ARCHIVE = 'source-data/stepbible-originals-2026-11-08.zip';
const KNOWN_JOINS = ['John.7.53', 'Rom.16.25', 'Rom.16.26', 'Rom.16.27',
                     '2Cor.13.13', '2Cor.13.14', 'Phil.1.16', 'Phil.1.17'];

const read = name => execFileSync('unzip', ['-p', ARCHIVE, name], {maxBuffer: 1 << 29}).toString('utf8');
const rows = text => { const L = text.split('\n'); L.shift(); return L.filter(Boolean).map(l => l.split('\t')); };

const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const meta = JSON.parse(await readFile('data/metadata.json', 'utf8'));
const problems = [];

// ---- the lexicon, shared by both datasets ---------------------------------
const lex = new Map();
for (const [strong, lang, lemma, translit, gloss, sense] of rows(read('lexicon.tsv')))
  lex.set(strong, {lang, lemma, translit, gloss, sense: sense || ''});

// Morphology codes in STEPBible's own words. Codes they do not explain — the crasis
// forms, where two words have merged — are shown as the bare code rather than given an
// expansion of my invention.
const morph = {};
for (const [code, expansion] of rows(read('morphology.tsv'))) morph[code] = expansion;

// ---- the Gospels, word by word --------------------------------------------
// Pools rather than repetition: 66,935 words draw on about 12,000 distinct forms and
// under 3,000 lemmas, so the words themselves become four small integers each.
const pool = () => { const m = new Map(); return {m, id(v) { let i = m.get(v); if (i === undefined) m.set(v, i = m.size); return i; }, list() { return [...m.keys()] }}; };
const P = {greek: pool(), translit: pool(), gloss: pool(), strong: pool(), morph: pool(), lemma: pool(), lgloss: pool(), ms: pool()};
const verses = [], offsets = [], cols = {greek: [], translit: [], gloss: [], strong: [], morph: [], lemma: [], lgloss: [], ms: []};
let last = null, n = 0;
for (const r of rows(read('gospels-greek.tsv'))) {
  const [ref, greek, translit, gloss, strong, morph, lemma, lgloss, ms] = r;
  if (bible[ref] === undefined) { problems.push(`interlinear: ${ref} is not a verse in this project's text`); continue; }
  if (ref !== last) { verses.push(ref); offsets.push(n); last = ref; }
  const v = {greek, translit, gloss, strong, morph, lemma, lgloss, ms};
  for (const k of Object.keys(cols)) cols[k].push(P[k].id(v[k] || ''));
  n++;
}

// ---- the Hebrew, for the verses the Atlas can actually show ---------------
// The Atlas is a map of the Gospels, and the only Old Testament text it ever puts on
// screen is in a cross-reference preview. So the Hebrew it carries is the Hebrew of
// exactly those verses: complete coverage of what the page can display, without the
// four fifths of the Old Testament it has no way to show. The whole Old Testament is
// 5.1 MB packed and would put the emailed archive past what many mail systems accept.
//
// The reachable set is computed from the cross-reference data rather than guessed, so it
// cannot drift: if a future snapshot reaches further, this follows it.
const crossrefs = JSON.parse(await readFile('data/crossrefs.json', 'utf8'));
const NT = new Set(['Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph',
  'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet',
  '2Pet', '1John', '2John', '3John', 'Jude', 'Rev']);
const canonical = Object.keys(bible);
const vindex = new Map(canonical.map((k, i) => [k, i]));
const reachable = new Set();
for (const list of Object.values(crossrefs)) for (const [target] of list) {
  const [from, to] = String(target).split('-');
  const a = vindex.get(from);
  if (a === undefined) continue;
  const b = to === undefined ? a : (vindex.get(to) ?? a);
  for (let i = a; i <= b; i++) {
    const v = canonical[i];
    if (!NT.has(v.split('.')[0])) reachable.add(v);
  }
}

const H = {word: pool(), translit: pool(), gloss: pool(), strong: pool(), morph: pool()};
const hVerses = [], hOffsets = [], hCols = {word: [], translit: [], gloss: [], strong: [], morph: []};
let hLast = null, hn = 0, hSkipped = 0;
for (const r of rows(read('hebrew-ot.tsv'))) {
  const [ref, word, translit, gloss, strong, morph] = r;
  if (bible[ref] === undefined) {
    // Psalm superscriptions have no verse of their own in this text; the concordance
    // keeps them, but the Atlas has nowhere to show one.
    if (!/^Ps\.\d+\.0$/.test(ref)) problems.push(`hebrew: ${ref} is not a verse in this project's text`);
    continue;
  }
  if (!reachable.has(ref)) { hSkipped++; continue; }
  if (ref !== hLast) { hVerses.push(ref); hOffsets.push(hn); hLast = ref; }
  const v = {word, translit, gloss, strong, morph};
  for (const k of Object.keys(hCols)) hCols[k].push(H[k].id(v[k] || ''));
  hn++;
}
const missedReachable = [...reachable].filter(v => !hVerses.includes(v));

// ---- the whole Bible, by Strong number ------------------------------------
// One sorted, delta-coded verse list per Strong number. Delta coding is what makes this
// small: consecutive occurrences are usually a few verses apart, so most deltas are one
// or two digits and gzip does the rest.
const allVerses = [], vi = new Map();
for (const key of canonical) { vi.set(key, allVerses.length); allVerses.push(key); }
// Psalm superscriptions carry real Hebrew that the ASV prints unnumbered above the psalm.
// They are kept, with an id of their own, rather than dropped or folded into verse 1.
const titles = new Set();
const hits = new Map();
let occurrences = 0, titleWords = 0;
for (const [ref, strong] of rows(read('strongs-occurrences.tsv'))) {
  let at = vi.get(ref);
  if (at === undefined) {
    const m = ref.match(/^Ps\.(\d+)\.0$/);
    if (!m) { problems.push(`concordance: ${ref} is not a verse in this project's text`); continue; }
    vi.set(ref, at = allVerses.length); allVerses.push(ref); titles.add(ref);
  }
  if (titles.has(ref)) titleWords++;
  if (!lex.has(strong)) { problems.push(`concordance: ${strong} has no lexicon entry`); continue; }
  let a = hits.get(strong); if (!a) hits.set(strong, a = []);
  a.push(at); occurrences++;
}
const keys = [...hits.keys()].sort();
const packed = keys.map(k => {
  const uniq = [...new Set(hits.get(k))].sort((a, b) => a - b);
  let prev = 0; return uniq.map(v => { const d = v - prev; prev = v; return d; });
});

// ---- does every verse that should have words have them? --------------------
const covered = new Set();
packed.forEach(deltas => { let p = 0; for (const d of deltas) { p += d; covered.add(allVerses[p]); } });
const gaps = Object.keys(bible).filter(v => !covered.has(v));
const unexpected = gaps.filter(g => !KNOWN_JOINS.includes(g));
const vanished = KNOWN_JOINS.filter(g => covered.has(g));
if (unexpected.length)
  problems.push(`${unexpected.length} verse(s) received no original-language words and are not known versification joins: ${unexpected.slice(0, 8).join(', ')}`);
if (vanished.length)
  problems.push(`these were listed as versification joins but did receive words, so the list is out of date: ${vanished.join(', ')}`);

// Every quotation of a gloss must come from the lexicon; nothing is written here that
// the source did not say.
for (const [k, v] of lex) if (!/^[HG]\d{3,5}[A-Za-z]?$/.test(k)) problems.push(`lexicon: ${k} is not a Strong number`);

if (problems.length) {
  console.error('FAILED verification:\n  ' + problems.slice(0, 20).join('\n  '));
  if (problems.length > 20) console.error(`  …and ${problems.length - 20} more`);
  process.exit(1);
}

// H9001-H9044 are not Strong numbers. They are STEPBible's codes for the Hebrew
// prefixes, suffixes and pronominal endings that English turns into separate words —
// the "and", "the", "in", "his". They are real morphemes and are indexed like any
// other, but they are marked, because a search for a word should not be buried under
// fifteen thousand verses containing the letter waw.
const lexOut = {};
const affixes = [];
for (const k of keys) {
  const e = lex.get(k);
  lexOut[k] = [e.lang === 'he' ? 1 : 0, e.lemma, e.translit, e.gloss, e.sense];
  if (/^H9\d{3}/.test(k)) affixes.push(k);
}

const stamp = src => createHash('sha256').update(JSON.stringify(src)).digest('hex').slice(0, 7);

const interlinear = {
  note: 'Greek of Matthew to John, word by word. ' + meta.snapshot,
  attribution: 'STEPBible.org / Tyndale House, Cambridge — CC BY 4.0',
  verses, offsets, words: n,
  pools: Object.fromEntries(Object.keys(P).map(k => [k, P[k].list()])),
  cols, morph,
  joins: KNOWN_JOINS.filter(j => j.startsWith('John'))
};
interlinear.built = stamp(interlinear);

const concordance = {
  note: 'Every Hebrew and Greek word of the Bible, by Strong number. ' + meta.snapshot,
  attribution: 'STEPBible.org / Tyndale House, Cambridge — CC BY 4.0',
  verses: allVerses, titles: [...titles], keys, occ: packed, lex: lexOut,
  affixes, joins: KNOWN_JOINS,
  // Two different counts, because they answer two different questions. "occurrences"
  // is how many tagged words stand in the text; "versePairs" is how many word-in-verse
  // entries the index holds, which is smaller because a word used twice in one verse
  // is listed once.
  occurrences, versePairs: packed.reduce((n, a) => n + a.length, 0)
};
concordance.built = stamp(concordance);

const hebrew = {
  note: 'Hebrew of the Old Testament verses the Gospel cross-references reach. ' + meta.snapshot,
  attribution: 'STEPBible.org / Tyndale House, Cambridge — CC BY 4.0; Westminster Leningrad Codex',
  verses: hVerses, offsets: hOffsets, words: hn,
  pools: Object.fromEntries(Object.keys(H).map(k => [k, H[k].list()])),
  cols: hCols,
  // Verses in the Old Testament that no Gospel cross-reference reaches, and so are not
  // carried. The page says so rather than showing an empty panel.
  notCarried: 23145 - hVerses.length
};
hebrew.built = stamp(hebrew);

// The lexicon on its own, for the Atlas, so a word can be looked up in both languages
// whether or not it happens to stand in a verse this file carries. 526 KB packed, and
// without it a search for "yoke" finds the Greek and misses the Hebrew, which is the
// one thing such a search exists to do.
await writeFile('data/lexicon.json', JSON.stringify({
  note: 'Every Hebrew and Greek word, by Strong number. ' + meta.snapshot,
  attribution: concordance.attribution,
  lex: lexOut, affixes, built: stamp(lexOut)
}));
await writeFile('data/hebrew.json', JSON.stringify(hebrew));
await writeFile('data/interlinear.json', JSON.stringify(interlinear));
await writeFile('data/concordance.json', JSON.stringify(concordance));

console.log(JSON.stringify({
  gospelGreekWords: n,
  gospelVersesWithGreek: verses.length,
  distinctForms: P.greek.list().length,
  distinctLemmas: P.lemma.list().length,
  morphCodes: P.morph.list().filter(Boolean).length,
  morphCodesExplained: P.morph.list().filter(c => morph[c]).length,
  occurrences,
  strongNumbers: keys.length,
  hebrew: keys.filter(k => k[0] === 'H').length,
  greek: keys.filter(k => k[0] === 'G').length,
  hebrewMorphemesCarried: hn, hebrewVersesCarried: hVerses.length,
  hebrewMorphemesOutsideReach: hSkipped,
  reachableOldTestamentVerses: reachable.size,
  reachableVersesWithNoHebrew: missedReachable.length,
  psalmTitles: titles.size, psalmTitleWords: titleWords, affixCodes: affixes.length,
  versificationJoins: gaps.length,
  interlinearKB: Math.round(JSON.stringify(interlinear).length / 1024),
  concordanceKB: Math.round(JSON.stringify(concordance).length / 1024)
}, null, 1));
