# Step 7 casts: handoff note

`CheckedPreset<D = unknown>`, `PresetCheck<D>` and `checkPreset<D>(collection: PresetCollection<D>, ...)` in
`src/graphs/base/presets/PresetImport.ts` now carry the collection's data type, so a collection-checked Preset has `data?: D`.

Removed (BaseGraph.tsx, current lines):
- `checked.preset.data as D` (consumerRefusal, ~742): now typed D.
- `{...} as S` and `checked.data as D` in `importPreset` (~1085): the spread of `getInitialState()` with `StoredGraphState` and `initialized: true` type-checks without the cast.
- `checkPersistedPreset` returns `CheckedPreset<D>`; the no-collection branch is split out (`checkPreset<undefined>`), and sets `data` only when the Preset had data (key omitted, not an explicit `undefined`).
- ConsumerPreparation.test.tsx: `undefined as never` replaced by a spy on an object typed `{presetCollection(): PresetCollection<unknown> | undefined}` (the graph's override narrows the return to non-optional).

Kept:
- `importFigurePresetData` `preset.data as D` (~721): its callers pass raw `Preset` (unknown data) from several graphs, so it cannot take `CheckedPreset<D>` without changing every caller.
- Lesson restore `cloneLessonValue(state.data) as D` (~795) and `...state.graphState as S` (~798): `isLessonState` is a shallow guard over an in-memory checkpoint typed `unknown`; claiming D or S there would only move the cast into the guard.
- Out of scope, untouched: `{initialized: ...} as S` (~200, ~695), `figurePresetGraphState` `as S`, `as never` at test line 189.

Checks: `npx tsc --noEmit --pretty false` clean; `just check-changed` log `.command-logs/step7-casts.log`.
