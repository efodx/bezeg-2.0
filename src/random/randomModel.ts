import {binomialMasses, logFactorial} from '../analysis/distributions';
import {checkSeed, DEFAULT_SEED, MAX_SEED} from './pcg32';
import {
    INTERVAL_POPULATION_SIZE, INTERVAL_Z_HUNDREDTHS, runArea, runFrequency, runGalton, runIntervals, runMarkov, runWalks,
} from './runners';
import {intervalCoverage, markovDistribution, markovStationary, walkLaw} from './exact';

/**
 * Stored state of the simulation graph (randomness spec, Implementation Decisions "State"; ADR 0049 sections 1 to 3) and the numbers the
 * graph draws and reads. Pure TypeScript: no React, JSXGraph or localization (messages are English developer text, as in the trig model).
 *
 * Only the fields of `RandomState` are stored. Tallies, exact curves and readouts come from `simulate` and `exactFor`; a Preset that
 * carries such fields is accepted and they are dropped (unknown properties are ignored). Imported values are never snapped or clamped:
 * an off-grid or out-of-range field rejects the whole state. Input from the UI uses the `snap...Input` functions, which do the same
 * checks and name the field.
 */

// ---- Result type (same shape as the trig model) ----

export type RandomErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'missing' | 'generator';
export interface RandomError {
    readonly field: string;
    readonly reason: RandomErrorReason;
    readonly message: string;
}
export type RandomResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: RandomError};

const ok = <T>(value: T): RandomResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: RandomErrorReason, message: string): RandomResult<T> => ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);

// ---- Ranges and defaults ----

export const RANDOM_MODES = ['galton', 'frequency', 'area', 'walk', 'markov', 'interval'] as const;
export type RandomMode = typeof RANDOM_MODES[number];

/** Names the generator and the way draws become decisions. A future change of either must change this tag (spec: stored runs never alter silently). */
export const GENERATOR_TAG = 'pcg32-xsh-rr-seq54-v1';

/** Most trials per mode: balls, tosses, points, walks, steps, intervals (spec performance and RS4 acceptance 4). */
export const N_MAX: Readonly<Record<RandomMode, number>> = {galton: 100000, frequency: 10000, area: 100000, walk: 1000, markov: 100000, interval: 10000};
export const DEFAULT_N: Readonly<Record<RandomMode, number>> = {galton: 1000, frequency: 10000, area: 10000, walk: 1000, markov: 10000, interval: 100};
export const N_MIN = 1;
export const ROWS_MIN = 1;
export const ROWS_MAX = 12;
export const WALK_STEPS_MIN = 1;
export const WALK_STEPS_MAX = 400;
/** Percentages (probabilities on a grid, ADR 0049 section 2): multiples of 5. */
export const PERCENT_STEP = 5;
export const P_MIN = 5;
export const P_MAX = 95;
export const CHAIN_MIN = 0;
export const CHAIN_MAX = 100;
export const SAMPLE_SIZE_MIN = 16;
export const SAMPLE_SIZE_MAX = 100;
export const SEED_MIN = 0;
export const SEED_MAX = MAX_SEED;
/** Intervals whose miss marks are drawn. */
export const MARKS_MAX = 100;
/** Playback: milliseconds between two stops (the speed control), on a grid of 50. */
export const STOP_MS_MIN = 100;
export const STOP_MS_MAX = 2000;
export const STOP_MS_STEP = 50;
export const STOP_MS_DEFAULT = 450;
/** Area: the quarter disc in the unit square, or the whole disc in the square -1 ... 1 (same points, same tally, mirrored into the four quadrants). */
export const AREA_SHAPES = ['quarter', 'disc'] as const;
export type AreaShape = typeof AREA_SHAPES[number];
/** The modes whose run can be drawn again for a second seed. */
export const OVERLAY_MODES: readonly RandomMode[] = ['galton', 'frequency', 'walk', 'markov'];

