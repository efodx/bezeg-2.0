# Linear maps: one mode-based graph in Basics, and quarter-grid matrix entries

Accepted on 2026-10-31 (F0 of the [linear maps spec](../specs/linear-maps-lessons.md), stream `maps`). The spec lists four ADR decisions. Decisions 1 and 2 are recorded here because Batch A needs them. Decision 3 (eigen-direction predicate) is recorded before Batch B, and decision 4 (grid drawing) after the measurement the spec requires.

## 1. One `LinearMapGraph` with a mode, in the Basics family

A single `LinearMapGraph` (`src/graphs/linear/`) holds one validated state: the matrix (or two matrices for composition), the mode `basis | determinant | eigen | ellipse | composition`, the test-vector angle and the chosen example. All five lessons share the kernel, snapping, handles, grid and Preset format, and a scene can switch mode and matrix in one synchronous tick. The pure kernel lives in `src/linear/` and has no React, JSXGraph or localization imports.

The Demonstration joins the `basics` family next to `complex-multiplication`, which is the same kind of plane map for a special matrix.

Alternatives:

- A graph per lesson. Each graph is simpler, but handles, grid, snapping and the Preset format would be duplicated five times, and L4/L5 build directly on the L3 and L1 views.
- Extend `AffineTransformBezierCurveGraph`. This changes the existing `affine` route and stored Presets, and mixes a button-driven curve-operation graph whose pivots are not the origin with a handle-driven matrix graph.
- A new "plane maps" family for linear and complex maps. It would group this stream's Demonstrations under one heading, but costs a family id, illustration and catalog count changes, and moving `complex-multiplication` would change its released placement. The complex-maps F0 may revisit this; moving one Demonstration between families changes no route.

## 2. Matrix entries on the quarter grid in [−4, 4]

Graph state stores matrix entries as multiples of \(1/4\) in \([-4,4]\). The basis handles are the images of \(e_1,e_2\), so they snap to the same grid. Numeric entry snaps to the nearest quarter and clamps with a message. With these entries every product is a multiple of \(1/16\) far below \(2^{53}\) granularity, so \(\det\), \(\operatorname{tr}\) and \(\operatorname{tr}^2-4\det\) are exact in doubles. Orientation sign, singularity and the eigen class are therefore decided exactly, never by a tolerance. Eigenvalues, eigenvectors and singular data involve square roots and are labelled computed.

Rotation matrices at non-special angles are not on the grid. Batch C stores a rotation as a snapped angle (multiples of \(15^\circ\)) and decides orientation from that angle, not from a computed float.

Alternatives:

- Continuous entries with stated tolerances everywhere. Singularity and orientation would then depend on a tolerance: \(\det\begin{pmatrix}0.1&0.3\\0.3&0.9\end{pmatrix}\) is \(0\) but evaluates to \(-1.39\cdot10^{-17}\).
- Rational arithmetic. Exact for any rational input, but adds a number type to every drawing path for no gain over the grid, and the dragged handles would still need snapping to stay readable.

## Consequences

- Additive only: a new Demonstration, route and Preset collection. Existing routes, including `/bezier/affine`, and stored Presets are unchanged; no migration.
- Presets store the snapped entries, mode, angle and example id. Derived values are recomputed on load, never read from the file.
- The Basics family gains one catalog entry when the Demonstration is registered.
