import type {DerivativeSource, Vec2} from '../bezeg/impl/curve/curvature';
import {PARAMETRIC_CATALOGUE} from '../graphs/curves/parametric/parametricCatalogue';
import {decompose} from './decompose';
import {arrowScale, ladderStep, type ArrowScale} from './arrowScale';
import {
    ALPHA_MAX_DEG, ALPHA_MIN_DEG, CIRCLE_OMEGA_MAX, CIRCLE_OMEGA_MIN, CIRCLE_R_MAX, CIRCLE_R_MIN, circularSource, G, projectileSource, projectileSummary,
    type MotionId, type ProjectileSummary, reparametrize, sineWarp, tangentialStatus, type TangentialStatus, WARP_B_MAX,
} from './motion';

/**
 * Stored state of the kinematics graph (docs/adr/0050-kinematics-graph-si-units-and-arrow-scale.md, sections 1 to 3) and everything
 * it derives. Pure TypeScript: no React, JSXGraph or localization (messages are English developer text).
 *
 * Stored: the motion id, its parameters (on the stated steppers), the speed-variation amplitude b and four display switches. The time
 * t and the playing flag are host state of the graph and are never stored (ADR 0050 section 1). Positions, vectors, scales and
 * statuses are derived from the validated state and are never read from a Preset: a Preset that carries any other field is accepted
 * and those fields are dropped. Imported values are never snapped or clamped (an off-range or off-grid value rejects the whole
 * state); typed input goes through `snapField`, which rounds to the stepper grid and refuses what is outside the range.
 */

// ---- Result type ----

export type KinematicsErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'not-boolean' | 'missing' | 'inconsistent';
export interface KinematicsError {
    readonly field: string;
    readonly reason: KinematicsErrorReason;
    readonly message: string;
}
export type KinematicsResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: KinematicsError};

const ok = <T>(value: T): KinematicsResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: KinematicsErrorReason, message: string): KinematicsResult<T> => ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);

// ---- Motions and ranges ----

export const MOTION_IDS = ['cycloid', 'cardioid', 'rose', 'spiral', 'projectile', 'circular'] as const;
export type MotionChoice = typeof MOTION_IDS[number];
/** The catalogue curves, read as a motion of the point through the parameter t (seconds). */
export const CATALOGUE_MOTIONS = ['cycloid', 'cardioid', 'rose', 'spiral'] as const;
type CatalogueMotion = typeof CATALOGUE_MOTIONS[number];
export const isCatalogueMotion = (motion: MotionChoice): motion is CatalogueMotion => (CATALOGUE_MOTIONS as readonly string[]).includes(motion);

export interface FieldRange {
    readonly min: number;
    readonly max: number;
    /** The stepper: stored values are min plus a whole number of steps. */
    readonly step: number;
}

export const V0_RANGE: FieldRange = {min: 5, max: 30, step: 1};
export const ALPHA_RANGE: FieldRange = {min: ALPHA_MIN_DEG, max: ALPHA_MAX_DEG, step: 5};
export const RADIUS_RANGE: FieldRange = {min: CIRCLE_R_MIN, max: CIRCLE_R_MAX, step: 0.5};
export const OMEGA_RANGE: FieldRange = {min: CIRCLE_OMEGA_MIN, max: CIRCLE_OMEGA_MAX, step: 0.25};
export const B_RANGE: FieldRange = {min: 0, max: WARP_B_MAX, step: 0.05};

export const NUMERIC_FIELDS = ['v0', 'alpha', 'radius', 'omega', 'b'] as const;
export type NumericField = typeof NUMERIC_FIELDS[number];
export const FIELD_RANGES: Readonly<Record<NumericField, FieldRange>> = {v0: V0_RANGE, alpha: ALPHA_RANGE, radius: RADIUS_RANGE, omega: OMEGA_RANGE, b: B_RANGE};

export const TOGGLE_FIELDS = ['showVelocity', 'showAcceleration', 'split', 'trace'] as const;
export type ToggleField = typeof TOGGLE_FIELDS[number];

