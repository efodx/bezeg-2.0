import {
    CONTINUITY_A_MAX, CONTINUITY_A_MIN, CONTINUITY_A_STEP, CONTINUITY_TOLERANCE, CONTINUOUS_PARAMETER, isContinuous, jump, leftLimit, leftPiece,
    leftSlope, piecewiseValue, rightLimit, rightPiece, rightSlope, sampleLeftPiece, sampleRightPiece, valueAtJoin,
} from './continuity';
import {DEFAULT_CONTINUITY_MODEL, isContinuityParameter, parseContinuityModel} from './continuityModel';

describe('piecewise function f(x) = a x^2 (x <= 1), -a x + 3 (x > 1)', () => {
    test('the pieces and the piecewise value', () => {
        expect(leftPiece(2, 3)).toBe(18);
        expect(rightPiece(2, 3)).toBe(-3);
        expect(piecewiseValue(1, -2)).toBe(4);
        expect(piecewiseValue(1, 1)).toBe(1); // x = 1 belongs to the left piece
        expect(piecewiseValue(1, 1.0000001)).toBeCloseTo(2 - 1e-7, 12);
        expect(piecewiseValue(1, 3)).toBe(0);
    });

    test('default a = 1: f(1) = 1, left limit 1, right limit 2, jump 1, not continuous', () => {
        const a = DEFAULT_CONTINUITY_MODEL.a;
        expect(a).toBe(1);
        expect(valueAtJoin(a)).toBe(1);
        expect(leftLimit(a)).toBe(1);
        expect(rightLimit(a)).toBe(2);
        expect(jump(a)).toBe(1);
        expect(isContinuous(a)).toBe(false);
    });

    test('worked example a = 3 - a gives a = 3/2: the one-sided limits agree and the jump is 0', () => {
        expect(CONTINUOUS_PARAMETER).toBe(1.5);
        expect(leftLimit(1.5)).toBe(1.5);
        expect(rightLimit(1.5)).toBe(1.5);
        expect(valueAtJoin(1.5)).toBe(1.5);
        expect(jump(1.5)).toBe(0);
        expect(isContinuous(1.5)).toBe(true);
        // a is the only solution of a = 3 - a: nearby values are not continuous
        expect(isContinuous(1.45)).toBe(false);
        expect(isContinuous(1.55)).toBe(false);
        expect(jump(1.45)).toBeCloseTo(0.1, 12);
        expect(jump(1.55)).toBeCloseTo(0.1, 12);
    });

    test('one-sided slopes at a = 3/2 are 3 and -1.5, so continuous is not smooth', () => {
        expect(leftSlope(1.5)).toBe(3);
        expect(rightSlope(1.5)).toBe(-1.5);
        expect(leftSlope(1.5)).not.toBe(rightSlope(1.5));
        // numerical one-sided difference quotients agree with the formulas
        const h = 1e-6;
        const left = (piecewiseValue(1.5, 1) - piecewiseValue(1.5, 1 - h)) / h;
        const right = (piecewiseValue(1.5, 1 + h) - piecewiseValue(1.5, 1)) / h;
        expect(left).toBeCloseTo(3, 4);
        expect(right).toBeCloseTo(-1.5, 4);
    });

    test('the slopes agree only at a = 0, where the function is not continuous', () => {
        for (let step = 0; step <= 60; step++) {
            const a = step * CONTINUITY_A_STEP;
            if (leftSlope(a) === rightSlope(a)) {
                expect(a).toBe(0);
                expect(isContinuous(a)).toBe(false);
            }
        }
        expect(leftSlope(0)).toBe(0);
        expect(rightSlope(0)).toBeCloseTo(0, 15);
    });

    test('edge case a = 0: the left piece is the zero function and the jump is 3', () => {
        expect(leftPiece(0, -5)).toBe(0);
        expect(piecewiseValue(0, -5)).toBe(0);
        expect(valueAtJoin(0)).toBe(0);
        expect(leftLimit(0)).toBe(0);
        expect(rightLimit(0)).toBe(3);
        expect(jump(0)).toBe(3);
        expect(isContinuous(0)).toBe(false);
    });

    test('edge case a = 3: left limit 3, right limit 0, jump 3', () => {
        expect(leftLimit(3)).toBe(3);
        expect(rightLimit(3)).toBe(0);
        expect(jump(3)).toBe(3);
        expect(isContinuous(3)).toBe(false);
    });

    test('the jump is |3 - 2a| on the whole slider and 1.5 is the only continuous slider position', () => {
        const continuous: number[] = [];
        for (let step = 0; step <= (CONTINUITY_A_MAX - CONTINUITY_A_MIN) / CONTINUITY_A_STEP; step++) {
            const a = CONTINUITY_A_MIN + step * CONTINUITY_A_STEP;
            expect(jump(a)).toBeCloseTo(Math.abs(3 - 2 * a), 12);
            if (isContinuous(a)) continuous.push(a);
        }
        expect(continuous).toHaveLength(1);
        expect(continuous[0]).toBeCloseTo(1.5, 12);
    });

    test('the tolerance makes a = 1.5 reachable despite floating-point slider arithmetic', () => {
        const accumulated = Array.from({length: 30}).reduce<number>(sum => sum + CONTINUITY_A_STEP, 0); // 0.05 added 30 times
        expect(accumulated).not.toBe(1.5);
        expect(Math.abs(accumulated - 1.5)).toBeLessThan(CONTINUITY_TOLERANCE);
        expect(isContinuous(accumulated)).toBe(true);
        expect(isContinuous(CONTINUOUS_PARAMETER + 2 * CONTINUITY_TOLERANCE)).toBe(false);
        expect(isContinuous(1.5 + 1e-7)).toBe(false);
        expect(isContinuous(1.5 + 1e-7, 1e-6)).toBe(true);
    });
});

