# 08 triage (task 08 step 1)

Generated 2026-11-25 on `board-workspace-2` (after the 03-07 release) by `08-triage.cjs`, `08-triage-md.cjs`, `08-triage-sections.cjs` from `inventory-2026-11-25.json` (fresh `node scripts/inventory/inventory.cjs`: 138 demonstrations, 29 components, 80 ignoring hubs; the run overwrote `inventory.json` and `inventory.md` in place). Heuristics over source text, no browser; the table says which class rule fired.

## Counts (a demonstration carries several classes)

| Class | n | Rule |
|---|---|---|
| declared (pilots) | 10 | graph file overrides `declaration()`: BisectionGraph, DecasteljauGraph, FunctionTransformationGraph, LinearMapGraph, CoonsPatchGraph, PhasePortraitGraph, CrossRatioGraph, TaylorGraph, NotablePointsGraph (9 files); plus `rational-decasteljau`, which inherits De Casteljau's declaration unreviewed (guide section 6). The task text says eight pilots; the tree holds nine declaring files |
| plain | 38 | none of the classes below |
| several modes | 45 | a ChoiceSelect whose catalog key names mode, view, kind, type, system, variant, method, family, style or display |
| expensive redraw | 16 | candidate only: 20 or more sampling, grid, simulation, contour or refine words in the graph file; needs a measurement before it counts |
| playback | 38 | scope file imports PlaybackButtons, AnimationDriver, useLease or the animation runtime |
| board-drawn legend | 3 | regex found legend text drawn with `board.create('text')`; weak: the inventory counts 42 demonstrations with legend entries but does not tell where they are drawn, so the converter checks each |
| point-set | 22 | PointSetGraph chain or mouse position read (inventory flag) |
| curve control points | 32 | shares CurveWorkspaceControls/CurvePointControls (Bezier, rational, spline, PH graphs), not in point-set |
| surface | 8 | BaseSurfaceGraph chain (patch-*, solids) |
| controls outside BaseGraph | 0 registered | the Playground: see section c |
| needs a contract change | 15 | hard gaps of section c (3D camera or second board, vector-valued parameter) |

Prototype declarations to port: 27 graph files carry `workspaceUx` at `aff6df6c` (the task says 29: the commit has 29 files with the string, of which `BaseGraph.tsx` and `DemonstrationWorkspace.tsx` are infrastructure, so 27 graph files; ids: bisection, circle-construction, contour-map, curve-kinematics, decasteljau, fixed-point, fourier-series, function-inverse, function-transformation, geometric-series, interp-lagrange, isometries, lattice-paths, linear-function, phase-portrait, point-in-polygon, prob-density, quadrature, rational-function, recursion-cobweb, spline-c1, subdivision, taylor, triangle-solver, trigonometric-functions, voronoi, waves). Of those, already converted on master: bisection, decasteljau, function-transformation, phase-portrait, taylor.

Legend of the table: **mode / exp / play / legend / pts / curve / surf / CONTRACT / DECL** as above. S/C/Ch/T = slider (incl. AngleSlider), CountSetter, choice (ChoiceSelect, select), toggle (OnOffSwitch, BooleanField, checkbox); own count, `+Ni` inherited from a base class or panel. `proto` Y = graph file has a prototype declaration, b = shares a prototype-declared base file. Lessons: lesson or chapter file; panels: shared files with fewer than 20 users (hubs FunctionReadout, BaseFunctionGraph, BaseCurveGraph, Commands, CurvePointControls, CurveWorkspaceControls, FunctionStatus omitted). `(cap n)` = board captions found. Gaps: soft ones named inline (equalAxisUnits, own AnimationDriver).

## Table (one row per demonstration)

