# Dispatch: task 08 lane L54 (computational geometry, 15 demonstrations in 5 sessions), stream B

You are a `bezeg-worker` (Sonnet). Worktree: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lane-b`
(branch `lane-b`); stay in it, never create a worktree, never commit or push.

Read whole: `docs/reviews/ux-picks-app-wide/briefs/08-lane.md` (shared lane brief: rules, owned paths, per-demonstration
steps, checks, report format, **common misses**). It is the authority for everything below that it covers. Finished lanes of
the same shapes on this branch: `git show --stat c88ffc88e` (point-set base opt-in, polygon-area) and `a1b67415b`
(bezier-clipping, a `TraceCurvePairGraph`); recipe `docs/reviews/ux-picks-app-wide/briefs/notes/08-point-set.md`.

## Lane

From `docs/reviews/ux-picks-app-wide/inventory/08-partition.json` lane `L54` (read its `graphFiles`, `ownTests`,
`sharedTests`, `sharedFilesUsed`). Lesson file `src/learning/content/compgeoGuidedLessons.ts` (only the frames of your
session's demonstrations). Sessions (one dispatch each):

1. bezier-hulls, convex-hull, delaunay
2. ear-clipping, fortune, hull-robustness
3. interval-sweep, monotone-partition, monotone-triangulation
4. orientation, point-in-polygon, point-set-triangulation
5. segment-intersections, voronoi, voronoi-degenerate

Map each id to its graph through the registry and find its route in the family's `runtime.ts`.

**Owned in addition to the shared brief**: the per-graph `*Controls.tsx` files in `sharedFilesUsed` for your session's
graphs, and `HullTraceGraph.tsx`, `TriangulationGraph.tsx`, `MonotonePartitionGraph.tsx`, `VoronoiGraph.tsx` where your
session's demonstration is (or subclasses) that graph; a subclass change must keep its sibling demonstrations' tests green.
**Not owned**: `PointSetGraph.tsx`, `CurvePairGraph.tsx`, `TraceCurvePairGraph.tsx`, `ExampleSelect.tsx`, `SweepSideLists.tsx`
(shared bases: a needed change stops that demonstration and is reported with the exact change you want).

## Misses seen in earlier lanes (check each before reporting)

- Record parity before touching the graph; mark unmarked readout sentences `data-readout`/`data-readout-note` first (text unchanged).
- A declared legend: the graph's own legend panel renders nothing.
- Marks cover every object the learner watches (hull, triangulation, sweep line, beach line, cells), not only the points.
- Puck labels at most 16 characters; `symbol` set means bare `label`; Orodja controls keep their old key, bare keys go to the fragment.
- Point lists and example selects stay in Orodja (points are board-owned rows/legend only); step/trace buttons that a student
  presses a lot are board actions; choices of at most 4 options may be pucks.
- JSXGraph drag handlers that write state need `runAs('learner', ...)`; tests writing a bound key outside the DOM wrap in it too.
- Playback/stepping: a puck bound to a parameter that animates reads the live value through `puckLiveValue` (L23, `13468437e`);
  `src/graphs/base/PlaybackRoutes.test.tsx` must keep passing unchanged (stop and report if not).
- Lesson prose that names a moved control: reword with the control's label, no "drsnik"/"slider"; write correct Slovenian
  (pucks are *krmilniki*; quote every reworded sentence, old and new, sl and en, in your report). Update the pinning tests.
- Shared preset tests applying states with an untagged `setState` may be wrapped in `runAs('learner', ...)` with asserted values
  unchanged (allowed). Any other change to a shared test: stop that parameter (leave it unbound) and report test:line.
- Red check breaks a value, `pressed` or visibility, not an id.
- Do not re-record goldens; report golden differences verbatim.

## Checks

The shared brief's step 4 and 8, plus `just unit src/graphs/compgeo src/graphs/base/PlaybackRoutes.test.tsx src/learning/content src/localization src/graphs/base/declare`,
`just unit FirstTask` (multi-graph first-task cases; check-changed does not select them), and per demonstration
`BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t <id>` (stream A, 2026-11-27),
then once per session `just build` and `just smoke-lesson <each converted demonstration's lesson id> --port 4395 --workers=1`.
Foreground, long timeouts, one heavy command at a time.

## Return

At most 300 words per the shared brief's report section. Notes: `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L54.md`
(one section per session; write it as you go; on `HANDOFF` stop, write what is done, unverified and next, and return partial).
