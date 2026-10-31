import {describe, expect, it} from 'vitest';
import {
    basisAll,
    basisValues,
    chaikinStep,
    clampedUniformKnots,
    deBoorTriangle,
    domain,
    evaluate,
    findSpan,
    multiplicity,
    normalizeKnotsForDisplay,
    uniformKnots,
    uniformQuadraticSegment,
    validateKnotVector,
} from './index';

const TOL = 1e-12;

/** Deterministic PRNG so failures reproduce. */
function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Case {
    u: number[];
    k: number;
    n: number;
}

/** Random valid knot vectors, clamped and unclamped, with interior multiplicities up to k + 1. */
function randomCases(count: number, seed: number): Case[] {
    const rand = mulberry32(seed);
    const cases: Case[] = [];
    while (cases.length < count) {
        const k = 1 + Math.floor(rand() * 5);
        const n = k + Math.floor(rand() * 7);
        let u: number[];
        if (cases.length % 2 === 0) {
            const interior = Array.from({length: n - k}, () => Math.ceil(rand() * 9) / 10).sort((a, b) => a - b);
            u = [...Array(k + 1).fill(0), ...interior, ...Array(k + 1).fill(1)];
        } else {
            u = Array.from({length: n + k + 2}, () => Math.floor(rand() * 9) / 2).sort((a, b) => a - b);
        }
        if (validateKnotVector(u, k, n).ok) {
            cases.push({u, k, n});
        }
    }
    return cases;
}

function sampleParameters(u: number[], k: number, n: number, count: number, rand: () => number): number[] {
    const [a, b] = domain(u, k, n);
    const ts = [a, b];
    for (let i = 0; i < count; i++) {
        ts.push(a + rand() * (b - a));
    }
    for (const knot of u) {
        if (knot >= a && knot <= b) {
            ts.push(knot);
        }
    }
    return ts;
}

function binomial(n: number, i: number): number {
    let result = 1;
    for (let j = 1; j <= i; j++) {
        result = result * (n - i + j) / j;
    }
    return result;
}

function expectClose(actual: number[], expected: number[], tol = TOL): void {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((value, i) => expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(tol));
}

describe('validateKnotVector', () => {
    it('accepts clamped, unclamped and interior-break vectors', () => {
        expect(validateKnotVector([0, 0, 0, 1, 2, 2, 2], 2, 3)).toEqual({ok: true});
        expect(validateKnotVector([0, 1, 2, 3, 4, 5, 6], 2, 3)).toEqual({ok: true});
        // interior multiplicity k + 1 (a break) is allowed
        expect(validateKnotVector([0, 0, 0, 1, 1, 1, 2, 2, 2], 2, 5)).toEqual({ok: true});
        expect(validateKnotVector([0, 0, 1, 1], 1, 1)).toEqual({ok: true});
    });

    it('reports every reason code', () => {
        expect(validateKnotVector([0, 0, 0, 1, 1], 2, 3)).toEqual({ok: false, reason: 'wrong_length'});
        expect(validateKnotVector([0, 0, 0, 1, 2, 2, 2, 2], 2, 3)).toEqual({ok: false, reason: 'wrong_length'});
        expect(validateKnotVector([0, 0, 0, 2, 1, 3, 3], 2, 3)).toEqual({ok: false, reason: 'decreasing'});
        expect(validateKnotVector([0, 0, 0, 0, 1, 1, 1], 2, 3)).toEqual({ok: false, reason: 'multiplicity_too_high'});
        expect(validateKnotVector([0, 0, 0, 1, 1, 1, 1, 2, 2, 2], 2, 6)).toEqual({ok: false, reason: 'multiplicity_too_high'});
        expect(validateKnotVector([0, 1, 2, 2, 3, 4], 2, 2)).toEqual({ok: false, reason: 'empty_domain'});
        expect(validateKnotVector([0, 0, 0, 1, NaN, 2, 2], 2, 3)).toEqual({ok: false, reason: 'not_finite'});
        expect(validateKnotVector([0, 0, 0, 1, 2, 2, Infinity], 2, 3)).toEqual({ok: false, reason: 'not_finite'});
    });

    it('throws on a degree or point count that cannot define a B-spline', () => {
        expect(() => validateKnotVector([0, 0, 1, 1], 1.5, 1)).toThrow(RangeError);
        expect(() => validateKnotVector([0, 0, 1, 1], -1, 1)).toThrow(RangeError);
        expect(() => validateKnotVector([0, 0, 0, 1, 1, 1], 3, 2)).toThrow(RangeError);
    });

    it('makes the evaluators refuse invalid vectors and outside parameters rather than return NaN', () => {
        expect(() => basisValues([0, 0, 0, 2, 1, 3, 3], 2, 0.5)).toThrow(RangeError);
        expect(() => basisAll([0, 0, 0, 1, 2, 2, 2], 2, 2.5)).toThrow(RangeError);
        expect(() => basisAll([0, 0, 0, 1, 2, 2, 2], 2, NaN)).toThrow(RangeError);
        expect(() => evaluate([0, 0, 0, 1, 2, 2, 2], 2, [[0, 0], [1, 1], [2, 2]], 0.5)).toThrow(RangeError);
        expect(() => evaluate([0, 0, 0, 1, 2, 2, 2], 2, [[0, 0], [1, 1], [2, 2], [3]], 0.5)).toThrow(RangeError);
    });
});

