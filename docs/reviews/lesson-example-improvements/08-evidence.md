# 08 Retained-examples evidence (PARTIAL)

Status: partial. Written at the coordinator's handoff request. Rows marked "not yet checked" were not reviewed. The `git diff 791af6e` check (column G) was not run for any row.

Columns: A ID, B retained behavior, C content evidence (file:line of `demonstrationId`), D unit-test evidence, E smoke row, F changed since 791af6e, G outcome.

| A ID | B Retained behavior | C Content evidence | D Unit-test evidence | E Smoke row | F Changed since 791af6e | G Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| linear-function | Two points give slope/intercept; falling and vertical distinct | functionGuidedLessons.ts:13; two-point scene `x1 0, y1 1, x2 2, y2 5` (:138) | src/analysis/linear.test.ts:5, :24 (vertical); LinearFunctionGraph.test.ts:56, :178 | tests/guided-lessons.smoke.spec.cjs:790 | not yet checked | retain — covered (pending F) |
| exponential-function | Base 2 growth, reciprocal-base decay, reflection | functionGuidedLessons.ts:266; `a=2` (:391), `a=0.5` (:418), mirror (:445) | src/analysis/exponential.test.ts:11, :19, :31; ExponentialFunctionGraph.test.ts:101, :111 | smoke.spec.cjs:832 | not yet checked | retain — covered (pending F) |
| continuity | Jump at a=1; a=3/2 joins with corner | functionGuidedLessons.ts:845; jump `a=1` (:970), `a=1.5` (:1024, :1051) | src/analysis/continuity.test.ts:17 (jump), :27 (a=3/2 joins), :41 (corner slopes 3, -1.5); ContinuityGraph.test.ts:72, :127 | smoke.spec.cjs:929 | not yet checked | retain — covered (pending F) |
| derivative | x^2 at 1: secant slope 2+h | functionGuidedLessons.ts:1103; `h=0.5`, `0.1`, `-0.5` (:1216, :1243, :1270) | src/analysis/derivative.test.ts:40 (2+h), :62 (both sides); DerivativeGraph.test.ts:69, :123 | smoke.spec.cjs:984 | not yet checked | retain — covered (pending F) |
| definite-integral | Left/right vs midpoint/trapezoid; sine cancellation | functionGuidedLessons.ts:1349; `right`/`midpoint` (:1462, :1489); sin scene (:1543) | src/analysis/riemann.test.ts:13 (n=4 values), :56 (sin cancels); DefiniteIntegralGraph.test.ts:83, :175 | smoke.spec.cjs:1034 | not yet checked | retain — covered (pending F) |
| arc-length | Sine arch: one chord, two chords, finer polyline | functionGuidedLessons.ts:1837; example `[0,pi]` (:1893) | src/analysis/arcLength.test.ts:15 (n=1 chord, n=2), :31 (refinement); ArcLengthGraph.test.ts:80, :137 | smoke.spec.cjs:1135 | not yet checked | retain — covered (pending F) |
| bisection | x^2-2 on [1,2] halving; jump and multiple-root qualify guarantee | analysisGuidedLessons.ts:72; steps (:193–:302), `sign-step` jump (:274), `cubic` (:301) | src/analysis/bisection.test.ts:62 (midpoints), :76 (halving), :34/:203 (jump), :166 (x^3-x multiple roots) | smoke.spec.cjs:1187 | not yet checked | retain — covered (pending F) |
| mean-value | x^2, x^3, \|x\|: one match, multiple, failed hypothesis | analysisGuidedLessons.ts:353; scenes :501–:609 | src/analysis/meanValue.test.ts:33, :40, :44 (corner), :83, :87, :131 | smoke.spec.cjs:1248 | not yet checked | retain — covered (pending F) |
| accumulation | sin: signed accumulation, cancellation, orientation, derivative-as-height | analysisGuidedLessons.ts:660; scenes :825–:973 (`x=2 pi`, reversed `a=2`) | src/analysis/accumulation.test.ts:21, :61, :99, :112, :134 | smoke.spec.cjs:1312 | not yet checked | retain — covered (pending F) |
| darboux | Quadratic bounds integral; sine interior supremum | analysisGuidedLessons.ts:1027; sine scene (:1207, :1234) | src/analysis/darboux.test.ts:22, :30, :41 (sup 1 at pi/2) | smoke.spec.cjs:1374 | not yet checked | retain — covered (pending F); "endpoint-only sampling misses it" is implicit, not asserted |
| extrema | Square, cube, abs, sine: stationary, corner, endpoint, ties | analysisGuidedLessons.ts:1312; scenes :1437–:1573 (tie `a=0,b=pi`, :1546) | src/analysis/extrema.test.ts:34, :62, :67, :74, :88 (tie), :107, :118 | smoke.spec.cjs:1442 | not yet checked | retain — covered (pending F) |
| convexity | Square, neg square, cube, quartic; f''=0 without inflection | analysisGuidedLessons.ts:1624; scenes :1838–:1892 | src/analysis/convexity.test.ts:63, :69, :76 (x^4, f''(0)=0), :82 | smoke.spec.cjs:1505 | not yet checked | retain — covered (pending F) |
| fixed-point | Affine contraction, cosine, reflection: guarantee, threshold, two-cycle | analysisGuidedLessons.ts:2753; cosine (:2999), reflection (:3065) | src/analysis/fixedPoint.test.ts:42 (factors), :221, :308 (two-cycle), :274 (thresholds) | smoke.spec.cjs:1813 | not yet checked | retain — covered (pending F) |
| complex-multiplication | Multiply by i, real scale, 1+i; zero has undefined argument | foundationGuidedLessons.ts:404 (scenes not yet read) | src/analysis/complex.test.ts:62 ((1+i)i), :93 (real scale), :168 (undefined arg); ComplexMultiplicationGraph.test.ts:103, :187, :496 | smoke.spec.cjs:1752 | not yet checked | retain — partially checked; explicit "multiplication by i" rotation assertion not yet confirmed |
| subdivision | Arch splits into two same-degree pieces covering intervals exactly | constructionGuidedLessons.ts:24; scenes sd-after-half (:162), sd-after-third (:181) | SubdivisionGraph1.test.ts:69 (split at 1/2), :105; SubdivisionGraph.test.ts:64 (5 steps) | smoke.spec.cjs:216 | not yet checked | not yet checked (exact interval coverage not confirmed by a test) |
| repeated-subdivision | Halving gives 2^k pieces converging to same curve | constructionGuidedLessons.ts:210 | SubdivisionGraph.test.ts:183 (distance decreases with k); 2^k count not confirmed | smoke.spec.cjs:255 | not yet checked | not yet checked |
| extrapolation | Asymmetric cubic extends past endpoint; modest main extension | constructionGuidedLessons.ts:540; `t=6/5` (:584) | ExtrapolationGraph.test.ts:51, :75, :86 (worked example t=1.2) | smoke.spec.cjs:334 | not yet checked | retain — partially checked (content scene not read) |
| bernstein | Linear then cubic bases: count, nonnegativity, midpoint weights, partition of unity | foundationGuidedLessons.ts:22 (scenes not yet read) | BernsteinGraph.test.ts:37 (degree), :65 (stacked area); partition-of-unity/midpoint assertions not yet confirmed | smoke.spec.cjs:62 | not yet checked | not yet checked |

