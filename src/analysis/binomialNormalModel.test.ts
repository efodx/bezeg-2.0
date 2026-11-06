import {
    barsPolyline, BINOMIAL_NORMAL_EXAMPLE_IDS, BINOMIAL_NORMAL_EXAMPLES, BINOMIAL_NORMAL_N_MAX, binomialBars, binomialNormalDensity,
    binomialNormalExampleOf, BinomialNormalModel, binomialNormalView, binomialShadedBars, checkBinomialNormalModel,
    chooseBinomialNormalExample, DEFAULT_BINOMIAL_NORMAL_MODEL, FIT_TOP_FACTOR, fitBinomialNormalView, poissonBars, setBinomialFlag, setBinomialK,
    setBinomialN, setBinomialP,
} from './binomialNormalModel';
import {binomialMasses, normalPdf, poissonCdf} from './distributions';

const model = (n: number, p: number, k: number, correction = true, poisson = false): BinomialNormalModel => ({n, p, k, correction, poisson});
/** The area of width-w bars drawn as four points each: sum of width * height. */
const area = ({x, y}: { x: number[]; y: number[] }) => {
    let sum = 0;
    for (let i = 0; i < x.length; i += 4) sum += (x[i + 2] - x[i]) * y[i + 1];
    return sum;
};
const binom = (n: number, j: number): bigint => {
    let r = 1n;
    for (let i = 1; i <= j; i++) r = r * BigInt(n - j + i) / BigInt(i);
    return r;
};
const modelOf = (r: { ok: boolean; model?: BinomialNormalModel }) => (r.ok ? r.model : undefined);

describe('the spec values (P2), to the displayed digits', () => {
    test('B(20, 1/2), k = 8', () => {
        const v = binomialNormalView(BINOMIAL_NORMAL_EXAMPLES.fair20);
        expect(v.exact).toBeCloseTo(0.25172, 5);
        expect(v.corrected).toBeCloseTo(0.25117, 5);
        expect(v.uncorrected).toBeCloseTo(0.18555, 5);
    });

    test('B(100, 1/2), k = 45', () => {
        const v = binomialNormalView(BINOMIAL_NORMAL_EXAMPLES.fair100);
        expect(v.exact).toBeCloseTo(0.1841, 5);
        expect(v.corrected).toBeCloseTo(0.18406, 5);
        expect(v.uncorrected).toBeCloseTo(0.15866, 5);
    });

    test('B(100, 0.02), k = 2: the mass at k', () => {
        const v = binomialNormalView(BINOMIAL_NORMAL_EXAMPLES.rare);
        expect(v.massAtK.exact).toBeCloseTo(0.27341, 5);
        expect(v.massAtK.poisson).toBeCloseTo(0.27067, 5);
        expect(v.massAtK.corrected).toBeCloseTo(0.27902, 5);
        expect(v.lambda).toBeCloseTo(2, 12);
    });

    test('the errors are |approximation - exact|', () => {
        for (const id of BINOMIAL_NORMAL_EXAMPLE_IDS) {
            const v = binomialNormalView(BINOMIAL_NORMAL_EXAMPLES[id]);
            expect(v.correctedError).toBeCloseTo(Math.abs(v.corrected - v.exact), 14);
            expect(v.uncorrectedError).toBeCloseTo(Math.abs(v.uncorrected - v.exact), 14);
            expect(v.poissonError).toBeCloseTo(Math.abs(v.poisson - v.exact), 14);
        }
    });

    test('the exact B(20, 1/2) value equals the integer sum of C(20, j), j <= 8, over 2^20', () => {
        let sum = 0n;
        for (let j = 0; j <= 8; j++) sum += binom(20, j);
        expect(sum).toBe(263950n);
        expect(binomialNormalView(DEFAULT_BINOMIAL_NORMAL_MODEL).exact).toBeCloseTo(Number(sum) / 2 ** 20, 12);
    });

    test('the default is the fair20 example, correction on, Poisson off', () => {
        expect(DEFAULT_BINOMIAL_NORMAL_MODEL).toEqual({n: 20, p: 0.5, k: 8, correction: true, poisson: false});
        expect(BINOMIAL_NORMAL_EXAMPLES.fair20).toEqual(DEFAULT_BINOMIAL_NORMAL_MODEL);
    });
});

