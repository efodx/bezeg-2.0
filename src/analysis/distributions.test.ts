import {
    binomialCdf, binomialMasses, binomialMean, binomialNormalCdf, binomialNormalPmf, binomialPmf, binomialPoissonDistance,
    binomialStandardDeviation, erf, erfc, isProbability, logFactorial, normalCdf, normalPdf, normalProbability, normalStrips,
    normalTail, poissonCdf, poissonPmf, trapezoidStrips,
} from './distributions';
import {subintervalArea, subintervalPolygons} from './riemann';

const sum = (xs: number[]): number => xs.reduce((s, v) => s + v, 0);

describe('erf against Python math.erf references (16 digits)', () => {
    const table: [number, number, number][] = [
        [0.1, 0.1124629160182849, 0.8875370839817152],
        [0.5, 0.5204998778130465, 0.4795001221869534],
        [1, 0.8427007929497149, 0.1572992070502851],
        [2, 0.9953222650189527, 0.004677734981047265],
        [3, 0.9999779095030014, 2.209049699858544e-5],
    ];
    it('matches erf to 1e-14 and erfc to 1e-13 relative', () => {
        for (const [x, e, c] of table) {
            expect(Math.abs(erf(x) - e)).toBeLessThan(1e-14);
            expect(Math.abs(erfc(x) / c - 1)).toBeLessThan(1e-13);
        }
        expect(Math.abs(erfc(6) / 2.1519736712498913e-17 - 1)).toBeLessThan(1e-12);
    });
    it('matches references in the continued-fraction range and near the switch (relative 1e-12)', () => {
        const rel = (a: number, b: number): number => Math.abs(a / b - 1);
        expect(rel(erfc(4), 1.5417257900280017e-8)).toBeLessThan(1e-12);
        expect(rel(erfc(5), 1.5374597944280351e-12)).toBeLessThan(1e-12);
        expect(rel(normalTail(5), 2.8665157187919455e-7)).toBeLessThan(1e-12);
        expect(rel(erf(2.49), 0.9995707121322661)).toBeLessThan(1e-12);
        expect(rel(erf(2.51), 0.9996142945182758)).toBeLessThan(1e-12);
    });
    it('is odd, zero at 0 and tends to +-1', () => {
        expect(erf(0)).toBe(0);
        for (const x of [0.01, 0.7, 1.9, 2.5, 2.6, 4, 6]) expect(erf(-x)).toBe(-erf(x));
        expect(erf(30)).toBe(1);
        expect(erf(-30)).toBe(-1);
    });
    it('is continuous across the series / continued-fraction switch', () => {
        expect(Math.abs(erf(2.5 - 1e-12) - erf(2.5))).toBeLessThan(1e-11);
    });
    it('has the derivative 2/sqrt(pi) e^{-x^2} (central difference, independent of the series)', () => {
        for (let x = -6; x <= 6; x += 0.37) {
            const h = 1e-4;
            const d = (erf(x + h) - erf(x - h)) / (2 * h);
            expect(Math.abs(d - 2 / Math.sqrt(Math.PI) * Math.exp(-x * x))).toBeLessThan(1e-8);
        }
    });
});

