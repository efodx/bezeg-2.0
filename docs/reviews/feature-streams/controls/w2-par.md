# Wave 2 review: patches sweep (commit 3c4be65e)

Reviewer: `bezeg-reviewer`, Sonnet, brief `w2-par-brief.md`. Read the committed code only; `just typecheck` passed; no tests run. The reviewer could not write files, so the handler recorded its return here.

## Medium

1. `TensorJoinPanels.tsx:135`: the derived-row note (`patch-join-derived-note`) keeps `role="status"`, the only one left in the patch panels. Expected: no live role on a visible group (decisions 18, 48), or one settled `LiveReadout`.
2. `TensorSubdivisionPanels.tsx` Elevate: `UnavailableButton` has no `onBlockedPress`, and `patch-elevate-reason` lost its `role="status"`, so a blocked press announces nothing. Decision 13: a press shows the reason in its owner's status region.

## Low

3. `TensorDerivativesPanels.tsx` `DerivativesCornerSelect`: `aria-label` on `<option>` is honoured inconsistently; the visible "(0, 1)" may be all some users hear. The select label gives context.
4. Tensor degree `CountSetter` has no `onSet` (no typed field), while Triangular and Join B have one; typed refusals use the generic hint.
5. `PatchPointEditor` passes `points={[xyz]}`, a new array each render; `PointListInput` clears a graph-level refusal on identity change. Harmless today: the editor's only refusal is field-local.

## Checked and cleared

Chooser call shapes and "none" handling; editor exact untouched axes, index-only keys, legend, `pointLocked`; `startingPatchIndex` row-major match, Triangular canonical net, `joinSceneIndex` (nets, mode, alpha, v, capstone), custom entry and no-op on the shown entry; corner select ids and "not at a corner"; `SurfaceCameraPanel` ranges, children, `readOnly`; Join alpha `unavailableReason`; no native `disabled`; Coons and Derivatives settled `LiveReadout`; degree bounds; mathematics untouched; localization lockstep and removed keys without callers; new tests assert real values.

## Not verified by the reviewer

Test pass state, mutation evidence, browser behaviour of `<option aria-label>`, graph-side `selectIndex`/`selectBoundaryPoint` fills.
