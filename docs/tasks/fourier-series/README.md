# Fourier series: implementation tasks

Source: [Fourier series spec](../../specs/fourier-series-lessons.md). Decisions: [ADR 0034](../../adr/0034-fourier-series-models-handles-and-closed-loop.md). Stream: [functions](../feature-streams/functions.md). Slice kinds: [family template](../feature-streams/README.md#family-template).

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/fourier-series/`.

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Coefficient kernel](01-coefficient-kernel.md) | A, B | F1 | none | — | accepted 2026-10-31 |
| [02 Closed loop and epicycle chain kernel](02-closed-loop-kernel.md) | C | F1 | none | 01 | planned |
| [03 Batch A graph: partial sums and Gibbs](03-batch-a-graph.md) | A | F2a | `G-FN` | 01 | planned |
| [04 Batch A release](04-batch-a-release.md) | A | F2b–F6 | `G-REG` | 03 | planned |
| [05 Batch B: coefficients and decay](05-batch-b.md) | B | F2a–F6 | `G-FN`, `G-REG` | 01, 04 | planned |
| [06 Batch C: epicycles](06-batch-c.md) | C | F2a–F6 | `G-FN`, `G-REG` | 02, 05 | planned |

The Fourier graphs add function models, so their F2a slices wait for `G-FN` (A7 and A8). Re-read A7's result before task 03. The kernels are ungated.

## Slovenian terms (F0 decision)

Sources and the search method: [term research](../../reviews/fourier-series/terms-research.md). F is the FMF exercise sheet on Fourier series cited there. Each term goes into the [localization table](../../localization.md#choosing-new-terms) in the slice that first ships it.

| English | Slovenian | Basis |
| --- | --- | --- |
| Fourier series | Fourierova vrsta | F: *Fourierove vrste*; FMF *Analiza 2b* syllabus (spec). `sl.ts` uses *vrsta* for series |
| partial sum | delna vsota | Already in `analysisGuidedLessons.ts` (*delna vsota geometrijske vrste*) |
| Fourier coefficient | Fourierov koeficient | Regular adjective from *Fourierova vrsta*; F gives the formulas for \(a_0,a_n,b_n\) but the phrase itself was not seen |
| spectrum (bars) | amplitudni spekter | No Slovenian lecture source found. *Spekter* is used in a 2007 thesis on sound; *amplitudni* says what the bars show |
| Gibbs phenomenon | Gibbsov pojav | Spec proposal. A UL FMF diploma seminar is titled *Gibbsov fenomen*, so the first use glosses it once: *Gibbsov pojav (tudi Gibbsov fenomen)* |
| pointwise / uniform convergence | točkovna / enakomerna konvergenca | Existing `sl.ts` keys (*Enakomerna konvergenca*, *Točkovna napaka*) |
| epicycle | epicikel | Established loanword; prose says *vrteči se krogi* and uses *epicikel* as the term. No Slovenian source found |
| parametrization | parametrizacija | Existing `sl.ts` key `uniform_parametrization` |
| square / sawtooth wave | pravokotni / žagasti val | No source found. Transparent wording; the first use defines the function by its formula, so the name carries no claim |
| jump (discontinuity) | skok | Existing continuity lesson keys (*Skok*, *brez skoka*) |
