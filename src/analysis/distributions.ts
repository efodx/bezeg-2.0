import type {Subinterval} from './riemann';

/**
 * Pure probability kernel for the P1 and P2 demonstrations (docs/specs/probability-statistics-lessons.md, ADR 0027):
 * erf, the normal density and law, binomial and Poisson mass functions, their normal approximations and trapezoid
 * strips of a density. No randomness, no catalogue function, no React or JSXGraph.
 *
 * Accuracy (tolerances, not exactness): `erf` and `erfc` agree with a reference implementation (Python math.erf) to
 * about 1e-15 absolute and 1e-13 relative over [-6, 6]; the tests assert 1e-12, the spec's bound. Mass functions use
 * log-factorials and sum to 1 within 1e-12 for n up to {@link BINOMIAL_N_MAX}.
 */

/** Largest binomial n the kernel accepts; the spec suggests 200 for the lesson. */
export const BINOMIAL_N_MAX = 1000;
/** Largest Poisson mean the kernel accepts. */
export const POISSON_LAMBDA_MAX = BINOMIAL_N_MAX;

const SQRT_PI = Math.sqrt(Math.PI);
const SQRT_2 = Math.SQRT2;
const SQRT_2PI = Math.sqrt(2 * Math.PI);

/** From this x on erfc uses the continued fraction; below it erf uses the series. */
const CF_START = 2.5;

/** erf(x) = 2/sqrt(pi) e^{-x^2} sum_n 2^n x^{2n+1} / (1*3*...*(2n+1)), every term positive: no cancellation. */
function erfSeries(x: number): number {
    const x2 = x * x;
    let term = x;
    let sum = x;
    for (let n = 1; n < 200; n++) {
        term *= 2 * x2 / (2 * n + 1);
        sum += term;
        if (term < sum * 1e-17) break;
    }
    return 2 / SQRT_PI * Math.exp(-x2) * sum;
}

/** erfc(x) for x >= CF_START: e^{-x^2}/sqrt(pi) * 1/(x + (1/2)/(x + 1/(x + (3/2)/(x + ...)))), evaluated bottom-up. */
function erfcContinuedFraction(x: number): number {
    let tail = x;
    for (let k = 120; k >= 1; k--) tail = x + (k / 2) / tail;
    return Math.exp(-x * x) / SQRT_PI / tail;
}

/** The complementary error function 1 - erf(x); keeps full relative accuracy in the upper tail (erfc(6) = 2.15e-17). */
export function erfc(x: number): number {
    if (Number.isNaN(x)) return NaN;
    if (x < 0) return 2 - erfc(-x);
    if (x >= CF_START) return x > 27 ? 0 : erfcContinuedFraction(x);
    return 1 - erfSeries(x);
}

/** The error function; odd, with erf(+-infinity) = +-1. */
export function erf(x: number): number {
    if (Number.isNaN(x)) return NaN;
    if (x < 0) return -erf(-x);
    if (x >= CF_START) return 1 - erfc(x);
    return erfSeries(x);
}

function assertSigma(sigma: number): void {
    if (!Number.isFinite(sigma) || sigma <= 0) throw new RangeError('The standard deviation must be a finite number greater than 0.');
}

function assertFinite(value: number, what: string): void {
    if (!Number.isFinite(value)) throw new RangeError(`${what} must be a finite number.`);
}

/** Density of N(mu, sigma^2) at x. Throws for sigma <= 0 or non-finite parameters. */
export function normalPdf(x: number, mu = 0, sigma = 1): number {
    assertSigma(sigma);
    assertFinite(mu, 'The mean');
    const z = (x - mu) / sigma;
    return Math.exp(-z * z / 2) / (sigma * SQRT_2PI);
}

/** P(X <= x) for X ~ N(mu, sigma^2). */
export function normalCdf(x: number, mu = 0, sigma = 1): number {
    assertSigma(sigma);
    assertFinite(mu, 'The mean');
    return 0.5 * erfc(-(x - mu) / sigma / SQRT_2);
}

/** P(X > x) for X ~ N(mu, sigma^2), computed from erfc so that P(Z > 6) is not lost to cancellation. */
export function normalTail(x: number, mu = 0, sigma = 1): number {
    assertSigma(sigma);
    assertFinite(mu, 'The mean');
    return 0.5 * erfc((x - mu) / sigma / SQRT_2);
}

/** P(a <= X <= b) for X ~ N(mu, sigma^2); 0 for a >= b. Intervals right of the mean use the tail difference. */
export function normalProbability(a: number, b: number, mu = 0, sigma = 1): number {
    assertSigma(sigma);
    if (!(a < b)) return 0;
    if (a >= mu) return normalTail(a, mu, sigma) - normalTail(b, mu, sigma);
    return normalCdf(b, mu, sigma) - normalCdf(a, mu, sigma);
}

/** Standardized value (x - mu) / sigma. */
export function zScore(x: number, mu: number, sigma: number): number {
    assertSigma(sigma);
    return (x - mu) / sigma;
}

const logFactorialTable: number[] = [0, 0];

/** ln(k!) for an integer k >= 0: summed logs for small k, Stirling series (error below 1e-13) from k = 30. */
export function logFactorial(k: number): number {
    if (!Number.isInteger(k) || k < 0) throw new RangeError('The argument must be an integer of at least 0.');
    if (k < 30) {
        for (let i = logFactorialTable.length; i <= k; i++) logFactorialTable[i] = logFactorialTable[i - 1] + Math.log(i);
        return logFactorialTable[k];
    }
    const inv = 1 / k;
    return k * Math.log(k) - k + 0.5 * Math.log(2 * Math.PI * k) + inv / 12 - inv ** 3 / 360 + inv ** 5 / 1260;
}

