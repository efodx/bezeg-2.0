import {describe, expect, it} from 'vitest';
import {
    basisAll,
    bezierPieces,
    checkKnotInsertion,
    derivativeSource,
    domain,
    evaluate,
    evaluateRational,
    insertKnot,
    insertToMultiplicity,
    knotJoins,
    liftToHomogeneous,
    multiplicity,
    spanSources,
    validateKnotVector,
    validateWeights,
} from './index';
import {combAtJoin, splineSpanSource} from '../curvature';

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
    P: number[][];
}

/** Random valid knot vectors (clamped and unclamped, interior multiplicities up to k + 1) with random 2D/3D rows. */
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
            const dimension = cases.length % 3 === 0 ? 3 : 2;
            const P = Array.from({length: n + 1}, () => Array.from({length: dimension}, () => rand() * 10 - 5));
            cases.push({u, k, n, P});
        }
    }
    return cases;
}

function maxDiff(a: readonly number[], b: readonly number[]): number {
    return Math.max(...a.map((value, d) => Math.abs(value - b[d])));
}

/** Insertion candidates: both domain ends, an existing domain knot, and fresh values. */
function insertionValues(c: Case, rand: () => number): number[] {
    const [a, b] = domain(c.u, c.k, c.n);
    return [a, b, c.u[c.k + Math.floor(rand() * (c.n - c.k + 2))], a + rand() * (b - a), a + (b - a) * 0.5];
}

/** Independent oracle: plain de Casteljau on a Bezier piece, s in [0, 1]. */
function deCasteljau(points: readonly (readonly number[])[], s: number): number[] {
    let level = points.map(row => [...row]);
    while (level.length > 1) {
        const current = level;
        level = current.slice(1).map((row, i) => row.map((value, d) => (1 - s) * current[i][d] + s * value));
    }
    return level[0];
}

/** Independent oracle: Bernstein form of a Bezier piece. */
function bernsteinValue(points: readonly (readonly number[])[], s: number): number[] {
    const degree = points.length - 1;
    const result = points[0].map(() => 0);
    points.forEach((row, i) => {
        let binomial = 1;
        for (let j = 1; j <= i; j++) {
            binomial = binomial * (degree - i + j) / j;
        }
        const weight = binomial * Math.pow(s, i) * Math.pow(1 - s, degree - i);
        row.forEach((value, d) => {
            result[d] += weight * value;
        });
    });
    return result;
}

// Spec L2/L3/L4 data.
const L2_U = [0, 0, 0, 1, 2, 2, 2];
const L2_P = [[0, 0], [1, 2], [3, 2], [4, 0]];
const CUBIC_U = [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3];
const CUBIC_P = [[0, 0], [1, 2], [2, 3], [3, 1], [4, 1], [5, 3], [6, 0]];

function expectRows(actual: readonly (readonly number[])[], expected: readonly (readonly number[])[]): void {
    expect(actual.length).toBe(expected.length);
    actual.forEach((row, i) => expect(maxDiff(row, expected[i])).toBeLessThan(TOL));
}

