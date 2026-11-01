import {
    CONVEXITY_EXAMPLE_IDS, CONVEXITY_X_MAX, CONVEXITY_X_MIN, ConvexityExampleId, isConvexityExampleId, isConvexityInterval, isConvexityX,
} from './convexity';
import {cleanNumber} from './numbers';

/*
 * This module owns the rules of the convexity model: what is valid, how an accepted value is normalized, and which rule a rejected
 * value broke (a `ConvexityIssue`: data, never text). The Preset parser, the Preset collection's diagnosis and the graph's
 * setters all ask it; they only choose the words for an issue. Localization stays outside (`graphs/functions/convexityMessages`).
 */

/**
 * The stored description of the convexity demonstration. `secondDerivativeVisible` says whether the sign of f'' (and the
 * inflection point, if any) is shown; it is saved with the preset so a reopened preset and a lesson checkpoint show the
 * same scene. The tangent point t is independent of [a, b] and may lie outside it.
 */
export interface ConvexityModel {
    readonly example: ConvexityExampleId;
    readonly a: number;
    readonly b: number;
    readonly t: number;
    readonly secondDerivativeVisible: boolean;
}

export const DEFAULT_CONVEXITY_MODEL: ConvexityModel = {
    example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false,
};

/** The model a named example starts from. x^3 starts on an interval containing 0, where no claim can be made. */
export const CONVEXITY_EXAMPLE_MODELS: Readonly<Record<ConvexityExampleId, ConvexityModel>> = {
    square: DEFAULT_CONVEXITY_MODEL,
    negSquare: {example: 'negSquare', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false},
    cube: {example: 'cube', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false},
    quartic: {example: 'quartic', a: -1, b: 1, t: 0.5, secondDerivativeVisible: false},
};

/** The three points of the model that move along the x axis. */
export type ConvexityPoint = 'a' | 'b' | 't';

/** The rule a rejected value broke. Callers localize it; the range and the examples travel with it, so nobody restates them. */
export type ConvexityIssue =
    | { readonly kind: 'example'; readonly allowed: readonly ConvexityExampleId[] }
    /** `points` are the offending ones; every point must lie in [min, max]. */
    | { readonly kind: 'range'; readonly points: readonly ConvexityPoint[]; readonly min: number; readonly max: number }
    /** a < b failed; `moving` names the endpoint an edit tried to move (absent for a whole stored model). */
    | { readonly kind: 'order'; readonly moving?: 'a' | 'b' }
    | { readonly kind: 'visibility' };

/** The rules an edit can break: the stored-model rules except the visibility flag, which is a boolean by construction. */
export type ConvexityEditIssue = Exclude<ConvexityIssue, { kind: 'visibility' }>;

/**
 * The answer for a whole stored model: the sanitized model, or the first rule it broke. `issue` is undefined when the data is
 * malformed (not an object, or a field of the wrong type or missing) and no rule applies; callers then use their generic message.
 */
export type ConvexityCheck =
    | { readonly ok: true; readonly model: ConvexityModel }
    | { readonly ok: false; readonly issue: ConvexityIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type ConvexityEdit =
    | { readonly ok: true; readonly model: ConvexityModel }
    | { readonly ok: false; readonly issue: ConvexityEditIssue };

const reject = (issue: ConvexityIssue | undefined): ConvexityCheck => ({ok: false, issue});
const rangeIssue = (points: readonly ConvexityPoint[]): ConvexityEditIssue =>
    ({kind: 'range', points, min: CONVEXITY_X_MIN, max: CONVEXITY_X_MAX});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The single validity rule of a stored convexity model: a known example, a, b and t in [CONVEXITY_X_MIN, CONVEXITY_X_MAX],
 * a < b, and a boolean `secondDerivativeVisible`. Unknown properties are dropped. Rules are checked in the order example,
 * range, order, visibility; a field of the wrong type or a missing field gives `issue: undefined`.
 */
export function checkConvexityModel(data: unknown): ConvexityCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, a, b, t, secondDerivativeVisible} = data as Record<string, unknown>;
    if (!isConvexityExampleId(example)) return reject({kind: 'example', allowed: CONVEXITY_EXAMPLE_IDS});
    if (isFiniteNumber(a) && isFiniteNumber(b) && isFiniteNumber(t)) {
        const outside = (['a', 'b', 't'] as const).filter(point => !isConvexityX({a, b, t}[point]));
        if (outside.length > 0) return reject(rangeIssue(outside));
        if (!isConvexityInterval(a, b)) return reject({kind: 'order'});
    }
    if (secondDerivativeVisible !== undefined && typeof secondDerivativeVisible !== 'boolean') return reject({kind: 'visibility'});
    if (!isConvexityX(a) || !isConvexityX(b) || !isConvexityX(t) || typeof secondDerivativeVisible !== 'boolean') return reject(undefined);
    return {ok: true, model: {example, a, b, t, secondDerivativeVisible}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < b. */
export function parseConvexityModel(data: unknown): ConvexityModel | undefined {
    const check = checkConvexityModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's model and hides the second derivative again. */
export function chooseConvexityExample(example: unknown): ConvexityEdit {
    if (!isConvexityExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: CONVEXITY_EXAMPLE_IDS}};
    return {ok: true, model: {...CONVEXITY_EXAMPLE_MODELS[example], secondDerivativeVisible: false}};
}

/**
 * Moves one point of `model` to `value`: rejected (never clamped) unless finite and in range, and for a and b unless a < b still
 * holds. The accepted value is normalized (floating-point noise removed), so a value within noise of the current one changes nothing.
 */
export function moveConvexityPoint(model: ConvexityModel, point: ConvexityPoint, value: number): ConvexityEdit {
    if (!isConvexityX(value)) return {ok: false, issue: rangeIssue([point])};
    if (point === 'a' && !(value < model.b)) return {ok: false, issue: {kind: 'order', moving: 'a'}};
    if (point === 'b' && !(value > model.a)) return {ok: false, issue: {kind: 'order', moving: 'b'}};
    const next = cleanNumber(value);
    return {ok: true, model: next === model[point] ? model : {...model, [point]: next}};
}
