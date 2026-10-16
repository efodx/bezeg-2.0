/**
 * Text forms of complex numbers and arguments for readouts and the board. Pure: no React, JSXGraph or localization imports, so the
 * caller supplies the word for an undefined argument.
 *
 * Complex numbers print as "a + bi" with a true minus sign and the language's decimal separator. Operand and product coordinates
 * are multiples of 1/400 (a product of two 0.05 grid numbers), so four decimals show them exactly. Arguments print in radians, as a
 * multiple of pi where the angle is one ("3π/4 ≈ 2,356 rad"), and only as a rounded decimal otherwise ("≈ 0,464 rad").
 */
import {Complex} from './complex';
import {formatNumber, MINUS_SIGN, NumberLanguage} from './format';

const COORDINATE_DECIMALS = 4;
const ANGLE_DECIMALS = 3;
/** Denominators tried for a multiple of pi, smallest first (the arguments of grid points are multiples of pi/4 when they are exact). */
const PI_DENOMINATORS = [1, 2, 3, 4, 6, 12] as const;
const PI_TOLERANCE = 1e-9;

/** The angle as a multiple of pi ("π/4", "−3π/2", "π", "0"), or undefined when it is not a simple one. */
export function piMultiple(value: number): string | undefined {
    if (!Number.isFinite(value)) return undefined;
    if (value === 0) return '0';
    const ratio = value / Math.PI;
    for (const denominator of PI_DENOMINATORS) {
        const numerator = Math.round(ratio * denominator);
        if (numerator === 0 || Math.abs(ratio * denominator - numerator) > PI_TOLERANCE) continue;
        const magnitude = Math.abs(numerator);
        const top = magnitude === 1 ? 'π' : `${magnitude}π`;
        const text = denominator === 1 ? top : `${top}/${denominator}`;
        return numerator < 0 ? `${MINUS_SIGN}${text}` : text;
    }
    return undefined;
}

/** An argument in radians: the multiple of pi where there is one, always with the rounded decimal; `undefinedText` for no argument. */
export function formatArgument(value: number | undefined, language: NumberLanguage, undefinedText: string): string {
    if (value === undefined) return undefinedText;
    const decimal = formatNumber(value, language, ANGLE_DECIMALS);
    if (value === 0) return '0';
    const multiple = piMultiple(value);
    return multiple === undefined ? `≈ ${decimal}` : `${multiple} ≈ ${decimal}`;
}

/** A real coordinate to four decimals. */
export const formatCoordinate = (value: number, language: NumberLanguage): string => formatNumber(value, language, COORDINATE_DECIMALS);

/** z as "a + bi": "1 + i", "−1 + i", "2", "−i", "0,5 − 1,25i", "0". */
export function formatComplex(z: Complex, language: NumberLanguage): string {
    const real = formatCoordinate(z.re, language);
    const imaginary = formatCoordinate(z.im, language);
    if (imaginary === '0') return real;
    const magnitude = imaginary.startsWith(MINUS_SIGN) ? imaginary.slice(1) : imaginary;
    const part = `${magnitude === '1' ? '' : magnitude}i`;
    if (real === '0') return imaginary.startsWith(MINUS_SIGN) ? `${MINUS_SIGN}${part}` : part;
    return `${real} ${imaginary.startsWith(MINUS_SIGN) ? MINUS_SIGN : '+'} ${part}`;
}
