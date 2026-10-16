/**
 * Convergence of a sequence, a_n -> L, through the epsilon-N definition (sequence convergence lesson).
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * A certificate is always backed by the formula of the named example and never derived from a finite window of terms:
 * the shown terms only decide what is drawn, not what is proved.
 */

/** Epsilon lies in [SEQUENCE_EPSILON_MIN, SEQUENCE_EPSILON_MAX] on a grid of SEQUENCE_EPSILON_STEP. */
export const SEQUENCE_EPSILON_MIN = 0.01;
export const SEQUENCE_EPSILON_MAX = 2;
export const SEQUENCE_EPSILON_STEP = 0.01;
/** Epsilon is handled as an integer count of hundredths, so every comparison with 1/n is exact integer arithmetic. */
export const SEQUENCE_EPSILON_SCALE = 100;

/** The candidate limit L may be any finite number in [SEQUENCE_LIMIT_MIN, SEQUENCE_LIMIT_MAX]. */
export const SEQUENCE_LIMIT_MIN = -2;
export const SEQUENCE_LIMIT_MAX = 2;

/** The threshold N is an integer in [SEQUENCE_THRESHOLD_MIN, SEQUENCE_THRESHOLD_MAX]. */
export const SEQUENCE_THRESHOLD_MIN = 1;
export const SEQUENCE_THRESHOLD_MAX = 1000;

/** The number of revealed terms is an integer in [SEQUENCE_TERMS_MIN, SEQUENCE_MAX_TERMS]. */
export const SEQUENCE_TERMS_MIN = 1;
export const SEQUENCE_MAX_TERMS = 40;
/** Transitions available from one revealed term to SEQUENCE_MAX_TERMS: the iteration limit of the controller. */
export const SEQUENCE_MAX_STEPS = SEQUENCE_MAX_TERMS - 1;

/** Tolerance that decides whether a sum of two doubles equals an exact boundary (an integer or 1 + |L| = epsilon). */
const BOUNDARY_TOLERANCE = 1e-9;

export const SEQUENCE_EXAMPLE_IDS = ['reciprocal', 'alternating-reciprocal', 'alternating-sign', 'natural'] as const;
export type SequenceExampleId = typeof SEQUENCE_EXAMPLE_IDS[number];

/** How the sequence behaves: converges to `limit`, oscillates between two values, or grows without bound. */
export type SequenceBehavior = 'convergent' | 'oscillating' | 'divergent';

export interface SequenceExample {
    readonly id: SequenceExampleId;
    /** Plain-text formula for labels and accessible names. */
    readonly plain: string;
    /** Undelimited LaTeX of the formula. */
    readonly latex: string;
    /** The term a_n for an integer n >= 1. */
    readonly term: (n: number) => number;
    readonly behavior: SequenceBehavior;
    /** The limit of a convergent example; undefined otherwise. */
    readonly limit?: number;
}

export const SEQUENCE_EXAMPLES: Readonly<Record<SequenceExampleId, SequenceExample>> = {
    'reciprocal': {
        id: 'reciprocal', plain: '1/n', latex: String.raw`\frac{1}{n}`,
        term: n => 1 / n, behavior: 'convergent', limit: 0,
    },
    'alternating-reciprocal': {
        id: 'alternating-reciprocal', plain: '(-1)^n/n', latex: String.raw`\frac{(-1)^n}{n}`,
        term: n => (n % 2 === 0 ? 1 : -1) / n, behavior: 'convergent', limit: 0,
    },
    'alternating-sign': {
        id: 'alternating-sign', plain: '(-1)^n', latex: '(-1)^n',
        term: n => (n % 2 === 0 ? 1 : -1), behavior: 'oscillating',
    },
    'natural': {
        id: 'natural', plain: 'n', latex: 'n',
        term: n => n, behavior: 'divergent',
    },
};

export const isSequenceExampleId = (value: unknown): value is SequenceExampleId =>
    typeof value === 'string' && (SEQUENCE_EXAMPLE_IDS as readonly string[]).includes(value);

export function sequenceExample(id: SequenceExampleId): SequenceExample {
    if (!isSequenceExampleId(id)) throw new RangeError('Unknown sequence example.');
    return SEQUENCE_EXAMPLES[id];
}

/** Epsilon as an integer count of hundredths when it is a grid value in range; undefined for anything else (nothing is rounded into range). */
export function sequenceEpsilonHundredths(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const scaled = value * SEQUENCE_EPSILON_SCALE;
    const hundredths = Math.round(scaled);
    if (Math.abs(scaled - hundredths) > BOUNDARY_TOLERANCE) return undefined;
    if (hundredths < SEQUENCE_EPSILON_MIN * SEQUENCE_EPSILON_SCALE || hundredths > SEQUENCE_EPSILON_MAX * SEQUENCE_EPSILON_SCALE) return undefined;
    return hundredths;
}

