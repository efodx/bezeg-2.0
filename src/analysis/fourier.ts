/**
 * Fourier coefficient kernel (Fourier series family, task 01; ADR 0034 sections 1 and 2).
 *
 * Conventions on [-pi, pi]: a_k = (1/pi) int f cos(kx), b_k = (1/pi) int f sin(kx) (so a_0/2 is the mean),
 * c_k = (1/(2 pi)) int f exp(-ikx) = (a_k - i b_k)/2 for k > 0, c_{-k} = conj(c_k), c_0 = a_0/2.
 * Partial sum S_N(x) = a_0/2 + sum_{k=1..N} (a_k cos kx + b_k sin kx), evaluated by direct O(N) summation.
 *
 * Pure mathematics: no React, JSXGraph or localization. Complex values are plain {re, im} pairs
 * (structurally the Complex of complex.ts, without its grid restrictions).
 */
import {gaussLegendre} from '../bezeg/impl/kernels/arc-length';

export const FOURIER_DEFAULT_NODES = 16;
export const FOURIER_MAX_ORDER = 5000;

export type FourierErrorReason =
    | 'breakpoints-count'
    | 'breakpoints-not-finite'
    | 'breakpoints-not-increasing'
    | 'breakpoints-range'
    | 'values-length'
    | 'values-not-finite'
    | 'nodes'
    | 'order';

export class FourierError extends Error {
    readonly reason: FourierErrorReason;

    constructor(reason: FourierErrorReason, message: string) {
        super(message);
        this.name = 'FourierError';
        this.reason = reason;
    }
}

export interface FourierComplex {
    re: number;
    im: number;
}

export type FourierCheck = { ok: true } | { ok: false; reason: FourierErrorReason };

/** Breakpoints need at least two finite values in strictly increasing order. */
export function validateBreakpoints(breakpoints: readonly number[]): FourierCheck {
    if (breakpoints.length < 2) {
        return {ok: false, reason: 'breakpoints-count'};
    }
    if (!breakpoints.every(Number.isFinite)) {
        return {ok: false, reason: 'breakpoints-not-finite'};
    }
    for (let i = 1; i < breakpoints.length; i++) {
        if (!(breakpoints[i] > breakpoints[i - 1])) {
            return {ok: false, reason: 'breakpoints-not-increasing'};
        }
    }
    return {ok: true};
}

/**
 * Integral of f over [breakpoints[0], breakpoints[last]], one Gauss-Legendre rule per piece.
 * There is deliberately no form without breakpoints: callers name every jump and corner.
 */
export function integratePiecewise(
    f: (x: number) => number,
    breakpoints: readonly number[],
    nodes: number = FOURIER_DEFAULT_NODES,
): number {
    const check = validateBreakpoints(breakpoints);
    if (!check.ok) {
        throw new FourierError(check.reason, `Invalid breakpoints: ${check.reason}.`);
    }
    if (!Number.isInteger(nodes) || nodes < 1 || nodes > 64) {
        throw new FourierError('nodes', 'Gauss-Legendre node count must be an integer in [1, 64].');
    }
    const rule = gaussLegendre(nodes);
    let total = 0;
    for (let i = 0; i + 1 < breakpoints.length; i++) {
        const lo = breakpoints[i];
        const hi = breakpoints[i + 1];
        const mid = (lo + hi) / 2;
        const half = (hi - lo) / 2;
        let piece = 0;
        for (let j = 0; j < rule.nodes.length; j++) {
            const y = f(mid + half * rule.nodes[j]);
            if (!Number.isFinite(y)) {
                throw new FourierError('values-not-finite', 'The integrand returned a non-finite value.');
            }
            piece += rule.weights[j] * y;
        }
        total += piece * half;
    }
    return total;
}

/** A function on [-pi, pi] with the breakpoints (jumps and corners) at which it must be split. */
export interface FourierFunction {
    kind: 'function';
    f: (x: number) => number;
    breakpoints: readonly number[];
}