export interface KinematicsState {
    readonly motion: MotionChoice;
    /** Launch speed (m/s) and angle (degrees) of the projectile. */
    readonly v0: number;
    readonly alpha: number;
    /** Radius R (m) and angular velocity omega (rad/s) of the uniform circular motion. */
    readonly radius: number;
    readonly omega: number;
    /** Speed variation of the circular motion: the angle runs as omega (t + b sin(omega t) / omega). 0 is uniform. */
    readonly b: number;
    readonly showVelocity: boolean;
    readonly showAcceleration: boolean;
    /** Shows the tangential and normal parts of the acceleration. */
    readonly split: boolean;
    readonly trace: boolean;
}

/** The default example: the cycloid of KN1 with both arrows, rolling radius 1 m. */
export const DEFAULT_KINEMATICS_STATE: KinematicsState = {
    motion: 'cycloid', v0: 20, alpha: 45, radius: 2, omega: 1, b: 0, showVelocity: true, showAcceleration: true, split: false, trace: true,
};

const GRID_TOLERANCE = 1e-9;
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

/** Removes binary noise of a stepper product (0.05 * 3 is 0.15000000000000002). */
const clean = (value: number): number => norm(Number(value.toPrecision(12)));

const onGrid = (value: number, range: FieldRange): boolean => {
    const steps = (value - range.min) / range.step;
    return Math.abs(steps - Math.round(steps)) <= GRID_TOLERANCE;
};

// ---- Field parsers (strict, no snapping) ----

function parseNumber(value: unknown, field: string, range: FieldRange): KinematicsResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected a number from ${range.min} to ${range.max}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number, not ${typeof value === 'number' ? String(value) : typeof value}.`);
    if (value < range.min || value > range.max) return fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`);
    if (!onGrid(value, range)) return fail(field, 'off-grid', `${field} must be ${range.min} plus a whole number of steps of ${range.step}.`);
    return ok(clean(value));
}

function parseToggle(value: unknown, field: string): KinematicsResult<boolean> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected true or false.`);
    return typeof value === 'boolean' ? ok(value) : fail(field, 'not-boolean', `${field} must be true or false.`);
}

/** Strict check of a stored state (a Preset entry, an imported file, a lesson action): the first problem is returned as an actionable error. */
export function parseKinematicsState(data: unknown): KinematicsResult<KinematicsState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The kinematics state must be an object.');
    if (data.motion === undefined || data.motion === null) return fail('motion', 'missing', `motion is missing; expected one of: ${MOTION_IDS.join(', ')}.`);
    const motion = MOTION_IDS.find(id => id === data.motion);
    if (motion === undefined) return fail('motion', 'unknown-value', `motion must be one of: ${MOTION_IDS.join(', ')}.`);
    const numbers: Partial<Record<NumericField, number>> = {};
    for (const field of NUMERIC_FIELDS) {
        const parsed = parseNumber(data[field], field, FIELD_RANGES[field]);
        if (!parsed.ok) return parsed;
        numbers[field] = parsed.value;
    }
    if (numbers.b !== 0 && motion !== 'circular') {
        return fail('b', 'inconsistent', `b is ${numbers.b}, but the speed variation applies only to the circular motion; use b = 0 with ${motion}.`);
    }
    const toggles: Partial<Record<ToggleField, boolean>> = {};
    for (const field of TOGGLE_FIELDS) {
        const parsed = parseToggle(data[field], field);
        if (!parsed.ok) return parsed;
        toggles[field] = parsed.value;
    }
    return ok({
        motion, v0: numbers.v0!, alpha: numbers.alpha!, radius: numbers.radius!, omega: numbers.omega!, b: numbers.b!,
        showVelocity: toggles.showVelocity!, showAcceleration: toggles.showAcceleration!, split: toggles.split!, trace: toggles.trace!,
    });
}

/** The state to store in a Preset: only the stored fields, nothing derived and no time. */
export const serializeKinematicsState = (s: KinematicsState): KinematicsState => ({
    motion: s.motion, v0: s.v0, alpha: s.alpha, radius: s.radius, omega: s.omega, b: s.b,
    showVelocity: s.showVelocity, showAcceleration: s.showAcceleration, split: s.split, trace: s.trace,
});

// ---- Typed input: rounded to the grid, never clamped ----

/**
 * The one path of typed input and of any program-made value: rounds to the stepper grid and returns the stored value. A value outside
 * the range, and NaN or infinity, is an error and nothing is stored.
 */
export function snapField(field: NumericField, input: number): KinematicsResult<number> {
    const range = FIELD_RANGES[field];
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    if (input < range.min - GRID_TOLERANCE || input > range.max + GRID_TOLERANCE) {
        return fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`);
    }
    const value = clean(range.min + Math.round((input - range.min) / range.step) * range.step);
    return value < range.min || value > range.max ? fail(field, 'out-of-range', `${field} is outside [${range.min}, ${range.max}].`) : ok(value);
}

