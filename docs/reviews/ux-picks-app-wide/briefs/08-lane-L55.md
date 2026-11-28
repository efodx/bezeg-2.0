# Dispatch: task 08 lane L55 (patch-tensor, patch-decasteljau, patch-derivatives)

You are a `bezeg-worker` (Opus, owner direction 2026-11-27). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`). Stay in it, never create a worktree, never commit, push or stash. Order: patch-tensor first (the base the other two extend), then patch-decasteljau, then patch-derivatives; leave the tree consistent (tests green) after each graph, because a budget handoff can come between them.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` and the "Rules learned" and "Checks" sections of `briefs/08-lane-L31-L33.md` (apply where they fit a 3D board). Surface recipe: the "Surface recipe" section of `briefs/notes/08-lane-L53.md` (solids, derived from the Coons pilot; committed). Task file "3D camera" rule: the view director does not run, the camera stays in the graph's own controls in Orodja, cards rely on placement.

## Lane (`inventory/08-partition.json`)

- Graphs: `src/graphs/patches/TensorPatchGraph.tsx`, `TensorDeCasteljauGraph.tsx`, `TensorDerivativesGraph.tsx`; panels `TensorPatchPanels.tsx`, `TensorDeCasteljauPanels.tsx`, `TensorDerivativesPanels.tsx`, `SurfaceCameraPanel.tsx`.
- Owned bases (first lane to own them): `PatchPointChooser.tsx`, `PatchPointEditor.tsx`. Lane L58 (patch-joins, patch-subdivision, patch-triangular) reuses them later: changes behind opt-in props, other users unchanged. `BaseSurfaceGraph.tsx` is used, not owned: opt-in hooks only; run the patches dir and patch-coons parity/golden after any edit.
- Control points of a patch are a grid: the declared point rows are the chooser/editor (one row editor for the chosen point), not a puck per point.
- Lessons: `src/learning/content/patchGuidedExamplesBasics.ts`, `patchGuidedExamplesEvaluation.ts`.
- Own tests: `BaseSurfaceGraph.test.tsx`, `TensorDeCasteljauGraph.test.tsx`, `TensorDerivativesGraph.test.tsx`, `TensorPatchEditing.test.tsx`, `TensorPatchExport.test.tsx`, `TensorPatchGraph.test.tsx`, `TensorPatchJsxExport.test.tsx`, `TensorPatchPanels.test.tsx`, `jsxSurfaceLifecycle.test.tsx` (all under `src/graphs/patches/`), and the two lesson tests.
- Shared tests: `src/graphs/ExportPausesPlayback.test.tsx`, `patches/PatchFirstTask.test.tsx`, `lessonPatchScene.test.tsx`, `patchCheckpointSweep.test.tsx`, `patchLessonActions.test.tsx`, `patchPresetCollections.test.ts` (your graphs' cases only).
- Shared files edited concurrently by other workers: `sl.ts`, `en.ts`, `src/localization/fragments/index.ts`, `src/graphs/base/declare/parity.test.tsx`. Re-read before each edit; small edits only.
- Pucks only for what a lesson step asks the learner to set, flip or compare (name the step): typically the evaluation parameters (u, v); choices at most 4 options; setup and camera in Orodja; mathematics untouched (tensor evaluation, de Casteljau stages, partial derivatives: run the existing tests).
- If the conversion needs a contract change, stop and report it with the smallest proposal; do not change `src/graphs/base/declare/**` or `src/workspace/**`.
- Parity report runs leave `src/graphs/**/__parity__/*.report.txt`: delete the ones you create, by name.