/**
 * Piecewise-linear shape (ADR 0034 section 2). breakpoints[0] = -pi, the last is pi; at breakpoint i the value
 * is left[i] approaching from the left and right[i] from the right. Piece i runs from (breakpoints[i], right[i])
 * to (breakpoints[i+1], left[i+1]). left[0] and right[last] describe the seam and affect no integral.
 */
export interface PiecewiseLinearShape {
    kind: 'piecewise-linear';
    breakpoints: readonly number[];
    left: readonly number[];
    right: readonly number[];
}

export type FourierSource = FourierFunction | PiecewiseLinearShape;

const PI = Math.PI;
const RANGE_TOLERANCE = 1e-12;

function checkRange(breakpoints: readonly number[]): FourierCheck {
    const check = validateBreakpoints(breakpoints);
    if (!check.ok) {
        return check;
    }
    if (
        Math.abs(breakpoints[0] + PI) > RANGE_TOLERANCE ||
        Math.abs(breakpoints[breakpoints.length - 1] - PI) > RANGE_TOLERANCE
    ) {
        return {ok: false, reason: 'breakpoints-range'};
    }
    return {ok: true};
}

/** Validates a piecewise-linear shape: breakpoints from -pi to pi, matching finite value lists. */
export function validatePiecewiseLinear(shape: PiecewiseLinearShape): FourierCheck {
    const range = checkRange(shape.breakpoints);
    if (!range.ok) {
        return range;
    }
    const n = shape.breakpoints.length;
    if (shape.left.length !== n || shape.right.length !== n) {
        return {ok: false, reason: 'values-length'};
    }
    if (!shape.left.every(Number.isFinite) || !shape.right.every(Number.isFinite)) {
        return {ok: false, reason: 'values-not-finite'};
    }
    return {ok: true};
}

function assertSource(source: FourierSource): void {
    const check = source.kind === 'piecewise-linear' ? validatePiecewiseLinear(source) : checkRange(source.breakpoints);
    if (!check.ok) {
        throw new FourierError(check.reason, `Invalid Fourier source: ${check.reason}.`);
    }
}

/** Closed-form int_p^q (alpha + beta x) cos(kx) dx, or the sine analogue, for k >= 0. */
function linearTrigIntegral(
    alpha: number,
    beta: number,
    p: number,
    q: number,
    k: number,
    kind: 'cos' | 'sin',
): number {
    if (k === 0) {
        return kind === 'cos' ? alpha * (q - p) + (beta * (q * q - p * p)) / 2 : 0;
    }
    const anti = (x: number): number =>
        kind === 'cos'
            ? ((alpha + beta * x) * Math.sin(k * x)) / k + (beta * Math.cos(k * x)) / (k * k)
            : (-(alpha + beta * x) * Math.cos(k * x)) / k + (beta * Math.sin(k * x)) / (k * k);
    return anti(q) - anti(p);
}

const MAX_PANEL_WIDTH = PI / 2;

/**
 * Adds interior panel boundaries so that no panel is wider than pi/2 or one period of the k-th harmonic.
 * The caller's breakpoints stay in the list, so every jump and corner is still a panel boundary; the extra
 * boundaries only keep the 16-node rule accurate for large k and for smooth functions with nearby poles.
 */
function refineBreakpoints(breakpoints: readonly number[], k: number): number[] {
    const maxWidth = k > 0 ? Math.min(MAX_PANEL_WIDTH, (2 * PI) / k) : MAX_PANEL_WIDTH;
    const out: number[] = [breakpoints[0]];
    for (let i = 0; i + 1 < breakpoints.length; i++) {
        const lo = breakpoints[i];
        const hi = breakpoints[i + 1];
        const panels = Math.max(1, Math.ceil((hi - lo) / maxWidth));
        for (let j = 1; j < panels; j++) {
            out.push(lo + ((hi - lo) * j) / panels);
        }
        out.push(hi);
    }
    return out;
}

