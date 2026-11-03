import {
    cdf, convolve, DEFAULT_HEIGHT_COUNT, DEFAULT_STEP, kolmogorovDistance, moments, N_MAX, nodeX, normalize,
    piecewiseLinearBase, standardize,
} from './convolution';
import type {ConvolutionStatus, GridDensity} from './convolution';
import {normalCdf, normalPdf} from './distributions';

/*
 * The model of lesson P3 (the central limit theorem without randomness, spec probability-statistics-lessons.md): a base density
 * on [0, 1] given by five piecewise-linear heights (normalized by the kernel), the number of summands n and the optional CDF view.
 * This module owns validity (a `CltIssue` is data, never text) and the numbers the graph draws and reads out. The mathematics
 * is the kernel `convolution.ts` (ADR 0031); nothing here touches React, JSXGraph or localization.
 *
 * Limits (documented): exactly CLT_HEIGHT_COUNT heights, each finite and in 0..CLT_HEIGHT_MAX. A negative height typed or
 * dragged is clamped to 0 by `setCltHeight` (spec acceptance 5); a stored (imported) model must already hold 0..max, so import
 * refuses a negative height instead of repairing it. An edit that leaves every height 0 is refused (no mass). A height above the
 * maximum is refused, not clamped (P2 has no comparable bound; the shape is normalized, so only ratios matter and 10 leaves
 * room for a 1:1000 contrast at the 0.01 drag step). n is an integer in 1..N_MAX; anything else is refused, never clamped.
 */

export const CLT_N_MAX = N_MAX;
export const CLT_HEIGHT_COUNT = DEFAULT_HEIGHT_COUNT;
/** Largest single height of the base shape (the shape is normalized, so only ratios matter). */
export const CLT_HEIGHT_MAX = 10;

export interface CltModel {
    /** Base density shape at x = 0, 1/4, 1/2, 3/4, 1 (relative; the kernel normalizes). */
    readonly heights: readonly number[];
    /** Number of independent copies summed, an integer in 1..CLT_N_MAX. */
    readonly n: number;
    /** Show the cumulative functions instead of the densities; off by default. */
    readonly cdf: boolean;
}

export const DEFAULT_CLT_MODEL: CltModel = {heights: [1, 1, 1, 1, 1], n: 1, cdf: false};

export const CLT_EXAMPLE_IDS = ['uniform', 'skewed'] as const;
export type CltExampleId = typeof CLT_EXAMPLE_IDS[number];
export const isCltExampleId = (value: unknown): value is CltExampleId =>
    typeof value === 'string' && (CLT_EXAMPLE_IDS as readonly string[]).includes(value);

/** U(0, 1) and the right triangle f(x) = 2(1 - x) (heights 2, 3/2, 1, 1/2, 0 are exactly that line). Both start at n = 1. */
export const CLT_EXAMPLES: Readonly<Record<CltExampleId, CltModel>> = {
    uniform: DEFAULT_CLT_MODEL,
    skewed: {heights: [2, 1.5, 1, 0.5, 0], n: 1, cdf: false},
};

