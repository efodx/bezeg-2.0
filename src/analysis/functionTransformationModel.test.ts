import {describe, expect, it} from 'vitest';
import {
    checkFunctionTransformationModel, chooseTransformBase, DEFAULT_FUNCTION_TRANSFORMATION_MODEL, FunctionTransformationModel, moveTransformPoint,
    parseFunctionTransformationModel, ruleStepsOf, setTransformParameter, TRANSFORM_BASE_IDS, trackedPointOf, transformBaseFunction, transformedFunctionOf,
    TRANSFORM_U_MAX, TRANSFORM_U_MIN,
} from './functionTransformationModel';
import {schoolFunctionModel, TRANSFORM_BOUNDS} from './schoolFunctions';

const model = DEFAULT_FUNCTION_TRANSFORMATION_MODEL;
const range = (field: string, [min, max]: readonly [number, number]) => ({kind: 'range', field, min, max});

describe('the default model and the spec checks of S1', () => {
    it('is y = -2 (x/2 - 3/2)^2 + 1 with vertex (3, 1), x = 5 giving -1', () => {
        expect(model).toEqual({base: 'square', a: -2, b: 0.5, c: 3, d: 1, ghostVisible: true, u: 2});
        const y = schoolFunctionModel(transformedFunctionOf(model));
        expect(y.value(3)).toBeCloseTo(1, 12);
        expect(y.value(5)).toBeCloseTo(-1, 12);
        expect(y.value(2.9)).toBeLessThan(1);
        expect(y.value(3.1)).toBeLessThan(1);
    });

    it('maps the tracked point (2, 4) of f to (7, -7)', () => {
        expect(trackedPointOf(model)).toEqual({base: {x: 2, y: 4}, image: {x: 7, y: -7}});
    });

    it('lies on the transformed graph for every offered base shape (where defined)', () => {
        for (const base of TRANSFORM_BASE_IDS) {
            for (const u of [0.5, 1, 2.5]) {
                const m: FunctionTransformationModel = {...model, base, u, b: -1.5, a: 2, c: -1, d: 0.5};
                const p = trackedPointOf(m)!;
                expect(p, `${base} ${u}`).toBeDefined();
                expect(schoolFunctionModel(transformedFunctionOf(m)).value(p.image.x)!).toBeCloseTo(p.image.y, 9);
            }
        }
    });

    it('has no tracked point outside the base domain', () => {
        expect(trackedPointOf({...model, base: 'sqrt', u: -1})).toBeUndefined();
        expect(trackedPointOf({...model, base: 'reciprocal', u: 0})).toBeUndefined();
        expect(trackedPointOf({...model, base: 'ln', u: 0})).toBeUndefined();
    });

    it('offers kernel functions for every base id', () => {
        for (const id of TRANSFORM_BASE_IDS) expect(schoolFunctionModel(transformBaseFunction(id)).domain.length).toBeGreaterThan(0);
        expect(schoolFunctionModel(transformBaseFunction('exp')).value(1)).toBeCloseTo(Math.E, 12);
        expect(schoolFunctionModel(transformBaseFunction('ln')).value(Math.E)).toBeCloseTo(1, 12);
    });

    it('mirrors about x = c for b < 0', () => {
        const m = {...model, base: 'square' as const, a: 1, d: 0, b: -2};
        const y = schoolFunctionModel(transformedFunctionOf(m));
        for (const dx of [0.3, 1, 2]) expect(y.value(m.c + dx)!).toBeCloseTo(y.value(m.c - dx)!, 12);
        const cube = schoolFunctionModel(transformedFunctionOf({...m, base: 'cube', b: -1, c: 1}));
        expect(cube.value(1 + 0.5)!).toBeCloseTo(-cube.value(1 - 0.5)!, 12);
    });

    it('states the order of operations as structured steps', () => {
        expect(ruleStepsOf(model).map(s => s.kind)).toEqual(['shift-inside', 'scale-inside', 'apply-base', 'scale-outside', 'shift-outside']);
        expect(ruleStepsOf({...model, a: 1, b: 1, c: 0, d: 0}).map(s => s.kind)).toEqual(['apply-base']);
    });
});

