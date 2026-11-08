# Playback route inventory (work item 1, code part) — partial

Read-only code inventory for [graph-adjacent controls](graph-adjacent-controls.md), 2026-11-08, Controls Wave 1 (Haiku Explore; stopped early at its budget). Not yet verified in a browser; no screenshots. Paths under `src/`. Routes from `demonstrations.ts`, graphs from `graphs/graphFactories.ts`.

## Shared hosts

- `graphs/base/controls/PlaybackButtons.tsx:56`: group class `inspector-playback`, `data-action` `next-step`/`play-pause`/`reset`, status line at 79–81. Used by the iterative and trace graphs below.
- `DecasteljauAnimationControls.tsx:27` (Play 39, Pause 42, speed 57), shared by both De Casteljau routes.
- `EpicyclePlayback` (`graphs/functions/EpicycleGraph.tsx:603`).
- Placement: `graphs/base/DemonstrationWorkspace.tsx` graph section 229–240, `aside#workspace-inspector` 242–269 with edit/display/save sections 265–267. Playback groups render in the inspector, which stacks below the graph on narrow widths (spec line 13).

## Routes

| Route | Graph | Kind | Actions | Live controls | Host |
| --- | --- | --- | --- | --- | --- |
| `/analysis/fixed-point` | `FixedPointGraph.tsx` | iterative | Next, Play/Pause, Reset | example, x0, tolerance (edits stop playback) | PlaybackButtons, :375 |
| `/analysis/bisection` | `BisectionGraph.tsx` | iterative | Next, Play/Pause, Reset | ? | PlaybackButtons, :288 |
| `/analysis/sequence` | `SequenceGraph.tsx` | iterative | Next, Play/Pause, Reset | example, epsilon, candidate limit | PlaybackButtons, :377 |
| `/analysis/root-finding` | `RootFindingGraph.tsx` | iterative | Next, Play/Pause, Reset | ? | PlaybackButtons, :284 |
| `/functions/geometric-series` | `GeometricSeriesGraph.tsx` | iterative | Next, Play/Pause, Reset | a, q, n, example, tolerance | PlaybackButtons, :284 |
| `/probability/clt` | `CltGraph.tsx` | iterative | PlaybackButtons | ? | PlaybackButtons, :249 |
| `/bezier/decasteljau` | `DecasteljauGraph.tsx` | continuous | Play, Pause, Replay (lesson) | speed | DecasteljauAnimationControls |
| `/bezier/decasteljau2` | `DecasteljauGraph2.tsx` | continuous | same | speed | same, :195 |
| `/bezier/subdivision-2` | DecasteljauGraph3 | ? | ? | ? | ? |
| `/bezier/subdivision` | `SubdivisionGraph.tsx` | ? | ? | ? | ? |
| `/bspline/deboor` | `DeBoorGraph.tsx` | iterative | Next level, Play/Pause, Reset levels | ? | PlaybackButtons, :344 |
| `/interpolation/subdivision` | `SubdivisionCurveGraph.tsx` | iterative | Next, Play/Pause, Reset | ? | PlaybackButtons, :354 |
| `/curve-geometry/parametric` | `ParametricCurveGraph.tsx` | continuous | Roll play/stop; lesson play/pause/replay/stop/reset | ? | own button, :290 |
| `/bezier/arc-length` | `ArcLengthParametrizationGraph.tsx` | continuous | Play/Pause | mover slider (disabled while playing) | inline, :400–402 |
| `/functions/arc-length` | ArcLengthGraph | ? | ? | ? | ? |
| `/analysis/epicycles` | `EpicycleGraph.tsx` | continuous | Play/Pause | time slider | EpicyclePlayback, rendered :503 |
| `/patches/*` sweeps | `patches/patchSweep.ts:29`, `TensorPatchGraph.tsx` | continuous u/v | ? | ? | ? |

Compgeo traces (IterationController + PlaybackButtons; Next, Play/Pause, Reset): convex-hull `HullTraceControls.tsx:113`, bezier-hulls `BezierHullsControls.tsx:49`, ear-clipping `EarClippingControls.tsx:81`, bezier-clipping `BezierClippingControls.tsx:90`, delaunay `DelaunayControls.tsx:128`, interval-sweep `IntervalSweepControls.tsx:90`, segment-intersections `BentleyOttmannControls.tsx:120`, monotone-partition `MonotonePartitionControls.tsx:109`, monotone-triangulation `MonotoneTriangulationControls.tsx:100`, fortune `FortuneControls.tsx:183`, hull-robustness (IterationController; controls unconfirmed). Contracts task 3 (shared trace playback) changes these graphs; step 6 implementation follows it.

## Open (`?` above)

Route-to-class for subdivision-2, subdivision, functions arc-length, monotone-triangulation and hull-robustness; patch sweep controls; Epicycle placement; parameter/speed controls on most iterative routes. Then the browser part of item 1: production-build scroll journey at 390×844 and 360×640 with before screenshots.
