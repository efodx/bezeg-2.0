import {FourierExampleId, gibbsLimit, gibbsPeakValue, gibbsPeakX} from './fourierExamples';
import {cleanNumber} from './numbers';

/*
 * This module owns the rules of the Fourier series model (partial sums S_N of a square wave or a sawtooth wave, lessons F1 and F3):
 * what is valid, how an accepted value is normalized, and which rule a rejected value broke (a `FourierSeriesIssue`: data, never
 * text). The Preset parser, the Preset collection's diagnosis and the graph's setters all ask it; they only choose the words
 * (`graphs/functions/fourierSeriesMessages`). It also holds the mathematics the graph draws, on top of the kernels of
 * `fourier` and `fourierExamples`: S_N, the jump, the Gibbs peak at the closed-form abscissa and the sampling of the curve.
 */

export const FOURIER_SERIES_EXAMPLE_IDS = ['square', 'sawtooth'] as const;
export type FourierSeriesExampleId = Extract<FourierExampleId, typeof FOURIER_SERIES_EXAMPLE_IDS[number]>;
export const isFourierSeriesExampleId = (value: unknown): value is FourierSeriesExampleId =>
    typeof value === 'string' && (FOURIER_SERIES_EXAMPLE_IDS as readonly string[]).includes(value);

/** N is an integer in [1, 1001]: the lessons use N up to 1001 (peak values are checked there). */
export const FOURIER_N_MIN = 1;
export const FOURIER_N_MAX = 1001;
/** The chosen point lies on the grid 0.01 inside [-6.28, 6.28], within the drawn period window [-2 pi, 2 pi]. */
export const FOURIER_X_MIN = -6.28;
export const FOURIER_X_MAX = 6.28;
export const FOURIER_X_STEP = 0.01;
/** The tolerance epsilon of the band f +- epsilon: a multiple of 0.01 in [0.01, 1]. */
export const FOURIER_EPSILON_MIN = 0.01;
export const FOURIER_EPSILON_MAX = 1;
export const FOURIER_EPSILON_STEP = 0.01;

/** The drawn domain, two periods. */
export const FOURIER_DOMAIN: readonly [number, number] = [-2 * Math.PI, 2 * Math.PI];
/** The curve is sampled at this many points per period of its highest harmonic (the specification asks for at least 8). */
export const FOURIER_SAMPLES_PER_PERIOD = 10;

/** The stored description: the example, the order N, the chosen point x and the tolerance epsilon. Everything else is recomputed. */
export interface FourierSeriesModel {
    readonly example: FourierSeriesExampleId;
    readonly n: number;
    readonly x: number;
    readonly epsilon: number;
}

export const DEFAULT_FOURIER_SERIES_MODEL: FourierSeriesModel = {example: 'square', n: 11, x: 0.5, epsilon: 0.1};

/** The rule a rejected value broke. Callers localize it; the range and the examples travel with it. */
export type FourierSeriesIssue =
    | { readonly kind: 'example'; readonly allowed: readonly FourierSeriesExampleId[] }
    | { readonly kind: 'n'; readonly min: number; readonly max: number }
    | { readonly kind: 'x'; readonly min: number; readonly max: number }
    | { readonly kind: 'epsilon'; readonly min: number; readonly max: number };

export type FourierSeriesCheck =
    | { readonly ok: true; readonly model: FourierSeriesModel }
    | { readonly ok: false; readonly issue: FourierSeriesIssue | undefined };

export type FourierSeriesEdit =
    | { readonly ok: true; readonly model: FourierSeriesModel }
    | { readonly ok: false; readonly issue: FourierSeriesIssue };

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const nIssue = (): FourierSeriesIssue => ({kind: 'n', min: FOURIER_N_MIN, max: FOURIER_N_MAX});
const xIssue = (): FourierSeriesIssue => ({kind: 'x', min: FOURIER_X_MIN, max: FOURIER_X_MAX});
const epsilonIssue = (): FourierSeriesIssue => ({kind: 'epsilon', min: FOURIER_EPSILON_MIN, max: FOURIER_EPSILON_MAX});

