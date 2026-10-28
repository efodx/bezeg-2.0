# 10T-B handoff

Implemented scene reuse for camera-only changes in `BaseSurfaceGraph`: it retains the built scene and the state/revision/selection inputs, then reconciles a shallow scene copy with the newly authored camera. The camera target is cloned, as in the builders. Cache invalidation covers new view creation, disposal, `redrawGeometry`, geometry revision changes, and `syncReplacedScene`.

All current builders preserve the authored camera and clone only `target`: `patchSceneBuilder.ts`, `TriangularPatchScene.ts`, `TensorTeapotScene.ts`; the join graph uses those direct-build paths. `fitCameraTo` runs when the graph state is authored (for example, framing controls), before scene construction, so it remains compatible with reuse.

`BaseSurfaceGraph.test.tsx` has 5 tests: orbit reuses `polylines`, points, and mesh identities while updating camera; parameter-only state change, selection, point geometry edit, and Preset/scene replacement rebuild. Mutation checks were performed and reverted: disabling reuse failed the orbit build-count assertion (3 vs 2); ignoring all non-camera keys failed the parameter-change build assertion.

Checks: focused test passed (5/5); `npx eslint` on the two assigned source/test files passed; `npx tsc --noEmit --pretty false` passed. Full `just unit src/graphs/patches` reached 33 passing files / 842 passing tests, with one unrelated in-progress `TensorJoinPanels.test.tsx:326` expectation failure: it expects three starting scenes but receives the new `join-teapot` fourth scene. Logs: `.command-logs/2026-10-28T22-59-53-929Z-37340-180b6ab6.log` (focused), `.command-logs/2026-10-28T22-58-35-614Z-38828-27eea78d.log` (patch suite). No browser measurement was in scope.
