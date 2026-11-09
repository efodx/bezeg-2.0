# Wave 2 PA1 evidence: patch point chooser, point editor, tensor edit panel

Logs: `.command-logs/w2-pa1-*.log`.

## Files
- New: `PatchPointChooser.tsx` (+test), `PatchPointEditor.tsx` (+test, replaces `PointEditor.test.tsx`).
- `TensorPatchPanels.tsx`: `TensorPatchEditPanel` uses `ChoiceSelect` (starting patch), `CountSetter` (degrees 1-4), `PatchPointChooser`, `PatchPointEditor`; `PointEditor` is re-exported from here (alias of `PatchPointEditor`, prop `onApply` kept) so Coons, Triangular and Join compile unchanged. New action `startingPatchIndex()`.
- `TensorPatchGraph.tsx`: `startingPatchIndex()` compares degrees and net with each starting patch (exact), so Subdivision, Join, Derivatives, DeCasteljau inherit it.
- `sl.ts`/`en.ts`: `patch_starting_custom` ("Lastna krpa" / "Custom patch").
- `eslint.config.mjs`: `TensorPatchPanels.tsx` exemption removed.
- Tests updated: `TensorPatchPanels.test.tsx`, `TensorPatchEditing.test.tsx`, `TensorDeCasteljauGraph.test.tsx`, `TensorDerivativesGraph.test.tsx` (starting patch select, steppers, per-axis Enter commit, field-hint refusal).

## Checks observed
- `just typecheck`: passed. `just lint` on my files: passed.
- `just unit` of PatchPointEditor, PatchPointChooser, TensorPatchPanels, TensorPatchEditing, TensorDeCasteljauGraph: pass. TensorDerivativesGraph: only 6 corner-button tests fail, from PA2's concurrent corner select change (not my files).
- Lesson tests (patchLessonActions, lessonPatchScene, patchCheckpointSweep, patchChapter, patchExampleIntegration): passed (22.3 s together with TensorPatchPanels and TensorPatchEditing).
- Full `src/graphs/patches` run before my test repairs: failures only in tests reading removed controls.

## Phase B (partial)
- Done: Coons, Triangular and Join B-point block moved to `PatchPointChooser` and `PatchPointEditor`; editors keyed on the index only; `PointEditor` alias and the `onApply` name removed from the editor (now `onCommit`; Join's own `onApply` prop on `JoinBPointControls` is unchanged). Tests repaired: TensorJoinPanels (Q21 x), TensorSubdivisionPanels, TriangularPatchEditing. `apply_coordinates` and `enter_finite_numeric_coordinates` deleted from sl.ts/en.ts (no source caller).
- Observed: `just typecheck` passed after the move; full `just unit src/graphs/patches` passed (150.6 s, all files, taken before the key deletion).
- NOT done: deliberate-mutation evidence and per-file durations. A mutation run was queued behind other checkouts for over 50 minutes without starting, so I reverted all mutations (files identical to the pre-mutation copies) and stopped. Planned mutations: chooser none -> `[value]`; editor decimals 4 -> 2; `startingPatchIndex` always undefined; remove the shown-entry guard in the starting-patch `onChange`; degree plus adds 2.
- Not re-run after the key deletion: `just typecheck`, the lesson tests.
