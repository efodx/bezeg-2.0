/**
 * Conjugate, reciprocal and division of complex numbers (complex maps lesson M1). Pure mathematics: no React, JSXGraph or
 * localization imports.
 *
 * Conventions:
 * - Division by zero yields `undefined` (a typed "not defined"), never Infinity or NaN.
 * - "|z| = 1" is decided exactly in grid units: z on the 0.05 grid has integer coordinates (a, b) in steps of 1/20 and lies on
 *   the unit circle exactly when a^2 + b^2 = 400. An off-grid point is never reported as on the circle.
 */

import {Complex, isZero} from './complex';
import {complexUnits} from './complexMobius';

/** Grid steps per unit: the 0.05 operand grid of `complex.ts`. */
const GRID_PER_UNIT = 20;

const plusZero = (value: number): number => value + 0;

/** The conjugate re - im i (never produces -0). */
export const complexConjugate = (z: Complex): Complex => ({re: plusZero(z.re), im: plusZero(-z.im)});

/** 1/z = conj(z)/|z|^2, or `undefined` at z = 0. */
export function complexReciprocal(z: Complex): Complex | undefined {
    if (isZero(z)) return undefined;
    const modulusSquared = z.re * z.re + z.im * z.im;
    if (modulusSquared === 0 || !Number.isFinite(modulusSquared)) return undefined;
    return {re: plusZero(z.re / modulusSquared), im: plusZero(-z.im / modulusSquared)};
}

/** The inversion z / |z|^2 in the unit circle (so 1/z is its conjugate), or `undefined` at z = 0. */
export function unitCircleInversion(z: Complex): Complex | undefined {
    const reciprocal = complexReciprocal(z);
    return reciprocal === undefined ? undefined : complexConjugate(reciprocal);
}

/** numerator / denominator = numerator * (1/denominator), or `undefined` when the denominator is 0. */
export function complexDivide(numerator: Complex, denominator: Complex): Complex | undefined {
    const reciprocal = complexReciprocal(denominator);
    if (reciprocal === undefined) return undefined;
    return {
        re: plusZero(numerator.re * reciprocal.re - numerator.im * reciprocal.im),
        im: plusZero(numerator.re * reciprocal.im + numerator.im * reciprocal.re),
    };
}

/** True exactly when z is on the 0.05 grid and |z| = 1, decided in integer grid units (a^2 + b^2 = 400). */
export function isOnUnitCircle(z: Complex): boolean {
    const units = complexUnits(z);
    if (units === undefined) return false;
    return units.re * units.re + units.im * units.im === GRID_PER_UNIT * GRID_PER_UNIT;
}
