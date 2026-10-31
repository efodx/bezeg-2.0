/**
 * de Boor's algorithm on coordinate rows (each control point is a number[] of equal length: 2D, 3D, ...).
 * The triangle keeps every alpha and the knot pair it came from, so a view shows the numbers the kernel used.
 */
import {assertValidKnotVector, findSpan} from './knot-vector';

export interface DeBoorEntry {
    /** Index j of the control point this entry sits over (level r holds j = span - k + r .. span). */
    index: number;
    point: number[];
    /** Blend ratio (t - u_j) / (u_{j+k+1-r} - u_j); null on level 0, where the entries are control points. */
    alpha: number | null;
    /** The knots [u_j, u_{j+k+1-r}] the ratio was formed from; null on level 0. */
    knots: [number, number] | null;
}

export interface DeBoorTriangle {
    span: number;
    /** levels[r] has k + 1 - r entries; levels[0] are the k + 1 active control points, levels[k][0] the curve point. */
    levels: DeBoorEntry[][];
}

function assertRows(P: readonly (readonly number[])[], count: number): void {
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

/** The de Boor triangle at `t` for degree `k`; throws a RangeError for invalid input or t outside the domain. */
export function deBoorTriangle(u: readonly number[], k: number, P: readonly (readonly number[])[], t: number): DeBoorTriangle {
    const n = u.length - k - 2;
    assertValidKnotVector(u, k, n);
    assertRows(P, n + 1);
    const span = findSpan(u, k, n, t);
    let current: DeBoorEntry[] = [];
    for (let j = span - k; j <= span; j++) {
        current.push({index: j, point: [...P[j]], alpha: null, knots: null});
    }
    const levels: DeBoorEntry[][] = [current];
    for (let r = 1; r <= k; r++) {
        const next: DeBoorEntry[] = [];
        for (let j = span - k + r; j <= span; j++) {
            // The denominator is at least u_{span+1} - u_span > 0.
            const lowKnot = u[j];
            const highKnot = u[j + k + 1 - r];
            const alpha = (t - lowKnot) / (highKnot - lowKnot);
            const before = current[j - 1 - (span - k + r - 1)].point;
            const after = current[j - (span - k + r - 1)].point;
            next.push({
                index: j,
                point: before.map((value, d) => (1 - alpha) * value + alpha * after[d]),
                alpha,
                knots: [lowKnot, highKnot],
            });
        }
        levels.push(next);
        current = next;
    }
    return {span, levels};
}

/** The curve point at `t`: the apex of the de Boor triangle. */
export function evaluate(u: readonly number[], k: number, P: readonly (readonly number[])[], t: number): number[] {
    const triangle = deBoorTriangle(u, k, P, t);
    return triangle.levels[k][0].point;
}
