# 02 Closed loop and epicycle chain kernel (F1, Batch C)

Spec: [F5 Epicycles](../../specs/fourier-series-lessons.md#f5-epicycles). Decisions: [ADR 0034](../../adr/0034-fourier-series-models-handles-and-closed-loop.md) §4 and *Complex values*. Depends on 01 (quadrature with explicit breakpoints).

Scope: `src/analysis/closedSpline.ts` and its test file. No React, JSXGraph or localization. Do not edit `src/bezeg/` (`BezierSpline` stays unchanged).

Acceptance:

1. **Closed loop.** A loop of \(m\ge2\) spans of degree 1 or 3, evaluated by de Casteljau. Validation returns a typed reason for fewer than two spans, non-finite coordinates or a first end point that differs from the last. A loop whose points are all equal is valid; it has only \(c_0\) and nothing divides by zero.
2. **Parametrizations.** `equal` gives each span parameter length \(2\pi/m\) (default). `chord` uses chord-length span lengths scaled to \(2\pi\). A zero total chord falls back to `equal` and says so.
3. **Coefficients** \(c_k=\tfrac1{2\pi}\int_0^{2\pi}z(t)e^{-ikt}\,dt\) for \(|k|\le N\), with \(N\le50\) (`EPICYCLE_MAX_N`), integrated with 01's quadrature split at the span ends.
4. **Epicycle chain.** For \(t\) and \(N\), the arm end points \(c_0,\ c_0+c_{k_1}e^{ik_1t},\dots\) in a stated order (by decreasing \(|c_k|\), ties by \(k\)), and the partial sum \(S_N(t)\). Also a sampled trace of \(S_N\) over \([0,2\pi)\) for a given sample count.
5. **Spec checks** (Gauss–Legendre 16 nodes per span):
   - Four-span cubic circle, \(\kappa=\tfrac43(\sqrt2-1)\): \(c_1=1.000126\), \(c_5=0.003672\), \(c_{-3}=-0.003641\), \(c_{-7}=-0.000662\), \(c_9=0.000547\) to 6 decimals; \(c_k\) below \(10^{-9}\) for \(k\not\equiv1\pmod4\) (corrected 2026-10-31: the spec once said all others, but \(c_{-11}\), \(c_{13}\), ... are non-zero). Maximum parametrized error \(1.000273\), \(0.007346\), \(0.004759\), \(0.001545\), \(0.000596\) for \(N=0,1,3,5,9\) (on a stated grid). Deviation from the unit circle at most \(0.000273\).
   - Diamond through \(1,i,-1,-i\): \(c_k=8/(\pi^2k^2)\) for \(k\equiv1\pmod4\), else \(0\), to \(10^{-10}\). Maximum error \(0.18943\), \(0.09937\), \(0.06694\), \(0.0404\) for \(N=1,3,5,9\).
   - Pitfall: one 16-node rule over the whole period gives \(c_1\approx0.806564\) for the diamond, so the split is required.
   - Shift: moving the start by \(\tau\) multiplies \(c_k\) by \(e^{ik\tau}\) to \(10^{-10}\). The `equal` and `chord` parametrizations of an uneven loop give different coefficients.
   - \(S_N\) at \(t=0\) and at span ends lies within the recorded error of the loop.
6. **Independent oracle.** The test evaluates spans by its own de Casteljau and the diamond by the closed form.

Checks: `just unit src/analysis/closedSpline`, then the full suite once, and `just typecheck`. Report mutation evidence for the pitfall, shift and diamond assertions.

## Acceptance record (2026-10-31)

- **Quadrature.** Each \(c_k\) is integrated over `refineBreakpoints(spanEnds, |k|)` from task 01 (now exported). The span ends stay panel boundaries. All stated spec values match; the diamond errors are compared to 4 decimals (\(N=5\) computes as \(0.066944\)). The error grid is \(t_j=2\pi j/8192\).
- **Spec correction.** The circle's "others below \(10^{-9}\)" was wrong: by the symmetry \(z(t+\tfrac\pi2)=iz(t)\) every \(k\equiv1\pmod4\) is non-zero (\(c_{13}\approx0.000171\)). The spec and acceptance item 5 now say so.
- **Chord fallback.** `chord` falls back to `equal`, with `fellBack: true`, when any span chord is zero, not only the total: a zero span would make the breakpoints non-increasing.
- **Errors.** `ClosedLoopError` is separate from `FourierError`, since its reasons differ.
- **Review.** Math review found no must-fix or should-fix. Its gap (intermediate arm end points unchecked) is closed by a per-arm assertion that kills the non-cumulative mutation.
- **Open notes for later slices.** The chord coefficients have no independent oracle; `epicycleOrder`/`epicycleChain` clamp \(N\) to the computed order silently; a non-finite \(t\) gives NaN (not reachable from the UI).

