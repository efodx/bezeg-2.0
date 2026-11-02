# BS-A-3a: lesson fixture knots and the L1 B-spline basis lesson

Source: [task plan](../../tasks/b-splines-nurbs/README.md) (decision "Lesson knots"), [spec L1](../../specs/b-splines-nurbs-lessons.md#l1-b-spline-basis-bazne-funkcije-b-zlepka). Date 2026-11-02, handler 19.

## What changed

- `LessonCurveFixture.knots` (optional, `src/learning/model.ts`). `DeBoorGraph` and `BSplineBasisGraph` use it as given (the basis graph counts placeholder points from the fixture points), else the clamped uniform vector; `bsplinePresetCollection.check` still rejects a non-monotone or wrong-length vector, leaving the scene unchanged. Other curve graphs ignore the field.
- `BSplineBasisGraph` handles the `parameter` lesson action for `t` (raw parameter, clamped to the knot domain like the slider; throws on an invalid vector or non-finite value).
- L1 guided lesson `src/learning/content/bsplineBasisGuidedLessons.ts`, six steps: degree 1 hat (knots `(0,0,1,2,2)`), slide at `t=1/2` on `(0,0,0,1,2,2,2)`, mirror at `t=3/2`, locality on `(0,0,0,1,2,3,4,4,4)` with `u5` moved to 3.5 (six functions, since four cannot show an unchanged function), Bernstein `(0,0,0,1,1,1)`, free exploration. `bspline-basis` now has `lesson: true`.
- Interim owner `splines/piecewise` until the `b-splines` chapter (BS-A-4); `splines` is not chapter-owned, so `?learn=1` resolves the lesson. Smoke row `bspline-basis` (6 steps, `minFrames` 12).
- No route or stored Preset changed.

## Checks

- Worker: lesson test runs every scene in one synchronous sequence on a real graph (degree, knots, `t`, kernel values at 0.5, 1, 1.5 summing to 1, Bernstein at step 5, Reset, board curves). Mutation: making both graphs ignore `knots` failed 4 tests (both fixture tests, two lesson tests).
- Handler: the spec values and step 4 numbers recomputed with exact Cox-de Boor arithmetic: `1/8, 3/4, 1/8` becomes `4/15, 13/20, 1/12` at `t=5/2`; `(1/4, 5/8, 1/8, 0)`, `(0, 1/2, 1/2, 0)`, `(0, 1/8, 5/8, 1/4)` at 0.5, 1, 1.5. `just typecheck`, `just lint`, `just build`, `just smoke-lesson bspline-basis segment-intersections` passed on 9bb35555 plus the diff. Unit scope `src/learning src/graphs/curves/bspline src/graphs/base` plus demonstration and localization tests: 2812 passed, 1 failed (the known `part4` inscribed-angle rollback).
- Browser (Haiku `bezeg-smoke`, production preview, 1440×900): `?learn=1` opens the lesson in SL with typeset formulas; step 2 shows `0,25 / 0,625 / 0,125` in panel and board; a live SL→EN switch translates title, step text, readout and domain note with no Slovenian left; the EN walk reaches the end without console errors, and the board changes between steps (steps 3 and 6 share paths: same knots, only `t` differs).

## Gaps

- The reject assertions for invalid fixture knots were not mutated on their own.
- Step 1 asks to pick degrees 2 and 3 in the panel; the scene itself is degree 1.
