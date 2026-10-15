import {FUNCTION_IDS, catalogFunction} from './functions';
import {lineValue} from './derivative';
import {
    ACCUMULATION_BOUND_MAX, ACCUMULATION_BOUND_MIN, accumulation, accumulationPieces, accumulationTangent, isAccumulationBound,
} from './accumulation';
import {DEFAULT_ACCUMULATION_MODEL, parseAccumulationModel} from './accumulationModel';

const square = catalogFunction('square');
const sin = catalogFunction('sin');
const exp = catalogFunction('exp');

/** Independent reference: composite Simpson rule for the oriented integral from a to x (no antiderivative involved). */
function simpson(f: (t: number) => number, a: number, x: number, n = 2000): number {
    const h = (x - a) / n;
    let sum = f(a) + f(x);
    for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
    return sum * h / 3;
}

describe('accumulation A(x) = F(x) - F(a)', () => {
    test('sin with a = 0: A(0) = 0, A(pi) = 2, A(2 pi) = 0', () => {
        expect(accumulation(sin, 0, 0)).toBeCloseTo(0, 12);
        expect(accumulation(sin, 0, Math.PI)).toBeCloseTo(2, 12);
        expect(accumulation(sin, 0, 2 * Math.PI)).toBeCloseTo(0, 12);
        expect(accumulation(sin, 0, Math.PI / 2)).toBeCloseTo(1, 12);
        expect(accumulation(sin, 0, 3 * Math.PI / 2)).toBeCloseTo(1, 12);
    });

    test('x^2 and e^x match hand-computed values', () => {
        expect(accumulation(square, 0, 3)).toBeCloseTo(9, 12); // 3^3 / 3
        expect(accumulation(square, 1, 2)).toBeCloseTo(7 / 3, 12); // (8 - 1) / 3
        expect(accumulation(exp, 0, 1)).toBeCloseTo(1.718281828459045, 12); // e - 1
        expect(accumulation(exp, 0, -1)).toBeCloseTo(1 / Math.E - 1, 12);
    });

    test('x < a: A(x) = -(integral from x to a of f)', () => {
        // sin, a = 0, x = -pi/2: sin < 0 on (-pi/2, 0), so the integral from -pi/2 to 0 is
        // [-cos t] from -pi/2 to 0 = -cos(0) + cos(-pi/2) = -1 + 0 = -1. Reversing the limits gives
        // A(-pi/2) = -(-1) = +1 (not -1).
        expect(accumulation(sin, 0, -Math.PI / 2)).toBeCloseTo(1, 12);
        // x^2, a = 1, x = 0: -(integral from 0 to 1 of t^2) = -1/3
        expect(accumulation(square, 1, 0)).toBeCloseTo(-1 / 3, 12);
        // e^x, a = 0, x = -1: -(integral from -1 to 0 of e^t) = -(1 - 1/e)
        expect(accumulation(exp, 0, -1)).toBeCloseTo(-(1 - 1 / Math.E), 12);
    });

    test.each(FUNCTION_IDS)('%s: matches an independent numerical oriented integral, both orientations', id => {
        const entry = catalogFunction(id);
        for (const [a, x] of [[0, 2], [2, 0], [-1.5, 1], [1, -1.5], [-3, -1], [0.5, 0.5], [1, 6.2]]) {
            expect(accumulation(entry, a, x)).toBeCloseTo(simpson(entry.value, a, x), 6);
        }
    });

    test('A(a) = 0 and the integral is additive: from 0 to 3 = from 0 to 1 plus from 1 to 3', () => {
        for (const entry of [square, sin, exp]) {
            expect(accumulation(entry, 1.5, 1.5)).toBe(0);
            expect(accumulation(entry, 0, 3)).toBeCloseTo(accumulation(entry, 0, 1) + accumulation(entry, 1, 3), 12);
        }
    });

    test('A is signed: negative integrand values decrease it (sin on (pi, 2 pi))', () => {
        expect(accumulation(sin, 0, 4)).toBeLessThan(accumulation(sin, 0, Math.PI));
        expect(accumulation(sin, 0, 5)).toBeLessThan(accumulation(sin, 0, 4));
        expect(accumulation(sin, 0, 3 * Math.PI / 2)).toBeCloseTo(1, 12);
        // the geometric (unsigned) area up to 2 pi is 4, but A(2 pi) is the signed value 0
        expect(accumulation(sin, 0, 2 * Math.PI)).not.toBeCloseTo(4, 3);
        // while f > 0 on (0, pi), A increases
        expect(accumulation(sin, 0, 2)).toBeGreaterThan(accumulation(sin, 0, 1));
    });

    test('non-finite a or x is rejected', () => {
        expect(() => accumulation(sin, NaN, 1)).toThrow(RangeError);
        expect(() => accumulation(sin, 0, Infinity)).toThrow(RangeError);
        expect(() => accumulationPieces(sin, -Infinity, 1)).toThrow(RangeError);
        expect(() => accumulationTangent(sin, 0, NaN)).toThrow(RangeError);
    });
});

