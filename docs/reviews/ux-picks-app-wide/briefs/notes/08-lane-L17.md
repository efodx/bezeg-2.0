# Lane L17 (projective-three-views), round 8

- Parity recorded before converting (panel sentences already carried `data-readout-note`, no marker edit): SAMPLES entry `projective-three-views` (7 states), `src/graphs/projective/__parity__/projective-three-views.json`. Never re-record.
- `ThreeViewsGraph.tsx`: `ThreeViewsIds` (notes c/status/equation/discriminant/determinant/infinity/clipped/point; legend circle/line/image/directions/points), `declaration()`, `drawnObject`, `named` map; marks.must = the two panels (boxes).
- `threeViewsText.ts`: `threeViewsMessages()` (Message twin, same words); fragment `projective-three-views.ts` (legend, clipped-both join); the pair key `projective_five_point_pair` is reused.
- `ThreeViewsControls.tsx` (only ThreeViewsGraph imports it): `data-declared-panel` wrappers round the sentence paragraphs (LiveReadout stays outside).
- Lesson: 7 observation frames declare (open readouts + highlights); step 1 prompt "pod drsnikom" reworded to "Preberi stanje." (the status moved to the board card).
- Host test: after `graph.reset()` the board layout folds Orodja; the test unfolds it before reading the slider.
- Placement: no pucks, no board controls. c and the point toggle/angle have no arbiter key (unbound, not declared), and c is a setup slider the lesson drives by scene actions; all stay in Orodja. Points are board-owned; legend and marks cover them.
- Red: `determinant` note text swapped for the discriminant text -> `AssertionError: expected [ 'c = 2', …(5) ] to deeply equal [ 'c = 2', …(5) ]`, `- "Determinanta 3 × 3 matrike stožnice je -1, ..."` / `+ "B² - 4AC = -12 (...)"`; reverted.
- Checks: see report.
