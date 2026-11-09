# Wave 2 functions review: findings

Sonnet reviewer, read-only, 2026-11-09; recorded by the handler from its return. `tsc --noEmit` 0 errors; `just unit src/graphs/functions` passed.

## Medium

1. **Typed-field refusals shown twice.** In Taylor, UniformConvergence, FourierSeries, FourierCoefficients, Runge, PolynomialZeros (`setK`, `onMove`) and RationalFunction (`setK`, `setProbe`, `onMove`), `NumberInput`/`Slider`/`CountSetter` `onChange` handlers return the `guard` boolean: `NumberInput.tsx:156` shows the field hint on `false` and `guard.ts:14` also puts the event in the `RefusalChannel`. Epicycle `attempt` has the same shape. The field hint is the right place for a typed value (decision 14). Expected: typed handlers report to one place; the channel stays for selects, buttons and drags. No test asserts one place.

## Low

2. `DarbouxGraph.tsx` ~285-293 still uses `ignoreOutOfDomain`, not `guard`; the Refine blocked press refuses into the channel while the same reason is in the visible `darboux-refine-help`: shown twice.
2b. `CountSetter` callers pass no `rejectedHint`, so typed `n` in Darboux, Taylor, Uniform, Fourier, Runge gets the generic hint; the model hints (`darboux_n_rejected_hint`, `fourier_n_rejected_hint`) are lost; `DarbouxGraph.test.ts` dropped its assertion.
3. Epicycle `attemptDrag` (~290) shows a reason-less `DomainError`'s raw English `error.message`; HEAD showed nothing.
4. Weak assertions: Epicycle `expect(refusal()).not.toBe('')` (twice); Quadrature's `[role="status"] [data-quadrature-status]` toBeNull needs its positive companion.

## Checked, no finding

One status region per graph, muted on Play (Epicycle, Bisection); no new native `disabled`; host Fit and Reset cover the removed controls (Binomial, Density tested against `fitBinomialNormalView`); Correlation and Summary drags clamp to the model's limits and re-sync; Epicycle Shift+arrow on the 0,05 grid; Darboux `n` same `setCount`; zero-list `dragEdit` matches the old drag; HEAD lesson and Preset values still accepted; `sl.ts`/`en.ts` in lockstep, no orphaned keys.
