import {isMeanValueExampleId, isMeanValueX, isOrdered, MEAN_VALUE_EXAMPLE_IDS, MeanValueExampleId, MVT_X_MAX, MVT_X_MIN} from './meanValue';
import {cleanNumber} from './numbers';

/*
 * This module owns the rules of the mean value model: what is valid, how an accepted value is normalized, and which rule a
 * rejected value broke (a `MeanValueIssue`: data, never text). Localization stays outside (`graphs/functions/meanValueMessages`).
 */

/**
 * The stored description of the mean value theorem demonstration. `revealed` says whether the matching points are shown
 * (the Show matching point action); it is saved with the preset so a reopened preset and a lesson checkpoint show the
 * same scene. The matching points themselves are never stored: they are recomputed from the example, a and b.
 */
export interface MeanValueModel {
    readonly example: MeanValueExampleId;
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly revealed: boolean;
}

/** The default tangent point c = 0.5 is deliberately not the matching point c = 1, so the lesson can ask for a prediction first. */
export const DEFAULT_MEAN_VALUE_MODEL: MeanValueModel = {example: 'square', a: 0, b: 2, c: 0.5, revealed: false};

/**
 * The model a named example starts from. x^3 starts at the flat tangent c = 0 (secant slope 1, tangent slope 0) and |x|
 * at c = 0.5 (tangent slope 1, secant slope 0); the corner c = 0 of |x| is reached on purpose, never by default.
 */
export const MEAN_VALUE_EXAMPLE_MODELS: Readonly<Record<MeanValueExampleId, MeanValueModel>> = {
    square: DEFAULT_MEAN_VALUE_MODEL,
    cube: {example: 'cube', a: -1, b: 1, c: 0, revealed: false},
    abs: {example: 'abs', a: -1, b: 1, c: 0.5, revealed: false},
};

/** The three points of the model that move along the x axis. */
export type MeanValuePoint = 'a' | 'b' | 'c';

/** The rule a rejected value broke (data, never text). The range and the examples travel with it, so nobody restates them. */
export type MeanValueIssue =
    | { readonly kind: 'example'; readonly allowed: readonly MeanValueExampleId[] }
    /** `points` are the offending ones; every point must lie in [min, max]. */
    | { readonly kind: 'range'; readonly points: readonly MeanValuePoint[]; readonly min: number; readonly max: number }
    /** a < c < b failed; `moving` names the point an edit tried to move (absent for a whole stored model). */
    | { readonly kind: 'order'; readonly moving?: MeanValuePoint }
    | { readonly kind: 'revealed' };

/** The rules an edit can break: `revealed` is a boolean by construction, and an order failure always names its point. */
export type MeanValueEditIssue =
    | Exclude<MeanValueIssue, { kind: 'revealed' } | { kind: 'order' }>
    | { readonly kind: 'order'; readonly moving: MeanValuePoint };

/** The answer for a whole stored model; `issue` is undefined when the data is malformed and no rule applies. */
export type MeanValueCheck =
    | { readonly ok: true; readonly model: MeanValueModel }
    | { readonly ok: false; readonly issue: MeanValueIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type MeanValueEdit =
    | { readonly ok: true; readonly model: MeanValueModel }
    | { readonly ok: false; readonly issue: MeanValueEditIssue };

const reject = (issue: MeanValueIssue | undefined): MeanValueCheck => ({ok: false, issue});
const rangeIssue = (points: readonly MeanValuePoint[]): MeanValueEditIssue => ({kind: 'range', points, min: MVT_X_MIN, max: MVT_X_MAX});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The single validity rule of a stored mean value model: a known example, a, b and c in [MVT_X_MIN, MVT_X_MAX] with
 * a < c < b, and a boolean `revealed`. Unknown properties are dropped. Rules are checked in the order example, order,
 * range, revealed; a field of the wrong type or a missing field gives `issue: undefined`.
 */
export function checkMeanValueModel(data: unknown): MeanValueCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, a, b, c, revealed} = data as Record<string, unknown>;
    if (!isMeanValueExampleId(example)) return reject({kind: 'example', allowed: MEAN_VALUE_EXAMPLE_IDS});
    if (isFiniteNumber(a) && isFiniteNumber(b) && isFiniteNumber(c)) {
        if (!isOrdered(a, c, b)) return reject({kind: 'order'});
        const outside = (['a', 'b', 'c'] as const).filter(point => !isMeanValueX({a, b, c}[point]));
        if (outside.length > 0) return reject(rangeIssue(outside));
    }
    if (revealed !== undefined && typeof revealed !== 'boolean') return reject({kind: 'revealed'});
    if (!isMeanValueX(a) || !isMeanValueX(b) || !isMeanValueX(c) || typeof revealed !== 'boolean') return reject(undefined);
    return {ok: true, model: {example, a, b, c, revealed}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < c < b. */
export function parseMeanValueModel(data: unknown): MeanValueModel | undefined {
    const check = checkMeanValueModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's model (its interval, tangent point and hidden matching points). */
export function chooseMeanValueExample(example: unknown): MeanValueEdit {
    if (!isMeanValueExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: MEAN_VALUE_EXAMPLE_IDS}};
    return {ok: true, model: {...MEAN_VALUE_EXAMPLE_MODELS[example]}};
}

/**
 * Moves one point of `model` to `value`: rejected (never clamped) unless finite and in range, and unless a < c < b still holds.
 * The accepted value is normalized (floating-point noise removed), so a value within noise of the current one changes nothing.
 */
export function moveMeanValuePoint(model: MeanValueModel, point: MeanValuePoint, value: number): MeanValueEdit {
    if (!isMeanValueX(value)) return {ok: false, issue: rangeIssue([point])};
    const ordered = point === 'a' ? isOrdered(value, model.c, model.b)
        : point === 'b' ? isOrdered(model.a, model.c, value) : isOrdered(model.a, value, model.b);
    if (!ordered) return {ok: false, issue: {kind: 'order', moving: point}};
    const next = cleanNumber(value);
    return {ok: true, model: next === model[point] ? model : {...model, [point]: next}};
}
