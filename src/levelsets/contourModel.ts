import {CATALOGUE, CATALOGUE_IDS, type CatalogueId, type Window2} from './functions2';
import {DESCENT_H_MAX, DESCENT_H_MIN} from './descent';

/**
 * Stored state of the contour graph, LS1-LS4 (docs/adr/0053-level-sets-contour-graph-marching-squares-exact-lp.md sections 1 and 4;
 * docs/specs/level-sets-optimization-lessons.md, Implementation Decisions "State"). Pure TypeScript: no React, JSXGraph or
 * localization, so errors are codes (`field` plus `reason`, with the limits) and the graph words them.
 *
 * Everything stored is an integer or a name on a grid: the level is c = L/8, a probe coordinate is P/20, a descent start coordinate is
 * S/4 (the 1/4 grid of the spec), the step is h = H/100 with H in 1..30 (the descent kernel's range), a line parameter is x = T/4 and a
 * circle angle is 2 pi K/48 (so pi/4 is K = 6). Derived values (contours, gradient, descent path and its classification, tangency,
 * the `valley` convergence rule) are recomputed from the validated state by the kernels and never read from a Preset: unknown fields are
 * accepted and dropped. Imported values are never snapped or clamped: an off-range or off-grid value rejects the whole state. Playback
 * (the step counter of the descent) is not stored, so a Preset reopens paused.
 */

export type ContourErrorReason = 'not-an-object' | 'not-finite' | 'off-grid' | 'out-of-range' | 'unknown-value' | 'missing' | 'inconsistent';
export interface ContourError {
    readonly field: string;
    readonly reason: ContourErrorReason;
    /** The accepted integer range for range and grid errors. */
    readonly min?: number;
    readonly max?: number;
    /** The accepted names for `unknown-value` and `missing`, or the names a consistency rule accepts for `inconsistent`. */
    readonly choices?: readonly string[];
}
export type ContourResult<T> = {readonly ok: true; readonly value: T} | {readonly ok: false; readonly error: ContourError};

const ok = <T>(value: T): ContourResult<T> => ({ok: true, value});
const fail = <T>(error: ContourError): ContourResult<T> => ({ok: false, error});
const isRecord = (data: unknown): data is Record<string, unknown> => data !== null && typeof data === 'object' && !Array.isArray(data);
const norm = (n: number) => (n === 0 ? 0 : n); // no -0 in stored state
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export interface IntegerRange {
    readonly min: number;
    readonly max: number;
}

// ---- Choices and ranges ----

/** LS1 level sets, LS2 gradient, LS3 descent, LS4 Lagrange multipliers. */
export const CONTOUR_MODES = ['level-sets', 'gradient', 'descent', 'lagrange'] as const;
export type ContourMode = typeof CONTOUR_MODES[number];

/** LS4 constraints: the line x + 2y = 5 (exact tangency) and the circle x^2 + y^2 = 2 (named tolerance). */
export const CONSTRAINT_IDS = ['line', 'circle'] as const;
export type ConstraintId = typeof CONSTRAINT_IDS[number];
export const CONSTRAINT_LINE = {a: 1, b: 2, c: 5} as const;
export const CONSTRAINT_CIRCLE_R2 = 2;
/** `hills` has no rational gradient, so the exact line tangency is not offered for it. */
export const constraintAccepts = (fn: CatalogueId, constraint: ConstraintId): boolean => constraint === 'circle' || fn !== 'hills';

/** Level c = L/8 (dyadic, so marching squares sees exact doubles); |c| <= 45 covers the largest `valley` value 44 in the window. */
export const LEVEL_RANGE: IntegerRange = {min: -360, max: 360};
export const LEVEL_SCALE = 8;
/** Number of contours drawn upward from the level: c, c + d, c + 2d, ... (1, 5 or 9 are the measured counts; any 1..9 is stored). */
export const LEVEL_COUNT_RANGE: IntegerRange = {min: 1, max: 9};
/** Probe coordinate P/20, within the window of the function (checked as consistency); the widest window is 4. */
export const PROBE_RANGE: IntegerRange = {min: -80, max: 80};
export const PROBE_SCALE = 20;
/** Descent start coordinate S/4 (the 1/4 grid), within the window of the function. */
export const START_RANGE: IntegerRange = {min: -16, max: 16};
export const START_SCALE = 4;
/** Descent step h = H/100 (the kernel's integer range 1..30). */
export const STEP_RANGE: IntegerRange = {min: DESCENT_H_MIN, max: DESCENT_H_MAX};
export const STEP_SCALE = 100;
/**
 * Line parameter: x = T/4 on x + 2y = 5. The point stays inside the LS4 window [-4, 4]^2: y = (5 - x)/2 <= 4 needs x >= -3 and x <= 4,
 * so x in [-3, 4] (the tangency point (1, 2) lies inside with a margin of 2 and 3 to the window sides).
 */
export const LINE_PARAM_RANGE: IntegerRange = {min: -12, max: 16};
export const LINE_PARAM_SCALE = 4;
/** Circle angle: theta = 2 pi K / 48, K in 0..47. */
export const CIRCLE_PARAM_RANGE: IntegerRange = {min: 0, max: 47};
export const CIRCLE_STEPS = 48;

