import {describe, expect, it} from 'vitest';
import {
    firstTermWithinTolerance,
    GEOMETRIC_SERIES_MAX_TERMS,
    geometricPartialSum,
    geometricPartialSums,
    geometricSeriesValues,
    geometricTailError,
    geometricSeriesConverges,
    geometricSeriesLimit,
    geometricTerm,
} from './geometricSeries';

describe('geometric series', () => {
    it('partial sums match the closed form and direct summation to 1e-12 relative', () => {
        for (const [a, q] of [[1, 0.5], [2, -0.7], [0.3, 0.1], [-4, 1.05], [1, 1.3]]) {
            const sums = geometricPartialSums(a, q, 30);
            let direct = 0;
            for (let n = 1; n <= 30; n++) {
                direct += geometricTerm(a, q, n);
                const tolerance = 1e-12 * Math.max(1, Math.abs(direct));
                expect(Math.abs(geometricPartialSum(a, q, n) - direct)).toBeLessThanOrEqual(tolerance);
                expect(Math.abs(sums[n - 1] - direct)).toBeLessThanOrEqual(tolerance);
            }
        }
    });
    it('q = 1 gives n*a without division', () => {
        expect(geometricPartialSum(3, 1, 7)).toBe(21);
        expect(Number.isFinite(geometricPartialSum(0.5, 1, 100))).toBe(true);
        expect(geometricSeriesLimit(3, 1)).toBeNull();
    });
    it('limit exists only for |q| < 1 and a != 0', () => {
        expect(geometricSeriesConverges(1, 0.99)).toBe(true);
        for (const q of [1, -1, 1.5, -2]) expect(geometricSeriesLimit(1, q)).toBeNull();
        expect(geometricSeriesLimit(0, 0.5)).toBeNull();
    });
    it('q = -1 oscillates between a and 0', () => {
        expect([1, 2, 3, 4].map(n => geometricPartialSum(2, -1, n))).toEqual([2, 0, 2, 0]);
    });
    it('spec values for a=1, q=1/2', () => {
        expect(geometricPartialSums(1, 0.5, 5)).toEqual([1, 1.5, 1.75, 1.875, 1.9375]);
        expect(geometricSeriesLimit(1, 0.5)).toBe(2);
        expect(2 - geometricPartialSum(1, 0.5, 7)).toBeGreaterThanOrEqual(0.01);
        expect(2 - geometricPartialSum(1, 0.5, 8)).toBeCloseTo(0.0078125, 12);
        expect(firstTermWithinTolerance(1, 0.5, 0.01)).toBe(8);
    });
    it('spec values for q = -1/2', () => {
        expect(geometricPartialSum(1, -0.5, 4)).toBeCloseTo(0.625, 12);
        expect(geometricSeriesLimit(1, -0.5)).toBeCloseTo(2 / 3, 12);
    });
    it('repeating decimals', () => {
        expect(geometricSeriesLimit(0.3, 0.1)).toBeCloseTo(1 / 3, 12);
        expect(geometricSeriesLimit(0.9, 0.1)).toBeCloseTo(1, 12);
    });
    it('term cap is a named constant and clamps', () => {
        expect(GEOMETRIC_SERIES_MAX_TERMS).toBeGreaterThan(8);
        expect(geometricPartialSums(1, 0.5, 10000)).toHaveLength(GEOMETRIC_SERIES_MAX_TERMS);
    });

    it('alternating q = -0.5: the error at n-1 is just above the tolerance, at n just below; equality does not count', () => {
        // The tail is the directly evaluated a q^n/(1-q); the former limit - S_n differed from it by rounding, which the equality case below detects.
        const error = (n: number) => geometricTailError(1, -0.5, n)!;
        for (let n = 2; n <= 12; n++) {
            expect(error(n)).toBeLessThan(error(n - 1));
            expect(firstTermWithinTolerance(1, -0.5, error(n - 1) + 1e-9)).toBe(n - 1);
            expect(firstTermWithinTolerance(1, -0.5, error(n - 1) - 1e-9)).toBe(n);
            expect(firstTermWithinTolerance(1, -0.5, error(n))).toBe(n + 1);
        }
    });
});

