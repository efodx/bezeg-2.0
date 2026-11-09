# Playback route inventory (work item 1, code part) — code part complete

Read-only code inventory for [graph-adjacent controls](graph-adjacent-controls.md), reverified at HEAD on 2026-11-09 (Wave 1 survey 2026-11-08, then Wave 2 sweeps and contracts task 3). Not yet verified in a browser; no screenshots (see *Browser part*). Paths under `src/`; routes from `demonstrations.ts`, graphs from `graphs/graphFactories.ts`. 34 playback or stepping rows below (Wave 1 listed 16 table rows plus 11 compgeo traces).

## Shared hosts

- `graphs/base/controls/PlaybackButtons.tsx:56`: group `inspector-playback` (`data-action` `next-step`/`play-pause`/`reset`, blocked buttons stay focusable, status line), optional `children` for extra buttons. Used by every iterative and trace row marked PB.
- Iterative functions: `graphs/functions/IterativeFunctionGraph.tsx` (`IterationController`, `nextStep` 80, `play` 89, `replaceModel` 66). Every parameter or example edit goes through `replaceModel`, which resets the controller to the model's revealed step and so **stops playback** (step kept or zeroed per model). No speed control: `stepIntervalMs()` is a constant per graph.
- Trace graphs: `graphs/compgeo/tracePlayback.ts:33` `TracePlayback` (task 3, shared). A new model (point edit, example, algorithm) returns the step to 0 and resets the controller; Play stops at the last event. No speed control (`intervalMs` constant per graph).
- `graphs/curves/bezier/DecasteljauAnimationControls.tsx:27`: panel with Play 39, Pause 42, Stop 45, Replay 48, parameter slider 52, speed slider 56. Both De Casteljau routes, own state in `DecasteljauGraph*.tsx`.
- `EpicyclePlayback` (`graphs/functions/EpicycleGraph.tsx:577`), rendered in the inspector at :493.
- Placement: `graphs/base/DemonstrationWorkspace.tsx` graph section ~229–240, `aside#workspace-inspector` ~242–269; playback groups render in the inspector, below the graph on narrow widths (source spec line 13). The De Casteljau panel and the arc-length and parametric buttons enter through `getGraphCommands()`/`workspaceEdit()` (same inspector).

## Routes

Kind: iterative = discrete steps; continuous = frame-driven; mixed = both. Host PB = `PlaybackButtons`.

### Iterative functions and curves (PB)

| Route | Graph | Kind | Actions | Live controls; effect of editing | Host |
| --- | --- | --- | --- | --- | --- |
| `/analysis/fixed-point` | `functions/FixedPointGraph.tsx` | iterative | Next, Play/Pause, Reset | example 362, x0 367, digits 370; edits pause (`replaceModel`, :140–176); no speed | PB :376 |
| `/analysis/bisection` | `BisectionGraph.tsx` | iterative | Next, Play/Pause, Reset | example 277, a 282, b 284; edits pause (:132–154); no speed | PB :289 |
| `/analysis/sequence` | `SequenceGraph.tsx` | iterative | Next, Play/Pause, Reset | example 360, epsilon 365, limit 368, threshold 371; edits pause (:168–208); no speed | PB :377 |
| `/analysis/root-finding` | `RootFindingGraph.tsx` | iterative | Next, Play/Pause, Reset | method 270, example 273, x0 278, x1 280 (secant); edits pause (:146–166); no speed | PB :285 |
| `/functions/geometric-series` | `GeometricSeriesGraph.tsx` | iterative | Next, Play/Pause, Reset | example 265, a 270, q 273, terms 276, tolerance 279; edits pause (:120–157); no speed | PB :285 |
| `/probability/clt` | `CltGraph.tsx` | iterative | Next (add copy), Play/Pause, Reset (n = 1) | example 223, n slider 227, base heights 239; edits pause (:101–140); no speed | PB :230 |
| `/bspline/deboor` | `curves/bspline/DeBoorGraph.tsx` | iterative | Next level, Play/Pause, Reset levels | degree, point count, t slider 349, point and knot lists; any edit ends playback, level kept (:177–179); no speed | PB :352 |
| `/interpolation/subdivision` | `curves/subdivisionCurves/SubdivisionCurveGraph.tsx` | iterative | Next, Play/Pause, Reset | rule select 368 (returns to round 0, paused, :311), closed toggle (pauses, :306); no speed | PB :381 |

