import {describe, expect, it} from 'vitest';
import {
    checkFunctionInverseModel, chooseInverseRestriction, DEFAULT_FUNCTION_INVERSE_MODEL, FunctionInverseModel, hasAsymptotes, INVERSE_RESTRICTION_IDS,
    INVERSE_VALUE_MAX, INVERSE_X0_STEP, inverseSlopesOf, inversePairOf, inverseX0Range, moveInversePoint, parseFunctionInverseModel, setInverseBase,
} from './functionInverseModel';

const model = DEFAULT_FUNCTION_INVERSE_MODEL;
const at = (m: FunctionInverseModel, x0: number) => inverseSlopesOf({...m, x0});
const slope = (value: number) => ({kind: 'slope', value});

describe('the spec checks of S2', () => {
    it('defaults to x^2 on x >= 0 at x0 = 2: P = (2, 4), P\' = (4, 2), slopes 4 and 1/4', () => {
        expect(model).toEqual({restriction: 'square', base: 2, x0: 2, inverseVisible: true, tangentVisible: true});
        const s = inverseSlopesOf(model)!;
        expect(s.point).toEqual({x: 2, y: 4});
        expect(s.mirror).toEqual({x: 4, y: 2});
        expect(s.forwardSlope).toEqual(slope(4));
        expect(s.inverseSlope).toEqual(slope(0.25));
    });

    it('2^x at (3, 8) has slope 8 ln 2 and log_2 at (8, 3) has 1/(8 ln 2)', () => {
        const s = at({...model, restriction: 'exp', base: 2}, 3)!;
        expect(s.point.y).toBeCloseTo(8, 12);
        expect(s.mirror).toEqual({x: s.point.y, y: 3});
        expect((s.forwardSlope as {value: number}).value).toBeCloseTo(8 * Math.LN2, 10);
        expect((s.forwardSlope as {value: number}).value).toBeCloseTo(5.5452, 4);
        expect((s.inverseSlope as {value: number}).value).toBeCloseTo(1 / (8 * Math.LN2), 10);
        expect((s.inverseSlope as {value: number}).value).toBeCloseTo(0.18034, 5);
    });

    it('e^x at (1, e) has slope e and ln at (e, 1) has 1/e', () => {
        const s = at({...model, restriction: 'natural'}, 1)!;
        expect(s.point.y).toBeCloseTo(Math.E, 12);
        expect((s.forwardSlope as {value: number}).value).toBeCloseTo(Math.E, 10);
        expect((s.inverseSlope as {value: number}).value).toBeCloseTo(0.36788, 5);
    });

    it('the mirrored point has exactly swapped coordinates for every restriction and abscissa', () => {
        for (const restriction of INVERSE_RESTRICTION_IDS) {
            for (const x0 of [0, 0.3, 1, 2.7, 3]) {
                const s = at({...model, restriction}, x0)!;
                expect(s.mirror.x).toBe(s.point.y);
                expect(s.mirror.y).toBe(s.point.x);
            }
        }
    });

    it('the slopes at mirrored points multiply to 1 within 1e-9 (all restrictions, several bases)', () => {
        for (const base of [0.2, 0.5, 2, 3.7, 5]) {
            for (const x0 of [-3, -1, 0, 0.5, 2.5, 3]) {
                const product = at({...model, restriction: 'exp', base}, x0)!.product!;
                expect(Math.abs(product - 1)).toBeLessThan(1e-9);
            }
        }
        for (const x0 of [0.1, 1, 2, 3.9]) expect(Math.abs(at(model, x0)!.product! - 1)).toBeLessThan(1e-9);
        for (const x0 of [-3, 0, 1, 3]) expect(Math.abs(at({...model, restriction: 'natural'}, x0)!.product! - 1)).toBeLessThan(1e-9);
    });

    it('where f\' = 0 (x^2 at 0) the inverse tangent is vertical and there is no slope number and no product', () => {
        const s = at(model, 0)!;
        expect(s.point).toEqual({x: 0, y: 0});
        expect(s.forwardSlope).toEqual(slope(0));
        expect(s.inverseSlope).toEqual({kind: 'vertical'});
        expect(s.product).toBeUndefined();
    });

    it('offers only the three one-to-one restrictions', () => {
        expect(INVERSE_RESTRICTION_IDS).toEqual(['square', 'exp', 'natural']);
        expect(hasAsymptotes(model)).toBe(false);
        expect(hasAsymptotes({...model, restriction: 'natural'})).toBe(true);
        // x^2 is only defined on x >= 0 (the restriction), so the forward curve has no value left of 0
        expect(inversePairOf(model).forward.value(-1)).toBeUndefined();
    });
});

