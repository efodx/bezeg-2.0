import {normalCdf, normalPdf} from './distributions';

/**
 * Pure grid-density kernel for the P3 demonstration, "the central limit theorem without randomness"
 * (docs/specs/probability-statistics-lessons.md, ADR 0031): a density sampled on a uniform grid, convolved directly
 * with trapezoid weights, renormalized after every step, standardized and compared with the standard normal law.
 * No randomness, no React, no JSXGraph, no localization.
 *
 * Guarantees (tolerances, not exactness): the grid error is O(h) at kinks and jumps of the density and O(h^2)
 * elsewhere; each convolution step loses a little mass, which is restored by {@link normalize} and reported as the
 * signed residual `mass - 1` before renormalizing. Results hold for the stated density, n and step only.
 * Invalid input returns a status instead of throwing.
 */

/** A function sampled at x0 + i*h, i = 0..values.length-1; zero outside the grid. Densities integrate (trapezoid) to 1. */
export interface GridDensity {
    readonly x0: number;
    readonly h: number;
    readonly values: readonly number[];
}

/** Largest number of summands the kernel accepts. */
export const N_MAX = 30;
/** Default grid step on [0, 1]. */
export const DEFAULT_STEP = 0.01;
/** Default number of draggable heights of the user-shaped base density. */
export const DEFAULT_HEIGHT_COUNT = 5;
/** Largest number of heights of the user-shaped base density. */
export const HEIGHT_COUNT_MAX = 32;
/** Smallest and largest number of cells the base density on [0, 1] may have (steps 1/2000 and 1/10). */
export const BASE_CELLS_MIN = 10;
export const BASE_CELLS_MAX = 2000;

export type ConvolutionStatus =
    | 'n-out-of-range'
    | 'zero-mass'
    | 'zero-variance'
    | 'invalid-grid'
    | 'grid-mismatch'
    | 'invalid-step'
    | 'invalid-heights';

export type Failure = {readonly ok: false; readonly status: ConvolutionStatus};
/** A density together with the signed mass residual `mass - 1` it had before the last renormalization. */
export type DensityResult = {readonly ok: true; readonly density: GridDensity; readonly massResidual: number} | Failure;

const fail = (status: ConvolutionStatus): Failure => ({ok: false, status});

/** True when the grid has at least two finite nodes, a positive finite step and finite values. */
export function isValidGrid(d: GridDensity): boolean {
    if (!Number.isFinite(d.x0) || !Number.isFinite(d.h) || d.h <= 0 || d.values.length < 2) return false;
    for (const v of d.values) if (!Number.isFinite(v)) return false;
    return true;
}

/** Trapezoid mass h * (sum of values - half of the two end values). */
export function mass(d: GridDensity): number {
    const v = d.values;
    let sum = 0;
    for (let i = 0; i < v.length; i++) sum += v[i];
    return d.h * (sum - 0.5 * (v[0] + v[v.length - 1]));
}

/** x-coordinate of node i. */
export const nodeX = (d: GridDensity, i: number): number => d.x0 + i * d.h;

/**
 * Scales the density to trapezoid mass 1 and returns the signed residual `mass - 1` it had before. A grid with
 * non-finite values, a negative value, or no positive mass is rejected with a status.
 */
export function normalize(d: GridDensity): DensityResult {
    if (!isValidGrid(d)) return fail('invalid-grid');
    let max = 0;
    for (const v of d.values) {
        if (v < 0) return fail('invalid-grid');
        if (v > max) max = v;
    }
    const m = mass(d);
    if (!(max > 0) || !(m > 0) || !Number.isFinite(m)) return fail('zero-mass');
    const values = d.values.map(v => v / m);
    return {ok: true, density: {x0: d.x0, h: d.h, values}, massResidual: m - 1};
}

const sameStep = (a: GridDensity, b: GridDensity): boolean => Math.abs(a.h - b.h) <= 1e-9 * Math.max(a.h, b.h);

/**
 * Density of the sum of two independent variables: (f*g)(x0f + x0g + k h) is the trapezoid rule for the integral of
 * f(t) g(x - t) over the overlap of the two supports (half weight at both ends of the overlap, so the density is 0 at
 * the two extreme nodes). The result has `f.values.length + g.values.length - 1` nodes and is renormalized;
 * `massResidual` is the mass lost (negative) or gained before that.
 */
