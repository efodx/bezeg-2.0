# Trigonometry: two graphs, half-degree angles and a quarter-grid triangle solver

Accepted on 2026-11-10 (F0 of the [trigonometry spec](../specs/trigonometry-lessons.md), stream `families-prep`). The spec lists three ADR decisions. All three are recorded here, because the Batch 0 kernel depends on decisions 2 and 3 and the F2a graphs on decision 1.

## 1. Two graphs: `UnitCircleGraph` and `TriangleSolverGraph`

`UnitCircleGraph` (`src/graphs/trig/`) serves TR1–TR2. Its state holds an angle, an optional second angle and the symmetry toggles. `TriangleSolverGraph` serves TR3–TR5 with the modes `sides | circle | solve`. Its state holds grid vertices or the solver's data type and inputs. The pure kernel lives in `src/trig/` and has no React, JSXGraph or localization imports. Placement in the catalog is decided at F2b (Controls step 7), not here. The proposal is `functions` for the unit circle, next to `/functions/trigonometric`, and `plane-geometry` for the triangle graph.

Alternatives:

- One graph with five modes. The circle state and the triangle state would be irrelevant to each other, yet both would be in one Preset format, and every scene would carry the other half's fields.
- Extend the existing trigonometric function graph. That changes the `/functions/trigonometric` route and its stored Presets. It also mixes a slider-driven function plot with handle-driven geometry.

## 2. Triangle inputs on a grid; SSA decided exactly

Solver sides are multiples of \(1/4\) in \([1/4,12]\), and angles are integer degrees \(1\ldots179\). TR3 and TR4 vertices are integer grid points (`src/compgeo/grid.ts`). Valid SSS and ASA triples, and the count of SSA solutions, are decided on these inputs:

- The tie \(a=b\sin A\) occurs on the grid only at \(A=30^\circ\) with \(2a=b\), by Niven's theorem. It is decided by that integer test.
- Every other comparison of \(a\) with \(h=b\sin A\) has a relative gap of at least \(1{,}1\cdot10^{-5}\) over the finite grid. This was checked by enumeration; see the spec's Correctness Notes.

Inputs outside the grid are rejected, so this bound is a proof by enumeration, not a tolerance.

Alternatives:

- The triangle given only as grid points, with angles derived. This is exact for TR3 and TR4, but matura tasks give angles in degrees, and SSA with a given angle could then not be posed.
- Continuous inputs with a tolerance for the SSA tie. The "one solution" case would then depend on \(\varepsilon\), and a dragged side could show two triangles a hair apart and call them one.

## 3. Angle state in integer half-degrees

The unit-circle angle is an integer \(h\in[0,720)\), representing \(h/2\) degrees. Quadrant, axis and special-angle tests are then integer tests, and the symmetric points are \(720-h\) and \(h+360\). The numeric field accepts degrees or a multiple of \(\pi\) and snaps to the nearest half-degree. Keyboard steps are \(5^\circ\) and \(0{,}5^\circ\).

Alternatives:

- Continuous radians. "On the axis" and the special values would need a tolerance, and \(\sin\pi\ne0\) in doubles would show as a sign.
- Integer degrees. These are exact, but \(1^\circ\) steps are coarse for the TR1 trace and leave out \(22{,}5^\circ\).

## Consequences

- Additive only: new Demonstrations, routes and Preset collections at F2b. Existing routes, including `/functions/trigonometric` and the inscribed-angle Demonstration, and their stored Presets are unchanged.
- Numbers in lesson text follow the grids above. A scene cannot set an off-grid side or angle.
