import type {Point2} from './interpolation';
import {toTenths} from './descriptiveStatistics';
import {correlation, type CorrelationResult, type CorrelationStatus} from './correlation';
import {LSQ_COORDINATE_LIMIT} from './leastSquaresModel';

/*
 * The model of lesson P5 (correlation and the regression line, spec probability-statistics-lessons.md): 2-20 points in the
 * user's order, a residual display flag and an x-on-y line flag. This module owns validity (a `CorrelationIssue` is data, never
 * text) and the derived view; r and both lines come from the kernel `correlation.ts` (nothing is solved or re-derived here).
 * No React, JSXGraph or localization.
 *
 * Limits: every coordinate is an integer tenth within +-LSQ_COORDINATE_LIMIT. The minimum count is 2 on purpose (the graph
 * wants 3, but the too-few state must stay reachable); r is disabled below 3 by the kernel status 'too-few'. An edit value
 * is snapped to tenths (half tenths away from zero); a non-finite or out-of-range value is refused, never clamped. A stored
 * (imported) coordinate must already be on the tenth grid: import refuses instead of repairing.
 */

export const CORRELATION_POINTS_MIN = 2;
export const CORRELATION_POINTS_MAX = 20;
export const CORRELATION_COORDINATE_LIMIT = LSQ_COORDINATE_LIMIT;
/** Keyboard/drag step of a point coordinate (one tenth). */
export const CORRELATION_STEP = 0.1;

export type CorrelationPoint = readonly [number, number];

export interface CorrelationModel {
    readonly points: readonly CorrelationPoint[];
    /** Draw the vertical residual segments to the y-on-x line. */
    readonly residuals: boolean;
    /** Also draw the x-on-y line. */
    readonly xOnY: boolean;
}

export const CORRELATION_EXAMPLE_IDS = ['default', 'outlier', 'parabola', 'parabola-right', 'ring'] as const;
export type CorrelationExampleId = typeof CORRELATION_EXAMPLE_IDS[number];
export const isCorrelationExampleId = (value: unknown): value is CorrelationExampleId =>
    typeof value === 'string' && (CORRELATION_EXAMPLE_IDS as readonly string[]).includes(value);

export const CORRELATION_EXAMPLES: Readonly<Record<CorrelationExampleId, readonly CorrelationPoint[]>> = {
    'default': [[0, 1], [1, 2], [2, 2], [3, 4]],
    'outlier': [[0, 1], [1, 2], [2, 2], [3, 8]],
    'parabola': [[-3, 9], [-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4], [3, 9]],
    'parabola-right': [[0, 0], [1, 1], [2, 4], [3, 9]],
    'ring': [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [2, -2], [-2, 2], [-2, -2]],
};

export const DEFAULT_CORRELATION_MODEL: CorrelationModel = {
    points: CORRELATION_EXAMPLES['default'],
    residuals: true,
    xOnY: false,
};

const samePoints = (a: readonly CorrelationPoint[], b: readonly CorrelationPoint[]): boolean =>
    a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);

/** The example whose points the model holds exactly (flags ignored), if any. */
export function correlationExampleOf(model: CorrelationModel): CorrelationExampleId | undefined {
    return CORRELATION_EXAMPLE_IDS.find(id => samePoints(CORRELATION_EXAMPLES[id], model.points));
}

export type CorrelationIssue =
    /** Not an array of CORRELATION_POINTS_MIN..CORRELATION_POINTS_MAX entries (import), or an add/remove at the limit. */
    | { readonly kind: 'points'; readonly min: number; readonly max: number }
    /** A point that is not a pair of finite numbers within +-limit (never clamped); index is the point. */
    | { readonly kind: 'coordinate'; readonly index: number; readonly limit: number }
    /** A stored coordinate off the tenth grid (import only; edits snap). */
    | { readonly kind: 'grid'; readonly index: number }
    /** An edit index outside 0..count-1. */
    | { readonly kind: 'index'; readonly count: number }
    | { readonly kind: 'flag'; readonly field: 'residuals' | 'xOnY' }
    | { readonly kind: 'example'; readonly allowed: readonly string[] };

