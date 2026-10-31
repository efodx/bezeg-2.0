import {describe, expect, it} from 'vitest';
import {
    NAMED_IDS, POWER_SHAPES, plotPieces, schoolFunctionModel, validateSchoolFunction,
    type PowerFunction, type SchoolFunction,
} from './schoolFunctions';

const power = (shape: typeof POWER_SHAPES[number]): PowerFunction => ({kind: 'power', shape});
const S1: SchoolFunction = {kind: 'transformed', base: {kind: 'power', shape: 'square'}, a: -2, b: 0.5, c: 3, d: 1};

const ENTRIES: {name: string; fn: SchoolFunction; xs: number[]}[] = [
    ...POWER_SHAPES.map(s => ({name: s, fn: power(s), xs: [-2.5, -0.7, 0.4, 1.3, 3.1]})),
    {name: 'exp 2', fn: {kind: 'exp', base: 2}, xs: [-2, 0.3, 1.7]},
    {name: 'exp 0.5', fn: {kind: 'exp', base: 0.5}, xs: [-2, 0.3, 1.7]},
    {name: 'log 2', fn: {kind: 'log', base: 2}, xs: [0.3, 1.7, 5]},
    {name: 'log e', fn: {kind: 'log', base: Math.E}, xs: [0.3, 1.7, 5]},
    ...NAMED_IDS.map(id => ({name: id, fn: {kind: 'named', id} as SchoolFunction, xs: [-1.9, 0.2, 1.4]})),
    {name: 'transformed sqrt', fn: {kind: 'transformed', base: {kind: 'power', shape: 'sqrt'}, a: 2, b: -1.5, c: 1, d: 3}, xs: [-2, -0.5, 0.4]},
    {name: 'transformed S1', fn: S1, xs: [-2, 1, 4.5, 7]},
    {name: 'poly', fn: {kind: 'poly', k: 2, zeros: [{z: -2, m: 1}, {z: 1, m: 2}]}, xs: [-3.1, -0.4, 0.8, 2.3]},
    {name: 'rational', fn: {kind: 'rational', numerator: {k: 1, zeros: [{z: -1, m: 1}, {z: 1, m: 1}]}, denominator: {k: 1, zeros: [{z: 2, m: 1}]}},
        xs: [-3.1, 0.4, 1.7, 2.6]},
    {name: 'transformed poly', fn: {kind: 'transformed', base: {kind: 'poly', k: 1, zeros: [{z: -2, m: 1}, {z: 1, m: 2}]}, a: -2, b: 0.5, c: 1, d: 3}, xs: [-3, 0.4, 2.7]},
    {name: 'transformed rational', fn: {kind: 'transformed', a: 2, b: 1, c: -1, d: 1,
        base: {kind: 'rational', numerator: {k: 1, zeros: [{z: 0, m: 2}]}, denominator: {k: 1, zeros: [{z: 1, m: 1}]}}}, xs: [-3, 0.4, 3.5]},
];

