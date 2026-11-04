// Checks for the Cross-Reference Lab.
//
// The Lab is one self-contained HTML file, so there is nothing to import. Rather
// than restate its logic here — which would only test the restatement — this pulls
// the named functions verbatim out of src/crossrefs-page.html and runs them against
// the real payload the packer builds. If the page changes, these run the change.
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const SNAPSHOT = 'source-data/cross-references-2026-11-02.zip';
const page = await readFile('src/crossrefs-page.html', 'utf8');

// Lift a top-level function out of the page. They are written one per block with the
// closing brace in the first column, which is a far steadier mark than brace counting
// across a file whose comments contain apostrophes and whose code contains regexes.
function lift(name) {
  const start = page.indexOf('\nfunction ' + name + '(');
  assert(start >= 0, 'function ' + name + ' not found in src/crossrefs-page.html');
  const end = page.indexOf('\n}\n', start);
  assert(end > start, 'could not find the end of ' + name);
  const src = page.slice(start + 1, end + 3);
  assert(src.split('\n').length < 80, name + ' lifted ' + src.split('\n').length + ' lines — the marker moved');
  return src;
}

// ---- the same data the page decodes, built the same way -------------------
const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const meta = JSON.parse(await readFile('data/metadata.json', 'utf8'));
const verseKeys = Object.keys(bible);
const verseIndex = new Map(verseKeys.map((k, i) => [k, i]));
const BOOKS = [], CHAPTERS = [], chapterIndex = new Map(), bookIndex = new Map();
for (const key of verseKeys) {
  const [b, c] = key.split('.');
  if (!bookIndex.has(b)) { bookIndex.set(b, BOOKS.length); BOOKS.push({code: b, name: meta.bookNames?.[b] || b, first: CHAPTERS.length, chapters: 0}); }
  const id = b + '.' + c;
  if (!chapterIndex.has(id)) { chapterIndex.set(id, CHAPTERS.length); CHAPTERS.push(0); BOOKS[bookIndex.get(b)].chapters++; }
  CHAPTERS[chapterIndex.get(id)]++;
}
const N = CHAPTERS.length;
const TEXT = verseKeys.map(k => bible[k]);
const BOOK_BY_CODE = new Map(BOOKS.map((b, i) => [b.code, i]));
const CHAPTER_START = new Int32Array(N);
for (let c = 1, run = CHAPTERS[0]; c < N; c++) { CHAPTER_START[c] = run; run += CHAPTERS[c]; }
const CHAPTER_OF_VERSE = new Int16Array(TEXT.length);
for (let c = 0, v = 0; c < N; c++) for (let k = 0; k < CHAPTERS[c]; k++) CHAPTER_OF_VERSE[v++] = c;

// Verse links from the tracked snapshot, in the packer's order.
const lastVerseOfChapter = new Map();
verseKeys.forEach((k, i) => { const [b, c] = k.split('.'); lastVerseOfChapter.set(b + '.' + c, i); });
const rows = [];
for (const line of execFileSync('unzip', ['-p', SNAPSHOT], {maxBuffer: 1 << 28}).toString('utf8').split('\n')) {
  const [from, to, votes] = line.trim().split('\t');
  if (!from || !to || from === 'From Verse') continue;
  const a = verseIndex.get(from), parts = to.split('-'), s = verseIndex.get(parts[0]);
  if (a === undefined || s === undefined) continue;
  let e = s;
  if (parts[1] !== undefined) {
    const exact = verseIndex.get(parts[1]);
    if (exact !== undefined) e = exact;
    else { const [b, c] = parts[1].split('.'); const f = lastVerseOfChapter.get(b + '.' + c); if (f !== undefined && f > s) e = f; }
  }
  rows.push([a, s, Math.max(s, e) - s, Number(votes) || 0]);
}
rows.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
const COUNT = rows.length;
const VL_FROM = new Int32Array(COUNT), VL_TO = new Int32Array(COUNT),
      VL_SPAN = new Int16Array(COUNT), VL_VOTES = new Int16Array(COUNT);
rows.forEach((r, i) => { VL_FROM[i] = r[0]; VL_TO[i] = r[1]; VL_SPAN[i] = r[2]; VL_VOTES[i] = Math.min(32767, r[3]); });
const PAIR_COUNT = new Map();
for (let i = 0; i < COUNT; i++) {
  const a = CHAPTER_OF_VERSE[VL_FROM[i]], b = CHAPTER_OF_VERSE[VL_TO[i]], key = a * 2000 + b;
  const row = PAIR_COUNT.get(key);
  if (row) { row[2]++; row[3] += VL_VOTES[i]; } else PAIR_COUNT.set(key, [a, b, 1, VL_VOTES[i]]);
}
const pairCount = (a, b) => { const r = PAIR_COUNT.get(a * 2000 + b); return r ? r[2] : 0; };
const state = {min: 1, focus: null, dir: 'both'};

