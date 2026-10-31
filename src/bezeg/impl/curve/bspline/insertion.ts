/**
 * Boehm knot insertion on coordinate rows. Inserting a knot changes the knot vector and the control polygon
 * but not the curve. Pure arithmetic on plain numbers; evaluators throw on invalid vectors (BS-1a convention),
 * user-driven refusals have reason codes through {@link checkKnotInsertion}.
 */
import {assertValidKnotVector, multiplicity} from './knot-vector';

export type KnotInsertionError = 'not_finite' | 'outside_domain' | 'multiplicity_too_high';
export type KnotInsertionCheck = { ok: true } | { ok: false, reason: KnotInsertionError };

export interface KnotInsertion {
    /** The knot vector with one more knot. */
    knots: number[];
    /** One more control point; the curve they define is the original one. */
    points: number[][];
}

/** Shared by the BS-1b modules: `count` rows of one equal, positive, finite width. Throws a RangeError. */
export function assertPointRows(P: readonly (readonly number[])[], count: number): void {
    if (P.length !== count) {
        throw new RangeError(`Expected ${count} control points, got ${P.length}`);
    }
    const dimension = P[0].length;
    if (dimension < 1) {
        throw new RangeError('Control points need at least one coordinate');
    }
    for (const row of P) {
        if (row.length !== dimension) {
            throw new RangeError('All control points must have the same number of coordinates');
        }
        if (!row.every(Number.isFinite)) {
            throw new RangeError('Control point coordinates must be finite');
        }
    }
}

/**
 * Whether `x` may be inserted into a valid vector of degree `k` with `n + 1` points: finite (not_finite), inside
 * the domain [u_k, u_{n+1}] (outside_domain, ends included), and not already of multiplicity k + 1
 * (multiplicity_too_high, because the result would exceed k + 1).
 */
export function checkKnotInsertion(u: readonly number[], k: number, n: number, x: number): KnotInsertionCheck {
    assertValidKnotVector(u, k, n);
    if (!Number.isFinite(x)) {
        return {ok: false, reason: 'not_finite'};
    }
    if (x < u[k] || x > u[n + 1]) {
        return {ok: false, reason: 'outside_domain'};
    }
    if (multiplicity(u, x) >= k + 1) {
        return {ok: false, reason: 'multiplicity_too_high'};
    }
    return {ok: true};
}

/**
 * Boehm's single insertion of `x` (Piegl and Tiller A5.1). With l the last index with u_l <= x and s the current
 * multiplicity of x: Q_i = P_i for i <= l-k, Q_i = a_i P_i + (1-a_i) P_{i-1} for l-k+1 <= i <= l-s with
 * a_i = (x-u_i)/(u_{i+k}-u_i), Q_i = P_{i-1} for i >= l-s+1; x goes after u_l. This also holds at the domain ends
 * (there l is at least n + 1 at the right end), where the domain stays the same.
 * Throws a RangeError for an invalid vector, bad rows or a refused `x` (message names the reason).
 */
export function insertKnot(u: readonly number[], k: number, P: readonly (readonly number[])[], x: number): KnotInsertion {
    const n = u.length - k - 2;
    const check = checkKnotInsertion(u, k, n, x);
    if (!check.ok) {
        throw new RangeError(`Knot insertion refused: ${check.reason}`);
    }
    assertPointRows(P, n + 1);
    const s = multiplicity(u, x);
    let l = 0;
    while (l + 1 < u.length && u[l + 1] <= x) {
        l++;
    }
    const knots = [...u.slice(0, l + 1), x, ...u.slice(l + 1)];
    const points: number[][] = [];
    for (let i = 0; i <= n + 1; i++) {
        if (i <= l - k) {
            points.push([...P[i]]);
        } else if (i <= l - s) {
            const alpha = (x - u[i]) / (u[i + k] - u[i]);
            points.push(P[i].map((value, d) => alpha * value + (1 - alpha) * P[i - 1][d]));
        } else {
            points.push([...P[i - 1]]);
        }
    }
    return {knots, points};
}

/**
 * Repeats {@link insertKnot} until `x` has multiplicity `target` (1 .. k + 1); does nothing when it already has
 * at least that many. Throws a RangeError for target outside 1..k+1 or a refused `x`.
 */
export function insertToMultiplicity(u: readonly number[], k: number, P: readonly (readonly number[])[], x: number, target: number): KnotInsertion {
    if (!Number.isInteger(target) || target < 1 || target > k + 1) {
        throw new RangeError(`Target multiplicity must be an integer in 1..${k + 1}, got ${target}`);
    }
    const n = u.length - k - 2;
    const check = checkKnotInsertion(u, k, n, x);
    if (!check.ok && !(check.reason === 'multiplicity_too_high' && target <= multiplicity(u, x))) {
        throw new RangeError(`Knot insertion refused: ${check.reason}`);
    }
    let result: KnotInsertion = {knots: [...u], points: P.map(row => [...row])};
    while (multiplicity(result.knots, x) < target) {
        result = insertKnot(result.knots, k, result.points, x);
    }
    return result;
}
