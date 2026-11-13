# Linear maps of the plane: implementation tasks

Source: [linear maps spec](../../specs/linear-maps-lessons.md). Decisions: [ADR 0025](../../adr/0025-linear-map-graph-and-snapped-matrices.md). Stream: [maps](../feature-streams/maps.md). Slice kinds F0–F6: [family template](../feature-streams/README.md#family-template).

Workers: `bezeg-worker`, Sonnet 5.5 `medium`. Return at most 400 words. Bulky evidence goes to `docs/reviews/linear-maps/`.

| Task | Batch | Slice | Gate | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01 Matrix kernel](01-matrix-kernel.md) | 0 | F1 | none | — | done 2026-10-31 (handler math review; full suite passed) |
| [02 Eigen and singular kernel](02-eigen-singular-kernel.md) | 0 | F1 | none | 01 | done 2026-10-31 (handler math review; `singular` now rejects off-grid entries) |
| [03 State model and Presets](03-state-model.md) | A | F2a | none | 01 | done 2026-10-31 (handler review; mismatched example id imports as `custom`) |
| [04 Grid drawing measurement and ADR](04-grid-drawing-measurement.md) | A | measurement + ADR | none | 01 | done 2026-10-31 (ADR 0032: one NaN-break polyline) |
| [05 Graph: basis and determinant modes](05-graph-basis-determinant.md) | A | F2a | none | 03, 04 | done 2026-10-31: engineering/UI and mathematical review; repair `3656e55` (graph accepts only its drawn modes). No route yet, so no smoke run; open: probe fixed at (1, 1), drag handles keyboard path is the numeric fields |
| [06 Batch A registration](06-batch-a-registration.md) | A | F2b | `G-REG` | 05 | done 2026-11-01: route `/bezeg-2.0/linear-map`, family `maps`, `lesson: false`; lessonless exemptions (owner placeholder, `POSTER_PENDING`, Learn/catalog tests) to remove in 07; handler engineering review; smoke SL/EN, live switch, Preset save/restore, `/bezier/affine` passed |
| [07 Batch A lessons, chapter, media, acceptance](07-batch-a-lessons.md) | A | F3–F6 | `G-REG` | 06 | F3+F4 done 2026-11-01 (engineering + mathematical review, Sonnet; handler repair of the L1 grid-line sentence; `chapterOwnedLessons` table replaces per-chapter branches in shared learning code); F5: poster recipe on `master` (`fa0f1269`; capture waits on Geometry's three failing recipes, then `PREVIEW_RECAPTURE_IDS=linear-map`); example cards captured 2026-11-01 with the chapter capture mode (`src/images/learning/examples/linear-maps/`, handler check of both images against the copy and the matrix example; the L1 identity card's grid fills only the left part of the frame, as the authored start window does); F6 checks 2026-11-01 at `f61b844e`: `check` parts green (tsc, lint, full unit, build), smoke of the route and L1/L2 in SL/EN passed (drag, numeric entry, singular det 0, Preset restore, refresh, live switch, 390 px, chapter cards), hosted CI checks/build/unit green; keyboard decision: board handles stay pointer-only and the matrix spinbuttons (Uredi) are the keyboard path, verified by ArrowUp changing the board; `just linear-map-bench` not rerun: the owner removed the classroom device check on 2026-11-06, and ADR 0032 stands on the task 04 measurement. Identity label overlap fixed 2026-11-01 (`0418230f`: source labels step aside while their image is less than a unit away; the shared point reads \(Ap=A(e_1+e_2)\) with the square and \(p\) shown; browser check at 1366 and 1920 px, SL and EN after a live switch, L1 smoke row and hosted CI green). Gate still open: poster capture (F5) |
| [08 Batch B](08-batch-b.md) | B | ADR, F2a–F6 | `G-REG` | 02, 07 | ADR 0060, F2a eigen and ellipse modes done 2026-11-13; F3–F6 (L3, L4, chapter, cards, gate) done 2026-11-13; owed items in the task |
| [09 Batch C](09-batch-c.md) | C | F2a–F6 | `G-REG` | 08 | planned |
| [10 Batch D kernel: iteration and stability](10-batch-d-kernel.md) | D | F1 | none | 02 | done (families-prep, ADR 0057) |
| [11 Batch D: power method and stability](11-batch-d.md) | D | F2a–F6 | Controls step 5; step 7 | 08, 10 | F2a–F6 done 2026-11-13 (L6, L7, chapter, cards, gate); owed items in the task |

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
