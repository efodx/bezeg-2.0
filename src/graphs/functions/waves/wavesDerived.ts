import {envelope, beatFrequency, meanFrequency} from '../../../waves/beats';
import {alias, linearJoinError, nyquistRelation, reconstruct, sample, sincError, sincInterpolate, type AliasResult} from '../../../waves/sampling';
import {phasorSum, sumAt, valueAt, type PhasorSum, type Sinusoid} from '../../../waves/sinusoid';
import {antinodes as antinodePositions, nodesOnLength, travelling} from '../../../waves/standing';
import {
    component, isOpposite, POINTS_PER_SECOND, STANDING_LENGTH, STANDING_OMEGA, sumComponents, windowOf, type WavesMode, type WavesState,
} from '../../../waves/wavesModel';

/**
 * Everything the waves graph draws and reads, derived from a validated `WavesState` by the accepted kernel in `src/waves/`. Pure and
 * language-free (no React, JSXGraph or localization). Every continuous curve has `POINTS_PER_SECOND` points per second of window (the
 * standing wave: that many points on its fixed length); the sampler is the strip of instants n / fs, computed from n, and has no
 * connection with the animation frame rate (ADR 0055 section 3).
 */

/** The time of a frame index n at the sampling rate fs; the one place instants are computed. */
export const instantOf = (n: number, fs: number): number => n / fs;

/** The first frame at or before the time t (the film's current picture), with a slack for the float product t * fs. */
export const frameAt = (t: number, fs: number): number => Math.floor(t * fs + 1e-9);

export interface SumFacts {
    readonly kind: 'sum';
    readonly c1: Sinusoid;
    readonly c2: Sinusoid;
    readonly phasor: PhasorSum;
    /** Exact input test: equal amplitudes and a phase difference of 180 degrees. */
    readonly opposite: boolean;
    /** p2 - p1 in degrees, as stored. */
    readonly phaseDifference: number;
}

export interface BeatFacts {
    readonly kind: 'beats';
    readonly amplitude: number;
    readonly f1: number;
    readonly f2: number;
    /** |f1 - f2|, an exact integer; 0 means no beats. */
    readonly beatFrequency: number;
    readonly meanFrequency: number;
    /** 1 / beatFrequency in seconds, null without beats. */
    readonly beatPeriod: number | null;
}

export interface StandingFacts {
    readonly kind: 'standing';
    readonly amplitude: number;
    readonly halfWaves: number;
    readonly k: number;
    readonly omega: number;
    readonly wavelength: number;
    /** Positions x = n L / m, n = 0..m (the two ends included). */
    readonly nodes: readonly number[];
    /** The m antinodes at (n + 1/2) L / m. */
    readonly antinodes: readonly number[];
}

export interface SamplingFacts {
    readonly kind: 'sampling';
    readonly tone: Sinusoid;
    readonly fs: number;
    readonly alias: AliasResult;
    readonly relation: 'above' | 'at' | 'below';
    readonly samplesPerPeriod: number;
    /** The instants n / fs and the samples there, n = 0..fs (the window is 1 s). */
    readonly instants: readonly number[];
    readonly samples: readonly number[];
    /** The alias tone drawn on the same grid as the wave; null when the alias is ambiguous. */
    readonly aliasWave: readonly number[] | null;
    readonly joinError: number;
    /** The truncated sinc curve and its maximum error on [0,4; 0,6] s; null while the switch is off. */
    readonly sinc: {readonly values: readonly number[]; readonly error: number} | null;
}

export type WavesFacts = SumFacts | BeatFacts | StandingFacts | SamplingFacts;

export interface WavesDerived {
    readonly mode: WavesMode;
    /** Seconds for the time modes; the standing wave's xs are positions on [0, STANDING_LENGTH]. */
    readonly window: number;
    readonly xs: readonly number[];
    /** The largest absolute value any curve of the mode reaches, with a floor so that zero amplitudes still have a frame. */
    readonly yPeak: number;
    /** Components 1 and 2 and their sum on `xs` (time modes only; the standing curves depend on the time and are `standingCurves`). */
    readonly first: readonly number[];
    readonly second: readonly number[];
    readonly total: readonly number[];
    /** The envelope 2A|cos(pi df t)| of the beats, drawn from `envelope`. */
    readonly envelope: readonly number[] | null;
    readonly facts: WavesFacts;
}

const grid = (length: number, points: number): number[] => Array.from({length: points + 1}, (_, i) => (length * i) / points);
const onGrid = (xs: readonly number[], f: (x: number) => number): number[] => xs.map(f);
const PEAK_FLOOR = 0.5;
/** The window, in seconds, in which the sinc reconstruction error is measured (away from the truncated ends). */
export const SINC_ERROR_FROM = 0.4;
export const SINC_ERROR_TO = 0.6;

