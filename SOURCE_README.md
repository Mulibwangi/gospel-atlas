# Source package

Developer: DAVID LEE

The ready-to-use app is supplied separately. This source package is for editing
or rebuilding it; ordinary readers do not need Node or Python.

Build with Node.js 20+ and npm:

    npm ci
    npm run build

The build writes into dist/:

    Gospel_Atlas_David_Lee.zip             the archive to send out
    1 START HERE - Open Gospel Atlas.html  launcher page, one Open button
    2 HOW TO OPEN.txt                      the same steps in plain text
    Gospel_Atlas_David_Lee.html            the app
    index.html                             the same app, for web hosting
    README.md                              copied from the source root

Send dist/Gospel_Atlas_David_Lee.zip. It holds the four recipient files, so the
opening instructions always travel with the app. The launcher is src/launcher.html
and the text file is src/how-to-open.txt; the app filename is set once at the top
of build.mjs and substituted into both. zipwriter.mjs assembles the archive in
Node, so no zip command is needed.

## Cross-Reference Lab

docs/cross-references.html is a second page: the cross-references drawn as an
arc diagram, a circle and a matrix, with search and a single-book filter. Build
it with:

    node tools/pack-crossrefs.mjs --full source-data/cross-references-2026-11-02.zip
    npm run build:crossrefs    # Gospel-originating links only, from data/

Run it before `npm run build`: the main build copies docs/cross-references.html
into the ZIP as Cross_Reference_Lab.html and adds a second button for it to the
launcher page, and it quietly leaves both out if that file is not there yet.

The complete download is included as source-data/cross-references-2026-11-02.zip,
so the page rebuilds from a clean clone. It is a later snapshot than the one in
the Atlas release audit: the links are identical, but 2,177 of the 44,469
Gospel-originating vote counts have moved by one or two, because OpenBible's
votes are a live tally. The packer prints the SHA-256 of whatever file you pass
and says whether it matches the audit.

Without --full it uses data/crossrefs.json, which holds only the links that
originate in the four Gospels. The complete dataset is the download recorded in
the release audit, https://a.openbible.info/data/cross-references.zip; pass the
zip or the cross_references.txt inside it. The packer aggregates to directed
chapter pairs, gzips them and embeds them in the page, so the page stays one
self-contained file that works offline. It prints the SHA-256 of whatever file
you pass and says whether it matches the audit.

## Other files

download/Gospel_Atlas_David_Lee.zip is the copy the README and the site link to,
so the download works straight from the repository. It is the only copy: the ZIP
is not duplicated into docs/, because a second ten-megabyte file would be added
to the repository's history at every release.

GUIDE.md is the reader's guide. The build copies it into the ZIP under the name
README.md, because that is what a recipient expects to find in the folder. The
README.md in this repository is the project page shown on GitHub; it is not
shipped.

docs/ is what GitHub Pages serves. docs/index.html is the landing page, built
from src/site.html, and the Atlas is docs/gospel-atlas.html — src/notebook-kit.js
knows that name, so the two change together. Refresh the whole of docs/ and the
download with `npm run publish:docs` after a build you intend to publish, and
`npm run check:docs` says whether the published copies are this build.

The complete data required by the build is in data/. No network is required by
the resulting HTML app.

Run data checks with:

    python3 verify_release.py
    node test_functions.mjs

Original Hindi, Tamil and Punjabi source files are included for the numbering
checks. Other original source hashes and URLs are recorded in the release audit.
The optional prepare_languages.py re-downloads the translation inputs and may
require internet access; build.mjs does not re-download them. It uses the included
prepared JSON data. The source preparation deliberately excludes three mirrors
with ambiguous numbering and uses online readers for those languages instead.

README.md documents user controls and third-party licences. These data licences
remain separate; the non-commercial restriction on the Composite Gospel Index
applies when distributing the complete app. Icon artwork is the user-supplied
image, displayed through CSS background positioning without editing its pixels.

Application source (src/, build.mjs and helper scripts):
MIT License
Copyright (c) 2026 David Lee

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
