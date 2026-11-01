import {SchoolBaseFunction, TRANSFORM_BOUNDS, TransformedFunction} from './schoolFunctions';
import {checkTransformParams, composedRule, RuleStep, trackedPoint, TrackedPoint, transformedFunction, TransformParams} from './transformation';

/*
 * This module owns the rules of the graph-transformation model y = a f(b(x - c)) + d: what is valid and which rule a rejected value
 * broke (a `FunctionTransformationIssue`: data, never text). The Preset parser, the Preset collection's diagnosis and the graph's
 * setters all ask it; they only choose the words (`graphs/functions/functionTransformationMessages`). The mathematics (the point map,
 * the composed rule, the transformed function) stays in `transformation.ts` and `schoolFunctions.ts`.
 */

/**
 * The base shapes offered: the five power shapes and the exponential and logarithm shapes of the S1 catalogue (e^x and ln x, base e).
 * The named polynomials and the general polynomial and rational shapes are not offered: the kernel supports them, but they need their
 * own parameters (zeros, multiplicities) and would turn this demonstration into a function editor.
 */
export const TRANSFORM_BASE_IDS = ['square', 'cube', 'sqrt', 'reciprocal', 'abs', 'exp', 'ln'] as const;
export type TransformBaseId = typeof TRANSFORM_BASE_IDS[number];
export const isTransformBaseId = (value: unknown): value is TransformBaseId =>
    typeof value === 'string' && (TRANSFORM_BASE_IDS as readonly string[]).includes(value);

/** The kernel function of a base shape. */
export const transformBaseFunction = (id: TransformBaseId): SchoolBaseFunction => {
    switch (id) {
        case 'exp': return {kind: 'exp', base: Math.E};
        case 'ln': return {kind: 'log', base: Math.E};
        default: return {kind: 'power', shape: id};
    }
};

export type TransformParameter = 'a' | 'b' | 'c' | 'd';
export const TRANSFORM_PARAMETERS: readonly TransformParameter[] = ['a', 'b', 'c', 'd'];

/** The tracked base abscissa u lies in this range (a point outside the base domain is simply not drawn). */
export const TRANSFORM_U_MIN = -5;
export const TRANSFORM_U_MAX = 5;
export const TRANSFORM_U_STEP = 0.1;

export interface FunctionTransformationModel extends TransformParams {
    readonly base: TransformBaseId;
    /** Whether the base graph (the ghost) is drawn. */
    readonly ghostVisible: boolean;
    /** The abscissa of the tracked point on the base graph. */
    readonly u: number;
}

export const DEFAULT_FUNCTION_TRANSFORMATION_MODEL: FunctionTransformationModel = {
    base: 'square', a: -2, b: 0.5, c: 3, d: 1, ghostVisible: true, u: 2,
};