/** The canonical double of an epsilon given in hundredths (7 -> 0.07). */
export const sequenceEpsilonFromHundredths = (hundredths: number): number => hundredths / SEQUENCE_EPSILON_SCALE;

/** Epsilon must be a finite grid value in [0.01, 2]. Zero, negative, off-grid and out-of-range values are rejected. */
export const isSequenceEpsilon = (value: unknown): value is number => sequenceEpsilonHundredths(value) !== undefined;

/** The candidate limit must be a finite number in [-2, 2]. */
export const isSequenceLimit = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= SEQUENCE_LIMIT_MIN && value <= SEQUENCE_LIMIT_MAX;

/** The threshold N must be an integer in [1, 1000]. */
export const isSequenceThreshold = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= SEQUENCE_THRESHOLD_MIN && value <= SEQUENCE_THRESHOLD_MAX;

/** The revealed term count must be an integer in [1, SEQUENCE_MAX_TERMS]. */
export const isSequenceTerms = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= SEQUENCE_TERMS_MIN && value <= SEQUENCE_MAX_TERMS;

const checkIndex = (n: number): void => {
    if (!Number.isInteger(n) || n < 1) throw new RangeError('The index n must be an integer of at least 1.');
};

/** The term a_n of the example, n >= 1. */
export function sequenceTerm(id: SequenceExampleId, n: number): number {
    const example = sequenceExample(id);
    checkIndex(n);
    return example.term(n);
}

/** The distance |a_n - L| of the term to the candidate limit. */
export function sequenceDistance(id: SequenceExampleId, n: number, limit: number): number {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) throw new RangeError('The candidate limit must be a finite number.');
    return Math.abs(sequenceTerm(id, n) - limit);
}

/**
 * Whether the term a_n lies strictly inside the band (L - epsilon, L + epsilon), that is |a_n - L| < epsilon.
 * For the convergent examples with L = 0 this is decided in integers (n * hundredths > 100), so the boundary term 1/10 against 0.1 is exact.
 */
export function isTermInBand(id: SequenceExampleId, n: number, limit: number, epsilon: number): boolean {
    const hundredths = sequenceEpsilonHundredths(epsilon);
    if (hundredths === undefined) throw new RangeError('Epsilon must be a grid value in [0.01, 2].');
    const example = sequenceExample(id);
    checkIndex(n);
    if (example.behavior === 'convergent' && limit === example.limit) return n * hundredths > SEQUENCE_EPSILON_SCALE;
    return sequenceDistance(id, n, limit) < epsilon;
}

/**
 * The least N with N * epsilon > 1, i.e. floor(1 / epsilon) + 1, computed in integers from epsilon = hundredths / 100:
 * floor(100 / hundredths) + 1. It never rounds 1 / epsilon.
 */
export function sequenceMinThreshold(epsilon: number): number {
    const hundredths = sequenceEpsilonHundredths(epsilon);
    if (hundredths === undefined) throw new RangeError('Epsilon must be a grid value in [0.01, 2].');
    return Math.floor(SEQUENCE_EPSILON_SCALE / hundredths) + 1;
}

/** Whether N works for a 1/n type sequence at this epsilon: N * epsilon > 1 (exact integer comparison). */
export function sequenceThresholdWorks(epsilon: number, threshold: number): boolean {
    const hundredths = sequenceEpsilonHundredths(epsilon);
    if (hundredths === undefined) throw new RangeError('Epsilon must be a grid value in [0.01, 2].');
    if (!Number.isInteger(threshold) || threshold < 1) throw new RangeError('The threshold must be an integer of at least 1.');
    return threshold * hundredths > SEQUENCE_EPSILON_SCALE;
}

/** The floor of a sum of doubles, snapped to the nearest integer when the sum is within rounding error of it. */
function snappedFloor(value: number): number {
    const nearest = Math.round(value);
    return Math.abs(value - nearest) < BOUNDARY_TOLERANCE ? nearest : Math.floor(value);
}

/** The fields the certificate reads; a full SequenceModel satisfies it. */
export interface SequenceCertificateInput {
    readonly example: SequenceExampleId;
    readonly epsilon: number;
    readonly limit: number;
    readonly threshold: number;
    readonly terms: number;
}

interface CertificateBase {
    /** True when N lies beyond the shown terms (N > terms). The claim still holds by the formula; it is never truncated to the window. */
    readonly thresholdBeyondTerms: boolean;
}

export interface CertifiedSequenceResult extends CertificateBase {
    readonly kind: 'certified';
    /** The least working threshold, floor(1 / epsilon) + 1. */
    readonly nMin: number;
    readonly nMinBeyondTerms: boolean;
    /** The chosen N works (N epsilon > 1): |a_n - L| <= 1/N < epsilon for every n >= N. */
    readonly thresholdWorks: true;
    /** nMin - 1 fails at that index when nMin > 1, undefined when nMin = 1. */
    readonly lastFailingIndex?: number;
}