| id | graph file | base | classes | S/C/Ch/T | proto | lessons | panels (shared, <20 users) | gaps (file:line) |
|---|---|---|---|---|---|---|---|---|
| accumulation | functions/AccumulationGraph.tsx | BaseFunctionGraph | plain | 2/0/1/0 |  | analysisGuidedLessons | - | - (cap 2) |
| affine | curves/bezier/AffineTransformsBezierCurveGraph.tsx | BaseBezierCurveGraph | curve | 0/0/0/0+1i |  | expansionGuidedLessons,activities | - | - |
| arc-length | functions/ArcLengthGraph.tsx | BaseFunctionGraph | plain | 3/0/0/0 |  | functionGuidedLessons | - | - (cap 1) |
| arc-length-param | curves/arclength/ArcLengthParametrizationGraph.tsx | BaseCurveGraph | mode,play,curve | 2/0/2/3+1i |  | arcLengthGuidedLessons | ReadoutDetails,ArcSpeedPlot | own AnimationDriver: curves/arclength/ArcLengthParametrizationGraph.tsx |
| area-between-curves | functions/AreaBetweenCurvesGraph.tsx | BaseFunctionGraph | mode | 2/0/1/0 |  | functionGuidedLessons | - | - (cap 2) |
| bernstein | bernstein/BernsteinGraph.tsx | BaseGraph | plain | 0/1/0/1 |  | foundationGuidedLessons,activities | - | - (cap 1) |
| bezier | curves/bezier/BezierCurveGraph.tsx | BaseBezierCurveGraph | curve | 0/0/0/0+1i |  | guidedLessons,activities | - | - |
| bezier-clipping | compgeo/BezierClippingGraph.tsx | TraceCurvePairGraph | mode,play,pts | 0/0/0+2i/0+2i |  | bezierClippingGuidedLessons | BezierClippingControls,CurvePairGraph,TraceCurvePairGraph | - (cap 1) |
| bezier-hulls | compgeo/BezierHullsGraph.tsx | TraceCurvePairGraph | mode,play,pts | 0/0/0+1i/0+2i |  | compgeoGuidedLessons | BezierHullsControls,CurvePairGraph,TraceCurvePairGraph | - (cap 1) |
| bisection | functions/BisectionGraph.tsx | IterativeFunctionGraph | DECL,play | 2/0/1/0 | Y | analysisGuidedLessons | IterativeFunctionGraph | equalAxisUnits=false: functions/BisectionGraph.tsx:91 (cap 1) |
| bspline-basis | curves/bspline/BSplineBasisGraph.tsx | BaseGraph | CONTRACT | 1/1/0/2 |  | bsplineBasisGuidedLessons | KnotEditor | equalAxisUnits=false: curves/bspline/BSplineBasisGraph.tsx:88; vector/table-valued parameter: curves/bspline/KnotEditor.tsx:42 |
| bspline-blossom | curves/bspline/BSplineBlossomGraph.tsx | BaseGraph | plain | 1/1/1/1 |  | bsplineBlossomGuidedLessons | BSplinePointList | point/point-set parameter kind: curves/bspline/BSplinePointList.tsx:12 |
| bspline-deboor | curves/bspline/DeBoorGraph.tsx | BaseGraph | play,CONTRACT | 1/2/0/0 |  | bsplineDeBoorGuidedLessons | BSplinePointList,KnotEditor | point/point-set parameter kind: curves/bspline/BSplinePointList.tsx:12; vector/table-valued parameter: curves/bspline/KnotEditor.tsx:42 |
| bspline-extraction | curves/bspline/BSplineExtractionGraph.tsx | BaseGraph | CONTRACT | 0/0/1/0 |  | bsplineExtractionGuidedLessons | BSplinePointList,KnotEditor | point/point-set parameter kind: curves/bspline/BSplinePointList.tsx:12; vector/table-valued parameter: curves/bspline/KnotEditor.tsx:42 |
| bspline-insertion | curves/bspline/BSplineInsertionGraph.tsx | BaseGraph | CONTRACT | 0/0/1/1 |  | bsplineInsertionGuidedLessons | BSplinePointList,KnotEditor | point/point-set parameter kind: curves/bspline/BSplinePointList.tsx:12; vector/table-valued parameter: curves/bspline/KnotEditor.tsx:42 |
| bspline-nurbs | curves/bspline/BSplineNurbsGraph.tsx | BaseGraph | plain | 1/0/1/1 |  | bsplineNurbsGuidedLessons | BSplinePointList | point/point-set parameter kind: curves/bspline/BSplinePointList.tsx:12 |
| circle | curves/rational/RationalBezierCurveCircleGraphN.tsx | BaseRationalCurveGraph | curve | 0/1/0/0+1i |  | rationalConstructionGuidedLessons | - | - |
| circle-construction | compgeo/CircleConstructionGraph.tsx | BaseGraph | mode | 2/0/1/0 | Y | circleGeometryGuidedLessons,circleGeometryGuidedLessons,circleGeometryGuidedLessons,circleGeometryGuidedLessons | - | point/point-set parameter kind: compgeo/CircleConstructionGraph.tsx:985 (cap 1) |
| complex-euler | complex/EulerCircleGraph.tsx | BaseGraph | play | 3/1/0/3 |  | complexEulerGuidedLessons | - | - (cap 1) |
| complex-multiplication | complex/ComplexMultiplicationGraph.tsx | BaseFunctionGraph | plain | 2/0/1/0 |  | foundationGuidedLessons | - | point/point-set parameter kind: complex/ComplexMultiplicationGraph.tsx:400 (cap 2) |
| complex-power | complex/ComplexPowerGraph.tsx | BaseGraph | play | 0/1/0/0 |  | complexPowerGuidedLessons | - | point/point-set parameter kind: complex/ComplexPowerGraph.tsx:621 (cap 1) |
| complex-reciprocal | complex/ComplexReciprocalGraph.tsx | BaseFunctionGraph | plain | 1/0/1/0 |  | complexMapsChapterLessons | - | point/point-set parameter kind: complex/ComplexReciprocalGraph.tsx:433 (cap 2) |
| complex-roots | complex/ComplexRootsGraph.tsx | BaseFunctionGraph | plain | 0/1/1/0 |  | complexMapsChapterLessons | - | point/point-set parameter kind: complex/ComplexRootsGraph.tsx:325 (cap 2) |
| conic-focal | functions/ConicFocalGraph.tsx | BaseFunctionGraph | plain | 4/0/1/1 |  | schoolFunctionGraphsBatchCGuidedLessons | - | - (cap 1) |
| continuity | functions/ContinuityGraph.tsx | BaseFunctionGraph | plain | 1/0/0/0 |  | functionGuidedLessons | - | - (cap 1) |
| contour-map | levelsets/ContourMapGraph.tsx | BaseGraph | mode,exp,play,legend | 4+3i/1/3/1 | Y | levelSetsContourGuidedLessons,levelSetsContourGuidedLessons,levelSetsOptimizationGuidedLessons,levelSetsOptimizationGuidedLessons | ContourPanels,SurfaceCameraPanel | point/point-set parameter kind: levelsets/ContourMapGraph.tsx:1237; own AnimationDriver: levelsets/ContourMapGraph.tsx (cap 2) |
| convex-hull | compgeo/HullTraceGraph.tsx | PointSetGraph | mode,play,pts | 0/0/0+2i/0+2i |  | compgeoGuidedLessons | HullTraceControls | - (cap 1) |
| convexity | functions/ConvexityGraph.tsx | BaseFunctionGraph | plain | 3/0/1/0 |  | analysisGuidedLessons | - | - (cap 3) |
| counting-tree | combinatorics/CountingTreeGraph.tsx | BaseGraph | mode | 1/3/2/2 |  | combinatoricsGuidedLessons,combinatoricsRowGuidedLessons | - | - (cap 1) |
| curve-comb | curves/comb/CurveCombGraph.tsx | BaseCurveGraph | curve | 3/0/1/3+1i |  | curveGeometryGuidedLessons | - | - |
| curve-curvature | curves/bezier/CurvatureBezierCurveGraph.tsx | CurvatureOverlayGraph | curve | 0+1i/0/0/0+1i |  | curveGeometryGuidedLessons | CurvatureBezierCurveGraph | - |
| curve-envelope | curves/envelope/CurveEnvelopeGraph.tsx | BaseBezierCurveGraph | curve | 2/0/0/3+1i |  | curveGeometryGuidedLessons | - | - |
| curve-evolute | curves/bezier/CurveEvoluteGraph.tsx | CurvatureOverlayGraph | curve | 0+1i/0/1/1+1i |  | curveGeometryGuidedLessons | CurvatureBezierCurveGraph | - |
| curve-kinematics | curves/kinematics/KinematicsGraph.tsx | BaseGraph | play | 2/0/1/5 | Y | kinematicsDecompositionGuidedLessons,kinematicsGuidedLessons,kinematicsGuidedLessons,kinematicsGuidedLessons,kinematicsGuidedLessons | - | own AnimationDriver: curves/kinematics/KinematicsGraph.tsx (cap 2) |
| curve-offset | curves/offset/CurveOffsetGraph.tsx | BaseCurveGraph | exp,curve | 2/0/1/3+1i |  | curveGeometryGuidedLessons | SpeedFactorPlot | - |
| curve-parametric | curves/parametric/ParametricCurveGraph.tsx | BaseGraph | play | 2/0/1/0 |  | curveGeometryGuidedLessons | - | own AnimationDriver: curves/parametric/ParametricCurveGraph.tsx |
| darboux | functions/DarbouxGraph.tsx | BaseFunctionGraph | plain | 2/1/1/0 |  | analysisGuidedLessons | - | - (cap 1) |
| decasteljau | curves/bezier/DecasteljauGraph.tsx | BaseBezierCurveGraph | DECL,play,curve | 0+2i/0/0/1+1i | Y | guidedLessons,activities | DecasteljauAnimationControls | - |
| decasteljau-alternative | curves/bezier/DecasteljauGraph2.tsx | BaseBezierCurveGraph | play,curve | 0+2i/0/0/0+1i |  | rationalConstructionGuidedLessons | DecasteljauAnimationControls | own AnimationDriver: curves/bezier/DecasteljauGraph2.tsx |
| definite-integral | functions/DefiniteIntegralGraph.tsx | BaseFunctionGraph | mode | 3/0/2/0 |  | functionGuidedLessons | - | - (cap 1) |
| delaunay | compgeo/DelaunayGraph.tsx | TriangulationGraph | mode,play,pts | 0/0/0+3i/0+2i |  | compgeoGuidedLessons | DelaunayControls,ExampleSelect,TriangulationControls,TriangulationGraph | - (cap 4) |
| derivative | functions/DerivativeGraph.tsx | BaseFunctionGraph | plain | 2/0/1/1 |  | functionGuidedLessons | - | - (cap 1) |
| ear-clipping | compgeo/EarClippingGraph.tsx | PointSetGraph | mode,play,pts | 0/0/0+2i/0+2i |  | compgeoGuidedLessons | EarClippingControls,ExampleSelect | - (cap 2) |
| elevation | curves/bezier/ElevationGraph.tsx | BaseBezierCurveGraph | curve | 0/0/0/1+1i |  | additionalGuidedLessons | - | - |
| epicycles | functions/EpicycleGraph.tsx | BaseFunctionGraph | exp,play | 2/0/2/0 |  | epicyclesGuidedLessons | - | point/point-set parameter kind: functions/EpicycleGraph.tsx:527; own AnimationDriver: functions/EpicycleGraph.tsx (cap 1) |
| euler-line | compgeo/EulerLineGraph.tsx | PointSetGraph | mode,pts | 0/0/0+2i/0+2i |  | triangleGeometryChapterLessons | EulerLinePanel | - (cap 2) |
| euler-method | functions/EulerGraph.tsx | BaseFunctionGraph | plain | 2/0/1/1 |  | numericalEulerGuidedLesson | - | point/point-set parameter kind: functions/EulerGraph.tsx:298 (cap 1) |
| exponential-function | functions/ExponentialFunctionGraph.tsx | BaseFunctionGraph | plain | 1/0/0/1 |  | functionGuidedLessons | - | - (cap 1) |
| extrapolation | curves/bezier/ExtrapolationGraph.tsx | BaseBezierCurveGraph | curve | 0/0/0/0+1i |  | constructionGuidedLessons | - | - |
| extrema | functions/ExtremaGraph.tsx | BaseFunctionGraph | plain | 2/0/1/0 |  | analysisGuidedLessons | - | - (cap 3) |
| farin | curves/rational/FarinPointsCurveGraph.tsx | BaseRationalCurveGraph | curve | 0/0/0/2+1i |  | rationalConstructionGuidedLessons | - | - |
| fixed-point | functions/FixedPointGraph.tsx | IterativeFunctionGraph | play | 1/1/1/0 | Y | analysisGuidedLessons | IterativeFunctionGraph | - (cap 2) |
| fortune | compgeo/FortuneGraph.tsx | PointSetGraph | mode,play,pts | 0/0/0+2i/0+2i |  | compgeoGuidedLessons | ExampleSelect,FortuneControls | - (cap 1) |
| fourier-coefficients | functions/FourierCoefficientsGraph.tsx | BaseFunctionGraph | mode | 2/2/5/1 |  | fourierCoefficientsGuidedLessons | FourierDecaySpectra,FourierSpectrumBars | equalAxisUnits=false: functions/FourierCoefficientsGraph.tsx:109 (cap 1) |
| fourier-series | functions/FourierSeriesGraph.tsx | BaseFunctionGraph | plain | 2/1/1/0 | Y | fourierSeriesGuidedLessons | - | equalAxisUnits=false: functions/FourierSeriesGraph.tsx:94 (cap 1) |
| function-inverse | functions/FunctionInverseGraph.tsx | BaseFunctionGraph | plain | 2/0/1/0 | Y | schoolFunctionGraphsGuidedLessons | - | - (cap 1) |
| function-transformation | functions/FunctionTransformationGraph.tsx | BaseFunctionGraph | DECL,plain | 2/0/1/0 | Y | schoolFunctionGraphsGuidedLessons | - | - (cap 1) |
| geometric-series | functions/GeometricSeriesGraph.tsx | IterativeFunctionGraph | play | 3/1/1/0 | Y | schoolFunctionGraphsBatchCGuidedLessons | IterativeFunctionGraph | equalAxisUnits=false: functions/GeometricSeriesGraph.tsx:76 (cap 1) |
| hull-robustness | compgeo/HullRobustnessGraph.tsx | HullTraceGraph | mode,play,pts | 0+2i/0/0+6i/0+2i |  | compgeoGuidedLessons | HullRobustnessControls,HullTraceControls,HullTraceGraph | - (cap 1) |
| inscribed-angle | compgeo/InscribedAngleGraph.tsx | PointSetGraph | mode,pts | 0+1i/0/0+2i/0+2i |  | triangleGeometryChapterLessons | InscribedAnglePanel | - (cap 2) |
| interp-hermite | curves/hermite/HermiteGraph.tsx | BaseGraph | mode | 1/0/2/2 |  | interpolationGuidedLessons | - | point/point-set parameter kind: curves/hermite/HermiteGraph.tsx:338 |
| interp-lagrange | curves/interpolation/InterpolationGraph.tsx | BaseGraph | plain | 1/0/1/3 | Y | interpolationGuidedLessons | BasisPlot | point/point-set parameter kind: curves/interpolation/InterpolationGraph.tsx:307 |
| interp-least-squares | functions/LeastSquaresGraph.tsx | BaseFunctionGraph | plain | 2/2/0/3 |  | interpolationLeastSquaresLesson | - | point/point-set parameter kind: functions/LeastSquaresGraph.tsx:265; equalAxisUnits=false: functions/LeastSquaresGraph.tsx:53 (cap 1) |
| interp-runge | functions/RungeInterpolationGraph.tsx | BaseFunctionGraph | plain | 0/1/2/2 |  | interpolationGuidedLessons | - | equalAxisUnits=false: functions/RungeInterpolationGraph.tsx:102 (cap 1) |
| interp-subdivision | curves/subdivisionCurves/SubdivisionCurveGraph.tsx | BaseGraph | exp,play | 0/1/1/2 |  | interpolationGuidedLessons | - | point/point-set parameter kind: curves/subdivisionCurves/SubdivisionCurveGraph.tsx:373 |
| interval-sweep | compgeo/IntervalSweepGraph.tsx | PointSetGraph | mode,play,pts | 0/0/0+1i/0+2i |  | compgeoGuidedLessons | IntervalSweepControls,SweepSideLists | - (cap 1) |
| inversion | compgeo/InversionGraph.tsx | PointSetGraph | mode,pts | 0+2i/0/0+5i/0+2i |  | triangleGeometryChapterLessons | InversionPanel | - (cap 2) |
| isometries | isometry/IsometryGraph.tsx | BaseGraph | mode,exp | 2/2/3/2 | Y | isometriesFriezeGuidedLessons,isometriesGuidedLessons,isometriesGuidedLessons,isometriesGuidedLessons,isometriesRosetteGuidedLessons | - | point/point-set parameter kind: isometry/IsometryGraph.tsx:1183 (cap 1) |
| lattice-paths | combinatorics/LatticePathGraph.tsx | BaseGraph | mode,exp | 2/2/2/2 | Y | combinatoricsGuidedLessons,combinatoricsGuidedLessons,combinatoricsGuidedLessons | - | point/point-set parameter kind: combinatorics/LatticePathGraph.tsx:900 (cap 1) |
| line-geometry | lines/LineGeometryGraph.tsx | BaseGraph | mode | 0/0/2/0 |  | analyticLinesGuidedLessons,analyticLinesGuidedLessons,analyticLinesGuidedLessons,analyticLinesGuidedLessons,analyticLinesIntersectGuidedLessons | - | point/point-set parameter kind: lines/LineGeometryGraph.tsx:864 (cap 1) |
| linear-function | functions/LinearFunctionGraph.tsx | BaseFunctionGraph | plain | 0/0/0/0 | Y | functionGuidedLessons | - | point/point-set parameter kind: functions/LinearFunctionGraph.tsx:193 (cap 2) |
| linear-map | linear/LinearMapGraph.tsx | BaseFunctionGraph | DECL,mode,exp,play,CONTRACT | 2/0/3/3 |  | linearMapsChapterLessons,linearMapsChapterLessons,linearMapsChapterLessons,linearMapsChapterLessons,linearMapsChapterLessons,linearMapsChapterLessons,linearMapsChapterLessons | - | point/point-set parameter kind: linear/LinearMapGraph.tsx:1055; vector/table-valued parameter: linear/LinearMapGraph.tsx:1076 (cap 1) |
| linear-program | levelsets/LinearProgramGraph.tsx | BaseGraph | legend | 6/1/0/0 |  | levelSetsGuidedLessons | LpPanels | - (cap 2) |
| logistic-map | dynamics/LogisticMapGraph.tsx | BaseGraph | play | 2/0/0/0 |  | phasePortraitsGuidedLessons,phasePortraitsGuidedLessons | - | equalAxisUnits=false: dynamics/LogisticMapGraph.tsx:171 (cap 1) |
| mean-value | functions/MeanValueGraph.tsx | BaseFunctionGraph | plain | 3/0/1/0 |  | analysisGuidedLessons | - | - (cap 1) |
| mechanics-descent | mechanics/DescentGraph.tsx | BaseGraph | mode,play | 3/0/1/2 |  | mechanicalCurvesGuidedLessons,mechanicalCurvesGuidedLessons,mechanicalCurvesGuidedLessons | - | point/point-set parameter kind: mechanics/DescentGraph.tsx:1081; own AnimationDriver: mechanics/DescentGraph.tsx (cap 1) |
| monotone-partition | compgeo/MonotonePartitionGraph.tsx | PointSetGraph | mode,play,pts | 0/0/0+2i/0+2i |  | compgeoGuidedLessons | ExampleSelect,MonotonePartitionControls,SweepSideLists | - (cap 3) |
| monotone-triangulation | compgeo/MonotoneTriangulationGraph.tsx | MonotonePartitionGraph | mode,play,pts | 0/0/0+2i/0+2i |  | compgeoGuidedLessons | ExampleSelect,MonotonePartitionControls,MonotonePartitionGraph,MonotoneTriangulationControls,SweepSideLists | - (cap 4) |
| orientation | compgeo/OrientationGraph.tsx | PointSetGraph | mode,pts | 0/0/0+1i/0+2i |  | compgeoGuidedLessons | - | - (cap 2) |
| patch-coons | patches/CoonsPatchGraph.tsx | BaseSurfaceGraph | DECL,surf,CONTRACT | 0+2i/0/0+2i/0+4i |  | coonsGuidedLessons | CoonsPatchPanels,PatchPointChooser,PatchPointEditor,SurfaceCameraPanel | 3D camera + second board: patches/CoonsPatchGraph.tsx; point/point-set parameter kind: patches/PatchPointEditor.tsx:19 |
| patch-decasteljau | patches/TensorDeCasteljauGraph.tsx | TensorPatchGraph | surf,CONTRACT | 0+4i/0+2i/0+5i/0+6i |  | guidedExamplePreviews,patchGuidedExamplesEvaluation | PatchPointChooser,PatchPointEditor,SurfaceCameraPanel,TensorDeCasteljauPanels,TensorPatchGraph,TensorPatchPanels | 3D camera + second board: patches/TensorDeCasteljauGraph.tsx; multi-board: parameterInset in patches/TensorPatchGraph.tsx; point/point-set parameter kind: patches/PatchPointEditor.tsx:19 (cap 2) |
| patch-derivatives | patches/TensorDerivativesGraph.tsx | TensorPatchGraph | surf,CONTRACT | 0+4i/0+2i/0+5i/0+8i |  | guidedExamplePreviews,patchGuidedExamplesEvaluation | PatchPointChooser,PatchPointEditor,SurfaceCameraPanel,TensorDerivativesPanels,TensorPatchGraph,TensorPatchPanels | 3D camera + second board: patches/TensorDerivativesGraph.tsx; multi-board: parameterInset in patches/TensorPatchGraph.tsx; point/point-set parameter kind: patches/PatchPointEditor.tsx:19 (cap 2) |
| patch-joins | patches/TensorJoinGraph.tsx | TensorPatchGraph | mode,surf,CONTRACT | 0+6i/0+4i/0+6i/0+5i |  | guidedExamplePreviews,patchGuidedExamplesAdvanced | PatchPointChooser,PatchPointEditor,SurfaceCameraPanel,TensorJoinPanels,TensorPatchGraph,TensorPatchPanels | 3D camera + second board: patches/TensorJoinGraph.tsx; multi-board: parameterInset in patches/TensorPatchGraph.tsx; point/point-set parameter kind: patches/PatchPointEditor.tsx:19 (cap 2) |
| patch-subdivision | patches/TensorSubdivisionGraph.tsx | TensorPatchGraph | exp,surf,CONTRACT | 0+5i/0+2i/0+5i/0+6i |  | guidedExamplePreviews,patchGuidedExamplesAdvanced | PatchPointChooser,PatchPointEditor,SurfaceCameraPanel,TensorPatchGraph,TensorPatchPanels,TensorSubdivisionPanels | 3D camera + second board: patches/TensorSubdivisionGraph.tsx; multi-board: parameterInset in patches/TensorPatchGraph.tsx; point/point-set parameter kind: patches/PatchPointEditor.tsx:19 (cap 2) |
| patch-tensor | patches/TensorPatchGraph.tsx | BaseSurfaceGraph | surf,CONTRACT | 0+4i/0+2i/0+4i/0+5i |  | guidedExamplePreviews,patchGuidedExamplesBasics,patchGuidedExamplesEvaluation | PatchPointChooser,PatchPointEditor,SurfaceCameraPanel,TensorPatchPanels | 3D camera + second board: patches/TensorPatchGraph.tsx; multi-board: parameterInset in patches/TensorPatchGraph.tsx; point/point-set parameter kind: patches/PatchPointEditor.tsx:19 (cap 2) |
| patch-triangular | patches/TriangularPatchGraph.tsx | BaseSurfaceGraph | surf,CONTRACT | 0+6i/0+3i/0+7i/0+13i |  | guidedExamplePreviews,patchGuidedExamplesAdvanced | PatchPointChooser,PatchPointEditor,SurfaceCameraPanel,TensorPatchPanels,TriangularPatchPanels | 3D camera + second board: patches/TriangularPatchGraph.tsx; multi-board: parameterInset in patches/TriangularPatchGraph.tsx; point/point-set parameter kind: patches/PatchPointEditor.tsx:19 (cap 3) |
| ph-cubic | curves/ph/CubicPhBezierCurveGraph.tsx | BasePhBezierCurveGraph | curve | 0/0/0/1+2i |  | guidedLessons | HodographInputBox | - (cap 2) |
| ph-quintic | curves/ph/QuinticPhBezierCurveGraph.tsx | BasePhBezierCurveGraph | curve | 0/0/0/0+2i |  | expansionGuidedLessons | HodographInputBox | - (cap 1) |
| phase-portrait | dynamics/PhasePortraitGraph.tsx | BaseGraph | DECL,mode,exp,play,legend,CONTRACT | 2/1/2/0 | Y | phasePortraitsGuidedLessons,phasePortraitsGuidedLessons,phasePortraitsGuidedLessons | - | point/point-set parameter kind: dynamics/PhasePortraitGraph.tsx:1441; vector/table-valued parameter: dynamics/PhasePortraitGraph.tsx:1463 (cap 3) |
| point-in-polygon | compgeo/PointInPolygonGraph.tsx | PointSetGraph | mode,exp,pts | 0/0/0+2i/0+2i | Y | compgeoGuidedLessons | ExampleSelect | - (cap 3) |
| point-set-triangulation | compgeo/TriangulationGraph.tsx | PointSetGraph | mode,pts | 0/0/0+2i/0+2i |  | compgeoGuidedLessons | TriangulationControls | - (cap 3) |
| polygon-area | compgeo/PolygonAreaGraph.tsx | PointSetGraph | mode,pts | 0/0/0+1i/0+2i |  | compgeoGuidedLessons | - | - (cap 2) |
| polynomial-zeros | functions/PolynomialZerosGraph.tsx | BaseFunctionGraph | plain | 1/0/1+1i/0 |  | schoolFunctionGraphsBatchBGuidedLessons | ZeroListEditor | - (cap 2) |
| prob-binomial-normal | functions/BinomialNormalGraph.tsx | BaseFunctionGraph | plain | 3/0/1/2 |  | probabilityGuidedLessons | - | equalAxisUnits=false: functions/BinomialNormalGraph.tsx:57 (cap 1) |
| prob-clt | functions/CltGraph.tsx | IterativeFunctionGraph | play | 2/0/1/1 |  | probabilityGuidedLessons | IterativeFunctionGraph | equalAxisUnits=false: functions/CltGraph.tsx:50 (cap 1) |
| prob-correlation | functions/CorrelationGraph.tsx | BaseFunctionGraph | plain | 0/1/1/2 |  | probabilityGuidedLessons | - | point/point-set parameter kind: functions/CorrelationGraph.tsx:426; equalAxisUnits=false: functions/CorrelationGraph.tsx:162 (cap 2) |
| prob-density | functions/DensityAreaGraph.tsx | BaseFunctionGraph | plain | 2/0/1/0 | Y | probabilityGuidedLessons | - | equalAxisUnits=false: functions/DensityAreaGraph.tsx:51 (cap 1) |
| prob-simulation | random/SimulationGraph.tsx | BaseGraph | mode,exp,play | 6/2/3/1 |  | randomnessAreaGuidedLessons,randomnessGuidedLessons,randomnessGuidedLessons,randomnessIntervalGuidedLessons,randomnessMarkovGuidedLessons,randomnessWalkGuidedLessons | - | equalAxisUnits=false: random/SimulationGraph.tsx:334; own AnimationDriver: random/SimulationGraph.tsx (cap 1) |
| prob-summary | functions/SummaryStatisticsGraph.tsx | BaseFunctionGraph | CONTRACT | 0/0/3/2 |  | probabilityGuidedLessons | - | equalAxisUnits=false: functions/SummaryStatisticsGraph.tsx:72; vector/table-valued parameter: functions/SummaryStatisticsGraph.tsx:350 (cap 2) |
| projective-cross-ratio | projective/CrossRatioGraph.tsx | BaseGraph | DECL,plain | 0/0/0+1i/0 |  | projectiveConicsGuidedLessons | CrossRatioControls | point/point-set parameter kind: projective/CrossRatioControls.tsx:68 (cap 4) |
| projective-five-point | projective/FivePointGraph.tsx | BaseGraph | plain | 0/0/0+4i/0+1i |  | projectiveFivePointGuidedLesson | FivePointControls | point/point-set parameter kind: projective/FivePointControls.tsx:82 (cap 1) |
| projective-pascal | projective/PascalGraph.tsx | BaseGraph | plain | 0+1i/0/0+3i/0 |  | projectiveConicsGuidedLessons | PascalControls | - |
| projective-pole-polar | projective/PolePolarGraph.tsx | BaseGraph | mode | 0/0/0+3i/0 |  | projectiveConicsGuidedLessons | PolePolarControls | point/point-set parameter kind: projective/PolePolarControls.tsx:79 (cap 1) |
| projective-three-views | projective/ThreeViewsGraph.tsx | BaseGraph | plain | 0+2i/0/0/0+1i |  | projectiveThreeViewsGuidedLesson | ThreeViewsControls | - (cap 1) |
| quadrature | functions/QuadratureGraph.tsx | BaseFunctionGraph | plain | 3/0/2/0 | Y | numericalQuadratureGuidedLesson | - | - (cap 1) |
| rational | curves/rational/RationalBezierCurveGraph.tsx | BaseRationalCurveGraph | curve | 0/0/0/0+1i |  | expansionGuidedLessons | - | - |
| rational-decasteljau | curves/rational/RationalDecasteljauGraph.tsx | DecasteljauGraph | DECL,play,curve | 0+2i/0/0/0+2i | b | additionalGuidedLessons | DecasteljauAnimationControls,DecasteljauGraph | - |
| rational-elevation | curves/rational/RationalElevationGraph.tsx | BaseRationalCurveGraph | curve | 0/0/0/0+1i |  | foundationGuidedLessons | - | - |
| rational-extrapolation | curves/rational/RationalExtrapolationGraph.tsx | BaseRationalCurveGraph | curve | 0/0/0/0+1i |  | constructionGuidedLessons | - | - |
| rational-function | functions/RationalFunctionGraph.tsx | BaseFunctionGraph | plain | 2/0/1+1i/0 | Y | schoolFunctionGraphsBatchBGuidedLessons | ZeroListEditor | - (cap 3) |
| rational-subdivision | curves/rational/RationalSubdivisionGraph2.tsx | SubdivisionGraph1 | curve | 0/0/0/0+2i | b | constructionGuidedLessons | SubdivisionGraph1 | - |
| recursion-cobweb | recursion/RecursionCobwebGraph.tsx | BaseGraph | exp,play | 5/0/1/0 | Y | recursionCobwebGuidedLessons,recursionCobwebGuidedLessons | - | equalAxisUnits=false: recursion/RecursionCobwebGraph.tsx:127 (cap 1) |
| recursion-growth | recursion/GrowthGraph.tsx | BaseGraph | mode | 6/3/4/0 |  | recursionGuidedLessons,recursionGuidedLessons,recursionLogScaleGuidedLessons | - | equalAxisUnits=false: recursion/GrowthGraph.tsx:182 (cap 1) |
| reduction | curves/reduction/DegreeReductionGraph.tsx | BaseBezierCurveGraph | mode,curve | 0/0/1/2+1i |  | degreeReductionGuidedLessons | ReadoutDetails | - |
| repeated-subdivision | curves/bezier/SubdivisionGraph.tsx | BaseBezierCurveGraph | exp,curve | 0/0/0/2+1i |  | constructionGuidedLessons | - | - |
| root-finding | functions/RootFindingGraph.tsx | IterativeFunctionGraph | mode,play | 2/0/2/0 |  | numericalMethodsGuidedLessons | IterativeFunctionGraph | - (cap 1) |
| segment-intersections | compgeo/BentleyOttmannGraph.tsx | PointSetGraph | mode,play,pts | 0/0/0+1i/0+2i |  | compgeoGuidedLessons | BentleyOttmannControls,SweepSideLists | - (cap 1) |
| sequence | functions/SequenceGraph.tsx | IterativeFunctionGraph | play | 3/0/1/0 |  | analysisGuidedLessons | IterativeFunctionGraph | equalAxisUnits=false: functions/SequenceGraph.tsx:117 (cap 2) |
| simson-line | compgeo/SimsonLineGraph.tsx | PointSetGraph | mode,pts | 0+2i/0/0+3i/0+2i |  | triangleGeometryChapterLessons | SimsonLinePanel | - (cap 2) |
| solids | solids/SolidsGraph.tsx | BaseSurfaceGraph | mode,surf,CONTRACT | 0+8i/0/0+3i/0+1i |  | solidsGuidedLessons,solidsGuidedLessons,solidsRevolutionGuidedLessons,solidsVolumesGuidedLessons,solidsVolumesGuidedLessons | SolidsPanels | 3D camera + second board: solids/SolidsGraph.tsx |
| spline-c1 | curves/spline/C1SplineGraph.tsx | BaseSplineCurveGraph | curve | 0/0/0/0+3i | Y | splineGuidedLessons | - | - |
| spline-c2 | curves/spline/C2SplineGraph.tsx | BaseSplineCurveGraph | curve | 0/0/0/0+3i |  | splineGuidedLessons | - | - |
| spline-cn | curves/spline/CnSplineGraph.tsx | BaseSplineCurveGraph | curve | 0/2/0/0+3i |  | splineGuidedLessons | - | - |
| spline-g1 | curves/spline/G1SplineGraph.tsx | BaseSplineCurveGraph | curve | 1/0/0/0+3i |  | splineGuidedLessons | - | - |
| spline-g1-symmetric | curves/spline/G1SymmetricSplineGraph.tsx | BaseSplineCurveGraph | curve | 1/0/0/0+3i |  | splineGuidedLessons | - | - |
| spline-parameterization | curves/parametrisations/SplineAlphaParametrizationGraph.tsx | BaseSplineCurveGraph | curve | 1/1/0/0+3i |  | splineGuidedLessons | - | - |
| subdivision | curves/bezier/SubdivisionGraph1.tsx | BaseBezierCurveGraph | exp,curve | 0/0/0/1+1i | Y | constructionGuidedLessons | - | - |
| taylor | functions/TaylorGraph.tsx | BaseFunctionGraph | DECL,plain | 2/1/1/0 | Y | analysisGuidedLessons | - | - (cap 2) |
| triangle-centres | compgeo/NotablePointsGraph.tsx | PointSetGraph | DECL,mode,pts | 0/0/0+2i/0+2i |  | triangleGeometryChapterLessons | NotablePointsPanel | - (cap 2) |
| triangle-solver | trig/TriangleSolverGraph.tsx | BaseGraph | mode | 1/0/2/0 | Y | trigSolveGuidedLessons,trigTriangleGuidedLessons,trigTriangleGuidedLessons | - | point/point-set parameter kind: trig/TriangleSolverGraph.tsx:938 (cap 1) |
| trigonometric-functions | functions/TrigonometricFunctionsGraph.tsx | BaseFunctionGraph | plain | 4/0/1/1 | Y | functionGuidedLessons | - | - (cap 1) |
| uniform-convergence | functions/UniformConvergenceGraph.tsx | BaseFunctionGraph | plain | 3/1/1/0 |  | analysisGuidedLessons | - | equalAxisUnits=false: functions/UniformConvergenceGraph.tsx:98 (cap 1) |
| uniform-parameterization | curves/parametrisations/UniformParamBezierCurveGraph.tsx | BasePhBezierCurveGraph | curve | 1/1/1/0+2i |  | parameterizationGuidedLessons | HodographInputBox | - (cap 1) |
| unit-circle | trig/UnitCircleGraph.tsx | BaseGraph | plain | 2/0/0/3 |  | trigUnitCircleGuidedLessons,trigUnitCircleGuidedLessons | - | - (cap 2) |
| voronoi | compgeo/VoronoiGraph.tsx | PointSetGraph | mode,exp,play,pts | 0/0/0+3i/0+2i | Y | compgeoGuidedLessons | ExampleSelect,VoronoiControls | - (cap 1) |
| voronoi-degenerate | compgeo/DegenerateSitesGraph.tsx | VoronoiGraph | mode,play,pts | 0/0/0+3i/0+2i | b | compgeoGuidedLessons | ExampleSelect,VoronoiControls,VoronoiGraph | - (cap 1) |
| waves | functions/WavesGraph.tsx | BaseGraph | mode,exp,play | 16/0/1/1 | Y | wavesGuidedLessons,wavesGuidedLessons,wavesGuidedLessons,wavesSamplingGuidedLessons,wavesSamplingGuidedLessons | - | equalAxisUnits=false: functions/WavesGraph.tsx:210; own AnimationDriver: functions/WavesGraph.tsx (cap 2) |
| weighted-parameterization | curves/parametrisations/AlphaParamBezierCurveGraph.tsx | BaseBezierCurveGraph | curve | 1/1/0/0+1i |  | parameterizationGuidedLessons | - | - |


