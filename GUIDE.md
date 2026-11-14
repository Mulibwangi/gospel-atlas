# Gospel Atlas

Developer: DAVID LEE
Standalone edition — 2 November 2026

## Open the app

1. Save the ZIP to your computer. The Desktop or Documents folder is fine.
2. Unzip it. Windows: right-click the ZIP, choose "Extract All", then
   "Extract". macOS: double-click the ZIP. Linux: right-click and choose
   "Extract Here".
3. Open the unzipped folder and double-click
   "1 START HERE - Open Gospel Atlas.html". Your browser shows a short page
   with one button, "Open the Gospel Atlas". Click it.

The same page carries a second button, "Open the Cross-Reference Lab", which
draws every cross-reference in the Gospels four ways: as an arc, as a circle
with the chords bundled by book, as a matrix that keeps the direction of
each link, and as "Canon" — a cell for every verse in the Bible. Search a book or a chapter to jump to it, or choose a whole book to
see only what touches it: the ring turns that book to the top and widens it,
and the panel lists the other books it links to. Choose one of those links and
the passages open underneath, verse by verse, with the ASV text on both sides.
That file is Cross_Reference_Lab.html and it is self-contained in the same way.

"Canon" is the whole Bible as a grid: one small cell for each of the 31,102 verses,
each book starting at the left edge, Genesis at the top and Revelation at the
bottom with a gold line where the testaments meet. Point at a cell to read that
verse; click to hold it. What the colours mean depends on the question you pick
from "Query":

  Gravity            how many cross-references touch the verse.
  Reach              click any verse, and every other verse is coloured by how
                     many links it takes to get there. Four hops reach almost
                     the whole Bible from most verses.
  Grain              whether a verse's links point forward in the canon or back.
                     Genesis is nearly all forward; Jude is nearly all back.
  Crossing           only the links that run between the Old Testament and the
                     New — a fifth of them all.
  Where a book points  pick a book and see what it reaches, or what reaches it.
  A word             type a word, a transliteration or a Strong number and every
                     verse holding it lights up.
  Rare vocabulary    how uncommon a verse's own words are — the information each
                     tagged word carries, averaged over the verse. The darkest
                     places are the Aramaic chapters of Daniel and Ezra, the
                     genealogies, Job and the Song; the palest is the whole New
                     Testament, whose Greek repeats itself far more.
  Shared vocabulary  click a verse, and every other verse is coloured by how much
                     of its wording it shares — by Strong number, not by English.
                     Psalm 23:1 finds the shepherd chapter of Ezekiel; Matthew
                     1:23 finds Luke 1:31. The panel lists the shared words and
                     how rare each one is, so you can see what the match rests
                     on. This is shared wording, not a cross-reference: nobody
                     judged these verses to belong together.
  No link            the 54 verses nothing points at, and the barely-touched
                     ones beside them.

The subject box changes with the question and disappears when a question takes
no subject, so there is never a combination that draws nothing. "Show me one"
picks a question and a subject at random — a way of finding what you would not
have thought to ask for; the drawing chooses where to look and the text beside
it says what is there. "Full screen" gives the grid the whole window, and Escape
brings it back. The chapter-level dials — minimum links, focus, thread, order —
are hidden while Canon is up, because this view counts every link there is.

The two vocabulary questions count Hebrew and Greek separately, because a word's
frequency in one is no guide to the other, and they leave out the prefixes and
suffixes written joined to the next word — those are grammar rather than
vocabulary and they stand everywhere. For shared vocabulary, a word standing in
more than 600 verses is not followed at all: below that the words that actually
tie two passages together survive, and above it the particles drown them.

The colour scale for a count is compressed: the busiest verse has fourteen times
the links of the middling one, so a straight scale would leave half the Bible
looking blank. Read the colour as more and less; the number itself is always in
the panel.

"Order" lays the books out either as they are bound or in the order their events are
usually dated — Job beside Genesis, the prophets among the kings, Paul's letters by
when they are thought to have been written. Whole books move, never split. The dates
behind any such order are widely contested, which the page says plainly: a second
published plan places Joel four centuries from where this one does. Nothing in the
data changes, only where each chapter is drawn.

