# Step 7, slice 1a: persisted entry inventory and P1 characterization

Worker note (2026-11-10). Production code unchanged. The brief named `src/presets/`; the Preset module lives in
`src/graphs/base/presets/` (`PresetImport.ts`, `Presets.ts`, `PresetCollection.ts`). Tests:
`src/graphs/base/presets/PersistedEntryParity.test.ts` (93 cases: 62 pass, 31 `it.fails` that slice 1b flips).
`just typecheck`, `just lint <file>`, `just unit <file>` all passed (logs `.command-logs/s7-1a-*.log`). Not run: build, smoke, mount with a real board.

## Entry paths on current code

| Path | Where | Checks that run | On failure | Mutated before the check |
|---|---|---|---|---|
| File preflight | `PresetImport.ts:60` `preflightPresetImport` | JSON; nonempty record; known collection key; envelope (`data` array); per Preset: `id` text, nonblank, unique; `checkPreset` (:45): `boardState.boundingBox` (4 finite, x0<x1, y0>y1), `graphState` via `collection.checkGraphState` else `checkSceneState`, `data` via `collection.check` (only when `!== undefined`, so explicit `null` data passes) | Throws `LocalizedError` wrapping the detail; no collection/Preset name in it | Nothing |
| File commit | `PresetImport.ts:77` | Re-runs the full preflight on the plan's contents | Same throw; write failure restores previous values (quota message) | Writes after the check, rolled back |
| `importFromString` | `Presets.ts:79` | Preflight; refuses when `replacements` is nonempty (confirm flow elsewhere) | Throws | Nothing |
| Stored collection read | `Presets.ts:40` `parseCollection`, used by `loadPresets`, `getPreset`, `exportAll` | JSON; envelope; every record has a string `id`. NO blank/duplicate names, NO data, bounds or state check | `loadPresets` gives `{data: [], problem: stored_presets_unreadable_left_unchanged}`; save/remove refuse to overwrite; `exportAll` lists it in `skipped` | Nothing |
| Initial mount | `BaseGraph.tsx:798-808` `mount` | `getPreset(selectedId)` (envelope only); no Preset clears the selection and loads `initialPresetData()` | Then `importPreset` (below) | Board created; `replaceScene` disposes first |
| Explicit import | `BaseGraph.tsx:964` `importPreset` (overrides: `BaseCurveGraph:268` forces selection state, `InterpolationGraph:116` fits the view, plus compgeo, function, surface graphs) | `boardState` unchecked, `graphState` unchecked, `data` only via `storedPresetData` (:667) | Bad data: `console.warn`, then the graph default is imported. Bad bounds/state: applied as is. Consumer guards (`assertBlossomCurve`, `assertDrawableCurve`) throw inside `importPresetData` | Bounds (`importBoardState`) and state (`setBaseState`) are written BEFORE `importPresetData`, so a consumer refusal leaves them changed |
| Figure entry | `BaseGraph.tsx:1084` `applyFigurePreset` -> `importFigurePresetData` (:661), `figurePresetGraphState` (:681), `finish` bounds (:1115) | Data via `storedPresetData` only; `graphState` merged unchecked; `boardState` unchecked | Same warn-and-default; a consumer throw happens inside `replaceScene` after `dispose: true` | Scene disposed before import; no batch preflight (`downloadPresetFigures` gets raw Presets) |
| Batch entry restore | `BaseGraph.tsx:1101` | None (trusted captured snapshot; null data means default) | n/a | n/a |
| Lesson fixture | `BaseGraph.tsx:542` | `collection.check` before `runLessonReplacement`; throws before any mutation | `Error` with the rendered rejection | Nothing (the model to copy) |
| SceneReplacement | `SceneReplacement.ts` `replaceScene` | No checks; runs dispose, import, state, bounds in order | Throws propagate after dispose | Everything |

## Divergences (sample and test)

Tests are in `describe("persisted entry paths on P1 samples")`; the `it.fails` entries are the 1b targets, flipped by the sample's `storageParity` / `entryParity` flag.

1. Storage read ignores data, bounds and state: every file-refused sample is readable (`storage read gives the file's decision`: invalid model data, invalid bounds, wrong or forbidden state, bad knots, for Bezier, interpolation, five-point, NURBS).
2. Storage read ignores blank and duplicate names (`collection envelopes`: blank, empty, duplicate rows). Saving then rewrites such a collection (observed test "a collection with a blank name is still read").
3. `importPreset` falls back to the default scene with a console warning on invalid data (`graph entry (importPreset)` for `bezier: invalid model data`, interpolation, five-point, NURBS bad knots), not a visible refusal.
4. `importPreset` applies unchecked bounds and graphState (`invalid bounds`, `generic state of the wrong type`, `custom state out of range`, `forbidden model in graphState`).
5. Consumer refusal comes after mutation: `blossom: the same degree-1 curve ...` (bounds and state written, then `bsl_degree_unsupported`) and `nurbs: collection-valid 17 points ...` (bounds written, then throw). File and storage accept both, correctly.
6. Figure entry: warn-and-default for bad data; unchecked `graphState` merge (`figure entry` tests, `an unknown graphState field ... is merged`).
7. Explicit `data: null` passes the file check but `storedPresetData` treats null as absent. Not sampled; 1b decides per "explicit null is not omission".
8. File refusal message has no collection/Preset/field context (spec asks for it). Not pinned by a test.

Parity already holds for the valid samples on every graph, and for the degree-1 curve (file, storage and NURBS accept).

## State-dependent defaults for slice 3

- `BSplineNurbsGraph.defaultPreset()` (`BSplineNurbsGraph.tsx:76`) reads `this.state.example`.
- `BSplineNurbsGraph.importPresetData` (:103) sets `t: Math.min(end, Math.max(start, this.state.t))` (live `t`).
- `figurePresetGraphState` (Nurbs :113, Blossom) merges live `this.state` curve and `t` over the stored state.
- `BaseGraph.figurePresetGraphState` merges `initialFigureGraphState ?? this.state`; `importPreset` with omitted `data`, `boardState` or `graphState` keeps the live data, view or state (`BaseCurveGraph` also forces the selection state).
- `storedPresetData` falls back to `defaultPreset()`, so it inherits the NURBS example dependency.
- `BaseFunctionGraph.importPreset` (:284) reduces `graphState` to `{initialized}`.

## Proposed shape of the one check (slice 1b)

```ts
// beside PresetImport.ts; pure: no storage, graph or board.
type CheckedPreset = {readonly id: string; readonly data?: unknown; readonly boardState?: BoardState; readonly graphState?: BaseGraphState};
function checkPreset(collection: PresetCollection<unknown>, raw: unknown, at?: {collection: string; index: number}):
    {readonly preset: CheckedPreset} | {readonly rejection: Message};      // Message names collection / Preset / field
function checkPresetCollection(collection: PresetCollection<unknown>, raw: unknown):
    {readonly presets: CheckedPreset[]} | {readonly rejection: Message};   // envelope + names + each Preset
```

Callers: `preflightPresetImport`/`commitPresetImport` call `checkPresetCollection` per file key, replacing the inline `checkPreset`.
`parseCollection` calls it so `loadPresets`, `getPreset`, `exportAll`, save and remove share the verdict (an invalid collection stays
`problem` with the raw value untouched). `BaseGraph.importPreset`, `applyFigurePreset` and a figure-batch preflight call `checkPreset`, then
graph preparation, then mutate; this replaces the `storedPresetData` warn-and-default. `mount` turns a rejection into the default scene
plus a notice. The check returns a normalized copy so later steps never read the raw object.
