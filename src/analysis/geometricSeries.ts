/** Geometric series S_n = a(1 - q^n)/(1 - q) and its limit. Pure; no UI dependencies. */

/** Maximum number of terms shown or played back. */
export const GEOMETRIC_SERIES_MAX_TERMS = 50;

/** n-th term a*q^(n-1), n >= 1. */
export function geometricTerm(a: number, q: number, n: number): number {
    return a * Math.pow(q, n - 1);
}

/** Partial sum S_n. For q = 1 this is n*a, with no division. */
export function geometricPartialSum(a: number, q: number, n: number): number {
    if (n <= 0) return 0;
    if (q === 1) return n * a;
    return a * (1 - Math.pow(q, n)) / (1 - q);
}

/** The limit exists only for |q| < 1 (and a != 0 for a meaningful marker). */
export function geometricSeriesConverges(a: number, q: number): boolean {
    return a !== 0 && Math.abs(q) < 1;
}

/** Limit a/(1-q), or null when the series does not converge. */
export function geometricSeriesLimit(a: number, q: number): number | null {
    return geometricSeriesConverges(a, q) ? a / (1 - q) : null;
}

/** Partial sums S_1..S_n, n clamped to the term cap. */
export function geometricPartialSums(a: number, q: number, n: number): number[] {
    const count = Math.max(0, Math.min(Math.floor(n), GEOMETRIC_SERIES_MAX_TERMS));
    const out: number[] = [];
    let sum = 0;
    for (let k = 1; k <= count; k++) {
        sum += geometricTerm(a, q, k);
        out.push(sum);
    }
    return out;
}

/** First n (1..cap) with |limit - S_n| < tolerance, or null if none or no limit. */
export function firstTermWithinTolerance(a: number, q: number, tolerance: number): number | null {
    const limit = geometricSeriesLimit(a, q);
    if (limit === null) return null;
    for (let n = 1; n <= GEOMETRIC_SERIES_MAX_TERMS; n++) {
        if (Math.abs(limit - geometricPartialSum(a, q, n)) < tolerance) return n;
    }
    return null;
}
