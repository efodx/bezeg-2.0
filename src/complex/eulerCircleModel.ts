import {Complex} from '../analysis/complex';
import {EXP_SERIES_DEGREE_MAX, eulerPoint, expSeriesPartial} from '../analysis/eulerCircle';

/**
 * Stored state of the Euler-circle graph (spec M7, Euler's formula as uniform circular motion; docs/adr/0058). Pure TypeScript: no
 * React, JSXGraph or localization, so errors are codes (`field`, `reason` and the accepted range and step) and the graph words them.
 *
 * The angle theta is an integer number of degrees from 0 to 360 (the point e^(i theta) of the unit circle; with theta = omega t the
 * time is t = theta / omega, derived), the angular speed omega an integer from 1 to 4, the series degree N an integer from 1 to 30,
 * and the velocity and acceleration arrows are switched by two booleans. Imported and typed values are never snapped or clamped: an
 * off-grid or out-of-range value is refused; only a drag snaps to the nearest degree. Unknown fields of a file are accepted and dropped.
 */

export type EulerCircleErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'missing' | 'not-boolean' | 'not-mode';
export interface EulerCircleError {
    readonly field: string;
    readonly reason: EulerCircleErrorReason;
    /** The accepted range and step for range and grid errors. */
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
}
export type EulerCircleResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: EulerCircleError};

const ok = <T>(value: T): EulerCircleResult<T> => ({ok: true, value});
const fail = <T>(error: EulerCircleError): EulerCircleResult<T> => ({ok: false, error});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

export interface IntegerRange {
    readonly min: number;
    readonly max: number;
}

export const ANGLE_RANGE: IntegerRange = {min: 0, max: 360};
export const OMEGA_RANGE: IntegerRange = {min: 1, max: 4};
/** The second angle of the product mode is a multiple of `B_STEP` degrees. */
export const B_STEP = 5;
export const B_RANGE: IntegerRange = {min: 0, max: 360};
export const DEGREE_RANGE: IntegerRange = {min: 1, max: EXP_SERIES_DEGREE_MAX};
/** One playback step or Next step advances the angle by this many degrees (to the next multiple of it). */
export const STEP_DEGREES = 5;
/** The drawn length of the velocity arrow is this fraction of the speed, and of the acceleration arrow of its modulus. */
export const VELOCITY_SCALE = 0.4;
/** The acceleration arrow has the drawn length ACCELERATION_DRAWN_LENGTH whatever omega is (the scale is 0.9 / omega^2, stated in the legend), so its tip never passes the centre. */
export const ACCELERATION_DRAWN_LENGTH = 0.9;
export const accelerationScale = (omega: number): number => ACCELERATION_DRAWN_LENGTH / (omega * omega);

/** A typed multiple of `step` (a number field, a lesson action): inside the range, otherwise refused; never rounded or clamped. */
function typedInteger(value: unknown, field: string, range: IntegerRange, step = 1): EulerCircleResult<number> {
    const bounds = {min: range.min, max: range.max, step};
    if (value === undefined || value === null) return fail({field, reason: 'missing', ...bounds});
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail({field, reason: 'not-finite', ...bounds});
    if (Math.abs(value / step - Math.round(value / step)) * step > 1e-6) return fail({field, reason: 'off-grid', ...bounds});
    const rounded = Math.round(value / step) * step;
    if (rounded < range.min || rounded > range.max) return fail({field, reason: 'out-of-range', ...bounds});
    return ok(norm(rounded));
}

export const typedAngle = (value: unknown, field = 'degrees'): EulerCircleResult<number> => typedInteger(value, field, ANGLE_RANGE);
export const typedSecondAngle = (value: unknown, field = 'b'): EulerCircleResult<number> => typedInteger(value, field, B_RANGE, B_STEP);
export const typedOmega = (value: unknown, field = 'omega'): EulerCircleResult<number> => typedInteger(value, field, OMEGA_RANGE);
export const typedDegree = (value: unknown, field = 'degree'): EulerCircleResult<number> => typedInteger(value, field, DEGREE_RANGE);
export function typedFlag(value: unknown, field: string): EulerCircleResult<boolean> {
    if (value === undefined || value === null) return fail({field, reason: 'missing'});
    return typeof value === 'boolean' ? ok(value) : fail({field, reason: 'not-boolean'});
}

