/**
 * Knot vectors for B-splines of degree k (order k + 1) with n + 1 control points.
 * A vector has m + 1 = n + k + 2 non-decreasing knots u_0..u_m; the valid parameter domain is [u_k, u_{n+1}].
 * Pure arithmetic on plain numbers: no React, JSXGraph, Point objects or caches.
 */

export type KnotVectorError =
    | 'wrong_length'
    | 'decreasing'
    | 'multiplicity_too_high'
    | 'empty_domain'
    | 'not_finite';

export type KnotVectorValidation = { ok: true } | { ok: false, reason: KnotVectorError };

/** Programming errors (not user input): degree must be an integer >= 0 and n >= k, i.e. at least k + 1 points. */
function assertDegreeAndCount(k: number, n: number): void {
    if (!Number.isInteger(k) || k < 0) {
        throw new RangeError(`B-spline degree must be an integer >= 0, got ${k}`);
    }
    if (!Number.isInteger(n) || n < k) {
        throw new RangeError(`B-spline of degree ${k} needs at least ${k + 1} control points, got ${n + 1}`);
    }
}

/**
 * Checks a knot vector for degree `k` and `n + 1` control points. The first failing check wins, in the order
 * not_finite, wrong_length, decreasing, multiplicity_too_high (> k + 1; interior k + 1 is a break and allowed),
 * empty_domain (u_k = u_{n+1}).
 */
export function validateKnotVector(u: readonly number[], k: number, n: number): KnotVectorValidation {
    assertDegreeAndCount(k, n);
    if (!u.every(Number.isFinite)) {
        return {ok: false, reason: 'not_finite'};
    }
    if (u.length !== n + k + 2) {
        return {ok: false, reason: 'wrong_length'};
    }
    for (let i = 1; i < u.length; i++) {
        if (u[i] < u[i - 1]) {
            return {ok: false, reason: 'decreasing'};
        }
    }
    let run = 1;
    for (let i = 1; i < u.length; i++) {
        run = u[i] === u[i - 1] ? run + 1 : 1;
        if (run > k + 1) {
            return {ok: false, reason: 'multiplicity_too_high'};
        }
    }
    if (u[k] === u[n + 1]) {
        return {ok: false, reason: 'empty_domain'};
    }
    return {ok: true};
}

/** Throws a RangeError naming the reason when the vector is invalid. */
export function assertValidKnotVector(u: readonly number[], k: number, n: number): void {
    const result = validateKnotVector(u, k, n);
    if (!result.ok) {
        throw new RangeError(`Invalid knot vector: ${result.reason}`);
    }
}

/** The valid parameter interval [u_k, u_{n+1}]. */
export function domain(u: readonly number[], k: number, n: number): [number, number] {
    return [u[k], u[n + 1]];
}

/** How many knots equal `x` exactly. */
export function multiplicity(u: readonly number[], x: number): number {
    let count = 0;
    for (const knot of u) {
        if (knot === x) {
            count++;
        }
    }
    return count;
}

/**
 * The knot span index i in [k, n] with u_i <= t < u_{i+1}. At the right end t = u_{n+1} the last non-empty
 * span is returned (the closed-end special case), so evaluation never degenerates to a zero vector.
 * Assumes a valid vector; throws a RangeError when t is not finite or outside the domain.
 */
export function findSpan(u: readonly number[], k: number, n: number, t: number): number {
    if (!Number.isFinite(t) || t < u[k] || t > u[n + 1]) {
        throw new RangeError(`Parameter ${t} is outside the knot domain [${u[k]}, ${u[n + 1]}]`);
    }
    if (t === u[n + 1]) {
        let span = n;
        while (span > k && u[span] === u[span + 1]) {
            span--;
        }
        return span;
    }
    let low = k;
    let high = n;
    while (low < high) {
        const mid = (low + high + 1) >> 1;
        if (u[mid] <= t) {
            low = mid;
        } else {
            high = mid - 1;
        }
    }
    return low;
}

/** Clamped uniform vector: ends of multiplicity k + 1, interior knots 1, 2, ..., n - k. For n = k it is (0^{k+1}, 1^{k+1}). */
export function clampedUniformKnots(k: number, n: number): number[] {
    assertDegreeAndCount(k, n);
    const last = n - k + 1;
    const knots: number[] = [];
    for (let i = 0; i <= k; i++) {
        knots.push(0);
    }
    for (let i = 1; i <= n - k; i++) {
        knots.push(i);
    }
    for (let i = 0; i <= k; i++) {
        knots.push(last);
    }
    return knots;
}

/** Unclamped uniform vector 0, 1, 2, ..., n + k + 1 (domain [k, n + 1]). */
export function uniformKnots(k: number, n: number): number[] {
    assertDegreeAndCount(k, n);
    return Array.from({length: n + k + 2}, (_, i) => i);
}

/**
 * The knots mapped affinely so that the domain [u_k, u_{n+1}] becomes [0, 1] (display toggle only; the model
 * keeps the raw parameter). Knots outside the domain fall outside [0, 1].
 */
export function normalizeKnotsForDisplay(u: readonly number[], k: number, n: number): number[] {
    assertValidKnotVector(u, k, n);
    const start = u[k];
    const length = u[n + 1] - start;
    return u.map(knot => (knot - start) / length);
}