describe('knot insertion (Boehm)', () => {
    it('leaves 1000 samples unchanged on random clamped and unclamped vectors, k = 1..5, ends and existing knots included', () => {
        const rand = mulberry32(11);
        let insertions = 0;
        const degrees = new Set<number>();
        for (const c of randomCases(80, 101)) {
            for (const x of insertionValues(c, rand)) {
                if (!checkKnotInsertion(c.u, c.k, c.n, x).ok) {
                    continue;
                }
                const result = insertKnot(c.u, c.k, c.P, x);
                expect(result.knots.length).toBe(c.u.length + 1);
                expect(result.points.length).toBe(c.P.length + 1);
                expect(multiplicity(result.knots, x)).toBe(multiplicity(c.u, x) + 1);
                expect(validateKnotVector(result.knots, c.k, c.n + 1)).toEqual({ok: true});
                expect(domain(result.knots, c.k, c.n + 1)).toEqual(domain(c.u, c.k, c.n));
                const [a, b] = domain(c.u, c.k, c.n);
                let worst = 0;
                for (let i = 0; i <= 1000; i++) {
                    const t = a + (b - a) * i / 1000;
                    worst = Math.max(worst, maxDiff(evaluate(result.knots, c.k, result.points, t), evaluate(c.u, c.k, c.P, t)));
                }
                expect(worst).toBeLessThan(TOL);
                insertions++;
                degrees.add(c.k);
            }
        }
        expect(insertions).toBeGreaterThan(200);
        expect([...degrees].sort()).toEqual([1, 2, 3, 4, 5]);
    }, 60000);

    it('insertToMultiplicity reaches every multiplicity up to k + 1 and keeps the curve', () => {
        const rand = mulberry32(12);
        let checked = 0;
        for (const c of randomCases(80, 102)) {
            for (const x of insertionValues(c, rand)) {
                const present = multiplicity(c.u, x);
                for (let target = 1; target <= c.k + 1; target++) {
                    const result = insertToMultiplicity(c.u, c.k, c.P, x, target);
                    expect(multiplicity(result.knots, x)).toBe(Math.max(present, target));
                    expect(validateKnotVector(result.knots, c.k, result.points.length - 1)).toEqual({ok: true});
                    const [a, b] = domain(c.u, c.k, c.n);
                    let worst = 0;
                    for (let i = 0; i <= 200; i++) {
                        const t = a + (b - a) * i / 200;
                        worst = Math.max(worst, maxDiff(evaluate(result.knots, c.k, result.points, t), evaluate(c.u, c.k, c.P, t)));
                    }
                    expect(worst).toBeLessThan(TOL);
                    checked++;
                }
            }
        }
        expect(checked).toBeGreaterThan(300);
    }, 60000);

    it('matches the spec L3 golden points: insert 1 then 0.5 into the L2 example', () => {
        const atOne = insertKnot(L2_U, 2, L2_P, 1);
        expect(atOne.knots).toEqual([0, 0, 0, 1, 1, 2, 2, 2]);
        expectRows(atOne.points, [[0, 0], [1, 2], [2, 2], [3, 2], [4, 0]]);
        const atHalf = insertKnot(L2_U, 2, L2_P, 0.5);
        expect(atHalf.knots).toEqual([0, 0, 0, 0.5, 1, 2, 2, 2]);
        expectRows(atHalf.points, [[0, 0], [0.5, 1], [1.5, 2], [3, 2], [4, 0]]);
        expect(maxDiff(evaluate(atHalf.knots, 2, atHalf.points, 0.5), [1, 1.5])).toBeLessThan(TOL);
    });

    it('refuses insertion outside the domain, past multiplicity k + 1 and for non-finite values, with reasons', () => {
        expect(checkKnotInsertion(L2_U, 2, 3, -0.1)).toEqual({ok: false, reason: 'outside_domain'});
        expect(checkKnotInsertion(L2_U, 2, 3, 2.1)).toEqual({ok: false, reason: 'outside_domain'});
        expect(checkKnotInsertion(L2_U, 2, 3, 0)).toEqual({ok: false, reason: 'multiplicity_too_high'});
        expect(checkKnotInsertion(L2_U, 2, 3, NaN)).toEqual({ok: false, reason: 'not_finite'});
        expect(checkKnotInsertion(L2_U, 2, 3, 1)).toEqual({ok: true});
        expect(() => insertKnot(L2_U, 2, L2_P, 3)).toThrow(/outside_domain/);
        expect(() => insertKnot(L2_U, 2, L2_P, 0)).toThrow(/multiplicity_too_high/);
        expect(() => insertToMultiplicity(L2_U, 2, L2_P, 1, 4)).toThrow(RangeError);
        expect(() => insertToMultiplicity(L2_U, 2, L2_P, 1, 0)).toThrow(RangeError);
        expect(() => insertToMultiplicity(L2_U, 2, L2_P, 3, 1)).toThrow(/outside_domain/);
        // already of the target multiplicity: an unchanged copy
        expect(insertToMultiplicity(L2_U, 2, L2_P, 2, 2).knots).toEqual(L2_U);
        expect(() => insertKnot([0, 0, 1, 0.5, 1, 1], 2, L2_P, 0.5)).toThrow(/decreasing/);
        expect(() => insertKnot(L2_U, 2, [[0, 0], [1, 1]], 1)).toThrow(RangeError);
    });
});

