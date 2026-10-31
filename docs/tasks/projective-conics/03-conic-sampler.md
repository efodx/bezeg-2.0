# 03 Conic sampler (F1, Batch A)

Spec: [implementation decisions](../../specs/projective-conics-lessons.md#implementation-decisions), and the graph needs of K2, K3 and K5. Decision: [ADR 0033](../../adr/0033-projective-conics-exact-kernel-and-family.md) §3. Depends on 02.

Scope: `src/projective/conicSampler.ts` and its tests. Pure TypeScript. Its doubles are for drawing only.

Acceptance:

1. `sampleConic(conic, view, density)` walks the pencil through a base point and returns polyline pieces clipped to the view. Ellipses and circles are closed. A parabola is one open piece. A hyperbola gives two branches that are never joined. Pieces break at the ideal points.
2. Degenerate conics: a line pair or parallel lines give line segments clipped to the view, and a double line gives one segment. A point gives a marker. An empty conic gives no pieces and a typed status.
3. Every sample lies on the conic to a relative residual of \(10^{-12}\), over the K2 and K3 defaults and the K5 family at \(c=2,1,0,\tfrac12\).
4. The density is a parameter with a provisional default. Task 05 fixes it after measurement.

Checks: `just unit src/projective`, then the full suite once, and `just typecheck`. Report mutation evidence.
