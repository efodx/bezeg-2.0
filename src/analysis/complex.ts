/**
 * Complex multiplication demonstration: complex numbers as points {re, im} of the plane, their product, modulus and principal
 * argument, and the rule "arguments add (modulo 2 pi), moduli multiply". Pure mathematics: no React, JSXGraph or localization
 * imports.
 *
 * Conventions:
 * - The principal argument lies in (-pi, pi] and is `undefined` for 0. It is never 0 or NaN presented as a number.
 * - Operand coordinates live on a 0.05 grid in [-2, 2] (`COMPLEX_COORDINATE_*`). Products of grid operands are computed in
 *   integer units of 1/20, so a product that is exactly real or exactly 0 is exactly so (its argument is then exactly pi,
 *   0 or undefined, never -pi or a rounding artifact).
 * - Polar input for an operand is snapped to the nearest grid point (`snapPolarToGrid`); see its documentation for the rule.
 */

export interface Complex {
    readonly re: number;
    readonly im: number;
}

export const COMPLEX_COORDINATE_MIN = -2;
export const COMPLEX_COORDINATE_MAX = 2;
export const COMPLEX_COORDINATE_STEP = 0.05;
/** Grid points per unit (1 / step), an exact integer. */
const GRID_PER_UNIT = 20;
/** A value this close (in grid steps) to a grid point counts as on the grid, absorbing floating-point noise such as 0.1 + 0.2. */
const GRID_TOLERANCE = 1e-9;

/** The largest modulus of an operand, reached at the corners 2 + 2i: 2 sqrt 2. */
export const COMPLEX_MAX_OPERAND_MODULUS = 2 * Math.SQRT2;
/** The largest modulus of a product of in-domain operands: (2 sqrt 2)^2 = 8. A graph view that contains this disc shows every product. */
export const COMPLEX_MAX_PRODUCT_MODULUS = 8;

/** Angles within this of a branch boundary are treated as on it (a sum of two atan2 results can be an ulp off pi). */
const ANGLE_TOLERANCE = 1e-12;

export const COMPLEX_EXAMPLE_IDS = ['rotation-i', 'identity', 'negation', 'scaling', 'general', 'zero'] as const;
export type ComplexExampleId = typeof COMPLEX_EXAMPLE_IDS[number];

export const isComplexExampleId = (value: unknown): value is ComplexExampleId =>
    typeof value === 'string' && (COMPLEX_EXAMPLE_IDS as readonly string[]).includes(value);

/** Both operands of a named example. */
export interface ComplexOperands {
    readonly z: Complex;
    readonly w: Complex;
}

/**
 * The operands each named example sets (both of them): z = 1 + i throughout; w = i (rotation by pi/2, the default), 1, -1
 * (rotation by pi), 2 (scaling), 1 + i (rotation by pi/4 and scaling by sqrt 2) and 0.
 */
const EXAMPLE_OPERANDS: Readonly<Record<ComplexExampleId, ComplexOperands>> = {
    'rotation-i': {z: {re: 1, im: 1}, w: {re: 0, im: 1}},
    identity: {z: {re: 1, im: 1}, w: {re: 1, im: 0}},
    negation: {z: {re: 1, im: 1}, w: {re: -1, im: 0}},
    scaling: {z: {re: 1, im: 1}, w: {re: 2, im: 0}},
    general: {z: {re: 1, im: 1}, w: {re: 1, im: 1}},
    zero: {z: {re: 1, im: 1}, w: {re: 0, im: 0}},
};

/** The operands a named example starts from (a fresh copy, safe to keep). */
export function complexExampleOperands(id: ComplexExampleId): ComplexOperands {
    const {z, w} = EXAMPLE_OPERANDS[id];
    return {z: {...z}, w: {...w}};
}

/** Turns -0 into 0 so a coordinate never prints as "-0" and atan2 never sees a negative zero. */
const plusZero = (value: number): number => value + 0;

/** The integer number of grid steps of a coordinate on the grid (any magnitude), or undefined when it is off the grid. */
function gridUnits(value: number): number | undefined {
    if (!Number.isFinite(value)) return undefined;
    const units = value * GRID_PER_UNIT;
    const rounded = Math.round(units);
    return Math.abs(units - rounded) <= GRID_TOLERANCE ? rounded : undefined;
}

/** True for a finite number on the 0.05 grid within [-2, 2]. Floating-point noise below 1e-9 of a step is tolerated. */
export function isComplexCoordinate(value: unknown): value is number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    if (value < COMPLEX_COORDINATE_MIN - GRID_TOLERANCE || value > COMPLEX_COORDINATE_MAX + GRID_TOLERANCE) return false;
    return gridUnits(value) !== undefined;
}

/**
 * The grid point nearest to `value` (exactly k / 20, with no -0). Does not clamp: a value outside [-2, 2] snaps to a grid point
 * outside it, which `isComplexCoordinate` then rejects. Throws on a non-finite value.
 */
export function snapComplexCoordinate(value: number): number {
    if (!Number.isFinite(value)) throw new RangeError('The coordinate must be a finite number.');
    return plusZero(Math.round(value * GRID_PER_UNIT) / GRID_PER_UNIT);
}

