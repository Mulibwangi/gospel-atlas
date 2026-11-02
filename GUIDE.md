# Gospel Atlas

Coder: David Lee
Standalone edition — 2 November 2026

## Open the app

1. Save the ZIP to your computer. The Desktop or Documents folder is fine.
2. Unzip it. Windows: right-click the ZIP, choose "Extract All", then
   "Extract". macOS: double-click the ZIP. Linux: right-click and choose
   "Extract Here".
3. Open the unzipped folder and double-click
   "1 START HERE - Open Gospel Atlas.html". Your browser shows a short page
   with one button, "Open the Gospel Atlas". Click it.

Double-clicking Gospel_Atlas_David_Lee.html does the same thing directly; that
file is the app. If it opens in a text editor instead of a browser, right-click
it, choose "Open with", and pick Chrome, Firefox, Edge or Safari.

Nothing opens from inside a ZIP preview window or an email attachment preview:
save the ZIP and unzip it first. Use a recent Chrome, Firefox, Edge or Safari.
It is designed for Linux, Windows and macOS. No installation, account, terminal
or web server is required. JavaScript must be enabled. The app file is large,
so allow a few seconds for it to appear. Desktop browsers are the intended
target. "2 HOW TO OPEN.txt" repeats these steps in plain text.

## Share by email

Attach the supplied ZIP. It contains the opening instructions alongside the
app, so recipients unzip it and click the START HERE file. Keep this README and
the embedded source notices with your copy. The complete collection may be
shared free of charge for non-commercial use under the included data licences.
No account or subscription is required by the app. Mail services can restrict
HTML attachments, including those inside ZIP files; a file-sharing link is
another way to distribute the same ZIP if your service blocks it. When you
paste a link rather than attach the ZIP, say in the message that the download
is a ZIP and that the START HERE file inside it opens the app.

## Explore

Each square represents a verse. The four maps retain their own Gospel order.
Gold identifies story units assigned to more than one Gospel by the Composite
Gospel Index. The other four colours identify units assigned only to Matthew,
Mark, Luke or John in that index. The badges identify the exact combination.
The colours describe the index, not an exact match of wording.

Click a square or choose a story to read the parallel passages. Click a verse
number to view its outgoing cross-references. Arrow keys work when a map has
keyboard focus. On a phone, swipe sideways to move between the four Gospels and
between the parallel passages.

The search box matches story titles, references such as John 4:7, and, from
three letters upwards, the Scripture text of the edition you are reading.
Online editions carry no text in this file, so their searches use the ASV 1901.
Accents and ligatures are folded, so Zacchaeus finds Zacchæus. Each matched
unit shows the first verse containing your words.

"Told in … but not in …" lists the units one Gospel records and another does
not. It reports the chosen index's assignments: a unit absent from one Gospel
may still share details with something that Gospel records elsewhere.

"Colour-blind palette" switches the five colours to the Okabe-Ito set, so no
distinction depends on telling red from green. The Mt / Mk / Lk / Jn badges
carry the same information as text either way. The choice is remembered in this
browser.

The address bar keeps the selected story and verse, so a link copied from it
reopens at the same place. "Copy references" includes that link when the app is
opened from a web address.

## Heading symbols

Click an icon or its text label to display Scripture passages:

- Matthew — lion — King: Matthew 2:1–6; 21:1–11; 27:11–14.
- Mark — ox — Servant: Mark 10:42–45; 1:29–34; 9:33–37.
- Luke — human figure — Son of Man: Luke 19:1–10; 2:40–52; 22:39–46.
- John — eagle — Son of God: John 20:30–31; 1:1–18; 5:19–29.

This is the selected thematic arrangement. It differs from the customary
Matthew/human, Mark/lion, Luke/ox, John/eagle arrangement in Christian art.
Panels contain Scripture and references, without generated commentary.

## Languages and translations

English plus 20 widely used languages are selectable. This is a practical
selection, not a claim about an exact worldwide language ranking.

Included offline: English (ASV 1901; World English Bible), Arabic (Van Dyck),
Chinese (Union Version), French (Louis Segond), German (Luther),
Hindi (IRV), Japanese (Kougo), Portuguese (Bíblia Portuguesa
Mundial), Punjabi (IRV), Russian (Synodal), Spanish (Reina-Valera 1909),
and Tamil (IRV).

Online reading options: Bengali (Easy-to-Read Version), Marathi (Easy-to-Read
Version), Telugu (Easy-to-Read Version), Indonesian (Alkitab Mudah Dibaca), Korean (Korean
Living Bible), Swahili (Neno), Turkish (TCL02), Urdu (Easy-to-Read Version),
Vietnamese (Bản Dịch 2011), and English ESV, NASB 2020 and NASB 1995.
These buttons open Bible Gateway or YouVersion; an internet connection is
required. These editions' copyrighted texts are not included in this file.
The app does not require an account; external readers set their own terms.

