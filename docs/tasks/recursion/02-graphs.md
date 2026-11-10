# 02 State model and graphs (F2a, gated on Controls step 5)

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Step 5 supplies the stepper and playback. Before dispatch, recheck this file against them.

Spec: Implementation Decisions (state, stored `step`, playback not stored); RG1–RG5 "Scene"; Testing Decisions (performance). Decisions: ADR 0052 §1–3.

Scope:

- new `src/recursion/recursionModel.ts`: parse and validate the map, integer parameters, \(x_0\) on the \(1/100\) grid, `step` and the interest fields, with Preset round trip and actionable errors. A reopened Preset is paused;
- new `src/graphs/recursion/RecursionCobwebGraph.tsx` (RG2, RG4) using `IterationController`;
- new `src/graphs/recursion/GrowthGraph.tsx` (RG1, RG3, RG5, with the log plotted on an ordinary axis);
- tests for each.

No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`. Reuse `fixed_point_legend_cobweb`.

Acceptance:

1. Labels come from the integer classification, and iterates are labelled computed. The 2-cycle and extinction cases show their statuses.
2. Every handle has a numeric input. Playback, stepping and reduced motion work by keyboard and touch.
3. Explicit ownership and disposal: no timers leak. Component tests cover mount, unmount and a state change.
4. Redraws of 60 steps are measured per [the performance plan](../../performance-plan.md).
5. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.
