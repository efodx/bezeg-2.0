import {
    FIXED_POINT_EXAMPLES, FixedPointExampleId, fixedPointHistory, FixedPointHistory, isFixedPointDigits, isFixedPointExampleId,
    isFixedPointStart, isFixedPointStepCount,
} from './fixedPoint';

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

/** Returns a sanitized model (unknown properties dropped) or undefined when the data is not a valid model. Never clamps. */
export function parseFixedPointModel(data: unknown): FixedPointModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, x0, step, digits, boundVisible} = data as Record<string, unknown>;
    if (!isFixedPointExampleId(example) || !isFixedPointStart(example, x0)) return undefined;
    if (!isFixedPointStepCount(step) || !isFixedPointDigits(digits) || typeof boundVisible !== 'boolean') return undefined;
    return {example, x0, step, digits, boundVisible};
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
