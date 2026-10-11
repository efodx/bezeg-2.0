import {
    adaptiveSimpson, arcLength, arcLengthIntegrand, BOUND_MAX, BOUND_MIN, isBound, isSegmentCount, lengthDifference, N_MAX, N_MIN, polylineLength, polylineVertices,
} from './arcLength';
import {DEFAULT_ARC_LENGTH_MODEL, parseArcLengthModel} from './arcLengthModel';

const EXACT = 3.8201977890; // the arc length of sin on [0, pi]

describe('polyline length on [0, pi]', () => {
    test.each([
        [1, Math.PI], [2, 3.724192], [3, 3.765007], [4, 3.790091], [10, 3.815283], [100, 3.820149],
    ])('n = %i gives %f', (n, expected) => {
        expect(polylineLength(0, Math.PI, n)).toBeCloseTo(expected, 5);
    });

    test('the lesson numbers: n = 1 is the chord on the x-axis, n = 2 is 2 sqrt((pi/2)^2 + 1)', () => {
        expect(polylineLength(0, Math.PI, 1)).toBeCloseTo(Math.PI, 12);
        expect(polylineLength(0, Math.PI, 2)).toBeCloseTo(2 * Math.sqrt((Math.PI / 2) ** 2 + 1), 12);
        expect(polylineLength(0, Math.PI, 2).toFixed(4)).toBe('3.7242');
        expect(polylineLength(0, Math.PI, 10).toFixed(4)).toBe('3.8153');
        expect(polylineLength(0, Math.PI, 100).toFixed(4)).toBe('3.8201');
    });

    test('the vertices are equally spaced in x, start at a and end exactly at b', () => {
        const vertices = polylineVertices(0, Math.PI, 4);
        expect(vertices).toHaveLength(5);
        expect(vertices.map(([x]) => x)).toEqual([0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI]);
        expect(vertices[2][1]).toBe(1);
        expect(polylineVertices(0.1, 2.3, 7)[7][0]).toBe(2.3);
    });

    test('a polyline never exceeds the arc length and refinement increases it towards the limit', () => {
        for (let n = 1; n <= N_MAX; n++) expect(polylineLength(0, Math.PI, n)).toBeLessThanOrEqual(arcLength(0, Math.PI) + 1e-12);
        const doubled = [1, 2, 4, 8].map(n => polylineLength(0, Math.PI, n));
        for (let i = 1; i < doubled.length; i++) expect(doubled[i]).toBeGreaterThan(doubled[i - 1]);
        expect(polylineLength(0, Math.PI, 100)).toBeLessThan(EXACT);
        // other intervals obey the triangle inequality too
        for (const [a, b] of [[-3, 5], [1, 1.5], [-7, 7], [2, -2.5]]) {
            for (const n of [1, 3, 17, 100]) expect(polylineLength(a, b, n)).toBeLessThanOrEqual(arcLength(a, b) + 1e-12);
        }
    });
});

describe('arc length', () => {
    test('the integral of sqrt(1 + cos^2 x) over [0, pi] is 3.8201977890 (3.8202)', () => {
        expect(arcLength(0, Math.PI)).toBeCloseTo(EXACT, 9);
        expect(arcLength(0, Math.PI).toFixed(4)).toBe('3.8202');
        expect(arcLengthIntegrand(0)).toBeCloseTo(Math.SQRT2, 14);
        expect(arcLengthIntegrand(Math.PI / 2)).toBe(1);
    });

    test('is non-negative, symmetric in the endpoints and zero for a = b', () => {
        expect(arcLength(Math.PI, 0)).toBe(arcLength(0, Math.PI));
        expect(arcLength(2, 2)).toBe(0);
        expect(arcLength(-1, 1)).toBeCloseTo(2 * arcLength(0, 1), 10);
        expect(polylineLength(2, 2, 5)).toBe(0);
        expect(polylineLength(Math.PI, 0, 3)).toBeCloseTo(polylineLength(0, Math.PI, 3), 12);
        expect(polylineLength(2, 2, 1)).toBe(0);
        expect(lengthDifference(0, Math.PI, 2)).toBeCloseTo(EXACT - 3.724192, 5);
        expect(lengthDifference(1, 1, 7)).toBe(0);
    });

    test('is additive over adjacent intervals and agrees with a very fine polyline', () => {
        expect(arcLength(0, 1) + arcLength(1, 4)).toBeCloseTo(arcLength(0, 4), 8);
        expect(arcLength(-7, 7)).toBeCloseTo(arcLength(-7, 0) * 2, 8);
        expect(polylineLength(0, Math.PI, 100)).toBeCloseTo(arcLength(0, Math.PI), 4);
    });

    test('adaptive Simpson integrates known functions to the tolerance', () => {
        expect(adaptiveSimpson(x => x * x, 0, 3)).toBeCloseTo(9, 9);
        expect(adaptiveSimpson(Math.sin, 0, Math.PI)).toBeCloseTo(2, 9);
        expect(adaptiveSimpson(Math.sin, 1, 1)).toBe(0);
    });
});

describe('domain and model', () => {
    test('bounds and segment counts', () => {
        expect([BOUND_MIN, BOUND_MAX, N_MIN, N_MAX]).toEqual([-7, 7, 1, 100]);
        for (const value of [-7, 0, Math.PI, 7]) expect(isBound(value)).toBe(true);
        for (const value of [-7.01, 7.01, NaN, Infinity, '1', undefined]) expect(isBound(value)).toBe(false);
        for (const value of [1, 2, 100]) expect(isSegmentCount(value)).toBe(true);
        for (const value of [0, 101, 2.5, NaN, '2', -1]) expect(isSegmentCount(value)).toBe(false);
        expect(() => polylineLength(0, 1, 0)).toThrow(RangeError);
        expect(() => polylineLength(0, 1, 101)).toThrow(RangeError);
        expect(() => polylineLength(0, 1, 2.5)).toThrow(RangeError);
    });

    test('the default model is [0, pi] with n = 2 and the parser sanitizes', () => {
        expect(DEFAULT_ARC_LENGTH_MODEL).toEqual({a: 0, b: Math.PI, n: 2});
        expect(parseArcLengthModel({a: -1, b: 2, n: 50, extra: 1})).toEqual({a: -1, b: 2, n: 50});
        expect(parseArcLengthModel({a: 3, b: 1, n: 1})).toEqual({a: 3, b: 1, n: 1});
        const good = {a: 0, b: 1, n: 2};
        for (const bad of [undefined, null, 'x', [], {}, {...good, a: 8}, {...good, b: -8}, {...good, n: 0}, {...good, n: 101}, {...good, n: 1.5}, {a: 0, b: 1}, {...good, a: '0'}]) {
            expect(parseArcLengthModel(bad)).toBeUndefined();
        }
    });
});