/** A new motion; the speed variation b applies only to the circular motion and is reset to 0 for the others. */
export function withMotion(state: KinematicsState, motion: MotionChoice): KinematicsState {
    return {...state, motion, b: motion === 'circular' ? state.b : 0};
}

// ---- Derived: the motion ----

/** The motion id the tangential classification uses: exact by construction only for the unmodified circular and projectile motions. */
export const classificationId = (state: KinematicsState): MotionId =>
    state.motion === 'projectile' ? 'projectile' : state.motion === 'circular' && state.b === 0 ? 'circular' : 'generic';

/** The source of the moving point for a validated state (the speed variation applied to the circular motion). */
export function motionSource(state: KinematicsState): DerivativeSource {
    switch (state.motion) {
        case 'projectile': return projectileSource(state.v0, state.alpha);
        case 'circular': {
            const base = circularSource(state.radius, state.omega);
            if (state.b === 0) return base;
            // The source time runs as t + (b / omega) sin(omega t): the angle omega t is warped by theta + b sin(theta), and the
            // warp is periodic in the period of the motion.
            const warp = sineWarp(state.b);
            const omega = state.omega;
            return reparametrize(base, t => { const [p, p1, p2] = warp(omega * t); return [p / omega, p1, p2 * omega]; });
        }
        default: return PARAMETRIC_CATALOGUE[state.motion].source(1);
    }
}

/** The length of the time domain in seconds: one arch, one trace, one period or the flight. */
export function timeEnd(state: KinematicsState): number {
    switch (state.motion) {
        case 'projectile': return projectileSummary(state.v0, state.alpha).flightTime;
        case 'circular': return 2 * Math.PI / state.omega;
        default: {
            const [t0, t1] = PARAMETRIC_CATALOGUE[state.motion].domain;
            return t1 - t0;
        }
    }
}

/** The number of intervals of the sampled path, the trace and the scale search. */
export const SAMPLES = 720;

/** The arrow scales and the board length that the full-scale arrow gets. */
export interface ArrowScales {
    readonly velocity: ArrowScale;
    readonly acceleration: ArrowScale;
    /** Board length (m) of an arrow of "length 1": the longest arrow of each kind is at most this long. */
    readonly unit: number;
}

export interface KinematicsDerived {
    readonly source: DerivativeSource;
    readonly id: MotionId;
    readonly tEnd: number;
    /** Positions at SAMPLES + 1 equally spaced times of [0, tEnd]. */
    readonly pathX: readonly number[];
    readonly pathY: readonly number[];
    /** [minX, maxX, minY, maxY] of the sampled path. */
    readonly box: readonly [number, number, number, number];
    /** Largest speed and acceleration magnitude over the sampled domain. */
    readonly maxSpeed: number;
    readonly maxAcceleration: number;
    readonly scales: ArrowScales;
    /** Closed-form flight data, for the projectile only. */
    readonly summary?: ProjectileSummary;
}

/** Fraction of the path extent that the full-scale arrow gets, rounded up to the 1, 2, 5 ladder. */
export const ARROW_EXTENT_FRACTION = 0.15;

