import {
    isRootFindingExampleId, isRootFindingStepCount, isRootStart, isSecantStartPair, newtonHistory, ROOT_FINDING_EXAMPLE_IDS, ROOT_FINDING_EXAMPLES,
    ROOT_FINDING_MAX_STEPS, ROOT_START_MAX, ROOT_START_MIN, RootFindingExampleId, RootFindingHistory, secantHistory,
} from './rootFinding';

/*
 * This module owns the rules of the root-finding model (Newton's and the secant method): what is valid and which rule a rejected value
 * broke (a `RootFindingIssue`: data, never text). The Preset parser, the Preset collection's diagnosis and the graph's setters all
 * ask it; they only choose the words (`graphs/functions/rootFindingMessages`).
 */

export const ROOT_FINDING_METHODS = ['newton', 'secant'] as const;
export type RootFindingMethod = typeof ROOT_FINDING_METHODS[number];
export const isRootFindingMethod = (value: unknown): value is RootFindingMethod =>
    typeof value === 'string' && (ROOT_FINDING_METHODS as readonly string[]).includes(value);

/**
 * The stored description of the demonstration: `step` is the number of revealed iteration steps. Newton's method uses `x0`; the
 * secant method uses `x0` and `x1`. Playback state and the history are never stored; the history is recomputed from these fields.
 */
export interface RootFindingModel {
    readonly method: RootFindingMethod;
    readonly example: RootFindingExampleId;
    readonly x0: number;
    readonly x1: number;
    readonly step: number;
}

const DEFAULT_EXAMPLE = ROOT_FINDING_EXAMPLES['square-minus-two'];

export const DEFAULT_ROOT_FINDING_MODEL: RootFindingModel = {
    method: 'newton', example: DEFAULT_EXAMPLE.id, x0: DEFAULT_EXAMPLE.defaultStart, x1: DEFAULT_EXAMPLE.defaultSecondStart, step: 0,
};

export type RootFindingStart = 'x0' | 'x1';

/** The rule a rejected value broke. Callers localize it; the range and the allowed values travel with it. */
export type RootFindingIssue =
    | { readonly kind: 'method'; readonly allowed: readonly RootFindingMethod[] }
    | { readonly kind: 'example'; readonly allowed: readonly RootFindingExampleId[] }
    /** `starts` are the offending ones; every start must lie in [min, max]. */
    | { readonly kind: 'range'; readonly starts: readonly RootFindingStart[]; readonly min: number; readonly max: number }
    /** The secant method needs two different starts; `moving` names the start an edit tried to move (absent for a stored model or a method switch). */
    | { readonly kind: 'equal-starts'; readonly moving?: RootFindingStart }
    | { readonly kind: 'step'; readonly max: number };

/** The rules an edit can break (the step is set by the iteration, not edited). */
export type RootFindingEditIssue = Exclude<RootFindingIssue, { kind: 'step' }>;

export type RootFindingCheck =
    | { readonly ok: true; readonly model: RootFindingModel }
    | { readonly ok: false; readonly issue: RootFindingIssue | undefined };

export type RootFindingEdit =
    | { readonly ok: true; readonly model: RootFindingModel }
    | { readonly ok: false; readonly issue: RootFindingEditIssue };

const reject = (issue: RootFindingIssue | undefined): RootFindingCheck => ({ok: false, issue});
const rangeIssue = (starts: readonly RootFindingStart[]): Extract<RootFindingIssue, { kind: 'range' }> =>
    ({kind: 'range', starts, min: ROOT_START_MIN, max: ROOT_START_MAX});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const startsValid = (method: RootFindingMethod, x0: number, x1: number): boolean =>
    method === 'secant' ? isSecantStartPair(x0, x1) : isRootStart(x0) && isRootStart(x1);

/**
 * The single validity rule of a stored model: a known method and example, both starts in [ROOT_START_MIN, ROOT_START_MAX] (different
 * for the secant method) and a step count that is an integer in [0, ROOT_FINDING_MAX_STEPS]. Unknown properties are dropped. Rules
 * are checked in the order method, example, range, equal starts, step; a field of the wrong type or a missing field gives
 * `issue: undefined` (the generic message).
 */
export function checkRootFindingModel(data: unknown): RootFindingCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {method, example, x0, x1, step} = data as Record<string, unknown>;
    if (!isRootFindingMethod(method)) return reject({kind: 'method', allowed: ROOT_FINDING_METHODS});
    if (!isRootFindingExampleId(example)) return reject({kind: 'example', allowed: ROOT_FINDING_EXAMPLE_IDS});
    if (isFiniteNumber(x0) && isFiniteNumber(x1)) {
        if (!isRootStart(x0) || !isRootStart(x1)) {
            return reject(rangeIssue((['x0', 'x1'] as const).filter(start => !isRootStart({x0, x1}[start]))));
        }
        if (method === 'secant' && x0 === x1) return reject({kind: 'equal-starts'});
    }
    if (step !== undefined && !isRootFindingStepCount(step)) return reject({kind: 'step', max: ROOT_FINDING_MAX_STEPS});
    if (typeof x0 !== 'number' || typeof x1 !== 'number' || !startsValid(method, x0, x1) || !isRootFindingStepCount(step)) return reject(undefined);
    return {ok: true, model: {method, example, x0, x1, step}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. */
export function parseRootFindingModel(data: unknown): RootFindingModel | undefined {
    const check = checkRootFindingModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's default starts and returns the iteration to its start; the method stays. */
export function chooseRootFindingExample(model: RootFindingModel, example: unknown): RootFindingEdit {
    if (!isRootFindingExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: ROOT_FINDING_EXAMPLE_IDS}};
    const {defaultStart, defaultSecondStart} = ROOT_FINDING_EXAMPLES[example];
    return {ok: true, model: {...model, example, x0: defaultStart, x1: defaultSecondStart, step: 0}};
}

/** Switching the method keeps the example and the starts and returns the iteration to its start; the same method changes nothing. */
export function chooseRootFindingMethod(model: RootFindingModel, method: unknown): RootFindingEdit {
    if (!isRootFindingMethod(method)) return {ok: false, issue: {kind: 'method', allowed: ROOT_FINDING_METHODS}};
    if (method === model.method) return {ok: true, model};
    if (!startsValid(method, model.x0, model.x1)) return {ok: false, issue: {kind: 'equal-starts'}};
    return {ok: true, model: {...model, method, step: 0}};
}

/**
 * Moves one start of `model` to `value`: rejected (never clamped) unless it is finite, in range and, for the secant method, different
 * from the other start. An accepted change returns the iteration to its start; the same value changes nothing (the same object).
 */
export function moveRootFindingStart(model: RootFindingModel, start: RootFindingStart, value: number): RootFindingEdit {
    if (!isRootStart(value)) return {ok: false, issue: rangeIssue([start])};
    const other = start === 'x0' ? model.x1 : model.x0;
    if (model.method === 'secant' && value === other) return {ok: false, issue: {kind: 'equal-starts', moving: start}};
    return {ok: true, model: value === model[start] ? model : {...model, [start]: value, step: 0}};
}

/** The history of a model, recomputed from the kernel. */
export function rootFindingHistoryOf(model: RootFindingModel): RootFindingHistory {
    return model.method === 'newton'
        ? newtonHistory(model.example, model.x0, model.step)
        : secantHistory(model.example, model.x0, model.x1, model.step);
}
