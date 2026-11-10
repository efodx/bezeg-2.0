# Level sets and optimization: contour graph plus LP graph, measured contour drawing, integer-grid exactness

Accepted on 2026-11-10 (F0 of the [level-sets spec](../specs/level-sets-optimization-lessons.md), stream `families-prep`). It records the spec's four ADR decisions. §2 and §3 are accepted conditionally: the measurement confirms them before F2a builds on them.

## 1. Two graphs

`ContourMapGraph` serves LS1–LS4. It has modes and one shared function state: function id, level, probe, start, \(H\), and the constraint and its point. `LinearProgramGraph` serves LS5, whose objects are half-planes, not a function.

Alternatives:

- A graph per lesson. LS1–LS4 share the function, contour and probe code.
- Folding LP into the contour graph. This would mix an integer half-plane state with a function state.

## 2. Contours as one polyline-array curve per level

Contours come from marching squares on an \(N\times N\) cell grid. Each level is drawn as one NaN-separated polyline curve, following the precedent of [ADR 0037](0037-direction-field-drawing.md). Until the measurement, \(N=60\). Measure per the [performance plan](../performance-plan.md) for \(N\in\{40,80,120\}\) and 1, 5 and 9 levels, while dragging the level slider and the probe point. Record the frame times and the threshold used here. This evidence alone does not justify replacing JSXGraph.

The kernel's degenerate-value policy:

- a node with \(f=c\) counts as positive, and a segment of zero length is dropped;
- the level is never perturbed;
- saddle cells are resolved by the asymptotic decider in the division-free form \(G\cdot D\ge0\).

Alternatives:

- One JSXGraph element per segment. This means thousands of elements.
- An overlay canvas. This would be a second renderer, not justified before a measurement.

## 3. The surface in the existing 3D view

The LS1 surface reuses `JsxSurfaceView` through a function-surface `SceneMeshOwner` kind. The mesh has \((N+1)^2\) vertices and \(2N^2\) triangles, which is 1681 and 3200 at \(N=40\). Two things come first: measuring the mesh, and the Controls stream's step 5 changes to the shared 3D view. If the measurement fails, the surface becomes an inset or is omitted, and the 2D contour map carries the lessons.

Alternatives:

- 2D only. This loses the surface-to-map link that LS1 teaches. It is the fallback.
- A new renderer. The owner rule rejects this before a measurement.

## 4. Integer grids make the LS3–LS5 decisions exact

- **LS3:** the step is \(h=H/100\) with integer \(H\in[1,30]\), and starts are on the \(1/4\) grid. For `valley`, convergence is "\(H\le9\) or \(y_0=0\)", an exact integer test. For other functions there is no convergence claim, only the path, capped at 200 steps.
- **LS4:** the constraints are integer lines with the point on a rational grid. Tangency \(\det(\nabla f,\nabla g)=0\) is decided exactly with `Rational`. For circle constraints, tangency uses a named tolerance \(|\sin\angle|<0{,}01\) and is labelled "approximately".
- **LS5:** the integer constraints always include \(x,y\ge0\). Vertices are enumerated in `Rational` by Cramer's rule, with exact feasibility and deduplication. Unboundedness is tested on the candidate ray directions.

Alternatives:

- Continuous parameters with tolerances. Convergence, tangency and the optimum would then depend on \(\varepsilon\).

## Consequences

- Additive apart from one `SceneMeshOwner` union member, which lands with F2a after Controls step 5.
- The pure kernels live in `src/levelsets/` and `src/optimization/`.
- Every F2a graph waits on Controls step 5, including LS5, as the stream boundary requires.
