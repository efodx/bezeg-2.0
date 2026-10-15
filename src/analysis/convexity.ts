/**
 * Convexity demonstration: chord over [a, b], tangent at an independent point t, the sign of f'' on [a, b] and the
 * inflection points, for a few named examples. Claims (graph below the chord, above the tangent) are derived from the
 * sign of f'' on the interval, never from sampling.
 * Pure mathematics: no React, JSXGraph or localization imports.
 */
import {NonVerticalLine} from './derivative';

/** The endpoints a, b and the tangent point t may all move in [CONVEXITY_X_MIN, CONVEXITY_X_MAX]. */
export const CONVEXITY_X_MIN = -2;
export const CONVEXITY_X_MAX = 2;
export const CONVEXITY_X_STEP = 0.01;

export const isConvexityX = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= CONVEXITY_X_MIN && value <= CONVEXITY_X_MAX;

/** True for finite numbers with a < b (a chord needs a proper interval). */
export const isConvexityInterval = (a: number, b: number): boolean =>
    Number.isFinite(a) && Number.isFinite(b) && a < b;

/** The sign of f'' on a closed interval: never negative, never positive, or both signs occur. */
export type SecondDerivativeSign = 'nonnegative' | 'nonpositive' | 'changes';

export interface ConvexityExample {
    readonly id: ConvexityExampleId;
    /** Undelimited LaTeX of the formula. */
    readonly latex: string;
    readonly plain: string;
    readonly value: (x: number) => number;
    readonly derivative: (x: number) => number;
    readonly secondDerivative: (x: number) => number;
    /** The sign of f'' on [a, b], computed analytically (callers validate a < b). */
    readonly secondDerivativeSign: (a: number, b: number) => SecondDerivativeSign;
    /** Every point where f'' changes sign (not merely vanishes), ascending. */
    readonly inflectionPoints: readonly number[];
}

export const CONVEXITY_EXAMPLE_IDS = ['square', 'negSquare', 'cube', 'quartic'] as const;
export type ConvexityExampleId = typeof CONVEXITY_EXAMPLE_IDS[number];

export const isConvexityExampleId = (value: unknown): value is ConvexityExampleId =>
    typeof value === 'string' && (CONVEXITY_EXAMPLE_IDS as readonly string[]).includes(value);

export const CONVEXITY_EXAMPLES: Readonly<Record<ConvexityExampleId, ConvexityExample>> = {
    // f'' = 2 > 0.
    square: {
        id: 'square',
        latex: 'x^2',
        plain: 'x^2',
        value: x => x * x,
        derivative: x => 2 * x,
        secondDerivative: () => 2,
        secondDerivativeSign: () => 'nonnegative',
        inflectionPoints: [],
    },
    // f'' = -2 < 0.
    negSquare: {
        id: 'negSquare',
        latex: '-x^2',
        plain: '-x^2',
        value: x => -(x * x),
        derivative: x => -2 * x,
        secondDerivative: () => -2,
        secondDerivativeSign: () => 'nonpositive',
        inflectionPoints: [],
    },
    // f'' = 6x: negative left of 0, positive right of 0.
    cube: {
        id: 'cube',
        latex: 'x^3',
        plain: 'x^3',
        value: x => x * x * x,
        derivative: x => 3 * x * x,
        secondDerivative: x => 6 * x,
        secondDerivativeSign: (a, b) => (a >= 0 ? 'nonnegative' : b <= 0 ? 'nonpositive' : 'changes'),
        inflectionPoints: [0],
    },
    // f'' = 12x^2 >= 0, zero only at 0 without changing sign: convex, no inflection.
    quartic: {
        id: 'quartic',
        latex: 'x^4',
        plain: 'x^4',
        value: x => x * x * x * x,
        derivative: x => 4 * x * x * x,
        secondDerivative: x => 12 * x * x,
        secondDerivativeSign: () => 'nonnegative',
        inflectionPoints: [],
    },
};

export const convexityExample = (id: ConvexityExampleId): ConvexityExample => CONVEXITY_EXAMPLES[id];

function requireInterval(a: number, b: number): void {
    if (!isConvexityInterval(a, b)) throw new RangeError('The endpoints must be finite numbers with a < b.');
}

function requireFinite(t: number): void {
    if (!Number.isFinite(t)) throw new RangeError('The tangent point must be a finite number.');
}

/** The sign of f'' on [a, b]. Throws unless a < b. */
export function secondDerivativeSignOn(example: ConvexityExample, a: number, b: number): SecondDerivativeSign {
    requireInterval(a, b);
    return example.secondDerivativeSign(a, b);
}

/** The inflection points strictly inside (a, b): points where f'' changes sign. Throws unless a < b. */
export function inflectionPointsIn(example: ConvexityExample, a: number, b: number): readonly number[] {
    requireInterval(a, b);
    return example.inflectionPoints.filter(x => x > a && x < b);
}

export type ConvexityVerdict =
    | {readonly kind: 'convex'}
    | {readonly kind: 'concave'}
    | {readonly kind: 'none'; readonly reason: 'sign-changes'};

/** Convex when f'' >= 0 on [a, b], concave when f'' <= 0, otherwise no claim. Throws unless a < b. */
export function convexityVerdict(example: ConvexityExample, a: number, b: number): ConvexityVerdict {
    switch (secondDerivativeSignOn(example, a, b)) {
        case 'nonnegative':
            return {kind: 'convex'};
        case 'nonpositive':
            return {kind: 'concave'};
        default:
            return {kind: 'none', reason: 'sign-changes'};
    }
}

/** Where the graph lies relative to a line over [a, b], when that can be claimed. */
export type ComparisonClaim =
    | {readonly kind: 'below' | 'above'}
    | {readonly kind: 'none'; readonly reason: 'sign-changes' | 'tangent-outside-interval'};

/** Convex: the graph lies on or below the chord on [a, b]; concave: on or above. Throws unless a < b. */
export function chordComparison(example: ConvexityExample, a: number, b: number): ComparisonClaim {
    const verdict = convexityVerdict(example, a, b);
    if (verdict.kind === 'none') return verdict;
    return {kind: verdict.kind === 'convex' ? 'below' : 'above'};
}

/**
 * Convex: the graph lies on or above the tangent at t over [a, b]; concave: on or below. The claim is made only when
 * f'' has a fixed sign on [a, b] and t lies in [a, b]. Throws unless a < b and t is finite.
 */
export function tangentComparison(example: ConvexityExample, a: number, b: number, t: number): ComparisonClaim {
    requireFinite(t);
    const verdict = convexityVerdict(example, a, b);
    if (verdict.kind === 'none') return verdict;
    if (t < a || t > b) return {kind: 'none', reason: 'tangent-outside-interval'};
    return {kind: verdict.kind === 'convex' ? 'above' : 'below'};
}

/** The chord through (a, f(a)) and (b, f(b)). Throws unless a < b. */
export function chordLineOf(example: ConvexityExample, a: number, b: number): NonVerticalLine {
    requireInterval(a, b);
    const slope = (example.value(b) - example.value(a)) / (b - a);
    return {slope, intercept: example.value(a) - slope * a};
}

/** The tangent line at t (f is differentiable everywhere). Throws unless t is finite. */
export function tangentLineAt(example: ConvexityExample, t: number): NonVerticalLine {
    requireFinite(t);
    const slope = example.derivative(t);
    return {slope, intercept: example.value(t) - slope * t};
}
