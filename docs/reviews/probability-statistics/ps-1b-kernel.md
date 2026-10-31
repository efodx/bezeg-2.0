# PS-1b evidence: convolution kernel (grid density, n-fold sum, standardization, Kolmogorov distance)

Files (new): `src/analysis/convolution.ts`, `src/analysis/convolution.test.ts`, `docs/adr/0031-probability-convolution-representation.md` (proposed). Reuses `normalCdf` and `normalPdf` from `distributions.ts` (not duplicated); no other file touched.

## API

`GridDensity {x0, h, values}` (nodes `x0 + i h`, zero outside). `normalize` (trapezoid mass 1; returns the signed residual `mass - 1`), `convolve(f, g)` (trapezoid rule over the overlap of the supports, half weight at both ends, so the density is 0 at the two extreme nodes; renormalized; residual reported), `nFold(base, n)` (n-1 convolutions with the base; `n` integer in 1..30 else status `n-out-of-range`; residual = largest in magnitude), `moments` (mass, mean, variance, skewness), `standardize` (shifts and scales the grid: `x0`, `h` divided by sd, values times sd), `cdf` (cumulative trapezoid at the nodes), `kolmogorovDistance` (standard normal), `mass`, `nodeX`, `isValidGrid`. Bases: `uniformBase(h)`, `triangleBase(h)` (2(1-x)), `piecewiseLinearBase(heights = 5 ones, h)` with negative heights clamped to 0, `defaultHeights`. Defaults: h = 0.01 (cells 10..2000 allowed), heights 2..32. Failures are returned as `{ok: false, status}` (`n-out-of-range`, `zero-mass`, `invalid-grid`, `grid-mismatch`, `invalid-step`, `invalid-heights`), never thrown.

Kolmogorov sup between nodes: the grid density is read as the piecewise-linear interpolant, so F is quadratic in each cell and (F - Phi)' = f - phi. Each cell where f - phi changes sign gets its root by 60 bisection steps and F - Phi is evaluated there, besides every node and the tail |F(end) - 1|. A test on a 6-node grid with h = 0.6 shows nodes alone miss the supremum by more than 3e-5, and the kernel agrees with a brute-force scan (dx = 1e-4) within 1e-5.

## Results (observed)

- `just unit src/analysis/convolution --maxWorkers=2`: 1 file, 39 tests passed (log `.command-logs/ps1b-final.log`). `npx tsc --noEmit --pretty false`: exit 0, no errors (`ps1b-tsc.log`). ESLint on both files: clean.
- Oracles are independent: the Irwin-Hall density and CDF are written in the test from the closed formula (alternating binomial sum); the exact standardized Kolmogorov distance of U(0,1) is a 40001-point scan of that CDF against `normalCdf`.

### Reproduced (h = 0.01; spec value, then observed)

- Irwin-Hall density sup error (uniform base): spec 5e-3 at n=2 and <= 6e-5 for n >= 3; observed 1.7e-16 (n=2), 1.3e-15 (3), 2.1e-5 (5), 2.8e-5 (10). The tests use the spec bounds. The n=2 bound holds with a wide margin because this kernel's trapezoid is exact on the triangle (see "Not reproduced").
- CDF error < 1e-4 for n=1,2,3,5,10; observed 6.7e-16, 3.3e-16, 8.3e-6, 1.4e-5, 1.9e-5.
- U(0,1) Kolmogorov distance for n=1,2,3,5,10. Spec: 0.05721, 0.01643, 0.00985, 0.00571, 0.00281. Observed: 0.05718, 0.01644, 0.00986, 0.00572, 0.00281. Exact Irwin-Hall scan: 0.05721, 0.01643, 0.00985, 0.00571, 0.00281. Largest deviation from the spec 3e-5. n=20 and 30 observed 0.00139 (spec 0.00139) and 0.00092.
- Skewed Kolmogorov distance, observed n=1,2,3,5,10: 0.07868, 0.03557, 0.02492, 0.01851, 0.01248 (spec 0.07865, 0.03556, 0.02495, 0.01859, 0.01261); n=20, 30: 0.00861, 0.00697. Tests allow 2e-4 against the spec values; the n=10 difference is 1.3e-4 (see below).
- n K_n for U: 0.0572, 0.0329, 0.0296, 0.0286, 0.0281, 0.0278 (n=1,2,3,5,10,20; spec 0.057, 0.033, 0.030, 0.029, 0.028). sqrt(n) K_n for skewed: 0.0787, 0.0503, 0.0432, 0.0414, 0.0395 (spec 0.079, 0.050, 0.043, 0.042, 0.040).
- Skewed n=10 mean 3.33307 (spec 3.33287; exact 10/3) and variance 0.55558 (spec 0.55612; exact 5/9), both within 1e-3. Uniform n=2, 5, 30 means and variances are also within 1e-3.
- f_2(1) of the skewed density: 0.666667 (spec 0.6666 against 2/3; test bound 1e-4).
- Skewness of the standardized sum: 0.40006, 0.32653, 0.25286, 0.17876 for n=2,3,5,10 (spec 0.4000, 0.3266, 0.2530, 0.1789; formula 0.56569/sqrt(n) within 1e-3). The n=1 grid skewness is 0.56518 against 0.56569 (grid error 5e-4).
- Grid halving: h = 0.005 gives 0.012481 for the skewed n=10 distance (spec 0.01252; test bound 1e-4); h = 0.0025 gives 0.01248, so the distance does not move with h in this kernel.

