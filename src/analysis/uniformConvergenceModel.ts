import {
    isUniformEpsilon, isUniformExampleId, isUniformN, isUniformR, isUniformX, UNIFORM_EPSILON_MAX, UNIFORM_EPSILON_MIN, UNIFORM_EPSILON_STEP,
    UNIFORM_EXAMPLE_IDS, UNIFORM_MAX_N, UNIFORM_N_MIN, UNIFORM_R_MAX, UNIFORM_R_MIN, UNIFORM_R_STEP, UNIFORM_X_STEP, UniformExampleId,
} from './uniformConvergence';
import {cleanNumber} from './numbers';

/*
 * This module owns the rules of the uniform convergence model: what is valid, how an accepted value is normalized, and which rule a
 * rejected value broke (a `UniformIssue`: data, never text). The Preset parser, the Preset collection's diagnosis and the graph's
 * setters all ask it; they only choose the words (`graphs/functions/uniformConvergenceMessages`).
 */

/**
 * The stored description of the uniform convergence demonstration: f_n on [0, r] with the chosen index n, the chosen point
 * x in [0, r] and the tolerance epsilon. `supremumVisible` says whether the supremum error over the whole domain is shown
 * (the Show supremum action); it is saved so that a reopened preset and a lesson checkpoint show the same scene. Errors,
 * thresholds and suprema are never stored: they are recomputed from the other fields.
 */
export interface UniformConvergenceModel {
    readonly example: UniformExampleId;
    readonly r: number;
    readonly n: number;
    readonly x: number;
    readonly epsilon: number;
    readonly supremumVisible: boolean;
}

/** x^n on [0, 0.8] with n = 5 (0.8^5 = 0.32768); the supremum is hidden so the lesson can ask for a prediction first. */
export const DEFAULT_UNIFORM_MODEL: UniformConvergenceModel =
    {example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false};

/** The model a named example starts from; changing the example loads its model (it does not carry over r, x or n). */
export const UNIFORM_EXAMPLE_MODELS: Readonly<Record<UniformExampleId, UniformConvergenceModel>> = {
    power: DEFAULT_UNIFORM_MODEL,
    scaled: {example: 'scaled', r: 1, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false},
};