describe('polynomial and rational kinds', () => {
    const poly: SchoolFunction = {kind: 'poly', k: 1, zeros: [{z: 1, m: 1}, {z: 1, m: 1}, {z: -2, m: 1}]};
    it('accepts valid specs, merging equal zeros and reporting the merge', () => {
        const r = validateSchoolFunction(poly);
        expect(r).toEqual({ok: true, value: {kind: 'poly', k: 1, zeros: [{z: -2, m: 1}, {z: 1, m: 2}]}, merged: true});
        const t = validateSchoolFunction({kind: 'transformed', base: poly, a: 1, b: 1, c: 0, d: 0});
        expect(t.ok && t.merged).toBe(true);
        const plain = validateSchoolFunction({kind: 'poly', k: 2, zeros: [{z: 0, m: 1}]});
        expect(plain.ok && plain.merged).toBe(false);
    });
    it('reports rational diagnoses with the nested path', () => {
        const r = validateSchoolFunction({kind: 'rational', numerator: {k: 1, zeros: [{z: 0, m: 7}]}, denominator: {k: 1, zeros: []}});
        expect(r).toMatchObject({ok: false, field: 'numerator.zeros.0.m', reason: 'out-of-range'});
    });
    it('brackets a sum-shaped derivative under a leading factor in a transformed function', () => {
        const fn: SchoolFunction = {kind: 'transformed', base: {kind: 'poly', k: 1, zeros: [{z: -2, m: 1}, {z: 1, m: 2}]}, a: 2, b: 1, c: 0, d: 0};
        const m = schoolFunctionModel(fn);
        expect(m.latex).toBe('2\\,(x + 2)(x - 1)^{2}');
        expect(m.derivativeLatex.startsWith('2\\,\\left(')).toBe(true);
    });
    it('omits poles and holes from the rational domain and values', () => {
        const m = schoolFunctionModel({kind: 'rational', numerator: {k: 1, zeros: [{z: 1, m: 1}, {z: -1, m: 1}]}, denominator: {k: 1, zeros: [{z: 1, m: 1}, {z: 2, m: 1}]}});
        expect(m.domain).toHaveLength(3);
        expect(m.value(1)).toBeUndefined();
        expect(m.value(2)).toBeUndefined();
        expect(m.derivative(1)).toBeUndefined();
        expect(m.value(0)).toBeCloseTo(-0.5, 12);
    });
    it('never lets a plot piece span a pole', () => {
        const fn: SchoolFunction = {kind: 'rational', numerator: {k: 1, zeros: []}, denominator: {k: 1, zeros: [{z: 1, m: 1}, {z: -2, m: 2}]}};
        const pieces = plotPieces(fn, -6, 6, -5, 5);
        expect(pieces.length).toBeGreaterThanOrEqual(3);
        for (const piece of pieces) for (const q of piece) expect(Math.abs(q.y)).toBeLessThanOrEqual(15);
        for (const piece of pieces) {
            const xs = piece.map(q => q.x);
            for (const pole of [-2, 1]) expect(xs.some(x => x < pole) && xs.some(x => x > pole)).toBe(false);
        }
    });
});