/** LS4 shows every function in the wider window [-4, 4]^2, so the tangency point of the line x + 2y = 5 on the bowl, (1, 2), is well inside. */
export const LAGRANGE_WINDOW_HALF = 4;
/** The window the board and the contours use for a function in a mode (the function's own window, or the wider LS4 one). */
export const contourWindow = (fn: CatalogueId, mode: ContourMode): Window2 => mode === 'lagrange'
    ? {xMin: -LAGRANGE_WINDOW_HALF, xMax: LAGRANGE_WINDOW_HALF, yMin: -LAGRANGE_WINDOW_HALF, yMax: LAGRANGE_WINDOW_HALF}
    : CATALOGUE[fn].window;

export const levelOf = (L: number): number => L / LEVEL_SCALE;
export const probeOf = (P: number): number => P / PROBE_SCALE;
export const startOf = (S: number): number => S / START_SCALE;
export const stepOf = (H: number): number => H / STEP_SCALE;
export const lineParamOf = (T: number): number => T / LINE_PARAM_SCALE;
export const circleAngleOf = (K: number): number => (2 * Math.PI * K) / CIRCLE_STEPS;

/** Half the side of the (square, centred) window of the function: the bound for the probe and the start. */
export const windowHalf = (fn: CatalogueId): number => CATALOGUE[fn].window.xMax;
export const probeFits = (fn: CatalogueId, P: number): boolean => Math.abs(P) <= windowHalf(fn) * PROBE_SCALE;
export const startFits = (fn: CatalogueId, S: number): boolean => Math.abs(S) <= windowHalf(fn) * START_SCALE;

// ---- Field parsers (strict, no snapping) ----

function parseInteger(value: unknown, field: string, range: IntegerRange): ContourResult<number> {
    if (value === undefined || value === null) return fail({field, reason: 'missing', ...range});
    if (!finite(value)) return fail({field, reason: 'not-finite', ...range});
    if (!Number.isInteger(value)) return fail({field, reason: 'off-grid', ...range});
    if (value < range.min || value > range.max) return fail({field, reason: 'out-of-range', ...range});
    return ok(norm(value));
}

function parseChoice<T extends string>(value: unknown, field: string, choices: readonly T[]): ContourResult<T> {
    if (value === undefined || value === null) return fail({field, reason: 'missing', choices});
    const found = choices.find(choice => choice === value);
    return found !== undefined ? ok(found) : fail({field, reason: 'unknown-value', choices});
}

export interface ContourCamera {
    readonly az: number;
    readonly el: number;
    readonly distance: number;
    readonly projection: 'perspective';
    readonly target: readonly [number, number, number];
}

function parseCamera(value: unknown): ContourResult<ContourCamera> {
    if (value === undefined || value === null) return fail({field: 'camera', reason: 'missing'});
    if (!isRecord(value)) return fail({field: 'camera', reason: 'not-an-object'});
    const {az, el, distance, projection, target} = value;
    if (!finite(az)) return fail({field: 'camera.az', reason: az === undefined ? 'missing' : 'not-finite'});
    if (!finite(el)) return fail({field: 'camera.el', reason: el === undefined ? 'missing' : 'not-finite'});
    if (Math.abs(el) > Math.PI / 2) return fail({field: 'camera.el', reason: 'out-of-range'});
    if (!finite(distance)) return fail({field: 'camera.distance', reason: distance === undefined ? 'missing' : 'not-finite'});
    if (distance <= 0) return fail({field: 'camera.distance', reason: 'out-of-range'});
    if (projection !== 'perspective') return fail({field: 'camera.projection', reason: 'unknown-value', choices: ['perspective']});
    if (!Array.isArray(target) || target.length !== 3 || !target.every(finite)) return fail({field: 'camera.target', reason: 'not-finite'});
    return ok({az, el, distance, projection: 'perspective', target: [target[0], target[1], target[2]]});
}

// ---- The state ----

export interface ContourState {
    readonly mode: ContourMode;
    readonly fn: CatalogueId;
    /** Level L in units of 1/8. */
    readonly level: number;
    /** Contours drawn (1..9). */
    readonly levelCount: number;
    /** Probe (x, y) in units of 1/20, inside the window of `fn`. */
    readonly probe: readonly [number, number];
    /** LS2: show the central-difference estimate beside the analytic gradient. */
    readonly numeric: boolean;
    /** Descent start (x, y) in units of 1/4, inside the window of `fn`. */
    readonly start: readonly [number, number];
    /** Descent step H, h = H/100. */
    readonly step: number;
    readonly constraint: ConstraintId;
    /** Line parameter T (x = T/4) for the line constraint. */
    readonly lineParam: number;
    /** Circle angle index K for the circle constraint. */
    readonly circleParam: number;
    readonly camera: ContourCamera;
}

