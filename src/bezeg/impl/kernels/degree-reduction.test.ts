import {describe, expect, it} from "vitest";
import {elevate} from "./bezier-kernels";
import {
    controlPointBound,
    elevatedQuadratic,
    isExactlyReducible,
    l2Error,
    MAX_ERROR_SAMPLES,
    maxCurveError,
    reduce,
    REDUCIBLE_TOLERANCE,
    thirdDifference,
} from "./degree-reduction";

const P = [[0, 0], [1, 3], [3, 3], [4, 0]];
const P2 = [[0, 0], [1, 4], [3, 1], [4, 3]];

function lcg(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 4294967296;
    };
}

function close(a: number[][], b: number[][], digits: number) {
    a.forEach((row, i) => row.forEach((v, d) => expect(v).toBeCloseTo(b[i][d], digits)));
}

/** Independent check: composite Simpson quadrature of |B - Q|^2 on 2000 intervals. */
function sampledL2(cubic: number[][], quad: number[][]): number {
    const e = elevate(quad);
    const f = (t: number) => {
        const bs = [(1 - t) ** 3, 3 * t * (1 - t) ** 2, 3 * t * t * (1 - t), t ** 3];
        return cubic[0].reduce((s, _, d) => s + (cubic.reduce((u, r, i) => u + bs[i] * (r[d] - e[i][d]), 0)) ** 2, 0);
    };
    const n = 2000;
    let sum = f(0) + f(1);
    for (let i = 1; i < n; i++) sum += f(i / n) * (i % 2 ? 4 : 2);
    return Math.sqrt(sum / (3 * n));
}

type Example = [string, number[][], number[], number, number, number[][], number, number, number, number];