const sameHeights = (a: readonly number[], b: readonly number[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);

/** The example whose heights the model has (n and the view flag do not matter), or undefined (a custom shape). */
export function cltExampleOf(model: CltModel): CltExampleId | undefined {
    return CLT_EXAMPLE_IDS.find(id => sameHeights(CLT_EXAMPLES[id].heights, model.heights));
}

export type CltIssue =
    /** Not exactly `count` entries. */
    | { readonly kind: 'heights'; readonly count: number }
    /** A height that is not a finite number in 0..max (an edit clamps negatives first; only non-finite or too large reach this). */
    | { readonly kind: 'height'; readonly max: number }
    /** An edit index outside 0..count-1. */
    | { readonly kind: 'index'; readonly count: number }
    /** Every height would be 0: the shape has no mass. */
    | { readonly kind: 'zero' }
    | { readonly kind: 'n'; readonly max: number }
    | { readonly kind: 'flag'; readonly field: 'cdf' }
    | { readonly kind: 'example'; readonly allowed: readonly string[] }
    /** The kernel failed on the view (only from `cltView`). */
    | { readonly kind: 'status'; readonly status: ConvolutionStatus };

export type CltCheck =
    | { readonly ok: true; readonly model: CltModel }
    | { readonly ok: false; readonly issue: CltIssue | undefined };

export type CltEdit =
    | { readonly ok: true; readonly model: CltModel }
    | { readonly ok: false; readonly issue: CltIssue };

const isN = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= CLT_N_MAX;
const isHeight = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= CLT_HEIGHT_MAX;

const nIssue = (): CltIssue => ({kind: 'n', max: CLT_N_MAX});
const heightsIssue = (): CltIssue => ({kind: 'heights', count: CLT_HEIGHT_COUNT});
const heightIssue = (): CltIssue => ({kind: 'height', max: CLT_HEIGHT_MAX});

/**
 * The validity rule of a stored model, checked in the order heights, n, cdf. A non-object gives `issue: undefined` (the generic
 * message). Unknown properties are dropped; nothing is clamped or rounded; the heights are copied.
 */
export function checkCltModel(data: unknown): CltCheck {
    const reject = (issue: CltIssue | undefined): CltCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {heights, n, cdf: showCdf} = data as Record<string, unknown>;
    if (!Array.isArray(heights) || heights.length !== CLT_HEIGHT_COUNT) return reject(heightsIssue());
    if (!heights.every(isHeight)) return reject(heightIssue());
    if (!heights.some(y => y > 0)) return reject({kind: 'zero'});
    if (!isN(n)) return reject(nIssue());
    if (typeof showCdf !== 'boolean') return reject({kind: 'flag', field: 'cdf'});
    return {ok: true, model: {heights: [...heights], n, cdf: showCdf}};
}

export function parseCltModel(data: unknown): CltModel | undefined {
    const check = checkCltModel(data);
    return check.ok ? check.model : undefined;
}

/**
 * Sets one height. A negative number is clamped to 0; a non-number, NaN, infinity or a value above CLT_HEIGHT_MAX is refused; an
 * edit that leaves every height 0 is refused with `zero`. Changing a height changes the shape, so the caller must treat it as
 * a new base (pause playback; the n-fold cache is keyed by heights and so starts a fresh history by itself).
 */
export function setCltHeight(model: CltModel, index: unknown, value: unknown): CltEdit {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= model.heights.length) {
        return {ok: false, issue: {kind: 'index', count: model.heights.length}};
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value > CLT_HEIGHT_MAX) return {ok: false, issue: heightIssue()};
    const y = Math.max(0, value);
    const heights = model.heights.map((v, i) => (i === index ? y : v));
    if (!heights.some(v => v > 0)) return {ok: false, issue: {kind: 'zero'}};
    return {ok: true, model: y === model.heights[index] ? model : {...model, heights}};
}

/** Sets n: an integer in 1..CLT_N_MAX; a fraction or a larger number is refused, never clamped. */
export function setCltN(model: CltModel, value: unknown): CltEdit {
    if (!isN(value)) return {ok: false, issue: nIssue()};
    return {ok: true, model: value === model.n ? model : {...model, n: value}};
}

export function setCltCdf(model: CltModel, value: unknown): CltEdit {
    if (typeof value !== 'boolean') return {ok: false, issue: {kind: 'flag', field: 'cdf'}};
    return {ok: true, model: value === model.cdf ? model : {...model, cdf: value}};
}

/** Chooses a named example: its heights and n = 1 (the view flag is kept); anything that is not an example id is refused. */
export function chooseCltExample(model: CltModel, id: unknown): CltEdit {
    if (!isCltExampleId(id)) return {ok: false, issue: {kind: 'example', allowed: CLT_EXAMPLE_IDS}};
    const next = CLT_EXAMPLES[id];
    if (sameHeights(next.heights, model.heights) && model.n === next.n) return {ok: true, model};
    return {ok: true, model: {heights: [...next.heights], n: next.n, cdf: model.cdf}};
}

// ---- History cache ----------------------------------------------------------------------------------------------------------

/*
 * The unstandardized n-fold densities of one base shape, built incrementally: folds[k] is the density of the sum of k + 1 copies,
 * so asking for n after n - 1 costs one convolution (the same `convolve(previous, base)` steps `nFold` makes, hence identical
 * values), asking for a smaller n costs none. Entries are keyed by the heights, so editing a height starts a fresh history; the
 * memo keeps the CACHE_SHAPES most recently used shapes (each holds at most 30 grids of under 3000 numbers).
 */
