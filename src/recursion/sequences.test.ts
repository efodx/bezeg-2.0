import {describe, expect, it} from 'vitest';
import {affineMap} from './affine';
import {iterate} from './iteration';
import {arithmetic, geometric, geometricLimit, partialSum} from './sequences';

describe('sequences', () => {
    it('reproduces the RG1 numbers exactly', () => {
        expect(arithmetic(3n, 2n, 10)).toBe(21n);
        expect(partialSum('arithmetic', 3n, 2n, 10)).toBe(120n);
        expect([1, 2, 3, 4, 5, 6].map(n => geometric(3n, 2n, n))).toEqual([3n, 6n, 12n, 24n, 48n, 96n]);
        expect(geometric(3n, 2n, 10)).toBe(1536n);
        expect(partialSum('geometric', 3n, 2n, 10)).toBe(3069n);
        expect(partialSum('geometric', 3, 0.5, 10)).toBe(5.994140625);
        expect(geometricLimit(3, 0.5)).toBe(6);
    });

    it('recursion and closed form agree exactly for integers, n <= 30 (BigInt)', () => {
        for (const [a1, r] of [[3n, 2n], [-7n, 5n], [4n, -3n], [0n, 9n], [11n, 1n], [2n, 0n]] as const) {
            let a = a1;
            let sum = 0n;
            let g = a1;
            let gSum = 0n;
            for (let n = 1; n <= 30; n++) {
                sum += a;
                gSum += g;
                expect(arithmetic(a1, r, n)).toBe(a);
                expect(partialSum('arithmetic', a1, r, n)).toBe(sum);
                expect(geometric(a1, r, n)).toBe(g);
                expect(partialSum('geometric', a1, r, n)).toBe(gSum);
                a += r;
                g *= r;
            }
        }
    });

    it('is exact where doubles are not (2^100, n = 101)', () => {
        expect(geometric(1n, 2n, 101)).toBe(2n ** 100n);
        expect(partialSum('geometric', 1n, 2n, 101)).toBe(2n ** 101n - 1n);
    });

    it('doubles agree with the recursion within 1e-12 relative', () => {
        const d = 0.7;
        const q = 1.13;
        let a = 2.5;
        let g = 2.5;
        let sa = 0;
        let sg = 0;
        for (let n = 1; n <= 30; n++) {
            sa += a;
            sg += g;
            expect(Math.abs(arithmetic(2.5, d, n) - a)).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(a)));
            expect(Math.abs(geometric(2.5, q, n) - g)).toBeLessThanOrEqual(1e-12 * g);
            expect(Math.abs(partialSum('arithmetic', 2.5, d, n) - sa)).toBeLessThanOrEqual(1e-12 * sa);
            expect(Math.abs(partialSum('geometric', 2.5, q, n) - sg)).toBeLessThanOrEqual(1e-12 * sg);
            a += d;
            g *= q;
        }
    });

    it('agrees with iterate of the affine map a -> a + d (M = 20)', () => {
        const {points} = iterate(affineMap(20, 20), 3, 9);
        points.forEach((v, i) => expect(v).toBeCloseTo(Number(arithmetic(3, 2, i + 1)), 12));
    });

    it('rejects bad n and a non-convergent limit', () => {
        expect(() => arithmetic(1n, 1n, 0)).toThrow(RangeError);
        expect(() => geometric(1n, 2n, 201)).toThrow(RangeError);
        expect(() => partialSum('arithmetic', 1, 1, 1.5)).toThrow(RangeError);
        expect(() => geometricLimit(3, 1)).toThrow(RangeError);
        expect(() => geometricLimit(3, -1.5)).toThrow(RangeError);
    });
});
