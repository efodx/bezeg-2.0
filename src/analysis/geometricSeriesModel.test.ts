import {describe, expect, it} from 'vitest';
import {firstTermWithinTolerance, geometricPartialSum, geometricTailError, geometricTerm} from './geometricSeries';
import {
    canAdvanceSeries, checkGeometricSeriesModel, chooseSeriesExample, defaultGeometricSeriesModel, nextSeriesStep, parseGeometricSeriesModel,
    resetSeriesTerms, SERIES_EXAMPLE_IDS, SERIES_EXAMPLE_MODELS, SERIES_MAX_STEPS, SERIES_TERMS_MAX, seriesBehaviour, seriesExampleOf,
    seriesView, seriesYRange, setSeriesA, setSeriesQ, setSeriesTerms, setSeriesTolerance,
} from './geometricSeriesModel';

const model = (a: number, q: number, terms = 1, tolerance = 0) => ({a, q, terms, tolerance});

describe('geometric series model', () => {
    it('the view partial sum matches the closed form to 1e-12 for every n', () => {
        for (const [a, q] of [[1, 0.5], [0.3, 0.1], [2, -0.7], [1, 1.5], [3, 1], [1, -1]]) {
            for (let n = 1; n <= SERIES_TERMS_MAX; n++) {
                const sum = seriesView(model(a, q, n)).partialSum;
                const closed = q === 1 ? n * a : a * (1 - Math.pow(q, n)) / (1 - q);
                expect(Math.abs(sum - closed)).toBeLessThanOrEqual(1e-12 * Math.max(1, Math.abs(closed)));
            }
        }
    });

    it('q = 1 gives S_n = n a, finite, with no limit', () => {
        const view = seriesView(model(0.7, 1, 40));
        expect(view.partialSum).toBeCloseTo(28, 12);
        expect(Number.isFinite(view.partialSum)).toBe(true);
        expect(view.limit).toBeNull();
        expect(view.error).toBeNull();
    });

    it('the limit marker exists only for |q| < 1', () => {
        expect(seriesView(model(1, 0.5)).limit).toBe(2);
        for (const q of [1, -1, 1.5, -2]) expect(seriesView(model(1, q, 10)).limit).toBeNull();
        expect(seriesView(model(1, 0.999)).limit).not.toBeNull();
    });

    it('q = -1 oscillates between a and 0', () => {
        expect(seriesBehaviour({q: -1})).toBe('oscillating');
        const sums = Array.from({length: 6}, (_, i) => seriesView(model(0.4, -1, i + 1)).partialSum);
        expect(sums).toEqual([0.4, 0, 0.4, 0, 0.4, 0]);
        expect(seriesBehaviour({q: 1})).toBe('divergent');
        expect(seriesBehaviour({q: -2})).toBe('divergent');
    });

    it('the spec examples have the specified numbers', () => {
        const d = SERIES_EXAMPLE_MODELS.default;
        expect([1, 2, 3, 4, 5].map(n => geometricPartialSum(d.a, d.q, n))).toEqual([1, 1.5, 1.75, 1.875, 1.9375]);
        expect(seriesView(d).limit).toBe(2);
        expect(Math.abs(2 - geometricPartialSum(1, 0.5, 8))).toBe(0.0078125);
        expect(geometricPartialSum(1, -0.5, 4)).toBe(0.625);
        expect(seriesView(SERIES_EXAMPLE_MODELS.alternating).limit).toBeCloseTo(2 / 3, 15);
        expect(seriesView(SERIES_EXAMPLE_MODELS['repeating-three']).limit).toBeCloseTo(1 / 3, 15);
        expect(seriesView(SERIES_EXAMPLE_MODELS['repeating-nine']).limit).toBe(1);
        expect(seriesView(SERIES_EXAMPLE_MODELS.divergent).limit).toBeNull();
        for (const id of SERIES_EXAMPLE_IDS) {
            expect(parseGeometricSeriesModel(SERIES_EXAMPLE_MODELS[id])).toEqual(SERIES_EXAMPLE_MODELS[id]);
            expect(seriesExampleOf(SERIES_EXAMPLE_MODELS[id])).toBe(id);
        }
    });

    it('validates: rejects non-finite and out-of-range values, names the rule, drops unknown fields', () => {
        const ok = {a: 1, q: 0.5, terms: 3, tolerance: 0.1};
        expect(parseGeometricSeriesModel({...ok, extra: 1})).toEqual(ok);
        expect(parseGeometricSeriesModel({...ok, q: 1})).toMatchObject({q: 1});
        expect(parseGeometricSeriesModel({...ok, q: -1})).toMatchObject({q: -1});
        const issue = (patch: object) => {
            const check = checkGeometricSeriesModel({...ok, ...patch});
            return check.ok ? 'ok' : check.issue.kind;
        };
        expect(issue({a: NaN})).toBe('a');
        expect(issue({a: Infinity})).toBe('a');
        expect(issue({a: 0})).toBe('a');
        expect(issue({a: 6})).toBe('a');
        expect(issue({q: NaN})).toBe('q');
        expect(issue({q: 2.1})).toBe('q');
        expect(issue({q: -Infinity})).toBe('q');
        expect(issue({tolerance: -0.1})).toBe('tolerance');
        expect(issue({tolerance: 2})).toBe('tolerance');
        expect(issue({terms: 0})).toBe('terms');
        expect(issue({terms: 51})).toBe('terms');
        expect(issue({terms: 2.5})).toBe('terms');
        expect(issue({a: '1'})).toBe('a');
        expect(issue({q: undefined})).toBe('q');
        expect(issue({tolerance: '0'})).toBe('tolerance');
        expect(issue({terms: '3'})).toBe('terms');
        expect(checkGeometricSeriesModel({a: 1})).toMatchObject({ok: false, issue: {kind: 'q'}});
        expect(checkGeometricSeriesModel(null)).toEqual({ok: false, issue: {kind: 'object'}});
        expect(checkGeometricSeriesModel([1])).toEqual({ok: false, issue: {kind: 'object'}});
    });

    it('a committed q or a is rounded to 1e-12, so -0.9999999999999991 is stored as -1 and has no limit', () => {
        const start = model(1, 0.5, 4);
        const rounded = (setSeriesQ(start, -0.9999999999999991) as {model: {q: number}}).model;
        expect(rounded.q).toBe(-1);
        expect(seriesBehaviour(rounded)).toBe('oscillating');
        expect(seriesView({...start, ...rounded}).limit).toBeNull();
        expect((setSeriesQ(start, 1.0000000000000004) as {model: {q: number}}).model.q).toBe(1);
        expect((setSeriesA(start, 0.30000000000000004) as {model: {a: number}}).model.a).toBe(0.3);
        expect(setSeriesQ(start, 2.0000001).ok).toBe(false);
    });

    it('edits reject, never clamp, and an unchanged value keeps the same model object', () => {
        const start = model(1, 0.5, 4);
        expect(setSeriesQ(start, 0.5)).toEqual({ok: true, model: start});
        expect((setSeriesQ(start, -1) as {model: unknown}).model).toEqual({...start, q: -1});
        expect((setSeriesQ(start, 1) as {model: unknown}).model).toEqual({...start, q: 1});
        expect(setSeriesQ(start, 3).ok).toBe(false);
        expect(setSeriesA(start, 0).ok).toBe(false);
        expect(setSeriesA(start, NaN).ok).toBe(false);
        expect(setSeriesTolerance(start, 0.01).ok).toBe(true);
        expect(setSeriesTolerance(start, 1.5).ok).toBe(false);
        expect(setSeriesTerms(start, 50).ok).toBe(true);
        expect(setSeriesTerms(start, 51).ok).toBe(false);
        expect(chooseSeriesExample('nope').ok).toBe(false);
        expect(chooseSeriesExample('alternating')).toEqual({ok: true, model: SERIES_EXAMPLE_MODELS.alternating});
    });

    it('the step reveals one term and completes exactly at the cap', () => {
        let current = defaultGeometricSeriesModel();
        let steps = 0;
        while (canAdvanceSeries(current)) {
            const step = nextSeriesStep(current);
            expect(step.advanced).toBe(true);
            current = step.model;
            steps++;
            expect(step.outcome).toBe(current.terms >= SERIES_TERMS_MAX ? 'complete' : 'continue');
        }
        expect(steps).toBe(SERIES_MAX_STEPS);
        expect(current.terms).toBe(SERIES_TERMS_MAX);
        const stuck = nextSeriesStep(current);
        expect(stuck).toEqual({model: current, advanced: false, outcome: 'complete'});
        expect(resetSeriesTerms(current)).toEqual({...current, terms: 1});
    });

    it('the y range holds 0, the terms, sums and limit, and fits a divergent series to its first terms', () => {
        const converging = seriesYRange(1, 0.5);
        expect(converging.bottom).toBeLessThan(0);
        expect(converging.top).toBeGreaterThan(2);
        const diverging = seriesYRange(1, 2);
        expect(Number.isFinite(diverging.top)).toBe(true);
        expect(diverging.top).toBeLessThan(1000);
        expect(seriesYRange(1, -0.5).bottom).toBeLessThan(0);
    });

    it('leaves at least 40 percent of the board empty above the data for the caption, also for negative and small series', () => {
        for (const [a, q, tol] of [[5, 1, 0], [5, 0.5, 0.5], [1, -0.5, 0], [0.1, 0.1, 0], [5, -1, 0], [1, 2, 0], [0.1, -2, 0]] as const) {
            const {bottom, top} = seriesYRange(a, q, tol);
            let high = 0;
            for (let k = 1; k <= (Math.abs(q) <= 1 ? 50 : 8); k++) high = Math.max(high, a * q ** (k - 1), a * (q === 1 ? k : (1 - q ** k) / (1 - q)));
            expect((top - high) / (top - bottom)).toBeGreaterThanOrEqual(0.4);
        }
    });

    it('the y range holds limit +- tolerance when a band is shown', () => {
        const without = seriesYRange(1, 0.5);
        const wide = seriesYRange(1, 0.5, 1);
        expect(without.top).toBeLessThan(wide.top);
        expect(wide.top).toBeGreaterThan(3);
        const lowLimit = seriesYRange(0.1, 0.1, 1);
        expect(lowLimit.bottom).toBeLessThan(0.1 / 0.9 - 1);
        expect(seriesYRange(1, 2, 1)).toEqual(seriesYRange(1, 2));
    });
});

