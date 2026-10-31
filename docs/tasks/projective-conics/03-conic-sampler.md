# 03 Conic sampler (F1, Batch A)

Spec: [implementation decisions](../../specs/projective-conics-lessons.md#implementation-decisions), and the graph needs of K2, K3 and K5. Decision: [ADR 0033](../../adr/0033-projective-conics-exact-kernel-and-family.md) §3. Depends on 02.

Scope: `src/projective/conicSampler.ts` and its tests. Pure TypeScript. Its doubles are for drawing only.

Acceptance:

1. `sampleConic(conic, view, density)` walks the pencil through a base point and returns polyline pieces clipped to the view. Ellipses and circles are closed. A parabola is one open piece. A hyperbola gives two branches that are never joined. Pieces break at the ideal points.
2. Degenerate conics: a line pair or parallel lines give line segments clipped to the view, and a double line gives one segment. A point gives a marker. An empty conic gives no pieces and a typed status.
3. Every sample lies on the conic to a relative residual of \(10^{-12}\), over the K2 and K3 defaults and the K5 family at \(c=2,1,0,\tfrac12\).
4. The density is a parameter with a provisional default. Task 05 fixes it after measurement.

Checks: `just unit src/projective`, then the full suite once, and `just typecheck`. Report mutation evidence.

## Acceptance record (2026-10-31)

- **First math review:** no must-fix and two should-fixes. Far branches could be missed, and a conic with no base point was lost silently. The repair adds:
  - depth-8 angle subdivision;
  - geometric samples toward each asymptotic angle (30 levels);
  - a principal-axis or vertex base point;
  - the stable \(c/q\) root in `lineHit`;
  - a typed `no-base-point` status.

  The repair's mutations (`join`, `nopolish`) are killed.
- **Re-review of the repair (Sonnet):** branches are never joined, because each hyperbola interval is walked on its own and the asymptotic angles stay excluded. Samples are monotone in pencil angle, and the axis base point is on the conic to rounding. One should-fix: the parabola vertex path was keyed to the double \(4AC-B^2\) being exactly 0. When an exact parabola has coefficients above \(2^{53}\), that value is non-zero. The sampler then returned `ok` with no pieces, which is the silent loss the repair was meant to close. The handler fixed it by passing the exact classification to `basePoint`. A regression test with two such parabolas failed before the fix (`expected [] to have a length of 1`) and passes after it.
- **`no-base-point`** is a guard only: no test conic reaches it. A near-degenerate ellipse or hyperbola with a huge coefficient range might still reach it through rounding in the centre-axis test.
- **Open for task 05:**
  - The density stays at 720 until it is measured.
  - `refine` tests only the chord against the view, so an arc that bulges into the view while its chord misses it is not subdivided.
  - A very distant view with a tiny angular share can miss a piece.