describe('the normal law', () => {
    it('has the standard values of Phi', () => {
        expect(normalCdf(0)).toBeCloseTo(0.5, 15);
        expect(Math.abs(normalCdf(1) - 0.8413447460685429)).toBeLessThan(1e-14);
        expect(Math.abs(normalCdf(-1) - 0.15865525393145707)).toBeLessThan(1e-14);
        expect(Math.abs(normalCdf(1.96) - 0.9750021048517796)).toBeLessThan(1e-14);
        expect(Math.abs(normalCdf(3) - 0.9986501019683699)).toBeLessThan(1e-14);
        expect(normalCdf(2)).toBeCloseTo(0.97725, 5);
    });
    it('is symmetric: Phi(-x) = 1 - Phi(x)', () => {
        for (const x of [0.3, 1, 1.96, 3]) expect(normalCdf(-x)).toBeCloseTo(1 - normalCdf(x), 14);
    });
    it('keeps the upper tail: P(Z > 6) is 9.8659e-10, not 0', () => {
        expect(Math.abs(normalTail(6) / 9.865876450377016e-10 - 1)).toBeLessThan(1e-12);
        expect(normalTail(6)).toBeGreaterThan(0);
    });
    it('density integrates to 1 by an independent Simpson quadrature, and over [85,130] agrees with erf', () => {
        const simpson = (f: (x: number) => number, a: number, b: number, n: number): number => {
            const h = (b - a) / n;
            let s = f(a) + f(b);
            for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
            return s * h / 3;
        };
        expect(Math.abs(simpson(x => normalPdf(x), -12, 12, 4000) - 1)).toBeLessThan(1e-12);
        const q = simpson(x => normalPdf(x, 100, 15), 85, 130, 2000);
        expect(q).toBeCloseTo(0.81859461412, 10);
        expect(Math.abs(q - normalProbability(85, 130, 100, 15))).toBeLessThan(1e-12);
    });
    it('reproduces the P1 golden numbers', () => {
        expect(normalProbability(-1, 1)).toBeCloseTo(0.68269, 5);
        expect(normalProbability(-2, 2)).toBeCloseTo(0.9545, 5);
        expect(normalProbability(-3, 3)).toBeCloseTo(0.9973, 5);
        expect(normalProbability(100 - 15, 100 + 15, 100, 15)).toBeCloseTo(0.68269, 5);
        expect(normalProbability(85, 130, 100, 15)).toBeCloseTo(0.81859, 5);
        expect(normalCdf(130, 100, 15)).toBeCloseTo(0.97725, 5);
        expect(normalCdf(85, 100, 15)).toBeCloseTo(0.15866, 5);
    });
    it('the share within one sigma does not depend on mu and sigma', () => {
        for (const [mu, s] of [[0, 1], [100, 15], [-3, 0.1], [7, 20]]) expect(normalProbability(mu - s, mu + s, mu, s)).toBeCloseTo(0.6826894921370859, 12);
    });
    it('a wide interval reads 1, a = b and a > b read 0, tail intervals keep precision', () => {
        expect(normalProbability(-40, 40)).toBeCloseTo(1, 14);
        expect(normalProbability(1, 1)).toBe(0);
        expect(normalProbability(2, 1)).toBe(0);
        expect(normalProbability(6, 7)).toBeGreaterThan(0);
        expect(Math.abs(normalProbability(6, 100) / normalTail(6) - 1)).toBeLessThan(1e-12);
    });
    it('rejects sigma <= 0 and non-finite parameters', () => {
        for (const s of [0, -1, NaN, Infinity]) expect(() => normalCdf(0, 0, s)).toThrow(RangeError);
        expect(() => normalPdf(0, NaN, 1)).toThrow(RangeError);
        expect(() => normalProbability(0, 1, 0, 0)).toThrow(RangeError);
    });
});

describe('log-factorial', () => {
    it('matches exact factorials and is continuous across the Stirling switch', () => {
        expect(logFactorial(5)).toBeCloseTo(Math.log(120), 14);
        expect(logFactorial(20)).toBeCloseTo(Math.log(2432902008176640000), 12);
        expect(Math.abs(logFactorial(30) - logFactorial(29) - Math.log(30))).toBeLessThan(1e-12);
        expect(Math.abs(logFactorial(200) - logFactorial(199) - Math.log(200))).toBeLessThan(1e-11);
    });
    it('rejects non-integers and negatives', () => {
        expect(() => logFactorial(-1)).toThrow(RangeError);
        expect(() => logFactorial(1.5)).toThrow(RangeError);
    });
});

