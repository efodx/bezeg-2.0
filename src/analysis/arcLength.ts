/**
 * Polyline length and arc length of the graph of sin x (arc-length demonstration).
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * The polyline joins the points (x_i, sin x_i) at n equal x-subintervals of the segment between a and b; its length is
 * the sum of the chords sqrt(dx^2 + dy^2). The arc length is the integral of sqrt(1 + f'(x)^2) from a to b, computed by
 * adaptive Simpson to 1e-9 with the exact derivative of the function catalog. Lengths are never negative: they do not
 * depend on the order of the endpoints (swapping a and b gives the same value), so |b - a| is used. This differs from
 * the oriented integral of the definite-integral demonstration on purpose; a length is a distance.
 */
import {catalogFunction} from './functions';

const sine = catalogFunction('sin');

/** The curve of the demonstration. */
export const arcValue = (x: number): number => sine.value(x);

/** The number of polyline segments is an integer in [N_MIN, N_MAX]. */
export const N_MIN = 1;
export const N_MAX = 100;
export const N_STEP = 1;

/**
 * Both endpoints lie in [BOUND_MIN, BOUND_MAX], which contains the default [0, pi] and a full period 2*pi on either
 * side. Dragged and typed endpoints are rounded to BOUND_STEP by the graph.
 */
export const BOUND_MIN = -7;
export const BOUND_MAX = 7;
export const BOUND_STEP = 0.01;

export const isBound = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= BOUND_MIN && value <= BOUND_MAX;

export const isSegmentCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= N_MIN && value <= N_MAX;

/**
 * The n + 1 polyline vertices (x_i, sin x_i) with x_i = a + i (b - a) / n, from the point at a to the point at b. The
 * last vertex is exactly b. For a > b the vertices run from right to left.
 */
export function polylineVertices(a: number, b: number, n: number): [number, number][] {
    if (!isSegmentCount(n)) throw new RangeError(`The number of segments must be an integer from ${N_MIN} to ${N_MAX}.`);
    const vertices: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
        const x = i === n ? b : a + i * (b - a) / n;
        vertices.push([x, arcValue(x)]);
    }
    return vertices;
}

/** The length of the polyline with n segments: the sum of the chord lengths sqrt(dx^2 + dy^2); 0 for a = b. */
export function polylineLength(a: number, b: number, n: number): number {
    const vertices = polylineVertices(a, b, n);
    let length = 0;
    for (let i = 1; i < vertices.length; i++) {
        length += Math.hypot(vertices[i][0] - vertices[i - 1][0], vertices[i][1] - vertices[i - 1][1]);
    }
    return length;
}

/** The integrand sqrt(1 + f'(x)^2) of the arc length, with the exact derivative of the catalog. */
export const arcLengthIntegrand = (x: number): number => Math.sqrt(1 + sine.derivative(x) ** 2);

const MAX_DEPTH = 40;

function simpson(fa: number, fm: number, fb: number, a: number, b: number): number {
    return (b - a) / 6 * (fa + 4 * fm + fb);
}

function adaptive(f: (x: number) => number, a: number, b: number, fa: number, fm: number, fb: number, whole: number, tolerance: number, depth: number): number {
    const m = (a + b) / 2;
    const flm = f((a + m) / 2);
    const frm = f((m + b) / 2);
    const left = simpson(fa, flm, fm, a, m);
    const right = simpson(fm, frm, fb, m, b);
    const delta = left + right - whole;
    if (depth <= 0 || Math.abs(delta) <= 15 * tolerance) return left + right + delta / 15;
    return adaptive(f, a, m, fa, flm, fm, left, tolerance / 2, depth - 1)
        + adaptive(f, m, b, fm, frm, fb, right, tolerance / 2, depth - 1);
}

/** Adaptive Simpson quadrature of f over [a, b] (a <= b) with the given absolute tolerance. */
export function adaptiveSimpson(f: (x: number) => number, a: number, b: number, tolerance = 1e-9): number {
    if (a === b) return 0;
    const fa = f(a);
    const fb = f(b);
    const fm = f((a + b) / 2);
    return adaptive(f, a, b, fa, fm, fb, simpson(fa, fm, fb, a, b), tolerance, MAX_DEPTH);
}

/** The arc length of the graph between the two endpoints, in either order: the integral of sqrt(1 + f'^2) over [min, max] to 1e-9. */
export function arcLength(a: number, b: number): number {
    return adaptiveSimpson(arcLengthIntegrand, Math.min(a, b), Math.max(a, b), 1e-9);
}

/** The arc length minus the polyline length: never negative for a polyline inscribed in the graph (up to rounding). */
export const lengthDifference = (a: number, b: number, n: number): number => arcLength(a, b) - polylineLength(a, b, n);
