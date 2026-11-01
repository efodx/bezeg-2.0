import {describe, expect, it} from 'vitest';
import {UNIFORM_EPSILON_MAX, UNIFORM_EPSILON_MIN, UNIFORM_MAX_N, UNIFORM_N_MIN, UNIFORM_R_MAX, UNIFORM_R_MIN} from './uniformConvergence';
import {
    changeUniformEpsilon, changeUniformN, changeUniformR, checkUniformConvergenceModel, chooseUniformExample, DEFAULT_UNIFORM_MODEL, moveUniformX,
    parseUniformConvergenceModel, UNIFORM_EXAMPLE_MODELS, UniformConvergenceModel,
} from './uniformConvergenceModel';

const valid: UniformConvergenceModel = {example: 'power', r: 0.8, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false};
const rIssue = {kind: 'r', min: UNIFORM_R_MIN, max: UNIFORM_R_MAX};
const nIssue = {kind: 'n', min: UNIFORM_N_MIN, max: UNIFORM_MAX_N};
const epsilonIssue = {kind: 'epsilon', min: UNIFORM_EPSILON_MIN, max: UNIFORM_EPSILON_MAX};
/** The model inside an accepted edit (fails the test when the edit was refused). */
const modelOf = (edit: { ok: boolean; model?: UniformConvergenceModel }): UniformConvergenceModel => {
    if (!edit.ok || edit.model === undefined) throw new Error('the edit was refused');
    return edit.model;
};

describe('checkUniformConvergenceModel: one answer for a stored model', () => {
    it('accepts a valid model, its boundaries and drops unknown properties', () => {
        expect(checkUniformConvergenceModel({...valid, extra: 1})).toEqual({ok: true, model: valid});
        const edge = {example: 'scaled', r: 1, n: UNIFORM_MAX_N, x: 1, epsilon: 1, supremumVisible: true};
        expect(checkUniformConvergenceModel(edge)).toEqual({ok: true, model: edge});
        const low = {example: 'power', r: 0.1, n: 1, x: 0, epsilon: 0.01, supremumVisible: false};
        expect(checkUniformConvergenceModel(low)).toEqual({ok: true, model: low});
        expect(parseUniformConvergenceModel(valid)).toEqual(valid);
    });

    it('names the rule a rejected field broke', () => {
        expect(checkUniformConvergenceModel({...valid, example: 'cubic'})).toEqual({ok: false, issue: {kind: 'example', allowed: ['power', 'scaled']}});
        expect(checkUniformConvergenceModel({...valid, r: 0.07, x: 0})).toEqual({ok: false, issue: rIssue});
        expect(checkUniformConvergenceModel({...valid, r: 1.05})).toEqual({ok: false, issue: rIssue});
        expect(checkUniformConvergenceModel({...valid, n: 51})).toEqual({ok: false, issue: nIssue});
        expect(checkUniformConvergenceModel({...valid, n: 2.5})).toEqual({ok: false, issue: nIssue});
        expect(checkUniformConvergenceModel({...valid, x: 0.85})).toEqual({ok: false, issue: {kind: 'x', r: 0.8}});
        expect(checkUniformConvergenceModel({...valid, x: 0.305})).toEqual({ok: false, issue: {kind: 'x', r: 0.8}});
        expect(checkUniformConvergenceModel({...valid, epsilon: 0})).toEqual({ok: false, issue: epsilonIssue});
        expect(checkUniformConvergenceModel({...valid, supremumVisible: 1})).toEqual({ok: false, issue: {kind: 'visibility'}});
    });

    it('checks the rules in the order example, r, n, x, epsilon, visibility', () => {
        const allBad = {example: 'cubic', r: 0.07, n: 0, x: 9, epsilon: 0, supremumVisible: 'yes'};
        expect(checkUniformConvergenceModel(allBad)).toMatchObject({issue: {kind: 'example'}});
        expect(checkUniformConvergenceModel({...allBad, example: 'power'})).toMatchObject({issue: {kind: 'r'}});
        expect(checkUniformConvergenceModel({...allBad, example: 'power', r: 0.8})).toMatchObject({issue: {kind: 'n'}});
        expect(checkUniformConvergenceModel({...allBad, example: 'power', r: 0.8, n: 3})).toMatchObject({issue: {kind: 'x'}});
        expect(checkUniformConvergenceModel({...allBad, example: 'power', r: 0.8, n: 3, x: 0.5})).toMatchObject({issue: {kind: 'epsilon'}});
        expect(checkUniformConvergenceModel({...allBad, example: 'power', r: 0.8, n: 3, x: 0.5, epsilon: 0.1})).toMatchObject({issue: {kind: 'visibility'}});
    });

    it('does not judge x while r itself is invalid, and gives no issue for malformed data', () => {
        expect(checkUniformConvergenceModel({...valid, r: 0.07, x: 9})).toEqual({ok: false, issue: rIssue});
        for (const bad of [null, undefined, 5, 'x', [], {...valid, r: undefined}, {...valid, r: '0.8'}, {...valid, n: NaN}, {...valid, x: Infinity},
            {...valid, epsilon: null}, {...valid, supremumVisible: undefined}, {...valid, x: '0.5'}]) {
            expect(checkUniformConvergenceModel(bad), JSON.stringify(bad)).toEqual({ok: false, issue: undefined});
            expect(parseUniformConvergenceModel(bad)).toBeUndefined();
        }
    });

    it('reports a missing example as an example issue, as the stored-file diagnosis always did', () => {
        expect(checkUniformConvergenceModel({})).toMatchObject({ok: false, issue: {kind: 'example'}});
    });

    it('does not mutate the input', () => {
        const input = {...valid, supremumVisible: true, extra: 'x'};
        const copy = {...input};
        checkUniformConvergenceModel(input);
        expect(input).toEqual(copy);
    });
});

