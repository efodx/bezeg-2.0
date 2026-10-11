/**
 * Riemann sums and the exact definite integral of a catalog function (definite-integral demonstration).
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * Everything is oriented: the subinterval width is h = (b - a) / n, which is negative when a > b, so every sum and the
 * exact integral F(b) - F(a) change sign together when the bounds are swapped. The signed value of a subinterval is
 * h * (y0 + y1) / 2, where y0 and y1 are the heights at its two ends: a rectangle has y0 = y1, the trapezoid rule uses
 * f(x0) and f(x1).
 */
import {CatalogFunction} from './functions';

export const SUM_METHODS = ['left', 'right', 'midpoint', 'trapezoid'] as const;
export type SumMethod = typeof SUM_METHODS[number];

export const isSumMethod = (value: unknown): value is SumMethod =>
    typeof value === 'string' && (SUM_METHODS as readonly string[]).includes(value);

/** The number of subintervals is an integer in [N_MIN, N_MAX]. */
export const N_MIN = 1;
export const N_MAX = 150;
export const N_STEP = 1;

/**
 * Both bounds lie in [BOUND_MIN, BOUND_MAX], which contains 2*pi (the lesson integrates sin x over a full period) for
 * every catalog function. Dragged and typed bounds are rounded to BOUND_STEP by the graph.
 */
export const BOUND_MIN = -7;
export const BOUND_MAX = 7;
export const BOUND_STEP = 0.01;

export const isBound = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= BOUND_MIN && value <= BOUND_MAX;

export const isSubintervalCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= N_MIN && value <= N_MAX;

/** The oriented width h = (b - a) / n; negative for a > b, zero for a = b. */
export function subintervalWidth(a: number, b: number, n: number): number {
    if (!isSubintervalCount(n)) throw new RangeError(`The number of subintervals must be an integer from ${N_MIN} to ${N_MAX}.`);
    return (b - a) / n + 0;
}

/** One subinterval from x0 = a + i*h to x1 = a + (i+1)*h (x1 < x0 when a > b) with the heights drawn at its two ends. */
export interface Subinterval {
    readonly x0: number;
    readonly x1: number;
    /** Height at x0 and at x1: equal for the three rectangle rules, f(x0) and f(x1) for the trapezoid rule. */
    readonly y0: number;
    readonly y1: number;
}

/** The n subintervals with the heights the method uses. */
export function subintervals(fn: CatalogFunction, a: number, b: number, n: number, method: SumMethod): Subinterval[] {
    const h = subintervalWidth(a, b, n);
    const result: Subinterval[] = [];
    for (let i = 0; i < n; i++) {
        // x1 of one subinterval is exactly x0 of the next, and the last x1 is exactly b.
        const x0 = a + i * h;
        const x1 = i === n - 1 ? b : a + (i + 1) * h;
        let y0: number;
        let y1: number;
        switch (method) {
            case 'left':
                y0 = y1 = fn.value(x0);
                break;
            case 'right':
                y0 = y1 = fn.value(x1);
                break;
            case 'midpoint':
                y0 = y1 = fn.value(x0 + h / 2);
                break;
            case 'trapezoid':
                y0 = fn.value(x0);
                y1 = fn.value(x1);
                break;
        }
        result.push({x0, x1, y0, y1});
    }
    return result;
}

/** The signed area of one subinterval: oriented width times the mean height. */
export const subintervalArea = (s: Subinterval): number => (s.x1 - s.x0) * (s.y0 + s.y1) / 2;

/** The signed, oriented Riemann sum of f over [a, b] with n subintervals. */
export function riemannSum(fn: CatalogFunction, a: number, b: number, n: number, method: SumMethod): number {
    const h = subintervalWidth(a, b, n);
    let sum = 0;
    for (const s of subintervals(fn, a, b, n, method)) sum += s.y0 + s.y1;
    return h * sum / 2 + 0;
}

/** The exact oriented integral F(b) - F(a) from the catalog antiderivative; exactly 0 for a = b. */
export const exactIntegral = (fn: CatalogFunction, a: number, b: number): number => fn.antiderivative(b) - fn.antiderivative(a) + 0;

/** One polygon of the drawing: the corners in order, and whether it lies below the x-axis. */
export interface FillPolygon {
    readonly points: readonly (readonly [number, number])[];
    readonly negative: boolean;
}

/**
 * The polygons that draw one subinterval: (x0, 0), (x0, y0), (x1, y1), (x1, 0). A trapezoid whose ends have opposite
 * signs is split at its zero crossing into a positive and a negative triangle, so no polygon crosses the axis. Zero
 * width subintervals (a = b) and flat zero-height shapes draw nothing.
 */
export function subintervalPolygons(s: Subinterval): FillPolygon[] {
    if (s.x0 === s.x1) return [];
    const {x0, x1, y0, y1} = s;
    if (y0 === 0 && y1 === 0) return [];
    if ((y0 > 0 && y1 < 0) || (y0 < 0 && y1 > 0)) {
        const xc = x0 + (x1 - x0) * y0 / (y0 - y1);
        return [
            {points: [[x0, 0], [x0, y0], [xc, 0]], negative: y0 < 0},
            {points: [[xc, 0], [x1, y1], [x1, 0]], negative: y1 < 0},
        ];
    }
    return [{points: [[x0, 0], [x0, y0], [x1, y1], [x1, 0]], negative: y0 < 0 || y1 < 0}];
}

export interface FillData {
    readonly positive: { readonly x: number[]; readonly y: number[] };
    readonly negative: { readonly x: number[]; readonly y: number[] };
}

/**
 * The drawing of a sum as two point lists, one per sign, ready to be a single JSXGraph curve each: every polygon is closed
 * by repeating its first corner and separated from the next by NaN, so the object count does not depend on n.
 */
export function fillData(fn: CatalogFunction, a: number, b: number, n: number, method: SumMethod): FillData {
    const positive = {x: [] as number[], y: [] as number[]};
    const negative = {x: [] as number[], y: [] as number[]};
    for (const s of subintervals(fn, a, b, n, method)) {
        for (const polygon of subintervalPolygons(s)) {
            const target = polygon.negative ? negative : positive;
            if (target.x.length > 0) {
                target.x.push(NaN);
                target.y.push(NaN);
            }
            for (const [x, y] of [...polygon.points, polygon.points[0]]) {
                target.x.push(x);
                target.y.push(y);
            }
        }
    }
    return {positive, negative};
}