describe('Bezier extraction', () => {
    it('matches the spec L4 golden pieces for the quadratic example', () => {
        const {pieces, operator, knots} = bezierPieces(L2_U, 2, L2_P);
        expect(knots).toEqual([0, 0, 0, 1, 1, 2, 2, 2]);
        expect(pieces.map(p => [p.start, p.end])).toEqual([[0, 1], [1, 2]]);
        expectRows(pieces[0].points, [[0, 0], [1, 2], [2, 2]]);
        expectRows(pieces[1].points, [[2, 2], [3, 2], [4, 0]]);
        // b_2 = b_0' = 1/2 P_1 + 1/2 P_2
        expect(operator[2][1]).toBeCloseTo(0.5, 15);
        expect(operator[2][2]).toBeCloseTo(0.5, 15);
    });

    it('matches the spec L3/L4 golden pieces for the cubic with a double knot', () => {
        const {pieces} = bezierPieces(CUBIC_U, 3, CUBIC_P);
        expect(pieces.map(p => [p.start, p.end])).toEqual([[0, 1], [1, 2], [2, 3]]);
        expectRows(pieces[0].points, [[0, 0], [1, 2], [1.5, 2.5], [2, 2.25]]);
        expectRows(pieces[1].points, [[2, 2.25], [2.5, 2], [3, 1], [3.5, 1]]);
        expectRows(pieces[2].points, [[3.5, 1], [4, 1], [5, 3], [6, 0]]);
    });

    it('pieces equal the original on their intervals (independent de Casteljau and Bernstein); count = distinct interior knots + 1', () => {
        const rand = mulberry32(21);
        for (const c of randomCases(120, 103)) {
            const result = bezierPieces(c.u, c.k, c.P);
            const interior = new Set(c.u.slice(c.k, c.n + 2).filter(x => x > c.u[c.k] && x < c.u[c.n + 1]));
            expect(result.pieces.length).toBe(interior.size + 1);
            expect(result.pieces[0].start).toBe(c.u[c.k]);
            expect(result.pieces[result.pieces.length - 1].end).toBe(c.u[c.n + 1]);
            result.pieces.forEach((piece, index) => {
                expect(piece.points.length).toBe(c.k + 1);
                if (index > 0) {
                    expect(piece.start).toBe(result.pieces[index - 1].end);
                }
                for (let i = 0; i <= 30; i++) {
                    // the end s = 1 is only comparable at the domain end: at a break the B-spline jumps to the next piece
                    const s = i === 0 ? 0 : i === 30 ? (piece.end === c.u[c.n + 1] ? 1 : 1 - 1e-9) : rand();
                    const t = piece.start + s * (piece.end - piece.start);
                    const expected = evaluate(c.u, c.k, c.P, t);
                    expect(maxDiff(deCasteljau(piece.points, s), expected)).toBeLessThan(1e-11);
                    expect(maxDiff(bernsteinValue(piece.points, s), expected)).toBeLessThan(1e-11);
                }
            });
            // every distinct domain knot reaches multiplicity >= k
            for (const x of new Set(c.u.slice(c.k, c.n + 2))) {
                expect(multiplicity(result.knots, x)).toBeGreaterThanOrEqual(c.k);
            }
        }
    });

    it('row operator applied to P reproduces the refined points; rows are affine (non-negative, sum to 1)', () => {
        for (const c of randomCases(120, 104)) {
            const {points, operator} = bezierPieces(c.u, c.k, c.P);
            expect(operator.length).toBe(points.length);
            operator.forEach((row, i) => {
                expect(row.length).toBe(c.P.length);
                expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
                expect(Math.min(...row)).toBeGreaterThanOrEqual(0);
                const combined = c.P[0].map((_, d) => row.reduce((sum, weight, j) => sum + weight * c.P[j][d], 0));
                expect(maxDiff(combined, points[i])).toBeLessThan(1e-12);
            });
        }
    });

    it('handles an existing break (multiplicity k + 1) without division by zero', () => {
        const u = [0, 0, 0, 1, 1, 1, 2, 2, 2];
        const P = [[0, 0], [1, 2], [2, 0], [3, 1], [4, 3], [5, 0]];
        const {pieces, points} = bezierPieces(u, 2, P);
        expect(pieces.length).toBe(2);
        expectRows(pieces[0].points, [[0, 0], [1, 2], [2, 0]]);
        expectRows(pieces[1].points, [[3, 1], [4, 3], [5, 0]]);
        expect(points.every(row => row.every(Number.isFinite))).toBe(true);
    });

    it('passes an already-Bezier vector through, and handles degree 0', () => {
        const bez = bezierPieces([0, 0, 0, 1, 1, 1], 2, [[0, 0], [1, 1], [2, 0]]);
        expect(bez.pieces.length).toBe(1);
        expectRows(bez.pieces[0].points, [[0, 0], [1, 1], [2, 0]]);
        const constant = bezierPieces([0, 1, 2, 3], 0, [[5], [6], [7]]);
        expect(constant.pieces.map(p => p.points[0][0])).toEqual([5, 6, 7]);
    });
});

