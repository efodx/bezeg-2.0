# Task 12 independent review: variation-diminishing examples

Timestamp: 2026-10-29 07:56:17 UTC.

Both proposed calculations are correct. The second is the clearer counterexample if the claim is stated precisely as the naive bound “a straight line intersects a patch no more times than its control-net wireframe.” For controls with heights `1,-1,-1,1`, the bilinear height is `(1-2u)(1-2v)` and the surface has `x=u, y=v`. Thus the vertical line `x=y=1/2` meets it once, at the center, while it meets none of the four boundary wireframe edges (each has `x` or `y` fixed at 0 or 1). This refutes that specific line-versus-wireframe bound.

The first example is also valid but only against treating the diagonal trace as the corner chord `P00→P11`. Its diagonal height `1-6t+6t²` has two roots `(3±√3)/6`; its correct quadratic controls have heights `1,-2,1`, whose polygon also crosses `z=0` twice. Do not call the chord the diagonal trace's control polygon.

Neither example refutes the curve variation-diminishing theorem: its criterion compares curve and control-polygon intersections with hyperplanes in 3D. The line-versus-wireframe example is a useful, explicitly scoped counterexample to a proposed surface upper bound, not proof that every possible bivariate formulation fails. State the sourced general “no general bivariate analogue” claim separately. No source edits or tests; calculations checked symbolically.
