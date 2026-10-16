/**
 * Fixed-point iteration x_{k+1} = T(x_k) on a closed interval [a, b] of a named example map (Banach fixed-point lesson).
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * The history is always recomputed from the example, the start x0, the step count and the tolerance digits; a stored
 * history is never trusted. Error bounds exist only where the map is a contraction (q < 1) on the interval.
 *
 * Exactness rules:
 *  - Only a start that equals an analytically known fixed point (affine: 1, reflection: 1/2) is called the fixed point.
 *    Equal consecutive floating-point iterates are reported as `stagnation`, never as an exact fixed point.
 *  - The start x0 lies on the 0.01 grid. The reflection example iterates in integer hundredths, so its two-cycle
 *    x0, 1 - x0, x0, ... is exact and free of the floating-point drift of 1 - (1 - x0).
 */

/** The documented iteration limit. */
export const FIXED_POINT_MAX_STEPS = 60;

/** The tolerance is 10^-d with an integer d in [FIXED_POINT_MIN_DIGITS, FIXED_POINT_MAX_DIGITS]. */
export const FIXED_POINT_MIN_DIGITS = 1;
export const FIXED_POINT_MAX_DIGITS = 8;

export const FIXED_POINT_EXAMPLE_IDS = ['affine', 'cosine', 'reflection'] as const;
export type FixedPointExampleId = typeof FIXED_POINT_EXAMPLE_IDS[number];

/** Why T maps [a, b] into itself. */
export type FixedPointSelfMapReason =
    /** T(x) = (x + 1)/2 is increasing, so T([0, 2]) = [1/2, 3/2]. */
    | 'increasing-affine-image'
    /** cos is decreasing on [0, 1], so cos([0, 1]) = [cos 1, 1]. */
    | 'decreasing-cosine-image'
    /** T(x) = 1 - x swaps the endpoints of [0, 1]. */
    | 'reflection-swaps-endpoints';

/** Why |T'| <= q on the interval; the mean value theorem then gives |T(x) - T(y)| <= q |x - y|. */
export type FixedPointContractionReason =
    /** |T'(x)| = 1/2 everywhere. */
    | 'constant-derivative'
    /** |T'(x)| = sin x, increasing on [0, 1], so |T'| <= sin 1. */
    | 'sine-derivative-bound';

export interface FixedPointHypotheses {
    /** The interval [a, b] is closed and bounded, hence complete. */
    readonly interval: { readonly a: number; readonly b: number; readonly closed: true };
    /** The self-map condition T([a, b]) is a subset of [a, b], with the image and the reason. */
    readonly selfMap: {
        readonly image: { readonly lo: number; readonly hi: number };
        /** Undelimited LaTeX of the image set. */
        readonly imageLatex: string;
        readonly reason: FixedPointSelfMapReason;
    };
    /** The contraction factor with its reason, or null when no q < 1 exists. */
    readonly contraction: {
        readonly q: number;
        /** Undelimited LaTeX of q. */
        readonly qLatex: string;
        /** Undelimited LaTeX of the derivative bound |T'(x)| <= q. */
        readonly derivativeLatex: string;
        readonly reason: FixedPointContractionReason;
    } | null;
    /** Set exactly when `contraction` is null. */
    readonly noContractionReason?: 'derivative-modulus-one';
}

export interface FixedPointExample {
    readonly id: FixedPointExampleId;
    /** Plain-text formula T(x) for labels and accessible names. */
    readonly plain: string;
    /** Undelimited LaTeX of T(x). */
    readonly latex: string;
    readonly value: (x: number) => number;
    /** The closed interval [a, b]. */
    readonly a: number;
    readonly b: number;
    /** The start x0 the example begins with (on the 0.01 grid). */
    readonly defaultX0: number;
    /** The analytically known fixed point that is exactly representable; undefined for cosine (irrational). */
    readonly exactFixedPoint?: number;
    /** The contraction factor q < 1, or undefined where T is not a contraction on [a, b]. */
    readonly q?: number;
    /** True when the iteration is carried out in integer hundredths (reflection), so cycles are exact. */
    readonly integerGrid: boolean;
    readonly hypotheses: FixedPointHypotheses;
}

const AFFINE_Q = 0.5;
const COSINE_Q = Math.sin(1);

