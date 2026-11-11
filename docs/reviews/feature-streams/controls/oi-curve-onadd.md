# Curve workspace `onAdd` never refuses: closed by decision (no code change)

Question: can the curve workspace point collection's add exceed a limit or silently fail?

Evidence (all paths under src/):
- The add path is `BaseCurveGraph.addTypedPoint` (graphs/base/BaseCurveGraph.tsx:195-202), wired at :245. Its only
  collection (`CurvePointControls`) is mounted for structured-editing graphs (:242): Bezier, CurvatureBezier, comb (cubic only,
  CurveCombGraph.tsx:110), Envelope, Offset (bezier only), all on plain Bezier curves. PH has no point editing (BasePhBezierCurveGraph.tsx:44).
- Splines, rational/NURBS, B-spline and degree-reduction boards use `workspaceTypedPoints` (edit-only list, no `collection`),
  so no add reaches them; JXGBSplineCurve.addPoint (graphs/curves/object/JXGBSplineCurve.ts:69) throws but is unreachable here.
- Bezier add has no cap: AbstractJXGBezierCurve.addPoint (:68), AbstractJXGPointControlledCurve.addPoint (:164),
  abstract-point-controlled-curve.ts:162 contain no maximum, degree cap or throw. `placeNewPoint` (graphs/base/points/placement.ts:22)
  has no limit without `limit` option and is given none. Only a minimum exists (CURVE_POINTS_MIN, removal, :207).
- Interpolation and Hermite, which do have INTERPOLATION_POINTS_MAX, use their own collections that already refuse.

Decision: adding always succeeds meaningfully; nothing changed. The comment at BaseCurveGraph.tsx:201 stays accurate.
Not verified: no unit run (no code change).
