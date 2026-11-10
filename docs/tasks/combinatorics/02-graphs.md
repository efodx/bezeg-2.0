# 02 State model and graphs (F2a, gated on Controls step 5)

Gate: Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md). Before dispatch, recheck this file against the steppers and paged controls that step 5 settles.

Spec: Implementation Decisions (state fields and ranges); CB1–CB5 "Scene"; Testing Decisions (performance). Decisions: ADR 0048 §2–3.

Scope:

- new `src/combinatorics/combinatoricsModel.ts`: parse and validate the state, with Preset round trip and actionable errors;
- new `src/graphs/combinatorics/LatticePathGraph.tsx` (CB1, CB3, CB4) with a triangle view;
- new `src/graphs/combinatorics/CountingTreeGraph.tsx` (CB2, and the CB5 table);
- tests for each.

Controls come from `src/inputs/` as they are at that time. No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. Counts come from the kernel as exact digits. Separators are added only in display. Above the cap, the graph shows the count and the cap message.
2. Every handle has a numeric input. Keyboard and touch work, and touch targets are at least 44 px.
3. Explicit ownership and disposal. Component tests cover mount, unmount and a state change. Derived values are never read from a Preset.
4. Drawing 924 paths and about 80 labels is measured per [the performance plan](../../performance-plan.md) before the drawing approach is chosen.
5. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts.
