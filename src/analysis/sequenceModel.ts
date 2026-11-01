import {
    isSequenceEpsilon, isSequenceExampleId, isSequenceLimit, isSequenceTerms, isSequenceThreshold, SEQUENCE_EPSILON_MAX, SEQUENCE_EPSILON_MIN,
    SEQUENCE_EPSILON_STEP, SEQUENCE_EXAMPLE_IDS, SEQUENCE_LIMIT_MAX, SEQUENCE_LIMIT_MIN, SEQUENCE_LIMIT_STEP, SEQUENCE_MAX_TERMS, SEQUENCE_TERMS_MIN,
    SEQUENCE_THRESHOLD_MAX, SEQUENCE_THRESHOLD_MIN, sequenceEpsilonFromHundredths, sequenceEpsilonHundredths, SequenceExampleId,
    sequenceLimitFromHundredths, sequenceLimitHundredths,
} from './sequence';

/*
 * This module owns the rules of the sequence model: what is valid, how an accepted value is normalized, and which rule a rejected
 * value broke (a `SequenceIssue`: data, never text). Localization stays outside (`graphs/functions/sequenceMessages`).
 */
/**
 * The stored description of the sequence convergence demonstration. `terms` is the iteration index (how many terms are revealed);
 * playback state is not stored, so a reopened preset is paused. `certificateVisible` says whether the epsilon-N certificate is
 * shown. The certificate itself is recomputed from the formula, never stored.
 */
export interface SequenceModel {
    readonly example: SequenceExampleId;
    readonly epsilon: number;
    readonly limit: number;
    readonly threshold: number;
    readonly terms: number;
    readonly certificateVisible: boolean;
}

/**
 * The model a named example starts from: one revealed term, certificate hidden. Epsilon 0.1 with N = 5 does not yet work for the
 * convergent examples (N_min = 11), so the lesson can ask for a prediction first.
 */
