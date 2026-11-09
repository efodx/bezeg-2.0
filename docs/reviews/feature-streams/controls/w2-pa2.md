# W2 PA2 evidence

Files: new SurfaceCameraPanel.tsx (+test); Tensor/Coons/Triangular camera groups use it; TriangularPatchPanels (starting-patch ChoiceSelect with custom, degree CountSetter, `startingPatchIndex` action); TriangularPatchGraph (`startingPatchIndex`); TensorSubdivisionPanels (UnavailableButton); TensorDerivativesPanels + Graph (corner ChoiceSelect, visible degeneracy line plus one LiveReadout, settled); TensorJoinPanels (scene ChoiceSelect with custom, B-degree CountSetters, alpha `unavailableReason`) + TensorJoinGraph (`joinSceneIndex`); keys patch_derivatives_corner_none, patch_join_scene_custom (sl+en); TensorPatchEditing.test import of azimuthDegrees.
Checks: `just typecheck` passed; `just lint` on my files passed; `just unit` of 13 files (patch graph tests, lesson tests, chapter tests, coonsGuidedLessons): 246 passed, 38 s.
Mutation: startingPatchIndex always returning a preset index fails the new starting-patch test.
Lessons: no quoted panel text affected; none edited.
Not verified: browser smoke; test-time before/after (shared tree, no clean baseline).
