# 09 smoke repair

All 16 failures were fixed; 13 rows plus the Shared runtime group pass (42 + 9 tests) on the build of the edited tree.

| Failure | Cause | Fix |
|---|---|---|
| spline / param setup (9 walks, Back test) | Test assumption: `setup` asserted route-default counts, but the sl walk calls it after step 1's fixture is applied | `expectDefaultPoints` / `controlPointCount` (spec ~l.143-157) assert defaults only while no lesson panel is open; step 1 is asserted by stepProbe. Control points are now points minus the samples-slider value |
| elevation | Test assumption: both P (4) and preview Q (5) polygons are drawn, so 9 points; step 3 adds the B(1/2) marker; after elevation 5 + 6 preview + B(3/4) marker; one user elevation adds 2 points | exact per-step counts [9, 9, 10, 12]; user elevation `base + 2` |
| rational | Test assumption: weight labels are ON by default on `/rational/base` ([1,2,1,1]) | assert defaults, restore compares with saved weights |
| ph-cubic / ph-quintic | Offset curves are always created (hidden), so `curves` never changes; `show-offset-curve` toggles visibility | probe `visibleCurves`. ph-cubic step 6 has no scene and shows the route default board (P_0 = (-4.2,-2)), asserted via `free` option |
| bezier 390 px | Content: step 4 explanation used an inline `\(B(1/2)=\tfrac18(...)=(0,1)\)` 503 px wide (inline math in lesson prose does not scroll) | `guidedLessons.ts` bezier-evaluation explanation (sl + en): split into a 3-line display `aligned` block |
| Tab to Next | Test assumption: every MathJax expression is a tab stop (MJX-CONTAINER); spline-g1 frame 1 has 24 of them, Next is the 27th stop (bernstein: 15) | `lesson-smoke-helpers.cjs` budget 25 -> 60 |

Note for the owner: the many tab stops in math-heavy lessons is existing MathJax explorer behaviour, not a regression, but it makes keyboard access to Next slow. Candidate follow-up.

Unverified items in pilot-smoke-rows.md now verified: elevation button and point counts; rational default weight labels (on, corrected); PH offset visibility (via visibleCurves, corrected). Still unverified: decasteljau/rational-decasteljau slider index and marker counts passed in this run (rows green), affine and polygon switch rows passed, so those assumptions held.

## Handler review

The worker's weight-label change was also applied to the passing `rational-subdivision`, `rational-extrapolation` and `farin` rows; in the first two it referenced an undefined `saved` (their parameter is `before`). The handler restored those three assertions (labels are off on those routes) and kept the change only in the rational pilot row. Full guided-lesson spec afterwards: 164 passed (`just smoke-built tests/guided-lessons.smoke.spec.cjs --port 4391`, build of a0312dc plus the bezier formula change).
