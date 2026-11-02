import {INTERPOLATION_POINTS_MAX, INTERPOLATION_POINTS_MIN, Point2} from './interpolation';
import {
    evaluatePolynomial, fitPolynomial, LEAST_SQUARES_LESSON_DEGREE_MAX, LeastSquaresFit, lineResidualSumOfSquares,
} from './leastSquares';

/*
 * The model of lesson I4 (least squares, `interp-least-squares`): the data points (draggable and typed), the degree of the
 * fitted polynomial, a manual line mode with its own slope and intercept, and two display switches. This module owns validity
 * (a `LeastSquaresIssue` is data, never text; the words live in `graphs/functions/leastSquaresMessages`) and the mathematics
 * the graph draws. Every fit comes from the kernel `leastSquares` (QR); nothing is solved here.
 *
 * Degree rule: 1 <= degree <= min(points - 1, 5). The model never holds a degree outside it: an edit or a file with a larger
 * degree is refused, and removing a point clamps the degree to points - 1 (the fit is then still determined).
 */

export const LSQ_POINTS_MIN = INTERPOLATION_POINTS_MIN;
export const LSQ_POINTS_MAX = INTERPOLATION_POINTS_MAX;
export const LSQ_DEGREE_MIN = 1;
/** Coordinates of a data point lie in [-limit, limit]. */
export const LSQ_COORDINATE_LIMIT = 20;
export const LSQ_SLOPE_LIMIT = 10;
export const LSQ_INTERCEPT_LIMIT = 20;
/** Dragging snaps a point to this grid. */
export const LSQ_DRAG_STEP = 0.1;

export type LsqPoint = readonly [number, number];

export interface LeastSquaresModel {
    readonly points: readonly LsqPoint[];
    readonly degree: number;
    /** Manual line mode: the drawn line and its residuals are y = intercept + slope x instead of the fit. */
    readonly manualLine: boolean;
    readonly slope: number;
    readonly intercept: number;
    readonly showSquares: boolean;
    readonly showNormalEquations: boolean;
}

export const DEFAULT_LEAST_SQUARES_POINTS: readonly LsqPoint[] = [[0, 1], [1, 2], [2, 2], [3, 4]];

export const DEFAULT_LEAST_SQUARES_MODEL: LeastSquaresModel = {
    points: DEFAULT_LEAST_SQUARES_POINTS, degree: 1, manualLine: false, slope: 1, intercept: 1, showSquares: true, showNormalEquations: false,
};

export type LeastSquaresIssue =
    | { readonly kind: 'points'; readonly min: number; readonly max: number }
    | { readonly kind: 'coordinate'; readonly index: number; readonly limit: number }
    | { readonly kind: 'degree'; readonly min: number; readonly max: number }
    | { readonly kind: 'line'; readonly field: 'slope' | 'intercept'; readonly limit: number }
    | { readonly kind: 'flag'; readonly field: 'manualLine' | 'showSquares' | 'showNormalEquations' };

export type LeastSquaresCheck =
    | { readonly ok: true; readonly model: LeastSquaresModel }
    | { readonly ok: false; readonly issue: LeastSquaresIssue | undefined };

export type LeastSquaresEdit =
    | { readonly ok: true; readonly model: LeastSquaresModel }
    | { readonly ok: false; readonly issue: LeastSquaresIssue };

/** The largest allowed degree for a number of points. */
export const lsqDegreeMax = (pointCount: number): number => Math.max(LSQ_DEGREE_MIN, Math.min(pointCount - 1, LEAST_SQUARES_LESSON_DEGREE_MAX));

const inRange = (value: unknown, limit: number): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;
const isDegree = (value: unknown, pointCount: number): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= LSQ_DEGREE_MIN && value <= lsqDegreeMax(pointCount);

const pointsIssue = (): LeastSquaresIssue => ({kind: 'points', min: LSQ_POINTS_MIN, max: LSQ_POINTS_MAX});
const degreeIssue = (pointCount: number): LeastSquaresIssue => ({kind: 'degree', min: LSQ_DEGREE_MIN, max: lsqDegreeMax(pointCount)});

/** The first point that is not a pair of finite numbers within the coordinate limit, as an issue; undefined when all are fine. */
function pointIssue(points: readonly unknown[]): Extract<LeastSquaresIssue, { kind: 'coordinate' }> | undefined {
    for (let index = 0; index < points.length; index++) {
        const p = points[index];
        if (!Array.isArray(p) || p.length !== 2 || !inRange(p[0], LSQ_COORDINATE_LIMIT) || !inRange(p[1], LSQ_COORDINATE_LIMIT)) {
            return {kind: 'coordinate', index, limit: LSQ_COORDINATE_LIMIT};
        }
    }
    return undefined;
}

