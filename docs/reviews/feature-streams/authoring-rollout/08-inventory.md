# Task 08 step 1: persisted scene projection inventory

Read-only research, 2026-11-12. Scope: the 25 baseline rows of `PRESET_DATA_STATE_KEYS` (`src/graphs/base/graphTransientStateContract.tsx:70-116`). Nothing was run; every claim is from reading the cited lines. Paths are under `src/graphs/` unless stated.

## 1. Shared machinery

- Declaration type: `base/presets/ScenePersistence.ts:6-16`. `project(state)` returns `{data, graphState: {initialized: boolean}}`; `reconstruct(data, permittedState, defaults)` returns the runtime state. The permitted state is typed as only `initialized`. Every PointSetGraph row needs more (`overlays`, `step`, ...), so the type must be generalized (P2 allows this "where a consumer needs more than `initialized`").
- Base hooks (`base/BaseGraph.tsx`):
  - `exportPreset` 1050-1059 uses `projectPersistedScene()` (1065) when a family overrides it, else `savedGraphState()` + `exportPresetData()`.
  - `importPreset` 1075-1090: board state, then `replaceState({...getInitialState(), ...checked.graphState, initialized: true})`, then `importPresetData(checked.data ?? persistedDefaultData())` (1106).
  - Default lesson scene: `prepareLessonDefaultScene` 619-627 and fixture scene `prepareLessonFixtureScene` 588-600; both call `importPresetData(data)` then `state: {...getInitialState(), ...lessonDefaultState(data)}` (hook 694, default `{initialized: true}`).
  - Figure: `importFigurePresetData` 719-722 then `figurePresetGraphState(graphState, data)` (758; called at 1265; the `data` argument exists).
  - Reset: `reset()` 327 calls `reloadSelectedScene()`, which re-imports the selected Preset or `importPresetData(initialPresetData())` (mount path 895-902).
  - Checkpoint: capture ~767-780 stores `savedGraphState()`, `exportPresetData()` and `captureTransientState()`; `restoreLessonState` 786-800 re-imports directly (trusted, full state, not via ScenePersistence).
- Adopted pattern: `projective/projectivePersistence.ts:1-42` (`fivePointPersistence`, `threeViewsPersistence`) and the FivePoint consumer `projective/FivePointGraph.tsx:251-276`:
  - `projectPersistedScene` -> `project(this.state)`.
  - `exportPresetData` -> `project(...).data`.
  - `importPresetData` clears transient fields, then `reconstruct(data, undefined, this.state)`.
  - `figurePresetGraphState(graphState, data)` -> `reconstruct(data ?? persistedDefaultData(), graphState, super.figurePresetGraphState(undefined))`.
  - `lessonDefaultState(data)` -> `reconstruct(data ?? persistedDefaultData(), undefined, getInitialState())`.
  - Tests: `projective/projectivePersistence.host.test.tsx` has FivePoint tests at 47-142 and ThreeViews at 143-end, and none for the trio.
- Existing single-owner coverage of any in-scope row: none. `ScenePersistence` is referenced only in `BaseGraph.tsx`, `ScenePersistence.ts` and `projectivePersistence.ts` (Grep over `src`). All 25 rows are un-migrated.

## 2. Projective trio (batch 1)

All three extend `BaseGraph<State, Model>` directly, not PointSetGraph. The collection (`projective/projectivePresetCollection.ts:15-30`) permits only `initialized` in `graphState`, the same as the adopted FivePoint/ThreeViews collections.

