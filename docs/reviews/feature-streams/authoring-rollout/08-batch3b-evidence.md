# Task 08 batch 3b evidence: the hull, robustness and curve-pair graphs on the point-set extension

Graphs: `convex-hull` (`HullTraceGraph`), `hull-robustness` (`HullRobustnessGraph`), `bezier-hulls` and `bezier-clipping` (both on `TraceCurvePairGraph`; clipping adds a setting).

## Design

- `PointSetExtension {normalise?, fields: PointSetExtraField[] {name, parse, fallback}, settle?(model, values)}` (`pointSetPersistence.ts`) generalises batch 3a's `PointSetStepDeclaration`. `readExtras` reads each declared field by name (own-property check plus `Reflect.get`, validated by `parse`; never a spread of the file's object). `extrasOf` is the read value or the field's fallback, then `settle` (for example the step clamp on the new model's run). `pointSetPersistence(ids, declared)` takes an extension or a step declaration (adapted by `stepExtension`), so batch 3a graphs and tests are unchanged. `PointSetPermittedState` has a `[field: string]: unknown` signature.
- `PointSetGraph.persistenceExtension()` (default: adapts `persistenceStep()`); `declaresWholeScene()` is true when one is declared. `importPresetData` reconstructs with `this.state` as the permitted source and writes every declared field.
- `HullTraceGraph`: module `HULL_TRACE_EXTENSION` (`algorithm`, `step`; normalise to points; step clamped on the algorithm's run).
- `HullRobustnessGraph`: `HULL_ROBUSTNESS_EXTENSION` (`algorithm` accepted but forced to `monotone-chain`; `step` clamped under pop/duplicates; `mode`, `pop`, `duplicates`, `panel`, `cellI`, `cellJ`).
- `TraceCurvePairGraph.persistenceExtension()`: `step` (nonnegative whole number clamped to `computeRun(model, {...getInitialState(), ...values})`) plus a `settingFields()` hook; `BezierClippingGraph.settingFields()` adds `clipToleranceExponent` (fallback 6).

## Field classification

| Graph | Persisted (in the file, declared) | Permitted, not kept | Transient | Derived |
| --- | --- | --- | --- | --- |
| convex-hull | model (points), overlays, algorithm, step | none | playback | run, memos |
| hull-robustness | model, overlays, step, mode, pop, duplicates, panel, cellI, cellJ | algorithm (accepted, forced to `monotone-chain`) | playback | run, memos |
| bezier-hulls | model, overlays, step | none | playback | trace, memos |
| bezier-clipping | model, overlays, step, clipToleranceExponent | none | playback | trace, memos |

## Removed code

- `figurePresetGraphState` overrides in `HullTraceGraph`, `HullRobustnessGraph`, `TraceCurvePairGraph`, `BezierClippingGraph`; the model/step mappings in their `importPresetData` (now `super.importPresetData(data)` then `playback.restoreTo`).
- The unnamed-Preset pre-resets in `TraceCurvePairGraph.importPreset` and `BezierClippingGraph.importPreset`. They were redundant: `BaseGraph.importPreset` replaces the state over `getInitialState()` (`BaseGraph.tsx:1085`), so an omitted field already took the initial value; it is now the declared fallback.

## Contract rows

`PRESET_DATA_STATE_KEYS` (`graphTransientStateContract.tsx`): removed `convex-hull`, `hull-robustness`, `bezier-hulls`, `bezier-clipping` (each `['model']`). With a projection the contract asserts `preset.graphState` equals the projection and has no `model`; the row only asserted that `state` has `model`, which `pointSetExtensionPersistence.host.test.tsx` asserts through `target.model`. `point-in-polygon`, `point-set-triangulation`, `delaunay` and later rows are untouched.

## Tests

`src/graphs/compgeo/pointSetExtensionPersistence.host.test.tsx`: 37 tests, 4 rows, hand-authored values (round trip after distinct preceding scenes, partial presets, out-of-range steps, forbidden keys, lesson default and fixture, figure).

### Observed failures

- Against the HEAD versions of the 6 source files: 12 failed, 25 passed (`.command-logs/b3b-pre.log`): forbidden-keys (all 4 rows), lesson default (4), figure (4).
- Mutations (new plus batch 3a test files, 88 tests), all restored afterwards (checked with `git status`): reconstruct omitted field keeps the defaults' value, 21 failed (`b3b-mut-m1.log`); no step clamp in TraceCurvePair, 5 (`m2`); clipping run uses live state instead of values, 1 (`m3`); hull normalise removed, 1 (`m4`); tolerance fallback 5 instead of 6, 4 (`m5`, the unnamed-reset tests). Logs `.command-logs/b3b-mut-m1..m5.log`.
- Lint found one unused import (`serializePointSetModel` in `TraceCurvePairGraph.tsx`); removed.

## Checks

- New test file alone: 37 passed (`.command-logs/2026-11-12T19-25-47-904Z-26364-22191a03.log`).
- `just typecheck` (final tree): passed (`.command-logs/2026-11-12T19-35-19-018Z-21136-9f4715e4.log`). `just lint` (final tree): passed (`.command-logs/2026-11-12T19-34-34-049Z-8524-2d8a1993.log`).
- `just unit src/graphs/compgeo src/graphs/base`, six `BEZEG_*` sweep variables (TRANSIENT_STATE, LESSON_RESTORATION, SCENE_CONTENT, SCENE_REPLACEMENT, PRESET_ROUNDTRIP, GRAPH_TEARDOWN) set to the 10 ids (convex-hull, hull-robustness, bezier-hulls, bezier-clipping, ear-clipping, interval-sweep, segment-intersections, monotone-partition, monotone-triangulation, fortune): passed in 825.0s, `.command-logs/2026-11-12T19-37-06-053Z-3396-6932ac92.log`.
- Wide `just unit src` with the 22 point-set ids: passed in 965.3s, `.command-logs/2026-11-12T19-50-58-037Z-25512-c09a28d7.log`.

## Departures

- Batch 3a `importPresetData` now also writes declared fields back from `this.state` (the reconstruct path), not only `step`.
- The hull step accepts any finite number (collection unchanged), then truncates and clamps; as in batch 3a.

## Not verified

- No browser smoke; no production build.
- Browser-local presets stored before this change were not checked against a real localStorage.