describe('uniform convergence edits', () => {
    it('chooses an example by loading its model, or names the known examples', () => {
        expect(chooseUniformExample('scaled')).toEqual({ok: true, model: UNIFORM_EXAMPLE_MODELS.scaled});
        expect(chooseUniformExample('power')).toEqual({ok: true, model: DEFAULT_UNIFORM_MODEL});
        for (const bad of ['cubic', '', 'Power', 3, undefined]) {
            expect(chooseUniformExample(bad)).toEqual({ok: false, issue: {kind: 'example', allowed: ['power', 'scaled']}});
        }
    });

    it('changing r keeps x only while it stays in the domain; otherwise it is refused, never clamped', () => {
        const model = {...DEFAULT_UNIFORM_MODEL, x: 0.6};
        expect(changeUniformR(model, 1)).toEqual({ok: true, model: {...model, r: 1}});
        expect(changeUniformR(model, 0.6)).toEqual({ok: true, model: {...model, r: 0.6}});
        expect(changeUniformR(model, 0.55)).toEqual({ok: false, issue: {kind: 'x-outside-domain', r: 0.55, x: 0.6, min: UNIFORM_R_MIN, max: UNIFORM_R_MAX}});
        expect(changeUniformR(model, 0.1)).toMatchObject({ok: false, issue: {kind: 'x-outside-domain', r: 0.1}});
        for (const bad of [0.77, 1.05, 0.05, NaN, Infinity, '1']) expect(changeUniformR(model, bad), String(bad)).toEqual({ok: false, issue: {...rIssue, x: 0.6}});
        expect(model.r).toBe(0.8);
    });

    it('snaps arithmetic noise on the grid, and an unchanged value returns the same model', () => {
        expect(modelOf(changeUniformR(valid, 0.35 + 0.35 + 0.1))).toBe(valid);
        expect(changeUniformR(valid, 0.9)).toEqual({ok: true, model: {...valid, r: 0.9}});
        expect(moveUniformX(valid, 0.1 + 0.2)).toEqual({ok: true, model: {...valid, x: 0.3}});
        expect(modelOf(moveUniformX(valid, 0.5))).toBe(valid);
        expect(modelOf(moveUniformX(valid, 0.5 + 1e-12))).toBe(valid);
        expect(changeUniformN(valid, 7.0000000000001)).toEqual({ok: true, model: {...valid, n: 7}});
        expect(modelOf(changeUniformN(valid, 5.0000000000001))).toBe(valid);
        expect(changeUniformEpsilon(valid, 0.07)).toEqual({ok: true, model: {...valid, epsilon: 0.07}});
        expect(modelOf(changeUniformEpsilon(valid, 0.1))).toBe(valid);
    });

    it('refuses x outside [0, r] or off the grid, n outside 1..50 or fractional, epsilon outside [0.01, 1] or off the grid', () => {
        for (const bad of [0.305, -0.01, 0.86, NaN, -Infinity]) expect(moveUniformX(valid, bad), String(bad)).toEqual({ok: false, issue: {kind: 'x', r: 0.8}});
        for (const bad of [2.5, 0, 51, NaN, Infinity]) expect(changeUniformN(valid, bad), String(bad)).toEqual({ok: false, issue: nIssue});
        for (const bad of [0.005, 0, 1.01, NaN]) expect(changeUniformEpsilon(valid, bad), String(bad)).toEqual({ok: false, issue: epsilonIssue});
        expect(moveUniformX(valid, 0.8)).toMatchObject({ok: true});
        expect(moveUniformX(valid, 0)).toMatchObject({ok: true});
        expect(changeUniformN(valid, 50)).toMatchObject({ok: true});
        expect(changeUniformN(valid, 1)).toMatchObject({ok: true});
        expect(changeUniformEpsilon(valid, 1)).toMatchObject({ok: true});
    });

    it('never mutates the model it is given', () => {
        const model = {...valid};
        changeUniformR(model, 0.9);
        changeUniformN(model, 9);
        moveUniformX(model, 0.2);
        changeUniformEpsilon(model, 0.2);
        expect(model).toEqual(valid);
    });
});
