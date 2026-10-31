import {catalogFunction} from './functions';
import {absoluteError, errorRatio, isSimpsonCount, simpsonParabolas, simpsonRule, trapezoidRule} from './quadrature';

const square = catalogFunction('square');
const sine = catalogFunction('sin');
/** Rounds to as many significant digits as the plan states for `shown` (0.0258 has three, 0.00456 has three). */
const toShown = (x: number, shown: number): number =>
    Number(x.toPrecision(shown.toExponential().split('e')[0].replace(/[-.]/g, '').length));

describe('simpsonRule', () => {
    test('rejects odd, out-of-range and non-integer n without rounding', () => {
        for (const n of [1, 3, 7, 0, -2, 152, 2.5, 4.000001, NaN]) {
            expect(() => simpsonRule(square, 0, 1, n)).toThrow(RangeError);
            expect(isSimpsonCount(n)).toBe(false);
        }
        expect(isSimpsonCount(2)).toBe(true);
        expect(isSimpsonCount(150)).toBe(true);
    });

    test('equals (h/3)(f0 + 4f1 + 2f2 + 4f3 + f4) for n = 4', () => {
        const f = square.value;
        const h = 0.5;
        expect(simpsonRule(square, 0, 2, 4)).toBe(h / 3 * (f(0) + 4 * f(0.5) + 2 * f(1) + 4 * f(1.5) + f(2)));
    });
});

describe('parabola overlay data', () => {
    test('each parabola interpolates its three nodes and there are n/2 of them', () => {
        const parabolas = simpsonParabolas(sine, 0, Math.PI, 6);
        expect(parabolas).toHaveLength(3);
        for (const p of parabolas) {
            expect(p.at(p.x0)).toBeCloseTo(p.y0, 12);
            expect(p.at(p.xMid)).toBeCloseTo(p.yMid, 12);
            expect(p.at(p.x1)).toBeCloseTo(p.y1, 12);
            expect(p.y0).toBeCloseTo(sine.value(p.x0), 14);
        }
    });

    test('the parabola areas add up to the Simpson sum', () => {
        const area = (c: readonly [number, number, number], x0: number, x1: number): number =>
            c[0] * (x1 - x0) + c[1] * (x1 ** 2 - x0 ** 2) / 2 + c[2] * (x1 ** 3 - x0 ** 3) / 3;
        const total = simpsonParabolas(sine, 0, Math.PI, 8).reduce((s, p) => s + area(p.coefficients, p.x0, p.x1), 0);
        expect(total).toBeCloseTo(simpsonRule(sine, 0, Math.PI, 8), 12);
    });
});

describe('sin on [0, pi]: errors and ratios', () => {
    test('trapezoid errors to 4 significant digits', () => {
        const expected = {2: 0.4292, 4: 0.1039, 8: 0.0258, 16: 0.00643};
        for (const [n, err] of Object.entries(expected)) {
            expect(toShown(absoluteError(trapezoidRule(sine, 0, Math.PI, Number(n)), 2), err)).toBeCloseTo(err, 10);
        }
    });

    test('Simpson errors to 4 significant digits', () => {
        const expected = {2: 0.0944, 4: 0.00456, 8: 0.000269, 16: 1.66e-5};
        for (const [n, err] of Object.entries(expected)) {
            const got = absoluteError(simpsonRule(sine, 0, Math.PI, Number(n)), 2);
            expect(toShown(got, err)).toBeCloseTo(err, 10);
        }
    });

    test('successive Simpson error ratios are 20.7 and 16.9', () => {
        const e = [2, 4, 8].map(n => absoluteError(simpsonRule(sine, 0, Math.PI, n), 2));
        expect(toShown(errorRatio(e[0], e[1]) ?? NaN, 20.7)).toBeCloseTo(20.7, 5);
        expect(toShown(errorRatio(e[1], e[2]) ?? NaN, 16.9)).toBeCloseTo(16.9, 5);
    });

    test('errorRatio returns null for a zero error or non-finite input', () => {
        expect(errorRatio(1, 0)).toBeNull();
        expect(errorRatio(Infinity, 1)).toBeNull();
        expect(errorRatio(1, 4)).toBe(0.25);
    });
});

describe('exactness', () => {
    test('square on [0, 3] to 1e-12', () => {
        for (const n of [2, 4, 10]) {
            expect(Math.abs(simpsonRule(square, 0, 3, n) - 9)).toBeLessThan(1e-12);
        }
    });

    test('a local cubic against its exact antiderivative', () => {
        const cubic = {value: (x: number) => x ** 3 - 2 * x ** 2 + x - 5};
        const antiderivative = (x: number) => x ** 4 / 4 - 2 * x ** 3 / 3 + x ** 2 / 2 - 5 * x;
        for (const n of [2, 6]) {
            expect(Math.abs(simpsonRule(cubic, -1, 2.5, n) - (antiderivative(2.5) - antiderivative(-1)))).toBeLessThan(1e-12);
        }
    });
});
