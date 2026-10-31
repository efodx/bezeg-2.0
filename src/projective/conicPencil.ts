/**
 * The exact pencil parameter for dragging a point along a conic (ADR 0033 section 2).
 *
 * A draggable conic point is the second intersection of the conic with the line through a fixed base point Q0 of the
 * conic in an integer direction (p, q) taken from a fixed table. For integer coefficients and rational Q0 that point
 * is rational, so it is exact for every table entry. Pure integer arithmetic.
 */
import {bilinear2, combine, evaluate, type Conic} from './conic';
import {isIdeal, isZero, normalize, type Fraction, type Hom} from './homogeneous';

/** Largest |p| and |q| in the direction table. The final size is set by the drag measurement (ADR 0033 section 2). */
export const DIRECTION_BOUND = 14;

export type Direction = readonly [number, number];

function gcdNum(a: number, b: number): number {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) [a, b] = [b, a % b];
    return a;
}

function buildTable(bound: number): readonly Direction[] {
    const out: [number, number][] = [];
    for (let q = 0; q <= bound; q++) {
        for (let p = -bound; p <= bound; p++) {
            if (q === 0 && p <= 0) continue; // one representative per line: upper half plane, positive x-axis
            if (gcdNum(p, q) === 1) out.push([p, q]);
        }
    }
    // Sort by angle in [0, pi) exactly: a precedes b when the cross product a x b is positive.
    out.sort((a, b) => b[0] * a[1] - a[0] * b[1]);
    return out;
}

/** The fixed table of primitive directions, one per line direction, sorted by angle from the x axis. */
export const DIRECTION_TABLE: readonly Direction[] = buildTable(DIRECTION_BOUND);

/** The number of table entries (preset indices are in [0, DIRECTION_TABLE_SIZE)). */
export const DIRECTION_TABLE_SIZE: number = DIRECTION_TABLE.length;

export type PencilResult =
    /**
     * The second intersection. `ideal` when the direction is asymptotic. `s` is the exact affine parameter along the
     * direction, point = Q0 + s (p, q), present only when Q0 and the point are finite.
     */
    | {readonly status: 'ok'; readonly point: Hom; readonly ideal: boolean; readonly s: Fraction | null}
    /** The direction is tangent at Q0: the second intersection is Q0 itself. */
    | {readonly status: 'tangent'; readonly point: Hom}
    /** The whole line lies on the conic (degenerate conic). */
    | {readonly status: 'contained'}
    | {readonly status: 'not-on-conic'}
    /** Q0 is the ideal point of the direction, so no line is determined. */
    | {readonly status: 'degenerate-direction'};

/** Second intersection of the conic with the line through Q0 in direction (p, q). */
export function secondIntersection(c: Conic, q0: Hom, direction: Direction): PencilResult {
    if (isZero(q0)) throw new RangeError('the zero triple is not a point');
    const [p, q] = direction;
    if (!Number.isSafeInteger(p) || !Number.isSafeInteger(q) || (p === 0 && q === 0)) {
        throw new RangeError(`direction must be a non-zero integer pair, got (${p}, ${q})`);
    }
    if (evaluate(c, q0) !== 0n) return {status: 'not-on-conic'};
    const d: Hom = [BigInt(p), BigInt(q), 0n]; // deliberately not normalized: s is measured in units of (p, q)
    if (isIdeal(q0) && q0[0] * d[1] === q0[1] * d[0]) return {status: 'degenerate-direction'};
    // f(l Q0 + m d) = m (qb l + qc m) since f(Q0) = 0: the second root is (l : m) = (-qc : qb).
    const qb = bilinear2(c, q0, d);
    const qc = evaluate(c, d);
    if (qb === 0n) {
        return qc === 0n ? {status: 'contained'} : {status: 'tangent', point: normalize(q0)};
    }
    const point = combine(-qc, q0, qb, d);
    const ideal = isIdeal(point);
    // point/w = Q0/w0 + s (p, q) with s = -qb / (qc w0); the point is ideal exactly when qc = 0.
    const s: Fraction | null = ideal || isIdeal(q0) ? null : reduce(-qb, qc * q0[2]);
    return {status: 'ok', point, ideal, s};
}

function reduce(num: bigint, den: bigint): Fraction {
    const g = (() => {
        let a = num < 0n ? -num : num;
        let b = den < 0n ? -den : den;
        while (b !== 0n) [a, b] = [b, a % b];
        return a;
    })();
    const sg = den < 0n ? -g : g;
    return {num: num / sg, den: den / sg};
}