/** The language-free derived data of a state. */
export function deriveWaves(s: WavesState): WavesDerived {
    const span = windowOf(s);
    if (s.mode === 'sum') {
        const [c1, c2] = sumComponents(s);
        const xs = grid(span, span * POINTS_PER_SECOND);
        return {
            mode: 'sum', window: span, xs, yPeak: Math.max(s.a1 + s.a2, PEAK_FLOOR), envelope: null,
            first: onGrid(xs, t => valueAt(c1, t)), second: onGrid(xs, t => valueAt(c2, t)), total: onGrid(xs, t => sumAt([c1, c2], t)),
            facts: {kind: 'sum', c1, c2, phasor: phasorSum(c1, c2), opposite: isOpposite(s), phaseDifference: s.p2 - s.p1},
        };
    }
    if (s.mode === 'beats') {
        const c1 = component(s.a1, s.f1, 0);
        const c2 = component(s.a1, s.f2, 0);
        const xs = grid(span, span * POINTS_PER_SECOND);
        const df = beatFrequency(s.f1, s.f2);
        return {
            mode: 'beats', window: span, xs, yPeak: Math.max(2 * s.a1, PEAK_FLOOR),
            first: onGrid(xs, t => valueAt(c1, t)), second: onGrid(xs, t => valueAt(c2, t)), total: onGrid(xs, t => sumAt([c1, c2], t)),
            envelope: onGrid(xs, t => envelope(s.a1, s.f1, s.f2, t)),
            facts: {kind: 'beats', amplitude: s.a1, f1: s.f1, f2: s.f2, beatFrequency: df, meanFrequency: meanFrequency(s.f1, s.f2), beatPeriod: df === 0 ? null : 1 / df},
        };
    }
    if (s.mode === 'standing') {
        const k = (s.halfWaves * Math.PI) / STANDING_LENGTH;
        const xs = grid(STANDING_LENGTH, POINTS_PER_SECOND);
        return {
            mode: 'standing', window: span, xs, yPeak: Math.max(2 * s.a1, PEAK_FLOOR), first: [], second: [], total: [], envelope: null,
            facts: {
                kind: 'standing', amplitude: s.a1, halfWaves: s.halfWaves, k, omega: STANDING_OMEGA, wavelength: (2 * STANDING_LENGTH) / s.halfWaves,
                nodes: nodesOnLength(STANDING_LENGTH, s.halfWaves), antinodes: antinodePositions(k, s.halfWaves),
            },
        };
    }
    const tone = component(s.a1, s.f1, s.p1);
    const xs = grid(span, span * POINTS_PER_SECOND);
    const reconstruction = reconstruct(tone, s.fs);
    const instants = Array.from({length: s.fs + 1}, (_, n) => instantOf(n, s.fs));
    const sinc = s.showSinc
        ? {values: onGrid(xs, t => sincInterpolate([tone], s.fs, t, s.extra)), error: sincError([tone], s.fs, SINC_ERROR_FROM, SINC_ERROR_TO, s.extra, 128)}
        : null;
    return {
        mode: 'sampling', window: span, xs, yPeak: Math.max(s.a1, PEAK_FLOOR), second: [], envelope: null,
        first: onGrid(xs, t => valueAt(tone, t)), total: [],
        facts: {
            kind: 'sampling', tone, fs: s.fs, alias: alias(s.f1, s.fs), relation: nyquistRelation(s.f1, s.fs), samplesPerPeriod: s.fs / s.f1,
            instants, samples: sample(tone, s.fs, s.fs + 1),
            aliasWave: reconstruction ? onGrid(xs, t => valueAt(reconstruction, t)) : null,
            joinError: linearJoinError(tone, s.fs, span), sinc,
        },
    };
}

/** The fields that change the derived data; the display switches other than the sinc one do not. */
export const derivedKey = (s: WavesState): string =>
    s.mode === 'sum' ? `sum/${s.a1}/${s.p1}/${s.a2}/${s.p2}/${s.f1}`
        : s.mode === 'beats' ? `beats/${s.a1}/${s.f1}/${s.f2}`
            : s.mode === 'standing' ? `standing/${s.a1}/${s.halfWaves}`
                : `sampling/${s.a1}/${s.p1}/${s.f1}/${s.fs}/${s.showSinc ? s.extra : 'off'}`;

/** The two travelling waves a1 sin(kx -+ wt) and their direct sum at the time t on the positions of the derived data. */
export function standingCurves(d: WavesDerived, t: number): {right: number[]; left: number[]; total: number[]} {
    const f = d.facts;
    if (f.kind !== 'standing') return {right: [], left: [], total: []};
    const right = d.xs.map(x => f.amplitude * travelling(f.k, f.omega, 1, x, t));
    const left = d.xs.map(x => f.amplitude * travelling(f.k, f.omega, -1, x, t));
    return {right, left, total: right.map((value, i) => value + left[i])};
}
