/**
 * Polynomial interpolation kernel for the interpolation lessons: barycentric Lagrange evaluation, node sets (equispaced and
 * Chebyshev first kind), interpolation-error sampling and the Runge table. Pure mathematics: no React, JSXGraph or
 * localization imports.
 *
 * Evaluation always uses the barycentric second form (never a Vandermonde solve). Nodes must be finite and pairwise
 * distinct; invalid input throws a RangeError whose message names the problem.
 *
 * I1 treats data points as a parametric curve: each coordinate is interpolated against a parameter t (uniform
 * 0,1,2,... by default, or cumulative chord length). I2 interpolates y = f(x).
 */

/** Documented caps: I1 allows 2..12 points, I2 allows degree 0..40 (suggested by the spec). */
export const INTERPOLATION_POINTS_MIN = 2;
export const INTERPOLATION_POINTS_MAX = 12;
export const INTERPOLATION_DEGREE_MAX = 40;
/** Evaluation grid of the Runge table: 20001 points on the interval. */
export const INTERPOLATION_ERROR_GRID = 20001;

export type NodeRule = 'equispaced' | 'chebyshev';
export type ParameterRule = 'uniform' | 'chord';
export type Point2 = readonly [number, number];

const assertFiniteNumbers = (values: readonly number[], what: string): void => {
    values.forEach(value => {
        if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${what} must be finite numbers`);
    });
};

/** Throws a RangeError for fewer than one node, non-finite nodes or duplicate nodes. */
export const assertDistinctNodes = (nodes: readonly number[]): void => {
    if (nodes.length < 1) throw new RangeError('at least one node is required');
    assertFiniteNumbers(nodes, 'nodes');
    const sorted = [...nodes].sort((p, q) => p - q);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1]) throw new RangeError('nodes must be pairwise distinct (a repeated node divides by zero)');
    }
};

/** Barycentric weights w_j = 1 / prod_{k != j} (x_j - x_k). */
export const barycentricWeights = (nodes: readonly number[]): number[] => {
    assertDistinctNodes(nodes);
    const weights = nodes.map((xj, j) => {
        let product = 1;
        nodes.forEach((xk, k) => {
            if (k !== j) product *= xj - xk;
        });
        return 1 / product;
    });
    if (!weights.every(Number.isFinite)) throw new RangeError('nodes are too close together: barycentric weights overflow');
    return weights;
};

/**
 * Barycentric second form p(x) = sum w_j y_j / (x - x_j) / sum w_j / (x - x_j); returns y_j exactly when x equals node j.
 * Pass precomputed weights to avoid the O(n^2) setup per call.
 */
export const barycentricEvaluate = (nodes: readonly number[], values: readonly number[], x: number, weights?: readonly number[]): number => {
    if (values.length !== nodes.length) throw new RangeError('nodes and values must have the same length');
    assertFiniteNumbers(values, 'values');
    if (!Number.isFinite(x)) throw new RangeError('x must be finite');
    const w = weights ?? barycentricWeights(nodes);
    if (w.length !== nodes.length) throw new RangeError('weights and nodes must have the same length');
    const hit = nodes.indexOf(x);
    if (hit >= 0) return values[hit];
    let numerator = 0;
    let denominator = 0;
    nodes.forEach((xj, j) => {
        const term = w[j] / (x - xj);
        numerator += term * values[j];
        denominator += term;
    });
    return numerator / denominator;
};

/** Cardinal (Lagrange basis) values l_j(x), j = 0..n; they sum to 1 and equal the unit vector at a node. */
export const lagrangeBasis = (nodes: readonly number[], x: number, weights?: readonly number[]): number[] => {
    if (!Number.isFinite(x)) throw new RangeError('x must be finite');
    const w = weights ?? barycentricWeights(nodes);
    assertDistinctNodes(nodes);
    const hit = nodes.indexOf(x);
    if (hit >= 0) return nodes.map((_, j) => (j === hit ? 1 : 0));
    const terms = nodes.map((xj, j) => w[j] / (x - xj));
    const total = terms.reduce((sum, term) => sum + term, 0);
    return terms.map(term => term / total);
};

const assertDegree = (n: number): void => {
    if (!Number.isInteger(n) || n < 0) throw new RangeError('degree n must be a non-negative integer');
};

const assertInterval = (a: number, b: number): void => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || !(a < b)) throw new RangeError('interval must be finite with a < b');
};

/** n + 1 equally spaced nodes from a to b inclusive (a single node at the midpoint for n = 0). */
export const equispacedNodes = (n: number, a: number, b: number): number[] => {
    assertDegree(n);
    assertInterval(a, b);
    if (n === 0) return [(a + b) / 2];
    return Array.from({length: n + 1}, (_, j) => (j === n ? b : a + (j * (b - a)) / n));
};

/**
 * n + 1 Chebyshev nodes of the first kind, x_j = (a+b)/2 + (b-a)/2 cos((2j+1)pi / (2(n+1))), j = 0..n, in decreasing order
 * (the zeros of T_{n+1}; the interval ends are not nodes).
 */
export const chebyshevNodes = (n: number, a: number, b: number): number[] => {
    assertDegree(n);
    assertInterval(a, b);
    return Array.from({length: n + 1}, (_, j) => (a + b) / 2 + ((b - a) / 2) * Math.cos(((2 * j + 1) * Math.PI) / (2 * (n + 1))));
};

export const interpolationNodes = (rule: NodeRule, n: number, a: number, b: number): number[] =>
    rule === 'chebyshev' ? chebyshevNodes(n, a, b) : equispacedNodes(n, a, b);

const assertPointRows = (points: readonly Point2[]): void => {
    if (points.length < INTERPOLATION_POINTS_MIN || points.length > INTERPOLATION_POINTS_MAX) {
        throw new RangeError(`between ${INTERPOLATION_POINTS_MIN} and ${INTERPOLATION_POINTS_MAX} points are required`);
    }
    points.forEach(point => {
        if (!Array.isArray(point) || point.length !== 2) throw new RangeError('each point must have two coordinates');
        assertFiniteNumbers(point, 'point coordinates');
    });
};

/**
 * Parameters of data points: uniform 0,1,2,... or cumulative chord length starting at 0. Coincident consecutive points
 * under chord length give repeated parameters, which the weights then reject.
 */
export const curveParameters = (points: readonly Point2[], rule: ParameterRule = 'uniform'): number[] => {
    assertPointRows(points);
    const t = [0];
    for (let i = 1; i < points.length; i++) {
        t.push(t[i - 1] + (rule === 'uniform' ? 1 : Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])));
    }
    return t;
};

/** The Lagrange curve through 2D points at parameter t: sum l_j(t) P_j, with the weights l_j(t) returned alongside. */
export const lagrangeCurvePoint = (
    points: readonly Point2[], parameters: readonly number[], t: number,
): {point: [number, number]; weights: number[]} => {
    assertPointRows(points);
    if (parameters.length !== points.length) throw new RangeError('one parameter per point is required');
    const weights = lagrangeBasis(parameters, t);
    let x = 0;
    let y = 0;
    weights.forEach((l, j) => {
        x += l * points[j][0];
        y += l * points[j][1];
    });
    return {point: [x, y], weights};
};

/** The Bezier curve with the points as control points at t (Bernstein weights), for the I1 comparison. */
export const bezierCurvePoint = (points: readonly Point2[], t: number): {point: [number, number]; weights: number[]} => {
    assertPointRows(points);
    if (!Number.isFinite(t)) throw new RangeError('t must be finite');
    const n = points.length - 1;
    const weights: number[] = [];
    let binomial = 1;
    for (let j = 0; j <= n; j++) {
        weights.push(binomial * t ** j * (1 - t) ** (n - j));
        binomial = (binomial * (n - j)) / (j + 1);
    }
    return {
        point: [weights.reduce((s, w, j) => s + w * points[j][0], 0), weights.reduce((s, w, j) => s + w * points[j][1], 0)],
        weights,
    };
};

/** Closed function list for I2 (no parser). */
export const INTERPOLATION_FUNCTION_IDS = ['runge', 'abs', 'sine'] as const;
export type InterpolationFunctionId = typeof INTERPOLATION_FUNCTION_IDS[number];

export const interpolationFunction = (id: InterpolationFunctionId): ((x: number) => number) => {
    switch (id) {
        case 'runge': return x => 1 / (1 + 25 * x * x);
        case 'abs': return x => Math.abs(x);
        case 'sine': return x => Math.sin(x);
    }
};

export interface InterpolationErrorSample {
    /** Largest |f - p| over the grid: a lower bound of the true supremum. */
    readonly maxError: number;
    /** Grid point where the maximum occurs (first one on ties). */
    readonly argMax: number;
    readonly xs: number[];
    readonly errors: number[];
}

/** Samples |f(x) - p(x)| on `gridCount` equally spaced points of [a, b], p the interpolant of f at `nodes`. */
export const interpolationErrorSample = (
    f: (x: number) => number, nodes: readonly number[], a: number, b: number, gridCount: number = INTERPOLATION_ERROR_GRID,
): InterpolationErrorSample => {
    assertInterval(a, b);
    if (!Number.isInteger(gridCount) || gridCount < 2) throw new RangeError('gridCount must be an integer of at least 2');
    const values = nodes.map(f);
    const weights = barycentricWeights(nodes);
    const xs: number[] = [];
    const errors: number[] = [];
    let maxError = -1;
    let argMax = a;
    for (let i = 0; i < gridCount; i++) {
        const x = i === gridCount - 1 ? b : a + (i * (b - a)) / (gridCount - 1);
        const error = Math.abs(f(x) - barycentricEvaluate(nodes, values, x, weights));
        xs.push(x);
        errors.push(error);
        if (error > maxError) {
            maxError = error;
            argMax = x;
        }
    }
    return {maxError, argMax, xs, errors};
};

/** Maximum interpolation error of a catalogue function with n + 1 nodes of the given rule (the Runge table entry). */
export const rungeMaxError = (
    id: InterpolationFunctionId, rule: NodeRule, n: number, a: number = -1, b: number = 1,
): {maxError: number; argMax: number} => {
    if (n > INTERPOLATION_DEGREE_MAX) throw new RangeError(`degree is capped at ${INTERPOLATION_DEGREE_MAX}`);
    const {maxError, argMax} = interpolationErrorSample(interpolationFunction(id), interpolationNodes(rule, n, a, b), a, b);
    return {maxError, argMax};
};

/** Spec table for f = 1/(1+25x^2) on [-1, 1] (docs/specs/interpolation-approximation-lessons.md, I2). */
export const RUNGE_TABLE = [
    {degree: 10, equispaced: 1.9157, chebyshev: 0.1092},
    {degree: 15, equispaced: 2.1076, chebyshev: 0.0831},
    {degree: 20, equispaced: 59.82, chebyshev: 0.01533},
] as const;
