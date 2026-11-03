import {beforeEach, describe, expect, it} from 'vitest';
import {nFold, piecewiseLinearBase, N_MAX} from './convolution';
import {
    checkCltModel, chooseCltExample, CLT_EXAMPLES, CLT_HEIGHT_MAX, CLT_WINDOW, cltConvolutionCount, cltExampleOf, cltFold, cltView,
    DEFAULT_CLT_MODEL, fitCltView, parseCltModel, resetCltCache, setCltCdf, setCltHeight, setCltN,
} from './cltModel';
import type {CltModel} from './cltModel';

const withN = (id: 'uniform' | 'skewed', n: number): CltModel => ({...CLT_EXAMPLES[id], n});
const viewOf = (model: CltModel) => {
    const r = cltView(model);
    if (!r.ok) throw new Error(`view failed: ${JSON.stringify(r.issue)}`);
    return r.view;
};

beforeEach(resetCltCache);

describe('examples and defaults', () => {
    it('defaults to uniform, n = 1, no CDF', () => {
        expect(DEFAULT_CLT_MODEL).toEqual({heights: [1, 1, 1, 1, 1], n: 1, cdf: false});
        expect(cltExampleOf(DEFAULT_CLT_MODEL)).toBe('uniform');
        expect(cltExampleOf(CLT_EXAMPLES.skewed)).toBe('skewed');
        expect(cltExampleOf({...DEFAULT_CLT_MODEL, heights: [1, 1, 1, 1, 2]})).toBeUndefined();
    });
    it('skewed heights are exactly f(x) = 2(1 - x)', () => {
        expect(CLT_EXAMPLES.skewed.heights).toEqual([0, 0.25, 0.5, 0.75, 1].map(x => 2 * (1 - x)));
    });
});

describe('Kolmogorov distances (spec P3 oracle, grid vs exact within 5e-5)', () => {
    it.each([[1, 0.05721], [2, 0.01643], [3, 0.00985], [5, 0.00571], [10, 0.00281], [20, 0.00139]])('uniform n=%i', (n, expected) => {
        expect(Math.abs(viewOf(withN('uniform', n)).kolmogorov - expected)).toBeLessThan(5e-5);
    });
    it.each([[1, 0.07865], [2, 0.03556], [3, 0.02492], [5, 0.01852], [10, 0.01248]])('skewed n=%i', (n, expected) => {
        expect(Math.abs(viewOf(withN('skewed', n)).kolmogorov - expected)).toBeLessThan(5e-5);
    });
});

describe('moments', () => {
    it('base and sum moments of the examples', () => {
        const u = viewOf(withN('uniform', 4));
        expect(u.mean).toBeCloseTo(0.5, 6);
        expect(u.variance).toBeCloseTo(1 / 12, 4);
        expect(u.sumMean).toBeCloseTo(2, 6);
        const s = viewOf(withN('skewed', 10));
        expect(s.mean).toBeCloseTo(1 / 3, 3);
        expect(s.sumMean).toBeCloseTo(10 / 3, 2);
        expect(Math.abs(s.foldMean - 10 / 3)).toBeLessThan(1e-3);
        expect(Math.abs(s.foldVariance - 10 / 18)).toBeLessThan(1e-3);
        expect(s.foldMean).toBeCloseTo(3.33307, 4);
        expect(s.foldVariance).toBeCloseTo(0.55558, 4);
    });
    it('reports a small negative mass residual for skewed and about 0 for uniform', () => {
        expect(viewOf(withN('skewed', 5)).massResidual).toBeLessThan(0);
        expect(Math.abs(viewOf(withN('uniform', 5)).massResidual)).toBeLessThan(1e-9);
    });
});

describe('curves', () => {
    it('density and CDF views follow the flag; the normal matches the kind', () => {
        const d = viewOf(withN('uniform', 3));
        expect(d.curve.x.length).toBe(d.curve.y.length);
        expect(Math.max(...d.normal.y)).toBeCloseTo(0.3989423, 6);
        const c = viewOf({...withN('uniform', 3), cdf: true});
        expect(c.curve.y[0]).toBe(0);
        expect(c.curve.y[c.curve.y.length - 1]).toBeCloseTo(1, 6);
        expect(c.normal.y[0]).toBeLessThan(1e-6);
        expect(c.normal.y[c.normal.y.length - 1]).toBeGreaterThan(1 - 1e-6);
        expect(c.kolmogorov).toBeCloseTo(d.kolmogorov, 12);
    });
});

