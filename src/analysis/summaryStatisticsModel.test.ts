import {describe, expect, it} from 'vitest';
import {
    addSummaryValue, checkSummaryModel, chooseSummaryExample, DEFAULT_SUMMARY_MODEL, fitSummaryView, moveSummaryValue,
    parseSummaryModel, removeSummaryValue, setSummaryBoxPlot, setSummaryRule, setSummarySigma, setSummarySigmaBand,
    SUMMARY_EXAMPLE_IDS, SUMMARY_EXAMPLES, SUMMARY_VALUES_MAX, summaryExampleOf, summaryStatisticsView,
} from './summaryStatisticsModel';
import type {SummaryModel} from './summaryStatisticsModel';
import type {BoxPlotAvailable} from './descriptiveStatistics';

const withValues = (values: number[], rest: Partial<SummaryModel> = {}): SummaryModel => ({...DEFAULT_SUMMARY_MODEL, values, ...rest});
const ok = (r: {ok: boolean; model?: SummaryModel}): SummaryModel => {
    if (!r.ok || !r.model) throw new Error('edit refused');
    return r.model;
};
const box = (s: {status: string}): BoxPlotAvailable => {
    if (s.status !== 'ok') throw new Error('box plot unavailable');
    return s as BoxPlotAvailable;
};
const issueOf = (r: {ok: boolean; issue?: unknown}) => (r.ok ? 'accepted' : r.issue);

describe('defaults and examples', () => {
    it('defaults to the school data, inclusive quartiles, population sigma, box plot on, band off', () => {
        expect(DEFAULT_SUMMARY_MODEL).toEqual({
            values: [4, 5, 5, 6, 6, 7, 8], rule: 'inclusive', sigma: 'population', boxPlot: true, sigmaBand: false,
        });
        expect(summaryExampleOf(DEFAULT_SUMMARY_MODEL)).toBe('school');
        expect(summaryExampleOf(withValues([2, 3, 5, 9]))).toBe('even');
        expect(summaryExampleOf(withValues([9, 5, 3, 2]))).toBeUndefined();
    });

    it('choosing an example sets the values and keeps rule, sigma and visibility', () => {
        const start = withValues([1, 2, 3], {rule: 'exclusive', sigma: 'sample', boxPlot: false, sigmaBand: true});
        for (const id of SUMMARY_EXAMPLE_IDS) {
            const next = ok(chooseSummaryExample(start, id));
            expect(next).toEqual({...start, values: SUMMARY_EXAMPLES[id]});
        }
        const same = withValues([2, 3, 5, 9]);
        expect(chooseSummaryExample(same, 'even')).toEqual({ok: true, model: same});
        expect(issueOf(chooseSummaryExample(same, 'nope'))).toEqual({kind: 'example', allowed: SUMMARY_EXAMPLE_IDS});
        expect(issueOf(chooseSummaryExample(same, 3))).toEqual({kind: 'example', allowed: SUMMARY_EXAMPLE_IDS});
    });
});

