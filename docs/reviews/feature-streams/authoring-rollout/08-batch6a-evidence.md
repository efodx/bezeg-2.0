# Task 08 batch 6a evidence: triangle centres, Euler line and inscribed angle on the point-set extension

Graphs: `triangle-centres` (`NotablePointsGraph`), `euler-line` (`EulerLineGraph`) and `inscribed-angle` (`InscribedAngleGraph`). Board object lists are unchanged (task 07 ownership stays, decision O-plane).

## Design

- Each graph overrides `persistenceExtension()` with a frozen module-level `PointSetExtension` (`NotablePointsGraph.tsx` `NOTABLE_EXTENSION`, `EulerLineGraph.tsx` `EULER_EXTENSION`, `InscribedAngleGraph.tsx` `INSCRIBED_EXTENSION`). No `settle`, no `resetOnBareImport`, no data part. `pointSetPersistence.ts` is unchanged: `PointSetFieldValue` already covers a string id and a number.
- Stored format unchanged: `graphState` keeps `initialized`, `overlays`, `exampleId` (and `t`) at top level; the collections are untouched.

## Field classification (verified from the collections and the graphs)

| Graph | Field | Parser (the collection's check) | Fallback (= `getInitialState()`) | Clamp |
| --- | --- | --- | --- | --- |
| triangle-centres | `exampleId` | `isNotableExampleId` | `"default"` | none |
| euler-line | `exampleId` | `isEulerExampleId` | `"default"` | none |
| inscribed-angle | `exampleId` | `isInscribedExampleId` | `"default"` | none |
| inscribed-angle | `t` | `finiteNumberField` (finite number, any) | 90 (`inscribedExample("default").t`) | none; stored raw, `resolveGliderT` at read time (`get t`) |

- `exampleId` vs the model: the state stores the id as given; `activeExampleId` / `activeEulerExampleId` / `activeInscribedExampleId` compare it with the vertices at read time (`get exampleId`). Import, figure return and lesson default therefore never reconcile it; a stored id that does not name the vertices is kept and reads `undefined`. `settle` has nothing to do. The state is never set to `undefined` (only `loadExample` and imports write it).
- `t` is stored raw (725 stays 725, `target.t` reads 5); the collection comment says out-of-range values are normalised by the graph, not rejected.

## Decisions

- Decision 3: `triangle-centres` stays in `NO_SYNCHRONOUS_SCENE_CHANGE` (`graphTransientStateContract.tsx:63`): no generic scene action changes the persisted fields (only `loadExample` does), so the rollback test still cannot show a change first. The set is not made unnecessary.
- Decision 4: bare data import keeps `exampleId` and `t` (no override of `importPresetData` or reset hook exists in the three graphs; HEAD's legacy path wrote the model only). No `resetOnBareImport`. Test asserts it.
- Removed the three rows (`triangle-centres`, `inscribed-angle`, `euler-line`: `['model']`) from `PRESET_DATA_STATE_KEYS`; the declared projection never carries `model`.
- Legacy `figurePresetGraphState`/`lessonDefaultState` branches for these ids are now the declared path (`declaresWholeScene` true through the extension). A figure Preset without `graphState` now reads `getInitialState()` values (same values as HEAD's `{...initial, ...graphState}`).

## Tests

`src/graphs/compgeo/planeGeometryPersistence.host.test.tsx`: 16 tests (3 rows x 5 shared tests, plus 1 inscribed `t` test). Shared: round trip after two distinct preceding scenes; partial or absent graphState gives the fallbacks; refused ids/params and forbidden keys (`model`, unknown) cannot reach the scene; figure return and lesson default agree with import; bare data import keeps the fields.

### Observed failures

- Against the HEAD graph sources: 6 failed, 10 passed (`.command-logs/b6a-pre.log`): the refused-values and figure/lesson tests of each row (they use `persistenceExtension`, absent at HEAD). The round-trip, fallback and bare-import tests pass at HEAD because the stored behaviour is preserved; their failures are shown by the mutations.
- Mutations, each restored (`cmp` against backups, `git status` clean of stray edits): m1 `t` fallback 0, 4 failed; m2 notable fallback `"right"`, 3 failed; m3 Euler parser accepts any string, 1 failed; m4 Euler `exampleId` `resetOnBareImport`, 1 failed. Logs `.command-logs/b6a-mut-m1..m4.log`.

## Checks

- New file alone: 16/16 (`.command-logs/b6a-new2.log`).
- `just typecheck`: passed (`.command-logs/b6a-tc.log`). `just lint`: passed (`.command-logs/b6a-lint.log`).
- Sweep: `just unit src/graphs/compgeo src/graphs/base` with `BEZEG_TRANSIENT_STATE`, `BEZEG_LESSON_RESTORATION`, `BEZEG_SCENE_CONTENT`, `BEZEG_SCENE_REPLACEMENT`, `BEZEG_PRESET_ROUNDTRIP`, `BEZEG_GRAPH_TEARDOWN` set to `triangle-centres,euler-line,inscribed-angle`: passed in 1061.5s, `.command-logs/2026-11-12T22-28-08-592Z-27392-b5b5be16.log` (summary `.command-logs/b6a-sweep.log`). It ran in the background because of the tool timeout, and was awaited.

## Not verified

- No browser smoke, no production build, no real localStorage presets.
