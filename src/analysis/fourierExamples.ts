/**
 * Closed Fourier example list (task 01). No formula parser: each example names its function,
 * the breakpoints at which the kernel must split, and closed-form coefficients where one exists.
 */
import {FourierFunction, PiecewiseLinearShape, integratePiecewise} from './fourier';

export const FOURIER_EXAMPLE_IDS = ['square', 'sawtooth', 'abs', 'jump', 'smooth'] as const;
export type FourierExampleId = (typeof FOURIER_EXAMPLE_IDS)[number];

export interface FourierExample {
    id: FourierExampleId;
    source: FourierFunction;
    /** Closed-form a_k (k >= 0; a_0 is twice the mean) and b_k (k >= 1), when known. */
    closedForm?: { a: (k: number) => number; b: (k: number) => number };
    /** Exact piecewise-linear form, when the example is one. */
    shape?: PiecewiseLinearShape;
}

const PI = Math.PI;
const FULL = [-PI, PI] as const;
const R = 2 - Math.sqrt(3);

const square: FourierExample = {
    id: 'square',
    source: {kind: 'function', f: (x) => (x < 0 ? -1 : x > 0 ? 1 : 0), breakpoints: [-PI, 0, PI]},
    closedForm: {a: () => 0, b: (k) => (k % 2 === 1 ? 4 / (PI * k) : 0)},
    shape: {kind: 'piecewise-linear', breakpoints: [-PI, 0, PI], left: [-1, -1, 1], right: [-1, 1, 1]},
};

const sawtooth: FourierExample = {
    id: 'sawtooth',
    source: {kind: 'function', f: (x) => x, breakpoints: FULL},
    closedForm: {a: () => 0, b: (k) => (2 * (k % 2 === 1 ? 1 : -1)) / k},
    shape: {kind: 'piecewise-linear', breakpoints: FULL, left: [-PI, PI], right: [-PI, PI]},
};

const abs: FourierExample = {
    id: 'abs',
    source: {kind: 'function', f: Math.abs, breakpoints: [-PI, 0, PI]},
    closedForm: {
        a: (k) => (k === 0 ? PI : k % 2 === 1 ? -4 / (PI * k * k) : 0),
        b: () => 0,
    },
    shape: {kind: 'piecewise-linear', breakpoints: [-PI, 0, PI], left: [PI, 0, PI], right: [PI, 0, PI]},
};

const jump: FourierExample = {
    id: 'jump',
    source: {kind: 'function', f: (x) => (x < 1 ? -1 : x > 1 ? 1 : 0), breakpoints: [-PI, 1, PI]},
    closedForm: {
        a: (k) => (k === 0 ? -2 / PI : (-2 * Math.sin(k)) / (PI * k)),
        // (1/pi)[-(F(1)-F(-pi)) + (F(pi)-F(1))] with F = -cos(kx)/k
        b: (k) => (2 * Math.cos(k) - 2 * Math.cos(k * PI)) / (PI * k),
    },
    shape: {kind: 'piecewise-linear', breakpoints: [-PI, 1, PI], left: [-1, -1, 1], right: [-1, 1, 1]},
};

const smooth: FourierExample = {
    id: 'smooth',
    source: {kind: 'function', f: (x) => 1 / (2 - Math.cos(x)), breakpoints: FULL},
    closedForm: {a: (k) => (2 / Math.sqrt(3)) * R ** k, b: () => 0},
};

export const FOURIER_EXAMPLES: Readonly<Record<FourierExampleId, FourierExample>> = {
    square,
    sawtooth,
    abs,
    jump,
    smooth,
};

export function isFourierExampleId(value: unknown): value is FourierExampleId {
    return typeof value === 'string' && (FOURIER_EXAMPLE_IDS as readonly string[]).includes(value);
}

/** Square-wave partial sum (4/pi) sum over odd k <= N of sin(kx)/k, from the closed form. */
export function squareWavePartialSum(N: number, x: number): number {
    let s = 0;
    for (let k = 1; k <= N; k += 2) {
        s += Math.sin(k * x) / k;
    }
    return (4 / PI) * s;
}

/** Closed-form location pi/(N+1) of the Gibbs maximum of the square-wave partial sum on (0, pi), N odd. */
export function gibbsPeakX(N: number): number {
    return PI / (N + 1);
}

export function gibbsPeakValue(N: number): number {
    return squareWavePartialSum(N, gibbsPeakX(N));
}

/** Si(x) = int_0^x sin t / t dt by quadrature (smooth integrand, one piece). */
export function sineIntegral(x: number): number {
    return integratePiecewise((t) => (t === 0 ? 1 : Math.sin(t) / t), [0, x]);
}

/** Limit of the Gibbs maximum: 2 Si(pi) / pi. */
export function gibbsLimit(): number {
    return (2 * sineIntegral(PI)) / PI;
}
