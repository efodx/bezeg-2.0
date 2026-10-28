import {describe, expect, it} from "vitest";
import {patchFromNet} from "./patchSceneBuilder";
import type {Xyz} from "./surface-view/surfaceScene";
import {classifyJoin, enforceJoin, JOIN_ALPHA_RANGE, matchBoundaryDegree} from "./tensorJoins";
import {subdivisionPieces} from "./tensorSubdivision";

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const randomNet = (m: number, n: number, rand: () => number): Xyz[][] =>
    Array.from({length: m + 1}, () => Array.from({length: n + 1}, (): Xyz => [rand() * 4 - 2, rand() * 4 - 2, rand() * 4 - 2]));
const netOf = (patch: ReturnType<typeof patchFromNet>): Xyz[][] =>
    patch.getControlNet().map(row => row.map((p): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0]));

const binomial = (n: number, k: number): number => (k === 0 ? 1 : (binomial(n, k - 1) * (n - k + 1)) / k);
const bernstein = (n: number, i: number, t: number): number => binomial(n, i) * t ** i * (1 - t) ** (n - i);
/** Independent Bernstein-sum evaluator, valid for any real (u, v). */
function evalNet(net: Xyz[][], u: number, v: number): Xyz {
    const m = net.length - 1, n = net[0].length - 1;
    const out: Xyz = [0, 0, 0];
    for (let i = 0; i <= m; i++) {
        for (let j = 0; j <= n; j++) {
            const w = bernstein(m, i, u) * bernstein(n, j, v);
            for (let c = 0; c < 3; c++) out[c] += w * net[i][j][c];
        }
    }
    return out;
}
/** Central difference in u, taken across the boundary (the polynomial extends beyond [0, 1]). */
function derivativeU(net: Xyz[][], u: number, v: number): Xyz {
    const h = 1e-5;
    const p = evalNet(net, u + h, v), q = evalNet(net, u - h, v);
    return [(p[0] - q[0]) / (2 * h), (p[1] - q[1]) / (2 * h), (p[2] - q[2]) / (2 * h)];
}
const dist = (a: Xyz, b: Xyz): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const VS = [0, 0.13, 0.5, 0.81, 1];
const sampledGaps = (a: Xyz[][], b: Xyz[][]) => ({
    position: Math.max(...VS.map(v => dist(evalNet(a, 1, v), evalNet(b, 0, v)))),
    derivative: Math.max(...VS.map(v => dist(derivativeU(a, 1, v), derivativeU(b, 0, v)))),
});
const maxSurfaceDifference = (a: Xyz[][], b: Xyz[][]): number => {
    let worst = 0;
    for (const u of [0, 0.2, 0.55, 1]) for (const v of [0, 0.3, 0.9, 1]) worst = Math.max(worst, dist(evalNet(a, u, v), evalNet(b, u, v)));
    return worst;
};
const scaleNet = (net: Xyz[][], k: number): Xyz[][] => net.map(row => row.map((p): Xyz => [p[0] * k, p[1] * k, p[2] * k]));

describe("matchBoundaryDegree", () => {
    it("elevates the lower v degree of either side without changing the surfaces or the inputs", () => {
        const rand = rng(3);
        for (const [nA, nB] of [[2, 4], [4, 2], [1, 3], [3, 3]]) {
            const a = randomNet(3, nA, rand), b = randomNet(2, nB, rand);
            const copyA = JSON.stringify(a), copyB = JSON.stringify(b);
            const matched = matchBoundaryDegree(a, b);
            expect(matched.n).toBe(Math.max(nA, nB));
            expect(matched.a[0].length - 1).toBe(matched.n);
            expect(matched.b[0].length - 1).toBe(matched.n);
            expect(matched.a.length).toBe(4);
            expect(matched.b.length).toBe(3);
            expect(maxSurfaceDifference(matched.a, a)).toBeLessThan(1e-10);
            expect(maxSurfaceDifference(matched.b, b)).toBeLessThan(1e-10);
            expect(JSON.stringify(a)).toBe(copyA);
            expect(JSON.stringify(b)).toBe(copyB);
            expect(matched.a).not.toBe(a);
        }
    });

    it("rejects malformed nets", () => {
        expect(() => matchBoundaryDegree([[[0, 0, 0]]], [[[0, 0, 0], [1, 0, 0]], [[0, 1, 0], [1, 1, 0]]])).toThrow(RangeError);
        expect(() => matchBoundaryDegree([[[0, 0, 0], [1, 0, 0]], [[0, 1, 0]]], randomNet(1, 1, rng(1)))).toThrow(RangeError);
    });
});

