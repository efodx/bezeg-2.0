# 08 Convert all demonstrations

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) "Converting all graphs"; [ADR 0065](../../adr/0065-graphs-declare-presenters-render.md). This is an [item batch](../feature-streams/README.md#item-batches): triage first.

## Goal

Every registered demonstration declares itself and renders only through the presenters. The unit is the demonstration as registered in `src/graphs/**/runtime.ts`: 138 by the independent review's count, with the inventory script of task 02 as the authority. 29 graph files carry a prototype declaration to port (`workspaceUx` at the frozen commit; conversion notes copied from `night/conv/<id>/NOTES.md`). Eight are done as pilots.

## Gate

Tasks 02 to 07 are accepted on the pilots and released to `master`; the contract is frozen. From here a contract change is reported to the handler and stops the affected lane; converters do not work around it.

## What the review found about sharing (verified counts on `master`)

- Lesson files do not partition the demonstrations: one covers 16, fifteen cover three or more, and 11 demonstrations span several lesson files.
- 18 shared panel files hold sliders (for example `src/graphs/base/controls/BezierCurveControls.tsx`), and `BaseFunctionGraph` has 35 subclasses.
- Catalog keys are type checked (`src/localization/sl.ts`, 6,070 lines): a lane cannot pass `tsc` with a new string whose key does not exist.
- All-graph suites (`PresetRoundTrip.contract`, `graphTeardownContract`, `controlsSignature`, `GraphTransientState*`) iterate every demonstration.

## Steps

1. **Triage** (one worker): run the inventory; class each demonstration as plain, several modes, expensive redraw, playback, board-drawn legend, point-set, surface, controls outside `BaseGraph` (Playground), or needs a contract change. Demonstrations needing a contract change go to the handler before any lane starts.
2. **Shared code first** (handler's workers, sequential): convert the shared panels and base classes, so their subclasses inherit bound parameters and declared controls. Include a `useLease` passthrough on `IterationController` (`src/learning/runtime/iterationController.ts`; its `AnimationDriver` is private, so the linear map pilot takes its own lease) before any lane uses it. Rerun the inventory; many "plain" function graphs should now need only readouts, legend and frames.
3. **Golden values:** record every remaining demonstration's present panel values with the parity tool, in one run, before any lane removes a panel.
4. **Partition:** connected components over shared files (graph file, lesson files, remaining shared panels, own tests). A component is never split across lanes. A component too large for one session (the 16-demonstration lesson file) is one lane's work for several consecutive sessions. Write the lane table below; order rounds so each can be published by itself.
5. **Catalog keys per round:** the handler adds the round's keys (listed by the inventory) to `sl.ts` and `en.ts` and commits before dispatch, or uses the per-family fragments if task 02 chose them.
6. **Lanes:** three at a time, each a `bezeg-worker` (Sonnet `medium`) in its own worktree and branch with its own dev server port, two or three demonstrations per session. One shared brief file serves every lane (the repository's conversion guide with its worked example, the checklist, the per-demonstration check recipe, the owned-path rule, a 300-word report with the recipe's summary per demonstration and a notes file); a dispatch adds only the lane's inventory rows. Workers edit their component's files and their demonstrations' own tests; they do not edit the catalogs, shared inputs, shared panels or all-graph suites, and report a missing key or a failing all-graph case to the handler. Two judgements are the converter's, by the guide's examples, each with one line of reasoning in the notes: where each non-slider control goes (board or Orodja), and Legenda's default place when bottom right covers the data.
7. **Accept per lane:** recipe green for each demonstration, and the golden recordings of all ids still match (`BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx`, no `BEZEG_PARITY_GOLDEN_ID`). A `bezeg-visual` agent captures one contact sheet per lane with `just shot --sheet --selector <board>` and judges it against the guide's checklist, returning pass or fail per demonstration as text. The handler plays one in four in the browser (free play with interruption, lesson walk); a `bezeg-reviewer` reads one in four for mathematics and highlight rules. Then merge the round's lanes, run `just check` (the all-graph suites), the full contract test and the fuzzer at 5 seeds per merged route, and publish once per round in the background ([running the work economically](README.md#running-the-work-economically)).
8. **After round one:** record worker time, context, repairs and files touched per demonstration here, and replace the estimate before round two.

## Triage decisions (handler 7, 2026-11-25)

Triage: [`08-triage.md`](../../reviews/ux-picks-app-wide/inventory/08-triage.md) (138 demonstrations; 10 declared). Its six contract items are settled by precedent; none changes the contract, so no lane stops for them:

- **Second board** (6 patch demonstrations, `parameterInset.ts`): an auxiliary board is never fitted and declares nothing (director design); its controls follow the main board's declaration.
- **3D camera** (8 surfaces): as the Coons pilot: the director does not run, the camera stays in the graph's own controls in Orodja, cards rely on placement.
- **Vector-valued parameters** (B-spline knots, summary statistics data): as the linear-map and phase-portrait pilots: the editor stays in Orodja, the parameter is not declared.
- **Point and point-set parameters** (22 point-set, 32 curve-point demonstrations): as triangle centres (task 02 decision): points are board-owned, shown as rows and legend only; their row editors are the declared point rows.
- **`equalAxisUnits` false** (19): the director's fit already takes the intent's `keepAspectRatio`; a graph whose content is tall relative to its width declares `followView` as bisection does.
- **Board captions and formula values** (54): stay board-drawn in 08; that cards can cover them stays an open item for the feel follow-ups.

## Round 1 measurements (from `briefs/notes/08-lane-L0*.md`)

| Lane | Demonstration | Wall-clock | Worker sessions | Repairs after the lane |
|---|---|---|---|---|
| L05 | elevation | about 5 min (16:58 to 17:04) | 1 | batch C: puck veto, `elevate` on the board, legend entry for the new points |
| L06 | function-inverse | about 16 min to unit green (16:44 to 17:00), then graph-check and golden | not stated in the notes | batch B (plotted list), batch C (empty groups, P and P' legend entries) |
| L01 | bspline-blossom | first session ended at the budget signal (started 17:11, tsc only), second about 17 min | 2 | batch B (view marks), batch C (localized refusals, tagging) |

Files per demonstration were not tallied in the notes; take them from the round-1 commits' `git show --stat`. The common misses of
`08-lane.md` (empty `inspector-group`, legend entries per marker, red check on an id, tagging) all came from the review of round 1.

## Estimate

Not known yet. The trial's figure (about 50k context and 5 minutes per graph in a long session) came from conversions that kept the old UI behind a flag, edited no tests and wrote no catalog keys, and all twelve were "accept with fixes". Planning figure: two or three demonstrations per session, so roughly 45 to 65 sessions after the pilots and the shared-code step. Round one decides.

## Acceptance

- The contract test passes for every demonstration and lesson frame; each declaration reproduces its golden values.
- Every demonstration's parameters are bound to the arbiter (task 01), and the untagged-write check passes for all of them in the all-graph suites.
- No demonstration renders its own readout, legend, or range, count, choice or toggle control; controls left in Orodja by decision are listed by the inventory.
- `just check` passes after every round; the fuzzer passes 5 seeds per route; a `just shot` sweep of every route, free and lesson, at 1440×900 shows no page error.
- Mathematics untouched: no geometry edit in a lane's diff (checked by search per lane; the reviewer's sample confirms).

## Lane table

Computed by `docs/reviews/ux-picks-app-wide/inventory/08-partition.cjs` into `08-partition.json` (lanes, sessions, owned files, conflict edges): lanes are the lesson-file components of the 122 demonstrations not yet declared, in sessions of 2-3 demonstrations (` ; ` separates sessions); rounds are greedy (at most 3 lanes, the owner lane of an unconverted shared base first, no shared graph file or own test inside a round). Already declared (16, in no lane): bezier, bisection, bspline-blossom, decasteljau, elevation, exponential-function, function-inverse, function-transformation, linear-map, patch-coons, phase-portrait, polygon-area, projective-cross-ratio, rational-decasteljau, taylor, triangle-centres.

| Round | Lane | Demonstrations | Files owned (short) | Status |
| --- | --- | --- | --- | --- |
| 1 | L01 | bspline-blossom | (merged) | done |
| 1 | L05 | elevation | (merged) | done |
| 1 | L06 | function-inverse | (merged) | done |
| 2 | L38 | root-finding | graph files + `numericalMethodsGuidedLessons`; owns first `IterativeFunctionGraph` | done `ac2972f09` |
| 2 | L40 | bezier-clipping | graph files + `bezierClippingGuidedLessons` | done `a1b67415b` |
| 2 | L46 | arc-length, area-between-curves, continuity ; definite-integral, derivative ; linear-function, trigonometric-functions | graph files + `functionGuidedLessons` | done `b7ebb428e`, `e28e14a31`, `fdfeec8bc` |
| 3 | L02 | bspline-extraction | graph files + `bsplineExtractionGuidedLessons`; owns first `KnotEditor` | done `1a3393445` |
| 3 | L07 | interp-least-squares | graph files + `interpolationLeastSquaresLesson` | done `8f17c48a6` |
| 3 | L08 | reduction | graph files + `degreeReductionGuidedLessons` | done `cccbccdaa` |
| 4 | L03 | bspline-insertion | graph files + `bsplineInsertionGuidedLessons` | done `392bc89f5` |
| 4 | L09 | circle-construction | graph files + `circleGeometryGuidedLessons` | done `6772a3f2e` |
| 4 | L10 | euler-method | graph files + `numericalEulerGuidedLesson` | done `bfdf1a5df` |
| 5 | L04 | bspline-nurbs | graph files + `bsplineNurbsGuidedLessons` | not started |
| 5 | L11 | fourier-coefficients | graph files + `fourierCoefficientsGuidedLessons` | not started |
| 5 | L12 | fourier-series | graph files + `fourierSeriesGuidedLessons` | not started |
| 6 | L13 | isometries | graph files + `isometriesFriezeGuidedLessons +2` | not started |
| 6 | L14 | line-geometry | graph files + `analyticLinesGuidedLessons, analyticLinesIntersectGuidedLessons` | not started |
| 6 | L15 | linear-program | graph files + `levelSetsGuidedLessons` | not started |
| 7 | L16 | projective-five-point | graph files + `projectiveFivePointGuidedLesson` | not started |
| 7 | L18 | quadrature | graph files + `numericalQuadratureGuidedLesson` | not started |
| 7 | L19 | recursion-growth | graph files + `recursionGuidedLessons, recursionLogScaleGuidedLessons` | not started |
| 8 | L17 | projective-three-views | graph files + `projectiveThreeViewsGuidedLesson` | not started |
| 8 | L20 | triangle-solver | graph files + `trigSolveGuidedLessons, trigTriangleGuidedLessons` | not started |
| 8 | L23 | arc-length-param | graph files + `arcLengthGuidedLessons` | not started |
| 9 | L22 | unit-circle | graph files + `trigUnitCircleGuidedLessons` | not started |
| 9 | L24 | bspline-deboor | graph files + `bsplineDeBoorGuidedLessons` | not started |
| 9 | L25 | logistic-map | graph files + `phasePortraitsGuidedLessons` | not started |
| 10 | L26 | complex-euler | graph files + `complexEulerGuidedLessons` | not started |
| 10 | L28 | complex-reciprocal, complex-roots | graph files + `complexMapsChapterLessons` | not started |
| 10 | L29 | contour-map | graph files + `levelSetsContourGuidedLessons, levelSetsOptimizationGuidedLessons`; owns first `SurfaceCameraPanel` | not started |
| 11 | L27 | complex-power | graph files + `complexPowerGuidedLessons` | not started |
| 11 | L30 | counting-tree, lattice-paths | graph files + `combinatoricsGuidedLessons, combinatoricsRowGuidedLessons` | not started |
| 11 | L31 | curve-kinematics | graph files + `kinematicsDecompositionGuidedLessons, kinematicsGuidedLessons` | not started |
| 12 | L32 | epicycles | graph files + `epicyclesGuidedLessons` | not started |
| 12 | L33 | mechanics-descent | graph files + `mechanicalCurvesGuidedLessons` | not started |
| 12 | L34 | polynomial-zeros, rational-function | graph files + `schoolFunctionGraphsBatchBGuidedLessons` | not started |
| 13 | L35 | prob-simulation | graph files + `randomnessAreaGuidedLessons +4` | not started |
| 13 | L36 | projective-pascal, projective-pole-polar | graph files + `projectiveConicsGuidedLessons` | not started |
| 13 | L37 | recursion-cobweb | graph files + `recursionCobwebGuidedLessons` | not started |
| 14 | L39 | waves | graph files + `wavesGuidedLessons, wavesSamplingGuidedLessons` | not started |
| 14 | L42 | conic-focal, geometric-series | graph files + `schoolFunctionGraphsBatchCGuidedLessons` | not started |
| 14 | L43 | interp-hermite, interp-lagrange ; interp-runge, interp-subdivision | graph files + `interpolationGuidedLessons` | not started |
| 15 | L44 | spline-c1, spline-c2, spline-cn ; spline-g1, spline-g1-symmetric, spline-parameterization | graph files + `splineGuidedLessons` | not started |
| 15 | L47 | prob-binomial-normal, prob-clt, prob-correlation ; prob-density, prob-summary | graph files + `probabilityGuidedLessons` | not started |
| 15 | L49 | curve-comb, curve-curvature, curve-envelope ; curve-evolute, curve-offset, curve-parametric | graph files + `curveGeometryGuidedLessons` | not started |
| 16 | L50 | accumulation, convexity, darboux ; extrema, fixed-point, mean-value ; sequence, uniform-convergence | graph files + `analysisGuidedLessons` | not started |
| 16 | L51 | euler-line, inscribed-angle ; inversion, simson-line | graph files + `triangleGeometryChapterLessons` | not started |
| 16 | L52 | bspline-basis | graph files + `bsplineBasisGuidedLessons` | not started |
| 17 | L53 | solids | graph files + `solidsGuidedLessons +2`; owns first `BaseSurfaceGraph` | not started |
| 17 | L54 | bezier-hulls, convex-hull, delaunay ; ear-clipping, fortune, hull-robustness ; interval-sweep, monotone-partition, monotone-triangulation ; orientation, point-in-polygon, point-set-triangulation ; segment-intersections, voronoi, voronoi-degenerate | graph files + `compgeoGuidedLessons` | not started |
| 17 | L56 | ph-cubic | graph files + `guidedLessons`; owns first `BasePhBezierCurveGraph` | not started |
| 18 | L21 | uniform-parameterization, weighted-parameterization | graph files + `parameterizationGuidedLessons` | not started |
| 18 | L55 | patch-decasteljau, patch-derivatives, patch-tensor | graph files + `patchGuidedExamplesBasics, patchGuidedExamplesEvaluation`; owns first `PatchPointChooser, PatchPointEditor` | not started |
| 19 | L45 | rational, affine, ph-quintic | graph files + `expansionGuidedLessons`; owns first `BaseRationalCurveGraph` | not started |
| 19 | L58 | patch-joins, patch-subdivision, patch-triangular | graph files + `patchGuidedExamplesAdvanced` | not started |
| 20 | L41 | extrapolation, rational-extrapolation, rational-subdivision ; repeated-subdivision, subdivision | graph files + `constructionGuidedLessons` | not started |
| 21 | L48 | circle, decasteljau-alternative, farin | graph files + `rationalConstructionGuidedLessons` | not started |
| 22 | L57 | bernstein, complex-multiplication, rational-elevation | graph files + `foundationGuidedLessons` | not started |
