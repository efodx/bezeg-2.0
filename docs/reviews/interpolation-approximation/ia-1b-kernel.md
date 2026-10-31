# IA-1b kernel evidence: least squares and Hermite

Files: `src/analysis/leastSquares.ts`, `leastSquares.test.ts`, `hermite.ts`, `hermite.test.ts` (Point2 and curveParameters imported from `interpolation.ts`).

## Observed
- `just unit src/analysis/leastSquares src/analysis/hermite --maxWorkers=2`: passed (30 tests; 16 least squares, 14 Hermite). `npx tsc --noEmit --pretty false`: no errors. Logs in `.command-logs/ia1b*.log`.
- Oracles: exact BigInt-rational normal-equation solve (3 datasets, degrees 0..5, 1e-9 relative); closed-form regression for degree 1; A^T r orthogonality (1e-10 relative); exact recovery of a degree-4 polynomial; I4 goldens (line, quadratic, cubic, outlier, normal matrix [[4,6],[6,14]], rhs [9,18]); independent Bernstein form vs Hermite (1e-12); Hermite derivative vs finite difference; I3 goldens (tangents, midpoint (2, 2.8125), four-point weights, lagrangeCurvePoint).
- Ill-conditioned case: only a weak check (fit reproduces the data at x near 1000; A^T A diagonal ratio > 1e17). It does not prove QR beats normal equations; the spec does not demand it.

## Mutations (all applied together in one run, 16 failures, reverted; source restored)
- residual sign flipped: I4 golden line/cubic fail.
- vertical-data check disabled: "rejects vertical data" fails.
- 1e-6 added to constant coefficient: exact-rational, closed-form, orthogonality, exact-recovery, goldens fail.
- Bezier m1/3 -> m1/2: Bezier control points, Bernstein sampling, round trip fail.
- Hermite derivative d11 wrong: end-conditions and finite-difference fail.
- local tangent not scaled by h: chord C1 test fails (masked in same run by tangent mutation; attributed by test name only).
- end tangent zeroed: Catmull-Rom golden tangents fail.

## Spec contradictions and decisions
- I3 acceptance 3 ("moving one point changes at most two segments") is false for Catmull-Rom: moving P_i changes tangents at i-1, i, i+1, hence segments i-2..i+1 (up to four; only two have moved end points). Test asserts four and that segment 0 is unchanged. Spec should say "at most four segments".
- Kernel degree is uncapped (< points); `LEAST_SQUARES_LESSON_DEGREE_MAX = 5` exported for the lesson.
- Catmull-Rom: global-parameter derivative (P_{i+1}-P_{i-1})/(t_{i+1}-t_{i-1}); segment tangents scaled by segment parameter length; coincident consecutive points throw for both rules (spec allowed "handled or rejected").
- Rank deficiency: distinct-x count check plus QR diagonal below 1e-10 of column norm throws RangeError.

## Mathematical review and disposition (handler 2, 2026-10-31)

Independent review (Sonnet, read-only, 6 tool uses): no formula errors.
- Householder QR: the reflector sign avoids cancellation, the rank test is relative to each column's norm, and residuals are y−p.
- Hermite basis, derivative and Bézier conversion: correct in both directions.
- Catmull-Rom: the global derivative is correct, end tangents are one-sided, and local tangents are scaled by h, so the chain is C1.
- Recomputed in exact fractions: the I4 line, quadratic, cubic and outlier fits; the normal data [[4,6],[6,14]] and [9,18]; the I3 tangents and midpoint (2, 2.8125).

Dispositions:
- The spec's I3 locality line said "two segments". It is corrected to four (the worker's finding, confirmed by the handler).
- The chord-length rule is the finite-difference form, not Barry–Goldman. Lesson text must not call it "the" non-uniform Catmull-Rom.
- Coincident points throw. The I3 UI catches the `RangeError`.
- The unscaled Vandermonde matrix and the integer-only oracle data: accepted for lesson ranges.
- The seven mutations ran together, so the handler separately ran the least-proven one (local tangent not scaled by h). It failed "interpolates every point and is C1 at the interior joins (uniform and chord)" and was reverted. The reflector-sign mutation was not run; accepted.
- PS-1c needs the total sum of squares and must handle horizontal data (r² = 0/0) itself.
