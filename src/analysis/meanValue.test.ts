import {
    isInterval, isMeanValueExampleId, isMeanValueX, isOrdered, matchingPoints, MEAN_VALUE_EXAMPLE_IDS, meanValueExample,
    MVT_X_MAX, MVT_X_MIN, secantLineOf, secantSlope, slopeDifference, tangentLineOf, tangentSlope,
} from './meanValue';
import {DEFAULT_MEAN_VALUE_MODEL, parseMeanValueModel} from './meanValueModel';

const square = meanValueExample('square');
const cube = meanValueExample('cube');
const abs = meanValueExample('abs');

describe('mean value examples', () => {
    test('lists x^2, x^3 and |x|', () => {
        expect(MEAN_VALUE_EXAMPLE_IDS).toEqual(['square', 'cube', 'abs']);
        expect(MEAN_VALUE_EXAMPLE_IDS.every(isMeanValueExampleId)).toBe(true);
        expect(['sin', '', 'Square', null, 1, undefined].some(isMeanValueExampleId)).toBe(false);
        expect(MEAN_VALUE_EXAMPLE_IDS.map(id => meanValueExample(id).id)).toEqual([...MEAN_VALUE_EXAMPLE_IDS]);
    });

    test('values and derivatives are exact; the corner has no derivative', () => {
        expect([square.value(3), square.derivative(3)]).toEqual([9, 6]);
        expect([cube.value(-2), cube.derivative(-2)]).toEqual([-8, 12]);
        expect([abs.value(-3), abs.derivative(-3), abs.derivative(2)]).toEqual([3, -1, 1]);
        expect(abs.derivative(0)).toBeUndefined();
        expect(abs.derivative(-0)).toBeUndefined();
    });

    test('latex is undelimited', () => {
        for (const id of MEAN_VALUE_EXAMPLE_IDS) expect(meanValueExample(id).latex).not.toContain('\\(');
    });
});

describe('secant, tangent and slope difference', () => {
    test('x^2 on [0, 2]: secant slope 2, tangent slope 1 at c = 0.5, difference -1', () => {
        expect(secantSlope(square, 0, 2)).toBe(2);
        expect(tangentSlope(square, 0, 0.5, 2)).toBe(1);
        expect(slopeDifference(square, 0, 0.5, 2)).toBe(-1);
        expect(slopeDifference(square, 0, 1, 2)).toBe(0);
    });

    test('x^3 on [-1, 1]: secant slope 1', () => {
        expect(secantSlope(cube, -1, 1)).toBe(1);
    });

    test('|x| on [-1, 1]: secant slope 0; slope difference undefined at the corner, never Infinity or NaN', () => {
        expect(secantSlope(abs, -1, 1)).toBe(0);
        expect(slopeDifference(abs, -1, 0, 1)).toBeUndefined();
        expect(tangentSlope(abs, -1, 0, 1)).toBeUndefined();
        expect(tangentLineOf(abs, -1, 0, 1)).toBeUndefined();
        expect(slopeDifference(abs, -1, 0.5, 1)).toBe(1);
    });

    test('lines pass through the right points', () => {
        const secant = secantLineOf(square, 0, 2);
        expect([secant.slope, secant.slope * 0 + secant.intercept, secant.slope * 2 + secant.intercept]).toEqual([2, 0, 4]);
        const tangent = tangentLineOf(square, 0, 1, 2);
        expect(tangent).toEqual({slope: 2, intercept: -1});
    });

    test('invalid orderings and non-finite input throw RangeError', () => {
        expect(() => secantSlope(square, 2, 0)).toThrow(RangeError);
        expect(() => secantSlope(square, 1, 1)).toThrow(RangeError);
        expect(() => secantSlope(square, 0, Infinity)).toThrow(RangeError);
        expect(() => secantSlope(square, NaN, 1)).toThrow(RangeError);
        expect(() => tangentSlope(square, 0, 0, 2)).toThrow(RangeError);
        expect(() => tangentSlope(square, 0, 2, 2)).toThrow(RangeError);
        expect(() => tangentSlope(square, 0, 3, 2)).toThrow(RangeError);
        expect(() => slopeDifference(square, 0, NaN, 2)).toThrow(RangeError);
        expect(() => tangentLineOf(square, 2, 1, 0)).toThrow(RangeError);
        expect(() => secantLineOf(square, 2, 2)).toThrow(RangeError);
        expect(() => matchingPoints(square, 2, 0)).toThrow(RangeError);
        expect(() => matchingPoints(abs, 1, 1)).toThrow(RangeError);
    });

    test('ordering predicates', () => {
        expect(isInterval(0, 1)).toBe(true);
        expect(isInterval(1, 1)).toBe(false);
        expect(isOrdered(0, 1, 2)).toBe(true);
        expect([isOrdered(0, 0, 2), isOrdered(0, 2, 2), isOrdered(2, 1, 0), isOrdered(0, NaN, 2)]).toEqual([false, false, false, false]);
    });
});

