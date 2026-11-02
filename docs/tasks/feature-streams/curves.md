# Stream: Curves
Run state: active

Rules and slice template: [feature streams](README.md). Port 4314. Handoffs: `docs/reviews/feature-streams/curves/`. Each family creates `docs/tasks/<family>/` in F0 and records slice status there. This file holds one status line per family.

| # | Family | Spec | Prerequisites | Status |
| --- | --- | --- | --- | --- |
| 1 | Geometry of curves | [curve-geometry-lessons.md](../../specs/curve-geometry-lessons.md) | Curvature kernel: none. Comb on existing curve graphs: `G-CURVE`. Registration and lessons: `G-REG` | F0 done; [tasks](../curve-geometry/README.md); CG-1 kernel, CG-B1-2a (L1 parametric graph) and CG-B1-2a' (L2 curvature graph) done; L1, L2 registered (`2a6e9c4`, `lesson: false`); curvature t-slider fixed (`41e1a36`); CG-B1-3 L1, L2 guided lessons done ([handoff 14](../../reviews/feature-streams/curves/handler-handoff-14.md)) |
| 2 | B-splines and NURBS | [b-splines-nurbs-lessons.md](../../specs/b-splines-nurbs-lessons.md) | Knot-vector/de Boor kernel and its ADR: none. Curve object and graph code: `G-CURVE`; registration and lessons: `G-REG`. Comb checks reuse family 1's curvature kernel | F0 done; [tasks](../b-splines-nurbs/README.md); BS-1a, BS-1b kernels done; `G-CURVE` open; BS-A-2a split; 2a1 curve layer done (`9595193e`); 2a2 basis plot + knot editor done (`27a58bcf`); 2a3 de Boor graph done; 2a3b Presets next ([handoff 17](../../reviews/feature-streams/curves/handler-handoff-17.md)) |
| 3 | Interpolation and approximation | [interpolation-approximation-lessons.md](../../specs/interpolation-approximation-lessons.md) | Subdivision lessons reuse family 2's uniform B-spline limit; the "points on a canvas" editing-model ADR is decided here | F0 done; [tasks](../interpolation-approximation/README.md); IA-1a, IA-1b, IA-1c kernels and IA-A-2a and IA-A-2b (I1 graph, shared `PointListInput`, basis plot) IA-B-2a (I3 Hermite graph) and IA-C-2a (I5 subdivision graph) done; I2/I4 graphs wait for `G-FN`, I1, I3, I5 registered (`2a6e9c4`, `lesson: false`); I1, I3, I5 guided lessons done (IA-A-3 `302c7383`, IA-B-3 `cb533fe2`, IA-C-3 handler 17) |
| 4 | Distributions, CLT and correlation | [probability-statistics-lessons.md](../../specs/probability-statistics-lessons.md) | Reuses family 3's least-squares kernel (I4) for regression; never duplicates it | F0 done; [tasks](../probability-statistics/README.md); PS-1a, PS-1b (ADR 0031), PS-1c kernels done; graphs wait for `G-FN` |
| 5 | Advanced Bézier topics | [advanced-bezier-lessons.md](../../specs/advanced-bezier-lessons.md) | `G-CG` (hull tests in Bézier clipping); family 1's curvature and arc-length work; Coons patch uses the JSXGraph surface view (its spec's surface-view ADR) | F0 done; [tasks](../advanced-bezier/README.md); AB-1a, AB-1b, AB-1c, AB-1d kernels and AB-C-2a (D4 Coons graph) done; D2 graph waits for convexity A6; D4 `patch-coons` registered (`2a6e9c4`); D4 lesson AB-C-3 done (handler 18) |

## Notes

- Kernels that run ahead before gates open: the curvature kernel (1), the de Boor kernel and ADR (2), the least-squares kernel (3), and the density/convolution kernel (4). Each has independent oracle tests and mathematical review.
- Families 1 and 2 touch existing curve graphs and the spline adapter, which Platform A4 and A6 change. Do not edit `GenericBezierSpline.ts`, `JXGGenericSplineCurve.ts` or the curve-editing feature before `G-CURVE`.
- The curvature comb and basis plots are rendering-heavy. Family 1's comb ADR is chosen by measurement.
- Family 4 is listed here only because it depends on family 3's I4 kernel. It is otherwise a function-graph family: coordinate any change to function models with Platform's A7/A8 status (`G-FN`).