describe('tangent to A', () => {
    test.each(FUNCTION_IDS)('%s: the slope equals f(x) and the line touches A at x', id => {
        const entry = catalogFunction(id);
        for (const x of [-2, -0.5, 0, 1, 2.5, Math.PI]) {
            const tangent = accumulationTangent(entry, 0.3, x);
            expect(tangent.slope).toBe(entry.value(x));
            expect(lineValue(tangent, x)).toBeCloseTo(accumulation(entry, 0.3, x), 12);
        }
    });

    test('A\'(x) = f(x): a central difference of A reproduces the slope', () => {
        const step = 1e-6;
        for (const entry of [square, sin, exp]) {
            for (const [a, x] of [[0, 1], [0, -1], [-2, 2.5]]) {
                const numeric = (accumulation(entry, a, x + step) - accumulation(entry, a, x - step)) / (2 * step);
                expect(accumulationTangent(entry, a, x).slope).toBeCloseTo(numeric, 5);
            }
        }
    });

    test('hand values: sin, a = 0, x = pi has slope 0 (A is at its maximum 2); x = 0 has slope 0 and passes through the origin', () => {
        const atPi = accumulationTangent(sin, 0, Math.PI);
        expect(atPi.slope).toBeCloseTo(0, 12);
        expect(lineValue(atPi, 0)).toBeCloseTo(2, 12);
        const atHalfPi = accumulationTangent(sin, 0, Math.PI / 2);
        expect(atHalfPi.slope).toBe(1);
        expect(lineValue(atHalfPi, Math.PI / 2)).toBeCloseTo(1, 12);
        expect(accumulationTangent(exp, 0, 0).slope).toBe(1);
        expect(accumulationTangent(square, 0, 3).slope).toBe(9);
    });
});

