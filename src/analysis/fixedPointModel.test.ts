import {describe, expect, it} from 'vitest';
import {FIXED_POINT_MAX_DIGITS, FIXED_POINT_MAX_STEPS, FIXED_POINT_MIN_DIGITS} from './fixedPoint';
import {
    changeFixedPointDigits, changeFixedPointStart, checkFixedPointModel, chooseFixedPointExample, defaultFixedPointModel, FixedPointModel,
    parseFixedPointModel,
} from './fixedPointModel';

const valid: FixedPointModel = {example: 'affine', x0: 0.5, step: 3, digits: 3, boundVisible: true};
const digitsIssue = {kind: 'digits', min: FIXED_POINT_MIN_DIGITS, max: FIXED_POINT_MAX_DIGITS};
const examples = ['affine', 'cosine', 'reflection'];
/** The model inside an accepted edit (fails the test when the edit was refused). */
const modelOf = (edit: { ok: boolean; model?: FixedPointModel }): FixedPointModel => {
    if (!edit.ok || edit.model === undefined) throw new Error('the edit was refused');
    return edit.model;
};

describe('checkFixedPointModel: one answer for a stored model', () => {
    it('accepts a valid model, its boundaries and drops unknown properties', () => {
        expect(checkFixedPointModel({...valid, extra: 1, history: [1]})).toEqual({ok: true, model: valid});
        const edge = {example: 'cosine', x0: 1, step: FIXED_POINT_MAX_STEPS, digits: FIXED_POINT_MAX_DIGITS, boundVisible: false};
        expect(checkFixedPointModel(edge)).toEqual({ok: true, model: edge});
        const low = {example: 'reflection', x0: 0, step: 0, digits: FIXED_POINT_MIN_DIGITS, boundVisible: false};
        expect(parseFixedPointModel(low)).toEqual(low);
    });

    it('names the rule a rejected field broke, with the interval of the example', () => {
        expect(checkFixedPointModel({...valid, example: 'sine'})).toEqual({ok: false, issue: {kind: 'example', allowed: examples}});
        expect(checkFixedPointModel({...valid, x0: 2.01})).toEqual({ok: false, issue: {kind: 'x0', example: 'affine', min: 0, max: 2}});
        expect(checkFixedPointModel({...valid, x0: 0.123})).toMatchObject({issue: {kind: 'x0'}});
        expect(checkFixedPointModel({...valid, example: 'cosine', x0: 1.5})).toEqual({ok: false, issue: {kind: 'x0', example: 'cosine', min: 0, max: 1}});
        expect(checkFixedPointModel({...valid, step: 61})).toEqual({ok: false, issue: {kind: 'step', max: FIXED_POINT_MAX_STEPS}});
        expect(checkFixedPointModel({...valid, step: 1.5})).toMatchObject({issue: {kind: 'step'}});
        expect(checkFixedPointModel({...valid, digits: 9})).toEqual({ok: false, issue: digitsIssue});
        expect(checkFixedPointModel({...valid, digits: 0})).toEqual({ok: false, issue: digitsIssue});
        expect(checkFixedPointModel({...valid, boundVisible: 'yes'})).toEqual({ok: false, issue: {kind: 'visibility'}});
    });

    it('checks the rules in the order example, x0, step, digits, visibility', () => {
        const allBad = {example: 'sine', x0: 9, step: -1, digits: 0, boundVisible: 1};
        expect(checkFixedPointModel(allBad)).toMatchObject({issue: {kind: 'example'}});
        expect(checkFixedPointModel({...allBad, example: 'affine'})).toMatchObject({issue: {kind: 'x0'}});
        expect(checkFixedPointModel({...allBad, example: 'affine', x0: 1})).toMatchObject({issue: {kind: 'step'}});
        expect(checkFixedPointModel({...allBad, example: 'affine', x0: 1, step: 2})).toMatchObject({issue: {kind: 'digits'}});
        expect(checkFixedPointModel({...allBad, example: 'affine', x0: 1, step: 2, digits: 3})).toMatchObject({issue: {kind: 'visibility'}});
    });

    it('gives no issue for malformed data', () => {
        for (const bad of [null, undefined, 3, 'x', [], {...valid, x0: '0.5'}, {...valid, x0: undefined}, {...valid, step: NaN}, {...valid, digits: null},
            {...valid, boundVisible: undefined}, {...valid, x0: Infinity}]) {
            expect(checkFixedPointModel(bad), JSON.stringify(bad)).toEqual({ok: false, issue: undefined});
            expect(parseFixedPointModel(bad)).toBeUndefined();
        }
    });

    it('reports a missing example as an example issue, as the stored-file diagnosis always did', () => {
        expect(checkFixedPointModel({})).toMatchObject({ok: false, issue: {kind: 'example'}});
    });

    it('does not mutate the input', () => {
        const input = {...valid, extra: 'x'};
        const copy = {...input};
        checkFixedPointModel(input);
        expect(input).toEqual(copy);
    });
});

describe('fixed-point edits', () => {
    it('choosing an example loads its default model but keeps the digits; an unknown example names the known ones', () => {
        expect(chooseFixedPointExample(valid, 'cosine')).toEqual({ok: true, model: defaultFixedPointModel('cosine', 3)});
        expect(chooseFixedPointExample({...valid, digits: 5}, 'reflection')).toEqual({ok: true, model: defaultFixedPointModel('reflection', 5)});
        expect(chooseFixedPointExample(valid, 'sine')).toEqual({ok: false, issue: {kind: 'example', allowed: examples}});
    });

    it('a new start snaps arithmetic noise, returns to step 0 and is refused off the grid or outside the interval', () => {
        expect(changeFixedPointStart(valid, 0.06 + 0.01)).toEqual({ok: true, model: {...valid, x0: 0.07, step: 0}});
        expect(changeFixedPointStart(valid, 2)).toMatchObject({ok: true, model: {x0: 2}});
        for (const bad of [-0.01, 2.01, 0.005, 0.075, 0.123, NaN, Infinity, '1']) {
            expect(changeFixedPointStart(valid, bad), String(bad)).toEqual({ok: false, issue: {kind: 'x0', example: 'affine', min: 0, max: 2}});
        }
        expect(changeFixedPointStart({...valid, example: 'cosine'}, 1.5)).toMatchObject({ok: false, issue: {example: 'cosine', max: 1}});
    });

    it('an unchanged start or digits value returns the same model', () => {
        expect(modelOf(changeFixedPointStart(valid, 0.5))).toBe(valid);
        expect(modelOf(changeFixedPointDigits(valid, 3))).toBe(valid);
    });

    it('new digits return to step 0; non-integers and values outside 1..8 are refused', () => {
        expect(changeFixedPointDigits(valid, 6)).toEqual({ok: true, model: {...valid, digits: 6, step: 0}});
        for (const bad of [0, -1, 9, 2.5, NaN, Infinity, '3']) expect(changeFixedPointDigits(valid, bad), String(bad)).toEqual({ok: false, issue: digitsIssue});
    });

    it('never mutates the model it is given', () => {
        const model = {...valid};
        chooseFixedPointExample(model, 'cosine');
        changeFixedPointStart(model, 1);
        changeFixedPointDigits(model, 4);
        expect(model).toEqual(valid);
    });
});
