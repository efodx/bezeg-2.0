import {formatArgument, formatComplex, piMultiple} from './complexFormat';

test('formats complex numbers as a + bi with a true minus sign and the language decimal separator', () => {
    expect(formatComplex({re: 1, im: 1}, 'en')).toBe('1 + i');
    expect(formatComplex({re: -1, im: 1}, 'en')).toBe('−1 + i');
    expect(formatComplex({re: -1, im: -1}, 'en')).toBe('−1 − i');
    expect(formatComplex({re: 0, im: 2}, 'en')).toBe('2i');
    expect(formatComplex({re: 0, im: -1}, 'en')).toBe('−i');
    expect(formatComplex({re: 0, im: 1}, 'en')).toBe('i');
    expect(formatComplex({re: 2, im: 0}, 'en')).toBe('2');
    expect(formatComplex({re: 0, im: 0}, 'en')).toBe('0');
    expect(formatComplex({re: 0.5, im: -1.25}, 'sl')).toBe('0,5 − 1,25i');
    // a product of two grid numbers is a multiple of 0.0025 and is shown exactly
    expect(formatComplex({re: 0.0025, im: -0.0075}, 'en')).toBe('0.0025 − 0.0075i');
});

test('recognises simple multiples of pi and nothing else', () => {
    expect(piMultiple(Math.PI)).toBe('π');
    expect(piMultiple(Math.PI / 2)).toBe('π/2');
    expect(piMultiple(Math.atan2(1, 1))).toBe('π/4');
    expect(piMultiple(3 * Math.PI / 4)).toBe('3π/4');
    expect(piMultiple(-3 * Math.PI / 4)).toBe('−3π/4');
    expect(piMultiple(Math.atan2(1, 1) + Math.PI)).toBe('5π/4');
    expect(piMultiple(2 * Math.PI)).toBe('2π');
    expect(piMultiple(0)).toBe('0');
    expect(piMultiple(Math.atan2(1, 2))).toBeUndefined();
    expect(piMultiple(NaN)).toBeUndefined();
});

test('formats an argument in radians and never turns an undefined argument into 0', () => {
    expect(formatArgument(Math.PI / 4, 'en', 'undefined')).toBe('π/4 ≈ 0.785');
    expect(formatArgument(-3 * Math.PI / 4, 'sl', 'ni definiran')).toBe('−3π/4 ≈ −2,356');
    expect(formatArgument(Math.atan2(1, 2), 'en', 'undefined')).toBe('≈ 0.464');
    expect(formatArgument(0, 'en', 'undefined')).toBe('0');
    expect(formatArgument(undefined, 'en', 'undefined')).toBe('undefined');
    expect(formatArgument(undefined, 'sl', 'ni definiran')).toBe('ni definiran');
});