describe('series view coherence (N1-N3)', () => {
    it('case A: the view partial sum for a = 1, q = 0.999999999999, 50 terms is below 50 and the error is the direct tail', () => {
        const view = seriesView(model(1, 0.999999999999, 50));
        expect(view.partialSum).toBeLessThan(50);
        expect(Math.abs(view.partialSum - 49.999999998775024)).toBeLessThan(1e-12);
        expect(view.error).toBe(geometricTailError(1, 0.999999999999, 50));
    });

    it('case B: the error is the direct tail a q^n/(1-q) and agrees with firstTermWithinTolerance at 1e-18', () => {
        const first = firstTermWithinTolerance(1, 0.1, 1e-18)!;
        expect(first).toBe(19);
        for (let n = 1; n <= 30; n++) {
            const error = seriesView(model(1, 0.1, n, 1e-18)).error!;
            expect(error).toBe(geometricTailError(1, 0.1, n));
            expect(error > 0).toBe(true);
            expect(error < 1e-18).toBe(n >= first);
        }
    });

    it('the error equals the tail for every convergent q near the boundaries and is null without a limit', () => {
        for (const q of [0, 0.1, -0.5, 1 - 1e-12, -(1 - 1e-12)]) {
            for (const n of [1, 2, 49, 50]) {
                const view = seriesView(model(1, q, n));
                expect(view.error).toBe(geometricTailError(1, q, n));
                expect(view.partialSum).toBe(geometricPartialSum(1, q, n));
                expect(view.lastTerm).toBe(geometricTerm(1, q, n));
                expect(Number.isFinite(view.error!)).toBe(true);
            }
        }
        for (const q of [1, -1, 1 + 1e-12, -(1 + 1e-12), 2, -2]) {
            const view = seriesView(model(1, q, 50));
            expect(view.error).toBeNull();
            expect(view.limit).toBeNull();
            expect(Number.isFinite(view.partialSum)).toBe(true);
        }
    });

    it('the y range is finite at the domain endpoints and near both unit boundaries', () => {
        for (const a of [0.1, 5]) for (const q of [-2, 2, 0, 1, -1, 1 - 1e-12, -(1 - 1e-12), 1 + 1e-12, -(1 + 1e-12)]) {
            for (const tolerance of [0, 1e-18, 1]) {
                const range = seriesYRange(a, q, tolerance);
                expect(Number.isFinite(range.bottom) && Number.isFinite(range.top)).toBe(true);
                expect(range.top).toBeGreaterThan(range.bottom);
            }
        }
    });
});
