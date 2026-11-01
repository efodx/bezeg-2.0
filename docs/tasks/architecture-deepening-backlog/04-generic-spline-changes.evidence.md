# 4. Completed generic spline changes: evidence

Source task: [04-generic-spline-changes.md](04-generic-spline-changes.md). Recorded 2026-11-01 against base `8ead6cdd` plus the working-tree change.

## What changed

- `GenericBezierSpline` lost its `setDegree` and `setContinuity`. `change({degree?, continuity?})` validates the completed target and regenerates the spans and computed points once; `restore(degree, continuity)` is the path for stored Presets; `getMaxDegree()`, `degreeRange()` and `continuityRange()` carry the bounds.
- `JXGGenericSplineCurve.changeSpline(target)` replaces `increase/decreaseContinuity` and `increase/decreaseDegree`; it calls the model once and then `reconcileSplineDrawing()` (refresh derived points, relabel) once. The constructor restores and reconciles once. `AbstractJXGSplineCurve` routes its constructor, `addPoint` and `removePoint` through the same `reconcileSplineDrawing()`.
- `CnSplineGraph` passes lesson actions and counter clicks straight to `changeSpline`. It no longer validates itself, loops single steps, or reads `getPoints().length` for the degree bound.

## Degree limit (suspected defect)

Reproduced, before repair, with the original code. Two bounds were wrong:

- The lesson action `spline-degree` validated against `getPoints().length`. At degree 2, continuity 1 on the 7-point default that is 11 (7 free, 4 derived), so `{kind: 'spline-degree', value: 11}` was accepted and stepped to degree 11 through the unguarded `increaseDegree`.
- The counter's reachable maximum was the free-point count `n` (its maximum shrinks as the degree rises, 9, 8, 8, 7 listed points at degrees 3 to 6, then 7). That is one too high: `GenericSplineScheme.build` takes `points.slice(0, degree + 1)` for the first span, so degree `n` draws the same degree `n - 1` Bezier piece as degree `n - 1`. The baseline shows identical curves for degrees 7 to 10 at 7 points. Both the old action bound and the old counter top therefore labelled a lower-degree curve with a higher degree.

The model now owns the limit: `getMaxDegree()` is `max(1, n - 1)`. Tests: `rejects degree equal to the free-point count`, `draws a first span whose polynomial degree equals the degree it is labelled with, up to the limit` (the first span has `degree + 1` points at every accepted degree), and the action test `rejects a degree above the free points ...`. Against the earlier bound `n` these fail (8 tests red), and mutation R1 (limit back to `n`) fails 8 tests; the repair turns them green. This tightens existing assertions: `from 4 to 13` became `from 4 to 6`.

User impact: the Cn counter's top value drops by one (7 free points: 6 instead of 7). The old top value drew a lower-degree curve than it was labelled with. Stored Presets and files above the limit still load through `restore()` (tested at degree 9 with 7 points) and can only lower their degree afterwards.

## Numerical equality