describe('matching points', () => {
    test('x^2 on [0, 2] matches only at c = 1', () => {
        expect(matchingPoints(square, 0, 2)).toEqual({kind: 'points', points: [1]});
    });

    test('x^3 on [-1, 1] matches at both c = -1/sqrt(3) and c = 1/sqrt(3)', () => {
        const result = matchingPoints(cube, -1, 1);
        expect(result.kind).toBe('points');
        if (result.kind !== 'points') return;
        expect(result.points).toHaveLength(2);
        expect(result.points[0]).toBeCloseTo(-0.5773502691896258, 14);
        expect(result.points[1]).toBeCloseTo(0.5773502691896258, 14);
    });

    test('x^3 keeps only the roots inside the open interval', () => {
        // [0, 1]: slope 1, c = 1/sqrt(3) only (the negative root lies outside).
        const onePositive = matchingPoints(cube, 0, 1);
        expect(onePositive.kind === 'points' && onePositive.points).toHaveLength(1);
        expect(onePositive.kind === 'points' && onePositive.points[0]).toBeCloseTo(0.5773502691896258, 14);
        // [-1, 0]: mirror image.
        const oneNegative = matchingPoints(cube, -1, 0);
        expect(oneNegative.kind === 'points' && oneNegative.points[0]).toBeCloseTo(-0.5773502691896258, 14);
        // [1, 2]: slope 7, c = sqrt(7/3) ~ 1.5275 is inside; x^3 on [-4, -3] mirrors it.
        const far = matchingPoints(cube, 1, 2);
        expect(far.kind === 'points' && far.points[0]).toBeCloseTo(Math.sqrt(7 / 3), 14);
    });

    test('|x| on [-1, 1]: secant slope 0, no interior point has derivative 0, no matches', () => {
        expect(secantSlope(abs, -1, 1)).toBe(0);
        expect(matchingPoints(abs, -1, 1)).toEqual({kind: 'points', points: []});
        for (let c = -0.99; c < 1; c += 0.01) expect(abs.derivative(c)).not.toBe(0);
    });

    test('|x| away from the corner matches on the whole open interval', () => {
        expect(matchingPoints(abs, 1, 2)).toEqual({kind: 'interval', from: 1, to: 2});
        expect(secantSlope(abs, 1, 2)).toBe(1);
        expect(matchingPoints(abs, -3, -1)).toEqual({kind: 'interval', from: -3, to: -1});
        expect(secantSlope(abs, -3, -1)).toBe(-1);
        expect(matchingPoints(abs, 0, 2)).toEqual({kind: 'interval', from: 0, to: 2});
        expect(matchingPoints(abs, -2, 0)).toEqual({kind: 'interval', from: -2, to: 0});
        // The corner inside (a, b) means a non-unit secant slope: no match.
        expect(matchingPoints(abs, -1, 3)).toEqual({kind: 'points', points: []});
    });

    test.each(MEAN_VALUE_EXAMPLE_IDS)('%s: every match lies in (a, b) and has f\'(c) = secant slope within 1e-12', id => {
        const example = meanValueExample(id);
        const grid = [-4, -3.7, -2.5, -1, -0.3, 0, 0.01, 0.5, 1, 2, 3.3, 4];
        for (const a of grid) {
            for (const b of grid) {
                if (!(a < b)) continue;
                const slope = secantSlope(example, a, b);
                const result = matchingPoints(example, a, b);
                const sample = result.kind === 'points'
                    ? result.points
                    : [result.from + (result.to - result.from) * 0.25, (result.from + result.to) / 2, result.from + (result.to - result.from) * 0.75];
                if (result.kind === 'interval') {
                    expect(result.from).toBeGreaterThanOrEqual(a);
                    expect(result.to).toBeLessThanOrEqual(b);
                }
                for (const c of sample) {
                    expect(c).toBeGreaterThan(a);
                    expect(c).toBeLessThan(b);
                    expect(Math.abs((example.derivative(c) as number) - slope)).toBeLessThan(1e-12);
                }
            }
        }
    });

    test('x^2 and x^3 matches are complete: other interior points do not match', () => {
        // Completeness check by sampling (reference: the sign of f'(x) - slope changes only at the listed points).
        for (const example of [square, cube]) {
            for (const [a, b] of [[0, 2], [-1, 1], [-3, 0.5], [1, 3]]) {
                const slope = secantSlope(example, a, b);
                const result = matchingPoints(example, a, b);
                const points = result.kind === 'points' ? result.points : [];
                for (let k = 1; k < 400; k++) {
                    const c = a + ((b - a) * k) / 400;
                    const nearest = Math.min(...points.map(p => Math.abs(p - c)));
                    if (nearest > 1e-2) expect(Math.abs((example.derivative(c) as number) - slope)).toBeGreaterThan(1e-6);
                }
            }
        }
    });
});