## (a) Shared-code candidates for step 2 (files ranked by demonstrations that use them; not-yet-declared users in brackets)

| files | users | undeclared | inherited controls on those users | note |
|---|---|---|---|---|
| functions/FunctionReadout.tsx | 52 | 47 | 157 | panel |
| functions/BaseFunctionGraph.tsx | 41 | 37 | 8 | base class; subclasses inherit nothing declared yet |
| base/BaseCurveGraph.tsx | 32 | 30 | 324 | base class |
| base/Commands.tsx | 32 | 30 | 324 |  |
| base/CurvePointControls.tsx | 32 | 30 | 324 | panel |
| base/CurveWorkspaceControls.tsx | 32 | 30 | 324 | panel |
| functions/FunctionStatus.tsx | 28 | 25 | 8 | panel |
| compgeo/PointSetControls.tsx | 22 | 21 | 449 | panel |
| compgeo/PointSetGraph.tsx | 22 | 21 | 449 | base class |
| base/BaseBezierCurveGraph.tsx | 18 | 16 | 186 | base class |
| patches/SurfaceCameraPanel.tsx | 8 | 7 | 141 | panel |
| compgeo/ExampleSelect.tsx | 8 | 8 | 178 |  |
| patches/BaseSurfaceGraph.tsx | 8 | 7 | 149 | base class |
| patches/PatchPointChooser.tsx | 7 | 6 | 137 |  |
| patches/PatchPointEditor.tsx | 7 | 6 | 137 | panel |
| functions/IterativeFunctionGraph.tsx | 6 | 5 | 0 | base class; subclasses inherit nothing declared yet |
| patches/TensorPatchPanels.tsx | 6 | 6 | 126 |  |
| curves/spline/BaseSplineCurveGraph.tsx | 6 | 6 | 66 | base class |
| curves/bspline/BSplinePointList.tsx | 5 | 5 | 8 |  |
| curves/rational/BaseRationalCurveGraph.tsx | 5 | 5 | 45 | base class |
| curves/bspline/KnotEditor.tsx | 4 | 4 | 7 | panel |
| compgeo/SweepSideLists.tsx | 4 | 4 | 75 |  |
| patches/TensorPatchGraph.tsx | 4 | 4 | 80 |  |
| curves/bezier/DecasteljauAnimationControls.tsx | 3 | 1 | 38 | panel |
| curves/ph/BasePhBezierCurveGraph.tsx | 3 | 3 | 36 | base class |
| curves/ph/HodographInputBox.tsx | 3 | 3 | 36 |  |
| curves/ReadoutDetails.tsx | 2 | 2 | 18 | panel |
| compgeo/CurvePairGraph.tsx | 2 | 2 | 37 |  |
| compgeo/TraceCurvePairGraph.tsx | 2 | 2 | 37 |  |
| compgeo/HullTraceControls.tsx | 2 | 2 | 44 | panel |
| curves/bezier/CurvatureBezierCurveGraph.tsx | 2 | 2 | 20 |  |
| compgeo/TriangulationControls.tsx | 2 | 2 | 42 | panel |