describe("enforceJoin", () => {
    const rand = rng(9);
    const a = randomNet(3, 3, rand), b = randomNet(2, 3, rand);

    it("C0 sets only B's first row to A's last row", () => {
        const q = enforceJoin(a, b, "c0");
        for (let j = 0; j <= 3; j++) expect(q[0][j]).toEqual(a[3][j]);
        expect(q[1]).toEqual(b[1]);
        expect(q[2]).toEqual(b[2]);
    });

    it("C1 sets B's second row by the m_A / m_B factor (hand computed)", () => {
        const q = enforceJoin(a, b, "c1");
        for (let j = 0; j <= 3; j++) {
            for (let c = 0; c < 3; c++) {
                expect(q[0][j][c]).toBe(a[3][j][c]);
                expect(q[1][j][c]).toBeCloseTo(a[3][j][c] + (3 / 2) * (a[3][j][c] - a[2][j][c]), 12);
            }
        }
        expect(q[2]).toEqual(b[2]);
    });

    it("G1 scales the C1 offset by alpha, and alpha = 1 coincides with C1", () => {
        const q = enforceJoin(a, b, "g1", 2.5);
        for (let j = 0; j <= 3; j++) {
            for (let c = 0; c < 3; c++) expect(q[1][j][c]).toBeCloseTo(a[3][j][c] + 2.5 * (3 / 2) * (a[3][j][c] - a[2][j][c]), 12);
        }
        expect(enforceJoin(a, b, "g1", 1)).toEqual(enforceJoin(a, b, "c1"));
    });

    it("returns B matched only when A has the higher v degree for mode none", () => {
        const lowerB = randomNet(2, 1, rand);
        expect(enforceJoin(a, b, "none")).toEqual(b);
        const none = enforceJoin(a, lowerB, "none");
        expect(none[0].length).toBe(4);
        expect(maxSurfaceDifference(none, lowerB)).toBeLessThan(1e-10);
        const higherB = randomNet(2, 4, rand);
        expect(enforceJoin(a, higherB, "none")).toEqual(higherB);
        expect(enforceJoin(a, higherB, "none")).not.toBe(higherB);
    });

    it("derives rows after matching and leaves the inputs untouched", () => {
        const lowA = randomNet(2, 1, rand);
        const copy = JSON.stringify([lowA, b]);
        const q = enforceJoin(lowA, b, "c1");
        expect(q[0].length).toBe(4);
        expect(JSON.stringify([lowA, b])).toBe(copy);
        const matched = matchBoundaryDegree(lowA, b);
        for (let j = 0; j <= 3; j++) expect(q[0][j]).toEqual(matched.a[2][j]);
    });

    it("rejects non-positive or non-finite alpha for G1 and exposes the route range", () => {
        for (const alpha of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => enforceJoin(a, b, "g1", alpha)).toThrow(RangeError);
        expect(() => enforceJoin(a, b, "c1", 0)).not.toThrow();
        expect(JOIN_ALPHA_RANGE).toEqual({min: 0.25, max: 4});
    });
});

