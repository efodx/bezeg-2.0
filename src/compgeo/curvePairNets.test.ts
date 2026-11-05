import {bezierAt, splitCurvePair} from './curvePairNets';

const pts = (n: number) => Array.from({length: n}, (_, i) => ({x: i, y: -i}));

describe('splitCurvePair', () => {
    test('splits 6 points into two quadratics and 8 into two cubics, A first', () => {
        const quad = splitCurvePair(pts(6));
        expect(quad?.degree).toBe(2);
        expect(quad?.a.map(p => p.x)).toEqual([0, 1, 2]);
        expect(quad?.b.map(p => p.x)).toEqual([3, 4, 5]);
        const cubic = splitCurvePair(pts(8));
        expect(cubic?.degree).toBe(3);
        expect(cubic?.b.map(p => p.x)).toEqual([4, 5, 6, 7]);
    });

    test.each([0, 2, 4, 5, 7, 9, 10])('%i points are not a pair', n => {
        expect(splitCurvePair(pts(n))).toBeUndefined();
    });
});

describe('bezierAt', () => {
    test('interpolates the ends and matches the quadratic and cubic Bernstein forms at t = 1/4', () => {
        const q = [{x: 0, y: 0}, {x: 2, y: 4}, {x: 4, y: 0}];
        expect(bezierAt(q, 0)).toEqual({x: 0, y: 0});
        expect(bezierAt(q, 1)).toEqual({x: 4, y: 0});
        expect(bezierAt(q, 0.25)).toEqual({x: 1, y: 1.5});
        const c = [{x: 0, y: 0}, {x: 8, y: 8}, {x: 0, y: 8}, {x: 8, y: 0}];
        // (27 P0 + 27 P1 + 9 P2 + P3) / 64 at t = 1/4
        expect(bezierAt(c, 0.25)).toEqual({x: (27 * 8 + 0 + 8) / 64, y: (27 * 8 + 9 * 8) / 64});
    });

    test('does not change its input', () => {
        const q = [{x: 0, y: 0}, {x: 2, y: 4}, {x: 4, y: 0}];
        bezierAt(q, 0.5);
        expect(q).toEqual([{x: 0, y: 0}, {x: 2, y: 4}, {x: 4, y: 0}]);
    });
});