export function deriveKinematics(state: KinematicsState, unitSpeed = 'm/s', unitAcceleration = 'm/s²'): KinematicsDerived {
    const source = motionSource(state);
    const tEnd = timeEnd(state);
    const pathX: number[] = [];
    const pathY: number[] = [];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxSpeed = 0, maxAcceleration = 0;
    for (let i = 0; i <= SAMPLES; i++) {
        const s = source.at(tEnd * i / SAMPLES);
        pathX.push(s.point[0]);
        pathY.push(s.point[1]);
        minX = Math.min(minX, s.point[0]); maxX = Math.max(maxX, s.point[0]);
        minY = Math.min(minY, s.point[1]); maxY = Math.max(maxY, s.point[1]);
        maxSpeed = Math.max(maxSpeed, Math.hypot(s.d1[0], s.d1[1]));
        maxAcceleration = Math.max(maxAcceleration, Math.hypot(s.d2[0], s.d2[1]));
    }
    const extent = Math.max(maxX - minX, maxY - minY);
    return {
        source, id: classificationId(state), tEnd, pathX, pathY, box: [minX, maxX, minY, maxY], maxSpeed, maxAcceleration,
        scales: {velocity: arrowScale(maxSpeed, unitSpeed), acceleration: arrowScale(maxAcceleration, unitAcceleration), unit: ladderStep(ARROW_EXTENT_FRACTION * extent)},
        summary: state.motion === 'projectile' ? projectileSummary(state.v0, state.alpha) : undefined,
    };
}

/** The acceleration is the same everywhere for the projectile: the constant g is part of the label (ADR 0050 section 2). */
export const GRAVITY = G;

// ---- Derived: the motion at one time ----

export type Evaluation =
    | {
        readonly kind: 'regular';
        readonly t: number;
        readonly point: Vec2;
        readonly velocity: Vec2;
        readonly acceleration: Vec2;
        readonly speed: number;
        readonly aT: number;
        readonly aN: number;
        readonly kappa: number;
        /** kappa v^2: equals a_N up to rounding; a consistency check, not an independent quantity. */
        readonly kappaSpeedSquared: number;
        readonly status: TangentialStatus;
    }
    | {
        readonly kind: 'singular';
        readonly t: number;
        readonly point: Vec2;
        readonly velocity: Vec2;
        readonly acceleration: Vec2;
        readonly speed: number;
    };

/** The point, the vectors and their tangential and normal parts at the time t (0 <= t <= tEnd); a zero speed has no components. */
export function evaluateAt(derived: KinematicsDerived, t: number): Evaluation {
    if (!Number.isFinite(t) || t < 0 || t > derived.tEnd) throw new RangeError(`t must be in [0, ${derived.tEnd}], got ${t}.`);
    const s = derived.source.at(t);
    const d = decompose(s.d1, s.d2, derived.source.scale);
    if (d.kind === 'singular') {
        return {kind: 'singular', t, point: s.point, velocity: s.d1, acceleration: s.d2, speed: d.speed};
    }
    const accelerationNorm = Math.hypot(s.d2[0], s.d2[1]);
    return {
        kind: 'regular', t, point: s.point, velocity: s.d1, acceleration: s.d2, speed: d.speed, aT: d.aT, aN: d.aN, kappa: d.kappa,
        kappaSpeedSquared: d.kappa * d.speed * d.speed, status: tangentialStatus(derived.id, d.aT, accelerationNorm),
    };
}

/** End of the arrow drawn from `from` for a vector in the unit of `step`: the board length is |vector| / step times the board unit. */
export function arrowEnd(from: Vec2, vector: Vec2, step: number, unit: number): Vec2 {
    const k = unit / step;
    return [from[0] + vector[0] * k, from[1] + vector[1] * k];
}

/** The tangential and normal parts of the acceleration as vectors (a_T along the tangent, a_N along the left normal). */
export function componentVectors(e: Extract<Evaluation, {kind: 'regular'}>): {readonly tangential: Vec2; readonly normal: Vec2} {
    const tx = e.velocity[0] / e.speed;
    const ty = e.velocity[1] / e.speed;
    return {tangential: [e.aT * tx, e.aT * ty], normal: [-e.aN * ty, e.aN * tx]};
}
