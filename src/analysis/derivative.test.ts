import {FUNCTION_CATALOG, FUNCTION_IDS, isFunctionId, catalogFunction} from './functions';
import {
    differenceQuotient, H_MIN_ABS, isStep, isX0, lineValue, secantLine, stepOutOfBand, tangentLine,
} from './derivative';
import {DEFAULT_DERIVATIVE_MODEL, parseDerivativeModel} from './derivativeModel';

const square = catalogFunction('square');
const sin = catalogFunction('sin');
const exp = catalogFunction('exp');

describe('function catalog', () => {
    test('lists square, sin and exp with exact values, derivatives and antiderivatives', () => {
        expect(FUNCTION_IDS).toEqual(['square', 'sin', 'exp']);
        expect([square.value(3), square.derivative(3), square.antiderivative(3)]).toEqual([9, 6, 9]);
        expect([sin.value(0), sin.derivative(0), sin.antiderivative(0)]).toEqual([0, 1, -1]);
        expect([exp.value(0), exp.derivative(0), exp.antiderivative(0)]).toEqual([1, 1, 1]);
        expect(sin.antiderivative(Math.PI) - sin.antiderivative(0)).toBeCloseTo(2, 12);
        expect(square.antiderivative(2) - square.antiderivative(0)).toBeCloseTo(8 / 3, 12);
    });

    test.each(FUNCTION_IDS)('%s: f\' is the numeric derivative of f and F\' is f', id => {
        const entry = FUNCTION_CATALOG[id];
        expect(entry.id).toBe(id);
        const step = 1e-6;
        for (const x of [-1.5, 0, 0.7, 1, 2.5]) {
            expect((entry.value(x + step) - entry.value(x - step)) / (2 * step)).toBeCloseTo(entry.derivative(x), 5);
            expect((entry.antiderivative(x + step) - entry.antiderivative(x - step)) / (2 * step)).toBeCloseTo(entry.value(x), 5);
        }
        expect(entry.latex).not.toContain('\\(');
        expect(entry.plain).not.toBe('');
    });

    test('recognises only the listed ids', () => {
        expect(['square', 'sin', 'exp'].every(isFunctionId)).toBe(true);
        expect(['cos', '', 'Square', null, 1, undefined].some(isFunctionId)).toBe(false);
    });
});

describe('difference quotient, secant and tangent', () => {
    test('f = x^2 at x0 = 1: the quotient is 2 + h (lesson numbers)', () => {
        expect(differenceQuotient(square, 1, 1)).toBe(3);
        expect(differenceQuotient(square, 1, 0.5)).toBe(2.5);
        expect(differenceQuotient(square, 1, 0.1)).toBeCloseTo(2.1, 12);
        expect(differenceQuotient(square, 1, -0.5)).toBe(1.5);
        expect(differenceQuotient(square, 1, 0.01)).toBeCloseTo(2.01, 12);
        for (const h of [-2, -1.25, -0.01, 0.01, 0.3, 1, 2]) expect(differenceQuotient(square, 1, h)).toBeCloseTo(2 + h, 12);
        expect(square.derivative(1)).toBe(2);
    });

    test('sin at x0 = 1 and h = 0.2 gives 0.452840..., cos 1 = 0.540302...', () => {
        expect(differenceQuotient(sin, 1, 0.2)).toBeCloseTo(0.4528405057966489, 12);
        expect(sin.derivative(1)).toBeCloseTo(0.5403023058681398, 12);
        expect(differenceQuotient(sin, 1, 0.2) - sin.derivative(1)).toBeCloseTo(-0.0874618, 6);
        expect(differenceQuotient(sin, 1, 0.01)).toBeCloseTo(0.536085981011869, 12);
    });

    test('sin at x0 = 0 and h = 0.1 gives 0.998334...', () => {
        expect(differenceQuotient(sin, 0, 0.1)).toBeCloseTo(0.9983341664682815, 12);
        expect(sin.derivative(0)).toBe(1);
    });

    test('the quotient approaches the derivative from both sides for every catalog function', () => {
        for (const entry of [square, sin, exp]) {
            const exact = entry.derivative(1);
            expect(Math.abs(differenceQuotient(entry, 1, 1e-6) - exact)).toBeLessThan(1e-4);
            expect(Math.abs(differenceQuotient(entry, 1, -1e-6) - exact)).toBeLessThan(1e-4);
        }
    });

    test('h = 0 and non-finite h are rejected (0/0 is undefined)', () => {
        expect(() => differenceQuotient(square, 1, 0)).toThrow(RangeError);
        expect(() => differenceQuotient(square, 1, NaN)).toThrow(RangeError);
        expect(() => differenceQuotient(square, 1, Infinity)).toThrow(RangeError);
    });

    test('the secant passes through both points and its slope is the quotient', () => {
        const secant = secantLine(square, 1, 0.5);
        expect(secant.p0).toEqual({x: 1, y: 1});
        expect(secant.p1).toEqual({x: 1.5, y: 2.25});
        expect(secant.slope).toBe(2.5);
        expect(lineValue(secant, 1)).toBeCloseTo(1, 12);
        expect(lineValue(secant, 1.5)).toBeCloseTo(2.25, 12);
        const back = secantLine(square, 1, -0.5);
        expect([back.p1.x, back.p1.y, back.slope]).toEqual([0.5, 0.25, 1.5]);
        expect(lineValue(back, 0.5)).toBeCloseTo(0.25, 12);
    });

    test('the tangent has the exact slope and touches the graph at x0', () => {
        const tangent = tangentLine(square, 1);
        expect(tangent).toEqual({slope: 2, intercept: -1});
        expect(lineValue(tangent, 1)).toBe(1);
        const onSin = tangentLine(sin, 1);
        expect(onSin.slope).toBeCloseTo(0.5403023058681398, 12);
        expect(lineValue(onSin, 1)).toBeCloseTo(Math.sin(1), 12);
        // the secant tends to the tangent as h -> 0
        const near = secantLine(square, 1, 1e-6);
        expect(near.slope).toBeCloseTo(tangent.slope, 5);
        expect(near.intercept).toBeCloseTo(tangent.intercept, 5);
    });
});

