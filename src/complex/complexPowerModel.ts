import {Complex} from '../analysis/complex';
import {COMPLEX_POWER_GRID_MAX, COMPLEX_POWER_MAX, exactIntegerPower, polarPower} from '../analysis/complexPower';

/**
 * Stored state of the complex-power graph (spec M6, de Moivre; docs/adr/0058). Pure TypeScript: no React, JSXGraph or localization,
 * so errors are codes (`field`, `reason` and the accepted range and step) and the graph words them.
 *
 * z = (A + B i) / 20 lies on the 0.05 grid in [-2, 2], so A and B are integers in [-40, 40] (the units of the exact kernel
 * `exactIntegerPower`); n is an integer from 1 to 8. Imported and typed values are never snapped or clamped: an off-grid or
 * out-of-range value is refused; only a drag snaps. Unknown fields of a file are accepted and dropped. The file holds z as the two
 * real coordinates `re` and `im` and the exponent `n`.
 */

export type ComplexPowerErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'missing';
export interface ComplexPowerError {
    readonly field: string;
    readonly reason: ComplexPowerErrorReason;
    /** The accepted range and step, in the file's units, for range and grid errors. */
    readonly min?: number;
    readonly max?: number;
    readonly step?: number;
}
export type ComplexPowerResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: ComplexPowerError};

const ok = <T>(value: T): ComplexPowerResult<T> => ({ok: true, value});
const fail = <T>(error: ComplexPowerError): ComplexPowerResult<T> => ({ok: false, error});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

export interface IntegerRange {
    readonly min: number;
    readonly max: number;
}

/** Grid units per 1: z = (A + B i) / 20. */
export const Z_SCALE = 20;
export const Z_RANGE: IntegerRange = {min: -COMPLEX_POWER_GRID_MAX, max: COMPLEX_POWER_GRID_MAX};
export const N_RANGE: IntegerRange = {min: 1, max: COMPLEX_POWER_MAX};
export const coordinateOf = (units: number): number => units / Z_SCALE;

/** A typed value (a number field, a lesson action): on the grid and inside the range, otherwise refused; never rounded or clamped. */
function typedInteger(value: unknown, field: string, scale: number, range: IntegerRange): ComplexPowerResult<number> {
    const bounds = {min: range.min / scale, max: range.max / scale, step: 1 / scale};
    if (value === undefined || value === null) return fail({field, reason: 'missing', ...bounds});
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail({field, reason: 'not-finite', ...bounds});
    const scaled = value * scale;
    const rounded = Math.round(scaled);
    if (Math.abs(scaled - rounded) > 1e-6) return fail({field, reason: 'off-grid', ...bounds});
    if (rounded < range.min || rounded > range.max) return fail({field, reason: 'out-of-range', ...bounds});
    return ok(norm(rounded));
}

/** A typed coordinate of z in real units: its grid units. */
export const typedCoordinate = (value: unknown, field = 're'): ComplexPowerResult<number> => typedInteger(value, field, Z_SCALE, Z_RANGE);
/** A typed exponent: an integer from 1 to 8. */
export const typedExponent = (value: unknown, field = 'n'): ComplexPowerResult<number> => typedInteger(value, field, 1, N_RANGE);

/** A drag only: the nearest grid units of a coordinate, clamped into [-2, 2]; undefined for a non-finite coordinate. */
export function snapDragCoordinate(coordinate: number): number | undefined {
    if (typeof coordinate !== 'number' || !Number.isFinite(coordinate)) return undefined;
    return norm(Math.min(Z_RANGE.max, Math.max(Z_RANGE.min, Math.round(coordinate * Z_SCALE))));
}

export interface ComplexPowerState {
    /** Re z = A / 20. */
    readonly A: number;
    /** Im z = B / 20. */
    readonly B: number;
    /** The exponent: the powers z, z^2, ..., z^n are drawn. */
    readonly n: number;
}

