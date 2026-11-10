# 05 Triangle solver graph (F2a, Batches B–C)

Spec: TR3–TR5 "Graph needs" and acceptance. Decisions: ADR 0044 §1–2.

Scope: new `src/graphs/trig/TriangleSolverGraph.tsx` with modes `sides | circle | solve`, and its component tests. The constraints are the same as in [task 04](04-unit-circle-graph.md): shared controls from `src/inputs/` as they are, no edits to shared host or registration files, no route, and one locale block.

Acceptance:

1. `sides`/`circle` modes:
   - three draggable grid vertices with side, angle and ratio readouts;
   - the circumcircle, the diameter \(BA'\) and the auxiliary triangle;
   - squares or length bars with the correction term \(2\,CA\cdot CB\);
   - the classification status from `classifyTriangle`;
   - degenerate vertices show a text status and draw no circle.
2. `solve` mode:
   - a data-type chooser with numeric inputs on the ADR 0044 grid as the only input for sides and angles;
   - the solved triangle, or both SSA triangles in two colours, with the circle of radius \(a\) and the ray;
   - the case status;
   - readouts measured on the drawn triangle.
3. The ownership, disposal, keyboard, touch and measurement requirements are the same as in task 04.
4. `npx tsc --noEmit --pretty false`, `just lint`, `just unit src/graphs/trig src/trig` and the production build pass.

Review: engineering plus UI and accessibility; a mathematical review of the readouts.