describe('values and domains', () => {
    it('evaluates the closed power shapes exactly', () => {
        expect(schoolFunctionModel(power('square')).value(-3)).toBe(9);
        expect(schoolFunctionModel(power('cube')).value(-2)).toBe(-8);
        expect(schoolFunctionModel(power('sqrt')).value(9)).toBe(3);
        expect(schoolFunctionModel(power('reciprocal')).value(4)).toBe(0.25);
        expect(schoolFunctionModel(power('abs')).value(-5)).toBe(5);
    });

    it('evaluates exp, log and the named entries', () => {
        expect(schoolFunctionModel({kind: 'exp', base: 2}).value(3)).toBeCloseTo(8, 12);
        expect(schoolFunctionModel({kind: 'log', base: 2}).value(8)).toBeCloseTo(3, 12);
        expect(schoolFunctionModel({kind: 'log', base: Math.E}).value(Math.E)).toBeCloseTo(1, 12);
        expect(schoolFunctionModel({kind: 'named', id: 'x2-2'}).value(2)).toBe(2);
        expect(schoolFunctionModel({kind: 'named', id: 'cubic-cycle'}).value(0)).toBe(2);
        expect(schoolFunctionModel({kind: 'named', id: 'cubic-x3-x'}).value(2)).toBe(6);
    });

    it('returns undefined, never NaN or Infinity, outside the domain', () => {
        const sqrt = schoolFunctionModel(power('sqrt'));
        expect(sqrt.value(-1)).toBeUndefined();
        expect(sqrt.value(0)).toBe(0);
        const rec = schoolFunctionModel(power('reciprocal'));
        expect(rec.value(0)).toBeUndefined();
        expect(rec.derivative(0)).toBeUndefined();
        const log = schoolFunctionModel({kind: 'log', base: 2});
        expect(log.value(0)).toBeUndefined();
        expect(log.value(-3)).toBeUndefined();
        expect(schoolFunctionModel({kind: 'exp', base: 5}).value(1e6)).toBeUndefined();
        for (const {fn} of ENTRIES) {
            const m = schoolFunctionModel(fn);
            for (const x of [-1e3, -1, 0, 1, 1e3, 1e308]) {
                for (const v of [m.value(x), m.derivative(x), m.antiderivative?.(x)]) {
                    expect(v === undefined || Number.isFinite(v)).toBe(true);
                }
            }
        }
    });

    it('describes the domains as intervals', () => {
        expect(schoolFunctionModel(power('sqrt')).domain).toEqual([{min: 0, max: Infinity, minClosed: true, maxClosed: false}]);
        expect(schoolFunctionModel(power('reciprocal')).domain).toHaveLength(2);
        expect(schoolFunctionModel({kind: 'log', base: 3}).domain[0]).toMatchObject({min: 0, minClosed: false});
        expect(schoolFunctionModel(power('square')).domain).toHaveLength(1);
    });

    it('maps the domain of a transformed entry, mirroring for b < 0', () => {
        const pos = schoolFunctionModel({kind: 'transformed', base: {kind: 'power', shape: 'sqrt'}, a: 1, b: 2, c: 3, d: 0});
        expect(pos.domain).toEqual([{min: 3, max: Infinity, minClosed: true, maxClosed: false}]);
        const neg = schoolFunctionModel({kind: 'transformed', base: {kind: 'power', shape: 'sqrt'}, a: 1, b: -1, c: 3, d: 0});
        expect(neg.domain).toEqual([{min: -Infinity, max: 3, minClosed: false, maxClosed: true}]);
        expect(neg.value(4)).toBeUndefined();
        expect(neg.value(2)).toBe(1);
    });

    it('offers undelimited latex and plain forms', () => {
        const m = schoolFunctionModel(S1);
        for (const s of [m.latex, m.derivativeLatex, m.plain, m.derivativePlain]) {
            expect(s.length).toBeGreaterThan(0);
            expect(s).not.toContain('\\(');
            expect(s).not.toContain('\\[');
        }
        expect(schoolFunctionModel(power('sqrt')).latex).toBe('\\sqrt{x}');
        expect(schoolFunctionModel(power('square')).latex).toBe('x^{2}');
    });
});