- **BaseFunctionGraph** (41 subclasses: 35 direct plus 6 via IterativeFunctionGraph): accumulation, arc-length, area-between-curves, bisection, complex-multiplication, complex-reciprocal, complex-roots, conic-focal, continuity, convexity, darboux, definite-integral, derivative, epicycles, euler-method, exponential-function, extrema, fixed-point, fourier-coefficients, fourier-series, function-inverse, function-transformation, geometric-series, interp-least-squares, interp-runge, linear-function, linear-map, mean-value, polynomial-zeros, prob-binomial-normal, prob-clt, prob-correlation, prob-density, prob-summary, quadrature, rational-function, root-finding, sequence, taylor, trigonometric-functions, uniform-convergence.
- **IterationController useLease passthrough** (`src/learning/runtime/iterationController.ts`): graphs with their own AnimationDriver (the gap line in the table) and no lease yet: arc-length-param, contour-map, curve-kinematics, curve-parametric, decasteljau-alternative, epicycles, mechanics-descent, prob-simulation, waves. All 38 playback demonstrations ride on it or on PlaybackButtons; 9 take the driver directly.
- **Curve control points**: CurvePointControls/CurveWorkspaceControls/BezierCurveControls reach 32 demonstrations (plus 22 point-set ones through PointSetControls). They bind points, which the arbiter kinds (range, count, choice, toggle) do not cover; see (c).
- Step 2 ranking by unlock: (1) BaseFunctionGraph and FunctionReadout/FunctionStatus (35 subclasses, 52 readout users); (2) the curve workspace trio (32); (3) PointSetGraph and PointSetControls (22); (4) BaseSurfaceGraph / TensorPatchGraph (8, blocked by (c)); (5) IterativeFunctionGraph (6); (6) the per-family panels (inventory hubs list the rest).

