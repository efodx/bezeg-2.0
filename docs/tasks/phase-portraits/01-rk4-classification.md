# 01 RK4, systems and classification (F1, Batch 0)

Spec: [kernels](../../specs/phase-portraits-lessons.md#kernels) items 1–3; the kernel parts of PP1–PP3 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0054 §4.

Scope: new `src/dynamics/rk4.ts`, `systems2.ts` and `classify2.ts`, and their test files. Reuse `src/linear/matrix2.ts` and `eigen2.ts` as they are. Edit no existing file.

Acceptance:

1. RK4 uses the fixed step \(h=0{,}02\). It matches closed solutions of linear systems and shows fourth-order error scaling when \(h\) is halved. Every stop is reported: non-finite, \(\lVert s\rVert>10^6\), or leaving the view.
2. The classification follows the spec's \(\tau,\delta,\Delta\) table: saddle, node, star or degenerate node, spiral, centre, and the non-isolated cases. It is exact, with no tolerance. A property test over all \(33^4\) snapped matrices compares it with the quadratic formula in integer arithmetic.
3. The catalogue (`linear`, `pendulum`, `weak-spiral`) has analytic Jacobians, checked against central differences. Hyperbolicity is decided exactly and only at the listed equilibria. The PP1–PP3 numbers match.

Checks: `just unit src/dynamics`, then `npx tsc --noEmit --pretty false` and `just lint src/dynamics`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: an RK4 weight of \(k_2\) changed to 1, the centre case (\(\tau=0\)) folded into spiral, and the star and degenerate nodes swapped.
