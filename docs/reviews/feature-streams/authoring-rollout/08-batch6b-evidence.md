# Task 08 batch 6b evidence: Simson line and inversion on the point-set extension; legacy branch removed

Graphs: `simson-line` (`SimsonLineGraph`) and `inversion` (`InversionGraph`), the last undeclared point-set graphs. Board object lists are unchanged (task 07 ownership stays, decision O-plane).

## Design

- Each graph overrides `persistenceExtension()` with a frozen module-level `PointSetExtension` (`SimsonLineGraph.tsx` `SIMSON_EXTENSION`, `InversionGraph.tsx` `INVERSION_EXTENSION`). No `settle`, no `resetOnBareImport`, no data part.
- `pointSetPersistence.ts`: the one missing field type is added, closed: `PointSetFieldRecord` (an index of `PointSetFieldValue`), admitted by `PointSetFieldValue` for the inversion source, power and angle blocks. No `unknown`, cast or `any`.
- `inversionPresetCollection.ts`: `isInversionPower` and `isInversionAngle` (the former private `isPower`/`isAngle`) are exported as type guards; `isInversionExampleId` is now a guard. The collection's checks are unchanged.
- Stored format unchanged: fields at top level of `graphState`. Nested values are rebuilt from their named keys on parse, so no alias of the Preset object and no unknown nested key reaches the scene.

## Field classification (verified from the two collections and the graphs)

| Graph | Field | Parser (the collection's check) | Fallback (= `getInitialState()`) |
| --- | --- | --- | --- |
| simson-line | `exampleId` | `isSimsonExampleId` | `"default"` |
| | `mode` | `isSimsonMode` | `"glider"` |
| | `t` | finite number, any (`finiteNumberField`) | 60 |
| | `epsilon` | `isSimsonOffset` (one of `SIMSON_OFFSETS`) | 0 |
| | `pPrime` | `isGridPoint`, copied | `{x: 2, y: -2}` |
| inversion | `exampleId` | `isInversionExampleId` | `"point"` |
| | `focus` | `isInversionFocus` | `"point"` |
| | `radius` | `isInversionRadius` (integer 1..8) | 2 |
| | `x` | `isInversionPoint` (integers, \|c\| <= 10) | `{x: 3, y: 1}` |
| | `source` | `isInversionSource` (circle, or line with p != q) | circle `(1,0)` radius 1 |
| | `power` | `isInversionPower` (circle, `thetaDeg` in [0, 360)) | circle `(5,0)` radius 3, `thetaDeg` 0 |
| | `angle` | `isInversionAngle` (two circles, `which` 0 or 1) | circles `(3,0)`/`(3,1)` radius 1, `which` 1 |

## Settle

None. Neither graph overrides an import or figure hook, so nothing clamps or couples fields today: `t` is stored raw (725 stays 725, `settings.t` reads 5); inversion `fields` validates every value at read time and normalises `thetaDeg`; `exampleId` is compared with the vertices at read time (`get exampleId`), never reconciled on import. The example id, mode, point and parameters are written only by `loadExample` and the setters. A stored id that does not name the vertices stays and reads `undefined`.

## Decisions

- Decision 3: `inversion` stays in `NO_SYNCHRONOUS_SCENE_CHANGE` (`graphTransientStateContract.tsx:63`): the generic scene actions still change none of its fields (its lesson actions use the `inversion` kind), so the set is not made unnecessary.
- Decision 4: bare data import keeps all fields (legacy path wrote the model only; no reset hook in either graph). No `resetOnBareImport`. Tested.
- Removed the `simson-line` and `inversion` rows (`['model']`) from `PRESET_DATA_STATE_KEYS`; the declared projection never carries `model`.

## Removed legacy code (part B)

- `PointSetGraph.declaresWholeScene()` and its three guarded branches in `PointSetGraph.tsx`: the legacy `exportPreset` override (stripped `model` from `graphState`), the legacy `figurePresetGraphState` (`{...super..., model: this.model}`) and `lessonDefaultState` (`{...initial, initialized: true, model}`) paths. `projectPersistedScene` now always returns the projection. Every point-set subclass is either declared (`persistenceExtension`/`persistenceStep`) or has scene state `{initialized, model, overlays}` alone (orientation, polygon-area, `CurvePairGraph`; `BezierHulls`/`BezierClipping` through `TraceCurvePairGraph`; `DegenerateSites` and `MonotoneTriangulation` through their declared parents), so the declared path is exactly today's behaviour for them. Test subclasses (six files named in the brief) needed no change: `just typecheck` and their suites pass unchanged.
- Search: no `declaresWholeScene` anywhere in `src` (`grep -rn declaresWholeScene src` empty).

## Tests

`src/graphs/compgeo/planeGeometry2Persistence.host.test.tsx`: 12 tests (2 rows x 5 shared, plus one stored-value test each for `t` and the nested copies). Shared: round trip after two distinct preceding scenes; partial or absent graphState gives the fallbacks; refused values and forbidden keys (`model`, unknown, nested unknown) cannot reach the scene; figure return and lesson default agree with import; bare import keeps fields. Expected values are hand-authored.

### Observed failures

- Against HEAD sources of the six changed files (`.command-logs/b6b-pre.log`): 4 failed, 8 passed: the refused-values and figure/lesson tests of both rows (they use `persistenceExtension`, absent at HEAD). Round trip, fallback and bare import pass at HEAD because stored behaviour is preserved.
- Mutations, each restored (`cmp` against backups, `git status` shows only the intended files): m1 Simson `t` fallback 0, 4 failed; m2 inversion `radius` fallback 3, 4 failed; m3 Simson `mode` `resetOnBareImport`, 1 failed; m4 inversion `x` parser returns the input (alias), 1 failed; m5 inversion `focus` accepts any string, 1 failed. Logs `.command-logs/b6b-mut-m1..m5.log`, summary `b6b-mut-summary.log`.

## Checks

- New file alone: 12/12 (`.command-logs/b6b-new1.log`). `just lint`: passed (`.command-logs/b6b-lint.log`).
- `just typecheck` (with the new test): passed in 124.0s (`.command-logs/b6b-tc2.log`).
- Sweep: `just unit src/graphs/compgeo src/graphs/base` with the six `BEZEG_*` variables set to all 22 point-set ids: passed in 753.1s, log `.command-logs/2026-11-12T23-01-50-183Z-2916-1b34a4e0.log` (summary `b6b-sweep.log`). Run in the background and awaited.

## Not verified

- No browser smoke, no production build, no real localStorage presets.
