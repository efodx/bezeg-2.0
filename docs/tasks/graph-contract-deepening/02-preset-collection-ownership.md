# Give each Demonstration its Preset collection

**Source spec:** [Graph contract deepening, section 2](../../specs/graph-contract-deepening.md#2-preset-collection-ownership)
**Status:** done on 2026-10-21. Decision recorded in [ADR 0016](../../adr/0016-preset-collections-owned-by-graph-families.md).
**Priority:** strong; after task 01 or coordinated with it, since both change the `BaseGraph` Preset seam.

## Goal

Move per-collection Preset knowledge out of the central lists in `PresetImport.ts` and into a static definition owned by each Demonstration or graph family. File import and graph import then validate with the same rules, and the file importer keeps only the file envelope, conflict reporting and storage writes.

## Scope and sequence

1. Read the source spec's six acceptance criteria, ADR 0006, the [localization guide](../../localization.md) and the Preset sections of [capabilities](../../capabilities.md). Inspect `PresetImport.ts`, `PresetImport.test.ts`, `Presets.ts`, `ClassMapper.ts`, `BaseCurveGraph.importPresetData`, `BaseFunctionGraph.importPresetData`/`parseModel`, and each graph's `presets()` and `defaultPreset()`.
2. Add the catalog-wide test first: for every Demonstration in `graphFactories`, export its default Preset, preflight it and import it. Add a cross-check that every graph's collection key has file-import rules and vice versa. Note the result for the undeclared `g1-spline` key.
3. Decide `g1-spline` from git history and any exported files it may have produced: keep it as a documented legacy key or remove it and record the user impact.
4. Design the Preset collection definition. It must be usable by preflight without creating a graph or board. Consider whether rules belong per Demonstration or per graph family (for example one rule for all plain Bézier collections), and keep shared rules shared. Give Preset data a type per family if stored formats stay unchanged.
5. Move function-model parsing with its diagnostics, curve type and count rules, and graph-state checks into the definitions. Make graph import use the same definition. Shrink `PresetImport.ts` to the envelope, conflicts and atomic writes.
6. Move rejection tests beside the definitions they exercise where that improves locality; keep every existing rejection case covered.

## Verification and completion

- Start with `just --list`; run the Preset, graph-preset, function-model and analysis suites, then `just typecheck` and `just build`. Localized diagnostics follow AGENTS.md: `sl.ts` and `en.ts` in lockstep, no casts to silence key errors.
- Check that collection keys and DTO names are unchanged, previously exported files still import, unsupported files fail with an actionable localized error, and a failed storage write rolls back.
- Preset save, import and export are user workflows, so smoke-test the Preset rows of the [browser checklist](../../smoke-tests.md) with `$smoke-tester`, plus a file round trip on one curve, one rational, one spline, one PH and one function Demonstration.
- Review the diff with parallel subagents for mathematical validation and engineering constraints.
- Record the definition shape, the `g1-spline` decision and any compatibility impact in this file and in [current architecture](../../current-architecture.md). Commit and push under AGENTS.md.

## Results

### Catalog-wide test first

`src/graphs/base/presets/PresetCatalog.test.tsx` mounts every Demonstration in `graphFactories` through the real-graph harness. It exports the default Preset, checks the serialized data with the graph's definition, preflights and commits a file, reloads, selects the Preset, and compares Preset data, the drawn board and the re-exported Preset. Before the change, the test ran against the old importer: 36 of 45 passed. Six failures were floating-point noise in the view's bounding box; the test now rounds to 1e-9. Two were real: the **G1 and symmetric G1 spline default Presets were rejected** ("invalid value b"). Their curve state stores `b: number[]`, and the old generic state check allowed only primitive values. This defect dates back at least to the first snapshot (5030c5e): an exported G1 spline file could never be imported. The key cross-check showed that 44 graph keys plus `g1-spline` matched the central list. `circle` has no collection.

### `g1-spline` decision

`git log -S g1-spline` traces the key to `G1AffineSplineGraph`. No route rendered that class in the first snapshot (5030c5e, 2026-10-09). It was removed as an unreferenced class in 63af46b (2026-10-12). Earlier history is not in the repository, so a file from an older deployment may still hold the key. **It is kept as a documented legacy collection** (`legacyCurvePresetCollections`, the quadratic G1 rules). Such a file imports into storage unchanged, and nothing reads it. Removing the key would make a whole file containing it fail to import. The cross-check allows exactly this one definition without a graph.

### Definition shape

- `src/graphs/base/presets/PresetCollection.ts`: `PresetCollection<D> = {key, check(data): {data: D} | {rejection: Message}}`, frozen and static. The module also holds the shared scene-state rule `checkSceneState`, used for a Preset's `graphState` and a curve DTO's `state`.
- `src/graphs/curves/curvePresetCollections.ts`: one definition per curve Demonstration, keyed by Demonstration id. All definitions are built by `curveCollection(key, {type, hodographs?, allowEmpty?})` from shared per-curve-type DTO rules. Bézier and rational collections differ only in their key, and PH collections in their degree. The module holds the `CurveDto` and `CurveCollectionPresetData` types and a new G1 rule: `b` is one positive finite number per junction (`points - 3`). The curve type names moved to `curves/object/curveTypeNames.ts`, and `ClassMapper` is now a `Record<CurveTypeName, …>`, so a name without an adapter is a type error.
- `src/graphs/functions/functionPresetCollections.ts`: one definition per function Demonstration, pairing the analysis model parser with the diagnosis moved out of `PresetImport` (11 diagnoses). The parser decides validity; the diagnosis only explains a rejection.
- Graphs: `presetCollection()` replaces each graph's `presets()` override, and `presets()` now reads the definition's key. Function graphs lost `parseModel`. The iterative graphs normalize the imported step in `importPresetData` through `normalizeIterationModel`, as their `parseModel` did before.
- `PresetImport.ts` (277 → about 70 lines, 4 imports): the registry is `[...curve, ...legacy, ...function]`. It checks the envelope, Preset names, bounds and graph state, calls `collection.check` for each Preset's data, reports conflicts, and keeps `commitPresetImport` revalidation and rollback.

**Locality is per family, not per Demonstration file.** The analysis modules are pure mathematics with no localization imports (see each module's header), so the localized diagnoses cannot sit beside the `*Model` parsers. Adding a function Demonstration touches three places: its `src/analysis/<x>Model.ts` parser, one entry (plus an optional diagnosis) in `functionPresetCollections.ts`, and its graph's `presetCollection()`. Adding a curve Demonstration touches one entry in `curvePresetCollections.ts` and its graph's `presetCollection()`. The file importer is not touched in either case.

**Per-family modules, per-Demonstration definitions.** Each Demonstration has its own definition object, but the rules are shared inside the family module, so adding a Demonstration adds one line (or one parser and diagnosis) there. Three alternatives were rejected. Static members on graph classes would make the importer import every graph module, and graphs reach the importer through `BaseGraph`, so the import cycle would reach module-level constants. A `graphFactories` registry constructs graphs. A generic per-field rule framework fails the deletion test. The scene-state rule keyed on field names stays shared, because its fields mean the same thing in every family; a per-family split would only duplicate or loosen it.

### Preset data typing

`BaseGraph<S, D = unknown>`: `defaultPreset(): D`, `exportPresetData(): D | undefined`, `importPresetData(data: D)`, `presetCollection(): PresetCollection<D> | undefined`, `Preset<D = unknown>`. Curve graphs (and Bernstein, whose default is `[]`) use `CurveCollectionPresetData`; function graphs use their model `M`. `BaseFunctionGraph.defaultPreset()` returns the model instead of a JSON string. Stored data stays `unknown` until `storedPresetData` checks it; a graph without a collection (circle) gets its default data there. A figure batch's entry scene is typed `Preset<D>` (`FigureBatchScene<D>`) and is imported without a check. Stored formats are unchanged.

Casts and `any` in this change, listed in full:
- `BaseGraph.restoreLessonState`: `cloneLessonValue(state.data) as D`. The checkpoint value is typed `unknown` in `learning/model`, but it holds this graph's own in-memory export.
- `curvePresetCollections.ts` `check`: `data as CurveCollectionPresetData`, after every entry passed its curve type's rules.
- `ClassMapper.ts`: `Record<CurveTypeName, any>`, `Map<any, CurveTypeName>` and the `any` adapter signatures were already there in another form (`as any`, `Map<any, string>`). The new `Object.entries` cast was removed.
- Tests: `GraphTransientState.test.tsx` perturbModel reads the exported model and checked data `as Record<string, unknown>`; `PresetCatalog.test.tsx` reads `jxgCurves` through `as unknown as`, as the harness does; `(error as LocalizedError)` in the function rejection tests was moved verbatim from `PresetImport.test.ts`.
- None remain in the diagnoses: `Diagnosis` takes `Readonly<Record<string, unknown>>` and narrows its fields.

### Acceptance criteria

1. Keys and DTO names are unchanged: `PresetCatalog.test.tsx` pins the 45-key list, and the curve type names are unchanged. `g1-spline` is kept as legacy (see above).
2. The rules sit in each family module beside its definitions, and the importer keeps no per-collection list. The cross-check test fails if a graph's collection is not accepted, if two Demonstrations share one, or if a definition has no graph (except `g1-spline`).
3. `storedPresetData` and preflight call the same `check`. `curvePresetCollections.test.ts` and `functionPresetCollections.test.ts` assert that the rejection from `check` equals the detail of the importer's `LocalizedError`. An unsupported file still fails with the actionable message, asserted in Slovenian and English in `PresetImport.test.ts`.
4. The catalog test passes for all 44 collections (45 Demonstrations). All 80 earlier rejection cases are kept: the function cases moved verbatim to `functionPresetCollections.test.ts` and the PH cases to `curvePresetCollections.test.ts`, with every original line still present; envelope, storage and rollback cases stay in `PresetImport.test.ts`.
5. Done without changing formats (see typing).
6. Definitions are static and frozen, and `check` runs with no graph (asserted). `commitPresetImport` still revalidates and rolls back; "a failed storage write restores prior collections" passes. Earlier files import, including the legacy key and the G1 files that used to fail.

### Compatibility and behavior changes

- **Required curve state relaxed to what the adapters need** (a handler smoke regression). The old importer required every display switch (`showingJxgPoints`, `showingControlPolygon`, `showingConvexHull`, `showingDecasteljauScheme`, the PH offset switches) as well as `decasteljauT` for rational curves. Stored Presets seeded by `tests/guided-lessons.smoke.spec.cjs:2204` omit `decasteljauT` and `showingDecasteljauScheme`, so the graph rejected them with `incomplete_curve_state`, although at HEAD they loaded correctly (a missing switch is read as off). Now only the parameters an adapter's `importState` applies unconditionally are required: `subdivisionT`, `decasteljauT` and `extrapolationT` for Bézier and PH curves, and `subdivisionT` and `extrapolationT` for rational curves. File import shares the definition, so it also accepts these shorter states; this is looser than HEAD's importer and rejects no file HEAD accepted.
- Rational weights get **no** `> 0` check. The weight stepper's − button (`RationalBezierCurveControls.tsx`, `changeWeight(-0.25)`) does not clamp, and capabilities records that rational editing does not clamp weights (extrapolation can also produce them). Genuine exports can therefore hold weights ≤ 0, and the rule stays "finite, one per point", as at HEAD.
- The Cn and C2 default scenes held the three-number points `[-1.5, -2, 5]` and `[1, -2, 5]`. The adapters read only `point[0]` and `point[1]`, so dropping the stray third number leaves the drawn defaults unchanged, and the authored default scenes now pass their own collections.
- Fixed: exported G1 and symmetric G1 spline files now import. New localized diagnosis `invalid_g1_spline_parameters` (sl/en) for a malformed `b`.
- A stored curve Preset whose data its collection rejects now loads the default scene with a console warning; before, the adapter lookup threw.
- The graph rejects function Presets with string data, matching the file importer. The app never stored strings; tests that imported JSON strings now pass objects. A Preset without data (`undefined`/`null`) loads the default model without a warning, so 19 function test files expect two fewer warnings.
- No route, storage key or file-shape change.

### Checks run

- `just --list`; `just typecheck` passed; `just build` passed (existing Sass deprecation and chunk-size warnings only).
- `just unit src/graphs/base/presets src/graphs/base/GraphTransientState.test.tsx src/graphs/curves/curvePresetCollections.test.ts src/graphs/functions/functionPresetCollections.test.ts`: all passed. `just unit src/graphs/functions src/graphs/complex`: 517 passed.
- Full `just unit`: 153 files, 2979 tests passed.
- After the handler repairs: focused `just unit src/graphs/base/presets src/graphs/base/GraphTransientState.test.tsx src/graphs/curves src/graphs/functions src/graphs/complex src/analysis` passed 85 files and 2344 tests; full `just unit` passed 153 files and 3026 tests; `just typecheck` and `just build` passed.
- Scene-data audit, added after the regression: a stored Preset like the smoke seed loads with its Farin points and weights (real graph). Every Demonstration's default scene, which is the only kind of authored lesson scene (`prepared-scene` has only the `demonstration-default` source), passes its own collection. Every changed scene that `GraphTransientState.test.tsx` stores passes its graph's collection. The catalog round trip logs no "Ignoring invalid Preset data" warning. `tests/` seeds one stored Preset: the smoke row above.
- Parallel review (validation and compatibility, engineering constraints): no blocking findings. The stored-Preset regression, an unvalidated cast, the `Diagnosis` typing, the stacked doc block and the per-family locality wording were fixed before commit; a `> 0` weight check was rejected because the weight stepper can export weights at or below zero.
- `just smoke-built` on the final working tree: 239 passed. This includes the full suite (every Guided lesson row, Preset save/change/reopen, language switch) and a temporary handler spec, not committed, that on `bezier`, `rational`, `spline-c1`, `spline-g1`, `ph-cubic` and `taylor` saved a Preset, exported it to a file, rejected an invalid file in a fresh browser context with the localized "Export presets from Bezeg" message, imported the exported file and reloaded identical point and curve geometry.
- Earlier smoke run before the repairs: `Farin points on the elevation route (seeded stored preset)` failed because the stored Preset was rejected and the default scene loaded; fixed by relaxing required curve state as recorded above.

### Noted

Each analysis module's header says it is pure mathematics with no localization imports, which is why the diagnoses stay in the family module.