/** M6 step 1 and the default example: z = 1 + i, n = 5 (z^5 = -4 - 4i). */
export const DEFAULT_COMPLEX_POWER_STATE: ComplexPowerState = {A: 20, B: 20, n: 5};

export const zOf = (s: ComplexPowerState): Complex => ({re: coordinateOf(s.A), im: coordinateOf(s.B)});

export function parseComplexPowerState(data: unknown): ComplexPowerResult<ComplexPowerState> {
    if (!isRecord(data)) return fail({field: 'state', reason: 'not-an-object'});
    const A = typedCoordinate(data.re, 're');
    if (!A.ok) return A;
    const B = typedCoordinate(data.im, 'im');
    if (!B.ok) return B;
    const n = typedExponent(data.n, 'n');
    if (!n.ok) return n;
    return ok({A: A.value, B: B.value, n: n.value});
}

/** The state to store in a Preset or file: only the stored fields, z as real coordinates. */
export const serializeComplexPowerState = (s: ComplexPowerState): {re: number; im: number; n: number} => ({re: coordinateOf(s.A), im: coordinateOf(s.B), n: s.n});

// ---- Scene actions (lesson content): validated strictly, never snapped ----

export type ComplexPowerOperation = 'set-z' | 'set-n' | 'step';
export interface ComplexPowerAction {
    readonly kind: 'complex-power';
    readonly operation: ComplexPowerOperation;
    readonly re?: number;
    readonly im?: number;
    readonly n?: number;
    readonly count?: number;
}

/** The state after a scene action. `step` adds `count` (default 1, from 1 to 7) to n and stops at 8; a payload that is not valid is a content error. */
export function applyComplexPowerAction(state: ComplexPowerState, action: unknown): ComplexPowerResult<ComplexPowerState> {
    if (!isRecord(action)) return fail({field: 'action', reason: 'not-an-object'});
    switch (action.operation) {
        case 'set-z': {
            const A = typedCoordinate(action.re, 're');
            if (!A.ok) return A;
            const B = typedCoordinate(action.im, 'im');
            if (!B.ok) return B;
            return ok({...state, A: A.value, B: B.value});
        }
        case 'set-n': {
            const n = typedExponent(action.n, 'n');
            return n.ok ? ok({...state, n: n.value}) : n;
        }
        case 'step': {
            const count = action.count === undefined ? ok(1) : typedInteger(action.count, 'count', 1, {min: 1, max: N_RANGE.max - 1});
            return count.ok ? ok({...state, n: Math.min(N_RANGE.max, state.n + count.value)}) : count;
        }
        default: return fail({field: 'operation', reason: 'missing'});
    }
}

// ---- Exact numbers ----

export interface ExactFraction {
    readonly numerator: number;
    readonly denominator: number;
}

export function gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) [x, y] = [y, x % y];
    return x;
}

/** numerator / denominator in lowest terms, the sign on the numerator, no -0. */
export function reduceFraction(numerator: number, denominator: number): ExactFraction {
    if (numerator === 0) return {numerator: 0, denominator: 1};
    const g = gcd(numerator, denominator);
    return {numerator: numerator / g, denominator: denominator / g};
}

/** coefficient * sqrt(radicand) / denominator in lowest terms; radicand 1 means a rational number. */
export interface ExactRadical {
    readonly coefficient: number;
    readonly radicand: number;
    readonly denominator: number;
}

/** The largest s with s^2 dividing m, and m / s^2 (m is a positive integer below 3201). */
function squareFactor(m: number): {s: number; q: number} {
    let s = 1;
    for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; s *= d; }
    return {s, q: m};
}