export interface ThresholdFailsSequenceResult extends CertificateBase {
    readonly kind: 'threshold-fails';
    readonly nMin: number;
    readonly nMinBeyondTerms: boolean;
    readonly thresholdWorks: false;
    /** The first failing index n = N, where |a_N - L| = 1/N >= epsilon. */
    readonly failingIndex: number;
}

export interface NotTheLimitSequenceResult extends CertificateBase {
    readonly kind: 'not-the-limit';
    /** The actual limit of the convergent example; the candidate L differs from it. */
    readonly actualLimit: number;
}

export interface OscillatingSequenceResult extends CertificateBase {
    readonly kind: 'oscillating';
    /** Why no N exists: the farther of the values 1 and -1 is at distance 1 + |L| >= epsilon from L, at indices of one parity beyond every N. */
    readonly reason: 'two-values-outside-band';
    /** 1 + |L|, the largest distance from L of a term. */
    readonly farthestDistance: number;
}

export interface DivergentSequenceResult extends CertificateBase {
    readonly kind: 'divergent';
    /** Why no N exists: a_n = n > L + epsilon for every n > L + epsilon. */
    readonly reason: 'terms-leave-every-band';
    /** The least index from which every term exceeds L + epsilon: floor(L + epsilon) + 1, at least 1. */
    readonly exitIndex: number;
}

/**
 * The single epsilon of an oscillating example whose band contains every term (1 + |L| < epsilon, epsilon > 1).
 * That epsilon is satisfied from N = 1, but convergence requires every epsilon > 0.
 */
export interface EpsilonSatisfiedSequenceResult extends CertificateBase {
    readonly kind: 'epsilon-satisfied';
    readonly reason: 'band-contains-every-term';
}

export type SequenceCertificate =
    | CertifiedSequenceResult
    | ThresholdFailsSequenceResult
    | NotTheLimitSequenceResult
    | OscillatingSequenceResult
    | DivergentSequenceResult
    | EpsilonSatisfiedSequenceResult;

/**
 * The formula-backed epsilon-N verdict for the example, candidate limit, epsilon and threshold. Only `certified` is a proof that
 * N works; no other kind is a certificate. The `terms` window changes `thresholdBeyondTerms` and nothing else.
 * Throws RangeError for a value outside the documented domains.
 */
export function sequenceCertificate(input: SequenceCertificateInput): SequenceCertificate {
    const {example: id, epsilon, limit, threshold, terms} = input;
    const example = sequenceExample(id);
    const hundredths = sequenceEpsilonHundredths(epsilon);
    if (hundredths === undefined) throw new RangeError('Epsilon must be a grid value in [0.01, 2].');
    if (!isSequenceLimit(limit)) throw new RangeError('The candidate limit must be a finite number in [-2, 2].');
    if (!isSequenceThreshold(threshold)) throw new RangeError('The threshold must be an integer from 1 to 1000.');
    if (!isSequenceTerms(terms)) throw new RangeError(`The number of terms must be an integer from 1 to ${SEQUENCE_MAX_TERMS}.`);
    const base: CertificateBase = {thresholdBeyondTerms: threshold > terms};

    if (example.behavior === 'convergent') {
        const actualLimit = example.limit as number;
        if (limit !== actualLimit) return {...base, kind: 'not-the-limit', actualLimit};
        const nMin = Math.floor(SEQUENCE_EPSILON_SCALE / hundredths) + 1;
        const nMinBeyondTerms = nMin > terms;
        // |a_n - 0| = 1/n <= 1/N for n >= N, and 1/N < epsilon exactly when N * hundredths > 100.
        if (threshold * hundredths > SEQUENCE_EPSILON_SCALE) {
            return {
                ...base, kind: 'certified', nMin, nMinBeyondTerms, thresholdWorks: true,
                ...(nMin > 1 ? {lastFailingIndex: nMin - 1} : {}),
            };
        }
        return {...base, kind: 'threshold-fails', nMin, nMinBeyondTerms, thresholdWorks: false, failingIndex: threshold};
    }

    if (example.behavior === 'oscillating') {
        // The terms are 1 and -1; the farther one is at distance 1 + |L| from L. A term at distance >= epsilon lies outside the open band.
        const farthestDistance = 1 + Math.abs(limit);
        // Within rounding error of the boundary counts as on it, and the open band excludes the boundary.
        if (epsilon - farthestDistance > BOUNDARY_TOLERANCE) {
            // Strictly inside: both values are in the band, so every term is.
            return {...base, kind: 'epsilon-satisfied', reason: 'band-contains-every-term'};
        }
        return {...base, kind: 'oscillating', reason: 'two-values-outside-band', farthestDistance};
    }

    return {
        ...base, kind: 'divergent', reason: 'terms-leave-every-band',
        exitIndex: Math.max(1, snappedFloor(limit + epsilon) + 1),
    };
}
