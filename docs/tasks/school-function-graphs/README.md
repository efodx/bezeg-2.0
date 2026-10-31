# Function graphs for the matura: implementation tasks

Source: [school function graphs spec](../../specs/school-function-graphs-lessons.md). Decisions: [ADR 0026](../../adr/0026-school-function-catalogue.md). Stream: [functions](../feature-streams/functions.md). Slice kinds: [family template](../feature-streams/README.md#family-template).

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/school-function-graphs/`. Matura level labels (OR/VR) stay off until each item has been checked in the catalogue PDF.

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Catalogue core](01-catalogue-core.md) | A | F1 | none | — | accepted ([review](../../reviews/school-function-graphs/01-catalogue-core-math-review.md); transform bounds await owner confirmation) |
| [02 Transformation and inverse kernels](02-transformation-inverse.md) | A | F1 | none | 01 | accepted ([review](../../reviews/school-function-graphs/02-transformation-inverse-math-review.md)) |
| [03 Polynomial and rational kernels](03-polynomial-rational.md) | B | F1 | none | 01 | reviewed and repaired ([review](../../reviews/school-function-graphs/03-polynomial-rational-math-review.md)); accepted 2026-10-31 (full suite green apart from two master-side Preset contract failures fixed in `57756e6`); `POLY_BOUNDS` await owner confirmation |
| [04 Geometric series and conic kernels](04-series-conic.md) | C | F1 | none | — | accepted ([math review](../../reviews/school-function-graphs/04-series-conic-math-review.md)) |
| [05 Batch A Demonstrations](05-batch-a.md) | A | F2a–F6 | `G-FN`, `G-REG` | 01, 02 | planned |
| [06 Batch B Demonstrations](06-batch-b.md) | B | F2a–F6 | `G-FN`, `G-REG` | 03, 05 | planned |
| [07 Batch C Demonstrations](07-batch-c.md) | C | F2a–F6 | `G-FN`, `G-REG` | 04, 06 | planned |

## Slovenian terms (F0 decision)

These were checked against `sl.ts` and the lesson content, where *premik*, *raztegnitev*, *zrcaljenje*, *ničla*, *asimptota*, *delna vsota* and *geometrijska vrsta* are already used. Each term goes into the localization table in the slice that first ships it.

| English | Slovenian | Basis |
| --- | --- | --- |
| shift / stretch / reflection | premik / raztegnitev / zrcaljenje | Existing app usage. The spec's *prenos* is replaced by *premik*, which is used about 60 times. |
| inverse function | inverzna funkcija | Standard school term |
| logarithm to base \(a\) | logaritem z osnovo \(a\) | School usage; `sl.ts` already has *logaritem* |
| zero, multiplicity | ničla, večkratnost ničle (*k*-kratna ničla) | Existing *ničla*; *večkratnost* is standard |
| pole, hole | pol, luknja (odpravljiva nezveznost) | Gloss on first mention |
| vertical, horizontal, oblique asymptote | navpična, vodoravna, poševna asimptota | Existing *asimptota*; standard school wording |
| geometric series, partial sum | geometrijska vrsta, delna vsota | Existing app usage |
| conic, focus, directrix, eccentricity | stožnica, gorišče, vodnica, numerična ekscentričnost \(\varepsilon\) | Slovenian school texts use *numerična ekscentričnost* \(\varepsilon\) and linear \(e\). The spec's *izsrednost* is not used. See ADR 0026 §4. |
