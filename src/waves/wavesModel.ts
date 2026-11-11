import type {Sinusoid} from './sinusoid';

/**
 * Stored state of the waves graph (docs/adr/0055-waves-one-graph-integer-frequencies-drawn-sampler.md, sections 1 to 3). Pure
 * TypeScript: no React, JSXGraph or localization (messages are English developer text).
 *
 * Stored: the mode, the amplitudes and phases (on the stated grids, phases in whole-step degrees), integer frequencies, the
 * sampling rate, the standing-wave half-wave count and the display switches. The time t and the playing flag are host state of the
 * graph and are never stored. Everything else (curves, alias, readout numbers) is derived from the validated state. A Preset that
 * carries any other field is accepted and those fields are dropped. Imported values are never snapped or clamped (an off-range or
 * off-grid value rejects the whole state); typed input goes through `snapWavesField`, which rounds to the stepper grid and refuses
 * what is outside the range.
 */

// ---- Result type ----

export type WavesErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'not-boolean' | 'missing';
export interface WavesError {
    readonly field: string;
    readonly reason: WavesErrorReason;
    readonly message: string;
}
export type WavesResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: WavesError};

const ok = <T>(value: T): WavesResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: WavesErrorReason, message: string): WavesResult<T> => ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);

// ---- Modes and ranges ----

export const WAVES_MODES = ['sum', 'beats', 'standing', 'sampling'] as const;
export type WavesMode = typeof WAVES_MODES[number];

export interface WavesFieldRange {
    readonly min: number;
    readonly max: number;
    readonly step: number;
}

/** Amplitudes (arbitrary units), phases (degrees), integer frequencies and rates (hertz), half waves, extra sinc samples. */
export const AMPLITUDE_RANGE: WavesFieldRange = {min: 0, max: 4, step: 0.25};
export const PHASE_RANGE: WavesFieldRange = {min: -180, max: 180, step: 5};
export const FREQUENCY_RANGE: WavesFieldRange = {min: 1, max: 40, step: 1};
export const RATE_RANGE: WavesFieldRange = {min: 2, max: 64, step: 1};
export const HALF_WAVES_RANGE: WavesFieldRange = {min: 1, max: 6, step: 1};
export const EXTRA_RANGE: WavesFieldRange = {min: 0, max: 192, step: 12};

export const WAVES_NUMERIC_FIELDS = ['a1', 'p1', 'a2', 'p2', 'f1', 'f2', 'fs', 'halfWaves', 'extra'] as const;
export type WavesNumericField = typeof WAVES_NUMERIC_FIELDS[number];
export const WAVES_FIELD_RANGES: Readonly<Record<WavesNumericField, WavesFieldRange>> = {
    a1: AMPLITUDE_RANGE, p1: PHASE_RANGE, a2: AMPLITUDE_RANGE, p2: PHASE_RANGE, f1: FREQUENCY_RANGE, f2: FREQUENCY_RANGE,
    fs: RATE_RANGE, halfWaves: HALF_WAVES_RANGE, extra: EXTRA_RANGE,
};

export const WAVES_TOGGLE_FIELDS = ['showPhasors', 'showEnvelope', 'showAlias', 'showJoin', 'showSinc'] as const;
export type WavesToggleField = typeof WAVES_TOGGLE_FIELDS[number];

export interface WavesState {
    readonly mode: WavesMode;
    /** Component 1 and 2: amplitude and phase in degrees. Sum mode uses both, beats uses a1 for both, standing and sampling use a1. */
    readonly a1: number;
    readonly p1: number;
    readonly a2: number;
    readonly p2: number;
    /** Integer frequencies in hertz. Sum, standing and sampling use f1; beats uses both. */
    readonly f1: number;
    readonly f2: number;
    /** The sampling rate in hertz (sampling mode). */
    readonly fs: number;
    /** The number m of half waves on the standing wave's fixed length. */
    readonly halfWaves: number;
    /** Extra samples on each side of the window for the sinc interpolation (sampling mode). */
    readonly extra: number;
    readonly showPhasors: boolean;
    readonly showEnvelope: boolean;
    readonly showAlias: boolean;
    readonly showJoin: boolean;
    readonly showSinc: boolean;
}

/** The default example: WV1, two equal waves of 1 with a phase difference of 120 degrees, at 3 Hz. */
export const DEFAULT_WAVES_STATE: WavesState = {
    mode: 'sum', a1: 1, p1: 0, a2: 1, p2: 120, f1: 3, f2: 3, fs: 12, halfWaves: 2, extra: 48,
    showPhasors: true, showEnvelope: true, showAlias: true, showJoin: false, showSinc: false,
};

/** The window of time, in seconds, that the curves and the time slider cover in a mode (the standing wave's time runs over one period). */
export const WINDOW_SECONDS: Readonly<Record<WavesMode, number>> = {sum: 1, beats: 2, standing: 1, sampling: 1};
/** Points per second of window of every continuous curve (ADR 0055 section 2). */
export const POINTS_PER_SECOND = 2048;
/** The fixed length of the standing wave's medium and its angular frequency (period 1 s). */
export const STANDING_LENGTH = 2;
export const STANDING_OMEGA = 2 * Math.PI;

