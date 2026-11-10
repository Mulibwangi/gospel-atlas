// What GitHub Pages serves, copied out of a finished build.
//
// docs/index.html is the landing page — a few kilobytes of plain HTML that says what
// this is, links the three tools and offers the download. The Atlas itself is ten
// megabytes; it used to be index.html, which meant the front door of the site was the
// whole app, with nothing a search engine could read and no way to reach the download.
// So the Atlas moved to gospel-atlas.html, and src/notebook-kit.js's suiteLinks() knows
// that name: the two must change together.
//
// The ZIP is not copied into docs/. It is 10.6 MB and already tracked in download/, and
// a second copy would double what every release adds to the repository forever. The site
// links it through github.com/.../raw/main/download/, which serves the tracked file.
//
// Run with --check to compare instead of copy; the workflow uses that to confirm the
// published files really are this build.

import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {basename, join} from 'node:path';

const check = process.argv.includes('--check');

// docs/CNAME is the custom domain. GitHub writes that file itself when the domain is
// entered under Settings > Pages, and a later publish that did not carry it would take
// the site off meaningcurve.com. So it is tracked here with everything else.
//
// published path  <-  source path
const FILES = [
  ['docs/CNAME', 'src/CNAME'],
  ['docs/index.html', 'src/site.html'],
  ['docs/gospel-atlas.html', 'dist/index.html'],
  ['docs/preview.jpg', 'src/preview.jpg'],
  ['download/Gospel_Atlas_David_Lee.zip', 'dist/Gospel_Atlas_David_Lee.zip'],
];
for (const name of await readdir('src/img')) FILES.push([join('docs/img', name), join('src/img', name)]);

await mkdir('docs/img', {recursive: true});

let bad = 0;
for (const [to, from] of FILES) {
  const data = await readFile(from);
  if (check) {
    let have = null;
    try { have = await readFile(to); } catch {}
    if (have === null || !have.equals(data)) {
      console.error(`::error::${to} ${have === null ? 'is missing' : 'differs from this build'}. Run: npm run build && npm run publish:docs`);
      bad++;
    } else {
      console.log('ok  ' + to);
    }
  } else {
    await writeFile(to, data);
    console.log(`${to}  <-  ${basename(from)}  (${(data.length / 1048576).toFixed(2)} MB)`);
  }
}
if (bad) process.exit(1);