export type EulerCircleMode = 'motion' | 'product';
export function typedMode(value: unknown, field = 'mode'): EulerCircleResult<EulerCircleMode> {
    if (value === undefined || value === null) return fail({field, reason: 'missing'});
    return value === 'motion' || value === 'product' ? ok(value) : fail({field, reason: 'not-mode'});
}

/** A drag only: the nearest whole degree of the dragged point's direction, in 0..359; undefined for a non-finite point or the centre. */
export function snapDragAngle(x: number, y: number): number | undefined {
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) < 1e-9) return undefined;
    const degrees = Math.round((Math.atan2(y, x) * 180) / Math.PI);
    return norm(((degrees % 360) + 360) % 360);
}

/** A drag of the second point only: the nearest multiple of `B_STEP` degrees of its direction, in 0..355; undefined as for `snapDragAngle`. */
export function snapDragSecondAngle(x: number, y: number): number | undefined {
    const degrees = snapDragAngle(x, y);
    return degrees === undefined ? undefined : norm((Math.round(degrees / B_STEP) * B_STEP) % 360);
}

export interface EulerCircleState {
    /** theta in whole degrees, 0..360. */
    readonly degrees: number;
    /** The angular speed omega, 1..4: theta = omega t. */
    readonly omega: number;
    /** The degree N of the partial sum of the series, 1..30. */
    readonly degree: number;
    readonly velocity: boolean;
    readonly acceleration: boolean;
    /** `motion`: one point; `product`: also the second point e^(i b) and the product point e^(i(theta + b)). */
    readonly mode: EulerCircleMode;
    /** The second angle in degrees, 0..360 in steps of 5. */
    readonly b: number;
}

/** M7 default example: theta = pi/6, omega = 2 (t = pi/12), the velocity arrow shown, the partial sum of degree 5. */
export const DEFAULT_EULER_CIRCLE_STATE: EulerCircleState = {degrees: 30, omega: 2, degree: 5, velocity: true, acceleration: false, mode: 'motion', b: 45};

export function parseEulerCircleState(data: unknown): EulerCircleResult<EulerCircleState> {
    if (!isRecord(data)) return fail({field: 'state', reason: 'not-an-object'});
    const degrees = typedAngle(data.degrees, 'degrees');
    if (!degrees.ok) return degrees;
    const omega = typedOmega(data.omega, 'omega');
    if (!omega.ok) return omega;
    const degree = typedDegree(data.degree, 'degree');
    if (!degree.ok) return degree;
    const velocity = typedFlag(data.velocity, 'velocity');
    if (!velocity.ok) return velocity;
    const acceleration = typedFlag(data.acceleration, 'acceleration');
    if (!acceleration.ok) return acceleration;
    // A Preset made before the product mode has neither field: the defaults apply. A field that is present must be valid.
    const b = data.b === undefined ? ok(DEFAULT_EULER_CIRCLE_STATE.b) : typedSecondAngle(data.b, 'b');
    if (!b.ok) return b;
    const mode = data.mode === undefined ? ok(DEFAULT_EULER_CIRCLE_STATE.mode) : typedMode(data.mode, 'mode');
    if (!mode.ok) return mode;
    return ok({degrees: degrees.value, omega: omega.value, degree: degree.value, velocity: velocity.value, acceleration: acceleration.value, mode: mode.value, b: b.value});
}

/** The state to store in a Preset or file: only the stored fields. */
export const serializeEulerCircleState = (s: EulerCircleState): EulerCircleState => ({
    degrees: s.degrees, omega: s.omega, degree: s.degree, velocity: s.velocity, acceleration: s.acceleration,
    mode: s.mode, b: s.b,
});

/** The angle of the next playback step: the next multiple of `STEP_DEGREES`, at most 360. */
export const nextAngle = (degrees: number): number => Math.min(ANGLE_RANGE.max, (Math.floor(degrees / STEP_DEGREES) + 1) * STEP_DEGREES);

// ---- Scene actions (lesson content): validated strictly, never snapped ----

export type EulerCircleOperation = 'set-angle' | 'set-omega' | 'set-degree' | 'set-vectors' | 'set-b' | 'set-mode' | 'step';
export interface EulerCircleAction {
    readonly kind: 'euler-circle';
    readonly operation: EulerCircleOperation;
    readonly degrees?: number;
    readonly omega?: number;
    readonly degree?: number;
    readonly velocity?: boolean;
    readonly acceleration?: boolean;
    readonly b?: number;
    readonly mode?: EulerCircleMode;
    readonly count?: number;
}

