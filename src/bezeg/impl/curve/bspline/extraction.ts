/**
 * Bezier extraction: every distinct knot of the domain [u_k, u_{n+1}] (ends included) is inserted up to
 * multiplicity k, after which each non-empty knot span is an ordinary Bezier piece of its k + 1 active points.
 * Multiplicity k at both ends of a span is what makes its active points Bezier points; for a clamped vector
 * (end multiplicity k + 1) the ends need no insertion. Existing breaks (multiplicity k + 1) are left alone.
 */
import {insertToMultiplicity, assertPointRows} from './insertion';
import {assertValidKnotVector, multiplicity} from './knot-vector';

export interface BezierPiece {
    /** The parameter interval [start, end] of the piece in the raw knot parametrization. */
    start: number;
    end: number;
    /** The k + 1 Bezier control points of this piece. */
    points: number[][];
    /** Index of the piece's first point in the refined polygon {@link BezierExtraction.points}. */
    firstIndex: number;
}

export interface BezierExtraction {
    /** Refined knot vector (every distinct domain knot has multiplicity >= k). */
    knots: number[];
    /** Refined control polygon (the curve is unchanged). */
    points: number[][];
    pieces: BezierPiece[];
    /**
     * Row operator: points[i] = sum_j operator[i][j] * P[j]. Each row has non-negative entries summing to 1.
     * Obtained by running the same insertions on the identity matrix.
     */
    operator: number[][];
}

/** Distinct knot values of the domain, in increasing order (both ends included). */
function distinctDomainKnots(u: readonly number[], k: number, n: number): number[] {
    const values: number[] = [];
    for (let i = k; i <= n + 1; i++) {
        if (values.length === 0 || u[i] !== values[values.length - 1]) {
            values.push(u[i]);
        }
    }
    return values;
}

function refine(u: readonly number[], k: number, rows: readonly (readonly number[])[], knotsToRefine: readonly number[]) {
    let knots: number[] = [...u];
    let points: number[][] = rows.map(row => [...row]);
    for (const x of knotsToRefine) {
        if (k >= 1 && multiplicity(knots, x) < k) {
            ({knots, points} = insertToMultiplicity(knots, k, points, x, k));
        }
    }
    return {knots, points};
}

/**
 * The Bezier pieces of the B-spline with knots `u`, degree `k` and control points `P` (rows of equal length),
 * with the refined polygon and the row operator old -> new points. Throws a RangeError for an invalid vector or rows.
 * Piece count = distinct interior knots + 1. Degree 0 returns one constant piece per non-empty span.
 */
export function bezierPieces(u: readonly number[], k: number, P: readonly (readonly number[])[]): BezierExtraction {
    const n = u.length - k - 2;
    assertValidKnotVector(u, k, n);
    assertPointRows(P, n + 1);
    const targets = distinctDomainKnots(u, k, n);
    const {knots, points} = refine(u, k, P, targets);
    const identity = P.map((_, i) => P.map((__, j) => (i === j ? 1 : 0)));
    const operator = refine(u, k, identity, targets).points;
    const refinedN = knots.length - k - 2;
    const pieces: BezierPiece[] = [];
    for (let span = k; span <= refinedN; span++) {
        if (knots[span] < knots[span + 1]) {
            pieces.push({
                start: knots[span],
                end: knots[span + 1],
                points: points.slice(span - k, span + 1).map(row => [...row]),
                firstIndex: span - k,
            });
        }
    }
    return {knots, points, pieces, operator};
}
