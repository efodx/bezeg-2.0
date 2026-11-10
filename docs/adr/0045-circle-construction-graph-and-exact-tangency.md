# Circle constructions: one mode-based graph, exact tangency on a grid, inexact tangent lines

Accepted on 2026-11-10 (F0 of the [circle geometry spec](../specs/circle-geometry-lessons.md), stream `families-prep`). It records the spec's three ADR decisions.

## 1. One `CircleConstructionGraph` with modes

One graph (`src/graphs/compgeo/CircleConstructionGraph.tsx`) has the modes `tangents | radical | apollonius | common`. The modes share handles, grid snapping, the Preset format and the readout panel. The kernel is `src/compgeo/circleConstructions.ts`, built on `src/compgeo/circle.ts` without changing it. Catalog placement (`plane-geometry`, next to the triangle-geometry chapter) is confirmed at F2b.

Alternatives:

- One graph per lesson. Each would be simpler, but handles, snapping and Presets would be duplicated four times.
- Extend `InscribedAngleGraph`. This would change an existing route and its stored Presets.

## 2. Grid inputs, so every tangency decision is exact

Centres and points sit on the integer grid. Radii are multiples of \(1/4\) in \([1/4,8]\). The Apollonius ratio \(k\) is a multiple of \(1/2\) in \([1/2,4]\). With these inputs \(r^2\) and \(k^2\) are exact rationals, so every none/tangent/two decision is an exact rational sign:

- the power of a point;
- `intersectCircles`;
- the common-tangent count rule from \(d^2-r_1^2-r_2^2\);
- the radical-centre cases `parallel` and `coaxal`.

The kernel has no \(\varepsilon\). Tangency is reachable by dragging (for example \(d=8=5+3\)). When the exact result is "two points", the status says so even if the drawn points are closer than a pixel.

Alternatives:

- Continuous inputs with a tangency tolerance. "Tangent" would then depend on \(\varepsilon\) and the zoom, which the [shared constraints](../specs/new-lesson-families.md#shared-constraints) forbid.
- Rational inputs of any denominator. These are also exact, but dragged handles still need snapping to be readable, so there is no gain over the grid.

## 3. Tangent lines are labelled inexact doubles

A common tangent passes through irrational points even for rational radii. Lines are therefore returned as double triples \((a,b,c)\) marked inexact, computed from `tangentsFrom` at the exact homothety centres. Two cases are exact rational lines: the single tangent at an internal contact, and the tangent at a point on the circle.

Alternatives:

- Tangent points only. Lines are what the lesson draws and reads out, so every consumer would rebuild them.
- Symbolic radicals. This would add a number type for display only.

## Consequences

- Additive only: new kernel, graph, routes and Presets. `circle.ts`, `InscribedAngleGraph` and their Presets are unchanged.