describe('validity, normalization and issues', () => {
    it('accepts the default and drops unknown properties', () => {
        expect(parseFunctionInverseModel({...model, extra: 1})).toEqual(model);
    });

    it('rejects base 1 as its own issue and never clamps a base outside [0.2, 5]', () => {
        expect(setInverseBase(model, 1)).toEqual({ok: false, issue: {kind: 'base-one'}});
        expect(setInverseBase(model, 5.5)).toEqual({ok: false, issue: {kind: 'range', field: 'base', min: 0.2, max: 5}});
        expect(setInverseBase(model, 0.1)).toMatchObject({ok: false});
        expect(setInverseBase(model, NaN)).toMatchObject({ok: false});
        expect(setInverseBase(model, 0.2)).toMatchObject({ok: true});
        expect(setInverseBase(model, 5)).toMatchObject({ok: true});
        expect(setInverseBase(model, 2).ok && (setInverseBase(model, 2) as {model: unknown}).model).toBe(model);
    });

    it('rejects x0 outside the range of the restriction and base (x^2: 0 <= x0 <= 2.8; 2^x: -3 <= x0 <= 3)', () => {
        expect(moveInversePoint(model, -0.1)).toEqual({ok: false, issue: {kind: 'range', field: 'x0', min: 0, max: 2.8}});
        expect(moveInversePoint(model, 2.8)).toMatchObject({ok: true});
        expect(moveInversePoint(model, 2.9)).toMatchObject({ok: false});
        expect(moveInversePoint({...model, restriction: 'exp'}, -2)).toMatchObject({ok: true});
        expect(moveInversePoint({...model, restriction: 'exp'}, -3.1)).toEqual({ok: false, issue: {kind: 'range', field: 'x0', min: -3, max: 3}});
        // the review's cases: a = 5, x0 = 3 gave P = (3, 125); a = 0.2, x0 = -3 gave P' = (125, -3)
        expect(moveInversePoint({...model, restriction: 'exp', base: 5}, 3)).toEqual({ok: false, issue: {kind: 'range', field: 'x0', min: -3, max: 1.2}});
        expect(moveInversePoint({...model, restriction: 'exp', base: 0.2}, -3)).toEqual({ok: false, issue: {kind: 'range', field: 'x0', min: -1.2, max: 3}});
        expect(inverseX0Range('natural', 2)).toEqual([-3, 2]);
    });

    it('every range keeps f(x0) <= 8 and x0 >= -3, on the grid, and ends where the next grid step would leave the view', () => {
        const bases = [0.2, 0.25, 0.5, 0.9, 0.99, 1.01, 1.1, 2, Math.E, 3, 4.9, 5];
        const cases = [{restriction: 'square' as const, base: 2}, {restriction: 'natural' as const, base: 2}, ...bases.map(base => ({restriction: 'exp' as const, base}))];
        for (const c of cases) {
            const m: FunctionInverseModel = {...model, ...c};
            const f = inversePairOf(m).forward.value;
            const [min, max] = inverseX0Range(c.restriction, c.base);
            expect(min).toBeLessThanOrEqual(0);
            expect(max).toBeGreaterThanOrEqual(1.2);
            for (const end of [min, max]) {
                expect(Math.abs(end / INVERSE_X0_STEP - Math.round(end / INVERSE_X0_STEP))).toBeLessThan(1e-9);
                expect(end).toBeGreaterThanOrEqual(-3);
                expect(f(end)!).toBeLessThanOrEqual(INVERSE_VALUE_MAX);
            }
            if (max < (c.restriction === 'square' ? 4 : 3)) expect(f(max + INVERSE_X0_STEP)!).toBeGreaterThan(INVERSE_VALUE_MAX);
            if (min > -3 && c.restriction !== 'square') expect(f(min - INVERSE_X0_STEP)!).toBeGreaterThan(INVERSE_VALUE_MAX);
        }
    });

    it('a base edit keeps x0 when it is still in range, else moves it to the nearer end of the new range', () => {
        const exp: FunctionInverseModel = {...model, restriction: 'exp', x0: 3};
        expect(setInverseBase(exp, 1.5)).toEqual({ok: true, model: {...exp, base: 1.5}});
        expect(setInverseBase(exp, 5)).toEqual({ok: true, model: {...exp, base: 5, x0: 1.2}});
        expect(setInverseBase({...exp, x0: -3}, 0.2)).toEqual({ok: true, model: {...exp, base: 0.2, x0: -1.2}});
        expect(setInverseBase({...exp, x0: -3}, 5)).toEqual({ok: true, model: {...exp, base: 5, x0: -3}});
    });

    it('changing the restriction keeps the base and x0 when valid, else moves x0 to the restriction default', () => {
        expect(chooseInverseRestriction({...model, base: 1.5}, 'exp')).toEqual({ok: true, model: {...model, base: 1.5, restriction: 'exp'}});
        expect(chooseInverseRestriction({...model, base: 3.5}, 'exp')).toEqual({ok: true, model: {...model, base: 3.5, restriction: 'exp', x0: 1}});
        expect(chooseInverseRestriction({...model, restriction: 'exp', x0: -2}, 'square')).toMatchObject({ok: true, model: {restriction: 'square', x0: 2}});
        expect(chooseInverseRestriction({...model, x0: 2}, 'natural')).toMatchObject({ok: true, model: {restriction: 'natural', x0: 2}});
        // x0 = 2.5 is on x^2 (6.25) but outside the range of e^x (e^2.5 > 8)
        expect(chooseInverseRestriction({...model, x0: 2.5}, 'natural')).toMatchObject({ok: true, model: {restriction: 'natural', x0: 1}});
        expect(chooseInverseRestriction({...model, restriction: 'exp', base: 0.2, x0: 2.5}, 'square')).toMatchObject({ok: true, model: {restriction: 'square', x0: 2.5}});
        expect(chooseInverseRestriction({...model, restriction: 'exp', base: 0.2, x0: 3}, 'square')).toMatchObject({ok: true, model: {restriction: 'square', x0: 2}});
        expect(chooseInverseRestriction(model, 'sin')).toEqual({ok: false, issue: {kind: 'restriction', allowed: INVERSE_RESTRICTION_IDS}});
    });

    it('reports the first rule a stored model breaks, and no issue for wrong types', () => {
        const issue = (data: unknown) => { const c = checkFunctionInverseModel(data); return c.ok ? 'ok' : c.issue; };
        expect(issue({...model, restriction: 'log'})).toEqual({kind: 'restriction', allowed: INVERSE_RESTRICTION_IDS});
        expect(issue({...model, base: 1})).toEqual({kind: 'base-one'});
        expect(issue({...model, base: 6})).toMatchObject({kind: 'range', field: 'base'});
        expect(issue({...model, x0: -1})).toMatchObject({kind: 'range', field: 'x0', min: 0, max: 2.8});
        expect(issue({...model, restriction: 'exp', base: 5, x0: 3})).toEqual({kind: 'range', field: 'x0', min: -3, max: 1.2});
        expect(issue({...model, inverseVisible: 'yes'})).toEqual({kind: 'visibility', field: 'inverseVisible'});
        expect(issue({...model, tangentVisible: 1})).toEqual({kind: 'visibility', field: 'tangentVisible'});
        for (const bad of [null, [], {...model, base: '2'}, {...model, x0: NaN}, {restriction: 'square', base: 2, x0: 2, tangentVisible: true}]) expect(issue(bad)).toBeUndefined();
    });
});
