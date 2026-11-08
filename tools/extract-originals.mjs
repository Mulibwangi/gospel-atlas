// Pulls the Greek and Hebrew out of the STEPBible Translators Amalgamated texts and
// writes the two files the packers need. Run once, against a clone of
// https://github.com/STEPBible/STEPBible-Data; the result is vendored into
// source-data/ so that a build never depends on a network or on a 100 MB checkout.
//
//   node tools/extract-originals.mjs /path/to/STEPBible-Data
//
// Two things about this data are worth knowing before reading the code.
//
// The Greek and Hebrew files do not share a column layout. In the Greek, column 3 is
// "G0976=N-NSF" (Strong number and morphology together) and column 4 is "lemma=gloss".
// In the Hebrew, the gloss is column 3, the Strong numbers are column 4, the morphology
// is column 5, and the lemmas are expanded in column 11. Reading the Hebrew with the
// Greek's layout silently produces nonsense, so each is parsed on its own terms.
//
// A Hebrew row can carry several morphemes joined by "/" — "בְּ/רֵאשִׁית" is a preposition
// and a noun, tagged "H9003/{H7225G}". For a word search those are two separate words
// and both are indexed; the braces mark which one STEPBible considers the head.
//
// A backslash is a different join: it attaches a punctuation mark to the word before it.
// "הָ/אָרֶץ\׃" is "the" plus "earth" plus the verse-end mark, tagged
// "H9009/{H0776G}\H9016", and "עַל\־" is "upon" plus a maqqef. The mark has a code of
// its own but no transliteration, gloss or morphology slot, so splitting on "/" alone
// leaves "{H0776G}\H9016" as one token that matches no Strong number and is dropped —
// taking the word with it. That lost 63,712 Hebrew words, one in seven, from the index.
// Punctuation is therefore separated for indexing and kept attached for display, which
// is how a Hebrew Bible prints it.
import {readFileSync, readdirSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';

const root = process.argv[2];
if (!root) { console.error('usage: node tools/extract-originals.mjs /path/to/STEPBible-Data'); process.exit(1); }
const dir = join(root, 'Translators Amalgamated OT+NT');

// STEPBible's three-letter codes to the codes this project already uses everywhere.
export const BOOK = {
  Gen: 'Gen', Exo: 'Exod', Lev: 'Lev', Num: 'Num', Deu: 'Deut', Jos: 'Josh', Jdg: 'Judg',
  Rut: 'Ruth', '1Sa': '1Sam', '2Sa': '2Sam', '1Ki': '1Kgs', '2Ki': '2Kgs', '1Ch': '1Chr',
  '2Ch': '2Chr', Ezr: 'Ezra', Neh: 'Neh', Est: 'Esth', Job: 'Job', Psa: 'Ps', Pro: 'Prov',
  Ecc: 'Eccl', Sng: 'Song', Isa: 'Isa', Jer: 'Jer', Lam: 'Lam', Ezk: 'Ezek', Dan: 'Dan',
  Hos: 'Hos', Jol: 'Joel', Amo: 'Amos', Oba: 'Obad', Jon: 'Jonah', Mic: 'Mic', Nam: 'Nah',
  Hab: 'Hab', Zep: 'Zeph', Hag: 'Hag', Zec: 'Zech', Mal: 'Mal', Mat: 'Matt', Mrk: 'Mark',
  Luk: 'Luke', Jhn: 'John', Act: 'Acts', Rom: 'Rom', '1Co': '1Cor', '2Co': '2Cor', Gal: 'Gal',
  Eph: 'Eph', Php: 'Phil', Col: 'Col', '1Th': '1Thess', '2Th': '2Thess', '1Ti': '1Tim',
  '2Ti': '2Tim', Tit: 'Titus', Phm: 'Phlm', Heb: 'Heb', Jas: 'Jas', '1Pe': '1Pet',
  '2Pe': '2Pet', '1Jn': '1John', '2Jn': '2John', '3Jn': '3John', Jud: 'Jude', Rev: 'Rev'
};

const STRONG = /^[HG]\d{3,5}[A-Za-z]?$/;
const bare = s => s.replace(/[{}()[\]]/g, '').trim();
const tidy = s => (s || '').replace(/[\t\r]+/g, ' ').trim();

const gospelRows = [];   // every Greek word of Matthew–John, in order
const hebrewRows = [];   // every Hebrew morpheme of the Old Testament, in order
const occurrences = [];  // every Strong number occurrence in the whole Bible
const lex = new Map();   // Strong number -> lemma, transliteration, gloss

let lines = 0, skipped = 0;
for (const file of readdirSync(dir).filter(f => /^TA(GNT|HOT) /.test(f)).sort()) {
  const hebrew = file.startsWith('TAHOT');
  for (const L of readFileSync(join(dir, file), 'utf8').split('\n')) {
    const head = L.match(/^(\w+)\.(\d+)\.(\d+)[#(]/);
    if (!head) continue;
    lines++;
    const book = BOOK[head[1]];
    if (!book) { skipped++; continue; }
    const ref = `${book}.${head[2]}.${head[3]}`;
    const c = L.split('\t');

    if (hebrew) {
      // ref, word, transliteration, gloss, Strongs, morphology, …, lemma expansion
      const forms = tidy(c[1]).split('/'), trans = tidy(c[2]).split('/'), glosses = tidy(c[3]).split('/');
      const codes = tidy(c[4]).split('/'), morphs = tidy(c[5]).replace(/^H/, '').split('/');
      const expansion = tidy(c[11]);
      // Every morpheme is a word of the interlinear, affixes included: the Hebrew
      // writes "and", "the", "in" and "his" as part of the word they attach to, and a
      // word-by-word view that silently dropped them would not be the verse.
      const n = Math.max(forms.length, codes.length);
      for (let i = 0; i < n; i++) {
        // The mark stays on the word; the backslash that joined them does not.
        const form = tidy(forms[i] || '').replace(/\\/g, '');
        // The word's own code is the first Strong number in the group; anything after
        // the backslash is the punctuation that follows it.
        const word = (codes[i] || '').split('\\').map(bare).find(x => STRONG.test(x)) || '';
        hebrewRows.push([ref, form, tidy(trans[i] || '').replace(/^\.|\.$/g, ''),
                         tidy(glosses[i] || ''), word, tidy(morphs[i] || '')]);
      }
      codes.forEach((raw, i) => {
        for (const piece of String(raw).split('\\')) {
        const st = bare(piece);
        if (!STRONG.test(st)) continue;
        occurrences.push([ref, st]);
        if (!lex.has(st)) {
          // The expansion lists one entry per morpheme, separated by "/", with the head
          // word in braces:  H9003=ב=in/{H7225G=רֵאשִׁית=: beginning»first:1_beginning}
          // So a gloss ends at a brace OR at the slash that starts the next morpheme —
          // stopping only at the brace swallows the entry after it.
          const m = expansion.match(new RegExp('\\{?' + st + '=([^=]*)=([^}/]*)'));
          lex.set(st, {
            lemma: m ? bare(m[1]) : bare(forms[i] || ''),
            translit: tidy(trans[i] || '').replace(/^\.|\.$/g, ''),
            gloss: m ? m[2].split('»')[0].replace(/^[:\s]+/, '').split(':')[0].trim() : tidy(glosses[i] || ''),
            morph: tidy(morphs[i] || ''), lang: 'he'
          });
        }
        }
      });
    } else {
      // ref, "word (translit)", gloss, "Strong=morphology", "lemma=gloss", manuscripts
      const wm = tidy(c[1]).match(/^(.*?)\s*\(([^()]*)\)\s*$/);
      const greek = wm ? wm[1].trim() : tidy(c[1]);
      const translit = wm ? wm[2].trim() : '';
      const [st, morph] = tidy(c[3]).split('=');
      const [lemma, lgloss] = tidy(c[4]).split('=');
      const code = bare(st || '');
      if (STRONG.test(code)) {
        occurrences.push([ref, code]);
        if (!lex.has(code)) lex.set(code, {
          lemma: tidy(lemma), translit, gloss: tidy(lgloss), morph: tidy(morph), lang: 'el'
        });
      }
      if (['Matt', 'Mark', 'Luke', 'John'].includes(book))
        gospelRows.push([ref, greek, translit, tidy(c[2]), code, tidy(morph || ''), tidy(lemma), tidy(lgloss), tidy(c[5])]);
    }
  }
}

// The citation form of each word, from STEPBible's own lexicons rather than inferred
// from the text. Taking the transliteration from the first occurrence gives whatever
// inflected form happens to come first — "chas.de" for a word everyone looks up as
// "che.sed" — which makes the word unfindable by the name it is known by.
const LEXFILE = {
  he: 'TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt',
  el: 'TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt'
};
const html = t => t.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
let citationForms = 0;
for (const [lang, file] of Object.entries(LEXFILE)) {
  for (const L of readFileSync(join(root, 'Lexicons', file), 'utf8').split('\n')) {
    const c = L.split('\t');
    const key = tidy(c[2] || '');
    if (!STRONG.test(key) || !lex.has(key)) continue;
    // A word with several senses gets one primary row and further rows marked
    // "a Meaning of", all pointing at the same entry. Taking them all lets the last
    // sense overwrite the first, so rēʾšît ends up glossed "first: best" rather than
    // "first: beginning". Only the primary row defines the entry.
    if (tidy(c[1] || '') !== key + ' =') continue;
    const e = lex.get(key);
    if (tidy(c[3])) e.lemma = tidy(c[3]);
    if (tidy(c[4])) e.translit = tidy(c[4]);
    if (tidy(c[6])) e.gloss = tidy(c[6]);
    // The longer definition is prose in the Hebrew file and marked-up lexicon copy in
    // the Greek one; the markup is stripped and the result capped, since this is a
    // label in a list and not a lexicon entry in its own right.
    // The fuller sense is worth carrying only where it reads as a line. In the Hebrew
    // lexicon it does: "goodness, kindness, faithfulness". The Greek entries are whole
    // LSJ articles that open with the headword, its declension and a note on the
    // Septuagint, so any cut of them starts mid-apparatus and says less than the
    // one-word gloss already does. They are left out rather than shown mangled.
    if (lang === 'he') {
      let longer = html(tidy(c[7] || ''));
      // "…: beginning 1) first, beginning, best, chief 1a) beginning 1b) first…"
      // The list after the first sense number is the useful part; the sub-senses after
      // it are an outline, not a line of prose.
      const numbered = longer.match(/\b1\)\s*(.+?)(?=\s*\d+[a-z]\)|$)/);
      if (numbered) longer = numbered[1];
      longer = longer.replace(/^[:\s;,]+/, '').replace(/\s*Also means:.*$/i, '').trim();
      if (longer.length > 110) longer = longer.slice(0, 110).replace(/[\s,;:]+\S*$/, '') + '\u2026';
      if (longer && longer.toLowerCase() !== e.gloss.toLowerCase()) e.sense = longer;
    }
    e.lang = lang;
    citationForms++;
  }
}

// Morphology codes, expanded in STEPBible's own words rather than mine. Only the codes
// that actually occur in the Gospels are carried, which is 873 of several thousand.
const used = new Set(gospelRows.map(r => r[5]).filter(Boolean));
const morphText = readFileSync(join(root, 'Morphology codes',
  'TEGMC - Translators Expansion of Greek Morphhology Codes - STEPBible.org CC BY.txt'), 'utf8');
const morphOut = [];
for (const L of morphText.split('\n')) {
  const c = L.split('\t');
  const code = tidy(c[0]);
  if (!used.has(code) || !/Function=/.test(c[1] || '')) continue;
  morphOut.push([code, tidy(c[1]).replace(/;\s*/g, '; ')]);
}
const usedHe = new Set(hebrewRows.map(r => r[5]).filter(Boolean));
const morphHeText = readFileSync(join(root, 'Morphology codes',
  'TEHMC - Translators Expansion of Hebrew Morphology Codes - STEPBible.org CC BY.txt'), 'utf8');
// The table lists each code under its language prefix, H for Hebrew and A for Aramaic.
// The Hebrew rows of the text carry the code with that prefix stripped; the Aramaic rows
// keep theirs. So a code is registered under its full form always, and under its bare
// form only from the Hebrew side — otherwise an Aramaic entry could lend its wording to
// a Hebrew verb and call a Qal a Peal.
//
// Case is never folded here. "Vqp3ms" is Peal, simple active; "VQrfsa" is Peil, simple
// passive. Matching a code against a differently-cased entry would silently turn an
// active verb passive, so a code that matches nothing exactly is left unexplained and
// shown as the bare code instead.
const heTable = new Map();
for (const L of morphHeText.split('\n')) {
  const c = L.split('\t');
  if (!/Function=/.test(c[1] || '')) continue;
  const full = tidy(c[0]);
  const text = tidy(c[1]).replace(/;\s*/g, '; ');
  if (!heTable.has(full)) heTable.set(full, text);
  if (full[0] === 'H' && !heTable.has(full.slice(1))) heTable.set(full.slice(1), text);
}
for (const code of usedHe)
  if (code && heTable.has(code)) morphOut.push([code, heTable.get(code)]);
// The table lists a code once per language prefix, so the same plain code can be added
// twice; the first wins and the record should say what it actually holds.
{
  const seen = new Set(), unique = [];
  for (const row of morphOut) if (!seen.has(row[0])) { seen.add(row[0]); unique.push(row); }
  morphOut.length = 0; morphOut.push(...unique);
}

const haveMorph = new Set(morphOut.map(m => m[0]));
const missingMorph = [...used].filter(c => c && !haveMorph.has(c));
const missingMorphHe = [...usedHe].filter(c => c && !haveMorph.has(c));

mkdirSync('source-data/originals', {recursive: true});
writeFileSync('source-data/originals/morphology.tsv',
  'code\texpansion\n' + morphOut.map(r => r.join('\t')).join('\n') + '\n');
writeFileSync('source-data/originals/gospels-greek.tsv',
  'ref\tgreek\ttranslit\tgloss\tstrong\tmorph\tlemma\tlemma_gloss\tmanuscripts\n' +
  gospelRows.map(r => r.join('\t')).join('\n') + '\n');
writeFileSync('source-data/originals/hebrew-ot.tsv',
  'ref\tword\ttranslit\tgloss\tstrong\tmorph\n' +
  hebrewRows.map(r => r.join('\t')).join('\n') + '\n');
writeFileSync('source-data/originals/strongs-occurrences.tsv',
  'ref\tstrong\n' + occurrences.map(r => r.join('\t')).join('\n') + '\n');
writeFileSync('source-data/originals/lexicon.tsv',
  'strong\tlang\tlemma\ttranslit\tgloss\tsense\n' +
  [...lex.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => [k, v.lang, v.lemma, v.translit, v.gloss, v.sense || ''].join('\t')).join('\n') + '\n');

const he = [...lex.keys()].filter(k => k[0] === 'H').length;
console.log(JSON.stringify({
  taggedLines: lines, unmappedBooks: skipped,
  gospelGreekWords: gospelRows.length,
  occurrences: occurrences.length,
  strongNumbers: lex.size, hebrew: he, greek: lex.size - he,
  citationFormsFromLexicon: citationForms,
  withoutALexiconEntry: [...lex.values()].filter(v => !v.sense && !v.gloss).length,
  hebrewMorphemes: hebrewRows.length,
  morphCodesUsed: used.size + usedHe.size, morphCodesExplained: morphOut.length,
  greekCodesWithoutAnExplanation: missingMorph.length,
  hebrewCodesWithoutAnExplanation: missingMorphHe.length,
  examplesMissingGreek: missingMorph.slice(0, 4),
  examplesMissingHebrew: missingMorphHe.slice(0, 6)
}, null, 1));