| Item | CrossRatio (`projective-cross-ratio`) | Pascal (`projective-pascal`) | PolePolar (`projective-pole-polar`) |
|---|---|---|---|
| Class, file | `CrossRatioGraph`, `projective/CrossRatioGraph.tsx` | `PascalGraph`, `projective/PascalGraph.tsx` | `PolePolarGraph`, `projective/PolePolarGraph.tsx` |
| State shape | `{initialized, model}` (33-35) | same (36-38) | same (35-37) |
| Persisted data | `CrossRatioModel` via `serializeCrossRatioModel` | `PascalModel` via `serializePascalModel` | `PolePolarModel` via `serializePolePolarModel` |
| Permitted graph state | `initialized` only | same | same |
| Transient | `selected` (handle), `nudged`; captured as `crossRatioSelected` (185-193) | `selected` (index or undefined), `nudged`; captured as `pascalSelected` (`?? -1`) | `selected` (boolean), `nudged` (boolean); captured as `polePolarSelected` (restore at 248) |
| Derived cache | `sceneCache` keyed by model identity (69-72), `evaluateCrossRatio` | `sceneCache` (96, 110) | `sceneCache` (83, 97) |
| Export mapping to delete | `exportPreset` override strips `model` 159-164; `exportPresetData` 166-168 | 233-238; 240-242 | 216-221; 223-225 |
| Import (keep the clearing, replace the write) | `importPresetData` 170-175 | 244-249 | 227-232 |
| Figure mapping to replace | `figurePresetGraphState` 177-179, reads the live `this.model` | 251-253 | 234-236 |
| Default-scene mapping to replace | `lessonDefaultState()` 181-183, reads the live `this.model`; no `data` parameter | 255-257 | 238-240 |
| Reset | inherited `importPresetData(initialPresetData())` | same | same |
| Checkpoint | `captureTransientState`/`restoreTransientState` 185-193 (trusted, keep) | keep | keep |

What remains to migrate, per the FivePoint recipe:
1. Add `crossRatioPersistence`, `pascalPersistence` and `polePolarPersistence` to `projective/projectivePersistence.ts`, each with State `{initialized, model}`. `reconstruct` is `{...defaults, ...permittedInitialized(state), model: serializeXModel(data)}`, as `threeViewsPersistence` (36-41). They have no `lastUnique`-style derived state: the scene caches rebuild lazily from the new model object.
2. In each graph add a `projectPersistedScene` override that calls `project(this.state)`. Delete the `exportPreset` override (the model-stripping knowledge), and make `exportPresetData` return `project(this.state).data`.
3. Change `importPresetData` to call `reconstruct`. The selection/nudge clearing stays; it is graph-owned transient state.
4. Replace `figurePresetGraphState` and `lessonDefaultState` with the FivePoint forms, which take `data`. The current ones depend on `importPresetData` having already written `this.model`; the new ones remove that order dependence.
5. The `Preset` and `StoredGraphState` imports may become unused; check.

Behaviors to preserve and the tests that protect them:
- Finite and ideal points:
  - The model parsers and `serializeXModel` stay the only data validators. The collection's `check` is `parseXModel`.
  - CrossRatio image at infinity and undefined projection: `CrossRatioGraph.host.test.tsx:54`, `:70`.
  - Pascal ideal point drawn as an arrow: `PascalGraph.host.test.tsx:92`; Pascal line at infinity `:110`; coincident neighbour `:126`.
  - PolePolar ideal P: `PolePolarGraph.host.test.tsx:81`; P at the centre `:247`; parabola ideal axis `:255`.
  - Model unit tests: `crossRatioModel.test.ts`, `pascalModel.test.ts`, `polePolarModel.test.ts`.
- Selection reset on import or Reset, with the readout and board agreeing: `CrossRatioGraph.host.test.tsx:161`, `PascalGraph.host.test.tsx:308`, `PolePolarGraph.host.test.tsx:215`. Selection restored by checkpoint: the transient-state contract (`base/GraphTransientState*.test.tsx`).
- Lesson load-example clears the selection: `CrossRatioLessonActions.host.test.tsx:77`. Lesson actions overall: the `*LessonActions.host.test.tsx` files.
- Stored format: `projective/projectivePresetCollection.test.ts`, `projective/registrationLoading.test.tsx`, and the generic `PresetRoundTrip.contract.test.tsx:56-84` (export/import/Reset equality).
- Missing today and needed for P3 (add to `projectivePersistence.host.test.tsx`): a trio round trip with hand-authored expected data after two distinct preceding scenes, a model or extra key in the permitted state cannot override the checked data, a partial or absent `graphState`, malformed refusal without mutation, and lesson default-scene/figure return. The `PRESET_DATA_STATE_KEYS` rows `projective-*` (113-115) can be removed only once those tests assert the independent expectations.