describe("classifyJoin on enforced pairs agrees with sampled derivatives", () => {
    const rand = rng(17);
    const cases: [number, number, number, number][] = [[3, 3, 2, 2], [2, 3, 3, 3], [3, 2, 2, 3], [1, 1, 4, 4], [4, 4, 1, 3]];

    it("C0 only: positions agree, derivatives do not", () => {
        for (const [mA, nA, mB, nB] of cases) {
            const a = randomNet(mA, nA, rand), b = randomNet(mB, nB, rand);
            const matched = matchBoundaryDegree(a, b);
            const pair = enforceJoin(a, b, "c0");
            const report = classifyJoin(a, pair);
            expect(report.c0).toBe(true);
            expect(report.c1).toBe(false);
            expect(report.g1).toBe(false);
            expect(report.matchedDegree).toBe(matched.n);
            const gaps = sampledGaps(matched.a, pair);
            expect(gaps.position).toBeLessThan(1e-9);
            expect(gaps.derivative).toBeGreaterThan(0.1);
            expect(report.positionGap).toBeLessThan(1e-9);
            expect(report.derivativeGap).toBeCloseTo(Math.max(...[0, 1 / 16, 0.5, 15 / 16, 1].map(v => dist(derivativeU(matched.a, 1, v), derivativeU(pair, 0, v)))), 0);
            expect(report.derivativeGap).toBeGreaterThan(0.1);
        }
    });

    it("C1: net classification, derivative continuity and ratio 1", () => {
        for (const [mA, nA, mB, nB] of cases) {
            const a = randomNet(mA, nA, rand), b = randomNet(mB, nB, rand);
            const matched = matchBoundaryDegree(a, b);
            const pair = enforceJoin(a, b, "c1");
            const report = classifyJoin(a, pair);
            expect(report.c0 && report.c1 && report.g1).toBe(true);
            expect(report.alphaStar).toBeCloseTo(1, 10);
            expect(report.c1Residual).toBeLessThan(1e-9);
            const gaps = sampledGaps(matched.a, pair);
            expect(gaps.position).toBeLessThan(1e-9);
            expect(gaps.derivative).toBeLessThan(1e-6);
            expect(report.derivativeGap).toBeLessThan(1e-9);
            expect(report.maxNormalAngle).toBeLessThan(1e-6);
            expect(report.undefinedNormalSamples).toBe(0);
        }
    });

    it("G1 with alpha != 1: tangent planes agree, derivatives scale by alpha, C1 fails", () => {
        for (const alpha of [0.25, 2, 3.7]) {
            for (const [mA, nA, mB, nB] of cases) {
                const a = randomNet(mA, nA, rand), b = randomNet(mB, nB, rand);
                const matched = matchBoundaryDegree(a, b);
                const pair = enforceJoin(a, b, "g1", alpha);
                const report = classifyJoin(a, pair);
                expect(report.c0).toBe(true);
                expect(report.c1).toBe(false);
                expect(report.g1).toBe(true);
                expect(report.alphaStar).toBeCloseTo(alpha, 9);
                expect(report.g1Residual).toBeLessThan(1e-9);
                for (const v of VS) {
                    const da = derivativeU(matched.a, 1, v), db = derivativeU(pair, 0, v);
                    expect(dist(db, da.map(x => alpha * x) as Xyz)).toBeLessThan(1e-5);
                }
                expect(sampledGaps(matched.a, pair).derivative).toBeGreaterThan(1e-3);
                expect(report.derivativeGap).toBeGreaterThan(1e-3);
                expect(report.maxNormalAngle).toBeLessThan(1e-6);
            }
        }
    });

    it("counterexamples: perturbed second row, perturbed first row, wrong sign", () => {
        const a = randomNet(3, 2, rand), b = randomNet(3, 2, rand);
        const c1 = enforceJoin(a, b, "c1");

        const secondRow = c1.map(row => row.map((p): Xyz => [...p]));
        secondRow[1][1] = [secondRow[1][1][0] + 0.3, secondRow[1][1][1], secondRow[1][1][2]];
        const r1 = classifyJoin(a, secondRow);
        expect([r1.c0, r1.c1, r1.g1]).toEqual([true, false, false]);
        expect(r1.derivativeGap).toBeGreaterThan(0.01);
        expect(r1.maxNormalAngle).toBeGreaterThan(1e-3);

        const firstRow = c1.map(row => row.map((p): Xyz => [...p]));
        firstRow[0][0] = [firstRow[0][0][0], firstRow[0][0][1] + 1e-3, firstRow[0][0][2]];
        const r2 = classifyJoin(a, firstRow);
        expect([r2.c0, r2.c1, r2.g1]).toEqual([false, false, false]);
        expect(r2.positionGap).toBeGreaterThan(5e-4);

        const flipped = enforceJoin(a, b, "c1").map((row, i) => row.map((p, j): Xyz => i === 1 ? [
            2 * a[3][j][0] - p[0], 2 * a[3][j][1] - p[1], 2 * a[3][j][2] - p[2]] : p));
        const r3 = classifyJoin(a, flipped);
        expect(r3.c0).toBe(true);
        expect(r3.alphaStar).toBeCloseTo(-1, 9);
        expect(r3.g1).toBe(false);
        expect(r3.c1).toBe(false);
    });

    it("join of nets with different v degrees is classified after elevation", () => {
        const rand2 = rng(40);
        const a = randomNet(3, 2, rand2);
        const lowB = randomNet(2, 1, rand2);
        // B with degree 1 in v whose boundary equals A's (quadratic) boundary only after elevation: impossible
        // for a generic A, so make A's boundary linear in disguise.
        const linearRow: Xyz[] = [[0, 0, 0], [1, 1, 1], [2, 2, 2]];
        a[3] = linearRow;
        lowB[0] = [[0, 0, 0], [2, 2, 2]];
        const report = classifyJoin(a, lowB);
        expect(report.matchedDegree).toBe(2);
        expect(report.c0).toBe(true);
        expect(report.c1).toBe(false);
        expect(report.positionGap).toBeLessThan(1e-9);
    });

    it("is invariant under scaling the whole configuration", () => {
        const a = randomNet(3, 3, rand), b = randomNet(2, 3, rand);
        const pair = enforceJoin(a, b, "g1", 2);
        for (const k of [1e-6, 1e6]) {
            const report = classifyJoin(scaleNet(a, k), scaleNet(pair, k));
            expect([report.c0, report.c1, report.g1]).toEqual([true, false, true]);
            expect(report.alphaStar).toBeCloseTo(2, 8);
        }
    });
});

