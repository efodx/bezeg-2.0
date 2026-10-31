# PS-1c evidence: descriptive statistics and correlation kernels

Files (new): `src/analysis/descriptiveStatistics.ts` + `.test.ts`, `src/analysis/correlation.ts` + `.test.ts`. The line comes from `fitLine` in `leastSquares.ts` (not re-derived).

## API

- `descriptiveStatistics`: `mean`, `median`, `standardDeviation(values, 'population'|'sample')` (sample of one value is `undefined`), `fiveNumberSummary(values, rule='inclusive'|'exclusive')` returning `{status:'ok', q1, median, q3, iqr, fences, whiskers, outliers, ...}` or `{status:'too-few'}` below 3 values, `sumSquaredDeviations`, `sumAbsoluteDeviations`.
- `correlation(points)`: exact integer `nSxx/nSyy/nSxy` (tenths squared), `status` (`ok`, `too-few`, `zero-variance-x|y|both`), `r`, `rSquared`, `yOnX`, `xOnY` (both via `fitLine`), `totalSumOfSquares`, `residualSumOfSquares`, `slopeFromR`.

## Exactness

Inputs snap to integer tenths. Quartiles are held in half tenths and fences in quarter tenths (`2*Q1 - 3*IQR2`), so ordering, medians and the fence test are integer comparisons. Population/sample variance use the exact integer numerator `n*sum(x^2) - (sum x)^2`. `nSxy = 0` gives `r = 0` (not -0).

## Results (observed)

- `just unit src/analysis/descriptiveStatistics src/analysis/correlation --maxWorkers=2`: passed (logs `ps1c-final.log`, 2 files, 45 tests incl. properties).
- `npx tsc --noEmit --pretty false`: no output (clean).
- All spec numbers reproduced: P4 (5.857143, 6, 1.2454, 1.3452, quartiles 5/6/6.5 and 5/6/7, fences 2.75/8.75, 30 flagged, 10.857/11, 7/7.143, school sources 145/192.5, 141/197, 16.5/22, 4.707/5.263); P5 (nSxy=18 data units = 1800 tenths squared, r^2=81/95, 0.92338, 0.84680, SSres 0.7 and 8.7, x on y 0.94737/-0.63158, parabola r=0 exactly and 0.95831, ring Sxy=0). No contradictions.

## Mutations (each reverted by hand; final run green)

1. Default quartile rule inclusive -> exclusive: first run SURVIVED (tests always passed the rule); a default-arguments test was added, then 1 failed.
2. sigma population/sample branches swapped: 4 failed.
3. Upper fence + one quarter tenth: 3 failed (fences, the 30 case, the exact-boundary test).
4. Sxy sign flipped: 12 failed (correlation).
5. Exact `nSxy === 0` replaced by a tolerance returning 1e-17: 2 failed (parabola and ring exact 0).

## Notes

- Spec writes `nSxy = 18` in data units; the kernel reports tenths-squared units (1800), as the acceptance text says.
- Horizontal data: `r` undefined, `yOnX` still returned (slope 0); `xOnY` undefined. Vertical data: `yOnX` undefined. Two points: line given, `r` undefined.
- Tests use plain tests with a seeded LCG for the property checks; extreme-value property uses n >= 6 (smaller n lets exclusive quartiles use the extremes).

## Not verified

No browser or UI. Mathematical review: pending (handler).