describe('readout against the spec oracle values', () => {
    const school = summaryStatisticsView(DEFAULT_SUMMARY_MODEL);

    it('school data: mean, median, both sigmas', () => {
        expect(school.n).toBe(7);
        expect(school.mean).toBeCloseTo(5.857143, 6);
        expect(school.median).toBe(6);
        expect(school.sigmaPopulation).toBeCloseTo(1.2454, 4);
        expect(school.sigmaSample).toBeCloseTo(1.3452, 4);
        expect(school.sigma).toBe(school.sigmaPopulation);
        expect(summaryStatisticsView({...DEFAULT_SUMMARY_MODEL, sigma: 'sample'}).sigma).toBe(school.sigmaSample);
    });

    it('school data: inclusive quartiles, IQR, fences and no outliers', () => {
        const s = box(school.summary);
        expect([s.rule, s.q1, s.median, s.q3, s.iqr]).toEqual(['inclusive', 5, 6, 6.5, 1.5]);
        expect([s.lowerFence, s.upperFence]).toEqual([2.75, 8.75]);
        expect(s.outliers).toEqual([]);
    });

    it('school data: the other rule is the exclusive one (Q1 5, Q3 7, IQR 2); the rule can be swapped', () => {
        const o = box(school.otherSummary);
        expect([o.rule, o.q1, o.q3, o.iqr]).toEqual(['exclusive', 5, 7, 2]);
        const swapped = summaryStatisticsView({...DEFAULT_SUMMARY_MODEL, rule: 'exclusive'});
        expect(box(swapped.summary)).toEqual(o);
        expect(box(swapped.otherSummary)).toEqual(box(school.summary));
    });

    it('moving 8 to 30: the mean follows, the median and quartiles stay, 30 is flagged', () => {
        const moved = ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 6, 30));
        expect(moved.values).toEqual([4, 5, 5, 6, 6, 7, 30]);
        expect(summaryExampleOf(moved)).toBe('outlier');
        const v = summaryStatisticsView(moved);
        expect(v.mean).toBeCloseTo(9.0, 6);
        expect(v.median).toBe(6);
        expect(v.sigmaPopulation).toBeCloseTo(8.6189, 4);
        expect(v.sigmaSample).toBeCloseTo(9.3095, 4);
        const s = box(v.summary);
        expect([s.q1, s.median, s.q3]).toEqual([5, 6, 6.5]);
        expect(s.outliers).toEqual([30]);
        expect(s.whiskerHigh).toBe(7);
    });

    it('sum of squared deviations is smaller at the mean, of absolute deviations at the median', () => {
        expect(school.atMean.squared).toBeCloseTo(10.857, 3);
        expect(school.atMedian.squared).toBe(11);
        expect(school.atMedian.absolute).toBe(7);
        expect(school.atMean.absolute).toBeCloseTo(7.143, 3);
    });

    it('even count: {2,3,5,9} has median 4', () => {
        const v = summaryStatisticsView(withValues([2, 3, 5, 9]));
        expect(v.median).toBe(4);
        expect(v.mean).toBe(4.75);
        expect(box(v.summary).q1).toBe(2.5);
    });

    it('n = 1: sigma 0, sample sigma undefined (not an error), box plot too-few', () => {
        const v = summaryStatisticsView(withValues([7]));
        expect([v.n, v.mean, v.median, v.sigmaPopulation]).toEqual([1, 7, 7, 0]);
        expect(v.sigmaSample).toBeUndefined();
        expect(summaryStatisticsView(withValues([7], {sigma: 'sample'})).sigma).toBeUndefined();
        expect(v.summary).toEqual({status: 'too-few', rule: 'inclusive', n: 1});
        expect(v.otherSummary).toEqual({status: 'too-few', rule: 'exclusive', n: 1});
    });

    it('n = 2: box plot too-few, sigma defined', () => {
        const v = summaryStatisticsView(withValues([2, 4]));
        expect(v.summary.status).toBe('too-few');
        expect(v.sigmaPopulation).toBe(1);
        expect(v.sigmaSample).toBeCloseTo(Math.SQRT2, 12);
        expect(summaryStatisticsView(withValues([2, 4, 4])).summary.status).toBe('ok');
    });
});

