# Task 07 batch 3 evidence

Graph: `ParametricCurveGraph` (`src/graphs/curves/parametric`). Pattern: [batch 2](07-batch2-evidence.md). Done by handler 2 without a worker, as a single-graph change.

## Change

`ParametricCurveGraph` declares its scene through `sceneDeclaration()`. `sync` returns whether the scene's curve equals the state's curve, so another curve rebuilds the scene. Everything else (radius, parameter, trace flag) is read lazily, so there is no `scene.sync()`. `ParametricScene.curve` is now public and read-only. The graph keeps a private `scene` getter over the slot. Deleted: `ensureScene`, `removeScene`, `sceneCurve`, the rebuilding branch of `initialize()` (which keeps `fitToCurve()`), and the rebuild calls in `importPresetData` and `setCurve`. `disposeFigureScene` and `unmount` now only stop the roll driver, which the graph owns. `constructOrSweep` is not used because `ParametricScene` builds inside a `try` and disposes itself on failure, and an existing test covers that.

Behaviour change: an import of the same curve now keeps the scene. Before, every import rebuilt it. Nothing the user sees changes, because the scene reads its state lazily.

## Contract repair carried from batch 2

`src/graphs/base/sceneReplacementContract.test.tsx` "scene teardown once per replacement" spied on `removeScene`. Batch 2 deleted that method from Hermite and Interpolation, so the block's six Hermite and Interpolation tests failed at `bb1f06f3` (observed in this batch's first run: `The property "removeScene" is not defined`). The block now spies on each family's `*Scene.prototype.dispose`. Per replacement it asserts at most one disposal, exactly one on reload, and that the live scene was not disposed. The parametric figure-path test reads `scene.curve` instead of the deleted `sceneCurve`.

## Tests adapted

- `ParametricCurveGraph.test.ts`: the fake graph builds a `SceneSlot` and reconciles after each `setState`. The import test now also asserts that a same-curve import keeps the scene and another curve replaces it. The unmount test registers the slot with a fake session whose disposal runs the cleanups.
- `ParametricCurveGraphReal.test.tsx`: flushes state changes after imports before reading the scene.

## Checks (handler)

- `just unit src/graphs/curves/parametric src/graphs/base/sceneReplacementContract.test.tsx src/learning/content/curveGeometry`: passed. Before the test adaptation: 16 failures, including 6 for Hermite and Interpolation from batch 2.
- `just unit src/graphs/base/graphTeardownContract.test.tsx` (local sample): passed.
- `just typecheck`, `just lint` on the changed paths: passed.
- Smoke: [batch3-smoke.md](batch3-smoke.md).
