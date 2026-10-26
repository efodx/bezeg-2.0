# Rational and PH catalog preview repair

Status: complete, 2026-10-26. [Acceptance and limitations](../reviews/rational-preview-repair.md).

## Problem

Four existing catalog previews communicate less than their demonstrations support. The rational Bézier poster leaves a selected-curve bounding frame and handles visible. Rational de Casteljau captures only a growing curve prefix while its existing weighted construction is hidden by the capture recipe. The cubic and quintic PH previews each show a single offset, although the existing count control supports three.

## Scope

Capture-only recipes, motion checks/schedules, poster and clip assets, manifest evidence, and this task's review evidence. Do not change graph scenes, route defaults, math/runtime code, labels, controls, or shared presentation. Use only existing UI controls. Preserve every unrelated preview asset, manifest record, and source-frame evidence.

## Acceptance

- `rational`: select the curve only as required to set (w_1=2), then clear selection before poster capture. Motion keeps the selected inspector mounted for the existing weight input and suppresses only the editing rectangle/handles in capture presentation. Poster and all motion frames show the rational curve and its intended supporting polygon without a selection rectangle or selection handles. Weight motion remains independently checked for fixed control points and the expected weighted Bernstein curve.
- `rational-decasteljau`: show the existing weighted interpolation construction and evaluated point together with the final curve. Motion sweeps supported (t); each visible level is checked against weighted de Casteljau interpolation, the final point agrees with rational Bernstein (R(t)), and no selection artifacts appear.
- `ph-cubic` and `ph-quintic`: use the existing count setter to show three offset curves alongside the unchanged PH curve. Check each offset at 41 parameters against its expected signed normal distance (k d), for (k=1,2,3), including perpendicularity, consistent side, and cusp clearance across every scheduled frame. The quintic schedule must keep (3|d|) below the smaller sampled signed curvature radius. Posters and first/last motion frames match exactly.
- Recapture only `rational`, `rational-decasteljau`, `ph-cubic`, and `ph-quintic`; retain other posters, clips, and evidence with verified checksums. Inspect all four posters and decoded clips at 360×220. All clips retain the existing 720×440, four-second, 24 fps, silent, 300 KiB contract.
- Run the focused capture checks and lint. Record environment, output paths, card-size findings, and any incomplete browser or visual coverage in `docs/reviews/rational-preview-repair.md`.

## Verification boundary

No application/runtime behavior changes are intended. If any existing UI action cannot express the acceptance state, stop before changing runtime and report the precise dependency.
