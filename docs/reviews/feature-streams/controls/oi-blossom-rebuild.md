# Blossom rebuild on import (closed by change)

- Measured (JSDOM, rebuild-always, before): an import of identical data disposed and recreated all 42 board objects and the scene's listeners/subscription, ~25-30 ms; a changed-points import cost the same.
- Decision: a defect worth fixing, because the other B-spline graphs (NURBS, De Boor, ...) already rely on the host's `sync` path: `setState` -> `onStateChange` -> `boardUpdate` -> `declaration.sync`, which keeps the scene when degree and point count fit and rebuilds otherwise (OwnedScene.ts:79-84). The explicit `rebuildOwnedScene()` in Blossom's `importPresetData` was the only exception.
- Change: removed it (BSplineBlossomGraph.tsx `importPresetData`). `resetToDefaults` keeps its explicit rebuild (not an import path).
- Tests: BSplineBlossomGraph.test.tsx "importing the current data keeps the board objects..." (failed before: objects replaced; passes after); standaloneSceneLifecycle.test.tsx Blossom subject now `keepsSceneOnSameShapeImport: true`, `discardedOnRemount: 0`, `figureReleases: 2` (it asserted the rebuild before).
- Checks: tsc clean; `just unit src/graphs/curves/bspline src/graphs/base/GraphSceneReload.test.tsx` passed (log .command-logs/blossom4.log).
- Not verified: browser smoke; lesson restore path only through the unit tests.
