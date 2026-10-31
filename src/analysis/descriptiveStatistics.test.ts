import {
    fiveNumberSummary, mean, median, standardDeviation, sumAbsoluteDeviations, sumSquaredDeviations,
    type BoxPlotAvailable,
} from './descriptiveStatistics';

const box = (values: number[], rule: 'inclusive' | 'exclusive' = 'inclusive'): BoxPlotAvailable => {
    const s = fiveNumberSummary(values, rule);
    if (s.status !== 'ok') throw new Error('box plot unexpectedly unavailable');
    return s;
};

const BASE = [4, 5, 5, 6, 6, 7, 8];
const MOVED = [4, 5, 5, 6, 6, 7, 30];

describe('P4 default example', () => {
    it('mean, median and sigma', () => {
        expect(mean(BASE)).toBeCloseTo(5.857143, 6);
        expect(median(BASE)).toBe(6);
        expect(standardDeviation(BASE)).toBeCloseTo(1.2454, 4);
        expect(standardDeviation(BASE, 'sample')).toBeCloseTo(1.3452, 4);
    });

    it('inclusive quartiles, IQR and fences', () => {
        const b = box(BASE);
        expect([b.q1, b.median, b.q3, b.iqr]).toEqual([5, 6, 6.5, 1.5]);
        expect([b.lowerFence, b.upperFence]).toEqual([2.75, 8.75]);
        expect(b.outliers).toEqual([]);
        expect([b.whiskerLow, b.whiskerHigh]).toEqual([4, 8]);
    });

    it('the default rule is the inclusive one and the default sigma is the population one', () => {
        const d = fiveNumberSummary(BASE);
        expect(d).toEqual(fiveNumberSummary(BASE, 'inclusive'));
        expect(d.status === 'ok' && d.rule).toBe('inclusive');
        expect(standardDeviation(BASE)).toBe(standardDeviation(BASE, 'population'));
    });

    it('exclusive rule is the comparison rule', () => {
        const b = box(BASE, 'exclusive');
        expect([b.q1, b.median, b.q3, b.iqr]).toEqual([5, 6, 7, 2]);
    });

    it('moving 8 to 30 flags it beyond 8.75 and leaves median and quartiles alone', () => {
        const b = box(MOVED);
        expect(mean(MOVED)).toBeCloseTo(9.0, 10);
        expect(median(MOVED)).toBe(6);
        expect(standardDeviation(MOVED)).toBeCloseTo(8.6189, 4);
        expect(standardDeviation(MOVED, 'sample')).toBeCloseTo(9.3095, 4);
        expect([b.q1, b.median, b.q3, b.upperFence]).toEqual([5, 6, 6.5, 8.75]);
        expect(b.outliers).toEqual([30]);
        expect(b.whiskerHigh).toBe(7);
    });

    it('even sample has the median of the middle two', () => {
        expect(median([2, 3, 5, 9])).toBe(4);
        expect(median([9, 2, 5, 3])).toBe(4);
    });

    it('mean minimises squares, median minimises absolute deviations', () => {
        const m = mean(BASE);
        expect(sumSquaredDeviations(BASE, m)).toBeCloseTo(10.857, 3);
        expect(sumSquaredDeviations(BASE, 6)).toBeCloseTo(11, 12);
        expect(sumAbsoluteDeviations(BASE, 6)).toBeCloseTo(7, 12);
        expect(sumAbsoluteDeviations(BASE, m)).toBeCloseTo(7.143, 3);
        for (const c of [4.5, 5.5, 5.8, 6.2, 7]) {
            expect(sumSquaredDeviations(BASE, c)).toBeGreaterThanOrEqual(sumSquaredDeviations(BASE, m) - 1e-12);
            expect(sumAbsoluteDeviations(BASE, c)).toBeGreaterThanOrEqual(7 - 1e-12);
        }
    });
});

describe('school sources (ADR 0027)', () => {
    const eleven = [46, 103, 141, 149, 168, 169, 180, 188, 197, 215, 256];
    const fifteen = [12, 13, 14, 16, 17, 17, 18, 20, 20, 21, 22, 22, 25, 28, 33];

    it('11 values', () => {
        expect([box(eleven).q1, box(eleven).q3]).toEqual([145, 192.5]);
        expect([box(eleven, 'exclusive').q1, box(eleven, 'exclusive').q3]).toEqual([141, 197]);
    });

    it('15 values', () => {
        expect([box(fifteen).q1, box(fifteen).q3]).toEqual([16.5, 22]);
    });

    it('sigma of 15, 12, 25, 22, 20', () => {
        const v = [15, 12, 25, 22, 20];
        expect(standardDeviation(v)).toBeCloseTo(4.707, 3);
        expect(standardDeviation(v, 'sample')).toBeCloseTo(5.263, 3);
    });
});