export function convolve(f: GridDensity, g: GridDensity): DensityResult {
    if (!isValidGrid(f) || !isValidGrid(g)) return fail('invalid-grid');
    if (!sameStep(f, g)) return fail('grid-mismatch');
    const fv = f.values;
    const gv = g.values;
    const mf = fv.length;
    const mg = gv.length;
    const out = new Array<number>(mf + mg - 1);
    for (let k = 0; k < out.length; k++) {
        const lo = Math.max(0, k - (mg - 1));
        const hi = Math.min(k, mf - 1);
        let sum = 0;
        for (let j = lo; j <= hi; j++) sum += fv[j] * gv[k - j];
        out[k] = f.h * (sum - 0.5 * (fv[lo] * gv[k - lo] + fv[hi] * gv[k - hi]));
    }
    return normalize({x0: f.x0 + g.x0, h: f.h, values: out});
}

export type NFoldResult =
    | {readonly ok: true; readonly density: GridDensity; readonly n: number; readonly massResidual: number}
    | Failure;

/**
 * Density of the sum of n independent copies of `base`, by n-1 successive convolutions with `base`. `n` must be an
 * integer in 1..{@link N_MAX}, otherwise the status is `n-out-of-range`. `massResidual` is the residual of largest
 * magnitude over the steps (0 for n = 1).
 */
export function nFold(base: GridDensity, n: number): NFoldResult {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > N_MAX) return fail('n-out-of-range');
    const start = normalize(base);
    if (!start.ok) return start;
    let current = start.density;
    let worst = 0;
    for (let step = 2; step <= n; step++) {
        const next = convolve(current, start.density);
        if (!next.ok) return next;
        current = next.density;
        if (Math.abs(next.massResidual) > Math.abs(worst)) worst = next.massResidual;
    }
    return {ok: true, density: current, n, massResidual: worst};
}

export interface Moments {
    readonly mass: number;
    readonly mean: number;
    readonly variance: number;
    /** Third standardized moment; 0 when the variance is 0. */
    readonly skewness: number;
}

/** Trapezoid moments of the density divided by its mass: mean, variance (central), skewness. */
export function moments(d: GridDensity): Moments {
    const v = d.values;
    const last = v.length - 1;
    const total = mass(d);
    const weight = (i: number): number => (i === 0 || i === last ? 0.5 : 1) * d.h * v[i];
    let first = 0;
    for (let i = 0; i <= last; i++) first += weight(i) * (i * d.h);
    const offset = first / total;
    let m2 = 0;
    let m3 = 0;
    for (let i = 0; i <= last; i++) {
        const u = i * d.h - offset;
        m2 += weight(i) * u * u;
        m3 += weight(i) * u * u * u;
    }
    const variance = m2 / total;
    const sd = Math.sqrt(variance);
    return {mass: total, mean: d.x0 + offset, variance, skewness: sd > 0 ? m3 / total / (sd * sd * sd) : 0};
}

/**
 * The density of (X - mean) / sd, where mean and sd are the grid moments of `d`: the grid is shifted and scaled
 * (x0 and h divided by sd, values multiplied by sd), so the mass is unchanged. A grid of variance 0 is rejected.
 */
export function standardize(d: GridDensity): DensityResult {
    if (!isValidGrid(d)) return fail('invalid-grid');
    if (!(mass(d) > 0)) return fail('zero-mass');
    const m = moments(d);
    const sd = Math.sqrt(m.variance);
    if (!(sd > 0) || !Number.isFinite(sd)) return fail('zero-variance');
    return {
        ok: true,
        density: {x0: (d.x0 - m.mean) / sd, h: d.h / sd, values: d.values.map(v => v * sd)},
        massResidual: m.mass - 1,
    };
}

/** Cumulative trapezoid integral at the nodes: F(x0) = 0, F(x_i) = F(x_{i-1}) + h (f_{i-1} + f_i) / 2. Returned in a grid of the same shape. */
export function cdf(d: GridDensity): GridDensity {
    const out = new Array<number>(d.values.length);
    out[0] = 0;
    for (let i = 1; i < out.length; i++) out[i] = out[i - 1] + 0.5 * d.h * (d.values[i - 1] + d.values[i]);
    return {x0: d.x0, h: d.h, values: out};
}