describe('mean value model parser', () => {
    test('accepts the default and the lesson examples, dropping unknown keys', () => {
        expect(parseMeanValueModel(DEFAULT_MEAN_VALUE_MODEL)).toEqual(DEFAULT_MEAN_VALUE_MODEL);
        expect(DEFAULT_MEAN_VALUE_MODEL).toEqual({example: 'square', a: 0, b: 2, c: 0.5});
        expect(parseMeanValueModel({example: 'cube', a: -1, b: 1, c: 0.2})).toEqual({example: 'cube', a: -1, b: 1, c: 0.2});
        expect(parseMeanValueModel({example: 'abs', a: -1, b: 1, c: 0, extra: 1})).toEqual({example: 'abs', a: -1, b: 1, c: 0});
    });

    test('accepts the closed boundary of the domain', () => {
        expect(parseMeanValueModel({example: 'square', a: MVT_X_MIN, b: MVT_X_MAX, c: 0})).toBeDefined();
        expect(isMeanValueX(MVT_X_MIN) && isMeanValueX(MVT_X_MAX)).toBe(true);
    });

    test('rejects non-objects, unknown examples and missing or non-finite numbers', () => {
        for (const bad of [null, undefined, 3, 'x', [], [1, 2, 3]]) expect(parseMeanValueModel(bad)).toBeUndefined();
        const ok = {example: 'square', a: 0, b: 2, c: 1};
        expect(parseMeanValueModel({...ok, example: 'sin'})).toBeUndefined();
        expect(parseMeanValueModel({...ok, example: undefined})).toBeUndefined();
        for (const key of ['a', 'b', 'c']) {
            for (const value of [undefined, NaN, Infinity, -Infinity, '1', null]) {
                expect(parseMeanValueModel({...ok, [key]: value})).toBeUndefined();
            }
        }
    });

    test('rejects out-of-domain numbers', () => {
        expect(parseMeanValueModel({example: 'square', a: -5, b: 2, c: 1})).toBeUndefined();
        expect(parseMeanValueModel({example: 'square', a: 0, b: 5, c: 1})).toBeUndefined();
        expect(parseMeanValueModel({example: 'square', a: 0, b: 2, c: 4.5})).toBeUndefined();
    });

    test('rejects any ordering that violates a < c < b', () => {
        const base = {example: 'square'};
        for (const [a, b, c] of [[0, 2, 0], [0, 2, 2], [0, 2, -1], [0, 2, 3], [2, 0, 1], [1, 1, 1], [2, 2, 2], [1, 0, 2]]) {
            expect(parseMeanValueModel({...base, a, b, c})).toBeUndefined();
        }
    });
});