export const FIXED_POINT_EXAMPLES: Readonly<Record<FixedPointExampleId, FixedPointExample>> = {
    affine: {
        id: 'affine', plain: '(x + 1) / 2', latex: String.raw`\frac{x+1}{2}`,
        value: x => (x + 1) / 2, a: 0, b: 2, defaultX0: 0, exactFixedPoint: 1, q: AFFINE_Q, integerGrid: false,
        hypotheses: {
            interval: {a: 0, b: 2, closed: true},
            selfMap: {image: {lo: 0.5, hi: 1.5}, imageLatex: String.raw`T([0,2])=[\tfrac12,\tfrac32]`, reason: 'increasing-affine-image'},
            contraction: {q: AFFINE_Q, qLatex: String.raw`\tfrac12`, derivativeLatex: String.raw`|T'(x)|=\tfrac12`, reason: 'constant-derivative'},
        },
    },
    cosine: {
        id: 'cosine', plain: 'cos x', latex: String.raw`\cos x`,
        value: x => Math.cos(x), a: 0, b: 1, defaultX0: 0, q: COSINE_Q, integerGrid: false,
        hypotheses: {
            interval: {a: 0, b: 1, closed: true},
            selfMap: {image: {lo: Math.cos(1), hi: 1}, imageLatex: String.raw`T([0,1])=[\cos 1,1]`, reason: 'decreasing-cosine-image'},
            contraction: {q: COSINE_Q, qLatex: String.raw`\sin 1`, derivativeLatex: String.raw`|T'(x)|=\sin x\le\sin 1`, reason: 'sine-derivative-bound'},
        },
    },
    reflection: {
        id: 'reflection', plain: '1 - x', latex: '1-x',
        value: x => 1 - x, a: 0, b: 1, defaultX0: 0.2, exactFixedPoint: 0.5, integerGrid: true,
        hypotheses: {
            interval: {a: 0, b: 1, closed: true},
            selfMap: {image: {lo: 0, hi: 1}, imageLatex: String.raw`T([0,1])=[0,1]`, reason: 'reflection-swaps-endpoints'},
            contraction: null,
            noContractionReason: 'derivative-modulus-one',
        },
    },
};

export const isFixedPointExampleId = (value: unknown): value is FixedPointExampleId =>
    typeof value === 'string' && (FIXED_POINT_EXAMPLE_IDS as readonly string[]).includes(value);

export function fixedPointExample(id: FixedPointExampleId): FixedPointExample {
    if (!isFixedPointExampleId(id)) throw new RangeError('Unknown fixed-point example.');
    return FIXED_POINT_EXAMPLES[id];
}

/** The start in integer hundredths when `x0` is a finite number exactly on the 0.01 grid (n / 100 for an integer n), else undefined. */
export function fixedPointHundredths(x0: unknown): number | undefined {
    if (typeof x0 !== 'number' || !Number.isFinite(x0)) return undefined;
    const n = Math.round(x0 * 100);
    return n / 100 === x0 ? n : undefined;
}

/** A start must lie on the 0.01 grid and inside the example's closed interval. */
export function isFixedPointStart(exampleId: FixedPointExampleId, x0: unknown): x0 is number {
    if (!isFixedPointExampleId(exampleId)) return false;
    const n = fixedPointHundredths(x0);
    if (n === undefined) return false;
    const example = FIXED_POINT_EXAMPLES[exampleId];
    return n >= example.a * 100 && n <= example.b * 100;
}

/** A step count is an integer in [0, FIXED_POINT_MAX_STEPS]. */
export const isFixedPointStepCount = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= FIXED_POINT_MAX_STEPS;

/** The tolerance digits d: an integer in [FIXED_POINT_MIN_DIGITS, FIXED_POINT_MAX_DIGITS]. */
export const isFixedPointDigits = (value: unknown): value is number =>
    typeof value === 'number' && Number.isInteger(value) && value >= FIXED_POINT_MIN_DIGITS && value <= FIXED_POINT_MAX_DIGITS;

/** The tolerance 10^-d. */
export function fixedPointTolerance(digits: number): number {
    if (!isFixedPointDigits(digits)) throw new RangeError(`The tolerance digits must be an integer from ${FIXED_POINT_MIN_DIGITS} to ${FIXED_POINT_MAX_DIGITS}.`);
    return Math.pow(10, -digits);
}

export type FixedPointTermination =
    /** The start equals an analytically known fixed point exactly (affine x0 = 1, reflection x0 = 1/2). */
    | 'fixed-point'
    /** Consecutive floating-point iterates are equal. This is rounding, not proof of a fixed point. */
    | 'stagnation'
    /** The a posteriori bound is below 10^-d (contractions only). */
    | 'threshold'
    /** FIXED_POINT_MAX_STEPS steps have been taken. */
    | 'iteration-limit';

/** One iterate x_k with the error bounds that hold for it. Bounds are undefined where there is no contraction. */
export interface FixedPointPoint {
    readonly k: number;
    readonly x: number;
    /** |x_k - x_{k-1}|; undefined for k = 0. */
    readonly delta?: number;
    /** q^k / (1 - q) |x_1 - x_0| >= |x_k - x*|. Defined for every k when q < 1. */
    readonly aPriori?: number;
    /** q / (1 - q) |x_k - x_{k-1}| >= |x_k - x*|. Defined for k >= 1 when q < 1. */
    readonly aPosteriori?: number;
}

/** One iteration step, 1-based: x_{index} = T(from). The cobweb draws (from, from) to (from, to) and then (from, to) to (to, to). */
export interface FixedPointStep {
    readonly index: number;
    readonly from: number;
    readonly to: number;
}

