# 02 State model and construction graph (F2a, Batches A–B)

Spec: CG1–CG4 "Graph needs" and acceptance; Implementation Decisions. Decisions: ADR 0045 §1–2. Precedent: `src/graphs/compgeo/InscribedAngleGraph.tsx`, not modified.

Scope:

- new `src/compgeo/circleConstructionModel.ts`: state parse and validate, snapping per ADR 0045 §2, Preset round trip, and actionable errors;
- new `src/graphs/compgeo/CircleConstructionGraph.tsx` with the modes `tangents | radical | apollonius | common`;
- tests for both.

Controls come from `src/inputs/` as they are. Do not edit `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, existing graphs, registration files or `eslint.config.mjs`. No route and no lesson scenes. Locale keys go in one new block after the triangle-geometry keys, in the same position in `sl.ts` and `en.ts`.

Acceptance:

1. Each mode draws its spec elements:
   - `tangents`: the Thales circle, the tangents and the chord of contact;
   - `radical`: the axes and the radical centre;
   - `apollonius`: the locus, the division points and the probe ratio;
   - `common`: the homothety centres and the tangents.
   Readouts and text statuses are driven by the exact kernel results, never by the picture.
2. Every handle has a numeric input. Keyboard stepping works and touch targets are at least 44 px. Degenerate states (\(P=O\), concentric circles, \(P=B\), coincident circles) show a status and never `NaN`.
3. Boards, listeners and auxiliary objects have explicit ownership and disposal. Component tests cover mount, unmount and a state change.
4. Derived values are never read from a Preset.
5. Dragging is measured per [the performance plan](../../performance-plan.md).
6. `npx tsc --noEmit --pretty false`, `just lint` and the production build pass.

Review: engineering plus UI and accessibility, and a mathematical review of the readouts. Expect a follow-up when Controls R1 settles readouts.
