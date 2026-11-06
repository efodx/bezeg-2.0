# AB-B-2b drag measurement: brief (handoff-v12)

- **Role:** implementation of one measurement script, and one run of it. Edit only `scripts/clipping-gate-perf.cjs` (new), one line of `docs/commands.md`, and the report files named below. No commits, no pushes.
- **Goal:** the spec's batch gate asks D2 to "record a drag measurement per the performance plan" (`docs/specs/advanced-bezier-lessons.md` line 150, `docs/performance-plan.md` line 24 for what to record). Measure dragging a control point on the shipped route `/bezeg-2.0/bezier/clipping`.
- **Template:** copy the method of `scripts/offset-gate-perf.cjs`: real page through its own controls, rAF sampling only inside the gesture, warm-up dropped, time inside `board.update`, cases interleaved, median over runs, every case asserting that it is real, `--json` output, a deadline, non-zero exit on failure. Default `PREVIEW_BASE_URL` `http://127.0.0.1:4314/bezeg-2.0`.
- **Context:** the handler owns the preview and has confirmed it reachable; do not build or stop it. Nothing else heavy runs during the measurement. `src/graphs/compgeo/BezierClippingGraph.tsx` recomputes the run when points or tolerance change, and a drag returns the step to 0. Selectors: `[data-bezier-clipping="tolerance|status|clips|inset-hull"]`, `[data-action="next-step"]`. Preset file format: `src/graphs/compgeo/bezierClippingPresetCollection.ts`; the smoke script in the job tmp folder named in the dispatch message shows how a pair was loaded in this app.

## Cases

Each at 1440×900, unthrottled and at 4× CPU throttle:

1. Crossing pair (default), tolerance \(10^{-6}\).
2. Tangent pair \(B=(0,4),(2,0),(4,4)\), tolerance \(10^{-10}\): the expensive run, up to the cap.
3. A cubic pair of your choosing that crosses several times, tolerance \(10^{-10}\). State its points.

Every case: press Next several times before the gesture, so the first move also resets a mid-run view. Drag a control point of B along the offset script's path.

## Asserts

Fail the run when the curve B's control point did not move, the inset hull path or the clip readout did not change across the gesture (after the drag ends, stepping forward gives a run from the new points), the step did not return to 0, too few frames or board updates, or a page error.

## Return

Add one line to `docs/commands.md` beside the other perf scripts. Write `docs/reviews/advanced-bezier/ab-b-2b-perf.md`: commit, build, Chromium version, viewport, method, the results table, and whether any case exceeds a 16.7 ms frame median or a 33 ms p95. Keep raw JSON beside it as `ab-b-2b-perf-raw.json`. Reply in at most 25 lines with the table.

Budget: past about 25 turns, or on `HANDOFF`, stop at a consistent point, write what you have to the report, and return it as partial.
