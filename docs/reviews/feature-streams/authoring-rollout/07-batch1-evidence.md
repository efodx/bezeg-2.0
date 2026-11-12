# Task 07 batch 1: B-spline owned scenes, evidence

Graphs: `BSplineBasisGraph`, `DeBoorGraph`, `BSplineInsertionGraph`, `BSplineExtractionGraph`. Worker notes: [07-batch1-handoff.md](07-batch1-handoff.md). Inventory: [07-inventory.md](07-inventory.md).

## Change

Each graph declares its scene through `sceneDeclaration()` with `constructOrSweep`, and the BaseGraph slot owns it. Deleted per graph: `ensureScene`, `removeScene`, `syncReplacedScene`, `disposeFigureScene`, the `unmount` scene removal, the fits-or-sync block in `onStateChange`, and the `ensureScene` calls in `importPresetData`. Kept: domain scene creation and synchronization, the `fits(...)` rebuild conditions (moved unchanged into each declaration's compatibility check), DeBoor's playback `mount`/`unmount`, and Basis `fit()`. Drag handlers in the four `*Scene.ts` files return once the scene is disposed.

## Pre-change observations

`standaloneSceneLifecycle.test.tsx` grew from Blossom and NURBS to all six B-spline graphs plus a Basis-specific suite (99 tests). On the unmigrated code 24 failed:

- Basis: figure return released 4 scenes instead of 2; a same-shape import rebuilt; remount released 2 instead of 1; an old marker drag still reached the model.
- DeBoor, Insertion, Extraction: same-shape import rebuilt; figure return released 4 instead of 2; remount released 2; an old point drag threw `RangeError`; figure return with different knots.
- Insertion and Extraction: Preset import with different knots.

Already passing before the change, kept as characterization: Basis reset/import/checkpoint/figure entry and construction failure; DeBoor playback stopping on replacement; ordinary same-shape commit keeping the scene; checkpoint restore with different knots; construction failure for the three curve graphs; same-tick fixture sequences with rollback. The two Insertion/Extraction "graph actions in one tick" tests were rewritten after the worker's pre-change run; the handler reran them on the reversed migration (2 passed, 97 skipped): they characterize existing behaviour.

## Checks (handler, revision `d45c848b` + batch)

- `BEZEG_GRAPH_TEARDOWN=all just unit src/graphs/base/graphTeardownContract.test.tsx src/graphs/curves/bspline`: passed.
- `just lint src/graphs/curves/bspline`: passed. `npx tsc --noEmit --pretty false`: clean.
- Engineering review (Sonnet): no blocking findings. Rebuild conditions identical to the deleted ones. Minor: Basis `fit()` now runs before the scene exists (the bounding-box read is lazy); DeBoor `playback.settle` runs after the scene sync; same-shape imports now sync instead of forcing a rebuild, as the spec requires.
