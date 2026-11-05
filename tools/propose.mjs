// A local workbench for proposing typological correspondences.
//
// Runs on your machine, with your own key, and ships with nothing. The Atlas, the
// Lab and Shadow and Substance stay offline and dependency-free; this writes files
// for you to read, and nothing it produces reaches a reader until you move it into
// data/typology.json yourself.
//
// The protocol matters more than the model. A model asked "show me Joseph as a type
// of Christ" will return an impressive, fully verifiable, entirely circular answer,
// because it chooses the motifs with the answer already in view. That is not a
// hypothetical: this repository's own Joseph annotation scores p<0.001 and the
// discovery pass then showed the score was reachable precisely because the annotator
// knew the target. Reference checking catches invention. It does not catch selection.
//
// So the model is never told what a figure is being compared to. It is given one
// passage set, the fixed vocabulary, and asked what that narrative exhibits. Two such
// descriptions are made independently and the overlap is then computed here. The
// match is found rather than supplied.
//
//   export ANTHROPIC_API_KEY=...
//   node tools/propose.mjs describe joseph "Joseph" Gen.37 Gen.39 Gen.40 Gen.41 Gen.42 Gen.45 Gen.50
//   node tools/propose.mjs describe passion "the Passion and after" Matt.26 Matt.27 Matt.28 Luke.23 Luke.24
//   node tools/propose.mjs match joseph passion
//   node tools/propose.mjs list
//
// Offline, to exercise everything but the model call:
//   node tools/propose.mjs describe joseph "Joseph" Gen.37 --from some-answer.json
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const DIR = 'data/proposals';
const bible = JSON.parse(await readFile('data/bible.json', 'utf8'));
const meta = JSON.parse(await readFile('data/metadata.json', 'utf8'));
const VOCAB = JSON.parse(await readFile('data/typology.json', 'utf8')).vocabulary;
const bookName = c => (meta.bookNames?.[c] || c).replace('Revelation of John', 'Revelation');
const label = r => { const [b, c, v] = r.split('.'); return `${bookName(b)} ${c}:${v}`; };
const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// chapter index, for attestation
const chapterOf = new Map(); let nch = 0; const verseChapter = new Map();
for (const key of Object.keys(bible)) {
  const [b, c] = key.split('.'), id = b + '.' + c;
  if (!chapterOf.has(id)) chapterOf.set(id, nch++);
  verseChapter.set(key, chapterOf.get(id));
}
let XREF = null;
const crossrefs = () => {
  if (XREF) return XREF;
  XREF = new Set();
  for (const line of execFileSync('unzip', ['-p', 'source-data/cross-references-2026-11-02.zip'],
                                  {maxBuffer: 1 << 28}).toString('utf8').split('\n')) {
    const [f, t] = line.trim().split('\t');
    if (!f || !t || f === 'From Verse') continue;
    const a = verseChapter.get(f), b = verseChapter.get(t.split('-')[0]);
    if (a !== undefined && b !== undefined) XREF.add(a * 2000 + b);
  }
  return XREF;
};
const joined = (r1, r2) => {
  const s = crossrefs(), a = verseChapter.get(r1), b = verseChapter.get(r2);
  return s.has(a * 2000 + b) || s.has(b * 2000 + a);
};

const versesOf = chapters => {
  const out = [];
  for (const spec of chapters) {
    const [bk, ch] = spec.split('.');
    for (let v = 1; ; v++) {
      const k = `${bk}.${ch}.${v}`;
      if (bible[k] === undefined) break;
      out.push(k);
    }
  }
  if (!out.length) throw new Error('no verses found for ' + chapters.join(' '));
  return out;
};

// ---- the prompt. It must not know what this will be compared with. ---------
function buildPrompt(labelText, keys) {
  const text = keys.map(k => `${k}  ${bible[k]}`).join('\n');
  return `Below is a passage from the American Standard Version, verse by verse, each line beginning with its reference.

Your task is only to describe what happens in it, using a fixed list of labels. For each label in the list that this passage genuinely exhibits, give the single verse where it is clearest and an exact quotation of a few words from that verse.

The labels:
${VOCAB.join(', ')}

Rules:
- Use only labels from that list. Do not invent one, and do not stretch one to fit.
- Use each label at most once.
- The quotation must appear word for word in the verse you cite. It will be checked against the text automatically and the whole answer rejected if it does not.
- Include a label only if a reader of this passage alone would agree it is there. Leave out anything doubtful.
- Order your answer by where each one occurs in the passage, earliest first.

Reply with JSON only, no other text:
{"label": ${JSON.stringify(labelText)}, "motifs": [{"motif": "...", "ref": "Book.Chapter.Verse", "quote": "..."}]}

The passage:
${text}`;
}