const logChoose = (n: number, k: number): number => logFactorial(n) - logFactorial(k) - logFactorial(n - k);

export const isBinomialN = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= BINOMIAL_N_MAX;
/** p in the open interval (0, 1): the variance np(1-p) must be positive (documented choice, spec P2 criterion 2). */
export const isProbability = (p: unknown): p is number => typeof p === 'number' && p > 0 && p < 1;

function assertBinomial(n: number, p: number): void {
    if (!isBinomialN(n)) throw new RangeError(`n must be an integer from 1 to ${BINOMIAL_N_MAX}.`);
    if (!isProbability(p)) throw new RangeError('p must be strictly between 0 and 1.');
}

/** P(X = k) for X ~ B(n, p); 0 outside 0..n. */
export function binomialPmf(n: number, p: number, k: number): number {
    assertBinomial(n, p);
    if (!Number.isInteger(k) || k < 0 || k > n) return 0;
    return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
}

/** All masses P(X = 0..n) of B(n, p). */
export function binomialMasses(n: number, p: number): number[] {
    assertBinomial(n, p);
    return Array.from({length: n + 1}, (_, k) => binomialPmf(n, p, k));
}

/** P(X <= k) for B(n, p), the sum of the mass terms (never a table). */
export function binomialCdf(n: number, p: number, k: number): number {
    assertBinomial(n, p);
    if (k < 0) return 0;
    const top = Math.min(n, Math.floor(k));
    let sum = 0;
    for (let i = 0; i <= top; i++) sum += binomialPmf(n, p, i);
    return Math.min(1, sum);
}

export const binomialMean = (n: number, p: number): number => n * p;
export const binomialStandardDeviation = (n: number, p: number): number => Math.sqrt(n * p * (1 - p));

/** P(X = k) for Poisson(lambda); 0 for non-integer or negative k. */
export function poissonPmf(lambda: number, k: number): number {
    if (!Number.isFinite(lambda) || lambda <= 0 || lambda > POISSON_LAMBDA_MAX) throw new RangeError(`lambda must be greater than 0 and at most ${POISSON_LAMBDA_MAX}.`);
    if (!Number.isInteger(k) || k < 0) return 0;
    return Math.exp(k * Math.log(lambda) - lambda - logFactorial(k));
}

/** P(X <= k) for Poisson(lambda). */
export function poissonCdf(lambda: number, k: number): number {
    if (k < 0) return 0;
    let sum = 0;
    for (let i = 0; i <= Math.floor(k); i++) sum += poissonPmf(lambda, i);
    return Math.min(1, sum);
}

/**
 * Normal approximation of P(X <= k) for B(n, p): Phi((k + 1/2 - np) / sqrt(np(1-p))) with the continuity correction,
 * Phi((k - np) / sqrt(np(1-p))) without. A limit statement (de Moivre-Laplace), not a bound.
 */
export function binomialNormalCdf(n: number, p: number, k: number, correction: boolean): number {
    assertBinomial(n, p);
    return normalCdf(k + (correction ? 0.5 : 0), binomialMean(n, p), binomialStandardDeviation(n, p));
}

/** Normal approximation of P(X = k): the area over [k - 1/2, k + 1/2] (corrected) or the density at k (uncorrected). */
export function binomialNormalPmf(n: number, p: number, k: number, correction: boolean): number {
    assertBinomial(n, p);
    const mu = binomialMean(n, p);
    const sigma = binomialStandardDeviation(n, p);
    return correction ? normalProbability(k - 0.5, k + 0.5, mu, sigma) : normalPdf(k, mu, sigma);
}

/** Total variation distance between B(n, p) and Poisson(np): half the summed absolute mass differences over 0..n plus the Poisson tail. */
export function binomialPoissonDistance(n: number, p: number): number {
    assertBinomial(n, p);
    const lambda = n * p;
    let sum = 0;
    let poissonMass = 0;
    for (let k = 0; k <= n; k++) {
        const q = poissonPmf(lambda, k);
        poissonMass += q;
        sum += Math.abs(binomialPmf(n, p, k) - q);
    }
    return (sum + Math.max(0, 1 - poissonMass)) / 2;
}

/**
 * Trapezoid strips of a density over [a, b] in `Subinterval` form (y0, y1 are the density at the strip ends), so
 * `subintervalPolygons` fills them. n strips of equal width; a > b gives negative widths as in riemann.ts.
 */
export function trapezoidStrips(density: (x: number) => number, a: number, b: number, n: number): Subinterval[] {
    if (!Number.isInteger(n) || n < 1) throw new RangeError('The number of strips must be an integer of at least 1.');
    assertFinite(a, 'The bound a');
    assertFinite(b, 'The bound b');
    const h = (b - a) / n;
    const result: Subinterval[] = [];
    let xPrev = a;
    let yPrev = density(a);
    for (let i = 1; i <= n; i++) {
        const x = i === n ? b : a + i * h;
        const y = density(x);
        result.push({x0: xPrev, x1: x, y0: yPrev, y1: y});
        xPrev = x;
        yPrev = y;
    }
    return result;
}

/** Trapezoid strips of the N(mu, sigma^2) density over [a, b]. */
export const normalStrips = (a: number, b: number, n: number, mu = 0, sigma = 1): Subinterval[] =>
    trapezoidStrips(x => normalPdf(x, mu, sigma), a, b, n);
