/**
 * Simpson's rule and error-ratio helpers (trapezoid and Simpson lesson).
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * Simpson is deliberately separate from `SUM_METHODS` in riemann.ts: adding a method there would change the stored
 * integral Presets and the Riemann fill data (ADR 0023 section 3). The trapezoid sum is reused from riemann.ts.
 */
import {CatalogFunction} from './functions';
import {isSubintervalCount, N_MAX, riemannSum, subintervalWidth} from './riemann';

/** Simpson pairs subintervals, so n is even and within the Riemann bound 1..N_MAX. */
export const SIMPSON_N_MIN = 2;
export const SIMPSON_N_MAX = N_MAX % 2 === 0 ? N_MAX : N_MAX - 1;
export const SIMPSON_N_STEP = 2;

/** True for an even integer in [SIMPSON_N_MIN, SIMPSON_N_MAX]. Odd values are rejected, never rounded. */
export const isSimpsonCount = (value: unknown): value is number =>
    isSubintervalCount(value) && value >= SIMPSON_N_MIN && value <= SIMPSON_N_MAX && value % 2 === 0;

const assertSimpsonCount = (n: number): void => {
    if (!isSimpsonCount(n)) {
        throw new RangeError(`Simpson's rule needs an even number of subintervals from ${SIMPSON_N_MIN} to ${SIMPSON_N_MAX}.`);
    }
};

/** Only the function values are needed, so a local cubic can be tested without a full catalog entry. */
export type Integrand = Pick<CatalogFunction, 'value'>;

/** (h/3)(f0 + 4f1 + 2f2 + 4f3 + ... + 4f_{n-1} + fn) with h = (b - a)/n; oriented like the Riemann sums. */
export function simpsonRule(fn: Integrand, a: number, b: number, n: number): number {
    assertSimpsonCount(n);
    const h = subintervalWidth(a, b, n);
    let sum = fn.value(a) + fn.value(a + n * h);
    for (let i = 1; i < n; i++) sum += (i % 2 === 1 ? 4 : 2) * fn.value(a + i * h);
    return h / 3 * sum + 0;
}

/** The parabola y = c0 + c1 x + c2 x^2 through the three nodes of one subinterval pair. */
export interface SimpsonParabola {
    readonly x0: number;
    readonly xMid: number;
    readonly x1: number;
    readonly y0: number;
    readonly yMid: number;
    readonly y1: number;
    /** Monomial coefficients, constant term first. */
    readonly coefficients: readonly [number, number, number];
    /** The parabola's value at x. */
    readonly at: (x: number) => number;
}

/** One parabola per pair of subintervals (n / 2 of them), through (x_{2j}, f), (x_{2j+1}, f), (x_{2j+2}, f). */
export function simpsonParabolas(fn: Integrand, a: number, b: number, n: number): SimpsonParabola[] {
    assertSimpsonCount(n);
    const h = subintervalWidth(a, b, n);
    const result: SimpsonParabola[] = [];
    for (let j = 0; j < n / 2; j++) {
        const x0 = a + 2 * j * h;
        const xMid = a + (2 * j + 1) * h;
        const x1 = a + (2 * j + 2) * h;
        const y0 = fn.value(x0);
        const yMid = fn.value(xMid);
        const y1 = fn.value(x1);
        // Through three nodes with t = x - xMid: p(t) = yMid + s1 t + s2 t^2, then expanded in x.
        const s1 = (y1 - y0) / (2 * h);
        const s2 = (y1 - 2 * yMid + y0) / (2 * h * h);
        const c2 = s2;
        const c1 = s1 - 2 * s2 * xMid;
        const c0 = yMid - s1 * xMid + s2 * xMid * xMid;
        result.push({
            x0, xMid, x1, y0, yMid, y1, coefficients: [c0, c1, c2],
            at: x => c0 + c1 * x + c2 * x * x,
        });
    }
    return result;
}

/** The trapezoid sum with n subintervals (any n valid for the Riemann sums), reusing `riemannSum`. */
export const trapezoidRule = (fn: CatalogFunction, a: number, b: number, n: number): number =>
    riemannSum(fn, a, b, n, 'trapezoid');

/** |approximation - exact|. */
export const absoluteError = (approximation: number, exact: number): number => Math.abs(approximation - exact);

/** previousError / error, or null when the error is zero or either value is not finite (no ratio to display). */
export function errorRatio(previousError: number, error: number): number | null {
    if (!Number.isFinite(previousError) || !Number.isFinite(error) || error === 0) return null;
    return previousError / error;
}
