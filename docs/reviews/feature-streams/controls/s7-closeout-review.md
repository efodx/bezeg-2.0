# Step 7 integrated engineering review (read-only)

Scope: slices 1b, 2, 460359af, 3, 4 at master head 5a54c823. Tests were not run.

## Finding 1 (blocks acceptance): host Reset no longer follows the chosen example

- `src/graphs/base/BaseGraph.tsx:679-681` (`importFigurePresetData`) now uses `persistedDefaultData()` for data-less Presets. Slice 3 changed it from `cloneLessonValue(this.defaultPreset())` (git show 25a5307c).
- The host Reset (`BaseGraph.tsx:470` -> `reset()` -> `reloadSelectedScene` -> `applyFigurePreset(session, {id: ""})` at :371 -> `importFigurePresetData`) reloads the default scene through this exact path, with an empty Preset.
- `BSplineNurbsGraph.tsx:75-84`, `BSplineInsertionGraph.tsx:75-81` and `BSplineExtractionGraph.tsx:62-68` document that `defaultPreset()` follows the chosen example "so the host Reset returns to it", while `persistedDefaultData()` is the circle or fixed data. After slice 3, host Reset therefore loads the circle or fixed data whatever example is chosen.
- Expected: persisted data-less entries (import, select, mount) use `persistedDefaultData()`; host Reset and the id-less default reload use `defaultPreset()`.
- Evidence gap: `PartialPresetDefaults.test.tsx:158` ("Reset still follows the chosen example") calls `resetCurve()` (contextual `resetToOrigin`), not `graph.reset()`, so it passes with the regression. Add a test calling `graph.reset()` after choosing a non-circle example.
- The same path serves figure-batch entries for stored Presets without data. That use is correct for persisted entries but not for the id-less reset.

## Finding 2 (non-blocking, hygiene)

- `BaseGraph.tsx:1195` (batch entry restore) falls back to `defaultPreset()` while `figurePresetGraphState` (FivePoint/ThreeViews) falls back to `persistedDefaultData()` for the same missing-data case. The two are equal today, but only because those graphs do not override either method. A future override would split data from state silently. Use one helper.

## Cleared (no finding)

- Entry paths: mount (`BaseGraph.tsx:840`), `reloadSelectedScene` (:361), `importPreset` (:1026), figure/batch (:1095, :1171) and `prepareLessonFixtureScene` (:561) all check (collection check, then `consumerRefusal`) before any mutation. Refusal restores `previousId` and leaves view and state untouched. The subclass `importPreset` overrides (BezierClipping:213, Voronoi:780) call `checkPersistedPreset` before their own writes.
- Slice 3 defaults do not reach checkpoints: the restore at :752 and :755 uses checkpoint state and `importPresetData`, not `importPreset`. Lesson default/fixture scenes use `getInitialState()` plus `lessonDefaultState`.
- Slice 4: `exportPreset` (:1001) uses the projection; fresh figure and lesson scenes use `reconstruct`; checkpoints capture full state.
- Listeners and disposal: no new listeners. Abort handling in `exportPresetFigures` is unchanged.
- Cache invalidation: nothing new found.

## Not verified

- Tests, type check and build were not run.
- The consumer limits on the families listed as open were not re-audited.
