// Checks and measures the typological claims transcribed in data/typology-sources.json.
//
// These come from published reference works, not from the annotator, which is the
// point: the list of what is claimed is somebody else's. What this adds is the two
// things a reference work cannot do for itself — confirm that every reference it
// prints actually resolves, and report whether the cross-reference data joins the
// two halves of each claim.
//
// Run:  node tools/typology-sources.mjs
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const DB = JSON.parse(await readFile('data/typology-sources.json', 'utf8'));

const BOOK = {
  'genesis':'Gen','exodus':'Exod','leviticus':'Lev','numbers':'Num','deuteronomy':'Deut',
  'joshua':'Josh','judges':'Judg','ruth':'Ruth','1 samuel':'1Sam','2 samuel':'2Sam',
  '1 kings':'1Kgs','2 kings':'2Kgs','1 chronicles':'1Chr','2 chronicles':'2Chr','ezra':'Ezra',
  'nehemiah':'Neh','esther':'Esth','job':'Job','psalm':'Ps','psalms':'Ps','proverbs':'Prov',
  'ecclesiastes':'Eccl','song of solomon':'Song','isaiah':'Isa','jeremiah':'Jer',
  'lamentations':'Lam','ezekiel':'Ezek','daniel':'Dan','hosea':'Hos','joel':'Joel','amos':'Amos',
  'obadiah':'Obad','jonah':'Jonah','micah':'Mic','nahum':'Nah','habakkuk':'Hab','zephaniah':'Zeph',
  'haggai':'Hag','zechariah':'Zech','malachi':'Mal','matthew':'Matt','mark':'Mark','luke':'Luke',
  'john':'John','acts':'Acts','romans':'Rom','1 corinthians':'1Cor','2 corinthians':'2Cor',
  'galatians':'Gal','ephesians':'Eph','philippians':'Phil','colossians':'Col',
  '1 thessalonians':'1Thess','2 thessalonians':'2Thess','1 timothy':'1Tim','2 timothy':'2Tim',
  'titus':'Titus','philemon':'Phlm','hebrews':'Heb','james':'Jas','1 peter':'1Pet','2 peter':'2Pet',
  '1 john':'1John','2 john':'2John','3 john':'3John','jude':'Jude','revelation':'Rev'
};
// chapter index and testament boundary, from the ASV itself
const chapterOf = new Map(); let nch = 0;
const verseChapter = new Map(); const chapterName = [];
for (const key of Object.keys(bible)) {
  const [b, c] = key.split('.'), id = b + '.' + c;
  if (!chapterOf.has(id)) { chapterOf.set(id, nch++); chapterName.push(id); }
  verseChapter.set(key, chapterOf.get(id));
}
const NT = chapterOf.get('Matt.1');

// "Isaiah 22:20-22" / "Genesis 4:8" -> list of ASV verse keys
function parse(ref) {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) return {error: 'unparsed'};
  const code = BOOK[m[1].toLowerCase().trim()];
  if (!code) return {error: 'unknown book ' + m[1]};
  const ch = +m[2], from = +m[3], to = m[4] ? +m[4] : +m[3];
  const keys = [], missing = [];
  for (let v = from; v <= to; v++) {
    const k = `${code}.${ch}.${v}`;
    if (bible[k] !== undefined) keys.push(k); else missing.push(k);
  }
  return {keys, missing};
}

const pairs = new Map();
for (const line of execFileSync('unzip', ['-p', 'source-data/cross-references-2026-11-02.zip'], {maxBuffer: 1 << 28}).toString('utf8').split('\n')) {
  const [f, t] = line.trim().split('\t');
  if (!f || !t || f === 'From Verse') continue;
  const a = verseChapter.get(f), b = verseChapter.get(t.split('-')[0]);
  if (a === undefined || b === undefined) continue;
  const k = Math.min(a, b) * 2000 + Math.max(a, b);
  pairs.set(k, (pairs.get(k) || 0) + 1);
}
const joined = (a, b) => pairs.get(Math.min(a, b) * 2000 + Math.max(a, b)) || 0;

const notes = [], rows = [];
for (const c of DB.claims) {
  const ot = new Set(), nt = new Set();
  for (const ref of c.refs) {
    const r = parse(ref);
    if (r.error) { notes.push(`${c.type}: ${ref} — ${r.error}`); continue; }
    for (const k of r.missing) notes.push(`${c.type}: ${k} is not in the ASV (the source follows the King James versification)`);
    for (const k of r.keys) (verseChapter.get(k) >= NT ? nt : ot).add(verseChapter.get(k));
  }
  if (!ot.size || !nt.size) { rows.push({type: c.type, one: true, ot: ot.size, nt: nt.size}); continue; }
  let best = 0, total = 0, where = '';
  for (const a of ot) for (const b of nt) {
    const n = joined(a, b); total += n;
    if (n > best) { best = n; where = chapterName[a] + ' / ' + chapterName[b]; }
  }
  rows.push({type: c.type, ot: ot.size, nt: nt.size, total, best, where});
}

const twoSided = rows.filter(r => !r.one);
const corroborated = twoSided.filter(r => r.total > 0);
console.log(JSON.stringify({
  source: DB.sources[0].id, claims: DB.claims.length,
  bothTestaments: twoSided.length, onlyOneSide: rows.length - twoSided.length,
  corroboratedByCrossReferences: corroborated.length,
  referenceProblems: notes.length
}));
if (notes.length) { console.log('\nreference problems:'); for (const n of notes) console.log('   ' + n); }

console.log('\nclaims whose two halves the cross-references join most strongly:');
for (const r of [...corroborated].sort((a, b) => b.best - a.best).slice(0, 12))
  console.log('   ' + String(r.best).padStart(3) + ' links   ' + r.type.padEnd(42) + r.where);
const none = twoSided.filter(r => r.total === 0);
console.log('\nclaims the cross-references do not join at all (' + none.length + '):');
for (const r of none) console.log('   ' + r.type);
const oneSided = rows.filter(r => r.one);
if (oneSided.length) {
  console.log('\nclaims the source anchors on one testament only, so there is nothing to join (' + oneSided.length + '):');
  for (const r of oneSided) console.log('   ' + r.type + '  (' + r.ot + ' Old Testament, ' + r.nt + ' New)');
}