describe('signed area pieces', () => {
    test('sin from 0 to 2 pi splits at pi into +2 and -2 that add up to A = 0', () => {
        const pieces = accumulationPieces(sin, 0, 2 * Math.PI);
        expect(pieces).toHaveLength(2);
        expect([pieces[0].from, pieces[0].to]).toEqual([0, Math.PI]);
        expect([pieces[1].from, pieces[1].to]).toEqual([Math.PI, 2 * Math.PI]);
        expect(pieces.map(piece => piece.sign)).toEqual(['positive', 'negative']);
        expect(pieces[0].integral).toBeCloseTo(2, 12);
        expect(pieces[1].integral).toBeCloseTo(-2, 12);
        expect(pieces[0].contribution + pieces[1].contribution).toBeCloseTo(accumulation(sin, 0, 2 * Math.PI), 12);
        // signed area, not unsigned: the absolute values would sum to 4
        expect(pieces[0].integral + pieces[1].integral).toBeCloseTo(0, 12);
    });

    test('no split without an interior sign change, and none for a = x', () => {
        expect(accumulationPieces(sin, 0, 2)).toHaveLength(1);
        expect(accumulationPieces(sin, 0, 2)[0]).toMatchObject({from: 0, to: 2, sign: 'positive'});
        expect(accumulationPieces(sin, 0, Math.PI)).toHaveLength(1); // zero at the endpoint is not an interior cut
        expect(accumulationPieces(sin, 1, 1)).toEqual([]);
        expect(accumulationPieces(square, -2, 3)).toHaveLength(1);
        expect(accumulationPieces(exp, 1, -1)).toHaveLength(1);
    });

    test('x < a keeps the orientation: pieces run left to right, contributions are reversed', () => {
        const [piece] = accumulationPieces(sin, 0, -Math.PI / 2);
        expect([piece.from, piece.to]).toEqual([-Math.PI / 2, 0]);
        expect(piece.sign).toBe('negative');
        expect(piece.integral).toBeCloseTo(-1, 12); // sin < 0 on (-pi/2, 0)
        expect(piece.contribution).toBeCloseTo(1, 12); // A(-pi/2) = +1
        const [reversed] = accumulationPieces(square, 1, 0);
        expect(reversed.integral).toBeCloseTo(1 / 3, 12);
        expect(reversed.contribution).toBeCloseTo(-1 / 3, 12);
    });

    test('negative x range crosses the zeros at -pi and 0 of sin', () => {
        const pieces = accumulationPieces(sin, -4, 4);
        expect(pieces.map(piece => [piece.from, piece.to])).toEqual([[-4, -Math.PI], [-Math.PI, 0], [0, Math.PI], [Math.PI, 4]]);
        expect(pieces.map(piece => piece.sign)).toEqual(['positive', 'negative', 'positive', 'negative']);
    });

    test.each(FUNCTION_IDS)('%s: contributions sum to A and the pieces tile the interval', id => {
        const entry = catalogFunction(id);
        for (const [a, x] of [[0, 6.2], [6.2, 0], [-6, 6], [6, -6], [-3.5, -0.2], [2, 2.5]]) {
            const pieces = accumulationPieces(entry, a, x);
            expect(pieces.reduce((total, piece) => total + piece.contribution, 0)).toBeCloseTo(accumulation(entry, a, x), 9);
            expect(pieces[0].from).toBe(Math.min(a, x));
            expect(pieces[pieces.length - 1].to).toBe(Math.max(a, x));
            for (let i = 1; i < pieces.length; i++) expect(pieces[i].from).toBe(pieces[i - 1].to);
            for (const piece of pieces) {
                expect(Math.sign(piece.integral)).toBe(piece.sign === 'positive' ? 1 : -1);
                const reference = simpson(entry.value, piece.from, piece.to, 4000);
                expect(Math.abs(piece.integral - reference)).toBeLessThan(1e-8 * Math.max(1, Math.abs(reference)));
            }
        }
    });
});

describe('domain of a and x', () => {
    test('a and x are finite numbers in [-7, 7]', () => {
        expect([ACCUMULATION_BOUND_MIN, -3, 0, 2 * Math.PI, ACCUMULATION_BOUND_MAX].every(isAccumulationBound)).toBe(true);
        expect([-7.01, 7.01, NaN, Infinity, '1', null, undefined].some(isAccumulationBound)).toBe(false);
    });
});

describe('accumulation model', () => {
    test('the default is sin, a = 0, a point inside the domain and a hidden accumulation curve', () => {
        expect(DEFAULT_ACCUMULATION_MODEL).toEqual({fn: 'sin', a: 0, x: 2, accumulationVisible: false});
        expect(parseAccumulationModel(DEFAULT_ACCUMULATION_MODEL)).toEqual(DEFAULT_ACCUMULATION_MODEL);
    });

    test('round-trips through JSON with the reveal state and drops unknown properties', () => {
        const model = {fn: 'exp', a: -1.5, x: 0.25, accumulationVisible: true};
        expect(parseAccumulationModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
        expect(parseAccumulationModel({...model, extra: 1})).toEqual(model);
        expect(parseAccumulationModel({fn: 'sin', a: -7, x: 7, accumulationVisible: false})).toEqual({fn: 'sin', a: -7, x: 7, accumulationVisible: false});
    });

    test.each([
        [null], [undefined], [[]], ['x'], [3], [{}],
        [{fn: 'cos', a: 0, x: 1, accumulationVisible: false}],
        [{fn: 'sin', a: 7.5, x: 1, accumulationVisible: false}],
        [{fn: 'sin', a: 0, x: -7.5, accumulationVisible: false}],
        [{fn: 'sin', a: NaN, x: 1, accumulationVisible: false}],
        [{fn: 'sin', a: 0, x: Infinity, accumulationVisible: false}],
        [{fn: 'sin', a: '0', x: 1, accumulationVisible: false}],
        [{fn: 'sin', a: 0, x: 1, accumulationVisible: 'yes'}],
        [{fn: 'sin', a: 0, x: 1, accumulationVisible: 1}],
        [{fn: 'sin', a: 0, x: 1}],
        [{a: 0, x: 1, accumulationVisible: false}],
    ])('rejects out-of-domain data %j', data => {
        expect(parseAccumulationModel(data)).toBeUndefined();
    });
});
