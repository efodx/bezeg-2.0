/**
 * Closed loop and epicycle chain kernel (Fourier series family, task 02; ADR 0034 section 4).
 *
 * A closed loop is a list of m >= 2 Bezier spans of degree 1 (two points) or 3 (four points), evaluated by
 * de Casteljau, whose first end point equals the last. The loop is the periodic map z(t), t in [0, 2 pi).
 * Parametrizations: `equal` gives every span parameter length 2 pi / m; `chord` gives span lengths proportional
 * to the chord (distance between the span's end points), scaled to 2 pi. If any chord is zero (so a span would
 * get zero length), `chord` falls back to `equal` and reports `fellBack`.
 *
 * Coefficients c_k = (1/(2 pi)) int_0^{2 pi} z(t) exp(-ikt) dt, integrated with fourier.ts quadrature split at
 * the span ends (corners in general), each span then refined by `refineBreakpoints` for high |k|.
 * Moving the start of the loop, z(t + tau), multiplies c_k by exp(ik tau).
 *
 * Epicycle chain order: decreasing |c_k|, ties (equal within relative 1e-12) by k ascending, so -k comes before +k.
 * The constant c_0 is the chain's centre. Pure mathematics: no React, JSXGraph or localization.
 */
import {FourierComplex, integratePiecewise, refineBreakpoints} from './fourier';

export const EPICYCLE_MAX_N = 50;
const TWO_PI = 2 * Math.PI;
const TIE_TOLERANCE = 1e-12;

export interface LoopPoint {
    x: number;
    y: number;
}

/** A span of 2 points (straight) or 4 points (cubic Bezier). */
export type LoopSpan = readonly LoopPoint[];

export interface ClosedLoop {
    spans: readonly LoopSpan[];
}

export type Parametrization = 'equal' | 'chord';

export type LoopErrorReason = 'spans-count' | 'span-degree' | 'not-finite' | 'not-closed';

export type LoopCheck = {ok: true} | {ok: false; reason: LoopErrorReason};

export class ClosedLoopError extends Error {
    readonly reason: LoopErrorReason | 'order' | 'count';

    constructor(reason: LoopErrorReason | 'order' | 'count', message: string) {
        super(message);
        this.name = 'ClosedLoopError';
        this.reason = reason;
    }
}

/** At least two spans of degree 1 or 3, finite coordinates, first end point equal to the last. */
export function validateLoop(loop: ClosedLoop): LoopCheck {
    if (loop.spans.length < 2) {
        return {ok: false, reason: 'spans-count'};
    }
    if (!loop.spans.every((s) => s.length === 2 || s.length === 4)) {
        return {ok: false, reason: 'span-degree'};
    }
    if (!loop.spans.every((s) => s.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)))) {
        return {ok: false, reason: 'not-finite'};
    }
    const first = loop.spans[0][0];
    const lastSpan = loop.spans[loop.spans.length - 1];
    const last = lastSpan[lastSpan.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
        return {ok: false, reason: 'not-closed'};
    }
    return {ok: true};
}

function assertLoop(loop: ClosedLoop): void {
    const check = validateLoop(loop);
    if (!check.ok) {
        throw new ClosedLoopError(check.reason, `Invalid closed loop: ${check.reason}.`);
    }
}

export interface LoopParametrization {
    /** m + 1 increasing values from 0 to 2 pi. */
    spanEnds: number[];
    requested: Parametrization;
    /** True when `chord` was requested but the chords did not allow it and `equal` was used. */
    fellBack: boolean;
}

export function loopParametrization(loop: ClosedLoop, kind: Parametrization = 'equal'): LoopParametrization {
    assertLoop(loop);
    const m = loop.spans.length;
    const equal = Array.from({length: m + 1}, (_, j) => (TWO_PI * j) / m);
    if (kind === 'equal') {
        return {spanEnds: equal, requested: kind, fellBack: false};
    }
    const chords = loop.spans.map((s) => Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y));
    const total = chords.reduce((a, b) => a + b, 0);
    if (!(total > 0) || chords.some((c) => !(c > 0))) {
        return {spanEnds: equal, requested: kind, fellBack: true};
    }
    const ends = [0];
    let acc = 0;
    for (let j = 0; j < m; j++) {
        acc += chords[j];
        ends.push(j === m - 1 ? TWO_PI : (TWO_PI * acc) / total);
    }
    return {spanEnds: ends, requested: kind, fellBack: false};
}

/** de Casteljau evaluation of one span at local parameter u in [0, 1]. */
function deCasteljau(span: LoopSpan, u: number): FourierComplex {
    let xs = span.map((p) => p.x);
    let ys = span.map((p) => p.y);
    while (xs.length > 1) {
        const nx: number[] = [];
        const ny: number[] = [];
        for (let i = 0; i + 1 < xs.length; i++) {
            nx.push((1 - u) * xs[i] + u * xs[i + 1]);
            ny.push((1 - u) * ys[i] + u * ys[i + 1]);
        }
        xs = nx;
        ys = ny;
    }
    return {re: xs[0], im: ys[0]};
}

