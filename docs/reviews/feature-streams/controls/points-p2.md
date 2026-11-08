# Controls task 2, slice P2: evidence (point collection and point list)

Worker result for `points-p2-brief.md`. Not committed.

## Files
- `src/inputs/PointListInput.tsx` (+ `.css`): generic over the row tuple; `axisLabels` 1/2/3, `grid`, `integer`, `onRemove` + `minCount`, `selected` + `onSelect`, exported `SelectablePointButton`, `PointRow1`/`PointRow3`. `PointRow` unchanged. Existing callers untouched.
- `src/inputs/PointCollection.tsx` + `.css` (new).
- `src/inputs/sharedControlBehaviour.tsx`: `pointListBehaviour`, `pointCollectionBehaviour`; the numeric keyboard case extracted to `registerNumericKeyboard` (shared, behaviour unchanged).
- `src/inputs/sharedControls.behaviour.test.tsx`: bare runs (list with/without selection and count bound; collection remove-last/selected x 1/2 axes).
- `src/inputs/PointListInput.props.test.tsx` (new): unit tests per new prop (14).
- `src/localization/sl.ts`, `en.ts`: six keys (below).
- `fixtures/controls/main.tsx`: "Points" group in both placements.

## Keys added (sl / en)
- point_controls_remove_named: Odstrani: {value0} / Remove {value0}
- point_controls_remove_selected: Odstrani izbrano točko / Remove selected point
- point_controls_clear_all: Počisti vse točke / Clear all points
- point_controls_add_at: Dodaj na koordinatah / Add at these coordinates
- point_controls_new_axis: Nova točka, {value0} / New point, {value0}
- point_controls_incomplete: Najprej vnesi vse koordinate nove točke. / Enter every coordinate of the new point first.
Reused: count_at_minimum/maximum, decrease/increase_count, new_point, pointset_add_point, pointset_add_mode, pointset_limit_reached, pointset_no_selection, pointset_no_points, pointset_point_count.

## Results (observed)
- `just unit src/inputs`: passed (existing `PointListInput.test.tsx` unchanged and green).
- `just typecheck`, `just lint`: passed. `just build`: see report.
- `just controls-fixture`: 38 passed (every view, both languages; existing ChoiceSelect `test.fail` still expected). Screenshot `test-results-4328/controls-fixture/1440x900-sl.png` opened: Points group shows the selected row as a dark pressed name, per-row x buttons, "Najmanj 3." reason, 3-axis rows (z wraps to a second line at 310px), Add-mode pressed (dark), unavailable buttons dashed and faded, typed-entry range hint "Vnesi vrednost med −10 in 10.".
- Mutations: (1) remove the unavailable reason from list remove and Remove-selected: 10 cases failed (list limit/refusal sl+en x2; collection limit and refusal x4), reverted. (2) typed entry adds on commit instead of Enter/Add-at: 6 cases failed (commit x6), reverted.

## Decisions
- Clear all: available only when `count > 0` and `min === 0`; otherwise unavailable with count_at_minimum (min > 0) or "Ni točk." (empty). Reason: clearing must reach an empty collection.
- Typed-entry Enter adds when this keystroke committed a field, or the field already shows the accepted value; refused/unparseable drafts add nothing. After an add the fields empty.
- Remove-last uses `CountSetter` unchanged; its plus passes `maxReason` = pointset_limit_reached.

## Not verified
- No real-graph mounts (P3-P5). Touch-target check covers the fixture only. Visual: 3-axis rows and typed entry wrap onto extra lines in the 310px panel (no clipping reported).
