import {describe, expect, it} from 'vitest';
import {TAYLOR_DEGREE_MAX, TAYLOR_DEGREE_MIN, TAYLOR_EXAMPLE_IDS, TAYLOR_EXAMPLES} from './taylor';
import {
    checkTaylorModel, chooseTaylorExample, parseTaylorModel, setTaylorCenter, setTaylorDegree, setTaylorX, TAYLOR_EXAMPLE_MODELS, TaylorModel,
} from './taylorModel';

const valid: TaylorModel = {example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false};
const flat: TaylorModel = {...TAYLOR_EXAMPLE_MODELS.flat};
const centerOf = (example: keyof typeof TAYLOR_EXAMPLES) => ({kind: 'center', example, min: TAYLOR_EXAMPLES[example].centerMin, max: TAYLOR_EXAMPLES[example].centerMax});
const xOf = (example: keyof typeof TAYLOR_EXAMPLES) => ({kind: 'x', example, min: TAYLOR_EXAMPLES[example].xMin, max: TAYLOR_EXAMPLES[example].xMax});
const degreeIssue = {kind: 'degree', min: TAYLOR_DEGREE_MIN, max: TAYLOR_DEGREE_MAX};

describe('checkTaylorModel: one answer for a stored model', () => {
    it('accepts valid models, drops unknown properties and accepts every example model', () => {
        expect(checkTaylorModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseTaylorModel({...valid, extra: 1})).toEqual(valid);
        for (const model of Object.values(TAYLOR_EXAMPLE_MODELS)) expect(parseTaylorModel(model)).toEqual(model);
    });

    it('accepts the boundaries of every example and degrees 0 and 10', () => {
        for (const id of TAYLOR_EXAMPLE_IDS) {
            const e = TAYLOR_EXAMPLES[id];
            for (const center of [e.centerMin, e.centerMax]) for (const x of [e.xMin, e.xMax]) {
                const model = {example: id, center, degree: TAYLOR_DEGREE_MAX, x, boundVisible: true};
                expect(checkTaylorModel(model), JSON.stringify(model)).toEqual({ok: true, model});
            }
        }
        expect(parseTaylorModel({...valid, degree: 0})).toEqual({...valid, degree: 0});
    });

    it('names an unknown example and lists the allowed ones', () => {
        for (const example of ['tan', '', 'Exp', 3, null, undefined]) {
            expect(checkTaylorModel({...valid, example})).toEqual({ok: false, issue: {kind: 'example', allowed: TAYLOR_EXAMPLE_IDS}});
        }
    });

    it('names the center, degree and x rule with the example own range (flat center fixed)', () => {
        expect(checkTaylorModel({...valid, center: 2.01})).toEqual({ok: false, issue: centerOf('exp')});
        expect(checkTaylorModel({...flat, center: 0.1})).toEqual({ok: false, issue: centerOf('flat')});
        expect(centerOf('flat').min).toBe(centerOf('flat').max);
        expect(checkTaylorModel({...valid, degree: 11})).toEqual({ok: false, issue: degreeIssue});
        expect(checkTaylorModel({...valid, degree: 2.5})).toEqual({ok: false, issue: degreeIssue});
        expect(checkTaylorModel({...valid, degree: -1})).toEqual({ok: false, issue: degreeIssue});
        expect(checkTaylorModel({...valid, x: 3.01})).toEqual({ok: false, issue: xOf('exp')});
        expect(checkTaylorModel({example: 'geometric', center: 0, degree: 1, x: 1, boundVisible: false})).toEqual({ok: false, issue: xOf('geometric')});
    });

    it('reports the first broken rule: example, center, degree, x, visibility', () => {
        expect(checkTaylorModel({example: 'tan', center: 9, degree: 99, x: 9, boundVisible: 1}).ok).toBe(false);
        expect(checkTaylorModel({example: 'exp', center: 9, degree: 99, x: 9, boundVisible: 1})).toEqual({ok: false, issue: centerOf('exp')});
        expect(checkTaylorModel({example: 'exp', center: 0, degree: 99, x: 9, boundVisible: 1})).toEqual({ok: false, issue: degreeIssue});
        expect(checkTaylorModel({example: 'exp', center: 0, degree: 1, x: 9, boundVisible: 1})).toEqual({ok: false, issue: xOf('exp')});
        expect(checkTaylorModel({...valid, boundVisible: 1})).toEqual({ok: false, issue: {kind: 'visibility'}});
        expect(checkTaylorModel({...valid, boundVisible: 'true'})).toEqual({ok: false, issue: {kind: 'visibility'}});
    });

    it('gives issue undefined for malformed data', () => {
        for (const data of [null, undefined, 5, 'x', [], {example: 'exp'}, {...valid, center: NaN}, {...valid, x: Infinity}, {...valid, degree: '1'},
            {...valid, center: '0'}, {...valid, boundVisible: undefined}, {example: 'exp', center: 0, degree: 1, boundVisible: false}]) {
            const check = checkTaylorModel(data);
            expect(check, JSON.stringify(data)).toEqual({ok: false, issue: undefined});
            expect(parseTaylorModel(data)).toBeUndefined();
        }
    });
});

