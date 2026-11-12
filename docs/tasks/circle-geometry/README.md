# Circle geometry and constructions: implementation tasks

Source: [circle geometry spec](../../specs/circle-geometry-lessons.md). Decisions: [ADR 0045](../../adr/0045-circle-construction-graph-and-exact-tangency.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 and F2a are ungated. F2b–F6 wait for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Circle construction kernel](01-construction-kernel.md) | 0 | F1 | none | — | done |
| [02 State model and construction graph](02-construction-graph.md) | A, B | F2a | none | 01 | done |
| [03 Release batches A–B](03-release-batches.md) | A, B | F2b | Controls step 7 (accepted) | 02 | F2b done 2026-11-11 ([evidence](../../reviews/feature-streams/families-prep/notes/f2b-circle-combinatorics.md)); split into 04–05 |
| [04 Batch A: CG1–CG2 lessons](04-batch-a-lessons.md) | A | F3–F6 | Controls step 7 (accepted) | 03 | F3 done 2026-11-12 (CG1, CG2; chapter skeleton); F4–F6 next |
| [05 Batch B: CG3–CG4 lessons](05-batch-b-lessons.md) | B | F3–F6 | Controls step 7 (accepted) | 04 | F3 in progress |

## Slovenian terms (F0 decision)

These come from the spec's table, checked against `sl.ts` (which has *tangenta*, *sekanta*, *tetiva*, *točka dotika*, *potenca točke na krožnico* and *Talesov izrek*) and the PIK text. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| tangent; point of contact | tangenta; točka dotika | Existing |
| power of a point | potenca točke na krožnico | Existing table |
| radical axis; radical centre | potenčna premica; potenčno središče | Built on the existing *potenca*. The usual Slovenian names; glossed on first use |
| Apollonius circle | Apolonijeva krožnica | Standard Slovenian form of the name |
| Thales circle | Talesova krožnica | From the existing *Talesov izrek* |
| common tangent (external / internal) | skupna tangenta (zunanja / notranja) | Transparent wording |
| centre of similarity | središče raztega | PIK §4.6 *središčni razteg* |
| chord of contact | tetiva dotikališč | Built on the existing *tetiva*; glossed on first use |
| division point (internal / external) | delilna točka (notranja / zunanja) | Transparent standard wording from *delilno razmerje*; no source consulted, no web access in the run that chose it |
| coaxal circles | krožnice z isto potenčno premico | Handler 11 (CG2): descriptive wording; *soosne krožnice* rejected (reads as a common axis of symmetry); no established term verified |
