import {describe, expect, it} from 'vitest';
import {MEAN_VALUE_EXAMPLE_IDS, MVT_X_MAX, MVT_X_MIN} from './meanValue';
import {
    checkMeanValueModel, chooseMeanValueExample, DEFAULT_MEAN_VALUE_MODEL, MEAN_VALUE_EXAMPLE_MODELS, MeanValueModel, moveMeanValuePoint, parseMeanValueModel,
} from './meanValueModel';

const valid: MeanValueModel = {example: 'square', a: -1, b: 2, c: 0.5, revealed: false};
const range = (...points: ('a' | 'b' | 'c')[]) => ({kind: 'range', points, min: MVT_X_MIN, max: MVT_X_MAX});

describe('checkMeanValueModel: one answer for a stored model', () => {
    it('accepts a valid model, drops unknown properties and accepts every example model', () => {
        expect(checkMeanValueModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseMeanValueModel({...valid, extra: 1})).toEqual(valid);
        for (const model of Object.values(MEAN_VALUE_EXAMPLE_MODELS)) expect(parseMeanValueModel(model)).toEqual(model);
        expect(parseMeanValueModel(DEFAULT_MEAN_VALUE_MODEL)).toEqual(DEFAULT_MEAN_VALUE_MODEL);
    });

    it('accepts the boundaries of the range and a barely proper ordering', () => {
        for (const model of [{...valid, a: MVT_X_MIN, b: MVT_X_MAX}, {...valid, a: MVT_X_MIN, c: -3.99, b: -3.98}, {...valid, a: 3.98, c: 3.99, b: MVT_X_MAX}, {...valid, revealed: true}]) {
            expect(checkMeanValueModel(model), JSON.stringify(model)).toEqual({ok: true, model});
        }
    });

    it('names an unknown example and lists the allowed ones', () => {
        for (const example of ['sine', '', 'Square', 3, null, undefined]) {
            expect(checkMeanValueModel({...valid, example}), String(example)).toEqual({ok: false, issue: {kind: 'example', allowed: MEAN_VALUE_EXAMPLE_IDS}});
        }
    });

    it('rejects an ordering that is not strictly a < c < b, before the range', () => {
        for (const [a, c, b] of [[1, 1, 2], [0, 0, 2], [0, 2, 2], [2, 1, 0], [0, 3, 2], [5, 0, 6], [0, 0, 9]]) {
            expect(checkMeanValueModel({...valid, a, c, b}), `${a} ${c} ${b}`).toEqual({ok: false, issue: {kind: 'order'}});
        }
    });

    it('names the points outside the range, once the ordering holds', () => {
        expect(checkMeanValueModel({...valid, a: -4.01})).toEqual({ok: false, issue: range('a')});
        expect(checkMeanValueModel({...valid, b: 4.01})).toEqual({ok: false, issue: range('b')});
        expect(checkMeanValueModel({...valid, a: -5, c: 5, b: 6})).toEqual({ok: false, issue: range('a', 'b', 'c')});
        expect(checkMeanValueModel({...valid, a: -5, c: 0, b: 5})).toEqual({ok: false, issue: range('a', 'b')});
        expect(checkMeanValueModel({...valid, a: -5, c: 6, b: 7})).toEqual({ok: false, issue: range('a', 'b', 'c')});
    });

    it('rejects a visibility flag of the wrong type, after the other rules', () => {
        for (const revealed of ['true', 1, null]) expect(checkMeanValueModel({...valid, revealed}), String(revealed)).toEqual({ok: false, issue: {kind: 'revealed'}});
        expect(checkMeanValueModel({...valid, a: 3, revealed: 'x'})).toEqual({ok: false, issue: {kind: 'order'}});
    });

    it('gives no issue for malformed data', () => {
        for (const data of [null, undefined, 3, 'x', [], {example: 'square'}, {...valid, a: undefined}, {...valid, c: NaN}, {...valid, b: 'z'}, {...valid, revealed: undefined}]) {
            expect(checkMeanValueModel(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
            expect(parseMeanValueModel(data)).toBeUndefined();
        }
    });
});

describe('mean value edits', () => {
    it('chooses an example, copying its model, and refuses an unknown one', () => {
        const edit = chooseMeanValueExample('abs');
        expect(edit).toEqual({ok: true, model: MEAN_VALUE_EXAMPLE_MODELS.abs});
        if (edit.ok) expect(edit.model).not.toBe(MEAN_VALUE_EXAMPLE_MODELS.abs);
        for (const value of ['sine', '', 3, undefined]) expect(chooseMeanValueExample(value)).toEqual({ok: false, issue: {kind: 'example', allowed: MEAN_VALUE_EXAMPLE_IDS}});
    });

    it('moves a point, normalizes the value and leaves the old model untouched', () => {
        const before = JSON.stringify(valid);
        expect(moveMeanValuePoint(valid, 'a', 0.1 + 0.2)).toEqual({ok: true, model: {...valid, a: 0.3}});
        expect(moveMeanValuePoint(valid, 'b', MVT_X_MAX)).toEqual({ok: true, model: {...valid, b: MVT_X_MAX}});
        expect(moveMeanValuePoint(valid, 'c', 1)).toEqual({ok: true, model: {...valid, c: 1}});
        expect(JSON.stringify(valid)).toBe(before);
    });

    it('returns the same object when nothing changes, also within floating-point noise', () => {
        for (const point of ['a', 'b', 'c'] as const) {
            expect(moveMeanValuePoint(valid, point, valid[point])).toEqual({ok: true, model: valid});
            const same = moveMeanValuePoint(valid, point, valid[point] + 1e-14);
            expect(same.ok && same.model).toBe(valid);
        }
    });

    it('refuses a value outside the range or not finite, naming the point', () => {
        for (const value of [4.01, -4.01, NaN, Infinity, -Infinity]) {
            for (const point of ['a', 'b', 'c'] as const) expect(moveMeanValuePoint(valid, point, value), `${point} ${value}`).toEqual({ok: false, issue: range(point)});
        }
    });

    it('refuses to push a point through its neighbour, naming the moving point', () => {
        expect(moveMeanValuePoint(valid, 'a', 0.5)).toEqual({ok: false, issue: {kind: 'order', moving: 'a'}});
        expect(moveMeanValuePoint(valid, 'a', 1)).toEqual({ok: false, issue: {kind: 'order', moving: 'a'}});
        expect(moveMeanValuePoint(valid, 'b', 0.5)).toEqual({ok: false, issue: {kind: 'order', moving: 'b'}});
        expect(moveMeanValuePoint(valid, 'b', 0)).toEqual({ok: false, issue: {kind: 'order', moving: 'b'}});
        expect(moveMeanValuePoint(valid, 'c', -1)).toEqual({ok: false, issue: {kind: 'order', moving: 'c'}});
        expect(moveMeanValuePoint(valid, 'c', 2)).toEqual({ok: false, issue: {kind: 'order', moving: 'c'}});
        expect(moveMeanValuePoint(valid, 'c', -1.5)).toEqual({ok: false, issue: {kind: 'order', moving: 'c'}});
    });
});
