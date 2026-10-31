/**
 * Least-squares polynomial fit y = c0 + c1 x + ... + cm x^m for the interpolation (I4) and probability (regression line)
 * lessons. Pure mathematics: no React, JSXGraph or localization imports.
 *
 * Solver: Householder QR of the design matrix (ADR 0026), never the normal equations. The normal equations
 * A^T A c = A^T y are still returned as display data for the lesson; they are not used to compute the coefficients.
 * Residuals are r_i = y_i - p(x_i) (data minus model), so the sum of squared vertical residuals is `residualSumOfSquares`.
 * Invalid input (fewer than 2 points, non-finite values, degree >= number of points, fewer distinct x than degree + 1,
 * which includes vertical data) throws a RangeError naming the problem.
 */
import type {Point2} from './interpolation';

/** The interpolation lesson caps the degree at min(points - 1, 5); the kernel itself only needs degree < points. */
export const LEAST_SQUARES_LESSON_DEGREE_MAX = 5;

/** A column is treated as dependent on earlier ones when its QR diagonal falls below this fraction of its own norm. */
const RANK_TOLERANCE = 1e-10;

export interface LeastSquaresFit {
    degree: number;
    /** Ascending powers: coefficients[k] multiplies x^k. */
    coefficients: number[];
    /** y_i - p(x_i), in input order. */
    residuals: number[];
    /** Sum of squared residuals. */
    residualSumOfSquares: number;
    /** A^T A, (degree+1) x (degree+1), for the normal-equations display. */
    normalMatrix: number[][];
    /** A^T y. */
    normalRhs: number[];
}

/** Horner evaluation of ascending-power coefficients. */
export const evaluatePolynomial = (coefficients: readonly number[], x: number): number =>
    coefficients.reduceRight((acc, c) => acc * x + c, 0);

/** Design (Vandermonde) matrix with columns 1, x, ..., x^degree. */
export const designMatrix = (xs: readonly number[], degree: number): number[][] =>
    xs.map(x => Array.from({length: degree + 1}, (_, k) => x ** k));

export const assertFittable = (points: readonly Point2[], degree: number): void => {
    if (!Number.isInteger(degree) || degree < 0) {
        throw new RangeError(`Fit degree must be a non-negative integer, got ${degree}.`);
    }
    if (points.length < 2) {
        throw new RangeError('A least-squares fit needs at least 2 points.');
    }
    if (points.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) {
        throw new RangeError('Fit data must be finite.');
    }
    if (degree >= points.length) {
        throw new RangeError(`Degree ${degree} is underdetermined for ${points.length} points; the degree must be below the number of points.`);
    }
    const distinctX = new Set(points.map(p => p[0])).size;
    if (distinctX === 1) {
        throw new RangeError('All x values are equal (vertical data): y is not a function of x.');
    }
    if (distinctX <= degree) {
        throw new RangeError(`Only ${distinctX} distinct x values: degree ${degree} is rank deficient.`);
    }
};

/** Solves min ||A c - b|| by Householder QR; throws if a column is numerically dependent on the earlier ones. */
const householderSolve = (matrix: readonly (readonly number[])[], rhs: readonly number[]): number[] => {
    const n = matrix.length;
    const p = matrix[0].length;
    const a = matrix.map(row => [...row]);
    const b = [...rhs];
    const columnNorms = Array.from({length: p}, (_, j) => Math.hypot(...a.map(row => row[j])));
    for (let j = 0; j < p; j++) {
        let norm = 0;
        for (let i = j; i < n; i++) norm = Math.hypot(norm, a[i][j]);
        if (norm <= RANK_TOLERANCE * columnNorms[j]) {
            throw new RangeError(`The design matrix is rank deficient at column ${j}.`);
        }
        const alpha = a[j][j] > 0 ? -norm : norm;
        const v = Array.from({length: n - j}, (_, i) => a[j + i][j]);
        v[0] -= alpha;
        const vNormSquared = v.reduce((s, x) => s + x * x, 0);
        if (vNormSquared > 0) {
            for (let k = j; k < p; k++) {
                let dot = 0;
                for (let i = 0; i < v.length; i++) dot += v[i] * a[j + i][k];
                const scale = 2 * dot / vNormSquared;
                for (let i = 0; i < v.length; i++) a[j + i][k] -= scale * v[i];
            }
            let dot = 0;
            for (let i = 0; i < v.length; i++) dot += v[i] * b[j + i];
            const scale = 2 * dot / vNormSquared;
            for (let i = 0; i < v.length; i++) b[j + i] -= scale * v[i];
        }
    }
    const c = new Array<number>(p).fill(0);
    for (let j = p - 1; j >= 0; j--) {
        let s = b[j];
        for (let k = j + 1; k < p; k++) s -= a[j][k] * c[k];
        c[j] = s / a[j][j];
    }
    return c;
};

/** Least-squares polynomial of the given degree through the points, as a function of x. */
export const fitPolynomial = (points: readonly Point2[], degree: number): LeastSquaresFit => {
    assertFittable(points, degree);
    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const design = designMatrix(xs, degree);
    const coefficients = householderSolve(design, ys);
    const residuals = ys.map((y, i) => y - evaluatePolynomial(coefficients, xs[i]));
    const size = degree + 1;
    const normalMatrix = Array.from({length: size}, (_, j) =>
        Array.from({length: size}, (_, k) => design.reduce((s, row) => s + row[j] * row[k], 0)));
    const normalRhs = Array.from({length: size}, (_, j) => design.reduce((s, row, i) => s + row[j] * ys[i], 0));
    return {
        degree, coefficients, residuals, normalMatrix, normalRhs,
        residualSumOfSquares: residuals.reduce((s, r) => s + r * r, 0),
    };
};

export interface LinearFit {
    slope: number;
    intercept: number;
    residuals: number[];
    residualSumOfSquares: number;
    fit: LeastSquaresFit;
}

/** Degree-1 convenience for the regression line: y = intercept + slope x. */
export const fitLine = (points: readonly Point2[]): LinearFit => {
    const fit = fitPolynomial(points, 1);
    return {
        slope: fit.coefficients[1], intercept: fit.coefficients[0],
        residuals: fit.residuals, residualSumOfSquares: fit.residualSumOfSquares, fit,
    };
};

/** Sum of squared vertical residuals of an arbitrary line (the manual line mode). */
export const lineResidualSumOfSquares = (points: readonly Point2[], slope: number, intercept: number): number =>
    points.reduce((s, p) => s + (p[1] - (intercept + slope * p[0])) ** 2, 0);
