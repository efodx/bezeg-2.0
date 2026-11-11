# F2b trig registration (families-prep)

## Evidence
- First pass stopped: neither trig graph had a PresetCollection (`defaultPreset()` was null). Handler chose to add it (decisions 9-12).
- New files in src/graphs/trig/: registration.ts, collections.ts, runtime.ts, trigPresetCollection.ts, registrationComposition.test.ts, trigPresetCollection.test.tsx.
- Preset model: `data` = serializeUnitCircleState / serializeTriangleState (stored fields); `graphState` = `initialized` plus, for the unit circle only, the `showAddition` display switch. The trig graphs keep the stored fields directly in graph state, so `exportPreset` strips them from `graphState` (as CrossRatioGraph strips `model`), `importPresetData` writes them with `setState`, and `figurePresetGraphState` merges checked data. `checkGraphState` rejects any other field.
- TrigError maps to existing keys: not-an-object -> invalid_state, not-boolean -> invalid_option, other reasons -> invalid_value (all name the field); no new key.
- The state-model parser drops unknown data fields by design (trigModel.ts comment), so an unknown data field is accepted and dropped, not rejected; an unknown `graphState` field is rejected. Tested both ways.
- lesson:false rows need nothing in guidedLessonOwnership.ts (primaryOwner returns undefined for them), nor in the capture/inventory scripts (chapter identities of lesson families); unit tests of guidedLessonOwnership pass unchanged.
- Observed failure: removing `...trigGraphLoaders` from graphLoaders.ts failed the composition test; replacing the unit-circle `importPresetData` body failed both unit-circle round-trip tests; files restored byte-identical (cmp).
- No test required posters/recipes for the new catalog rows (lessonCatalog and the 9 targeted test files pass); media is F5.

## Handoff (partial, budget signal)
Done: all brief items incl. decisions 9-12; tsc, lint, targeted unit run (9 files) passed before the sweep fix-ups; composition and preset tests observed failing once and restored.
Fallout fixed (test-side lists, each with a comment): POSTER_PENDING (src/demonstrationPosterPending.ts), CHAPTER_LINK_PENDING (familyChapters.test.ts), triangleGeometryChapter.test.ts, PresetCatalog.test.tsx TRIG_KEYS, lessonLookup.characterization.test.ts, demonstrations.test.ts (family flat list compared by sorted ids: a registered row of an earlier family sits last), graphTransientStateContract.tsx PRESET_DATA_STATE_KEYS, realGraphScenes.ts perturbModel case 'triangle-solver'.
NOT done / open: two catalog-sweep (GraphTransientState part3/part4) failures remain, both defects of the F2a graphs, not registration:
 1. unit-circle "the lesson default scene drops every earlier change": after the default-scene replacement the cos trace curve keeps visPropCalc.visible true in the same tick (board.update() in syncBoard does not refresh function-valued `visible`; JSXGraph needs updateVisibility/fullUpdate).
 2. triangle-solver "a lesson checkpoint restores the captured scene...": restoring a solve-mode checkpoint refits the view (frameBoard keyed on framedKey) instead of keeping the checkpoint view.
Both need a graph fix (or a sweep exemption set, as NO_SYNCHRONOUS_SCENE_CHANGE) decided by the handler. Not run after the fix-ups: the full `just check-changed` rerun and `just build` (locale changed).

## Recipe for the next family (F2b)
1. `src/graphs/<fam>/registration.ts` (rows, id type, collection keys; metadata only), `collections.ts` (reference canonical collections), `runtime.ts` (one lazy loader per id; `GraphLoader` type is imported from projective/runtime).
2. A `<fam>PresetCollection.ts` (frozen collection per key = Demonstration id; `check` delegates to the state-model parser) and wire each graph: `presetCollection()`, `defaultPreset()`, `exportPreset` (strip stored fields from graphState), `exportPresetData`, `importPresetData`, `figurePresetGraphState`; second generic of `BaseGraph<S, D>`.
3. Root spreads: src/demonstrations.ts (import + `definitions` spread), src/graphs/graphLoaders.ts (import + spread), src/graphs/base/presets/PresetImport.ts (import + spread), scripts/probe-demonstration-clip-routes.cjs (`rowSource` list). Only for rows with a lesson: guidedLessonOwnership.ts and the chapter identities in capture-guided-example-previews.cjs / generate-guided-example-inventory.cjs. graphFactories.ts needs no change.
4. Locale keys `<id>_title`, `<id>_prompt` in sl.ts and en.ts, same positions.
5. Tests: `<fam>/registrationComposition.test.ts`; add the family to `realFamilies` in src/graphs/registrationIntegrity.test.ts; `<fam>PresetCollection.test.tsx`; while rows are `lesson: false`, list them in the opt-out assertion of src/learning/runtime/lessonCatalog.test.ts (and remove them when the lesson lands).

## Fix pass (handoff-v13)
1. Unit circle: `syncBoard` called `board.update()`, which does not re-evaluate function-valued `visible` (showCosine, showAddition); now `board.fullUpdate()` (UnitCircleGraph.tsx syncBoard). Test: "a scene restore hides the cosine trace in the same tick" in UnitCircleGraph.test.tsx; observed failing with `update()`.
2. Triangle solver: a scene replacement refitted the view because `framedKey` still held the old key; `syncReplacedScene` now sets `framedKey` to the current key first (TriangleSolverGraph.tsx syncReplacedScene), so a restore keeps the stored view and only later solve-data or mode changes refit. Test: "restoring a checkpoint keeps the stored view" in TriangleSolverGraph.test.tsx; observed failing without the fix.
Both sweep tests pass (parts 3 and 4, filtered). Fixed files cmp-identical to backups after the revert experiments.

## Review repairs
1. Done. demonstrations.test.ts: per-family order check (family.demonstrations ids equal the catalog-filtered ids); the flat registry order stays pinned by "registry order of recorded paths" (line 138), which failed when two expected rows were swapped, then restored.
2. Done. UnitCircleGraph.tsx syncBoard: fullUpdate() only when `visibilityKey()` (showSymmetries, showCosine, showAddition, angle > 0 for the arc) changed, else update(). New test "a drag or a typed angle change redraws without fullUpdate"; failed (fullUpdate called once) with the old always-fullUpdate branch, restored.
3. Done. TriangleSolverGraph.tsx: buildScene no longer calls frameBoard (it overwrote a Preset's stored view on first mount; test failed before: box refit instead of stored). Tests: Reset returns to sides and the fixed view; first mount and live selection of a solve Preset keep the stored view; a Preset without boardState (importPreset then calls showInitialView) is framed to the solve data. (c) passed before and after the change, so no extra flag was added.