describe("classifyJoin on subdivision pieces", () => {
    it("reports G1 with alpha* = (1 - u0) / u0 and C1 only at one half", () => {
        const net = randomNet(3, 3, rng(51));
        for (const u0 of [0.05, 0.3, 0.5, 0.8, 0.95]) {
            const [left, right] = subdivisionPieces(patchFromNet(net), "u", u0);
            const report = classifyJoin(netOf(left), netOf(right));
            expect(report.c0).toBe(true);
            expect(report.g1).toBe(true);
            expect(report.alphaStar).toBeCloseTo((1 - u0) / u0, 8);
            expect(report.c1).toBe(u0 === 0.5);
            expect(report.maxNormalAngle).toBeLessThan(1e-6);
        }
    });

    it("splits of an elevated-in-v pair of different degrees still classify", () => {
        const net = randomNet(2, 2, rng(52));
        const [left, right] = subdivisionPieces(patchFromNet(net), "u", 0.25);
        const report = classifyJoin(netOf(left), matchBoundaryDegree(netOf(left), netOf(right)).b);
        expect(report.g1).toBe(true);
        expect(report.alphaStar).toBeCloseTo(3, 8);
    });
});

describe("classifyJoin degeneracies", () => {
    const base = (): Xyz[][] => [
        [[0, 0, 0], [0, 1, 0], [0, 2, 0]],
        [[1, 0, 0], [1, 1, 0], [1, 2, 0]],
        [[2, 0, 0], [2, 1, 0], [2, 2, 0]],
    ];

    it("reports an undefined ratio when A's boundary derivative vanishes", () => {
        const a = base();
        a[1] = a[2].map((p): Xyz => [...p]);
        const b = base();
        b[0] = a[2].map((p): Xyz => [...p]);
        const report = classifyJoin(a, b);
        expect(report.c0).toBe(true);
        expect(report.c1).toBe(false);
        expect(report.alphaStar).toBeUndefined();
        expect(report.g1Residual).toBeUndefined();
        expect(report.g1).toBe(false);
        expect(report.undefinedNormalSamples).toBe(17);
        expect(report.maxNormalAngle).toBeUndefined();
        expect(report.derivativesVanish).toBe(false);
    });

    it("flags vanishing derivatives on both sides as C1 without a tangent plane", () => {
        const a = base();
        a[1] = a[2].map((p): Xyz => [...p]);
        const b = base();
        b[0] = a[2].map((p): Xyz => [...p]);
        b[1] = a[2].map((p): Xyz => [...p]);
        const report = classifyJoin(a, b);
        expect([report.c0, report.c1, report.g1, report.derivativesVanish]).toEqual([true, true, false, true]);
        expect(report.alphaStar).toBeUndefined();
    });

    it("judges G1 relative to the derivative size, not to the net", () => {
        // d^A = 1e-6 e1 per column, d^B the same plus a 1e-3 rad turn: absolute residual 1e-9 (= tol * D for D ~ 1), angle far above tol.
        const a = base();
        a[1] = a[2].map(([x, y, z]): Xyz => [x - 0.5e-6, y, z]);
        const b = base();
        b[0] = a[2].map((p): Xyz => [...p]);
        b[1] = a[2].map(([x, y, z]): Xyz => [x + 0.5e-6, y + 0.5e-9, z]);
        const report = classifyJoin(a, b);
        expect(report.c0).toBe(true);
        expect(report.alphaStar).toBeCloseTo(1, 6);
        expect(report.g1).toBe(false);
        const straight = b.map(row => row.map((p): Xyz => [...p]));
        straight[1] = a[2].map(([x, y, z]): Xyz => [x + 0.5e-6, y, z]);
        expect(classifyJoin(a, straight).g1).toBe(true);
    });

    it("keeps a flat planar join well defined", () => {
        const a = base();
        const b = enforceJoin(a, base(), "c1");
        const report = classifyJoin(a, b);
        expect([report.c0, report.c1, report.g1]).toEqual([true, true, true]);
        expect(report.alphaStar).toBeCloseTo(1, 12);
        expect(report.maxNormalAngle).toBeLessThan(1e-12);
    });

    it("treats a fully collapsed configuration as C0 with undefined ratio", () => {
        const point: Xyz[][] = [[[1, 1, 1], [1, 1, 1]], [[1, 1, 1], [1, 1, 1]]];
        const report = classifyJoin(point, point);
        expect(report.c0).toBe(true);
        expect(report.alphaStar).toBeUndefined();
        expect(report.g1).toBe(false);
    });

    it("rejects invalid options", () => {
        const a = base();
        expect(() => classifyJoin(a, a, {samples: 0})).toThrow(RangeError);
        expect(() => classifyJoin(a, a, {tolerance: -1})).toThrow(RangeError);
    });
});