/** Exact binary value of a finite double as a BigInt rational (numerator, denominator). */
function exactRational(x: number): [bigint, bigint] {
    if (x === 0) return [0n, 1n];
    const view = new DataView(new ArrayBuffer(8));
    view.setFloat64(0, x);
    const bits = view.getBigUint64(0);
    const exponent = Number((bits >> 52n) & 0x7ffn);
    const fraction = bits & ((1n << 52n) - 1n);
    const mantissa = exponent === 0 ? fraction : fraction | (1n << 52n);
    const shift = (exponent === 0 ? 1 : exponent) - 1075;
    const signed = bits >> 63n ? -mantissa : mantissa;
    return shift >= 0 ? [signed << BigInt(shift), 1n] : [signed, 1n << BigInt(-shift)];
}

/** Exact S_n = a * sum_{k<n} q^k over the exact doubles a and q, as a rational. */
function exactPartialSum(a: number, q: number, n: number): [bigint, bigint] {
    const [qn, qd] = exactRational(q);
    const [an, ad] = exactRational(a);
    let sum = 0n;
    for (let k = 0; k < n; k++) sum += qn ** BigInt(k) * qd ** BigInt(n - 1 - k);
    return [sum * an, qd ** BigInt(n - 1) * ad];
}

/** |limit - S_n| as an exact difference of a/(1-q) and the exact partial sum, so the identity behind the direct tail is checked, not assumed. */
function exactLimitGap(a: number, q: number, n: number): [bigint, bigint] {
    const [qn, qd] = exactRational(q);
    const [an, ad] = exactRational(a);
    const [sn, sd] = exactPartialSum(a, q, n);
    const gap = an * qd * sd - sn * ad * (qd - qn);
    return [gap < 0n ? -gap : gap, ad * (qd - qn) * sd];
}

/** |value - exact| / |exact| (absolute when exact is 0), computed in integers. */
function relativeError(value: number, [en, ed]: [bigint, bigint]): number {
    const [vn, vd] = exactRational(value);
    const diff = vn * ed - en * vd;
    const absDiff = diff < 0n ? -diff : diff;
    if (en === 0n) return Number(absDiff * 10n ** 30n / (vd * ed)) / 1e30;
    const absExact = en < 0n ? -en : en;
    return Number(absDiff * 10n ** 30n / (vd * absExact)) / 1e30;
}

const GRID_Q = (() => {
    const values = [1 - 2 ** -53, -(1 - 2 ** -53), 1 + 2 ** -52, -(1 + 2 ** -52), 1 - 1e-12, -(1 - 1e-12), 1 + 1e-12, -(1 + 1e-12), 0.999999999999, -0.999999999999, 0.1, 0.3, 0.7, -0.3, 2, -2, 0, 1, -1];
    for (let i = -40; i <= 40; i++) values.push(i / 20);
    return values;
})();
const GRID_A = [0.1, 0.3, 1, 5];

/**
 * Observed worst relative error of this implementation over GRID_Q x GRID_A x n 1..50 was 9.2e-16 (q = -1.2, n = 49); the closed
 * form with subtraction was 2.5e-11 (near q = -1, n = 50). 4e-15 is about 4x the observed worst: it leaves room for libm
 * differences in pow/expm1 between platforms and still fails by 4 orders of magnitude for the subtraction defect.
 */
const SUM_TOLERANCE = 4e-15;

describe('stable evaluation (N1)', () => {
    it('case A: a = 1, q = 0.999999999999, 50 terms is not rounded to 50', () => {
        const sum = geometricPartialSum(1, 0.999999999999, 50);
        expect(sum).toBeLessThan(50);
        expect(relativeError(sum, exactPartialSum(1, 0.999999999999, 50))).toBeLessThanOrEqual(SUM_TOLERANCE);
        expect(Math.abs(sum - 49.999999998775024)).toBeLessThan(1e-12);
    });
    it('case B: a = 1, q = 0.1, tolerance 1e-18 first holds at term 19, strict before, at and after the threshold', () => {
        expect(firstTermWithinTolerance(1, 0.1, 1e-18)).toBe(19);
        for (let n = 3; n <= 40; n++) {
            const tail = geometricTailError(1, 0.1, n)!;
            expect(firstTermWithinTolerance(1, 0.1, tail * (1 + 1e-9))).toBe(n);
            expect(firstTermWithinTolerance(1, 0.1, tail)).toBe(n + 1);
            expect(firstTermWithinTolerance(1, 0.1, tail * (1 - 1e-9))).toBe(n + 1);
        }
    });
    it('finite sums agree with the exact BigInt reference over the grid', () => {
        let worst = 0;
        for (const a of GRID_A) for (const q of GRID_Q) for (let n = 1; n <= GEOMETRIC_SERIES_MAX_TERMS; n++) {
            const error = relativeError(geometricPartialSum(a, q, n), exactPartialSum(a, q, n));
            worst = Math.max(worst, error);
            if (error > SUM_TOLERANCE) throw new Error(`a=${a} q=${q} n=${n} relative error ${error}`);
        }
        expect(worst).toBeLessThanOrEqual(SUM_TOLERANCE);
    });
    it('the tail agrees to 1e-14 relative with the exact difference of the limit and S_n', () => {
        for (const a of GRID_A) for (const q of [0.1, -0.5, 0.5, -0.9, 0.9, 1 - 2 ** -53, -(1 - 2 ** -53), 1 - 1e-12, -(1 - 1e-12), 0]) for (let n = 1; n <= 50; n++) {
            const tail = geometricTailError(a, q, n)!;
            expect(Number.isFinite(tail)).toBe(true);
            expect(tail).toBeGreaterThanOrEqual(0);
            expect(relativeError(tail, exactLimitGap(a, q, n))).toBeLessThanOrEqual(1e-14);
        }
        for (let n = 1; n <= 30; n++) {
            expect(geometricTailError(1, 0.5, n)).toBe(2 ** (1 - n));
        }
        expect(geometricTailError(1, 1, 3)).toBeNull();
        expect(geometricTailError(0, 0.5, 3)).toBeNull();
    });
});