describe('binomial and Poisson mass functions', () => {
    it('match hand-computed small cases', () => {
        expect(binomialPmf(2, 0.5, 0)).toBeCloseTo(1 / 4, 14);
        expect(binomialPmf(2, 0.5, 1)).toBeCloseTo(1 / 2, 14);
        expect(binomialPmf(3, 0.5, 2)).toBeCloseTo(3 / 8, 14);
        expect(binomialPmf(4, 0.25, 2)).toBeCloseTo(6 * (1 / 16) * (9 / 16), 14);
        expect(binomialPmf(5, 0.2, 5)).toBeCloseTo(1 / 3125, 14);
        expect(binomialPmf(5, 0.5, 6)).toBe(0);
        expect(binomialPmf(5, 0.5, -1)).toBe(0);
        expect(poissonPmf(1, 0)).toBeCloseTo(Math.exp(-1), 14);
        expect(poissonPmf(2, 3)).toBeCloseTo(8 / 6 * Math.exp(-2), 14);
        expect(poissonPmf(3, 1.5)).toBe(0);
    });
    it('sum to 1 and have the right mean and variance, including n = 200 and the maximum n', () => {
        for (const [n, p] of [[20, 0.5], [100, 0.02], [200, 0.3], [1000, 0.9]]) {
            const m = binomialMasses(n, p);
            expect(Math.abs(sum(m) - 1)).toBeLessThan(1e-12);
            const mean = sum(m.map((v, k) => k * v));
            const variance = sum(m.map((v, k) => (k - mean) ** 2 * v));
            expect(mean).toBeCloseTo(binomialMean(n, p), 9);
            expect(variance).toBeCloseTo(n * p * (1 - p), 9);
        }
        const lambda = 7.5;
        const masses = Array.from({length: 120}, (_, k) => poissonPmf(lambda, k));
        const mean = sum(masses.map((v, k) => k * v));
        expect(Math.abs(sum(masses) - 1)).toBeLessThan(1e-12);
        expect(mean).toBeCloseTo(lambda, 10);
        expect(sum(masses.map((v, k) => (k - mean) ** 2 * v))).toBeCloseTo(lambda, 10);
    });
    it('cdf is the sum of masses and handles the ends', () => {
        expect(binomialCdf(3, 0.5, 1)).toBeCloseTo(1 / 2, 14);
        expect(binomialCdf(3, 0.5, -1)).toBe(0);
        expect(binomialCdf(3, 0.5, 3.7)).toBeCloseTo(1, 14);
        expect(poissonCdf(2, 1)).toBeCloseTo(3 * Math.exp(-2), 14);
    });
    it('rejects n outside the range and p outside (0, 1)', () => {
        expect(() => binomialPmf(0, 0.5, 0)).toThrow(RangeError);
        expect(() => binomialPmf(2.5, 0.5, 0)).toThrow(RangeError);
        expect(() => binomialPmf(5, 0, 0)).toThrow(RangeError);
        expect(() => binomialPmf(5, 1, 0)).toThrow(RangeError);
        expect(() => binomialPmf(5, NaN, 0)).toThrow(RangeError);
        expect(() => poissonPmf(0, 0)).toThrow(RangeError);
        expect(isProbability(0.02)).toBe(true);
        expect(isProbability(0)).toBe(false);
    });
});