### Not reproduced (the kernel differs from the spec's draft scheme)

1. Spec mass 0.999975 after a convolution step: observed residual exactly -1.00e-4 (= -h^2) per step for the skewed base from n=2 on, and below 1e-15 for the uniform base. The test asserts |residual| < 2.5e-4 (skewed) and < 1e-12 (uniform), not 0.999975.
2. Spec density sup error 5e-3 at n=2 for the uniform law: this kernel puts half weights at the two ends of the overlap, so the n=2 triangle is exact. A scratch check of a scheme with half weights on one factor only gave exactly 5.0e-3 (and an unnormalized mass of 1.0099), a plausible origin of the spec's 5e-3. That scheme and a plain Riemann sum did not recover the spec's 0.999975 or its skewed distances (both gave 0.01249 at n=10 after renormalization). The skewed distances of this kernel are stable under h = 0.01, 0.005, 0.0025 to five digits (0.07868 to 0.07865 at n=1; 0.01248 throughout at n=10), so the spec's n=3, 5, 10 table entries probably carry an O(h) scheme error of up to 1.3e-4 that this kernel does not have. Recommend replacing them in the spec with 0.02492, 0.01851, 0.01248 (h = 0.01, converged) when P3 is written.
3. Spec f_2(1) = 0.6666: this kernel returns 0.66667 (exact to rounding); the spec's number is what the one-factor and Riemann sums give.

## Mutations (each reverted by restoring the original file; final run green, 39 passed)

Failure counts are failed tests out of 38 (first batch) or 39 (second batch):

1. convolve end half weights removed: 7 failed.
2. nFold one convolution short (`step < n`): 10.
3. standardize leaves values unscaled: 8.
4. cdf uses full instead of half trapezoid: 11.
5. mass without the end correction: 7.
6. normalize does not rescale: 7.
7. moments mean offset dropped: 10.
8. skewness divides by sd^2: 3.
9. n upper bound off by one (`n > N_MAX + 1`): 1.
10. n lower bound `n < 0` (second batch): 1.
11. negative heights not clamped: 1.
12. grid-mismatch check removed: 1.
13. residual sign flipped: 1.
14. convolution x0 not added: 1.
15. triangle base changed to 6(1-x)^2: 8.
16. piecewise segment-index clamp removed (second batch): 6.
17. Kolmogorov interior supremum skipped: survived the first suite (0 failed; at h = 0.01 the nodes are within 3e-3 of the maximum). The coarse-grid brute-force test was added, after which this mutation gives 1 failed.
18. Bisection takes the wrong half (second batch): 1.
19. All-zero check in `piecewiseLinearBase` removed: survived because `normalize` rejects zero mass with the same status. The redundant check was deleted from the kernel instead; rejection is still covered by the all-zero and all-negative shape tests.

Log: `.command-logs/ps1b-mutations.log`.

## Measurement (Node v24.21.0, win32 x64, AMD Ryzen 5 3600 12 threads, 17 GB; median of 9-15 runs after 3 warm-ups; not a browser)

Command: a scratch script copied `convolution.ts` and `distributions.ts` to a temp directory with import suffixes rewritten and ran `node bench.ts` (native type stripping); timings via `performance.now()`. Base: right triangle. Columns: nFold(n) cumulative (n-1 convolutions); one last step `convolve(f_{n-1}, base)`; FFT prototype of B^n (forward transform of the zero-padded base, n-th power, inverse; timing only, scaling not matched to the trapezoid kernel, output not compared).

