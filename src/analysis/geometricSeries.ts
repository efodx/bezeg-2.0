/**
 * Geometric series S_n = a(1 - q^n)/(1 - q) and its limit. Pure; no UI dependencies.
 *
 * One numerical owner for every consumer (bars, captions, readouts, tolerance statuses, y-range): the term, the partial sum, the
 * limit and the tail all come from the functions below, so they agree. The relationship is
 *     limit - S_n = a q^n / (1 - q)      (|q| < 1),
 * but the two are evaluated by different formulas on purpose. The sum needs `1 - q^n`, which cancels when |q| is close to 1 and
 * is rounded away to nothing near q = 1 (a = 1, q = 1 - 1e-12, n = 50 read exactly 50). The tail has no such difference: it is
 * a small number by itself, and subtracting S_n from the limit would lose it entirely once it is below the ulp of the limit
 * (a = 1, q = 0.1, tolerance 1e-18). So the tail is always evaluated directly and never as `limit - S_n`.
 */

/** Maximum number of terms shown or played back. */
export const GEOMETRIC_SERIES_MAX_TERMS = 50;

/** n-th term a*q^(n-1), n >= 1. */
export function geometricTerm(a: number, q: number, n: number): number {
    return a * Math.pow(q, n - 1);
}

/** Distance of |q| from 1 below which `1 - q^n` is computed through expm1 instead of by subtraction. */
const NEAR_UNIT_DISTANCE = 0.25;

/**
 * Partial sum S_n. For q = 1 this is n*a, with no division; q = -1 gives exactly a or 0; n <= 0 gives 0. Away from |q| = 1 it is
 * the closed form with Math.pow (exact where the powers are exact, such as q = 2 or q = 1/2). Near |q| = 1 `1 - q^n` is
 * -expm1(n ln|q|), with ln|q| = log1p(|q| - 1) (|q| - 1 is exact there), or 1 + |q|^n for odd n and q < 0, so there is no cancellation.
 */
export function geometricPartialSum(a: number, q: number, n: number): number {
    if (n <= 0) return 0;
    if (q === 1) return n * a;
    if (q === -1) return n % 2 === 1 ? a : 0;
    if (Math.abs(Math.abs(q) - 1) >= NEAR_UNIT_DISTANCE) return a * (1 - Math.pow(q, n)) / (1 - q);
    const logMagnitude = n * Math.log1p(Math.abs(q) - 1);
    const oneMinusPower = q < 0 && n % 2 === 1 ? 1 + Math.exp(logMagnitude) : -Math.expm1(logMagnitude);
    return a * oneMinusPower / (1 - q);
}

/** The limit exists only for |q| < 1 (and a != 0 for a meaningful marker). */
export function geometricSeriesConverges(a: number, q: number): boolean {
    return a !== 0 && Math.abs(q) < 1;
}

/** Limit a/(1-q), or null when the series does not converge. */
export function geometricSeriesLimit(a: number, q: number): number | null {
    return geometricSeriesConverges(a, q) ? a / (1 - q) : null;
}

/** Tail |limit - S_n| = |a q^n / (1 - q)|, evaluated directly (see the module comment); null when there is no limit. */
export function geometricTailError(a: number, q: number, n: number): number | null {
    if (!geometricSeriesConverges(a, q)) return null;
    return Math.abs(a * Math.pow(q, n) / (1 - q));
}

/** The numbers one display step is derived from: term n, partial sum S_n, limit and tail (both null without a limit). */
export interface GeometricSeriesValues {
    readonly term: number;
    readonly sum: number;
    readonly limit: number | null;
    readonly tail: number | null;
}

export function geometricSeriesValues(a: number, q: number, n: number): GeometricSeriesValues {
    return {
        term: geometricTerm(a, q, n), sum: geometricPartialSum(a, q, n),
        limit: geometricSeriesLimit(a, q), tail: geometricTailError(a, q, n),
    };
}

/** Partial sums S_1..S_n, n clamped to the term cap; each entry is exactly `geometricPartialSum(a, q, k)`. */
export function geometricPartialSums(a: number, q: number, n: number): number[] {
    const count = Math.max(0, Math.min(Math.floor(n), GEOMETRIC_SERIES_MAX_TERMS));
    const out: number[] = [];
    for (let k = 1; k <= count; k++) out.push(geometricPartialSum(a, q, k));
    return out;
}

/**
 * First n (1..cap) with tail |a q^n/(1-q)| < tolerance, or null if none or no limit. The tail decreases monotonically for
 * |q| < 1, so it stays below the tolerance from this n on. The comparison is strict: a tail equal to the tolerance does not count.
 * It is the same tail as `SeriesView.error`, not a difference of the limit and a rounded sum.
 */
export function firstTermWithinTolerance(a: number, q: number, tolerance: number): number | null {
    for (let n = 1; n <= GEOMETRIC_SERIES_MAX_TERMS; n++) {
        const tail = geometricTailError(a, q, n);
        if (tail === null) return null;
        if (tail < tolerance) return n;
    }
    return null;
}
