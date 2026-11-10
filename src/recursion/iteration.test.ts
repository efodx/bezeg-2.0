import {describe, expect, it} from 'vitest';
import {fixedPointHistory} from '../analysis/fixedPoint';
import {affineMap, affineFixedPoint} from './affine';
import {iterate} from './iteration';

describe('iterate', () => {
    it('matches a direct loop with steps of shape {index, from, to}', () => {
        const f = (x: number) => Math.cos(x);
        const {points, steps} = iterate(f, 0.3, 60);
        let x = 0.3;
        expect(points).toHaveLength(61);
        expect(steps).toHaveLength(60);
        for (let k = 1; k <= 60; k++) {
            const next = f(x);
            expect(steps[k - 1]).toEqual({index: k, from: x, to: next});
            expect(points[k]).toBe(next);
            x = next;
        }
        expect(Object.keys(steps[0]).sort()).toEqual(['from', 'index', 'to']);
    });

    it('matches the closed form x* + m^n (x0 - x*) for affine maps, n <= 60', () => {
        for (const [M, C, x0] of [[10, 10, 0], [-16, 90, 1], [-24, 100, 5.1], [30, -10, 2.1], [-20, 60, 1], [0, 7, -3]] as const) {
            const fp = affineFixedPoint(M, C)!;
            const xStar = Number(fp.num) / Number(fp.den);
            const m = M / 20;
            const {points} = iterate(affineMap(M, C), x0, 60);
            points.forEach((x, n) => {
                const closed = xStar + m ** n * (x0 - xStar);
                expect(Math.abs(x - closed)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(closed)));
            });
        }
    });

    it('reproduces the RG2 affine iterates', () => {
        expect(iterate(affineMap(10, 10), 0, 4).points).toEqual([0, 1, 1.5, 1.75, 1.875]);
        const spiral = iterate(affineMap(-16, 90), 1, 4).points;
        [1, 8.2, 2.44, 7.048, 3.3616].forEach((v, i) => expect(spiral[i]).toBeCloseTo(v, 12));
        expect(iterate(affineMap(-20, 60), 1, 3).points).toEqual([1, 5, 1, 5]);
    });

    it('agrees with fixedPointHistory for cosine (x_8 = 0.722102) and the affine example', () => {
        const history = fixedPointHistory('cosine', 0, 8, 3);
        const {points, steps} = iterate(Math.cos, 0, 8);
        expect(points[8]).toBeCloseTo(0.722102, 6);
        expect(history.points[8].x).toBe(points[8]);
        expect(steps).toEqual(history.steps);
        const affine = fixedPointHistory('affine', 0, 20, 8, {thresholdStops: false});
        const own = iterate(affineMap(10, 5), 0, 20);
        expect(own.steps).toEqual(affine.steps);
    });

    it('rejects n > 60, non-integer n and non-finite x0', () => {
        expect(() => iterate(Math.cos, 0, 61)).toThrow(RangeError);
        expect(() => iterate(Math.cos, 0, -1)).toThrow(RangeError);
        expect(() => iterate(Math.cos, 0, 1.5)).toThrow(RangeError);
        expect(() => iterate(Math.cos, NaN, 3)).toThrow(RangeError);
        expect(iterate(Math.cos, 0, 0)).toEqual({points: [0], steps: []});
    });
});