/**
 * The validity rule of a stored model. Rules are checked in the order points, degree, slope, intercept, flags. A non-object
 * gives `issue: undefined` (the generic message). Unknown properties are dropped; nothing is clamped or rounded.
 */
export function checkLeastSquaresModel(data: unknown): LeastSquaresCheck {
    const reject = (issue: LeastSquaresIssue | undefined): LeastSquaresCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {points, degree, manualLine, slope, intercept, showSquares, showNormalEquations} = data as Record<string, unknown>;
    if (!Array.isArray(points) || points.length < LSQ_POINTS_MIN || points.length > LSQ_POINTS_MAX) return reject(pointsIssue());
    const bad = pointIssue(points);
    if (bad) return reject(bad);
    if (!isDegree(degree, points.length)) return reject(degreeIssue(points.length));
    if (!inRange(slope, LSQ_SLOPE_LIMIT)) return reject({kind: 'line', field: 'slope', limit: LSQ_SLOPE_LIMIT});
    if (!inRange(intercept, LSQ_INTERCEPT_LIMIT)) return reject({kind: 'line', field: 'intercept', limit: LSQ_INTERCEPT_LIMIT});
    if (typeof manualLine !== 'boolean') return reject({kind: 'flag', field: 'manualLine'});
    if (typeof showSquares !== 'boolean') return reject({kind: 'flag', field: 'showSquares'});
    if (typeof showNormalEquations !== 'boolean') return reject({kind: 'flag', field: 'showNormalEquations'});
    return {
        ok: true,
        model: {points: (points as LsqPoint[]).map(p => [p[0], p[1]] as const), degree, manualLine, slope, intercept, showSquares, showNormalEquations},
    };
}

export function parseLeastSquaresModel(data: unknown): LeastSquaresModel | undefined {
    const check = checkLeastSquaresModel(data);
    return check.ok ? check.model : undefined;
}

export function changeLsqDegree(model: LeastSquaresModel, value: unknown): LeastSquaresEdit {
    if (!isDegree(value, model.points.length)) return {ok: false, issue: degreeIssue(model.points.length)};
    return {ok: true, model: value === model.degree ? model : {...model, degree: value}};
}

export function moveLsqPoint(model: LeastSquaresModel, index: number, value: unknown): LeastSquaresEdit {
    if (!Number.isInteger(index) || index < 0 || index >= model.points.length) return {ok: false, issue: pointsIssue()};
    const issue = pointIssue([value]);
    if (issue) return {ok: false, issue: {...issue, index}};
    const [x, y] = value as LsqPoint;
    const old = model.points[index];
    if (old[0] === x && old[1] === y) return {ok: true, model};
    return {ok: true, model: {...model, points: model.points.map((p, i) => i === index ? [x, y] as const : p)}};
}

/** A new point one unit to the right of the rightmost (at the height of the last point); refused at the maximum count. */
export function addLsqPoint(model: LeastSquaresModel): LeastSquaresEdit {
    if (model.points.length >= LSQ_POINTS_MAX) return {ok: false, issue: pointsIssue()};
    const rightmost = Math.max(...model.points.map(p => p[0]));
    const x = rightmost + 1 <= LSQ_COORDINATE_LIMIT ? rightmost + 1 : Math.min(...model.points.map(p => p[0])) - 1;
    if (Math.abs(x) > LSQ_COORDINATE_LIMIT) return {ok: false, issue: pointsIssue()};
    const y = model.points[model.points.length - 1][1];
    return {ok: true, model: {...model, points: [...model.points, [x, y] as const]}};
}

/** Removes the last point and clamps the degree to the new maximum; refused at the minimum count. */
export function removeLsqPoint(model: LeastSquaresModel): LeastSquaresEdit {
    if (model.points.length <= LSQ_POINTS_MIN) return {ok: false, issue: pointsIssue()};
    const points = model.points.slice(0, -1);
    return {ok: true, model: {...model, points, degree: Math.min(model.degree, lsqDegreeMax(points.length))}};
}

