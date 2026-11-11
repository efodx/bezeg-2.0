# Combinatorics and Pascal's triangle: implementation tasks

Source: [combinatorics spec](../../specs/combinatorics-lessons.md). Decisions: [ADR 0048](../../adr/0048-combinatorics-bigint-counts-and-two-graphs.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5, and F2b–F6 for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Combinatorics kernel](01-combinatorics-kernel.md) | 0 | F1 | none | — | done |
| [02 State model and graphs](02-graphs.md) | A–C | F2a | Controls step 5 | 01 | planned |
| [03 Release batches A–C](03-release-batches.md) | A–C | F2b–F6 | Controls step 7 (accepted) | 02 | F2b done 2026-11-11 ([evidence](../../reviews/feature-streams/families-prep/notes/f2b-circle-combinatorics.md)); F3–F6 next |

## Slovenian terms (F0 decision)

All terms come from the PIK §4.15 text and are checked against `sl.ts`, which has none of them yet. They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| combinatorics; counting tree | kombinatorika; kombinatorično drevo | PIK §4.15 |
| product rule; sum rule | osnovni izrek kombinatorike; pravilo vsote | PIK §4.15 |
| permutation, variation, combination (with repetition) | permutacija, variacija, kombinacija (s ponavljanjem) | PIK §4.15 |
| binomial coefficient; binomial theorem | binomski simbol; binomski izrek | PIK §4.15 |
| Pascal's triangle | Pascalov trikotnik | PIK §4.15 |
| lattice path | pot po mreži | Transparent wording. No source shows *monotona pot*, so the plain phrase is kept and glossed as "only right and up" on first use |
| step right; step up (route letters) | D (desno); G (gor) | Spec F2a decision: Slovenian route letters D and G (English R and U); the model keeps R and U internally |
| custom (example choice) | Po meri | Shared example rule: the select shows it only while no example matches |
| computed (readout suffix) | (izračunano) | Shared wording of the other families |
| scene content selector | Vsebina | Not "Prikaz": the inspector tab already carries that name |
| expansion readout of (x + c)ⁿ | Binomski izrek | The table term above (was "Dvočlenik") |
| target fields of the lattice | Koraki desno (a); Koraki gor (b) | The letter in brackets names the symbol the board and the formula use |
| route and page reset notice | Pot in stran sta ponastavljeni na 1. | Status clause when changing the target resets the chosen route |
| k lowered notice | k je znižan na {k}. | Status clause when n or a switch forces k down |
| groups of orderings (unordered, no repetition, k from 2 to 4) | Kombinacija …; × C skupin = V / k! | Board caption of the grouping panel |