describe('history cache', () => {
    it('gives the same values as a fresh nFold', () => {
        const heights = [0.5, 2, 0.25, 3, 1];
        const base = piecewiseLinearBase(heights);
        if (!base.ok) throw new Error('base');
        for (const n of [1, 2, 3, 7, 4, 12]) {
            const fresh = nFold(base.density, n);
            const cached = cltFold(heights, n);
            expect(fresh.ok && cached.ok).toBe(true);
            if (!fresh.ok || !cached.ok) return;
            expect(cached.density).toEqual(fresh.density);
            expect(cached.massResidual).toBe(fresh.massResidual);
        }
    });
    it('costs one convolution for n -> n + 1 and none for going back', () => {
        const heights = CLT_EXAMPLES.skewed.heights;
        cltFold(heights, 1);
        expect(cltConvolutionCount()).toBe(0);
        cltFold(heights, 2);
        expect(cltConvolutionCount()).toBe(1);
        cltFold(heights, 3);
        expect(cltConvolutionCount()).toBe(2);
        cltFold(heights, 2);
        cltFold(heights, 3);
        expect(cltConvolutionCount()).toBe(2);
    });
    it('is invalidated by a height change (new shape, new history, new values)', () => {
        const a = [1, 1, 1, 1, 1];
        const b = [1, 1, 1, 1, 2];
        cltFold(a, 3);
        expect(cltConvolutionCount()).toBe(2);
        const fb = cltFold(b, 3);
        expect(cltConvolutionCount()).toBe(4);
        const fa = cltFold(a, 3);
        expect(cltConvolutionCount()).toBe(4); // a is still remembered
        if (!fa.ok || !fb.ok) throw new Error('fold');
        expect(fa.density).not.toEqual(fb.density);
    });
    it('refuses n out of range', () => {
        expect(cltFold([1, 1, 1, 1, 1], N_MAX + 1)).toEqual({ok: false, status: 'n-out-of-range'});
    });
});

describe('edits', () => {
    const m = DEFAULT_CLT_MODEL;
    it('clamps a negative height to 0', () => {
        const r = setCltHeight(m, 2, -3);
        expect(r.ok && r.model.heights).toEqual([1, 1, 0, 1, 1]);
    });
    it('refuses non-finite, non-number, too large and bad index', () => {
        for (const v of [NaN, Infinity, -Infinity, '1', null, undefined, CLT_HEIGHT_MAX + 0.01]) {
            expect(setCltHeight(m, 0, v)).toEqual({ok: false, issue: {kind: 'height', max: CLT_HEIGHT_MAX}});
        }
        for (const i of [-1, 5, 1.5, '0']) expect(setCltHeight(m, i, 1)).toEqual({ok: false, issue: {kind: 'index', count: 5}});
    });
    it('refuses an all-zero shape, even through a clamped negative', () => {
        const one = {...m, heights: [0, 0, 1, 0, 0]};
        expect(setCltHeight(one, 2, 0)).toEqual({ok: false, issue: {kind: 'zero'}});
        expect(setCltHeight(one, 2, -1)).toEqual({ok: false, issue: {kind: 'zero'}});
    });
    it('n: integers 1..30 only, never clamped', () => {
        expect(setCltN(m, 30).ok).toBe(true);
        for (const v of [0, 31, 2.5, NaN, '3', -1]) expect(setCltN(m, v)).toEqual({ok: false, issue: {kind: 'n', max: 30}});
    });
    it('cdf flag and example choice', () => {
        expect(setCltCdf(m, true)).toEqual({ok: true, model: {...m, cdf: true}});
        expect(setCltCdf(m, 1)).toEqual({ok: false, issue: {kind: 'flag', field: 'cdf'}});
        const r = chooseCltExample({...m, n: 9, cdf: true}, 'skewed');
        expect(r).toEqual({ok: true, model: {heights: [2, 1.5, 1, 0.5, 0], n: 1, cdf: true}});
        expect(chooseCltExample(m, 'nope').ok).toBe(false);
    });
});

