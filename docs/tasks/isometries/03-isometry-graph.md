# 03 State model and isometry graph (F2a, Batches A–C)

Spec: L1–L5 "Scene" and acceptance; Implementation Decisions; Testing Decisions (frieze drawing measurement). Decisions: ADR 0047 §1–3.

Scope:

- new `src/isometry/isometryModel.ts`: parse and validate the state (mirror grid points, mode, dilation centre and ratio snapped to \(1/4\) with \(0<|k|\le4\), rosette \(n\) and mirror flag, frieze feature set and period), Preset round trip and actionable errors;
- new `src/graphs/isometry/IsometryGraph.tsx` with the modes `mirrors | classify | similarity | rosette | frieze`;
- tests for both.

Controls come from `src/inputs/` as they are. If a symmetry checkbox group is missing there, use the existing controls one per checkbox and record the gap for the Controls stream. Do not edit `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, existing graphs, `LinearMapGraph`, registration files or `eslint.config.mjs`. No route and no lesson scenes. Locale keys go in one new block, in the same position in `sl.ts` and `en.ts`, using the [task README terms](README.md#slovenian-terms-f0-decision).

Acceptance:

1. Each mode draws its spec elements and readouts from the exact kernel results:
   - `mirrors`: both mirrors, the motif and its two images, and the composite's class, centre or vector, and angle;
   - `classify`: the centre or axis, the glide vector and the fixed-point count;
   - `similarity`: the image, the side ratio, area ratio, orientation and fixed point;
   - `rosette`: the orbit and the exact order;
   - `frieze`: the pattern over a window, the type name, or the `reducesPeriod` status.
   Angles and rosette points are labelled computed.
2. Every handle has a numeric input. Keyboard step 1 works and touch targets are at least 44 px. Coincident mirror points show a status and never `NaN`.
3. Boards, listeners and auxiliary objects have explicit ownership and disposal. Component tests cover mount, unmount and a state change. Derived values are never read from a Preset.
4. Dragging a mirror and redrawing a frieze of about 20 periods are measured per [the performance plan](../../performance-plan.md) before a drawing approach is chosen.
5. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts. Expect a follow-up when Controls R1 settles readouts.
