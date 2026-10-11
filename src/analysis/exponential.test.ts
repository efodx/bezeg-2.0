import {classifyBase, exponentialValue, integerValues, mirrorBase} from './exponential';
import {DEFAULT_EXPONENTIAL_MODEL, isExponentialBase, parseExponentialModel} from './exponentialModel';

test('every base passes through (0, 1) and (1, a)', () => {
    for (const a of [0.1, 0.5, 1, 2, 3.7, 5]) {
        expect(exponentialValue(a, 0)).toBe(1);
        expect(exponentialValue(a, 1)).toBe(a);
    }
});

test('the lesson example a = 2 gives f(0..3) = 1, 2, 4, 8 and each value is a times the previous one', () => {
    expect(integerValues(2, 0, 3)).toEqual([1, 2, 4, 8]);
    for (const a of [0.5, 2, 3.3]) {
        for (const x of [-2, -0.5, 0, 1.5, 3]) expect(exponentialValue(a, x + 1)).toBeCloseTo(a * exponentialValue(a, x), 10);
    }
    expect(integerValues(0.5, 0, 3)).toEqual([1, 0.5, 0.25, 0.125]);
});

test('growth, decay and the constant case', () => {
    expect(classifyBase(2)).toBe('growth');
    expect(classifyBase(1.05)).toBe('growth');
    expect(classifyBase(0.5)).toBe('decay');
    expect(classifyBase(0.1)).toBe('decay');
    expect(classifyBase(1)).toBe('constant');
    expect(classifyBase(20 * 0.05)).toBe('constant');
    expect(exponentialValue(1, 123.4)).toBe(1);
    expect(exponentialValue(2, 3)).toBeGreaterThan(exponentialValue(2, 2));
    expect(exponentialValue(0.5, 3)).toBeLessThan(exponentialValue(0.5, 2));
});

test('the mirror (1/a)^x equals a^(-x): the reflection over the y-axis', () => {
    expect(mirrorBase(2)).toBe(0.5);
    expect(mirrorBase(0.5)).toBe(2);
    for (const a of [0.1, 0.5, 2, 5]) {
        for (const x of [-3, -1.5, 0, 0.5, 2]) {
            expect(exponentialValue(mirrorBase(a), x)).toBeCloseTo(exponentialValue(a, -x), 10);
        }
    }
});

test('the graph stays above the x-axis and approaches 0 without reaching it', () => {
    for (const a of [0.1, 0.5, 2, 5]) {
        for (const x of [-20, -5, 0, 5, 20]) expect(exponentialValue(a, x)).toBeGreaterThan(0);
    }
    expect(exponentialValue(2, -10)).toBeCloseTo(1 / 1024, 12);
    expect(exponentialValue(2, -10)).toBeLessThan(exponentialValue(2, -5));
    expect(exponentialValue(0.5, 10)).toBeLessThan(exponentialValue(0.5, 5));
});

test('bases outside the slider range are not valid, so a <= 0 is excluded', () => {
    for (const bad of [0, -1, -0.5, 0.09, 5.01, 100, NaN, Infinity, '2', null, undefined]) expect(isExponentialBase(bad)).toBe(false);
    for (const good of [0.1, 0.5, 1, 2, 5]) expect(isExponentialBase(good)).toBe(true);
});

test('the model parser sanitizes and rejects out-of-domain data', () => {
    expect(DEFAULT_EXPONENTIAL_MODEL).toEqual({a: 2, mirror: false});
    expect(parseExponentialModel({a: 0.5, mirror: true, extra: 1})).toEqual({a: 0.5, mirror: true});
    expect(parseExponentialModel({a: 3})).toEqual({a: 3, mirror: false});
    for (const bad of [null, undefined, [], 'a', 2, {}, {a: 0}, {a: -2}, {a: NaN}, {a: '2'}, {a: 6}, {a: 2, mirror: 1}, {a: 2, mirror: 'true'}]) {
        expect(parseExponentialModel(bad)).toBeUndefined();
    }
});
