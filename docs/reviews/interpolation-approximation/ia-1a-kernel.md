# IA-1a evidence: interpolation kernel

Files (new): `src/analysis/interpolation.ts`, `src/analysis/interpolation.test.ts`.

## Results (observed)

- `just unit src/analysis/interpolation`: 1 file, 18 tests passed (final run after all mutations reverted).
- `npx tsc --noEmit --pretty false`: exit 0, no output.
- Oracles: barycentric value and Lagrange basis vs a naive product formula in the test (41 points, 1e-12); degree <= n polynomials reproduced (relative 1e-12); exact at nodes (toBe); partition of unity; Chebyshev nodes vs the closed form on [2,6] for n = 0,1,5,10,20.
- Spec numbers reproduced: I1 default weights (-1/16, 9/16, 9/16, -1/16) and point (2, 2.8125); Bezier (1/8, 3/8, 3/8, 1/8) and (2, 1.875); weights at t = 1/2 (0.3125, 0.9375, -0.3125, 0.0625); default Lagrange curve exceeds y = 3 (max about 3.032, scanned in Python) while Bezier stays within 3. I2 table (relative 1e-3) for n = 10, 15, 20 both rules; 1.91566 / 0.10915 (n = 10); argmax 0.9402 (n = 10) and 0.975 (n = 20); n = 5 equispaced 0.433 vs Chebyshev 0.556. Equispaced error grows and Chebyshev decays across n = 10, 15, 20, 30.

## Mutations (each reverted)

1. Barycentric weight `1/product` -> `product`: 9 failed (naive formula, defaults, polynomial data, Runge table...).
2. Chebyshev angle `(2j+1)` -> `2j`: 4 failed (closed form, Runge table, argmax, growth/decay).
3. Remove the exact-at-node shortcut: 1 failed (exact at nodes / cardinal basis).
4. Chord length `hypot` -> `|dx|`: 1 failed (chord-length parameters).
5. Grid step `/(gridCount-1)` -> `/gridCount`: SURVIVED (shift of 1/20001 is below the 1e-3 table tolerance; not a meaningful semantic change, left as is).
6. Degree cap `> MAX` -> `> MAX + 1`: 1 failed (cap test).

## Decisions

- I1 parametrisation: uniform (t = 0,1,2,...) default and cumulative chord length optional, per spec line 45 and ADR 0026 line 12; each coordinate interpolated against t. Duplicate parameters (including coincident points under chord length) throw RangeError.
- Caps: 2..12 points (spec suggestion), degree <= 40 enforced in `rungeMaxError` only; node generators accept any n >= 0.
- Chebyshev nodes are returned in decreasing order (j = 0 first), matching the spec formula. Hence the argMax sign at the symmetric maximum is floating-point dependent; tests use |argMax|.
- Spec note: line 45 says the default exceeds the "polygon"; the cubic exceeds the hull only slightly (y about 3.03 vs 3), so the lesson should pick a drag that shows it clearly.
- `RUNGE_TABLE` constant holds the spec numbers; `rungeMaxError` uses 20001 grid points.

## Not verified

No UI, no browser; no performance measurement; extra functions (abs, sine) have only light tests; Runge numbers beyond the spec rows and n = 30 monotonicity are observed behaviour, not independent Python results.

## Review repairs (observed)

- Runge rows now use a true relative tolerance (`rel`): spec rows at 1e-3; reviewer-recomputed values at 5e-5: n=15 equispaced 2.107561, Chebyshev 0.083107; n=20 equispaced 59.8223, Chebyshev 0.0153337; |argMax| n=15 equispaced about 0.9631.
- Grid-step mutation (`/(gridCount-1)` -> `/gridCount`) STILL survived the 5e-5 table checks (the maxima sit at flat peaks, so a 1e-4 x-shift changes them at second order). Added an explicit grid-spacing assertion (xs[0] = -1, xs[1] = -0.98, xs[100] = 1 for 101 points); the mutation now fails 1 test.
- `barycentricWeights` throws RangeError when any weight is non-finite (e.g. 41 equispaced nodes on [0, 1e-9]); one test.
- The degree cap (40) is enforced only in `rungeMaxError`; the I2 UI must clamp n itself.

## Mathematical review and disposition (handler 2, 2026-10-31)

Independent review (Sonnet, read-only, 6 tool uses): no formula errors in the barycentric weights or second form, the exact-at-node return, first-kind Chebyshev nodes and their mapping, equispaced end points, chord-length parameters, or the error grid. Runge rows n=5, 10, 15 and 20 for both rules were recomputed in plain Python and match `RUNGE_TABLE` and the spec. Finding dispositions:

- Absolute-below-1 test tolerance (medium): fixed (above).
- Silent overflow of the weights (low): fixed with a guard.
- Degree cap enforced only in `rungeMaxError` (low): deferred to the I2 graph slice, which must clamp n.
- `lagrangeBasis` validates after computing the weights (low): accepted, harmless.

The handler confirmed the repairs at `interpolation.ts:50` and `interpolation.test.ts:154-157`. Checks: `just unit src/analysis/interpolation src/analysis/distributions` passed and `npx tsc --noEmit --pretty false` exited 0 at 4deaa51 plus the working tree.