## (b) Connected components (input for step 4)

Edges: **graph-file-sharing** = shared non-hub files; **lessons** = a lesson or chapter file naming the demonstration; **tests** = own tests that name at most six demonstrations (Routes.test and the all-graph suites left out). Hub threshold 20 users, as the inventory.

### Graph files only, shared files of at most six users plus own tests (what stays shared after step 2 converts the hub panels): 41 components

| size | demonstrations |
|---|---|
| 83 | affine, bernstein, bezier, bezier-clipping, bezier-hulls, bisection, bspline-basis, bspline-blossom, bspline-deboor, bspline-extraction, bspline-insertion, bspline-nurbs, circle, convex-hull, ... (+69) |
| 5 | curve-comb, curve-envelope, curve-kinematics, curve-offset, mechanics-descent |

Plus 11 components of two and 28 singletons.

### Lesson files only (lessons edited in frames: the 16-demonstration compgeoGuidedLessons is the largest): 57 components

| size | demonstrations |
|---|---|
| 16 | bezier-hulls, convex-hull, delaunay, ear-clipping, fortune, hull-robustness, interval-sweep, monotone-partition, monotone-triangulation, orientation, point-in-polygon, point-set-triangulation, polygon-area, segment-intersections, voronoi, voronoi-degenerate |
| 10 | accumulation, bisection, convexity, darboux, extrema, fixed-point, mean-value, sequence, taylor, uniform-convergence |
| 9 | affine, bernstein, bezier, complex-multiplication, decasteljau, ph-cubic, ph-quintic, rational, rational-elevation |
| 8 | arc-length, area-between-curves, continuity, definite-integral, derivative, exponential-function, linear-function, trigonometric-functions |
| 6 | curve-comb, curve-curvature, curve-envelope, curve-evolute, curve-offset, curve-parametric |
| 6 | patch-decasteljau, patch-derivatives, patch-joins, patch-subdivision, patch-tensor, patch-triangular |
| 6 | spline-c1, spline-c2, spline-cn, spline-g1, spline-g1-symmetric, spline-parameterization |
| 5 | euler-line, inscribed-angle, inversion, simson-line, triangle-centres |
| 5 | extrapolation, rational-extrapolation, rational-subdivision, repeated-subdivision, subdivision |
| 5 | prob-binomial-normal, prob-clt, prob-correlation, prob-density, prob-summary |
| 4 | interp-hermite, interp-lagrange, interp-runge, interp-subdivision |
| 3 | circle, decasteljau-alternative, farin |
| 3 | projective-cross-ratio, projective-pascal, projective-pole-polar |

