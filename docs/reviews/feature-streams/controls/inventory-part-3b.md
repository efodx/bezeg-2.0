# Inventory part 3b: skim rows, typed paths, items 6 and 7

Read from code at the worktree head; nothing observed running. Paths relative to `src/graphs/`. Base panel means `BaseCurveGraph.workspaceEdit` in structured mode (`base/BaseCurveGraph.tsx:170-185`: curve picker, `CurveWorkspaceOperations`, `PointCoordinateEditor`, Move/Add/Delete group). In non-structured mode it renders the curve picker plus `getGraphCommandsArea` (`BaseGraph.tsx:427`, `:906`): the selected-curve tools when a curve is selected (`BaseCurveGraph.tsx:368-369`), otherwise the graph's `getGraphCommands`.

Classes returning true from `workspaceUsesStructuredEditing` (grep of `src/graphs`): BezierCurveGraph (`curves/bezier/BezierCurveGraph.tsx:7`), CurvatureOverlayGraph (`CurvatureBezierCurveGraph.tsx:35`; Evolute inherits it), CurveEnvelopeGraph (`:59`), CurveCombGraph (cubic kind, `:110`), CurveOffsetGraph (bezier kind, `:110`), BasePhBezierCurveGraph (`ph/BasePhBezierCurveGraph.tsx:42`; Cubic, Quintic, UniformParam inherit it). No other override.

## Panels

