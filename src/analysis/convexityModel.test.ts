import {describe, expect, it} from 'vitest';
import {CONVEXITY_EXAMPLE_IDS, CONVEXITY_X_MAX, CONVEXITY_X_MIN} from './convexity';
import {
    checkConvexityModel, chooseConvexityExample, CONVEXITY_EXAMPLE_MODELS, ConvexityModel, DEFAULT_CONVEXITY_MODEL, moveConvexityPoint, parseConvexityModel,
} from './convexityModel';

const valid: ConvexityModel = {example: 'square', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false};
const range = (...points: ('a' | 'b' | 't')[]) => ({kind: 'range', points, min: CONVEXITY_X_MIN, max: CONVEXITY_X_MAX});

describe('checkConvexityModel: one answer for a stored model', () => {
    it('accepts a valid model and drops unknown properties', () => {
        expect(checkConvexityModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseConvexityModel({...valid, extra: 1})).toEqual(valid);
        for (const model of Object.values(CONVEXITY_EXAMPLE_MODELS)) expect(parseConvexityModel(model)).toEqual(model);
    });

    it('accepts every boundary value of a, b and t and a barely proper interval', () => {
        for (const model of [
            {...valid, a: CONVEXITY_X_MIN, b: CONVEXITY_X_MAX, t: CONVEXITY_X_MIN}, {...valid, a: CONVEXITY_X_MIN, b: CONVEXITY_X_MAX, t: CONVEXITY_X_MAX},
            {...valid, a: 1.99, b: CONVEXITY_X_MAX}, {...valid, a: CONVEXITY_X_MIN, b: -1.99}, {...valid, secondDerivativeVisible: true},
        ]) expect(checkConvexityModel(model), JSON.stringify(model)).toEqual({ok: true, model});
    });

    it('names an unknown example and lists the allowed ones', () => {
        for (const example of ['sine', '', 'Square', 3, null, undefined]) {
            expect(checkConvexityModel({...valid, example}), String(example)).toEqual({ok: false, issue: {kind: 'example', allowed: CONVEXITY_EXAMPLE_IDS}});
        }
        // an object without the field is reported the same way
        expect(checkConvexityModel({})).toEqual({ok: false, issue: {kind: 'example', allowed: CONVEXITY_EXAMPLE_IDS}});
    });

    it('names the points outside the range, at the boundary and beyond it', () => {
        expect(checkConvexityModel({...valid, a: -2.01})).toEqual({ok: false, issue: range('a')});
        expect(checkConvexityModel({...valid, b: 2.01})).toEqual({ok: false, issue: range('b')});
        expect(checkConvexityModel({...valid, t: 2.5})).toEqual({ok: false, issue: range('t')});
        expect(checkConvexityModel({...valid, a: -3, b: 3, t: -3})).toEqual({ok: false, issue: range('a', 'b', 't')});
        // the range wins over the order
        expect(checkConvexityModel({...valid, a: 5, b: 1})).toEqual({ok: false, issue: range('a')});
    });

    it('names a violated order a < b: equal and reversed endpoints', () => {
        for (const [a, b] of [[1, 1], [2, -1], [CONVEXITY_X_MAX, CONVEXITY_X_MAX], [0.5, 0.25]]) {
            expect(checkConvexityModel({...valid, a, b}), `${a}, ${b}`).toEqual({ok: false, issue: {kind: 'order'}});
        }
    });

    it('names a visibility flag of the wrong type', () => {
        for (const secondDerivativeVisible of ['true', 1, 0, null, {}]) {
            expect(checkConvexityModel({...valid, secondDerivativeVisible}), String(secondDerivativeVisible)).toEqual({ok: false, issue: {kind: 'visibility'}});
        }
    });

    it('gives no rule for malformed data (the generic message applies): wrong types, non-finite numbers and missing fields', () => {
        const {a: _a, ...withoutA} = valid;
        const {secondDerivativeVisible: _v, ...withoutVisible} = valid;
        for (const data of [null, undefined, [], 'x', 5, {example: 'square'}, withoutA, withoutVisible, {...valid, a: '0'}, {...valid, t: '0'}, {...valid, b: null},
            {...valid, a: NaN}, {...valid, b: Infinity}, {...valid, t: -Infinity}, [valid]]) {
            expect(checkConvexityModel(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
            expect(parseConvexityModel(data)).toBeUndefined();
        }
    });

    it('keeps the first broken rule in the order example, range, order, visibility', () => {
        expect(checkConvexityModel({example: 'x', a: 9, b: 1, t: 0, secondDerivativeVisible: 'y'})).toMatchObject({issue: {kind: 'example'}});
        expect(checkConvexityModel({...valid, a: 9, b: 1, secondDerivativeVisible: 'y'})).toMatchObject({issue: {kind: 'range'}});
        expect(checkConvexityModel({...valid, a: 1, b: 0, secondDerivativeVisible: 'y'})).toMatchObject({issue: {kind: 'order'}});
        // a field of the wrong type hides the range and order rules, as before: the visibility rule still applies
        expect(checkConvexityModel({...valid, a: '0', secondDerivativeVisible: 'y'})).toMatchObject({issue: {kind: 'visibility'}});
    });
});

describe('chooseConvexityExample', () => {
    it('loads the example model with the second derivative hidden', () => {
        for (const id of CONVEXITY_EXAMPLE_IDS) expect(chooseConvexityExample(id)).toEqual({ok: true, model: {...CONVEXITY_EXAMPLE_MODELS[id], secondDerivativeVisible: false}});
        expect(chooseConvexityExample('cube')).toMatchObject({model: {example: 'cube', a: -1, b: 1.5, t: 0.5}});
    });

    it('rejects anything else with the list of examples', () => {
        for (const value of ['sine', '', 'Square', 1, null, undefined]) {
            expect(chooseConvexityExample(value), String(value)).toEqual({ok: false, issue: {kind: 'example', allowed: CONVEXITY_EXAMPLE_IDS}});
        }
    });
});

describe('moveConvexityPoint', () => {
    const model = DEFAULT_CONVEXITY_MODEL; // a = -1, b = 1.5, t = 0.5

    it('moves a, b and t to valid values, including the boundaries, and leaves the other fields alone', () => {
        expect(moveConvexityPoint(model, 'a', CONVEXITY_X_MIN)).toEqual({ok: true, model: {...model, a: CONVEXITY_X_MIN}});
        expect(moveConvexityPoint(model, 'a', 1.49)).toEqual({ok: true, model: {...model, a: 1.49}});
        expect(moveConvexityPoint(model, 'b', CONVEXITY_X_MAX)).toEqual({ok: true, model: {...model, b: CONVEXITY_X_MAX}});
        expect(moveConvexityPoint(model, 'b', -0.99)).toEqual({ok: true, model: {...model, b: -0.99}});
        expect(moveConvexityPoint(model, 't', CONVEXITY_X_MAX)).toEqual({ok: true, model: {...model, t: CONVEXITY_X_MAX}});
        expect(moveConvexityPoint(model, 't', CONVEXITY_X_MIN)).toEqual({ok: true, model: {...model, t: CONVEXITY_X_MIN}});
        // t is independent of a and b
        expect(moveConvexityPoint(model, 't', 2)).toMatchObject({ok: true, model: {a: -1, b: 1.5, t: 2}});
    });

    it('rejects, never clamps, a value outside the range or not finite', () => {
        for (const point of ['a', 'b', 't'] as const) {
            for (const value of [CONVEXITY_X_MIN - 0.01, CONVEXITY_X_MAX + 0.01, -5, 5, NaN, Infinity, -Infinity]) {
                expect(moveConvexityPoint(model, point, value), `${point} = ${value}`).toEqual({ok: false, issue: range(point)});
            }
        }
    });

    it('rejects an endpoint that would break a < b, naming the endpoint that was moved', () => {
        for (const a of [1.5, 1.6, 2]) expect(moveConvexityPoint(model, 'a', a), `a = ${a}`).toEqual({ok: false, issue: {kind: 'order', moving: 'a'}});
        for (const b of [-1, -1.5, -2]) expect(moveConvexityPoint(model, 'b', b), `b = ${b}`).toEqual({ok: false, issue: {kind: 'order', moving: 'b'}});
        // t has no order rule
        expect(moveConvexityPoint(model, 't', 1.5)).toMatchObject({ok: true});
    });

    it('normalizes an accepted value and returns the same model when nothing changes', () => {
        expect(moveConvexityPoint(model, 'a', 0.1 + 0.2)).toMatchObject({ok: true, model: {a: 0.3}});
        const zero = moveConvexityPoint(model, 't', -0);
        expect(zero.ok && Object.is(zero.model.t, 0)).toBe(true);
        for (const point of ['a', 'b', 't'] as const) {
            const same = moveConvexityPoint(model, point, model[point] + 1e-12);
            expect(same.ok && same.model, point).toBe(model);
        }
    });

    it('does not mutate its input', () => {
        const frozen = Object.freeze({...model});
        expect(moveConvexityPoint(frozen, 'a', 0)).toMatchObject({ok: true, model: {a: 0}});
        expect(frozen).toEqual(model);
    });
});
