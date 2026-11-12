# Task 08 batch 5 evidence: Voronoi, degenerate sites and point-in-polygon on the point-set extension

Graphs: `voronoi` (`VoronoiGraph`), `voronoi-degenerate` (`DegenerateSitesGraph`, inherits) and `point-in-polygon` (`PointInPolygonGraph`).

## Design

- `PointSetFieldValue = number | string | null | PointSetFieldPair` (a grid point `{x, y}` of numbers, or a text point of strings); the `PointSetPermittedState` index type is unchanged (no `unknown`, no casts) (`pointSetPersistence.ts`).
- `PointSetExtraField.resetOnBareImport` and the exported `withoutBareImportFields(extension, state)`: a bare data import (no Preset: example load, direct call) resets such a field to its fallback; a Preset's own value is never reset.
- `PointSetGraph.importPreset` wraps the import in an `importing` record `{graphState}`. It is an import-scoped context in the base (set only during `importPreset`, restored to the outer record in `finally`), replacing Voronoi's own `carried` handoff; it is not a mirror of scene state. While importing, `importPresetData` reads extension fields from the Preset's stored `graphState`; an absent `graphState` means `getInitialState()` (`storedSource`). A bare import reads `this.state` minus the `resetOnBareImport` fields.
- `figurePresetGraphState` uses `storedSource(graphState)`; `lessonDefaultState` reads `getInitialState()`.
- `voronoiPresetCollection.ts`: `storedSite/storedCount/storedMode/storedQuery` moved here and exported; `voronoiPersistenceExtension`: fields `cellSite`, `construction`, `query` (all `resetOnBareImport`), mode fallback `sites` kept on bare import; `settle` clamps site and count and allows `four-point` only with 4 sites.
- `PointInPolygonGraph`: `QUERY_EXTENSION` (grid-point `query`, fallback (3, 1)).

## Field classification

| Graph | Persisted (declared) | Permitted, not kept | Transient | Derived |
| --- | --- | --- | --- | --- |
| voronoi | model (sites), overlays, cellSite, construction, query, mode | none | `modeRefused` (reset by the `setState` model-change hook) | diagram memos |
| voronoi-degenerate | as voronoi (mode fallback `sites`, initial `four-point`) | none | `modeRefused` | diagram memos |
| point-in-polygon | model (polygon), overlays, query | none | `queryActive` (never reset on import) | memos |

## Removed code

- `VoronoiGraph`: `carried`, the `importPreset`, `importPresetData`, `figurePresetGraphState` overrides and the local `stored*` helpers. `DegenerateSitesGraph` unchanged.
- `PointInPolygonGraph`: the `figurePresetGraphState` override.

## Contract rows

`graphTransientStateContract.tsx`: removed the `point-in-polygon`, `voronoi` and `voronoi-degenerate` rows of `PRESET_DATA_STATE_KEYS`.

## Tests

`src/graphs/compgeo/voronoiPersistence.host.test.tsx`: 18 tests (voronoi and degenerate rows x 7 shared tests, plus 4 point-in-polygon tests).

### Observed failures

- Against HEAD sources: 6 failed, 12 passed (`.command-logs/b5-pre.log`).
- Mutations, all restored (`cmp` against backups checked): m1 four-point rule dropped, 9 failed; m2 count clamp dropped, 4; m3 `resetOnBareImport` removed, 2; m4 bare path used for Presets, 8; m5 point-in-polygon fallback changed, 3; m6 mode fallback `four-point`, 2; m7 absent graphState not initial, 2. Logs `.command-logs/b5-mut-m1..m7.log`, summary `b5-mut-summary.log`.

## Checks

- New file alone: 18/18 (`.command-logs/b5-new4.log`).
- `just lint`: passed (`.command-logs/b5-lint.log`). `just typecheck`: passed (`.command-logs/b5-tc.log`).
- Sweep: `just unit src/graphs/compgeo src/graphs/base` with the six `BEZEG_*` variables set to `voronoi,voronoi-degenerate,point-in-polygon`: passed in 581.3s, `.command-logs/2026-11-12T21-48-41-252Z-3660-69a27550.log`.
- 17-id sweep over all declared point-set ids (`.command-logs/b5-sweep17.log`): passed in 603.3s, `.command-logs/2026-11-12T21-58-49-971Z-38356-322c48fd.log` (after the handler hardening); `just typecheck` after it: passed, `.command-logs/2026-11-12T22-08-57-622Z-12224-348ef678.log`.

## Departures

- A figure scene without `graphState` now starts from `getInitialState()` (degenerate sites: `four-point`), consistent with HEAD's lesson default; HEAD gave `sites` via `storedMode(undefined)`. A stored `graphState` without `mode` still takes `sites`.
- Import writes site, count, query and mode in one `setState` (was two writes); the `requestRender()` after import is covered by `onStateChange` -> `syncScene` (not browser-verified).

## Not verified

- No browser smoke, no production build, no real localStorage presets.

## Handler review (Sonnet reviewer, no blocking findings)

- The fallback of every batch 2-4 field equals its `getInitialState()` value, so Presets omitting fields load as before; bare imports of graphs without `resetOnBareImport` fields read `this.state` as before.
- Hardening by the handler: `PointSetGraph.importPreset` restores the outer `importing` record in `finally` instead of clearing it.
