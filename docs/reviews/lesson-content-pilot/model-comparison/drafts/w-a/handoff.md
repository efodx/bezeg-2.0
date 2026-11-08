# Handoff: writer w-a (partial, no drafts written yet)

The budget hook stopped this run at 138k input tokens. All inputs have been read: style brief, extraction notes, merged findings, and all 12 round-1 reviews. All four r0 scripts are read except the polynomial-zeros source. No lesson draft exists yet. The next writer should write the four `<lesson-id>.md` files and `notes.md` in this folder, then delete this note or leave it for the caller.

## Verified UI facts (from source)

- Control points are labelled lowercase \(p_0,\dots,p_3\) on screen (`src/graphs/styles/PointStyles.ts:127`), not \(P_i\) or \(b_i\). Control points are orange-brown (`GraphPalette.controlPoint`). The bezier curve is green.
- bezier: `curve-evaluation` draws a fixed point labelled \(B(\tfrac12)\) (`AbstractJXGPointControlledCurve.ts:351-363`). The point follows when control points are dragged. The convex hull is a JSXGraph polygon (filled area) and refreshes on drag. Display switches are "Kontrolni poligon", "Konveksna ovojnica" and "Kontrolne točke" (sl.ts:469-471).
- subdivision (`SubdivisionGraph1.tsx`): default points (-4,-3),(-3,3),(3,3),(4,-3). With the scheme shown, the curve is blue on \([0,t]\) and orange on \([t,1]\). Scheme labels are \(p_i^r\), where the upper index is the row: control points \(p_0^0..p_3^0\), row 1 \(p_0^1,p_1^1,p_2^1\), row 2 \(p_0^2,p_1^2\), and the final point \(p_0^3\) on the curve (`AbstractJXGBezierCurve.ts:225-259`). The slider "Parameter subdivizije t" (0.01 to 0.99) and the button "Subdiviziraj" sit in the tools panel, Edit group "Uredi" (`BaseGraph.tsx:434`, `SubdivisionGraph1.tsx:159-164`). After a cut, the left piece is blue and the right piece is orange, the scheme hides, and t is set to 1. The pieces' points stay draggable; only operations are disabled.
- curvature (`CurvatureBezierCurveGraph.tsx`, `CurvatureOverlay.ts`): the slider "Parameter t" has step 0.01 and sits in the tools Edit group. The board readout is in the top-left corner of the graph and shows "Ukrivljenost κ = …", "Krivinski polmer R = …" and "Smerni kot tangente φ = …°". At κ=0 it shows "Ukrivljenost je 0: krivinska krožnica je premica, krivinski polmer je neskončen" in warning colour. The point on the curve is green. Arrow T is green. Arrow N is blue and dashed. The circle and its centre are orange and dashed. κ is SIGNED: positive for a left (counter-clockwise) turn (`src/bezeg/impl/curve/curvature.ts:6`). N is the LEFT normal \((-T_y,T_x)\), so it does not always point into the bend. The r0 claim that it does is false for κ<0, so do not repeat it.
- curvature scenes (`curveGeometryGuidedLessons.ts:228-247`): CUBIC (0,0),(1,0),(2,1),(3,3); S_CUBIC (0,0),(1,2),(2,-2),(3,0), inflection at t=0.5. The parabola is the default. Available scenes are: cubic t=0.5 with no frame or circle; cubic t=1 with frame only; cubic t=0 with frame and circle; parabola t=0.5 with frame and circle; S-cubic t=0.5 with frame and circle.
- Frame order is free: the adapter maps `step.frames` in order (`catalogLessonAdapter.ts:195`). Explanation → observation → calculation is allowed and keeps the calculation from spoiling the prediction.

## Checked maths

- bezier symmetric: \(B(\tfrac12)=\tfrac18(p_0+3p_1+3p_2+p_3)=(0,1)\). The weights \((1-t)^3, 3(1-t)^2t, 3(1-t)t^2, t^3\) are ≥0 and sum to 1. \(B(\tfrac12)\) moves by 3/8 (inner) or 1/8 (end) of a control point's displacement.
- curvature: \(\kappa(0)=\tfrac{n-1}{n}\tfrac{h}{a^2}\), giving 2/3 at the start. At the end, \(a=|p_3-p_2|=\sqrt5\) and \(h=\) the distance of \(p_1\) from the line \(p_2p_3\), \(=1/\sqrt5\), so \(\kappa(1)=\tfrac{2}{15\sqrt5}\approx0{,}0596\). The ratio is >10. For the cubic, κ(0) depends only on \(p_0,p_1,p_2\), and \(h\) is \(p_2\)'s height above the x-axis, so κ(0) is linear in it. The S-cubic has κ<0 before t=0.5 (right turn) and κ>0 after.
- A mirror-symmetric cubic traversed end to end has κ(0)=κ(1), with the same sign.
- After a cut, G1 smoothness at the junction holds when the orange piece's first inner point lies on the extension of the segment from the blue piece's last inner point through the junction.