describe('invariance (deterministic property test)', () => {
    // A seeded linear congruential generator; no Math.random.
    const lcg = (seed: number) => {
        let s = seed >>> 0;
        return () => {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 2 ** 32;
        };
    };
    const shuffle = (xs: number[], rnd: () => number): number[] => {
        const a = [...xs];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };
    const pivots = (model: SummaryModel) => {
        const v = summaryStatisticsView(model);
        const s = box(v.summary);
        const o = box(v.otherSummary);
        return [v.median, s.q1, s.q3, o.q1, o.q3, s.iqr];
    };

    it('median and quartiles (both rules) are invariant under reordering; the mean is exact up to rounding', () => {
        const rnd = lcg(12345);
        for (let trial = 0; trial < 60; trial++) {
            const n = 3 + Math.floor(rnd() * 13);
            const values = Array.from({length: n}, () => Math.round(rnd() * 400) / 10);
            const model = withValues(values);
            const shuffled = withValues(shuffle(values, rnd));
            expect(pivots(shuffled)).toEqual(pivots(model));
            expect(summaryStatisticsView(shuffled).mean).toBeCloseTo(summaryStatisticsView(model).mean, 12);
        }
    });

    it('moving the largest or smallest value without crossing its rank keeps median and quartiles but changes the mean', () => {
        const rnd = lcg(987654321);
        for (let trial = 0; trial < 60; trial++) {
            const n = 7 + Math.floor(rnd() * 9);
            const values = Array.from({length: n}, () => Math.round(rnd() * 400) / 10);
            const sorted = [...values].sort((a, b) => a - b);
            const top = values.indexOf(sorted[n - 1]);
            const model = withValues(values);
            // The largest value moves between the second largest and 40 (to a different spot).
            const target = Math.round((sorted[n - 2] + rnd() * (40 - sorted[n - 2])) * 10) / 10;
            const up = ok(moveSummaryValue(model, top, target));
            expect(pivots(up)).toEqual(pivots(model));
            if (target !== sorted[n - 1]) expect(summaryStatisticsView(up).mean).not.toBe(summaryStatisticsView(model).mean);
            // The smallest value moves between 0 and the second smallest.
            const bottom = values.indexOf(sorted[0]);
            const low = Math.round(rnd() * sorted[1] * 10) / 10;
            const down = ok(moveSummaryValue(model, bottom, low));
            expect(pivots(down)).toEqual(pivots(model));
            if (low !== sorted[0]) expect(summaryStatisticsView(down).mean).not.toBe(summaryStatisticsView(model).mean);
        }
    });
});