The ASV includes the full Bible for cross-references. Other bundled editions
include the four Gospels. When a cross-reference is outside an included book,
the panel labels its English ASV text explicitly. Missing verses within an
edition are labelled and never silently substituted. Verse coordinates follow
the ASV map. Some editions combine or omit verses; combined verses are marked.
The supplied Segond source divides Mark 9:50 and 10:52 into two numbered
segments. These segments are shown together at their map coordinates, with the
source references explicitly labelled; wording is unchanged.
The interface and story titles are in English. Bible language selection changes
the Scripture text, not the interface or source story titles. Scripture is not
machine-translated.

## Use another Bible translation

Choose “Use my translation” and import a JSON file you are permitted to use.
An example download is provided in the app. Format:

{
  "name": "My translation",
  "language": "en",
  "languageName": "English",
  "direction": "ltr",
  "verses": {"Mark.10.45": "The verse text goes here."}
}

Use "rtl" for right-to-left text. Reference keys use the displayed book codes.
Unsupported references are skipped with a count. Import is limited to 25 MB.
Imported text stays only in the current browser session and is not uploaded,
persisted or incorporated into the shareable app file. Reimport after reopening.
Use “Find another language” for the YouVersion language catalogue.

## Reading and printing

A− and A+ adjust Scripture text size. “Print passages” prints the selected
parallel passages. Inside a symbol panel, “Print passage” prints the selected
passage. Use your browser's Save as PDF option to create a PDF if available.
“Copy references” copies the selected story's title, references and edition.
The source panel provides downloadable index, cross-reference and audit data.

## Sources and permissions

- Sean Boisen / SemanticBible, Composite Gospel Index 1.2: CC BY-NC-SA 2.0.
  https://semanticbible.com/cgi/cgi-view.html
  https://semanticbible.com/license.html
  https://creativecommons.org/licenses/by-nc-sa/2.0/
  Adaptations: verse expansion, colour classification, interface and correction
  of unit 102's source typo from Matt.4.33 to Mark.4.33. Index/adapted index data
  retain that licence. They contain 355 units and cover 3,779 Gospel verses.
- OpenBible.info cross-references: CC BY, source snapshot 26 October 2026.
  https://www.openbible.info/labs/cross-references/
  344,799 source records were ingested; the app includes the 44,469 originating
  in the four Gospels. Source votes order links; they are not similarity scores.
- ASV 1901: public domain, supplied through Scrollmapper/bible_databases.
  https://github.com/scrollmapper/bible_databases
- World English Bible and seven additional public-domain editions:
  Free.Bible, with the upstream source and edition listed inside the app.
  https://free.bible/developers/
- Japanese Kougo 1954/1955: public-domain edition, structured text through
  Scrollmapper/bible_databases (JapKougo); edition provenance also listed by
  Free.Bible.
- Indian Revised Version: © Bridge Connectivity Solutions Pvt. Ltd.,
  CC BY-SA 4.0. Hindi: © 2017, 2018, 2019; Bengali: © 2018, 2019;
  Marathi, Punjabi, Tamil, Telugu: © 2017, 2019.
  https://creativecommons.org/licenses/by-sa/4.0/
  Copyright pages: https://ebible.org/hin2017/copyright.htm,
  https://ebible.org/benirv/copyright.htm, https://ebible.org/mar/copyright.htm,
  https://ebible.org/pan/copyright.htm, https://ebible.org/tam2017/copyright.htm,
  https://ebible.org/tel2017/copyright.htm
  Structured text mirror: https://github.com/thiagobodruk/bible
  Gospel extracts and formatting contributions retain CC BY-SA 4.0 separately
  from the Gospel index. Layout changed; separately supplied headings/footnotes
  may be omitted. No machine translation was used. No source publisher's
  endorsement is implied. Source hashes are in the app's downloadable audit.
- ESV permissions: https://www.crossway.org/permissions/
- NASB permissions:
  https://www.lockman.org/permission-to-quote-copyright-trademark-information/
- Icon artwork supplied by David Lee.
- React: MIT licence, copyright Meta Platforms, Inc. and affiliates.
  Full licence notices are embedded in the HTML JavaScript.

## Privacy and compatibility

The app has no account, analytics or remote script dependencies. Its content
security policy blocks background network connections. Only clicked external
links open online services. Modern browser support for DecompressionStream is
required; unsupported browsers show an update message. This release was checked
in the available Chromium browser. Native Windows, macOS and additional browser
verification must be performed separately; compatibility is designed, not a
claim that every operating system was tested.
