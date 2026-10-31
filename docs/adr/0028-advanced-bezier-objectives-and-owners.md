# 0028 Advanced Bézier: reduction objective, clipping owner, Coons form, arc-length owner

Status: accepted, 2026-10-31. Context: [Advanced Bézier topics](../specs/advanced-bezier-lessons.md#decisions-needing-an-adr), [tasks](../tasks/advanced-bezier/README.md).

## Decision

1. **Reduction objective (D1):** endpoint-fixed and free-endpoint \(L^2\) least squares with a switch. The two differ visibly on the lesson's numbers and teach non-uniqueness.
2. **Clipping owner (D2):** reuse the convexity family's pair-of-curves graph, hull predicate and separating-axis test (`G-CG`); clipping adds its kernel and steps on that model. The clip-count cap and discard margin are fixed in the D2 kernel slice from the spec's D2 numbers.
3. **Coons form (D4):** boundaries restricted to cubic Béziers, so the patch is exactly a bicubic net fed to `TensorProductBezierPatch` and the existing `'tensor'` mesh path of the surface view ([ADR 0019](0019-jsxgraph-surface-view.md)). A general blend evaluator exists only in tests, as the independent check.
4. **Arc-length owner (D3):** a new kernel (`arc-length.ts`: Gauss–Legendre length, table, inverse) for every polynomial Bézier curve, built on the curvature kernel's hodograph. The exact PH `s(t)` is the independent test oracle, not the implementation.

## Alternatives

- **(1a) Endpoint-fixed only** hides non-uniqueness; **(1c) max-norm** needs an iterative solver and coincided with (1a) on the examples.
- **(2) Own clipping graph** duplicates the convexity model and its robustness policy.
- **(3b) General blended Coons evaluation with a new mesh owner kind** is only needed for non-Bézier boundaries, which the lesson does not use.
- **(4) Equal-arc points in each curve class** (as PH `tk`) spreads the algorithm over classes and cannot serve non-PH curves without duplication.

## Consequences

- D1–D3 Demonstrations join the `bezier` family and D4 the `patches` family; no new catalog family.
- D2 cannot start before `G-CG`; D3 depends on the curvature kernel (curve-geometry CG-1).
- No new surface mesh kind; `SceneMeshOwner.kind` is unchanged.
