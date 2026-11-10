# Step 7 slice 3 follow-up: host Reset follows the chosen example

Defect: slice 3 (25a5307c) made `importFigurePresetData` use `persistedDefaultData()` for a Preset without data. Host Reset with no
Preset selected reloads `{id: ""}` through the same path, so NURBS, Insertion and Extraction reset to their fixed first example.

Fix (`src/graphs/base/BaseGraph.tsx`):
- `reloadSelectedScene` (~:371): no stored Preset now loads `{id: "", data: cloneLessonValue(this.defaultPreset())}`, so Reset follows
  the chosen example. Stored data-less Presets still take `persistedDefaultData()`.
- Batch entry restore (~:1197): a data-less entry uses `persistedDefaultData()`, matching `figurePresetGraphState` in FivePoint/ThreeViews.

Tests (`src/graphs/base/presets/PartialPresetDefaults.test.tsx`, new describe "host Reset with no Preset selected follows the chosen
example"): `graph.reset()` after choosing NURBS `unit`, Insertion `cubic`, Extraction `cubic`; expectations written from literal data.
Pre-fix failures (3): `expected 'circle' to be 'unit'`; `expected 'quadratic' to be 'cubic'`; `expected 2 to be 3` (degree).
Post-fix: all pass; the P3 partial-Preset tests still pass.

Checks: `just unit src/graphs/base src/graphs/curves/bspline` 2375 passed, 3 failed, all in the untracked
`standaloneSceneLifecycle.test.tsx` (other worker's in-progress file). `just lint` passed. `just typecheck` and `just check-changed`
fail only on TS2614 "no exported member BaseGraph" in allGraphFactories.ts, graphLoaders.ts, projective/runtime.ts (named type import of a
default-only export; not touched by this fix) and a type error in standaloneSceneLifecycle.test.tsx:317.
