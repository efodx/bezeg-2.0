# 26 — Readout, Presets and the depth 4 measurement (Batch 3, F2a)

Status: planned 2026-11-05 (geometry handler 52). Source: spec [A6](../../specs/convexity-hulls-lessons.md#a6-back-to-bézier-hulls-of-control-polygons), [performance plan](../../performance-plan.md). Kind: F2a, engineering + UI/accessibility review. Depends on 25.

1. **Readout and controls.** `BezierHullsControls.tsx` holds Next step, Play/Pause and Reset, and a readout outside the board (`role="status"`, one line per item):
   - the depth;
   - at a `discard` step, the pairs that remain as "8 od 256" (kept of \(4^k\)), and the tested and discarded counts;
   - at a `split` step, the candidates only, no verdict;
   - when no pair remains, a line saying the curves do not meet, certified with a safety margin;
   - when the run ends at depth 4 with pairs left, a line saying that the pairs that remain may or may not meet.

   Put the value-to-readout mapping in a pure, unit-tested adapter. The text never calls the test exact (ADR 0036).
2. **Locale.** Keys in one block after the hull robustness graph's block, at the same position in `sl.ts` and `en.ts`. Take terms from the spec table. Choose others by [choosing new terms](../../localization.md#choosing-new-terms).
3. **Presets.** `bezierHullsPresetCollection.ts`, modelled on `hullTracePresetCollection.ts`. A Preset stores the model and the step. Validate imports: reject, with an actionable error, a wrong point count, a non-integer or out-of-range value, or a wrong mode. Clamp a stale step. Do not register the key yet (27 does).
4. **Measurement (required by the [family template](../feature-streams/README.md#family-template)).** A `BezierHullsGraph.perf.test.tsx` in the style of `BentleyOttmannGraph.perf.test.tsx`, on the cubic pair at the worst case:
   - the time of `curvePairRun` on a drag move;
   - the time to draw the last step (depth 4, 32 pieces with hulls and control polygons);
   - the time of a Play pass through all steps.

   Record the board object count and the timings in `docs/reviews/convexity-hulls/26-measure.md`. If a depth 4 step costs more than one 16.7 ms frame in the unit run, try one JSXGraph curve with `NaN` breaks for all piece hulls and keep the faster path, recording both numbers. If JSXGraph polygons pass, keep them and say so.

Tests: the adapter in both languages, at a `split` step, a `discard` step, the empty end and the depth 4 end; a Preset round trip, including the half grid; rejected imports with their messages; the readout after a language switch and a scene change. Observed failures under two mutations.

Checks: `just unit src/graphs/compgeo --maxWorkers=2`, `just lint src/graphs/compgeo`, tsc, production build.