describe('check and parse', () => {
    const good = {heights: [1, 2, 3, 2, 1], n: 4, cdf: true};
    it('accepts a valid model and copies the heights', () => {
        expect(checkCltModel({...good, extra: 1})).toEqual({ok: true, model: good});
        expect(parseCltModel(good)).toEqual(good);
    });
    it.each([
        ['wrong length', {...good, heights: [1, 1, 1, 1]}],
        ['too long', {...good, heights: [1, 1, 1, 1, 1, 1]}],
        ['string height', {...good, heights: [1, '1', 1, 1, 1]}],
        ['NaN height', {...good, heights: [1, NaN, 1, 1, 1]}],
        ['negative height', {...good, heights: [1, -1, 1, 1, 1]}],
        ['too tall', {...good, heights: [1, 11, 1, 1, 1]}],
        ['all zero', {...good, heights: [0, 0, 0, 0, 0]}],
        ['n = 31', {...good, n: 31}],
        ['n = 0', {...good, n: 0}],
        ['n = 2.5', {...good, n: 2.5}],
        ['cdf string', {...good, cdf: 'yes'}],
        ['missing heights', {n: 1, cdf: false}],
    ])('rejects %s', (_name, data) => {
        expect(checkCltModel(data).ok).toBe(false);
        expect(parseCltModel(data)).toBeUndefined();
    });
    it('rejects non-objects with no specific issue', () => {
        for (const v of [null, 3, 'x', [1]]) expect(checkCltModel(v)).toEqual({ok: false, issue: undefined});
    });
    it('names the issue kinds', () => {
        expect(checkCltModel({...good, n: 31})).toEqual({ok: false, issue: {kind: 'n', max: 30}});
        expect(checkCltModel({...good, heights: [0, 0, 0, 0, 0]})).toEqual({ok: false, issue: {kind: 'zero'}});
    });
});

describe('fit window', () => {
    // Mass of the piecewise-linear graph joining (x, y) that lies outside the window (trapezoid rule on the clipped parts).
    const outside = (x: number[], y: number[]) => {
        let total = 0;
        for (let i = 0; i + 1 < x.length; i++) {
            const a = x[i];
            const b = x[i + 1];
            const at = (t: number) => y[i] + ((y[i + 1] - y[i]) * (t - a)) / (b - a);
            const leftEnd = Math.min(b, CLT_WINDOW[0]);
            if (leftEnd > a) total += (leftEnd - a) * 0.5 * (at(a) + at(leftEnd));
            const rightStart = Math.max(a, CLT_WINDOW[1]);
            if (b > rightStart) total += (b - rightStart) * 0.5 * (at(rightStart) + at(b));
        }
        return total;
    };
    it.each(['uniform', 'skewed'] as const)('holds the mass above 1e-6 of %s for n = 1..30, and the normal', id => {
        for (let n = 1; n <= N_MAX; n++) {
            const v = viewOf(withN(id, n));
            expect(outside(v.curve.x, v.curve.y)).toBeLessThan(1e-6);
            expect(v.normal.x[0]).toBe(CLT_WINDOW[0]);
            expect(v.normal.x[v.normal.x.length - 1]).toBeCloseTo(CLT_WINDOW[1], 9);
        }
    });
    it('is fixed in n and tall enough', () => {
        for (const id of ['uniform', 'skewed'] as const) {
            const first = fitCltView(withN(id, 1));
            expect(fitCltView(withN(id, 30))).toEqual(first);
            const peak = Math.max(...viewOf(withN(id, 1)).curve.y);
            expect(first[1]).toBeGreaterThan(peak);
            expect(first[0]).toBe(-6);
            expect(first[2]).toBe(6);
        }
        expect(fitCltView({...DEFAULT_CLT_MODEL, cdf: true})[1]).toBeGreaterThan(1);
    });
});
