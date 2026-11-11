# F2a UI recheck repairs (handoff-v13)

1. Chord of contact legend entry: done (CircleConstructionGraph.tsx legendItems "tangents", CHORD_STYLE shared with the board segment). Shown only when P is outside.
2. Apollonius locus legend: done (LOCUS_STYLE; circle and line entries, none when degenerate). New keys circle_construction_legend_locus_circle / _locus_line.
3. Pair punctuation: done, new key circle_construction_pair "{value0}, {value1}" in sl and en (triangle_solver_list_separator has a different meaning).
4. Cross/plus markers: CircleConstruction marker and Isometry marker now stroke them in their colour (strokeWidth 2). Stroked with pointOutline and left alone (outside this stream): PolePolarGraph.tsx:435 face "+". Already fine: UnitCircle, EulerLine, InscribedAngle, SimsonLine, warningText/label strokes.
5. triangle_solver_legend_ssa_arc reworded to "circle" (key kept).
6. Solved readouts: `measured()` in TriangleSolverGraph uses "=" when the shown value equals the value within 1e-9, else the triangle_solver_approx_value pattern. Existing tests updated.
7. Nits: JSDoc moved above sideText; IsometryGraph space added.

Mutations observed failing and restored (cmp identical): chord condition, locus condition, pair key, strokeOnly (CircleConstruction, Isometry), measured exactness, ssa-arc wording.