describe("degree reduction", () => {
    it("round trip: elevated quadratic is recovered in both modes and is the only reducible case", () => {
        const quad = [[0, 0], [2, 4], [4, 0]];
        const cubic = elevate(quad);
        for (const mode of ["fixed", "free"] as const) close(reduce(cubic, mode), quad, 12);
        thirdDifference(cubic).forEach(v => expect(Math.abs(v)).toBeLessThan(1e-12));
        expect(isExactlyReducible(cubic)).toBe(true);
        expect(isExactlyReducible(P)).toBe(false);
        expect(isExactlyReducible(P2)).toBe(false);
        expect(REDUCIBLE_TOLERANCE).toBe(1e-9);
        expect(isExactlyReducible(cubic.map((r, i) => i === 1 ? [r[0], r[1] + 1e-3] : r))).toBe(false);
        expect(elevatedQuadratic(quad)).toEqual(cubic);
    });

    it("reducibility tolerance is translation-invariant (relative to the control-polygon extent)", () => {
        const cubic = elevate([[0, 0], [2, 4], [4, 0]]);
        const shift = (net: number[][], d: number) => net.map(r => r.map(v => v + d));
        const bumped = cubic.map((r, i) => i === 1 ? [r[0], r[1] + 1e-4] : r);
        expect(isExactlyReducible(shift(cubic, 1e6))).toBe(true);
        expect(isExactlyReducible(shift(bumped, 1e6))).toBe(false);
        // extent 4: a bump of 1e-8 (|third difference| 3e-8) exceeds 1e-9 * 4, one of 1e-10 does not
        expect(isExactlyReducible(cubic.map((r, i) => i === 1 ? [r[0], r[1] + 1e-8] : r))).toBe(false);
        expect(isExactlyReducible(cubic.map((r, i) => i === 1 ? [r[0], r[1] + 1e-10] : r))).toBe(true);
        expect(isExactlyReducible([[1, 1], [1, 1], [1, 1], [1, 1]])).toBe(true);
    });

    it("third difference of the spec example is (-2, 0)", () => {
        expect(thirdDifference(P)).toEqual([-2, 0]);
    });

    const examples: Example[] = [
        ["P", P, [2, 4.5], 0.096225, 0.069007, [[-0.1, 0], [2, 4.5], [4.1, 0]], 0.1, 0.037796, 1 / 3, 0.3],
        ["P2", P2, [2, 3], 0.585314, 0.419750, [[-0.1, 0.6], [2, 3], [4.1, 2.4]], 0.608276, 0.229907, 2.0276, 1.8248],
    ];
    it.each(examples)("spec example %s", (_n, b, q1, maxF, l2F, free, maxE, l2E, boundF, boundE) => {
        const fixed = reduce(b, "fixed");
        close(fixed, [b[0], q1, b[3]], 6);
        expect(maxCurveError(b, fixed)).toBeCloseTo(maxF, 6);
        expect(l2Error(b, fixed)).toBeCloseTo(l2F, 6);
        expect(sampledL2(b, fixed)).toBeCloseTo(l2F, 6);
        [0, 1].forEach(d => expect(fixed[1][d]).toBeCloseTo((3 * (b[1][d] + b[2][d]) - b[0][d] - b[3][d]) / 4, 12));
        expect(controlPointBound(b, fixed)).toBeCloseTo(boundF, 4);

        const fr = reduce(b, "free");
        close(fr, free, 6);
        expect(maxCurveError(b, fr)).toBeCloseTo(maxE, 6);
        expect(l2Error(b, fr)).toBeCloseTo(l2E, 6);
        expect(sampledL2(b, fr)).toBeCloseTo(l2E, 6);
        expect(controlPointBound(b, fr)).toBeCloseTo(boundE, 4);
        expect(MAX_ERROR_SAMPLES).toBe(2000);
    });

    it("sqrt(3)/18 is the fixed maximum error of P", () => {
        expect(maxCurveError(P, reduce(P, "fixed"))).toBeCloseTo(Math.sqrt(3) / 18, 6);
    });

    it("no nearby quadratic has smaller L2 error under the mode's constraints", () => {
        const rand = lcg(7);
        const cubics = [P, P2, Array.from({length: 4}, () => [rand() * 10 - 5, rand() * 10 - 5])];
        for (const cubic of cubics) {
            for (const mode of ["fixed", "free"] as const) {
                const best = reduce(cubic, mode);
                const base = l2Error(cubic, best);
                const movable = mode === "fixed" ? [1] : [0, 1, 2];
                for (let k = 0; k < 200; k++) {
                    const trial = best.map(r => [...r]);
                    for (const i of movable) for (let d = 0; d < 2; d++) trial[i][d] += (rand() - 0.5) * 0.2;
                    expect(l2Error(cubic, trial)).toBeGreaterThanOrEqual(base - 1e-12);
                }
                for (const i of movable) for (let d = 0; d < 2; d++) for (const s of [-1e-3, 1e-3]) {
                    const trial = best.map(r => [...r]);
                    trial[i][d] += s;
                    expect(l2Error(cubic, trial)).toBeGreaterThan(base);
                }
            }
        }
    });

    it("free is better than fixed in L2 on the non-reducible examples", () => {
        for (const c of [P, P2]) expect(l2Error(c, reduce(c, "free"))).toBeLessThan(l2Error(c, reduce(c, "fixed")));
    });

    it("control-point bound is at least the sampled maximum error on random cubics", () => {
        const rand = lcg(42);
        for (let k = 0; k < 100; k++) {
            const cubic = Array.from({length: 4}, () => [rand() * 20 - 10, rand() * 20 - 10]);
            for (const mode of ["fixed", "free"] as const) {
                const q = reduce(cubic, mode);
                expect(controlPointBound(cubic, q) + 1e-12).toBeGreaterThanOrEqual(maxCurveError(cubic, q));
            }
        }
    });

    it("works in three dimensions", () => {
        const c = [[0, 0, 0], [1, 3, 2], [3, 3, -1], [4, 0, 1]];
        expect(reduce(c, "fixed")[1][2]).toBeCloseTo((3 * (2 - 1) - 0 - 1) / 4, 12);
        expect(reduce(elevate([[0, 0, 0], [1, 2, 3], [4, 0, 1]]), "free")[1][2]).toBeCloseTo(3, 12);
    });

    it("rejects invalid input with a RangeError", () => {
        expect(() => reduce(P.slice(0, 3), "fixed")).toThrow(RangeError);
        expect(() => reduce([...P, [1, 1]], "free")).toThrow(/exactly 4/);
        expect(() => reduce([[0, 0], [1, NaN], [3, 3], [4, 0]], "fixed")).toThrow(/finite/);
        expect(() => reduce([[0, 0], [1, Infinity], [3, 3], [4, 0]], "free")).toThrow(RangeError);
        expect(() => reduce([[0, 0], [1], [3, 3], [4, 0]], "free")).toThrow(/dimension/);
        expect(() => l2Error(P, P)).toThrow(RangeError);
        expect(() => isExactlyReducible([])).toThrow(RangeError);
    });
});
