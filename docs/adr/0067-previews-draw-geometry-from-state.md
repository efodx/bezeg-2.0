# Previews draw geometry computed from state, not a shadow board

Accepted on 2026-11-23 by the handler. This is task 02 slice 5a of the [board workspace tasks](../tasks/ux-picks-app-wide/README.md). The plan required the mechanism to be decided before the declaration contract freezes ([parameter writes](../specs/parameter-writes.md), "Previews").

## Context

A preview shows what the board would draw at another value of a parameter: a ghost curve while the learner hovers a puck, or a sweep of several values (task 06). Previews must never touch live state. The spec listed three options:

- **A. Geometry from state.** A pure function computes the curves from the state.
- **B. Shadow board.** The graph is built again on a hidden board from copied state, and its paths are read.
- **C. Probe the live board under a lease.** Rejected in the spec, because a probe can show on the live board and it blocks the learner.

The spec recommended B first, because it is generic, with A where geometry already separates. It asked for B to be measured under [the performance plan](../performance-plan.md).

## Measurement

The harness is in `src/graphs/base/preview/experiment/`, run through `just preview-measure`. It covers Taylor, De Casteljau and phase portrait. Each cell is 30 previews, one per animation frame, with the value sweeping its range. Full table: [`measure/preview-2026-11-23.md`](../reviews/ux-picks-app-wide/measure/preview-2026-11-23.md).

A unit test holds A's paths equal to B's within tolerance for every subject, and the shadow board leaks no board.

The table gives each option's call median, and in parentheses the maximum frame gap during the run. All times are in milliseconds.

| CPU | Option | Taylor | De Casteljau | Phase portrait |
| --- | --- | --- | --- | --- |
| 1× | A | 0.0 (16.8) | 0.1 (16.7) | 0.1 (16.8) |
| 1× | B, cold | 24.8 (33.4) | 41.4 (50) | 24.9 (33.4) |
| 1× | B, warm | 6.4 (16.7) | 16.7 (33.4) | 5.9 (16.8) |
| 4× | A | 0.2 (16.7) | 0.7 (16.8) | 0.4 (16.8) |
| 4× | B, cold | 160 (217) | 276 (317) | 181 (217) |
| 4× | B, warm | 37 (83) | 124 (184) | 40 (83) |

At 4× throttle, the stand-in for a school laptop, B drops frames on every graph. The warm shadow, kept open between previews, still gives frame gaps of 83 to 184 ms and up to 29 long tasks in a 30-preview sweep. A never leaves the 16.7 ms frame budget.

B carries further costs:

- A shadow must be loaded from the exported Preset, not from state, so that board-only scene parts (dragged control points) come along.
- On curve graphs, a Preset import into a mounted shadow appends a second curve unless the scene is disposed first.

## Decision

Previews and sweeps use **option A**. A graph that offers a preview implements a pure geometry function, from a state (plus the Preset data its scene needs) to the curves and points the preview draws. That function lives with the graph's mathematics, independent of React and JSXGraph.

The shadow board is not built as a mechanism. A graph without a geometry function offers no preview, and its puck works without one.

The contract gains the function's place in task 06, not here. The declaration only marks which parameters can be previewed.

## Consequences

- Task 08 sizing: every graph that previews a parameter adds a geometry function and a test holding it equal to the live board, as the harness test does. Graphs whose mathematics already separates (Taylor, Bézier, phase portrait) reuse it. The inventory counts which graphs need one.
- This is the existing direction: geometry independent of React, JSXGraph and graph-global cache (AGENTS.md, engineering practices). Each function written for previews also serves tests and export.
- JSXGraph samples function graphs over the visible box widened by 10% on each side. A geometry function samples the same range, or its preview and the live curve differ at the edges (the harness's `sampledRange`).
- The experiment code stays until task 06 builds the real mechanism on A, then is removed.