## Lesson plans (agreed by this writer, ready to write)

- **bezier-pilot (6 steps):** The hook is "Krivulja zadene le dve od štirih točk. Kako si izbere pot in kam ne more?" The use is fonts and the pen tool in drawing programs.
  1. Symmetric scene: which points does the curve hit? Drag \(p_1\) up.
  2. Polygon only: endpoints are pinned. Drag \(p_2\), then \(p_3\). The curve leaves \(p_0\) heading toward \(p_1\).
  3. Polygon and hull: try to drag the curve out of the shaded area.
  4. Symmetric with \(B(\tfrac12)\): introduce \(t\) as the share of the trip. Predict, then drag \(p_1\), then \(p_3\), and watch \(B(\tfrac12)\) move less.
  5. Same scene: every point is a mix with non-negative weights summing to 1, so it cannot leave. Predict: is \(B(\tfrac12)\) at the rectangle centre? Reveal \((0,1)\). Calculation frame after the observation.
  6. Default scene with polygon and hull: payoff recap ("Pot si izbere tako, da …") and the challenge "naredi črko S": \(p_1\), \(p_2\) on opposite sides of the line \(p_0p_3\).
  The asymmetric scene is dropped.
- **subdivision-guided (5 steps):** The hook is "Ali lahko krivuljo prerežeš na dva kosa, ki sta spet Bézierjevi krivulji, oblika pa ostane ista? Kje dobiš njune točke?" The use is the knife/split tool in drawing programs.
  1. Cut-at-½ scene: count points per piece.
  2. Scheme at ½: follow the rows to \(p_0^3\), which is where blue turns orange.
  3. Scheme at ½: predict the blue piece's points. Reveal the first point of each row (\(p_0^0,p_0^1,p_0^2,p_0^3\)) and the last point of each row for orange. Calculation frame with coordinates after the observation.
  4. Scheme at 0.3: the student moves the slider and presses Subdiviziraj.
  5. Cut-at-0.3 scene: payoff "Da. …" and the challenge to break and then restore a smooth junction (the collinearity rule above).
- **curve-curvature-guided (5 steps):** The hook is "Začetek krivulje se zavije ostro, konec skoraj nič. Kako to izmeriš s številom in zakaj je tako?" The use is roads and rails, where curvature must change gradually.
  1. Cubic t=0.5 with no overlays: predict the sharper end and read κ at t=0 and t=1.
  2. Cubic t=0 with the circle: κ=1/R. Predict how R changes along t.
  3. Same scene: why. κ(0) depends only on \(p_0,p_1,p_2\). Predict, then drag \(p_2\) to about twice its height so κ roughly doubles. Dragging \(p_3\) changes nothing. Calculation frame with the formula and the end value after the observation.
  4. S-cubic: predict what κ does past the middle. It reaches 0, the readout shows the line message, the sign flips, and the circle jumps sides (prevoj).
  5. Cubic t=0: payoff "Zato, ker …" and the challenge to make both ends equally curved (symmetry).
  Parabola, angle φ and the full κ formula are dropped.
- **polynomial-zeros-guided:** source not yet read (`schoolFunctionGraphsBatchBGuidedLessons.ts:64`). Check zero labels, the merge behaviour and messages, derivative visibility, and the k control before writing. The planned hook is "Zakaj graf pri eni ničli seka os, pri drugi se je le dotakne? Ali to vidiš iz enačbe?" Drop the x=-1 aside, p'' and the y-intercept step. Have the student do the merge. End with a recap: odd crosses, even touches, higher is flatter, and the degree is the sum.

## Unconfirmed

- Where the tools panel sits relative to the lesson panel during a lesson. Wording "v orodjih ob grafu, skupina Uredi" is assumed.
- Whether point labels are visible by default (`settings.pointLabelsVisible`).
