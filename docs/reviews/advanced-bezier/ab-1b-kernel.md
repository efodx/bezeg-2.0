# AB-1b evidence: arc-length kernel

Files (new): `src/bezeg/impl/kernels/arc-length.ts`, `src/bezeg/impl/kernels/arc-length.test.ts`. Built on `polynomialBezierSource` / `DerivativeSource` / `SPEED_EPS` from `curve/curvature.ts` (unchanged). The PH exact `s(t)`, `arcLength` and `tk` of `PhBezierCurve` are used only as test oracles (ADR 0028 item 4).

## Results (observed)

- `just unit src/bezeg/impl/kernels/arc-length --maxWorkers=2`: 1 file, 20 tests passed (final run, mutations reverted). `npx tsc --noEmit --pretty false`: exit 0.
- PH cubic built from the preset (start (-4.2,-2), hodograph (-3.5,-1.7), (-2.6,1.7)): control points round to the spec's; table L equals exact s(1)=31/3 within 1e-9; s(0.3)=3.84963; table s(t) equals exact s at 21 parameters within 1e-9; eight equal-arc parameters match to 4 digits; pieces equal L/8 (1.291667) within 1e-9; equal-arc chords 1.2908 and 1.2864 (ratio 1.004, all below L/8); equal-t chords max 1.7585, ratio 1.62; equal-arc parameters agree with the repo `tk` chain within 1e-9.
- Non-PH cubic Q: L=6.390976; two halves, one panel and the table agree within 1e-11; bracket 4 and 8.32456; equal-t polyline errors for N=4..64 match 0.100244, 0.025086, 0.006267, 0.001566, 0.000392 (6 decimals) with successive ratios 3.9 to 4.1; equal-t chord ratio 1.857; equal-arc parameters match to 4 digits and are symmetric.
- Piece lengths equal L/N within 1e-9 for N=1, 3, 8, 50 (Q); also for 10 pieces of the cusp cubic.
- Cusp cubic (0,0),(1,2),(0,1),(1,1): r' vanishes at t=1/2; status `cusp` with parameter 0.5 (6 decimals), finite length, finite monotone equal-arc parameters.
- Invalid input throws `RangeError` (order, subintervals, reversed or NaN range, parameter or arc length out of range, zero pieces, one chord parameter, one control point).

## Spec contradiction (flagged, not hidden)

Spec D3 prints the smallest equal-t chord as 1.1568 for the PH cubic at N=8. Computed: 1.0865. The stated ratio 1.62 matches the computed value (1.7585/1.0865 = 1.619), not 1.7585/1.1568 = 1.52. The test asserts 1.0865; the spec figure 1.1568 looks like a typo. The spec should be corrected before lesson text quotes it.

## Mutations (each reverted by hand edit; logs `ab1b-m*.log`)

1. Newton step sign (`t - r/speed` -> `t + r/speed`): 0 failed. Not killed: the bisection safeguard rejects the bad step and still converges (only slower), so the result is correct. This shows the safeguard works; it is not counted as evidence.
2. GL weight `2/(...)` -> `2.0001/(...)`: 8 failed (weights sum, 2/3-point rules, exact L, s(t), polyline errors).
3. Table panel upper bound `knots[i+1]` -> `knots[min(i+2,n)]`: 12+ failed (all lengths, inverse, cusp pieces).
4. `INVERSION_TOLERANCE` 1e-12 -> 1e-5: 5 failed (equal-arc parameters, tk agreement, piece lengths L/N, inverse, cusp pieces).

## Decisions

- Defaults: 24-point Gauss-Legendre (`GAUSS_LEGENDRE_ORDER`), table of 32 subintervals (`TABLE_SUBINTERVALS`); `arcLengthBetween(source, a, b, {order, subintervals})` is the composite rule. L is the table total (same quadrature as the inverse).
- Inversion tolerance is a residual `|s(t) - target| <= 1e-12 * max(1, L)`; Newton with a bracket from the table, bisection when the step leaves the bracket or the speed is below `SPEED_EPS * scale`.
- Cusp detection (`findCusps`): 256 samples, local minima of the speed refined by golden section, reported when `|r'| <= SPEED_EPS * scale`. Result `status` is `{kind:'regular'}` or `{kind:'cusp', parameters}`.
- Polyline error uses equal-t chords (the spec numbers reproduce with equal t).

## Risks

- Quadrature accuracy drops where a speed zero is not a table knot (the kink of |r'| inside a panel); the cusp test has the zero at knot 16/32. Lesson UI should not claim 1e-9 accuracy through a cusp away from a knot.
- A cusp is found only if the speed minimum is within `SPEED_EPS * scale`; a near cusp (tiny but larger minimum) reports `regular`.
- Rational curves work through any `DerivativeSource` but were not tested.

## Mathematical review and disposition (handler 3, 2026-10-31)

Independent review (`bezeg-reviewer` Sonnet, 10 tool uses, ~29k tokens) found no formula errors.
- The 24-point weights sum to 2 and the x^46 moment is exact to 2.4e-16.
- The table, inversion (tolerance 1e-12 relative to max(1, L), tighter than the spec's 1e-9), chords, polyline and bracket are correct.
- The kernel imports only `curvature`; the PH class is used in tests only.

Findings and disposition:
1. Spec correction (the worker's flag is confirmed). The reviewer derived the PH control points independently from the hodograph. The equal-t chords are 1.7585, 1.5274, 1.3446, 1.2101, 1.1241, 1.0865, 1.0974, 1.1568, so the minimum is 1.0865 and 1.1568 is the last chord. The equal-arc chord minimum is 1.2851 and 1.2864 is the last chord. The spec's D3 example is amended; L, s(0.3) and the equal-arc parameters were confirmed.
2. Low, deferred to the D3 graph slice (AB-A F2a). When a cusp falls inside a Gauss panel, the |B'| kink lowers the length accuracy: a cusp at t=0.4 gave an error of 4.6e-7 against a 4096-panel reference. The fix is to split panels at the reported cusp parameters. The readout must not claim more digits than this near a cusp, and the cusp status is already reported.
3. Low, accepted. The Newton-sign mutation survives because the bisection safeguard still converges; correctness is unaffected, and only the speed is untested.
- Near-cusps above `SPEED_EPS * scale` are reported regular, which is acceptable: the inversion falls back to bisection whenever the speed is small.