/** N is a whole number in range. Nothing is rounded: 2.5 and 11.0000001 are refused. */
export const isFourierN = (value: unknown): value is number =>
    isFiniteNumber(value) && Number.isInteger(value) && value >= FOURIER_N_MIN && value <= FOURIER_N_MAX;

/** The value with floating-point noise removed when it lies on the grid (within 1e-9 grid units), else undefined. */
function snapToGrid(value: unknown, step: number): number | undefined {
    if (!isFiniteNumber(value)) return undefined;
    const units = Math.round(value / step);
    return Math.abs(value / step - units) <= 1e-9 ? cleanNumber(units * step) : undefined;
}

const snappedIn = (value: unknown, step: number, min: number, max: number): number | undefined => {
    const snapped = snapToGrid(value, step);
    return snapped !== undefined && snapped >= min && snapped <= max ? snapped : undefined;
};
const snappedX = (value: unknown) => snappedIn(value, FOURIER_X_STEP, FOURIER_X_MIN, FOURIER_X_MAX);
const snappedEpsilon = (value: unknown) => snappedIn(value, FOURIER_EPSILON_STEP, FOURIER_EPSILON_MIN, FOURIER_EPSILON_MAX);

/**
 * The single validity rule of a stored model: a known example, an integer N in [1, 1001], x on the grid 0.01 in [-6.28, 6.28] and
 * epsilon on the grid 0.01 in [0.01, 1]. Rules are checked in the order example, n, x, epsilon; a field of the wrong type or a
 * missing field gives `issue: undefined` (the generic message). Grid values are normalized (noise removed), unknown properties
 * dropped, nothing clamped.
 */
