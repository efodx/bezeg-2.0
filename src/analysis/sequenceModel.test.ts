import {describe, expect, it} from 'vitest';
import {SEQUENCE_EXAMPLE_IDS, SEQUENCE_MAX_TERMS} from './sequence';
import {
    checkSequenceModel, chooseSequenceExample, parseSequenceModel, SEQUENCE_EXAMPLE_MODELS, SequenceModel, setSequenceEpsilon, setSequenceLimit,
    setSequenceThreshold,
} from './sequenceModel';

const valid: SequenceModel = {example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, certificateVisible: false};
const epsilon = {kind: 'epsilon', min: 0.01, max: 2, step: 0.01};
const limit = {kind: 'limit', min: -2, max: 2, step: 0.01};
const threshold = {kind: 'threshold', min: 1, max: 1000};
const terms = {kind: 'terms', min: 1, max: SEQUENCE_MAX_TERMS};
const check = (data: unknown) => checkSequenceModel(data);

describe('checkSequenceModel: one answer for a stored model', () => {
    it('accepts a valid model, every example and every boundary, and drops unknown properties', () => {
        expect(check({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseSequenceModel({...valid, extra: 1})).toEqual(valid);
        for (const model of Object.values(SEQUENCE_EXAMPLE_MODELS)) expect(parseSequenceModel(model)).toEqual(model);
        for (const model of [
            {...valid, epsilon: 0.01}, {...valid, epsilon: 2}, {...valid, limit: -2}, {...valid, limit: 2}, {...valid, threshold: 1}, {...valid, threshold: 1000},
            {...valid, terms: SEQUENCE_MAX_TERMS}, {...valid, certificateVisible: true},
        ]) expect(check(model), JSON.stringify(model)).toEqual({ok: true, model});
    });

    it('returns epsilon and the limit as canonical doubles of their hundredths', () => {
        const result = check({...valid, epsilon: 0.07 + 1e-12, limit: -1e-12});
        expect(result.ok && result.model.epsilon).toBe(0.07);
        expect(result.ok && Object.is(result.model.limit, 0)).toBe(true);
    });

    it('reports each rule with the values a message needs', () => {
        for (const example of ['harmonic', '', 4, null, undefined]) expect(check({...valid, example}), String(example)).toEqual({ok: false, issue: {kind: 'example', allowed: SEQUENCE_EXAMPLE_IDS}});
        for (const bad of [0, -0.1, 0.005, 0.015, 2.01]) expect(check({...valid, epsilon: bad}), `eps ${bad}`).toEqual({ok: false, issue: epsilon});
        for (const bad of [-2.01, 2.01, 0.333]) expect(check({...valid, limit: bad}), `limit ${bad}`).toEqual({ok: false, issue: limit});
        for (const bad of [0, 1001, 2.5]) expect(check({...valid, threshold: bad}), `threshold ${bad}`).toEqual({ok: false, issue: threshold});
        for (const bad of [0, 41, 1.5]) expect(check({...valid, terms: bad}), `terms ${bad}`).toEqual({ok: false, issue: terms});
        for (const bad of [1, 'yes', null]) expect(check({...valid, certificateVisible: bad})).toEqual({ok: false, issue: {kind: 'visibility'}});
    });

    it('reports the first broken rule: example, epsilon, limit, threshold, terms, visibility', () => {
        const broken = {example: 'x', epsilon: 0, limit: 9, threshold: 0, terms: 0, certificateVisible: 1};
        expect(check(broken)).toMatchObject({issue: {kind: 'example'}});
        expect(check({...broken, example: 'natural'})).toMatchObject({issue: {kind: 'epsilon'}});
        expect(check({...broken, example: 'natural', epsilon: 1})).toMatchObject({issue: {kind: 'limit'}});
        expect(check({...broken, example: 'natural', epsilon: 1, limit: 1})).toMatchObject({issue: {kind: 'threshold'}});
        expect(check({...broken, example: 'natural', epsilon: 1, limit: 1, threshold: 1})).toMatchObject({issue: {kind: 'terms'}});
        expect(check({...broken, example: 'natural', epsilon: 1, limit: 1, threshold: 1, terms: 1})).toMatchObject({issue: {kind: 'visibility'}});
    });

    it('gives no issue for malformed data', () => {
        for (const data of [null, undefined, 3, [], {...valid, epsilon: '0.1'}, {...valid, limit: undefined}, {...valid, threshold: NaN}, {...valid, terms: undefined}, {...valid, certificateVisible: undefined}]) {
            expect(check(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
            expect(parseSequenceModel(data)).toBeUndefined();
        }
    });
});

describe('sequence edits', () => {
    it('chooseSequenceExample loads a fresh default model', () => {
        const choice = chooseSequenceExample('natural');
        expect(choice).toEqual({ok: true, model: SEQUENCE_EXAMPLE_MODELS.natural});
        expect(choice.ok && choice.model).not.toBe(SEQUENCE_EXAMPLE_MODELS.natural);
        expect(chooseSequenceExample('harmonic')).toEqual({ok: false, issue: {kind: 'example', allowed: SEQUENCE_EXAMPLE_IDS}});
    });

    it('rejects off-grid, out-of-range and non-finite values without rounding or mutating', () => {
        const model = Object.freeze({...valid});
        for (const bad of [0, 0.015, 2.01, NaN, '0.1']) expect(setSequenceEpsilon(model, bad), String(bad)).toEqual({ok: false, issue: epsilon});
        for (const bad of [-2.01, 0.333, Infinity, undefined]) expect(setSequenceLimit(model, bad), String(bad)).toEqual({ok: false, issue: limit});
        for (const bad of [0, 1001, 2.5, NaN]) expect(setSequenceThreshold(model, bad), String(bad)).toEqual({ok: false, issue: threshold});
        expect(model).toEqual(valid);
    });

    it('accepts boundaries, cleans grid noise and returns the same object when nothing changes', () => {
        expect(setSequenceEpsilon(valid, 0.07 + 1e-12)).toEqual({ok: true, model: {...valid, epsilon: 0.07}});
        expect(setSequenceEpsilon(valid, 2)).toEqual({ok: true, model: {...valid, epsilon: 2}});
        expect(setSequenceLimit(valid, -2)).toEqual({ok: true, model: {...valid, limit: -2}});
        expect(setSequenceThreshold(valid, 1000)).toEqual({ok: true, model: {...valid, threshold: 1000}});
        for (const edit of [setSequenceEpsilon(valid, 0.1), setSequenceLimit(valid, 0), setSequenceThreshold(valid, 5)]) {
            expect(edit.ok && edit.model).toBe(valid);
        }
    });
});