/** The rule a rejected value broke. Callers localize it; the range and the examples travel with it, so nobody restates them. */
export type UniformIssue =
    | { readonly kind: 'example'; readonly allowed: readonly UniformExampleId[] }
    /** r must be a grid value in [min, max]. `x` is the chosen point an edit has to keep inside [0, r] (absent for a stored model). */
    | { readonly kind: 'r'; readonly min: number; readonly max: number; readonly x?: number }
    | { readonly kind: 'n'; readonly min: number; readonly max: number }
    /** x must be a grid value in [0, r]; `r` is the domain end it was checked against. */
    | { readonly kind: 'x'; readonly r: number }
    | { readonly kind: 'epsilon'; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility' };

/** A new r refused because the chosen point x would fall outside [0, r] (x is never moved by a change of r). */
export type UniformXOutsideIssue = {
    readonly kind: 'x-outside-domain'; readonly r: number; readonly x: number; readonly min: number; readonly max: number;
};

/** The rules an edit can break: the stored-model rules except the visibility flag, plus the point-outside-domain refusal of a new r. */
export type UniformEditIssue = Exclude<UniformIssue, { kind: 'visibility' }> | UniformXOutsideIssue;

/**
 * The answer for a whole stored model: the sanitized model, or the first rule it broke. `issue` is undefined when the data is
 * malformed (not an object, or a field of the wrong type or missing) and no rule applies; callers then use their generic message.
 */
export type UniformConvergenceCheck =
    | { readonly ok: true; readonly model: UniformConvergenceModel }
    | { readonly ok: false; readonly issue: UniformIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type UniformEdit =
    | { readonly ok: true; readonly model: UniformConvergenceModel }
    | { readonly ok: false; readonly issue: UniformEditIssue };

const reject = (issue: UniformIssue | undefined): UniformConvergenceCheck => ({ok: false, issue});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** The value with floating-point noise removed when it lies on the grid (within 1e-9 grid units), else undefined. */
function snapToGrid(value: unknown, step: number): number | undefined {
    if (!isFiniteNumber(value)) return undefined;
    const units = Math.round(value / step);
    return Math.abs(value / step - units) <= 1e-9 ? cleanNumber(units * step) : undefined;
}

/**
 * The single validity rule of a stored uniform convergence model: a known example, r on the grid 0.05 in [0.1, 1], an integer n in
 * 1..UNIFORM_MAX_N, x on the grid 0.01 in [0, r], epsilon on the grid 0.01 in [0.01, 1] and a boolean `supremumVisible`. Rules are
 * checked in the order example, r, n, x, epsilon, visibility; a field of the wrong type or a missing field gives `issue: undefined`.
 * Unknown properties are dropped; nothing is clamped.
 */
export function checkUniformConvergenceModel(data: unknown): UniformConvergenceCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, r, n, x, epsilon, supremumVisible} = data as Record<string, unknown>;
    if (!isUniformExampleId(example)) return reject({kind: 'example', allowed: UNIFORM_EXAMPLE_IDS});
    if (isFiniteNumber(r) && !isUniformR(r)) return reject({kind: 'r', min: UNIFORM_R_MIN, max: UNIFORM_R_MAX});
    if (isFiniteNumber(n) && !isUniformN(n)) return reject({kind: 'n', min: UNIFORM_N_MIN, max: UNIFORM_MAX_N});
    if (isUniformR(r) && isFiniteNumber(x) && !isUniformX(r, x)) return reject({kind: 'x', r});
    if (isFiniteNumber(epsilon) && !isUniformEpsilon(epsilon)) return reject({kind: 'epsilon', min: UNIFORM_EPSILON_MIN, max: UNIFORM_EPSILON_MAX});
    if (supremumVisible !== undefined && typeof supremumVisible !== 'boolean') return reject({kind: 'visibility'});
    if (!isUniformR(r) || !isUniformN(n) || !isUniformX(r, x) || !isUniformEpsilon(epsilon) || typeof supremumVisible !== 'boolean') return reject(undefined);
    return {ok: true, model: {example, r, n, x, epsilon, supremumVisible}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model. Nothing is clamped. */
export function parseUniformConvergenceModel(data: unknown): UniformConvergenceModel | undefined {
    const check = checkUniformConvergenceModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's model (it does not carry over r, x, n or the supremum display). */
export function chooseUniformExample(example: unknown): UniformEdit {
    if (!isUniformExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: UNIFORM_EXAMPLE_IDS}};
    return {ok: true, model: {...UNIFORM_EXAMPLE_MODELS[example]}};
}

/**
 * The model with a new domain end r (floating-point noise on the grid is removed). The chosen point x is kept only while it stays
 * in [0, r]; otherwise the change is refused (`x-outside-domain`) and nothing is clamped, so the inspector can say the point must
 * move first. An r that is not a grid value in [0.1, 1] is refused as `r`. The current r returns the same model.
 */
export function changeUniformR(model: UniformConvergenceModel, value: unknown): UniformEdit {
    const r = snapToGrid(value, UNIFORM_R_STEP);
    if (r === undefined || !isUniformR(r)) return {ok: false, issue: {kind: 'r', min: UNIFORM_R_MIN, max: UNIFORM_R_MAX, x: model.x}};
    if (!isUniformX(r, model.x)) return {ok: false, issue: {kind: 'x-outside-domain', r, x: model.x, min: UNIFORM_R_MIN, max: UNIFORM_R_MAX}};
    return {ok: true, model: r === model.r ? model : {...model, r}};
}

/** The model with a new index n: an integer in 1..UNIFORM_MAX_N (an integer-valued number within 1e-9 is rounded). */
export function changeUniformN(model: UniformConvergenceModel, value: unknown): UniformEdit {
    const rounded = isFiniteNumber(value) ? Math.round(value) : undefined;
    if (!isFiniteNumber(value) || rounded === undefined || Math.abs(value - rounded) > 1e-9 || !isUniformN(rounded)) {
        return {ok: false, issue: {kind: 'n', min: UNIFORM_N_MIN, max: UNIFORM_MAX_N}};
    }
    return {ok: true, model: rounded === model.n ? model : {...model, n: rounded}};
}

/** The model with a new point x on the grid 0.01 inside [0, r]. */
export function moveUniformX(model: UniformConvergenceModel, value: unknown): UniformEdit {
    const x = snapToGrid(value, UNIFORM_X_STEP);
    if (x === undefined || !isUniformX(model.r, x)) return {ok: false, issue: {kind: 'x', r: model.r}};
    return {ok: true, model: x === model.x ? model : {...model, x}};
}

/** The model with a new tolerance epsilon on the grid 0.01 in [0.01, 1]. */
export function changeUniformEpsilon(model: UniformConvergenceModel, value: unknown): UniformEdit {
    const epsilon = snapToGrid(value, UNIFORM_EPSILON_STEP);
    if (epsilon === undefined || !isUniformEpsilon(epsilon)) {
        return {ok: false, issue: {kind: 'epsilon', min: UNIFORM_EPSILON_MIN, max: UNIFORM_EPSILON_MAX}};
    }
    return {ok: true, model: epsilon === model.epsilon ? model : {...model, epsilon}};
}
