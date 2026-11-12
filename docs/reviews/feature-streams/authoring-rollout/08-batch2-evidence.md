# Task 08 batch 2 evidence: point-set declaration, `orientation` and `polygon-area`

## Declaration and type change

- `src/graphs/base/presets/ScenePersistence.ts` (separate commit; 3 insertions, 2 deletions): `ScenePersistence<D, S, P extends {initialized: boolean} = {initialized: boolean}>`; `project` returns `graphState: P`; `reconstruct` still takes `permittedState: unknown`. A doc line names `P`. The five projective declarations compile unchanged (default `P`); `projectivePersistence.ts` is untouched.
- `src/graphs/compgeo/pointSetPersistence.ts` (new): `PointSetSceneState`, `PointSetPermittedState = {initialized: boolean; overlays: Record<string, boolean>}` (the collection permits only `initialized` and `overlays` of booleans, `pointSetPresetCollection.ts:37-46`; the runtime overlay value is `boolean | undefined`), and `pointSetPersistence(overlayIds)` returning a frozen declaration.
  - `project`: `data` = `serializePointSetModel(model)`; `graphState` = `{initialized, overlays}` with undefined overlay values dropped.
  - `reconstruct`: `{...defaults, ...permitted initialized (boolean only), ...permitted overlays (own keys in overlayIds with boolean values), model: serializePointSetModel(data)}`. Model is written last; no other key of the permitted state is read.

## Base rewiring (deleted mapping lines)

`compgeo/PointSetGraph.tsx`, old 492-518 (`exportPresetData`, `exportPreset` stripping, `importPresetData`, `figurePresetGraphState`, `lessonDefaultState`) replaced by the declaration (`persistence()` memoised per overlay-id list):
- `exportPresetData` = `persistence().project(state).data`.
- `projectPersistedScene` (BaseGraph hook) returns the projection when the graph declares its whole scene.
- `importPresetData` still clears `pending`, then writes `reconstruct(data, undefined, state).model`.
- `figurePresetGraphState` = `reconstruct(data ?? persistedDefaultData(), graphState, super(undefined))` + `initialized: true` (as FivePoint). The old base copied the LIVE `this.model`; this no longer leaks.
- `lessonDefaultState(data)` = `reconstruct(data ?? persistedDefaultData(), undefined, getInitialState())` + `initialized: true`. Old: live `this.model`.

Transitional branch (departure from "delete the replaced code"): `declaresWholeScene()` is true when `getInitialState()` has only `initialized`, `model`, `overlays`. A subclass with more scene state (step, triangles, mode, tolerance) keeps the OLD behaviour in `projectPersistedScene` (undefined, so BaseGraph's `savedGraphState` path), `exportPreset` (model stripped), `figurePresetGraphState` and `lessonDefaultState` (live model). Reason: with no subclass or BaseGraph edit, `reconstruct` would drop `step`-like keys that those graphs' own collections permit, and `projectPersistedScene` would also have to override `TriangulationGraph.exportPreset`'s deletions, which the contract test compares. The legacy lines go away as batches 3-6 declare those graphs.

## Subclass accounting (inventory 3.5)

- Whole scene declared, inherit unchanged: `OrientationGraph`, `PolygonAreaGraph` (initial state keys `initialized`, `model`, `overlays`; overlays override only). Also any class whose initial state is exactly those keys (no other found).
- Legacy branch, behaviour unchanged (extra initial-state keys): `HullTraceGraph`, `PointInPolygonGraph` (query), `EarClippingGraph`, `IntervalSweepGraph`, `BentleyOttmannGraph`, `MonotonePartitionGraph`, `FortuneGraph`, `TriangulationGraph`, `VoronoiGraph`, `NotablePointsGraph`, `EulerLineGraph`, `InscribedAngleGraph`, `SimsonLineGraph`, `InversionGraph`, `BezierHullsGraph`, `BezierClippingGraph`, `HullRobustnessGraph`, `MonotoneTriangulationGraph`, `DelaunayGraph`, `DegenerateSitesGraph`, intermediates `CurvePairGraph`, `TraceCurvePairGraph`. The only shared change for them is `exportPresetData` (now via the declaration: same `serializePointSetModel(state.model)`) and `importPresetData` (same model write, `pending` cleared). Not individually verified which of the plane-geometry graphs (`triangle-centres`, `euler-line`, `inscribed-angle`, `simson-line`, `inversion`) have exactly the three keys; if one does, it is on the declared path, and its tests passed in the runs below either way.
- Subclass files and `BaseGraph.tsx` are not edited.

## Overlay merge decision

A permitted `overlays` map REPLACES the defaults' overlays (not a per-id merge); absent `overlays` keeps the defaults'. This is today's behaviour: `BaseGraph.importPreset` does `{...getInitialState(), ...checked.graphState}`, a shallow spread. An id a partial map omits takes the graph's initial value via `overlayShown`, not a stored value. Tested: `{overlays: {values: false}}` on orientation gives exactly `{values: false}` and `turn` still reads shown.

## Tests and observed failures

`src/graphs/compgeo/pointSetPersistence.host.test.tsx`, 7 tests for each of the two rows (14), expected values hand-authored: round trip after two preceding scenes (with board points), partial preset (no graphState, partial overlays, no data), malformed refusal with state, model and drawn points unchanged, forbidden keys through the permitted state (declaration level, with the projection), lesson default scene and fixture, figure return, checkpoint restore.
- Against the pre-change `PointSetGraph.tsx` (restored from HEAD, then reinstated): 4 failed, 10 passed. The failing are the lesson-default/fixture and figure tests of both rows (the live model leaked into the fixture and figure states).
- Against a declaration that spreads the permitted state into the result: 2 failed (the forbidden-keys test, both rows).
- Against a declaration with the final `model` write removed: 12 failed, 2 passed.
- The round-trip, partial, malformed and checkpoint tests also pass on the old code: they pin existing behaviour that must not change (P1/P3), not new behaviour.

## Contract rows

Removed `orientation: ['model']` and `'polygon-area': ['model']` from `PRESET_DATA_STATE_KEYS` (`graphTransientStateContract.tsx`). With a projection declared the contract asserts `preset.graphState` equals the projection and has no `model` (lines 386-392); the rows only added `expect(graph.state).toHaveProperty('model')` (line 385). Replaced by: the round-trip test (`graphState` equals `{initialized, overlays}`, `not.toHaveProperty('model')`) and `target.model`, a getter of `state.model`, asserted in every test. All other rows left.

## Checks with log paths

- `just unit src/graphs/compgeo src/graphs/projective src/graphs/base/presets`, six BEZEG_* variables set to the 22 ids: passed in 676.8s, `.command-logs/2026-11-12T17-41-25-780Z-392-31cb879b.log`.
- `just typecheck`: first run failed with one TS2353 in my test (fixed), then passed: `.command-logs` newest typecheck log after 17:52 (second run, 152.9s).
- `just lint` on the changed paths: passed, `.command-logs/2026-11-12T17-58-00-490Z-28428-0477c98d.log`.
- Wide `just unit src` with the 22 ids (covers `src/graphs/base`): passed in 1456.4s, `.command-logs/2026-11-12T17-58-07-847Z-32460-feb41cf4.log`.

## Not verified

- No browser smoke (not requested). The production build was not run.
- `src/graphs/base` ran only inside the wide run, not separately.
- No stored-format change was found: key `compgeo-point-set` and per-graph keys untouched, `file.graphState` is `{initialized, overlays}` as before for these rows; not checked against a real saved file in localStorage.
