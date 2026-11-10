import {describe, expect, it} from 'vitest';
import {iterate} from './iteration';
import {affineFixedPoint, affineMap, classifyAffine, rational} from './affine';

/** An independent rule: compares M^2 with 400 and uses the sign; no call into the module under test. */
function oracleKind(M: number, C: number): string {
    const sq = M * M;
    if (sq < 400) return 'attracting';
    if (sq > 400) return 'repelling';
    if (M < 0) return 'two-cycle';
    return C === 0 ? 'all-fixed' : 'none';
}

const oracleShape = (M: number) => (M === 0 ? 'degenerate' : M > 0 ? 'staircase' : 'spiral');

describe('classifyAffine', () => {
    it('agrees with an independent rule over the whole grid M in [-60,60], C in [-100,100]', () => {
        let count = 0;
        for (let M = -60; M <= 60; M++) {
            for (let C = -100; C <= 100; C++) {
                const result = classifyAffine(M, C);
                expect(result.kind, `M=${M} C=${C}`).toBe(oracleKind(M, C));
                expect(result.shape, `M=${M}`).toBe(oracleShape(M));
                if (M === 20) {
                    expect(result.fixedPoint).toBeNull();
                } else {
                    // x* (20 - M) = 2C, by cross-multiplication in BigInt, and the fraction is reduced
                    const {num, den} = result.fixedPoint!;
                    expect(num * BigInt(20 - M)).toBe(BigInt(2 * C) * den);
                    expect(den > 0n).toBe(true);
                }
                count++;
            }
        }
        expect(count).toBe(121 * 201);
    });

    it('decides the boundary |M| = 20 exactly', () => {
        expect(classifyAffine(19, 5).kind).toBe('attracting');
        expect(classifyAffine(-19, 5).kind).toBe('attracting');
        expect(classifyAffine(20, 0).kind).toBe('all-fixed');
        expect(classifyAffine(20, 3).kind).toBe('none');
        expect(classifyAffine(-20, 3).kind).toBe('two-cycle');
        expect(classifyAffine(21, 3).kind).toBe('repelling');
        expect(classifyAffine(-21, 3).kind).toBe('repelling');
    });

    it('keeps M = 0 degenerate, neither staircase nor spiral, and lands on x* in one step', () => {
        for (const C of [-100, -7, 0, 9, 100]) {
            const result = classifyAffine(0, C);
            expect(result.kind).toBe('attracting');
            expect(result.shape).toBe('degenerate');
            expect(result.fixedPoint).toEqual(rational(BigInt(2 * C), 20n));
            expect(affineMap(0, C)(123.5)).toBe(C / 10);
        }
        expect(classifyAffine(1, 0).shape).toBe('staircase');
        expect(classifyAffine(-1, 0).shape).toBe('spiral');
    });

    it('gives the RG2 default examples', () => {
        expect(classifyAffine(10, 10)).toEqual({kind: 'attracting', shape: 'staircase', fixedPoint: {num: 2n, den: 1n}});
        expect(classifyAffine(-16, 90)).toEqual({kind: 'attracting', shape: 'spiral', fixedPoint: {num: 5n, den: 1n}});
        // RG2: m = -1,2, c = 10, x0 = 4,6 (c = 11, C = 110, is outside the C grid and rejected).
        expect(classifyAffine(-24, 100)).toEqual({kind: 'repelling', shape: 'spiral', fixedPoint: {num: 50n, den: 11n}});
        expect(() => classifyAffine(-24, 110)).toThrow(RangeError);
        const out = iterate(affineMap(-24, 100), 4.6, 3).points;
        [4.6, 4.48, 4.624, 4.4512].forEach((v, i) => expect(out[i]).toBeCloseTo(v, 12));
        expect(classifyAffine(30, -10)).toEqual({kind: 'repelling', shape: 'staircase', fixedPoint: {num: 2n, den: 1n}});
        expect(classifyAffine(-20, 60)).toEqual({kind: 'two-cycle', shape: 'spiral', fixedPoint: {num: 3n, den: 1n}});
    });

    it('reduces the exact rational fixed point', () => {
        expect(affineFixedPoint(-3, 7)).toEqual({num: 14n, den: 23n});
        expect(affineFixedPoint(4, -6)).toEqual({num: -3n, den: 4n});
        expect(affineFixedPoint(0, 0)).toEqual({num: 0n, den: 1n});
    });

    it('rejects non-integer and out-of-range parameters', () => {
        expect(() => classifyAffine(0.5, 0)).toThrow(RangeError);
        expect(() => classifyAffine(61, 0)).toThrow(RangeError);
        expect(() => classifyAffine(0, -101)).toThrow(RangeError);
        expect(() => classifyAffine(NaN, 0)).toThrow(RangeError);
        expect(() => affineMap(0, 101)).toThrow(RangeError);
    });
});
