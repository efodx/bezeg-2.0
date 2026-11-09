# Wave 2 slice C3: compgeo trace and sweep panels

Read `w2-common-brief.md` first; it holds role, shared files, test rules, checks and return format.

**Owned:** `src/graphs/compgeo/VoronoiControls.tsx`, `VoronoiGraph.tsx`, `FortuneControls.tsx`, `FortuneGraph.tsx`, `DelaunayControls.tsx`, `EarClippingControls.tsx`, `BentleyOttmannControls.tsx`, `IntervalSweepControls.tsx`, `MonotonePartitionControls.tsx`, `MonotoneTriangulationControls.tsx`, `BezierHullsControls.tsx`, `BezierClippingControls.tsx`, `HullRobustnessControls.tsx`, `tracePlayback.ts`, the trace graph classes' comments, and these files' tests. `src/graphs/base/controls/LiveReadout*` only for a small addition you report. Not owned: `PointSetControls.tsx` (slice C2).

**Work (inventory rows 56–58, 60–68):**
- Hand-written hidden live paragraphs with nonce and mute (C21) in Fortune, Delaunay, EarClipping, BentleyOttmann, IntervalSweep, MonotonePartition, MonotoneTriangulation, BezierHulls, BezierClipping and Voronoi move to `LiveReadout` with its one mute-during-Play rule. `HullTraceControls.tsx` is the pattern. Announcements say the same as before.
- Voronoi: the query form (`QueryFields`, text plus Enter or Set) becomes the shared single-point list with no add or remove; its drag limit notice goes per decision 7. Its own construction Next/Back/Reset (`data-action=construct-*`) moves onto `TracePlayback` or the shared playback buttons, with no per-graph controller code. "Reset example" stays as the spec's recorded exception, owned by the example chooser. "Reset view" on Voronoi and Fortune is removed, with `fitView` returning the frame or the run box (task 0 decision 2); give that a pure test and one real-graph case.
- Button rows of examples or modes (C10, C25) become `ChoiceSelect` where the spec target says so (decision 9). `aria-pressed` site and triangle rows (C14) follow the C14 target.
- BezierClipping raw tolerance `<select>` becomes `ChoiceSelect`.
- Step counters (C27): Fortune's own `fortune_step_counter` key and the counters that count from 0 (MonotonePartition, MonotoneTriangulation) follow the C27 target.
- Trace graph class comments that still describe `advance()` and `IterationController` choreography: update them to `TracePlayback`.
- Do not reintroduce per-graph controller code; `tracePlayback.ts` drives all eleven trace graphs.

**Lessons:** the sweep and Voronoi lessons drive these graphs; run their lesson tests found by `grep -rl` of the graph ids under `src/learning`.

**Evidence file:** `w2-c3.md`. **Handoff note:** `w2-c3-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
