# Task 08 batch 4 handoff (worker, partial)

## State

Implementation and tests are done; the compgeo+base sweep run and the evidence file are not. Nothing committed.

## Done

- `pointSetPersistence.ts`: new `PointSetDataPart {keys, dataKeys, fromData(model, data), fromScene(model, state), toData(fields)}`; `PointSetExtension.data?`; `settle(model, values, scene)` now receives the data part's fields (3a/3b adapters ignore the third arg). `project` writes `toData` into `data`; `reconstruct` calls `fromData` first (throws before anything is built), drops the defaults' value of every part key (so `previous` is absent), strips `dataKeys` from the serialized model (found: `serializePointSetModel` spreads the data object, so `triangles` leaked into `model`; the legacy import had the same stray key). Item 7: `PointSetPermittedState` index signature is now `boolean | Record<string, boolean> | PointSetFieldValue` (no `unknown`), no casts, typecheck passes.
- `triangulationPresetCollection.ts`: `startingTriangles(points)` (the old retriangulate gate plus `incrementalTriangulation`), `triangulationDataPart` (stored list kept if valid, same throw message as before; no list gives the starting rule).
- `PointSetGraph.tsx` `importPresetData`: reconstructs first, then `pending = undefined`, patch also writes `extension.data.keys`.
- `TriangulationGraph.tsx`: `TRIANGULATION_EXTENSION` (normalise `asPoints`, no fields, data part), `persistenceExtension()`; removed `incoming`, the `named` argument of `retriangulate`, `exportPresetData`, `exportPreset`, `importPresetData`, `figurePresetGraphState` overrides. `setState` wrapper already skips retriangulation when `triangles` is named. `sceneGraphState` unchanged (checkpoint keeps `previous`).
- `DelaunayGraph.tsx`: `DELAUNAY_EXTENSION` (`step` finite-number field, fallback 0; settle clamps on `runFor(points, scene.triangles)`); removed `importPresetData` and `figurePresetGraphState` overrides (the single reconstruct write names step and triangles; `setState` -> `playback.settle` resets playback on the edit). `loadExample` unchanged, lands at 0.
- `delaunayPresetCollection.ts`: untouched (no change needed).
- `graphTransientStateContract.tsx`: removed the two rows.
- New `src/graphs/compgeo/triangulationPersistence.host.test.tsx`: 18 tests (2 rows x 8, plus 2 Delaunay step tests).

## Observed results

- New file passes: 18/18 (`.command-logs/b4-new4.log`, last run after type fixes).
- Against HEAD sources of the 5 changed source files: 16 failed, 2 passed (`.command-logs/b4-pre.log`). The 2 passing are the retained behaviours (round trip of an exact list, refusal of an invalid list), in the Delaunay and triangulation rows each counted once; they are guarded by mutations m1 and m5.
- Mutations (all restored, `git status` checked, sources diffed against copies): m1 stored list ignored: 12 failed; m2 defaults' data-part keys kept: 6; m3 Delaunay settle ignores reconstructed triangles: 5; m4 projection omits triangles: 10; m5 validation disabled: 2. Logs `.command-logs/b4-mut-m1..m5.log`.
- `just typecheck` passed (`.command-logs/b4-tc3.log`); `just lint` passed (`.command-logs/2026-11-12T20-57-24-615Z-31008-54bb8c3a.log`, run before the three test type fixes, which touch only the test file; rerun lint to be safe).

## Next

1. `just lint` again (test file changed after last lint).
2. `just unit src/graphs/compgeo src/graphs/base` with the six `BEZEG_*` variables (TRANSIENT_STATE, LESSON_RESTORATION, SCENE_CONTENT, SCENE_REPLACEMENT, PRESET_ROUNDTRIP, GRAPH_TEARDOWN) set to `point-set-triangulation,delaunay`. Existing `TriangulationGraph.host.test.tsx` and `DelaunayGraph.host.test.tsx` have NOT been run yet against the new code: look at those first.
3. Write `08-batch4-evidence.md` in the 3b layout (design, field classification, removed code, contract rows, tests, observed failures, checks, departures, not verified) from this note.

## Departures to record

- A triangulation file without `triangles` is refused by the collection (`tri_invalid_triangles`); the starting-rule path is reachable only through direct `importPresetData`, lesson fixtures and `figurePresetGraphState` data, which the tests cover that way.
- The scene `model` no longer carries a stray `triangles` key.
- Delaunay import now writes step and triangles in one `setState` (was two writes).

## Not verified

No browser smoke, no production build, no real localStorage presets, no sweep yet.
