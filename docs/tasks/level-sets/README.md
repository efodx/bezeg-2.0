# Level sets, gradient and optimization: implementation tasks

Source: [level-sets spec](../../specs/level-sets-optimization-lessons.md). Decisions: [ADR 0053](../../adr/0053-level-sets-contour-graph-marching-squares-exact-lp.md). Stream: [families-prep](../feature-streams/families-prep.md). Slice kinds: [family template](../feature-streams/README.md#family-template). The spec is a draft prepared for release; release is not scheduled.

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/feature-streams/families-prep/`.

F1 is ungated. F2a waits for Controls step 5 and the contour and mesh measurement, and F2b–F6 for Controls step 7 ([boundary](../feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)).

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Function catalogue and marching squares](01-catalogue-contours.md) | 0 | F1 | none | — | done |
| [02 Descent and constrained point](02-descent-constrained.md) | 0 | F1 | none | 01 | done |
| [03 Exact linear programming](03-linear-programming.md) | 0 | F1 | none | — | planned |
| [04 Measurement, state models and graphs](04-graphs.md) | A–C | F2a | Controls step 5 | 01–03 | planned |
| [05 Release batches A–C](05-release-batches.md) | A–C | F2b–F6 | Controls step 7 | 04 | planned |

## Slovenian terms (F0 decision)

These are checked against `sl.ts`, which has *ploskev*, *stacionarna točka*, *lokalni minimum*, *sedlo*, *oglišče* and *korak*. *omejitev* already means a step cap, so it is not used for constraints. A web search on 2026-11-10 found UL optimization notes and a secondary-school textbook (Rokus Klett). They enter the [localization table](../../localization.md#choosing-new-terms) when first shipped.

| English | Slovenian | Basis |
| --- | --- | --- |
| level curve | nivojnica | Standard UL analysis term |
| contour map | zemljevid nivojnic | Changed from the spec's *nivojski zemljevid* to the more transparent genitive phrase. *plastnice* is rejected as a cartography word |
| gradient; gradient descent; step size | gradient; gradientni spust; velikost koraka | Standard; *korak* exists |
| constrained extremum; constraint | vezani ekstrem; vezni pogoj | UL FMF *Analiza* term *vezani ekstremi* |
| Lagrange multiplier | Lagrangeev multiplikator | Settles the spec's open choice. The possessive follows the pronunciation (*Lagranž*), as for other names ending in a silent *e* |
| linear programming | linearno programiranje | UL FMF *Optimizacija* |
| objective function | kriterijska funkcija | UL optimization notes use *kriterijska funkcija*. Glossed as *ciljna funkcija*, the secondary-school textbook wording, on first use |
| feasible region; vertex | dopustno območje; oglišče | The school textbook says *dopustno območje* for the planar region. UL notes say *dopustna množica* for the general set. *oglišče* exists |
| LP constraint | omejitveni pogoj | Transparent; avoids *omejitev* |