/** Central differences of `f`; callers keep t well inside a span. */
function centralDifferences(f: (t: number) => number[], t: number, h: number): { d1: number[], d2: number[] } {
    const minus = f(t - h);
    const mid = f(t);
    const plus = f(t + h);
    return {
        d1: mid.map((_, d) => (plus[d] - minus[d]) / (2 * h)),
        d2: mid.map((_, d) => (plus[d] - 2 * mid[d] + minus[d]) / (h * h)),
    };
}

describe('derivative source', () => {
    it('r, r-prime and r-double-prime agree with central differences and with differentiating the basis numerically', () => {
        const rand = mulberry32(31);
        let checked = 0;
        for (const c of randomCases(80, 105)) {
            if (c.P[0].length !== 2) {
                continue;
            }
            for (const span of spanSources(c.u, c.k, c.P)) {
                const length = span.end - span.start;
                const h = 1e-4 * length;
                for (let i = 0; i < 3; i++) {
                    const t = span.start + length * (0.1 + 0.8 * rand());
                    const tuple = span.source.at(t);
                    expect(maxDiff(tuple.point, evaluate(c.u, c.k, c.P, t))).toBeLessThan(1e-12);
                    const fd = centralDifferences(x => evaluate(c.u, c.k, c.P, x), t, h);
                    const scale = Math.max(1, ...tuple.d1.map(Math.abs));
                    expect(maxDiff(tuple.d1, fd.d1)).toBeLessThan(1e-6 * scale);
                    const scale2 = Math.max(1, ...tuple.d2.map(Math.abs));
                    expect(maxDiff(tuple.d2, fd.d2)).toBeLessThan(1e-4 * scale2);
                    // sum_i P_i N_i' with N_i' by central differences of the Cox-de Boor table
                    const plus = basisAll(c.u, c.k, t + h);
                    const minus = basisAll(c.u, c.k, t - h);
                    const viaBasis = [0, 1].map(d => c.P.reduce((sum, row, j) => sum + row[d] * (plus[j] - minus[j]) / (2 * h), 0));
                    expect(maxDiff(tuple.d1, viaBasis)).toBeLessThan(1e-6 * scale);
                    // the whole-curve source agrees inside a span
                    expect(maxDiff(derivativeSource(c.u, c.k, c.P).at(t).d1, tuple.d1)).toBeLessThan(1e-12);
                    checked++;
                }
            }
        }
        expect(checked).toBeGreaterThan(300);
    });

    it('agrees per span with the Bezier-piece source of the curvature kernel (independent route)', () => {
        const rand = mulberry32(32);
        for (const c of randomCases(80, 106)) {
            if (c.P[0].length !== 2) {
                continue;
            }
            const {pieces} = bezierPieces(c.u, c.k, c.P);
            const spans = spanSources(c.u, c.k, c.P);
            expect(spans.length).toBe(pieces.length);
            spans.forEach((span, index) => {
                const reference = splineSpanSource(pieces[index].points, pieces[index].start, pieces[index].end);
                expect([span.start, span.end]).toEqual([pieces[index].start, pieces[index].end]);
                for (const s of [0, 1, rand(), rand()]) {
                    const t = span.start + s * (span.end - span.start);
                    const a = span.source.at(t);
                    const b = reference.at(t);
                    expect(maxDiff(a.point, b.point)).toBeLessThan(1e-10);
                    expect(maxDiff(a.d1, b.d1)).toBeLessThan(1e-9 * Math.max(1, Math.abs(b.d1[0]), Math.abs(b.d1[1])));
                    expect(maxDiff(a.d2, b.d2)).toBeLessThan(1e-8 * Math.max(1, Math.abs(b.d2[0]), Math.abs(b.d2[1])));
                }
            });
        }
    });

    it('degree 1 has zero second derivative and degree 0 zero first and second derivatives', () => {
        const line = derivativeSource([0, 0, 1, 2, 2], 1, [[0, 0], [1, 2], [3, 0]]).at(0.5);
        expect(line.d1).toEqual([1, 2]);
        expect(line.d2).toEqual([0, 0]);
        const constant = derivativeSource([0, 1, 2], 0, [[3, 4], [5, 6]]).at(0.5);
        expect(constant.d1).toEqual([0, 0]);
        expect(constant.point).toEqual([3, 4]);
    });

    it('spec L3 golden curvature: -1.4311 both sides of the simple knot, 8/3 to 16/3 at the double knot, equal tangent', () => {
        const joins = knotJoins(CUBIC_U, 3, CUBIC_P);
        expect(joins.map(j => j.t)).toEqual([1, 2]);
        const simple = combAtJoin(joins[0].left, joins[0].right);
        expect(simple.kappaLeft).toBeCloseTo(-1.4311, 4);
        expect(simple.kappaRight).toBeCloseTo(-1.4311, 4);
        expect(Math.abs(simple.jump!)).toBeLessThan(1e-12);
        const double = combAtJoin(joins[1].left, joins[1].right);
        expect(double.kappaLeft).toBeCloseTo(8 / 3, 12);
        expect(double.kappaRight).toBeCloseTo(16 / 3, 12);
        expect(double.jump).toBeCloseTo(8 / 3, 12);
        const left = joins[1].left.source.at(2);
        const right = joins[1].right.source.at(2);
        expect(maxDiff(left.d1, [1.5, 0])).toBeLessThan(1e-12);
        expect(maxDiff(right.d1, [1.5, 0])).toBeLessThan(1e-12);
        // the whole-curve source is right-continuous at the knot
        expect(maxDiff(derivativeSource(CUBIC_U, 3, CUBIC_P).at(2).d2, right.d2)).toBeLessThan(1e-12);
        expect(maxDiff(left.d2, right.d2)).toBeGreaterThan(1);
    });

    it('a C1 quadratic shows a one-sided curvature jump that matches the Bezier end-curvature formula', () => {
        const u = [0, 0, 0, 1, 2, 3, 3, 3];
        const P = [[0, 0], [1, 3], [3, 3], [4, 0], [6, 1]];
        const [join] = knotJoins(u, 2, P).filter(j => j.t === 1);
        const result = combAtJoin(join.left, join.right);
        // quadratic Bezier, D0 = b1 - b0, D1 = b2 - b1: kappa(0) = cross(D0, D1) / (2 |D0|^3), kappa(1) = cross(D0, D1) / (2 |D1|^3)
        const {pieces} = bezierPieces(u, 2, P);
        const cross = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];
        const delta = (piece: number[][], i: number) => [piece[i + 1][0] - piece[i][0], piece[i + 1][1] - piece[i][1]];
        const norm3 = (v: number[]) => Math.pow(Math.hypot(v[0], v[1]), 3);
        const [p0, p1] = pieces.map(p => p.points);
        expect(result.kappaLeft).toBeCloseTo(cross(delta(p0, 0), delta(p0, 1)) / (2 * norm3(delta(p0, 1))), 12);
        expect(result.kappaRight).toBeCloseTo(cross(delta(p1, 0), delta(p1, 1)) / (2 * norm3(delta(p1, 0))), 12);
        expect(Math.abs(result.jump!)).toBeGreaterThan(0.1);
        // tangent (first derivative) continuous: C1
        expect(maxDiff(join.left.source.at(1).d1, join.right.source.at(1).d1)).toBeLessThan(1e-12);
    });

    it('rejects invalid vectors, non-planar and malformed rows', () => {
        expect(() => derivativeSource([0, 0, 1, 0.5, 1, 1], 2, L2_P)).toThrow(RangeError);
        expect(() => derivativeSource(L2_U, 2, [[0, 0, 1], [1, 2, 0], [3, 2, 0], [4, 0, 0]])).toThrow(RangeError);
        expect(() => derivativeSource(L2_U, 2, L2_P.slice(1))).toThrow(RangeError);
        expect(() => derivativeSource(L2_U, 2, L2_P).at(2.5)).toThrow(RangeError);
        expect(derivativeSource(L2_U, 2, L2_P).scale).toBeGreaterThan(0);
    });
});

