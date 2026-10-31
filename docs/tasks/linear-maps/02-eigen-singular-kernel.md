# 02 Eigen and singular kernel (F1, Batch 0)

Spec: shared kernel items 3, 4, 6; L3 acceptance 1, 3–5 and L4 acceptance 1–4 (kernel parts); Correctness Notes. Decisions: ADR 0025 §2. Uses `Mat2` from task 01.

Scope: `src/linear/eigen2.ts`, `src/linear/singular2.ts` and their tests. No React, JSXGraph or localization. A phase-portrait family may reuse `classifyEigen`; keep its contract stable.

Acceptance:

1. `classifyEigen(A)` returns `distinct-real` (with both eigenvalues and computed unit eigenvectors), `repeated` with `scalar` (every direction) or `defective` (one direction), or `complex` (real and imaginary parts \(\tfrac\tau2\pm\tfrac{\mathrm i}2\sqrt{-\Delta}\)). The class is decided by the exact sign of \(\Delta\) on snapped entries; eigenvectors of a repeated eigenvalue never divide by zero.
2. Examples match: \(E\) eigenvalues \(5,2\), directions \((1,1)\), \((1,-2)\), angle \(108.43^\circ\); \(R\) complex \(\pm\mathrm i\); \(S\) defective, direction \((1,0)\); \(2I\) and the zero matrix scalar; \(C\) eigenvalues \(0,2\) with kernel \((2,-1)\) and \(C(2,1)=(4,2)\); \(-I\) scalar with \(\lambda=-1\).
3. `parallelSine(A, angle)` returns \(\sin\angle(v,Av)\) for the unit vector at `angle`; the named constant `EIGEN_PARALLEL_TOLERANCE = 0.01`; for \(E\) the sine is about \(0.0105\) at \(44^\circ\) and \(0.0010\) at \(44.9^\circ\). `exactlyParallel(v, A)` uses \(\det(v,Av)=0\) on quarter-grid \(v\) only.
4. `singular(A)` returns \(\sigma_1\ge\sigma_2\ge0\), orthogonal right singular directions, left directions \(Av_i/\sigma_i\) when \(\sigma_i>0\), and flags `segment-or-point` (\(\sigma_2=0\)) and `circle` (\(\sigma_1=\sigma_2\), axes not unique). \(\sigma_1\sigma_2=|\det A|\) to \(10^{-12}\).
5. \(S_y\): singular values \(3,1\) along \((1,1),(1,-1)\), equal to the eigen data up to sign; eigenvectors perpendicular to \(10^{-12}\). \(N\): \(\sqrt{3\pm\sqrt5}\), major image axis \(13.28^\circ\), domain direction \(31.72^\circ\), neither an eigen-direction. Singular values and axes agree with an independent numeric scan of the image of the unit circle (at least \(2\cdot10^5\) points) to \(10^{-9}\) after refining the scan maximum, or state the scan's own resolution bound in the test.

Checks: `just unit src/linear`, then the full unit suite once. Report an observed failure of each new assertion group against a deliberate mutation. Effort: Sonnet `medium`; raise to `high` only if the defective/scalar split or the scan oracle fails twice.
