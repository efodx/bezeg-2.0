/**
 * Mean value theorem demonstration: secant slope over [a, b], tangent slope at an interior point c and the exact
 * interior points where the two agree, for a few named examples.
 * Pure mathematics: no React, JSXGraph or localization imports.
 */
import {NonVerticalLine} from './derivative';

/** The endpoints a, b and the tangent point c may all move in [MVT_X_MIN, MVT_X_MAX]. */
export const MVT_X_MIN = -4;
export const MVT_X_MAX = 4;
export const MVT_X_STEP = 0.01;

export const isMeanValueX = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= MVT_X_MIN && value <= MVT_X_MAX;

/** True for finite numbers with a < b (the theorem needs a proper interval). */
export const isInterval = (a: number, b: number): boolean => Number.isFinite(a) && Number.isFinite(b) && a < b;

/** True for finite numbers with a < c < b. */
export const isOrdered = (a: number, c: number, b: number): boolean =>
    Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && a < c && c < b;

/**
 * The interior points of (a, b) whose tangent slope equals the secant slope.
 * `points` is a finite ascending list (possibly empty); `interval` is the open interval (from, to) of which every
 * point matches (|x| on an interval not containing 0: the derivative is constant there and equals the secant slope).
 */
export type MatchSet =
    | {readonly kind: 'points'; readonly points: readonly number[]}
    | {readonly kind: 'interval'; readonly from: number; readonly to: number};

export interface MeanValueExample {
    readonly id: MeanValueExampleId;
    /** Undelimited LaTeX of the formula. */
    readonly latex: string;
    readonly plain: string;
    readonly value: (x: number) => number;
    /** f'(x), or undefined where the derivative does not exist (never Infinity or NaN). */
    readonly derivative: (x: number) => number | undefined;
    /** Exact interior matching points for a < b, computed analytically (callers validate a < b). */
    readonly matches: (a: number, b: number) => MatchSet;
}

export const MEAN_VALUE_EXAMPLE_IDS = ['square', 'cube', 'abs'] as const;
export type MeanValueExampleId = typeof MEAN_VALUE_EXAMPLE_IDS[number];

export const isMeanValueExampleId = (value: unknown): value is MeanValueExampleId =>
    typeof value === 'string' && (MEAN_VALUE_EXAMPLE_IDS as readonly string[]).includes(value);

const inOpenInterval = (a: number, b: number) => (x: number) => x > a && x < b;

export const MEAN_VALUE_EXAMPLES: Readonly<Record<MeanValueExampleId, MeanValueExample>> = {
    // f' = 2x equals the secant slope a + b at c = (a + b) / 2, the only match.
    square: {
        id: 'square',
        latex: 'x^2',
        plain: 'x^2',
        value: x => x * x,
        derivative: x => 2 * x,
        matches: (a, b) => ({kind: 'points', points: [(a + b) / 2]}),
    },
    // The secant slope is a^2 + ab + b^2 (> 0 for a < b); 3c^2 equals it at c = +-sqrt((a^2 + ab + b^2) / 3).
    cube: {
        id: 'cube',
        latex: 'x^3',
        plain: 'x^3',
        value: x => x * x * x,
        derivative: x => 3 * x * x,
        matches: (a, b) => {
            const root = Math.sqrt((a * a + a * b + b * b) / 3);
            return {kind: 'points', points: [-root, root].filter(inOpenInterval(a, b))};
        },
    },
    // f' is -1 for x < 0, +1 for x > 0 and does not exist at 0. The secant slope is (|b| - |a|) / (b - a):
    // +1 when 0 <= a (all of (a, b) matches), -1 when b <= 0 (all of (a, b) matches) and in (-1, 1) when a < 0 < b,
    // where no differentiable point can match.
    abs: {
        id: 'abs',
        latex: '|x|',
        plain: '|x|',
        value: x => Math.abs(x),
        derivative: x => (x > 0 ? 1 : x < 0 ? -1 : undefined),
        matches: (a, b) => (a >= 0 || b <= 0 ? {kind: 'interval', from: a, to: b} : {kind: 'points', points: []}),
    },
};

export const meanValueExample = (id: MeanValueExampleId): MeanValueExample => MEAN_VALUE_EXAMPLES[id];

function requireInterval(a: number, b: number): void {
    if (!isInterval(a, b)) throw new RangeError('The endpoints must be finite numbers with a < b.');
}

function requireOrdered(a: number, c: number, b: number): void {
    if (!isOrdered(a, c, b)) throw new RangeError('The points must be finite numbers with a < c < b.');
}

/** The secant slope (f(b) - f(a)) / (b - a). Throws unless a < b. */
export function secantSlope(example: MeanValueExample, a: number, b: number): number {
    requireInterval(a, b);
    return (example.value(b) - example.value(a)) / (b - a);
}

/** The tangent slope f'(c), or undefined where it does not exist. Throws unless a < c < b. */
export function tangentSlope(example: MeanValueExample, a: number, c: number, b: number): number | undefined {
    requireOrdered(a, c, b);
    return example.derivative(c);
}

/** The tangent slope minus the secant slope, or undefined where f'(c) does not exist. Throws unless a < c < b. */
export function slopeDifference(example: MeanValueExample, a: number, c: number, b: number): number | undefined {
    const tangent = tangentSlope(example, a, c, b);
    return tangent === undefined ? undefined : tangent - secantSlope(example, a, b);
}

/** The secant line through (a, f(a)) and (b, f(b)). Throws unless a < b. */
export function secantLineOf(example: MeanValueExample, a: number, b: number): NonVerticalLine {
    const slope = secantSlope(example, a, b);
    return {slope, intercept: example.value(a) - slope * a};
}

/** The tangent line at c, or undefined where f'(c) does not exist (no fabricated tangent). Throws unless a < c < b. */
export function tangentLineOf(example: MeanValueExample, a: number, c: number, b: number): NonVerticalLine | undefined {
    const slope = tangentSlope(example, a, c, b);
    return slope === undefined ? undefined : {slope, intercept: example.value(c) - slope * c};
}

/** All interior points of (a, b) where f'(c) equals the secant slope. Throws unless a < b. */
export function matchingPoints(example: MeanValueExample, a: number, b: number): MatchSet {
    requireInterval(a, b);
    return example.matches(a, b);
}
