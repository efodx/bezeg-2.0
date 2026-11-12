# Task 06 step 1: legacy registration inventory

Checked revision: branch `worktree-stream-authoring-rollout` at `8144082f` (master code as of `feb34d57`), 2026-11-12. Read-only; no tests run. Sources: `src/demonstrations.ts` (`legacyDemonstrationRows`, lines 53-167), `src/graphs/graphFactories.ts`, `graphLoaders.ts`, `base/presets/PresetImport.ts`, `src/learning/chapter/guidedLessonOwnership.ts`, `src/learning/content/chapterOwnedLessons.ts`, `src/graphs/registrationIntegrity.{ts,test.ts}`, `scripts/demonstration-preview-recipes.cjs`, `scripts/demonstration-clip-rows/*`, `tests/smoke-catalog.cjs`. Reference: projective family (`src/graphs/projective/{registration,collections,runtime}.ts`, ADR 0059).

## Count reconciliation

- Current `legacyDemonstrationRows` has **113** rows, `graphFactories` has **113** entries (type `Exclude<DemonstrationId, RegisteredDemonstrationId>`). The 113 ids match one to one; no difference to explain.
- Per catalog family: basics 2, polynomial Bezier 11, rational 7, splines 5, PH 2, parameterization 3, curve geometry 6, interpolation 5, B-splines 6, patches 7, functions 14, analysis 16, probability 5, maps 3, plane geometry 5, computational geometry 16 (sum 113). Catalog families `combinatorics` and `projective` have no legacy rows.
- **Migrated on current master: 0 of 113.** Task 04 (Blossom, NURBS) migrated *scene ownership* (`SceneDeclaration`/`SceneSlot`), not registration; `bspline-blossom` and `bspline-nurbs` are still legacy rows with `graphFactories` entries. Credit for task 04 applies to task 07, not 06. The 15 feature-registered families (projective, trig, lines, isometry, circle construction, combinatorics, random, kinematics, recursion, waves, complex batch D, mechanics, dynamics, solids, levelsets) are outside the 113.
- Every one of the 113 has: a preview recipe (central `demonstration-preview-recipes.cjs`, keyed by id), a manifest entry, a graph class, a collection (except `circle`, see below) and a primary lesson owner. Clip rows exist for 52 ids (13 files under `scripts/demonstration-clip-rows/`); the other 61 have none (not a registration blocker).

## Legend for the table

- **Graph / dir**: class constructed in `graphFactories.ts` and its implementation directory under `src/graphs/`.
- **Collection key / owner**: storage key (`preset-<key>`) and the module defining it. `curveMap` = `curves/curvePresetCollections.ts` (`curvePresetCollections`, 32 entries across 7 catalog families); `fnMap` = `functions/functionPresetCollections.ts` (`functionPresetCollections`, 38 entries across basics, interpolation, functions, analysis, probability); `patchMap` = `patches/patchPresetCollections.ts`; `compgeoArr` = `compgeo/compgeoPresetCollections.ts` (array plus overlay constants graphs import). Standalone entries are their own module.
- **Primary lesson owner**: `guidedLessonOwners` row `chapter#section`. `derivable` = that chapter is in `chapterOwnedLessons` (can come from `chapterOwnerRows()` like projective); `explicit` = the chapter is a family/legacy chapter (`bezier-curves`, `rational-curves`, `splines`, `ph-curves`, `parametrization`, `foundations`, `functions-and-calculus`, `analysis`) with no owned-lesson rows, so the primary row must stay explicit (68 derivable, 45 explicit). Further owners come from `familyChapters`, `retainedExamples`, `chapterOwnerRows()` and are keyed by id, so they do not change.
- **Tooling**: `R` = preview recipe and manifest entry (all 113), `surf` = `view: 'surface'`, `clip:<file>` = row in `scripts/demonstration-clip-rows/<file>.cjs`. All tooling is keyed by catalog id; `tests/smoke-catalog.cjs` follows `definitions` spreads by static import, so a family-local `registration.ts` with a literal rows array and a named export is read without changes (as projective is).
- **Shared route / alias**: none. No legacy id has a path alias, redirect or second route (`Routes.tsx` maps the catalog 1:1, loader chosen by `isRegisteredDemonstrationId`). The last column is "migrated on master".

## Table (113 baseline legacy entries, catalog order)