interface History {
    readonly base: GridDensity;
    readonly baseResidual: number;
    readonly folds: GridDensity[];
    /** worst[k]: the residual of largest magnitude over the steps up to k + 1 copies (0 for one copy), as `nFold` reports. */
    readonly worst: number[];
}

const CACHE_SHAPES = 4;
const histories = new Map<string, History>();
let convolutions = 0;

/** Number of kernel convolutions the cache has performed since the last reset (for tests and performance reading). */
export const cltConvolutionCount = (): number => convolutions;

/** Empties the history cache and zeroes the convolution counter. */
export function resetCltCache(): void {
    histories.clear();
    convolutions = 0;
}

export type CltFoldResult =
    | { readonly ok: true; readonly base: GridDensity; readonly baseResidual: number; readonly density: GridDensity; readonly massResidual: number }
    | { readonly ok: false; readonly status: ConvolutionStatus };

function historyOf(heights: readonly number[]): History | { readonly status: ConvolutionStatus } {
    const key = heights.join(',');
    const found = histories.get(key);
    if (found) {
        histories.delete(key); // most recently used goes last
        histories.set(key, found);
        return found;
    }
    const sampled = piecewiseLinearBase(heights, DEFAULT_STEP);
    if (!sampled.ok) return {status: sampled.status};
    const start = normalize(sampled.density); // nFold normalizes its base once more; do the same so the values agree
    if (!start.ok) return {status: start.status};
    const created: History = {base: start.density, baseResidual: sampled.massResidual, folds: [start.density], worst: [0]};
    histories.set(key, created);
    if (histories.size > CACHE_SHAPES) histories.delete(histories.keys().next().value as string);
    return created;
}

/** The unstandardized density of the sum of n copies of the shape, from the history cache (see above). */
export function cltFold(heights: readonly number[], n: number): CltFoldResult {
    if (!isN(n)) return {ok: false, status: 'n-out-of-range'};
    const history = historyOf(heights);
    if (!('folds' in history)) return {ok: false, status: history.status};
    while (history.folds.length < n) {
        const next = convolve(history.folds[history.folds.length - 1], history.base);
        convolutions++;
        if (!next.ok) return {ok: false, status: next.status};
        const previousWorst = history.worst[history.worst.length - 1];
        history.folds.push(next.density);
        history.worst.push(Math.abs(next.massResidual) > Math.abs(previousWorst) ? next.massResidual : previousWorst);
    }
    return {ok: true, base: history.base, baseResidual: history.baseResidual, density: history.folds[n - 1], massResidual: history.worst[n - 1]};
}

// ---- Mathematics ------------------------------------------------------------------------------------------------------------

/** The standardized comparison window, shared by the normal curve and the fit view. */
export const CLT_WINDOW: readonly [number, number] = [-6, 6];
/** Grid step of the standard normal comparison curve. */
export const CLT_NORMAL_STEP = 0.02;

export interface CltCurve {
    readonly x: number[];
    readonly y: number[];
}

export interface CltView {
    /** Exact mean and variance of the base shape ({@link shapeMoments}). */
    readonly mean: number;
    readonly variance: number;
    /** n times the base mean and variance: the law of the sum. */
    readonly sumMean: number;
    readonly sumVariance: number;
    /** Mean and variance measured on the n-fold grid (they agree with the two above to about 1e-3, spec acceptance 2). */
    readonly foldMean: number;
    readonly foldVariance: number;
    /** The standardized n-fold curve: its density, or its CDF when the model asks for the CDF view. */
    readonly curve: CltCurve;
    /** The standard normal density, or CDF in the CDF view, on CLT_WINDOW (same kind as `curve`). */
    readonly normal: CltCurve;
    /** sup |F_n - Phi| of the standardized n-fold law, for this base shape and n only (no rate). */
    readonly kolmogorov: number;
    /** Signed mass residual of the worst convolution step (0 at n = 1) and of sampling the base; both before renormalizing. */
    readonly massResidual: number;
    readonly baseMassResidual: number;
}

export type CltViewResult =
    | { readonly ok: true; readonly view: CltView }
    | { readonly ok: false; readonly issue: CltIssue };

const statusIssue = (status: ConvolutionStatus): { readonly ok: false; readonly issue: CltIssue } => ({ok: false, issue: {kind: 'status', status}});

const curveOf = (d: GridDensity): CltCurve => ({
    x: d.values.map((_, i) => nodeX(d, i)),
    y: [...d.values],
});