async function askModel(prompt) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set. Export it, or pass --from <file> to work offline.');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01'},
    body: JSON.stringify({model, max_tokens: 4000, messages: [{role: 'user', content: prompt}]})
  });
  if (!res.ok) throw new Error(`the model returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  const text = (body.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON in the reply');
  return JSON.parse(m[0]);
}

// ---- verification: the same gate the shipped page uses ---------------------
function verify(desc) {
  const problems = [], seen = new Set();
  const kept = [];
  for (const m of desc.motifs || []) {
    const where = `${desc.label}/${m.motif}`;
    if (!VOCAB.includes(m.motif)) { problems.push(`${where}: not in the vocabulary`); continue; }
    if (seen.has(m.motif)) { problems.push(`${where}: used twice`); continue; }
    const text = bible[m.ref];
    if (text === undefined) { problems.push(`${where}: ${m.ref} is not a verse in the ASV`); continue; }
    if (!norm(text).includes(norm(m.quote))) {
      problems.push(`${where}: the quotation is not in ${m.ref}\n      cited: ${m.quote}\n      ASV:   ${text.slice(0, 110)}`);
      continue;
    }
    seen.add(m.motif); kept.push(m);
  }
  return {kept, problems};
}

const lcs = (A, B) => {
  const d = Array.from({length: A.length + 1}, () => new Int32Array(B.length + 1));
  for (let i = 1; i <= A.length; i++) for (let j = 1; j <= B.length; j++)
    d[i][j] = A[i - 1] === B[j - 1] ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[A.length][B.length];
};
const mulberry = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = (a, r) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) {
  const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };

function compare(A, B) {
  const a0 = A.motifs.map(m => m.motif), b0 = B.motifs.map(m => m.motif);
  const shared = a0.filter(m => b0.includes(m));
  if (!shared.length) return {shared: 0};
  const a = shared, b = b0.filter(m => shared.includes(m));
  const fwd = lcs(a, b), rev = lcs(a, [...b].reverse());
  const run = Math.max(fwd, rev);
  const rnd = mulberry(20261105);
  let ge = 0;
  for (let i = 0; i < 20000; i++) {
    const s = shuffle(b, rnd);
    if (Math.max(lcs(a, s), lcs(a, [...s].reverse())) >= run) ge++;
  }
  let att = 0;
  for (const m of shared)
    if (joined(A.motifs.find(x => x.motif === m).ref, B.motifs.find(x => x.motif === m).ref)) att++;
  return {shared: shared.length, order: run / shared.length, chiastic: rev > fwd,
          p: (ge + 1) / 20001, attested: att, motifs: shared};
}

// ---- commands --------------------------------------------------------------
const [cmd, ...rest] = process.argv.slice(2);
await mkdir(DIR + '/figures', {recursive: true});

if (cmd === 'describe') {
  const fromAt = rest.indexOf('--from');
  const from = fromAt >= 0 ? rest[fromAt + 1] : null;
  const args = fromAt >= 0 ? rest.slice(0, fromAt) : rest;
  const [id, labelText, ...chapters] = args;
  if (!id || !labelText || !chapters.length)
    throw new Error('usage: describe <id> "<label>" <Book.Chapter> …');
  const keys = versesOf(chapters);
  const desc = from ? JSON.parse(await readFile(from, 'utf8'))
                    : await askModel(buildPrompt(labelText, keys));
  desc.label = labelText;
  const {kept, problems} = verify(desc);
  for (const p of problems) console.error('  rejected  ' + p);
  const inRange = kept.filter(m => keys.includes(m.ref));
  for (const m of kept) if (!keys.includes(m.ref))
    console.error(`  rejected  ${desc.label}/${m.motif}: ${m.ref} is outside the passage it was given`);
  const record = {id, label: labelText, chapters, verses: keys.length,
                  describedBlind: true, source: from ? 'file:' + from : 'model',
                  model: from ? null : (process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'),
                  written: new Date().toISOString().slice(0, 10), motifs: inRange};
  await writeFile(`${DIR}/figures/${id}.json`, JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify({id, label: labelText, chapters: chapters.length, verses: keys.length,
    offered: (desc.motifs || []).length, kept: inRange.length, rejected: (desc.motifs || []).length - inRange.length}));
  console.log('  ' + inRange.map(m => m.motif).join(', '));

} else if (cmd === 'match') {
  const [x, y] = rest;
  const load = async i => JSON.parse(await readFile(`${DIR}/figures/${i}.json`, 'utf8'));
  const A = await load(x), B = await load(y);
  const main = compare(A, B);
  // Controls: the same figure against every other description on file.
  const files = (await readdir(DIR + '/figures')).filter(f => f.endsWith('.json'));
  const controls = [];
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    if (id === x || id === y) continue;
    const C = await load(id);
    const r = compare(A, C);
    if (r.shared) controls.push({against: C.label, shared: r.shared, order: r.order, p: r.p});
  }
  const out = {a: A.label, b: B.label, bothDescribedBlind: A.describedBlind && B.describedBlind,
               ...main, controls, written: new Date().toISOString().slice(0, 10)};
  await mkdir(DIR + '/matches', {recursive: true});
  await writeFile(`${DIR}/matches/${x}--${y}.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(`${A.label}  against  ${B.label}`);
  if (!main.shared) { console.log('  nothing in common.'); }
  else {
    console.log(`  ${main.shared} shared  order ${main.order.toFixed(2)}${main.chiastic ? ' (reversed)' : ''}` +
                `  p=${main.p < 0.001 ? '<.001' : main.p.toFixed(3)}  attested ${main.attested}/${main.shared}`);
    console.log('  ' + main.motifs.join(', '));
  }
  if (controls.length) {
    console.log(`  controls — ${A.label} against the other descriptions on file:`);
    for (const c of controls.sort((p, q) => q.shared - p.shared))
      console.log(`     ${String(c.shared).padStart(2)} shared  order ${c.order.toFixed(2)}  ${c.against}`);
  } else console.log('  no other descriptions on file yet, so there is no control.');
  console.log(`\n  Written to ${DIR}/matches/${x}--${y}.json. Nothing reaches a reader until you move it\n` +
              '  into data/typology.json yourself, and only a correspondence a verse asserts belongs in\n' +
              '  Shadow and Substance.');

} else if (cmd === 'list') {
  const files = (await readdir(DIR + '/figures').catch(() => []));
  if (!files.length) console.log('no descriptions yet.');
  for (const f of files.filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(await readFile(`${DIR}/figures/${f}`, 'utf8'));
    console.log(`  ${d.id.padEnd(14)} ${String(d.motifs.length).padStart(2)} motifs  ${d.chapters.join(' ')}`);
  }
} else {
  console.log(await readFile('tools/propose.mjs', 'utf8').then(t => t.split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')));
}
