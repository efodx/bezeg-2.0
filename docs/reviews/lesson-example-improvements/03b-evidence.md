# Task 03 part (b) evidence

Uncommitted. Source changes are described in `03b-handoff.md`; smoke follow-ups in `03b-smoke-changes.md`.

## Per ID

| ID | Retain / change | Scenes, inputs, views | Checks |
|---|---|---|---|
| `rational-elevation` | Change: worked example gains `w'_1=7/4`, `hat Q_1=(-11/2,15/4,7/4)`; check names homogeneous point and projection to `(-22/7,15/7)`; step 3 states weights `(1,2,1,1)` vs elevated and that the original polygon is no longer drawn. Retain: 5 steps, scenes. | Default scenes; points `(-4,-3),(-3,3),(3,3),(4,-3)`, weights `(1,2,1,1)`; default view. | Homogeneous elevation computed independently; matches `RationalBezierCurve.elevate` weights/points; homogeneous curve equal at u in {0,.1,.3,.5,.8,1}; twice-elevated curve equal; once/twice elevated points within `[-5,5]^2`. |
| `rational-subdivision` | Change: step 2 (equal weights: last coordinates 1, ordinary subdivision), step 3 (equal-weight shared point `(0,3/2)` vs weighted `(-9/11,21/11)`). Retain: scenes. | Default scenes, t=1/2 and 1/3. | Equal weights: piece weights 1 and pieces equal `PolynomialBezierCurve.subdivide`; shared point `(0,3/2)`; weighted shared `(-9/11,21/11)`, weight 11/8, equals original at 1/2; parts equal original on `[0,t]`,`[t,1]` for t=.3,.5. |
| `rational-extrapolation` | Change: steps 3 (t=6/5) and 4 (t=3/2) become `lesson-fixture` scenes with widened views; step 4 retitled "Advanced: a negative weight, yet no pole"; zoom-out instructions removed; `D(s)=1+3s(1-s)^2` prose, root near -0.223, edge cases. Retain: steps 1-2 default scenes. | Fixture points `(-4,-3),(-3,3),(3,3),(4,-1)`, weights `(1,2,1,1)`; views `[-7,8,17,-6]` (t=1.2) and `[-34,9,6,-6]` (t=1.5). | Min D over `[0,1.2]` and `[0,1.5]` = 1; D formula; root -0.2229; control points `(176/13,33/13)` and `(-29.5,6)` match `extrapolate`; weights 143/125, -1/2, 17/8; all extended control points (margin 0.3) and the extended curve inside each scene view (read from `getLessonForDemonstration`); scene is a fixture with lesson curve; prose numbers per step in sl and en. |
| `farin` | Change: weights recoverable only up to common factor (w_0=1 normalizes); standardization keeps point set, parameter-1/2 point moves `B(3/4)=(79/32,3/8)` to `B(1/2)=(0,3/2)`. Retain: scenes. | Default scenes; weights `(1,2,1,1)` and `(1,3,9,27)`, `(1,1,1,1)`. | Farin points and recovered weights invariant under scaling by 1, 2, 1/4; standard form gives weights all 1; `R_w(s)=B(3s/(1+2s))` over 21 samples (same locus); evals `(79/32,3/8)` and `(0,3/2)`; step/example prose in sl and en. |
| `circle` | Change: n=3 steps (1, 2) use view `[-7,8,7,-5]` (apex `(0,6)`, middle points `(+-5.196,-3)` were outside default `[-5,5,5,-5]`); prose says circle is exact for every n. Retain: n=4,6,12 scenes with no view. | `set-circle-pieces` 3,3,4,6,12. | n=3 points inside widened view (margin .3) and some outside default; apex and two side points exact; n=4 points inside default view; steps 3-5 set no view; every curve point at distance 3 (n=3,4,6) via independent homogeneous evaluation and the repo class; prose `(0,\,6)` in sl and en. |

## Commands and results

- New: `src/learning/content/rationalConstructionExamples.test.ts` (24 tests).
- `npx vitest run` of foundation, construction, rationalConstruction, rationalConstructionExamples, lessonMathNotation, sceneContentAgainstGraphs tests and `src/learning/runtime/lessonCatalog.test.ts`: 7 files, 139 tests pass.
- `npx tsc --noEmit --pretty false`: 0 errors (no casts used in the new test).

## Mutation checks (each restored afterwards)

Killed (new test fails): `hat Q_1` y 15/4 to 15/5; `w'_1` to `w'_2`; `B(1/2)=(0,3/2)` to `(1,3/2)`; `21/11` to `22/11` (both step lines); example view right edge 17 to 12; negative-weight view left edge -34 to -20; fixture weight 1 to 2; `\ge1` to `\ge2` in `D`; `-0{,}223` to `-0{,}233` (sl step and formula; en `-0.223`); `13{,}54`/`13.54` to `13{,}45`/`13.45` (step prose); `29{,}5`/`29.5` to `29{,}6`/`29.6` (step 4 explanation); circle view `[-7,8,7,-5]` to `[-5,8,5,-5]`; Farin `79/32` to `79/33` (step and check). Two first-pass survivors (`-0{,}223`, `13.54`) were due to the assertion matching other occurrences in the lesson; assertions were narrowed to the specific step/field and then killed. Scripts: `.claude/jobs/b79000ae/tmp/mut.cjs`, `mut2.cjs`.

Not mutation-tested: assertions on repo curve classes (they would change only with a class bug); the Farin "recover weights" check wording and `rex-denominator` notation text.

## Gaps

- The rational graph has no original-vs-elevated overlay; the elevation lesson states this in prose only and cannot show the original polygon next to the elevated one.
- Browser behavior of the fixture views (applied on step entry, restored on exit) not verified; no Playwright/build run.
- sl/en prose numbers verified in strings only, not rendered in the browser (including live language switch).
- Smoke spec not edited; see `03b-smoke-changes.md`.
