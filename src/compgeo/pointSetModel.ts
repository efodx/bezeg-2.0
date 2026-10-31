import {GRID_COORD_LIMIT, GridPoint, isGridCoordinate} from './grid';

/**
 * The stored description of the shared point-set/polygon graph (ADR 0021). Coordinates are integer grid units;
 * one grid step is 2^gridStepExponent board units. Selection, drag and hover state are transient and not stored.
 * The point limit is an option, not part of the model.
 */
export type PointSetMode = 'points' | 'polygon';

export interface PointSetModel {
    readonly mode: PointSetMode;
    /** Polygon mode: the vertices in order. Duplicates are allowed. */
    readonly points: readonly GridPoint[];
    /** Polygon mode only; always false in points mode. */
    readonly closed: boolean;
    /** Board units per grid step is 2^gridStepExponent. */
    readonly gridStepExponent: number;
}

export const DEFAULT_POINT_LIMIT = 40;
/** The sweep lesson family uses a smaller limit. */
export const SWEEP_POINT_LIMIT = 12;
/** Grid steps from 2^-8 to 2^8 board units: fine enough for sub-unit lessons, coarse enough for large boards. */
export const MIN_GRID_STEP_EXPONENT = -8;
export const MAX_GRID_STEP_EXPONENT = 8;

export interface PointSetOptions {
    readonly pointLimit?: number;
}

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

function inRange(point: GridPoint): boolean {
    return isGridCoordinate(point.x) && isGridCoordinate(point.y);
}

/** Appends a point. Refuses with 'limit' at the limit and 'range' for a point outside the grid. */
export function addPoint(model: PointSetModel, point: GridPoint, options: PointSetOptions = {}): PointSetEditResult {
    if (model.points.length >= (options.pointLimit ?? DEFAULT_POINT_LIMIT)) return refuse('limit');
    if (!inRange(point)) return refuse('range');
    return ok({...model, points: [...model.points, {x: point.x, y: point.y}]});
}

/** Polygon mode only: inserts before `index` (index = length appends). */
export function insertPoint(model: PointSetModel, index: number, point: GridPoint, options: PointSetOptions = {}): PointSetEditResult {
    if (model.mode !== 'polygon') return refuse('mode');
    if (!validIndex(model, index, model.points.length)) return refuse('index');
    if (model.points.length >= (options.pointLimit ?? DEFAULT_POINT_LIMIT)) return refuse('limit');
    if (!inRange(point)) return refuse('range');
    const points = [...model.points];
    points.splice(index, 0, {x: point.x, y: point.y});
    return ok({...model, points});
}

export function removePoint(model: PointSetModel, index: number): PointSetEditResult {
    if (!validIndex(model, index)) return refuse('index');
    return ok({...model, points: model.points.filter((_, i) => i !== index)});
}

export function movePoint(model: PointSetModel, index: number, point: GridPoint): PointSetEditResult {
    if (!validIndex(model, index)) return refuse('index');
    if (!inRange(point)) return refuse('range');
    return ok({...model, points: model.points.map((p, i) => i === index ? {x: point.x, y: point.y} : p)});
}

/** Moves a point by whole grid steps; refuses with 'range' beyond GRID_COORD_LIMIT or for non-integer steps. */
export function nudgePoint(model: PointSetModel, index: number, dx: number, dy: number): PointSetEditResult {
    if (!validIndex(model, index)) return refuse('index');
    if (!Number.isInteger(dx) || !Number.isInteger(dy)) return refuse('range');
    const p = model.points[index];
    const moved = {x: p.x + dx, y: p.y + dy};
    if (!inRange(moved)) return refuse('range');
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
    if (model.points.length < 2) return model;
    const [first, ...rest] = model.points;
    return {...model, points: [first, ...rest.reverse()]};
}

/** Closing is a polygon-mode property: refuses with 'mode' to close in points mode. Opening is always allowed. */
export function setClosed(model: PointSetModel, closed: boolean): PointSetEditResult {
    if (closed && model.mode !== 'polygon') return refuse('mode');
    return ok({...model, closed});
}

/** Keeps the points; the polygon is left open and switching to points mode clears `closed`. */
export function setMode(model: PointSetModel, mode: PointSetMode): PointSetModel {
    return {...model, mode, closed: false};
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
    | 'closed-in-points-mode';

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
    if (mode !== 'points' && mode !== 'polygon') return fail('unknown-mode');
    if (!Array.isArray(points)) return fail('points-not-array');
    const limit = options.pointLimit ?? DEFAULT_POINT_LIMIT;
    if (points.length > limit) return fail('too-many-points', {limit});
    if (gridStepExponent !== undefined && !isGridStepExponent(gridStepExponent)) return fail('invalid-grid-step');
    if (closed !== undefined && typeof closed !== 'boolean') return fail('closed-not-boolean');
    if (closed === true && mode === 'points') return fail('closed-in-points-mode');
    const parsed: GridPoint[] = [];
    for (const entry of points) {
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return fail('point-not-object');
        const {x, y} = entry as Record<string, unknown>;
        for (const c of [x, y]) {
            // Integer check first, so a huge integer such as 1e20 reports the range, not "non-integer".
            if (typeof c !== 'number' || !Number.isInteger(c)) return fail('non-integer-coordinate');
            if (Math.abs(c) > GRID_COORD_LIMIT) return fail('coordinate-out-of-range', {bound: GRID_COORD_LIMIT});
        }
        parsed.push({x: x as number, y: y as number});
    }
    return {ok: true, model: {mode, points: parsed, closed: closed === true, gridStepExponent: gridStepExponent ?? 0}};
}

/** The model is plain JSON data; this returns an independent copy suitable for JSON.stringify. */
export function serializePointSetModel(model: PointSetModel): PointSetModel {
    return {...model, points: model.points.map(p => ({x: p.x, y: p.y}))};
}
