# Shared graph controls inventory

Task 0 of the [queue](README.md), against `master` at `8442fd6f`, 2026-11-07. The target for each capability is in the [catalogue](../../specs/shared-graph-controls.md#capability-catalogue); decided exceptions are in [Likely exceptions](../../specs/shared-graph-controls.md#likely-exceptions), and decisions in [Delegated decisions](../../specs/shared-graph-controls.md#delegated-decisions). Where this file and the spec differ, the spec holds.

Everything here was read from code unless marked as run. Evidence is in [the part files](../../reviews/feature-streams/controls/), with `file:line` references. Line numbers date from `8442fd6f`; locate code by search.

## Panels

A capability in no column is one the panel does not offer. All 134 rows were merged by script, keeping part 3b's row where a panel appeared twice. Of the 148 signal files, 146 are named here or in the part files; `CubicPhBezierCurveGraph` shares a combined PH row and `IntervalSweepGraph` is covered by `IntervalSweepControls`.

| Panel | Path | Shared | Local | Exception candidate |
| --- | --- | --- | --- | --- |
| Accumulation | AccumulationGraph.tsx:300-380 | C10, C8 (a, x) | C11 reveal button (:328) | none |
| ArcLength | ArcLengthGraph.tsx:160-192 | C8 (a, b), C13 (n) | none | none |
| AreaBetweenCurves | AreaBetweenCurvesGraph.tsx:185-220 | C10 (function, mode), C8 | none | none |
| BinomialNormal | BinomialNormalGraph.tsx:200-255 | C10, C11, C13 (n, p), C8 (p exact, k) | C20 "fit the view to the bars" react-bootstrap Button (:209) | none: remove, host Fit with `fitView` |
| Bisection | BisectionGraph.tsx:275-358 | C10, C8, C12 | C28 `formatPrecise` (9 decimals) | none |
| CLT | CltGraph.tsx:236-292 | C10, C11, C12, C13 (n, heights) | C22 private `notice` + `guarded` (:~99) | none |
| ConicFocal | ConicFocalGraph.tsx:245-318 | C10, C11, C13 (ε, ℓ, φ, weight) | C6 "matched weight" button, `aria-disabled` without a reason (:275); weight slider `disabled` (:270); `custom` option appended (:252) | none (P has only the slider as its path, see item 2) |
| Continuity | ContinuityGraph.tsx:120-153 | C13 | none | none |
| Convexity | ConvexityGraph.tsx:365-445 | C10, C8 (a, b, t) | C11 reveal button (:388) | none |
| Correlation | CorrelationGraph.tsx:375-454 | C1, C2, C5 (`CountSetter`), C4 (`PointListInput`), C10, C11 | C22 private notice; C18 drag refuses with notice (:244-252) | none |
| Darboux | DarbouxGraph.tsx:270-355 | C10, C8 (a, b), C8 (n as `NumberInput`) | C11 two reveal buttons (:304, :306); C6 Refine button native `disabled` + help (:292); n is a count by `NumberInput`, C5 candidate | none |
| DefiniteIntegral | DefiniteIntegralGraph.tsx:186-240 | C10 (function, method), C8, C13 (n) | none | none |
| DensityArea | DensityAreaGraph.tsx:155-211 | C10, C13 (μ, σ), C8 (a, b) | C20 "fit the view to the curve" Button (:164) | none: remove |
| Derivative | DerivativeGraph.tsx:140-187 | C10, C8 (x0), C13 (h), C11 | `stepOutOfBand` on the h slider (:155) | listed exception stays Slider-based |
| Epicycle | EpicycleGraph.tsx:470-629 | C10 (example, parametrization), C13 (N, time), C8 (handle coordinates) | C5 hand −1/+1 `Button`s beside the N slider, native `disabled` without reason (:488-491); C12 own Play/Pause `Button` + time slider (:609); C17 Shift+arrow handler (:515); C22 `rejectionValue` + `role=alert` (:589); C27 own scroll table | none |
| Euler | EulerGraph.tsx:280-360 | C10, C8 (x0, y0, end), C11 (exact) | C12 own Next step and Show all buttons, `aria-disabled` (:308-311); C13 step size = slider over an index into `STEP_SIZES` (:296) | none |
| ExponentialFunction | ExponentialFunctionGraph.tsx:90-125 | C13, C11 | none | none |
| Extrema | ExtremaGraph.tsx:365-448 | C10, C8 (a, b) | C11 reveal button (:387) | none |
| FixedPoint | FixedPointGraph.tsx:355-489 | C10, C8 (x0, digits), C12 | C11 reveal button (:388) | none |
| FourierCoefficients | FourierCoefficientsGraph.tsx:395-536 | C10 (view, scale, layout, term), C8 (handle values, K, decay N, harmonic), C11 | C17 Shift+arrow `onKeyDown` (:382, clamps silently at limit); four integer `NumberInput`s are counts, C5 candidates | none |
| FourierSeries | FourierSeriesGraph.tsx:320-420 | C10, C8 (x, ε) | C5 hand −/+ `count-setter-button` copy, `aria-disabled` + reason (:333-340); C20 two local view buttons "zoom to peak" / "whole view" (:359-360) | none; local view buttons are C20 candidates |
| FunctionInverse | FunctionInverseGraph.tsx:270-330 | C10, C8 (base, x0) | C11 two reveal buttons (:290, :294); C9 local Reset (:298) | none |
| FunctionTransformation | FunctionTransformationGraph.tsx:225-285 | C10, C8 (a, b, c, d, u) | C11 reveal (:247); C9 local Reset (:251) | none |
| GeometricSeries | GeometricSeriesGraph.tsx:260-325 | C10, C13 (a, q), C8 (terms, tolerance), C12 | none | none |
| LeastSquares | LeastSquaresGraph.tsx:255-348 | C1, C2, C5 (`CountSetter` points and degree, C26), C4 (`PointListInput`), C11, C13 | `ignoreOutOfDomain` around add/remove (:262) | none |
| LinearFunction | LinearFunctionGraph.tsx:165-215 | C8 (x1, y1, x2, y2, k, n) | `disabled` k and n fields when no line (:185, :188) | none |
| MeanValue | MeanValueGraph.tsx:300-403 | C10, C8 (a, b, c with ordering bounds) | C11 reveal (:324) | none |
| PolynomialZeros | PolynomialZerosGraph.tsx:283-334 | C10, C8 (k, zero positions) | `ZeroListEditor` (C1, C2, C4 local); C11 reveal (:299); C9 local Reset (:303) | zero list pairs z and multiplicity (see below) |
| Quadrature | QuadratureGraph.tsx:218-292 | C10 (rule, function), C8, C13 (n; `counts` per rule) | none | none |
| RationalFunction | RationalFunctionGraph.tsx:470-545 | C10, C8 (k), C13 (probe) | two `ZeroListEditor`s; C9 local Reset (:493) | zero list, as above |
| RootFinding | RootFindingGraph.tsx:262-361 | C10 (method, example), C8 (x0, x1), C12 | none | none |
| RungeInterpolation | RungeInterpolationGraph.tsx:212-277 | C10 (function, rule), C11 | C5 hand −/+ copy with `aria-disabled` (:225-231), a `NumberInput` between | none |
| Sequence | SequenceGraph.tsx:345-477 | C10, C8 (ε, L, threshold), C12 | C11 reveal (:381) | none |
| SummaryStatistics | SummaryStatisticsGraph.tsx:360-450 | C1, C2, C4 (`ValueListInput`), C10 (example, rule, σ), C11 | C1 local "Add value" button, `aria-disabled` (:374); C22 private notice + `guarded` (:95) | none |
| Taylor | TaylorGraph.tsx:320-433 | C10, C8 (center, x) | C5 hand −/+ copy with native `disabled` + describedby (:343-349); C11 reveal (:363) | none |
| TrigonometricFunctions | TrigonometricFunctionsGraph.tsx:158-208 | C10, C13 (A, ω, φ, midline), C11 | none | none |
| UniformConvergence | UniformConvergenceGraph.tsx:335-468 | C10, C8 (r, x, ε) | C5 hand −/+ copy (:361-367); C11 reveal (:381) | none |
| ZeroListEditor (panel part) | ZeroListEditor.tsx:60-106 | C10 (multiplicity select), C8 | C1 add button native `disabled` + reason (:100, :102); C2 per-row remove (:95), no reason at minimum; C22 own notice region (:59) | zero list pairs (below) |
| Point-set inspector (PS) | compgeo/PointSetControls.tsx | C7 notice line is its own | C1 Add toggle plus integer form; C2 selected/per-row/Delete; C3 Clear; C4 `IntegerField` (commits per keystroke, `:70-74`); C6 native `disabled`; C11 raw checkboxes (Closed, overlays); C14 pressed row buttons; C16 arrows; C18 snap with notice; C25 pressed mode group | Segment rows and interval rows (pairs, listed in spec) |
| PointSet graph (generic) | compgeo/PointSetGraph.tsx (no own panel) | none | keyboard `onKeyDown` `:520-538`; drag `:578-598`; notices `:169-190` | none |
| Orientation status + PS | compgeo/OrientationGraph.tsx:132 | C11 via PS | status paragraph only | none |
| PolygonArea Reverse + PS | compgeo/PolygonAreaGraph.tsx:67-72,172 | none | C6 native `disabled` Reverse; one-family action | Reverse order (spec "not catalogued") |
| PointInPolygon query | compgeo/PointInPolygonGraph.tsx:118-164,515 | none | C4 second `CoordinateField` (per keystroke, `:118-132`); C14 `aria-pressed` "select q"; C10 button row of two figures (`:156-160`); C16 arrows and Escape for q (`:419-436`); C7 notice `data-pip-notice`; C18 refusal at the limit | none |
| Voronoi / DegenerateSites | compgeo/VoronoiControls.tsx (+ VoronoiGraph.tsx:844) | C12 none | C4 query form `QueryFields` (text, Enter or Set button, `:75-96`); C9 Reset example, Reset view; C10 button rows (examples, mode); C14 `aria-pressed` site and triangle rows; C12 own construction Next/Back/Reset (`:114-120` of the tail chunk, `data-action=construct-*`, `aria-disabled`); C21 own hidden live status; C20 Reset view; C25 pressed mode group (`deg_mode_group`) | Reset view (frames the drawing's `frame`, not points) |
| Fortune | compgeo/FortuneControls.tsx | C12 `PlaybackButtons` | C9 Reset view (child of `PlaybackButtons`, `:187`); C10 button row; C21 own hidden status with nonce and mute (`:173-180`); C27 own step counter key `fortune_step_counter` | Reset view (frames the sweep box, `FortuneGraph.tsx:228`) |
| Delaunay | compgeo/DelaunayControls.tsx | C12 | C10 button row `:125-128`; C14 `aria-pressed` triangle row `:152`; C21 hidden status, mute | none |
| Triangulation (edge flip) | compgeo/TriangulationControls.tsx | none | C14 edge `<select>` (`:81`) with native `disabled` when no edges (C6); Flip uses `aria-disabled`; C7 `role=alert` refusal | Edge flip (one-family domain action; only C6 and C7 apply) |
| EarClipping | compgeo/EarClippingControls.tsx | C12 | C10 button row `:75-77`; C21 hidden status, mute | none |
| HullTrace | compgeo/HullTraceControls.tsx | C12, C10/C25 `ChoiceSelect` (algorithm, `:101`) | C21 hidden status, mute | none |
| HullRobustness | compgeo/HullRobustnessControls.tsx (+ graph `RobustnessModeSelect`, `KettnerControls`, `ChainChoices`) | `ChoiceSelect` x6 (mode, pop rule, duplicates, panel), `NumberInput` x2 (Kettner cell i, j; default per-change commit, `:135-138`), C25 | none found | none |
| BentleyOttmann | compgeo/BentleyOttmannControls.tsx | C12 | C21 hidden status, mute (`:143-145`); segment rows come from PS | segment rows (pairs) |
| IntervalSweep | compgeo/IntervalSweepControls.tsx | C12 | C21 hidden status, mute (`:107-109`); interval rows come from PS | interval rows (pairs) |
| MonotonePartition | compgeo/MonotonePartitionControls.tsx | C12 | C10 button row; C21 hidden status, mute (`:139-141`); C27 step counter counts from 0 (`:95`) | none |
| MonotoneTriangulation | compgeo/MonotoneTriangulationControls.tsx | C12 | C10 button row; C21 mute (`:149-151`); C27 from 0 (`:80`) | none |
| BezierHulls | compgeo/BezierHullsControls.tsx | C12 | C21 hidden status, mute (`:58-60`) | none |
| BezierClipping | compgeo/BezierClippingControls.tsx | C12 | C25 raw tolerance `<select>` (`:82`); C21 mute (`:124-126`) | none |
| EulerLine | compgeo/EulerLinePanel.tsx | none | C10 raw `<select>` (`:67-80`), `custom` option added only while active, `onChange` ignores unknown ids; C20 Show all (`:50`) | none (Show all removal: see item 3) |
| NotablePoints | compgeo/NotablePointsPanel.tsx | none | C10 raw `<select>`; C20 Show all | none (see item 3) |
| Simson | compgeo/SimsonLinePanel.tsx | none | C10 raw select; C25 raw mode select (`data-simson-mode`); C13 raw angle slider `step="any"` with degrees field (`:129-145`) and raw epsilon slider with 9 stops (corrected in Wave 2; `SIMSON_OFFSETS`); C4 `IntField` for P' (silent ignore out of range, `:176-188`); C17 slider keys arrow 1, Shift or Page 10 | none |
| InscribedAngle | compgeo/InscribedAnglePanel.tsx | none | C10 raw select; C13 copy of the angle slider + degrees field (`:53-95`); C17 same keys | none |
| Inversion | compgeo/InversionPanel.tsx | none | C10 raw select; C25 raw focus select and raw source-kind select; C14 `aria-pressed` angle-which buttons (`:135`); C4 different `IntField` (min/max, ignores out of range, Shift+arrow steps 10 clamped, `:164-186`) and point/circle fields; C13 raw theta slider + degrees field | none |
| CurvePair / TraceCurvePair | compgeo/CurvePairGraph.tsx, TraceCurvePairGraph.tsx | none | fixed point count (PS hides Add/Remove/Clear with the `fixed` notice) | none |
| CrossRatio | projective/CrossRatioControls.tsx | none | C10 pressed button row (`:62-66`); C14 `aria-pressed` row (`:88`); C4 `IntegerField` (per keystroke, `:27-45`); C16 arrows (`CrossRatioGraph.tsx:231-238`, no Shift, no Delete, no Escape); C18 silent clamp in `crossRatioEdit.ts:14,22`; C7 silent clamp | none |
| FivePoint | projective/FivePointControls.tsx | none | C10 pressed button row; C14 `aria-pressed` row; C4 `CoordinateField` (multiples of 1/15, per keystroke, `:40-58`); C14 raw `<select>` x3 for chord ends and third point; C11 raw checkbox (extrapolation); C16 arrows, Shift = 1 unit (`FivePointGraph.tsx:325-334`); silent clamp `fivePointEdit.ts:4,17` | none |
| Pascal | projective/PascalControls.tsx | none | C10 pressed button row; C25 conic row and order row are pressed rows (decision 9: becomes `ChoiceSelect`); C14 `aria-pressed` row; per-handle ◀ ▶ step buttons (`:65-66`); C16 arrows, Shift = `SHIFT_STEP` positions (`PascalGraph.tsx:305-312`) | Pascal stepping along a conic (listed) |
| PolePolar | projective/PolePolarControls.tsx | none | C10 pressed row; C25 conic row and finite/ideal row pressed; C14 `aria-pressed` P select; C4 `StepField` (scaled integer, per keystroke, `:37-56`); C16 arrows, Shift = 1 unit only for finite P (`PolePolarGraph.tsx:287-296`); silent clamp `polePolarEdit.ts:9,19,30` | none |
| ThreeViews | projective/ThreeViewsControls.tsx | none | C13 two raw range inputs (c in tenths, angle) with native `disabled` on the angle slider when the point is off (C6); C11 raw checkbox (point on); C16 arrows work without a selection and move c, Shift = 1 unit (`ThreeViewsGraph.tsx:217-224`); silent clamp `threeViewsEdit.ts:3,8` | none |
| CurveEvolute | curves/bezier/CurveEvoluteGraph.tsx:107-112 | C10, C11 | none | none |
| Decasteljau (+ Graph2) | curves/bezier/DecasteljauGraph.tsx:182-190, DecasteljauAnimationControls.tsx:34-56 | C11, C13 | C12 own button row, native `disabled` without reason, C6 (:37-46); `output aria-live` "t = 0.50" (:34) | none; C12 migration |
| Elevation (+ RationalElevation) | curves/bezier/ElevationGraph.tsx:42,102 | C11 | C15 raw `Button` Elevate (:103) | none |
| Extrapolation (+ Rational) | curves/bezier/ExtrapolationGraph.tsx:68-77 | C13 | C15 raw Button | none |
| Subdivision, Subdivision1 (+ Rational) | curves/bezier/SubdivisionGraph.tsx:107-119, SubdivisionGraph1.tsx:150-164 | C11, C13 | C15 raw Button | none |
| AffineTransforms | curves/bezier/AffineTransformsBezierCurveGraph.tsx:70-90 | none | ten `AffineActionButton`s | listed exception stays |
| Bezier (plain) | curves/bezier/BezierCurveGraph.tsx:7 | base panel (structured) | none | none |
| BSplineBasis | curves/bspline/BSplineBasisGraph.tsx:246-262 | C10 (degree select, C26 candidate), C11, C13, KnotEditor | `role=status` readout (:257), `role=alert` notice (:261) | knot vector (listed) |
| BSplineBlossom | curves/bspline/BSplineBlossomGraph.tsx:278-296 | degree and segment selects (C26), C13, C11 | C9 local Reset "Back to the default" (:296) | none |
| BSplineExtraction | curves/bspline/BSplineExtractionGraph.tsx:244-267 | C10 (example select), KnotEditor | C9 local Reset "Back to the example" (:248); per-piece "open as Bezier" buttons (:261) | none |
| BSplineInsertion | curves/bspline/BSplineInsertionGraph.tsx:256-285 | C10, `NumberInput` insert value (:259), C11, KnotEditor | C9 local Reset (:263); `role=alert` refusal (:266, C22 state field) | none |
| BSplineNurbs | curves/bspline/BSplineNurbsGraph.tsx:284-306 | C10, C11, C13, `NumberInput` weights (:299) | C9 local Reset (:306); `role=alert` refusal (:303) | none |
| DeBoor | curves/bspline/DeBoorGraph.tsx:319-345 | degree select (C26), `CountSetter` (:326), C13, PlaybackButtons (C12), KnotEditor | `role=status aria-live=polite` status (:343) | none |
| KnotEditor (helper in 4 B-spline panels) | curves/bspline/KnotEditor.tsx:30-54 | `NumberInput` per knot, arrow step 0.01 (C17), per-field refusal | | knot vectors (listed) |
| Hermite | curves/hermite/HermiteGraph.tsx:295-320 | C10, `CountSetter` (:303), `PointListInput`, C11, C13 | `role=alert` notice (:317, C22 state enum) | none |
| Interpolation | curves/interpolation/InterpolationGraph.tsx:266-290 | C10, `CountSetter` (:272), `PointListInput`, C11, C13 | `role=status` readout (:282), `role=alert` notice (:285) | none |
| PH (Base, Cubic, Quintic) | curves/ph/BasePhBezierCurveGraph.tsx:46-60 | `PointCoordinateEditor` for hodograph w only (:51), C11 | none | none |
| SubdivisionCurve | curves/subdivisionCurves/SubdivisionCurveGraph.tsx:340-370 | C10, C11, `CountSetter` (:344), `PointListInput` (:347), PlaybackButtons (C12) | playback Reset "Reset polygon" (:354); status group `aria-live` (:360); `role=alert` notice (:365) | none |
| TensorPatch | patches/TensorPatchPanels.tsx:101-208 | C13 (u, v), C11, C10 (density) | starting-patch Button row (:128, C10); C26 `DEGREES` select (:70); C14 `NO_INDEX` i/j selects; C4 `PointEditor` with Apply button (:86); C20 camera presets + "Reset view" + az/el sliders (:192-196) | patch point choice by index (listed); camera panel |
| TensorSubdivision | patches/TensorSubdivisionPanels.tsx:25-73 | C10, C13, C11 | C6 Elevate native `disabled`, reason in `role=status` help (:45-48) | none |
| TensorJoin | patches/TensorJoinPanels.tsx:21-173 | C10 (mode), C26 `DEGREES` copy (:68), C13, C11 | scene Button row (:21); capstone "Back to the two patches" (:34); B-point `PointEditor` + `NO_INDEX` selects (:97-116) | patch point choice by index |
| CoonsPatch | patches/CoonsPatchPanels.tsx:55-145 | C10 (shown), C11, C13 (camera) | C14 two selects with `NO_SELECTION` (:15, :73-76); `PointEditor` (:79); camera presets + "Reset view" (:131-135) | patch point choice by index; camera panel |
| TriangularPatch | patches/TriangularPatchPanels.tsx:83-169 | C10, C13 (u,v with coupled max, :96-98), C11, C26 `DEGREES` select (:92) | starting-patch Button row (:89); `NO_INDEX` barycentric select (:106); `PointEditor` (:110); camera panel copy (:155-165) | patch point choice by index; camera panel |
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
| Workspace shell: pan/zoom/Fit, inspector tabs, picker | base/DemonstrationWorkspace.tsx:231-238 (nav), :253 (tabs), :183 (switch) | none | C20 Fit button (:233); pan/zoom buttons natively `disabled` during a lesson, no reason (:234, C6); C25 tab group of pressed buttons (:253); Switch button uses `aria-disabled` + title reason (:182-186, the C6 target model) | none (host chrome) |
| Preset selector (Reset, Save, Delete, Export, Import, figures) | base/PresetSelector.tsx:211-258, ResetButton.tsx | none | C10 raw `Form.Select` with a "Default" entry (:224); C9 host Reset (:237); C6 `disabled={lessonActive}` on select, Reset, Save, Delete, Import, no reason; C7 problems in `role=alert` (:221) | none |
| Import presets dialog | base/PresetImportDialog.tsx:16,45 | none | react-bootstrap `Button`s, `disabled` without reason (C6) | none (not a graph control) |
| Save image (PNG, SVG) | base/SaveImage.tsx:23,29 | none | `Button disabled={exporting}` without reason (C6) | none |
| Coordinate system select | base/AxisSelector.tsx:21 | none | raw `Form.Select` (C10-style) | none: `ChoiceSelect` |
| Element size | base/SizeRange.tsx | C13 | none | none |
| Learning prompt | base/LearningPrompt.tsx:11 | none | one "Next prompt" button, `aria-live` paragraph (C21) | none |
| Curve picker and editing mode | base/BaseCurveGraph.tsx:150-195, :352 | C11 (point labels :197) | C14-like pressed row per curve + Clear selection (:159,:166); C25 board-tool pressed group (:188); mode buttons natively `disabled` with no curve selected, no reason (:188, C6) | C25 board tools stay a pressed group (decision 9) |
| Point coordinate editor | base/PointCoordinateEditor.tsx:12-68 | none | C4 form with "Apply all" (:34-40); C1 add-by-coordinates form (:49); C2 per-row Delete natively `disabled` at one point, no reason (:46); only refusal "enter finite numbers" `role=alert` (:62) | none: this is the C4 target |
| Selected-curve operations (panel A) | base/CurveWorkspaceControls.tsx:62-90 | C13, C11 (:81) | C15: raw `<button>` previews (`aria-pressed`) and apply buttons, preview state in the component | none, merge with B (C15) |
| Bezier curve controls (panel B) | base/controls/BezierCurveControls.tsx:104-142 | C13 | C15: react-bootstrap `Button` previews (`aria-pressed`); De Casteljau scheme a pressed Button, not `OnOffSwitch` (:132) | none, merge with A |
| Curve display switches | base/controls/CurveDisplayControls.tsx:34-52 | C11 | none | none |
| PH offsets | base/controls/PhBezierCurveControls.tsx:13-83 | C11, C5 (`CountSetter` min 1, no max, :61), C13 | lines switch natively `disabled` without reason (:36, C6) | none |
| Rational weights | base/controls/RationalBezierCurveControls.tsx:27-52 | C8 (`NumberInput`), C11 | C5-like hand stepper: two `Button`s -/+ 0.25 (:33,:41); Previous/Next weight (C14 candidate, :44-45); local Reset weight (:46); typed w <= 0 refused with `rejectedHint` (:36-40) | none (stepper is a C5 candidate; Reset weight see Local Reset) |
| Bernstein | bernstein/BernsteinGraph.tsx:221-232 | C5/C26 (`CountSetter`, degree 0..5, :228), C11 (:223) | none | none |
| Complex multiplication | complex/ComplexMultiplicationGraph.tsx:388-445 | C10, C8 (coordinates; modulus and argument `applyOn="confirm"`, :413-416) | C11 two raw reveal buttons, Show/Hide label swap (:434,:438); argument field natively `disabled` at w = 0 with help text (:417,:424); C21 status group re-read whole (:493) | none |
| Complex reciprocal | complex/ComplexReciprocalGraph.tsx:417-460 | C10, C8 (z, w, centre, radius) | C11 three raw reveal buttons (:453); C21 status group (:521) | none |
| Complex roots | complex/ComplexRootsGraph.tsx:313-355 | C10, C8 (w, test z), degree as `NumberInput` 2..8 (:329, C26 target `CountSetter`) | C11 three raw reveal buttons (:346); C21 status group (:403) | none |
| Linear map | linear/LinearMapGraph.tsx:371-420 | C10 (example, mode), C8 (four entries, `applyOn="confirm"`, :376) | **C9 local Reset "Reset to the identity"** (:409); C11 three raw `aria-pressed` buttons (:382); C22 private `notice` (:64,:403); typed clamp or snap with message (:137-145); C21 status group (:460) | typed clamp contradicts decision 3; decision 8 covers it |
| Drawing playground | src/learning/playground/DrawingPlayground.tsx:381-395 | none | own toolbar: Undo, Redo, Clear (C3), Add point (C1), Close, Delete point (C2), anchor-type pressed group, Load example; all natively `disabled`, no reason (C6); C16 keys (:293-330); C21 live summary (:376,:409) | whole playground: free-drawing model, see Exception candidates |
| Look underneath | src/learning/playground/LookUnderneath.tsx:123-150 | C13 (`Slider`, :146) | C11 four raw checkboxes (:129-135); Previous/Next segment natively `disabled` at the ends (C6) | none |
| Collision playground | src/learning/playground/collisions/CollisionPlayground.tsx:390-455 (row added in the learning sweep, 2026-11-09) | none | C10 method and overlay-stage radio groups; C11 raw bounce checkbox; C21 own `role=status` live div; Play, Step once (native `disabled` while playing), New arrangement (C12) | none |

The last column holds candidates as the workers proposed them; the spec records the decisions.

## Open items

1. **Uncovered areas.** Function bodies: part 1. Coons, Triangular and surface drag: part 3 (surface drag has no snap, limit or refusal, and arrows orbit the camera). Focus order, zoom and pan keys, hit-testing and the playground: part 4 (the board is not a Tab stop, so keyboard pan and zoom use the buttons; JSXGraph's own keys after a click are inferred).
2. **Typed paths.** Not confirmed: see the table below and [decision 4 of task 0](../../specs/shared-graph-controls.md#decided-in-task-0--2026-11-07). On function boards only ConicFocal P lacks typed coordinates, and its φ slider counts as its path.
3. **Show all against Fit.** Equal on Notable, not on EulerLine (nine-point markers on an obtuse triangle; H, G and O with the line on and the centres off). Part 2.
4. **Local Reset.** Tables in parts 1–4; decided in the spec.
5. **`DomainError` in a lesson.** The session restores its checkpoint and rethrows, and the lesson shows the reason with only Close. This holds at any step, because `refresh` catches it too. Part 4; handler checked.
6. **Refit after add.** Interpolation, Hermite and SubdivisionCurve refit unconditionally. Two lesson scenes reach these paths; none uses Subdivision. Part 3b has the worked view boxes, which are nominal: JSXGraph's fit to the canvas aspect was not checked, so task 2 smokes both scenes.
7. **Clamps and drag refusals.** Typed clamps: LinearMap and all four projective graphs. Silent ignores: Simson and Inversion `IntField`. Drag refusals with a notice: PointSet subclasses, Correlation, Summary statistics and the PointInPolygon and Voronoi query points. Silent mathematical drag refusals: `axisPoint` and B-spline knot markers. Parts 1–4.
8. **Runtime.** Run on a production build; see [the observations](../../reviews/feature-streams/controls/inventory-item-8.md). The spec's C21 and C27 corrections give the results. The check used port 4327, because another session's dev server held 4317. No screen reader was run.

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

## Unverified

- Voronoi and Fortune view-reset behaviour was read, not run.
- Custom option rendering in Simson, InscribedAngle and Inversion is inferred.
- Mathematical drag refusals inside `movePoint` on compgeo graphs were not all checked.
- Rational curve selectability and RationalCircleN draggability are inferred.
- Hermite tangent fields come from part 3 and were not re-read.
- Line numbers marked `~` in part 4 are approximate.

Part 3's rows for DegreeReduction and Evolute, and its starting view for item 6, are superseded by part 3b.
