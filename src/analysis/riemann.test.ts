import {catalogFunction} from './functions';
import {
    BOUND_MAX, BOUND_MIN, exactIntegral, fillData, isBound, isSubintervalCount, N_MAX, N_MIN, riemannSum, SUM_METHODS, subintervalArea,
    subintervalPolygons, subintervals, subintervalWidth,
} from './riemann';
import {DEFAULT_RIEMANN_MODEL, parseRiemannModel} from './riemannModel';

const square = catalogFunction('square');
const sine = catalogFunction('sin');
const exponential = catalogFunction('exp');

describe('the lesson plan numbers for x^2 on [0, 2]', () => {
    test('n = 4: left 1.75, right 3.75, midpoint 2.625, trapezoid 2.75, exact 8/3', () => {
        expect(subintervalWidth(0, 2, 4)).toBe(0.5);
        expect(riemannSum(square, 0, 2, 4, 'left')).toBe(1.75);
        expect(riemannSum(square, 0, 2, 4, 'right')).toBe(3.75);
        expect(riemannSum(square, 0, 2, 4, 'midpoint')).toBe(2.625);
        expect(riemannSum(square, 0, 2, 4, 'trapezoid')).toBe(2.75);
        expect(exactIntegral(square, 0, 2)).toBeCloseTo(8 / 3, 14);
    });

    test('the trapezoid sum is the mean of the left and right sums; left <= exact <= right for an increasing function', () => {
        expect(riemannSum(square, 0, 2, 4, 'trapezoid')).toBe((1.75 + 3.75) / 2);
        const exact = exactIntegral(square, 0, 2);
        expect(1.75).toBeLessThan(exact);
        expect(3.75).toBeGreaterThan(exact);
        // midpoint and trapezoid are closer to the exact value than left and right with the same n
        const error = (method: typeof SUM_METHODS[number]) => Math.abs(riemannSum(square, 0, 2, 4, method) - exact);
        expect(error('midpoint')).toBeLessThan(error('left'));
        expect(error('midpoint')).toBeLessThan(error('right'));
        expect(error('trapezoid')).toBeLessThan(error('left'));
        expect(error('trapezoid')).toBeLessThan(error('right'));
    });

    test('n = 100: every method is within 0.05 of 8/3 (left 2.6268, right 2.7068, midpoint 2.6666, trapezoid 2.6668)', () => {
        const exact = 8 / 3;
        for (const method of SUM_METHODS) expect(Math.abs(riemannSum(square, 0, 2, 100, method) - exact)).toBeLessThan(0.05);
        expect(riemannSum(square, 0, 2, 100, 'left')).toBeCloseTo(2.6268, 10);
        expect(riemannSum(square, 0, 2, 100, 'right')).toBeCloseTo(2.7068, 10);
        expect(riemannSum(square, 0, 2, 100, 'midpoint')).toBeCloseTo(2.6666, 10);
        expect(riemannSum(square, 0, 2, 100, 'trapezoid')).toBeCloseTo(2.6668, 10);
        // the two extreme sums of the largest allowed n are closer still
        for (const method of SUM_METHODS) expect(Math.abs(riemannSum(square, 0, 2, N_MAX, method) - exact)).toBeLessThan(0.03);
    });
});

describe('sin', () => {
    test('on [0, pi] the exact integral is 2; n = 2 gives midpoint 2.2214 and left 1.5708', () => {
        expect(exactIntegral(sine, 0, Math.PI)).toBeCloseTo(2, 14);
        expect(riemannSum(sine, 0, Math.PI, 2, 'midpoint')).toBeCloseTo(Math.SQRT2 * Math.PI / 2, 14);
        expect(riemannSum(sine, 0, Math.PI, 2, 'midpoint')).toBeCloseTo(2.2214, 4);
        expect(riemannSum(sine, 0, Math.PI, 2, 'left')).toBeCloseTo(Math.PI / 2, 14);
        expect(riemannSum(sine, 0, Math.PI, 2, 'left')).toBeCloseTo(1.5708, 4);
    });

    test('on [0, 2*pi] the exact integral is 0, the part above counts +2 and the part below -2, and every sum with n >= 2 cancels', () => {
        expect(exactIntegral(sine, 0, 2 * Math.PI)).toBe(0);
        expect(exactIntegral(sine, 0, Math.PI)).toBeCloseTo(2, 14);
        expect(exactIntegral(sine, Math.PI, 2 * Math.PI)).toBeCloseTo(-2, 14);
        for (const method of SUM_METHODS) {
            for (const n of [2, 3, 12, 100]) expect(riemannSum(sine, 0, 2 * Math.PI, n, method)).toBeCloseTo(0, 12);
        }
    });
});