export function setLsqLine(model: LeastSquaresModel, field: 'slope' | 'intercept', value: unknown): LeastSquaresEdit {
    const limit = field === 'slope' ? LSQ_SLOPE_LIMIT : LSQ_INTERCEPT_LIMIT;
    if (!inRange(value, limit)) return {ok: false, issue: {kind: 'line', field, limit}};
    return {ok: true, model: value === model[field] ? model : {...model, [field]: value}};
}

// ---- Mathematics ------------------------------------------------------------------------------------------------------

export type LeastSquaresUnfittable = 'too-few' | 'vertical' | 'underdetermined' | 'rank';

export type LeastSquaresFitResult =
    | { readonly ok: true; readonly fit: LeastSquaresFit }
    | { readonly ok: false; readonly reason: LeastSquaresUnfittable };

/**
 * The fit of the kernel, or the reason there is none: fewer than 2 points, all x equal (vertical data), degree >= points
 * (underdetermined), or too few distinct x for the degree / a numerically dependent design matrix (rank). The kernel's
 * RangeError is caught here and turned into data.
 */
export function leastSquaresFit(points: readonly Point2[], degree: number): LeastSquaresFitResult {
    if (points.length < 2) return {ok: false, reason: 'too-few'};
    const distinct = new Set(points.map(p => p[0])).size;
    if (distinct === 1) return {ok: false, reason: 'vertical'};
    if (degree >= points.length) return {ok: false, reason: 'underdetermined'};
    if (distinct <= degree) return {ok: false, reason: 'rank'};
    try {
        return {ok: true, fit: fitPolynomial(points, degree)};
    } catch (error) {
        if (error instanceof RangeError) return {ok: false, reason: 'rank'};
        throw error;
    }
}

/** What the board and the readout show for one model. */
export interface LeastSquaresView {
    /** The best fit of the model's degree (the best line while the line is manual and the degree is not used). */
    readonly fit: LeastSquaresFitResult;
    /** The best straight line, the reference of the manual mode. */
    readonly bestLine: LeastSquaresFitResult;
    /** The polynomial that is drawn (ascending powers): the fit, or the manual line; undefined when there is nothing to draw. */
    readonly drawn: readonly number[] | undefined;
    /** y_i - drawn(x_i); empty when nothing is drawn. */
    readonly residuals: readonly number[];
    /** Sum of squared vertical residuals of the drawn curve (undefined when nothing is drawn). */
    readonly sumOfSquares: number | undefined;
    /** The sum of squares of the best line, shown beside the manual line's (undefined when there is no best line). */
    readonly optimalSumOfSquares: number | undefined;
}

export function leastSquaresView(model: LeastSquaresModel): LeastSquaresView {
    const fit = leastSquaresFit(model.points, model.manualLine ? 1 : model.degree);
    const bestLine = model.manualLine || model.degree === 1 ? fit : leastSquaresFit(model.points, 1);
    if (model.manualLine) {
        const drawn = [model.intercept, model.slope];
        return {
            fit, bestLine, drawn,
            residuals: model.points.map(p => p[1] - evaluatePolynomial(drawn, p[0])),
            sumOfSquares: lineResidualSumOfSquares(model.points, model.slope, model.intercept),
            optimalSumOfSquares: bestLine.ok ? bestLine.fit.residualSumOfSquares : undefined,
        };
    }
    return {
        fit, bestLine,
        drawn: fit.ok ? fit.fit.coefficients : undefined,
        residuals: fit.ok ? fit.fit.residuals : [],
        sumOfSquares: fit.ok ? fit.fit.residualSumOfSquares : undefined,
        optimalSumOfSquares: bestLine.ok ? bestLine.fit.residualSumOfSquares : undefined,
    };
}

/** The rows the normal equations A^T A c = A^T y are displayed with: (A^T A | A^T y) and the coefficients c of the QR fit. */
export interface NormalEquations {
    readonly matrix: readonly (readonly number[])[];
    readonly rhs: readonly number[];
    readonly coefficients: readonly number[];
}

/** The normal equations are displayed for degree 1 and 2 only (a 2x2 and a 3x3 system); undefined otherwise. */
export const LSQ_NORMAL_EQUATIONS_DEGREE_MAX = 2;

export function normalEquations(fit: LeastSquaresFit): NormalEquations | undefined {
    if (fit.degree > LSQ_NORMAL_EQUATIONS_DEGREE_MAX) return undefined;
    return {matrix: fit.normalMatrix, rhs: fit.normalRhs, coefficients: fit.coefficients};
}