Method: a throwaway Vitest file (kept as `a4-scratch-compare.test.ts.txt` under the job's tmp directory, not in the repository) built `GenericBezierSpline` for 7 point counts (2, 3, 4, 5, 7, 9, 12) times 2 seeded random control polygons times every degree from 1 to n+3 times every continuity from 0 to degree-1, with alpha 0.75 or 1.0. For each configuration it recorded the knot vector, every span's control points, `getPoints()`, the number of computed points, 41 evaluation samples across the knot range, and the bounding box. It ran once on the unmodified code (706 configurations) and once on the new code.

| Comparison | Configurations | Identical |
| --- | --- | --- |
| Old code (constructor) against new code (constructor) | 706 | 706 |
| Old code (constructor at degree d, continuity c) against new code (constructor at degree 3, continuity 1, then `change({degree: d, continuity: c})`), degree at most n | 370 | 370 |

The comparison ran with the earlier bound `n`, so the 370 include degree `n` (identical to degree `n - 1`, and now rejected by `change`); degrees up to `n - 1` are a subset and equal as well. Of the 336 `change` calls above `n`, 330 were rejected. The other 6 were n = 2 at degree 3: the start state already has degree 3, which is above the limit, and a change to the degree a spline already has is allowed. The permanent test `changing to degree %i, continuity %i equals a spline built there` repeats the comparison for all 21 valid pairs (degree 1 to 6) at 7 points, using `toEqual` over spans, computed points, knots and samples.

## Tests added or changed, and mutations observed

Every new assertion was checked against a deliberate mutation, run through `just unit` on the three affected test files (`a4-mut.log` has the run; each number below is the count of failing tests).

| Mutation | Failing tests |
| --- | --- |
| M1 drop the degree limit from `change` | 7 |
| M2 do not regenerate after recording the target | 33 |
| M3 regenerate twice | 3 |
| M4 drop the `continuity < degree` check | 8 |
| M5 drop the no-op short circuit | 3 |
| M6 drop the rollback when regeneration throws | 1 |
| R1 limit back to `n` (repair round) | 8 |
| R2 bump the version before regenerating (failed change must leave the version untouched) | 1 |
| R3 rollback does not restore the degree | 1 |
| M7 apply the limit in `restore` | 2 |
| M8 adapter reconciles twice | 2 |
| M9 adapter never reconciles | 5 |
| M10 limit taken from `getPoints().length` (the old bound) | 6 |
| M11 do not bump the version | 2 |
| M12 constructor restore skips the reconcile | 1 |

Tests: `spline-structure.test.ts` (model: valid pairs, intermediate-invalid targets, rejected targets, limit, restore, rollback, version, freshness), `BaseSplineCurveGraph.test.ts` (lesson actions: degree above the free points, one regeneration and one redraw per action), and the new `JXGGenericSplineCurve.test.ts` (a real JSXGraph board with the `no` renderer: derived points, labels and the DTO round trip after one change, and one reconcile per change).

## Deletion test: knowledge callers lost

- `CnSplineGraph` no longer knows that continuity must stay below the degree and the degree above the continuity, the bound formulas and their error texts, that a target is reached by single increments, that each step must regenerate, or that the degree bound is the listed point count.
- `JXGGenericSplineCurve` no longer knows the setter order (a continuity-first step can equal the degree), that `generateBezierCurves()` must follow the setters, or the guards in four inc/dec methods (one of which, `increaseDegree`, could never fire).
- `AbstractJXGSplineCurve` and its subclasses no longer repeat the refresh-then-label pair in the constructor, `addPoint` and `removePoint`.
- Any future caller no longer needs to know that an intermediate degree/continuity pair can be invalid, nor that the spans are stale until it regenerates.

## Rollback and constructor notes

- `apply()` undoes the recorded degree and continuity if regeneration throws and bumps the version only after a successful regeneration, so a failed change leaves the version unchanged (tested). `generateBezierCurves()` resets the editable parameters `b` before building, but the generic scheme has none, so nothing user-edited can be lost.
- Not changed: the `JXGGenericSplineCurve` constructor still builds twice for a non-default stored pair (the base constructor builds at degree 3, continuity 1, then `restore()` rebuilds). Removing it needs `getInitialCurve` to receive the stored pair before `super()` returns, which means restructuring the shared adapter constructors; the cost is one extra build at load.

## Compatibility

- Stored Presets: unchanged. `toDto` and `fromDto` keep `degree` and `continuity`, and `restore` accepts every pair Preset validation accepts, including a degree above the free-point count (tested at degree 9 with 7 points).
- Routes: unchanged.
- User-visible: the Cn counter's top degree drops by one (7 free points: 6 instead of 7), because the old top value drew a lower-degree curve than it was labelled with; a lesson action asking for a degree above the limit now fails with a message. Stored Presets above the limit still load and can only lower. No shipped lesson dispatches `spline-degree` or `spline-continuity` (a search of `src/learning` finds only a comment and a test that asserts the absence); lesson scenes set degree and continuity through the curve specification, which restores.

## Handler verification (2026-11-01)

- `just check` on `3e8ddaf0` (before the rebase): typecheck, lint, 360 files / 6561 tests and the production build passed. The two `lessonRestoration.part1` timeouts seen under load did not recur. After the rebase onto `origin/master` (`dc899f60`), the check passed again on `2f28b020`: 383 files / 7039 tests (1 skipped) and the build. An earlier rerun was killed by OS memory pressure and was restarted with owner approval.
- Browser (`bezeg-smoke` Haiku, production preview on port 4311 from that build, Chromium 1440×900, fresh context) on `/bezeg-2.0/spline/spline`:
  - The heading and the curve board render.
  - The degree starts at 2 and its plus button disables at 6. At degree 6 one segment has 7 points p0..p6, so the top degree is points−1.
  - The continuity top value is degree−1: 1 at degree 2, 5 at degree 6.
  - Adding a point adds a segment, and deleting the endpoint removes the last segment. The curve redraws and the counters stay at degree 2 / continuity 1. Clicking an interior handle in delete mode did nothing (not investigated; deletion addresses endpoints).
  - Reset returns degree 2 / continuity 1. A temporary Preset at degree 4 / continuity 2 survived a scene change, was reopened, and was then deleted.
  - No console errors.
- `just smoke-lesson spline-cn spline-c1 spline-c2`: 7 passed.