describe('exp', () => {
    test('the exact integral on [0, 1] is e - 1 and the sums approach it', () => {
        expect(exactIntegral(exponential, 0, 1)).toBeCloseTo(Math.E - 1, 14);
        for (const method of SUM_METHODS) expect(riemannSum(exponential, 0, 1, 150, method)).toBeCloseTo(Math.E - 1, 1);
    });
});

describe('orientation and edge cases', () => {
    test('a = b gives zero width, zero sums and a zero integral for every function and method', () => {
        for (const fn of [square, sine, exponential]) {
            expect(exactIntegral(fn, 1.3, 1.3)).toBe(0);
            for (const method of SUM_METHODS) {
                expect(subintervalWidth(1.3, 1.3, 7)).toBe(0);
                expect(riemannSum(fn, 1.3, 1.3, 7, method)).toBe(0);
                expect(Object.is(riemannSum(fn, 1.3, 1.3, 7, method), -0)).toBe(false);
            }
        }
    });

    test('swapping a and b flips the sign: the width, the exact integral and each sum (left and right trade places)', () => {
        expect(subintervalWidth(2, 0, 4)).toBe(-0.5);
        expect(exactIntegral(square, 2, 0)).toBeCloseTo(-8 / 3, 14);
        expect(riemannSum(square, 2, 0, 4, 'midpoint')).toBe(-2.625);
        expect(riemannSum(square, 2, 0, 4, 'trapezoid')).toBe(-2.75);
        // from 2 down to 0 the "left" end of each step is the larger x, so it reproduces the old right sum
        expect(riemannSum(square, 2, 0, 4, 'left')).toBe(-3.75);
        expect(riemannSum(square, 2, 0, 4, 'right')).toBe(-1.75);
        for (const fn of [square, sine, exponential]) {
            for (const method of SUM_METHODS) {
                const swapped = method === 'left' ? 'right' : method === 'right' ? 'left' : method;
                expect(riemannSum(fn, 3, -1, 9, method)).toBeCloseTo(-riemannSum(fn, -1, 3, 9, swapped), 12);
            }
            expect(exactIntegral(fn, 3, -1)).toBeCloseTo(-exactIntegral(fn, -1, 3), 12);
        }
    });

    test('n = 1 uses the single interval: left f(a)*(b-a), right f(b)*(b-a), midpoint f((a+b)/2)*(b-a), trapezoid the mean', () => {
        expect(riemannSum(square, 0, 2, 1, 'left')).toBe(0);
        expect(riemannSum(square, 0, 2, 1, 'right')).toBe(8);
        expect(riemannSum(square, 0, 2, 1, 'midpoint')).toBe(2);
        expect(riemannSum(square, 0, 2, 1, 'trapezoid')).toBe(4);
    });

    test('the number of subintervals must be an integer in [1, 150]', () => {
        for (const bad of [0, -1, 151, 2.5, NaN, Infinity]) {
            expect(isSubintervalCount(bad)).toBe(false);
            expect(() => riemannSum(square, 0, 2, bad, 'left')).toThrow(RangeError);
            expect(() => subintervalWidth(0, 2, bad)).toThrow(RangeError);
        }
        expect([N_MIN, N_MAX].every(isSubintervalCount)).toBe(true);
    });

    test('the bounds domain contains 2*pi and rejects non-finite values', () => {
        expect([BOUND_MIN, BOUND_MAX, 2 * Math.PI, -2 * Math.PI, 0].every(isBound)).toBe(true);
        for (const bad of [BOUND_MAX + 0.01, BOUND_MIN - 0.01, NaN, Infinity, '1', null]) expect(isBound(bad)).toBe(false);
    });
});

