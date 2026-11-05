# Simulated answers, for testing the workbench without a key

These three files are **not model output**. They were written by hand to exercise
`tools/propose.mjs` end to end — the verification gate, the blind match and the
controls — on a machine with no `ANTHROPIC_API_KEY`.

`simulated-joseph.json` deliberately contains three bad entries, to prove the gate
rejects them: a motif outside the vocabulary, a quotation that is not in the verse it
cites, and a reference outside the passage the describer was given. That last one is
what structurally enforces blindness: a description of Joseph cannot reach into Matthew.

Reproduce with:

    node tools/propose.mjs describe joseph "Joseph" Gen.37 Gen.39 Gen.40 Gen.41 Gen.42 Gen.45 Gen.47 Gen.50 --from tools/fixtures/simulated-joseph.json
    node tools/propose.mjs describe passion "the Passion and after" Matt.26 Matt.27 Matt.28 Luke.23 Luke.24 --from tools/fixtures/simulated-passion.json
    node tools/propose.mjs describe esther "Esther and Mordecai" Esth.3 Esth.6 Esth.7 Esth.8 --from tools/fixtures/simulated-esther.json
    node tools/propose.mjs match joseph passion

Writing each side without the other in view gives **9 shared motifs at p=0.097**. The
sighted annotation in `data/typology.json`, written with both texts open and the
correspondence already in mind, gives **24 shared motifs at p<0.001**. The protocol is
doing the work the protocol was added to do. Confirming that with a real model, rather
than with a hand-written stand-in, needs a key.