### Continuous and mixed

| Route | Graph | Kind | Actions | Live controls; effect of editing | Host |
| --- | --- | --- | --- | --- | --- |
| `/bezier/decasteljau` | `curves/bezier/DecasteljauGraph.tsx` | continuous | Play, Pause, Stop, Replay | parameter slider (scrub keeps running state, :217), speed slider (live, read per frame :43); no pause/reset on speed | `DecasteljauAnimationControls`, :190 |
| `/bezier/decasteljau2` | `DecasteljauGraph2.tsx` | continuous | same four | same | `DecasteljauAnimationControls`, :197 |
| `/rational/rational-decasteljau` | `curves/rational/RationalDecasteljauGraph.tsx` (extends `DecasteljauGraph`) | continuous | same four | same | inherited, `DecasteljauGraph.tsx:190` — **new row** |
| `/curve-geometry/parametric` | `curves/parametric/ParametricCurveGraph.tsx` | continuous | Roll play/stop toggle (one button; lesson adds pause/replay/stop/reset, :42) | curve select (stops roll :163), parameter slider (does not stop), cycloid radius (does not stop) | own button, :289 |
| `/bezier/arc-length` | `curves/arclength/ArcLengthParametrizationGraph.tsx` | continuous | Play/Pause toggle (disabled under reduced motion) | curve, pieces, mover mode (pauses :333), mover slider (disabled while playing 401–402); pressing the graph pauses (:150) | own button, :404 |
| `/analysis/epicycles` | `functions/EpicycleGraph.tsx` | continuous | Play/Pause toggle, time slider | example (resets time, stops :271), N 479, parametrization 487; time slider halts (:147); import resets (:198) | `EpicyclePlayback`, :493 / :577 (Button :583) |
| `/patches/tensor`, `/patches/triangular` | `patches/TensorPatchGraph.tsx:123`, `TriangularPatchGraph.tsx:104` via `patches/patchSweep.ts:29` | continuous (u and v sweeps) | Play, Pause, Replay, Stop per parameter (`SWEEP_COMMANDS` :6) | **lesson-only: no workspace controls at all** (no button or slider references sweeps; commands arrive as lesson `animation` actions `patch-u-sweep`/`patch-v-sweep`, `patchLessonActions.ts:168`) | none (lesson panel only) |
| `/analysis/euler-method` | `functions/EulerGraph.tsx` | iterative, stepping only | Next step, Show all (no Play) | end, exact toggle; own group, `aria-disabled` pattern | own-built, :303 — **new row** |

### Resolved open routes (no playback)

- `/bezier/subdivision-2` (`subdivision`, `SubdivisionGraph1.tsx`): parameter slider t at :163 and a scheme switch only; no animation (the `setInterval` grep hit is `setIntervalEnd`). `/rational/rational-subdivision` extends it: same.
- `/bezier/subdivision` (`repeated-subdivision`, `SubdivisionGraph.tsx`): no animation, no slider-driven playback.
- `/functions/arc-length` (`ArcLengthGraph.tsx`): n slider at :171 only; no playback.
- The Wave 1 guess "subdivision-2 = DecasteljauGraph3" was the import alias of `SubdivisionGraph1`; it is not an animation.

### Computational-geometry traces (PB, kind iterative, Next/Play/Reset; `TracePlayback`)

