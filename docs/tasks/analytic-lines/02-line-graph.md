# 02 State model and line graph (F2a, Batches A–C)

Spec: L1–L5 "Scene", "Graph needs" and acceptance; Implementation Decisions. Decisions: ADR 0046 §1–2.

Scope:

- new `src/graphs/lines/lineGeometryModel.ts`: parse and validate the state (integer grid \([-8,8]^2\), mode, circle as centre plus boundary point), Preset round trip and actionable errors;
- new `src/graphs/lines/LineGeometryGraph.tsx` with the modes `forms | normal | angle | distance | intersect`;
- tests for both.

Controls come from `src/inputs/` as they are. Do not edit `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, existing graphs, registration files or `eslint.config.mjs`. No route and no lesson scenes. Locale keys go in one new block after the linear-function keys, in the same position in `sl.ts` and `en.ts`.

Acceptance:

1. Each mode draws its spec elements and readouts from the exact kernel results:
   - `forms`: all forms together, with the vertical-line status;
   - `normal`: the normal arrow and the parallel/perpendicular status;
   - `angle`: the angle readout;
   - `distance`: the foot, the distance and the projection;
   - `intersect`: the intersection point, or the line–circle count.
2. Every handle has a numeric input. Keyboard step 1 works and touch targets are at least 44 px. Coincident points show a status and never `NaN`.
3. Boards, listeners and auxiliary objects have explicit ownership and disposal. Component tests cover mount, unmount and a state change. Derived values are never read from a Preset.
4. Dragging is measured per [the performance plan](../../performance-plan.md).
5. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts. Expect a follow-up when Controls R1 settles readouts.