// The chapter index is built by the page, so lift that too rather than restating it.
const idxStart = page.indexOf('const FROM_AT=(()=>{');
assert(idxStart >= 0, 'FROM_AT index not found in src/crossrefs-page.html');
const idxEnd = page.indexOf('\n})();', idxStart);
assert(idxEnd > idxStart, 'could not find the end of the FROM_AT index');
const FROM_AT = new Function('COUNT', 'CHAPTER_OF_VERSE', 'VL_FROM', 'N',
  page.slice(idxStart, idxEnd + 6) + '\nreturn FROM_AT;')(COUNT, CHAPTER_OF_VERSE, VL_FROM, N);
assert(FROM_AT, 'the links should be in source order, so the index should build');

const ctx = {BOOKS, CHAPTERS, N, TEXT, BOOK_BY_CODE, CHAPTER_START, CHAPTER_OF_VERSE,
             COUNT, VL_FROM, VL_TO, VL_SPAN, VL_VOTES, PAIR_COUNT, pairCount, state, FROM_AT};
const load = names => {
  const body = names.map(lift).join('\n') + '\nreturn {' + names.join(',') + '};';
  return new Function(...Object.keys(ctx), body)(...Object.values(ctx));
};

// ---- resolveRef: a verse must sit inside its own chapter ------------------
const {resolveRef} = load(['resolveRef']);
const ch = code => BOOKS[BOOK_BY_CODE.get(code)];
assert.equal(resolveRef('Gen.1.1').verse, 0, 'Genesis 1:1 is the first verse');
assert.equal(TEXT[resolveRef('John.1.29').verse].slice(0, 20), 'On the morrow he see');
for (const [ref, why] of [
  ['Gen.1.32', 'Genesis 1 has 31 verses'],
  ['Gen.50.27', 'Genesis 50 has 26 verses'],
  ['3John.1.15', 'the ASV ends 3 John at verse 14'],
  ['Ps.117.3', 'Psalm 117 has 2 verses'],
  ['John.1.52', 'John 1 has 51 verses'],
  ['Gen.51.1', 'Genesis has 50 chapters'],
  ['Gen.0.1', 'there is no chapter 0'],
  ['Gen.1.0', 'there is no verse 0'],
  ['Gen.1.-1', 'a negative verse'],
  ['Gen.x.1', 'a non-numeric chapter'],
  ['Gen.1.y', 'a non-numeric verse'],
  ['Nope.1.1', 'an unknown book'],
]) assert.equal(resolveRef(ref), null, ref + ' must be rejected: ' + why);
// Every chapter's last verse resolves and its successor does not.
for (let c = 0; c < N; c++) {
  const b = BOOKS[CHAPTER_OF_VERSE[CHAPTER_START[c]] !== undefined ? 0 : 0];
  void b;
}
for (const bk of BOOKS) for (let c = 1; c <= bk.chapters; c++) {
  const last = CHAPTERS[bk.first + c - 1];
  assert(resolveRef(`${bk.code}.${c}.${last}`), `${bk.code} ${c}:${last} should resolve`);
  assert.equal(resolveRef(`${bk.code}.${c}.${last + 1}`), null, `${bk.code} ${c}:${last + 1} should not resolve`);
}

// ---- every shipped chain and origin reference is real ---------------------
const refsIn = block => [...block.matchAll(/'([1-3]?[A-Za-z]+\.\d+\.\d+)'/g)].map(m => m[1]);
const chainBlock = page.slice(page.indexOf('const CHAINS='), page.indexOf('const BOOK_BY_CODE='));
const chainRefs = refsIn(chainBlock);
assert(chainRefs.length > 80, 'expected the chains and origin sets to carry their references');
for (const ref of chainRefs) {
  const at = resolveRef(ref);
  assert(at, 'shipped reference does not resolve: ' + ref);
  assert.equal(CHAPTER_OF_VERSE[at.verse], at.chapter, ref + ' resolves outside its own chapter');
}

// ---- findLinks: the indexed lookup must equal the full scan ---------------
const {findLinks} = load(['findLinks']);
function scan(aFrom, aTo, bFrom, bTo) {        // the original exhaustive form
  const found = [];
  for (let i = 0; i < COUNT; i++) {
    const ca = CHAPTER_OF_VERSE[VL_FROM[i]], cb = CHAPTER_OF_VERSE[VL_TO[i]];
    const forward = ca >= aFrom && ca <= aTo && cb >= bFrom && cb <= bTo;
    const back = ca >= bFrom && ca <= bTo && cb >= aFrom && cb <= aTo;
    if (!forward && !back) continue;
    if (pairCount(ca, cb) < state.min) continue;
    if (state.focus) {
      if (state.dir === 'out' && !forward) continue;
      if (state.dir === 'in' && !back) continue;
    }
    found.push(i);
  }
  found.sort((x, y) => VL_VOTES[y] - VL_VOTES[x] || VL_FROM[x] - VL_FROM[y] || x - y);
  return found;
}
const chapterOf = ref => { const a = resolveRef(ref); assert(a, ref); return a.chapter; };
const cases = [];
const named = [['Amos.6.1', 'Luke.12.1'], ['Isa.53.1', 'Matt.1.1'], ['Gen.1.1', 'Rev.22.1'],
               ['Ps.22.1', 'John.19.1'], ['Jonah.1.1', 'Matt.12.1'], ['Obad.1.1', 'Jer.49.1']];