A third button, "Open Shadow and Substance", holds the places where Scripture reads
itself: twelve correspondences in which a verse states that one passage answers
another, with that verse quoted in full. The two passages are set side by side in the
order the text gives them, with a line joining each answering pair, and every line
opens to the ASV on both sides. A switch brings in the readings the typological
tradition adds — Joseph, Boaz, Samson and five more — so the two kinds can be compared
side by side. They are off by default, marked as readings wherever they appear, and
carry no asserting verse because there is none. A line is drawn solid where the cross-reference dataset
records a direct reference between those two chapters and dashed where it does not,
which is a fact about that dataset and not a judgement about the correspondence. That
file is Shadow_and_Substance.html.

Double-clicking Gospel_Atlas_David_Lee.html does the same thing directly; that
file is the app. If it opens in a text editor instead of a browser, right-click
it, choose "Open with", and pick Chrome, Firefox, Edge or Safari.

Which browsers can open it: Chrome or Edge 80 and later, Safari 16.4 and later,
Firefox 113 and later — that is, anything from spring 2023 onwards. The files
decompress themselves when opened, and the browser feature that does it arrived in
those versions. An older browser shows a short message saying so rather than a
broken page. These requirements were read from the built files; they have been
exercised in Chromium only, and verifying them on Safari and Firefox is still to do.

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

Two switches under the maps change what they show. "Show order" draws a band
between the Gospels for every shared story unit: a level band means both put the
unit in the same place, a steep one means they do not, and the selected story's
band is drawn solid. "Align parallels" rearranges the maps into synopsis order,
one row per story unit, so parallels sit level across all four and a Gospel's
silences appear as the blank space beside them. The two are alternatives; order
bands are hidden when the maps are aligned, because aligned bands would all be
level by construction.

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

"Thread", in the Cross-Reference Lab, traces a theme through the links. The
menu holds two kinds.

Words in the text at both ends: choose one, or type words of your own, and
every link whose Scripture at both ends carries one of those words is drawn in
scarlet while the rest of the field recedes. A thread of this kind is a word
search over the ASV and nothing more: it shows where those words meet across
the cross-references, and it can just as easily show that they do not. The
supplied threads are the scarlet thread of redemption, covenant, shepherd and
flock, light and darkness, and temple and tabernacle.

Every one of the sixty-six books is named in the circle and along the arc. Where
the canon is denser than the type — Obadiah, Philemon and Jude are a chapter
each, a pixel or two wide — a name moves rather than disappears: further out from
the ring, further down beneath the arc, or a little to one side, always with a
faint leader line back to the book it belongs to. Moving the pointer along the
books works as a magnifier: the book under it swells to its full name and its
neighbours shrink back to their abbreviations to make the room, and nothing
shifts position as you travel, so the ring stays still under the eye.

First mention — a concept and where it begins: the law of first mention holds
that a concept's first occurrence governs what follows. The page supplies the
claimed origin and the later passages belonging to the concept, both of which
are readings, and tests the one part that is data: whether those later passages
carry a cross-reference back to the origin. The origin is turned to twelve
o'clock with a spoke to every other passage, solid where it is pointed back to
and dashed where it is not; in the matrix the origin's row is the claim and its
column is what it points at, so one-way traffic is visible. Four sets are
supplied — marriage, where all four later passages point back because the New
Testament quotes Genesis 2:24 outright; the serpent; blood, the example usually
given for the rule, where only two of nine point back; and the widow and the
fatherless, where one of eighteen does. A low count does not refute a reading.
It reports that the connection is the reader's rather than one the
cross-reference editors marked.

Named chains of passages: a fixed list of references in canonical order,
numbered around the rim and joined step by step. Seven are supplied — the scarlet
thread as it is usually told, the seed promise, the Passover lamb, the
suffering servant, the kinsman-redeemer, the temple and the dwelling of God,
and the exchange, in which the serpent lifted up becomes the one made sin. Each chain is a reading and the page says so; what the data decides is
whether each step is attested. A step is drawn solid where the dataset has a
direct cross-reference between those two chapters and dashed where it does not,
and the page reports the count. They differ: every one of the suffering
servant's fifteen steps is attested, while nine of the scarlet thread's
fourteen are. In the matrix each step is one cell, filled or outlined. Open a
station to read its verse.

