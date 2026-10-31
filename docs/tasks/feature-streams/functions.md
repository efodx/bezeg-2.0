# Stream: Functions
Run state: active

Rules and slice template: [feature streams](README.md). Port 4315. Handoffs: `docs/reviews/feature-streams/functions/`. Each family creates `docs/tasks/<family>/` in F0 and records slice status there. This file holds one status line per family.

| # | Family | Spec | Prerequisites | Status |
| --- | --- | --- | --- | --- |
| 1 | Numerical methods on the graph | [numerical-methods-lessons.md](../../specs/numerical-methods-lessons.md) | Kernels: none. Graph code (extends `IterativeFunctionGraph`): `G-FN`; registration and lessons: `G-REG` | F0 done ([tasks](../numerical-methods/README.md), ADR 0023); kernels 01–03 accepted; graph slices wait for `G-FN`, `G-REG` |
| 2 | Function graphs for the matura | [school-function-graphs-lessons.md](../../specs/school-function-graphs-lessons.md) | Function catalogue extension kernel and its ADR: none. Graph code: `G-FN`; registration and lessons: `G-REG` | F0 done ([tasks](../school-function-graphs/README.md), ADR 0026); kernels 01, 02, 04 accepted; 03 implemented on the stream branch, awaiting an S4 spec decision and review ([handoff 2](../../reviews/feature-streams/functions/handler-handoff-2.md)) |
| 3 | Projective geometry of conics | [projective-conics-lessons.md](../../specs/projective-conics-lessons.md) | Family 2's focus–directrix conics; existing rational Bézier conics; homogeneous-coordinate kernel and exactness ADR | planned |
| 4 | Fourier series | [fourier-series-lessons.md](../../specs/fourier-series-lessons.md) | Coefficient kernel: none. Graph code: `G-FN`; registration and lessons: `G-REG`. Epicycles drawing ADR by measurement | planned |

## Notes

- `G-FN` opens at Platform step 4. Until then this stream has plenty of ungated work: F0 for all four families, and the kernels for numerical methods, the function catalogue, the homogeneous coordinates and the Fourier coefficients. Run kernels for later families before idling.
- Numerical methods may use family 2's extended function catalogue once it exists. It does not wait for it.
- Every function model added here follows the single-owner rules A7 introduces (validity, normalization, structured diagnosis). Re-read A7's result when `G-FN` opens, before any graph slice.
- Direction fields (N5) and epicycles (F5) are rendering-heavy. Measure them before choosing a drawing approach.
