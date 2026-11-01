import {describe, expect, it} from 'vitest';
import {EXTREMA_EXAMPLE_IDS, EXTREMA_X_MAX, EXTREMA_X_MIN} from './extrema';
import {
    checkExtremaModel, chooseExtremaExample, DEFAULT_EXTREMA_MODEL, EXTREMA_EXAMPLE_MODELS, ExtremaModel, moveExtremaEndpoint, parseExtremaModel,
} from './extremaModel';

const valid: ExtremaModel = {example: 'square', a: -1, b: 2, revealed: false};
const range = (...points: ('a' | 'b')[]) => ({kind: 'range', points, min: EXTREMA_X_MIN, max: EXTREMA_X_MAX});

describe('checkExtremaModel: one answer for a stored model', () => {
    it('accepts a valid model, every example and every boundary, and drops unknown properties', () => {
        expect(checkExtremaModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseExtremaModel({...valid, extra: 1})).toEqual(valid);
        for (const model of Object.values(EXTREMA_EXAMPLE_MODELS)) expect(parseExtremaModel(model)).toEqual(model);
        for (const model of [{...valid, a: EXTREMA_X_MIN, b: EXTREMA_X_MAX}, {...valid, a: 3.99, b: EXTREMA_X_MAX}, {...valid, revealed: true}]) {
            expect(checkExtremaModel(model), JSON.stringify(model)).toEqual({ok: true, model});
        }
    });

    it('names an unknown example and lists the allowed ones', () => {
        for (const example of ['quartic', '', 'Square', 3, null, undefined]) {
            expect(checkExtremaModel({...valid, example}), String(example)).toEqual({ok: false, issue: {kind: 'example', allowed: EXTREMA_EXAMPLE_IDS}});
        }
    });

    it('names the offending endpoints when a or b is outside the range', () => {
        expect(checkExtremaModel({...valid, a: -4.01})).toEqual({ok: false, issue: range('a')});
        expect(checkExtremaModel({...valid, b: 4.01})).toEqual({ok: false, issue: range('b')});
        expect(checkExtremaModel({...valid, a: -5, b: 5})).toEqual({ok: false, issue: range('a', 'b')});
    });

    it('rejects a non-increasing interval as order, after the range rule', () => {
        for (const [a, b] of [[2, 2], [3, 1]]) expect(checkExtremaModel({...valid, a, b}), `${a}, ${b}`).toEqual({ok: false, issue: {kind: 'order'}});
        expect(checkExtremaModel({...valid, a: 5, b: 1})).toEqual({ok: false, issue: range('a')});
    });

    it('rejects a non-boolean revealed as visibility, after order', () => {
        for (const revealed of [1, 'true', null]) expect(checkExtremaModel({...valid, revealed})).toEqual({ok: false, issue: {kind: 'visibility'}});
        expect(checkExtremaModel({...valid, a: 3, b: 1, revealed: 1})).toEqual({ok: false, issue: {kind: 'order'}});
    });

    it('gives no issue for malformed data', () => {
        const undef = {ok: false, issue: undefined};
        for (const data of [null, undefined, 3, 'x', [], {...valid, revealed: undefined}, {...valid, a: '1'}, {...valid, b: NaN}, {...valid, a: undefined}]) {
            expect(checkExtremaModel(data), JSON.stringify(data)).toEqual(undef);
            expect(parseExtremaModel(data)).toBeUndefined();
        }
    });
});

describe('extrema edits', () => {
    it('chooseExtremaExample loads the example and hides the classification', () => {
        expect(chooseExtremaExample('sine')).toEqual({ok: true, model: EXTREMA_EXAMPLE_MODELS.sine});
        expect(chooseExtremaExample('abs')).toEqual({ok: true, model: {...EXTREMA_EXAMPLE_MODELS.abs, revealed: false}});
        expect(chooseExtremaExample('quartic')).toEqual({ok: false, issue: {kind: 'example', allowed: EXTREMA_EXAMPLE_IDS}});
    });

    it('moveExtremaEndpoint rejects range and order, never clamps, and does not mutate', () => {
        const model = Object.freeze({...DEFAULT_EXTREMA_MODEL});
        expect(moveExtremaEndpoint(model, 'a', -4.5)).toEqual({ok: false, issue: range('a')});
        expect(moveExtremaEndpoint(model, 'b', NaN)).toEqual({ok: false, issue: range('b')});
        expect(moveExtremaEndpoint(model, 'a', 2)).toEqual({ok: false, issue: {kind: 'order', moving: 'a'}});
        expect(moveExtremaEndpoint(model, 'b', -1)).toEqual({ok: false, issue: {kind: 'order', moving: 'b'}});
        expect(moveExtremaEndpoint(model, 'b', 5)).toEqual({ok: false, issue: range('b')});
        expect(model).toEqual(DEFAULT_EXTREMA_MODEL);
    });

    it('moveExtremaEndpoint accepts boundaries, returns the same object for no change and cleans noise', () => {
        const model = DEFAULT_EXTREMA_MODEL;
        expect(moveExtremaEndpoint(model, 'a', -1)).toEqual({ok: true, model});
        expect((moveExtremaEndpoint(model, 'a', -1 + 1e-14) as { model: ExtremaModel }).model).toBe(model);
        expect(moveExtremaEndpoint(model, 'a', EXTREMA_X_MIN)).toEqual({ok: true, model: {...model, a: EXTREMA_X_MIN}});
        expect(moveExtremaEndpoint(model, 'b', EXTREMA_X_MAX)).toEqual({ok: true, model: {...model, b: EXTREMA_X_MAX}});
        expect(moveExtremaEndpoint(model, 'b', 0.1 + 0.2)).toEqual({ok: true, model: {...model, b: 0.3}});
    });
});