"Colour-blind palette" switches the five colours to the Okabe-Ito set, so no
distinction depends on telling red from green. The Mt / Mk / Lk / Jn badges
carry the same information as text either way. The choice is remembered in this
browser.

The address bar keeps the selected story and verse, so a link copied from it
reopens at the same place. "Copy references" includes that link when the app is
opened from a web address.

## Moving between the three pages

The Gospel Atlas, the Cross-Reference Lab and Shadow and Substance link to one
another at the top of each page, and they hand things across rather than leaving
you to find them again:

- A word found in the Atlas offers **whole Bible ↗**, which opens the Lab with
  that word already searched and every verse it stands in listed.
- A word in the Lab offers **Word by word in the Gospel Atlas ↗**, which opens
  the Atlas on the same word.
- An Old Testament verse in an Atlas word result opens that chapter on the
  Lab's drawing, since the Atlas is a map of the Gospels and has nowhere of its
  own to show one.

Keep the files together in one folder, as they come in the ZIP, for the links
to find each other.

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

A− and A+ adjust Scripture text size, from 11px to 35px, with the current size
shown between them. The size is remembered, so a file reopened tomorrow keeps it.
The Cross-Reference Lab has the same control in the header of its passages
panel, and where the browser lets the two files see each other's storage they
share the setting. “Print passages” prints the selected
parallel passages. Inside a symbol panel, “Print passage” prints the selected
passage. Use your browser's Save as PDF option to create a PDF if available.
With the Greek and Hebrew switched on, **Print this study** prints a sheet of its
own: the verse, its Greek word by word, and the Hebrew shown beneath it, without
the maps. The grammar under each word reads in plain words — “Noun · dative
singular feminine” — and those small lines grow with A+ along with everything
else.
“Copy references” copies the selected story's title, references and edition.
The source panel provides downloadable index, cross-reference and audit data.

## The Hebrew and Greek

Both apps now carry the original-language text behind the English, from
STEPBible's Translators Amalgamated Greek New Testament and Hebrew Old
Testament — the work of Tyndale House, Cambridge, under CC BY 4.0. The Hebrew
is the Westminster Leningrad Codex. 17,036 distinct words and marks across 681,423
occurrences.

**In the Gospel Atlas**, tick *Greek and Hebrew, word by word* under a selected
verse. Each
Greek word appears with a transliteration, the dictionary word behind it, and
its grammar, expanded in STEPBible's own words. Click any word to see every
place it stands in the four Gospels. The search box beneath takes the English
gloss, a transliteration, the Greek itself, or a Strong number.

Gold marks a word whose dictionary form also stands in another Gospel's telling
of the same story unit. **This is a count of shared words and nothing else.** It
does not say one writer copied another, or which came first — only that the
same word is there in both. You can also mark the words the Greek editions
differ over; the note then says which editions carry the word, and takes no view
on which is right.

Expand any cross-reference to the Old Testament and it offers to open in
**Hebrew**, read right to left, the same way — you need not turn anything on
first. The *Greek and Hebrew, word by word* switch above the references does the
same for all of them at once. A reference into the four Gospels opens in Greek;
for Acts to Revelation this file carries neither, and says so. 191,905 morphemes covering the 9,218 Old
Testament verses the Gospel cross-references reach, which is every Old Testament
verse the Atlas can put on screen. Hebrew writes as part of a word what English
writes separately — the *and*, the *the*, the *in*, the possessive *his* — and
each of those gets a box of its own, because that is what the word is made of.
The maqqef and the verse-ending sof pasuq stay attached to their word, as a
printed Hebrew Bible has them.

**Finding a word in both languages.** The search box under the Greek takes an
English gloss, a transliteration, the word itself, or a Strong number, and
answers in both languages at once. Type *yoke* and you get the Greek ζυγός
(Matthew 11:29–30) and the Hebrew עֹל (Deuteronomy 28:48, Jeremiah 2:20,
Lamentations 3:27 and the rest) side by side. Every Hebrew and Greek word is
listed whether or not it stands in a verse this file carries; where it does not,
the entry says so and the Cross-Reference Lab has it across the whole Bible.

