# 10 — Hull trace graph with step playback

Status: planned. Source: [spec A4](../../specs/convexity-hulls-lessons.md#a4-convex-hull) (steps, acceptance 4–6), [§3 trace model](../../specs/convexity-hulls-lessons.md#3-algorithm-step-trace-model), [testing decisions: playback](../../specs/convexity-hulls-lessons.md#testing-decisions). Kind: F2a, engineering + UI/accessibility review. Depends on 03, 05 and 08. Batch 1, not gated: no route, Demonstration, Preset key registration, and no `algorithm-trace` lesson animation id (that joins `LESSON_ANIMATION_IDS` at F3, after `G-REG` and Platform A9a).

A `PointSetGraph` subclass under `src/graphs/compgeo/` that runs one of three hull algorithms on the current points and steps through its trace.

1. Study first: `IterativeFunctionGraph.tsx` and the `AnimationScheduler` in `src/learning/runtime/animation` (the injectable scheduler used by bisection playback), and `src/analysis/bisectionModel.ts` for a saved step index. Reuse that playback pattern rather than writing a new timer.
2. Algorithm choice: monotone chain (task 03), slow edge test and gift wrapping (task 08). Default: sample 1, monotone chain, step 0.
3. Saved configuration (scene state and Preset `graphState`): points, algorithm and step index; a stale index is clamped with `clampTraceIndex` on restore. Running/paused status is transient and never saved. The graph keeps only the index; the drawn state comes from the algorithm's `...StateAt`.
4. Controls: **Next step**, **Play** / **Pause** (stopped by default; Play advances with the same transition as Next and stops at `done`), **Reset** (step 0). Any edit of the points or the algorithm recomputes the trace, resets the index to 0 and pauses. Scene change and unmount pause and dispose the scheduler.
5. Overlays `trace` (current chain(s), the tested triple or candidate edge, accepted edges) and `hull` (final hull polygon after `done`). Status line from the event's `noteKey` (add the locale keys for the three algorithms' notes now), the running predicate count, and after `done` a comparison row of the three algorithms' total predicate counts on the current points (A4 step 6). The slow test is labelled a teaching algorithm with its cost. \(n<3\) and all-collinear input show the point or segment hull with the trace's message, not an error.
6. Locale keys in one block after task 09's blocks, same position in `sl.ts` and `en.ts`; `t()` per AGENTS.md.
7. Tests (host tests with an injected scheduler):
   - Next step repeated \(k\) times and Play advanced \(k\) ticks give identical drawn state and status; Play stops at `done`; Reset returns to step 0.
   - Edit while playing: trace recomputed, index 0, paused. Algorithm switch likewise. Scene change and unmount: paused, no pending scheduler callbacks, no leftover board objects (exact counts).
   - Preset round trip of points, algorithm and index; an out-of-range index clamped on import; invalid algorithm rejected with the actionable message.
   - Sample 1 status after the monotone chain's first pop shows value \(-2\) at \((2,0)\); final hull drawn equals task 03's hull for all three algorithms; counts row shows the chain's total, \(504\) and \(35\).
   - Observed failures under two deliberate mutations (for example Play not pausing on edit).

Checks: `just unit src/graphs/compgeo src/compgeo --maxWorkers=2`, `just lint src/graphs/compgeo src/compgeo`, `npx tsc --noEmit --pretty false`, production build (locale change). No browser smoke until F2b.
