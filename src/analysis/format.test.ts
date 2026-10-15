import {formatSignificant} from './format';

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