**Where the two verses touch.** A Gospel verse and the Old Testament verse it
points to are, with few exceptions, not translations of one another, so nothing
is lined up column against column — that would put "was" under "he created" and
invent a correspondence nobody claims. What is marked is only where the two
lexicons reach for the same English word, which is a fact about the lexicon
entries. On John 1:1 and Genesis 1:1 that is *beginning* and *God*. On a verse
that actually quotes the Old Testament, such as Matthew 1:23 on Isaiah 7:14, it
lights up almost completely: bear, son, call, name.

**In the Cross-Reference Lab**, *Word search* covers the whole canon. Type an
English gloss (*love*), a transliteration (*chesed*, *agape*), the word itself
in Hebrew or Greek, or a Strong number (*H2617*, *G26*). Accents, macrons and
syllable dots are ignored, so you need not type what you cannot type. Each
result lists every verse the word stands in, and clicking a verse brings that
chapter up on the diagram.

Three honest notes:

- **A gloss is not a translation.** The English beside a Hebrew or Greek word is
  one English word standing in for one original word, outside the sentence it
  belongs to. It is a lexicon's choice. Where it disagrees with the translation
  above it, the translation is the considered reading.
- **Psalm superscriptions** carry real Hebrew that English Bibles print
  unnumbered above the psalm. They are searchable, and named rather than
  numbered.
- **Eight verses hold no tagged word** — John 7:53, Romans 16:25-27,
  2 Corinthians 13:13-14 and Philippians 1:16-17. The English and the Greek
  editions divide verses differently at those points; no text is missing.

Hebrew prefixes and endings — the *and*, *the*, *in*, *his* that English writes
as separate words — are indexed too, but listed apart, so a search for a word is
not buried under fifteen thousand verses containing one letter.

## Notebook, bookmarks and slide decks

Both the Gospel Atlas and the Cross-Reference Lab keep a notebook, and they
keep two different things.

A **bookmark** keeps where you were — in the Atlas: the story, the verse, the
filter, the pixel density, the translation; in the Lab: the view, the ordering,
the focus and the chapter being held. “Open” brings the whole arrangement back
in one click, however far you have wandered since.

A **note** keeps what you found, so it can be carried into a lesson:

- In the Atlas, “+ Note” beside a story keeps the unit, its references in each
  Gospel, and a picture of the four maps as they stand. “+ Note” in the
  connections section keeps a verse, its text in the edition you are reading,
  and how many connections it has. With the Greek switched on the note takes
  the Greek too, and each Old Testament verse beneath it has a “+ Note” of its
  own that keeps the Hebrew and the words it shares with the Greek. The slide
  then shows the words the lesson is about, not only their translation.
- In the Lab, “+ Note” keeps the chapter or the link the panel is showing, the
  numbers behind it, and the diagram as drawn.

Under each note is a box for your own words. **Slide deck** turns the notes and
those words into a single HTML file: arrow keys or clicks move through it, and
printing it gives a PDF. It needs nothing installed and no network, so it opens
from a memory stick on a classroom machine.

**Save maps as image** / **Save image** writes the picture on its own as a PNG.

Notes are held in the browser you made them in. That storage is per-machine, and
some browsers refuse it outright for a file opened from disk, so **Save file**
is the real copy: it writes the whole notebook as JSON, and **Open file** reads
one back, on this machine or another. A notebook saved in one app can be opened
in the other, and a deck built from both; a note from the other app shows where
it came from, and offers no “Open”, since only the app that kept a view can put
it back.

A browser holds roughly forty notes with pictures before its storage is full.
The notebook says so when that happens — and says so if the browser refuses to
keep anything at all — rather than letting notes vanish on the next visit; the
notes on screen are still there to save to a file.

Nothing in the notebook leaves your computer.

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

## On a phone

Each page fits a phone without sideways scrolling. The Cross-Reference Lab opens
on its drawing, with the view tabs and search in reach and the rest of the
settings behind one **Settings** button. In the Atlas, each Old Testament verse
under the Greek opens as the words it shares, with **Show the verse** a tap
away, so three verses of Hebrew do not bury the cross-references.

## Privacy and compatibility

The app has no account, analytics or remote script dependencies. Its content
security policy blocks background network connections. Only clicked external
links open online services. Modern browser support for DecompressionStream is
required; unsupported browsers show an update message. This release was checked
in the available Chromium browser. Native Windows, macOS and additional browser
verification must be performed separately; compatibility is designed, not a
claim that every operating system was tested.
