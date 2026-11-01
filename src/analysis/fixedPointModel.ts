import {
    FIXED_POINT_EXAMPLE_IDS, FIXED_POINT_EXAMPLES, FIXED_POINT_MAX_DIGITS, FIXED_POINT_MAX_STEPS, FIXED_POINT_MIN_DIGITS, FixedPointExampleId,
    fixedPointExample, fixedPointHistory, FixedPointHistory, fixedPointHundredths, isFixedPointDigits, isFixedPointExampleId, isFixedPointStart,
    isFixedPointStepCount,
} from './fixedPoint';
import {cleanNumber} from './numbers';

/*
 * This module owns the rules of the fixed-point model: what is valid, how an accepted value is normalized, and which rule a rejected
 * value broke (a `FixedPointIssue`: data, never text). The Preset parser, the Preset collection's diagnosis and the graph's setters
 * all ask it; they only choose the words (`graphs/functions/fixedPointMessages`).
 */

/**
 * The stored description of the fixed-point demonstration: `step` is the iteration index (how many iterates are revealed).
 * Playback state is not stored; a reopened preset is paused. The history is recomputed from these fields.
 */
export interface FixedPointModel {
    readonly example: FixedPointExampleId;
    /** The start x0, on the 0.01 grid inside the example's interval. */
    readonly x0: number;
    readonly step: number;
    /** Tolerance digits d: the threshold is 10^-d. */
    readonly digits: number;
    /** Whether the error bound panel is shown. */
    readonly boundVisible: boolean;
}

const DEFAULT_EXAMPLE = FIXED_POINT_EXAMPLES.affine;

export const DEFAULT_FIXED_POINT_DIGITS = 3;

export const DEFAULT_FIXED_POINT_MODEL: FixedPointModel = {
    example: DEFAULT_EXAMPLE.id, x0: DEFAULT_EXAMPLE.defaultX0, step: 0, digits: DEFAULT_FIXED_POINT_DIGITS, boundVisible: false,
};

/** The default model of an example: its own start, step 0, the given digits, the bound hidden. */
export function defaultFixedPointModel(example: FixedPointExampleId, digits: number = DEFAULT_FIXED_POINT_DIGITS): FixedPointModel {
    return {example, x0: FIXED_POINT_EXAMPLES[example].defaultX0, step: 0, digits, boundVisible: false};
}

