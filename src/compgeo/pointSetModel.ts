import {GRID_COORD_LIMIT, GridPoint, isGridCoordinate} from './grid';
import type {Interval} from './sweep/intervalSweep';
import {SWEEP_MAX_INTERVALS, SWEEP_MAX_SEGMENTS} from './sweep/limits';
import type {Segment} from './sweep/segments';

/**
 * The stored description of the shared point-set/polygon graph (ADR 0021). Coordinates are integer grid units;
 * one grid step is 2^gridStepExponent board units. Selection, drag and hover state are transient and not stored.
 * The point limit is an option, not part of the model.
 */
export type PointSetMode = 'points' | 'polygon' | 'segments' | 'intervals';

export interface PointSetModel {
    readonly mode: PointSetMode;
    /**
     * Polygon mode: the vertices in order. Duplicates are allowed. Segments mode: the endpoints as consecutive pairs
     * (p[2k], p[2k+1]) of segment k, so the count is always even. Intervals mode: the same pairing; both endpoints of
     * interval k lie on the row y = k + 1, which is rewritten by every edit and is never user data.
     */
    readonly points: readonly GridPoint[];
    /** Polygon mode only; always false in points and segments mode. */
    readonly closed: boolean;
    /** Board units per grid step is 2^gridStepExponent. */
    readonly gridStepExponent: number;
}

/** The closed list of overlay names a lesson scene may switch (`point-set` `set-overlay`); a graph accepts only the ones it owns. */
export const POINT_SET_OVERLAY_NAMES = ['grid', 'turn', 'fan', 'lattice', 'trace', 'hull', 'values', 'reflex', 'triangulation', 'colouring', 'guards'] as const;
export type PointSetOverlayName = typeof POINT_SET_OVERLAY_NAMES[number];

export const DEFAULT_POINT_LIMIT = 40;
/** The sweep lesson family uses a smaller limit. */
export const SWEEP_POINT_LIMIT = 12;
/** Grid steps from 2^-8 to 2^8 board units: fine enough for sub-unit lessons, coarse enough for large boards. */
export const MIN_GRID_STEP_EXPONENT = -8;
export const MAX_GRID_STEP_EXPONENT = 8;

export interface PointSetOptions {
    readonly pointLimit?: number;
    /** Segments mode: the most segments (default SWEEP_MAX_SEGMENTS, 12); `pointLimit` does not apply there. */
    readonly segmentLimit?: number;
    /** Largest allowed |coordinate| (default GRID_COORD_LIMIT); the sweep graphs pass SWEEP_COORD_LIMIT (2^10). */
    readonly coordinateLimit?: number;
    /** Parsing only: accept `mode: 'segments'`. Default false, so a graph without segment support rejects it as before. */
    readonly allowSegments?: boolean;
    /** Intervals mode: the most intervals (default SWEEP_MAX_INTERVALS, 10); `pointLimit` does not apply there. */
    readonly intervalLimit?: number;
    /** Parsing only: accept `mode: 'intervals'`. Default false, like `allowSegments`. */
    readonly allowIntervals?: boolean;
}

export const DEFAULT_SEGMENT_LIMIT = SWEEP_MAX_SEGMENTS;
export const DEFAULT_INTERVAL_LIMIT = SWEEP_MAX_INTERVALS;

export const EMPTY_POINT_SET_MODEL: PointSetModel = {mode: 'points', points: [], closed: false, gridStepExponent: 0};

export function isGridStepExponent(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value)
        && value >= MIN_GRID_STEP_EXPONENT && value <= MAX_GRID_STEP_EXPONENT;
}

/** Rounds half away from zero (so -0.5 -> -1, 0.5 -> 1), with no negative zero in the result. */
function roundHalfAway(value: number): number {
    const r = Math.sign(value) * Math.round(Math.abs(value));
    return r === 0 ? 0 : r;
}

/** Nearest grid point to a board position. The result is not range-checked; use `isGridPoint` before storing it. */
export function snapToGrid(boardX: number, boardY: number, exponent: number): GridPoint {
    const scale = 2 ** -exponent;
    return {x: roundHalfAway(boardX * scale), y: roundHalfAway(boardY * scale)};
}

export function gridToBoard(point: GridPoint, exponent: number): {readonly x: number; readonly y: number} {
    const scale = 2 ** exponent;
    return {x: point.x * scale, y: point.y * scale};
}

