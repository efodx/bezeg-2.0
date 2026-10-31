/**
 * Correlation and regression for the P5 lesson. Pure mathematics: no React, JSXGraph or localization.
 *
 * Points are snapped to integer tenths. The sums n*Sxy, n*Sxx, n*Syy (n times the centred sums) are exact integers in
 * tenths-squared units, so Sxy = 0 is detected exactly and r is then exactly 0. r itself is floating point.
 * The regression lines come from `fitLine` in leastSquares.ts and are never re-derived here.
 * Invalid input (empty, non-finite) throws a RangeError.
 */
import type {Point2} from './interpolation';
import {fitLine, type LinearFit} from './leastSquares';

/** Fewer points disable r: two points always give +-1 and say nothing. */
export const CORRELATION_MIN_POINTS = 3;

export type CorrelationStatus = 'ok' | 'too-few' | 'zero-variance-x' | 'zero-variance-y' | 'zero-variance-both';

export interface RegressionLine {
    slope: number;
    intercept: number;
    residualSumOfSquares: number;
    fit: LinearFit;
}

export interface CorrelationResult {
    n: number;
    /** Exact integer sums in tenths squared: n*Sxx, n*Syy, n*Sxy. */
    nSxx: number;
    nSyy: number;
    nSxy: number;
    /** Centred sums in data units: Sxx = nSxx / (100 n), etc. */
    sxx: number;
    syy: number;
    sxy: number;
    /** 'ok' when r is defined; otherwise why not. */
    status: CorrelationStatus;
    /** undefined unless status is 'ok'. Exactly 0 when nSxy = 0. */
    r: number | undefined;
    rSquared: number | undefined;
    /** y on x: undefined for fewer than 2 points or all-equal x (vertical data). Horizontal data give slope 0. */
    yOnX: RegressionLine | undefined;
    /** x = intercept + slope y: undefined when all y are equal. */
    xOnY: RegressionLine | undefined;
    /** Total sum of squares of y about its mean (= syy), the SSres of the horizontal model. */
    totalSumOfSquares: number;
    /** SSres of the y-on-x line (= syy (1 - r^2) when r is defined). */
    residualSumOfSquares: number | undefined;
    /** r * sy / sx (the slope identity); undefined unless r is defined. */
    slopeFromR: number | undefined;
}

const tenths = (v: number): number => {
    if (!Number.isFinite(v)) throw new RangeError('Data values must be finite.');
    return Math.round(v * 10);
};

const line = (points: readonly Point2[]): RegressionLine => {
    const fit = fitLine(points);
    return {slope: fit.slope, intercept: fit.intercept, residualSumOfSquares: fit.residualSumOfSquares, fit};
};

export const correlation = (points: readonly Point2[]): CorrelationResult => {
    if (points.length === 0) throw new RangeError('At least one point is needed.');
    const t = points.map(p => [tenths(p[0]), tenths(p[1])] as const);
    const snapped: Point2[] = t.map(p => [p[0] / 10, p[1] / 10] as Point2);
    const n = t.length;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of t) {
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
    }
    const nSxx = n * sxx - sx * sx;
    const nSyy = n * syy - sy * sy;
    const nSxy = n * sxy - sx * sy;
    const zeroX = nSxx === 0;
    const zeroY = nSyy === 0;

    let status: CorrelationStatus = 'ok';
    if (n < CORRELATION_MIN_POINTS) status = 'too-few';
    else if (zeroX && zeroY) status = 'zero-variance-both';
    else if (zeroX) status = 'zero-variance-x';
    else if (zeroY) status = 'zero-variance-y';

    let r: number | undefined;
    if (status === 'ok') {
        r = nSxy === 0 ? 0 : Math.max(-1, Math.min(1, nSxy / (Math.sqrt(nSxx) * Math.sqrt(nSyy))));
    }
    const yOnX = n >= 2 && !zeroX ? line(snapped) : undefined;
    const xOnY = n >= 2 && !zeroY ? line(snapped.map(p => [p[1], p[0]] as Point2)) : undefined;
    const scale = 100 * n;
    return {
        n, nSxx, nSyy, nSxy,
        sxx: nSxx / scale, syy: nSyy / scale, sxy: nSxy / scale,
        status, r, rSquared: r === undefined ? undefined : r * r,
        yOnX, xOnY,
        totalSumOfSquares: nSyy / scale,
        residualSumOfSquares: yOnX?.residualSumOfSquares,
        slopeFromR: r === undefined ? undefined : r * Math.sqrt(nSyy / nSxx),
    };
};