/** The rule a rejected value broke. Callers localize it; the range and the examples travel with it, so nobody restates them. */
export type FixedPointIssue =
    | { readonly kind: 'example'; readonly allowed: readonly FixedPointExampleId[] }
    /** x0 must be a multiple of 0.01 in [min, max], the interval of `example`. */
    | { readonly kind: 'x0'; readonly example: FixedPointExampleId; readonly min: number; readonly max: number }
    | { readonly kind: 'step'; readonly max: number }
    | { readonly kind: 'digits'; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility' };

/** The rules an edit can break: the example, the start and the tolerance digits (the other fields are not typed in). */
export type FixedPointEditIssue = Extract<FixedPointIssue, { kind: 'example' | 'x0' | 'digits' }>;

/**
 * The answer for a whole stored model: the sanitized model, or the first rule it broke. `issue` is undefined when the data is
 * malformed (not an object, or a field of the wrong type or missing) and no rule applies; callers then use their generic message.
 */
export type FixedPointCheck =
    | { readonly ok: true; readonly model: FixedPointModel }
    | { readonly ok: false; readonly issue: FixedPointIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type FixedPointEdit =
    | { readonly ok: true; readonly model: FixedPointModel }
    | { readonly ok: false; readonly issue: FixedPointEditIssue };

const reject = (issue: FixedPointIssue | undefined): FixedPointCheck => ({ok: false, issue});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const startIssue = (example: FixedPointExampleId): FixedPointEditIssue => {
    const {a, b} = fixedPointExample(example);
    return {kind: 'x0', example, min: a, max: b};
};
const digitsIssue = (): FixedPointEditIssue => ({kind: 'digits', min: FIXED_POINT_MIN_DIGITS, max: FIXED_POINT_MAX_DIGITS});

/**
 * The single validity rule of a stored fixed-point model: a known example, x0 on the 0.01 grid inside the example's interval, an
 * integer step in 0..FIXED_POINT_MAX_STEPS, integer digits in 1..8 and a boolean `boundVisible`. Rules are checked in the order
 * example, x0, step, digits, visibility; a field of the wrong type or a missing field gives `issue: undefined`. Never clamps.
 */
export function checkFixedPointModel(data: unknown): FixedPointCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, x0, step, digits, boundVisible} = data as Record<string, unknown>;
    if (!isFixedPointExampleId(example)) return reject({kind: 'example', allowed: FIXED_POINT_EXAMPLE_IDS});
    if (isFiniteNumber(x0) && !isFixedPointStart(example, x0)) return reject(startIssue(example));
    if (isFiniteNumber(step) && !isFixedPointStepCount(step)) return reject({kind: 'step', max: FIXED_POINT_MAX_STEPS});
    if (isFiniteNumber(digits) && !isFixedPointDigits(digits)) return reject(digitsIssue());
    if (boundVisible !== undefined && typeof boundVisible !== 'boolean') return reject({kind: 'visibility'});
    if (!isFixedPointStart(example, x0) || !isFixedPointStepCount(step) || !isFixedPointDigits(digits) || typeof boundVisible !== 'boolean') return reject(undefined);
    return {ok: true, model: {example, x0, step, digits, boundVisible}};
}

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. Never clamps. */
export function parseFixedPointModel(data: unknown): FixedPointModel | undefined {
    const check = checkFixedPointModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's default model, keeping only the tolerance digits. */
export function chooseFixedPointExample(model: FixedPointModel, example: unknown): FixedPointEdit {
    if (!isFixedPointExampleId(example)) return {ok: false, issue: {kind: 'example', allowed: FIXED_POINT_EXAMPLE_IDS}};
    return {ok: true, model: defaultFixedPointModel(example, model.digits)};
}

/**
 * The model with a new start x0 (step back to 0). Arithmetic noise such as 0.06 + 0.01 is snapped to the 0.01 grid; a value that is
 * really off the grid or outside the example's interval is refused. The current x0 returns the same model.
 */
export function changeFixedPointStart(model: FixedPointModel, value: unknown): FixedPointEdit {
    const snapped = isFiniteNumber(value) && Math.abs(value / 0.01 - Math.round(value / 0.01)) <= 1e-9 ? cleanNumber(Math.round(value / 0.01) * 0.01) : undefined;
    if (snapped === undefined || fixedPointHundredths(snapped) === undefined || !isFixedPointStart(model.example, snapped)) {
        return {ok: false, issue: startIssue(model.example)};
    }
    return {ok: true, model: snapped === model.x0 ? model : {...model, x0: snapped, step: 0}};
}

/** The model with new tolerance digits d (step back to 0). The current digits return the same model. */
export function changeFixedPointDigits(model: FixedPointModel, value: unknown): FixedPointEdit {
    if (!isFixedPointDigits(value)) return {ok: false, issue: digitsIssue()};
    return {ok: true, model: value === model.digits ? model : {...model, digits: value, step: 0}};
}

export function fixedPointHistoryOf(model: FixedPointModel): FixedPointHistory {
    return fixedPointHistory(model.example, model.x0, model.step, model.digits);
}

/** The model with `step` cut to the steps the history can take (a stored step may lie beyond a termination). */
export function normalizeFixedPointModel(model: FixedPointModel): FixedPointModel {
    const taken = fixedPointHistoryOf(model).step;
    return taken === model.step ? model : {...model, step: taken};
}

/** True while another step is possible: the iteration has not terminated. */
export const fixedPointCanAdvance = (model: FixedPointModel): boolean => fixedPointHistoryOf(model).termination === undefined;

/** Same shape as the iteration controller's outcome, without importing the runtime into the mathematics. */
export type FixedPointOutcome = 'continue' | 'complete';

export interface FixedPointTransition {
    /** The model after the transition; the input itself when no step was possible. */
    readonly model: FixedPointModel;
    /** 'complete' when the iteration has terminated (limit, threshold, stagnation, known fixed point), after this step or already before it. */
    readonly outcome: FixedPointOutcome;
}

/**
 * The one pure transition of the iteration: Next step and every playback step run it.
 * It advances `step` by one and reports 'complete' when the resulting history has terminated; a model that
 * cannot advance is returned unchanged with 'complete'. k transitions from step 0 give the same model as step k.
 */
export function fixedPointTransition(model: FixedPointModel): FixedPointTransition {
    if (!fixedPointCanAdvance(model)) return {model, outcome: 'complete'};
    const next = fixedPointHistory(model.example, model.x0, model.step + 1, model.digits);
    return {model: {...model, step: next.step}, outcome: next.termination === undefined ? 'continue' : 'complete'};
}