| # | ID | Family | Graph / dir | Collection key / owner | Primary lesson owner | Tooling | Migrated |
|---|----|--------|-------------|------------------------|----------------------|---------|----------|
| 1 | `bernstein` | basics | `BernsteinGraph` `bernstein` | `bernstein-graph` / curveMap | foundations#why-weights (explicit) | R | no |
| 2 | `complex-multiplication` | basics | `ComplexMultiplicationGraph` `complex` | `complex-multiplication` / fnMap | foundations#complex-plane (explicit) | R | no |
| 3 | `bezier` | poly-Bezier | `BezierCurveGraph` `curves/bezier` | `bezier-curve` / curveMap | bezier-curves#control-points (explicit) | R | no |
| 4 | `decasteljau` | poly-Bezier | `DecasteljauGraph` `curves/bezier` | `decasteljau` / curveMap | bezier-curves#interpolation (explicit) | R | no |
| 5 | `decasteljau-alternative` | poly-Bezier | `DecasteljauGraph2` `curves/bezier` | `decasteljau2` / curveMap | bezier-curves#interpolation (explicit) | R | no |
| 6 | `affine` | poly-Bezier | `AffineTransformBezierCurveGraph` `curves/bezier` | `affine-transform` / curveMap | bezier-curves#affine-transformations (explicit) | R | no |
| 7 | `subdivision` | poly-Bezier | `DecasteljauGraph3` `curves/bezier` | `subdivision-1` / curveMap | bezier-curves#next-ideas (explicit) | R | no |
| 8 | `repeated-subdivision` | poly-Bezier | `SubdivisionGraph` `curves/bezier` | `bezier-subdivision` / curveMap | bezier-curves#next-ideas (explicit) | R | no |
| 9 | `extrapolation` | poly-Bezier | `ExtrapolationGraph` `curves/bezier` | `bezier-extrapolation` / curveMap | bezier-curves#next-ideas (explicit) | R | no |
| 10 | `elevation` | poly-Bezier | `ElevationGraph` `curves/bezier` | `elevation-graph` / curveMap | bezier-curves#next-ideas (explicit) | R | no |
| 11 | `reduction` | poly-Bezier | `DegreeReductionGraph` `curves/reduction` | `reduction` / curveMap | advanced-bezier#reduction (derivable) | R,clip:bezier | no |
| 12 | `arc-length-param` | poly-Bezier | `ArcLengthParametrizationGraph` `curves/arclength` | `arc-length-param` / curveMap | advanced-bezier#arc-length-param (derivable) | R,clip:bezier | no |
| 13 | `bezier-clipping` | poly-Bezier | `BezierClippingGraph` `compgeo` | `compgeo-bezier-clipping` / compgeo/bezierClippingPresetCollection.ts | advanced-bezier#bezier-clipping (derivable) | R,clip:bezier | no |
| 14 | `rational` | rational | `RationalBezierCurveGraph` `curves/rational` | `rational-bezier` / curveMap | rational-curves#why-rational (explicit) | R | no |
| 15 | `rational-decasteljau` | rational | `RationalDecasteljauGraph` `curves/rational` | `rational-decasteljau` / curveMap | rational-curves#operations (explicit) | R | no |
| 16 | `rational-elevation` | rational | `RationalElevationGraph` `curves/rational` | `rational-bezier-elevation` / curveMap | rational-curves#operations (explicit) | R | no |
| 17 | `rational-extrapolation` | rational | `RationalExtrapolationGraph` `curves/rational` | `rational-bezier-extrapolation` / curveMap | rational-curves#investigate-rational (explicit) | R | no |
| 18 | `rational-subdivision` | rational | `RationalSubdivisionGraph2` `curves/rational` | `rational-bezier-subdivision` / curveMap | rational-curves#operations (explicit) | R | no |
| 19 | `farin` | rational | `FarinPointsCurveGraph` `curves/rational` | `rational-bezier-farin` / curveMap | rational-curves#operations (explicit) | R | no |
| 20 | `circle` | rational | `RationalBezierCurveCircleGraphN` `curves/rational` | `(none)` / NO_PRESET_COLLECTION | rational-curves#worked-conic (explicit) | R | no |
| 21 | `spline-cn` | splines | `CnSplineGraph` `curves/spline` | `cn-spline` / curveMap | splines#continuity-levels (explicit) | R | no |
| 22 | `spline-c1` | splines | `C1SplineGraph` `curves/spline` | `c1-spline-graph` / curveMap | splines#continuity-levels (explicit) | R | no |
| 23 | `spline-c2` | splines | `C2SplineGraph` `curves/spline` | `c2-spline` / curveMap | splines#continuity-levels (explicit) | R | no |
| 24 | `spline-g1` | splines | `G1SplineGraph` `curves/spline` | `g1-spline-graph` / curveMap | splines#geometric-vs-parametric (explicit) | R | no |
| 25 | `spline-g1-symmetric` | splines | `G1SymmetricSplineGraph` `curves/spline` | `g1-symmetric-spline-graph` / curveMap | splines#geometric-vs-parametric (explicit) | R | no |
| 26 | `ph-cubic` | PH | `CubicPhBezierCurveGraph` `curves/ph` | `cubic-ph` / curveMap | ph-curves#arc-length-problem (explicit) | R | no |
| 27 | `ph-quintic` | PH | `QuinticPhBezierCurve` `curves/ph` | `quintic-ph-graph` / curveMap | ph-curves#offsets (explicit) | R | no |
| 28 | `spline-parameterization` | param | `SplineAlphaParametrizationGraph` `curves/parametrisations` | `alfaparametrizacije` / curveMap | parametrization#weighted-knot (explicit) | R | no |
| 29 | `weighted-parameterization` | param | `AlphaParamBezierCurveGraph` `curves/parametrisations` | `alpha-param` / curveMap | parametrization#weighted-knot (explicit) | R | no |
| 30 | `uniform-parameterization` | param | `UniformParamBezierCurveGraph` `curves/parametrisations` | `uniform-graph` / curveMap | parametrization#uniform-timing (explicit) | R | no |
| 31 | `curve-parametric` | curve-geom | `ParametricCurveGraph` `curves/parametric` | `curve-parametric` / curves/parametric/parametricPresetCollection.ts | curve-geometry#curve-parametric (derivable) | R,clip:curve-geometry | no |
| 32 | `curve-curvature` | curve-geom | `CurvatureBezierCurveGraph` `curves/bezier` | `curve-curvature` / curveMap | curve-geometry#curve-curvature (derivable) | R,clip:curve-geometry | no |
| 33 | `curve-comb` | curve-geom | `CurveCombGraph` `curves/comb` | `curve-comb` / curveMap | curve-geometry#curve-comb (derivable) | R,clip:curve-geometry | no |
| 34 | `curve-evolute` | curve-geom | `CurveEvoluteGraph` `curves/bezier` | `curve-evolute` / curveMap | curve-geometry#curve-evolute (derivable) | R,clip:curve-geometry | no |
| 35 | `curve-offset` | curve-geom | `CurveOffsetGraph` `curves/offset` | `curve-offset` / curveMap | curve-geometry#curve-offset (derivable) | R,clip:curve-geometry | no |
| 36 | `curve-envelope` | curve-geom | `CurveEnvelopeGraph` `curves/envelope` | `curve-envelope` / curveMap | curve-geometry#curve-envelope (derivable) | R,clip:curve-geometry | no |
| 37 | `interp-lagrange` | interp | `InterpolationGraph` `curves/interpolation` | `interp-lagrange` / curves/interpolation/interpolationPresetCollection.ts | interpolation#lagrange (derivable) | R,clip:interpolation | no |
| 38 | `interp-hermite` | interp | `HermiteGraph` `curves/hermite` | `interp-hermite` / curves/hermite/hermitePresetCollection.ts | interpolation#hermite (derivable) | R,clip:interpolation | no |
| 39 | `interp-runge` | interp | `RungeInterpolationGraph` `functions` | `interp-runge` / fnMap | interpolation#runge (derivable) | R,clip:interpolation | no |
| 40 | `interp-least-squares` | interp | `LeastSquaresGraph` `functions` | `(factory fn)` / fnMap | interpolation#least-squares (derivable) | R,clip:interpolation | no |
| 41 | `interp-subdivision` | interp | `SubdivisionCurveGraph` `curves/subdivisionCurves` | `interp-subdivision` / curves/subdivisionCurves/subdivisionPresetCollection.ts | interpolation#subdivision (derivable) | R,clip:interpolation | no |
| 42 | `bspline-basis` | B-splines | `BSplineBasisGraph` `curves/bspline` | `bspline-curve` / curves/bspline/bsplinePresetCollection.ts SHARED x6 | b-splines#bspline-basis (derivable) | R,clip:bsplines | no |
| 43 | `bspline-deboor` | B-splines | `DeBoorGraph` `curves/bspline` | `bspline-curve` / curves/bspline/bsplinePresetCollection.ts SHARED x6 | b-splines#bspline-deboor (derivable) | R,clip:bsplines | no |
| 44 | `bspline-insertion` | B-splines | `BSplineInsertionGraph` `curves/bspline` | `bspline-curve` / curves/bspline/bsplinePresetCollection.ts SHARED x6 | b-splines#bspline-insertion (derivable) | R,clip:bsplines | no |
| 45 | `bspline-extraction` | B-splines | `BSplineExtractionGraph` `curves/bspline` | `bspline-curve` / curves/bspline/bsplinePresetCollection.ts SHARED x6 | b-splines#bspline-extraction (derivable) | R,clip:bsplines | no |
| 46 | `bspline-nurbs` | B-splines | `BSplineNurbsGraph` `curves/bspline` | `bspline-curve` / curves/bspline/bsplinePresetCollection.ts SHARED x6 | b-splines#bspline-nurbs (derivable) | R,clip:bsplines | no |
| 47 | `bspline-blossom` | B-splines | `BSplineBlossomGraph` `curves/bspline` | `bspline-curve` / curves/bspline/bsplinePresetCollection.ts SHARED x6 | b-splines#bspline-blossom (derivable) | R,clip:bsplines | no |
| 48 | `patch-tensor` | patches | `TensorPatchGraph` `patches` | `patch-tensor` / patchMap | bezier-patches#curve-to-patch (derivable) | R,surf | no |
| 49 | `patch-decasteljau` | patches | `TensorDeCasteljauGraph` `patches` | `patch-decasteljau` / patchMap | bezier-patches#tensor-decasteljau (derivable) | R,surf | no |
| 50 | `patch-derivatives` | patches | `TensorDerivativesGraph` `patches` | `patch-derivatives` / patchMap | bezier-patches#tensor-derivatives (derivable) | R,surf | no |
| 51 | `patch-subdivision` | patches | `TensorSubdivisionGraph` `patches` | `patch-subdivision` / patchMap | bezier-patches#tensor-subdivision (derivable) | R,surf | no |
| 52 | `patch-joins` | patches | `TensorJoinGraph` `patches` | `patch-joins` / patchMap | bezier-patches#tensor-joins (derivable) | R,surf | no |
| 53 | `patch-triangular` | patches | `TriangularPatchGraph` `patches` | `patch-triangular` / patchMap | bezier-patches#triangular-patches (derivable) | R,surf | no |
| 54 | `patch-coons` | patches | `CoonsPatchGraph` `patches` | `patch-coons` / patches/coonsPresetCollection.ts | advanced-bezier#patch-coons (derivable) | R,surf,clip:patches | no |
| 55 | `linear-function` | functions | `LinearFunctionGraph` `functions` | `linear-function` / fnMap | functions-and-calculus#function-rules (explicit) | R | no |
| 56 | `exponential-function` | functions | `ExponentialFunctionGraph` `functions` | `exponential-function` / fnMap | functions-and-calculus#function-rules (explicit) | R | no |
| 57 | `trigonometric-functions` | functions | `TrigonometricFunctionsGraph` `functions` | `trigonometric-function` / fnMap | functions-and-calculus#function-rules (explicit) | R | no |
| 58 | `function-transformation` | functions | `FunctionTransformationGraph` `functions` | `function-transformation` / fnMap | school-function-graphs#function-transformation (derivable) | R,clip:functions | no |
| 59 | `function-inverse` | functions | `FunctionInverseGraph` `functions` | `function-inverse` / fnMap | school-function-graphs#function-inverse (derivable) | R,clip:functions | no |
| 60 | `polynomial-zeros` | functions | `PolynomialZerosGraph` `functions` | `(factory fn)` / fnMap | school-function-graphs#polynomial-zeros (derivable) | R,clip:functions | no |
| 61 | `rational-function` | functions | `RationalFunctionGraph` `functions` | `(factory fn)` / fnMap | school-function-graphs#rational-function (derivable) | R,clip:functions | no |
| 62 | `geometric-series` | functions | `GeometricSeriesGraph` `functions` | `geometric-series` / fnMap | school-function-graphs#geometric-series (derivable) | R,clip:functions | no |
| 63 | `conic-focal` | functions | `ConicFocalGraph` `functions` | `(factory fn)` / fnMap | school-function-graphs#conic-focal (derivable) | R,clip:functions | no |
| 64 | `continuity` | functions | `ContinuityGraph` `functions` | `piecewise-continuity` / fnMap | functions-and-calculus#continuity (explicit) | R | no |
| 65 | `derivative` | functions | `DerivativeGraph` `functions` | `derivative` / fnMap | functions-and-calculus#derivatives (explicit) | R | no |
| 66 | `definite-integral` | functions | `DefiniteIntegralGraph` `functions` | `definite-integral` / fnMap | functions-and-calculus#integrals (explicit) | R | no |
| 67 | `area-between-curves` | functions | `AreaBetweenCurvesGraph` `functions` | `area-between-curves` / fnMap | functions-and-calculus#applications (explicit) | R | no |
| 68 | `arc-length` | functions | `ArcLengthGraph` `functions` | `arc-length` / fnMap | functions-and-calculus#applications (explicit) | R | no |
| 69 | `bisection` | analysis | `BisectionGraph` `functions` | `bisection` / fnMap | analysis#existence (explicit) | R | no |
| 70 | `root-finding` | analysis | `RootFindingGraph` `functions` | `root-finding` / fnMap | numerical-methods#root-finding (derivable) | R,clip:analysis | no |
| 71 | `quadrature` | analysis | `QuadratureGraph` `functions` | `quadrature` / fnMap | numerical-methods#quadrature (derivable) | R,clip:analysis | no |
| 72 | `euler-method` | analysis | `EulerGraph` `functions` | `euler` / fnMap | numerical-methods#euler-method (derivable) | R,clip:analysis | no |
| 73 | `mean-value` | analysis | `MeanValueGraph` `functions` | `mean-value` / fnMap | analysis#derivative-results (explicit) | R | no |
| 74 | `accumulation` | analysis | `AccumulationGraph` `functions` | `accumulation` / fnMap | functions-and-calculus#integrals (explicit) | R | no |
| 75 | `darboux` | analysis | `DarbouxGraph` `functions` | `darboux` / fnMap | analysis#integrability (explicit) | R | no |
| 76 | `extrema` | analysis | `ExtremaGraph` `functions` | `extrema` / fnMap | analysis#derivative-results (explicit) | R | no |
| 77 | `convexity` | analysis | `ConvexityGraph` `functions` | `convexity` / fnMap | analysis#derivative-results (explicit) | R | no |
| 78 | `taylor` | analysis | `TaylorGraph` `functions` | `taylor` / fnMap | analysis#taylor (explicit) | R | no |
| 79 | `sequence` | analysis | `SequenceGraph` `functions` | `sequence` / fnMap | analysis#convergence (explicit) | R | no |
| 80 | `uniform-convergence` | analysis | `UniformConvergenceGraph` `functions` | `uniform-convergence` / fnMap | analysis#convergence (explicit) | R | no |
| 81 | `fourier-series` | analysis | `FourierSeriesGraph` `functions` | `fourier-series` / fnMap | fourier-series#fourier-series (derivable) | R,clip:analysis | no |
| 82 | `fourier-coefficients` | analysis | `FourierCoefficientsGraph` `functions` | `(factory fn)` / fnMap | fourier-series#fourier-coefficients (derivable) | R,clip:analysis | no |
| 83 | `epicycles` | analysis | `EpicycleGraph` `functions` | `epicycle` / fnMap | fourier-series#epicycles (derivable) | R,clip:analysis | no |
| 84 | `fixed-point` | analysis | `FixedPointGraph` `functions` | `fixed-point` / fnMap | analysis#convergence (explicit) | R | no |
| 85 | `prob-density` | probability | `DensityAreaGraph` `functions` | `prob-density` / fnMap | probability#density (derivable) | R,clip:probability | no |
| 86 | `prob-binomial-normal` | probability | `BinomialNormalGraph` `functions` | `prob-binomial-normal` / fnMap | probability#binomial-normal (derivable) | R,clip:probability | no |
| 87 | `prob-clt` | probability | `CltGraph` `functions` | `prob-clt` / fnMap | probability#clt (derivable) | R,clip:probability | no |
| 88 | `prob-summary` | probability | `SummaryStatisticsGraph` `functions` | `prob-summary` / fnMap | probability#summary (derivable) | R,clip:probability | no |
| 89 | `prob-correlation` | probability | `CorrelationGraph` `functions` | `prob-correlation` / fnMap | probability#correlation (derivable) | R,clip:probability | no |
| 90 | `linear-map` | maps | `LinearMapGraph` `linear` | `linear-map` / linear/linearMapPresetCollection.ts | linear-maps#matrix-and-image (derivable) | R,clip:linear-complex | no |
| 91 | `complex-reciprocal` | maps | `ComplexReciprocalGraph` `complex` | `complex-reciprocal` / complex/complexReciprocalPresets.ts | complex-maps#reciprocal-inversion (derivable) | R,clip:linear-complex | no |
| 92 | `complex-roots` | maps | `ComplexRootsGraph` `complex` | `complex-roots` / complex/complexRootsPresets.ts | complex-maps#roots (derivable) | R,clip:linear-complex | no |
| 93 | `triangle-centres` | plane-geom | `NotablePointsGraph` `compgeo` | `compgeo-notable-points` / compgeo/notablePointsPresetCollection.ts | triangle-geometry#notable-points (derivable) | R,clip:triangle-geometry | no |
| 94 | `inscribed-angle` | plane-geom | `InscribedAngleGraph` `compgeo` | `compgeo-inscribed-angle` / compgeo/inscribedAnglePresetCollection.ts | triangle-geometry#inscribed-angle (derivable) | R,clip:triangle-geometry | no |
| 95 | `euler-line` | plane-geom | `EulerLineGraph` `compgeo` | `compgeo-euler-line` / compgeo/eulerLinePresetCollection.ts | triangle-geometry#euler-line (derivable) | R,clip:triangle-geometry | no |
| 96 | `simson-line` | plane-geom | `SimsonLineGraph` `compgeo` | `compgeo-simson-line` / compgeo/simsonLinePresetCollection.ts | triangle-geometry#simson-line (derivable) | R,clip:triangle-geometry | no |
| 97 | `inversion` | plane-geom | `InversionGraph` `compgeo` | `compgeo-inversion` / compgeo/inversionPresetCollection.ts | triangle-geometry#inversion (derivable) | R,clip:triangle-geometry | no |
| 98 | `orientation` | comp-geom | `OrientationGraph` `compgeo` | `compgeo-orientation` / compgeoArr | convexity-hulls#orientation (derivable) | R,clip:convexity-hulls | no |
| 99 | `polygon-area` | comp-geom | `PolygonAreaGraph` `compgeo` | `compgeo-polygon-area` / compgeoArr | convexity-hulls#polygon-area (derivable) | R,clip:convexity-hulls | no |
| 100 | `convex-hull` | comp-geom | `HullTraceGraph` `compgeo` | `compgeo-hull-trace` / compgeo/hullTracePresetCollection.ts | convexity-hulls#convex-hull (derivable) | R | no |
| 101 | `point-in-polygon` | comp-geom | `PointInPolygonGraph` `compgeo` | `compgeo-point-in-polygon` / compgeo/pointInPolygonPresetCollection.ts | convexity-hulls#point-in-polygon (derivable) | R,clip:convexity-hulls | no |
| 102 | `hull-robustness` | comp-geom | `HullRobustnessGraph` `compgeo` | `compgeo-hull-robustness` / compgeo/hullRobustnessPresetCollection.ts | convexity-hulls#hull-robustness (derivable) | R | no |
| 103 | `bezier-hulls` | comp-geom | `BezierHullsGraph` `compgeo` | `compgeo-bezier-hulls` / compgeo/bezierHullsPresetCollection.ts | convexity-hulls#bezier-hulls (derivable) | R | no |
| 104 | `ear-clipping` | comp-geom | `EarClippingGraph` `compgeo` | `compgeo-ear-clipping` / compgeo/earClippingPresetCollection.ts | triangulations-voronoi#ear-clipping (derivable) | R | no |
| 105 | `point-set-triangulation` | comp-geom | `TriangulationGraph` `compgeo` | `compgeo-triangulation` / compgeo/triangulationPresetCollection.ts | triangulations-voronoi#point-set-triangulation (derivable) | R,clip:compgeo-hulls | no |
| 106 | `delaunay` | comp-geom | `DelaunayGraph` `compgeo` | `compgeo-delaunay` / compgeo/delaunayPresetCollection.ts | triangulations-voronoi#delaunay (derivable) | R | no |
| 107 | `voronoi` | comp-geom | `VoronoiGraph` `compgeo` | `compgeo-voronoi` / compgeo/voronoiPresetCollection.ts | triangulations-voronoi#voronoi (derivable) | R,clip:compgeo-voronoi | no |
| 108 | `voronoi-degenerate` | comp-geom | `DegenerateSitesGraph` `compgeo` | `compgeo-voronoi-degenerate` / compgeo/degenerateSitesPresets.ts | triangulations-voronoi#voronoi-degenerate (derivable) | R,clip:compgeo-voronoi | no |
| 109 | `interval-sweep` | comp-geom | `IntervalSweepGraph` `compgeo` | `compgeo-interval-sweep` / compgeo/intervalSweepPresetCollection.ts | sweep-algorithms#interval-sweep (derivable) | R | no |
| 110 | `segment-intersections` | comp-geom | `BentleyOttmannGraph` `compgeo` | `compgeo-bentley-ottmann` / compgeo/bentleyOttmannPresetCollection.ts | sweep-algorithms#segment-intersections (derivable) | R | no |
| 111 | `monotone-partition` | comp-geom | `MonotonePartitionGraph` `compgeo` | `compgeo-monotone-partition` / compgeo/monotonePartitionPresetCollection.ts | sweep-algorithms#monotone-partition (derivable) | R | no |
| 112 | `monotone-triangulation` | comp-geom | `MonotoneTriangulationGraph` `compgeo` | `compgeo-monotone-triangulation` / compgeo/monotoneTriangulationPresetCollection.ts | sweep-algorithms#monotone-triangulation (derivable) | R | no |
| 113 | `fortune` | comp-geom | `FortuneGraph` `compgeo` | `compgeo-fortune` / compgeo/fortunePresetCollection.ts | sweep-algorithms#fortune (derivable) | R | no |