describe('checkBinomialNormalModel', () => {
    const valid = model(20, 0.5, 8);

    test('accepts a valid model and drops unknown properties', () => {
        const check = checkBinomialNormalModel({...valid, extra: 1});
        expect(check).toEqual({ok: true, model: valid});
        expect(check.ok && 'extra' in check.model).toBe(false);
    });

    test.each([[1.5], [0], [BINOMIAL_NORMAL_N_MAX + 1], [NaN], ['20']])('rejects n = %p', n => {
        expect(checkBinomialNormalModel({...valid, n})).toEqual({ok: false, issue: {kind: 'n', max: BINOMIAL_NORMAL_N_MAX}});
    });

    test.each([[0, true], [1, true], [-0.1, false], [1.5, false], [NaN, false], ['0.5', false]])('rejects p = %p (degenerate %p)', (p, degenerate) => {
        expect(checkBinomialNormalModel({...valid, p})).toEqual({ok: false, issue: {kind: 'p', degenerate}});
    });

    test.each([[-1], [21], [2.5]])('rejects k = %p', k => {
        expect(checkBinomialNormalModel({...valid, k})).toEqual({ok: false, issue: {kind: 'k', max: 20}});
    });

    test('a stored k above n is rejected, not moved', () => {
        expect(checkBinomialNormalModel({...valid, n: 10, k: 15}).ok).toBe(false);
    });

    test('rejects the flags', () => {
        expect(checkBinomialNormalModel({...valid, correction: 1})).toEqual({ok: false, issue: {kind: 'flag', field: 'correction'}});
        expect(checkBinomialNormalModel({...valid, poisson: 'no'})).toEqual({ok: false, issue: {kind: 'flag', field: 'poisson'}});
    });

    test('checks in the order n, p, k, correction, poisson', () => {
        const bad = {n: 0, p: 2, k: -1, correction: 1, poisson: 1};
        expect(checkBinomialNormalModel(bad)).toMatchObject({issue: {kind: 'n'}});
        expect(checkBinomialNormalModel({...bad, n: 20})).toMatchObject({issue: {kind: 'p'}});
        expect(checkBinomialNormalModel({...bad, n: 20, p: 0.5})).toMatchObject({issue: {kind: 'k'}});
        expect(checkBinomialNormalModel({...bad, n: 20, p: 0.5, k: 3})).toMatchObject({issue: {kind: 'flag', field: 'correction'}});
        expect(checkBinomialNormalModel({...bad, n: 20, p: 0.5, k: 3, correction: true})).toMatchObject({issue: {kind: 'flag', field: 'poisson'}});
    });

    test.each([[null], [[1, 2]], ['text'], [5], [undefined]])('a non-object %p gives no issue', data => {
        expect(checkBinomialNormalModel(data)).toEqual({ok: false, issue: undefined});
    });
});