/** z(t) for any real t (taken modulo 2 pi). */
export function evaluateLoop(loop: ClosedLoop, spanEnds: readonly number[], t: number): FourierComplex {
    let s = t % TWO_PI;
    if (s < 0) {
        s += TWO_PI;
    }
    let j = spanEnds.length - 2;
    for (let i = 0; i + 1 < spanEnds.length; i++) {
        if (s < spanEnds[i + 1]) {
            j = i;
            break;
        }
    }
    const lo = spanEnds[j];
    const hi = spanEnds[j + 1];
    return deCasteljau(loop.spans[j], Math.min(1, Math.max(0, (s - lo) / (hi - lo))));
}

export interface LoopCoefficients {
    N: number;
    /** c[k + N] is the coefficient of exp(ikt), k = -N..N. */
    c: FourierComplex[];
}

export function coefficientAt(coefficients: LoopCoefficients, k: number): FourierComplex {
    return coefficients.c[k + coefficients.N];
}

/**
 * Coefficients of any 2 pi-periodic z given on [0, 2 pi] with its corner parameters `spanEnds`
 * (must start at 0, end at 2 pi, strictly increasing; every corner has to be listed).
 */
export function coefficientsFromFunction(
    z: (t: number) => FourierComplex,
    spanEnds: readonly number[],
    N: number,
): LoopCoefficients {
    if (!Number.isInteger(N) || N < 0 || N > EPICYCLE_MAX_N) {
        throw new ClosedLoopError('order', `N must be an integer in [0, ${EPICYCLE_MAX_N}].`);
    }
    const c: FourierComplex[] = [];
    for (let k = -N; k <= N; k++) {
        const breakpoints = refineBreakpoints(spanEnds, Math.abs(k));
        const re = integratePiecewise((t) => {
            const v = z(t);
            return v.re * Math.cos(k * t) + v.im * Math.sin(k * t);
        }, breakpoints);
        const im = integratePiecewise((t) => {
            const v = z(t);
            return v.im * Math.cos(k * t) - v.re * Math.sin(k * t);
        }, breakpoints);
        c.push({re: re / TWO_PI, im: im / TWO_PI});
    }
    return {N, c};
}

export function loopCoefficients(
    loop: ClosedLoop,
    N: number,
    parametrization: Parametrization = 'equal',
): LoopCoefficients & {fellBack: boolean} {
    const p = loopParametrization(loop, parametrization);
    const result = coefficientsFromFunction((t) => evaluateLoop(loop, p.spanEnds, t), p.spanEnds, N);
    return {...result, fellBack: p.fellBack};
}

export interface EpicycleChain {
    /** Frequencies in drawing order (k = 0 excluded, it is the centre). */
    order: number[];
    /** Arm end points: c_0, then after each arm in `order`; length 2N + 1. */
    points: FourierComplex[];
    /** The partial sum S_N(t), the last point. */
    sum: FourierComplex;
}

/** Non-zero frequencies |k| <= N by decreasing |c_k|, ties by k ascending. */
export function epicycleOrder(coefficients: LoopCoefficients, N: number): number[] {
    const n = Math.min(N, coefficients.N);
    const ks: number[] = [];
    for (let k = -n; k <= n; k++) {
        if (k !== 0) {
            ks.push(k);
        }
    }
    const mag = (k: number) => Math.hypot(coefficientAt(coefficients, k).re, coefficientAt(coefficients, k).im);
    return ks.sort((a, b) => {
        const ma = mag(a);
        const mb = mag(b);
        if (Math.abs(ma - mb) > TIE_TOLERANCE * Math.max(ma, mb)) {
            return mb - ma;
        }
        return a - b;
    });
}

export function epicycleChain(coefficients: LoopCoefficients, N: number, t: number): EpicycleChain {
    const order = epicycleOrder(coefficients, N);
    let cur = {...coefficientAt(coefficients, 0)};
    const points = [cur];
    for (const k of order) {
        const ck = coefficientAt(coefficients, k);
        const co = Math.cos(k * t);
        const si = Math.sin(k * t);
        cur = {re: cur.re + ck.re * co - ck.im * si, im: cur.im + ck.re * si + ck.im * co};
        points.push(cur);
    }
    return {order, points, sum: cur};
}

/** S_N at `count` samples t_j = 2 pi j / count, j = 0..count-1. */
export function traceSum(coefficients: LoopCoefficients, N: number, count: number): FourierComplex[] {
    if (!Number.isInteger(count) || count < 1) {
        throw new ClosedLoopError('count', 'The sample count must be a positive integer.');
    }
    return Array.from({length: count}, (_, j) => epicycleChain(coefficients, N, (TWO_PI * j) / count).sum);
}