Plus 8 components of two and 36 singletons.

### Everything: shared files of at most six users + lessons + tests (the real lane constraint): 23 components

| size | demonstrations |
|---|---|
| 106 | accumulation, affine, arc-length, area-between-curves, bernstein, bezier, bezier-clipping, bezier-hulls, bisection, bspline-basis, bspline-blossom, bspline-deboor, bspline-extraction, bspline-insertion, ... (+92) |

Plus 10 components of two and 12 singletons.

For reference the inventory's own figures: 29 components with all shared files, 80 without hub files; with every non-hub shared file plus lessons and tests the largest component is 112 demonstrations (19 components). Because one lesson file edit touches every demonstration it frames, step 4 either splits the big lesson files by demonstration (frames are per step, so a file can be edited by sequential sessions) or treats the lesson-linked giant as one lane for several consecutive sessions, as the task says.

## (c) Contract-change list for the handler

Hard (the contract has no way to say it; lane stops at the demonstration):

1. **Second board / inset**: patch-decasteljau, patch-derivatives, patch-joins, patch-subdivision, patch-tensor, patch-triangular. `src/graphs/patches/parameterInset.ts` mounts a second JSXGraph board (`TensorPatchGraph.tsx:5`, `TriangularPatchGraph.tsx`); the presenters render one board and ViewMarks/followView are one board's coordinates.
2. **3D camera**: . Camera (az, el, distance, projection, target) is state outside range/count/choice/toggle (`CoonsPatchGraph.tsx:58-63, 176-193`); `ViewMarks` (`graphDeclaration.ts:207-216`) are 2D point/box/polyline. Coons is a pilot, so the declaration works with camera left in the graph's own controls; the question is whether that stays allowed for the other 7 (and `solids`).
3. **Vector-valued parameter** (list or knot vector): bspline-basis, bspline-deboor, bspline-extraction, bspline-insertion (`curves/bspline/KnotEditor.tsx:42`), prob-summary (`SummaryStatisticsGraph.tsx:350`, ValueListInput). Pilots linear-map (`LinearMapGraph.tsx:1076`) and phase-portrait (`PhasePortraitGraph.tsx:1463`) hold their NumberGrid in Orodja, so the same decision (leave in Orodja, listed by the inventory) may cover these; the handler confirms. Parameter kinds are only range, count, choice, toggle (`graphDeclaration.ts:52-99`).