describe('validator', () => {
    it('accepts plain records and returns a normalized copy', () => {
        const r = validateSchoolFunction({kind: 'transformed', base: {kind: 'exp', base: 2, junk: 1}, a: 1, b: -2, c: 0, d: 0.5, extra: true});
        expect(r).toEqual({ok: true, value: {kind: 'transformed', base: {kind: 'exp', base: 2}, a: 1, b: -2, c: 0, d: 0.5}});
        expect(validateSchoolFunction({kind: 'power', shape: 'abs'})).toEqual({ok: true, value: power('abs')});
        expect(validateSchoolFunction({kind: 'named', id: 'x2-2'}).ok).toBe(true);
        expect(validateSchoolFunction({kind: 'log', base: 0.2}).ok).toBe(true);
        expect(validateSchoolFunction({kind: 'log', base: 5}).ok).toBe(true);
    });

    it.each([
        [null, '', 'not-an-object'],
        [[1], '', 'not-an-object'],
        [{}, 'kind', 'missing'],
        [{kind: 'sin'}, 'kind', 'unknown-kind'],
        [{kind: 'power'}, 'shape', 'missing'],
        [{kind: 'power', shape: 'quartic'}, 'shape', 'unknown-shape'],
        [{kind: 'named', id: 'x9'}, 'id', 'unknown-id'],
        [{kind: 'exp', base: 1}, 'base', 'excluded-value'],
        [{kind: 'exp', base: 0.19}, 'base', 'out-of-range'],
        [{kind: 'log', base: 5.01}, 'base', 'out-of-range'],
        [{kind: 'log', base: '2'}, 'base', 'not-a-number'],
        [{kind: 'log', base: NaN}, 'base', 'not-finite'],
        [{kind: 'exp'}, 'base', 'missing'],
        [{kind: 'poly', k: 1}, 'zeros', 'missing'],
        [{kind: 'poly', k: 0, zeros: []}, 'k', 'excluded-value'],
        [{kind: 'poly', k: 1, zeros: [{z: 0, m: 4}]}, 'zeros.0.m', 'out-of-range'],
        [{kind: 'poly', k: 1, zeros: [{z: 0, m: 1.5}]}, 'zeros.0.m', 'not-an-integer'],
        [{kind: 'poly', k: 1, zeros: [{z: 0, m: 3}, {z: 1, m: 3}]}, 'zeros', 'degree-too-high'],
        [{kind: 'poly', k: 1, zeros: [{z: 1, m: 2}, {z: 1, m: 2}]}, 'zeros.1.m', 'out-of-range'],
        [{kind: 'poly', k: 1, zeros: 'x'}, 'zeros', 'not-an-array'],
        [{kind: 'rational', numerator: {k: 1, zeros: []}}, 'denominator', 'missing'],
        [{kind: 'rational', numerator: {k: 1, zeros: []}, denominator: {k: 0, zeros: []}}, 'denominator.k', 'excluded-value'],
        [{kind: 'transformed', a: 1, b: 1, c: 0, d: 0}, 'base', 'missing'],
        [{kind: 'transformed', base: 3, a: 1, b: 1, c: 0, d: 0}, 'base', 'not-an-object'],
        [{kind: 'transformed', base: {kind: 'transformed'}, a: 1, b: 1, c: 0, d: 0}, 'base.kind', 'nested-transform'],
        [{kind: 'transformed', base: {kind: 'exp', base: 9}, a: 1, b: 1, c: 0, d: 0}, 'base.base', 'out-of-range'],
        [{kind: 'transformed', base: power('abs'), a: 1, b: 0, c: 0, d: 0}, 'b', 'excluded-value'],
        [{kind: 'transformed', base: power('abs'), a: 11, b: 1, c: 0, d: 0}, 'a', 'out-of-range'],
        [{kind: 'transformed', base: power('abs'), a: 1, b: 1, c: Infinity, d: 0}, 'c', 'not-finite'],
        [{kind: 'transformed', base: power('abs'), a: 1, b: 1, c: 0}, 'd', 'missing'],
    ])('rejects %j naming %s (%s)', (input, field, reason) => {
        const r = validateSchoolFunction(input);
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.field).toBe(field);
            expect(r.reason).toBe(reason);
        }
    });

    it('reports the bounds for out-of-range and never clamps', () => {
        const r = validateSchoolFunction({kind: 'exp', base: 100});
        expect(r).toEqual({ok: false, field: 'base', reason: 'out-of-range', min: 0.2, max: 5});
    });
});

