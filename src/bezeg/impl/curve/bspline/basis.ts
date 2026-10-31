/**
 * B-spline basis functions N_{i,k} of degree k over a knot vector (Cox-de Boor, 0/0 := 0).
 * N_{i,0} is 1 on the half-open [u_i, u_{i+1}); at the right domain end the last non-empty span is used.
 */
import {assertValidKnotVector, findSpan} from './knot-vector';

export interface BasisValues {
    /** Knot span index with u_span <= t < u_{span+1}. */
    span: number;
    /** The k + 1 possibly non-zero values N_{i,k}(t), i = span - k .. span. */
    values: number[];
}

/**
 * The k + 1 non-zero basis values at `t` (stable triangular scheme). `n` follows from the knot count.
 * Throws a RangeError for an invalid vector or a parameter outside the domain.
 */
export function basisValues(u: readonly number[], k: number, t: number): BasisValues {
    const n = u.length - k - 2;
    assertValidKnotVector(u, k, n);
    const span = findSpan(u, k, n, t);
    const values = new Array<number>(k + 1).fill(0);
    const left = new Array<number>(k + 1).fill(0);
    const right = new Array<number>(k + 1).fill(0);
    values[0] = 1;
    for (let j = 1; j <= k; j++) {
        left[j] = t - u[span + 1 - j];
        right[j] = u[span + j] - t;
        let saved = 0;
        for (let r = 0; r < j; r++) {
            // right[r + 1] + left[j - r] = u[span + r + 1] - u[span + r + 1 - j] >= u[span + 1] - u[span] > 0
            const temp = values[r] / (right[r + 1] + left[j - r]);
            values[r] = saved + right[r + 1] * temp;
            saved = left[j - r] * temp;
        }
        values[j] = saved;
    }
    return {span, values};
}

/**
 * All n + 1 basis functions N_{0,k}..N_{n,k} at `t` by the literal Cox-de Boor recursion with 0/0 := 0
 * (used for plotting; independent of `basisValues`).
 */
export function basisAll(u: readonly number[], k: number, t: number): number[] {
    const n = u.length - k - 2;
    assertValidKnotVector(u, k, n);
    const span = findSpan(u, k, n, t);
    const atRightEnd = t === u[n + 1];
    let level = new Array<number>(u.length - 1);
    for (let i = 0; i < level.length; i++) {
        level[i] = atRightEnd ? (i === span ? 1 : 0) : (u[i] <= t && t < u[i + 1] ? 1 : 0);
    }
    for (let j = 1; j <= k; j++) {
        const next = new Array<number>(level.length - 1);
        for (let i = 0; i < next.length; i++) {
            const leftDenominator = u[i + j] - u[i];
            const rightDenominator = u[i + j + 1] - u[i + 1];
            const leftTerm = leftDenominator === 0 ? 0 : (t - u[i]) / leftDenominator * level[i];
            const rightTerm = rightDenominator === 0 ? 0 : (u[i + j + 1] - t) / rightDenominator * level[i + 1];
            next[i] = leftTerm + rightTerm;
        }
        level = next;
    }
    return level;
}
