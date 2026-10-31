/**
 * Difference quotient, secant and tangent of a catalog function (derivative demonstration).
 * Pure mathematics: no React, JSXGraph or localization imports.
 */
import {CatalogFunction} from './functions';

/** What the line constructions read; structural so that other modules' example functions can reuse them. */
export type ValueFunction = Pick<CatalogFunction, 'value'>;
export type DerivableFunction = Pick<CatalogFunction, 'value' | 'derivative'>;

/** The point x0 may move in [X0_MIN, X0_MAX]; the same range holds for every catalog function. */
export const X0_MIN = -4;
export const X0_MAX = 4;
export const X0_STEP = 0.01;

/** The step h is a slider value in [H_MIN, H_MAX] with |h| >= H_MIN_ABS: h = 0 would give the undefined quotient 0/0. */
export const H_MIN = -2;
export const H_MAX = 2;
export const H_STEP = 0.01;
export const H_MIN_ABS = 0.01;

/** Slider arithmetic starting at -2 can land a few ulps inside the excluded band; that noise is accepted. */
const BAND_TOLERANCE = 1e-9;

export const isX0 = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= X0_MIN && value <= X0_MAX;

/** h must be finite, inside [-2, 2] and at least 0.01 away from 0. */
export const isStep = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= H_MIN && value <= H_MAX && Math.abs(value) >= H_MIN_ABS - BAND_TOLERANCE;

/**
 * Maps a slider value to a valid h. A value in the excluded band |h| < 0.01 (the slider can step over 0) becomes
 * +-0.01 on the side the slider is moving towards, judged from the previous h; anything else is returned unchanged.
 */
export function stepOutOfBand(next: number, previous: number): number {
    if (!Number.isFinite(next) || Math.abs(next) >= H_MIN_ABS - BAND_TOLERANCE) return next;
    return next > previous || (next === previous && next >= 0) ? H_MIN_ABS : -H_MIN_ABS;
}

export interface Point2 {
    readonly x: number;
    readonly y: number;
}

/** A line y = slope * x + intercept. */
export interface NonVerticalLine {
    readonly slope: number;
    readonly intercept: number;
}

export interface Secant extends NonVerticalLine {
    readonly p0: Point2;
    readonly p1: Point2;
}

/** The difference quotient (f(x0 + h) - f(x0)) / h. Throws for h = 0 (0/0) and for a non-finite h. */
export function differenceQuotient(fn: ValueFunction, x0: number, h: number): number {
    if (!Number.isFinite(h) || h === 0) throw new RangeError('The step h must be a finite non-zero number.');
    return (fn.value(x0 + h) - fn.value(x0)) / h;
}

/** The secant through (x0, f(x0)) and (x0 + h, f(x0 + h)); its slope is the difference quotient. */
export function secantLine(fn: ValueFunction, x0: number, h: number): Secant {
    const slope = differenceQuotient(fn, x0, h);
    const p0 = {x: x0, y: fn.value(x0)};
    const p1 = {x: x0 + h, y: fn.value(x0 + h)};
    return {slope, intercept: p0.y - slope * x0, p0, p1};
}

/** The exact tangent at x0: slope f'(x0) through (x0, f(x0)). */
export function tangentLine(fn: DerivableFunction, x0: number): NonVerticalLine {
    const slope = fn.derivative(x0);
    return {slope, intercept: fn.value(x0) - slope * x0};
}

/** The value of a non-vertical line at x. */
export const lineValue = (line: NonVerticalLine, x: number): number => line.slope * x + line.intercept;