export interface RandomState {
    readonly generator: string;
    readonly mode: RandomMode;
    /** Whole number 0 ... 999 999. */
    readonly seed: number;
    /** Trials of the mode: balls, tosses, points, walks, steps or intervals. */
    readonly n: number;
    /** Trials shown so far, 0 ... n (the playback position). */
    readonly shown: number;
    /** Galton: rows of pegs. */
    readonly rows: number;
    /** Galton: chance of a bounce to the right, in percent (multiple of 5). */
    readonly pPercent: number;
    /** Walk: steps of each walk. */
    readonly walkSteps: number;
    /** Markov: chance A to B and B to A, in percent. */
    readonly markovA: number;
    readonly markovB: number;
    /** Markov: start state, 0 = A and 1 = B. */
    readonly markovStart: 0 | 1;
    /** Interval: draws per interval. */
    readonly sampleSize: number;
    /** Area: the shape the points fall on. */
    readonly areaShape: AreaShape;
    /** 1 draws the run of `seed2` over the run of `seed` (modes in `OVERLAY_MODES`). */
    readonly overlay: 0 | 1;
    readonly seed2: number;
    /** Playback speed: milliseconds between two stops. */
    readonly stopMs: number;
}

/** RS1 default example: 10 rows, p = 1/2, 1000 balls, seed 42, all shown. */
export const DEFAULT_RANDOM_STATE: RandomState = {
    generator: GENERATOR_TAG, mode: 'galton', seed: DEFAULT_SEED, n: 1000, shown: 1000, rows: 10, pPercent: 50, walkSteps: 100,
    markovA: 30, markovB: 60, markovStart: 0, sampleSize: 36, areaShape: 'quarter', overlay: 0, seed2: 43, stopMs: STOP_MS_DEFAULT,
};

/** The default example of a mode: its trial count, everything shown, other fields kept. */
export const withMode = (state: RandomState, mode: RandomMode): RandomState => ({...state, mode, n: DEFAULT_N[mode], shown: DEFAULT_N[mode]});

// ---- Field parsers (strict, no snapping) ----

function parseNumber(value: unknown, field: string): RandomResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected a number.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    return ok(value);
}

function parseWhole(value: unknown, field: string, min: number, max: number, step = 1): RandomResult<number> {
    const n = parseNumber(value, field);
    if (!n.ok) return n;
    if (n.value < min || n.value > max) return fail(field, 'out-of-range', `${field} is outside [${min}, ${max}].`);
    if (!Number.isInteger(n.value) || n.value % step !== 0) {
        return fail(field, 'off-grid', `${field} must be a whole number${step === 1 ? '' : ` (a multiple of ${step})`} in [${min}, ${max}].`);
    }
    return ok(n.value === 0 ? 0 : n.value);
}

