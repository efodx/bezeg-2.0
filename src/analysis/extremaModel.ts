import {
    EXTREMA_EXAMPLE_IDS, EXTREMA_X_MAX, EXTREMA_X_MIN, ExtremaExampleId, isExtremaExampleId, isExtremaX, isInterval,
} from './extrema';
import {cleanNoise} from './numbers';

/*
 * This module owns the rules of the extrema model: what is valid, how an accepted value is normalized, and which rule a rejected
 * value broke (an `ExtremaIssue`: data, never text). Localization stays outside (`graphs/functions/extremaMessages`).
 */

/**
 * The stored description of the extrema demonstration. `revealed` says whether the local and global classification is
 * shown (the Show classification action); it is saved with the preset so a reopened preset and a lesson checkpoint show
 * the same scene. Candidates and classifications are never stored: they are recomputed from the example, a and b.
 */
export interface ExtremaModel {
    readonly example: ExtremaExampleId;
    readonly a: number;
    readonly b: number;
    readonly revealed: boolean;
}

/** x^2 on [-1, 2]: an endpoint maximum at -1 (local) and 2 (global) and the minimum 0 in between. */
export const DEFAULT_EXTREMA_MODEL: ExtremaModel = {example: 'square', a: -1, b: 2, revealed: false};

/** The model a named example starts from. */
export const EXTREMA_EXAMPLE_MODELS: Readonly<Record<ExtremaExampleId, ExtremaModel>> = {
    square: DEFAULT_EXTREMA_MODEL,
    cube: {example: 'cube', a: -1, b: 1, revealed: false},
    abs: {example: 'abs', a: -1, b: 1, revealed: false},
    sine: {example: 'sine', a: -4, b: 4, revealed: false},
};

/** The two endpoints of the interval. */
export type ExtremaEndpoint = 'a' | 'b';

/** The rule a rejected value broke. Callers localize it; the range and the examples travel with it. */
export type ExtremaIssue =
    | { readonly kind: 'example'; readonly allowed: readonly ExtremaExampleId[] }
    /** `points` are the offending endpoints; every endpoint must lie in [min, max]. */
    | { readonly kind: 'range'; readonly points: readonly ExtremaEndpoint[]; readonly min: number; readonly max: number }
    /** a < b failed; `moving` names the endpoint an edit tried to move (absent for a whole stored model). */
    | { readonly kind: 'order'; readonly moving?: ExtremaEndpoint }
    | { readonly kind: 'visibility' };

/** The rules an edit can break: the stored-model rules except the visibility flag, which is a boolean by construction. */
export type ExtremaEditIssue = Exclude<ExtremaIssue, { kind: 'visibility' }>;

/** The sanitized model, or the first rule a stored model broke (`issue` undefined = malformed, use the generic message). */
export type ExtremaCheck =
    | { readonly ok: true; readonly model: ExtremaModel }
    | { readonly ok: false; readonly issue: ExtremaIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type ExtremaEdit =
    | { readonly ok: true; readonly model: ExtremaModel }
    | { readonly ok: false; readonly issue: ExtremaEditIssue };

const reject = (issue: ExtremaIssue | undefined): ExtremaCheck => ({ok: false, issue});
const rangeIssue = (points: readonly ExtremaEndpoint[]): ExtremaEditIssue => ({kind: 'range', points, min: EXTREMA_X_MIN, max: EXTREMA_X_MAX});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The single validity rule of a stored extrema model: a known example, a and b in [EXTREMA_X_MIN, EXTREMA_X_MAX], a < b and a boolean
 * `revealed`. Unknown properties are dropped. Rules are checked in the order example, range, order, visibility; a field of the wrong
 * type or a missing field gives `issue: undefined`.
 */
export function checkExtremaModel(data: unknown): ExtremaCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, a, b, revealed} = data as Record<string, unknown>;
    if (!isExtremaExampleId(example)) return reject({kind: 'example', allowed: EXTREMA_EXAMPLE_IDS});
    if (isFiniteNumber(a) && isFiniteNumber(b)) {
        if (!isExtremaX(a) || !isExtremaX(b)) return reject(rangeIssue(([['a', a], ['b', b]] as const).filter(([, x]) => !isExtremaX(x)).map(([point]) => point)));
        if (!(a < b)) return reject({kind: 'order'});
    }
    if (revealed !== undefined && typeof revealed !== 'boolean') return reject({kind: 'visibility'});
    if (!isExtremaX(a) || !isExtremaX(b) || typeof revealed !== 'boolean' || !isInterval(a, b)) return reject(undefined);
    return {ok: true, model: {example, a, b, revealed}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < b. */
export function parseExtremaModel(data: unknown): ExtremaModel | undefined {
    const check = checkExtremaModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's model and hides the classification again. */
export function chooseExtremaExample(example: unknown): ExtremaEdit {
    if (!isExtremaExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: EXTREMA_EXAMPLE_IDS}};
    return {ok: true, model: {...EXTREMA_EXAMPLE_MODELS[example], revealed: false}};
}

/**
 * Moves one endpoint of `model` to `value`: rejected (never clamped) unless finite and in range and a < b still holds. The accepted
 * value is normalized (floating-point noise removed), so a value within noise of the current one changes nothing.
 */
export function moveExtremaEndpoint(model: ExtremaModel, endpoint: ExtremaEndpoint, value: number): ExtremaEdit {
    if (!isExtremaX(value)) return {ok: false, issue: rangeIssue([endpoint])};
    if (endpoint === 'a' && !(value < model.b)) return {ok: false, issue: {kind: 'order', moving: 'a'}};
    if (endpoint === 'b' && !(value > model.a)) return {ok: false, issue: {kind: 'order', moving: 'b'}};
    const next = cleanNoise(value);
    return {ok: true, model: next === model[endpoint] ? model : {...model, [endpoint]: next}};
}
