# L56 (ph-cubic), worker 2026-11-28

## Done (observed)
- Parity recorded first: SAMPLES entry `ph-cubic` (`parity.test.tsx`), `src/graphs/curves/ph/__parity__/ph-cubic.json` (5 states; shown value is the board text "Dolžina loka: ..", the only captions). Accepted: extra row `arc-length`.
- Base hook (`BasePhBezierCurveGraph.tsx`): `declaresPhWorkspace()` (default false, also drives `declaresCurveWorkspace()`), `arcLengthOnBoard()`, `phExtraActions()`, `PhIds`, parameter `ph-offset-d`, `declaration()`, `drawnObject('offset')`, `performAction('arc-length-shown')`, marks (+ offset samples), `followView`. Quintic and parametrisations unchanged (undeclared).
- Cubic: `declaresPhWorkspace()` true, action `ph-geometry` (tools/display), `performAction`.
- Placement: d is a board puck while the offsets are drawn (lesson step `ph-offset-side` asks to set d = 1 and d = -1); absent while offsets are off (a dead puck otherwise). Offset switch, offset count, offset control points, arc length switch, polygon geometry, hodograph board and w editor stay in Orodja (setup/display; the hodograph is a second board, no point rows). Control polygon / hull pucks come from the common curve declaration.
- Arc length: board text removed (owner rule); declared row `arc-length` (value kept at 3 decimals via FormattedValue), highlighted in steps ph-generator (explanation) and ph-hodograph-edit (observation).
- Shared edits: `JXGPHBezierCurve.getJxgOffsetCurves()` (read accessor), `PhBezierCurveControls.tsx` `PhOffsetParameterControls` optional `distanceParam` wraps the Slider in `PuckOwned` (unchanged without it).
- Lesson sl+en: ph-offset-side prompt names the Razdalja control; "odčitek na grafu"/"readout on the graph" -> Odčitki card (ph-default-speed worked example check, ph-generator expected, ph-hodograph-edit prompt).
- No new catalog keys (reused `offset_d_name`, `offset_d_refused`, `curve_offsets`, `arc_length`, `show_arc_length`, `control_polygon_geometry`).

## HANDOFF (partial, budget)
Observed: tsc clean for my files (only L53's parity.test.tsx:856 error); declaration test `CubicPhBezierCurveGraph.declaration.test.tsx` 7 pass, red seen (`pressed` of ph-geometry not negated: "expected true to be false"); `just graph-check ph-cubic --route /bezeg-2.0/ph/cubic`: contract, parity, declaration, shared pass; golden FAIL as expected (default/ph-introduction/ph-offsets captions "Dolžina loka: 10,333 / 4,333 / 4,333" -> []; not re-recorded).
Unit run (ph, parametrisations, base own tests, content, localization): 4 failures, all caused by this conversion and unfixed:
1. `CurveWorkspacePoints.test.tsx` 'a typed w keeps its value' and 'decision 6' (ph-cubic): after the first typed w, `getByRole('spinbutton',{name:'w₀, x'})` finds nothing (the declared graph re-renders; 5 spinbuttons exist, names unknown). Scratch probe was mid-way (deleted).
2. `GraphControlledControls.test.tsx:79` PH offset slider is now the puck `ph-offset-d` (own test: read the puck).
3. `PhHodographFirst.test.tsx:101` ph-cubic case: d slider no longer in the Edit group (puck); split the ph-cubic case.
Not run: FirstTask, round trip -t ph-cubic, lint, build, smoke-lesson ph-cubic, shots, guidedLessons.test (inside the unit run: passed), browser checks.

## Session 2 (worker, 2026-11-28)
- Cause of failures 1: not a remount. About 50 ms after mount the layout's rule 5 folds Orodja (shim stage 600x400, every card measures 400 high, and the lane's new Odcitki card shares the column), so the w spinbuttons leave the accessibility tree; the DOM nodes stay (same ids). Fix in the test setup only: `CurveWorkspacePoints.test.tsx` `mountSelected` seeds `saveBoardLayout({folds:{tools:false}})` (the learner's stored open fold wins). No shared workspace code touched.
- `GraphControlledControls.test.tsx` and `PhHodographFirst.test.tsx` (ph-cubic branch) read d from the puck (`role=slider`, `{hidden:true}`, aria-label starts with `offset_d_name`).
- Lesson prose: last "drsnik/slider" (guidedLessons.ts ~699, ~747) now "krmilnika"/"control".
- `tests/guided-lessons.smoke.spec.cjs` ph-cubic `prepareUserState`: `h.openToolsCard` first (Orodja opens folded), as other converted rows.
- Checks passed: eslint changed files, tsc, unit curves/base/content/localization, FirstTask, PresetRoundTrip -t ph-cubic, graph-check (golden fails as expected, 3 caption diffs, not re-recorded), build, smoke-lesson ph-cubic, smoke-built curve-ownership + library-picker, shots (`.command-logs/l56-*.png`, 1440x900 and 1280x720, all steps viewed in part: clear).