describe('checkFunctionTransformationModel: one answer for a stored model', () => {
    it('accepts a valid model, drops unknown properties and keeps the default valid', () => {
        expect(checkFunctionTransformationModel({...model, extra: 1})).toEqual({ok: true, model});
        expect(parseFunctionTransformationModel(model)).toEqual(model);
    });

    it('accepts the boundary values of every field and every base', () => {
        for (const base of TRANSFORM_BASE_IDS) expect(parseFunctionTransformationModel({...model, base})).toEqual({...model, base});
        for (const field of ['a', 'b', 'c', 'd'] as const) {
            for (const value of TRANSFORM_BOUNDS[field]) expect(parseFunctionTransformationModel({...model, [field]: value}), `${field} ${value}`).toBeDefined();
        }
        for (const u of [TRANSFORM_U_MIN, TRANSFORM_U_MAX]) expect(parseFunctionTransformationModel({...model, u})).toBeDefined();
        expect(parseFunctionTransformationModel({...model, b: -0.5, ghostVisible: false})).toEqual({...model, b: -0.5, ghostVisible: false});
    });

    it('names an unknown base and lists the allowed ones', () => {
        for (const base of ['cosine', '', 3, null, undefined]) {
            expect(checkFunctionTransformationModel({...model, base})).toEqual({ok: false, issue: {kind: 'base', allowed: TRANSFORM_BASE_IDS}});
        }
    });

    it('rejects b = 0 with its own issue', () => {
        expect(checkFunctionTransformationModel({...model, b: 0})).toEqual({ok: false, issue: {kind: 'b-zero'}});
    });

    it('names the field outside its range', () => {
        expect(checkFunctionTransformationModel({...model, a: 10.5})).toEqual({ok: false, issue: range('a', TRANSFORM_BOUNDS.a)});
        expect(checkFunctionTransformationModel({...model, b: -11})).toEqual({ok: false, issue: range('b', TRANSFORM_BOUNDS.b)});
        expect(checkFunctionTransformationModel({...model, c: 21})).toEqual({ok: false, issue: range('c', TRANSFORM_BOUNDS.c)});
        expect(checkFunctionTransformationModel({...model, d: -21})).toEqual({ok: false, issue: range('d', TRANSFORM_BOUNDS.d)});
        expect(checkFunctionTransformationModel({...model, u: 5.1})).toEqual({ok: false, issue: range('u', [TRANSFORM_U_MIN, TRANSFORM_U_MAX])});
    });

    it('gives no issue for missing or mistyped fields and non-objects', () => {
        for (const data of [null, [], 3, 'x', {}, {...model, a: '1'}, {...model, c: NaN}, {...model, d: Infinity}, {...model, u: null}, {...model, ghostVisible: undefined}]) {
            expect(checkFunctionTransformationModel(data), JSON.stringify(data)).toEqual({ok: false, issue: base(data)});
        }
    });

    it('names a ghostVisible that is not a boolean', () => {
        expect(checkFunctionTransformationModel({...model, ghostVisible: 'yes'})).toEqual({ok: false, issue: {kind: 'visibility'}});
    });
});

/** `{}` has no base, which is itself a base issue; every other listed value has a valid base and the generic (undefined) issue. */
const base = (data: unknown) => (data !== null && typeof data === 'object' && !Array.isArray(data) && !('base' in data)
    ? {kind: 'base', allowed: TRANSFORM_BASE_IDS} : undefined);

describe('edits: reject, never clamp', () => {
    it('sets a, b, c, d and returns the same object for the same value', () => {
        const edit = setTransformParameter(model, 'c', -4);
        expect(edit).toEqual({ok: true, model: {...model, c: -4}});
        const same = setTransformParameter(model, 'a', model.a);
        expect(same.ok && same.model).toBe(model);
    });

    it('rejects b = 0 and leaves the model alone', () => {
        expect(setTransformParameter(model, 'b', 0)).toEqual({ok: false, issue: {kind: 'b-zero'}});
        expect(setTransformParameter(model, 'a', 0)).toEqual({ok: true, model: {...model, a: 0}});
    });

    it('rejects out-of-range and non-finite values with the range', () => {
        expect(setTransformParameter(model, 'd', 21)).toEqual({ok: false, issue: range('d', TRANSFORM_BOUNDS.d)});
        expect(setTransformParameter(model, 'a', NaN)).toEqual({ok: false, issue: range('a', TRANSFORM_BOUNDS.a)});
        expect(moveTransformPoint(model, -5.5)).toEqual({ok: false, issue: range('u', [TRANSFORM_U_MIN, TRANSFORM_U_MAX])});
        expect(moveTransformPoint(model, 3)).toEqual({ok: true, model: {...model, u: 3}});
    });

    it('keeps a, b, c, d, u and the ghost when the base shape changes', () => {
        const start = {...model, a: 1.5, b: -2, c: -3, d: 4, u: 1.2, ghostVisible: false};
        const edit = chooseTransformBase(start, 'abs');
        expect(edit).toEqual({ok: true, model: {...start, base: 'abs'}});
        expect(chooseTransformBase(start, 'cosine')).toEqual({ok: false, issue: {kind: 'base', allowed: TRANSFORM_BASE_IDS}});
    });
});
