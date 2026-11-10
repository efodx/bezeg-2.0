# 04 Unit-circle graph (F2a, Batch A)

Spec: TR1 and TR2 "Graph needs" and acceptance; Testing Decisions (performance). Decisions: ADR 0044 §1, §3. Precedent: `src/graphs/compgeo/InscribedAngleGraph.tsx` (a circle graph with a glider), not modified.

Scope: new `src/graphs/trig/UnitCircleGraph.tsx` and its component tests. Controls come from `src/inputs/` as they are; a raw control fails lint. Do not edit `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, existing graphs, registration files or `eslint.config.mjs`. No route and no lesson scenes. Locale keys go in one new block after the trigonometric-function keys, in the same position in `sl.ts` and `en.ts`.

Acceptance:

1. Graph elements:
   - the draggable point snaps to half-degrees and has an arc highlight;
   - the angle field accepts degrees and multiples of \(\pi\);
   - readouts show \((\cos,\sin)\), the quadrant and signs, or "on the axis";
   - the unrolled \(\sin\) trace (and optional \(\cos\)) uses the same doubles as the point;
   - the projection segments, the TR2 second angle, the rotated frame and the symmetry toggles.
2. Keyboard steps are \(5^\circ\) and \(0{,}5^\circ\). Touch handles are at least 44 px. A text status describes the point.
3. Boards, listeners and auxiliary objects have explicit ownership and disposal. Component tests cover mount, unmount and a state change.
4. The drawing approach is measured during dragging per [the performance plan](../../performance-plan.md), and the result is recorded in the report.
5. `npx tsc --noEmit --pretty false`, `just lint`, `just unit src/graphs/trig src/trig` and the production build pass.

Review: engineering plus UI and accessibility. No smoke run, because there is no route. Expect a follow-up when Controls R1 settles readouts.
