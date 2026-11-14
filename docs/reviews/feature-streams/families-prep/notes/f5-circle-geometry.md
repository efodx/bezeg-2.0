# Circle geometry F5: example card images (handler 20 worker)

- Inventory: `node scripts/generate-guided-example-inventory.cjs --chapter circle-geometry`, four entries on `circle-construction`; `expected` authored from the first scenes in `circleGeometryGuidedLessons.ts` and from `CircleConstructionGraph.tsx` `buildScene` (`circleGeometryExpectedFor`). Capture accepted all four on the first run (no correction).
- Recipe row added for `circle-construction` ([-7, 9.2, 19.5, -7.2]); it leaves the missing list of the exhaustive-recipe test (that test still fails for other ids, pre-existing).
- Observed pre-PNG failure: `guidedExamplePreviews.test.ts` "publishes the circle-geometry example cards ..." failed with ENOENT on `src/images/learning/examples/circle-geometry/manifest.json`. After capture my first counts used the length of `expected.points` (wrong); the row takes `types.point`: [0,4], [0,6], [0,8], [0,5]; passes.
- Frames viewed: CG1 circle (0,0,5) with Thales circle, P at (13,0), contacts T1/T2 and tangent segments; CG2 three circles, orange axis, two dashed axes, cross and orthogonal circle near P; CG3 bisector line, A, N, B, P and the readout PA : PB = 2 (visible, not answered in copy); CG4 two circles, centre line, four tangent lines, plus at the internal centre.
- Board labels touching something (label pass):
  - tangents: "1" sits on the centre handle; "T1"/"T2" touch their square markers and the Thales circle; "P" touches the P handle.
  - radical: "1", "2", "3" sit on the centre handles; "2" also touches the blue circle edge; "P" touches the orange cross and the dashed orthogonal circle; the "3" label touches the green radius handle line of circle 3.
  - apollonius: "A", "B", "P" touch their handles; "N" touches the diamond and the segment AB; "PA : PB = 2" lies close to the dashed line from P to B.
  - common: "1", "2" sit on the centre handles; "2" touches the circle edge.
- Alt text states no first-step answer (no number of tangents, powers, locus shape). Preview server on 4519 stopped; port closed. Logs: `.command-logs/f5-cards/circle-geometry/`.
