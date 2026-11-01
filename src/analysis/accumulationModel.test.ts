import {describe, expect, it} from 'vitest';
import {ACCUMULATION_BOUND_MAX, ACCUMULATION_BOUND_MIN} from './accumulation';
import {FUNCTION_IDS} from './functions';
import {
    AccumulationModel, checkAccumulationModel, chooseAccumulationFunction, DEFAULT_ACCUMULATION_MODEL, moveAccumulationPoint, parseAccumulationModel,
} from './accumulationModel';

const valid: AccumulationModel = {fn: 'sin', a: 0, x: 2, accumulationVisible: false};
const range = (...points: ('a' | 'x')[]) => ({kind: 'range', points, min: ACCUMULATION_BOUND_MIN, max: ACCUMULATION_BOUND_MAX});

describe('checkAccumulationModel: one answer for a stored model', () => {
    it('accepts a valid model and drops unknown properties', () => {
        expect(checkAccumulationModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseAccumulationModel({...valid, extra: 1})).toEqual(valid);
        expect(parseAccumulationModel(DEFAULT_ACCUMULATION_MODEL)).toEqual(DEFAULT_ACCUMULATION_MODEL);
        for (const fn of FUNCTION_IDS) expect(parseAccumulationModel({...valid, fn})).toEqual({...valid, fn});
    });

    it('accepts the boundaries, with x below a and equal to a', () => {
        for (const model of [{...valid, a: ACCUMULATION_BOUND_MIN, x: ACCUMULATION_BOUND_MAX}, {...valid, a: ACCUMULATION_BOUND_MAX, x: ACCUMULATION_BOUND_MIN}, {...valid, a: 1, x: 1}, {...valid, accumulationVisible: true}]) {
            expect(checkAccumulationModel(model), JSON.stringify(model)).toEqual({ok: true, model});
        }
    });

    it('names an unknown function and lists the allowed ones', () => {
        for (const fn of ['cos', '', 'Sin', 3, null, undefined]) expect(checkAccumulationModel({...valid, fn}), String(fn)).toEqual({ok: false, issue: {kind: 'function', allowed: FUNCTION_IDS}});
    });

    it('names the bounds outside the range', () => {
        expect(checkAccumulationModel({...valid, a: -7.01})).toEqual({ok: false, issue: range('a')});
        expect(checkAccumulationModel({...valid, x: 7.01})).toEqual({ok: false, issue: range('x')});
        expect(checkAccumulationModel({...valid, a: 8, x: -8})).toEqual({ok: false, issue: range('a', 'x')});
    });

    it('checks the function before the range, and the range before the flag', () => {
        expect(checkAccumulationModel({...valid, fn: 'cos', a: 9})).toEqual({ok: false, issue: {kind: 'function', allowed: FUNCTION_IDS}});
        expect(checkAccumulationModel({...valid, a: 9, accumulationVisible: 'yes'})).toEqual({ok: false, issue: range('a')});
        for (const accumulationVisible of ['true', 1, null]) expect(checkAccumulationModel({...valid, accumulationVisible})).toEqual({ok: false, issue: {kind: 'visibility'}});
    });

    it('gives no issue for malformed data', () => {
        for (const data of [null, undefined, 3, 'x', [], {fn: 'sin'}, {...valid, a: undefined}, {...valid, x: NaN}, {...valid, a: 'z'}, {...valid, accumulationVisible: undefined}]) {
            expect(checkAccumulationModel(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
            expect(parseAccumulationModel(data)).toBeUndefined();
        }
    });
});

describe('accumulation edits', () => {
    it('chooses a function keeping the bounds, returns the same object for the current one, and refuses an unknown one', () => {
        expect(chooseAccumulationFunction(valid, 'exp')).toEqual({ok: true, model: {...valid, fn: 'exp'}});
        const same = chooseAccumulationFunction(valid, 'sin');
        expect(same.ok && same.model).toBe(valid);
        for (const value of ['cos', '', 3, undefined]) expect(chooseAccumulationFunction(valid, value)).toEqual({ok: false, issue: {kind: 'function', allowed: FUNCTION_IDS}});
    });

    it('moves a bound as given (no normalization) and leaves the old model untouched', () => {
        const before = JSON.stringify(valid);
        expect(moveAccumulationPoint(valid, 'a', 0.1 + 0.2)).toEqual({ok: true, model: {...valid, a: 0.1 + 0.2}});
        expect(moveAccumulationPoint(valid, 'x', ACCUMULATION_BOUND_MIN)).toEqual({ok: true, model: {...valid, x: ACCUMULATION_BOUND_MIN}});
        expect(moveAccumulationPoint(valid, 'x', -1)).toEqual({ok: true, model: {...valid, x: -1}});
        expect(JSON.stringify(valid)).toBe(before);
    });

    it('returns the same object when the value is unchanged', () => {
        for (const point of ['a', 'x'] as const) {
            const same = moveAccumulationPoint(valid, point, valid[point]);
            expect(same.ok && same.model).toBe(valid);
        }
    });

    it('refuses a value outside the range or not finite, naming the bound', () => {
        for (const value of [7.01, -7.01, NaN, Infinity, -Infinity]) {
            for (const point of ['a', 'x'] as const) expect(moveAccumulationPoint(valid, point, value), `${point} ${value}`).toEqual({ok: false, issue: range(point)});
        }
    });
});
