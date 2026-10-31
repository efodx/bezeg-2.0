import {correlation} from './correlation';
import {fitLine} from './leastSquares';
import type {Point2} from './interpolation';

const DEFAULT: Point2[] = [[0, 1], [1, 2], [2, 2], [3, 4]];
const OUTLIER: Point2[] = [[0, 1], [1, 2], [2, 2], [3, 8]];
const parabola = (from: number, to: number): Point2[] =>
    Array.from({length: to - from + 1}, (_, i) => [from + i, (from + i) ** 2] as Point2);
const RING: Point2[] = [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [2, -2], [-2, 2], [-2, -2]];

const ok = (points: Point2[]) => {
    const c = correlation(points);
    if (c.status !== 'ok' || c.r === undefined || c.yOnX === undefined) throw new Error(`r unavailable: ${c.status}`);
    return {...c, r: c.r, yOnX: c.yOnX};
};

describe('P5 default example', () => {
    it('exact integer sums', () => {
        const c = correlation(DEFAULT);
        // Tenths-squared units: n Sxy = 18 in data units -> 18 * 100 = 1800.
        expect(c.nSxy).toBe(1800);
        expect(c.nSxx).toBe(2000);
        expect(c.nSyy).toBe(1900);
        expect(Number.isInteger(c.nSxy) && Number.isInteger(c.nSxx) && Number.isInteger(c.nSyy)).toBe(true);
        expect(c.sxx).toBeCloseTo(5, 12);
        expect(c.syy).toBeCloseTo(4.75, 12);
        expect(c.sxy).toBeCloseTo(4.5, 12);
    });

    it('r, r squared, line, residuals', () => {
        const c = ok(DEFAULT);
        expect(c.rSquared).toBeCloseTo(81 / 95, 12);
        expect(c.r).toBeCloseTo(0.92338, 5);
        expect(c.yOnX.slope).toBeCloseTo(0.9, 12);
        expect(c.yOnX.intercept).toBeCloseTo(0.9, 12);
        expect(c.residualSumOfSquares).toBeCloseTo(0.7, 12);
        expect(c.syy * (1 - c.r ** 2)).toBeCloseTo(0.7, 12);
        expect(c.totalSumOfSquares).toBeCloseTo(4.75, 12);
    });

    it('line equals fitLine', () => {
        const f = fitLine(DEFAULT);
        const c = ok(DEFAULT);
        expect(Math.abs(c.yOnX.slope - f.slope)).toBeLessThan(1e-12);
        expect(Math.abs(c.yOnX.intercept - f.intercept)).toBeLessThan(1e-12);
    });

    it('slope identity b = r sy / sx', () => {
        const c = ok(DEFAULT);
        expect(c.slopeFromR).toBeCloseTo(0.9, 12);
        expect(c.slopeFromR).toBeCloseTo(c.yOnX.slope, 12);
    });

    it('x on y line and the product of the slopes', () => {
        const c = ok(DEFAULT);
        expect(c.xOnY?.slope).toBeCloseTo(0.94737, 5);
        expect(c.xOnY?.intercept).toBeCloseTo(-0.63158, 5);
        expect(c.yOnX.slope * (c.xOnY?.slope ?? NaN)).toBeCloseTo(c.r ** 2, 12);
    });

    it('one outlier moves r from 0.92338 to 0.84680', () => {
        const c = ok(OUTLIER);
        expect(c.r).toBeCloseTo(0.84680, 5);
        expect(c.yOnX.slope).toBeCloseTo(2.1, 12);
        expect(c.yOnX.intercept).toBeCloseTo(0.1, 12);
        expect(c.residualSumOfSquares).toBeCloseTo(8.7, 12);
    });
});

describe('nonlinear data', () => {
    it('y = x^2 on -3..3: Sxy = 0 exactly, r exactly 0, flat line at 4', () => {
        const c = ok(parabola(-3, 3));
        expect(c.nSxy).toBe(0);
        expect(Object.is(c.r, 0)).toBe(true);
        expect(c.yOnX.slope).toBeCloseTo(0, 12);
        expect(c.yOnX.intercept).toBeCloseTo(4, 12);
        const f = fitLine(parabola(-3, 3));
        expect(Math.abs(c.yOnX.slope - f.slope)).toBeLessThan(1e-12);
        expect(Math.abs(c.yOnX.intercept - f.intercept)).toBeLessThan(1e-12);
    });

    it('y = x^2 on 0..3: r = 0.95831', () => {
        expect(ok(parabola(0, 3)).r).toBeCloseTo(0.95831, 5);
    });

    it('ring: Sxy = 0 exactly', () => {
        const c = ok(RING);
        expect(c.nSxy).toBe(0);
        expect(Object.is(c.r, 0)).toBe(true);
    });
});