export type CorrelationCheck =
    | { readonly ok: true; readonly model: CorrelationModel }
    | { readonly ok: false; readonly issue: CorrelationIssue | undefined };

export type CorrelationEdit =
    | { readonly ok: true; readonly model: CorrelationModel }
    | { readonly ok: false; readonly issue: CorrelationIssue };

const inRange = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= CORRELATION_COORDINATE_LIMIT;
const onGrid = (v: number): boolean => Math.abs(10 * v - Math.round(10 * v)) <= 1e-9;
const pointsIssue = (): CorrelationIssue => ({kind: 'points', min: CORRELATION_POINTS_MIN, max: CORRELATION_POINTS_MAX});
const isPair = (p: unknown): p is readonly [number, number] => Array.isArray(p) && p.length === 2 && inRange(p[0]) && inRange(p[1]);

/**
 * The validity rule of a stored model, checked in the order points (count), coordinates (type and range), grid, residuals,
 * xOnY. A non-object gives `issue: undefined` (the generic message). Unknown properties are dropped; nothing is clamped; the
 * points are copied.
 */
export function checkCorrelationModel(data: unknown): CorrelationCheck {
    const reject = (issue: CorrelationIssue | undefined): CorrelationCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {points, residuals, xOnY} = data as Record<string, unknown>;
    if (!Array.isArray(points) || points.length < CORRELATION_POINTS_MIN || points.length > CORRELATION_POINTS_MAX) return reject(pointsIssue());
    for (let index = 0; index < points.length; index++) {
        if (!isPair(points[index])) return reject({kind: 'coordinate', index, limit: CORRELATION_COORDINATE_LIMIT});
    }
    for (let index = 0; index < points.length; index++) {
        const p = points[index] as readonly [number, number];
        if (!onGrid(p[0]) || !onGrid(p[1])) return reject({kind: 'grid', index});
    }
    if (typeof residuals !== 'boolean') return reject({kind: 'flag', field: 'residuals'});
    if (typeof xOnY !== 'boolean') return reject({kind: 'flag', field: 'xOnY'});
    return {
        ok: true,
        model: {points: (points as CorrelationPoint[]).map(p => [toTenths(p[0]) / 10, toTenths(p[1]) / 10] as const), residuals, xOnY},
    };
}

export function parseCorrelationModel(data: unknown): CorrelationModel | undefined {
    const check = checkCorrelationModel(data);
    return check.ok ? check.model : undefined;
}

/** Moves point `index` to `value` ([x, y], snapped to tenths). A bad index, non-pair, non-finite or out-of-range value is refused. */
export function moveCorrelationPoint(model: CorrelationModel, index: unknown, value: unknown): CorrelationEdit {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= model.points.length) {
        return {ok: false, issue: {kind: 'index', count: model.points.length}};
    }
    const bad: CorrelationEdit = {ok: false, issue: {kind: 'coordinate', index, limit: CORRELATION_COORDINATE_LIMIT}};
    if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'number' || typeof value[1] !== 'number') return bad;
    if (!Number.isFinite(value[0]) || !Number.isFinite(value[1])) return bad;
    const x = toTenths(value[0]) / 10;
    const y = toTenths(value[1]) / 10;
    if (!inRange(x) || !inRange(y)) return bad;
    const old = model.points[index];
    if (old[0] === x && old[1] === y) return {ok: true, model};
    return {ok: true, model: {...model, points: model.points.map((p, i) => i === index ? [x, y] as const : p)}};
}

/**
 * Appends a point one unit right of the last point's x at its y (one unit left when that would pass the coordinate limit);
 * refused at the maximum count.
 */
export function addCorrelationPoint(model: CorrelationModel): CorrelationEdit {
    if (model.points.length >= CORRELATION_POINTS_MAX) return {ok: false, issue: pointsIssue()};
    const [lx, ly] = model.points[model.points.length - 1];
    const x = lx + 1 <= CORRELATION_COORDINATE_LIMIT ? lx + 1 : lx - 1;
    return {ok: true, model: {...model, points: [...model.points, [toTenths(x) / 10, ly] as const]}};
}

