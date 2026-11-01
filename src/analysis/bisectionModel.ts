import {
    BISECTION_BOUND_MAX, BISECTION_BOUND_MIN, BISECTION_EXAMPLE_IDS, BISECTION_EXAMPLES, BISECTION_MAX_STEPS, BisectionExampleId, isBisectionBracket,
    isBisectionEndpoint, isBisectionExampleId, isBisectionStepCount,
} from './bisection';

/*
 * This module owns the rules of the bisection model: what is valid and which rule a rejected value broke (a `BisectionIssue`: data,
 * never text). The Preset parser, the Preset collection's diagnosis and the graph's setters all ask it; they only choose the words
 * (`graphs/functions/bisectionMessages`).
 */

/**
 * The stored description of the bisection demonstration: `step` is the iteration index (how many steps are revealed).
 * Playback state is not stored; a reopened preset is paused. The history is recomputed from these fields.
 */
export interface BisectionModel {
    readonly example: BisectionExampleId;
    readonly a: number;
    readonly b: number;
    readonly step: number;
}

const DEFAULT_EXAMPLE = BISECTION_EXAMPLES['square-minus-two'];

export const DEFAULT_BISECTION_MODEL: BisectionModel = {
    example: DEFAULT_EXAMPLE.id, a: DEFAULT_EXAMPLE.defaultA, b: DEFAULT_EXAMPLE.defaultB, step: 0,
};

/** The two endpoints of the bracket. */
export type BisectionEndpoint = 'a' | 'b';

/** The rule a rejected value broke. Callers localize it; the range and the examples travel with it, so nobody restates them. */
export type BisectionIssue =
    | { readonly kind: 'example'; readonly allowed: readonly BisectionExampleId[] }
    /** `endpoints` are the offending ones; every endpoint must lie in [min, max]. */
    | { readonly kind: 'range'; readonly endpoints: readonly BisectionEndpoint[]; readonly min: number; readonly max: number }
    /** a < b failed; `moving` names the endpoint an edit tried to move (absent for a whole stored model). */
    | { readonly kind: 'order'; readonly moving?: BisectionEndpoint }
    | { readonly kind: 'step'; readonly max: number };

/** The rules an edit can break: the example and the endpoints (the step is set by the iteration, not edited). */
export type BisectionEditIssue = Exclude<BisectionIssue, { kind: 'step' }>;

/** The answer for a whole stored model: the sanitized model, or the first rule it broke (`issue` undefined = malformed, generic message). */
export type BisectionCheck =
    | { readonly ok: true; readonly model: BisectionModel }
    | { readonly ok: false; readonly issue: BisectionIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type BisectionEdit =
    | { readonly ok: true; readonly model: BisectionModel }
    | { readonly ok: false; readonly issue: BisectionEditIssue };

const reject = (issue: BisectionIssue | undefined): BisectionCheck => ({ok: false, issue});
const rangeIssue = (endpoints: readonly BisectionEndpoint[]): Extract<BisectionIssue, { kind: 'range' }> =>
    ({kind: 'range', endpoints, min: BISECTION_BOUND_MIN, max: BISECTION_BOUND_MAX});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * The single validity rule of a stored bisection model: a known example, endpoints a and b in [BISECTION_BOUND_MIN,
 * BISECTION_BOUND_MAX] with a < b, and a step count that is an integer in [0, BISECTION_MAX_STEPS]. Unknown properties are dropped.
 * Rules are checked in the order example, range, order, step; a field of the wrong type or a missing field gives `issue: undefined`.
 */
export function checkBisectionModel(data: unknown): BisectionCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, a, b, step} = data as Record<string, unknown>;
    if (!isBisectionExampleId(example)) return reject({kind: 'example', allowed: BISECTION_EXAMPLE_IDS});
    if (isFiniteNumber(a) && isFiniteNumber(b)) {
        if (!isBisectionEndpoint(a) || !isBisectionEndpoint(b)) {
            return reject(rangeIssue((['a', 'b'] as const).filter(endpoint => !isBisectionEndpoint({a, b}[endpoint]))));
        }
        if (!(a < b)) return reject({kind: 'order'});
    }
    if (step !== undefined && !isBisectionStepCount(step)) return reject({kind: 'step', max: BISECTION_MAX_STEPS});
    if (typeof a !== 'number' || typeof b !== 'number' || !isBisectionBracket(a, b) || !isBisectionStepCount(step)) return reject(undefined);
    return {ok: true, model: {example, a, b, step}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseBisectionModel(data: unknown): BisectionModel | undefined {
    const check = checkBisectionModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's default bracket and returns the iteration to its start. */
export function chooseBisectionExample(example: unknown): BisectionEdit {
    if (!isBisectionExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: BISECTION_EXAMPLE_IDS}};
    const {defaultA, defaultB} = BISECTION_EXAMPLES[example];
    return {ok: true, model: {example, a: defaultA, b: defaultB, step: 0}};
}

/**
 * Moves one endpoint of `model` to `value`: rejected (never clamped) unless it is finite, in range and keeps a < b. An accepted
 * change returns the iteration to its start; the same value changes nothing (the same object comes back).
 */
export function moveBisectionEndpoint(model: BisectionModel, endpoint: BisectionEndpoint, value: number): BisectionEdit {
    if (!isBisectionEndpoint(value)) return {ok: false, issue: rangeIssue([endpoint])};
    const ordered = endpoint === 'a' ? isBisectionBracket(value, model.b) : isBisectionBracket(model.a, value);
    if (!ordered) return {ok: false, issue: {kind: 'order', moving: endpoint}};
    return {ok: true, model: value === model[endpoint] ? model : {...model, [endpoint]: value, step: 0}};
}