const R = Math.SQRT2 / 2;
const CIRCLE_U = [0, 0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1, 1];
const CIRCLE_P = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0]];
const CIRCLE_W = [1, R, 1, R, 1, R, 1, R, 1];

describe('rational (NURBS)', () => {
    it('is the circle: radial error below 1e-12 over 1001 samples, and above 1e-2 with unit weights', () => {
        let worst = 0;
        let worstUnit = 0;
        for (let i = 0; i <= 1000; i++) {
            const t = i / 1000;
            const p = evaluateRational(CIRCLE_U, 2, CIRCLE_P, CIRCLE_W, t);
            worst = Math.max(worst, Math.abs(Math.hypot(p[0], p[1]) - 1));
            const q = evaluateRational(CIRCLE_U, 2, CIRCLE_P, CIRCLE_P.map(() => 1), t);
            worstUnit = Math.max(worstUnit, Math.abs(Math.hypot(q[0], q[1]) - 1));
        }
        expect(worst).toBeLessThan(1e-12);
        expect(worstUnit).toBeGreaterThan(1e-2);
    });

    it('matches the spec L5 golden points and angles (not angle-uniform)', () => {
        const a = evaluateRational(CIRCLE_U, 2, CIRCLE_P, CIRCLE_W, 1 / 16);
        expect(a[0]).toBeCloseTo(0.92979, 4);
        expect(a[1]).toBeCloseTo(0.36809, 4);
        expect(Math.atan2(a[1], a[0]) * 180 / Math.PI).toBeCloseTo(21.598, 3);
        const b = evaluateRational(CIRCLE_U, 2, CIRCLE_P, CIRCLE_W, 1 / 8);
        expect(Math.abs(b[0] - R)).toBeLessThan(TOL);
        expect(Math.abs(b[1] - R)).toBeLessThan(TOL);
        expect(Math.atan2(b[1], b[0]) * 180 / Math.PI).toBeCloseTo(45, 10);
        // closed circle: both ends at (1, 0)
        expect(maxDiff(evaluateRational(CIRCLE_U, 2, CIRCLE_P, CIRCLE_W, 0), [1, 0])).toBeLessThan(TOL);
        expect(maxDiff(evaluateRational(CIRCLE_U, 2, CIRCLE_P, CIRCLE_W, 1), [1, 0])).toBeLessThan(TOL);
    });

    it('equals the rational basis sum (w P N over w N) and ignores a positive scaling of all weights', () => {
        const rand = mulberry32(41);
        for (const c of randomCases(60, 107)) {
            const weights = c.P.map(() => 0.2 + rand() * 3);
            const scaled = weights.map(w => 7.5 * w);
            const [a, b] = domain(c.u, c.k, c.n);
            for (let i = 0; i < 20; i++) {
                const t = a + rand() * (b - a);
                const N = basisAll(c.u, c.k, t);
                const denominator = N.reduce((sum, value, j) => sum + value * weights[j], 0);
                const expected = c.P[0].map((_, d) => N.reduce((sum, value, j) => sum + value * weights[j] * c.P[j][d], 0) / denominator);
                const actual = evaluateRational(c.u, c.k, c.P, weights, t);
                expect(maxDiff(actual, expected)).toBeLessThan(1e-11);
                expect(maxDiff(evaluateRational(c.u, c.k, c.P, scaled, t), actual)).toBeLessThan(1e-11);
            }
        }
    });

    it('rejects zero, negative, non-finite and miscounted weights with a reason code', () => {
        expect(validateWeights([1, 1, 1], 3)).toEqual({ok: true});
        expect(validateWeights([1, 0, 1], 3)).toEqual({ok: false, reason: 'nonpositive', index: 1});
        expect(validateWeights([1, 1, -2], 3)).toEqual({ok: false, reason: 'nonpositive', index: 2});
        expect(validateWeights([1, NaN, 1], 3)).toEqual({ok: false, reason: 'not_finite', index: 1});
        expect(validateWeights([Infinity, 1, 1], 3)).toEqual({ok: false, reason: 'not_finite', index: 0});
        expect(validateWeights([1, 1], 3)).toEqual({ok: false, reason: 'wrong_count'});
        expect(() => evaluateRational(L2_U, 2, L2_P, [1, 0, 1, 1], 0.5)).toThrow(/nonpositive/);
        expect(() => evaluateRational(L2_U, 2, L2_P, [1, -1, 1, 1], 0.5)).toThrow(/nonpositive/);
        expect(() => evaluateRational(L2_U, 2, L2_P, [1, 1, 1], 0.5)).toThrow(/wrong_count/);
        expect(() => liftToHomogeneous(L2_P, [1, 1, NaN, 1])).toThrow(/not_finite/);
    });

    it('lifts to (w P, w) and equal weights give the polynomial curve', () => {
        expect(liftToHomogeneous([[1, 2]], [3])).toEqual([[3, 6, 3]]);
        expect(maxDiff(evaluateRational(L2_U, 2, L2_P, [2, 2, 2, 2], 0.5), [1, 1.5])).toBeLessThan(TOL);
    });
});
