import {describe, expect, it} from 'vitest';
import {
    detectPeriod, detectPeriodAtR, fixedPoint, fixedPointAttracts, fixedPointMultiplier, isLogisticR, logisticMap,
    twoCycle, twoCycleAttracts, twoCycleExists, twoCycleMultiplier,
} from './logistic';

const period = (r: number, x0?: number) => {
    const p = detectPeriod(r, x0);
    return p.kind === 'computed' ? p.period : null;
};

/** Independent detector: longer burn-in in its own loop, then the orbit as an array and the smallest matching p. */
function bruteForcePeriod(r: number, x0: number): number | null {
    let x = x0;
    for (let i = 0; i < 400000; i++) x = r * x * (1 - x);
    const orbit = [x];
    for (let i = 0; i < 64; i++) orbit.push(r * orbit[i] * (1 - orbit[i]));
    for (let p = 1; p <= 64; p++) if (Math.abs(orbit[p] - orbit[0]) < 1e-9) return p;
    return null;
}

describe('logistic parameter and exact tests', () => {
    it('accepts only integer R in 250..400', () => {
        for (const R of [250, 251, 344, 345, 400]) expect(isLogisticR(R)).toBe(true);
        for (const R of [249, 401, 300.5, NaN, Infinity, '300', null]) expect(isLogisticR(R)).toBe(false);
        expect(() => logisticMap(249)).toThrow(RangeError);
        expect(() => detectPeriodAtR(401)).toThrow(RangeError);
        expect(logisticMap(300)(0.5)).toBeCloseTo(0.75, 15);
    });

    it('fixed-point and 2-cycle integer tests agree with the multiplier formulas over the whole range', () => {
        for (let R = 250; R <= 400; R++) {
            const r = R / 100;
            // Multipliers in exact integers: (200 - R)/100 and (40000 + 200R - R^2)/10000.
            const m2 = 40000 + 200 * R - R * R;
            expect(fixedPointAttracts(R)).toBe(Math.abs(200 - R) < 100);
            expect(twoCycleExists(R)).toBe(r > 3);
            expect(twoCycleAttracts(R)).toBe(R > 300 && Math.abs(m2) < 10000);
            expect(fixedPointMultiplier(R)).toBeCloseTo(2 - r, 12);
            expect(twoCycleMultiplier(R)).toBeCloseTo(m2 / 10000, 12);
        }
    });

    it('thresholds 3 and 1 + sqrt 6 are exactly the integer boundaries', () => {
        expect(fixedPointAttracts(299)).toBe(true);
        expect(fixedPointAttracts(300)).toBe(false); // multiplier -1
        expect(twoCycleAttracts(300)).toBe(false);
        expect(twoCycleAttracts(301)).toBe(true);
        expect(twoCycleAttracts(344)).toBe(true);
        expect(twoCycleAttracts(345)).toBe(false);
        expect(244 * 244).toBe(59536);
        expect(245 * 245).toBe(60025);
        expect(1 + Math.sqrt(6)).toBeCloseTo(3.44949, 5);
        expect(twoCycleMultiplier(344)).toBeGreaterThan(-1);
        expect(twoCycleMultiplier(345)).toBeLessThan(-1);
    });

    it('cycle values satisfy f(x-)=x+ and f^2(x)=x; the fixed point is fixed', () => {
        for (let R = 301; R <= 400; R++) {
            const f = logisticMap(R);
            const [a, b] = twoCycle(R)!;
            expect(Math.abs(f(a) - b)).toBeLessThan(1e-12);
            expect(Math.abs(f(f(a)) - a)).toBeLessThan(1e-12);
            expect(Math.abs(f(f(b)) - b)).toBeLessThan(1e-12);
        }
        for (let R = 250; R <= 400; R++) expect(Math.abs(logisticMap(R)(fixedPoint(R)) - fixedPoint(R))).toBeLessThan(1e-12);
        expect(twoCycle(300)).toBeNull();
        expect(twoCycle(250)).toBeNull();
        const [a, b] = twoCycle(310)!;
        expect(a).toBeCloseTo(0.558014, 6);
        expect(b).toBeCloseTo(0.764567, 6);
        expect(twoCycleMultiplier(310)).toBeCloseTo(0.59, 12);
    });

    it('the 2-cycle really attracts for R=344 and not for R=345 (orbit from 0,2)', () => {
        const tail = (R: number) => {
            const f = logisticMap(R);
            let x = 0.2;
            for (let i = 0; i < 200000; i++) x = f(x);
            return Math.abs(f(f(x)) - x);
        };
        expect(tail(344)).toBeLessThan(1e-9);
        expect(tail(345)).toBeGreaterThan(1e-6);
    });
});

