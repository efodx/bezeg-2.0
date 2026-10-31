# 0026 Interpolation editing model, curve form and least-squares solver

Status: accepted, 2026-10-31. Context: [Interpolation and approximation lessons](../specs/interpolation-approximation-lessons.md#decisions-needing-an-adr), [tasks](../tasks/interpolation-approximation/README.md).

## Context

I1, I3, I4 and I5 edit data points; I2 places nodes by a rule. Presets of all five should store one shape. I1 and I3 compare with Bézier curves (parametric); I2 and I4 are functions of \(x\). The least-squares kernel is also imported by the distributions family for regression lines.

## Decision

1. **Point editing model: free draggable points with a typed list** in the side panel (option a). Every Preset stores `points: [x, y][]` plus the lesson's own fields. I2 is the exception by construction: it stores the node rule (equispaced or Chebyshev) and the degree, and its nodes are not draggable.
2. **Curve form.** I1 and I3 treat data as a parametric curve with a parameter choice (uniform or chord length) and interpolate each coordinate; I2 and I4 interpolate or fit \(y=p(x)\).
3. **Least-squares solver: Householder QR** for the fitted coefficients (option b). The UI still displays the normal equations \(A^\top A c=A^\top y\) for the default small cases, as the lesson asks; their displayed solution is checked against the QR result and against an exact rational solve in tests.

## Alternatives

- **(1b) Fixed point count with numeric entry only.** Accessible but loses the drag-and-see core of I1, I4 and I5; numeric entry stays as the typed list. **(1c) Function-graph dragging with rule-fixed nodes.** Right for I2 only.
- **(2) Function interpolation everywhere.** Simpler but cannot compare with Bézier curves or show Catmull-Rom loops.
- **(3a) Normal equations as the solver.** Instructive and fine for degree \(\le5\) on small integer data, but squares the condition number; the distributions family fits noisy data, where QR is the safer shared choice.

## Consequences

- One Preset shape for the editable lessons; import validation checks finite coordinates, point-count caps and distinct parameters.
- `src/analysis/leastSquares.ts` is the single least-squares implementation; the distributions family imports it.
- Vandermonde solves are never used for plotted curves; barycentric Lagrange is.
