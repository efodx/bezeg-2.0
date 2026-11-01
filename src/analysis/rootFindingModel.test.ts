import {describe, expect, it} from 'vitest';
import {newtonHistory, ROOT_FINDING_EXAMPLE_IDS, ROOT_FINDING_EXAMPLES, ROOT_FINDING_MAX_STEPS, ROOT_START_MAX, ROOT_START_MIN, secantHistory} from './rootFinding';
import {
    checkRootFindingModel, chooseRootFindingExample, chooseRootFindingMethod, DEFAULT_ROOT_FINDING_MODEL, moveRootFindingStart, parseRootFindingModel,
    ROOT_FINDING_METHODS, rootFindingHistoryOf, RootFindingModel,
} from './rootFindingModel';

const newton: RootFindingModel = {method: 'newton', example: 'square-minus-two', x0: 1, x1: 2, step: 3};
const secant: RootFindingModel = {...newton, method: 'secant'};
const range = (...starts: ('x0' | 'x1')[]) => ({kind: 'range', starts, min: ROOT_START_MIN, max: ROOT_START_MAX});

describe('checkRootFindingModel: one answer for a stored model', () => {
    it('accepts a valid model, drops unknown properties and keeps the default valid', () => {
        expect(checkRootFindingModel({...newton, extra: 1})).toEqual({ok: true, model: newton});
        expect(parseRootFindingModel({...secant, extra: 1})).toEqual(secant);
        expect(parseRootFindingModel(DEFAULT_ROOT_FINDING_MODEL)).toEqual(DEFAULT_ROOT_FINDING_MODEL);
    });

    it('accepts the boundary values of the starts and the step', () => {
        for (const model of [
            {...newton, x0: ROOT_START_MIN, x1: ROOT_START_MAX}, {...secant, x0: ROOT_START_MAX, x1: ROOT_START_MIN}, {...newton, step: 0},
            {...newton, step: ROOT_FINDING_MAX_STEPS}, {...newton, x0: 2, x1: 2}, // equal starts are fine for Newton, which ignores x1
        ]) expect(checkRootFindingModel(model), JSON.stringify(model)).toEqual({ok: true, model});
    });

    it('names an unknown method or example and lists the allowed ones', () => {
        for (const method of ['bisection', '', 3, null, undefined]) {
            expect(checkRootFindingModel({...newton, method})).toEqual({ok: false, issue: {kind: 'method', allowed: ROOT_FINDING_METHODS}});
        }
        for (const example of ['sine', '', 3, null, undefined]) {
            expect(checkRootFindingModel({...newton, example})).toEqual({ok: false, issue: {kind: 'example', allowed: ROOT_FINDING_EXAMPLE_IDS}});
        }
    });

    it('names the starts outside the range, one or both', () => {
        expect(checkRootFindingModel({...newton, x0: -4.01})).toEqual({ok: false, issue: range('x0')});
        expect(checkRootFindingModel({...secant, x1: 4.01})).toEqual({ok: false, issue: range('x1')});
        expect(checkRootFindingModel({...newton, x0: 5, x1: -5})).toEqual({ok: false, issue: range('x0', 'x1')});
    });

    it('rejects equal secant starts only', () => {
        expect(checkRootFindingModel({...secant, x0: 1.5, x1: 1.5})).toEqual({ok: false, issue: {kind: 'equal-starts'}});
    });

    it('names a step that is not an integer in [0, 60]', () => {
        for (const step of [-1, 1.5, ROOT_FINDING_MAX_STEPS + 1, '2', null]) {
            expect(checkRootFindingModel({...newton, step}), String(step)).toEqual({ok: false, issue: {kind: 'step', max: ROOT_FINDING_MAX_STEPS}});
        }
    });

    it('rejects malformed data', () => {
        for (const data of [undefined, null, 'x', 3, [], {}, {...newton, x0: '1'}, {...newton, x1: NaN}, {...newton, x0: Infinity}, {...newton, step: undefined},
            {method: 'newton', example: 'square-minus-two'}]) {
            const check = checkRootFindingModel(data);
            expect(check.ok, JSON.stringify(data)).toBe(false);
            expect(parseRootFindingModel(data)).toBeUndefined();
        }
    });
});

describe('root-finding edits', () => {
    it('loads the default starts of an example, keeps the method and returns to step 0', () => {
        for (const id of ROOT_FINDING_EXAMPLE_IDS) {
            const {defaultStart, defaultSecondStart} = ROOT_FINDING_EXAMPLES[id];
            expect(chooseRootFindingExample(secant, id)).toEqual({
                ok: true, model: {method: 'secant', example: id, x0: defaultStart, x1: defaultSecondStart, step: 0},
            });
        }
        expect(chooseRootFindingExample(newton, 'quartic')).toEqual({ok: false, issue: {kind: 'example', allowed: ROOT_FINDING_EXAMPLE_IDS}});
    });

    it('a method switch keeps the example and the starts, clears the step, and changes nothing for the same method', () => {
        expect(chooseRootFindingMethod(newton, 'secant')).toEqual({ok: true, model: {...newton, method: 'secant', step: 0}});
        expect(chooseRootFindingMethod(secant, 'newton')).toEqual({ok: true, model: {...secant, method: 'newton', step: 0}});
        const same = chooseRootFindingMethod(newton, 'newton');
        expect(same.ok && same.model).toBe(newton);
        expect(chooseRootFindingMethod(newton, 'halley')).toEqual({ok: false, issue: {kind: 'method', allowed: ROOT_FINDING_METHODS}});
        // equal starts are legal for Newton but cannot start a secant run
        expect(chooseRootFindingMethod({...newton, x0: 2, x1: 2}, 'secant')).toEqual({ok: false, issue: {kind: 'equal-starts'}});
    });

    it('moving a start returns to step 0, rejects (never clamps) an invalid value, and the same value is no edit', () => {
        expect(moveRootFindingStart(newton, 'x0', 0.5)).toEqual({ok: true, model: {...newton, x0: 0.5, step: 0}});
        expect(moveRootFindingStart(secant, 'x1', -3)).toEqual({ok: true, model: {...secant, x1: -3, step: 0}});
        for (const value of [4.01, -4.01, NaN, Infinity, -Infinity]) {
            expect(moveRootFindingStart(newton, 'x0', value)).toEqual({ok: false, issue: range('x0')});
        }
        const same = moveRootFindingStart(newton, 'x1', 2);
        expect(same.ok && same.model).toBe(newton);
    });

    it('the secant method rejects a start equal to the other one; Newton allows it', () => {
        expect(moveRootFindingStart(secant, 'x0', 2)).toEqual({ok: false, issue: {kind: 'equal-starts', moving: 'x0'}});
        expect(moveRootFindingStart(secant, 'x1', 1)).toEqual({ok: false, issue: {kind: 'equal-starts', moving: 'x1'}});
        expect(moveRootFindingStart(newton, 'x0', 2)).toEqual({ok: true, model: {...newton, x0: 2, step: 0}});
    });
});

describe('rootFindingHistoryOf: recomputed from the kernel', () => {
    it('Newton and secant models give the kernel histories of their fields', () => {
        expect(rootFindingHistoryOf(newton)).toEqual(newtonHistory('square-minus-two', 1, 3));
        expect(rootFindingHistoryOf(secant)).toEqual(secantHistory('square-minus-two', 1, 2, 3));
        // Newton for x^2 - 2 from 1: 1, 3/2, 17/12, 577/408
        expect(rootFindingHistoryOf(newton).iterates[3]).toBeCloseTo(577 / 408, 12);
    });
});