Extra controls beside playback in the same graph are listed; point dragging is available on all and resets the trace to step 0 and stops it.

| Route | Graph | Controls file:line (PB) | Extra live controls |
| --- | --- | --- | --- |
| `/compgeo/convex-hull` | `HullTraceGraph.tsx:50` | `HullTraceControls.tsx:113` | algorithm select 107 |
| `/compgeo/hull-robustness` | `HullRobustnessGraph.tsx:65` (extends `HullTraceGraph`) | `HullTraceControls` via `HullRobustnessGraph.tsx:512`, **chain mode only** (Kettner mode, :525, has no playback) | mode select, pop and duplicate rules |
| `/bezier/hulls` (bezier-hulls) | `BezierHullsGraph.tsx:67` (`TraceCurvePairGraph`) | `BezierHullsControls.tsx:53` | none beyond dragging |
| `/bezier/clipping` | `BezierClippingGraph.tsx:66` (`TraceCurvePairGraph`) | `BezierClippingControls.tsx:90` | tolerance select 84 |
| `/compgeo/ear-clipping` | `EarClippingGraph.tsx:63` | `EarClippingControls.tsx:89` | example select 85 |
| `/compgeo/delaunay` | `DelaunayGraph.tsx:62` | `DelaunayControls.tsx:135` | example select 131, triangle list and flips |
| `/compgeo/interval-sweep` | `IntervalSweepGraph.tsx:43` | `IntervalSweepControls.tsx:95` | none beyond dragging |
| `/compgeo/segment-intersections` | `BentleyOttmannGraph.tsx:44` | `BentleyOttmannControls.tsx:125` | none beyond dragging |
| `/compgeo/monotone-partition` | `MonotonePartitionGraph.tsx:60` | `MonotonePartitionControls.tsx:120` | example select 127 |
| `/compgeo/monotone-triangulation` | `MonotoneTriangulationGraph.tsx:37` (extends `MonotonePartitionGraph`) | `MonotoneTriangulationControls.tsx:111`, rendered by `MonotoneTriangulationGraph.tsx:179` | example select 118 |
| `/compgeo/fortune` | `FortuneGraph.tsx:59` | `FortuneControls.tsx:184` | examples select 191 |
| `/compgeo/voronoi` | `VoronoiGraph.tsx:98` (own `TracePlayback` :132, cell construction) | `VoronoiControls.tsx:222` plus a **Back** button (:229), four actions; **new row** | mode select 120, site buttons; step blocked-while-playing relaxed (`stepsWhilePlaying`) |
| `/compgeo/voronoi-degenerate` | `DegenerateSitesGraph.tsx:16` (extends `VoronoiGraph`) | inherited | mode select; **new row** |

Not playback despite the `inspector-playback` class: `DelaunayControls.tsx:153` (triangle list), `TriangulationControls.tsx:87` (flip group), `BSplineExtractionGraph.tsx:255`, `BSplineInsertionGraph.tsx:276`, `BSplineNurbsGraph.tsx:310` (plain button rows).

### Learning playgrounds

| Surface | Component | Kind | Actions | Live controls | Host |
| --- | --- | --- | --- | --- | --- |
| collision run and polygon playgrounds (`sweepChapter.ts:30`, `convexityChapter.ts:31`; harness route `/harness/collision-playground`, `Routes.tsx:34`) | `learning/playground/collisions/CollisionPlayground.tsx` | continuous (worker, rAF draw loop :249) | Play/Pause 403, Step 406, New/Reset 409 | method 392, overlay 395, bounce 398 | own buttons, :403–409 — **new row** |
| collision inspect (`sweepChapter.ts:43`) | `CollisionInspect.tsx` | mixed (step-through plus rAF Play, :124–141) | Previous 233, Next 234, Play/Pause 235, New 238 | count slider 226 (resets and stops, :114–116) | own buttons — **new row** |

## Lesson and chapter hosts