export type PointSetEditRefusal = 'limit' | 'range' | 'index' | 'mode';
export type PointSetEditResult =
    | {readonly ok: true; readonly model: PointSetModel}
    | {readonly ok: false; readonly reason: PointSetEditRefusal};

const ok = (model: PointSetModel): PointSetEditResult => ({ok: true, model});
const refuse = (reason: PointSetEditRefusal): PointSetEditResult => ({ok: false, reason});

function validIndex(model: PointSetModel, index: number, max = model.points.length - 1): boolean {
    return Number.isInteger(index) && index >= 0 && index <= max;
}

function inRange(point: GridPoint, options: PointSetOptions = {}): boolean {
    if (!isGridCoordinate(point.x) || !isGridCoordinate(point.y)) return false;
    const limit = options.coordinateLimit;
    return limit === undefined || (Math.abs(point.x) <= limit && Math.abs(point.y) <= limit);
}

/** The segments of a segments-mode model, s_k = (points[2k], points[2k+1]); empty in the other modes. */
export function segmentsOf(model: PointSetModel): Segment[] {
    if (model.mode !== 'segments') return [];
    const segments: Segment[] = [];
    for (let i = 0; i + 1 < model.points.length; i += 2) segments.push({a: model.points[i], b: model.points[i + 1]});
    return segments;
}

/**
 * Segments mode only: appends the segment (a, b). Refuses with 'mode' elsewhere, 'limit' at `segmentLimit` segments and
 * 'range' when an endpoint is outside the grid or `coordinateLimit`; nothing is clipped. A zero-length segment is allowed.
 */
export function addSegment(model: PointSetModel, a: GridPoint, b: GridPoint, options: PointSetOptions = {}): PointSetEditResult {
    if (model.mode !== 'segments') return refuse('mode');
    if (model.points.length >= 2 * (options.segmentLimit ?? DEFAULT_SEGMENT_LIMIT)) return refuse('limit');
    if (!inRange(a, options) || !inRange(b, options)) return refuse('range');
    return ok({...model, points: [...model.points, {x: a.x, y: a.y}, {x: b.x, y: b.y}]});
}

/** Segments mode only: removes segment k (both endpoints). Refuses with 'mode' elsewhere and 'index' for a missing segment. */
export function removeSegment(model: PointSetModel, k: number): PointSetEditResult {
    if (model.mode !== 'segments') return refuse('mode');
    if (!Number.isInteger(k) || k < 0 || 2 * k + 1 >= model.points.length) return refuse('index');
    return ok({...model, points: model.points.filter((_, i) => i >> 1 !== k)});
}

/** The row (y) of interval k. */
export const intervalRow = (k: number): number => k + 1;

/** The label of interval k: a, b, c, ... (at most 10 intervals, so one letter). */
export const intervalLetter = (k: number): string => String.fromCharCode(97 + k);

/** Intervals mode: the same points with every endpoint of interval k put on its row. */
function withRows(points: readonly GridPoint[]): GridPoint[] {
    return points.map((p, i) => ({x: p.x, y: intervalRow(i >> 1)}));
}

/** The intervals of an intervals-mode model, {lo, hi} sorted per pair; empty in the other modes. */
export function intervalsOf(model: PointSetModel): Interval[] {
    if (model.mode !== 'intervals') return [];
    const intervals: Interval[] = [];
    for (let i = 0; i + 1 < model.points.length; i += 2) {
        const [a, b] = [model.points[i].x, model.points[i + 1].x];
        intervals.push({lo: Math.min(a, b), hi: Math.max(a, b)});
    }
    return intervals;
}

/**
 * Intervals mode only: appends the interval with endpoints at x = a and x = b on the next row. Refuses with 'mode' elsewhere,
 * 'limit' at `intervalLimit` intervals and 'range' for an x outside the grid or `coordinateLimit` (never clipped).
 */
export function addInterval(model: PointSetModel, a: number, b: number, options: PointSetOptions = {}): PointSetEditResult {
    if (model.mode !== 'intervals') return refuse('mode');
    if (model.points.length >= 2 * (options.intervalLimit ?? DEFAULT_INTERVAL_LIMIT)) return refuse('limit');
    const row = intervalRow(model.points.length >> 1);
    if (!inRange({x: a, y: row}, options) || !inRange({x: b, y: row}, options)) return refuse('range');
    return ok({...model, points: [...model.points, {x: a, y: row}, {x: b, y: row}]});
}

