import {
    BISECTION_BOUND_MAX, BISECTION_BOUND_MIN, BISECTION_EXAMPLE_IDS, BISECTION_EXAMPLES, BISECTION_MAX_STEPS,
    bisectionExample, bisectionHistory, bracketKind, isBisectionBracket, isBisectionEndpoint, isBisectionExampleId,
    isBisectionStepCount, isContinuousOn,
} from './bisection';
import {DEFAULT_BISECTION_MODEL, parseBisectionModel} from './bisectionModel';

const square = BISECTION_EXAMPLES['square-minus-two'];
const step = BISECTION_EXAMPLES['sign-step'];
const cubic = BISECTION_EXAMPLES.cubic;

describe('bisection examples', () => {
    test('lists the closed catalog with hard-coded values', () => {
        expect(BISECTION_EXAMPLE_IDS).toEqual(['square-minus-two', 'sign-step', 'cubic']);
        expect([1, 2, 1.5, 0, -3].map(square.value)).toEqual([-1, 2, 0.25, -2, 7]);
        expect([-4, -1e-300, 0, 1e-300, 4].map(step.value)).toEqual([-1, -1, 1, 1, 1]);
        expect([-2, -1, 0, 1, 2].map(cubic.value)).toEqual([-6, 0, 0, 0, 6]);
        for (const id of BISECTION_EXAMPLE_IDS) {
            const example = bisectionExample(id);
            expect(example.id).toBe(id);
            expect(example.plain).not.toBe('');
            expect(example.latex).not.toContain('\\(');
            expect(isBisectionBracket(example.defaultA, example.defaultB)).toBe(true);
        }
    });

    test('the continuity flags and the discontinuity location', () => {
        expect(square.continuous && cubic.continuous).toBe(true);
        expect(step.continuous).toBe(false);
        expect(step.discontinuity).toBe(0);
        expect(square.discontinuity).toBeUndefined();
    });

    test('the step is discontinuous exactly on intervals with a < 0 <= b', () => {
        expect(isContinuousOn(step, -1, 1)).toBe(false);
        expect(isContinuousOn(step, -1, 0)).toBe(false);
        expect(isContinuousOn(step, 0, 1)).toBe(true);
        expect(isContinuousOn(step, -2, -1)).toBe(true);
        expect(isContinuousOn(square, -4, 4)).toBe(true);
    });

    test('recognises only the listed ids', () => {
        expect(BISECTION_EXAMPLE_IDS.every(isBisectionExampleId)).toBe(true);
        expect(['sign', '', 'Cubic', null, 1, undefined].some(isBisectionExampleId)).toBe(false);
        expect(() => bisectionExample('nope' as never)).toThrow(RangeError);
    });

    test('domain guards', () => {
        expect([isBisectionEndpoint(-4), isBisectionEndpoint(4), isBisectionEndpoint(0.3)]).toEqual([true, true, true]);
        expect([-4.01, 4.01, NaN, Infinity, '1', null, undefined].some(isBisectionEndpoint)).toBe(false);
        expect(isBisectionBracket(1, 2)).toBe(true);
        expect([isBisectionBracket(2, 1), isBisectionBracket(1, 1), isBisectionBracket(NaN, 1), isBisectionBracket(1, 5)]).toEqual([false, false, false, false]);
        expect([0, 1, 60].every(isBisectionStepCount)).toBe(true);
        expect([-1, 0.5, 61, NaN, Infinity, '2', null].some(isBisectionStepCount)).toBe(false);
        expect([BISECTION_BOUND_MIN, BISECTION_BOUND_MAX, BISECTION_MAX_STEPS]).toEqual([-4, 4, 60]);
    });
});

