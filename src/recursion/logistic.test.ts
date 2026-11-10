import {describe, expect, it} from 'vitest';
import {iterate} from './iteration';
import {classifyLogistic, isLogisticStart, logisticMap} from './logistic';

const derivative = (f: (x: number) => number, x: number) => {
    const h = 1e-6;
    return (f(x + h) - f(x - h)) / (2 * h);
};

describe('classifyLogistic', () => {
    it('matches the numeric derivative at the fixed point for every R in 5..29', () => {
        for (let R = 5; R <= 29; R++) {
            const result = classifyLogistic(R);
            const f = logisticMap(R);
            const xStar = result.fixedPoint.num / result.fixedPoint.den;
            expect(f(xStar), `R=${R}`).toBeCloseTo(xStar, 12);
            const slope = derivative(f, xStar);
            expect(slope, `R=${R}`).toBeCloseTo(result.slope, 6);
            if (R >= 11) {
                expect(result.kind).toBe('attracting');
                expect(Math.abs(slope)).toBeLessThan(1);
                expect(xStar).toBeCloseTo(1 - 10 / R, 12);
                expect(result.slope).toBeCloseTo(2 - R / 10, 12);
            } else {
                expect(result.fixedPoint).toEqual({num: 0, den: 1});
                expect(result.kind).toBe(R === 10 ? 'extinction-slope-one' : 'extinction');
            }
        }
    });

    it('treats R = 10 as slope 1, not decided by the slope', () => {
        expect(classifyLogistic(10).slope).toBe(1);
        expect(classifyLogistic(9).kind).toBe('extinction');
        expect(classifyLogistic(11).kind).toBe('attracting');
    });

    it('rejects R >= 30 and other non-grid values', () => {
        expect(() => classifyLogistic(30)).toThrow(RangeError);
        expect(() => classifyLogistic(35)).toThrow(RangeError);
        expect(() => logisticMap(30)).toThrow(RangeError);
        expect(() => classifyLogistic(4)).toThrow(RangeError);
        expect(() => classifyLogistic(0)).toThrow(RangeError);
        expect(() => logisticMap(4)).toThrow(RangeError);
        expect(() => classifyLogistic(5)).not.toThrow();
        expect(classifyLogistic(20).fixedPoint).toEqual({num: 1, den: 2});
        expect(classifyLogistic(15).fixedPoint).toEqual({num: 1, den: 3});
        expect(classifyLogistic(25).fixedPoint).toEqual({num: 3, den: 5});
        expect(() => classifyLogistic(12.5)).toThrow(RangeError);
        expect(() => classifyLogistic(29)).not.toThrow();
    });

    it('restricts starts to the open interval (0, 1)', () => {
        for (const x of [0, 1, -0.1, 1.2, NaN]) expect(isLogisticStart(x)).toBe(false);
        for (const x of [0.001, 0.1, 0.5, 0.999]) expect(isLogisticStart(x)).toBe(true);
    });

    it('reproduces the RG4 iterates from x0 = 0.1', () => {
        const check = (R: number, expected: number[], places: number) => {
            const points = iterate(logisticMap(R), 0.1, expected.length - 1).points;
            expected.forEach((v, i) => expect(points[i]).toBeCloseTo(v, places));
        };
        check(15, [0.1, 0.135, 0.17516, 0.21672, 0.25463], 5);
        check(25, [0.1, 0.225, 0.43594, 0.61474, 0.59209], 5);
        check(29, [0.1, 0.261, 0.55935, 0.71479, 0.59122], 5);
        expect(classifyLogistic(15).slope).toBeCloseTo(0.5, 12);
        expect(classifyLogistic(25).slope).toBeCloseTo(-0.5, 12);
        expect(classifyLogistic(29).slope).toBeCloseTo(-0.9, 12);
        // after 200 steps the R = 29 orbit sits at 0.6551724137
        let x = 0.1;
        const f = logisticMap(29);
        for (let k = 0; k < 200; k++) x = f(x);
        expect(x).toBeCloseTo(0.6551724137, 9);
    });

    it('converges to 0 for R <= 10 over a long direct loop (illustration only)', () => {
        for (const R of [5, 9, 10]) {
            const f = logisticMap(R);
            let x = 0.5;
            for (let k = 0; k < 5000; k++) x = f(x);
            expect(x, `R=${R}`).toBeLessThan(0.01);
        }
    });
});
