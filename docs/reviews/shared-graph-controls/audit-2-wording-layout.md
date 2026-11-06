# Audit 2: wording, mode choosers, layout

Haiku audit, 2026-11-07, partial and unverified. Saved by the handler from the agent's report, condensed. `en` line numbers refer to `en.ts`; `sl.ts` parity was not checked except in row 6.

## Wording

1. "Add point" on two keys: `add_point`, `pointset_add_point`.
2. Remove versus Delete: "Delete point" (curves), "Remove" (PointSet, Summary statistics), "Remove zero".
3. Clear family: `playground_clear`, `pointset_clear`, `clear_selection`, `del_tri_clear`.
4. "Next step" on five keys (Bisection, RootFinding, euler_ode, Sequence, fixed_point).
5. Playback reset has three labels: "Reset", "Reset iteration", "Reset values".
6. Restore example: "Back to the example" / "Nazaj na primer" (B-spline Insertion, Extraction, NURBS) versus "Reset example" / "Ponastavi primer" (Voronoi).
7. Three copies of one B-spline example set (en 283-289, 302-314, 335-339).
8. Example label varies: Example, Example function, Example sequence, Example map, Equation. Custom: "Custom" versus "Imported curve".
9. "Show error bound" on two keys: `taylor_show_bound`, `fixed_point_show_bound`.
10. The same +1 stepper has six aria-label wordings (Taylor, polynomial degree, index n, harmonics N, N, count).
11. Degree chooser: four labels and three control types: hand stepper (Taylor), NumberInput (ComplexRoots), CountSetter (Bernstein, CnSpline), ChoiceSelect (Basis, Blossom, DeBoor).
12. Count nouns vary: Number of control points, Number of points, Points: n of at most m, Number of comb teeth.
13. Mode chooser has six nouns: Display, Display mode, Mode, View, Curve type, Editing mode.
14. Step back: Previous weight, Previous segment, Back, Previous frame.
15. Conic labels hand-copied in `PascalControls.tsx:28` and `PolePolarControls.tsx:32`; `ConicFocalGraph.tsx:251` uses lower-case "ellipse".

## Mode choosers

16. One kind of choice, four control types: `workspace-modes` buttons with no group name (`BaseCurveGraph.tsx:186`); `role=group` rows (`PointSetControls.tsx:187`, `VoronoiControls.tsx:132`); raw select (`SimsonLinePanel.tsx:97`); ChoiceSelect (`HermiteGraph.tsx:295`, `DegreeReductionGraph.tsx:220`, `ArcLengthParametrizationGraph.tsx:396`).
17. Conic: `aria-pressed` rows in Pascal and PolePolar; ChoiceSelect in ConicFocal.
18. `src/inputs/Select.tsx` has no importers, per the agent's search; this conflicts with the first audit's rough count of about 8. Raw selects: `EulerLinePanel.tsx:71`, `InscribedAnglePanel.tsx:100`, `InversionPanel.tsx:83,109`, `NotablePointsPanel.tsx:59`, `SimsonLinePanel.tsx:87,97`, `FivePointControls.tsx:98-108`.

## Layout

19. Angle sliders copied three times: `InscribedAnglePanel.tsx:75`, `InversionPanel.tsx:216`, `SimsonLinePanel.tsx:136`, with two keyboard help phrasings (en 2827, 2935).
20. `ThreeViewsControls.tsx:35-37`: raw range, `Number()` without a guard.
21. `pointset-check` is reused in five other panels; no CSS rule found for `pointset-check` or `pointset-row`. Rendered effect not determined.
22. `simson-slider-row`: no CSS rule found.
23. `rational-weight-*`: hand −/+ around NumberInput; no CSS rule found.
24. Taylor, Fourier, Runge and UniformConvergence borrow `CountSetter` CSS classes.
25. `bisection-actions` (`FunctionReadout.css:51`) is reused by RootFinding, CLT and Summary statistics.
26. `demo-actions` is on ten graph files.
27. `inspector-playback` is used in 15 files, including a mode group in Voronoi.