describe('consistency checks', () => {
    const sets: Record<string, Point2[]> = {
        default: DEFAULT, outlier: OUTLIER, parabolaPos: parabola(0, 3), negative: [[0, 5], [1, 3], [2, 4], [3, 0], [4, 0.5]],
    };
    for (const [name, points] of Object.entries(sets)) {
        it(`${name}: r = sign(Sxy) sqrt(1 - SSres / Syy)`, () => {
            const c = ok(points);
            const expected = Math.sign(c.nSxy) * Math.sqrt(1 - c.residualSumOfSquares! / c.syy);
            expect(c.r).toBeCloseTo(expected, 10);
            expect(c.slopeFromR).toBeCloseTo(c.yOnX.slope, 10);
        });
        it(`${name}: residuals are orthogonal to the design columns`, () => {
            const c = ok(points);
            const res = c.yOnX.fit.residuals;
            const dot1 = res.reduce((s, v) => s + v, 0);
            const dotX = res.reduce((s, v, i) => s + v * points[i][0], 0);
            expect(Math.abs(dot1)).toBeLessThan(1e-12);
            expect(Math.abs(dotX)).toBeLessThan(1e-12);
        });
    }

    it('negative association gives negative r', () => {
        expect(ok(sets.negative).r).toBeLessThan(0);
    });

    it('collinear points give r = +-1', () => {
        expect(ok([[0, 1], [1, 3], [2, 5]]).r).toBeCloseTo(1, 14);
        expect(ok([[0, 5], [1, 3], [2, 1]]).r).toBeCloseTo(-1, 14);
    });
});

describe('statuses', () => {
    it('all-equal x: r undefined, no vertical line, no division by zero', () => {
        const c = correlation([[2, 1], [2, 3], [2, 5]]);
        expect(c.status).toBe('zero-variance-x');
        expect(c.r).toBeUndefined();
        expect(c.rSquared).toBeUndefined();
        expect(c.yOnX).toBeUndefined();
        expect(c.xOnY).toBeDefined();
        expect(c.slopeFromR).toBeUndefined();
    });

    it('all-equal y (horizontal): r undefined, the line y = c still exists, x on y does not', () => {
        const c = correlation([[1, 3], [2, 3], [4, 3]]);
        expect(c.status).toBe('zero-variance-y');
        expect(c.r).toBeUndefined();
        expect(c.yOnX?.slope).toBeCloseTo(0, 12);
        expect(c.yOnX?.intercept).toBeCloseTo(3, 12);
        expect(c.xOnY).toBeUndefined();
    });

    it('all points equal', () => {
        const c = correlation([[1, 1], [1, 1], [1, 1]]);
        expect(c.status).toBe('zero-variance-both');
        expect(c.yOnX).toBeUndefined();
        expect(c.xOnY).toBeUndefined();
    });

    it('fewer than 3 points disables r', () => {
        const two = correlation([[0, 0], [1, 1]]);
        expect(two.status).toBe('too-few');
        expect(two.r).toBeUndefined();
        expect(two.yOnX?.slope).toBeCloseTo(1, 12);
        const one = correlation([[0, 0]]);
        expect(one.status).toBe('too-few');
        expect(one.yOnX).toBeUndefined();
    });

    it('rejects empty and non-finite input with RangeError', () => {
        expect(() => correlation([])).toThrow(RangeError);
        expect(() => correlation([[0, 0], [1, NaN], [2, 2]])).toThrow(RangeError);
        expect(() => correlation([[0, 0], [Infinity, 1], [2, 2]])).toThrow(RangeError);
    });

    it('snaps inputs to tenths before summing', () => {
        const c = correlation([[0.04, 1], [1.04, 2], [2.04, 2], [3.04, 4]]);
        expect(c.nSxy).toBe(1800);
    });
});