/** LS1 step 1: the bowl and one contour at c = 1; the probe at (0,6; 0,8) of LS2; the LS3 start (2,1) with H = 3; the LS4 line at (1,2). */
export const DEFAULT_CONTOUR_STATE: ContourState = {
    mode: 'level-sets', fn: 'bowl', level: 8, levelCount: 1, probe: [12, 16], numeric: false, start: [8, 4], step: 3,
    constraint: 'line', lineParam: 4, circleParam: 6,
    camera: {az: -0.9, el: 0.5, distance: 9, projection: 'perspective', target: [0, 0, 0]},
};

function parsePair(value: unknown, field: string, range: IntegerRange): ContourResult<readonly [number, number]> {
    if (value === undefined || value === null) return fail({field, reason: 'missing', ...range});
    if (!Array.isArray(value) || value.length !== 2) return fail({field, reason: 'not-an-object'});
    const x = parseInteger(value[0], `${field}[0]`, range);
    if (!x.ok) return x;
    const y = parseInteger(value[1], `${field}[1]`, range);
    if (!y.ok) return y;
    return ok([x.value, y.value] as const);
}

export function parseContourState(data: unknown): ContourResult<ContourState> {
    if (!isRecord(data)) return fail({field: 'state', reason: 'not-an-object'});
    const mode = parseChoice(data.mode, 'mode', CONTOUR_MODES);
    if (!mode.ok) return mode;
    const fn = parseChoice(data.fn, 'fn', CATALOGUE_IDS);
    if (!fn.ok) return fn;
    const level = parseInteger(data.level, 'level', LEVEL_RANGE);
    if (!level.ok) return level;
    const levelCount = parseInteger(data.levelCount, 'levelCount', LEVEL_COUNT_RANGE);
    if (!levelCount.ok) return levelCount;
    const probe = parsePair(data.probe, 'probe', PROBE_RANGE);
    if (!probe.ok) return probe;
    if (data.numeric !== undefined && typeof data.numeric !== 'boolean') return fail({field: 'numeric', reason: 'unknown-value', choices: ['true', 'false']});
    const start = parsePair(data.start, 'start', START_RANGE);
    if (!start.ok) return start;
    const step = parseInteger(data.step, 'step', STEP_RANGE);
    if (!step.ok) return step;
    const constraint = parseChoice(data.constraint, 'constraint', CONSTRAINT_IDS);
    if (!constraint.ok) return constraint;
    const lineParam = parseInteger(data.lineParam, 'lineParam', LINE_PARAM_RANGE);
    if (!lineParam.ok) return lineParam;
    const circleParam = parseInteger(data.circleParam, 'circleParam', CIRCLE_PARAM_RANGE);
    if (!circleParam.ok) return circleParam;
    const camera = parseCamera(data.camera);
    if (!camera.ok) return camera;
    const half = windowHalf(fn.value);
    const bound = (p: readonly [number, number], scale: number) => Math.abs(p[0]) <= half * scale && Math.abs(p[1]) <= half * scale;
    if (!bound(probe.value, PROBE_SCALE)) return fail({field: 'probe', reason: 'inconsistent', min: -half * PROBE_SCALE, max: half * PROBE_SCALE});
    if (!bound(start.value, START_SCALE)) return fail({field: 'start', reason: 'inconsistent', min: -half * START_SCALE, max: half * START_SCALE});
    if (!constraintAccepts(fn.value, constraint.value)) return fail({field: 'constraint', reason: 'inconsistent', choices: ['circle']});
    return ok({
        mode: mode.value, fn: fn.value, level: level.value, levelCount: levelCount.value, probe: probe.value, numeric: data.numeric === true,
        start: start.value, step: step.value, constraint: constraint.value, lineParam: lineParam.value, circleParam: circleParam.value,
        camera: camera.value,
    });
}

/** The state to store in a Preset: only the stored fields, arrays copied. */
export const serializeContourState = (s: ContourState): ContourState => ({
    mode: s.mode, fn: s.fn, level: s.level, levelCount: s.levelCount, probe: [s.probe[0], s.probe[1]], numeric: s.numeric,
    start: [s.start[0], s.start[1]], step: s.step, constraint: s.constraint, lineParam: s.lineParam, circleParam: s.circleParam,
    camera: {az: s.camera.az, el: s.camera.el, distance: s.camera.distance, projection: 'perspective', target: [s.camera.target[0], s.camera.target[1], s.camera.target[2]]},
});

/**
 * A new function: a probe or start outside the new window returns to its default, and a line constraint the function cannot test
 * exactly (`hills`) falls back to the circle. The level is kept.
 */
export function withFunction(state: ContourState, fn: CatalogueId): ContourState {
    if (fn === state.fn) return state;
    return {
        ...state, fn,
        probe: probeFits(fn, state.probe[0]) && probeFits(fn, state.probe[1]) ? state.probe : DEFAULT_CONTOUR_STATE.probe,
        start: startFits(fn, state.start[0]) && startFits(fn, state.start[1]) ? state.start : DEFAULT_CONTOUR_STATE.start,
        constraint: constraintAccepts(fn, state.constraint) ? state.constraint : 'circle',
    };
}