## Shared collections and cross-group cases

Shared collection used by several ids:

- `bspline-curve` (`bsplinePresetCollection`): all 6 B-spline ids reference one collection instance; `collectionKeys` repeats the key six times (the integrity check allows repeated references to one collection). It is the only collection shared by several ids.
- The four aggregate maps are shared *definition files*, not shared collections: `curveMap` (32 ids: basics `bernstein`, 8 poly-Bezier + `reduction` + `arc-length-param`, 6 rational without `circle`, 5 splines, 2 PH, 3 param, curvature/comb/evolute/offset/envelope), `fnMap` (38 ids incl. interpolation `interp-runge`/`interp-least-squares`, basics `complex-multiplication`, 14 functions, 16 analysis, 5 probability), `patchMap` (6) and `compgeoArr` (17 collections, only `orientation` and `polygon-area` are defined in the file itself). Graph files import these maps by key (`curvePresetCollections["ph-cubic"]`, `functionPresetCollections...`), and `PresetImport.ts` spreads `Object.values(curvePresetCollections)` and `Object.values(functionPresetCollections)` / `patchPresetCollections` whole.

Implementation modules that cross catalog groups (directory: families served):

- `compgeo`: poly-Bezier 1 (`bezier-clipping`), plane geometry 5, computational geometry 16. Also `BezierHullsGraph` stays comp-geom.
- `functions`: interpolation 2 (`interp-runge`, `interp-least-squares`), functions 14, analysis 16, probability 5.
- `complex`: basics 1 (`complex-multiplication`), maps 2.
- `curves/bezier`: poly-Bezier 8, curve geometry 2 (`curve-curvature`, `curve-evolute`).
- Single-family dirs: `bernstein` 1, `curves/{reduction,arclength}` 1 each, `curves/rational` 7, `curves/spline` 5, `curves/ph` 2, `curves/parametrisations` 3, `curves/{parametric,comb,offset,envelope}` 1 each, `curves/{interpolation,hermite,subdivisionCurves}` 1 each (all three catalog "interpolation"), `curves/bspline` 6, `patches` 7, `linear` 1.
- Collection files that cross groups: `curveMap` serves 7 catalog families, `fnMap` 5, `bezier-clipping`'s collection lives in `compgeo/` while its row is in the polynomial-Bezier family.

