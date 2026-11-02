import {setLanguage} from '../../localization';
import {leastSquaresCoefficient, leastSquaresNumber, normalEquationsLatex} from './leastSquaresMessages';

beforeEach(() => setLanguage('sl'));

test('a coefficient or residual that rounding to 3 decimals changes is marked with ≈, an exact one is not', () => {
    expect(leastSquaresCoefficient(0.1)).toBe('0,1');
    expect(leastSquaresCoefficient(-0.7)).toBe('−0,7');
    expect(leastSquaresCoefficient(0.7000000000000001)).toBe('0,7');
    expect(leastSquaresCoefficient(0)).toBe('0');
    expect(leastSquaresCoefficient(0.0004)).toBe('≈ 0');
    expect(leastSquaresCoefficient(-0.0004)).toBe('≈ 0');
    expect(leastSquaresCoefficient(0.12345)).toBe('≈ 0,123');
    expect(leastSquaresCoefficient(-0.12345)).toBe('≈ −0,123');
    setLanguage('en');
    expect(leastSquaresCoefficient(0.12345)).toBe('≈ 0.123');
});

test('a sum of squares that is float noise or is rounded to 4 significant digits is marked with ≈, an exact one is not', () => {
    expect(leastSquaresNumber(0.7000000000000001)).toBe('0,7');
    expect(leastSquaresNumber(8.7)).toBe('8,7');
    expect(leastSquaresNumber(0)).toBe('0');
    expect(leastSquaresNumber(3.2e-30)).toBe('≈ 0');
    expect(leastSquaresNumber(0.123456)).toBe('≈ 0,1235');
    // A small sum rounded to 4 significant digits is still rounded: the noise tolerance is relative, with no absolute floor.
    expect(leastSquaresNumber(1.23456e-7)).toMatch(/^≈ /);
    expect(leastSquaresNumber(1.5e-7)).not.toMatch(/^≈ /);
});

test('a normal-equation entry that rounding changes is marked with \approx inside the LaTeX', () => {
    const exact = normalEquationsLatex({matrix: [[4, 6], [6, 14]], rhs: [9, 18], coefficients: [0.9, 0.9]}, 'sl');
    expect(exact).not.toContain('approx');
    const rounded = normalEquationsLatex({matrix: [[4, 6], [6, 14]], rhs: [9, 18], coefficients: [0.0004, 0.12345]}, 'sl');
    expect(rounded).toContain('c=\\begin{pmatrix}\\approx 0 \\\\ \\approx 0{,}123\\end{pmatrix}');
});
