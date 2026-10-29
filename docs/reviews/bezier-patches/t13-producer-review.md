# Task 13 producer review

Scope: uncommitted producer changes under `src/graphs/patches`, compared with HEAD. Read the task 13 surface-evidence contract and the Bézier-patch rendering contract. No source edits, builds, tests, previews, or Git operations were performed.

## Findings

- **Low — renderer tests do not pin the camera-only cache behavior or an entirely missing owner list** (`src/graphs/patches/surface-view/threeSurfaceView.test.ts:109`). The implementation caches samples by `BufferGeometry` identity plus owner signature, and `BaseSurfaceGraph` camera-only reconciliation retains the same geometry/revision, so review found no per-orbit triangle scan. Add a focused assertion if this performance contract needs regression protection; also cover `meshOwners` omitted/empty clearing after a previously published value. Existing coverage does exercise empty/invalid ranges, hidden meshes, render failure, non-finite scene rejection, and disposal. This is a coverage gap only, not a correctness blocker.

## Review outcome

No blocking correctness findings. Builders provide explicit ownership ranges for tensor and triangular meshes, two joined surfaces, and all 32 teapot patches. Their ranges use flattened triangle-index units, matching `BufferGeometry.getIndex()` offsets in the producer; teapot ranges are contiguous and include the patches after degenerate triangles are omitted. Samples come from the uploaded Float32 position attribute and exclude invalid or degenerate triangles. Camera-only reconciliation preserves geometry identity, so the cached samples are republished without scanning triangles. Reconciliation clears the attribute before validation; hidden/empty ownership and render failures clear it, and context loss/disposal clear both published evidence and cache state. Existing scene/render math is unchanged; no new formulas or mathematics were introduced.

The downstream page reader/validator is intentionally outside this producer diff and remains a required integration seam: it must reject missing, partial, stale, duplicate, invalid, or mismatched owner evidence and enforce the exact 32-owner teapot contract before capture.
