# 25 — Pair-of-curves graph (Batch 3, F2a)

Status: planned 2026-11-05 (geometry handler 52). Source: spec [A6](../../specs/convexity-hulls-lessons.md#a6-back-to-bézier-hulls-of-control-polygons) (graph, acceptance 5), [ADR 0028](../../adr/0028-advanced-bezier-objectives-and-owners.md) (the D2 clipping graph reuses it). Kind: F2a, engineering + UI/accessibility review. Depends on 24. Templates: `HullTraceGraph.tsx`, `traceLessonActions.ts`, task [18](18-point-in-polygon-graph.md).

**Why a point-set subclass and not `BaseBezierCurveGraph`.** `PointSetGraph` already provides the snapped drag, arrow keys, the numeric list, overlay ownership and Preset parsing. `HullTraceGraph` gives the playback pattern, and D2 needs that same playback. The curve graph's editing operations (add, join, subdivide, elevate) would all have to be disabled, and its points are not grid points, which the exact drawn hulls need.

Two classes under `src/graphs/compgeo/`:

1. **`CurvePairGraph extends PointSetGraph`**, the part D2 reuses. `model.points` holds net \(A\) then net \(B\), each half of the list, so the degree is `points.length / 2 - 1` and no other state is needed.
   - Both curves have the same degree, 2 or 3: 6 or 8 points. Coordinates are limited to `SWEEP_COORD_LIMIT` (\(2^{10}\)).
   - The point count is fixed: add, remove and clear are refused with the base class's notice, and the inspector does not offer them. If that needs a base hook, add one small protected hook and document it in `PointSetGraph.tsx`'s module comment.
   - Points are named \(A_0,\dots\) and \(B_0,\dots\) through `pointName`, and the two curves differ by more than colour (solid and dashed, or labels at the curve ends).
   - It draws both curves and the overlays `control` (control polygons) and `hull` (the hull of each whole curve). Overlay objects use fixed data from the model, as the base's overlay contract requires.
2. **`BezierHullsGraph extends CurvePairGraph`**, A6's playback. State adds `step`. It holds a memoized `curvePairRun`, Next step, Play, Pause and Reset through `IterationController`, and `registerTraceCommands`. Any model change, drag included, recomputes the run, returns to step 0 and pauses (acceptance 5). A scene change, figure capture and unmount pause; unmount disposes the controller.

**Drawing a step.** The `pieces` overlay draws each piece's hull from `pieceHull`, mapped to board units through the grid step, together with each piece's control polygon when `control` is on.

- At a `split` step, candidates are outlined and unfilled, and the parent's hull stays as a thin outline, so "two smaller hulls inside the first" is visible.
- At a `discard` step, pieces in a kept pair are filled and solid. Pieces in no kept pair are faded and dashed, so colour is not the only signal.

Use the `POINT_SET_OVERLAY_NAMES` entry `hull` for the whole hull and add `control` and `pieces`.

Default scene: the crossing pair of task 24, with an initial view that fits it at equal units.

Tests, host tests in the style of `HullTraceGraph.host.test.tsx`, **written first and run early**:

- the board's object counts at steps 0, 1, 2 and the last step of the crossing pair, and on the offset pair's early end, in `gridStepExponent` \(-1\);
- drawn hull vertices equal `pieceHull` mapped to board units, read from the actual board objects;
- a drag at step 8 returns to step 0, pauses and recomputes;
- add, remove and clear are refused, and a model of 7 or 10 points is rejected;
- overlay objects are removed when hidden and on unmount (exact counts), and no scheduler callback survives unmount;
- observed failures under two mutations.

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint src/graphs/compgeo`, tsc, production build if locale keys were added.
