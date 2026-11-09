# Wave 2 UI and accessibility review, functions and curves: findings

Sonnet reviewer, read-only, 2026-11-09; recorded by the handler from its return. No tests run.

## Medium

1. `sl.ts` `bsp_degree_needs_points` "Z {value0} točkami je najvišja stopnja {value1}." is ungrammatical for most counts (s/z by numeral, dual "dvema točkama"). Reachable (DeBoor min = degree + 1; Blossom). Expected: number-agnostic wording; `en.ts` in lockstep.
2. `BaseCurveGraph.tsx:222-225`: the typed list on multi-curve boards names no curve (title `point_coordinates_keyboard_editing`, rows p₀…); with nothing selected it lists curve 1 while the status says no curve is selected (Subdivision, Affine, DegreeReduction, Decasteljau2). Expected: the curve number in the title. (Same as curves review finding 2.)
3. `BSplinePointList.tsx:13` rows "Točka 1…" (1-based) while curve lists use p₀… (0-based): match the board labels.

## Low

4. Native `disabled` left: `ArcLengthParametrizationGraph.tsx:402` position slider while playing (no reason); `:404` Play `disabled={reduced}` with a visible but unlinked reason; `DecasteljauAnimationControls.tsx:39-45` (C12, step 5).
5. `ConicFocalGraph.tsx:272/276`: `conic_weight_needs_bridge` shown twice (slider and button).
6. `sl.ts` "Prilegajoča se utež" reads awkwardly as a button label.
7. Two live regions on curve boards: `BaseCurveGraph.tsx:175` `role="status"` for the curve selection, `DecasteljauAnimationControls.tsx:36` `aria-live` t readout.
8. `bsp_example_reset`, `lines_need_offset_control_points`: fine.

## Cleared

`CountSetter` weight labels; 44 px targets (`CountSetter.css:6,15`, point-list buttons 2.75rem); one `LiveReadout` per function graph; `.epicycle-status`, `.taylor-status` kept; no learning text names removed controls; reworded hint fine, keys in lockstep.

## Needs a browser check

Edit tab height at 390 px with the point list (B-spline boards, Subdivision with many pieces); `.point-list-index` (4rem) clipping "Točka 10" at enlarged text; focus order of the unavailable conic weight slider and button; forced colours on dashed unavailable buttons.
