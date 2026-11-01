import {describe, expect, it} from 'vitest';
import {BISECTION_BOUND_MAX, BISECTION_BOUND_MIN, BISECTION_EXAMPLE_IDS, BISECTION_EXAMPLES, BISECTION_MAX_STEPS} from './bisection';
import {BisectionModel, checkBisectionModel, chooseBisectionExample, DEFAULT_BISECTION_MODEL, moveBisectionEndpoint, parseBisectionModel} from './bisectionModel';

const valid: BisectionModel = {example: 'square-minus-two', a: 0, b: 2, step: 3};
const range = (...endpoints: ('a' | 'b')[]) => ({kind: 'range', endpoints, min: BISECTION_BOUND_MIN, max: BISECTION_BOUND_MAX});

describe('checkBisectionModel: one answer for a stored model', () => {
    it('accepts a valid model, drops unknown properties and keeps the default valid', () => {
        expect(checkBisectionModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseBisectionModel({...valid, extra: 1})).toEqual(valid);
        expect(parseBisectionModel(DEFAULT_BISECTION_MODEL)).toEqual(DEFAULT_BISECTION_MODEL);
    });

    it('accepts the boundary values of a, b and step', () => {
        for (const model of [
            {...valid, a: BISECTION_BOUND_MIN, b: BISECTION_BOUND_MAX}, {...valid, a: 3.99, b: BISECTION_BOUND_MAX}, {...valid, step: 0},
            {...valid, step: BISECTION_MAX_STEPS},
        ]) expect(checkBisectionModel(model), JSON.stringify(model)).toEqual({ok: true, model});
    });

    it('names an unknown example and lists the allowed ones', () => {
        for (const example of ['sine', '', 3, null, undefined, {}]) {
            expect(checkBisectionModel({...valid, example})).toEqual({ok: false, issue: {kind: 'example', allowed: BISECTION_EXAMPLE_IDS}});
        }
    });

    it('names the endpoints outside the range, one or both', () => {
        expect(checkBisectionModel({...valid, a: -4.01})).toEqual({ok: false, issue: range('a')});
        expect(checkBisectionModel({...valid, b: 4.01})).toEqual({ok: false, issue: range('b')});
        expect(checkBisectionModel({...valid, a: -5, b: 5})).toEqual({ok: false, issue: range('a', 'b')});
    });

    it('names a failed a < b, also at equal endpoints', () => {
        for (const [a, b] of [[2, 0], [1, 1], [4, -4]]) expect(checkBisectionModel({...valid, a, b})).toEqual({ok: false, issue: {kind: 'order'}});
    });

    it('names a bad step count', () => {
        for (const step of [-1, 1.5, BISECTION_MAX_STEPS + 1, NaN, '3', null]) {
            expect(checkBisectionModel({...valid, step}), String(step)).toEqual({ok: false, issue: {kind: 'step', max: BISECTION_MAX_STEPS}});
        }
    });

    it('checks rules in the order example, range, order, step', () => {
        expect(checkBisectionModel({example: 'x', a: 9, b: 1, step: -1})).toMatchObject({issue: {kind: 'example'}});
        expect(checkBisectionModel({...valid, a: 9, b: 1, step: -1})).toMatchObject({issue: {kind: 'range'}});
        expect(checkBisectionModel({...valid, a: 3, b: 1, step: -1})).toMatchObject({issue: {kind: 'order'}});
    });

    it('gives no issue for malformed data (wrong type, missing field, non-finite number, not an object)', () => {
        for (const data of [null, undefined, [], 'text', 3, {example: 'cubic'}, {...valid, a: '0'}, {...valid, b: undefined}, {...valid, a: NaN},
            {...valid, b: Infinity}, {example: valid.example, a: 0, b: 2}]) {
            expect(checkBisectionModel(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
            expect(parseBisectionModel(data)).toBeUndefined();
        }
    });
});

describe('editing a bisection model', () => {
    it('chooses an example: its default bracket, step 0; an unknown one is refused', () => {
        for (const id of BISECTION_EXAMPLE_IDS) {
            const {defaultA, defaultB} = BISECTION_EXAMPLES[id];
            expect(chooseBisectionExample(id)).toEqual({ok: true, model: {example: id, a: defaultA, b: defaultB, step: 0}});
        }
        for (const bad of ['quartic', '', 1, null]) expect(chooseBisectionExample(bad)).toEqual({ok: false, issue: {kind: 'example', allowed: BISECTION_EXAMPLE_IDS}});
    });

    it('moves an endpoint, returns the iteration to its start and does not mutate the model', () => {
        const before = {...valid};
        expect(moveBisectionEndpoint(valid, 'a', 1)).toEqual({ok: true, model: {...valid, a: 1, step: 0}});
        expect(moveBisectionEndpoint(valid, 'b', 3)).toEqual({ok: true, model: {...valid, b: 3, step: 0}});
        expect(valid).toEqual(before);
    });

    it('changes nothing for the current value (the same object, the step kept)', () => {
        const a = moveBisectionEndpoint(valid, 'a', valid.a), b = moveBisectionEndpoint(valid, 'b', valid.b);
        expect(a.ok && a.model).toBe(valid);
        expect(b.ok && b.model).toBe(valid);
    });

    it('accepts the range boundaries and refuses values just outside and non-finite ones', () => {
        expect(moveBisectionEndpoint(valid, 'a', BISECTION_BOUND_MIN)).toMatchObject({ok: true});
        expect(moveBisectionEndpoint(valid, 'b', BISECTION_BOUND_MAX)).toMatchObject({ok: true});
        for (const bad of [-4.01, 4.01, NaN, Infinity, -Infinity]) {
            expect(moveBisectionEndpoint(valid, 'a', bad)).toEqual({ok: false, issue: range('a')});
            expect(moveBisectionEndpoint(valid, 'b', bad)).toEqual({ok: false, issue: range('b')});
        }
    });

    it('refuses an endpoint that breaks a < b and names the one that moved', () => {
        for (const a of [2, 2.5]) expect(moveBisectionEndpoint(valid, 'a', a)).toEqual({ok: false, issue: {kind: 'order', moving: 'a'}});
        for (const b of [0, -1]) expect(moveBisectionEndpoint(valid, 'b', b)).toEqual({ok: false, issue: {kind: 'order', moving: 'b'}});
    });
});