export interface FixedPointHistory {
    readonly example: FixedPointExampleId;
    readonly x0: number;
    readonly digits: number;
    /** The tolerance 10^-d. */
    readonly tolerance: number;
    readonly hypotheses: FixedPointHypotheses;
    /** The contraction factor q < 1, or undefined for reflection. */
    readonly q?: number;
    /** Steps taken: `points.length - 1`. At most the requested number (fewer when the iteration terminated earlier). */
    readonly step: number;
    /** x_0, ..., x_step. */
    readonly points: readonly FixedPointPoint[];
    readonly steps: readonly FixedPointStep[];
    /** The last point. */
    readonly current: FixedPointPoint;
    /** Why no further step is possible; undefined while the iteration can continue. */
    readonly termination?: FixedPointTermination;
    /** Set exactly when `termination === 'fixed-point'`: the analytic fixed point the start equals. */
    readonly fixedPoint?: number;
    /** A detected exact two-cycle {first, second} (reflection from x0 != 1/2, once step >= 2). Not a claim of divergence. */
    readonly cycle?: { readonly first: number; readonly second: number };
}

export interface FixedPointHistoryOptions {
    /**
     * Whether reaching the tolerance ends the iteration (default true). With false, only stagnation, a known fixed point and the
     * iteration limit end it, so floating-point stagnation can be shown (affine from 0 stagnates after 55 steps).
     */
    readonly thresholdStops?: boolean;
}

/**
 * The first `steps` iterates of the example from x0, stopping early at a termination.
 * Throws RangeError for a start off the 0.01 grid or outside the interval, a step count outside [0, FIXED_POINT_MAX_STEPS]
 * or digits outside [FIXED_POINT_MIN_DIGITS, FIXED_POINT_MAX_DIGITS].
 */
export function fixedPointHistory(
    exampleId: FixedPointExampleId, x0: number, steps: number, digits: number, options: FixedPointHistoryOptions = {},
): FixedPointHistory {
    const example = fixedPointExample(exampleId);
    const n0 = fixedPointHundredths(x0);
    if (!isFixedPointStart(exampleId, x0) || n0 === undefined) {
        throw new RangeError('The start x0 must be on the 0.01 grid and inside the interval of the example.');
    }
    if (!isFixedPointStepCount(steps)) throw new RangeError(`The step count must be an integer from 0 to ${FIXED_POINT_MAX_STEPS}.`);
    const tolerance = fixedPointTolerance(digits);
    const thresholdStops = options.thresholdStops !== false;
    const q = example.q;

    // x_k: the reflection works in integer hundredths (x_k = n0 or 100 - n0, divided by 100); the others iterate in floating point.
    const next = (previous: number, k: number): number => example.integerGrid ? (k % 2 === 1 ? 100 - n0 : n0) / 100 : example.value(previous);
    const x1 = next(x0, 1);
    const pointAt = (k: number, x: number, previous: number | undefined): FixedPointPoint => {
        const delta = previous === undefined ? undefined : Math.abs(x - previous);
        return {
            k, x,
            ...(delta !== undefined ? {delta} : {}),
            ...(q !== undefined ? {aPriori: Math.pow(q, k) / (1 - q) * Math.abs(x1 - x0)} : {}),
            ...(q !== undefined && delta !== undefined ? {aPosteriori: q / (1 - q) * delta} : {}),
        };
    };

    const points: FixedPointPoint[] = [pointAt(0, x0, undefined)];
    const taken: FixedPointStep[] = [];
    let termination: FixedPointTermination | undefined;
    let fixedPoint: number | undefined;

    if (example.exactFixedPoint !== undefined && x0 === example.exactFixedPoint) {
        termination = 'fixed-point';
        fixedPoint = x0;
    } else {
        for (;;) {
            const k = points.length - 1;
            const last = points[k];
            if (k >= 1 && last.delta === 0) termination = 'stagnation';
            else if (thresholdStops && k >= 1 && last.aPosteriori !== undefined && last.aPosteriori < tolerance) termination = 'threshold';
            else if (k >= FIXED_POINT_MAX_STEPS) termination = 'iteration-limit';
            if (termination !== undefined || k >= steps) break;
            const x = k === 0 ? x1 : next(last.x, k + 1);
            taken.push({index: k + 1, from: last.x, to: x});
            points.push(pointAt(k + 1, x, last.x));
        }
    }

    const current = points[points.length - 1];
    let cycle: FixedPointHistory['cycle'];
    if (example.integerGrid && fixedPoint === undefined && points.length >= 3) {
        // Exact in integer hundredths: x_2 = x_0 and x_1 != x_0.
        cycle = {first: x0, second: x1};
    }

    return {
        example: exampleId, x0, digits, tolerance, hypotheses: example.hypotheses,
        ...(q !== undefined ? {q} : {}),
        step: points.length - 1, points, steps: taken, current,
        ...(termination !== undefined ? {termination} : {}),
        ...(fixedPoint !== undefined ? {fixedPoint} : {}),
        ...(cycle !== undefined ? {cycle} : {}),
    };
}
