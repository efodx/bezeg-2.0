import {GridPoint, isGridCoordinate, GRID_COORD_LIMIT} from '../compgeo/grid';
import {
    Angle, angleFromHalfDegrees, angleFromDegrees, angleFromPiMultiple, Axis, HALF_DEGREES_PER_TURN, onAxis, Quadrant, quadrant,
    specialValue, SpecialValue,
} from './angle';
import {cosineRule, sineRule} from './sineCosineRules';
import {solveTriangle, SolveResult, SolveSpec} from './triangleSolver';
import {Point, pointOnCircle} from './unitCircle';

/**
 * Stored state of the two trigonometry graphs (docs/adr/0044-trigonometry-graphs-and-snapped-inputs.md, sections 1 to 3).
 * Pure TypeScript: no React, JSXGraph or localization (messages are English developer text, as in the linear-maps model).
 *
 * Only the fields below are stored. Solutions, ratios, coordinates and readouts come from `deriveUnitCircle` and
 * `deriveTriangle`; a Preset that carries such fields is accepted and they are dropped (unknown properties are ignored).
 * Imported values are never snapped or clamped: an off-grid or out-of-range field rejects the whole state. Input from the
 * UI uses the `snap...Input` functions, which snap and report whether the value moved or was clamped.
 */

// ---- Result type (same shape as the linear-maps model) ----

export type TrigErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'not-boolean' | 'missing';
export interface TrigError {
    readonly field: string;
    readonly reason: TrigErrorReason;
    readonly message: string;
}
export type TrigResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: TrigError};

const ok = <T>(value: T): TrigResult<T> => ({ok: true, value});
const fail = <T>(field: string, reason: TrigErrorReason, message: string): TrigResult<T> =>
    ({ok: false, error: {field, reason, message}});
const isRecord = (data: unknown): data is Record<string, unknown> =>
    data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state

// ---- Ranges ----

export const SIDE_MIN = 0.25;
export const SIDE_MAX = 12;
export const SOLVER_ANGLE_MIN = 1;
export const SOLVER_ANGLE_MAX = 179;

// ---- Field parsers (strict, no snapping) ----

function parseNumber(value: unknown, field: string, unit: string): TrigResult<number> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected ${unit}.`);
    if (typeof value !== 'number' || !Number.isFinite(value)) return fail(field, 'not-finite', `${field} must be a finite number (${unit}).`);
    return ok(value);
}

function parseHalfDegrees(value: unknown, field: string): TrigResult<number> {
    const n = parseNumber(value, field, 'integer half-degrees');
    if (!n.ok) return n;
    if (n.value < 0 || n.value >= HALF_DEGREES_PER_TURN) return fail(field, 'out-of-range', `${field} must be in [0, ${HALF_DEGREES_PER_TURN}) half-degrees.`);
    if (!Number.isInteger(n.value)) return fail(field, 'off-grid', `${field} must be a whole number of half-degrees.`);
    return ok(norm(n.value));
}

function parseSide(value: unknown, field: string): TrigResult<number> {
    const n = parseNumber(value, field, 'a multiple of 1/4');
    if (!n.ok) return n;
    if (n.value < SIDE_MIN || n.value > SIDE_MAX) return fail(field, 'out-of-range', `${field} is outside [${SIDE_MIN}, ${SIDE_MAX}]; sides are multiples of 1/4.`);
    if (!Number.isInteger(n.value * 4)) return fail(field, 'off-grid', `${field} is not a multiple of 1/4; sides are multiples of 1/4 in [${SIDE_MIN}, ${SIDE_MAX}].`);
    return n;
}

function parseSolverAngle(value: unknown, field: string): TrigResult<number> {
    const n = parseNumber(value, field, 'integer degrees');
    if (!n.ok) return n;
    if (n.value < SOLVER_ANGLE_MIN || n.value > SOLVER_ANGLE_MAX) return fail(field, 'out-of-range', `${field} is outside [${SOLVER_ANGLE_MIN}, ${SOLVER_ANGLE_MAX}] degrees.`);
    if (!Number.isInteger(n.value)) return fail(field, 'off-grid', `${field} must be a whole number of degrees.`);
    return n;
}

function parseVertex(value: unknown, field: string): TrigResult<GridPoint> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected {x, y} on the integer grid.`);
    if (!isRecord(value)) return fail(field, 'not-an-object', `${field} must be an object {x, y}.`);
    const out: number[] = [];
    for (const axis of ['x', 'y'] as const) {
        const f = `${field}.${axis}`;
        const n = parseNumber(value[axis], f, 'an integer');
        if (!n.ok) return n;
        if (Math.abs(n.value) > GRID_COORD_LIMIT) return fail(f, 'out-of-range', `${f} is outside [-${GRID_COORD_LIMIT}, ${GRID_COORD_LIMIT}].`);
        if (!isGridCoordinate(n.value)) return fail(f, 'off-grid', `${f} must be an integer grid coordinate.`);
        out.push(norm(n.value));
    }
    return ok({x: out[0], y: out[1]});
}