## 3. Legacy PointSetGraph rows (22)

### 3.1 The PointSetGraph base (`compgeo/PointSetGraph.tsx`)

- State: `PointSetGraphState = {initialized, model: PointSetModel, overlays}` (75-79). `getInitialState` is `{initialized: false, model: EMPTY_POINT_SET_MODEL, overlays: {}}` (167).
- Persisted data: `PointSetModel` via `serializePointSetModel` / `parsePointSetModel`; the key is `compgeo-point-set` (81).
- Permitted graph state: `initialized` and `overlays`, restricted to the graph's overlay ids (`compgeo/pointSetPresetCollection.ts:37-46`). Subclass collections wrap `base.checkGraphState` and add fields (3.2).
- Transient state (not persisted): `selected`, `addModeOn`, `pending`, `pendingObjects`, `noticeValue` (108-115). Captured as `pointSetSelected`/`pointSetAddMode` (522-534); `restoreTransientState` also clears `pending` and the notice.
- Derived caches: `drawn`, `overlayObjects`, `overlaysDrawnFor` (model/overlays/extra memo), `pendingDrawnFor`.
- Base mappings (inherited by every subclass):
  - `exportPresetData` 492-494.
  - `exportPreset` strips `model` 500-504.
  - `importPresetData` 506-509 (clears `pending`, writes the model).
  - `figurePresetGraphState` 512-514 (`model: this.model`, the live model).
  - `lessonDefaultState` 516-518 (`model: this.model`).
  - `presetCollection` 484-486, `defaultPreset` 488-490.
- A base `reconstruct` would be `{...defaults, ...permittedOverlays(permittedState), model: serializePointSetModel(data)}`. The collection already restricts overlay ids; the permitted-state reader must still ignore unknown keys.
- Shared-base change blast radius: every class in 3.5. Excluded Families-prep entries (trigonometry, line, isometry, circle-construction, combinatorics, `prob-simulation`, `curve-kinematics`) do not inherit PointSetGraph: a search of `src` outside `compgeo/` for `extends PointSetGraph` and for every subclass name finds only a doc-comment reference in `learning/model.ts`. Test-only subclasses a base change affects: `PointSetGraph.host.test.tsx:19,24`, `PointSet.sharedControls.test.tsx:25`, `PointSetIntervals.host.test.tsx:20,26`, `PointSetSegments.host.test.tsx:20,27`.

### 3.2 Per-row inventory

"Inherits" means the 3.1 base mapping is used unchanged. Data is a `PointSetModel` unless stated. Files are in `compgeo/`.

