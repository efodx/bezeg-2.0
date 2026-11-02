# BS-A-3b: the L2 de Boor lesson

Source: [task plan](../../tasks/b-splines-nurbs/README.md), [spec L2](../../specs/b-splines-nurbs-lessons.md#l2-b-spline-curve-and-de-boors-algorithm-curva-b-zlepka-in-de-boorov-postopek). Date 2026-11-02, handler 20.

## What changed

- `DeBoorGraph` registers two lesson actions: `parameter` `t` (clamped to the knot domain like the slider; throws on an invalid vector or a non-finite value) and `animation` `deboor` with `next-step`, `reset`, `play` and `pause` mapped to the graph's own level controls. `replay` is not supported, so the registry rejects it.
- L2 guided lesson `src/learning/content/bsplineDeBoorGuidedLessons.ts`, six steps on the spec defaults (knots `(0,0,0,1,2,2,2)`, points `(0,0),(1,2),(3,2),(4,0)`): predict the active points at `t=1/2`; slide to `t=3/2`; the whole triangle at `t=1/2` (two `next-step` actions); `P0` moved to `(0,1)` at `t=3/2`; the two pieces at `t=1`; free exploration. `bspline-deboor` now has a lesson.
- Interim owner `splines/piecewise` (as L1) until the `b-splines` chapter (BS-A-4). Preview copy, notation and catalog lists, and smoke row `bspline-deboor` were added.
- No route or stored Preset changed.

## Checks

- Worker (Sonnet `bezeg-worker`): eight tests on a real graph, with every scene run in one synchronous sequence. They cover the curve points `(1,1.5)`, `(2,2)` and `(3,1.5)` against the basis-sum value, the level-1 points, three visible rings read from the board, `P0` locality sampled on `(1,2]`, a convex hull per span, `next-step`/`reset`, Reset and language switch, and parameter clamping. Mutations: turning off the `parameter` handler failed 5 of 8 tests, `next-step` 3, `reset` 1, and ignoring the fixture points 2. Ignoring the fixture knots changes nothing, because the lesson vector equals the clamped uniform default for four points; L1's tests cover that path. The hull test has no mutation of its own. The worker ran `just unit src/learning src/graphs/curves/bspline src/graphs/base src/demonstrations` (2327 passed, 4 skipped), plus typecheck, lint, build, and `just smoke-lesson bspline-deboor bspline-basis` (4/4).
- Handler: recomputed with exact rationals: `C(1/2)=(1,3/2)` with level 1 `(1/2,1),(3/2,2)` and alphas `1/2, 1/4`, then `1/2`; `C(1)=(2,2)`; `C(3/2)=(3,3/2)` via `(5/2,2),(7/2,1)`; with `P0=(0,1)`, `C(1/2)=(1,7/4)`. The recurrence's indices match the worked example (`s=2`). The Slovenian title was corrected to the genitive "Krivulja B-zlepka". The handler then reran the lesson, notation, catalog and `src/graphs/curves/bspline` units, typecheck and build.

- Browser (Haiku `bezeg-smoke`, production preview of `5ad286f5`'s tree, 1440×900): `?learn=1` opens in SL with the corrected title and typeset formulas. Step 1 shows the span `[0,1)` and active `P0, P1, P2` with decimal commas. Step 3's readout matches `(0,5;1)` with `α=1/2`, `(1,5;2)` with `α=1/4` and `(1;1,5)` with `α=1/2`. Step 4 shows `(3;1,5)` at `t=3/2`. A live SL→EN switch translated the title, step text and readout, with decimal points and no Slovenian left. Steps 3-6 were walked in EN to completion with the board changing, and there were no console errors.

## Gaps

- No disposal test was added; the existing `DeBoorGraph.test.tsx` and scene-replacement contract cover it.
- The smoke row has no hooks. The language switch is covered by the unit test and by the browser check.
- Browser coverage gaps: the level buttons were not clicked while the lesson panel covered the inspector (step 3 asks for them, worded like the accepted I5 lesson's "Press Next step"); the rings were not inspected visually; `P0=(0;1)` in step 4 was not read on the board (the readout lists only the active points); EN steps 1-2 were not walked. The unit test covers rings, the moved `P0` and the level commands on the real graph.