/** Removes point `index` (the last one by default); refused at the minimum count or for a bad index. */
export function removeCorrelationPoint(model: CorrelationModel, index: unknown = model.points.length - 1): CorrelationEdit {
    if (model.points.length <= CORRELATION_POINTS_MIN) return {ok: false, issue: pointsIssue()};
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= model.points.length) {
        return {ok: false, issue: {kind: 'index', count: model.points.length}};
    }
    return {ok: true, model: {...model, points: model.points.filter((_, i) => i !== index)}};
}

export function setCorrelationResiduals(model: CorrelationModel, value: unknown): CorrelationEdit {
    if (typeof value !== 'boolean') return {ok: false, issue: {kind: 'flag', field: 'residuals'}};
    return {ok: true, model: value === model.residuals ? model : {...model, residuals: value}};
}

export function setCorrelationXOnY(model: CorrelationModel, value: unknown): CorrelationEdit {
    if (typeof value !== 'boolean') return {ok: false, issue: {kind: 'flag', field: 'xOnY'}};
    return {ok: true, model: value === model.xOnY ? model : {...model, xOnY: value}};
}

/** Replaces the points with an example's (flags kept). */
export function chooseCorrelationExample(model: CorrelationModel, id: unknown): CorrelationEdit {
    if (!isCorrelationExampleId(id)) return {ok: false, issue: {kind: 'example', allowed: CORRELATION_EXAMPLE_IDS}};
    return {ok: true, model: {...model, points: CORRELATION_EXAMPLES[id].map(p => [p[0], p[1]] as const)}};
}

export type CorrelationBounds = readonly [left: number, top: number, right: number, bottom: number];

export const CORRELATION_VIEW_MARGIN = 1;
export const CORRELATION_VIEW_MIN_SPAN = 6;

/**
 * A deterministic view [left, top, right, bottom] covering all points: each axis spans the data range plus
 * CORRELATION_VIEW_MARGIN on both sides, at least CORRELATION_VIEW_MIN_SPAN wide, centred on the data range. Not clamped:
 * the data are already within +-the coordinate limit.
 */
export function fitCorrelationView(points: readonly CorrelationPoint[]): CorrelationBounds {
    const span = (values: number[]): [number, number] => {
        const lo = Math.min(...values);
        const hi = Math.max(...values);
        const half = Math.max(CORRELATION_VIEW_MIN_SPAN, hi - lo + 2 * CORRELATION_VIEW_MARGIN) / 2;
        const centre = (lo + hi) / 2;
        return [centre - half, centre + half];
    };
    const [left, right] = span(points.map(p => p[0]));
    const [bottom, top] = span(points.map(p => p[1]));
    return [left, top, right, bottom];
}

export interface ResidualSegment {
    readonly from: Point2;
    readonly to: Point2;
}

export interface CorrelationView {
    readonly result: CorrelationResult;
    readonly status: CorrelationStatus;
    /** Vertical segments from each point to the y-on-x line; empty when there is no such line. */
    readonly residualSegments: readonly ResidualSegment[];
    /** [x0, y0, x1, y1] across the view's x range; undefined when the line does not exist. */
    readonly yOnXLine: readonly [number, number, number, number] | undefined;
    /** x = intercept + slope y drawn across the view's y range, as [x0, y0, x1, y1]; undefined when it does not exist. */
    readonly xOnYLine: readonly [number, number, number, number] | undefined;
    readonly bounds: CorrelationBounds;
}

export function correlationView(model: CorrelationModel): CorrelationView {
    const result = correlation(model.points);
    const bounds = fitCorrelationView(model.points);
    const [left, top, right, bottom] = bounds;
    const {yOnX, xOnY} = result;
    const residualSegments = yOnX
        ? model.points.map(p => ({from: [p[0], p[1]] as Point2, to: [p[0], yOnX.intercept + yOnX.slope * p[0]] as Point2}))
        : [];
    return {
        result,
        status: result.status,
        residualSegments,
        yOnXLine: yOnX ? [left, yOnX.intercept + yOnX.slope * left, right, yOnX.intercept + yOnX.slope * right] : undefined,
        xOnYLine: xOnY ? [xOnY.intercept + xOnY.slope * bottom, bottom, xOnY.intercept + xOnY.slope * top, top] : undefined,
        bounds,
    };
}