describe('period detection', () => {
    it('reproduces the checked table, labelled computed', () => {
        const table: [number, number][] = [
            [2.9, 1], [3.1, 2], [3.44, 2], [3.46, 4], [3.54, 4], [3.55, 8], [3.565, 16], [3.569, 32],
        ];
        for (const [r, p] of table) expect(period(r)).toBe(p);
        expect(detectPeriod(3.1)).toEqual({kind: 'computed', period: 2, tolerance: 1e-9});
        expect(detectPeriodAtR(310)).toEqual({kind: 'computed', period: 2, tolerance: 1e-9});
    });

    it('agrees with the brute-force detector on a grid of R', () => {
        // R=300 is excluded: at r=3 convergence is algebraic, so 200000 steps find nothing while 400000 find period 2.
        for (let R = 250; R <= 400; R += 5) if (R !== 300) expect(period(R / 100)).toBe(bruteForcePeriod(R / 100, 0.2));
        expect(period(3)).toBeNull();
    });

    it('period 1 for R<300, 2 for 300<R<=344 (closed-form regions), 3 in the window from x0=0,5', () => {
        for (const R of [250, 290, 299]) expect(period(R / 100)).toBe(1);
        for (const R of [301, 310, 344]) expect(period(R / 100)).toBe(2);
        for (const r of [3.83, 3.835, 3.84]) expect(period(r, 0.5)).toBe(3);
        for (const r of [3.82, 3.9]) expect(period(r, 0.5)).toBeNull();
    });

    it('the 4-cycle at r=3,5 has the spec values (6 decimals)', () => {
        const cycleAt = (r: number) => {
            let x = 0.2;
            for (let i = 0; i < 200000; i++) x = r * x * (1 - x);
            const out = [x];
            for (let i = 0; i < 3; i++) out.push(r * out[i] * (1 - out[i]));
            return out.sort((a, b) => a - b);
        };
        const spec = [0.382820, 0.500884, 0.826941, 0.874997];
        cycleAt(3.5).forEach((v, i) => expect(v).toBeCloseTo(spec[i], 6));
    });

    it('at r=4 from 0,2 no period is reported; from 0,5 the orbit lands on 0 (a false period 1)', () => {
        expect(detectPeriod(4)).toEqual({kind: 'none-found', maxPeriod: 64});
        expect(period(4, 0.5)).toBe(1);
        expect(4 * 0.5 * 0.5).toBe(1);
        expect(4 * 1 * 0).toBe(0);
    });
});

describe('finite precision at r=4 (400-bit oracle)', () => {
    const BITS = 400n;
    const ONE = 1n << BITS;
    const f4 = (x: bigint): bigint => (4n * x * (ONE - x)) >> BITS;
    const toBig = (x: number): bigint => (BigInt(x * 2 ** 60) << BITS) >> 60n; // x*2^60 is an exact double
    const toNum = (x: bigint): number => Number(x >> (BITS - 60n)) / 2 ** 60;

    it('the double orbit leaves the exact orbit by more than 0,1 at step 52 (spec)', () => {
        let exact = toBig(0.2);
        let x = 0.2;
        let first = -1;
        for (let n = 1; n <= 80 && first < 0; n++) {
            exact = f4(exact);
            x = 4 * x * (1 - x);
            if (Math.abs(x - toNum(exact)) > 0.1) first = n;
        }
        expect(first).toBe(52);
    });

    it('the exact orbit follows sin^2(2^n theta), sin^2 theta = 0,2, over the first 30 steps', () => {
        const theta = Math.asin(Math.sqrt(0.2));
        let exact = toBig(0.2);
        for (let n = 1; n <= 30; n++) {
            exact = f4(exact);
            expect(Math.abs(toNum(exact) - Math.sin(2 ** n * theta) ** 2)).toBeLessThan(1e-6);
        }
    });

    it('two starts 1e-10 apart reach distance 0,1 at step 30', () => {
        let a = 0.2;
        let b = 0.2 + 1e-10;
        let n = 0;
        while (Math.abs(a - b) <= 0.1 && n < 100) {
            a = 4 * a * (1 - a);
            b = 4 * b * (1 - b);
            n++;
        }
        expect(n).toBe(30);
    });
});
