#!/usr/bin/env python3
"""Assembles a prophetic figure from its partial descriptions, and tries to match types to it.

Prophecy describes a figure in part. No passage gives the Antichrist whole: Daniel 7
gives the mouth speaking great things, Daniel 8 the self-magnifying and the breaking
without hand, Daniel 9 the covenant and the ceasing sacrifice, 2 Thessalonians the
sitting in the temple, Revelation 13 the war with the saints. The whole is a union of
shadows. This builds that union mechanically and asks whether the figures the
literature calls types resemble it more than ordinary narrative does.

A character segment is a predicate whose subject is the figure - the verb with whatever
completes it - which is extractable here in a way narrative motifs were not, because in
prophecy the subject is almost always the figure himself.

Result as it stands: the assembly works and gives 108 segments. The matching does not.
Claimed types average 0.06 against 0.01 for forty random Old Testament narrative
chapters - six times the control but a sixth of one per cent of the way to useful, with
only five of thirteen above the control mean and most scoring zero. The reason is the
same abstraction gap one level up: "magnify himself" and "exalt himself" are the same
segment and share no distinctive word, so lexical matching cannot join them. Closing
that needs paraphrase matching over the segments, which is the one place a model's
similarity judgement would be doing honest work rather than supplying an opinion.

Needs spaCy, which the app does not ship:
    pip install spacy && python -m spacy download en_core_web_sm
    python3 tools/compose_figure.py
"""
import json,re,random,collections,spacy
nlp=spacy.load('en_core_web_sm')
b=json.load(open('data/bible.json'))
DB=json.load(open('data/typology-sources.json'))
src=open('tools/dispose_sources.py').read(); ns={'re':re}
exec(src[src.index('BOOK = {'):src.index('def lcs')],ns); parse_ref=ns['parse_ref']
chaps=collections.defaultdict(list)
for k,t in b.items():
    bk,c,_=k.split('.'); chaps[bk+'.'+c].append(k)
# distinctiveness, counted over the whole ASV
df=collections.Counter()
for cid,keys in chaps.items():
    s=set()
    for d in nlp.pipe([b[k] for k in keys],batch_size=256,disable=['ner','parser']):
        for t in d:
            if t.pos_ in ('VERB','NOUN','PROPN'): s.add(t.lemma_.lower())
    for w in s: df[w]+=1
N=len(chaps); DISTINCT={w for w,n in df.items() if n<=N/20}
SUBJ={'he','him','his','himself','who','which','that','king','beast','horn','man','prince','one','whose','they'}
BAD=re.compile(r'\b(you|ye|thee|thou|I|we|us)\b',re.I)
def segs(keys):
    out=[]
    for k in keys:
        for tok in nlp(b[k]):
            if tok.pos_ not in ('VERB','AUX'): continue
            subs=[c for c in tok.children if c.dep_ in ('nsubj','nsubjpass')]
            if not any(s.text.lower() in SUBJ or s.pos_=='PRON' for s in subs): continue
            comp=[]
            for c in tok.children:
                if c.dep_ in ('dobj','attr','oprd','acomp','xcomp','prep','dative'):
                    comp += [w for w in c.subtree]
            txt=' '.join(w.text for w in comp)
            if BAD.search(txt): continue
            nouns={w.lemma_.lower() for w in comp if w.pos_ in ('NOUN','PROPN','ADJ')}
            out.append((tok.lemma_.lower(), nouns))
    return out
def rng(bk,c,a,z): return ['%s.%d.%d'%(bk,c,v) for v in range(a,z+1) if '%s.%d.%d'%(bk,c,v) in b]
AC = rng('Dan',7,8,8)+rng('Dan',7,20,25)+rng('Dan',8,23,25)+rng('Dan',9,26,27)+rng('Dan',11,36,39)+ \
     rng('2Thess',2,3,10)+rng('Rev',13,1,8)+rng('Rev',13,11,17)+rng('Rev',17,8,14)
COMP=segs(AC)
def score(keys):
    S=segs(keys)
    if not S: return 0.0,0,0
    hit=0
    for v,ns in S:
        for cv,cns in COMP:
            if (v==cv and v in DISTINCT) or (ns & cns & DISTINCT):
                hit+=1; break
    return hit/len(S), hit, len(S)
print('composite: %d character segments from %d verses; %d distinctive lemmas\n'%(len(COMP),len(AC),len(DISTINCT)))
claimed=[]
for c in DB['antichrist_claims']:
    keys=[k for r in c['refs'] for k in parse_ref(r) if k in b]
    if len(keys)<4: continue
    s,h,n=score(keys); claimed.append((s,c['source']+'/'+c['type'],h,n))
claimed.sort(reverse=True)
print('claimed types of the Antichrist:')
for s,nm,h,n in claimed: print('   %.2f  %2d/%-3d  %s'%(s,h,n,nm))
rnd=random.Random(20261105)
ot=[cid for cid in chaps if cid.split('.')[0] in
    ('Gen','Exod','Lev','Num','Deut','Josh','Judg','1Sam','2Sam','1Kgs','2Kgs','1Chr','2Chr','Esth','Jer','Ezek')]
ctl=[]
for cid in rnd.sample(ot,40):
    s,h,n=score(chaps[cid])
    if n>=4: ctl.append((s,cid))
ctl.sort(reverse=True)
mean=lambda xs: sum(xs)/len(xs) if xs else 0
print('\ncontrol: 40 random Old Testament narrative chapters, %d with enough segments'%len(ctl))
print('   mean %.2f   highest %.2f (%s)   lowest %.2f'%(mean([x[0] for x in ctl]),ctl[0][0],ctl[0][1],ctl[-1][0]))
print('\nclaimed mean %.2f   control mean %.2f   difference %+.2f'%(
    mean([x[0] for x in claimed]),mean([x[0] for x in ctl]),mean([x[0] for x in claimed])-mean([x[0] for x in ctl])))
above=sum(1 for s,_,_,_ in claimed if s>mean([x[0] for x in ctl]))
print('%d of %d claimed types score above the control mean'%(above,len(claimed)))
