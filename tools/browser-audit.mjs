// What the shipped pages actually require of a browser.
//
// The pages are checked in Chromium and nowhere else, because this is the only
// engine available where they are built. That is a real gap and this does not close
// it. What it can do is replace "untested" with a list: every browser feature the
// three pages use, found by reading them rather than by remembering, with the ones
// that are recent enough to exclude an older browser called out.
//
//   node tools/browser-audit.mjs
import {readFile} from 'node:fs/promises';

// Each entry: what to look for, and when it became available everywhere. The dates
// are the binding constraint on who can open these files at all.
const FEATURES = [
  ['DecompressionStream',   /\bDecompressionStream\b/,        'Chrome 80 · Edge 80 · Safari 16.4 · Firefox 113', true],
  ['Blob.stream()',         /\.stream\(\)\s*\.pipeThrough/,   'Chrome 76 · Edge 79 · Safari 14.1 · Firefox 100', true],
  ['Path2D',                /\bnew Path2D\b/,                 'everywhere since 2015', false],
  ['canvas roundRect',      /\broundRect\s*\(/,               'Chrome 99 · Safari 16.4 · Firefox 112', true],
  ['OffscreenCanvas',       /\bOffscreenCanvas\b/,            'Chrome 69 · Safari 16.4 · Firefox 105', true],
  ['structuredClone',       /\bstructuredClone\s*\(/,         'Chrome 98 · Safari 15.4 · Firefox 94', true],
  ['Array.at',              /\.at\s*\(\s*-?\d/,               'Chrome 92 · Safari 15.4 · Firefox 90', true],
  ['Array.findLast',        /\.findLast(Index)?\s*\(/,        'Chrome 97 · Safari 15.4 · Firefox 104', true],
  ['String.replaceAll',     /\.replaceAll\s*\(/,              'Chrome 85 · Safari 13.1 · Firefox 77', false],
  ['optional chaining',     /\?\./,                           'Chrome 80 · Safari 13.1 · Firefox 74', false],
  ['nullish coalescing',    /\?\?[^=]/,                       'Chrome 80 · Safari 13.1 · Firefox 72', false],
  ['logical assignment',    /(\|\|=|&&=|\?\?=)/,              'Chrome 85 · Safari 14 · Firefox 79', false],
  ['matchMedia listener',   /matchMedia\([^)]*\)\.addEventListener/, 'Chrome 39 · Safari 14 · Firefox 55', false],
  ['CSS :has()',            /:has\(/,                         'Chrome 105 · Safari 15.4 · Firefox 121', true],
  ['CSS color-scheme',      /color-scheme\s*:/,               'Chrome 81 · Safari 13 · Firefox 96', false],
  ['CSS :is()',             /:is\(/,                          'Chrome 88 · Safari 14 · Firefox 78', false],
  ['CSS aspect-ratio',      /aspect-ratio\s*:/,               'Chrome 88 · Safari 15 · Firefox 89', false],
  ['CSS gap in flexbox',    /display:\s*flex[\s\S]{0,200}?gap\s*:/, 'Chrome 84 · Safari 14.1 · Firefox 63', false],
  ['dialog element',        /<dialog\b/,                      'Chrome 37 · Safari 15.4 · Firefox 98', true],
  ['clipboard API',         /navigator\.clipboard/,           'Chrome 66 · Safari 13.1 · Firefox 63', false],
  ['Intl.Segmenter',        /Intl\.Segmenter/,                'Chrome 87 · Safari 14.1 · Firefox 125', true],
  ['Web Worker',            /new Worker\s*\(/,                'everywhere', false],
  ['Service Worker',        /serviceWorker/,                  'not expected in an offline file', false],
  ['fetch to a network',    /fetch\s*\(\s*['"`]https?:/,      'should not appear: these files are offline', false],
];

const PAGES = ['docs/index.html', 'docs/cross-references.html', 'docs/typology.html'];
const rows = [];
for (const page of PAGES) {
  let text;
  try { text = await readFile(page, 'utf8'); }
  catch { console.error('missing: ' + page + ' — run npm run build'); process.exit(1); }
  // The Atlas carries a compressed payload; only its own code should be searched.
  // Strip the embedded payload without a regex: a multi-megabyte base64 run overflows
  // the engine's stack inside String.replace.
  let code = text;
  const open = text.indexOf('id="payload"');
  if (open >= 0) {
    const from = text.indexOf('>', open) + 1, to = text.indexOf('<', from);
    if (from > 0 && to > from) code = text.slice(0, from) + text.slice(to);
  }
  for (const [name, re, since, recent] of FEATURES)
    if (re.test(code)) rows.push({page: page.replace('docs/', ''), name, since, recent});
}

const byFeature = new Map();
for (const r of rows) {
  if (!byFeature.has(r.name)) byFeature.set(r.name, {...r, pages: []});
  byFeature.get(r.name).pages.push(r.page.replace('.html', ''));
}
const all = [...byFeature.values()];
const binding = all.filter(r => r.recent);

console.log('\nBrowser features these pages use, read from the built files:\n');
for (const r of all.sort((a, b) => (b.recent - a.recent) || a.name.localeCompare(b.name)))
  console.log('  ' + (r.recent ? '!' : ' ') + ' ' + r.name.padEnd(22) + r.since.padEnd(50) + r.pages.join(', '));

console.log('\nThe ones marked ! decide who can open the files at all:');
for (const r of binding) console.log('   ' + r.name + ' — ' + r.since);
console.log(`
Nothing here is a substitute for opening the pages in Safari and Firefox, which has
not been done. It does say what to expect: a browser older than the newest date above
cannot open the file, and should be told so rather than shown a broken page. Check
that the Lab's unsupported-browser message appears, and that the Atlas has one too.
`);