/** The rule a rejected value broke. Callers localize it; the range and the allowed values travel with it. */
export type FunctionTransformationIssue =
    | { readonly kind: 'base'; readonly allowed: readonly TransformBaseId[] }
    | { readonly kind: 'b-zero' }
    /** `field` must lie in [min, max]. */
    | { readonly kind: 'range'; readonly field: TransformParameter | 'u'; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility' };

export type FunctionTransformationCheck =
    | { readonly ok: true; readonly model: FunctionTransformationModel }
    | { readonly ok: false; readonly issue: FunctionTransformationIssue | undefined };

export type FunctionTransformationEdit =
    | { readonly ok: true; readonly model: FunctionTransformationModel }
    | { readonly ok: false; readonly issue: FunctionTransformationIssue };

type Field = TransformParameter | 'u';

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const boundsOf = (field: Field): readonly [number, number] => field === 'u' ? [TRANSFORM_U_MIN, TRANSFORM_U_MAX] : TRANSFORM_BOUNDS[field];

const rangeIssue = (field: Field): FunctionTransformationIssue => {
    const [min, max] = boundsOf(field);
    return {kind: 'range', field, min, max};
};

/** The issue a numeric field value breaks (not finite counts as out of range), or undefined when the value is acceptable. */
function fieldIssue(field: Field, value: number): FunctionTransformationIssue | undefined {
    if (!Number.isFinite(value)) return rangeIssue(field);
    if (field === 'b' && value === 0) return {kind: 'b-zero'};
    const [min, max] = boundsOf(field);
    return value >= min && value <= max ? undefined : rangeIssue(field);
}

/**
 * The single validity rule of a stored model: a known base shape, a, b, c, d inside `TRANSFORM_BOUNDS` with b different from 0,
 * the tracked abscissa u inside [TRANSFORM_U_MIN, TRANSFORM_U_MAX] and a boolean ghostVisible. Unknown properties are dropped.
 * Rules are checked in the order base, numbers (a, b, c, d, u), visibility; a field of the wrong type or a missing field gives
 * `issue: undefined` (the generic message).
 */
export function checkFunctionTransformationModel(data: unknown): FunctionTransformationCheck {
    const reject = (issue: FunctionTransformationIssue | undefined): FunctionTransformationCheck => ({ok: false, issue});
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {base, a, b, c, d, u, ghostVisible} = data as Record<string, unknown>;
    if (!isTransformBaseId(base)) return reject({kind: 'base', allowed: TRANSFORM_BASE_IDS});
    if (!isFiniteNumber(a) || !isFiniteNumber(b) || !isFiniteNumber(c) || !isFiniteNumber(d) || !isFiniteNumber(u)) return reject(undefined);
    const numbers = {a, b, c, d, u};
    for (const field of [...TRANSFORM_PARAMETERS, 'u'] as const) {
        const issue = fieldIssue(field, numbers[field]);
        if (issue) return reject(issue);
    }
    if (typeof ghostVisible !== 'boolean') return reject(ghostVisible === undefined ? undefined : {kind: 'visibility'});
    // The kernel's own check is the final authority on a transformable parameter set.
    if (checkTransformParams({a, b, c, d}) !== undefined) return reject(undefined);
    return {ok: true, model: {base, a, b, c, d, ghostVisible, u}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseFunctionTransformationModel(data: unknown): FunctionTransformationModel | undefined {
    const check = checkFunctionTransformationModel(data);
    return check.ok ? check.model : undefined;
}

/** Sets a, b, c or d: rejected (never clamped) when not finite, out of range, or b = 0. The same value changes nothing (the same object). */
export function setTransformParameter(model: FunctionTransformationModel, field: TransformParameter, value: number): FunctionTransformationEdit {
    const issue = fieldIssue(field, value);
    if (issue) return {ok: false, issue};
    return {ok: true, model: model[field] === value ? model : {...model, [field]: value}};
}

/** Moves the tracked abscissa u: rejected (never clamped) when not finite or out of range. */
export function moveTransformPoint(model: FunctionTransformationModel, value: number): FunctionTransformationEdit {
    const issue = fieldIssue('u', value);
    if (issue) return {ok: false, issue};
    return {ok: true, model: model.u === value ? model : {...model, u: value}};
}

/** Changing the base shape keeps a, b, c, d, u and the ghost. */
export function chooseTransformBase(model: FunctionTransformationModel, base: unknown): FunctionTransformationEdit {
    if (!isTransformBaseId(base)) return {ok: false, issue: {kind: 'base', allowed: TRANSFORM_BASE_IDS}};
    return {ok: true, model: base === model.base ? model : {...model, base}};
}

export const transformedFunctionOf = (model: FunctionTransformationModel): TransformedFunction =>
    transformedFunction(transformBaseFunction(model.base), model);

/** The tracked point (on the base graph and its image), or undefined where u lies outside the base domain. */
export const trackedPointOf = (model: FunctionTransformationModel): TrackedPoint | undefined =>
    trackedPoint(transformBaseFunction(model.base), model, model.u);

/** The order of operations of the model's parameters (always defined for a valid model). */
export const ruleStepsOf = (model: FunctionTransformationModel): readonly RuleStep[] => composedRule(model) ?? [];
