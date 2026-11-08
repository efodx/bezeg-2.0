# Controls task 2, slice P5: curve workspace pilot evidence

Branch worktree-stream-controls, uncommitted. Brief: [points-p5-brief.md](points-p5-brief.md).

## Files
- New `src/graphs/base/CurvePointControls.tsx`: `PointCollection` (remove-last, typed x/y entry, no addMode) + `PointListInput` (per-row remove, `minCount` 1). Names `p₀…` / `w₀…`. Refreshes on the "up" event of the main board and (PH) the hodograph board; `boards` is re-resolved each render, so a late hodograph board is picked up.
- `BaseCurveGraph.tsx`: `workspaceEdit` mounts it; `addTypedPoint` (`placeNewPoint`), `removePointAt`, `afterTypedPointEdit` (`refitWhenOutside` + `fitToVisiblePoints`); `pointRefusals` (`RefusalChannel`) shown with `RefusalNotice`.
- `CurveEditingFeature.ts`: host gains `refuseLastPointRemoval()` and `acceptPointEdit()`; Delete-mode click on the last point now refuses with a reason.
- `BasePhBezierCurveGraph.tsx`: hodograph editor is `CurvePointControls` (list only, `boards` main + hodograph).
- Deleted `PointCoordinateEditor.tsx` and its test; exemption line removed from `eslint.config.mjs`.
- Tests: `CurveWorkspacePoints.test.tsx` (new), `curveGraphTestAccess.ts` (test helper), `sharedControls.graphs.test.tsx` (curves added).
- Removed keys (sl and en): `delete_point_p`, `add_point_by_coordinates`, `new_point_x`, `new_point_y`. Kept (other users): `apply_coordinates`, `new_point`, `enter_finite_numeric_coordinates`, `point_coordinates_keyboard_editing`.

## Decisions to confirm
- Limits: the curve model has no point maximum; max is 12 (the largest existing curve count control: `DEBOOR_MAX_POINTS`, `INTERPOLATION_POINTS_MAX`). Only the count control honours it; a board click still adds without limit. Minimum 1 (what Delete-mode already kept).
- Curves have no coordinate range, so typed coordinates are limited to +-1e6 (`CURVE_COORDINATE_LIMIT`), only to run the shared field cases and stop a typo like 1e300. A drag is not limited.
- Refusal text at the minimum is `count_at_minimum` ("Najmanj 1."), same as the list's own reason.

## Results (observed)
- `just unit src/graphs/base/sharedControls.graphs.test.tsx`: 113 passed, 3 skipped (the helper's stated skips).
- `just unit src/graphs/base/CurveWorkspacePoints.test.tsx`: 6 passed.
- Mutations (each failed exactly as expected, reverted): refit also for an out-of-view point always: decision 6 test failed; board refusal removed: C2 test failed (list part passed); typed value not applied: decision 6, typed-equals-drag and PH `w` tests failed.
- `just typecheck`: 0 errors. `just lint` on base, ph, localization, eslint config: passed.
- `just unit src/graphs/base src/graphs/curves`: passed (470 s). `just build`: passed (warnings in the log, not read).

## Changed assertions
- None in existing curve tests (the deleted `PointCoordinateEditor.test.tsx` encoded the Apply form; its "listeners disposed" and "auxiliary drag refreshes" intent is covered by the PH test and the board-drag test, not by a listener-disposal assertion).

## Known gaps
- Typed `w` edit on the PH hodograph does not refit any view (the point lives on the auxiliary board).
- The refusal stays across Reset, Preset and lesson restore until the next accepted edit.
- `curve-curvature` and `bezier` are the two real graphs; rational, PH, envelope not run through the shared behaviours (PH has no collection).
- Not smoke-tested in a browser; the list with many points and the Delete-mode click use a stubbed pointer position in jsdom.
