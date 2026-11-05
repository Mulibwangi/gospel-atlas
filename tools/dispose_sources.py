#!/usr/bin/env python3
"""The literature proposes; this disposes.

Published reference works say which passages correspond. They are the proposal and
nothing in them is second-guessed here. What this adds is a test none of them can
run on itself: the passages each one cites are parsed, their distinctive verbs are
taken in the order the text gives them, and the two sequences are compared.

Nothing is annotated by hand. The claim comes from the source, the predicates come
from the parser, and the only judgement exercised here is the decision to ignore
verbs that are too common to mean anything, which is made by counting the whole
ASV rather than by taste.

A high score is not a verdict that a reading is true, and a low one is not a
refutation. Both say how much of the correspondence is carried by the text's own
sequence of actions.

Needs spaCy, which the app does not ship:
    pip install spacy && python -m spacy download en_core_web_sm
    python3 tools/dispose_sources.py
"""
import json, re, sys, random, collections

try:
    import spacy
except ImportError:
    sys.exit("spaCy is not installed. See the note at the top of this file.")

BOOK = {'genesis':'Gen','exodus':'Exod','leviticus':'Lev','numbers':'Num','deuteronomy':'Deut',
 'joshua':'Josh','judges':'Judg','ruth':'Ruth','1 samuel':'1Sam','2 samuel':'2Sam','1 kings':'1Kgs',
 '2 kings':'2Kgs','1 chronicles':'1Chr','2 chronicles':'2Chr','ezra':'Ezra','nehemiah':'Neh',
 'esther':'Esth','job':'Job','psalm':'Ps','psalms':'Ps','proverbs':'Prov','ecclesiastes':'Eccl',
 'song of solomon':'Song','isaiah':'Isa','jeremiah':'Jer','lamentations':'Lam','ezekiel':'Ezek',
 'daniel':'Dan','hosea':'Hos','joel':'Joel','amos':'Amos','obadiah':'Obad','jonah':'Jonah',
 'micah':'Mic','nahum':'Nah','habakkuk':'Hab','zephaniah':'Zeph','haggai':'Hag','zechariah':'Zech',
 'malachi':'Mal','matthew':'Matt','mark':'Mark','luke':'Luke','john':'John','acts':'Acts',
 'romans':'Rom','1 corinthians':'1Cor','2 corinthians':'2Cor','galatians':'Gal','ephesians':'Eph',
 'philippians':'Phil','colossians':'Col','1 thessalonians':'1Thess','2 thessalonians':'2Thess',
 '1 timothy':'1Tim','2 timothy':'2Tim','titus':'Titus','philemon':'Phlm','hebrews':'Heb',
 'james':'Jas','1 peter':'1Pet','2 peter':'2Pet','1 john':'1John','2 john':'2John','3 john':'3John',
 'jude':'Jude','revelation':'Rev'}

def parse_ref(ref):
    m = re.match(r'^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$', ref)
    if not m:
        return []
    code = BOOK.get(m[1].lower().strip())
    if not code:
        return []
    ch, lo = int(m[2]), int(m[3])
    hi = int(m[4]) if m[4] else lo
    return [f'{code}.{ch}.{v}' for v in range(lo, hi + 1)]

