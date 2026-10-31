import {describe, expect, it} from 'vitest';
import {Complex} from './complex';
import {complexConjugate, complexDivide, complexReciprocal, isOnUnitCircle, unitCircleInversion} from './complexReciprocal';

const close = (z: Complex | undefined, re: number, im: number) => {
    expect(z).toBeDefined();
    expect(Math.abs(z!.re - re)).toBeLessThan(1e-12);
    expect(Math.abs(z!.im - im)).toBeLessThan(1e-12);
};

describe('reciprocal and division (acceptance 1)', () => {
    it('matches the M1 values', () => {
        close(complexReciprocal({re: 1, im: 1}), 0.5, -0.5);
        close(complexReciprocal({re: 0.5, im: 0.5}), 1, -1);
        close(complexReciprocal({re: 0.6, im: 0.8}), 0.6, -0.8);
        close(complexDivide({re: 2, im: 1}, {re: 1, im: -1}), 0.5, 1.5);
        close(unitCircleInversion({re: 1, im: 1}), 0.5, 0.5);
    });
    it('is undefined at zero, never Infinity or NaN', () => {
        expect(complexReciprocal({re: 0, im: 0})).toBeUndefined();
        expect(complexReciprocal({re: -0, im: 0})).toBeUndefined();
        expect(complexDivide({re: 1, im: 1}, {re: 0, im: 0})).toBeUndefined();
        expect(unitCircleInversion({re: 0, im: 0})).toBeUndefined();
        close(complexDivide({re: 0, im: 0}, {re: 1, im: 1}), 0, 0);
    });
    it('conjugates without -0', () => {
        expect(Object.is(complexConjugate({re: 1, im: 0}).im, 0)).toBe(true);
        expect(complexConjugate({re: 1, im: 2})).toEqual({re: 1, im: -2});
    });
    it('1/z equals the conjugate of the inversion over the whole grid', () => {
        for (let a = -40; a <= 40; a++) {
            for (let b = -40; b <= 40; b++) {
                const z = {re: a / 20, im: b / 20};
                const r = complexReciprocal(z);
                if (a === 0 && b === 0) {
                    expect(r).toBeUndefined();
                    continue;
                }
                const m2 = z.re * z.re + z.im * z.im;
                close(r, z.re / m2, -z.im / m2);
                close(complexConjugate(unitCircleInversion(z)!), r!.re, r!.im);
                expect(Number.isFinite(r!.re) && Number.isFinite(r!.im)).toBe(true);
            }
        }
    });
});

describe('isOnUnitCircle (exact in grid units)', () => {
    it('decides by integer arithmetic', () => {
        expect(isOnUnitCircle({re: 0.6, im: 0.8})).toBe(true);
        expect(isOnUnitCircle({re: 1, im: 0})).toBe(true);
        expect(isOnUnitCircle({re: -0.8, im: 0.6})).toBe(true);
        expect(isOnUnitCircle({re: 0.6, im: 0.85})).toBe(false);
        expect(isOnUnitCircle({re: 0.7, im: 0.7})).toBe(false);
        expect(isOnUnitCircle({re: 1, im: 1e-3})).toBe(false);
        expect(isOnUnitCircle({re: NaN, im: 0})).toBe(false);
    });
    it('on the circle 1/z is the conjugate', () => {
        let count = 0;
        for (let a = -20; a <= 20; a++) {
            for (let b = -20; b <= 20; b++) {
                const z = {re: a / 20, im: b / 20};
                if (!isOnUnitCircle(z)) continue;
                count++;
                close(complexReciprocal(z), z.re, -z.im);
            }
        }
        expect(count).toBeGreaterThanOrEqual(12);
    });
});