| h | n | cumulative ms | last step ms | FFT ms (size) |
| --- | --- | --- | --- | --- |
| 0.01 | 2 | 0.125 | 0.075 | 0.067 (256) |
| 0.01 | 5 | 0.366 | 0.132 | 0.073 (512) |
| 0.01 | 10 | 1.153 | 0.269 | 0.174 (1024) |
| 0.01 | 20 | 2.354 | 0.210 | 0.357 (2048) |
| 0.01 | 30 | 5.375 | 0.328 | 0.813 (4096) |
| 0.005 | 2 | 0.056 | 0.053 | 0.074 (512) |
| 0.005 | 5 | 0.479 | 0.186 | 0.155 (1024) |
| 0.005 | 10 | 1.908 | 0.360 | 0.342 (2048) |
| 0.005 | 20 | 8.150 | 0.772 | 0.749 (4096) |
| 0.005 | 30 | 18.253 | 1.158 | 1.587 (8192) |

Full recompute after a base-shape edit at n=30 (shape sampling + nFold): 6.96 ms at h=0.01 and 18.6 ms at h=0.005. With standardize, Kolmogorov distance and moments added: 7.64 ms and 21.2 ms (post-processing alone 1.6 ms and 3.1 ms). Single timings are noisy at the 0.1 ms level (the last-step column is not monotone in n at h=0.01).

## Not verified

Browser, phone and drag-gesture timings (the performance plan's protocol); the FFT prototype's numerical output; any use from a Demonstration, Preset, localization or lesson text; the full unit suite (only this file was run).

## Mathematical review and disposition (handler 4, 2026-10-31)

Independent review (`bezeg-reviewer` Sonnet, 15 tool uses, ~34k tokens) built an exact oracle: the rational (`Fraction`) piecewise-polynomial n-fold law of 2(1 - x) with total mass exactly 1, exact mean n/3 and variance n/18, and the Irwin-Hall closed form for the uniform law.

| n | 1 | 2 | 3 | 5 | 10 | 20 |
| --- | --- | --- | --- | --- | --- | --- |
| skewed, exact K_n | 0.0786496 | 0.0355558 | 0.0249181 | 0.0185186 | 0.0124833 | |
| uniform, exact K_n | 0.05721 | 0.01643 | 0.00985 | 0.00571 | 0.00281 | 0.0013915 |

- The kernel's scheme is the converged one. The spec's skewed values for n = 3, 5, 10 (0.02495, 0.01859, 0.01261), its h = 0.005 value 0.01252, the uniform n = 2 density error 5e-3, the mass 0.999975, the skewed n = 10 mean and variance (3.33287 and 0.55612) and f_2(1) = 0.6666 came from a less exact scheme. The spec was amended to the exact values (P3 default example, acceptance 1-4, correctness note on O(h) error).
- Verified correct: convolution weights and origin, signed renormalization residual, relative step tolerance, grid moments and `standardize`, the quadratic-cell supremum with bisection, all statuses, clamping of negative heights, and the independent Irwin-Hall oracle.

Findings and dispositions (handler repairs):
1. Medium. The skewed test accepted both the spec's and the kernel's values (2e-4). It now uses the exact values within 4e-5; n = 1 carries the O(h) error of the jump at 0 (observed 3.1e-5).
2. Medium. The n = 2 density bound of 5e-3 was vacuous. It is now 1e-12.
3. Low. The grid-halving test now targets the exact 0.0124833 within 3e-5, and coarse and fine grids agree within 3e-5.
4. Low. `standardize` reported `zero-mass` for a variance of 0. It now reports a new `zero-variance` status, and still reports `zero-mass` for a grid without mass. Tested with a single spike.
5. Low, accepted. A cell where f - phi changes sign twice with equal end signs is skipped; the effect is at most O(h^2).
6. Low, accepted. The right-tail initial value is cosmetic, because the end-node term covers it.

Repair evidence (revision 6f812a5 plus this diff): `just unit src/analysis/convolution --maxWorkers=2` passed 39/39. Handler mutation: half weight only at the lower end of the overlap (the kind of scheme behind the spec's draft numbers) failed 9 tests, including the tightened n = 2 bound; reverted by restoring the file.

ADR 0031 accepted with option (a), h = 0.01 and n <= 30. The browser and phone drag measurement moves to the P3 graph slice.

