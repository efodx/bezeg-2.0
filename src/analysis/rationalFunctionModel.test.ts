import {describe, expect, it} from 'vitest';
import {
    addRationalZero, checkRationalFunctionModel, chooseRationalExample, DEFAULT_RATIONAL_FUNCTION_MODEL, exampleOfRational, moveRationalZero,
    parseRationalFunctionModel, RATIONAL_EXAMPLE_IDS, rationalExampleModel, rationalFacts, RationalFunctionModel, rationalSpecsOf,
    setRationalK, setRationalMultiplicity, setRationalProbe,
} from './rationalFunctionModel';
import {plotPieces} from './schoolFunctions';

const model = (k: number, numerator: number[], denominator: number[], probe = 10): RationalFunctionModel => ({
    k, numerator: numerator.map(z => ({z, m: 1})), denominator: denominator.map(z => ({z, m: 1})), probe,
});

describe('rational function model facts', () => {
    it('reads the specification numbers of the oblique example', () => {
        const facts = rationalFacts(DEFAULT_RATIONAL_FUNCTION_MODEL);
        expect(facts.probe.remainderTerm).toBe(0.375);
        expect(facts.analysis.quotient).toEqual([2, 1]);
        expect(facts.analysis.asymptote).toEqual({kind: 'oblique', slope: 1, intercept: 2});
        expect(facts.poles.map(p => p.x)).toEqual([2]);
        expect(facts.cancelled).toBe(false);
    });

    it('makes a hole at (1, 2) of the hole example', () => {
        const facts = rationalFacts(rationalExampleModel('hole'));
        expect(facts.analysis.holes).toEqual([{x: 1, y: 2}]);
        expect(facts.poles).toEqual([]);
        expect(facts.cancelled).toBe(true);
    });

    it('gives y = 2 and the value 2.0625 at x = 10 for the horizontal example', () => {
        const facts = rationalFacts(rationalExampleModel('horizontal'));
        expect(facts.analysis.asymptote).toEqual({kind: 'horizontal', y: 2});
        expect(2 + facts.probe.remainderTerm!).toBeCloseTo(2.0625, 12);
    });

    it('double-pole example: odd pole changes sign, even pole does not', () => {
        const facts = rationalFacts(rationalExampleModel('double-pole'));
        const [simple, double] = facts.poles;
        expect(simple).toMatchObject({x: -2, multiplicity: 1, signChanges: true});
        expect(simple.left).not.toBe(simple.right);
        expect(double).toMatchObject({x: 1, multiplicity: 2, signChanges: false});
        expect(double.left).toBe(double.right);
        expect(facts.analysis.asymptote).toEqual({kind: 'horizontal', y: 0});
    });

    it('a fully cancelled factor is a hole, never a pole', () => {
        const facts = rationalFacts(model(1, [1, 3], [1]));
        expect(facts.poles).toEqual([]);
        expect(facts.analysis.holes.map(h => h.x)).toEqual([1]);
    });

    it('a partly cancelled factor (x-1)/(x-1)^2 keeps a simple pole at 1 and has no hole', () => {
        const facts = rationalFacts({k: 1, numerator: [{z: 1, m: 1}], denominator: [{z: 1, m: 2}], probe: 10});
        expect(facts.poles).toEqual([expect.objectContaining({x: 1, multiplicity: 1, signChanges: true})]);
        expect(facts.analysis.holes).toEqual([]);
        expect(facts.cancelled).toBe(true);
    });

    it('an oblique asymptote exists only when deg p = deg q + 1', () => {
        for (const [numerator, denominator] of [[[0], [1]], [[0, 1], [2]], [[0, 1, 2], [3]], [[0, 1, 2, 3], [4]], [[0], []], [[], [1, 2]]]) {
            const kind = rationalFacts(model(1, numerator, denominator)).analysis.asymptote.kind;
            expect(kind === 'oblique').toBe(numerator.length === denominator.length + 1);
        }
    });

    it('no plotted piece has points on both sides of a pole', () => {
        for (const id of RATIONAL_EXAMPLE_IDS) {
            const m = rationalExampleModel(id);
            const poles = rationalFacts(m).poles.map(p => p.x);
            const pieces = plotPieces({kind: 'rational', ...rationalSpecsOf(m)}, -11, 9, -9, 11);
            expect(pieces.length).toBeGreaterThan(poles.length);
            for (const piece of pieces) for (const pole of poles) {
                expect(piece.some(p => p.x < pole) && piece.some(p => p.x > pole)).toBe(false);
            }
        }
    });

    it('the probe at a pole or hole is undefined', () => {
        expect(rationalFacts({...DEFAULT_RATIONAL_FUNCTION_MODEL, probe: 2}).probe).toMatchObject({defined: false, remainderTerm: undefined});
        expect(rationalFacts({...rationalExampleModel('hole'), probe: 1}).probe.defined).toBe(false);
    });
});