def lcs(a, b):
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = d[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(d[i-1][j], d[i][j-1])
    return d[len(a)][len(b)]

def main():
    nlp = spacy.load('en_core_web_sm')
    bible = json.load(open('data/bible.json'))
    DB = json.load(open('data/typology-sources.json'))

    # Which verbs are too common to carry a correspondence? Counted, not chosen:
    # anything occurring in more than one chapter in forty is treated as furniture.
    print('counting verbs across the whole ASV (this takes a minute) …')
    chapters = collections.defaultdict(list)
    for k, t in bible.items():
        b, c, _ = k.split('.')
        chapters[b + '.' + c].append(t)
    chapter_verbs, verb_chapters = {}, collections.Counter()
    for cid, texts in chapters.items():
        vs = set()
        for doc in nlp.pipe(texts, batch_size=64, disable=['ner']):
            for tok in doc:
                if tok.pos_ == 'VERB':
                    vs.add(tok.lemma_.lower())
        chapter_verbs[cid] = vs
        for v in vs:
            verb_chapters[v] += 1
    ncap = len(chapters)
    common = {v for v, n in verb_chapters.items() if n > ncap / 40}
    print(f'  {ncap} chapters, {len(verb_chapters)} verb lemmas, '
          f'{len(common)} treated as too common to count\n')

    def sequence(refs):
        """Distinctive verbs, in the order the cited text gives them, no repeats."""
        keys = [k for r in refs for k in parse_ref(r) if k in bible]
        out = []
        for doc in nlp.pipe([bible[k] for k in keys], batch_size=64, disable=['ner']):
            for tok in doc:
                if tok.pos_ == 'VERB':
                    lem = tok.lemma_.lower()
                    if lem not in common and lem not in out:
                        out.append(lem)
        return out, keys

    def compare(a, b, trials=4000):
        shared = [x for x in a if x in b]
        if len(shared) < 3:
            return None
        sa = [x for x in a if x in shared]
        sb = [x for x in b if x in shared]
        fwd, rev = lcs(sa, sb), lcs(sa, sb[::-1])
        run = max(fwd, rev)
        rnd = random.Random(20261105)
        ge = 0
        for _ in range(trials):
            s = sb[:]
            rnd.shuffle(s)
            if max(lcs(sa, s), lcs(sa, s[::-1])) >= run:
                ge += 1
        return {'shared': len(shared), 'order': run / len(shared),
                'chiastic': rev > fwd, 'p': (ge + 1) / (trials + 1)}

    rows = []
    # Types of Christ: the source names both ends itself.
    NT_FIRST = 'Matt'
    order = list(dict.fromkeys(k.split('.')[0] for k in bible))
    nt_books = set(order[order.index(NT_FIRST):])
    for c in DB['claims']:
        ot = [r for r in c['refs'] if r.split()[0].rstrip('0123456789 ') and
              BOOK.get(re.match(r'^(.+?)\s+\d+:', r)[1].lower().strip()) not in nt_books]
        nt = [r for r in c['refs'] if r not in ot]
        if not ot or not nt:
            continue
        a, ka = sequence(ot)
        b, kb = sequence(nt)
        res = compare(a, b)
        if res:
            rows.append({'kind': 'Christ', 'source': c['source'], 'name': c['type'], **res})

    # Types of the Antichrist: the other end is supplied once, identically for all.
    target, _ = sequence(DB['antichrist_passages'])
    for c in DB['antichrist_claims']:
        a, _ = sequence(c['refs'])
        res = compare(a, target)
        if res:
            rows.append({'kind': 'Antichrist', 'source': c['source'], 'name': c['type'], **res})

    rows.sort(key=lambda r: (r['p'], -r['shared']))
    if rows:
        print('  p      order  shared  chiasm  claim')
        for r in rows:
            print('  %-6s %.2f   %4d    %-6s %s/%s%s' % (
                ('<.001' if r['p'] < 0.001 else '%.3f' % r['p']), r['order'], r['shared'],
                'yes' if r['chiastic'] else '', r['source'], r['name'],
                '' if r['kind'] == 'Christ' else '  [Antichrist]'))
    print(f"\n  {len(rows)} claims had enough distinctive verbs in common to test.")

    # Why that number is what it is. The overlap between any two passages is carried
    # almost entirely by the commonest verbs in the language, so filtering them out
    # removes the correspondence along with the noise. This sweeps the threshold and
    # shows the collapse rather than asserting it.
    print('\n  where the overlap actually lives, for three of the Antichrist claims:')
    print('    verbs kept        shared verbs with the Antichrist passages')
    for cut in (ncap, ncap // 10, ncap // 40, ncap // 100):
        keep = {v for v, n in verb_chapters.items() if n <= cut}
        def seq2(refs):
            keys = [k for r in refs for k in parse_ref(r) if k in bible]
            out = []
            for doc in nlp.pipe([bible[k] for k in keys], batch_size=64, disable=['ner']):
                for tok in doc:
                    if tok.pos_ == 'VERB':
                        lem = tok.lemma_.lower()
                        if lem in keep and lem not in out:
                            out.append(lem)
            return out
        tgt = seq2(DB['antichrist_passages'])
        counts = []
        for want in ('Nebuchadnezzar', 'Goliath', 'Pharaoh'):
            c = next(x for x in DB['antichrist_claims'] if x['type'].startswith(want))
            counts.append(len([x for x in seq2(c['refs']) if x in tgt]))
        print('    %5d of %d    %s' % (len(keep), len(verb_chapters),
                                       '   '.join('%s %d' % (n, v) for n, v in
                                                  zip(('Nebuchadnezzar', 'Goliath', 'Pharaoh'), counts))))
    print("""
  Read downwards: dropping the hundred commonest verbs - four per cent of the
  vocabulary - takes the overlap to nothing. So the verbs these passages share are
  shared because they are ubiquitous, not because the passages correspond, and the
  verbs that would mean something are rare precisely because they do not recur.

  That is a real limit, not a bug to tune away. A hand-written motif such as
  "numbered with two condemned" matches Genesis 40 to Luke 23, which between them
  share almost no vocabulary: the motif performs an abstraction that no parser
  reading verbs can perform. The literature proposes pairings, and those can be
  disposed of against the cross-references. It does not propose motifs, and until
  something supplies those, sequence cannot be measured mechanically.""")

if __name__ == '__main__':
    main()