describe('domain of x0 and h', () => {
    test('x0 is a finite number in [-4, 4]', () => {
        expect([-4, 0, 1, 4].every(isX0)).toBe(true);
        expect([-4.01, 4.01, NaN, Infinity, '1', null].some(isX0)).toBe(false);
    });

    test('h is in [-2, 2] and |h| >= 0.01', () => {
        expect([-2, -0.5, -0.01, 0.01, 0.1, 1, 2].every(isStep)).toBe(true);
        // slider arithmetic: -2 + 199 * 0.01 is a few ulps from -0.01 and must be accepted
        expect(isStep(-2 + 199 * 0.01)).toBe(true);
        expect(isStep(-2 + 201 * 0.01)).toBe(true);
        expect([0, 0.005, -0.005, 0.0099, 2.01, -2.01, NaN, Infinity, '1', null].some(isStep)).toBe(false);
    });

    test('a slider value inside the excluded band moves to +-0.01 in the direction of the change', () => {
        expect(stepOutOfBand(0, 0.01)).toBe(-H_MIN_ABS);
        expect(stepOutOfBand(0, -0.01)).toBe(H_MIN_ABS);
        expect(stepOutOfBand(0.005, -0.01)).toBe(H_MIN_ABS);
        expect(stepOutOfBand(-0.005, 0.01)).toBe(-H_MIN_ABS);
        expect(stepOutOfBand(0, 0)).toBe(H_MIN_ABS);
        // values outside the band are unchanged
        expect(stepOutOfBand(0.5, 0.01)).toBe(0.5);
        expect(stepOutOfBand(-0.01, 0.02)).toBe(-0.01);
        expect(stepOutOfBand(NaN, 1)).toBeNaN();
    });
});

describe('derivative model', () => {
    test('the default is x^2, x0 = 1, h = 1 and a hidden tangent', () => {
        expect(DEFAULT_DERIVATIVE_MODEL).toEqual({fn: 'square', x0: 1, h: 1, tangent: false});
        expect(parseDerivativeModel(DEFAULT_DERIVATIVE_MODEL)).toEqual(DEFAULT_DERIVATIVE_MODEL);
    });

    test('a missing tangent means hidden and unknown properties are dropped', () => {
        expect(parseDerivativeModel({fn: 'sin', x0: -2, h: -0.5, extra: 1})).toEqual({fn: 'sin', x0: -2, h: -0.5, tangent: false});
    });

    test.each([
        [null], [[]], ['x'], [{}], [{fn: 'cos', x0: 1, h: 1}], [{fn: 'square', x0: 4.5, h: 1}], [{fn: 'square', x0: 1, h: 0}],
        [{fn: 'square', x0: 1, h: 0.005}], [{fn: 'square', x0: 1, h: 2.5}], [{fn: 'square', x0: '1', h: 1}], [{fn: 'square', x0: 1, h: 1, tangent: 'yes'}],
    ])('rejects out-of-domain data %j', data => {
        expect(parseDerivativeModel(data)).toBeUndefined();
    });
});
