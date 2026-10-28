# T10T review repairs

This note closes the math and engineering test gaps recorded in [the math review](t10t-math-review.md) and [the engineering review](t10t-engineering-review.md).

## Mesh seam positions

`TensorTeapotScene.test.ts` now checks the positions emitted by the actual shaded scene. `sampleMesh(8)` stores vertices with `u` as the outer loop and `v` as the inner loop, so each patch occupies 81 consecutive vertices and each boundary contributes nine positions. The test requires the full nonempty `32 × 9 × 9 × 3` position array, maps every `u0`, `u1`, `v0`, and `v1` boundary to its sampled vertices, and checks all 64 relations from the 52 two-owner and two four-owner groups in either direction within `1e-12`. It also fixes the complete sorted list of 16 unshared boundaries.

Observed mutation: adding `0.01` to the x coordinate of patch 0's first mesh vertex failed the mesh direct/reversed comparison at `TensorTeapotScene.test.ts:95` (`expected false to be true`). The source mutation was reverted. Evidence: `.command-logs/t10t-mutation-mesh.log`.

## Capstone Preset and Reset

`TensorJoinPanels.test.tsx` now saves an active teapot scene through `presetService.savePreset({...graph.exportPreset(), id})`, returns to the default pair, and selects the saved Preset. It checks the restored capstone discriminator, camera in graph and view, nonempty mesh, noneditable scene with no points, capstone panel, and hidden join controls while the display switches remain available. A separate case calls `graph.reset()` with the starting teapot scene active and checks the default C1 pair, its scene, and its controls.

Observed mutation: dropping `joinCapstone` from `TensorJoinGraph.stateDto()` made the saved Preset test fail after restore with `expected undefined to be 'teapot'`. The source mutation was reverted. Evidence: `.command-logs/t10t-mutation-discriminator.log`.

## Verification

- `just unit src/graphs/patches/TensorTeapotScene.test.ts src/graphs/patches/TensorJoinGraph.test.tsx src/graphs/patches/TensorJoinPanels.test.tsx` — passed, 3 files and 74 tests. Summary: `.command-logs/t10t-focused-final.log`.
- `just lint src/graphs/patches/TensorTeapotScene.test.ts src/graphs/patches/TensorJoinGraph.test.tsx src/graphs/patches/TensorJoinPanels.test.tsx` — passed. Summary: `.command-logs/t10t-eslint-final.log`.

Both intentional source mutations have been reverted. This repair slice changed tests and this evidence note only; no typecheck or build was run in this slice.