describe('editing', () => {
    it('snaps a moved value to tenths (half tenths away from zero) and keeps the order of the dots', () => {
        expect(ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 0, 5.04)).values[0]).toBe(5);
        expect(ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 0, 5.05)).values[0]).toBe(5.1);
        expect(ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 3, 0.04)).values).toEqual([4, 5, 5, 0, 6, 7, 8]);
        expect(ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 3, 39.96)).values[3]).toBe(40);
    });

    it('a move to the same snapped value returns the same model', () => {
        expect(ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 0, 4.04))).toBe(DEFAULT_SUMMARY_MODEL);
    });

    it('refuses non-finite, out-of-range values and bad indices without changing the model', () => {
        const before = structuredClone(DEFAULT_SUMMARY_MODEL);
        const value = {kind: 'value', min: 0, max: 40};
        for (const bad of [NaN, Infinity, -Infinity, -0.06, 40.05, 41, '5', null, undefined]) {
            expect(issueOf(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 0, bad))).toEqual(value);
        }
        for (const bad of [-1, 7, 1.5, NaN, '0', undefined]) {
            expect(issueOf(moveSummaryValue(DEFAULT_SUMMARY_MODEL, bad, 5))).toEqual({kind: 'index', count: 7});
            expect(issueOf(removeSummaryValue(DEFAULT_SUMMARY_MODEL, bad))).toEqual({kind: 'index', count: 7});
        }
        expect(DEFAULT_SUMMARY_MODEL).toEqual(before);
    });

    it('accepts the range ends and the half tenth that rounds to them', () => {
        expect(ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 0, 0)).values[0]).toBe(0);
        expect(ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 0, -0.04)).values[0]).toBe(0);
        expect(ok(moveSummaryValue(DEFAULT_SUMMARY_MODEL, 0, 40)).values[0]).toBe(40);
    });

    it('adds a value at the current median (snapped), up to 15, and refuses beyond', () => {
        expect(ok(addSummaryValue(DEFAULT_SUMMARY_MODEL)).values).toEqual([4, 5, 5, 6, 6, 7, 8, 6]);
        expect(ok(addSummaryValue(withValues([2, 3, 5, 9]))).values).toEqual([2, 3, 5, 9, 4]);
        expect(ok(addSummaryValue(withValues([0.1, 0.2]))).values).toEqual([0.1, 0.2, 0.2]); // median 0.15 snaps to 0.2
        expect(ok(addSummaryValue(DEFAULT_SUMMARY_MODEL, 12.34)).values[7]).toBe(12.3);
        expect(issueOf(addSummaryValue(DEFAULT_SUMMARY_MODEL, 41))).toEqual({kind: 'value', min: 0, max: 40});
        let model = DEFAULT_SUMMARY_MODEL;
        while (model.values.length < SUMMARY_VALUES_MAX) model = ok(addSummaryValue(model));
        expect(model.values).toHaveLength(15);
        expect(issueOf(addSummaryValue(model))).toEqual({kind: 'full', max: 15});
    });

    it('removes a value by index down to one, and refuses the last', () => {
        expect(ok(removeSummaryValue(DEFAULT_SUMMARY_MODEL, 6)).values).toEqual([4, 5, 5, 6, 6, 7]);
        expect(ok(removeSummaryValue(DEFAULT_SUMMARY_MODEL, 0)).values).toEqual([5, 5, 6, 6, 7, 8]);
        expect(ok(removeSummaryValue(withValues([3, 4]), 0)).values).toEqual([4]);
        expect(issueOf(removeSummaryValue(withValues([4]), 0))).toEqual({kind: 'last', min: 1});
    });

    it('sets the rule, sigma kind and the two flags; anything else is refused', () => {
        expect(ok(setSummaryRule(DEFAULT_SUMMARY_MODEL, 'exclusive')).rule).toBe('exclusive');
        expect(ok(setSummarySigma(DEFAULT_SUMMARY_MODEL, 'sample')).sigma).toBe('sample');
        expect(ok(setSummaryBoxPlot(DEFAULT_SUMMARY_MODEL, false)).boxPlot).toBe(false);
        expect(ok(setSummarySigmaBand(DEFAULT_SUMMARY_MODEL, true)).sigmaBand).toBe(true);
        expect(ok(setSummaryRule(DEFAULT_SUMMARY_MODEL, 'inclusive'))).toBe(DEFAULT_SUMMARY_MODEL);
        expect(issueOf(setSummaryRule(DEFAULT_SUMMARY_MODEL, 'linear'))).toEqual({kind: 'rule', allowed: ['inclusive', 'exclusive']});
        expect(issueOf(setSummarySigma(DEFAULT_SUMMARY_MODEL, 1))).toEqual({kind: 'sigma', allowed: ['population', 'sample']});
        expect(issueOf(setSummaryBoxPlot(DEFAULT_SUMMARY_MODEL, 'yes'))).toEqual({kind: 'flag', field: 'boxPlot'});
        expect(issueOf(setSummarySigmaBand(DEFAULT_SUMMARY_MODEL, 1))).toEqual({kind: 'flag', field: 'sigmaBand'});
    });
});

