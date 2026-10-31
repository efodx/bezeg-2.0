import {describe, expect, it} from 'vitest';
import {
    crossesAtZero, dividePolynomials, mergeZeros, polyCoefficients, polyDegree, polyDerivativeText, polyDerivativeValue,
    polyText, polyValue, polyYIntercept, signAround,
} from './polynomial';
import type {PolySpec} from './schoolFunctions';

const S3: PolySpec = {k: 1, zeros: [{z: -2, m: 1}, {z: 1, m: 2}]};
const X = {text: 'x', atomic: true};

describe('product-form polynomial (S3)', () => {
    it('matches the spec values of (x+2)(x-1)^2', () => {
        expect(polyValue(S3, 0)).toBe(2);
        expect(polyValue(S3, 1)).toBe(0);
        expect(polyDerivativeValue(S3, 1, 1)).toBe(0);
        expect(polyDerivativeValue(S3, 1, 2)).toBe(6);
        expect(polyDegree(S3)).toBe(3);
    });

    it('derivative by the product rule agrees with the expanded coefficients', () => {
        const spec: PolySpec = {k: -1.5, zeros: [{z: -1, m: 3}, {z: 0.5, m: 1}, {z: 2, m: 1}]};
        const coef = polyCoefficients(spec);
        const d1 = coef.slice(1).map((c, i) => c * (i + 1));
        const d2 = d1.slice(1).map((c, i) => c * (i + 1));
        for (const x of [-2.3, -0.4, 0.5, 1.7, 3]) {
            expect(polyValue(spec, x)).toBeCloseTo(coef.reduceRight((s, c) => s * x + c, 0), 9);
            expect(polyDerivativeValue(spec, x, 1)).toBeCloseTo(d1.reduceRight((s, c) => s * x + c, 0), 9);
            expect(polyDerivativeValue(spec, x, 2)).toBeCloseTo(d2.reduceRight((s, c) => s * x + c, 0), 9);
        }
    });

    it('changes sign at odd multiplicity only', () => {
        const spec: PolySpec = {k: 1, zeros: [{z: -3, m: 1}, {z: 0, m: 2}, {z: 2, m: 3}]};
        for (const e of spec.zeros) {
            const {left, right} = signAround(spec, e.z);
            expect(left !== right).toBe(crossesAtZero(e.m));
            expect(left * right !== 0).toBe(true);
        }
    });

    it('has a vanishing derivative at every zero of multiplicity at least 2', () => {
        const spec: PolySpec = {k: 2, zeros: [{z: -3, m: 1}, {z: 0, m: 2}, {z: 2, m: 3}]};
        for (const e of spec.zeros) {
            const dp = polyDerivativeValue(spec, e.z, 1);
            if (e.m >= 2) expect(dp).toBe(0); else expect(dp).not.toBe(0);
        }
        expect(polyDerivativeValue(spec, 2, 2)).toBe(0);
    });

    it('has the y-intercept k prod (-z)^m', () => {
        const spec: PolySpec = {k: -2, zeros: [{z: 3, m: 1}, {z: -1, m: 2}, {z: 2, m: 2}]};
        expect(polyYIntercept(spec)).toBe(-2 * (-3) * 1 * 4);
        expect(polyYIntercept(spec)).toBe(polyValue(spec, 0));
    });

    it('merges equal zeros by adding multiplicities and reports the merge', () => {
        const r = mergeZeros({k: 1, zeros: [{z: 1, m: 1}, {z: -2, m: 1}, {z: 1, m: 2}]});
        expect(r.merged).toBe(true);
        expect(r.spec.zeros).toEqual([{z: -2, m: 1}, {z: 1, m: 3}]);
        expect(mergeZeros(S3).merged).toBe(false);
    });

    it('refuses to merge zeros into a multiplicity above 3', () => {
        expect(() => mergeZeros({k: 1, zeros: [{z: 1, m: 2}, {z: 1, m: 2}]})).toThrow(RangeError);
    });

    it('divides exactly', () => {
        const {quotient, remainder} = dividePolynomials([-1, 0, 1], [-2, 1]);
        expect(quotient).toEqual([2, 1]);
        expect(remainder).toEqual([3]);
    });

    it('writes product-form text', () => {
        expect(polyText(S3, X, false)).toBe('(x + 2)(x - 1)^{2}');
        expect(polyText(S3, X, true)).toBe('(x + 2)(x - 1)²');
        expect(polyText({k: -1, zeros: [{z: 0, m: 2}]}, X, false)).toBe('-x^{2}');
        expect(polyDerivativeText({k: 2, zeros: [{z: 0, m: 2}]}, X, false)).toBe('4\\,x');
        expect(polyDerivativeText(S3, X, false)).toBe('(x - 1)^{2} + 2\\,(x + 2)(x - 1)');
    });
});