describe('derivatives', () => {
    const h = 1e-6;
    it.each(ENTRIES)('$name matches a central difference', ({fn, xs}) => {
        const m = schoolFunctionModel(fn);
        for (const x of xs) {
            const d = m.derivative(x);
            const lo = m.value(x - h);
            const hi = m.value(x + h);
            if (d === undefined || lo === undefined || hi === undefined) continue;
            const num = (hi - lo) / (2 * h);
            expect(Math.abs(d - num)).toBeLessThan(1e-5 * Math.max(1, Math.abs(num)));
        }
    });

    it('the central-difference tolerance rejects a deliberately wrong derivative', () => {
        const m = schoolFunctionModel(power('cube'));
        const num = (m.value(2 + h)! - m.value(2 - h)!) / (2 * h);
        expect(Math.abs(m.derivative(2)! - num)).toBeLessThan(1e-5 * Math.max(1, Math.abs(num)));
        const wrong = 4; // x^2 instead of 3x^2 at x = 2
        expect(Math.abs(wrong - num)).toBeGreaterThan(1e-5 * Math.max(1, Math.abs(num)));
    });

    it('brackets a sum base under a leading factor in latex and plain forms', () => {
        const t = (a: number): ReturnType<typeof schoolFunctionModel> =>
            schoolFunctionModel({kind: 'transformed', base: {kind: 'named', id: 'x2-2'}, a, b: 1, c: 0, d: 0});
        const two = t(2);
        expect(two.latex).toBe('2\\,\\left(x^{2}-2\\right)');
        expect(two.plain).toBe('2·(x²−2)');
        expect(two.derivativeLatex).toBe('2\\,2x');
        const neg = t(-1);
        expect(neg.latex).toBe('-\\left(x^{2}-2\\right)');
        expect(neg.plain).toBe('−(x²−2)');
        expect(neg.derivativeLatex).toBe('-2x');
        const one = t(1);
        expect(one.latex).toBe('x^{2}-2');
        expect(one.plain).toBe('x²−2');
        const cyc = schoolFunctionModel({kind: 'transformed', base: {kind: 'named', id: 'cubic-cycle'}, a: 2, b: 1, c: 1, d: 0});
        expect(cyc.derivativeLatex).toBe('2\\,\\left(3\\left(x - 1\\right)^{2}-2\\right)');
    });

    it('antiderivatives differentiate back to the value', () => {
        for (const {fn, xs} of ENTRIES) {
            const m = schoolFunctionModel(fn);
            if (!m.antiderivative) continue;
            for (const x of xs) {
                const lo = m.antiderivative(x - h);
                const hi = m.antiderivative(x + h);
                const v = m.value(x);
                if (lo === undefined || hi === undefined || v === undefined) continue;
                expect(Math.abs((hi - lo) / (2 * h) - v)).toBeLessThan(1e-4 * Math.max(1, Math.abs(v)));
            }
        }
    });

    it('is only present where exact', () => {
        expect(schoolFunctionModel(power('reciprocal')).antiderivative).toBeUndefined();
        expect(schoolFunctionModel(power('square')).antiderivative).toBeDefined();
        const log = schoolFunctionModel({kind: 'log', base: Math.E}).antiderivative!;
        expect(log(Math.E)).toBeCloseTo(0, 12);
        expect(log(1)).toBeCloseTo(-1, 12);
    });

    it('leaves non-differentiable points undefined', () => {
        expect(schoolFunctionModel(power('abs')).derivative(0)).toBeUndefined();
        expect(schoolFunctionModel(power('sqrt')).derivative(0)).toBeUndefined();
        expect(schoolFunctionModel(power('sqrt')).derivative(-1)).toBeUndefined();
        expect(schoolFunctionModel(power('abs')).derivative(-2)).toBe(-1);
        const shifted = schoolFunctionModel({kind: 'transformed', base: power('abs'), a: 3, b: 2, c: 1, d: 0});
        expect(shifted.derivative(1)).toBeUndefined();
        expect(shifted.derivative(2)).toBe(6);
    });
});

describe('transformed entries (S1)', () => {
    const m = schoolFunctionModel(S1);
    it('has the vertex (3, 1)', () => {
        expect(m.value(3)).toBe(1);
        expect(m.derivative(3)).toBeCloseTo(0, 12);
        expect(m.value(2.9)).toBeLessThan(1);
        expect(m.value(3.1)).toBeLessThan(1);
    });
    it('maps (2, 4) to (7, -7) by (u, v) -> (u/b + c, a v + d)', () => {
        expect(m.value(2 / 0.5 + 3)).toBe(-7);
        expect(m.value(7)).toBe(-7);
    });
    it('gives -1 at x = 5', () => {
        expect(m.value(5)).toBe(-1);
    });
    it('uses the chain rule a b f\'(b(x - c))', () => {
        // f = x^2: a b 2 b (x - c) = -2 * 0.5 * 2 * 0.5 * (x - 3)
        expect(m.derivative(5)).toBe(-2);
        expect(m.derivative(1)).toBe(2);
    });
    it('mirrors about x = c for b < 0', () => {
        const t = schoolFunctionModel({kind: 'transformed', base: {kind: 'named', id: 'cubic-cycle'}, a: 1, b: -1, c: 2, d: 0});
        expect(t.value(2 + 1.3)).toBeCloseTo(schoolFunctionModel({kind: 'named', id: 'cubic-cycle'}).value(-1.3)!, 12);
        const sq = schoolFunctionModel({kind: 'transformed', base: power('square'), a: 1, b: -1, c: 2, d: 0});
        expect(sq.value(2 + 1.3)).toBeCloseTo(sq.value(2 - 1.3)!, 12);
    });
    it('transforms the antiderivative as (a/b) F(b(x-c)) + d x', () => {
        const F = m.antiderivative!;
        const h = 1e-5;
        expect(((F(4 + h) ?? 0) - (F(4 - h) ?? 0)) / (2 * h)).toBeCloseTo(m.value(4)!, 6);
    });
});