/** Intervals mode only: removes interval k; the later intervals move up one row. Refuses with 'mode' elsewhere and 'index' for a missing interval. */
export function removeInterval(model: PointSetModel, k: number): PointSetEditResult {
    if (model.mode !== 'intervals') return refuse('mode');
    if (!Number.isInteger(k) || k < 0 || 2 * k + 1 >= model.points.length) return refuse('index');
    return ok({...model, points: withRows(model.points.filter((_, i) => i >> 1 !== k))});
}

/** Appends a point. Refuses with 'limit' at the limit, 'range' for a point outside the grid and 'mode' in segments mode (use `addSegment`). */
export function addPoint(model: PointSetModel, point: GridPoint, options: PointSetOptions = {}): PointSetEditResult {
    if (model.mode === 'segments' || model.mode === 'intervals') return refuse('mode');
    if (model.points.length >= (options.pointLimit ?? DEFAULT_POINT_LIMIT)) return refuse('limit');
    if (!inRange(point, options)) return refuse('range');
    return ok({...model, points: [...model.points, {x: point.x, y: point.y}]});
}

/** Polygon mode only: inserts before `index` (index = length appends). */
export function insertPoint(model: PointSetModel, index: number, point: GridPoint, options: PointSetOptions = {}): PointSetEditResult {
    if (model.mode !== 'polygon') return refuse('mode');
    if (!validIndex(model, index, model.points.length)) return refuse('index');
    if (model.points.length >= (options.pointLimit ?? DEFAULT_POINT_LIMIT)) return refuse('limit');
    if (!inRange(point, options)) return refuse('range');
    const points = [...model.points];
    points.splice(index, 0, {x: point.x, y: point.y});
    return ok({...model, points});
}

/** In segments mode removing an endpoint removes its whole segment, so the count stays even. */
export function removePoint(model: PointSetModel, index: number): PointSetEditResult {
    if (!validIndex(model, index)) return refuse('index');
    if (model.mode === 'segments') return removeSegment(model, index >> 1);
    if (model.mode === 'intervals') return removeInterval(model, index >> 1);
    return ok({...model, points: model.points.filter((_, i) => i !== index)});
}

export function movePoint(model: PointSetModel, index: number, point: GridPoint, options: PointSetOptions = {}): PointSetEditResult {
    if (!validIndex(model, index)) return refuse('index');
    // Intervals mode: only x is data; the row is rewritten from the index, whatever y was asked for.
    const target = model.mode === 'intervals' ? {x: point.x, y: intervalRow(index >> 1)} : point;
    if (!inRange(target, options)) return refuse('range');
    return ok({...model, points: model.points.map((p, i) => i === index ? {x: target.x, y: target.y} : p)});
}

/** Moves a point by whole grid steps; refuses with 'range' beyond GRID_COORD_LIMIT or for non-integer steps. */
export function nudgePoint(model: PointSetModel, index: number, dx: number, dy: number, options: PointSetOptions = {}): PointSetEditResult {
    if (!validIndex(model, index)) return refuse('index');
    if (!Number.isInteger(dx) || !Number.isInteger(dy)) return refuse('range');
    const p = model.points[index];
    // Intervals mode: dy is ignored (the row is not editable), so a purely vertical nudge leaves the model as it is.
    const moved = {x: p.x + dx, y: model.mode === 'intervals' ? p.y : p.y + dy};
    if (!inRange(moved, options)) return refuse('range');
    return ok({...model, points: model.points.map((q, i) => i === index ? moved : q)});
}

export function clearPoints(model: PointSetModel): PointSetModel {
    return {...model, points: [], closed: false};
}

/**
 * Reverses the vertex order of the polygon but keeps the first vertex first: (v0, v1, ..., vn-1) becomes (v0, vn-1, ..., v1).
 * The polygon is the same set of points and edges, only traversed the other way, so every fan triangle from v0 and the
 * signed area change sign while the area does not. Applying it twice restores the model. Mode, closedness and grid step stay.
 */
export function reverseVertices(model: PointSetModel): PointSetModel {
    if (model.points.length < 2 || model.mode === 'segments' || model.mode === 'intervals') return model;
    const [first, ...rest] = model.points;
    return {...model, points: [first, ...rest.reverse()]};
}

/** Closing is a polygon-mode property: refuses with 'mode' to close in points mode. Opening is always allowed. */
export function setClosed(model: PointSetModel, closed: boolean): PointSetEditResult {
    if (closed && model.mode !== 'polygon') return refuse('mode');
    return ok({...model, closed});
}

