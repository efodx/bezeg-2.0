# PS-1a evidence: distributions kernel (erf, normal, binomial, Poisson, trapezoid strips)

Files (new): `src/analysis/distributions.ts`, `src/analysis/distributions.test.ts`. Not added to `FUNCTION_IDS`.

## API

`erf`, `erfc`, `normalPdf/normalCdf/normalTail(x, mu=0, sigma=1)`, `normalProbability(a, b, mu, sigma)` (tail difference right of the mean), `zScore`, `logFactorial`, `binomialPmf/binomialMasses/binomialCdf`, `binomialMean`, `binomialStandardDeviation`, `poissonPmf/poissonCdf`, `binomialNormalCdf(n,p,k,correction)`, `binomialNormalPmf`, `binomialPoissonDistance`, `trapezoidStrips(density,a,b,n)`, `normalStrips(a,b,n,mu,sigma)` returning `Subinterval[]`; guards `isBinomialN`, `isProbability`; limits `BINOMIAL_N_MAX = 1000`, `POISSON_LAMBDA_MAX = 500`.

## Accuracy

erf: positive-term series (|x| < 2.5) and continued fraction for erfc (x >= 2.5, 120 terms). Observed vs Python `math.erf`/`erfc` reference decimals: erf < 1e-14 absolute, erfc 1e-13 relative at 0.1, 0.5, 1, 2, 3, 6. Claimed: 1e-12 over [-6, 6] (spec bound). Mass functions: sums to 1 within 1e-12 for B(20..1000) and Poisson(7.5).

## Results (observed)

- `just unit src/analysis/distributions`: 1 file, 28 tests passed (log `.command-logs/ps1a-final2.log`).
- `npx tsc --noEmit --pretty false`: see the handback message (log `.command-logs/ps1a-tsc.log`).
- Reproduced: P1 (0.68269/0.9545/0.9973, N(100,15) 0.81859, Simpson 0.81859461412, Phi(2), Phi(-1)); P2 (0.25172/0.25117/0.18555; 0.1841/0.18406/0.15866; 0.27341/0.27067/0.27902; TV 0.00457 < np^2). Oracles: tabulated erf decimals, odd symmetry, derivative by central difference, Phi at 0, +-1, 1.96, 3, independent Simpson, hand fractions for small binomials, exact integer sum for B(20,1/2), mean/variance by summation, strips converge to the CDF difference at ratio >= 3.5 per doubling.
- Note: the strip-error bound in the test is 2e-5 at n = 160 (observed 1.0e-5), not the 2e-6 first guessed.

## Mutations (each reverted; final run green)

1. erf series ratio 2n+1 -> 2n+3: 12 failed (erf table, continuity, derivative, Phi, Simpson, P1, P2 groups).
2. erfc continued-fraction coefficient k/2 -> k/3: 4 failed (erf/erfc table, switch continuity, derivative, P(Z>6) tail).
3. normalProbability right-of-mean branch via CDF difference: 1 failed (tail precision).
4. binomial pmf log1p(-p) -> log(p): 4 failed.
5. continuity shift 0.5 -> 0.4: 2 failed (the two golden P2 cases).
6. strip nodes a + i*h*0.99: first survived (area tolerance too loose); an equal-width assertion was added, then 1 failed (contiguity/width test).
7. Poisson ln k! -> ln (k+1)!: 4 failed.

## Notes and decisions

- p in the open interval (0, 1) is rejected with a `RangeError` (spec P2 criterion 2, first choice); n integer 1..1000.
- `normalProbability` returns 0 for a >= b (swap/empty status is the UI's choice).
- Stirling log-factorial from k = 30 (error below 1e-13), summed logs below.
- A stray file `0.4` created in the repo root by a bad shell line was deleted.

## Not verified

No browser, no UI, no performance measurement (binomial bars at n = 200 are pure math here). The reference erf decimals come from Python `math.erf`; the A&S table was not opened.

## Review repairs (disposition)

1. Defect fixed: `POISSON_LAMBDA_MAX` is now `BINOMIAL_N_MAX` (1000). New test "the Poisson cap" (poissonPmf(1000,1000) vs Python 0.012614611348719664 at 1e-11, binomialPoissonDistance(1000,0.999) finite in [0,1], lambda 1000.5 throws). Pre-fix: failed with `RangeError: lambda must be greater than 0 and at most 500`; post-fix 30 tests pass (`ps1a-fixpost.log`, run with `--maxWorkers=2`).
2. Gap fixed: erfc(4), erfc(5), normalTail(5), erf(2.49), erf(2.51) added at relative 1e-12 (all passed on first run); describe title now names Python math.erf references, not A&S. (The earlier note about the A&S table is moot.)

## Mathematical review (handler 2, 2026-10-31)

Independent review (Sonnet, read-only, 10 tool uses): no formula errors. The checks covered the erf/erfc switch at 2.5 and the 120-term continued fraction, tail branches without cancellation, the three-term Stirling series from k=30 (first omitted term about 2.7e-14), `log1p` masses, continuity-correction formulas, and the trapezoid strips' match with `Subinterval`. The reviewer recomputed the P1/P2 golden numbers and B(1000,0.5) at 500 in Python, and they agree. The `binomialPoissonDistance` defect and the oracle gap are fixed (above), and the handler confirmed the pre-fix failure the worker reported. The total-variation value 0.00457 was not recomputed independently.

Checks: `just unit src/analysis/interpolation src/analysis/distributions` passed and `npx tsc --noEmit --pretty false` exited 0 at 4deaa51 plus the working tree.