describe('shapes', () => {
    test('subintervals cover [a, b] without gaps and end exactly at b', () => {
        for (const [a, b] of [[0, 2], [2, 0], [-1.3, 3.7]]) {
            const parts = subintervals(square, a, b, 7, 'left');
            expect(parts).toHaveLength(7);
            expect(parts[0].x0).toBe(a);
            expect(parts[6].x1).toBe(b);
            for (let i = 1; i < parts.length; i++) expect(parts[i].x0).toBe(parts[i - 1].x1);
        }
    });

    test('the heights follow the method; the signed areas add up to the sum', () => {
        const left = subintervals(square, 0, 2, 4, 'left');
        expect(left.map(s => [s.y0, s.y1])).toEqual([[0, 0], [0.25, 0.25], [1, 1], [2.25, 2.25]]);
        expect(subintervals(square, 0, 2, 4, 'right').map(s => s.y0)).toEqual([0.25, 1, 2.25, 4]);
        expect(subintervals(square, 0, 2, 4, 'midpoint').map(s => s.y0)).toEqual([0.0625, 0.5625, 1.5625, 3.0625]);
        const trapezoids = subintervals(square, 0, 2, 4, 'trapezoid');
        expect(trapezoids.map(s => [s.y0, s.y1])).toEqual([[0, 0.25], [0.25, 1], [1, 2.25], [2.25, 4]]);
        for (const method of SUM_METHODS) {
            const total = subintervals(sine, -1, 5, 11, method).reduce((sum, s) => sum + subintervalArea(s), 0);
            expect(total).toBeCloseTo(riemannSum(sine, -1, 5, 11, method), 12);
        }
    });

    test('a rectangle is one polygon, a trapezoid crossing the axis splits at the zero into a positive and a negative triangle', () => {
        expect(subintervalPolygons({x0: 0, x1: 1, y0: 2, y1: 2})).toEqual([{points: [[0, 0], [0, 2], [1, 2], [1, 0]], negative: false}]);
        expect(subintervalPolygons({x0: 0, x1: 1, y0: -2, y1: -2})).toEqual([{points: [[0, 0], [0, -2], [1, -2], [1, 0]], negative: true}]);
        const split = subintervalPolygons({x0: 0, x1: 1, y0: 1, y1: -3});
        expect(split).toEqual([
            {points: [[0, 0], [0, 1], [0.25, 0]], negative: false},
            {points: [[0.25, 0], [1, -3], [1, 0]], negative: true},
        ]);
        // zero width (a = b) and zero height draw nothing
        expect(subintervalPolygons({x0: 1, x1: 1, y0: 5, y1: 5})).toEqual([]);
        expect(subintervalPolygons({x0: 0, x1: 1, y0: 0, y1: 0})).toEqual([]);
    });

    test('fillData has one NaN-separated, closed polygon per rectangle, split by sign', () => {
        const data = fillData(sine, 0, 2 * Math.PI, 4, 'midpoint');
        // midpoints of 4 intervals of width pi/2: sin(pi/4) > 0, sin(3pi/4) > 0, sin(5pi/4) < 0, sin(7pi/4) < 0
        const split = (list: number[]) => list.reduce<number[][]>((groups, value) => {
            if (Number.isNaN(value)) groups.push([]);
            else groups[groups.length - 1].push(value);
            return groups;
        }, [[]]);
        expect(split(data.positive.x)).toHaveLength(2);
        expect(split(data.negative.x)).toHaveLength(2);
        expect(data.positive.x.length).toBe(data.positive.y.length);
        for (const group of split(data.positive.y)) expect(group).toHaveLength(5);
        for (const group of split(data.negative.y)) expect(Math.min(...group)).toBeLessThan(0);
        for (const value of data.positive.y.filter(Number.isFinite)) expect(value).toBeGreaterThanOrEqual(0);
        for (const value of data.negative.y.filter(Number.isFinite)) expect(value).toBeLessThanOrEqual(0);
        // a = b draws nothing
        expect(fillData(square, 1, 1, 10, 'left')).toEqual({positive: {x: [], y: []}, negative: {x: [], y: []}});
    });

    test('at the largest n the data stays small and finite apart from the separators', () => {
        const data = fillData(sine, -7, 7, N_MAX, 'trapezoid');
        const points = data.positive.x.length + data.negative.x.length;
        expect(points).toBeLessThan(N_MAX * 2 * 6);
        expect(data.positive.y.filter(value => !Number.isNaN(value)).every(Number.isFinite)).toBe(true);
    });
});

describe('model', () => {
    test('the default model is x^2 on [0, 2] with n = 4 and the left rule', () => {
        expect(DEFAULT_RIEMANN_MODEL).toEqual({fn: 'square', a: 0, b: 2, n: 4, method: 'left'});
        expect(parseRiemannModel(DEFAULT_RIEMANN_MODEL)).toEqual(DEFAULT_RIEMANN_MODEL);
    });

    test('parsing drops unknown properties and rejects every out-of-domain value', () => {
        expect(parseRiemannModel({fn: 'sin', a: -7, b: 7, n: 150, method: 'trapezoid', extra: 1})).toEqual({fn: 'sin', a: -7, b: 7, n: 150, method: 'trapezoid'});
        expect(parseRiemannModel({fn: 'exp', a: 2, b: 0, n: 1, method: 'midpoint'})).toEqual({fn: 'exp', a: 2, b: 0, n: 1, method: 'midpoint'});
        const good = {fn: 'square', a: 0, b: 2, n: 4, method: 'left'};
        const bad = [undefined, null, 'x', [], {}, {...good, fn: 'cos'}, {...good, a: 7.01}, {...good, b: -7.01}, {...good, a: NaN}, {...good, b: '2'},
            {...good, n: 0}, {...good, n: 151}, {...good, n: 2.5}, {...good, method: 'upper'}, {...good, method: undefined}, {fn: 'square', a: 0, b: 2, n: 4}];
        for (const entry of bad) expect(parseRiemannModel(entry)).toBeUndefined();
    });
});
