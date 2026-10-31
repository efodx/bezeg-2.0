import {describe, expect, it} from 'vitest';
import {
    firstTermWithinTolerance,
    GEOMETRIC_SERIES_MAX_TERMS,
    geometricPartialSum,
    geometricPartialSums,
    geometricSeriesConverges,
    geometricSeriesLimit,
    geometricTerm,
} from './geometricSeries';

describe('geometric series', () => {
    it('partial sums match the closed form and direct summation to 1e-12 relative', () => {
        for (const [a, q] of [[1, 0.5], [2, -0.7], [0.3, 0.1], [-4, 1.05], [1, 1.3]]) {
            const sums = geometricPartialSums(a, q, 30);
            let direct = 0;
            for (let n = 1; n <= 30; n++) {
                direct += geometricTerm(a, q, n);
                const tolerance = 1e-12 * Math.max(1, Math.abs(direct));
                expect(Math.abs(geometricPartialSum(a, q, n) - direct)).toBeLessThanOrEqual(tolerance);
                expect(Math.abs(sums[n - 1] - direct)).toBeLessThanOrEqual(tolerance);
            }
        }
    });
    it('q = 1 gives n*a without division', () => {
        expect(geometricPartialSum(3, 1, 7)).toBe(21);
        expect(Number.isFinite(geometricPartialSum(0.5, 1, 100))).toBe(true);
        expect(geometricSeriesLimit(3, 1)).toBeNull();
    });
    it('limit exists only for |q| < 1 and a != 0', () => {
        expect(geometricSeriesConverges(1, 0.99)).toBe(true);
        for (const q of [1, -1, 1.5, -2]) expect(geometricSeriesLimit(1, q)).toBeNull();
        expect(geometricSeriesLimit(0, 0.5)).toBeNull();
    });
    it('q = -1 oscillates between a and 0', () => {
        expect([1, 2, 3, 4].map(n => geometricPartialSum(2, -1, n))).toEqual([2, 0, 2, 0]);
    });
    it('spec values for a=1, q=1/2', () => {
        expect(geometricPartialSums(1, 0.5, 5)).toEqual([1, 1.5, 1.75, 1.875, 1.9375]);
        expect(geometricSeriesLimit(1, 0.5)).toBe(2);
        expect(2 - geometricPartialSum(1, 0.5, 7)).toBeGreaterThanOrEqual(0.01);
        expect(2 - geometricPartialSum(1, 0.5, 8)).toBeCloseTo(0.0078125, 12);
        expect(firstTermWithinTolerance(1, 0.5, 0.01)).toBe(8);
    });
    it('spec values for q = -1/2', () => {
        expect(geometricPartialSum(1, -0.5, 4)).toBeCloseTo(0.625, 12);
        expect(geometricSeriesLimit(1, -0.5)).toBeCloseTo(2 / 3, 12);
    });
    it('repeating decimals', () => {
        expect(geometricSeriesLimit(0.3, 0.1)).toBeCloseTo(1 / 3, 12);
        expect(geometricSeriesLimit(0.9, 0.1)).toBeCloseTo(1, 12);
    });
    it('term cap is a named constant and clamps', () => {
        expect(GEOMETRIC_SERIES_MAX_TERMS).toBeGreaterThan(8);
        expect(geometricPartialSums(1, 0.5, 10000)).toHaveLength(GEOMETRIC_SERIES_MAX_TERMS);
    });
});