const GRID_TOLERANCE = 1e-9;
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

/** Removes binary noise of a stepper product (0.05 * 3 is 0.15000000000000002). */
const clean = (value: number): number => norm(Number(value.toPrecision(12)));

const onGrid = (value: number, range: WavesFieldRange): boolean => {
    const steps = (value - range.min) / range.step;
    return Math.abs(steps - Math.round(steps)) <= GRID_TOLERANCE;
};

// ---- Parsing (strict, no snapping) ----

function parseNumber(value: unknown, field: string, range: WavesFieldRange): WavesResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected a number from ${range.min} to ${range.max}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number, not ${typeof value === 'number' ? String(value) : typeof value}.`);
    if (value < range.min || value > range.max) return fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`);
    if (!onGrid(value, range)) return fail(field, 'off-grid', `${field} must be ${range.min} plus a whole number of steps of ${range.step}.`);
    return ok(clean(value));
}

function parseToggle(value: unknown, field: string): WavesResult<boolean> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected true or false.`);
    return typeof value === 'boolean' ? ok(value) : fail(field, 'not-boolean', `${field} must be true or false.`);
}

/** Strict check of a stored state (a Preset entry, an imported file, a lesson action): the first problem is returned as an actionable error. */
export function parseWavesState(data: unknown): WavesResult<WavesState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The waves state must be an object.');
    if (data.mode === undefined || data.mode === null) return fail('mode', 'missing', `mode is missing; expected one of: ${WAVES_MODES.join(', ')}.`);
    const mode = WAVES_MODES.find(id => id === data.mode);
    if (mode === undefined) return fail('mode', 'unknown-value', `mode must be one of: ${WAVES_MODES.join(', ')}.`);
    const numbers: Partial<Record<WavesNumericField, number>> = {};
    for (const field of WAVES_NUMERIC_FIELDS) {
        const parsed = parseNumber(data[field], field, WAVES_FIELD_RANGES[field]);
        if (!parsed.ok) return parsed;
        numbers[field] = parsed.value;
    }
    const toggles: Partial<Record<WavesToggleField, boolean>> = {};
    for (const field of WAVES_TOGGLE_FIELDS) {
        const parsed = parseToggle(data[field], field);
        if (!parsed.ok) return parsed;
        toggles[field] = parsed.value;
    }
    return ok({
        mode, a1: numbers.a1!, p1: numbers.p1!, a2: numbers.a2!, p2: numbers.p2!, f1: numbers.f1!, f2: numbers.f2!, fs: numbers.fs!,
        halfWaves: numbers.halfWaves!, extra: numbers.extra!,
        showPhasors: toggles.showPhasors!, showEnvelope: toggles.showEnvelope!, showAlias: toggles.showAlias!, showJoin: toggles.showJoin!, showSinc: toggles.showSinc!,
    });
}

/** The state to store in a Preset: only the stored fields, nothing derived and no time. */
export const serializeWavesState = (s: WavesState): WavesState => ({
    mode: s.mode, a1: s.a1, p1: s.p1, a2: s.a2, p2: s.p2, f1: s.f1, f2: s.f2, fs: s.fs, halfWaves: s.halfWaves, extra: s.extra,
    showPhasors: s.showPhasors, showEnvelope: s.showEnvelope, showAlias: s.showAlias, showJoin: s.showJoin, showSinc: s.showSinc,
});

// ---- Typed input: rounded to the grid, never clamped ----

/**
 * The one path of typed input and of any program-made value: rounds to the stepper grid and returns the stored value. A value outside
 * the range, and NaN or infinity, is an error and nothing is stored.
 */
export function snapWavesField(field: WavesNumericField, input: number): WavesResult<number> {
    const range = WAVES_FIELD_RANGES[field];
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    if (input < range.min - GRID_TOLERANCE || input > range.max + GRID_TOLERANCE) {
        return fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`);
    }
    const value = clean(range.min + Math.round((input - range.min) / range.step) * range.step);
    return value < range.min || value > range.max ? fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`) : ok(value);
}

// ---- Components of a state ----

/** Degrees to radians. */
export const radians = (degrees: number): number => (degrees * Math.PI) / 180;

/** The component the state describes: amplitude, integer frequency and phase in radians. */
export const component = (amplitude: number, frequency: number, phaseDegrees: number): Sinusoid => ({amplitude, frequency, phase: radians(phaseDegrees)});

/** The two components of the sum mode (both at the frequency f1). */
export function sumComponents(s: WavesState): [Sinusoid, Sinusoid] {
    return [component(s.a1, s.f1, s.p1), component(s.a2, s.f1, s.p2)];
}

/**
 * "Opposite phase", decided by an exact test on the snapped inputs: equal non-zero amplitudes and a phase difference of 180 degrees
 * (modulo 360). The computed amplitude of such a sum is a rounding residue and is never called exactly zero.
 */
export function isOpposite(s: WavesState): boolean {
    if (s.a1 !== s.a2 || s.a1 === 0) return false;
    return (((s.p2 - s.p1) % 360) + 360) % 360 === 180;
}

/** The duration of the time slider and of the playback in the state's mode. */
export const windowOf = (s: WavesState): number => WINDOW_SECONDS[s.mode];
