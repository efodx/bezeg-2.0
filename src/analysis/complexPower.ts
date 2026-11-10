import {Complex, complexArgument, complexModulus, isZero} from './complex';

/** Largest exponent of the power kernels: 56.57^8 = 1.05e14 keeps every integer entry below 2^53 (n = 9 would reach 5.9e15). */
export const COMPLEX_POWER_MAX = 8;
/** Largest integer grid unit of a coordinate (2 / 0.05 = 40). */
export const COMPLEX_POWER_GRID_MAX = 40;

export interface PolarPower {
    /** |z|^n. */
    modulus: number;
    /** n times the principal argument of z, not wrapped; undefined for z = 0. */
    unwrappedAngle: number | undefined;
    /** The principal argument of z^n in (-pi, pi]; undefined for z = 0. */
    principalAngle: number | undefined;
}

function assertExponent(n: number): void {
    if (!Number.isInteger(n) || n < 1 || n > COMPLEX_POWER_MAX) {
        throw new RangeError(`The exponent must be an integer from 1 to ${COMPLEX_POWER_MAX}, got ${n}.`);
    }
}

/** Wraps an angle into (-pi, pi]. */
function wrapAngle(angle: number): number {
    const turn = 2 * Math.PI;
    return angle - turn * Math.ceil((angle - Math.PI) / turn);
}

/** The polar data of z^n by de Moivre: |z|^n, n*arg z unwrapped, and its principal value. Throws RangeError for n outside 1..8. */
export function polarPower(z: Complex, n: number): PolarPower {
    assertExponent(n);
    const modulus = complexModulus(z) ** n;
    if (isZero(z)) return {modulus: 0, unwrappedAngle: undefined, principalAngle: undefined};
    const unwrappedAngle = n * (complexArgument(z) as number);
    return {modulus, unwrappedAngle, principalAngle: wrapAngle(unwrappedAngle)};
}

/**
 * (a + b i)^n for integers a, b in [-40, 40] (grid units) and n in 1..8, in exact integer arithmetic.
 * Throws RangeError outside these bounds, where the entries could exceed 2^53.
 */
export function exactIntegerPower(a: number, b: number, n: number): {re: number; im: number} {
    assertExponent(n);
    for (const v of [a, b]) {
        if (!Number.isInteger(v) || Math.abs(v) > COMPLEX_POWER_GRID_MAX) {
            throw new RangeError(`The grid units must be integers in [-${COMPLEX_POWER_GRID_MAX}, ${COMPLEX_POWER_GRID_MAX}], got ${v}.`);
        }
    }
    let re = a;
    let im = b;
    for (let k = 1; k < n; k++) {
        [re, im] = [re * a - im * b, re * b + im * a];
    }
    return {re: re + 0, im: im + 0};
}
