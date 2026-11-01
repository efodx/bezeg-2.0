import {FUNCTION_IDS, FunctionId, isFunctionId} from './functions';
import {ACCUMULATION_BOUND_MAX, ACCUMULATION_BOUND_MIN, isAccumulationBound} from './accumulation';

/*
 * This module owns the rules of the accumulation model: what is valid and which rule a rejected value broke (an
 * `AccumulationIssue`: data, never text). Localization stays outside (`graphs/functions/accumulationMessages`).
 */

/** The stored description of the accumulation demonstration. */
export interface AccumulationModel {
    readonly fn: FunctionId;
    /** The lower bound a of A(x) = integral from a to x of f. */
    readonly a: number;
    readonly x: number;
    /** Whether the accumulation curve A is shown; it starts hidden so the lesson can ask for an area prediction first. */
    readonly accumulationVisible: boolean;
}

export const DEFAULT_ACCUMULATION_MODEL: AccumulationModel = {fn: 'sin', a: 0, x: 2, accumulationVisible: false};

/** The two bounds of the model that move along the x axis. */
export type AccumulationPoint = 'a' | 'x';

/** The rule a rejected value broke (data, never text). The range and the functions travel with it, so nobody restates them. */
export type AccumulationIssue =
    | { readonly kind: 'function'; readonly allowed: readonly FunctionId[] }
    /** `points` are the offending ones; every point must lie in [min, max]. */
    | { readonly kind: 'range'; readonly points: readonly AccumulationPoint[]; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility' };

/** The rules an edit can break: the visibility flag is a boolean by construction. */
export type AccumulationEditIssue = Exclude<AccumulationIssue, { kind: 'visibility' }>;

/** The answer for a whole stored model; `issue` is undefined when the data is malformed and no rule applies. */
export type AccumulationCheck =
    | { readonly ok: true; readonly model: AccumulationModel }
    | { readonly ok: false; readonly issue: AccumulationIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type AccumulationEdit =
    | { readonly ok: true; readonly model: AccumulationModel }
    | { readonly ok: false; readonly issue: AccumulationEditIssue };

const reject = (issue: AccumulationIssue | undefined): AccumulationCheck => ({ok: false, issue});
const rangeIssue = (points: readonly AccumulationPoint[]): AccumulationEditIssue =>
    ({kind: 'range', points, min: ACCUMULATION_BOUND_MIN, max: ACCUMULATION_BOUND_MAX});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The single validity rule of a stored accumulation model: a known function, a and x in [ACCUMULATION_BOUND_MIN,
 * ACCUMULATION_BOUND_MAX] (no order between them), and a boolean `accumulationVisible`. Unknown properties are dropped.
 * Rules are checked in the order function, range, visibility; a field of the wrong type or a missing field gives `issue: undefined`.
 */
export function checkAccumulationModel(data: unknown): AccumulationCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {fn, a, x, accumulationVisible} = data as Record<string, unknown>;
    if (!isFunctionId(fn)) return reject({kind: 'function', allowed: FUNCTION_IDS});
    if (isFiniteNumber(a) && isFiniteNumber(x)) {
        const outside = (['a', 'x'] as const).filter(point => !isAccumulationBound({a, x}[point]));
        if (outside.length > 0) return reject(rangeIssue(outside));
    }
    if (accumulationVisible !== undefined && typeof accumulationVisible !== 'boolean') return reject({kind: 'visibility'});
    if (!isAccumulationBound(a) || !isAccumulationBound(x) || typeof accumulationVisible !== 'boolean') return reject(undefined);
    return {ok: true, model: {fn, a, x, accumulationVisible}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. All four fields are required. */
export function parseAccumulationModel(data: unknown): AccumulationModel | undefined {
    const check = checkAccumulationModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing a function keeps the bounds and the visibility flag; choosing the current one changes nothing. */
export function chooseAccumulationFunction(model: AccumulationModel, fn: unknown): AccumulationEdit {
    if (!isFunctionId(fn)) return {ok: false, issue: {kind: 'function', allowed: FUNCTION_IDS}};
    return {ok: true, model: fn === model.fn ? model : {...model, fn}};
}

/** Moves a or x to `value`: rejected (never clamped) unless finite and in range. The value is stored as given (no normalization). */
export function moveAccumulationPoint(model: AccumulationModel, point: AccumulationPoint, value: number): AccumulationEdit {
    if (!isAccumulationBound(value)) return {ok: false, issue: rangeIssue([point])};
    return {ok: true, model: value === model[point] ? model : {...model, [point]: value}};
}
