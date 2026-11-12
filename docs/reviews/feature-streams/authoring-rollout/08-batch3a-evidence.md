# Task 08 batch 3a evidence: the plain `step` graphs on the point-set declaration

Graphs: `ear-clipping`, `interval-sweep`, `segment-intersections`, `monotone-partition`, `monotone-triangulation` (inherits the partition's declaration; its `buildRun` override supplies the trace), `fortune`.

## Design

- `pointSetPersistence(overlayIds, step?: PointSetStepDeclaration)` (`pointSetPersistence.ts`). `PointSetStepDeclaration = {normalise?(model), clamp(model, step)}` is the one extension: the graph supplies how its data forms a closed polygon (ear clipping, both monotone graphs) and how a step index is clamped to its trace (the graph's own run: `runEarClipping`, `runIntervalSweep`, `runBentleyOttmann`, `buildRun`, `runFortune`).
- `PointSetGraph.persistenceStep()` (protected, default `undefined`). A subclass declares by returning a stable declaration object (a private readonly field); `declaresWholeScene()` is true for it because it declares, then falls back to the old key-shape test for the not-yet-migrated 3-key graphs. The persistence is memoised per overlay ids and declaration identity.
- `reconstruct(data, permitted, defaults)`: `{...defaults, initialized, overlays, model: normalise(serialize(data)), step: clamp(model, permitted step ?? 0)}`. The step is read only as a named finite number from the permitted state; the defaults' step never stands in, so an omitted step is 0 whatever scene preceded. `project` returns `{initialized, overlays, step: clamp(model, state.step ?? 0)}`. The permitted state is never spread; `PointSetGraphState` and the permitted/scene types gained an optional `step?: number` (no casts).
- `PointSetGraph.importPresetData` (which `BaseGraph.importPreset`, lesson fixtures and Preset selection call after the state is replaced) reconstructs with `{step: this.state.step}` as the permitted state for a declaring graph, so the step the file just set is kept, clamped to the new data (today's behaviour). Each graph's `importPresetData` is now `super.importPresetData(data); this.playback.restoreTo(this.step);`.
- Review nit: `PointSetGraph.figurePresetGraphState` tests `data == null` (as `BaseGraph`).

## Verified today's behaviour (kept)

- Omitted `step`: `BaseGraph.importPreset` replaces the state with `{...getInitialState(), ...checked.graphState}`, so it was 0; the figure path took the live step through `initialFigureGraphState ?? this.state` (a leak, now 0 from the declaration; tested with a live step 1).
- The collections permit any finite number for `step` (`parseHullStep`), not only integers, and every run's `clamp` truncates (`Math.trunc`) and clamps to `[0, steps-1]`. The declaration reads the same finite numbers (collections untouched: tightening would refuse files that load today) and the state always holds the truncated integer. This departs from the brief's "integers only" for the file; the stored value is an integer.
- Behaviour change: the declared `importPresetData` also clears `pending` (the base did; the six old overrides did not). A stale pending edit after an import is dropped.

## Removed code

- Per graph (5 files): the `figurePresetGraphState` override, and the model/step computation in `importPresetData` (data normalisation moved to `normalise`). Unused `StoredGraphState` imports removed.
- Kept: `sceneGraphState` in all five (`{...state, step: this.step}`): checkpoints (`captureLessonState`) use `savedGraphState()`, not the projection, and capture the full runtime state with a clamped step; the projection does not cover that path.
- `PRESET_DATA_STATE_KEYS` (`graphTransientStateContract.tsx`): removed the rows `ear-clipping`, `interval-sweep`, `segment-intersections`, `monotone-partition`, `monotone-triangulation`, `fortune` (each `['model']`). With a projection the contract asserts `preset.graphState` equals the projection and has no `model`; the row only asserted `state` has `model`, which the new tests assert (`target.model`, a getter of `state.model`, in every test).

## Tests

`src/graphs/compgeo/pointSetStepPersistence.host.test.tsx`: 51 tests (8 per graph, plus the open-polygon closure for the 3 polygon graphs). Hand-authored models, steps and overlays. Per graph: round trip after two distinct preceding scenes (steps 1 and 2 before step 3); partial preset (no step, step alone, overlays alone, no graphState, no data); out-of-range step (9999, -7, 2.7) clamped, in import and in the figure state; malformed refusal with state/model/step unchanged (`'3'`, `null`, NaN, extra key, model key, bad overlays); forbidden keys through the declaration (model, extra, junk steps, defaults' step 2 not leaking); lesson default and fixture; figure return; checkpoint restore.

### Observed failures

- Against the pre-change `PointSetGraph.tsx`, `pointSetPersistence.ts` and the five graph files restored from HEAD: 18 failed, 33 passed (log `.command-logs/` newest at 18:3x, run after the green run). The failing are, for all 6 graphs, the forbidden-keys test (no `persistenceStep`), the lesson default/fixture test and the figure test (the live model and step leaked). Round trip, partial, clamp, malformed, closure and checkpoint tests pass on the old code: they pin existing behaviour that must not change.
- Mutation 1, reconstruct falls back to `defaults.step` for an omitted step: 6 failed (the forbidden-keys test of each graph). The graph-level tests did not catch it: `initialFigureGraphState` is the initial state, whose step is 0.
- Mutation 2, reconstruct without the clamp: 12 failed (forbidden-keys and out-of-range tests of each graph).
- `pointSetPersistence.ts` was restored after each mutation (diffed).

## Checks

- New test file alone: 51 passed (`.command-logs/2026-11-12T18-36-22-686Z-31112-9ab5ecc7.log`).
- `just lint`: passed (`.command-logs/2026-11-12T18-40-25-628Z-18384-29b81946.log`); `just typecheck`: passed (`.command-logs/2026-11-12T18-41-00-346Z-32124-beaec53b.log`). Both failed once first (unused imports; `step` in a `Partial<BaseGraphState>` literal in my test), fixed.
- `just unit src/graphs/compgeo src/graphs/base`, six `BEZEG_*` sweep variables (TRANSIENT_STATE, LESSON_RESTORATION, SCENE_CONTENT, SCENE_REPLACEMENT, PRESET_ROUNDTRIP, GRAPH_TEARDOWN) set to the 6 ids: passed in 429.2s, `.command-logs/2026-11-12T18-42-04-923Z-26096-7e3d7109.log`.
- Wide `just unit src` with the 22 point-set ids: 891 files passed, 1 failed suite, 15780 tests passed (1114.8s, `.command-logs/2026-11-12T18-49-23-731Z-15988-94cdfc8a.log`). The one failed suite, `EarClippingGraph.host.test.tsx`, was an ENOENT on `node_modules/.vitest-cache` while the handler was relinking `node_modules/.bin` (environment). Rerun alone after the relink: passed (`.command-logs/2026-11-12T19-09-21-554Z-30580-ee9d035d.log`). The wide run itself was not repeated.

## Not verified

- No browser smoke; no production build.
- Out-of-scope graphs (HullTrace, HullRobustness, BezierHulls, BezierClipping, TraceCurvePair, Triangulation, Delaunay, Voronoi, PointInPolygon, plane geometry) stay on the legacy branch by the key-shape test; verified only by their existing tests in the runs below.
- A step stored before this change in browser-local presets loads as before (finite numbers); not checked against a real localStorage.