describe('import', () => {
    const refusal = (data: unknown) => {
        const r = checkSummaryModel(data);
        return r.ok ? 'accepted' : r.issue;
    };
    const valuesIssue = {kind: 'values', min: 1, max: 15};
    const valueIssue = {kind: 'value', min: 0, max: 40};

    it('round trips every example, the default and a copy', () => {
        for (const id of SUMMARY_EXAMPLE_IDS) {
            const model = withValues([...SUMMARY_EXAMPLES[id]], {rule: 'exclusive', sigma: 'sample', boxPlot: false, sigmaBand: true});
            expect(parseSummaryModel(JSON.parse(JSON.stringify(model)))).toEqual(model);
        }
        const check = checkSummaryModel(DEFAULT_SUMMARY_MODEL);
        expect(check.ok && check.model).toEqual(DEFAULT_SUMMARY_MODEL);
        expect(check.ok && check.model.values).not.toBe(DEFAULT_SUMMARY_MODEL.values);
        expect(parseSummaryModel(withValues([0.1 + 0.2, 40]))?.values).toEqual([0.3, 40]);
    });

    it('refuses non-objects with no issue', () => {
        for (const bad of [null, undefined, 3, 'x', [1, 2, 3]]) expect(refusal(bad)).toBeUndefined();
    });

    it('refuses non-arrays and the wrong count', () => {
        expect(refusal({...DEFAULT_SUMMARY_MODEL, values: 'abc'})).toEqual(valuesIssue);
        expect(refusal({...DEFAULT_SUMMARY_MODEL, values: []})).toEqual(valuesIssue);
        expect(refusal({...DEFAULT_SUMMARY_MODEL, values: new Array(16).fill(5)})).toEqual(valuesIssue);
        expect(refusal({...DEFAULT_SUMMARY_MODEL, values: undefined})).toEqual(valuesIssue);
    });

    it('refuses non-finite and out-of-range values', () => {
        for (const bad of [NaN, Infinity, -0.1, 40.1, '5', null]) {
            expect(refusal({...DEFAULT_SUMMARY_MODEL, values: [1, bad, 3]})).toEqual(valueIssue);
        }
    });

    it('refuses values off the tenth grid and accepts float noise on it', () => {
        expect(refusal({...DEFAULT_SUMMARY_MODEL, values: [1, 2.05, 3]})).toEqual({kind: 'grid'});
        expect(refusal({...DEFAULT_SUMMARY_MODEL, values: [1, 2.001, 3]})).toEqual({kind: 'grid'});
        expect(refusal({...DEFAULT_SUMMARY_MODEL, values: [0.1 + 0.2, 3, 4]})).toBe('accepted');
    });

    it('refuses an unknown rule or sigma and non-boolean flags', () => {
        expect(refusal({...DEFAULT_SUMMARY_MODEL, rule: 'linear'})).toEqual({kind: 'rule', allowed: ['inclusive', 'exclusive']});
        expect(refusal({...DEFAULT_SUMMARY_MODEL, sigma: undefined})).toEqual({kind: 'sigma', allowed: ['population', 'sample']});
        expect(refusal({...DEFAULT_SUMMARY_MODEL, boxPlot: 1})).toEqual({kind: 'flag', field: 'boxPlot'});
        expect(refusal({...DEFAULT_SUMMARY_MODEL, sigmaBand: 'no'})).toEqual({kind: 'flag', field: 'sigmaBand'});
        expect(parseSummaryModel({...DEFAULT_SUMMARY_MODEL, rule: 'linear'})).toBeUndefined();
    });
});

describe('fitted view', () => {
    it('is at least 10 wide, covers the values with a margin and uses the documented vertical extent', () => {
        expect(fitSummaryView([4, 5, 5, 6, 6, 7, 8])).toEqual([1, 4, 11, -2]);
        const wide = fitSummaryView([10, 30]);
        expect(wide).toEqual([9, 4, 31, -2]);
        expect(fitSummaryView([10, 30])).toEqual(wide);
    });

    it('is shifted and clamped into [-1, 41]', () => {
        expect(fitSummaryView([0])).toEqual([-1, 4, 9, -2]);
        expect(fitSummaryView([40])).toEqual([31, 4, 41, -2]);
        expect(fitSummaryView([0, 40])).toEqual([-1, 4, 41, -2]);
    });

    it('always covers every value, for all legal ends', () => {
        for (let lo = 0; lo <= 40; lo += 2.5) {
            for (let hi = lo; hi <= 40; hi += 2.5) {
                const [left, , right] = fitSummaryView([lo, hi]);
                expect(left).toBeLessThanOrEqual(lo);
                expect(right).toBeGreaterThanOrEqual(hi);
                expect(right - left).toBeGreaterThanOrEqual(10);
                expect(left).toBeGreaterThanOrEqual(-1);
                expect(right).toBeLessThanOrEqual(41);
            }
        }
    });

    it('is part of the readout', () => {
        expect(summaryStatisticsView(DEFAULT_SUMMARY_MODEL).bounds).toEqual(fitSummaryView(DEFAULT_SUMMARY_MODEL.values));
    });
});
