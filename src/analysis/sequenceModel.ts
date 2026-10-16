import {
    isSequenceEpsilon, isSequenceExampleId, isSequenceLimit, isSequenceTerms, isSequenceThreshold, SEQUENCE_EXAMPLE_IDS,
    SEQUENCE_MAX_TERMS, sequenceEpsilonFromHundredths, sequenceEpsilonHundredths, SequenceExampleId,
} from './sequence';

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

/**
 * Returns a sanitized model (unknown properties dropped) or undefined unless the data is a valid model: a known example, a grid
 * epsilon in [0.01, 2], a limit in [-2, 2], an integer threshold 1..1000, an integer term count 1..SEQUENCE_MAX_TERMS and a boolean
 * `certificateVisible`. Nothing is clamped. Epsilon is returned as the canonical double of its hundredths.
 */
export function parseSequenceModel(data: unknown): SequenceModel | undefined {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return undefined;
    const {example, epsilon, limit, threshold, terms, certificateVisible} = data as Record<string, unknown>;
    if (!isSequenceExampleId(example) || !isSequenceEpsilon(epsilon) || !isSequenceLimit(limit)) return undefined;
    if (!isSequenceThreshold(threshold) || !isSequenceTerms(terms) || typeof certificateVisible !== 'boolean') return undefined;
    const hundredths = sequenceEpsilonHundredths(epsilon) as number;
    return {example, epsilon: sequenceEpsilonFromHundredths(hundredths), limit, threshold, terms, certificateVisible};
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