describe('the Poisson cap', () => {
    it('allows lambda up to the largest binomial mean and rejects above it', () => {
        expect(Math.abs(poissonPmf(1000, 1000) / 0.012614611348719664 - 1)).toBeLessThan(1e-11);
        const d = binomialPoissonDistance(1000, 0.999);
        expect(Number.isFinite(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(1);
        expect(() => poissonPmf(1000.5, 1)).toThrow(RangeError);
    });
});

describe('P2 golden numbers', () => {
    it('B(20, 1/2), P(X <= 8): exact 0.25172, corrected 0.25117, uncorrected 0.18555', () => {
        const choose = [1, 20, 190, 1140, 4845, 15504, 38760, 77520, 125970];
        expect(binomialCdf(20, 0.5, 8)).toBeCloseTo(sum(choose) / 2 ** 20, 14);
        expect(binomialCdf(20, 0.5, 8)).toBeCloseTo(0.25172, 5);
        expect(binomialNormalCdf(20, 0.5, 8, true)).toBeCloseTo(0.25117, 5);
        expect(binomialNormalCdf(20, 0.5, 8, false)).toBeCloseTo(0.18555, 5);
        expect(binomialStandardDeviation(20, 0.5)).toBeCloseTo(Math.sqrt(5), 14);
    });
    it('B(100, 1/2), P(X <= 45): 0.18410, 0.18406, 0.15866', () => {
        expect(binomialCdf(100, 0.5, 45)).toBeCloseTo(0.1841, 5);
        expect(binomialNormalCdf(100, 0.5, 45, true)).toBeCloseTo(0.18406, 5);
        expect(binomialNormalCdf(100, 0.5, 45, false)).toBeCloseTo(0.15866, 5);
    });
    it('B(100, 0.02): P(X = 2) binomial 0.27341, Poisson 0.27067, normal corrected 0.27902; TV 0.00457 < np^2', () => {
        expect(binomialPmf(100, 0.02, 2)).toBeCloseTo(0.27341, 5);
        expect(poissonPmf(2, 2)).toBeCloseTo(0.27067, 5);
        expect(binomialNormalPmf(100, 0.02, 2, true)).toBeCloseTo(0.27902, 5);
        expect(binomialPoissonDistance(100, 0.02)).toBeCloseTo(0.00457, 5);
        expect(binomialPoissonDistance(100, 0.02)).toBeLessThan(100 * 0.02 ** 2);
    });
    it('the continuity correction is closer than no correction on the spec cases', () => {
        for (const [n, p, k] of [[20, 0.5, 8], [100, 0.5, 45], [50, 0.5, 20], [200, 0.3, 55]]) {
            const exact = binomialCdf(n, p, k);
            expect(Math.abs(binomialNormalCdf(n, p, k, true) - exact)).toBeLessThan(Math.abs(binomialNormalCdf(n, p, k, false) - exact));
        }
    });
    it('the corrected error shrinks as n grows (20, 50, 100 at k = n/2 - 2)', () => {
        const err = [20, 50, 100].map(n => Math.abs(binomialNormalCdf(n, 0.5, n / 2 - 2, true) - binomialCdf(n, 0.5, n / 2 - 2)));
        expect(err[1]).toBeLessThan(err[0]);
        expect(err[2]).toBeLessThan(err[1]);
    });
});

describe('trapezoid strips of a density', () => {
    it('are contiguous Subinterval records ending exactly at b', () => {
        const strips = normalStrips(-1, 1, 7);
        expect(strips).toHaveLength(7);
        expect(strips[0].x0).toBe(-1);
        expect(strips[6].x1).toBe(1);
        for (let i = 1; i < 7; i++) expect(strips[i].x0).toBe(strips[i - 1].x1);
        expect(strips[3].y0).toBe(strips[2].y1);
        for (const s of strips) expect(s.x1 - s.x0).toBeCloseTo(2 / 7, 14);
    });
    it('areas converge to the CDF difference with error O(1/n^2)', () => {
        const target = normalProbability(85, 130, 100, 15);
        const errors = [10, 20, 40, 80, 160].map(n => Math.abs(sum(normalStrips(85, 130, n, 100, 15).map(subintervalArea)) - target));
        for (let i = 1; i < errors.length; i++) expect(errors[i]).toBeLessThan(errors[i - 1] / 3.5);
        expect(errors[4]).toBeLessThan(2e-5);
        expect(Math.abs(sum(normalStrips(-8, 8, 800).map(subintervalArea)) - 1)).toBeLessThan(1e-6);
    });
    it('are exact for a linear density, and a = b gives zero area', () => {
        expect(sum(trapezoidStrips(x => 2 * x, 0, 3, 3).map(subintervalArea))).toBeCloseTo(9, 14);
        expect(sum(normalStrips(1, 1, 5).map(subintervalArea))).toBe(0);
    });
    it('feed subintervalPolygons: a positive density fills above the axis only', () => {
        const polygons = normalStrips(-1, 1, 10).flatMap(subintervalPolygons);
        expect(polygons).toHaveLength(10);
        expect(polygons.every(p => p.points.length === 4)).toBe(true);
    });
    it('are deterministic and reject a bad strip count', () => {
        expect(normalStrips(-1, 1, 9)).toEqual(normalStrips(-1, 1, 9));
        expect(() => normalStrips(-1, 1, 0)).toThrow(RangeError);
        expect(() => normalStrips(NaN, 1, 5)).toThrow(RangeError);
    });
});
