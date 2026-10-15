/**
 * Accumulated integral A(x) = integral from a to x of f(t) dt of a catalog function, its tangent and the signed-area
 * pieces behind it (accumulation and fundamental theorem demonstration). A(x) is evaluated exactly as F(x) - F(a) from
 * the catalog antiderivative, so for x < a the orientation A(x) = -(integral from x to a of f) follows from the formula.
 * The value is signed: it is never the unsigned geometric area. Pure mathematics: no React, JSXGraph or localization
 * imports.
 */
import {CatalogFunction} from './functions';
import {NonVerticalLine} from './derivative';

/** The lower bound a and the point x may each move in [BOUND_MIN, BOUND_MAX]; 2*pi (about 6.28) stays inside. */
export const ACCUMULATION_BOUND_MIN = -7;
export const ACCUMULATION_BOUND_MAX = 7;
export const ACCUMULATION_BOUND_STEP = 0.01;

/** True for a finite number in [-7, 7]; usable for both a and x. */
export const isAccumulationBound = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= ACCUMULATION_BOUND_MIN && value <= ACCUMULATION_BOUND_MAX;

function assertFinite(name: string, value: number): void {
    if (!Number.isFinite(value)) throw new RangeError(`The ${name} must be a finite number.`);
}

/** The signed accumulation A(x) = F(x) - F(a). Throws for a non-finite a or x. Negative integrand values decrease A. */
export function accumulation(fn: CatalogFunction, a: number, x: number): number {
    assertFinite('lower bound a', a);
    assertFinite('point x', x);
    return fn.antiderivative(x) - fn.antiderivative(a);
}

/** The tangent to A at x: slope A'(x) = f(x) (f is continuous) through (x, A(x)). */
export function accumulationTangent(fn: CatalogFunction, a: number, x: number): NonVerticalLine {
    const slope = fn.value(x);
    return {slope, intercept: accumulation(fn, a, x) - slope * x};
}

/** One stretch between a and x on which f does not change sign. */
export interface AccumulationPiece {
    /** from < to, so pieces are listed left to right whichever of a and x is larger. */
    readonly from: number;
    readonly to: number;
    /** The side of the t-axis the graph of f lies on over this stretch. */
    readonly sign: 'positive' | 'negative';
    /** The signed integral of f from `from` to `to`: positive above the axis, negative below it. */
    readonly integral: number;
    /** The piece's share of A(x): `integral` when x > a, -`integral` when x < a (orientation of integral a to x). */
    readonly contribution: number;
}

/** Interior zeros of f in (lo, hi) where f changes sign: k*pi for sin; none for x^2 and e^x (they never go negative). */
function signChangePoints(fn: CatalogFunction, lo: number, hi: number): number[] {
    if (fn.id !== 'sin') return [];
    const points: number[] = [];
    for (let k = Math.floor(lo / Math.PI) + 1; k * Math.PI < hi; k++) {
        const zero = k * Math.PI;
        if (zero > lo) points.push(zero);
    }
    return points;
}

/**
 * The stretches between a and x split at the sign changes of f, left to right; empty when a = x. The contributions
 * add up to A(x), the positive and negative `integral` values to the signed area (not the unsigned geometric area).
 */
export function accumulationPieces(fn: CatalogFunction, a: number, x: number): AccumulationPiece[] {
    assertFinite('lower bound a', a);
    assertFinite('point x', x);
    if (a === x) return [];
    const lo = Math.min(a, x);
    const hi = Math.max(a, x);
    const orientation = x > a ? 1 : -1;
    const cuts = [lo, ...signChangePoints(fn, lo, hi), hi];
    const pieces: AccumulationPiece[] = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
        const from = cuts[i];
        const to = cuts[i + 1];
        const integral = fn.antiderivative(to) - fn.antiderivative(from);
        pieces.push({
            from,
            to,
            sign: fn.value((from + to) / 2) >= 0 ? 'positive' : 'negative',
            integral,
            contribution: orientation * integral,
        });
    }
    return pieces;
}