describe('edits', () => {
    const m = model(20, 0.5, 8);

    test('an unchanged value returns the same object', () => {
        expect(modelOf(setBinomialN(m, 20))).toBe(m);
        expect(modelOf(setBinomialP(m, 0.5))).toBe(m);
        expect(modelOf(setBinomialK(m, 8))).toBe(m);
        expect(modelOf(setBinomialFlag(m, 'correction', true))).toBe(m);
        expect(modelOf(setBinomialFlag(m, 'poisson', false))).toBe(m);
        expect(modelOf(chooseBinomialNormalExample(m, 'fair20'))).toBe(m);
    });

    test('lowering n below k moves k to n; raising n keeps k', () => {
        expect(setBinomialN(m, 5)).toEqual({ok: true, model: {...m, n: 5, k: 5}});
        expect(setBinomialN(m, 50)).toEqual({ok: true, model: {...m, n: 50, k: 8}});
        expect(setBinomialN(m, 8)).toEqual({ok: true, model: {...m, n: 8, k: 8}});
    });

    test('n refuses invalid values', () => {
        expect(setBinomialN(m, 0)).toEqual({ok: false, issue: {kind: 'n', max: BINOMIAL_NORMAL_N_MAX}});
        expect(setBinomialN(m, 2.5).ok).toBe(false);
    });

    test('p changes, and refuses 0 and 1 as degenerate', () => {
        expect(setBinomialP(m, 0.3)).toEqual({ok: true, model: {...m, p: 0.3}});
        expect(setBinomialP(m, 0)).toEqual({ok: false, issue: {kind: 'p', degenerate: true}});
        expect(setBinomialP(m, 1)).toEqual({ok: false, issue: {kind: 'p', degenerate: true}});
        expect(setBinomialP(m, 1.2)).toEqual({ok: false, issue: {kind: 'p', degenerate: false}});
    });

    test('k changes within 0..n and refuses the rest', () => {
        expect(setBinomialK(m, 0)).toEqual({ok: true, model: {...m, k: 0}});
        expect(setBinomialK(m, 20)).toEqual({ok: true, model: {...m, k: 20}});
        for (const bad of [2.5, -1, 21, NaN, '3']) expect(setBinomialK(m, bad)).toEqual({ok: false, issue: {kind: 'k', max: 20}});
    });

    test('flags change and refuse non-booleans', () => {
        expect(setBinomialFlag(m, 'poisson', true)).toEqual({ok: true, model: {...m, poisson: true}});
        expect(setBinomialFlag(m, 'correction', 1)).toEqual({ok: false, issue: {kind: 'flag', field: 'correction'}});
        expect(setBinomialFlag(m, 'poisson', 'true')).toEqual({ok: false, issue: {kind: 'flag', field: 'poisson'}});
    });

    test('choosing an example sets every field, and refuses unknown ids', () => {
        expect(chooseBinomialNormalExample(model(7, 0.3, 2, false, false), 'rare')).toEqual({ok: true, model: BINOMIAL_NORMAL_EXAMPLES.rare});
        expect(chooseBinomialNormalExample(m, 'fair100')).toEqual({ok: true, model: BINOMIAL_NORMAL_EXAMPLES.fair100});
        expect(chooseBinomialNormalExample(m, 'nope')).toEqual({ok: false, issue: {kind: 'example', allowed: [...BINOMIAL_NORMAL_EXAMPLE_IDS]}});
        expect(chooseBinomialNormalExample(m, 3).ok).toBe(false);
    });

    test('binomialNormalExampleOf finds examples by n and p', () => {
        expect(binomialNormalExampleOf(model(100, 0.5, 10))).toBe('fair100');
        expect(binomialNormalExampleOf(model(100, 0.02, 0))).toBe('rare');
        expect(binomialNormalExampleOf(model(20, 0.5, 3, false, true))).toBe('fair20');
        expect(binomialNormalExampleOf(model(21, 0.5, 3))).toBeUndefined();
    });
});

