import {
    canRefine, DARBOUX_EXAMPLE_IDS, DARBOUX_N_MAX, DARBOUX_N_MIN, DARBOUX_X_MAX, DARBOUX_X_MIN, DarbouxExampleId, isDarbouxCount, isDarbouxExampleId,
    isDarbouxX,
} from './darboux';
import {cleanNoise} from './numbers';

/*
 * This module owns the rules of the Darboux model: what is valid, how an accepted value is normalized, and which rule a rejected
 * value broke (a `DarbouxIssue`: data, never text). The Preset parser, the Preset collection's diagnosis and the graph's setters all
 * ask it; they only choose the words (`graphs/functions/darbouxMessages`).
 */

/**
 * The stored description of the Darboux sums demonstration. Sums, infima and suprema are never stored: they are
 * recomputed from the example, a, b and n.
 */
export interface DarbouxModel {
    readonly example: DarbouxExampleId;
    readonly a: number;
    readonly b: number;
    readonly n: number;
    readonly lowerVisible: boolean;
    readonly upperVisible: boolean;
}

export const DEFAULT_DARBOUX_MODEL: DarbouxModel = {example: 'square', a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: true};

/** The model a named example starts from. The sine interval ends are stored exactly (0 and 2 pi are not on the 0.01 grid). */
export const DARBOUX_EXAMPLE_MODELS: Readonly<Record<DarbouxExampleId, DarbouxModel>> = {
    square: DEFAULT_DARBOUX_MODEL,
    sine: {example: 'sine', a: 0, b: 2 * Math.PI, n: 4, lowerVisible: true, upperVisible: true},
};

/** The two endpoints of the interval. */
export type DarbouxEndpoint = 'a' | 'b';

/** The rule a rejected value broke. Callers localize it; the ranges and the examples travel with it, so nobody restates them. */
export type DarbouxIssue =
    | { readonly kind: 'example'; readonly allowed: readonly DarbouxExampleId[] }
    /** `endpoints` are the offending ones; every endpoint must lie in [min, max]. */
    | { readonly kind: 'range'; readonly endpoints: readonly DarbouxEndpoint[]; readonly min: number; readonly max: number }
    /** a < b failed; `moving` names the endpoint an edit tried to move (absent for a whole stored model). */
    | { readonly kind: 'order'; readonly moving?: DarbouxEndpoint }
    | { readonly kind: 'count'; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility' };

/** The rules an edit can break: the stored-model rules except the visibility flags (booleans by construction), plus the refine limit. */
export type DarbouxEditIssue = Exclude<DarbouxIssue, { kind: 'visibility' }> | { readonly kind: 'refine-limit'; readonly max: number };

/** The answer for a whole stored model: the sanitized model, or the first rule it broke (`issue` undefined = malformed, generic message). */
export type DarbouxCheck =
    | { readonly ok: true; readonly model: DarbouxModel }
    | { readonly ok: false; readonly issue: DarbouxIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type DarbouxEdit =
    | { readonly ok: true; readonly model: DarbouxModel }
    | { readonly ok: false; readonly issue: DarbouxEditIssue };

const reject = (issue: DarbouxIssue | undefined): DarbouxCheck => ({ok: false, issue});
const rangeIssue = (endpoints: readonly DarbouxEndpoint[]): Extract<DarbouxIssue, { kind: 'range' }> =>
    ({kind: 'range', endpoints, min: DARBOUX_X_MIN, max: DARBOUX_X_MAX});
const countIssue = {kind: 'count', min: DARBOUX_N_MIN, max: DARBOUX_N_MAX} as const;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The single validity rule of a stored Darboux model: a known example, endpoints a and b in [DARBOUX_X_MIN, DARBOUX_X_MAX] with
 * a < b, an integer n from DARBOUX_N_MIN to DARBOUX_N_MAX, and boolean visibility flags. Unknown properties are dropped. Rules are
 * checked in the order example, range, order, count, visibility; a field of the wrong type or a missing field gives `issue: undefined`.
 */
export function checkDarbouxModel(data: unknown): DarbouxCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, a, b, n, lowerVisible, upperVisible} = data as Record<string, unknown>;
    if (!isDarbouxExampleId(example)) return reject({kind: 'example', allowed: DARBOUX_EXAMPLE_IDS});
    if (isFiniteNumber(a) && isFiniteNumber(b)) {
        if (!isDarbouxX(a) || !isDarbouxX(b)) return reject(rangeIssue((['a', 'b'] as const).filter(endpoint => !isDarbouxX({a, b}[endpoint]))));
        if (!(a < b)) return reject({kind: 'order'});
    }
    if (n !== undefined && !isDarbouxCount(n)) return reject(countIssue);
    if ((lowerVisible !== undefined && typeof lowerVisible !== 'boolean') || (upperVisible !== undefined && typeof upperVisible !== 'boolean')) {
        return reject({kind: 'visibility'});
    }
    if (!isDarbouxX(a) || !isDarbouxX(b) || !(a < b) || !isDarbouxCount(n)) return reject(undefined);
    if (typeof lowerVisible !== 'boolean' || typeof upperVisible !== 'boolean') return reject(undefined);
    return {ok: true, model: {example, a, b, n, lowerVisible, upperVisible}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model with a < b. */
export function parseDarbouxModel(data: unknown): DarbouxModel | undefined {
    const check = checkDarbouxModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's endpoints and n and keeps which sums are shown. */
export function chooseDarbouxExample(model: DarbouxModel, example: unknown): DarbouxEdit {
    if (!isDarbouxExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: DARBOUX_EXAMPLE_IDS}};
    return {ok: true, model: {...DARBOUX_EXAMPLE_MODELS[example], lowerVisible: model.lowerVisible, upperVisible: model.upperVisible}};
}

/**
 * Moves one endpoint of `model` to `value`: rejected (never clamped) unless finite, in range and keeping a < b. The accepted value
 * has floating-point noise removed (an irrational endpoint such as pi stays exact), so a value within noise of the current one
 * changes nothing (the same object comes back).
 */
export function moveDarbouxEndpoint(model: DarbouxModel, endpoint: DarbouxEndpoint, value: number): DarbouxEdit {
    if (!isDarbouxX(value)) return {ok: false, issue: rangeIssue([endpoint])};
    if (endpoint === 'a' && !(value < model.b)) return {ok: false, issue: {kind: 'order', moving: 'a'}};
    if (endpoint === 'b' && !(value > model.a)) return {ok: false, issue: {kind: 'order', moving: 'b'}};
    const next = cleanNoise(value);
    return {ok: true, model: next === model[endpoint] ? model : {...model, [endpoint]: next}};
}

/** Sets the number of parts: rejected unless an integer from DARBOUX_N_MIN to DARBOUX_N_MAX. */
export function setDarbouxCount(model: DarbouxModel, n: number): DarbouxEdit {
    if (!isDarbouxCount(n)) return {ok: false, issue: countIssue};
    return {ok: true, model: n === model.n ? model : {...model, n}};
}

/** Doubles n (every part is bisected, so the partition is nested); refused at the limit. */
export function refineDarbouxPartition(model: DarbouxModel): DarbouxEdit {
    if (!canRefine(model.n)) return {ok: false, issue: {kind: 'refine-limit', max: DARBOUX_N_MAX}};
    return setDarbouxCount(model, 2 * model.n);
}