describe('bisection history of x^2 - 2 on [1, 2]', () => {
    const history = bisectionHistory('square-minus-two', 1, 2, 3);

    test('first midpoints 1.5, 1.25, 1.375 with values 0.25, -0.4375, -0.109375', () => {
        expect(history.steps.map(s => s.mid)).toEqual([1.5, 1.25, 1.375]);
        expect(history.steps.map(s => s.fMid)).toEqual([0.25, -0.4375, -0.109375]);
        expect(history.steps.map(s => s.index)).toEqual([1, 2, 3]);
    });

    test('retains the half whose endpoints still have opposite signs', () => {
        expect(history.steps.map(s => s.retained)).toEqual(['left', 'right', 'right']);
        expect(history.steps.map(s => [s.a, s.b])).toEqual([[1, 2], [1, 1.5], [1.25, 1.5]]);
        expect(history.steps.map(s => [s.nextA, s.nextB])).toEqual([[1, 1.5], [1.25, 1.5], [1.375, 1.5]]);
        expect(history.steps[0]).toMatchObject({fa: -1, fb: 2});
        expect([history.currentA, history.currentB, history.currentWidth]).toEqual([1.375, 1.5, 0.125]);
    });

    test('every proper step halves the width: 1, 0.5, 0.25, 0.125', () => {
        expect(history.steps.map(s => s.width)).toEqual([1, 0.5, 0.25]);
        expect(history.steps.map(s => s.nextWidth)).toEqual([0.5, 0.25, 0.125]);
    });

    test('classifies the bracket and satisfies the hypothesis; the iteration is still running', () => {
        expect(history).toMatchObject({bracket: 'opposite-signs', continuous: true, hypothesisSatisfied: true, fa: -1, fb: 2});
        expect(history.termination).toBeUndefined();
        expect(history.exactRoot).toBeUndefined();
    });

    test('zero steps give the initial bracket', () => {
        const start = bisectionHistory('square-minus-two', 1, 2, 0);
        expect(start.steps).toEqual([]);
        expect([start.currentA, start.currentB, start.currentWidth]).toEqual([1, 2, 1]);
        expect(start.termination).toBeUndefined();
    });

    test('the opposite-sign invariant holds for every retained bracket up to the limit', () => {
        for (const id of ['square-minus-two', 'cubic'] as const) {
            const example = bisectionExample(id);
            const full = bisectionHistory(id, example.defaultA, example.defaultB, BISECTION_MAX_STEPS);
            expect(full.steps.length).toBeGreaterThan(40);
            for (const s of full.steps) {
                if (s.retained === 'none') continue;
                expect(Math.sign(example.value(s.nextA)) * Math.sign(example.value(s.nextB))).toBe(-1);
                expect(s.nextWidth).toBe(s.width / 2);
            }
        }
    });

    test('the sqrt 2 bracket is never claimed to contain an exact root: no f value is 0 up to stagnation', () => {
        for (const [a, b] of [[1, 2], [1, 1.5], [0, 4], [1.2, 1.9], [1.4, 1.5]]) {
            const full = bisectionHistory('square-minus-two', a, b, BISECTION_MAX_STEPS);
            expect(full.exactRoot).toBeUndefined();
            expect(full.termination).toBe('stagnation');
            expect(full.steps.every(s => s.fMid !== 0 && s.retained !== 'none')).toBe(true);
            expect(full.currentA).toBeLessThanOrEqual(Math.SQRT2);
            expect(full.currentB).toBeGreaterThanOrEqual(Math.SQRT2);
        }
    });

    test('floating-point stagnation: the midpoint equals an endpoint', () => {
        const full = bisectionHistory('square-minus-two', 1, 2, BISECTION_MAX_STEPS);
        expect(full.termination).toBe('stagnation');
        expect(full.steps.length).toBeGreaterThanOrEqual(50);
        expect(full.steps.length).toBeLessThan(BISECTION_MAX_STEPS);
        const mid = full.currentA + (full.currentB - full.currentA) / 2;
        expect(mid === full.currentA || mid === full.currentB).toBe(true);
        // Stagnation is also reported when exactly the last possible step was requested.
        const justEnough = bisectionHistory('square-minus-two', 1, 2, full.steps.length);
        expect(justEnough.termination).toBe('stagnation');
        expect(justEnough.steps.length).toBe(full.steps.length);
        expect(bisectionHistory('square-minus-two', 1, 2, full.steps.length - 1).termination).toBeUndefined();
    });

    test('is deterministic and a prefix of any longer history', () => {
        const again = bisectionHistory('square-minus-two', 1, 2, 3);
        expect(again).toEqual(history);
        const longer = bisectionHistory('square-minus-two', 1, 2, 10);
        expect(longer.steps.slice(0, 3)).toEqual(history.steps);
    });
});