- Every route above has a guided lesson owner in `learning/chapter/guidedLessonOwnership.ts` (all 30 routed ids appear; each lesson lives in a chapter section, so these graphs are reachable as chapter activities too).
- The lesson panel drives playback in two ways: lesson steps carry `animation` actions (`kind: 'animation'`, ids `decasteljau` 9, `interp-subdivision-rounds` 8, `algorithm-trace` 8, `bisection` 4, `sequence` 3, `root-finding` 3, `deboor` 3, `parametric-roll` 2, `fixed-point` 2, `clt-sum` 2, `patch-v-sweep` 1; content in `analysisGuidedLessons.ts`, `compgeoGuidedLessons.ts`, `interpolationGuidedLessons.ts`, `bsplineDeBoorGuidedLessons.ts`, `numericalMethodsGuidedLessons.ts`, `probabilityGuidedLessons.ts`, `patchGuidedExamplesBasics.ts`), and a frame with `frame.animation` shows lesson-owned play/pause/replay icon buttons (`runtime/GuidedLesson.tsx:169–172`, graph passes `animationControls` through `registerGraphActions`). Lessons call graph methods (`nextStep`, `play`, `setLessonAnimation`), so graph-adjacent placement must keep these entry points.
- No lesson content targets Epicycle, arc-length-param, Euler, Voronoi construction or collision with an animation action; those are driven only by their own controls.
- Collision playgrounds are chapter blocks (`FamilyChapterPage.tsx:25`), not workspace routes; they have no inspector, so the "beside the graph" contract does not apply as for workspace graphs.

## Changes since Wave 1

- Host changed: all compgeo traces now run through shared `TracePlayback` (task 3) while still rendering `PlaybackButtons`; Voronoi gained construction playback; hull-robustness confirmed PB (chain mode only); monotone-triangulation confirmed PB (:111).
- De Casteljau panel has four actions (Play, Pause, Stop, Replay), not three, and a parameter slider.
- `DecasteljauGraph` line numbers moved (:190/:197); other iterative PB lines unchanged.
- Rows added: rational-decasteljau, Euler method, voronoi, voronoi-degenerate, collision run, collision inspect; resolved to no-playback: subdivision-2, subdivision, functions/arc-length.

## Browser part (handler runs next)

Production-build scroll journey with before screenshots at 390 × 844 and 360 × 640 (also short landscape and enlarged text per work item 2); record browser, viewport, board size, whether Play is visible with the graph, and whether the status or readout sits in the same view.

Representative routes:
- Iterative functions: `/analysis/fixed-point` (reproduction example), `/analysis/bisection`, `/functions/geometric-series` (many live controls above the buttons).
- Iterative curves: `/bspline/deboor`, `/interpolation/subdivision`.
- Continuous: `/bezier/decasteljau` (four actions, two sliders), `/bezier/arc-length` (own button, mover slider disabled while playing), `/analysis/epicycles`, `/curve-geometry/parametric`.
- Compgeo trace: `/compgeo/convex-hull`, plus `/compgeo/voronoi` (five buttons with Back and site buttons).
- Learning playground: collision run and collision inspect in the sweep chapter (no inspector), or the harness route.
- Lesson-only: `/patches/tensor` with a Guided lesson that plays a sweep.
- Shared-shell regression check: one nonanimated route (for example `/analysis/euler-method` stepping or `/functions/arc-length`).

## Uncertain or not verified

- Per-graph step behavior after an edit (kept versus zeroed) was read for DeBoor and subdivision curves only; for iterative functions it follows each model's `iterationIndex`.
- Extra live controls of bezier-hulls, interval-sweep and segment-intersections were found by grep for control labels only; dragging is assumed from `PointSetGraph`.
- Route paths for bezier-hulls and the compgeo ids come from `demonstrations.ts` ids; confirm exact paths when choosing screenshot URLs.
- Nothing was run (no tests, no browser).