function parseToggle(value: unknown, field: string): TrigResult<boolean> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected true or false.`);
    return typeof value === 'boolean' ? ok(value) : fail(field, 'not-boolean', `${field} must be true or false.`);
}

function parseChoice<T extends string>(value: unknown, field: string, choices: readonly T[]): TrigResult<T> {
    if (value === undefined || value === null) return fail(field, 'missing', `${field} is missing; expected one of: ${choices.join(', ')}.`);
    return typeof value === 'string' && (choices as readonly string[]).includes(value)
        ? ok(value as T)
        : fail(field, 'unknown-value', `${field} must be one of: ${choices.join(', ')}.`);
}

// ---- Unit circle ----

export interface UnitCircleState {
    /** Integer half-degrees in [0, 720). */
    readonly angle: number;
    /** Second angle of TR2 (beta), same unit. */
    readonly secondAngle: number;
    readonly showSymmetries: boolean;
    readonly showCosine: boolean;
}

/** TR2 default example: alpha = 60 degrees, beta = 45 degrees. */
export const DEFAULT_UNIT_CIRCLE_STATE: UnitCircleState = {angle: 120, secondAngle: 90, showSymmetries: false, showCosine: false};

export function parseUnitCircleState(data: unknown): TrigResult<UnitCircleState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The unit circle state must be an object.');
    const angle = parseHalfDegrees(data.angle, 'angle');
    if (!angle.ok) return angle;
    const secondAngle = parseHalfDegrees(data.secondAngle, 'secondAngle');
    if (!secondAngle.ok) return secondAngle;
    const showSymmetries = parseToggle(data.showSymmetries, 'showSymmetries');
    if (!showSymmetries.ok) return showSymmetries;
    const showCosine = parseToggle(data.showCosine, 'showCosine');
    if (!showCosine.ok) return showCosine;
    return ok({angle: angle.value, secondAngle: secondAngle.value, showSymmetries: showSymmetries.value, showCosine: showCosine.value});
}

/** The state to store in a Preset: only the stored fields. */
export const serializeUnitCircleState = (s: UnitCircleState): UnitCircleState => ({
    angle: s.angle, secondAngle: s.secondAngle, showSymmetries: s.showSymmetries, showCosine: s.showCosine,
});

export interface UnitCircleDerived {
    readonly angle: Angle;
    readonly point: Point;
    readonly quadrant: Quadrant | undefined;
    readonly axis: Axis | undefined;
    readonly special: SpecialValue | undefined;
}

/** Everything shown for the first angle, recomputed from the validated state. */
export function deriveUnitCircle(state: UnitCircleState): UnitCircleDerived {
    const angle = angleFromHalfDegrees(state.angle);
    return {angle, point: pointOnCircle(angle), quadrant: quadrant(angle), axis: onAxis(angle), special: specialValue(angle)};
}

// ---- Triangle ----

export const TRIANGLE_MODES = ['sides', 'circle', 'solve'] as const;
export type TriangleMode = typeof TRIANGLE_MODES[number];
export const SOLVE_DATA_TYPES = ['sss', 'sas', 'asa', 'ssa'] as const;
export type SolveDataType = typeof SOLVE_DATA_TYPES[number];

export interface TriangleState {
    readonly mode: TriangleMode;
    readonly A: GridPoint;
    readonly B: GridPoint;
    readonly C: GridPoint;
    /** Solver data type and its inputs (`data.type` is the data type). */
    readonly data: SolveSpec;
}

/** TR3/TR4 triangle (0,0), (7,0), (2,4) and the TR5 SSS example 5, 6, 7. */
export const DEFAULT_TRIANGLE_STATE: TriangleState = {
    mode: 'sides', A: {x: 0, y: 0}, B: {x: 7, y: 0}, C: {x: 2, y: 4}, data: {type: 'sss', a: 5, b: 6, c: 7},
};

/** Default inputs of each data type (TR5 default examples; SSA with a = 5). */
export const DEFAULT_SOLVE_DATA: Readonly<Record<SolveDataType, SolveSpec>> = {
    sss: {type: 'sss', a: 5, b: 6, c: 7},
    sas: {type: 'sas', b: 5, c: 7, angleA: 60},
    asa: {type: 'asa', angleA: 40, angleB: 60, c: 8},
    ssa: {type: 'ssa', a: 5, b: 8, angleA: 30},
};

function parseSolveData(data: unknown): TrigResult<SolveSpec> {
    if (data === undefined || data === null) return fail('data', 'missing', 'data is missing; expected {type, ...inputs}.');
    if (!isRecord(data)) return fail('data', 'not-an-object', 'data must be an object {type, ...inputs}.');
    const type = parseChoice(data.type, 'data.type', SOLVE_DATA_TYPES);
    if (!type.ok) return type;
    const side = (name: string) => parseSide(data[name], `data.${name}`);
    const angle = (name: string) => parseSolverAngle(data[name], `data.${name}`);
    switch (type.value) {
        case 'sss': {
            const a = side('a'), b = side('b'), c = side('c');
            return !a.ok ? a : !b.ok ? b : !c.ok ? c : ok({type: 'sss', a: a.value, b: b.value, c: c.value});
        }
        case 'sas': {
            const b = side('b'), c = side('c'), angleA = angle('angleA');
            return !b.ok ? b : !c.ok ? c : !angleA.ok ? angleA : ok({type: 'sas', b: b.value, c: c.value, angleA: angleA.value});
        }
        case 'asa': {
            const angleA = angle('angleA'), angleB = angle('angleB'), c = side('c');
            return !angleA.ok ? angleA : !angleB.ok ? angleB : !c.ok ? c : ok({type: 'asa', angleA: angleA.value, angleB: angleB.value, c: c.value});
        }
        case 'ssa': {
            const a = side('a'), b = side('b'), angleA = angle('angleA');
            return !a.ok ? a : !b.ok ? b : !angleA.ok ? angleA : ok({type: 'ssa', a: a.value, b: b.value, angleA: angleA.value});
        }
    }
}

export function parseTriangleState(data: unknown): TrigResult<TriangleState> {
    if (!isRecord(data)) return fail('state', 'not-an-object', 'The triangle state must be an object.');
    const mode = parseChoice(data.mode, 'mode', TRIANGLE_MODES);
    if (!mode.ok) return mode;
    const A = parseVertex(data.A, 'A');
    if (!A.ok) return A;
    const B = parseVertex(data.B, 'B');
    if (!B.ok) return B;
    const C = parseVertex(data.C, 'C');
    if (!C.ok) return C;
    const solve = parseSolveData(data.data);
    if (!solve.ok) return solve;
    return ok({mode: mode.value, A: A.value, B: B.value, C: C.value, data: solve.value});
}

export const serializeTriangleState = (s: TriangleState): TriangleState => ({
    mode: s.mode, A: {x: s.A.x, y: s.A.y}, B: {x: s.B.x, y: s.B.y}, C: {x: s.C.x, y: s.C.y}, data: {...s.data},
});

export interface TriangleDerived {
    readonly sine: ReturnType<typeof sineRule>;
    readonly cosine: ReturnType<typeof cosineRule>;
    readonly solution: SolveResult;
}

/** Sine and cosine rule readouts and the solver result, recomputed from the validated state. */
export const deriveTriangle = (state: TriangleState): TriangleDerived => ({
    sine: sineRule(state.A, state.B, state.C),
    cosine: cosineRule(state.A, state.B, state.C),
    solution: solveTriangle(state.data),
});

// ---- UI input path (snaps, reports adjustment) ----

export interface SnappedInput {
    readonly value: number;
    /** True only when the range limit moved the rounded value (rounding alone is `adjusted`). */
    readonly clamped: boolean;
    /** True when the stored value differs from the input. */
    readonly adjusted: boolean;
}

const clampTo = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Typed degrees to integer half-degrees in [0, 720) (wraps, never clamps). Non-finite input is an error. */
export function snapAngleInput(degrees: number, field = 'angle'): TrigResult<{readonly halfDegrees: number; readonly adjusted: boolean}> {
    if (typeof degrees !== 'number' || !Number.isFinite(degrees)) return fail(field, 'not-finite', `${field} must be a finite number of degrees.`);
    const halfDegrees = angleFromDegrees(degrees).halfDegrees;
    return ok({halfDegrees, adjusted: halfDegrees !== degrees * 2});
}

/** Typed multiple of pi to integer half-degrees. */
export function snapPiMultipleInput(multiple: number, field = 'angle'): TrigResult<{readonly halfDegrees: number; readonly adjusted: boolean}> {
    if (typeof multiple !== 'number' || !Number.isFinite(multiple)) return fail(field, 'not-finite', `${field} must be a finite multiple of pi.`);
    const halfDegrees = angleFromPiMultiple(multiple).halfDegrees;
    return ok({halfDegrees, adjusted: halfDegrees !== multiple * 360});
}

/** Typed side to the nearest quarter, clamped to [1/4, 12]. */
export function snapSideInput(input: number, field = 'side'): TrigResult<SnappedInput> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const rounded = Math.round(input * 4) / 4;
    const value = clampTo(rounded, SIDE_MIN, SIDE_MAX);
    return ok({value, clamped: value !== rounded, adjusted: value !== input});
}

/** Typed solver angle to the nearest integer degree, clamped to [1, 179]. */
export function snapSolverAngleInput(input: number, field = 'angle'): TrigResult<SnappedInput> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number of degrees.`);
    const rounded = Math.round(input);
    const value = clampTo(rounded, SOLVER_ANGLE_MIN, SOLVER_ANGLE_MAX);
    return ok({value, clamped: value !== rounded, adjusted: value !== input});
}

/** Dragged or typed vertex coordinate to the nearest integer, clamped to the exact-predicate grid limit. */
export function snapVertexInput(input: number, field = 'coordinate'): TrigResult<SnappedInput> {
    if (typeof input !== 'number' || !Number.isFinite(input)) return fail(field, 'not-finite', `${field} must be a finite number.`);
    const rounded = Math.round(input);
    const value = norm(clampTo(rounded, -GRID_COORD_LIMIT, GRID_COORD_LIMIT));
    return ok({value, clamped: value !== rounded, adjusted: value !== input});
}