| ID | Class, file | Extra permitted state | Subclass-specific mappings | Notes |
|---|---|---|---|---|
| `orientation` | `OrientationGraph` (`OrientationGraph.tsx:54`) | none | none | Pure base. Initial overlays `turn`, `values` (76-78). |
| `polygon-area` | `PolygonAreaGraph` (`:96`) | none | none | Pure base. |
| `convex-hull` | `HullTraceGraph` (`:50`) | `algorithm`, `step` (`hullTracePresetCollection.ts:19-24`) | `sceneGraphState` 229; `importPresetData` 235-242 (keeps `this.algorithm` and the stored step from the already-replaced state, clamps, restores playback); `figurePresetGraphState` 244-251 | Step clamp reads `runHullTrace`; playback is transient. |
| `hull-robustness` | `HullRobustnessGraph` extends `HullTraceGraph` (`:65`) | adds `mode`, `pop`, `duplicates`, `panel`, `cellI`, `cellJ` (`hullRobustnessPresetCollection.ts:26`) | `sceneGraphState` 267-271; `figurePresetGraphState` 273-292 (parsers, defaults, fixed algorithm `monotone-chain`) | Own collection key. |
| `point-in-polygon` | `PointInPolygonGraph` (`:150`) | `query` (grid point) (`pointInPolygonPresetCollection.ts:22-26`) | `figurePresetGraphState` 271-275 (`storedQuery`); transient `queryActive` 277-284 | `query` is permitted state, not data. |
| `bezier-hulls` | `BezierHullsGraph` extends `TraceCurvePairGraph` (`:67`) | `step` (`bezierHullsPresetCollection.ts:25-29`) | Inherits TraceCurvePair mappings (`TraceCurvePairGraph.tsx`: `sceneGraphState` 196; `importPreset` 202-208, resets the step when unnamed; `importPresetData` 210-216; `figurePresetGraphState` 218-224) | `CurvePairGraph` is the intermediate base: overlays `control`, `hull`. |
| `bezier-clipping` | `BezierClippingGraph` extends `TraceCurvePairGraph` (`:67`) | `step`, `clipToleranceExponent` (`bezierClippingPresetCollection.ts:29-36`) | `importPreset` 211-216 resets the tolerance when unnamed; `figurePresetGraphState` 220-225 | Two-field permitted state; a contextual reset to preserve. |
| `ear-clipping` | `EarClippingGraph` (`:63`) | `step` | `sceneGraphState` 215; `importPresetData` 221-227 (forces a closed polygon, clamps); `figurePresetGraphState` 229-235 | |
| `interval-sweep` | `IntervalSweepGraph` (`:43`) | `step` | `sceneGraphState` 208; `importPresetData` 214; `figurePresetGraphState` 222 | Intervals data. |
| `segment-intersections` | `BentleyOttmannGraph` (`:44`) | `step` (`bentleyOttmannPresetCollection.ts:35-39`) | `sceneGraphState` 209; `importPresetData` 215; `figurePresetGraphState` 223 | Segments data. |
| `monotone-partition` | `MonotonePartitionGraph` (`:60`) | `step` | `sceneGraphState` 232; `importPresetData` 238; `figurePresetGraphState` 246 | |
| `monotone-triangulation` | `MonotoneTriangulationGraph` extends `MonotonePartitionGraph` (`:37`) | `step` (same check under its own key) | inherits | |
| `fortune` | `FortuneGraph` (`:59`) | `step` (`fortunePresetCollection.ts:70-74`) | `sceneGraphState` 240; `importPresetData` 246; `figurePresetGraphState` 254 | |
| `point-set-triangulation` | `TriangulationGraph` (`:102`) | none permitted; `triangles` and `previous` are stripped from `graphState` | see 3.4 | Data also carries `triangles`. |
| `delaunay` | `DelaunayGraph` extends `TriangulationGraph` (`:62`) | `step` (`delaunayPresetCollection.ts:42-46`) | `sceneGraphState` 294-297; `importPresetData` 300-305; `figurePresetGraphState` 307-314 (builds the run from `merged.triangles`) | See 3.4. |
| `voronoi` | `VoronoiGraph` (`:99`) | `cellSite`, `construction`, `query`, `mode` (`voronoiPresetCollection.ts:51-58`) | `sceneGraphState` 773; `importPreset` 777-786 (merges defaults into `graphState`, hands them over in `carried`); `importPresetData` 790-801 (clamps site and count; `four-point` mode falls back unless exactly 4 sites); `figurePresetGraphState` 805-815 | Most complex row. |
| `voronoi-degenerate` | `DegenerateSitesGraph` extends `VoronoiGraph` (`:16`) | as `voronoi`, own collection | overrides `defaultMode`, `presetCollection`, `defaultPreset`, `exampleModel`; no persistence-hook overrides | Moves with `voronoi`. |
| `triangle-centres` | `NotablePointsGraph` (`:51`) | `exampleId` (`notablePointsPresetCollection.ts:19-24`) | none; `getInitialState` 132-137 | In `NO_SYNCHRONOUS_SCENE_CHANGE` (`graphTransientStateContract.tsx:63`). |
| `euler-line` | `EulerLineGraph` (`:57`) | `exampleId` (`eulerLinePresetCollection.ts:22-27`) | none; `getInitialState` 135-140 | Same note. |
| `inscribed-angle` | `InscribedAngleGraph` (`:55`) | `exampleId`, `t` (`inscribedAnglePresetCollection.ts:20-25`) | none; `getInitialState` 168-173 | Task 07 overlap. |
| `simson-line` | `SimsonLineGraph` (`:72`) | `exampleId`, `mode`, `t`, `epsilon`, `pPrime` (`simsonLinePresetCollection.ts:14,27-35`) | none; `getInitialState` 253-259 | Task 07 overlap. |
| `inversion` | `InversionGraph` (`:87`) | `exampleId`, `focus`, `radius`, `x`, `source`, `power`, `angle` (`inversionPresetCollection.ts:26,82-90`) | none; `getInitialState` 353-359 | Task 07 overlap; in `NO_SYNCHRONOUS_SCENE_CHANGE`. |

