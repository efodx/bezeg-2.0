# Numerical-methods kernels 01–03: mathematical review

2026-10-31. Reviewer: `bezeg-reviewer`, Sonnet 5.5 `medium`, on commit 4427b4d (handler 2 of the functions stream). Scope: `rootFinding.ts`, `quadrature.ts`, `odeEuler.ts`, the `derivative.ts` type widening, and their tests.

## Findings and disposition

- **Should-fix, fixed.** Newton and secant reported a run converged to double precision as `repeated-iterate`, which the spec (N2 acceptance 1) shows as "the iterates repeat, no convergence". Newton on \(x^2-2\) from 1 never reaches \(f(x)=0\) exactly; it alternates between the two doubles next to \(\sqrt2\). The tests accepted several statuses, so they missed it. Fix: a step \(|x_{k+1}-x_k|\le 4\,\varepsilon_{\text{mach}}\max(1,|x_k|)\) (`ROOT_FINDING_CONVERGED_ULPS`) ends the run as `root-found`. The 0, 1, 0 cycle is unaffected. Tests now require `root-found` for the converging runs, and a new test covers \(x^2-2\) with 60 steps for both methods. With the rule removed, the new test fails (observed: 1 failed, 16 passed).
- **Nit, accepted.** The secant `repeated-iterate` stop is a heuristic, because the update depends on two iterates. This is documented in code, and the convergence rule now covers the converged case.
- **Nit, accepted.** `quadrature.test.ts` rebuilds the kernel's weight formula in one test. The cubic-exactness, sine-value and parabola-area tests check the weights independently.

## Cleared

The Simpson weights and \(h/3\) factor, rejection of odd \(n\), the parabola coefficients, and the error tables were recomputed independently and match. The Newton, secant and Euler formulas, the check order, and termination at the 60-step cap are correct. Euler on \(y'=y^2\) is finite at \(x=1\) and leaves the window later, as the task's corrected item 7 states. The `derivative.ts` widening only loosens types.
