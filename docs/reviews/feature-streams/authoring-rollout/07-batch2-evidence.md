# Task 07 batch 2 evidence

Graphs: `InterpolationGraph`, `HermiteGraph`, `SubdivisionCurveGraph` (`src/graphs/curves/{interpolation,hermite,subdivisionCurves}`). Pattern: [batch 1](07-batch1-evidence.md).

## Change

Each graph declares its scene through `sceneDeclaration()` with `constructOrSweep`, rebuilding only on a different point count, and keeps a private `scene` getter over the slot. Deleted in all three: `ensureScene`, `removeScene`, `disposeFigureScene`, the `unmount` scene removal, the `onStateChange` sync, and the explicit rebuilds in import and add/remove point. Subdivision also loses the `resetRounds` rebuild; `initialize()` keeps `fit()`, and Subdivision keeps its playback `mount`/`unmount`. Drag handlers in the three `*Scene.ts` files return once disposed.

Deviation, accepted as decision **O-subdivision** in the [rollout spec](../../../specs/lesson-authoring-rollout.md#rollout-decisions): `SubdivisionScene.hasSurplusVertices` makes `sync` refuse when the vertex pool exceeds the shown round, so the slot rebuilds. Without it the teardown contract failed after Play followed by checkpoint restore (a 16-point pool for a 12-point stage).

## Tests

New `src/graphs/curves/pointCountSceneLifecycle.test.tsx` (39 tests). Against the unmigrated sources, the batch worker saw 10 failures: same-count import rebuilt (×3), figure return released too many scenes (×3), old drag handler wrote state (×3), Subdivision remount released 2. A rerun after the figure-fixture fix saw 8 failures. The rest pass on both and characterize existing behaviour. Existing tests adapted: fake-board tests build a `SceneSlot`; real-board tests flush state before reading the scene and now expect a same-count import to keep the scene.

## Figure-return test fix

The review found that `figureOf` built the figure from a preset exported after the structural import, so it never used a figure whose point count differed from the entry scene. `figureOf` now builds from `defaultPreset`, and the test asserts 2 releases: the 3-point entry scene, then the default-count figure scene, then a return to a 3-point scene. The figure tests pass on the unmigrated code too, so they guard behaviour that was already correct. Restoration of the reverted sources was confirmed with `diff --strip-trailing-cr -r`.

## Checks (handler)

- `BEZEG_GRAPH_TEARDOWN=all just unit src/graphs/base/graphTeardownContract.test.tsx src/graphs/curves/pointCountSceneLifecycle.test.tsx src/graphs/curves/{interpolation,hermite,subdivisionCurves}`: passed.
- `just unit src/learning/content`: passed. The batch worker's 11 `guidedExampleScenes` failures came from a mid-edit state of the concurrent registration batch.
- `npx tsc --noEmit --pretty false`: clean. `just lint` on the changed paths: passed (worker).
- Engineering review (Sonnet): no blocking findings. Rebuilds at equal point count match the old code except the accepted Subdivision surplus rule. Playback and selection state survive a rebuild.