describe('rational function model validity and edits', () => {
    it('recognises the examples independent of order, and not a changed k', () => {
        expect(exampleOfRational({...rationalExampleModel('oblique'), numerator: [{z: 1, m: 1}, {z: -1, m: 1}]})).toBe('oblique');
        expect(exampleOfRational(model(3, [-1, 1], [2]))).toBeUndefined();
    });

    it('rejects, never clamps, bad k, probe, lists and examples', () => {
        const base = DEFAULT_RATIONAL_FUNCTION_MODEL;
        expect(setRationalK(base, 0)).toMatchObject({ok: false, issue: {kind: 'k-zero'}});
        expect(setRationalK(base, 1e6)).toMatchObject({ok: false, issue: {kind: 'k-range'}});
        expect(setRationalProbe(base, 11)).toMatchObject({ok: false, issue: {kind: 'probe-range'}});
        expect(chooseRationalExample(base, 'quartic')).toMatchObject({ok: false, issue: {kind: 'example'}});
        expect(setRationalMultiplicity(base, 'denominator', 0, 9).ok).toBe(false);
        expect(moveRationalZero(base, 'numerator', 0, 99).ok).toBe(false);
        expect(moveRationalZero(base, 'numerator', 0, -0.93)).toMatchObject({ok: true, model: {numerator: [{z: -0.9, m: 1}, {z: 1, m: 1}]}});
    });

    it('a numerator zero landing on a denominator zero is not merged: it makes a hole; moving away restores the pole', () => {
        const onto = moveRationalZero(DEFAULT_RATIONAL_FUNCTION_MODEL, 'numerator', 1, 2);
        expect(onto.ok && onto.event).toBeFalsy();
        const made = onto.ok ? onto.model : DEFAULT_RATIONAL_FUNCTION_MODEL;
        expect(rationalFacts(made).analysis.holes.map(h => h.x)).toEqual([2]);
        const away = moveRationalZero(made, 'numerator', 1, 1);
        expect(rationalFacts(away.ok ? away.model : made).poles.map(p => p.x)).toEqual([2]);
    });

    it('zeros of one list that meet merge and report the event', () => {
        const merged = moveRationalZero(DEFAULT_RATIONAL_FUNCTION_MODEL, 'numerator', 0, 1);
        expect(merged).toMatchObject({ok: true, event: {z: 1, m: 2}});
    });

    it('caps each list at degree 5 and allows an empty denominator', () => {
        let m = rationalExampleModel('hole');
        for (let i = 0; i < 6; i++) {
            const next = addRationalZero(m, 'numerator');
            if (next.ok) m = next.model;
        }
        expect(m.numerator.reduce((s, e) => s + e.m, 0)).toBe(5);
        expect(addRationalZero(m, 'numerator').ok).toBe(false);
        expect(checkRationalFunctionModel({...DEFAULT_RATIONAL_FUNCTION_MODEL, denominator: []}).ok).toBe(true);
    });

    it('parses valid data, drops unknown properties and rejects wrong shapes', () => {
        expect(parseRationalFunctionModel({...DEFAULT_RATIONAL_FUNCTION_MODEL, extra: 1})).toEqual(DEFAULT_RATIONAL_FUNCTION_MODEL);
        for (const bad of [null, [], {}, {...DEFAULT_RATIONAL_FUNCTION_MODEL, k: 0}, {...DEFAULT_RATIONAL_FUNCTION_MODEL, probe: 'x'},
            {...DEFAULT_RATIONAL_FUNCTION_MODEL, numerator: 'x'}, {...DEFAULT_RATIONAL_FUNCTION_MODEL, denominator: [{z: 1, m: 6}]}]) {
            expect(parseRationalFunctionModel(bad)).toBeUndefined();
        }
    });
});
