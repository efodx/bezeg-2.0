# Task 08 batch 5 handoff (worker stopped on HANDOFF, partial)

## State

Implementation and tests are complete and consistent; the final sweep was still running when the worker stopped; the evidence file `08-batch5-evidence.md` is NOT written.

## Done

- `pointSetPersistence.ts`: `PointSetFieldValue = number | string | null | PointSetFieldPair` (grid or text point); `PointSetExtraField.resetOnBareImport`; exported `withoutBareImportFields`. `PointSetPermittedState` index type unchanged (no `unknown`, no casts).
- `PointSetGraph.tsx` (persistence section): `importPreset` override wraps the call in `this.importing = {graphState}`; `importPresetData` reads extension fields from the Preset's stored `graphState` while importing (absent `graphState` means `getInitialState()`, `storedSource`), else (bare import) from `this.state` minus the `resetOnBareImport` fields. `figurePresetGraphState` uses `storedSource(graphState)`; `lessonDefaultState` reads `getInitialState()`.
- `voronoiPresetCollection.ts`: moved `storedSite/storedCount/storedMode/storedQuery` here (exported); `voronoiPersistenceExtension` (fields cellSite, construction, query with `resetOnBareImport`, mode fallback `sites` kept on bare import; `settle` = site clamp, count clamp, four-point only with 4 sites).
- `VoronoiGraph.tsx`: removed `carried`, the `importPreset`/`importPresetData`/`figurePresetGraphState` overrides and local helpers; `persistenceExtension()` returns the extension. `modeRefused` is reset by the existing `setState` model-change hook. `DegenerateSitesGraph.tsx` unchanged (inherits).
- `PointInPolygonGraph.tsx`: `QUERY_EXTENSION` (grid-point `query`, fallback (3, 1)); `figurePresetGraphState` override removed; `queryActive` stays transient (it was never reset on import).
- Contract rows `point-in-polygon`, `voronoi`, `voronoi-degenerate` removed from `PRESET_DATA_STATE_KEYS`.
- New `voronoiPersistence.host.test.tsx`: 18 tests (voronoi 6, degenerate 6, point-in-polygon 4 + 2 shared rows as listed by describe.each: 2 rows x 6 + 4 = 16; the file reports 18).

## Observed checks

- New file: 18/18 (`.command-logs/b5-new4.log`).
- Against HEAD sources: 6 failed, 12 passed (`.command-logs/b5-pre.log`). Mutations (all restored, `cmp` against backups checked): m1 four-point rule dropped 9 failed; m2 count clamp 4; m3 `resetOnBareImport` removed 2; m4 bare path used for Presets 8; m5 point-in-polygon fallback 3; m6 mode fallback `four-point` 2; m7 absent graphState not initial 2 (`.command-logs/b5-mut-m1..m7.log`, summary `b5-mut-summary.log`).
- `just lint` passed (`.command-logs/b5-lint.log`); `just typecheck` passed (`.command-logs/b5-tc.log`).
- Existing Voronoi/DegenerateSites/PointInPolygon host tests: passed together with the new file in the earlier run (87 tests) after the final design (`.command-logs/b5-new3.log`: 86/87, the one failure was fixed afterwards in the test; re-run of the new file alone passes).

## Next

1. Read the sweep result: `.command-logs/b5-sweep.log` (with `.command-logs/b5-sweep.done` present when finished; script `b5-sweep.sh` sets the six `BEZEG_*` variables to `voronoi,voronoi-degenerate,point-in-polygon` and runs `just unit src/graphs/compgeo src/graphs/base`). A first sweep with an earlier design failed one existing test (DegenerateSites "mode is optional on import"), which led to the current design; the latest sweep result is not yet seen.
2. Write `08-batch5-evidence.md` (batch 4 layout, about 70 lines).

## Departures to record

- A stored `graphState` without `mode` takes `sites` (as before); a Preset with no `graphState` at all, a figure without `graphState` and the lesson default start from the graph's initial state (degenerate: `four-point`), as before for import.
- Import writes site, count, query and mode in one `setState` (was two writes); the `requestRender()` after import is covered by `onStateChange` -> `syncScene` (not browser-verified).
- Not verified: browser smoke, production build, real localStorage presets.