## Unknown owners

None. All 113 ids resolve to: a graph class, a collection (or `circle`'s documented absence), a primary `guidedLessonOwners` row and a preview recipe. One accepted file collection has no id: `g1-spline` in `legacyCurvePresetCollections` (removed graph, kept for old exports; `PresetImport.ts` spreads it). It needs a home (keep in a root `legacy` list or move to the splines collections module) when `curveMap` is split.

## Root composition sites a batch edits

Per batch (all central files that still carry the ids): `src/demonstrations.ts` (delete the family's rows from `legacyDemonstrationRows`, add one import and one spread to `definitions`), `src/graphs/graphFactories.ts` (delete entries and class imports; the table shrinks, `Record<Exclude<DemonstrationId, RegisteredDemonstrationId>, ...>` stays valid), `src/graphs/graphLoaders.ts` (one spread), `src/graphs/base/presets/PresetImport.ts` (replace the id's collection imports/spreads by one family `collections.ts` spread), `src/learning/chapter/guidedLessonOwnership.ts` (delete `derivable` primary rows; `DerivedOwnerId` and `derivedOwnerIds` are projective-only today and must generalize to every registered row set), `src/graphs/registrationIntegrity.test.ts` (one `realFamilies` entry) and a `registrationComposition.test.ts` per family. Not edited: preview recipes, clip rows, manifest, `smoke-catalog.cjs`, Routes (all keyed by id/catalog). `allGraphFactories.ts` (test adapter) stays; `Routes.tsx` fallback and `graphFactories.ts` are retired only after the last batch (step 4).

Families-prep (stream worktree `worktree-stream-families-prep-2`, HEAD `6c588f64`, same content as this branch's `feb34d57`): its F2b registration for all 15 families is done (`families-prep.md` rows 1-15). Its remaining work is F3-F5 lessons, which edit `chapterOwnedLessons.ts`, `guidedLessonOwnership.ts` (new primary rows), `familyChapters`, `lessonAvailability` and its own `registration.ts` (removing `lesson: false`). `git log` for the roots: `demonstrations.ts` and `graphLoaders.ts` last touched by `06a5ea0d` (F2b complex batch D), `PresetImport.ts` the same; `guidedLessonOwnership.ts` and `chapterOwnedLessons.ts` last touched by `feb34d57` (kinematics F3), `19af0446` (combinatorics F3), `ffb1d186` (circle geometry F3), `f91d0287` (isometries F3). So serialize against Families-prep on `guidedLessonOwnership.ts` / `chapterOwnedLessons.ts` (every batch touches the owners table); `demonstrations.ts`, `graphLoaders.ts`, `PresetImport.ts` have no pending Families-prep registration edit as of this check (not re-verified against the stream worktree's uncommitted state).

## Batch list (113 entries, 16 batches)

Each batch adds `<dir>/registration.ts`, `runtime.ts`, `collections.ts` (plus a `registrationComposition.test.ts`, loading and deletion tests) and removes the sites above. Graph files are not edited unless stated, so B-splines does not collide with task 07's scene edits in `BSpline{Basis,DeBoor,Insertion,Extraction}Graph.tsx`; sequence it after the task 07 B-spline batch anyway to keep diffs separable. Whole catalog families move together so row order inside each family is preserved (the catalog groups by `families` and keeps row order within a family; moved rows trail the legacy rows in `definitions`, which `registrationIntegrity.test.ts` already expects).

| Batch | Family (size) | Implementation modules | Collections | Notes |
|-------|---------------|------------------------|-------------|-------|
| 1 | B-splines (6): `bspline-basis`, `-deboor`, `-insertion`, `-extraction`, `-nurbs`, `-blossom` | `curves/bspline` | `bspline-curve` x6 | after task 07 B-spline batch; credit task 04 pilots for scene ownership only |
| 2 | basics (2): `bernstein`, `complex-multiplication` | `bernstein`, `complex` | `bernstein-graph` (curveMap), `complex-multiplication` (fnMap) | crosses 2 dirs and 2 maps |
| 3 | polynomial Bezier (11): `bezier`, `decasteljau`, `decasteljau-alternative`, `affine`, `subdivision`, `repeated-subdivision`, `extrapolation`, `elevation`, `reduction`, `arc-length-param`, `bezier-clipping` | `curves/bezier`, `curves/reduction`, `curves/arclength`, `compgeo` | curveMap x10, `compgeo-bezier-clipping` | `bezier-clipping` row stays last of the family; implementation in `compgeo` |
| 4 | rational (7): `rational`, `rational-decasteljau`, `-elevation`, `-extrapolation`, `-subdivision`, `farin`, `circle` | `curves/rational` | curveMap x6; `circle` has none | `circle` blocker (below) |
| 5 | splines (5): `spline-cn`, `-c1`, `-c2`, `-g1`, `-g1-symmetric` | `curves/spline` | curveMap x5 | `g1-spline` legacy collection needs a home |
| 6 | PH (2): `ph-cubic`, `ph-quintic` | `curves/ph` | curveMap x2 | |
| 7 | parameterization (3): `spline-parameterization`, `weighted-parameterization`, `uniform-parameterization` | `curves/parametrisations` | curveMap x3 | |
| 8 | curve geometry (6): `curve-parametric`, `-curvature`, `-comb`, `-evolute`, `-offset`, `-envelope` | `curves/parametric`, `curves/bezier` (2), `curves/comb`, `curves/offset`, `curves/envelope` | curveMap x5, `curve-parametric` standalone | last `curveMap` user: this batch deletes the `Object.values(curvePresetCollections)` spread if batches 2-7 split the map; see decision |
| 9 | interpolation (5): `interp-lagrange`, `-hermite`, `-runge`, `-least-squares`, `-subdivision` | `curves/interpolation`, `curves/hermite`, `functions` (2), `curves/subdivisionCurves` | 3 standalone, 2 in fnMap | |
| 10 | patches (7): `patch-tensor`, `-decasteljau`, `-derivatives`, `-subdivision`, `-joins`, `-triangular`, `-coons` | `patches` | patchMap x6, `patch-coons` standalone | all `view: 'surface'` |
| 11 | functions (14): `linear-function`, `exponential-function`, `trigonometric-functions`, `function-transformation`, `function-inverse`, `polynomial-zeros`, `rational-function`, `geometric-series`, `conic-focal`, `continuity`, `derivative`, `definite-integral`, `area-between-curves`, `arc-length` | `functions` | fnMap x14 | |
| 12 | analysis (16): `bisection`, `root-finding`, `quadrature`, `euler-method`, `mean-value`, `accumulation`, `darboux`, `extrema`, `convexity`, `taylor`, `sequence`, `uniform-convergence`, `fourier-series`, `fourier-coefficients`, `epicycles`, `fixed-point` | `functions` | fnMap x16 (`euler-method` -> key `euler`, `epicycles` -> `epicycle`) | split 8+8 if too large |
| 13 | probability (5): `prob-density`, `-binomial-normal`, `-clt`, `-summary`, `-correlation` | `functions` | fnMap x5 | last `fnMap` user |
| 14 | maps (3): `linear-map`, `complex-reciprocal`, `complex-roots` | `linear`, `complex` | 3 standalone | `linear-map` also carries Batch D modes (no row) |
| 15 | plane geometry (5): `triangle-centres`, `inscribed-angle`, `euler-line`, `simson-line`, `inversion` | `compgeo` | 5 standalone | graph files `InscribedAngle`, `SimsonLine`, `Inversion` overlap task 07/08 candidates |
| 16 | computational geometry (16): `orientation` ... `fortune` | `compgeo` | `compgeoArr` (2 defined there) + 14 standalone | split 8+8 if too large; `compgeoArr` overlay constants stay imported by graphs |

Sizes: 6 + 2 + 11 + 7 + 5 + 2 + 3 + 6 + 5 + 7 + 14 + 16 + 5 + 3 + 5 + 16 = 113.

## Blockers and decisions the migrating worker needs

1. **`circle` has no Preset collection.** `checkRegistrations` reports "id has no collection reference" for any row without one, and the family test requires it. Needs a contract decision (optional collection key with an explicit "none" entry, aligned with `NO_PRESET_COLLECTION` in `graphTransientStateContract.tsx`) before batch 4. Only legacy id in this state.
2. **Aggregate collection maps vs staged batches.** `PresetImport.ts` spreads whole maps and the key-uniqueness test (`registrationIntegrity.test.ts`) fails on a repeated collection, so a batch cannot add `curveMap`/`fnMap` entries to its family `collections.ts` while the full map spread remains. Choices: split each map per family (graph files then change `curvePresetCollections["ph-cubic"]` imports, touching graphs also in task 07's list only for the curves map users), or filter the spread by migrated ids until the last user lands (batch 8 for curveMap, 13 for fnMap, 10 for patchMap, 16 for compgeoArr).
3. **Derived primary owners.** 45 of 113 primary owners sit in chapters without owned-lesson rows, so they cannot be derived from `chapterOwnerRows()`; keep them as explicit family metadata (or keep the table rows) and say so. For the 68 derivable ids confirm the first `chapterOwnerRows()` row equals the current primary before deleting (multi-chapter ids). `DerivedOwnerId` is projective-only today.
4. **Flat catalog order.** Moving rows to the registered tail changes the flat `definitions` order of the moved ids (not the per-family order). Not checked: consumers of flat order (preview manifest ordering, home page, `GUIDED_LESSON_AVAILABLE_IDS`).
5. **Legacy file collection `g1-spline`** (see Unknown owners) and the accidental key/id mismatches (`euler-method` -> `euler`, `epicycles` -> `epicycle`, `decasteljau-alternative` -> `decasteljau2`, ...) are a file contract and must not change.
6. Not verified: nothing was run; owner and tooling columns come from static text matching of the sources above (clip rows matched by `id:` in `scripts/demonstration-clip-rows/*.cjs`; recipes matched by quoted id), and "derivable/explicit" is judged from chapter ids, not by executing `chapterOwnerRows()`.