/**
 * sup |F(x) - Phi(x)| over all real x, where F is the cumulative function of the piecewise linear density that joins
 * the grid values (zero outside the grid) and Phi the standard normal law. Callers standardize first. Between nodes
 * F is a quadratic and F - Phi has derivative f - phi, so inside a cell the supremum is at a node or at the root of
 * f - phi, found by bisection; nodes alone could miss it by an amount of order h. The two tails add |F(end) - 1| and
 * |Phi(x0)| (the same value as at the first node). An invalid grid returns a status.
 */
export function kolmogorovDistance(d: GridDensity): {readonly ok: true; readonly distance: number} | Failure {
    if (!isValidGrid(d)) return fail('invalid-grid');
    const F = cdf(d).values;
    const v = d.values;
    const h = d.h;
    const last = v.length - 1;
    const gap = (i: number, t: number): number => {
        const slope = (v[i + 1] - v[i]) / h;
        return F[i] + v[i] * t + 0.5 * slope * t * t - normalCdf(d.x0 + i * h + t);
    };
    const drift = (i: number, t: number): number => v[i] + ((v[i + 1] - v[i]) / h) * t - normalPdf(d.x0 + i * h + t);
    let best = Math.abs(F[last] - 1);
    for (let i = 0; i <= last; i++) {
        best = Math.max(best, Math.abs(F[i] - normalCdf(d.x0 + i * h)));
        if (i === last) break;
        let a = 0;
        let b = h;
        const da = drift(i, a);
        if (da * drift(i, b) >= 0) continue;
        for (let it = 0; it < 60; it++) {
            const mid = 0.5 * (a + b);
            if (drift(i, mid) * da > 0) a = mid;
            else b = mid;
        }
        best = Math.max(best, Math.abs(gap(i, 0.5 * (a + b))));
    }
    return {ok: true, distance: best};
}

const cellsFor = (h: number): number | null => {
    if (typeof h !== 'number' || !Number.isFinite(h) || h <= 0) return null;
    const cells = Math.round(1 / h);
    return cells >= BASE_CELLS_MIN && cells <= BASE_CELLS_MAX ? cells : null;
};

/** Samples a nonnegative function on [0, 1] with step 1/round(1/h) and normalizes it. */
function sampleBase(h: number, f: (x: number) => number): DensityResult {
    const cells = cellsFor(h);
    if (cells === null) return fail('invalid-step');
    const values = Array.from({length: cells + 1}, (_, i) => Math.max(0, f(i / cells)));
    return normalize({x0: 0, h: 1 / cells, values});
}

/** The uniform density on [0, 1] (mean 1/2, variance 1/12). The step is rounded to 1/round(1/h). */
export const uniformBase = (h: number = DEFAULT_STEP): DensityResult => sampleBase(h, () => 1);

/** The right-triangle density 2(1 - x) on [0, 1] (mean 1/3, variance 1/18, skewness 0.56569). */
export const triangleBase = (h: number = DEFAULT_STEP): DensityResult => sampleBase(h, x => 2 * (1 - x));

/** The default user-shaped heights: `count` equal heights, i.e. the uniform shape. */
export const defaultHeights = (count: number = DEFAULT_HEIGHT_COUNT): number[] => Array.from({length: count}, () => 1);

/**
 * The density that joins `heights` (k >= 2, at x = j/(k-1) on [0, 1]) with straight segments. Negative heights are
 * clamped to 0 (non-finite ones are rejected: `invalid-heights`); a shape with no positive height has no mass and
 * is rejected with `zero-mass` by {@link normalize}; the result is normalized.
 */
export function piecewiseLinearBase(heights: readonly number[] = defaultHeights(), h: number = DEFAULT_STEP): DensityResult {
    const k = heights.length;
    if (k < 2 || k > HEIGHT_COUNT_MAX || heights.some(y => typeof y !== 'number' || !Number.isFinite(y))) return fail('invalid-heights');
    const clamped = heights.map(y => Math.max(0, y));
    return sampleBase(h, x => {
        const s = x * (k - 1);
        const j = Math.min(k - 2, Math.floor(s));
        return clamped[j] + (clamped[j + 1] - clamped[j]) * (s - j);
    });
}
