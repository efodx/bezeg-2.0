/**
 * Piecewise function f(x) = a*x^2 for x <= 1 and f(x) = -a*x + 3 for x > 1, continuity at x = 1.
 * Pure mathematics: no React, JSXGraph or localization imports.
 */

/** The parameter slider range and step. */
export const CONTINUITY_A_MIN = 0;
export const CONTINUITY_A_MAX = 3;
export const CONTINUITY_A_STEP = 0.05;

/** The point where the two pieces meet. */
export const JOIN_X = 1;

/** The two one-sided values count as equal when they differ by at most this much (slider arithmetic is not exact). */
export const CONTINUITY_TOLERANCE = 1e-9;

/** How far right of the join the right piece starts when it is sampled: the join itself belongs to the left piece. */
export const RIGHT_PIECE_START_OFFSET = 1e-9;

/** The value of a that makes the pieces meet: a = 3 - a, so a = 3/2. */
export const CONTINUOUS_PARAMETER = 3 / 2;

export interface SampledPiece {
    readonly x: number[];
    readonly y: number[];
}

/** The left piece a*x^2 (used for x <= 1). */
export function leftPiece(a: number, x: number): number {
    return a * x * x;
}

/** The right piece -a*x + 3 (used for x > 1). */
export function rightPiece(a: number, x: number): number {
    return -a * x + 3;
}

/** f(x): the left piece for x <= 1, the right piece for x > 1. */
export function piecewiseValue(a: number, x: number): number {
    return x <= JOIN_X ? leftPiece(a, x) : rightPiece(a, x);
}

/** f(1) = a: the value at the join comes from the left piece because the left domain is x <= 1. */
export function valueAtJoin(a: number): number {
    return piecewiseValue(a, JOIN_X);
}

/** The limit from the left, lim_{x->1-} f(x) = a (the left piece is continuous). */
export function leftLimit(a: number): number {
    return leftPiece(a, JOIN_X);
}

/** The limit from the right, lim_{x->1+} f(x) = 3 - a (the right piece is continuous). */
export function rightLimit(a: number): number {
    return rightPiece(a, JOIN_X);
}

/** The jump |lim+ - lim-| = |3 - 2a|. */
export function jump(a: number): number {
    return Math.abs(rightLimit(a) - leftLimit(a));
}

/** Continuous at 1 when lim- = lim+ = f(1) within the tolerance (f(1) = lim- holds by construction). */
export function isContinuous(a: number, tolerance = CONTINUITY_TOLERANCE): boolean {
    return jump(a) <= tolerance && Math.abs(valueAtJoin(a) - leftLimit(a)) <= tolerance;
}

/** The left derivative at 1: d/dx (a*x^2) = 2*a*x = 2a. */
export function leftSlope(a: number): number {
    return 2 * a * JOIN_X;
}

/** The right derivative at 1: d/dx (-a*x + 3) = -a. */
export function rightSlope(a: number): number {
    return -a;
}

/** Evenly spaced samples of the left piece on [from, min(to, 1)]; empty when the interval has no part of x <= 1. */
export function sampleLeftPiece(a: number, from: number, to: number, count = 240): SampledPiece {
    return sample(x => leftPiece(a, x), from, Math.min(to, JOIN_X), count);
}

/** Evenly spaced samples of the right piece on (1, to]: the first sample is just right of 1 and no sample is at or left of 1. */
export function sampleRightPiece(a: number, from: number, to: number, count = 240): SampledPiece {
    return sample(x => rightPiece(a, x), Math.max(from, JOIN_X) + RIGHT_PIECE_START_OFFSET, to, count);
}

function sample(f: (x: number) => number, from: number, to: number, count: number): SampledPiece {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return {x: [], y: []};
    const x: number[] = [];
    const y: number[] = [];
    for (let i = 0; i <= count; i++) {
        const xi = i === count ? to : from + ((to - from) * i) / count;
        x.push(xi);
        y.push(f(xi));
    }
    return {x, y};
}
