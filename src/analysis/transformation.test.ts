import {describe, expect, it} from 'vitest';
import {schoolFunctionModel, POWER_SHAPES, NAMED_IDS, type SchoolBaseFunction} from './schoolFunctions';
import {checkTransformParams, composedRule, mapPoint, trackedPoint, transformedFunction} from './transformation';

const shapes: SchoolBaseFunction[] = [
    ...POWER_SHAPES.map(shape => ({kind: 'power', shape}) as const),
    ...NAMED_IDS.map(id => ({kind: 'named', id}) as const),
    {kind: 'exp', base: 2},
    {kind: 'log', base: 3},
];
const params = {a: -2, b: 0.5, c: 3, d: 1};

describe('tracked point map', () => {
    it('matches the transformed model for every catalogue shape', () => {
        for (const base of shapes) {
            const fn = transformedFunction(base, params);
            const m = schoolFunctionModel(fn);
            let checked = 0;
            for (const u of [-3, -1.5, 0.5, 1, 2, 4.5]) {
                const t = trackedPoint(base, params, u);
                if (!t) continue;
                checked++;
                expect(t.image.x).toBeCloseTo(u / params.b + params.c, 12);
                expect(m.value(t.image.x)).toBeCloseTo(t.image.y, 9);
            }
            expect(checked).toBeGreaterThan(0);
        }
    });

    it('reproduces the spec defaults', () => {
        const sq: SchoolBaseFunction = {kind: 'power', shape: 'square'};
        expect(mapPoint(params, 2, 4)).toEqual({x: 7, y: -7});
        expect(mapPoint(params, 0, 0)).toEqual({x: 3, y: 1});
        expect(schoolFunctionModel(transformedFunction(sq, params)).value(5)).toBeCloseTo(-1, 12);
    });

    it('is undefined outside the base domain', () => {
        expect(trackedPoint({kind: 'power', shape: 'sqrt'}, params, -1)).toBeUndefined();
    });

    it('rejects b = 0 and out-of-range parameters', () => {
        expect(checkTransformParams({...params, b: 0})).toBe('b-zero');
        expect(mapPoint({...params, b: 0}, 1, 1)).toBeUndefined();
        expect(checkTransformParams({...params, b: -0})).toBe('b-zero');
        expect(composedRule({...params, b: 0})).toBeUndefined();
        expect(checkTransformParams({...params, a: 11})).toBe('out-of-range');
        expect(checkTransformParams({...params, d: NaN})).toBe('not-finite');
        expect(checkTransformParams(params)).toBeUndefined();
    });

    it('b < 0 mirrors about x = c', () => {
        const base: SchoolBaseFunction = {kind: 'power', shape: 'square'};
        const m = schoolFunctionModel(transformedFunction(base, {a: 1, b: -1, c: 3, d: 0}));
        const cube = schoolFunctionModel(transformedFunction({kind: 'power', shape: 'cube'}, {a: 1, b: -1, c: 3, d: 0}));
        const plain = schoolFunctionModel(transformedFunction({kind: 'power', shape: 'cube'}, {a: 1, b: 1, c: 3, d: 0}));
        for (const h of [0.5, 1, 2.5]) {
            expect(m.value(3 + h)).toBeCloseTo(m.value(3 - h)!, 12);
            expect(cube.value(3 + h)).toBeCloseTo(plain.value(3 - h)!, 12);
        }
    });
});

describe('composed rule readout', () => {
    it('lists the order of operations as structured steps', () => {
        expect(composedRule(params)!.map(s => s.kind)).toEqual(['shift-inside', 'scale-inside', 'apply-base', 'scale-outside', 'shift-outside']);
    });

    it('flags reflections and omits identity steps', () => {
        const steps = composedRule({a: -1, b: -2, c: 0, d: 0})!;
        expect(steps).toEqual([
            {kind: 'scale-inside', b: -2, mirrorsAboutVertical: true},
            {kind: 'apply-base'},
            {kind: 'scale-outside', a: -1, mirrorsAboutHorizontal: true},
        ]);
        expect(composedRule({a: 1, b: 1, c: 0, d: 0})).toEqual([{kind: 'apply-base'}]);
    });
});
