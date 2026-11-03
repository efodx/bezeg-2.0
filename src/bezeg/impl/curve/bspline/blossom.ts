/**
 * The blossom (polar form) of one polynomial segment of a B-spline. For a segment [u_j, u_{j+1}) of degree k the
 * blossom f is the unique symmetric multi-affine function of k arguments with f(t, ..., t) = the curve point.
 * It is computed by de Boor's recursion on P_{j-k..j} with one argument per level. Raw knot values, half-open
 * segments (ADR 0024); the segment is named by its index, so the caller decides which side of a break is meant.
 * Only degree 2 and 3 are offered (L6 scope).
 */
import {assertValidKnotVector} from './knot-vector';
import {assertPointRows} from './insertion';

export type BlossomError = 'unsupported_degree' | 'bad_segment' | 'wrong_argument_count' | 'not_finite';

export interface BlossomTriangle {
    /** The segment index j, with u_j < u_{j+1}. */
    segment: number;
    /** levels[r] has k + 1 - r points (control indices j - k + r .. j); levels[0] are P_{j-k..j}, levels[k][0] is f(args). */
    levels: number[][][];
}

export type BlossomResult =
    | { ok: true, point: number[], triangle: BlossomTriangle }
    | { ok: false, reason: BlossomError };

/**
 * f(args) on segment `segment` for degree `k` (2 or 3) and exactly k finite arguments (any order, any real value;
 * the polynomial is extended beyond its segment). Refusals come back as reason codes; invalid knot vectors or
 * control points throw like the other kernel evaluators.
 */
export function blossom(
    u: readonly number[],
    k: number,
    P: readonly (readonly number[])[],
    segment: number,
    args: readonly number[],
): BlossomResult {
    if (k !== 2 && k !== 3) {
        return {ok: false, reason: 'unsupported_degree'};
    }
    const n = u.length - k - 2;
    assertValidKnotVector(u, k, n);
    assertPointRows(P, n + 1);
    if (!Number.isInteger(segment) || segment < k || segment > n || !(u[segment] < u[segment + 1])) {
        return {ok: false, reason: 'bad_segment'};
    }
    if (args.length !== k) {
        return {ok: false, reason: 'wrong_argument_count'};
    }
    if (!args.every(Number.isFinite)) {
        return {ok: false, reason: 'not_finite'};
    }
    let current = P.slice(segment - k, segment + 1).map((row) => [...row]);
    const levels: number[][][] = [current];
    for (let r = 1; r <= k; r++) {
        const next: number[][] = [];
        for (let j = segment - k + r; j <= segment; j++) {
            // u_j <= u_segment < u_{segment+1} <= u_{j+k+1-r}, so the denominator is positive.
            const alpha = (args[r - 1] - u[j]) / (u[j + k + 1 - r] - u[j]);
            const before = current[j - 1 - (segment - k + r - 1)];
            const after = current[j - (segment - k + r - 1)];
            next.push(before.map((value, d) => (1 - alpha) * value + alpha * after[d]));
        }
        levels.push(next);
        current = next;
    }
    return {ok: true, point: current[0], triangle: {segment, levels}};
}