export function checkFourierSeriesModel(data: unknown): FourierSeriesCheck {
    const reject = (issue: FourierSeriesIssue | undefined): FourierSeriesCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, n, x, epsilon} = data as Record<string, unknown>;
    if (!isFourierSeriesExampleId(example)) return reject({kind: 'example', allowed: FOURIER_SERIES_EXAMPLE_IDS});
    if (isFiniteNumber(n) && !isFourierN(n)) return reject(nIssue());
    if (isFiniteNumber(x) && snappedX(x) === undefined) return reject(xIssue());
    if (isFiniteNumber(epsilon) && snappedEpsilon(epsilon) === undefined) return reject(epsilonIssue());
    const gridX = snappedX(x);
    const gridEpsilon = snappedEpsilon(epsilon);
    if (!isFourierN(n) || gridX === undefined || gridEpsilon === undefined) return reject(undefined);
    return {ok: true, model: {example, n, x: gridX, epsilon: gridEpsilon}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model. */
export function parseFourierSeriesModel(data: unknown): FourierSeriesModel | undefined {
    const check = checkFourierSeriesModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example keeps N, the point and epsilon (the sawtooth and the square wave are compared at the same N and x). */
export function chooseFourierSeriesExample(model: FourierSeriesModel, example: unknown): FourierSeriesEdit {
    if (!isFourierSeriesExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: FOURIER_SERIES_EXAMPLE_IDS}};
    return {ok: true, model: example === model.example ? model : {...model, example}};
}

/** The model with a new order N: an integer in [1, 1001], never rounded. The same N returns the same model object. */
export function changeFourierN(model: FourierSeriesModel, value: unknown): FourierSeriesEdit {
    if (!isFourierN(value)) return {ok: false, issue: nIssue()};
    return {ok: true, model: value === model.n ? model : {...model, n: value}};
}

/** The model with a new point x on the grid 0.01 in [-6.28, 6.28]. */
export function moveFourierX(model: FourierSeriesModel, value: unknown): FourierSeriesEdit {
    const x = snappedX(value);
    if (x === undefined) return {ok: false, issue: xIssue()};
    return {ok: true, model: x === model.x ? model : {...model, x}};
}

/** The model with a new tolerance epsilon on the grid 0.01 in [0.01, 1]. */
export function changeFourierEpsilon(model: FourierSeriesModel, value: unknown): FourierSeriesEdit {
    const epsilon = snappedEpsilon(value);
    if (epsilon === undefined) return {ok: false, issue: epsilonIssue()};
    return {ok: true, model: epsilon === model.epsilon ? model : {...model, epsilon}};
}

// ---- Mathematics ------------------------------------------------------------------------------------------------------

const PI = Math.PI;
const TWO_PI = 2 * PI;

/**
 * The order whose sum S_N equals: for the square wave, even N gives S_N = S_(N-1), because the coefficients of the even harmonics
 * are zero. The sawtooth has every harmonic.
 */
export function effectiveOrder(example: FourierSeriesExampleId, n: number): number {
    return example === 'square' && n % 2 === 0 ? n - 1 : n;
}

/**
 * The function f of the periodic extension at x. At a jump (odd multiples of pi for the sawtooth, every multiple of pi and 0 for
 * the square wave) it is the midpoint of the one-sided limits, the value the series converges to there.
 */
export function fourierTarget(example: FourierSeriesExampleId, x: number): number {
    const wrapped = x - TWO_PI * Math.round(x / TWO_PI);
    if (Math.abs(Math.abs(wrapped) - PI) <= 1e-12) return 0;
    return example === 'square' ? Math.sign(wrapped) : wrapped;
}

/** True when x is a jump of the periodic extension (within noise). */
export function isFourierJumpPoint(example: FourierSeriesExampleId, x: number): boolean {
    const wrapped = x - TWO_PI * Math.round(x / TWO_PI);
    if (Math.abs(Math.abs(wrapped) - PI) <= 1e-9) return true;
    return example === 'square' && Math.abs(wrapped) <= 1e-9;
}

/** The recurrence for sin(kx) is restarted from exact sines every this many terms, which keeps the error near 1e-14. */
const RECURRENCE_BLOCK = 32;

/**
 * S_N(x), the partial sum with the harmonics up to N, from the closed-form coefficients of the kernel's examples (the square wave:
 * 4/(pi k) for odd k; the sawtooth: the `b_k` of the kernel). sin(kx) comes from the recurrence sin((k+1)x) = 2 cos x sin(kx) -
 * sin((k-1)x), so one call costs one sin, one cos and O(N) multiplications instead of N sines (a redraw at N = 1001 samples about
 * 40 000 points: 4 pi / (2 pi / (10 N))). It agrees with `squareWavePartialSum` and `partialSum(realCoefficients(...))` to 1e-12 (5e-12 at N = 1001, where the
 * direct sum's own rounding of k x is of that size).
 */
export function fourierPartialSum(example: FourierSeriesExampleId, n: number, x: number): number {
    return example === 'square' ? squareSum(n, x) : sawtoothSum(n, x);
}

/** 1/k, so the inner loops multiply instead of divide. */
const RECIPROCAL = Float64Array.from({length: FOURIER_N_MAX + 2}, (_, k) => (k === 0 ? 0 : 1 / k));

/** (4/pi) * sum over odd k <= n of sin(kx)/k; sin((k+2)x) = 2 cos(2x) sin(kx) - sin((k-2)x) steps over the odd k only. */
function squareSum(n: number, x: number): number {
    const twoCos = 2 * Math.cos(2 * x);
    let previous = -Math.sin(x); // sin(-x)
    let current = Math.sin(x);
    let s = 0;
    for (let k = 1; k <= n; k += 2) {
        s += current * RECIPROCAL[k];
        if (k % RECURRENCE_BLOCK === RECURRENCE_BLOCK - 1) {
            previous = Math.sin(k * x);
            current = Math.sin((k + 2) * x);
        } else {
            const next = twoCos * current - previous;
            previous = current;
            current = next;
        }
    }
    return (4 / PI) * s;
}

/** sum of b_k sin(kx) with b_k = 2 (-1)^(k+1) / k, from the recurrence sin((k+1)x) = 2 cos x sin(kx) - sin((k-1)x) over every k. */
function sawtoothSum(n: number, x: number): number {
    const twoCos = 2 * Math.cos(x);
    let previous = 0;
    let current = Math.sin(x);
    let s = 0;
    let sign = 2;
    for (let k = 1; k <= n; k++) {
        s += sign * RECIPROCAL[k] * current;
        sign = -sign;
        if (k % RECURRENCE_BLOCK === 0) {
            previous = Math.sin(k * x);
            current = Math.sin((k + 1) * x);
        } else {
            const next = twoCos * current - previous;
            previous = current;
            current = next;
        }
    }
    return s;
}

export interface FourierJump {
    readonly x: number;
    readonly left: number;
    readonly right: number;
    readonly midpoint: number;
    readonly size: number;
    /** The larger one-sided limit: the overshoot is measured above it. */
    readonly high: number;
}

/** The jump the display marks: the square wave at 0 (limits -1 and 1), the sawtooth at pi (limits pi and -pi). */
export function fourierJump(example: FourierSeriesExampleId): FourierJump {
    return example === 'square'
        ? {x: 0, left: -1, right: 1, midpoint: 0, size: 2, high: 1}
        : {x: PI, left: PI, right: -PI, midpoint: 0, size: TWO_PI, high: PI};
}

export interface FourierPeak {
    /** The closed-form abscissa pi/(N+1) (N the effective order) measured from the jump: right of it for the square wave, left of it for the sawtooth. */
    readonly x: number;
    readonly value: number;
    readonly distance: number;
    /** (value - high) / size when positive: the overshoot as a fraction of the jump; undefined when the peak does not exceed the upper limit. */
    readonly overshoot: number | undefined;
}

/**
 * The Gibbs peak at the closed-form abscissa, never a sampled maximum. For the square wave it is gibbsPeakX / gibbsPeakValue of the
 * effective order; the sawtooth partial sum near pi is 2 sum sin(kt)/k at t = pi - x, with the same maximiser t = pi/(N+1).
 */
export function fourierGibbsPeak(example: FourierSeriesExampleId, n: number): FourierPeak {
    const order = effectiveOrder(example, n);
    const jump = fourierJump(example);
    const distance = gibbsPeakX(order);
    const x = example === 'square' ? distance : PI - distance;
    const value = example === 'square' ? gibbsPeakValue(order) : fourierPartialSum(example, n, x);
    const raw = (value - jump.high) / jump.size;
    return {x, value, distance, overshoot: raw > 0 ? raw : undefined};
}

/** The limit of the overshoot as N grows, (2 Si(pi) / pi - 1) / 2 of the jump (8.95 %). */
export function fourierLimitOvershoot(): number {
    return (gibbsLimit() - 1) / 2;
}

/** The view [left, top, right, bottom] that follows the peak: about four peak distances wide, the jump and the overshoot in sight. */
export function fourierZoomWindow(example: FourierSeriesExampleId, n: number): [number, number, number, number] {
    const peak = fourierGibbsPeak(example, n);
    const {high, size} = fourierJump(example);
    return [peak.x - 2 * peak.distance, high + 0.25 * size, peak.x + 2 * peak.distance, high - 0.75 * size];
}

export interface FourierPiece {
    readonly x0: number;
    readonly x1: number;
    /** The values at the ends of the piece (one-sided limits at a jump). */
    readonly y0: number;
    readonly y1: number;
}

/** The linear pieces of f on `domain`, split at every jump (the square wave is constant on a piece, the sawtooth has slope 1). */
export function fourierPieces(example: FourierSeriesExampleId, domain: readonly [number, number] = FOURIER_DOMAIN): FourierPiece[] {
    const [from, to] = domain;
    const first = example === 'square' ? 0 : PI;
    const step = example === 'square' ? PI : TWO_PI;
    const jumps: number[] = [];
    for (let k = Math.ceil((from - first) / step); first + k * step < to; k++) {
        if (first + k * step > from + 1e-9) jumps.push(first + k * step);
    }
    jumps.sort((a, b) => a - b);
    const cuts = [from, ...jumps, to];
    const slope = example === 'sawtooth' ? 1 : 0;
    return cuts.slice(0, -1).map((x0, i) => {
        const x1 = cuts[i + 1];
        const mid = (x0 + x1) / 2;
        const level = fourierTarget(example, mid);
        return {x0, x1, y0: level + slope * (x0 - mid), y1: level + slope * (x1 - mid)};
    });
}

/** The largest distance between two sample abscissas the curve may have: 1/FOURIER_SAMPLES_PER_PERIOD of the period of the highest harmonic. */
export function fourierSampleSpacing(example: FourierSeriesExampleId, n: number): number {
    return TWO_PI / (effectiveOrder(example, n) * FOURIER_SAMPLES_PER_PERIOD);
}

export interface FourierSamples {
    readonly x: number[];
    readonly y: number[];
}

/**
 * S_N sampled over `domain`: a uniform grid with at least FOURIER_SAMPLES_PER_PERIOD points per period of the highest harmonic,
 * plus the closed-form peak abscissas (and their mirror images and periodic copies), so the drawn maximum is the Gibbs peak
 * itself rather than a grid value near it.
 */
export function fourierSamples(example: FourierSeriesExampleId, n: number, domain: readonly [number, number] = FOURIER_DOMAIN): FourierSamples {
    const [from, to] = domain;
    const count = Math.ceil((to - from) / fourierSampleSpacing(example, n));
    const xs: number[] = [];
    for (let i = 0; i <= count; i++) xs.push(from + ((to - from) * i) / count);
    const peak = fourierGibbsPeak(example, n).x;
    for (const base of [peak, -peak]) {
        for (let k = Math.ceil((from - base) / TWO_PI); base + k * TWO_PI <= to; k++) xs.push(base + k * TWO_PI);
    }
    xs.sort((a, b) => a - b);
    const x = xs.filter((value, i) => i === 0 || value - xs[i - 1] > 1e-12);
    return {x, y: x.map(value => fourierPartialSum(example, n, value))};
}

/** One term c * sin(kx)/k of S_N with c = sign * prefactor; `sign` is the sign of the coefficient b_k. */
export interface FourierTerm {
    k: number;
    sign: 1 | -1;
}

/** S_N = prefactor * (sum of sign * sin(kx)/k): the square wave has 4/pi and odd k, the sawtooth 2 and every k with sign (-1)^(k+1). */
export interface FourierTermList {
    prefactor: 'four-over-pi' | 'two';
    /** The first nonzero terms, at most `cap`. */
    leading: FourierTerm[];
    /** The last nonzero term of S_N when it is not among `leading` (then the list reads leading, "...", last); otherwise undefined. */
    last?: FourierTerm;
    /** The number of nonzero terms in S_N. */
    count: number;
}

export const FOURIER_TERM_LIST_CAP = 6;

/** The nonzero terms of S_N for the example, in the order of k. Even N of the square wave ends at N - 1. */
export function fourierTermList(example: FourierSeriesExampleId, n: number, cap: number = FOURIER_TERM_LIST_CAP): FourierTermList {
    const square = example === 'square';
    const lastK = effectiveOrder(example, n);
    const termAt = (index: number): FourierTerm => {
        const k = square ? 2 * index + 1 : index + 1;
        return {k, sign: square || k % 2 === 1 ? 1 : -1};
    };
    const count = square ? (lastK + 1) / 2 : lastK;
    const shown = Math.min(count, cap);
    const leading = Array.from({length: shown}, (_, index) => termAt(index));
    return {prefactor: square ? 'four-over-pi' : 'two', leading, last: count > shown ? termAt(count - 1) : undefined, count};
}
