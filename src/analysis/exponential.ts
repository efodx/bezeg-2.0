/** Exponential function f(x) = a^x with base a > 0. Pure mathematics: no React, JSXGraph or localization imports. */

/** The base slider range and step; the model only accepts bases inside it (so a <= 0 is impossible). */
export const EXPONENTIAL_BASE_MIN = 0.1;
export const EXPONENTIAL_BASE_MAX = 5;
export const EXPONENTIAL_BASE_STEP = 0.05;

/** A base this close to 1 counts as 1 (slider arithmetic such as 20 * 0.05 is not exact). */
export const BASE_ONE_TOLERANCE = 1e-9;

export type BaseBehavior = 'growth' | 'decay' | 'constant';

/** a^x for a > 0. */
export function exponentialValue(a: number, x: number): number {
    return Math.pow(a, x);
}

/** The base of the mirror graph: (1/a)^x = a^(-x) is the reflection of a^x over the y-axis. */
export function mirrorBase(a: number): number {
    return 1 / a;
}

/** a > 1 grows, 0 < a < 1 decays, a = 1 is constant. */
export function classifyBase(a: number): BaseBehavior {
    if (Math.abs(a - 1) <= BASE_ONE_TOLERANCE) return 'constant';
    return a > 1 ? 'growth' : 'decay';
}

/** The values f(from), f(from + 1), ..., f(to) at consecutive integers; each is `a` times the previous one. */
export function integerValues(a: number, from: number, to: number): number[] {
    const values: number[] = [];
    for (let x = from; x <= to; x++) values.push(exponentialValue(a, x));
    return values;
}
