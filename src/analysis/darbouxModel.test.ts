import {describe, expect, it} from 'vitest';
import {DARBOUX_EXAMPLE_IDS, DARBOUX_N_MAX, DARBOUX_N_MIN, DARBOUX_X_MAX, DARBOUX_X_MIN} from './darboux';
import {
    checkDarbouxModel, chooseDarbouxExample, DARBOUX_EXAMPLE_MODELS, DarbouxModel, DEFAULT_DARBOUX_MODEL, moveDarbouxEndpoint, parseDarbouxModel,
    refineDarbouxPartition, setDarbouxCount,
} from './darbouxModel';

const valid: DarbouxModel = {example: 'square', a: 0, b: 2, n: 4, lowerVisible: true, upperVisible: false};
const range = (...endpoints: ('a' | 'b')[]) => ({kind: 'range', endpoints, min: DARBOUX_X_MIN, max: DARBOUX_X_MAX});
const count = {kind: 'count', min: DARBOUX_N_MIN, max: DARBOUX_N_MAX};

describe('checkDarbouxModel: one answer for a stored model', () => {
    it('accepts a valid model and drops unknown properties', () => {
        expect(checkDarbouxModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseDarbouxModel({...valid, extra: 1})).toEqual(valid);
        for (const model of [DEFAULT_DARBOUX_MODEL, ...Object.values(DARBOUX_EXAMPLE_MODELS)]) expect(parseDarbouxModel(model)).toEqual(model);
    });

    it('accepts the boundary values of a, b and n', () => {
        for (const model of [
            {...valid, a: DARBOUX_X_MIN, b: DARBOUX_X_MAX}, {...valid, a: 6.99, b: DARBOUX_X_MAX}, {...valid, n: DARBOUX_N_MIN}, {...valid, n: DARBOUX_N_MAX},
        ]) expect(checkDarbouxModel(model), JSON.stringify(model)).toEqual({ok: true, model});
    });

    it('names an unknown example and lists the allowed ones', () => {
        for (const example of ['cubic', '', 3, null, undefined]) {
            expect(checkDarbouxModel({...valid, example})).toEqual({ok: false, issue: {kind: 'example', allowed: DARBOUX_EXAMPLE_IDS}});
        }
    });

    it('names the endpoints outside the range, one or both', () => {
        expect(checkDarbouxModel({...valid, a: -7.01})).toEqual({ok: false, issue: range('a')});
        expect(checkDarbouxModel({...valid, b: 7.01})).toEqual({ok: false, issue: range('b')});
        expect(checkDarbouxModel({...valid, a: -8, b: 8})).toEqual({ok: false, issue: range('a', 'b')});
    });

    it('names a failed a < b, also at equal endpoints', () => {
        for (const [a, b] of [[2, 0], [1, 1]]) expect(checkDarbouxModel({...valid, a, b})).toEqual({ok: false, issue: {kind: 'order'}});
    });

    it('names a bad count when present and gives no issue when it is missing', () => {
        for (const n of [0, -1, 129, 2.5, NaN, '4', null]) expect(checkDarbouxModel({...valid, n}), String(n)).toEqual({ok: false, issue: count});
        expect(checkDarbouxModel({...valid, n: undefined})).toEqual({ok: false, issue: undefined});
    });

    it('names a non-boolean visibility flag, but not a missing one', () => {
        for (const patch of [{lowerVisible: 1}, {upperVisible: 'yes'}, {lowerVisible: null}]) {
            expect(checkDarbouxModel({...valid, ...patch}), JSON.stringify(patch)).toEqual({ok: false, issue: {kind: 'visibility'}});
        }
        expect(checkDarbouxModel({...valid, lowerVisible: undefined})).toEqual({ok: false, issue: undefined});
    });

    it('checks rules in the order example, range, order, count, visibility', () => {
        const bad = {example: 'x', a: 9, b: 1, n: 0, lowerVisible: 1};
        expect(checkDarbouxModel(bad)).toMatchObject({issue: {kind: 'example'}});
        expect(checkDarbouxModel({...bad, example: 'sine'})).toMatchObject({issue: {kind: 'range'}});
        expect(checkDarbouxModel({...bad, example: 'sine', a: 3, b: 1})).toMatchObject({issue: {kind: 'order'}});
        expect(checkDarbouxModel({...bad, example: 'sine', a: 1, b: 3})).toMatchObject({issue: {kind: 'count'}});
        expect(checkDarbouxModel({...bad, example: 'sine', a: 1, b: 3, n: 4})).toMatchObject({issue: {kind: 'visibility'}});
    });

    it('gives no issue for malformed data', () => {
        for (const data of [null, undefined, [], 'text', 3, {example: 'sine'}, {...valid, a: '0'}, {...valid, b: undefined}, {...valid, a: NaN}, {...valid, b: Infinity}]) {
            expect(checkDarbouxModel(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
            expect(parseDarbouxModel(data)).toBeUndefined();
        }
    });
});

describe('editing a Darboux model', () => {
    it('chooses an example: its endpoints and n, keeping which sums are shown; an unknown one is refused', () => {
        const edit = chooseDarbouxExample(valid, 'sine');
        expect(edit).toEqual({ok: true, model: {...DARBOUX_EXAMPLE_MODELS.sine, lowerVisible: true, upperVisible: false}});
        expect(chooseDarbouxExample(valid, 'cubic')).toEqual({ok: false, issue: {kind: 'example', allowed: DARBOUX_EXAMPLE_IDS}});
    });

    it('moves an endpoint without mutating the model and removes only floating-point noise (pi stays exact)', () => {
        const before = {...valid};
        expect(moveDarbouxEndpoint(valid, 'a', 0.1 + 0.2)).toEqual({ok: true, model: {...valid, a: 0.3}});
        expect(moveDarbouxEndpoint(valid, 'b', Math.PI)).toEqual({ok: true, model: {...valid, b: Math.PI}});
        expect(moveDarbouxEndpoint(valid, 'a', 0.1234567891234)).toMatchObject({model: {a: 0.1234567891234}});
        expect(valid).toEqual(before);
    });

    it('changes nothing for the current value or one within noise of it (the same object)', () => {
        for (const edit of [moveDarbouxEndpoint(valid, 'a', 0), moveDarbouxEndpoint(valid, 'b', 2 + 1e-13), moveDarbouxEndpoint(valid, 'b', 2)]) {
            expect(edit.ok && edit.model).toBe(valid);
        }
    });

    it('accepts the range boundaries and refuses values just outside and non-finite ones', () => {
        expect(moveDarbouxEndpoint(valid, 'a', DARBOUX_X_MIN)).toMatchObject({ok: true});
        expect(moveDarbouxEndpoint(valid, 'b', DARBOUX_X_MAX)).toMatchObject({ok: true});
        for (const bad of [-7.01, 7.01, NaN, Infinity, -Infinity]) {
            expect(moveDarbouxEndpoint(valid, 'a', bad)).toEqual({ok: false, issue: range('a')});
            expect(moveDarbouxEndpoint(valid, 'b', bad)).toEqual({ok: false, issue: range('b')});
        }
    });

    it('refuses an endpoint that breaks a < b and names the one that moved', () => {
        for (const a of [2, 3]) expect(moveDarbouxEndpoint(valid, 'a', a)).toEqual({ok: false, issue: {kind: 'order', moving: 'a'}});
        for (const b of [0, -1]) expect(moveDarbouxEndpoint(valid, 'b', b)).toEqual({ok: false, issue: {kind: 'order', moving: 'b'}});
    });

    it('sets the count within [1, 128] and refuses other values', () => {
        expect(setDarbouxCount(valid, 8)).toEqual({ok: true, model: {...valid, n: 8}});
        for (const n of [DARBOUX_N_MIN, DARBOUX_N_MAX]) expect(setDarbouxCount(valid, n)).toMatchObject({ok: true, model: {n}});
        for (const n of [0, 129, 2.5, NaN, Infinity]) expect(setDarbouxCount(valid, n)).toEqual({ok: false, issue: count});
        const same = setDarbouxCount(valid, valid.n);
        expect(same.ok && same.model).toBe(valid);
    });

    it('refines by doubling n and refuses beyond the limit with the limit named', () => {
        expect(refineDarbouxPartition(valid)).toEqual({ok: true, model: {...valid, n: 8}});
        expect(refineDarbouxPartition({...valid, n: 64})).toMatchObject({ok: true, model: {n: 128}});
        for (const n of [65, 100, 128]) expect(refineDarbouxPartition({...valid, n}), String(n)).toEqual({ok: false, issue: {kind: 'refine-limit', max: DARBOUX_N_MAX}});
    });
});
