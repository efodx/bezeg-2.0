import {expect, test} from 'vitest';
import {pointLabelMath} from './pointLabelMath';

test('trailing digits and Unicode subscripts become a subscript', () => {
    expect(pointLabelMath('P1')).toBe('$$P_{1}$$');
    expect(pointLabelMath('A_0')).toBe('$$A_{0}$$');
    expect(pointLabelMath('s12')).toBe('$$s_{12}$$');
    expect(pointLabelMath('S₁')).toBe('$$S_{1}$$');
    expect(pointLabelMath('F₁₂')).toBe('$$F_{12}$$');
    expect(pointLabelMath('PTₙ')).toBe('$$PT_{n}$$');
});

test('primes stay primes, with or without an index', () => {
    expect(pointLabelMath('A′')).toBe("$$A'$$");
    expect(pointLabelMath('P″')).toBe("$$P''$$");
    expect(pointLabelMath('A′1')).toBe("$$A'_{1}$$");
    expect(pointLabelMath('p′')).toBe("$$p'$$");
});

test('Greek letters and special symbols become TeX commands', () => {
    expect(pointLabelMath('θ')).toBe('$$\\theta$$');
    expect(pointLabelMath('ℓ')).toBe('$$\\ell$$');
    expect(pointLabelMath('P = ∞')).toBe('$$P = \\infty$$');
    expect(pointLabelMath('λ₁')).toBe('$$\\lambda _{1}$$');
});

test('a plain letter is typeset as it is', () => {
    expect(pointLabelMath('a')).toBe('$$a$$');
    expect(pointLabelMath('C')).toBe('$$C$$');
});
