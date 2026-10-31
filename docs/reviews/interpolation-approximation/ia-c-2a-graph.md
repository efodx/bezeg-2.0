# IA-C-2a: `interp-subdivision` graph (lesson I5), evidence

Unregistered: no route, catalogue entry, `LESSON_ANIMATION_IDS` entry or lessons. The worker (Sonnet `medium`) handed off at its 135k budget with the implementation and tests done. The handler ran the remaining checks.

## Files touched
- `src/graphs/curves/subdivisionCurves/` holds `SubdivisionCurveGraph.tsx`, `SubdivisionScene.ts`, `subdivisionModel.ts` (with `SUBDIVISION_ANIMATION_ID = 'interp-subdivision-rounds'`, `stageOf` and `chaikinLimitPolyline`), `subdivisionPresetCollection.ts` (key `interp-subdivision`, local) and `SubdivisionCurveGraphReal.test.tsx` (46 tests on a real board with a manual scheduler).
- `src/localization/sl.ts` and `en.ts` gain 21 `subdiv_*` keys in lockstep. The only other change there is the trailing comma after `hermite_board_hermite`. The graph reuses `interp_point_list`, `interp_point_name`, `play` and `pause`.
- Kernels, `PointListInput`, `BaseGraph` and `IterationController` are unchanged.

## Decisions beyond the brief
- The polygon has 2 to 8 points, at most \(8\cdot 2^6=512\) stage vertices. It has its own range and coordinate messages, because the `interp_*` texts say "interpolation points".
- Slovenian calls a round "korak", not "krog".
- Reset restores the starting polygon and the closed flag, and keeps the rule and the limit flag. The starting polygon is whatever was last imported: the default, a Preset, a lesson default scene or a lesson checkpoint. After a checkpoint restore, Reset therefore returns to the checkpoint's polygon. That is intended, because the checkpoint is the scene the learner started from.
- Stage vertices are a pool of points that only grows; surplus points are hidden. The pool grows in `scene.sync()` from `onStateChange`.

## Checks
- Worker: `just unit src/graphs/curves/subdivisionCurves --maxWorkers=2` passed all 46 tests.
- Worker mutations, each failing at least one test:
  - pause dropped in `movePoint`;
  - pause dropped in `setClosed`;
  - rule switch keeps the round;
  - `stopLessonAnimations` emptied;
  - `beforeFigureCapture` emptied;
  - import skips `controller.reset`;
  - unmount skips `dispose`;
  - Reset ignores the starting polygon;
  - controller cap raised to 7;
  - the closing straight piece of the overlay dropped;
  - the stage cache key ignores the round;
  - four-point replaced by Chaikin.
- Handler, at revision `7f3c7f9` plus this diff:
  - `npx tsc --noEmit --pretty false` first found TS2722 in a test call to the optional `checkGraphState`. It was fixed with `!`, as in the Hermite tests, and is now clean.
  - `just lint src/graphs/curves/subdivisionCurves src/localization` is clean.
  - `just unit src/graphs/curves src/localization --maxWorkers=2` passed.
  - After the repairs, `just unit src/graphs/curves/subdivisionCurves --maxWorkers=2` passed.

## Reviews and disposition (handler 7, 2026-10-31)
Both reviews ran in parallel as `bezeg-reviewer` Sonnet. Neither found a blocking issue.

**Mathematics review: no finding.**
- It confirmed the open-Chaikin limit overlay. Chaikin refinement leaves the interior B-spline unchanged and the kept end triple is collinear, so the limit is the straight piece \(P_0\to\) mid\((P_0,P_1)\), then the interior spline, then the symmetric tail. It also confirmed \(n=2\) and the closed wrap.
- Counts: closed and open Chaikin give \(n\cdot2^k\); open four-point gives \(2n-1\) per step.
- The view box (points plus a 30% margin) leaves room for the four-point overshoot.
- No string makes a smoothness claim.
- It recomputed the round-6 distance to the overlay independently: 0.0020 (open default) and 0.0028 (closed square). Repair: the overlay test bound is tightened from 0.05 to 0.01, and the tests still pass.

**Engineering + UI review: two low findings and two info notes.**
- Low 1: `transition()` relied only on the controller's cap. It now clamps the round to `MAX_SUBDIVISION_ROUNDS`. This is defensive and not pinned by a test, because every path that changes the round resets the controller.
- Low 2: Reset after a checkpoint restore. This is intended; see Decisions.
- Info: the `hermite_board_hermite` line changed only by the trailing comma. The vertex pool grows without a rebuild by design.
- Uncovered paths remain: `exportBusy` blocking Next step and Play, and the full figure-batch path. Both match `IterativeFunctionGraph` and are deferred to registration smoke.

## Not verified
- Browser drawing, real pointer drags, the live SL/EN switch in a browser, keyboard and touch flows, and projection and narrow sizes. These belong to the registration slice.
- Drag cost with 512 pooled vertices, not measured.
- Lesson text must state: open Chaikin keeps its end points; open four-point is linear at the ends; the four-point \(C^1\) claim is "to verify" (acceptance 4).