/**
 * The state after a scene action. `step` advances the angle by `count` (default 1, from 1 to 72) playback steps and stops at 360;
 * `set-vectors` sets the given flags (at least one); a payload that is not valid is a content error.
 */
export function applyEulerCircleAction(state: EulerCircleState, action: unknown): EulerCircleResult<EulerCircleState> {
    if (!isRecord(action)) return fail({field: 'action', reason: 'not-an-object'});
    switch (action.operation) {
        case 'set-angle': {
            const degrees = typedAngle(action.degrees, 'degrees');
            return degrees.ok ? ok({...state, degrees: degrees.value}) : degrees;
        }
        case 'set-omega': {
            const omega = typedOmega(action.omega, 'omega');
            return omega.ok ? ok({...state, omega: omega.value}) : omega;
        }
        case 'set-degree': {
            const degree = typedDegree(action.degree, 'degree');
            return degree.ok ? ok({...state, degree: degree.value}) : degree;
        }
        case 'set-b': {
            const b = typedSecondAngle(action.b, 'b');
            return b.ok ? ok({...state, b: b.value}) : b;
        }
        case 'set-mode': {
            const mode = typedMode(action.mode, 'mode');
            return mode.ok ? ok({...state, mode: mode.value}) : mode;
        }
        case 'set-vectors': {
            if (action.velocity === undefined && action.acceleration === undefined) return fail({field: 'velocity', reason: 'missing'});
            let next = state;
            if (action.velocity !== undefined) {
                const velocity = typedFlag(action.velocity, 'velocity');
                if (!velocity.ok) return velocity;
                next = {...next, velocity: velocity.value};
            }
            if (action.acceleration !== undefined) {
                const acceleration = typedFlag(action.acceleration, 'acceleration');
                if (!acceleration.ok) return acceleration;
                next = {...next, acceleration: acceleration.value};
            }
            return ok(next);
        }
        case 'step': {
            const count = action.count === undefined ? ok(1) : typedInteger(action.count, 'count', {min: 1, max: ANGLE_RANGE.max / STEP_DEGREES});
            if (!count.ok) return count;
            let degrees = state.degrees;
            for (let i = 0; i < count.value; i++) degrees = nextAngle(degrees);
            return ok({...state, degrees});
        }
        default: return fail({field: 'operation', reason: 'missing'});
    }
}

// ---- Exact trigonometric values ----

/** sign * sqrt(radicand) / denominator, the sign 0 meaning 0. */
export interface ExactValue {
    readonly sign: -1 | 0 | 1;
    readonly radicand: 1 | 2 | 3;
    readonly denominator: 1 | 2;
}

const ZERO: ExactValue = {sign: 0, radicand: 1, denominator: 1};
const ONE: ExactValue = {sign: 1, radicand: 1, denominator: 1};
const HALF: ExactValue = {sign: 1, radicand: 1, denominator: 2};
const SQRT2_HALF: ExactValue = {sign: 1, radicand: 2, denominator: 2};
const SQRT3_HALF: ExactValue = {sign: 1, radicand: 3, denominator: 2};
/** (cos, sin) of the angles 0, 30, 45, 60 degrees; 90 degrees follows from the quadrant rotation. */
const FIRST_QUADRANT: Readonly<Record<number, readonly [ExactValue, ExactValue]>> = {
    0: [ONE, ZERO], 30: [SQRT3_HALF, HALF], 45: [SQRT2_HALF, SQRT2_HALF], 60: [HALF, SQRT3_HALF],
};
const negate = (v: ExactValue): ExactValue => (v.sign === 0 ? v : {...v, sign: v.sign === 1 ? -1 : 1});

/** The exact cos and sin of an integer number of degrees that is a multiple of 30 or 45 degrees; undefined at any other angle. */
export function exactTrig(degrees: number): {cos: ExactValue; sin: ExactValue} | undefined {
    if (!Number.isInteger(degrees)) return undefined;
    const d = ((degrees % 360) + 360) % 360;
    const quadrant = Math.floor(d / 90);
    const base = FIRST_QUADRANT[d - 90 * quadrant];
    if (base === undefined) return undefined;
    const [c, s] = base;
    switch (quadrant) {
        case 0: return {cos: c, sin: s};
        case 1: return {cos: negate(s), sin: c};
        case 2: return {cos: negate(c), sin: negate(s)};
        default: return {cos: s, sin: negate(c)};
    }
}

export const exactValueOf = (v: ExactValue): number => (v.sign * Math.sqrt(v.radicand)) / v.denominator;