describe('bisection brackets and terminations', () => {
    test('an exact root at an endpoint stops immediately and is reported as exact', () => {
        const left = bisectionHistory('cubic', 1, 2, 5);
        expect(left).toMatchObject({bracket: 'endpoint-root', termination: 'endpoint-root', exactRoot: 1, steps: []});
        const right = bisectionHistory('cubic', -2, -1, 5);
        expect(right).toMatchObject({bracket: 'endpoint-root', termination: 'endpoint-root', exactRoot: -1});
        const both = bisectionHistory('cubic', -1, 1, 5);
        expect(both).toMatchObject({bracket: 'endpoint-root', exactRoot: -1, steps: []});
        expect(both.hypothesisSatisfied).toBe(false);
    });

    test('an exact midpoint root stops the iteration and is reported as exact', () => {
        const history = bisectionHistory('cubic', -2, 2, 10);
        expect(history.steps).toHaveLength(1);
        expect(history.steps[0]).toMatchObject({mid: 0, fMid: 0, retained: 'none', nextA: 0, nextB: 0, nextWidth: 0, width: 4});
        expect(history).toMatchObject({termination: 'exact-midpoint-root', exactRoot: 0, bracket: 'opposite-signs', hypothesisSatisfied: true});
        expect([history.currentA, history.currentB, history.currentWidth]).toEqual([0, 0, 0]);
    });

    test('an exact midpoint root after several steps', () => {
        // x^3 - x on [0.5, 2.5]: the midpoint 1.5 has f = 1.875 > 0, so [0.5, 1.5] is kept and its midpoint 1 is an exact root.
        const history = bisectionHistory('cubic', 0.5, 2.5, 6);
        expect(history.steps.map(s => [s.mid, s.fMid, s.retained])).toEqual([[1.5, 1.875, 'left'], [1, 0, 'none']]);
        expect(history).toMatchObject({termination: 'exact-midpoint-root', exactRoot: 1});
    });

    test('a bracket guarantees a root, not uniqueness: x^3 - x on [-2, 3] converges to 1 while 0 and -1 are roots too', () => {
        const history = bisectionHistory('cubic', -2, 3, 40);
        expect(history.steps[0]).toMatchObject({mid: 0.5, fMid: -0.375, retained: 'right'});
        expect(history.currentA).toBeCloseTo(1, 10);
        expect(cubic.value(0)).toBe(0);
        expect(cubic.value(-1)).toBe(0);
    });

    test('a same-sign bracket is invalid and takes no steps', () => {
        const history = bisectionHistory('square-minus-two', 2, 3, 5);
        expect(history).toMatchObject({bracket: 'same-sign', termination: 'invalid-bracket', hypothesisSatisfied: false, steps: [], fa: 2, fb: 7});
        expect(history.exactRoot).toBeUndefined();
        expect([history.currentA, history.currentB, history.currentWidth]).toEqual([2, 3, 1]);
        expect(bisectionHistory('square-minus-two', -1, 1, 3).bracket).toBe('same-sign');
    });

    test('the iteration limit is reached when stagnation is not (sign step converging towards the jump)', () => {
        const history = bisectionHistory('sign-step', -1, 1, BISECTION_MAX_STEPS);
        expect(history.steps).toHaveLength(BISECTION_MAX_STEPS);
        expect(history.termination).toBe('iteration-limit');
        expect(bisectionHistory('sign-step', -1, 1, BISECTION_MAX_STEPS - 1).termination).toBeUndefined();
    });

    test('bracketKind', () => {
        expect([bracketKind(-1, 2), bracketKind(2, -1), bracketKind(1, 2), bracketKind(-3, -1), bracketKind(0, 5), bracketKind(-5, 0)])
            .toEqual(['opposite-signs', 'opposite-signs', 'same-sign', 'same-sign', 'endpoint-root', 'endpoint-root']);
    });
});