Not verified: exact field types of the plane-geometry extra state (`t`, `x`, `pPrime`, `source`, `power`, `angle`) and how each is clamped on restore. Task 07 touches these classes. I did not read the model validators or controls.

### 3.3 Reconstruction paths shared by all point-set rows

- Import (file or selector): `BaseGraph.importPreset` 1075 -> `replaceState(initial + checked state)` -> subclass `importPresetData`, which reads `this.state.step` and similar from the state just written (HullTrace, EarClipping, IntervalSweep, BentleyOttmann, Monotone, Fortune, Delaunay, TraceCurvePair). This order dependence is the knowledge the projection should replace.
- Figure: `figurePresetGraphState(graphState, data)`; base uses the live `this.model` (PointSetGraph 512). Subclasses clamp steps against `merged.model.points`.
- Default lesson scene and fixture scene: base `lessonDefaultState` 516 (the live model after the import). No subclass overrides it; step-type fields come from `getInitialState`.
- Reset: the base re-imports the selected Preset or `initialPresetData()`.
- Checkpoint: trusted, `sceneGraphState` + `exportPresetData`.
- Contextual-reset behaviors to preserve (P2): an omitted `step`/tolerance resets to 0/6 rather than keeping the preceding scene (`TraceCurvePairGraph.importPreset` 202-208, `BezierClippingGraph.importPreset` 211-216); omitted Voronoi site/count/query/mode reset (777-786).

### 3.4 Triangulation's extra state, classified separately

- Persisted data: `PointSetModel` points plus `triangles` (`TriangulationGraph.tsx` `defaultPreset` 351-354, `exportPresetData` 356-359). `triangulationPresetCollection.ts` validates the list; `importPresetData` 370-387 also throws on an invalid or non-CCW list.
- Permitted graph state: `initialized` and `overlays` only (`triangulationPresetCollection.ts:79-80`). `triangles` and `previous` are scene state that `exportPreset` deletes (390-394), so they are not permitted in a stored `graphState`.
- Runtime scene state beyond that: `triangles` and `previous` (`previousTriangles`) in `sceneGraphState` 401-404 (checkpoints keep them, Presets drop them).
- Transient: `eventValue`, `selectedEdgeValue`, `incoming` (set during the import), `adding`, `loading`. Derived caches: `currentMemo`, `inputsMemo`.
- Reconstruction: `importPresetData` runs with `incoming` set so the model write carries the stored list; a plain point set is triangulated by the starting rule. `figurePresetGraphState` 396-399 takes `this.triangles` from the live scene after the import. Whether `previous` is reset on replacement was not verified.
- `DelaunayGraph` adds `step` and rebuilds the run from `merged.triangles` in its figure mapping. Its `PRESET_DATA_STATE_KEYS` row lists `['model', 'triangles', 'previous']`, like triangulation's.

### 3.5 Every PointSetGraph subclass