/** Raw integral of f * cos(kx) (or sin) over [-pi, pi]; closed form for piecewise-linear shapes. */
function trigIntegral(source: FourierSource, k: number, kind: 'cos' | 'sin'): number {
    if (source.kind === 'function') {
        const trig = kind === 'cos' ? Math.cos : Math.sin;
        return integratePiecewise((x) => source.f(x) * trig(k * x), refineBreakpoints(source.breakpoints, k));
    }
    let total = 0;
    for (let i = 0; i + 1 < source.breakpoints.length; i++) {
        const p = source.breakpoints[i];
        const q = source.breakpoints[i + 1];
        const beta = (source.left[i + 1] - source.right[i]) / (q - p);
        const alpha = source.right[i] - beta * p;
        total += linearTrigIntegral(alpha, beta, p, q, k, kind);
    }
    return total;
}

export interface RealCoefficients {
    /** a[k], k = 0..K; a[0] is a_0 (the constant term of the series is a_0/2). */
    a: number[];
    /** b[k], k = 0..K; b[0] = 0. */
    b: number[];
}

function checkOrder(n: number, max: number): void {
    if (!Number.isInteger(n) || n < 0 || n > max) {
        throw new FourierError('order', `Order must be an integer in [0, ${max}], got ${n}.`);
    }
}

/** Real coefficients a_k, b_k for k <= K. */
export function realCoefficients(source: FourierSource, K: number): RealCoefficients {
    checkOrder(K, FOURIER_MAX_ORDER);
    assertSource(source);
    const a: number[] = [];
    const b: number[] = [];
    for (let k = 0; k <= K; k++) {
        a.push(trigIntegral(source, k, 'cos') / PI);
        b.push(k === 0 ? 0 : trigIntegral(source, k, 'sin') / PI);
    }
    return {a, b};
}

/** Complex coefficients c_k for |k| <= N, returned at index k + N. */
export function complexCoefficients(source: FourierSource, N: number): FourierComplex[] {
    const {a, b} = realCoefficients(source, N);
    const out: FourierComplex[] = [];
    for (let k = -N; k <= N; k++) {
        if (k === 0) {
            out.push({re: a[0] / 2, im: 0});
        } else {
            const m = Math.abs(k);
            out.push({re: a[m] / 2, im: (k > 0 ? -b[m] : b[m]) / 2});
        }
    }
    return out;
}

/** S_N(x) by direct summation of the first N harmonics. */
export function partialSum(coefficients: RealCoefficients, N: number, x: number): number {
    checkOrder(N, coefficients.a.length - 1);
    let s = coefficients.a[0] / 2;
    for (let k = 1; k <= N; k++) {
        s += coefficients.a[k] * Math.cos(k * x) + coefficients.b[k] * Math.sin(k * x);
    }
    return s;
}

/** Mean square (1/pi) int f^2 over [-pi, pi]: exact for piecewise-linear shapes, quadrature otherwise. */
export function meanSquare(source: FourierSource): number {
    assertSource(source);
    if (source.kind === 'function') {
        return integratePiecewise((x) => source.f(x) ** 2, refineBreakpoints(source.breakpoints, 0)) / PI;
    }
    let total = 0;
    for (let i = 0; i + 1 < source.breakpoints.length; i++) {
        const width = source.breakpoints[i + 1] - source.breakpoints[i];
        const u = source.right[i];
        const v = source.left[i + 1];
        total += (width * (u * u + u * v + v * v)) / 3;
    }
    return total / PI;
}

/** Parseval sum a_0^2/2 + sum_{k=1..N} (a_k^2 + b_k^2). */
export function parsevalSum(coefficients: RealCoefficients, N: number): number {
    checkOrder(N, coefficients.a.length - 1);
    let s = (coefficients.a[0] * coefficients.a[0]) / 2;
    for (let k = 1; k <= N; k++) {
        s += coefficients.a[k] ** 2 + coefficients.b[k] ** 2;
    }
    return s;
}