describe('coherent consumers (N2) and unchanged rules (N3)', () => {
    it('exactly representable results stay exact', () => {
        for (let n = 1; n <= 50; n++) {
            expect(geometricPartialSum(1, 2, n)).toBe(2 ** n - 1);
            expect(geometricPartialSum(1, 0.5, n)).toBe(2 - 2 ** (1 - n));
            expect(geometricPartialSum(0.3, -1, n)).toBe(n % 2 === 1 ? 0.3 : 0);
            expect(geometricPartialSum(5, 1, n)).toBe(5 * n);
        }
    });
    it('q = 0 gives S_n = a with tail 0 and no NaN', () => {
        for (let n = 1; n <= 50; n++) {
            expect(geometricPartialSum(0.7, 0, n)).toBe(0.7);
            expect(geometricTailError(0.7, 0, n)).toBe(0);
        }
        expect(firstTermWithinTolerance(0.7, 0, 0.001)).toBe(1);
    });
    it('values are finite everywhere on the domain grid and the value bundle agrees with its parts', () => {
        for (const a of GRID_A) for (const q of GRID_Q) for (let n = 1; n <= 50; n++) {
            const values = geometricSeriesValues(a, q, n);
            expect(Number.isFinite(values.term) && Number.isFinite(values.sum)).toBe(true);
            expect(values.sum).toBe(geometricPartialSum(a, q, n));
            expect(values.term).toBe(geometricTerm(a, q, n));
            expect(values.limit).toBe(geometricSeriesLimit(a, q));
            expect(values.tail).toBe(geometricTailError(a, q, n));
            expect(values.tail === null).toBe(values.limit === null);
            if (values.tail !== null) expect(Number.isFinite(values.tail)).toBe(true);
        }
    });
    it('partialSums equals partialSum per index, clamps to the cap, and partialSum stays uncapped with 0 for n <= 0', () => {
        for (const q of [0.5, 1 - 1e-12, -(1 - 1e-12), 2, 1, -1, 0]) {
            const sums = geometricPartialSums(1, q, 80);
            expect(sums).toHaveLength(GEOMETRIC_SERIES_MAX_TERMS);
            sums.forEach((value, index) => expect(value).toBe(geometricPartialSum(1, q, index + 1)));
        }
        expect(geometricPartialSums(1, 0.5, 0)).toEqual([]);
        expect(geometricPartialSum(1, 2, 60)).toBe(2 ** 60 - 1);
        expect(geometricPartialSum(1, 0.5, 0)).toBe(0);
        expect(geometricPartialSum(1, 0.5, -3)).toBe(0);
    });
    it('no limit for |q| >= 1 near both unit boundaries, a limit just inside', () => {
        for (const q of [1 - 1e-12, -(1 - 1e-12)]) expect(geometricSeriesLimit(1, q)).not.toBeNull();
        for (const q of [1, -1, 1 + 1e-12, -(1 + 1e-12), 2, -2]) {
            expect(geometricSeriesLimit(1, q)).toBeNull();
            expect(firstTermWithinTolerance(1, q, 1)).toBeNull();
        }
        expect(firstTermWithinTolerance(1, 1 - 1e-12, 0.5)).toBeNull();
    });
});