for (const [a, b] of named) cases.push([chapterOf(a), chapterOf(a), chapterOf(b), chapterOf(b)]);
const book = code => [ch(code).first, ch(code).first + ch(code).chapters - 1];
for (const [a, b] of [['Amos', 'Luke'], ['Rev', 'Isa'], ['Jude', 'Gen'], ['Phlm', 'Col'], ['Obad', 'Obad']]) {
  const [af, at] = book(a), [bf, bt] = book(b);
  cases.push([af, at, bf, bt]);
}
cases.push([ch('Gen').first, ch('Deut').first + ch('Deut').chapters - 1,
            ch('Matt').first, ch('Rev').first + ch('Rev').chapters - 1]);   // Law against the New Testament
cases.push([0, N - 1, 0, N - 1]);                                            // everything
cases.push([ch('Isa').first, ch('Isa').first + 10, ch('Isa').first + 5, ch('Isa').first + 20]); // overlapping
cases.push([ch('Obad').first, ch('Obad').first, ch('Phlm').first, ch('Phlm').first]);           // expected empty
let checks = 0, scanMs = 0, idxMs = 0, sawEmpty = false, sawFull = false;
for (const min of [1, 2, 5, 40]) for (const [dir, focus] of [['both', null], ['out', {}], ['in', {}]]) {
  state.min = min; state.dir = dir; state.focus = focus;
  for (const [aF, aT, bF, bT] of cases) {
    let t = process.hrtime.bigint();
    const want = scan(aF, aT, bF, bT);
    scanMs += Number(process.hrtime.bigint() - t) / 1e6;
    t = process.hrtime.bigint();
    const got = findLinks(aF, aT, bF, bT);
    idxMs += Number(process.hrtime.bigint() - t) / 1e6;
    assert.deepEqual(Array.from(got), Array.from(want),
      `findLinks differs from the full scan at min=${min} dir=${dir} range ${aF}-${aT} x ${bF}-${bT}`);
    if (!want.length) sawEmpty = true;
    if (want.length > 1000) sawFull = true;
    checks++;
  }
}
state.min = 1; state.dir = 'both'; state.focus = null;
assert(sawEmpty, 'the comparison should include a case with no results');
assert(sawFull, 'the comparison should include a large result set');
const amos = findLinks(chapterOf('Amos.6.1'), chapterOf('Amos.6.1'), chapterOf('Luke.12.1'), chapterOf('Luke.12.1'));
assert(amos.length > 0, 'Amos 6 and Luke 12 should share at least one link');

// Timed by the shape of the question, because one average over all shapes hides which
// ones got faster. Selecting a chapter is the interactive case; the whole canon against
// itself cannot be narrowed at all and is reported so rather than left out.
const bench = (label, aF, aT, bF, bT, reps) => {
  let t = process.hrtime.bigint();
  for (let r = 0; r < reps; r++) scan(aF, aT, bF, bT);
  const s = Number(process.hrtime.bigint() - t) / 1e6 / reps;
  t = process.hrtime.bigint();
  for (let r = 0; r < reps; r++) findLinks(aF, aT, bF, bT);
  const x = Number(process.hrtime.bigint() - t) / 1e6 / reps;
  assert.deepEqual(Array.from(findLinks(aF, aT, bF, bT)), Array.from(scan(aF, aT, bF, bT)), label);
  return {case: label, scanMs: +s.toFixed(2), indexedMs: +x.toFixed(2), speedup: +(s / Math.max(x, 0.0001)).toFixed(1)};
};
const a6 = chapterOf('Amos.6.1'), l12 = chapterOf('Luke.12.1');
const timings = [
  bench('Amos 6 to Luke 12 (two chapters)', a6, a6, l12, l12, 40),
  bench('Isaiah 53 to the whole New Testament', chapterOf('Isa.53.1'), chapterOf('Isa.53.1'),
        ch('Matt').first, ch('Rev').first + ch('Rev').chapters - 1, 40),
  bench('Amos against Luke (two books)', ...book('Amos'), ...book('Luke'), 40),
  bench('the Law against the New Testament', ch('Gen').first, ch('Deut').first + ch('Deut').chapters - 1,
        ch('Matt').first, ch('Rev').first + ch('Rev').chapters - 1, 10),
  bench('the whole canon against itself', 0, N - 1, 0, N - 1, 5),
];

console.log(JSON.stringify({
  verseLinks: COUNT, chapterPairs: PAIR_COUNT.size,
  findLinksChecks: checks, identicalToFullScan: true,
  amosLukeLinks: amos.length
}));
for (const t of timings) console.log('  ' + String(t.speedup + '×').padStart(7) +
  '  ' + String(t.scanMs).padStart(8) + ' ms → ' + String(t.indexedMs).padStart(7) + ' ms   ' + t.case);
console.log('PASS: chapter-bounded references, shipped chain references, findLinks equals the full scan');
