import {describe, expect, it} from 'vitest';
import {
    canRefine,
    DARBOUX_EXAMPLE_IDS,
    DARBOUX_EXAMPLES,
    DARBOUX_N_MAX,
    darbouxSubintervals,
    darbouxTotals,
    exactIntegral,
    partitionNodes,
    refine,
} from './darboux';
import {DARBOUX_EXAMPLE_MODELS, DEFAULT_DARBOUX_MODEL, parseDarbouxModel} from './darbouxModel';

/** Floating-point slack for sums of at most 128 terms of magnitude <= 49 compared against closed forms. */
const TOL = 1e-12;

const square = DARBOUX_EXAMPLES.square;
const sine = DARBOUX_EXAMPLES.sine;

describe('Darboux sums', () => {
    it('x^2 on [0, 2] with n = 4 gives 1.75, 3.75 and 8/3', () => {
        const t = darbouxTotals(square, 0, 2, 4);
        expect(t.lower).toBeCloseTo(1.75, 12);
        expect(t.upper).toBeCloseTo(3.75, 12);
        expect(t.integral).toBeCloseTo(8 / 3, 12);
        expect(t.gap).toBeCloseTo(2, 12);
    });

    it('x^2 on [0, 2] has the gap U - L = 8/n for every n (increasing: dx * (f(b) - f(a)) = (2/n) * 4)', () => {
        for (let n = 1; n <= DARBOUX_N_MAX; n++) {
            const t = darbouxTotals(square, 0, 2, n);
            expect(t.upper - t.lower).toBeCloseTo(8 / n, 10);
            expect(t.gap).toBeCloseTo(8 / n, 10);
        }
        // the lesson quotes n = 4 -> 2, n = 8 -> 1
        expect(darbouxTotals(square, 0, 2, 4).gap).toBeCloseTo(2, 12);
        expect(darbouxTotals(square, 0, 2, 8).gap).toBeCloseTo(1, 12);
    });

    it('sin x on [0, pi] with n = 1 has supremum 1 at pi/2 and infimum 0', () => {
        const [s] = darbouxSubintervals(sine, 0, Math.PI, 1);
        expect(s.sup).toBe(1);
        expect(Math.abs(s.inf)).toBeLessThan(TOL);
        expect(exactIntegral(sine, 0, Math.PI)).toBeCloseTo(2, 12);
    });

    it('uses the interior critical point of x^2 for the infimum', () => {
        const [s] = darbouxSubintervals(square, -1, 2, 1);
        expect(s.inf).toBe(0);
        expect(s.sup).toBe(4);
    });

    it('partition nodes are exact at the ends and shared between neighbours', () => {
        const nodes = partitionNodes(-0.37, 5.91, 7);
        expect(nodes[0]).toBe(-0.37);
        expect(nodes[7]).toBe(5.91);
        const subs = darbouxSubintervals(square, -0.37, 5.91, 7);
        subs.slice(1).forEach((s, i) => expect(s.x0).toBe(subs[i].x1));
    });

    it('refinement is exactly nested in floating point', () => {
        for (const [a, b] of [[0, 2], [-0.37, 5.91], [0, 2 * Math.PI], [-7, 7], [1.23, 1.24]]) {
            for (let n = 1; canRefine(n); n *= 2) {
                const coarse = partitionNodes(a, b, n);
                const fine = partitionNodes(a, b, 2 * n);
                coarse.forEach((x, i) => expect(fine[2 * i]).toBe(x));
            }
        }
    });

    it('refine doubles n and is unavailable beyond the limit', () => {
        expect(refine(4)).toBe(8);
        expect(refine(DARBOUX_N_MAX / 2)).toBe(DARBOUX_N_MAX);
        expect(refine(DARBOUX_N_MAX)).toBeUndefined();
        expect(canRefine(DARBOUX_N_MAX)).toBe(false);
        expect(refine(0)).toBeUndefined();
    });

    it('rejects invalid partitions', () => {
        expect(() => darbouxTotals(square, 2, 0, 4)).toThrow(RangeError);
        expect(() => darbouxTotals(square, 0, 2, 2.5)).toThrow(RangeError);
        expect(() => darbouxTotals(square, 0, 2, DARBOUX_N_MAX + 1)).toThrow(RangeError);
        expect(() => exactIntegral(square, 1, 1)).toThrow(RangeError);
    });

    const intervals: Array<[number, number]> = [[0, 2], [-1, 2], [-3, 5], [0, 2 * Math.PI], [0, Math.PI], [-7, 7], [0.3, 0.31], [1, 6.5]];
    for (const id of DARBOUX_EXAMPLE_IDS) {
        it(`${id}: L <= integral <= U and refinement is monotone for n = 1..128`, () => {
            const example = DARBOUX_EXAMPLES[id];
            for (const [a, b] of intervals) {
                let prev: ReturnType<typeof darbouxTotals> | undefined;
                for (let n = 1; n <= DARBOUX_N_MAX; n *= 2) {
                    const t = darbouxTotals(example, a, b, n);
                    expect(t.lower).toBeLessThanOrEqual(t.integral + TOL);
                    expect(t.integral).toBeLessThanOrEqual(t.upper + TOL);
                    expect(t.gap).toBeGreaterThanOrEqual(-TOL);
                    if (prev) {
                        expect(t.lower).toBeGreaterThanOrEqual(prev.lower - TOL);
                        expect(t.upper).toBeLessThanOrEqual(prev.upper + TOL);
                    }
                    prev = t;
                }
            }
        });
    }
});

describe('parseDarbouxModel', () => {
    it('round-trips the default and example models', () => {
        expect(parseDarbouxModel(DEFAULT_DARBOUX_MODEL)).toEqual(DEFAULT_DARBOUX_MODEL);
        for (const id of DARBOUX_EXAMPLE_IDS) {
            expect(parseDarbouxModel(JSON.parse(JSON.stringify(DARBOUX_EXAMPLE_MODELS[id])))).toEqual(DARBOUX_EXAMPLE_MODELS[id]);
        }
    });

    it('drops unknown properties', () => {
        expect(parseDarbouxModel({...DEFAULT_DARBOUX_MODEL, extra: 1})).toEqual(DEFAULT_DARBOUX_MODEL);
    });

    it('rejects, never clamps, invalid data', () => {
        const d = DEFAULT_DARBOUX_MODEL;
        for (const bad of [
            null, [], 'x', undefined,
            {...d, example: 'cube'},
            {...d, n: 2.5}, {...d, n: 0}, {...d, n: 129}, {...d, n: '4'},
            {...d, a: 2, b: 0}, {...d, a: 1, b: 1}, {...d, a: -8}, {...d, b: 7.5}, {...d, b: NaN}, {...d, a: Infinity},
            {...d, lowerVisible: 'yes'}, {...d, upperVisible: 1}, {...d, lowerVisible: undefined},
        ]) {
            expect(parseDarbouxModel(bad)).toBeUndefined();
        }
    });
});
