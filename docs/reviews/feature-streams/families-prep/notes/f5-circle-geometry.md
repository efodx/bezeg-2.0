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

## Label pass (handler 20)

- `CircleConstructionGraph.tsx`: every board text (handle names, T1/T2, N/internal and external division captions, the ratio caption) is now placed by the shared `placeLpLabels` (`labelBoxes`, `caption`); handles, markers, drawn lines, circles and the axis tick number texts are obstacles. The radical mode creates the P name first so P keeps a spot next to its handle among the circles.
- Before/after: "1", "2", "3" and "P" on their markers (radical), "T1"/"T2" on markers and the Thales circle, "A", "B", "P" and "N" on handles (apollonius), "1", "2" on handles and the circle edge (common): all now beside their markers, clear of lines, circles and each other. Cards recaptured (four PNGs and manifest).
- Test `CircleConstructionLabels.test.tsx` (four modes: text boxes clear of points, drawn lines and circles, and of each other); red before the fix (e.g. "T1" lies on a marker), green after.
- Remaining: the circle numbers sit about 25 px from their centre handles (not on them); in the radical card "P" is crowded by the orthogonal circle and axes and sits left of its handle.

### Label pass follow-up: name ownership (handler 20, partial)

- Rule added in `CircleConstructionLabels.test.tsx` ("name ownership", four modes): a point name's box centre is nearer to its own point than to any other point marker. Red first (radical "P" nearer to another marker), green after.
- `labelBoxes` (CircleConstructionGraph.tsx): after the shared placer, a name that breaks the rule moves to the cheapest ring spot (up and right first) that satisfies it.
- Recaptured radical card: "P" is up-left of its orange marker, nearer to it than to any other marker, but still about 80 card px away (crowded). The common-tangents card: "2" sits left of its handle on the dashed centre line (not clear of lines; at 1366 the same name is fine, up-right of its handle). Cause not found: jsdom and the live page place "2" correctly. Suspect a stale layout in the card capture (the cache key lacks marker visibility); next step: add shown-marker positions to the cache key in `labelBoxes`, rebuild, recapture, view the four cards.
- Not rerun after the last change: full `just unit src/graphs/compgeo src/learning/chapter`, tsc, lint (labels test green; earlier full run predates the ownership pass).

### Label pass follow-up 2 (worker)

- Common-tangents "2" cause: not the layout cache. The card board is 420 x 260 CSS px (captured at 2x); at that size the shared placer chose the spot left of the handle on the dashed centre line (reproduced in a live-page debug script, same spot). The cache key still lacked the shown markers, circles and lines; `labelBoxes` now keys on their positions (`drawnKey`), test "layout cache" (a derived marker moved with the state edited in place: stale layout returned before, red observed; new layout after).
- `labelBoxes` ring pass now also runs for a name that lies on drawn lines or markers, not only for one nearer to another marker; it moves only when the new spot has a lower penalty. Samples count against a box inset by the glyph padding (3 px, 4 px), ring radii start at 14 px.
- Result in the recaptured cards: "2" sits above its handle inside the circle, clear of the line; radical "P" is down-left of its marker, about 24 css (48 card) px centre to centre, clear of the circles and lines (was about 80 card px up-left). Tests at the card scale (12.4 px per unit, axes hidden): "2" clear of lines, "P" within 30 px. Honest limit: those two card-scale tests were green before the final ring change too (jsdom keeps a 600 x 400 canvas), so they guard but do not prove the fix; the card PNGs do.
- Left: at 1366 the radical "1" and "P" touch the x axis or a dashed circle (axes are not obstacles); the lesson 390 screenshots show no new overlap.