/** |z|^n = (A^2 + B^2)^(n/2) / 20^n as a radical: exact because every entry stays below 2^53 for n <= 8. */
export function exactModulus(A: number, B: number, n: number): ExactRadical {
    const m = A * A + B * B;
    if (m === 0) return {coefficient: 0, radicand: 1, denominator: 1};
    const {s, q} = squareFactor(m);
    const coefficient = s ** n * q ** Math.floor(n / 2);
    const radicand = n % 2 === 1 ? q : 1;
    const g = gcd(coefficient, Z_SCALE ** n);
    return {coefficient: coefficient / g, radicand, denominator: Z_SCALE ** n / g};
}

// ---- Derived numbers ----

export interface ComplexPowerDerived {
    readonly z: Complex;
    readonly n: number;
    /** z = 0: no argument, every power is 0. */
    readonly zero: boolean;
    /** z^k for k = 1..n, rounded doubles of the exact entries. */
    readonly powers: readonly Complex[];
    /** The exact real and imaginary parts of z^n. */
    readonly exactRe: ExactFraction;
    readonly exactIm: ExactFraction;
    readonly exactModulus: ExactRadical;
    /** |z|^n, computed. */
    readonly modulus: number;
    /** n times arg z in degrees, not wrapped; computed. Undefined for z = 0. */
    readonly unwrappedDegrees: number | undefined;
    /** The principal argument of z^n in (-180, 180] degrees; computed. Undefined for z = 0. */
    readonly principalDegrees: number | undefined;
    /** Exact decisions in integer grid units. */
    readonly isReal: boolean;
    readonly onUnitCircle: boolean;
    readonly isOne: boolean;
}

const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export function deriveComplexPower(state: ComplexPowerState): ComplexPowerDerived {
    const {A, B, n} = state;
    const z = zOf(state);
    const powers: Complex[] = [];
    for (let k = 1; k <= n; k++) {
        const e = exactIntegerPower(A, B, k);
        powers.push({re: e.re / Z_SCALE ** k, im: e.im / Z_SCALE ** k});
    }
    const e = exactIntegerPower(A, B, n);
    const denominator = Z_SCALE ** n;
    const polar = polarPower(z, n);
    const exactRe = reduceFraction(e.re, denominator);
    const exactIm = reduceFraction(e.im, denominator);
    return {
        z, n, zero: A === 0 && B === 0, powers, exactRe, exactIm, exactModulus: exactModulus(A, B, n), modulus: polar.modulus,
        unwrappedDegrees: polar.unwrappedAngle === undefined ? undefined : toDegrees(polar.unwrappedAngle),
        principalDegrees: polar.principalAngle === undefined ? undefined : toDegrees(polar.principalAngle),
        // z^n is real exactly when the integer imaginary part vanishes; |z| = 1 exactly when A^2 + B^2 = 400 (the squares of the entries of z^n would pass 2^53).
        isReal: e.im === 0, onUnitCircle: A * A + B * B === Z_SCALE * Z_SCALE, isOne: e.im === 0 && e.re === denominator,
    };
}

// ---- Drawing: the view and the powers beyond it ----

/** The board shows [-VIEW_LIMIT, VIEW_LIMIT] in both axes for the powers; a power outside is drawn as an arrow with its modulus as text. */
export const VIEW_LIMIT = 2.5;
export const insideView = (p: Complex): boolean => Math.abs(p.re) <= VIEW_LIMIT && Math.abs(p.im) <= VIEW_LIMIT;

/** The arrow for a power outside the view: it points from the origin toward the power and ends just inside the view's edge. */
export function arrowToward(p: Complex): {tail: Complex; tip: Complex} {
    const reach = Math.max(Math.abs(p.re), Math.abs(p.im));
    const factor = reach === 0 ? 0 : (0.96 * VIEW_LIMIT) / reach;
    const tip = {re: p.re * factor, im: p.im * factor};
    return {tail: {re: tip.re * 0.8, im: tip.im * 0.8}, tip};
}

const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'] as const;
/** A non-negative integer in superscript digits. */
export const superscript = (n: number): string => String(Math.max(0, Math.floor(n))).replace(/\d/g, digit => SUPERSCRIPTS[Number(digit)]);
