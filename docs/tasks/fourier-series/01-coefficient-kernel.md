# 01 Coefficient kernel (F1, Batches A and B)

Spec: [reuse and new modules](../../specs/fourier-series-lessons.md#reuse-and-new-modules), the kernel needs of F1–F4, [implementation decisions](../../specs/fourier-series-lessons.md#implementation-decisions) and [testing decisions](../../specs/fourier-series-lessons.md#testing-decisions). Decisions: [ADR 0034](../../adr/0034-fourier-series-models-handles-and-closed-loop.md) §1, §2 and *Complex values*.

Scope: `src/analysis/fourier.ts`, `src/analysis/fourierExamples.ts` and their test files. No React, JSXGraph or localization. Do not edit `uniformConvergence.ts`, `trigonometric.ts` or `complex.ts`. A Gauss–Legendre rule may be imported from `src/bezeg/impl/kernels/arc-length.ts` if that import direction already occurs in `src/analysis`; otherwise write a local rule and cross-test the two.

Acceptance:

1. **Quadrature with explicit breakpoints.** `integratePiecewise(f, breakpoints, nodes = 16)` applies Gauss–Legendre on each piece. The API has no form without breakpoints. Breakpoints must be finite and strictly increasing, with a typed error otherwise.
2. **Coefficients.** Real \((a_k,b_k)\) for \(k\le K\) and complex \(c_k\) for \(|k|\le N\), with the spec's conventions. A piecewise-linear shape (ADR 0034 §2: fixed breakpoints, a left and right value at each breakpoint) gets closed-form integrals of a linear function times \(\cos kx\), \(\sin kx\). Its validator rejects non-finite values and wrong lengths with a typed reason.
3. **Partial sums** by direct \(O(N)\) summation, and the Parseval mean square \(\tfrac1\pi\int f^2\) against \(\tfrac{a_0^2}{2}+\sum(a_k^2+b_k^2)\).
4. **Closed example list** in `fourierExamples.ts`: square wave, sawtooth \(x\), \(|x|\), \(\mathrm{sign}(x-1)\), \(1/(2-\cos x)\), each with its breakpoints and, where one exists, its closed-form coefficients. The square-wave Gibbs peak uses the closed form \(x=\pi/(N+1)\).
5. **Spec checks** (to 5 decimals unless stated):
   - F1: \(S_N(0)=0\) for every \(N\); at \(x=\pi/2\): \(S_3=0.84883\), \(S_5=1.10347\), \(S_{11}=0.94730\), \(S_{101}=1.00624\); errors at \(x=0.5\): \(0.09759\), \(0.00981\), \(0.00011\) for \(N=11,101,1001\). Square-wave \(b_k=4/(\pi k)\) (odd), \(0\) (even) to \(10^{-12}\). Sawtooth \(b_k=2(-1)^{k+1}/k\).
   - F2: \(|x|\): \(a_0/2=\pi/2\), \(a_k=-4/(\pi k^2)\) (odd), \(0\) (even). \(\mathrm{sign}(x-1)\): \(b_1=0.9805869033\), \(b_2=-0.4507735384\), \(b_5=0.1634409457\) to \(10^{-10}\). Fixed-seed random piecewise-linear shapes with 1–4 breakpoints: kernel against exact integrals to \(10^{-10}\). Parseval partial sums \(1.62114\), \(1.80127\), \(1.93261\), \(1.99205\) for \(N=1,3,11,101\).
   - **Pitfall test:** one 16-node rule over all of \([-\pi,\pi]\) without the split gives \(b_1\approx0.888871\) for the jump example, more than \(10^{-2}\) from the exact value. The test fails if the kernel stops splitting.
   - F3: peak values \(1.27324\), \(1.20042\), \(1.18836\), \(1.18130\), \(1.17901\), \(1.17898\) for \(N=1,3,5,11,101,1001\); \(2\mathrm{Si}(\pi)/\pi=1.1789797\) by quadrature to \(10^{-6}\); finite overshoot \(0.09065\) at \(N=11\); error \(0.99994\) at \(x=10^{-6}\), \(N=101\).
   - F4: \(1/(2-\cos x)\): \(a_k=\tfrac2{\sqrt3}r^k\), \(r=2-\sqrt3\), to \(10^{-10}\) for \(k\le5\) and relative \(10^{-3}\) at \(k=10\) (record the tolerance). Sup error of \(S_{11}\) for \(|x|\) equals the tail \(\sum_{k\ge13,\ \mathrm{odd}}4/(\pi k^2)=0.05293\).
6. **Independent oracle.** The partial-sum and coefficient tests compare against direct formulas written in the test, not against the kernel's own helpers.

Checks: `just unit src/analysis/fourier`, then the full suite once, and `just typecheck`. Report mutation evidence for the pitfall test and two other new assertions.

## Acceptance record (2026-10-31)

- **Panel refinement.** One 16-node rule per piece missed this task's own tolerances at high \(k\), at \(N=1001\) and for \(1/(2-\cos x)\). The kernel (`realCoefficients`, `complexCoefficients`, `meanSquare`) therefore splits every piece into panels no wider than \(\min(\pi/2,2\pi/k)\). The caller's breakpoints stay panel boundaries, and `integratePiecewise` is unchanged as the plain per-piece primitive. `meanSquare` was refined after review; a \(1/(2-\cos x)\) test pins it to \(4/(3\sqrt3)\) within \(10^{-12}\) (unrefined error \(2\cdot10^{-5}\)).
- **Shift identity sign.** The tests check \(c_k(f(x-	au))=e^{-ik	au}c_k(f)\). The spec's \(e^{ik	au}\) for moving a closed loop's start, \(z(t+	au)\), is the opposite shift and agrees. Task 02 tests the start-shift form.
- **Pitfall test.** It calls `integratePiecewise` with one panel and documents the failure. The guard against the kernel dropping the split is "kernel gets the jump example right"; review mutations confirmed both it and the panel refinement are covered.
