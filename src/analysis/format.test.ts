import {formatDegrees, formatScientific, formatSignificant, NOT_A_NUMBER_TEXT, withDecimalSeparator} from './format';

test('significant-digit formatting keeps plain decimals in the readable range and exponents outside it', () => {
    expect(formatSignificant(0.000226, 'en')).toBe('0.000226');
    expect(formatSignificant(0.0005393, 'sl')).toBe('0,0005393');
    expect(formatSignificant(0.7182818, 'sl')).toBe('0,7183');
    expect(formatSignificant(2.025, 'en')).toBe('2.025');
    expect(formatSignificant(4.55625, 'en')).toBe('4.556');
    expect(formatSignificant(-0.0240426, 'sl')).toBe('−0,02404');
    expect(formatSignificant(16276041.6667, 'en')).toBe('1.628·10⁷');
    expect(formatSignificant(1.234e-7, 'sl')).toBe('1,234·10⁻⁷');
    expect(formatSignificant(-5e-9, 'en')).toBe('−5·10⁻⁹');
    expect(formatSignificant(1000, 'en')).toBe('1000');
});

test('floating-point noise and non-finite values never leak: below 1e-12 shows 0 (also -0), non-finite shows a dash', () => {
    for (const noise of [0, -0, 1e-17, -1e-17, 1e-13, -2.7e-16]) expect(formatSignificant(noise, 'sl')).toBe('0');
    expect(formatSignificant(1e-11, 'en')).toBe('1·10⁻¹¹');
    expect(formatSignificant(NaN, 'en')).toBe('—');
    expect(formatSignificant(Infinity, 'sl')).toBe('—');
});

test('already formatted text takes the language decimal separator and nothing else changes', () => {
    expect(withDecimalSeparator('0.25', 'sl')).toBe('0,25');
    expect(withDecimalSeparator('−1.5', 'sl')).toBe('−1,5');
    expect(withDecimalSeparator('1.234e-7', 'sl')).toBe('1,234e-7');
    expect(withDecimalSeparator('12', 'sl')).toBe('12');
    expect(withDecimalSeparator('0.25', 'en')).toBe('0.25');
});

test('degrees are number text only: trailing zeros dropped, decimal comma in Slovenian, true minus', () => {
    expect(formatDegrees(30, 'sl')).toBe('30');
    expect(formatDegrees(30.456, 'sl')).toBe('30,46');
    expect(formatDegrees(30.456, 'en')).toBe('30.46');
    expect(formatDegrees(-12.5, 'sl')).toBe('−12,5');
    expect(formatDegrees(-12.5, 'en')).toBe('−12.5');
    expect(formatDegrees(30.456, 'en', 0)).toBe('30');
});

test('scientific formatting always writes mantissa·10ⁿ with trimmed mantissa zeros, a decimal comma in Slovenian and true minus signs', () => {
    expect(formatScientific(1.234e-7, 'sl')).toBe('1,23·10⁻⁷');
    expect(formatScientific(1.234e-7, 'en')).toBe('1.23·10⁻⁷');
    expect(formatScientific(-5e-9, 'sl')).toBe('−5·10⁻⁹');
    expect(formatScientific(1234, 'en', 4)).toBe('1.234·10³');
    expect(formatScientific(12345, 'en')).toBe('1.23·10⁴');
    expect(formatScientific(5, 'en')).toBe('5·10⁰');
    expect(formatScientific(1.5e12, 'sl', 4)).toBe('1,5·10¹²');
    expect(formatScientific(0, 'sl')).toBe('0');
    expect(formatScientific(NaN, 'sl')).toBe(NOT_A_NUMBER_TEXT);
    expect(formatScientific(Infinity, 'en')).toBe(NOT_A_NUMBER_TEXT);
});