describe('the discontinuous sign step', () => {
    test('has opposite endpoint signs but no zero: the hypothesis is not satisfied', () => {
        const history = bisectionHistory('sign-step', -1, 1, 6);
        expect(history).toMatchObject({bracket: 'opposite-signs', continuous: false, hypothesisSatisfied: false, fa: -1, fb: 1});
        expect(history.exactRoot).toBeUndefined();
        expect(history.steps.every(s => s.fMid !== 0 && s.retained !== 'none')).toBe(true);
    });

    test('keeps squeezing onto the jump at 0 with widths 2, 1, 0.5, ...', () => {
        const history = bisectionHistory('sign-step', -1, 1, 4);
        expect(history.steps.map(s => s.mid)).toEqual([0, -0.5, -0.25, -0.125]);
        expect(history.steps.map(s => s.fMid)).toEqual([1, -1, -1, -1]);
        expect(history.steps.map(s => s.retained)).toEqual(['left', 'right', 'right', 'right']);
        expect(history.steps.map(s => s.nextWidth)).toEqual([1, 0.5, 0.25, 0.125]);
        expect(history.currentB).toBe(0);
    });

    test('the theorem applies when the interval avoids the jump', () => {
        expect(bisectionHistory('sign-step', 0, 1, 2)).toMatchObject({bracket: 'same-sign', continuous: true, hypothesisSatisfied: false});
        expect(bisectionHistory('sign-step', -2, -1, 2)).toMatchObject({bracket: 'same-sign', continuous: true});
    });
});

describe('bisection history validation', () => {
    test('rejects steps beyond the limit, bad counts and bad brackets with RangeError', () => {
        expect(() => bisectionHistory('square-minus-two', 1, 2, BISECTION_MAX_STEPS + 1)).toThrow(RangeError);
        expect(() => bisectionHistory('square-minus-two', 1, 2, -1)).toThrow(RangeError);
        expect(() => bisectionHistory('square-minus-two', 1, 2, 1.5)).toThrow(RangeError);
        expect(() => bisectionHistory('square-minus-two', 2, 1, 1)).toThrow(RangeError);
        expect(() => bisectionHistory('square-minus-two', 1, 1, 1)).toThrow(RangeError);
        expect(() => bisectionHistory('square-minus-two', 1, 5, 1)).toThrow(RangeError);
        expect(() => bisectionHistory('square-minus-two', NaN, 2, 1)).toThrow(RangeError);
        expect(() => bisectionHistory('nope' as never, 1, 2, 1)).toThrow(RangeError);
    });
});

describe('bisection model parser', () => {
    test('the default model is the x^2 - 2 bracket [1, 2] at step 0', () => {
        expect(DEFAULT_BISECTION_MODEL).toEqual({example: 'square-minus-two', a: 1, b: 2, step: 0});
        expect(parseBisectionModel(DEFAULT_BISECTION_MODEL)).toEqual(DEFAULT_BISECTION_MODEL);
    });

    test('accepts valid models including the step at the limit', () => {
        expect(parseBisectionModel({example: 'sign-step', a: -1, b: 1, step: 3})).toEqual({example: 'sign-step', a: -1, b: 1, step: 3});
        expect(parseBisectionModel({example: 'cubic', a: -4, b: 4, step: BISECTION_MAX_STEPS})?.step).toBe(BISECTION_MAX_STEPS);
    });

    test('drops unknown properties', () => {
        expect(parseBisectionModel({example: 'cubic', a: 0.5, b: 2, step: 1, history: [1, 2], playing: true}))
            .toEqual({example: 'cubic', a: 0.5, b: 2, step: 1});
    });

    test('rejects non-objects and arrays', () => {
        for (const bad of [null, undefined, 1, 'x', true, [], [{example: 'cubic', a: 0, b: 1, step: 0}]]) {
            expect(parseBisectionModel(bad)).toBeUndefined();
        }
    });

    test('rejects unknown examples, out-of-domain endpoints and bad steps', () => {
        const ok = {example: 'square-minus-two', a: 1, b: 2, step: 0};
        expect(parseBisectionModel({...ok, example: 'sqrt'})).toBeUndefined();
        expect(parseBisectionModel({...ok, example: undefined})).toBeUndefined();
        for (const a of [-4.5, NaN, Infinity, '1', null, 2, 3]) expect(parseBisectionModel({...ok, a})).toBeUndefined();
        for (const b of [4.5, NaN, -Infinity, '2', undefined, 1, 0]) expect(parseBisectionModel({...ok, b})).toBeUndefined();
        for (const stepValue of [-1, 0.5, BISECTION_MAX_STEPS + 1, NaN, Infinity, '1', null, undefined]) {
            expect(parseBisectionModel({...ok, step: stepValue})).toBeUndefined();
        }
    });
});