export const SEQUENCE_EXAMPLE_MODELS: Readonly<Record<SequenceExampleId, SequenceModel>> = {
    'reciprocal': {example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false},
    'alternating-reciprocal': {example: 'alternating-reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false},
    'alternating-sign': {example: 'alternating-sign', epsilon: 0.5, limit: 0, threshold: 5, terms: 1, certificateVisible: false},
    'natural': {example: 'natural', epsilon: 0.5, limit: 0, threshold: 5, terms: 1, certificateVisible: false},
};

export const DEFAULT_SEQUENCE_MODEL: SequenceModel = SEQUENCE_EXAMPLE_MODELS.reciprocal;

/** The default model of an example (a fresh object). */
export function defaultSequenceModel(example: SequenceExampleId): SequenceModel {
    if (!isSequenceExampleId(example)) throw new RangeError(`The example must be one of ${SEQUENCE_EXAMPLE_IDS.join(', ')}.`);
    return {...SEQUENCE_EXAMPLE_MODELS[example]};
}

/** The rule a rejected value broke. Callers localize it; the ranges, grid steps and examples travel with it. */
export type SequenceIssue =
    | { readonly kind: 'example'; readonly allowed: readonly SequenceExampleId[] }
    /** A multiple of `step` in [min, max]. */
    | { readonly kind: 'epsilon'; readonly min: number; readonly max: number; readonly step: number }
    | { readonly kind: 'limit'; readonly min: number; readonly max: number; readonly step: number }
    /** An integer in [min, max]. */
    | { readonly kind: 'threshold'; readonly min: number; readonly max: number }
    | { readonly kind: 'terms'; readonly min: number; readonly max: number }
    | { readonly kind: 'visibility' };

/** The rules an edit can break: example, epsilon, limit and threshold (terms are stepped by the iteration, visibility is boolean). */
export type SequenceEditIssue = Extract<SequenceIssue, { kind: 'example' | 'epsilon' | 'limit' | 'threshold' }>;

/** The sanitized model, or the first rule a stored model broke (`issue` undefined = malformed, use the generic message). */
export type SequenceCheck =
    | { readonly ok: true; readonly model: SequenceModel }
    | { readonly ok: false; readonly issue: SequenceIssue | undefined };

/** The answer for one edit: the next model (the same object when nothing changes) or the rule the edit would break. */
export type SequenceEdit =
    | { readonly ok: true; readonly model: SequenceModel }
    | { readonly ok: false; readonly issue: SequenceEditIssue };

const reject = (issue: SequenceIssue | undefined): SequenceCheck => ({ok: false, issue});
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const exampleIssue: SequenceEditIssue = {kind: 'example', allowed: SEQUENCE_EXAMPLE_IDS};
const epsilonIssue: SequenceEditIssue = {kind: 'epsilon', min: SEQUENCE_EPSILON_MIN, max: SEQUENCE_EPSILON_MAX, step: SEQUENCE_EPSILON_STEP};
const limitIssue: SequenceEditIssue = {kind: 'limit', min: SEQUENCE_LIMIT_MIN, max: SEQUENCE_LIMIT_MAX, step: SEQUENCE_LIMIT_STEP};
const thresholdIssue: SequenceEditIssue = {kind: 'threshold', min: SEQUENCE_THRESHOLD_MIN, max: SEQUENCE_THRESHOLD_MAX};

/**
 * The single validity rule of a stored sequence model: a known example, a grid epsilon in [0.01, 2], a grid limit (multiple of 0.01)
 * in [-2, 2], an integer threshold 1..1000, an integer term count 1..SEQUENCE_MAX_TERMS and a boolean `certificateVisible`. Nothing
 * is clamped. Epsilon and the limit are returned as the canonical doubles of their hundredths. Unknown properties are dropped. Rules
 * are checked in the order example, epsilon, limit, threshold, terms, visibility; a field of the wrong type or a missing field gives
 * `issue: undefined`.
 */
export function checkSequenceModel(data: unknown): SequenceCheck {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return reject(undefined);
    const {example, epsilon, limit, threshold, terms, certificateVisible} = data as Record<string, unknown>;
    if (!isSequenceExampleId(example)) return reject(exampleIssue);
    if (isFiniteNumber(epsilon) && !isSequenceEpsilon(epsilon)) return reject(epsilonIssue);
    if (isFiniteNumber(limit) && !isSequenceLimit(limit)) return reject(limitIssue);
    if (isFiniteNumber(threshold) && !isSequenceThreshold(threshold)) return reject(thresholdIssue);
    if (isFiniteNumber(terms) && !isSequenceTerms(terms)) return reject({kind: 'terms', min: SEQUENCE_TERMS_MIN, max: SEQUENCE_MAX_TERMS});
    if (certificateVisible !== undefined && typeof certificateVisible !== 'boolean') return reject({kind: 'visibility'});
    if (!isSequenceEpsilon(epsilon) || !isSequenceLimit(limit)) return reject(undefined);
    if (!isSequenceThreshold(threshold) || !isSequenceTerms(terms) || typeof certificateVisible !== 'boolean') return reject(undefined);
    const hundredths = sequenceEpsilonHundredths(epsilon) as number;
    return {
        ok: true,
        model: {
            example, epsilon: sequenceEpsilonFromHundredths(hundredths), limit: sequenceLimitFromHundredths(sequenceLimitHundredths(limit) as number),
            threshold, terms, certificateVisible,
        },
    };
}

/** Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model (see `checkSequenceModel`). */
export function parseSequenceModel(data: unknown): SequenceModel | undefined {
    const check = checkSequenceModel(data);
    return check.ok ? check.model : undefined;
}

/** Choosing an example loads that example's default model (a fresh object). */
export function chooseSequenceExample(example: unknown): SequenceEdit {
    if (!isSequenceExampleId(example)) return {ok: false, issue: exampleIssue};
    return {ok: true, model: defaultSequenceModel(example)};
}

/** Sets epsilon: rejected (never rounded) unless a grid value in range; the current epsilon changes nothing. */
export function setSequenceEpsilon(model: SequenceModel, value: unknown): SequenceEdit {
    const hundredths = sequenceEpsilonHundredths(value);
    if (hundredths === undefined) return {ok: false, issue: epsilonIssue};
    const epsilon = sequenceEpsilonFromHundredths(hundredths);
    return {ok: true, model: epsilon === model.epsilon ? model : {...model, epsilon}};
}

/** Sets the candidate limit L: rejected (never rounded) unless a grid value in range; the current value changes nothing. */
export function setSequenceLimit(model: SequenceModel, value: unknown): SequenceEdit {
    const hundredths = sequenceLimitHundredths(value);
    if (hundredths === undefined) return {ok: false, issue: limitIssue};
    const limit = sequenceLimitFromHundredths(hundredths);
    return {ok: true, model: limit === model.limit ? model : {...model, limit}};
}

/** Sets the threshold N: rejected unless an integer in range; the current value changes nothing. */
export function setSequenceThreshold(model: SequenceModel, value: unknown): SequenceEdit {
    if (!isSequenceThreshold(value)) return {ok: false, issue: thresholdIssue};
    return {ok: true, model: value === model.threshold ? model : {...model, threshold: value}};
}

export interface SequenceStep {
    /** The model after the transition (the same object when no term could be added). */
    readonly model: SequenceModel;
    /** Whether a term was added. */
    readonly advanced: boolean;
    /** 'complete' once SEQUENCE_MAX_TERMS terms are revealed, otherwise 'continue': the IterationController outcome. */
    readonly outcome: 'continue' | 'complete';
}

/** Whether another term can be revealed. */
export const canAdvanceSequence = (model: SequenceModel): boolean => model.terms < SEQUENCE_MAX_TERMS;

/**
 * The one transition of the iteration: reveal one more term. Next step and every playback step run it, so k Next steps and k
 * played steps give the same model. At SEQUENCE_MAX_TERMS nothing changes and the outcome is 'complete'.
 */
export function nextSequenceStep(model: SequenceModel): SequenceStep {
    if (!canAdvanceSequence(model)) return {model, advanced: false, outcome: 'complete'};
    const terms = model.terms + 1;
    return {model: {...model, terms}, advanced: true, outcome: terms >= SEQUENCE_MAX_TERMS ? 'complete' : 'continue'};
}

/** The model with the revealed terms back to one; everything else is kept. */
export const resetSequenceTerms = (model: SequenceModel): SequenceModel => ({...model, terms: 1});