// ---- Derived numbers ----

export interface EulerCircleDerived {
    readonly state: EulerCircleState;
    /** theta in radians (computed from the whole degrees). */
    readonly radians: number;
    /** t = theta / omega in radians per unit speed, computed. */
    readonly time: number;
    /** The period 2 pi / omega. */
    readonly period: number;
    /** e^(i theta): exact integers at multiples of 90 degrees, computed doubles elsewhere. */
    readonly position: Complex;
    /** True when the coordinates of `position` are exact integers (multiples of 90 degrees). */
    readonly positionExact: boolean;
    /** The exact cos and sin where they are (multiples of 30 and 45 degrees). */
    readonly exact: {cos: ExactValue; sin: ExactValue} | undefined;
    /** i omega z, computed from `position`. */
    readonly velocity: Complex;
    /** -omega^2 z, computed from `position`. */
    readonly acceleration: Complex;
    /** |velocity|, computed (it is omega). */
    readonly speed: number;
    /** The angle in degrees between position and velocity, computed from the vectors (it is 90). */
    readonly angleBetween: number;
    /** The partial sum of degree N of the series for e^(i theta), computed by the term recurrence. */
    readonly partialSum: Complex;
    /** The distance |partial sum - (cos theta, sin theta)|, computed. */
    readonly error: number;
    readonly partialInsideView: boolean;
    readonly product: EulerCircleProduct;
}

/** The product mode's numbers (always derived; drawn and read out only in the product mode). */
export interface EulerCircleProduct {
    /** The second point e^(i b). */
    readonly second: Complex;
    /** theta + b in degrees, 0..720, and the same reduced to 0..359. */
    readonly sumDegrees: number;
    readonly reducedDegrees: number;
    /** The product point e^(i(theta + b)) = (cos, sin) of the reduced angle: exact integers on the axes. */
    readonly point: Complex;
    /** The same product by complex multiplication of e^(i theta) and e^(i b), computed. */
    readonly byMultiplication: Complex;
    /** The exact cos and sin of the reduced angle where they are (multiples of 30 and 45 degrees). */
    readonly exact: {cos: ExactValue; sin: ExactValue} | undefined;
    /** True when the coordinates of `point` are exact integers (multiples of 90 degrees). */
    readonly pointExact: boolean;
}

/** The board shows [-SERIES_VIEW_LIMIT, SERIES_VIEW_LIMIT] in both axes for the partial sum; one beyond is not drawn. */
export const SERIES_VIEW_LIMIT = 2.4;
export const insideSeriesView = (p: Complex): boolean => Math.abs(p.re) <= SERIES_VIEW_LIMIT && Math.abs(p.im) <= SERIES_VIEW_LIMIT;

export function deriveEulerCircle(state: EulerCircleState): EulerCircleDerived {
    const {degrees, omega, degree} = state;
    const radians = (degrees * Math.PI) / 180;
    const point = eulerPoint(degrees);
    const position: Complex = {re: point.re, im: point.im};
    const velocity: Complex = {re: norm(-omega * position.im), im: norm(omega * position.re)};
    const acceleration: Complex = {re: norm(-omega * omega * position.re), im: norm(-omega * omega * position.im)};
    const speed = Math.hypot(velocity.re, velocity.im);
    const dot = position.re * velocity.re + position.im * velocity.im;
    const cross = position.re * velocity.im - position.im * velocity.re;
    const partialSum = expSeriesPartial(radians, degree);
    const secondPoint = eulerPoint(state.b);
    const sumDegrees = degrees + state.b;
    const reducedDegrees = sumDegrees % 360;
    const productPoint = eulerPoint(reducedDegrees);
    const product: EulerCircleProduct = {
        second: {re: secondPoint.re, im: secondPoint.im}, sumDegrees, reducedDegrees, point: {re: productPoint.re, im: productPoint.im},
        byMultiplication: {re: norm(position.re * secondPoint.re - position.im * secondPoint.im), im: norm(position.re * secondPoint.im + position.im * secondPoint.re)},
        exact: exactTrig(reducedDegrees), pointExact: productPoint.exact,
    };
    return {
        state, radians, time: radians / omega, period: (2 * Math.PI) / omega, position, positionExact: point.exact, exact: exactTrig(degrees),
        velocity, acceleration, speed, angleBetween: (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI,
        partialSum, error: Math.hypot(partialSum.re - position.re, partialSum.im - position.im), partialInsideView: insideSeriesView(partialSum), product,
    };
}