In scope (22 rows, 26 classes with intermediates):
- Direct: `OrientationGraph`, `PolygonAreaGraph`, `HullTraceGraph`, `PointInPolygonGraph`, `EarClippingGraph`, `IntervalSweepGraph`, `BentleyOttmannGraph`, `MonotonePartitionGraph`, `FortuneGraph`, `TriangulationGraph`, `VoronoiGraph`, `NotablePointsGraph`, `EulerLineGraph`, `InscribedAngleGraph`, `SimsonLineGraph`, `InversionGraph`.
- Via `CurvePairGraph` -> `TraceCurvePairGraph`: `BezierHullsGraph`, `BezierClippingGraph`.
- Via another subclass: `HullRobustnessGraph` (HullTrace), `MonotoneTriangulationGraph` (MonotonePartition), `DelaunayGraph` (Triangulation), `DegenerateSitesGraph` (Voronoi).
- Intermediate and not registered: `CurvePairGraph` (`CurvePairGraph.tsx:46`; used directly only in `CurvePairGraph.host.test.tsx`), `TraceCurvePairGraph` (`:45`).

Excluded Families-prep entries that inherit PointSetGraph: none found.

## 4. Batch list

1. **Batch 1, projective trio** (no base change): `crossRatioPersistence`, `pascalPersistence`, `polePolarPersistence`, plus tests in `projectivePersistence.host.test.tsx`. Files: the three graphs, `projectivePersistence.ts` and its test. Disjoint from tasks 06 and 07.
2. **Batch 2, shared PointSetGraph mapping** (needs the permitted-state type generalized in `ScenePersistence.ts`, and a decision on how `reconstruct` receives a permitted `overlays` map): a `pointSetPersistence` for `{model, overlays}`, replacing the `PointSetGraph` mappings 492-518. It lands with the rows that need nothing else: `orientation`, `polygon-area`. It must account for every class in 3.5. Serialize with task 07 (holds `PointSetGraph`) and Families-prep (`graphTransientStateContract.tsx`).
3. **Batch 3, step/trace family** (a `step` extension plus per-graph clamp): `convex-hull` + `hull-robustness`, `ear-clipping`, `interval-sweep`, `segment-intersections`, `monotone-partition` + `monotone-triangulation`, `fortune`, `bezier-hulls`, `bezier-clipping` (+ tolerance). Preserve the clamp, the playback restore and the unnamed-step reset.
4. **Batch 4, triangulation**: `point-set-triangulation` + `delaunay` (triangle list in data; `previous`/`triangles` out of the permitted state; `step` for Delaunay).
5. **Batch 5, Voronoi and query**: `voronoi` + `voronoi-degenerate` (site/count/query/mode with the `carried` handoff) and `point-in-polygon` (`query`).
6. **Batch 6, plane geometry**: `triangle-centres`, `euler-line` (exampleId only; may fold into batch 2), then `inscribed-angle`, `simson-line`, `inversion`, which are the task 07 overlap.

Overlap with task 07: `InscribedAngleGraph.tsx`, `SimsonLineGraph.tsx` and `InversionGraph.tsx` are scene-ownership migration targets of task 07, as is `PointSetGraph` (task 08 line 20). One task holds those files and `PointSetGraph` at a time. Do batch 6 (those three) only after task 07 releases them, and batch 2 only when task 07 is not editing `PointSetGraph` or `BaseGraph`. `graphTransientStateContract.tsx` and `PresetCatalog.test.tsx` are also edited by Families-prep: integrate row removals after its additions land.

## 5. Blockers and open points

- `ScenePersistence`'s permitted-state type is `{initialized: boolean}` (`ScenePersistence.ts:10`). Batch 2 onwards needs it generalized, a shared hook change that serializes with task 07.
- A `PRESET_DATA_STATE_KEYS` row (`graphTransientStateContract.tsx:70-116`) cannot be deleted until independent assertions cover it; the trio has no persistence tests beyond what FivePoint/ThreeViews have.
- Not checked: whether Families-prep has uncommitted edits to the contract file, and whether task 07 holds `PointSetGraph` now (the coordination snapshot was not read).
