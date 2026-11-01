import {
    checkComplexModel, chooseComplexExample, COMPLEX_EXAMPLE_MODELS, DEFAULT_COMPLEX_MODEL, moveComplexOperand, parseComplexModel, setComplexVisibility,
    setComplexWArgument, setComplexWModulus,
} from './complexModel';
import {
    checkComplexReciprocalModel, chooseComplexReciprocalExample, DEFAULT_COMPLEX_RECIPROCAL_MODEL, moveReciprocalCentre, moveReciprocalOperand,
    parseComplexReciprocalModel, setReciprocalRadius, setReciprocalVisibility,
} from './complexReciprocalModel';
import {
    checkComplexRootsModel, chooseComplexRootsExample, DEFAULT_COMPLEX_ROOTS_MODEL, moveRootsPoint, parseComplexRootsModel, setRootsDegree, setRootsVisibility,
} from './complexRootsModel';

const frozen = <T extends object>(value: T): T => Object.freeze({...value});
const modelOf = (edit: {readonly ok: boolean; readonly model?: unknown}) => edit.model;

describe('multiplication model rules', () => {
    const valid = {...DEFAULT_COMPLEX_MODEL};

    test('a valid model is accepted and sanitized; parse agrees with check', () => {
        expect(checkComplexModel({...valid, extra: 1, zRe: 0.30000000000000004})).toEqual({ok: true, model: {...valid, zRe: 0.3}});
        expect(parseComplexModel(valid)).toEqual(valid);
        expect(parseComplexModel({...valid, zRe: 2})).toBeDefined();
        expect(parseComplexModel({...valid, zRe: -2})).toBeDefined();
        expect(parseComplexModel({...valid, zRe: 2.05})).toBeUndefined();
    });

    test('each issue kind, in the precedence example, coordinates, visibility', () => {
        expect(checkComplexModel({...valid, example: 'x'})).toEqual({ok: false, issue: {kind: 'example', allowed: expect.arrayContaining(['rotation-i'])}});
        expect(checkComplexModel({...valid, zRe: 2.05})).toEqual({ok: false, issue: {kind: 'coordinate', field: 'zRe', min: -2, max: 2}});
        expect(checkComplexModel({...valid, wIm: 0.123})).toEqual({ok: false, issue: {kind: 'coordinate', field: 'wIm', min: -2, max: 2}});
        expect(checkComplexModel({...valid, anglesVisible: 1})).toEqual({ok: false, issue: {kind: 'visibility', field: 'anglesVisible'}});
        expect(checkComplexModel({...valid, example: 'x', zRe: 9, productVisible: 1})).toMatchObject({issue: {kind: 'example'}});
        expect(checkComplexModel({...valid, wRe: 9, zIm: 9, productVisible: 1})).toMatchObject({issue: {kind: 'coordinate', field: 'zIm'}});
        expect(checkComplexModel({...valid, zRe: 9, productVisible: 1})).toMatchObject({issue: {kind: 'coordinate', field: 'zRe'}});
    });

    test('malformed data gives no issue', () => {
        for (const data of [null, undefined, 3, 'x', [], {...valid, zRe: 'a'}, {...valid, zRe: NaN}, {...valid, zRe: undefined}, {...valid, productVisible: undefined}]) {
            expect(checkComplexModel(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
            expect(parseComplexModel(data)).toBeUndefined();
        }
    });

    test('edits return the next model, the same object when nothing changes, and never mutate', () => {
        const model = frozen(valid);
        expect(modelOf(moveComplexOperand(model, 'z', model.zRe, model.zIm))).toBe(model);
        expect(moveComplexOperand(model, 'w', 0.3000000000000001, -1)).toEqual({ok: true, model: {...model, wRe: 0.3, wIm: -1}});
        expect(moveComplexOperand(model, 'z', 2.5, 0)).toEqual({ok: false, issue: {kind: 'coordinate', min: -2, max: 2}});
        expect(moveComplexOperand(model, 'z', 0, 0.123)).toMatchObject({ok: false});
        expect(chooseComplexExample('zero')).toEqual({ok: true, model: COMPLEX_EXAMPLE_MODELS.zero});
        expect(chooseComplexExample('cubic')).toMatchObject({ok: false, issue: {kind: 'example'}});
        expect(setComplexVisibility(model, 'productVisible', false)).toBe(model);
        expect(setComplexVisibility(model, 'productVisible', true)).toEqual({...model, productVisible: true});
        expect(model).toEqual(valid);
    });

    test('typed modulus and argument: range, grid, zero and no-change', () => {
        const w = {...valid, wRe: 1, wIm: 0};
        expect(setComplexWModulus(w, 2)).toEqual({ok: true, model: {...w, wRe: 2, wIm: 0}});
        expect(modelOf(setComplexWModulus(w, 1))).toBe(w);
        expect(setComplexWModulus(w, 0)).toEqual({ok: true, model: {...w, wRe: 0, wIm: 0}});
        expect(setComplexWModulus(w, -1)).toMatchObject({ok: false, issue: {kind: 'modulus-range'}});
        expect(setComplexWModulus(w, NaN)).toMatchObject({ok: false, issue: {kind: 'modulus-range'}});
        expect(setComplexWModulus(w, 2.9)).toMatchObject({ok: false, issue: {kind: 'modulus-range'}});
        expect(setComplexWModulus(w, 2.5)).toMatchObject({ok: false, issue: {kind: 'modulus-grid'}});
        expect(setComplexWArgument(w, 0)).toMatchObject({ok: true});
        expect(setComplexWArgument(w, Math.PI)).toEqual({ok: true, model: {...w, wRe: -1, wIm: 0}});
        expect(setComplexWArgument(w, 7)).toMatchObject({ok: false, issue: {kind: 'argument-range'}});
        expect(setComplexWArgument({...w, wRe: 0, wIm: 0}, 1)).toEqual({ok: false, issue: {kind: 'argument-zero'}});
        expect(setComplexWArgument({...w, wRe: 0, wIm: 0}, 9)).toMatchObject({ok: false, issue: {kind: 'argument-range'}});
        expect(setComplexWArgument({...w, wRe: 2, wIm: 2}, 0.2)).toMatchObject({ok: false, issue: {kind: 'argument-grid'}});
    });
});

describe('reciprocal model rules', () => {
    const valid = {...DEFAULT_COMPLEX_RECIPROCAL_MODEL};

    test('accepts, sanitizes and orders the issues example, coordinates, radius, visibility', () => {
        expect(checkComplexReciprocalModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseComplexReciprocalModel(valid)).toEqual(valid);
        expect(checkComplexReciprocalModel({...valid, example: 'x'})).toMatchObject({issue: {kind: 'example'}});
        expect(checkComplexReciprocalModel({...valid, centreIm: 2.5})).toEqual({ok: false, issue: {kind: 'coordinate', field: 'centreIm', min: -2, max: 2}});
        expect(checkComplexReciprocalModel({...valid, radius: 0})).toEqual({ok: false, issue: {kind: 'radius', min: 0.05, max: 2}});
        expect(checkComplexReciprocalModel({...valid, radius: 2.05})).toMatchObject({issue: {kind: 'radius'}});
        expect(checkComplexReciprocalModel({...valid, circleVisible: 'yes'})).toEqual({ok: false, issue: {kind: 'visibility', field: 'circleVisible'}});
        expect(checkComplexReciprocalModel({...valid, radius: 0, circleVisible: 'yes', zRe: 3})).toMatchObject({issue: {kind: 'coordinate', field: 'zRe'}});
        expect(checkComplexReciprocalModel({...valid, radius: 0, circleVisible: 'yes'})).toMatchObject({issue: {kind: 'radius'}});
    });

    test('malformed data gives no issue', () => {
        for (const data of [null, 3, [], {...valid, radius: undefined}, {...valid, radius: 'a'}, {...valid, quotientVisible: undefined}, {...valid, centreRe: NaN}]) {
            expect(checkComplexReciprocalModel(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
        }
    });

    test('edits: issues, normalization, identity and no mutation', () => {
        const model = frozen(valid);
        expect(modelOf(moveReciprocalOperand(model, 'z', model.zRe, model.zIm))).toBe(model);
        expect(moveReciprocalOperand(model, 'w', 0.5, -0.25)).toEqual({ok: true, model: {...model, wRe: 0.5, wIm: -0.25}});
        expect(moveReciprocalOperand(model, 'z', 3, 0)).toEqual({ok: false, issue: {kind: 'coordinate', min: -2, max: 2}});
        expect(moveReciprocalCentre(model, 0.1, 0.3)).toEqual({ok: true, model: {...model, centreRe: 0.1, centreIm: 0.3}});
        expect(modelOf(moveReciprocalCentre(model, model.centreRe, model.centreIm))).toBe(model);
        expect(moveReciprocalCentre(model, 0, 2.5)).toMatchObject({ok: false, issue: {kind: 'coordinate'}});
        expect(setReciprocalRadius(model, 0.5)).toEqual({ok: true, model: {...model, radius: 0.5}});
        expect(modelOf(setReciprocalRadius(model, 1))).toBe(model);
        for (const bad of [0, 2.05, 0.03, NaN, Infinity]) expect(setReciprocalRadius(model, bad), String(bad)).toEqual({ok: false, issue: {kind: 'radius', min: 0.05, max: 2}});
        expect(chooseComplexReciprocalExample('zero')).toMatchObject({ok: true, model: {example: 'zero', zRe: 0}});
        expect(chooseComplexReciprocalExample('cubic')).toMatchObject({ok: false, issue: {kind: 'example'}});
        expect(setReciprocalVisibility(model, 'circleVisible', false)).toBe(model);
        expect(setReciprocalVisibility(model, 'circleVisible', true)).toEqual({...model, circleVisible: true});
        expect(model).toEqual(valid);
    });
});

describe('roots model rules', () => {
    const valid = {...DEFAULT_COMPLEX_ROOTS_MODEL};

    test('accepts, sanitizes and orders the issues example, coordinates, degree, visibility', () => {
        expect(checkComplexRootsModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        expect(parseComplexRootsModel(valid)).toEqual(valid);
        expect(checkComplexRootsModel({...valid, example: 'x'})).toMatchObject({issue: {kind: 'example'}});
        expect(checkComplexRootsModel({...valid, zIm: 2.5})).toEqual({ok: false, issue: {kind: 'coordinate', field: 'zIm', min: -2, max: 2}});
        expect(checkComplexRootsModel({...valid, degree: 9})).toEqual({ok: false, issue: {kind: 'degree', min: 2, max: 8}});
        expect(checkComplexRootsModel({...valid, degree: 2.5})).toMatchObject({issue: {kind: 'degree'}});
        expect(checkComplexRootsModel({...valid, degree: 'a'})).toMatchObject({issue: {kind: 'degree'}});
        expect(checkComplexRootsModel({...valid, testVisible: 0})).toEqual({ok: false, issue: {kind: 'visibility', field: 'testVisible'}});
        expect(checkComplexRootsModel({...valid, degree: 9, testVisible: 0, wRe: 3})).toMatchObject({issue: {kind: 'coordinate', field: 'wRe'}});
        expect(checkComplexRootsModel({...valid, degree: 9, testVisible: 0})).toMatchObject({issue: {kind: 'degree'}});
    });

    test('malformed data gives no issue', () => {
        for (const data of [null, 3, [], {...valid, degree: undefined}, {...valid, polygonVisible: undefined}, {...valid, wRe: 'a'}]) {
            expect(checkComplexRootsModel(data), JSON.stringify(data)).toEqual({ok: false, issue: undefined});
        }
    });

    test('edits: issues, normalization, identity and no mutation', () => {
        const model = frozen(valid);
        expect(modelOf(moveRootsPoint(model, 'w', model.wRe, model.wIm))).toBe(model);
        expect(moveRootsPoint(model, 'z', 0.5, 0.25)).toEqual({ok: true, model: {...model, zRe: 0.5, zIm: 0.25}});
        expect(moveRootsPoint(model, 'w', 0.123, 0)).toEqual({ok: false, issue: {kind: 'coordinate', min: -2, max: 2}});
        expect(setRootsDegree(model, 5)).toEqual({ok: true, model: {...model, degree: 5}});
        expect(modelOf(setRootsDegree(model, model.degree))).toBe(model);
        for (const bad of [1, 9, 2.5, NaN]) expect(setRootsDegree(model, bad), String(bad)).toEqual({ok: false, issue: {kind: 'degree', min: 2, max: 8}});
        expect(chooseComplexRootsExample('unity')).toMatchObject({ok: true, model: {example: 'unity', degree: 4}});
        expect(chooseComplexRootsExample('cubic')).toMatchObject({ok: false, issue: {kind: 'example'}});
        expect(setRootsVisibility(model, 'rootsVisible', false)).toBe(model);
        expect(setRootsVisibility(model, 'rootsVisible', true)).toEqual({...model, rootsVisible: true});
        expect(model).toEqual(valid);
    });
});
