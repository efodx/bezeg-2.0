/**
 * Coefficient decay of the closed Fourier examples (lesson F4): the amplitudes A_k = sqrt(a_k^2 + b_k^2) from the kernel's
 * quadrature, the reference curves they are compared with, the log-axis rules and the sup error of S_N on a fixed grid.
 * Slopes read from these numbers are observations of the five examples, not a law (spec F4 acceptance 2).
 */
import {partialSum, RealCoefficients, realCoefficients} from './fourier';
import {FOURIER_EXAMPLES, FourierExampleId} from './fourierExamples';

/** The largest N of the decay view (the model's FOURIER_DECAY_N_MAX); coefficients are computed once up to it. */
export const FOURIER_DECAY_MAX_ORDER = 101;
/** An amplitude below this is an exact zero (an even k of the square wave): drawn as a zero marker, never on a log axis. */
export const FOURIER_ZERO_AMPLITUDE = 1e-12;
/** The log axis starts at 10^this. */
export const FOURIER_LOG_MIN_EXPONENT = -8;
/** The sup error is taken on this many grid points over [-pi, pi]. */
export const FOURIER_SUP_GRID_POINTS = 20001;

const PI = Math.PI;
const R = 2 - Math.sqrt(3);

export interface FourierDecayReference {
    /** The bound c/k, c/k^2 or c r^k that the amplitude A_k stays below. */
    readonly amplitude: (k: number) => number;
    /** The formula as text, language-neutral. */
    readonly formula: string;
    /** `envelope`: only an upper bound (the amplitudes oscillate below it); `exact`: reached at odd k or at every k. */
    readonly kind: 'exact' | 'envelope';
}

export const FOURIER_DECAY_REFERENCES: Readonly<Record<FourierExampleId, FourierDecayReference>> = {
    square: {amplitude: k => 4 / (PI * k), formula: '4/(πk)', kind: 'exact'},
    sawtooth: {amplitude: k => 2 / k, formula: '2/k', kind: 'exact'},
    jump: {amplitude: k => 4 / (PI * k), formula: '4/(πk)', kind: 'envelope'},
    abs: {amplitude: k => 4 / (PI * k * k), formula: '4/(πk²)', kind: 'exact'},
    smooth: {amplitude: k => (2 / Math.sqrt(3)) * R ** k, formula: '(2/√3)·rᵏ, r = 2 − √3', kind: 'exact'},
};

/** The points at which the function jumps (the seam at ±pi included): the sup error does not look at them. */
export const FOURIER_JUMP_POINTS: Readonly<Record<FourierExampleId, readonly number[]>> = {
    square: [-PI, 0, PI],
    sawtooth: [-PI, PI],
    jump: [-PI, 1, PI],
    abs: [],
    smooth: [],
};

const coefficientCache = new Map<FourierExampleId, RealCoefficients>();

/** a_k and b_k of an example for k <= 101 from the kernel, computed once per example. */
export function fourierExampleCoefficients(id: FourierExampleId): RealCoefficients {
    let found = coefficientCache.get(id);
    if (!found) {
        found = realCoefficients(FOURIER_EXAMPLES[id].source, FOURIER_DECAY_MAX_ORDER);
        coefficientCache.set(id, found);
    }
    return found;
}

/** A_k for k = 1..N (index 0 is k = 1). The constant term is not part of decay. */
export function fourierAmplitudes(id: FourierExampleId, N: number): number[] {
    const {a, b} = fourierExampleCoefficients(id);
    return Array.from({length: N}, (_, i) => Math.hypot(a[i + 1], b[i + 1]));
}

const supCache = new Map<string, number>();

/** max |f - S_N| over the grid x_i = -pi + 2 pi i / 20000 without the grid points that are jump points. Cached per (example, N). */
export function fourierSupError(id: FourierExampleId, N: number): number {
    const key = `${id}:${N}`;
    const cached = supCache.get(key);
    if (cached !== undefined) return cached;
    const source = FOURIER_EXAMPLES[id].source;
    if (source.kind !== 'function') throw new Error('fourier examples of the decay view are functions');
    const coefficients = fourierExampleCoefficients(id);
    const jumps = FOURIER_JUMP_POINTS[id];
    let worst = 0;
    for (let i = 0; i < FOURIER_SUP_GRID_POINTS; i++) {
        const x = -PI + (2 * PI * i) / (FOURIER_SUP_GRID_POINTS - 1);
        if (jumps.some(j => Math.abs(x - j) < 1e-9)) continue;
        worst = Math.max(worst, Math.abs(source.f(x) - partialSum(coefficients, N, x)));
    }
    supCache.set(key, worst);
    return worst;
}

export interface FourierLogAxis {
    readonly minExponent: number;
    readonly maxExponent: number;
    /** The exponents of the decade ticks, 10^minExponent .. 10^maxExponent. */
    readonly ticks: number[];
}

/** Base-10 axis from 10^-8 up to the decade that holds `maximum` (at least one decade above the floor). */
export function fourierLogAxis(maximum: number): FourierLogAxis {
    const top = Math.max(FOURIER_LOG_MIN_EXPONENT + 1, Math.ceil(Math.log10(maximum) - 1e-12)) + 0;
    return {minExponent: FOURIER_LOG_MIN_EXPONENT, maxExponent: top, ticks: Array.from({length: top - FOURIER_LOG_MIN_EXPONENT + 1}, (_, i) => FOURIER_LOG_MIN_EXPONENT + i)};
}

/** Whether an amplitude is an exact zero (below 10^-12). */
export const isZeroAmplitude = (amplitude: number): boolean => amplitude < FOURIER_ZERO_AMPLITUDE;
