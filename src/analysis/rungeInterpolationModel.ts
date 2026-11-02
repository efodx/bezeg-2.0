import {
    barycentricEvaluate, barycentricWeights, INTERPOLATION_DEGREE_MAX, INTERPOLATION_ERROR_GRID, INTERPOLATION_FUNCTION_IDS, InterpolationFunctionId,
    interpolationErrorSample, interpolationFunction, interpolationNodes, NodeRule,
} from './interpolation';

/*
 * The model of lesson I2 (Runge's phenomenon, `interp-runge`): a function from a closed list, the degree n of the interpolating
 * polynomial (n + 1 nodes on [-1, 1]), the node rule and two display switches. Nodes are not draggable, so the model stores the
 * rule and the degree, never node positions. This module owns validity (a `RungeIssue` is data, never text; the words live in
 * `graphs/functions/rungeInterpolationMessages`) and the mathematics the graph draws, on top of the kernel of `interpolation`.
 */

export const RUNGE_FUNCTION_IDS = INTERPOLATION_FUNCTION_IDS;
export const RUNGE_NODE_RULES: readonly NodeRule[] = ['equispaced', 'chebyshev'];
export const RUNGE_DEGREE_MIN = 1;
export const RUNGE_DEGREE_MAX = INTERPOLATION_DEGREE_MAX;
/** The interval of the lesson. */
export const RUNGE_DOMAIN: readonly [number, number] = [-1, 1];
/** Every STRIDE-th point of the 20001-point error grid is drawn (the readout maximum uses the whole grid). */
export const RUNGE_DRAW_STRIDE = 20;

export interface RungeInterpolationModel {
    readonly functionId: InterpolationFunctionId;
    readonly degree: number;
    readonly nodeRule: NodeRule;
    readonly showError: boolean;
    readonly showSemicircle: boolean;
}

export const DEFAULT_RUNGE_MODEL: RungeInterpolationModel = {functionId: 'runge', degree: 10, nodeRule: 'equispaced', showError: true, showSemicircle: false};

export type RungeIssue =
    | { readonly kind: 'function'; readonly allowed: readonly InterpolationFunctionId[] }
    | { readonly kind: 'degree'; readonly min: number; readonly max: number }
    | { readonly kind: 'rule'; readonly allowed: readonly NodeRule[] }
    | { readonly kind: 'flag'; readonly field: 'showError' | 'showSemicircle' };

export type RungeCheck =
    | { readonly ok: true; readonly model: RungeInterpolationModel }
    | { readonly ok: false; readonly issue: RungeIssue | undefined };

export type RungeEdit =
    | { readonly ok: true; readonly model: RungeInterpolationModel }
    | { readonly ok: false; readonly issue: RungeIssue };

export const isRungeFunctionId = (value: unknown): value is InterpolationFunctionId =>
    typeof value === 'string' && (INTERPOLATION_FUNCTION_IDS as readonly string[]).includes(value);
export const isRungeNodeRule = (value: unknown): value is NodeRule =>
    typeof value === 'string' && (RUNGE_NODE_RULES as readonly string[]).includes(value);
/** The degree is a whole number in [1, 40]; nothing is rounded or clamped. */
export const isRungeDegree = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= RUNGE_DEGREE_MIN && value <= RUNGE_DEGREE_MAX;

const functionIssue = (): RungeIssue => ({kind: 'function', allowed: INTERPOLATION_FUNCTION_IDS});
const degreeIssue = (): RungeIssue => ({kind: 'degree', min: RUNGE_DEGREE_MIN, max: RUNGE_DEGREE_MAX});
const ruleIssue = (): RungeIssue => ({kind: 'rule', allowed: RUNGE_NODE_RULES});

/**
 * The validity rule of a stored model. Rules are checked in the order function, degree, rule, flags. A non-object gives
 * `issue: undefined` (the generic message). Unknown properties are dropped; nothing is clamped or rounded.
 */
export function checkRungeModel(data: unknown): RungeCheck {
    const reject = (issue: RungeIssue | undefined): RungeCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {functionId, degree, nodeRule, showError, showSemicircle} = data as Record<string, unknown>;
    if (!isRungeFunctionId(functionId)) return reject(functionIssue());
    if (!isRungeDegree(degree)) return reject(degreeIssue());
    if (!isRungeNodeRule(nodeRule)) return reject(ruleIssue());
    if (typeof showError !== 'boolean') return reject({kind: 'flag', field: 'showError'});
    if (typeof showSemicircle !== 'boolean') return reject({kind: 'flag', field: 'showSemicircle'});
    return {ok: true, model: {functionId, degree, nodeRule, showError, showSemicircle}};
}

export function parseRungeModel(data: unknown): RungeInterpolationModel | undefined {
    const check = checkRungeModel(data);
    return check.ok ? check.model : undefined;
}

export function chooseRungeFunction(model: RungeInterpolationModel, value: unknown): RungeEdit {
    if (!isRungeFunctionId(value)) return {ok: false, issue: functionIssue()};
    return {ok: true, model: value === model.functionId ? model : {...model, functionId: value}};
}

export function changeRungeDegree(model: RungeInterpolationModel, value: unknown): RungeEdit {
    if (!isRungeDegree(value)) return {ok: false, issue: degreeIssue()};
    return {ok: true, model: value === model.degree ? model : {...model, degree: value}};
}

export function chooseRungeNodeRule(model: RungeInterpolationModel, value: unknown): RungeEdit {
    if (!isRungeNodeRule(value)) return {ok: false, issue: ruleIssue()};
    return {ok: true, model: value === model.nodeRule ? model : {...model, nodeRule: value}};
}

// ---- Mathematics ------------------------------------------------------------------------------------------------------

/** Everything the board and the readout draw for one (function, degree, rule): recomputed only when one of the three changes. */
export interface RungeData {
    readonly nodes: readonly number[];
    readonly values: readonly number[];
    /** Largest |f - p| on the 20001-point grid (a lower bound of the supremum) and the first grid point where it occurs. */
    readonly gridMax: number;
    readonly gridMaxAt: number;
    /** The drawn grid (every RUNGE_DRAW_STRIDE-th point of the error grid, both interval ends included). */
    readonly xs: readonly number[];
    readonly p: readonly number[];
    readonly f: readonly number[];
    readonly error: readonly number[];
}

/** p is evaluated by the barycentric formula only (never through monomial coefficients). */
export function rungeData(functionId: InterpolationFunctionId, degree: number, rule: NodeRule): RungeData {
    const [a, b] = RUNGE_DOMAIN;
    const f = interpolationFunction(functionId);
    const nodes = interpolationNodes(rule, degree, a, b);
    const values = nodes.map(f);
    const sample = interpolationErrorSample(f, nodes, a, b, INTERPOLATION_ERROR_GRID);
    const weights = barycentricWeights(nodes);
    const xs: number[] = [];
    const p: number[] = [];
    const fv: number[] = [];
    const error: number[] = [];
    for (let i = 0; i < sample.xs.length; i += RUNGE_DRAW_STRIDE) {
        const x = sample.xs[i];
        xs.push(x);
        p.push(barycentricEvaluate(nodes, values, x, weights));
        fv.push(f(x));
        error.push(sample.errors[i]);
    }
    return {nodes, values, gridMax: sample.maxError, gridMaxAt: sample.argMax, xs, p, f: fv, error};
}

/** The projection picture: the angle of node j on the unit semicircle, x_j = cos(theta_j) (first-kind Chebyshev nodes). */
export const chebyshevAngle = (degree: number, j: number): number => ((2 * j + 1) * Math.PI) / (2 * (degree + 1));