describe('sampling the clipped pieces', () => {
    test('the left piece covers [from, 1] and nothing right of 1', () => {
        const piece = sampleLeftPiece(1, -2, 5, 100);
        expect(piece.x[0]).toBe(-2);
        expect(piece.x.at(-1)).toBe(1);
        expect(Math.max(...piece.x)).toBe(1);
        piece.x.forEach((x, i) => expect(piece.y[i]).toBeCloseTo(x * x, 12));
        expect(piece.x).toHaveLength(101);
    });

    test('the right piece starts just right of 1 and never includes x = 1', () => {
        const piece = sampleRightPiece(1, -2, 5, 100);
        expect(Math.min(...piece.x)).toBeGreaterThan(1);
        expect(piece.x[0] - 1).toBeLessThan(1e-8);
        expect(piece.y[0]).toBeCloseTo(2, 6); // starts at the open point (1, 3 - a)
        expect(piece.x.at(-1)).toBe(5);
        piece.x.forEach((x, i) => expect(piece.y[i]).toBeCloseTo(3 - x, 12));
    });

    test('pieces follow a and clip to the view; views that miss a piece give no samples', () => {
        expect(sampleRightPiece(1.5, 0, 3, 10).y[0]).toBeCloseTo(1.5, 6);
        expect(sampleLeftPiece(1.5, 0, 3, 10).y.at(-1)).toBe(1.5);
        expect(sampleLeftPiece(1, 2, 5)).toEqual({x: [], y: []});
        expect(sampleRightPiece(1, -5, 0.5)).toEqual({x: [], y: []});
        expect(sampleRightPiece(1, 3, 5, 4).x[0]).toBe(3 + 1e-9);
        expect(sampleLeftPiece(1, NaN, 1)).toEqual({x: [], y: []});
    });
});

describe('continuity model', () => {
    test('accepts the slider range and sanitizes the data', () => {
        expect(parseContinuityModel({a: 0})).toEqual({a: 0});
        expect(parseContinuityModel({a: 3})).toEqual({a: 3});
        expect(parseContinuityModel({a: 1.5, extra: 1})).toEqual({a: 1.5});
    });

    test.each([[null], [[]], ['a'], [{}], [{a: -0.1}], [{a: 3.1}], [{a: '1'}], [{a: NaN}], [{a: Infinity}]])('rejects %j', data => {
        expect(parseContinuityModel(data)).toBeUndefined();
    });

    test('isContinuityParameter is the domain test', () => {
        expect(isContinuityParameter(1.5)).toBe(true);
        expect(isContinuityParameter(-1e-12)).toBe(false);
    });
});