describe('exact integer-tenth comparison', () => {
    it('a value exactly on the fence is not flagged, a tenth beyond it is', () => {
        // Q1=1, Q3=2 (inclusive on 1,1,2,2): IQR 1, upper fence 3.5.
        expect(box([1, 1, 2, 2, 3.5]).outliers).toEqual([]);
        expect(box([1, 1, 2, 2, 3.6]).outliers).toEqual([3.6]);
    });

    it('half-tenth quartiles and quarter-tenth fences', () => {
        const b = box([0.1, 0.2, 0.4, 0.5, 0.7, 0.8, 1, 1.2]);
        expect(b.q1Half).toBe(6); // (0.2 + 0.4)/2 = 0.3 tenths 3 -> 6 half tenths
        expect(b.q3Half).toBe(18); // (0.8 + 1)/2 = 0.9 = 9 tenths = 18 half tenths
    });

    it('flags 0.1 beyond a quarter-tenth fence, not a hair inside', () => {
        // sorted tenths 0,1,2,3 plus x: Q1 = 0.05 (half tenth 1), Q3 from upper half.
        const values = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
        const b = box(values);
        // lower half 0..0.3 -> Q1 0.15, upper half 0.4..0.7 -> Q3 0.55, IQR 0.4, fences -0.45 and 1.15.
        expect([b.q1, b.q3, b.iqr, b.lowerFence, b.upperFence]).toEqual([0.15, 0.55, 0.4, -0.45, 1.15]);
        expect(b.lowerFenceQuarter).toBe(-18);
        expect(b.upperFenceQuarter).toBe(46);
        // Replacing the maximum keeps both quartiles (n = 8, upper half median uses the middle two).
        const withMax = (m: number) => [...values.slice(0, 7), m];
        expect(box(withMax(1.1)).outliers).toEqual([]);
        expect(box(withMax(1.2)).outliers).toEqual([1.2]);
    });
});

describe('statuses and edge cases', () => {
    it('fewer than 3 values: box plot unavailable, not an error', () => {
        expect(fiveNumberSummary([5, 7]).status).toBe('too-few');
        expect(fiveNumberSummary([5]).status).toBe('too-few');
        expect(fiveNumberSummary([5, 7, 9]).status).toBe('ok');
    });

    it('sigma of one value is 0, sample sigma undefined', () => {
        expect(standardDeviation([4])).toBe(0);
        expect(standardDeviation([4], 'sample')).toBeUndefined();
        expect(median([4])).toBe(4);
        expect(standardDeviation([4, 4, 4])).toBe(0);
    });

    it('three values under the exclusive rule still give quartiles', () => {
        const b = box([1, 2, 6], 'exclusive');
        expect([b.q1, b.median, b.q3]).toEqual([1, 2, 6]);
    });

    it('rejects empty and non-finite input with RangeError', () => {
        expect(() => mean([])).toThrow(RangeError);
        expect(() => fiveNumberSummary([])).toThrow(RangeError);
        expect(() => median([1, NaN])).toThrow(RangeError);
        expect(() => standardDeviation([Infinity])).toThrow(RangeError);
    });
});

describe('property: median and quartiles are rank statistics, the mean is not', () => {
    let seed = 12345;
    const rand = () => {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        return seed / 2147483648;
    };

    it('invariant under reordering', () => {
        for (let trial = 0; trial < 50; trial++) {
            const n = 3 + Math.floor(rand() * 13);
            const values = Array.from({length: n}, () => Math.round(rand() * 300) / 10);
            const shuffled = [...values].sort(() => rand() - 0.5);
            for (const rule of ['inclusive', 'exclusive'] as const) {
                const a = box(values, rule);
                const b = box(shuffled, rule);
                expect([b.q1Half, b.medianHalf, b.q3Half]).toEqual([a.q1Half, a.medianHalf, a.q3Half]);
            }
            expect(median(shuffled)).toBe(median(values));
        }
    });

    it('invariant when an extreme value moves without crossing its rank; the mean moves', () => {
        for (let trial = 0; trial < 50; trial++) {
            const n = 6 + Math.floor(rand() * 10); // n >= 6 so no quartile uses an extreme value
            const sorted = Array.from({length: n}, (_, i) => i * 3 + Math.round(rand() * 20) / 10); // strictly increasing
            for (const [i, newValue] of [[0, sorted[0] - 7.3], [n - 1, sorted[n - 1] + 11.4]] as const) {
                const changed = [...sorted];
                changed[i] = newValue;
                for (const rule of ['inclusive', 'exclusive'] as const) {
                    const a = box(sorted, rule);
                    const b = box(changed, rule);
                    expect([b.q1Half, b.medianHalf, b.q3Half]).toEqual([a.q1Half, a.medianHalf, a.q3Half]);
                }
                expect(median(changed)).toBe(median(sorted));
                expect(mean(changed)).not.toBeCloseTo(mean(sorted), 6);
            }
        }
    });

    it('the lesson example: an outlier moves the mean only', () => {
        expect(median(MOVED)).toBe(median(BASE));
        expect(mean(MOVED)).not.toBeCloseTo(mean(BASE), 3);
    });
});