describe('geometry', () => {
    test('barsPolyline: four points per bar spanning j -/+ w/2 at height masses[j]', () => {
        const {x, y} = barsPolyline([0.2, 0.5, 0.3], 0.5);
        expect(x).toHaveLength(12);
        expect(y).toHaveLength(12);
        [0.2, 0.5, 0.3].forEach((mass, j) => {
            expect(x.slice(4 * j, 4 * j + 4)).toEqual([j - 0.25, j - 0.25, j + 0.25, j + 0.25]);
            expect(y.slice(4 * j, 4 * j + 4)).toEqual([0, mass, mass, 0]);
        });
        expect(barsPolyline([1], 1, 3).x).toEqual([2.5, 2.5, 3.5, 3.5]);
    });

    test.each([[20, 0.5], [200, 0.3], [1000, 0.5]])('the width-1 bars of B(%i, %f) have area 1', (n, p) => {
        const bars = binomialBars(model(n, p, 0));
        expect(bars.x).toHaveLength(4 * (n + 1));
        expect(area(bars)).toBeCloseTo(1, 12);
    });

    test('the shaded bars have area P(X <= k)', () => {
        for (const id of BINOMIAL_NORMAL_EXAMPLE_IDS) {
            const m = BINOMIAL_NORMAL_EXAMPLES[id];
            expect(area(binomialShadedBars(m))).toBeCloseTo(binomialNormalView(m).exact, 12);
        }
    });

    test('Poisson bars of B(100, 0.02) are half-width with a vanishing tail', () => {
        const bars = poissonBars(BINOMIAL_NORMAL_EXAMPLES.rare);
        expect(bars.x[2] - bars.x[0]).toBe(0.5);
        expect(bars.x).toHaveLength(4 * 101);
        expect(bars.tail).toBeCloseTo(1 - poissonCdf(2, 100), 14);
        expect(bars.tail).toBeLessThan(1e-12);
    });

    test('the Poisson tail above n is clearly positive for B(5, 0.9)', () => {
        expect(poissonBars(model(5, 0.9, 2)).tail).toBeGreaterThan(0.25);
    });

    test.each([[20, 0.5], [100, 0.02], [1000, 0.5], [1, 0.3]])('the normal density of B(%i, %f) integrates to 1 and peaks at np', (n, p) => {
        const f = binomialNormalDensity(model(n, p, 0));
        const mu = n * p;
        const sigma = Math.sqrt(n * p * (1 - p));
        const steps = 20000;
        const a = mu - 10 * sigma;
        const h = 20 * sigma / steps;
        let sum = (f(a) + f(mu + 10 * sigma)) / 2;
        for (let i = 1; i < steps; i++) sum += f(a + i * h);
        expect(sum * h).toBeCloseTo(1, 6);
        expect(f(mu)).toBeGreaterThan(f(mu - 0.1 * sigma));
        expect(f(mu)).toBeGreaterThan(f(mu + 0.1 * sigma));
    });
});

describe('fitBinomialNormalView', () => {
    test.each(BINOMIAL_NORMAL_EXAMPLE_IDS)('the view of the %s example contains every visible bar', id => {
        const m = BINOMIAL_NORMAL_EXAMPLES[id];
        const [left, top, right, bottom] = fitBinomialNormalView(m);
        const masses = binomialMasses(m.n, m.p);
        masses.forEach((mass, j) => {
            if (mass > 1e-6) {
                expect(j - 0.5).toBeGreaterThanOrEqual(left);
                expect(j + 0.5).toBeLessThanOrEqual(right);
            }
        });
        expect(top).toBeGreaterThan(Math.max(...masses));
        expect(bottom).toBeLessThan(0);
        expect(left).toBeGreaterThanOrEqual(-1);
        expect(right).toBeLessThanOrEqual(m.n + 1);
    });

    test('the rare example leaves a quarter of the height above the normal peak, clear of the board caption', () => {
        const m = BINOMIAL_NORMAL_EXAMPLES.rare;
        const [, top, , bottom] = fitBinomialNormalView(m);
        const peak = Math.max(...binomialMasses(m.n, m.p), normalPdf(m.n * m.p, m.n * m.p, Math.sqrt(m.n * m.p * (1 - m.p))));
        expect((top - peak) / (top - bottom)).toBeGreaterThanOrEqual(0.24);
    });

    test('for B(1, 1e-9) the normal peak may leave the view', () => {
        const top = fitBinomialNormalView(model(1, 1e-9, 0))[1];
        expect(top).toBeLessThanOrEqual(FIT_TOP_FACTOR * 1.5 * Math.max(...binomialMasses(1, 1e-9)));
        expect(top).toBeGreaterThan(1);
    });
});