describe('plotPieces', () => {
    const view = [-5, 5] as const;
    const checkNoSpan = (fn: SchoolFunction, pieces: {x: number; y: number}[][]): void => {
        const m = schoolFunctionModel(fn);
        for (const piece of pieces) {
            expect(piece.length).toBeGreaterThanOrEqual(2);
            for (const p of piece) expect(Number.isFinite(p.y)).toBe(true);
            // Every piece lies in one domain interval, so none spans an edge or pole.
            const idx = m.domain.findIndex(iv => piece[0].x >= iv.min && piece[0].x <= iv.max);
            for (const p of piece) {
                const k = m.domain.findIndex(iv => p.x >= iv.min && p.x <= iv.max);
                expect(k).toBe(idx);
                expect(m.value(p.x)).not.toBeUndefined();
            }
        }
    };

    it('splits 1/x at the pole into two pieces that stop at the pole', () => {
        const fn = power('reciprocal');
        const pieces = plotPieces(fn, -4, 4, ...view);
        expect(pieces).toHaveLength(2);
        checkNoSpan(fn, pieces);
        expect(pieces[0][pieces[0].length - 1].x).toBeLessThan(0);
        expect(pieces[0][pieces[0].length - 1].x).toBeGreaterThan(-1e-3);
        expect(pieces[1][0].x).toBeGreaterThan(0);
        expect(pieces[1][0].x).toBeLessThan(1e-3);
        // y is clipped to the enlarged view
        for (const piece of pieces) for (const p of piece) expect(Math.abs(p.y)).toBeLessThanOrEqual(15);
    });

    it('splits 1/x also when a sample lands exactly on the pole', () => {
        const pieces = plotPieces(power('reciprocal'), -4, 4, ...view, 401);
        expect(pieces).toHaveLength(2);
    });

    it('draws sqrt from its closed edge with no vertical connector', () => {
        const fn = power('sqrt');
        const pieces = plotPieces(fn, -3, 4, ...view);
        expect(pieces).toHaveLength(1);
        expect(pieces[0][0].x).toBe(0);
        expect(pieces[0][0].y).toBe(0);
        checkNoSpan(fn, pieces);
    });

    it('draws log from just right of 0 and stops at the last valid sample', () => {
        const fn: SchoolFunction = {kind: 'log', base: Math.E};
        const pieces = plotPieces(fn, -2, 6, ...view);
        expect(pieces).toHaveLength(1);
        expect(pieces[0][0].x).toBeGreaterThan(0);
        expect(pieces[0][0].x).toBeLessThan(1e-6);
        expect(pieces[0][0].y).toBe(-15);
        expect(pieces[0][pieces[0].length - 1].x).toBe(6);
        checkNoSpan(fn, pieces);
    });

    it('returns one piece for a total function and none for an empty view', () => {
        expect(plotPieces(S1, -5, 10, -10, 5)).toHaveLength(1);
        expect(plotPieces(power('sqrt'), -5, -1, ...view)).toEqual([]);
        expect(plotPieces(S1, 1, 1, -1, 1)).toEqual([]);
    });

    it('splits a transformed reciprocal at its moved pole', () => {
        const fn: SchoolFunction = {kind: 'transformed', base: power('reciprocal'), a: 1, b: 1, c: 2, d: 0};
        const pieces = plotPieces(fn, -3, 7, ...view);
        expect(pieces).toHaveLength(2);
        expect(pieces[0][pieces[0].length - 1].x).toBeLessThan(2);
        expect(pieces[1][0].x).toBeGreaterThan(2);
    });
});