Soft (need a handler ruling before the lanes start, no demonstration is stopped by them if the pilot precedent is accepted):

4. **Point and point-set parameters**: 22 point-set and 32 curve demonstrations edit points through `PointSetControls.tsx:219`, `CurvePointControls.tsx:65`. Pilot triangle-centres (point-set) left the points on the board; rule: the same for all, or add a point kind. Guide section 6 lists it as a gap.
5. **ViewMarks reach tier, zoom limits, equalAxisUnits in marks**: 0 demonstrations override `equalAxisUnits` to false (e.g. `GeometricSeriesGraph.tsx:76`); a marks fit that keeps equal units would mis-frame them. Bisection works through `followView`. Demonstrations that declare no `marks` are unaffected. Ids: .
6. **Board captions and insets with no place** (guide section 6): 96 demonstrations draw board captions (counts in the table); the legend and readout cannot own them yet. Parity reports `uncoveredCaptions`.
7. **Non-numeric and formula values**: no formula kind (guide); choice values are strings, so numeric choices (phase-equilibrium 0/1) need a mapping. The script found no native text inputs (function-expression inputs may sit in components outside `src/graphs`: the blind spot).
8. **Playback lease** (step 2, not a contract change): own AnimationDriver in 9 graphs, see (a).
9. **Controls outside BaseGraph (Playground)**: no registered demonstration; the inventory lists these `src/learning` files as unreachable: DrawingPlayground.tsx, LookUnderneath.tsx, collisions/CollisionInspect.tsx, collisions/CollisionPlayground.tsx and others (see `outsideBaseGraph` in inventory.json). They need a separate decision (leave as is, or a playground declaration).

## What the script could not see

- Readouts, legends, captions built by helpers with other names; controls wrapped in components outside `src/graphs`; strings built at run time (inventory README blind spots).
- Whether a graph is expensive (candidates only), whether a legend is drawn on the board, mode meaning of a ChoiceSelect (catalog-key regex), per-mode controls (counted once), steps whose text sits in variables or helpers (frames of helper-built steps not enumerated), `declares` field of the inventory is false for all pilots (it looks for the old import), so the declared list here comes from `override declaration(`.
- Prototype: only file-level presence of `workspaceUx` was checked; the declaration content (and `night/conv/<id>/NOTES.md`) was not read.
- Scratch outputs 08-triage.tmp.json and 08-triage.table.tmp.md are intermediate and can be deleted by the handler.
