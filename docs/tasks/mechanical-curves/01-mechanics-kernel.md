# 01 Mechanics kernel (F1, Batch 0)

Spec: [mechanics kernel](../../specs/mechanical-curves-lessons.md#mechanics-kernel-owned-by-this-spec) items 1–6; the kernel parts of MC1–MC3 acceptance; Testing Decisions; Correctness Notes. Decisions: ADR 0056 §2.

Scope: new `src/mechanics/tracks.ts`, `descentTime.ts` and `brachistochrone.ts`, and their test files. Reuse `cycloidSource` (`src/bezeg/impl/curve/parametric-sources.ts`) through a depth adapter. Bernstein sums are evaluated on plain arrays. Edit no existing file.

Acceptance:

1. `Track` covers line, circle arc, cycloid and Bézier, with exact derivatives, working in depth.
2. `descentTime` uses \(t=t_0+(t_1-t_0)s^2\) and composite 5-point Gauss–Legendre with 200 panels. It matches the closed forms for the line and the cycloid. For Bézier tracks it matches an independent \(t=s^4\) substitution to \(10^{-12}\). A plain midpoint rule fails the same tolerance, as the negative control. The test also shows that the \(s^3\) substitution leaves the \(s^{1/2}\) error the spec describes.
3. `descentTimeFrom(track, tStart)` matches the tautochrone property: equal times from interior starts on the cycloid, to the spec's stated tolerance.
4. Admissibility is an exact test on the snapped control depths. The `above-start` and `never-starts` (\(y_1=0\)) cases are reported and not timed.
5. `brachistochrone(B)` finds \(\theta_B\) by 200 bisection steps, with \(r=y_B/(1-\cos\theta_B)\) and \(T=\theta_B\sqrt{r/g}\). This matches `descentTime` on the same cycloid. The MC1–MC3 numbers match, including the race order.

Checks: `just unit src/mechanics`, then `npx tsc --noEmit --pretty false` and `just lint src/mechanics`. Report an observed failure of each assertion group against a deliberate mutation. The required mutations are: the substitution \(s^2\) replaced by \(s\), the admissibility test with \(y_1\ge0\), and \(r\) computed with \(1+\cos\theta_B\).