describe('Taylor edits', () => {
    it('chooseTaylorExample loads the example model with the bound hidden; an unknown one is refused', () => {
        expect(chooseTaylorExample('sine')).toEqual({ok: true, model: TAYLOR_EXAMPLE_MODELS.sine});
        expect(chooseTaylorExample('tan')).toEqual({ok: false, issue: {kind: 'example', allowed: TAYLOR_EXAMPLE_IDS}});
        expect(chooseTaylorExample(undefined).ok).toBe(false);
    });

    it('setTaylorCenter refuses out of range, NaN and a moved flat center; accepts the boundary and normalizes noise', () => {
        expect(setTaylorCenter(valid, 2.01)).toEqual({ok: false, issue: centerOf('exp')});
        expect(setTaylorCenter(valid, NaN)).toEqual({ok: false, issue: centerOf('exp')});
        expect(setTaylorCenter(flat, 0.1)).toEqual({ok: false, issue: centerOf('flat')});
        expect(setTaylorCenter(valid, 2)).toEqual({ok: true, model: {...valid, center: 2}});
        expect(setTaylorCenter(valid, 0.1 + 0.2)).toEqual({ok: true, model: {...valid, center: 0.3}});
    });

    it('setTaylorDegree and setTaylorX validate; no change returns the same object; input is not mutated', () => {
        expect(setTaylorDegree(valid, 11)).toEqual({ok: false, issue: degreeIssue});
        expect(setTaylorDegree(valid, 1.5)).toEqual({ok: false, issue: degreeIssue});
        expect(setTaylorDegree(valid, 10)).toEqual({ok: true, model: {...valid, degree: 10}});
        expect(setTaylorX(valid, -3.01)).toEqual({ok: false, issue: xOf('exp')});
        expect(setTaylorX(valid, Infinity)).toEqual({ok: false, issue: xOf('exp')});
        expect(setTaylorX(valid, 3)).toEqual({ok: true, model: {...valid, x: 3}});
        for (const edit of [setTaylorCenter(valid, 0), setTaylorDegree(valid, 1), setTaylorX(valid, 1), setTaylorX(valid, 1 + 1e-15)]) {
            expect(edit.ok && edit.model).toBe(valid);
        }
        expect(valid).toEqual({example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false});
    });

    it('edits keep the boundVisible flag', () => {
        const shown = {...valid, boundVisible: true};
        for (const edit of [setTaylorCenter(shown, 1), setTaylorDegree(shown, 4), setTaylorX(shown, 2)]) expect(edit.ok && edit.model.boundVisible).toBe(true);
    });
});