/**
 * Keeps the points; the polygon is left open and switching to points mode clears `closed`. Switching to segments mode
 * keeps the longest even prefix of the points (a trailing odd point is dropped, since every segment needs two endpoints);
 * switching from segments to another mode keeps all points. Switching to intervals mode does the same and puts every pair on
 * its row (the y of the old points is lost). Segment and interval limits are not applied here; the graph validates.
 */
export function setMode(model: PointSetModel, mode: PointSetMode): PointSetModel {
    const paired = (mode === 'segments' || mode === 'intervals') && model.points.length % 2 === 1 ? model.points.slice(0, -1) : model.points;
    const points = mode === 'intervals' ? withRows(paired) : paired;
    return {...model, mode, points, closed: false};
}

export type PointSetParseReason =
    | 'not-an-object'
    | 'unknown-mode'
    | 'points-not-array'
    | 'too-many-points'
    | 'point-not-object'
    | 'non-integer-coordinate'
    | 'coordinate-out-of-range'
    | 'invalid-grid-step'
    | 'closed-not-boolean'
    | 'closed-in-points-mode'
    | 'odd-segment-endpoints'
    | 'odd-interval-endpoints'
    | 'interval-row-mismatch';

export type PointSetParseResult =
    | {readonly ok: true; readonly model: PointSetModel}
    | {
        readonly ok: false;
        readonly reason: PointSetParseReason;
        /** Set for 'too-many-points'. */
        readonly limit?: number;
        /** Set for 'coordinate-out-of-range' (GRID_COORD_LIMIT). */
        readonly bound?: number;
    };

const fail = (reason: PointSetParseReason, extra: {limit?: number; bound?: number} = {}): PointSetParseResult =>
    ({ok: false, reason, ...extra});

/** Missing `closed` means false and a missing `gridStepExponent` means 0; unknown properties are dropped. */
export function parsePointSetModel(data: unknown, options: PointSetOptions = {}): PointSetParseResult {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return fail('not-an-object');
    const {mode, points, closed, gridStepExponent} = data as Record<string, unknown>;
    if (mode !== 'points' && mode !== 'polygon' && !(mode === 'segments' && options.allowSegments === true)
        && !(mode === 'intervals' && options.allowIntervals === true)) return fail('unknown-mode');
    if (!Array.isArray(points)) return fail('points-not-array');
    // The segments limit counts segments but the refusal reports points, like every other mode.
    const limit = mode === 'segments' ? 2 * (options.segmentLimit ?? DEFAULT_SEGMENT_LIMIT)
        : mode === 'intervals' ? 2 * (options.intervalLimit ?? DEFAULT_INTERVAL_LIMIT) : options.pointLimit ?? DEFAULT_POINT_LIMIT;
    if (points.length > limit) return fail('too-many-points', {limit});
    if (gridStepExponent !== undefined && !isGridStepExponent(gridStepExponent)) return fail('invalid-grid-step');
    if (closed !== undefined && typeof closed !== 'boolean') return fail('closed-not-boolean');
    if (closed === true && mode !== 'polygon') return fail('closed-in-points-mode');
    if (mode === 'segments' && points.length % 2 === 1) return fail('odd-segment-endpoints');
    if (mode === 'intervals' && points.length % 2 === 1) return fail('odd-interval-endpoints');
    const coordinateBound = options.coordinateLimit ?? GRID_COORD_LIMIT;
    const parsed: GridPoint[] = [];
    for (const entry of points) {
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return fail('point-not-object');
        const {x, y} = entry as Record<string, unknown>;
        for (const c of [x, y]) {
            // Integer check first, so a huge integer such as 1e20 reports the range, not "non-integer".
            if (typeof c !== 'number' || !Number.isInteger(c)) return fail('non-integer-coordinate');
            if (Math.abs(c) > coordinateBound) return fail('coordinate-out-of-range', {bound: coordinateBound});
        }
        parsed.push({x: x as number, y: y as number});
    }
    if (mode === 'intervals' && parsed.some((p, i) => p.y !== intervalRow(i >> 1))) return fail('interval-row-mismatch');
    return {ok: true, model: {mode, points: parsed, closed: closed === true, gridStepExponent: gridStepExponent ?? 0}};
}

/** The model is plain JSON data; this returns an independent copy suitable for JSON.stringify. */
export function serializePointSetModel(model: PointSetModel): PointSetModel {
    return {...model, points: model.points.map(p => ({x: p.x, y: p.y}))};
}
