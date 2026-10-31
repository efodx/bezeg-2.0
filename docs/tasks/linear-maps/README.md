# Linear maps of the plane: implementation tasks

Source: [linear maps spec](../../specs/linear-maps-lessons.md). Decisions: [ADR 0025](../../adr/0025-linear-map-graph-and-snapped-matrices.md). Stream: [maps](../feature-streams/maps.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template).

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/linear-maps/`.

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Matrix kernel](01-matrix-kernel.md) | 0 | F1 | none | — | in progress |
| [02 Eigen and singular kernel](02-eigen-singular-kernel.md) | 0 | F1 | none | 01 | planned |
| [03 State model and Presets](03-state-model.md) | A | F2a | none | 01 | planned |
| [04 Grid drawing measurement and ADR](04-grid-drawing-measurement.md) | A | measurement + ADR | none | 01 | planned |
| [05 Graph: basis and determinant modes](05-graph-basis-determinant.md) | A | F2a | none | 03, 04 | planned |
| [06 Batch A registration](06-batch-a-registration.md) | A | F2b | `G-REG` | 05 | planned |
| [07 Batch A lessons, chapter, media, acceptance](07-batch-a-lessons.md) | A | F3–F6 | `G-REG` | 06 | planned |
| [08 Batch B](08-batch-b.md) | B | ADR, F2a–F6 | `G-REG` | 02, 07 | planned |
| [09 Batch C](09-batch-c.md) | C | F2a–F6 | `G-REG` | 08 | planned |

## Slovenian terms (F0 decision)

From the spec's table, checked against `sl.ts`, `src/learning/content/` and UL teaching material. Each term goes into the [localization table](../../localization.md#choosing-new-terms) in the slice that first ships it.

| English | Slovenian | Basis |
| --- | --- | --- |
| linear map | linearna preslikava | FMF *Algebra 1* syllabus, "linearne preslikave" |
| matrix | matrika | FMF *Algebra 1*; standard |
| image of the basis | slika baze | PIK "baza"; transparent wording |
| determinant; signed area | determinanta; predznačena ploščina | FMF "determinante"; *predznačena ploščina* already used for signed integral area in `functionGuidedLessons.ts` and `familyChapters.ts` |
| orientation kept / reversed | orientacija ohranjena / obrnjena | PIK "orientacija trikotnika" |
| eigenvalue; eigenvector; eigen-direction | lastna vrednost; lastni vektor; lastna smer | FMF "lastne vrednosti"; *lastni vektor* is the matching standard form; *lastna smer* is transparent wording, glossed on first use |
| characteristic polynomial | karakteristični polinom | FMF *Algebra 1* |
| trace | sled (matrike) | Standard Slovenian linear algebra usage; a search found no UL page defining it, so prose glosses it once as "vsota diagonalnih elementov" |
| shear | strig | Standard; transparent, glossed on first use |
| symmetric matrix | simetrična matrika | Standard; FMF "sebi adjungirani endomorfizmi" names the general case |
| singular values; singular value decomposition | singularne vrednosti; singularni razcep | FMF *Numerične metode* slides (Plestenjak, NM 1 2017 SVD, ucilnica.fmf.uni-lj.si) and FRI linear algebra exercises use both |
| quadratic form | kvadratna forma | Transparent standard wording; FMF syllabus says "kvadratni funkcionali", given as a gloss on first use |
| conic | stožnica (krivulja drugega reda) | FMF "krivulje drugega reda"; PIK §4.11 |
| composition | kompozitum | Standard Slovenian ("kompozitum preslikav", sl.wikipedia *Kompozitum funkcij*) |
| reflection; rotation | zrcaljenje; vrtež | PIK; *vrtež* already in `sl.ts` and `foundationGuidedLessons.ts` |
| affine map | afina preslikava | Existing affine lesson (`expansionGuidedLessons.ts`) |
| kernel; rank | jedro; rang | FMF *Algebra 1* |
