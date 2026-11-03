import {describe, expect, test} from 'vitest';
import {
    FOURIER_DECAY_MAX_ORDER, FOURIER_DECAY_REFERENCES, FOURIER_JUMP_POINTS, FOURIER_SUP_GRID_POINTS, fourierAmplitudes, fourierExampleCoefficients,
    fourierLogAxis, fourierSupError, isZeroAmplitude,
} from './fourierDecay';
import {FOURIER_EXAMPLE_IDS} from './fourierExamples';

const amplitude = (id: Parameters<typeof fourierAmplitudes>[0], k: number) => fourierAmplitudes(id, FOURIER_DECAY_MAX_ORDER)[k - 1];

describe('amplitudes against their reference curves', () => {
    test.each(FOURIER_EXAMPLE_IDS)('%s: A_k is at most its reference for every k <= 101', id => {
        const amplitudes = fourierAmplitudes(id, FOURIER_DECAY_MAX_ORDER);
        expect(amplitudes).toHaveLength(101);
        amplitudes.forEach((value, i) => expect(value).toBeLessThanOrEqual(FOURIER_DECAY_REFERENCES[id].amplitude(i + 1) + 1e-9));
    });

    test('equality at odd k for the square wave and |x| (and at every k for the sawtooth), to the kernel quadrature', () => {
        for (let k = 1; k <= 101; k += 2) {
            expect(amplitude('square', k)).toBeCloseTo(FOURIER_DECAY_REFERENCES.square.amplitude(k), 9);
            expect(amplitude('abs', k)).toBeCloseTo(FOURIER_DECAY_REFERENCES.abs.amplitude(k), 9);
        }
        for (let k = 1; k <= 101; k++) expect(amplitude('sawtooth', k)).toBeCloseTo(2 / k, 9);
    });

    test('the amplitudes of the square wave at even k are exact zeros, and those of the other examples are not', () => {
        for (let k = 2; k <= 100; k += 2) expect(isZeroAmplitude(amplitude('square', k))).toBe(true);
        expect(isZeroAmplitude(amplitude('square', 3))).toBe(false);
        expect(isZeroAmplitude(amplitude('sawtooth', 100))).toBe(false);
    });
});

describe('the spec values of the smooth example 1/(2 - cos x)', () => {
    test('a_1, a_2, a_5 (spec digits, 1e-7) and a_10 to relative 1e-3 (the quadrature noise floor)', () => {
        const {a, b} = fourierExampleCoefficients('smooth');
        expect(Math.abs(a[1] - 0.3094011)).toBeLessThan(1e-7);
        expect(Math.abs(a[2] - 0.0829038)).toBeLessThan(1e-7);
        expect(Math.abs(a[5] - 0.00159489)).toBeLessThan(1e-8);
        const r = 2 - Math.sqrt(3);
        // Stated tolerance (spec F4 acceptance 1): relative 1e-3 against the formula at k = 10.
        expect(Math.abs(a[10] - (2 / Math.sqrt(3)) * r ** 10) / ((2 / Math.sqrt(3)) * r ** 10)).toBeLessThan(1e-3);
        // The spec value (corrected from a misprinted 2.1963e-6): the formula gives 2.20290e-6.
        expect(Math.abs(a[10] - 2.2029e-6) / 2.2029e-6).toBeLessThan(1e-3);
        for (const k of [1, 2, 5]) expect(Math.abs(a[k] - (2 / Math.sqrt(3)) * r ** k)).toBeLessThan(1e-9);
        expect(Math.abs(b[3])).toBeLessThan(1e-9);
    });
});

describe('log-log slopes between k = 11 and k = 101 (odd k)', () => {
    const slope = (id: 'square' | 'abs') => Math.log(amplitude(id, 101) / amplitude(id, 11)) / Math.log(101 / 11);
    test('-1 for the square wave and -2 for |x|, to 1e-9', () => {
        expect(slope('square')).toBeCloseTo(-1, 9);
        expect(slope('abs')).toBeCloseTo(-2, 9);
    });
});

describe('sup error of S_N on the 20001-point grid, jump points excluded', () => {
    test('|x| with N = 11 is 0.05293 (the corner at x = 0), and it shrinks with N', () => {
        expect(FOURIER_SUP_GRID_POINTS).toBe(20001);
        expect(fourierSupError('abs', 11)).toBeCloseTo(0.05293, 5);
        expect(fourierSupError('abs', 21)).toBeLessThan(fourierSupError('abs', 11));
        expect(fourierSupError('abs', 11)).toBe(fourierSupError('abs', 11));
    });

    test('the smooth example is far below the jump examples at the same N', () => {
        expect(fourierSupError('smooth', 11)).toBeLessThan(1e-5);
        expect(fourierSupError('square', 11)).toBeGreaterThan(0.5);
    });

    test('the jump points are the listed ones, and the grid contains the square wave jump x = 0 which is skipped', () => {
        expect(FOURIER_JUMP_POINTS.abs).toEqual([]);
        // At the jump x = 0 the square wave and S_N differ by 1 (S_N(0) = 0 and f(0) = 0 in the example's own value, so the
        // distance only shows next to it): the sup error is the Gibbs-type error near the jump, finite and below the jump height.
        expect(fourierSupError('square', 11)).toBeLessThan(1.2);
    });
});

describe('log axis', () => {
    test('decade ticks from 1e-8 to the decade of the maximum, at least one decade', () => {
        expect(fourierLogAxis(1.27)).toEqual({minExponent: -8, maxExponent: 1, ticks: [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1]});
        expect(fourierLogAxis(0.3).maxExponent).toBe(0);
        expect(fourierLogAxis(1).maxExponent).toBe(0);
        expect(fourierLogAxis(1e-20).ticks).toEqual([-8, -7]);
    });
});