describe('knot-vector helpers', () => {
    it('builds the clamped and the unclamped uniform vector', () => {
        expect(clampedUniformKnots(2, 3)).toEqual([0, 0, 0, 1, 2, 2, 2]);
        expect(clampedUniformKnots(3, 3)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
        expect(clampedUniformKnots(3, 5)).toEqual([0, 0, 0, 0, 1, 2, 3, 3, 3, 3]);
        expect(uniformKnots(2, 3)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        for (let k = 1; k <= 5; k++) {
            for (let n = k; n <= k + 4; n++) {
                expect(validateKnotVector(clampedUniformKnots(k, n), k, n).ok).toBe(true);
                expect(validateKnotVector(uniformKnots(k, n), k, n).ok).toBe(true);
            }
        }
    });

    it('reports domain and multiplicity', () => {
        expect(domain([0, 0, 0, 1, 2, 2, 2], 2, 3)).toEqual([0, 2]);
        expect(domain(uniformKnots(2, 3), 2, 3)).toEqual([2, 4]);
        expect(multiplicity([0, 0, 0, 1, 2, 2, 2], 0)).toBe(3);
        expect(multiplicity([0, 0, 0, 1, 2, 2, 2], 1)).toBe(1);
        expect(multiplicity([0, 0, 0, 1, 2, 2, 2], 1.5)).toBe(0);
    });

    it('finds half-open spans with the last non-empty span at the right end', () => {
        const u = [0, 0, 0, 1, 2, 2, 2];
        expect(findSpan(u, 2, 3, 0)).toBe(2);
        expect(findSpan(u, 2, 3, 0.999)).toBe(2);
        expect(findSpan(u, 2, 3, 1)).toBe(3);
        expect(findSpan(u, 2, 3, 2)).toBe(3);
        // interior break and empty spans are skipped at the right end
        const broken = [0, 0, 1, 1, 2, 2];
        expect(findSpan(broken, 1, 3, 1)).toBe(3);
        expect(findSpan(broken, 1, 3, 2)).toBe(3);
        const emptyEnd = [0, 0, 0, 1, 2, 2, 3, 3]; // u_4 = u_5 = 2: the last span is empty
        expect(findSpan(emptyEnd, 2, 4, 2)).toBe(3);
        expect(() => findSpan(u, 2, 3, -0.1)).toThrow(RangeError);
    });

    it('normalizes the domain to [0, 1] for display', () => {
        expectClose(normalizeKnotsForDisplay([0, 0, 0, 1, 2, 2, 2], 2, 3), [0, 0, 0, 0.5, 1, 1, 1]);
        expectClose(normalizeKnotsForDisplay(uniformKnots(2, 3), 2, 3), [-1, -0.5, 0, 0.5, 1, 1.5, 2]);
    });
});

describe('basis functions', () => {
    const cases = randomCases(200, 7);

    it('has non-negativity and partition of unity on random clamped and unclamped vectors', () => {
        const rand = mulberry32(11);
        let samples = 0;
        for (const {u, k, n} of cases) {
            for (const t of sampleParameters(u, k, n, 12, rand)) {
                const all = basisAll(u, k, t);
                const local = basisValues(u, k, t);
                expect(all).toHaveLength(n + 1);
                expect(local.values).toHaveLength(k + 1);
                expect(all.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
                expect(local.values.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
                all.forEach(value => expect(value).toBeGreaterThanOrEqual(0));
                local.values.forEach(value => expect(value).toBeGreaterThanOrEqual(0));
                // basisValues is the non-zero window of basisAll
                all.forEach((value, i) => {
                    const j = i - (local.span - k);
                    expect(Math.abs(value - (j >= 0 && j <= k ? local.values[j] : 0))).toBeLessThanOrEqual(TOL);
                });
                samples++;
            }
        }
        expect(samples).toBeGreaterThan(2000);
    });

    it('has local support: N_{i,k} = 0 outside [u_i, u_{i+k+1}) and is positive inside', () => {
        const rand = mulberry32(13);
        for (const {u, k, n} of cases) {
            const end = domain(u, k, n)[1];
            for (const t of sampleParameters(u, k, n, 12, rand)) {
                const all = basisAll(u, k, t);
                all.forEach((value, i) => {
                    const inside = u[i] <= t && t < u[i + k + 1];
                    if (!inside) {
                        // the closed right end of the domain is the one allowed exception
                        if (t !== end) {
                            expect(value).toBe(0);
                        }
                    } else if (t > u[i] && !u.includes(t)) {
                        expect(value).toBeGreaterThan(0);
                    }
                });
            }
        }
    });

    it('equals the Bernstein basis for knots (0^{k+1}, 1^{k+1})', () => {
        for (let k = 1; k <= 5; k++) {
            const u = [...Array(k + 1).fill(0), ...Array(k + 1).fill(1)];
            for (let step = 0; step <= 20; step++) {
                const t = step / 20;
                const bernstein = Array.from({length: k + 1}, (_, i) => binomial(k, i) * t ** i * (1 - t) ** (k - i));
                expectClose(basisAll(u, k, t), bernstein);
                expectClose(basisValues(u, k, t).values, bernstein);
            }
        }
    });

    it('reproduces the L1 golden numbers for quadratic knots (0,0,0,1,2,2,2)', () => {
        const u = [0, 0, 0, 1, 2, 2, 2];
        expectClose(basisAll(u, 2, 0.5), [0.25, 0.625, 0.125, 0]);
        expectClose(basisAll(u, 2, 1), [0, 0.5, 0.5, 0]);
        expectClose(basisAll(u, 2, 1.5), [0, 0.125, 0.625, 0.25]);
        expectClose(basisAll(u, 2, 0), [1, 0, 0, 0]);
        expectClose(basisAll(u, 2, 2), [0, 0, 0, 1]);
        const half = basisValues(u, 2, 0.5);
        expect(half.span).toBe(2);
        expectClose(half.values, [0.25, 0.625, 0.125]);
        const one = basisValues(u, 2, 1);
        expect(one.span).toBe(3);
        expectClose(one.values, [0.5, 0.5, 0]);
        expectClose(basisValues(u, 2, 1.5).values, [0.125, 0.625, 0.25]);
        expectClose(basisValues(u, 2, 2).values, [0, 0, 1]);
    });

    it('gives 1/6, 4/6, 1/6 for the uniform cubic at a knot', () => {
        const u = uniformKnots(3, 5);
        for (const t of [3, 4, 5]) {
            const {values} = basisValues(u, 3, t);
            expectClose(values, [1 / 6, 4 / 6, 1 / 6, 0]);
            expectClose(basisAll(u, 3, t).filter(value => value !== 0), [1 / 6, 4 / 6, 1 / 6]);
        }
    });

    it('supports degree 0 as a step function with the closed right end', () => {
        const u = [0, 1, 2];
        expect(basisAll(u, 0, 0)).toEqual([1, 0]);
        expect(basisAll(u, 0, 1)).toEqual([0, 1]);
        expect(basisAll(u, 0, 2)).toEqual([0, 1]);
    });

    it('handles repeated knots without NaN (0/0 := 0)', () => {
        const u = [0, 0, 0, 1, 1, 1, 2, 2, 2];
        for (let step = 0; step <= 40; step++) {
            const t = step / 20;
            const all = basisAll(u, 2, t);
            all.forEach(value => expect(Number.isNaN(value)).toBe(false));
            expect(all.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        }
    });
});

describe('de Boor', () => {
    it('equals the basis-sum evaluation on random 2D and 3D cases', () => {
        const rand = mulberry32(21);
        for (const {u, k, n} of randomCases(150, 17)) {
            const dimension = rand() < 0.5 ? 2 : 3;
            const P = Array.from({length: n + 1}, () => Array.from({length: dimension}, () => rand() * 20 - 10));
            for (const t of sampleParameters(u, k, n, 8, rand)) {
                const N = basisAll(u, k, t);
                const expected = Array.from({length: dimension}, (_, d) => N.reduce((sum, value, i) => sum + value * P[i][d], 0));
                expectClose(evaluate(u, k, P, t), expected);
            }
        }
    });

    it('reproduces the L2 golden triangle with alphas and knot pairs', () => {
        const u = [0, 0, 0, 1, 2, 2, 2];
        const P = [[0, 0], [1, 2], [3, 2], [4, 0]];

        const half = deBoorTriangle(u, 2, P, 0.5);
        expect(half.span).toBe(2);
        expect(half.levels.map(level => level.length)).toEqual([3, 2, 1]);
        expect(half.levels[0].map(e => e.point)).toEqual([[0, 0], [1, 2], [3, 2]]);
        expect(half.levels[0].map(e => e.index)).toEqual([0, 1, 2]);
        expect(half.levels[0][0].alpha).toBeNull();
        expectClose(half.levels[1][0].point, [0.5, 1]);
        expectClose(half.levels[1][1].point, [1.5, 2]);
        expectClose(half.levels[2][0].point, [1, 1.5]);
        // level 1, entries j = 1, 2: alpha = (t - u_j) / (u_{j+2} - u_j)
        expect(half.levels[1].map(e => e.knots)).toEqual([[0, 1], [0, 2]]);
        expectClose(half.levels[1].map(e => e.alpha as number), [0.5, 0.25]);
        // level 2, entry j = 2: knots (u_2, u_3)
        expect(half.levels[2][0].knots).toEqual([0, 1]);
        expectClose([half.levels[2][0].alpha as number], [0.5]);
        expectClose(evaluate(u, 2, P, 0.5), [1, 1.5]);

        const threeHalves = deBoorTriangle(u, 2, P, 1.5);
        expect(threeHalves.span).toBe(3);
        expect(threeHalves.levels[0].map(e => e.point)).toEqual([[1, 2], [3, 2], [4, 0]]);
        expectClose(threeHalves.levels[1][0].point, [2.5, 2]);
        expectClose(threeHalves.levels[1][1].point, [3.5, 1]);
        expectClose(threeHalves.levels[2][0].point, [3, 1.5]);

        expectClose(evaluate(u, 2, P, 1), [2, 2]);
    });

    it('returns the last control point (not zero) at the right end, and the first at the left', () => {
        const u = [0, 0, 0, 1, 2, 2, 2];
        const P = [[0, 0], [1, 2], [3, 2], [4, 0]];
        expectClose(evaluate(u, 2, P, 2), [4, 0]);
        expectClose(evaluate(u, 2, P, 0), [0, 0]);
        const P3 = [[0, 0, 1], [1, 2, 3], [3, 2, 5], [4, 0, 9]];
        expectClose(evaluate(u, 2, P3, 2), [4, 0, 9]);
    });

    it('keeps local control: moving P0 leaves samples for t > 1 unchanged', () => {
        const u = [0, 0, 0, 1, 2, 2, 2];
        const P = [[0, 0], [1, 2], [3, 2], [4, 0]];
        const moved = [[-5, 7], ...P.slice(1)];
        let changedBelow = false;
        for (let step = 0; step <= 200; step++) {
            const t = step / 100;
            const a = evaluate(u, 2, P, t);
            const b = evaluate(u, 2, moved, t);
            if (t > 1) {
                expect(b).toEqual(a);
            } else if (Math.abs(a[0] - b[0]) > 1e-9) {
                changedBelow = true;
            }
        }
        expect(changedBelow).toBe(true);
    });

    it('stays inside the convex hull of the active points of each span', () => {
        const rand = mulberry32(5);
        for (const {u, k, n} of randomCases(60, 3)) {
            const P = Array.from({length: n + 1}, () => [rand() * 10, rand() * 10]);
            for (const t of sampleParameters(u, k, n, 6, rand)) {
                const {span, levels} = deBoorTriangle(u, k, P, t);
                const active = P.slice(span - k, span + 1);
                const point = levels[k][0].point;
                for (let d = 0; d < 2; d++) {
                    expect(point[d]).toBeGreaterThanOrEqual(Math.min(...active.map(p => p[d])) - TOL);
                    expect(point[d]).toBeLessThanOrEqual(Math.max(...active.map(p => p[d])) + TOL);
                }
            }
        }
    });

    it('does not mutate its inputs', () => {
        const u = [0, 0, 0, 1, 2, 2, 2];
        const P = [[0, 0], [1, 2], [3, 2], [4, 0]];
        const triangle = deBoorTriangle(u, 2, P, 0.5);
        triangle.levels[0][0].point[0] = 99;
        expect(P[0]).toEqual([0, 0]);
        expect(u).toEqual([0, 0, 0, 1, 2, 2, 2]);
    });

    it('handles degree 0 as piecewise-constant lookup', () => {
        expect(evaluate([0, 1, 2], 0, [[3, 4], [5, 6]], 0.5)).toEqual([3, 4]);
        expect(evaluate([0, 1, 2], 0, [[3, 4], [5, 6]], 2)).toEqual([5, 6]);
    });
});

describe('uniform-limit contract', () => {
    const P0 = [0, 0];
    const P1 = [1, 2];
    const P2 = [3, 2];

    it('evaluates the uniform quadratic segment', () => {
        expectClose(uniformQuadraticSegment(P0, P1, P2, 0.5), [1.125, 1.75]);
        // s = 0 and s = 1 are the knot values (P0 + P1)/2 and (P1 + P2)/2
        expectClose(uniformQuadraticSegment(P0, P1, P2, 0), [0.5, 1]);
        expectClose(uniformQuadraticSegment(P0, P1, P2, 1), [2, 2]);
        expectClose(uniformQuadraticSegment([0, 0, 0], [1, 2, 4], [3, 2, 8], 0.5), [1.125, 1.75, 4]);
    });

    it('equals the kernel on an unclamped uniform quadratic knot vector', () => {
        const u = uniformKnots(2, 2); // 0,1,2,3,4,5; domain [2, 3]
        const P = [P0, P1, P2];
        for (let step = 0; step <= 20; step++) {
            const s = step / 20;
            expectClose(uniformQuadraticSegment(P0, P1, P2, s), evaluate(u, 2, P, 2 + s));
        }
    });

    it('has the Chaikin identity: first-step edge straddling P1 has midpoint equal to the segment at s = 1/2', () => {
        const step = chaikinStep([P0, P1, P2], false);
        // open: P0, then edge 0 gives (0.25,0.5) (0.75,1.5), edge 1 gives (1.5,2) (2.5,2), then P2
        expect(step).toHaveLength(6);
        expectClose(step[1], [0.25, 0.5]);
        expectClose(step[2], [0.75, 1.5]);
        expectClose(step[3], [1.5, 2]);
        expectClose(step[4], [2.5, 2]);
        const mid = [(step[2][0] + step[3][0]) / 2, (step[2][1] + step[3][1]) / 2];
        expectClose(mid, [1.125, 1.75]);
        expectClose(mid, uniformQuadraticSegment(P0, P1, P2, 0.5));
    });

    it('wraps around for closed polygons and keeps open endpoints', () => {
        const open = chaikinStep([P0, P1, P2], false);
        expect(open[0]).toEqual(P0);
        expect(open[open.length - 1]).toEqual(P2);
        const closed = chaikinStep([[0, 0], [4, 0], [4, 4], [0, 4]], true);
        expect(closed).toHaveLength(8);
        expectClose(closed[0], [1, 0]);
        expectClose(closed[1], [3, 0]);
        expectClose(closed[6], [0, 3]);
        expectClose(closed[7], [0, 1]);
        expect(() => chaikinStep([P0], false)).toThrow(RangeError);
        expect(() => chaikinStep([P0, P1], true)).toThrow(RangeError);
        expect(() => chaikinStep([P0, [1, 2, 3]], false)).toThrow(RangeError);
    });
});
