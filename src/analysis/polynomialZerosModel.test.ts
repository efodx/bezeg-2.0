import {describe, expect, it} from 'vitest';
import {polyDerivativeValue, polyValue} from './polynomial';
import {
    addPolynomialZero, checkPolynomialZerosModel, choosePolynomialExample, DEFAULT_POLYNOMIAL_ZEROS_MODEL, exampleOfPolynomial,
    movePolynomialZero, parsePolynomialZerosModel, POLYNOMIAL_EXAMPLE_IDS, polynomialExampleModel, polynomialFacts, polynomialSpecOf,
    setPolynomialK, setPolynomialMultiplicity,
} from './polynomialZerosModel';

const base = DEFAULT_POLYNOMIAL_ZEROS_MODEL;

describe('default polynomial (x + 2)(x - 1)^2', () => {
    it('has p(0)=2, p(1)=0, p1(1)=0, p2(1)=6', () => {
        const spec = polynomialSpecOf(base);
        expect(polyValue(spec, 0)).toBeCloseTo(2, 12);
        expect(polyValue(spec, 1)).toBeCloseTo(0, 12);
        expect(polyDerivativeValue(spec, 1)).toBeCloseTo(0, 12);
        expect(polyDerivativeValue(spec, 1, 2)).toBeCloseTo(6, 10);
        expect(polynomialFacts(base).yIntercept).toBeCloseTo(2, 12);
    });
});

describe('every example', () => {
    for (const id of POLYNOMIAL_EXAMPLE_IDS) {
        it(`${id}: sign changes at odd multiplicity only, derivative vanishes for m >= 2`, () => {
            const model = polynomialExampleModel(id);
            const facts = polynomialFacts(model);
            for (const f of facts.zeros) {
                const left = polyValue(facts.spec, f.z - 0.05);
                const right = polyValue(facts.spec, f.z + 0.05);
                expect(Math.sign(left) !== Math.sign(right)).toBe(f.m % 2 === 1);
                expect(f.crosses).toBe(f.m % 2 === 1);
                if (f.m >= 2) expect(polyDerivativeValue(facts.spec, f.z)).toBeCloseTo(0, 12);
                else expect(Math.abs(polyDerivativeValue(facts.spec, f.z))).toBeGreaterThan(1e-6);
                expect(f.derivativeVanishes).toBe(f.m >= 2);
            }
            expect(facts.degree).toBeLessThanOrEqual(5);
            expect(exampleOfPolynomial(model)).toBe(id);
        });
    }
    it('degree-five example has degree 5 and ends down-left, up-right', () => {
        const f = polynomialFacts(polynomialExampleModel('degree-five'));
        expect(f.degree).toBe(5);
        expect(f.end).toEqual({kind: 'ends', left: 'down', right: 'up'});
    });
});

describe('edits', () => {
    it('merge adds multiplicities and is announced', () => {
        const r = movePolynomialZero(base, 0, 1);
        expect(r.ok && r.model.zeros).toEqual([{z: 1, m: 3}]);
        expect(r.ok && r.event).toEqual({kind: 'merged', z: 1, m: 3});
    });
    it('refuses degree 6 with the reason (add and multiplicity)', () => {
        const five = polynomialExampleModel('degree-five');
        expect(addPolynomialZero(five)).toMatchObject({ok: false, issue: {kind: 'degree', max: 5}});
        expect(setPolynomialMultiplicity(five, 0, 2)).toMatchObject({ok: false, issue: {kind: 'degree'}});
        expect(setPolynomialMultiplicity(five, 0, 4)).toMatchObject({ok: false, issue: {kind: 'multiplicity'}});
    });
    it('snapped positions compare ===', () => {
        const r = movePolynomialZero(base, 0, 0.1 + 0.2);
        expect(r.ok && r.model.zeros[0].z === 0.3).toBe(true);
    });
    it('k is rejected, never clamped', () => {
        expect(setPolynomialK(base, 0)).toEqual({ok: false, issue: {kind: 'k-zero'}});
        expect(setPolynomialK(base, 1e6)).toMatchObject({ok: false, issue: {kind: 'k-range'}});
        expect(setPolynomialK(base, NaN)).toMatchObject({ok: false});
        const r = setPolynomialK(base, 2);
        expect(r.ok && r.model.k).toBe(2);
    });
    it('choosing an example keeps the derivative switch; unknown id refused', () => {
        const on = {...base, derivativeVisible: true};
        const r = choosePolynomialExample(on, 'triple');
        expect(r.ok && r.model).toEqual({...polynomialExampleModel('triple'), derivativeVisible: true});
        expect(choosePolynomialExample(on, 'nope')).toMatchObject({ok: false, issue: {kind: 'example'}});
    });
});

describe('validation of stored models', () => {
    it('accepts the default and drops unknown properties', () => {
        expect(parsePolynomialZerosModel({...base, extra: 1})).toEqual(base);
    });
    it('rejects invalid data with the issue', () => {
        expect(checkPolynomialZerosModel(null)).toEqual({ok: false, issue: undefined});
        expect(checkPolynomialZerosModel({...base, zeros: [{z: 1, m: 3}, {z: 2, m: 3}]})).toMatchObject({ok: false, issue: {kind: 'degree'}});
        expect(checkPolynomialZerosModel({...base, k: 0})).toMatchObject({ok: false, issue: {kind: 'k-zero'}});
        expect(checkPolynomialZerosModel({...base, derivativeVisible: 'yes'})).toMatchObject({ok: false, issue: {kind: 'visibility'}});
        expect(checkPolynomialZerosModel({k: 1, zeros: []})).toEqual({ok: false, issue: undefined});
        expect(parsePolynomialZerosModel({...base, zeros: [{z: 0.25, m: 1}]})).toBeUndefined();
    });
});