function normalCurve(showCdf: boolean): CltCurve {
    const count = Math.round((CLT_WINDOW[1] - CLT_WINDOW[0]) / CLT_NORMAL_STEP);
    const x = Array.from({length: count + 1}, (_, i) => CLT_WINDOW[0] + i * CLT_NORMAL_STEP);
    return {x, y: x.map(t => (showCdf ? normalCdf(t) : normalPdf(t)))};
}

/**
 * Exact mean and variance of the normalized piecewise-linear shape through `heights` (at x = j/(k-1) on [0, 1], negatives
 * clamped as in the kernel). On a segment [a, b] with end values ga, gb: the integral of g is (ga + gb)(b - a)/2, of x g is
 * (b - a)(ga(2a + b) + gb(a + 2b))/6 and of x^2 g is (b - a)(ga(3a^2 + 2ab + b^2) + gb(a^2 + 2ab + 3b^2))/12. The readouts use
 * these rather than the grid moments, whose trapezoid error at a jump (the uniform shape's ends) shows in the fourth decimal.
 */
export function shapeMoments(heights: readonly number[]): { readonly mean: number; readonly variance: number } | undefined {
    const k = heights.length;
    if (k < 2) return undefined;
    const g = heights.map(y => Math.max(0, y));
    let m0 = 0;
    let m1 = 0;
    let m2 = 0;
    for (let j = 0; j + 1 < k; j++) {
        const a = j / (k - 1);
        const b = (j + 1) / (k - 1);
        const d = b - a;
        m0 += d * (g[j] + g[j + 1]) / 2;
        m1 += d * (g[j] * (2 * a + b) + g[j + 1] * (a + 2 * b)) / 6;
        m2 += d * (g[j] * (3 * a * a + 2 * a * b + b * b) + g[j + 1] * (a * a + 2 * a * b + 3 * b * b)) / 12;
    }
    if (!(m0 > 0)) return undefined;
    const mean = m1 / m0;
    return {mean, variance: m2 / m0 - mean * mean};
}

export function cltView(model: CltModel): CltViewResult {
    const fold = cltFold(model.heights, model.n);
    if (!fold.ok) return statusIssue(fold.status);
    const baseMoments = shapeMoments(model.heights) ?? moments(fold.base);
    const foldMoments = moments(fold.density);
    const standardized = standardize(fold.density);
    if (!standardized.ok) return statusIssue(standardized.status);
    const distance = kolmogorovDistance(standardized.density);
    if (!distance.ok) return statusIssue(distance.status);
    const shown = model.cdf ? cdf(standardized.density) : standardized.density;
    return {
        ok: true,
        view: {
            mean: baseMoments.mean,
            variance: baseMoments.variance,
            sumMean: model.n * baseMoments.mean,
            sumVariance: model.n * baseMoments.variance,
            foldMean: foldMoments.mean,
            foldVariance: foldMoments.variance,
            curve: curveOf(shown),
            normal: normalCurve(model.cdf),
            kolmogorov: distance.distance,
            massResidual: fold.massResidual,
            baseMassResidual: fold.baseResidual,
        },
    };
}

/** Curve mass above this always lies inside the fit window (the standard normal has 2e-9 outside +-6). */
export const CLT_FIT_MASS_MIN = 1e-6;

/**
 * The fixed view (left, top, right, bottom) of the standardized plot: x in CLT_WINDOW = [-6, 6], wide enough for the standard
 * normal (outside it 2e-9 of mass) and the n = 1 skewed density (support [-1.41, 2.83]); the standardized n-fold laws of the
 * examples keep under 1e-6 of mass outside it for n = 1..30 (tested). It does not move with n, so stepping n reads as one
 * curve changing. The top is 0.6, or 1.15 times the n = 1 peak when a custom shape is taller (so it still does not depend on n); in the CDF view 1.2.
 */
export function fitCltView(model: CltModel): [number, number, number, number] {
    if (model.cdf) return [CLT_WINDOW[0], 1.2, CLT_WINDOW[1], -0.12];
    const result = cltView({...model, n: 1, cdf: false});
    const peak = result.ok ? Math.max(...result.view.curve.y) : 0;
    const top = Math.max(0.6, 1.15 * peak);
    return [CLT_WINDOW[0], top, CLT_WINDOW[1], -0.1 * top];
}