/** True when both coordinates are in-domain grid values. */
export const isComplexOperand = (value: Complex): boolean => isComplexCoordinate(value.re) && isComplexCoordinate(value.im);

export const isZero = (z: Complex): boolean => z.re === 0 && z.im === 0;

/**
 * The product zw = (a c - b d) + (a d + b c) i. When both factors are on the 0.05 grid the arithmetic is done in integer units
 * of 1/20 (exact) and divided once by 400, so exact zeros and exactly real products carry no rounding noise.
 */
export function complexMultiply(z: Complex, w: Complex): Complex {
    const a = gridUnits(z.re);
    const b = gridUnits(z.im);
    const c = gridUnits(w.re);
    const d = gridUnits(w.im);
    if (a !== undefined && b !== undefined && c !== undefined && d !== undefined) {
        const scale = GRID_PER_UNIT * GRID_PER_UNIT;
        return {re: plusZero((a * c - b * d) / scale), im: plusZero((a * d + b * c) / scale)};
    }
    return {re: plusZero(z.re * w.re - z.im * w.im), im: plusZero(z.re * w.im + z.im * w.re)};
}

/** The modulus |z| = sqrt(re^2 + im^2). */
export const complexModulus = (z: Complex): number => Math.hypot(z.re, z.im);

/** The principal argument in (-pi, pi], or undefined for 0 (whose argument does not exist). A negative real gives pi, never -pi. */
export function complexArgument(z: Complex): number | undefined {
    if (isZero(z)) return undefined;
    return Math.atan2(plusZero(z.im), plusZero(z.re));
}

export interface ComplexPolar {
    readonly modulus: number;
    readonly argument: number;
}

/** The polar form of a nonzero z, or undefined for 0. */
export function complexToPolar(z: Complex): ComplexPolar | undefined {
    const argument = complexArgument(z);
    return argument === undefined ? undefined : {modulus: complexModulus(z), argument};
}

/** r (cos t + i sin t) for a finite modulus r > 0 and a finite argument t, unsnapped. Throws otherwise. */
export function polarToComplex(modulus: number, argument: number): Complex {
    if (!Number.isFinite(modulus) || modulus <= 0) throw new RangeError('The modulus must be a finite number above 0.');
    if (!Number.isFinite(argument)) throw new RangeError('The argument must be a finite number.');
    return {re: modulus * Math.cos(argument), im: modulus * Math.sin(argument)};
}

/**
 * The operand a polar input (modulus r, argument t) selects: r (cos t + i sin t) with each coordinate snapped to the nearest
 * point of the 0.05 grid. This is the one rule linking the polar controls to the Cartesian grid, so setting the modulus and
 * argument of an existing grid operand reproduces it (the polar values may be rounded to two decimals first: that moves each
 * coordinate by under 0.02, less than half a grid step). The typed polar values do not survive exactly: a graph shows the polar
 * form of the snapped operand afterwards.
 *
 * Returns undefined (reject, never clamp) when the input cannot name an in-domain operand: a non-finite or non-positive
 * modulus or a non-finite argument, a snapped coordinate outside [-2, 2], or a modulus so small that the snapped point is the
 * origin (an operand of modulus > 0 is never silently turned into 0).
 */
export function snapPolarToGrid(modulus: number, argument: number): Complex | undefined {
    if (!Number.isFinite(modulus) || modulus <= 0 || !Number.isFinite(argument)) return undefined;
    const exact = polarToComplex(modulus, argument);
    const snapped = {re: snapComplexCoordinate(exact.re), im: snapComplexCoordinate(exact.im)};
    if (!isComplexOperand(snapped) || isZero(snapped)) return undefined;
    return snapped;
}

export interface ArgumentSum {
    /** arg z + arg w, in (-2 pi, 2 pi]. */
    readonly sum: number;
    /** The sum reduced modulo 2 pi into (-pi, pi]: the principal argument of the product. */
    readonly reduced: number;
    /** True when the reduction changed the sum (the sum left (-pi, pi]). */
    readonly wasReduced: boolean;
}

/**
 * arg z + arg w reduced modulo 2 pi into (-pi, pi], with a flag when the reduction changed the sum. Exactly pi stays pi and
 * -pi is reduced to pi (so the flag is set for it); 2 pi reduces to 0. Undefined unless both operands are nonzero.
 */
export function argumentSum(z: Complex, w: Complex): ArgumentSum | undefined {
    const first = complexArgument(z);
    const second = complexArgument(w);
    if (first === undefined || second === undefined) return undefined;
    const sum = first + second;
    let reduced = sum;
    let wasReduced = false;
    if (reduced > Math.PI + ANGLE_TOLERANCE) {
        reduced -= 2 * Math.PI;
        wasReduced = true;
    } else if (reduced <= -Math.PI + ANGLE_TOLERANCE) {
        reduced += 2 * Math.PI;
        wasReduced = true;
    }
    if (Math.abs(reduced - Math.PI) <= ANGLE_TOLERANCE) reduced = Math.PI;
    return {sum, reduced, wasReduced};
}