## Gaps

- Column F (changes since 791af6e) was not checked for any row. Run `git diff 791af6e -- <content file>` per file and compare hunks to the lesson line ranges above.
- Content scene actions were not read for complex-multiplication, subdivision, repeated-subdivision, bernstein; quoted values for constructions are partial.
- Unit tests for "2^k pieces" (repeated-subdivision) and "exact interval coverage" (subdivision) were not located.
- Bernstein partition-of-unity and midpoint-weight assertions were not located.
- Complex multiplication by i as a rotation by pi/2 was not confirmed by name.
- Browser checks (desktop, 390 px, SL/EN) were not performed.
- No regressions were identified so far, but this is not a full verdict.

## Handler resolution (2026-10-24)

- **Column F, all 18 rows: unchanged.** A hunk-to-lesson mapping of `git diff -U0 791af6e` over every lesson content file (`lessons_touched.py` in the job scratch directory) attributes changes only to the improved lessons (tasks 01–07) and shared file headers; no hunk falls inside any of the 18 retained lessons. `constructionGuidedLessons.ts` and `foundationGuidedLessons.ts` have no changes at all. The only shared runtime change is the additive `lesson-fixture` scene source; retained lessons still use `basedOn: 'demonstration-default'`, whose path is unchanged.
- `subdivision`: `constructionGuidedLessons.test.ts:98` checks the half split against exact points and the identities \(L(u)=B(tu)\), \(R(u)=B(t+(1-t)u)\) for five values of \(t\), i.e. exact interval coverage. **Retain — covered.**
- `repeated-subdivision`: `constructionGuidedLessons.test.ts:131` asserts \(2^k\) pieces covering the parameter intervals and polygons approaching the curve. **Retain — covered.**
- `extrapolation`: `constructionGuidedLessons.test.ts:197` checks the worked example and \(E(u)=B(tu)\); the scene keeps \(t=6/5\). **Retain — covered.**
- `bernstein`: `foundationGuidedLessons.test.ts:53` checks midpoint weights \(1/8,3/8,3/8,1/8\), their sum 1 and the lesson's degree scenes; nonnegativity and the stacked area are covered in `BernsteinGraph.test.ts`. **Retain — covered.**
- `complex-multiplication`: `foundationGuidedLessons.test.ts:103` checks the lesson against complex arithmetic and hidden prediction steps; `complex.test.ts` covers \((1+i)i\), real scaling and the undefined argument of zero. **Retain — covered.**
- `darboux`: the endpoint-sampling remark is prose over the tested interior supremum; no new test needed.

**Outcome:** all 18 retained; no regressions. Remaining gap: browser checks of initial and contrasting scenes, run in task 09 through the existing smoke rows.
