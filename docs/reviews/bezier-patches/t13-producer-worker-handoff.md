# Task 13 surface evidence producer handoff

## State

Implemented the read-only rendered-owner producer on `worktree-bezier-patches-r2`. `SurfaceScene.meshOwners` describes logical face ranges for tensor, triangular, join and 32 teapot patches. `ThreeSurfaceView` publishes `data-rendered-surface-owners` only after a successful render, sampling first-vertex xyz values from the first, middle and last drawable triangles in each range after Float32 upload. Ranges without drawable triangles are omitted. Geometry samples are cached against the actual BufferGeometry and owner-value signature to avoid scanning triangle indices during camera-only renders.

Publication clears on reconcile before validation, hidden or unusable mesh ownership, render failure, context loss and disposal. The teapot uses explicit contiguous face ranges in its merged mesh; optional boundary lines do not create owner evidence. The page reader and capture runner remain for the next slice. No browser capture or example claim was made.

## Files

- Producer and scene ownership: `src/graphs/patches/surface-view/surfaceScene.ts`, `threeSurfaceView.ts`, `patchSceneBuilder.ts`, `TriangularPatchScene.ts`, `TensorJoinScene.ts`, `TensorTeapotScene.ts`.
- Focused assertions: corresponding scene tests plus `surface-view/threeSurfaceView.test.ts`.
- Evidence seam updated: `docs/reviews/bezier-patches/t13-surface-evidence.md`.

## Checks

- `npx vitest run` on the five affected test files: 129 passed.
- `just lint` on changed production files: passed.
- `just typecheck`: passed.
- Mutation evidence: replacing the publisher call with a clear operation failed the renderer sample assertion (`threeSurfaceView.test.ts:117`); publishing an empty teapot owner list failed the 32-owner assertion (`TensorTeapotScene.test.ts:113`). Logs and temporary source backups are in `.claude/scratch/`.

## Remaining

Next slice: update `scripts/guided-example-surface-evidence.cjs` to read `data-rendered-surface-owners`, define authored expected samples using the documented Float32 sampling rule, then integrate with the capture runner while retaining freshness checks and the existing JSXGraph path. Handler owns review and browser verification. No commit or push was made.