| Panel | Path | Shared | Local | Exception candidate |
| --- | --- | --- | --- | --- |
| CurveComb | curves/comb/CurveCombGraph.tsx:268-300 | base panel (cubic kind only), C10 (kind select :277), C11 (comb shown :280; Display: label all, hide fixed :295-298), C13 (gain, count, G1 b_i sliders :281-288), C21 | count is a `Slider` with step 1 (:283): C5 candidate | none |
| CurveEnvelope | curves/envelope/CurveEnvelopeGraph.tsx:233-250 | base panel, C11 (lines, curve, touch :239-244), C13 (line count step 1 :241, t :246), C21 | `CollinearNote` (:37); count as `Slider`: C5 candidate | none |
| CurveOffset | curves/offset/CurveOffsetGraph.tsx:310-335 | base panel (bezier kind only), C10 (kind :317), C11 (offset, cusps, speed plot :320-330), C13 (distance, samples step 1 :321-328), C21 | `SpeedFactorPlot` readout block; samples `Slider`: C5 candidate. PH kind: no point editing (:87) | none |
| CurveEvolute extras | curves/bezier/CurveEvoluteGraph.tsx:100-112 over CurvatureOverlayGraph :146-147, :165 | base panel (inherited), C13 (curvature t :165), C10 (trace select :108), C11 (normal switch :111), C21 | none | none. Part 3's Evolute row (C10, C11) omitted the base panel and the t slider |
| CurvatureBezier | curves/bezier/CurvatureBezierCurveGraph.tsx:146-170 | as part 3: base panel, C13, C21 | none | none |
| DegreeReduction | curves/reduction/DegreeReductionGraph.tsx:214-232 | C25 (mode select fixed/free :220), C11 (:224-226), C21, `ReadoutDetails` (C27) | none | none. Correction to part 3: the original cubic's control points ARE draggable (non-structured, :81; only add/delete removed and curve operations disabled :86-92). The header's "not draggable" (:53) means the reduced objects |
| AlphaParamBezier | curves/parametrisations/AlphaParamBezierCurveGraph.tsx:118-140 | C13 (alpha :131, sample count :136) | count as `Slider`: C5 candidate | none |
| SplineAlphaParametrization | curves/parametrisations/SplineAlphaParametrizationGraph.tsx:104-138 | C13 (alpha :129, count :134), spline Display switches | count as `Slider`: C5 candidate | none |
| UniformParamBezier | curves/parametrisations/UniformParamBezierCurveGraph.tsx:63, :140-160 | C10 (parametrisation :147), C13 (count :153, alpha :158), inherited PH hodograph group (`PointCoordinateEditor` for w) | count as `Slider`: C5 candidate | none |
| BaseRational, RationalBezier, RationalDecasteljau, RationalSubdivision2 | curves/rational/*.tsx | no own panel code beyond the Bezier siblings they extend, plus selected-curve weight tools: stepper, `NumberInput`, prev/next/reset (`base/controls/RationalBezierCurveControls.tsx:33-49`) | weight stepper group (C15/C4 neighbour) | none |
| RationalElevation | curves/rational/RationalElevationGraph.tsx:31-32 | selected-curve weight tools | C15 raw `Button` | none |
| RationalExtrapolation | curves/rational/RationalExtrapolationGraph.tsx:51-65 | C13 (t :53), weight tools | C15 raw `Button` (:59) | none |
| FarinPoints | curves/rational/FarinPointsCurveGraph.tsx:55-80 | C11 (Farin points, weights :65-70; standard form :71-77) | Farin weights are JSXGraph board sliders (`object/JXGRationalBezierCurve.ts:280-300`), pointer-driven | none |
| RationalCircleN | curves/rational/RationalBezierCurveCircleGraphN.tsx:36-47 | `CountSetter` (C5, min 3 :46) | none | none |
| C1Spline, C2Spline | curves/spline/C1SplineGraph.tsx, C2SplineGraph.tsx | spline Display group (`BaseSplineCurveGraph.tsx:54-60`, C11) | none | none |
| CnSpline | curves/spline/CnSplineGraph.tsx:50-65 | `CountSetter` x2 (continuity, degree; C5/C26) | used with `onPlus`/`onMinus`, no `onSet` | none |
| G1Spline | curves/spline/G1SplineGraph.tsx:29-60 | C13 (b_i sliders) | none | none |
| G1SymmetricSpline | curves/spline/G1SymmetricSplineGraph.tsx:20-51 | C13 (b_i sliders) | none | none |
| ParametricCurve | curves/parametric/ParametricCurveGraph.tsx:274-296 | C10 (curve select), C13 (t/theta, cycloid radius) | C12 own roll play `Button` (:293), label toggles | none; C12 migration |
| ArcLengthParametrization | curves/arclength/ArcLengthParametrizationGraph.tsx:380-410 | C10 (curve kind, mover mode), C13 (pieces, mover position; mover slider natively disabled while playing), C11 (3 switches), C21, `ReadoutDetails` | C12 raw `<button aria-pressed>` with native `disabled={reduced}` and a help line (:403-407) | none; C12 migration |
| TensorDeCasteljau | patches/TensorDeCasteljauPanels.tsx:15-22 | reuses `TensorPatchEditPanel`/`TensorPatchDisplayPanel` (`TensorDeCasteljauGraph.tsx:85-96`), so all TensorPatch cells apply (inferred from the reuse); plus C10 (order select), C11 (construction switch) | none | patch point choice by index; camera panel |
| TensorDerivatives | patches/TensorDerivativesPanels.tsx:12-62 | same `TensorPatchEditPanel` reuse (`TensorDerivativesGraph.tsx:98-108`), C11 (tangent plane, normal, twist) | corner button group (:12-17); `role=status` degeneracy line (:53) | patch point choice by index; camera panel |

Mechanical comparison: done by eye against the TSV listing of `curves` and `patches` `.tsx` paths, NOT scripted. No panel found missing: `TensorPatchGraph`, `TensorJoinGraph`, `TensorSubdivisionGraph`, `TriangularPatchGraph`, `BaseSurfaceGraph` are graph/host files whose panels are in the `*Panels.tsx` rows; `DecasteljauAnimationControls` is under Decasteljau; `CubicPh`/`QuinticPh` under PH.

## Typed paths

"Typed path" = the panel renders `PointCoordinateEditor`, `PointListInput`, `PointEditor`, `KnotEditor` or `NumberInput` for that quantity. Selected-curve tools (`base/controls/SelectedCurveControls.tsx:16-32`) add operations (`BezierCurveControls`, no coordinate field), a weight field (`RationalBezierCurveControls`) and PH controls. Read from code.

| Graph | Draggable points | Typed path | Evidence |
| --- | --- | --- | --- |
| BezierCurveGraph | all control points | typed coordinates (also add, delete) | `BezierCurveGraph.tsx:7`; `BaseCurveGraph.tsx:180-184` |
| CurvatureBezierCurve | all control points | typed coordinates | `CurvatureBezierCurveGraph.tsx:35,146-147` |
| CurveEvolute | all control points | typed coordinates (inherited) | `CurveEvoluteGraph.tsx:32`; no `workspaceEdit` override |
| CurveEnvelope | all control points | typed coordinates | `CurveEnvelopeGraph.tsx:59,233` |
| CurveComb | cubic: control points; G1: free spline points | cubic: typed coordinates; G1: none | `CurveCombGraph.tsx:110,268-288` |
| CurveOffset | bezier: control points; PH kind: none | bezier: typed coordinates; PH: none (curve fixed) | `CurveOffsetGraph.tsx:110`, :87 |
| DegreeReduction | the original cubic's points | none | `DegreeReductionGraph.tsx:81,86-92` |
| ArcLengthParametrization | curve control points (a drag pauses play) | none (mover slider moves the mover only) | `ArcLengthParametrizationGraph.tsx:147,380-410` |
| AffineTransformsBezierCurve | control points (inferred) | none | `AffineTransformsBezierCurveGraph.tsx:34,70-90` |
| Decasteljau, Decasteljau2 | control points | none | `DecasteljauGraph.tsx:134,186`, `DecasteljauGraph2.tsx:162,193` |
| Elevation | control points | none | `ElevationGraph.tsx:36,102` |
| Extrapolation | control points | none | `ExtrapolationGraph.tsx:68-77` |
| Subdivision, Subdivision1 | control points | none | `SubdivisionGraph.tsx:117`, `SubdivisionGraph1.tsx:159` |
| BSplineBasis | no control points; knot markers on the t axis | knots: typed (`KnotEditor`) | `BSplineBasisGraph.tsx:262`; `BSplineBasisScene.ts:133-140` |
| BSplineBlossom | control points | none | `BSplineBlossomScene.ts:125`; no `KnotEditor` |
| BSplineExtraction | control points | points none; knots `KnotEditor` | `BSplineExtractionScene.ts:109`; `BSplineExtractionGraph.tsx:267` |
| BSplineInsertion | control points | points none; knots `KnotEditor`; insert value `NumberInput` | `BSplineInsertionScene.ts:122`; `BSplineInsertionGraph.tsx:259,285` |
| BSplineNurbs | control points | points none; weights `NumberInput` (:299); no `KnotEditor` | `BSplineNurbsScene.ts:74` |
| DeBoor | control points | points none; knots `KnotEditor` | `DeBoorScene.ts:146`; `DeBoorGraph.tsx:345` |
| HermiteGraph | points, tangent handles (inferred) | typed coordinates, points and tangents (`PointListInput`) | `HermiteGraph.tsx:198,296-305`; part 3, not re-read |
| InterpolationGraph | points | typed coordinates (`PointListInput`) | `InterpolationGraph.tsx:266-290` |
| SubdivisionCurveGraph | polygon vertices | typed coordinates (`PointListInput`) | `SubdivisionCurveGraph.tsx:340-370` |
| ParametricCurve | none (scene points `fixed: true`) | parameter control: the t/theta `Slider` fully sets the traced point | `ParametricScene.ts:76-124`; `ParametricCurveGraph.tsx:284-290` |
| AlphaParamBezierCurve | control points | none | `AlphaParamBezierCurveGraph.tsx:118-140` |
| SplineAlphaParametrization | free spline points | none | `SplineAlphaParametrizationGraph.tsx:104-138` |
| UniformParamBezierCurve | none on the main board; w on the aux board | w typed (`PointCoordinateEditor` prefix w); start point none | inherits `BasePhBezierCurveGraph.tsx:48-51` |
| BasePh, CubicPh, QuinticPh | none on the main board, start point included; w on the aux board | w typed (:51); start point none | see PH start point |
| BaseRational, RationalBezier, RationalDecasteljau, RationalSubdivision2 | control points | points none; weight `NumberInput` + stepper | `RationalBezierCurveControls.tsx:33-49` |
| RationalElevation, RationalExtrapolation | control points | points none; weights as above | `RationalElevationGraph.tsx:31`, `RationalExtrapolationGraph.tsx:51` |
| FarinPoints | control points; Farin sliders on the board | points none; weights as above | `FarinPointsCurveGraph.tsx:25,70` |
| RationalCircleN | control points (inferred) | none; piece count `CountSetter` | `RationalBezierCurveCircleGraphN.tsx:36-47` |
| C1Spline, C2Spline | free spline points; junctions are function-bound | none | `AbstractJXGSplineCurve.ts:37,138` |
| CnSpline | free spline points | none | `CnSplineGraph.tsx:50-65` |
| G1Spline, G1SymmetricSpline | free spline points | none (b_i sliders are parameters) | `G1SplineGraph.tsx:29-60`, `G1SymmetricSplineGraph.tsx:20-51` |

Typed coordinates for points: Bezier, Curvature, Evolute, Envelope, Comb (cubic), Offset (bezier), Interpolation, Hermite, SubdivisionCurve. Keyboard parameter control that fully sets the point: Parametric only. All other point graphs: none (inferred: I found no key handler on curve boards).

**PH start point: not draggable, no typed path** (code, not run). `getInitialCurve` makes every main-board point from functions (`object/JXGPHBezierCurve.ts:136`); JSXGraph treats function-coordinate points as constrained (`node_modules/jsxgraph/src/base/coordselement.js:2515-2520`); `CurveOffsetGraph.tsx:87` says "its board points do not drag, on this route or the PH routes". Editable: only w and the offset distance. Contradiction: `docs/specs/ph-arc-length-and-elevation-overlay.md:15` says arc length updates "while dragging the start point". Whole-curve move through the frame was not checked.

## Item 6

Confirmed from part 3 line 62: all three `addPoint` end in unconditional `fit()` (`InterpolationGraph.tsx:203-212`, `HermiteGraph.tsx:231-241`, `SubdivisionCurveGraph.tsx:250-259`). Each `fit()` is the graph's own: `interpolationViewBox` (`InterpolationGraph.tsx:35-41`, margin 0.45 of the larger span), `hermiteViewBox` (`hermiteModel.ts:157-165`, includes tangent tips, margin 0.3), `subdivisionViewBox` (`subdivisionModel.ts:126-133`); each `setBoundingBox(box, true)`.

Lesson actions reaching them: `interpolation`/`add-point` (`InterpolationGraph.tsx:249-250`) and `hermite`/`add-point` (`HermiteGraph.tsx:280-281`); none for Subdivision (`SubdivisionCurveGraph.tsx:304-316`). Under `src/learning` only `interpolationGuidedLessons.ts:30` and `:231` emit them; the scenes are `interp-fifth-point-added` (:182-184) and `hermite-locality-six` (:351, two adds). Part 3's two cases are confirmed; none missed.

Correction to part 3's reasoning: the view before the add is not the default `[-5,5,5,-5]`. Each lesson scene begins with `prepared-scene` `demonstration-default`, which calls `prepareLessonDefaultScene` then `fit()` on the default points (`InterpolationGraph.tsx:81-84`, `HermiteGraph.tsx:72-75`). Default points (0,0),(1,2),(3,3),(4,0) (`interpolationModel.ts:25-27`, `hermiteModel.ts:38-40`). Boxes are nominal `[left, top, right, bottom]`, before JSXGraph adapts them to the canvas aspect (inferred, canvas size unknown). All arithmetic by hand.

- Interpolation `interp-fifth-point-added`: before, x 0..4, y 0..3, margin 1.8: `[-1.8, 4.8, 5.8, -1.8]`. Added (5,0) is inside (5 <= 5.8). Today's refit: margin 2.25, `[-2.25, 5.25, 7.25, -2.25]`. Under decision 6 the view stays `[-1.8, 4.8, 5.8, -1.8]`: the scene's view changes.
- Hermite `hermite-locality-six` (catmull-rom, uniform, tension 1; tangents `analysis/hermite.ts:84-96`): before, points x 0..4, tips (1,2),(2.5,3.5),(4.5,2),(5,-3), margin 1.95: `[-1.95, 5.45, 6.95, -4.95]`. Add 1, (5,0): inside. Add 2, (6,0): inside (6 <= 6.95). Today's final refit (tips reach (7,0); y -1.5..3.5; margin 2.1): `[-2.1, 5.6, 9.1, -3.6]`. Under decision 6 (point only; spec text "an added or typed point", `shared-graph-controls.md:69`) no refit happens and the final view stays `[-1.95, 5.45, 6.95, -4.95]`, with the last tangent tip (7,0) 0.05 beyond the right edge. So part 3's "final view likely equal" is wrong: this view changes too. If tips counted as "the point", add 2 would refit instead; the handler should decide.
- SubdivisionCurve: no lesson uses add. Import and `prepareLessonDefaultScene` fits are not add paths.

## Item 7

- **Knot marker drag (BSplineBasis), code.** `draggedKnots` (`bsplineBasisModel.ts:65-73`): snapped to 0.01 (`snapKnot` :50-53), clamped between neighbours (may equal them) and to +-100 (`KNOT_LIMIT` :16); an unchanged or invalid result (multiplicity above k+1, empty domain) returns undefined. `dragKnot` returns false with no notice (`BSplineBasisGraph.tsx:212-217`) and the scene moves the marker back (`BSplineBasisScene.ts:186-195`). Clamp is silent (decision 3 holds); the refused case is silent too (decision 7 wants a reason). Markers are `fixed` when normalised (:136, :193), silently. Typed knots are validated, not clamped, with a reason (`editedKnots` :78-85; `BSplineBasisGraph.tsx:223-227`).
- **Spline drags, code.** Free points move unconstrained: no clamp, snap or refusal in the spline object classes; no `snapToGrid` outside compgeo (grep). Junction points are function-bound (`AbstractJXGSplineCurve.ts:138`) and cannot be dragged.
- **Rational drags, code.** Control points drag unconstrained. Typed weight must be positive, with a field hint (`RationalBezierCurveControls.tsx:38-40`). Farin board sliders (`JXGRationalBezierCurve.ts:280-300`) have no keyboard path found (inferred).
- **Nurbs `KnotEditor`:** not rendered (no import or use in `BSplineNurbsGraph.tsx`). Rendered by Basis, Extraction, Insertion, DeBoor.

## Handoff

Stopped on the budget signal after all four sections were written. Not done: the TSV comparison was by eye, not scripted; Hermite tangent-handle drag and typed tangent fields were taken from part 3, not re-read; rational curve selectability (weight tools) per graph and RationalCircleN draggability are inferred; no spec or runtime check of canvas aspect for the view boxes.
