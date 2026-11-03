/**
 * Coefficient decay of the closed Fourier examples (lesson F4): the amplitudes A_k = sqrt(a_k^2 + b_k^2) from the kernel's
 * quadrature, the reference curves they are compared with, the log-axis rules and the sup error of S_N on a fixed grid.
 * Slopes read from these numbers are observations of the five examples, not a law (spec F4 acceptance 2).
 */
import {RealCoefficients, realCoefficients} from './fourier';
import {FOURIER_EXAMPLES, FourierExampleId} from './fourierExamples';

/** The largest N of the decay view (the model's FOURIER_DECAY_N_MAX); coefficients are computed once up to it. */
export const FOURIER_DECAY_MAX_ORDER = 101;
/** A kernel amplitude below this is an exact zero (an even k of the square wave): returned as 0, drawn as a zero marker, never on a log axis. */
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

/**
 * A_k for k = 1..N (index 0 is k = 1). The constant term is not part of decay. The smooth example uses its closed form
 * (2/sqrt3) r^k: the kernel's quadrature noise (about 1e-16 from k = 25) must not be shown as amplitudes. The other examples
 * come from the kernel; their amplitudes are far above its noise or exact zeros, so a kernel value below 1e-12 is returned as 0.
 */
export function fourierAmplitudes(id: FourierExampleId, N: number): number[] {
    if (id === 'smooth') return Array.from({length: N}, (_, i) => FOURIER_DECAY_REFERENCES.smooth.amplitude(i + 1));
    const {a, b} = fourierExampleCoefficients(id);
    return Array.from({length: N}, (_, i) => {
        const amplitude = Math.hypot(a[i + 1], b[i + 1]);
        return amplitude < FOURIER_ZERO_AMPLITUDE ? 0 : amplitude;
    });
}

const supCache = new Map<string, number>();

/** The running evaluation of S_N on the grid of one example: values of f and S_N, and cos/sin of kx for k = N and N - 1 (Chebyshev recurrence). */
interface SupState {
    N: number;
    readonly f: Float64Array;
    readonly sum: Float64Array;
    readonly cosK: Float64Array;
    readonly sinK: Float64Array;
    readonly cosPrev: Float64Array;
    readonly sinPrev: Float64Array;
}

let gridX: Float64Array | undefined;
let gridCos: Float64Array | undefined;
let gridSin: Float64Array | undefined;
const supStates = new Map<FourierExampleId, SupState>();

function supGrid() {
    if (!gridX || !gridCos || !gridSin) {
        gridX = new Float64Array(FOURIER_SUP_GRID_POINTS);
        gridCos = new Float64Array(FOURIER_SUP_GRID_POINTS);
        gridSin = new Float64Array(FOURIER_SUP_GRID_POINTS);
        for (let i = 0; i < FOURIER_SUP_GRID_POINTS; i++) {
            gridX[i] = -PI + (2 * PI * i) / (FOURIER_SUP_GRID_POINTS - 1);
            gridCos[i] = Math.cos(gridX[i]);
            gridSin[i] = Math.sin(gridX[i]);
        }
    }
    return {x: gridX, cos: gridCos, sin: gridSin};
}

/** State of S_0 = a_0/2 with the recurrence seeded at k = 0 (cos 0 = 1, sin 0 = 0) and k = -1 (cos x, -sin x). */
function freshSupState(id: FourierExampleId): SupState {
    const source = FOURIER_EXAMPLES[id].source;
    if (source.kind !== 'function') throw new Error('fourier examples of the decay view are functions');
    const {x, cos, sin} = supGrid();
    const n = FOURIER_SUP_GRID_POINTS;
    const start = fourierExampleCoefficients(id).a[0] / 2;
    const state: SupState = {
        N: 0, f: new Float64Array(n), sum: new Float64Array(n).fill(start), cosK: new Float64Array(n).fill(1), sinK: new Float64Array(n),
        cosPrev: Float64Array.from(cos), sinPrev: Float64Array.from(sin, v => -v),
    };
    for (let i = 0; i < n; i++) state.f[i] = source.f(x[i]);
    return state;
}

/** Extends the running state by one term, O(grid) arithmetic and no trigonometric call. */
function stepSupState(state: SupState, a: number, b: number): void {
    const {cos} = supGrid();
    const {cosK, sinK, cosPrev, sinPrev, sum} = state;
    for (let i = 0; i < FOURIER_SUP_GRID_POINTS; i++) {
        const c = 2 * cos[i] * cosK[i] - cosPrev[i];
        const s = 2 * cos[i] * sinK[i] - sinPrev[i];
        cosPrev[i] = cosK[i];
        sinPrev[i] = sinK[i];
        cosK[i] = c;
        sinK[i] = s;
        sum[i] += a * c + b * s;
    }
    state.N += 1;
}

/**
 * max |f - S_N| over the grid x_i = -pi + 2 pi i / 20000 without the grid points that are jump points (the nodes next to a jump are
 * included). Cached per (example, N). S_N is extended from the last evaluated N upward term by term; it restarts from N = 0 only when
 * a smaller N is asked for, so a slider sweep costs O(grid) per step instead of O(grid * N).
 */
export function fourierSupError(id: FourierExampleId, N: number): number {
    const key = `${id}:${N}`;
    const cached = supCache.get(key);
    if (cached !== undefined) return cached;
    const coefficients = fourierExampleCoefficients(id);
    if (!Number.isInteger(N) || N < 0 || N > FOURIER_DECAY_MAX_ORDER) throw new RangeError(`N must be an integer in [0, ${FOURIER_DECAY_MAX_ORDER}]`);
    let state = supStates.get(id);
    if (!state || state.N > N) {
        state = freshSupState(id);
        supStates.set(id, state);
    }
    while (state.N < N) stepSupState(state, coefficients.a[state.N + 1], coefficients.b[state.N + 1]);
    const jumps = FOURIER_JUMP_POINTS[id];
    const {x} = supGrid();
    let worst = 0;
    for (let i = 0; i < FOURIER_SUP_GRID_POINTS; i++) {
        if (jumps.some(j => Math.abs(x[i] - j) < 1e-9)) continue;
        worst = Math.max(worst, Math.abs(state.f[i] - state.sum[i]));
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

/** Whether an amplitude is an exact zero (the even k of the square wave and the like): `fourierAmplitudes` returns those as 0. */
export const isZeroAmplitude = (amplitude: number): boolean => amplitude === 0;
