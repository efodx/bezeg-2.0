# Task 08 batch 4 evidence: triangulation and Delaunay on the point-set extension

Graphs: `point-set-triangulation` (`TriangulationGraph`) and `delaunay` (`DelaunayGraph`).

## Design

- New `PointSetDataPart {keys, dataKeys, fromData(model, data), fromScene(model, state), toData(fields)}` and `PointSetExtension.data?` (`pointSetPersistence.ts`). `settle(model, values, scene)` now receives the data part's fields (3a/3b adapters ignore the third argument).
- `project` writes `toData` into `data`. `reconstruct` calls `fromData` first (throws before anything is built), drops the defaults' value of every part key (so `previous` is absent), and strips `dataKeys` from the serialized model (`serializePointSetModel` spreads the data object, so `triangles` used to leak into `model`).
- `PointSetPermittedState` index signature is `boolean | Record<string, boolean> | PointSetFieldValue` (no `unknown`, no casts).
- `triangulationPresetCollection.ts`: `startingTriangles(points)` (the old retriangulate gate plus `incrementalTriangulation`) and `triangulationDataPart` (a valid stored list is kept, same throw message as before; none gives the starting rule).
- `PointSetGraph.importPresetData` reconstructs first, then `pending = undefined`; the patch also writes `extension.data.keys`.
- `TriangulationGraph`: `TRIANGULATION_EXTENSION` (normalise `asPoints`, no fields, data part). `DelaunayGraph`: `DELAUNAY_EXTENSION` (`step` finite-number field, fallback 0; settle clamps on `runFor(points, scene.triangles)`).

## Field classification

| Graph | Persisted (declared) | Permitted, not kept | Transient | Derived |
| --- | --- | --- | --- | --- |
| point-set-triangulation | model (points), overlays, triangles (data part) | none | `previous` (checkpoint keeps it) | memos |
| delaunay | model, overlays, triangles (data part), step | none | playback | run, memos |

## Removed code

- `TriangulationGraph`: `incoming`, the `named` argument of `retriangulate`, and the `exportPresetData`, `exportPreset`, `importPresetData`, `figurePresetGraphState` overrides.
- `DelaunayGraph`: `importPresetData` and `figurePresetGraphState` overrides (one reconstruct write names step and triangles; `setState` -> `playback.settle` resets playback).

## Contract rows

`graphTransientStateContract.tsx`: removed the `point-set-triangulation` and `delaunay` rows of `PRESET_DATA_STATE_KEYS`; the projection assertion supersedes them.

## Tests

`src/graphs/compgeo/triangulationPersistence.host.test.tsx`: 18 tests (2 rows x 8, plus 2 Delaunay step tests).

### Observed failures

- Against HEAD sources of the 5 changed source files: 16 failed, 2 passed (`.command-logs/b4-pre.log`); the 2 passing are retained behaviours (round trip of an exact list, refusal of an invalid list).
- Mutations, all restored (`git status` and diffs checked): m1 stored list ignored, 12 failed; m2 defaults' data-part keys kept, 6; m3 Delaunay settle ignores reconstructed triangles, 5; m4 projection omits triangles, 10; m5 validation disabled, 2. Logs `.command-logs/b4-mut-m1..m5.log`.

## Checks

- New file alone: 18/18 (`.command-logs/b4-new4.log`).
- `just lint` (final tree): passed, `.command-logs/2026-11-12T21-01-02-319Z-8092-eba2c97c.log`. `just typecheck`: passed, `.command-logs/2026-11-12T21-01-44-719Z-39140-0c743282.log`.
- `just unit` of the Triangulation/Delaunay host and lesson-action tests, the new file, and the 3a/3b persistence tests plus `pointSetPresetCollection.test.ts`: passed in 50.6s, `.command-logs/2026-11-12T21-03-29-935Z-18236-ae149a68.log`.
- Sweep: `just unit src/graphs/compgeo src/graphs/base` with the six `BEZEG_*` variables (TRANSIENT_STATE, LESSON_RESTORATION, SCENE_CONTENT, SCENE_REPLACEMENT, PRESET_ROUNDTRIP, GRAPH_TEARDOWN) set to `point-set-triangulation,delaunay`: passed in 442.3s, `.command-logs/2026-11-12T21-04-24-484Z-38604-6b3afd4f.log`.

## Departures

- A triangulation file without `triangles` is refused by the collection (`tri_invalid_triangles`); the starting-rule path is reachable only through direct `importPresetData`, lesson fixtures and `figurePresetGraphState` data.
- The scene `model` no longer carries a stray `triangles` key (the legacy import had it too).
- Delaunay import writes step and triangles in one `setState` (was two writes).

## Not verified

- No browser smoke, no production build, no real localStorage presets.

## Handler review (Sonnet reviewer, no blocking findings)

- Board redraw after a Delaunay import: the removed `requestRender()` is covered by `PointSetGraph.onStateChange` -> `syncScene` (`PointSetGraph.tsx:739-742`), whose overlay inputs include the step.
- Added by the handler: `an import while the trace plays pauses playback at the stored step` (retained behaviour guard; passes before and after). `just unit` on the file: 19 passed, `.command-logs/2026-11-12T21-12-16-820Z-3024-2d91f214.log`.
- An empty stored list for points that allow no triangulation is now accepted rather than falling through to the starting rule; both give an empty list.