function parseChoice<T extends string>(value: unknown, field: string, choices: readonly T[]): RandomResult<T> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${choices.join(', ')}.`);
    return typeof value === 'string' && (choices as readonly string[]).includes(value)
        ? ok(value as T)
        : fail(field, 'unknown-value', `${field} must be one of: ${choices.join(', ')}.`);
}

/** Parses a stored state; rejects an unknown generator tag, an out-of-range or off-grid field, and a `shown` above `n`. */
export function parseRandomState(data: unknown): RandomResult<RandomState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The simulation state must be an object.');
    if (data.generator !== GENERATOR_TAG) {
        return fail('generator', 'generator', `generator must be "${GENERATOR_TAG}"; this file was made with another random generator, so its run cannot be reproduced.`);
    }
    const mode = parseChoice(data.mode, 'mode', RANDOM_MODES);
    if (!mode.ok) return mode;
    const seed = parseWhole(data.seed, 'seed', SEED_MIN, SEED_MAX);
    if (!seed.ok) return seed;
    const n = parseWhole(data.n, 'n', N_MIN, N_MAX[mode.value]);
    if (!n.ok) return n;
    const shown = parseWhole(data.shown, 'shown', 0, n.value);
    if (!shown.ok) return shown;
    const rows = parseWhole(data.rows, 'rows', ROWS_MIN, ROWS_MAX);
    if (!rows.ok) return rows;
    const pPercent = parseWhole(data.pPercent, 'pPercent', P_MIN, P_MAX, PERCENT_STEP);
    if (!pPercent.ok) return pPercent;
    const walkSteps = parseWhole(data.walkSteps, 'walkSteps', WALK_STEPS_MIN, WALK_STEPS_MAX);
    if (!walkSteps.ok) return walkSteps;
    const markovA = parseWhole(data.markovA, 'markovA', CHAIN_MIN, CHAIN_MAX, PERCENT_STEP);
    if (!markovA.ok) return markovA;
    const markovB = parseWhole(data.markovB, 'markovB', CHAIN_MIN, CHAIN_MAX, PERCENT_STEP);
    if (!markovB.ok) return markovB;
    const markovStart = parseWhole(data.markovStart, 'markovStart', 0, 1);
    if (!markovStart.ok) return markovStart;
    const sampleSize = parseWhole(data.sampleSize, 'sampleSize', SAMPLE_SIZE_MIN, SAMPLE_SIZE_MAX);
    if (!sampleSize.ok) return sampleSize;
    const areaShape = parseChoice(data.areaShape, 'areaShape', AREA_SHAPES);
    if (!areaShape.ok) return areaShape;
    const overlay = parseWhole(data.overlay, 'overlay', 0, 1);
    if (!overlay.ok) return overlay;
    const seed2 = parseWhole(data.seed2, 'seed2', SEED_MIN, SEED_MAX);
    if (!seed2.ok) return seed2;
    const stopMs = parseWhole(data.stopMs, 'stopMs', STOP_MS_MIN, STOP_MS_MAX, STOP_MS_STEP);
    if (!stopMs.ok) return stopMs;
    return ok({
        generator: GENERATOR_TAG, mode: mode.value, seed: seed.value, n: n.value, shown: shown.value, rows: rows.value, pPercent: pPercent.value,
        walkSteps: walkSteps.value, markovA: markovA.value, markovB: markovB.value, markovStart: markovStart.value === 0 ? 0 : 1,
        sampleSize: sampleSize.value, areaShape: areaShape.value, overlay: overlay.value === 0 ? 0 : 1, seed2: seed2.value, stopMs: stopMs.value,
    });
}

/** The state to store in a Preset: only the stored fields. */
export const serializeRandomState = (s: RandomState): RandomState => ({
    generator: s.generator, mode: s.mode, seed: s.seed, n: s.n, shown: s.shown, rows: s.rows, pPercent: s.pPercent, walkSteps: s.walkSteps,
    markovA: s.markovA, markovB: s.markovB, markovStart: s.markovStart, sampleSize: s.sampleSize, areaShape: s.areaShape, overlay: s.overlay,
    seed2: s.seed2, stopMs: s.stopMs,
});

// ---- Typed input: the one checking path of a field (a number from the UI) ----

/** The strict check of one typed value. A non-finite number, a value off the grid or outside the range is refused, never changed. */
function snapTo(input: number, field: string, min: number, max: number, step = 1): RandomResult<number> {
    return parseWhole(input, field, min, max, step);
}
export const snapSeedInput = (input: number): RandomResult<number> => {
    const checked = checkSeed(input);
    return checked.status === 'ok' ? ok(checked.seed) : fail('seed', Number.isFinite(input) ? 'out-of-range' : 'not-finite', checked.message ?? 'Invalid seed.');
};
export const snapTrialsInput = (mode: RandomMode, input: number): RandomResult<number> => snapTo(input, 'n', N_MIN, N_MAX[mode]);
export const snapRowsInput = (input: number) => snapTo(input, 'rows', ROWS_MIN, ROWS_MAX);
export const snapPercentInput = (input: number, field = 'pPercent') => snapTo(input, field, P_MIN, P_MAX, PERCENT_STEP);
export const snapChainInput = (input: number, field: string) => snapTo(input, field, CHAIN_MIN, CHAIN_MAX, PERCENT_STEP);
export const snapWalkStepsInput = (input: number) => snapTo(input, 'walkSteps', WALK_STEPS_MIN, WALK_STEPS_MAX);
export const snapSampleSizeInput = (input: number) => snapTo(input, 'sampleSize', SAMPLE_SIZE_MIN, SAMPLE_SIZE_MAX);
export const snapStopInput = (input: number) => snapTo(input, 'stopMs', STOP_MS_MIN, STOP_MS_MAX, STOP_MS_STEP);

// ---- Playback stops ----

/** The trial counts playback visits: 0, then 1, 2, 5, 10, 20, 50, ... and n itself. */
export function playbackStops(n: number): number[] {
    const stops = [0];
    for (let decade = 1; decade <= n; decade *= 10) {
        for (const m of [1, 2, 5]) if (decade * m < n) stops.push(decade * m);
    }
    stops.push(n);
    return stops;
}

/** The first stop above `shown`; n when none. */
export function nextStop(shown: number, n: number): number {
    return playbackStops(n).find(stop => stop > shown) ?? n;
}

/** 0-based index of the last stop that is at most `shown`, with the number of stops. */
export function stopPosition(shown: number, n: number): {index: number; length: number} {
    const stops = playbackStops(n);
    let index = 0;
    for (let i = 0; i < stops.length; i++) if (stops[i] <= shown) index = i;
    return {index, length: stops.length};
}

/** Trial counts at which the running curve is sampled: 0, 1 ... 40 and 240 evenly spaced counts up to n (display only; the tally is not thinned). */
export function curveCounts(n: number, spaced = 240): number[] {
    const set = new Set<number>([0, n]);
    for (let i = 1; i <= Math.min(n, 40); i++) set.add(i);
    for (let i = 1; i <= spaced; i++) set.add(Math.round((i * n) / spaced));
    return [...set].sort((a, b) => a - b);
}

// ---- Exact fair-coin band (RS2) ----

const LN2 = Math.log(2);
const bandCache = new Map<number, number>();

/**
 * Half-width of the central 95 % band of the heads count of n fair tosses, in heads: w/2 for the smallest w (same parity as n) with
 * P(|2H - n| <= w) >= 0,95. The sum is over the exact binomial masses C(n,k) 2^-n (log-gamma table of `distributions`), not a normal
 * formula, and works beyond `binomialMasses`' n limit of 1000.
 */
export function fairCoinBandHalfWidth(n: number): number {
    if (!Number.isInteger(n) || n < 1) throw new RangeError('n must be a positive integer');
    const cached = bandCache.get(n);
    if (cached !== undefined) return cached;
    const mass = (k: number) => Math.exp(logFactorial(n) - logFactorial(k) - logFactorial(n - k) - n * LN2);
    let w = n % 2;
    let covered = w === 0 ? mass(n / 2) : 2 * mass((n - 1) / 2);
    while (covered < 0.95 && w < n) {
        w += 2;
        covered += 2 * mass((n - w) / 2);
    }
    bandCache.set(n, w / 2);
    return w / 2;
}

// ---- Exact comparators and simulated tallies ----

export interface GaltonExact { readonly kind: 'galton'; readonly masses: number[] }
export interface FrequencyExact { readonly kind: 'frequency' }
export interface AreaExact { readonly kind: 'area'; readonly p: number }
export interface WalkExact { readonly kind: 'walk'; readonly positions: number[]; readonly masses: number[]; readonly meanAbs: number; readonly zeroMass: number }
export interface MarkovExact {
    readonly kind: 'markov';
    readonly stationary: [number, number] | null;
    /** Second eigenvalue 1 - a - b. */
    readonly lambda: number;
    readonly a: number;
    readonly b: number;
}
export interface IntervalExact { readonly kind: 'interval'; readonly coverage: number; readonly miss: number }
export type RandomExact = GaltonExact | FrequencyExact | AreaExact | WalkExact | MarkovExact | IntervalExact;

const intervalCoverageCache = new Map<number, number>();

/** The exact curves of the mode: they depend on the parameters, not on the seed or the position. */
export function exactFor(state: RandomState): RandomExact {
    switch (state.mode) {
        case 'galton': return {kind: 'galton', masses: binomialMasses(state.rows, state.pPercent / 100)};
        case 'frequency': return {kind: 'frequency'};
        case 'area': return {kind: 'area', p: Math.PI / 4};
        case 'walk': {
            const law = walkLaw(state.walkSteps);
            let meanAbs = 0;
            law.positions.forEach((position, i) => { meanAbs += Math.abs(position) * law.masses[i]; });
            const zero = law.positions.indexOf(0);
            return {kind: 'walk', positions: law.positions, masses: law.masses, meanAbs, zeroMass: zero >= 0 ? law.masses[zero] : 0};
        }
        case 'markov': {
            const a = state.markovA / 100;
            const b = state.markovB / 100;
            return {kind: 'markov', stationary: markovStationary(a, b), lambda: 1 - a - b, a, b};
        }
        case 'interval': {
            let coverage = intervalCoverageCache.get(state.sampleSize);
            if (coverage === undefined) {
                coverage = intervalCoverage(INTERVAL_POPULATION_SIZE - 1, state.sampleSize, INTERVAL_Z_HUNDREDTHS / 100);
                intervalCoverageCache.set(state.sampleSize, coverage);
            }
            return {kind: 'interval', coverage, miss: 1 - coverage};
        }
    }
}

export interface RunCurve { readonly at: number[]; readonly tally: number[] }
export interface GaltonSim { readonly kind: 'galton'; readonly trials: number; readonly counts: number[] }
export interface FrequencySim { readonly kind: 'frequency'; readonly trials: number; readonly heads: number; readonly curve: RunCurve }
export interface AreaSim { readonly kind: 'area'; readonly trials: number; readonly inside: number; readonly curve: RunCurve }
export interface WalkSim {
    readonly kind: 'walk';
    readonly trials: number;
    /** Walks that ended at 2k - steps, k = 0 ... steps. */
    readonly counts: number[];
    readonly sumSquares: number;
    readonly sumAbs: number;
    readonly zeros: number;
}
export interface MarkovSim { readonly kind: 'markov'; readonly trials: number; readonly inA: number; readonly curve: RunCurve }
export interface IntervalSim {
    readonly kind: 'interval';
    readonly trials: number;
    readonly misses: number;
    readonly curve: RunCurve;
    /** 1-based numbers of the first MARKS_MAX intervals that missed. */
    readonly missedRuns: number[];
}
export type RandomSim = GaltonSim | FrequencySim | AreaSim | WalkSim | MarkovSim | IntervalSim;

function curveOf(at: number[], out: Uint32Array): RunCurve {
    return {at, tally: Array.from(out)};
}

/** The tallies of the first `shown` trials, from the kernel runners (one computation; the prefix property makes every position consistent). */
export function simulate(state: RandomState): RandomSim {
    const {seed, shown} = state;
    const at = curveCounts(shown);
    const cp = {at, out: new Uint32Array(at.length)};
    switch (state.mode) {
        case 'galton': {
            const out = new Uint32Array(state.rows + 1);
            runGalton(seed, state.rows, state.pPercent, shown, out);
            return {kind: 'galton', trials: shown, counts: Array.from(out)};
        }
        case 'frequency': {
            const out = new Uint32Array(1);
            runFrequency(seed, 50, shown, out, cp);
            return {kind: 'frequency', trials: shown, heads: out[0], curve: curveOf(at, cp.out)};
        }
        case 'area': {
            const out = new Uint32Array(1);
            runArea(seed, shown, out, cp);
            return {kind: 'area', trials: shown, inside: out[0], curve: curveOf(at, cp.out)};
        }
        case 'walk': {
            const out = new Uint32Array(state.walkSteps + 1);
            const summary = runWalks(seed, shown, state.walkSteps, out);
            return {kind: 'walk', trials: shown, counts: Array.from(out), sumSquares: summary.sumSquares, sumAbs: summary.sumAbs, zeros: summary.zeros};
        }
        case 'markov': {
            const out = new Uint32Array(2);
            runMarkov(seed, state.markovA, state.markovB, state.markovStart, shown, out, cp);
            return {kind: 'markov', trials: shown, inA: out[0], curve: curveOf(at, cp.out)};
        }
        case 'interval': {
            const out = new Uint8Array(shown);
            const summary = runIntervals(seed, shown, state.sampleSize, out, cp);
            const missedRuns: number[] = [];
            for (let i = 0; i < Math.min(shown, MARKS_MAX); i++) if (out[i] === 1) missedRuns.push(i + 1);
            return {kind: 'interval', trials: shown, misses: summary.misses, curve: curveOf(at, cp.out), missedRuns};
        }
    }
}

// ---- Exact law of the number of misses (RS6) ----

/** The slots drawn next to the tally when the run has more than this many intervals: the window is the mean +- MISS_WINDOW_SD standard deviations. */
export const MISS_FULL_RUNS = 40;
export const MISS_WINDOW_SD = 5;

export interface MissLaw {
    /** First count of the window. */
    readonly first: number;
    /** P(misses = first + i), exact binomial masses with chance `miss`. */
    readonly masses: number[];
}

/**
 * The exact law of the number of intervals that miss among `runs` fresh ones, each with chance `miss` = 1 - coverage, for the counts
 * from `first` on: all counts when runs <= 40, else the mean +- 5 standard deviations (widened to hold `observed`). The masses are the
 * binomial masses exp(ln C + k ln p + (n-k) ln(1-p)) with the log-factorial of `distributions`, so they also exist beyond
 * `missCountLaw`'s limit of 1000 runs; up to 1000 they equal `missCountLaw`.
 */
export function missCountWindow(runs: number, miss: number, observed = 0): MissLaw {
    if (!Number.isInteger(runs) || runs < 1) throw new RangeError('runs must be a positive integer');
    if (!(miss > 0 && miss < 1)) throw new RangeError('miss must be strictly between 0 and 1');
    const sd = Math.sqrt(runs * miss * (1 - miss));
    let first = 0;
    let last = runs;
    if (runs > MISS_FULL_RUNS) {
        first = Math.max(0, Math.floor(runs * miss - MISS_WINDOW_SD * sd));
        last = Math.min(runs, Math.ceil(runs * miss + MISS_WINDOW_SD * sd));
        first = Math.min(first, observed);
        last = Math.max(last, observed);
    }
    const masses: number[] = [];
    for (let k = first; k <= last; k++) {
        masses.push(Math.exp(logFactorial(runs) - logFactorial(k) - logFactorial(runs - k) + k * Math.log(miss) + (runs - k) * Math.log1p(-miss)));
    }
    return {first, masses};
}

// ---- Exact transition fractions (Markov box diagram) ----

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** A percentage on the grid as a fraction in lowest terms: 30 gives 3/10, 0 gives 0/1, 100 gives 1/1. */
export function percentFraction(percent: number): {num: number; den: number} {
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new RangeError('percent must be a whole number from 0 to 100');
    const divisor = gcd(percent, 100);
    return {num: percent / divisor, den: 100 / divisor};
}

// ---- How far a run normally is from the exact value ----

/** Standard deviation of a relative frequency of n trials with chance p. */
export const frequencySd = (p: number, n: number): number => Math.sqrt((p * (1 - p)) / n);

/** Standard error 4 sqrt(p (1 - p) / n) of the estimate of pi (spec RS3). */
export const piStandardError = (n: number): number => 4 * frequencySd(Math.PI / 4, n);

/**
 * Standard deviation of the share of time in A after n steps of a stationary two-state chain, sqrt(pi_A pi_B (1 + lambda) / (1 - lambda) / n)
 * with lambda = 1 - a - b (the asymptotic variance of the time average). null when a + b = 0 (no unique distribution).
 */
export function markovShareSd(exact: MarkovExact, n: number): number | null {
    if (exact.stationary === null || n < 1) return null;
    const [pa, pb] = exact.stationary;
    return Math.sqrt((pa * pb * (1 + exact.lambda)) / (1 - exact.lambda) / n);
}

/** Exact P(A after k steps) from the start state, by the kernel. */
export const markovProbabilityA = (state: RandomState, k: number): number => markovDistribution(state.markovA / 100, state.markovB / 100, state.markovStart, k)[0];

/** Exact P(A after k steps) at ascending counts `ks`, in one pass of the kernel's recursion (the same values as `markovProbabilityA`). */
export function markovProbabilityCurve(state: RandomState, ks: readonly number[]): number[] {
    const a = state.markovA / 100;
    const b = state.markovB / 100;
    let pa = state.markovStart === 0 ? 1 : 0;
    let at = 0;
    return ks.map(k => {
        for (; at < k; at++) pa = pa * (1 - a) + (1 - pa) * b;
        return pa;
    });
}

/** The largest difference between the relative tallies and the exact masses, over the slots. */
export function largestBarDifference(counts: readonly number[], masses: readonly number[], trials: number): number {
    if (trials < 1) return 0;
    let largest = 0;
    counts.forEach((count, i) => { largest = Math.max(largest, Math.abs(count / trials - masses[i])); });
    return largest;
}
