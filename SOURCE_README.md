# Source package

Coder: David Lee

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

GUIDE.md is the reader's guide. The build copies it into the ZIP under the name
README.md, because that is what a recipient expects to find in the folder. The
README.md in this repository is the project page shown on GitHub; it is not
shipped. docs/index.html is the copy published through GitHub Pages: refresh it
with `cp dist/index.html docs/index.html` after a build you intend to publish.

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
