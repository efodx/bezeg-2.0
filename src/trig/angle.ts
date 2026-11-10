/** Angle state in integer half-degrees (ADR 0044 section 3). Pure; no React, JSXGraph or localization. */

export const HALF_DEGREES_PER_TURN = 720;

export type Angle = {readonly halfDegrees: number};
export type Quadrant = 1 | 2 | 3 | 4;
export type Axis = 'positive-x' | 'positive-y' | 'negative-x' | 'negative-y';

const wrap = (h: number): number => ((h % HALF_DEGREES_PER_TURN) + HALF_DEGREES_PER_TURN) % HALF_DEGREES_PER_TURN;

/** Integer half-degrees, wrapped to [0,720). Rejects non-integers and non-finite values. */
export const angleFromHalfDegrees = (halfDegrees: number): Angle => {
    if (!Number.isInteger(halfDegrees)) throw new RangeError(`halfDegrees must be a finite integer, got ${halfDegrees}`);
    return {halfDegrees: wrap(halfDegrees)};
};

const snapped = (halfDegrees: number): Angle => {
    if (!Number.isFinite(halfDegrees)) throw new RangeError(`angle must be finite, got ${halfDegrees}`);
    return angleFromHalfDegrees(Math.round(halfDegrees));
};

/** Snaps to the nearest half-degree. */
export const angleFromDegrees = (degrees: number): Angle => snapped(degrees * 2);

/** Angle of `multiple`*pi radians, snapped to the nearest half-degree (pi = 360 half-degrees). */
export const angleFromPiMultiple = (multiple: number): Angle => snapped(multiple * 360);

export const degreesOf = (a: Angle): number => a.halfDegrees / 2;

/** Computed double: pi h / 360. */
export const toRadians = (a: Angle): number => (Math.PI * a.halfDegrees) / 360;

/** Quadrant I-IV as 1..4, or undefined when the state is on an axis. Integer test. */
export const quadrant = (a: Angle): Quadrant | undefined => {
    const h = a.halfDegrees;
    if (h % 180 === 0) return undefined;
    return (Math.floor(h / 180) + 1) as Quadrant;
};

/** Which axis the state lies on, or undefined. Integer test. */
export const onAxis = (a: Angle): Axis | undefined => {
    switch (a.halfDegrees) {
        case 0: return 'positive-x';
        case 180: return 'positive-y';
        case 360: return 'negative-x';
        case 540: return 'negative-y';
        default: return undefined;
    }
};

export type SpecialValue = {readonly sin: string; readonly cos: string};

const S = '\\frac{\\sqrt{3}}{2}';
const Q = '\\frac{\\sqrt{2}}{2}';
const H = '\\frac{1}{2}';
const neg = (s: string): string => (s === '0' ? s : `-${s}`);

/** Exact (sin, cos) of the reference angles 0, 30, 45, 60, 90 degrees, keyed by half-degrees. */
const FIRST_QUADRANT: Readonly<Record<number, SpecialValue>> = {
    0: {sin: '0', cos: '1'},
    60: {sin: H, cos: S},
    90: {sin: Q, cos: Q},
    120: {sin: S, cos: H},
    180: {sin: '1', cos: '0'},
};

/**
 * Exact LaTeX text of sin and cos for multiples of 30 and 45 degrees (closed table by reflection
 * from the first quadrant); undefined for every other angle.
 */
export const specialValue = (a: Angle): SpecialValue | undefined => {
    const h = a.halfDegrees;
    if (h % 60 !== 0 && h % 90 !== 0) return undefined;
    // Reduce to the first quadrant: reference angle r in [0,180] half-degrees.
    const q = Math.floor(h / 180);
    const m = h - q * 180;
    const r = q % 2 === 0 ? m : 180 - m;
    const base = FIRST_QUADRANT[r];
    if (!base) return undefined;
    const cosNeg = q === 1 || q === 2;
    const sinNeg = q >= 2;
    return {sin: sinNeg ? neg(base.sin) : base.sin, cos: cosNeg ? neg(base.cos) : base.cos};
};

/** Image under reflection in the x-axis: 720 - h. */
export const reflectInXAxis = (a: Angle): Angle => angleFromHalfDegrees(HALF_DEGREES_PER_TURN - a.halfDegrees);
/** Image under reflection in the y-axis: 360 - h. */
export const reflectInYAxis = (a: Angle): Angle => angleFromHalfDegrees(360 - a.halfDegrees);
/** Image under the half-turn about the origin: h + 360. */
export const halfTurn = (a: Angle): Angle => angleFromHalfDegrees(a.halfDegrees + 360);
/** Sum of two angles, integer addition. */
export const addAngles = (a: Angle, b: Angle): Angle => angleFromHalfDegrees(a.halfDegrees + b.halfDegrees);
