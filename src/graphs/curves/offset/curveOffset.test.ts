import {describe, expect, it} from "vitest";
import {
    curvatureAt,
    cuspParameters,
    evolutePoint,
    polynomialBezierSource,
    rationalBezierSource,
} from "../../../bezeg/impl/curve/curvature";
import {phControlPoints, phOffsetRational, phSigmas, Vec} from "../../../bezeg/impl/curve/ph-math";
import {
    OFFSET_SAMPLES_DEFAULT,
    OFFSET_SAMPLES_MAX,
    OFFSET_SAMPLES_MIN,
    offsetCusps,
    offsetTrace,
    speedFactorSamples,
} from "./curveOffset";

/** y = x^2 on x in [-1, 1]; x = 2t - 1. */
const PARABOLA = [[-1, 1], [0, -1], [1, 1]];
const X_D1 = Math.sqrt((2 ** (2 / 3) - 1) / 4);

describe("sample constants", () => {
    it("default lies inside the bounds", () => {
        expect(OFFSET_SAMPLES_MIN).toBe(64);
        expect(OFFSET_SAMPLES_MAX).toBe(512);
        expect(OFFSET_SAMPLES_DEFAULT).toBeGreaterThanOrEqual(OFFSET_SAMPLES_MIN);
        expect(OFFSET_SAMPLES_DEFAULT).toBeLessThanOrEqual(OFFSET_SAMPLES_MAX);
    });
});

describe("offsetCusps on the parabola", () => {
    // 64, 100, 128 and 512 do not sample t = 1/2 (i / (n - 1) with n - 1 odd), so only they reach the tangential search; 65 and 129 do sample it.
    for (const samples of [64, 100, 128, 65, 129, 512]) {
        it(`d = -1/2: one tangential cusp at x = 0, point (0, 1/2), ${samples} samples`, () => {
            const cusps = offsetCusps(PARABOLA, -0.5, samples);
            expect(cusps).toHaveLength(1);
            expect(Math.abs(2 * cusps[0].t - 1)).toBeLessThan(1e-6);
            expect(Math.abs(cusps[0].point[0])).toBeLessThan(1e-6);
            expect(Math.abs(cusps[0].point[1] - 0.5)).toBeLessThan(1e-6);
        });
    }

    for (const samples of [64, 100, 128, 129]) {
        it(`d = -1: cusps at x = +-0.38321 on the evolute, ${samples} samples`, () => {
            const cusps = offsetCusps(PARABOLA, -1, samples);
            expect(cusps).toHaveLength(2);
            const source = polynomialBezierSource(PARABOLA);
            [-X_D1, X_D1].forEach((x, i) => {
                const {t, point} = cusps[i];
                expect(Math.abs(2 * t - 1 - x)).toBeLessThan(1e-6);
                // spec: points (-+0.2251, 0.9406) at four digits
                expect(Math.abs(point[0] + Math.sign(x) * 0.2251)).toBeLessThan(5e-5);
                expect(Math.abs(point[1] - 0.9406)).toBeLessThan(5e-5);
                const {point: r, d1, d2} = source.at(t);
                const c = curvatureAt(d1, d2);
                if (c.kind !== 'regular') throw new Error("regular expected");
                const e = evolutePoint(r, c.normal, c.kappa);
                expect(Math.abs(point[0] - e![0])).toBeLessThan(1e-6);
                expect(Math.abs(point[1] - e![1])).toBeLessThan(1e-6);
            });
        });
    }

    it("sign-change cusps satisfy 1 + d*kappa = 0 and an independent solve", () => {
        const source = polynomialBezierSource(PARABOLA);
        const cusps = offsetCusps(PARABOLA, -1, 128);
        expect(cusps).toHaveLength(2);
        for (const {t} of cusps) {
            const {d1, d2} = source.at(t);
            const c = curvatureAt(d1, d2);
            if (c.kind !== 'regular') throw new Error("regular expected");
            expect(Math.abs(1 - c.kappa)).toBeLessThan(1e-6);
            expect(Math.min(Math.abs(2 * t - 1 - X_D1), Math.abs(2 * t - 1 + X_D1))).toBeLessThan(1e-6);
        }
    });

    it("near miss d = -0.49 reports no cusp; neither do small d or positive d", () => {
        for (const samples of [64, 65, 100, 128, 512]) {
            expect(offsetCusps(PARABOLA, -0.49, samples)).toEqual([]);
            expect(offsetCusps(PARABOLA, -0.3, samples)).toEqual([]);
            expect(offsetCusps(PARABOLA, 5, samples)).toEqual([]);
        }
    });

    it("cuspParameters returns a single sorted root for a tangential zero", () => {
        const source = polynomialBezierSource(PARABOLA);
        const ts = Array.from({length: 128}, (_, i) => i / 127);
        const r = cuspParameters(source, ts, -0.5);
        expect(r).toHaveLength(1);
    });
});

describe("cuspParameters in the end intervals", () => {
    /** r(t) = (t, (t - t0)^2): the vertex, where kappa = 2 is largest, is at t = t0, so d = -1/2 touches zero there. */
    const vertexAt = (t0: number) => polynomialBezierSource([[0, t0 * t0], [0.5, t0 * t0 - t0], [1, (1 - t0) * (1 - t0)]]);
    const grid = (n: number) => Array.from({length: n}, (_, i) => i / (n - 1));

    it.each([0.001, 0.003, 0.997, 0.999])("finds a tangential cusp at t = %d inside an end interval", t0 => {
        const roots = cuspParameters(vertexAt(t0), grid(128), -0.5);
        expect(roots).toHaveLength(1);
        expect(Math.abs(roots[0] - t0)).toBeLessThan(1e-6);
    });

    it.each([0.002, 0.998])("finds both close roots of a dip at t = %d inside an end interval", t0 => {
        const d = -0.5 * (1 + 1e-6);
        const roots = cuspParameters(vertexAt(t0), grid(128), d);
        expect(roots).toHaveLength(2);
        expect(roots[0]).toBeLessThan(t0);
        expect(roots[1]).toBeGreaterThan(t0);
        for (const t of roots) {
            const {d1, d2} = vertexAt(t0).at(t);
            const c = curvatureAt(d1, d2, 1);
            expect(c.kind === 'regular' && Math.abs(1 + d * c.kappa)).toBeLessThan(1e-6);
        }
    });

    it.each([0, 1])("finds a cusp exactly on the end sample t = %d", t0 => {
        const roots = cuspParameters(vertexAt(t0), grid(128), -0.5);
        expect(roots).toHaveLength(1);
        expect(Math.abs(roots[0] - t0)).toBeLessThan(1e-6);
    });

    it("reports no cusp for a near miss in an end interval, or when the end sample is merely the lowest", () => {
        expect(cuspParameters(vertexAt(0.001), grid(128), -0.49)).toEqual([]);
        expect(cuspParameters(vertexAt(-0.5), grid(128), -0.5)).toEqual([]);
    });
});

describe("offsetTrace", () => {
    it("distance to the base curve equals |d| at every regular sample", () => {
        const n = 33;
        for (const d of [-0.3, 0.2, 0.45, -0.1]) {
            const {x, y} = offsetTrace(PARABOLA, d, n);
            expect(x).toHaveLength(n);
            for (let i = 0; i < n; i++) {
                const x0 = 2 * i / (n - 1) - 1;
                const g = (s: number) => (x[i] - s) + (y[i] - s * s) * 2 * s;
                let lo = x0 - 0.5, hi = x0 + 0.5;
                for (let k = 0; k < 100; k++) {
                    const mid = (lo + hi) / 2;
                    if (g(lo) * g(mid) <= 0) hi = mid; else lo = mid;
                }
                const s = (lo + hi) / 2;
                expect(Math.hypot(x[i] - s, y[i] - s * s)).toBeCloseTo(Math.abs(d), 9);
            }
        }
    });

    it("does not break at a cusp", () => {
        const {x, y} = offsetTrace(PARABOLA, -1, 129);
        expect(x).toHaveLength(129);
        expect(x.some(Number.isNaN) || y.some(Number.isNaN)).toBe(false);
    });

    it("equals phOffsetRational for a PH cubic and quintic (pins the sign)", () => {
        const cases: { start: Vec; w: Vec[] }[] = [
            {start: [1, -1], w: [[-3.3, 0], [0.2, -4]]},
            {start: [0.5, 2], w: [[1.5, 0.4], [-0.6, 1.1], [0.8, -1.3]]},
        ];
        const n = 17;
        for (const {start, w} of cases) {
            const pts = phControlPoints(start, w);
            const sigmas = phSigmas(w);
            for (const d of [-0.7, 0.4, 1.3]) {
                const offset = phOffsetRational(pts, sigmas, d);
                const rational = rationalBezierSource(offset.points.map(q => [q[0], q[1]]), offset.weights);
                const {x, y} = offsetTrace(pts.map(q => [q[0], q[1]]), d, n);
                expect(x).toHaveLength(n);
                for (let i = 0; i < n; i++) {
                    const exact = rational.at(i / (n - 1)).point;
                    expect(x[i]).toBeCloseTo(exact[0], 9);
                    expect(y[i]).toBeCloseTo(exact[1], 9);
                }
            }
        }
    });

    it("the offset of a straight segment is the parallel segment, with no cusps", () => {
        const seg = [[0, 0], [2, 0]];
        const {x, y} = offsetTrace(seg, 0.5, 64);
        // right normal of a segment pointing along +x is -y
        expect(y.every(v => Math.abs(v + 0.5) < 1e-12)).toBe(true);
        expect(x[0]).toBeCloseTo(0, 12);
        expect(x[63]).toBeCloseTo(2, 12);
        expect(offsetCusps(seg, 0.5, 64)).toEqual([]);
        expect(offsetCusps(seg, -3, 64)).toEqual([]);
    });

    it("a circle-like cubic has no cusps for small |d| and no NaN", () => {
        const k = 0.5522847498;
        const arc = [[1, 0], [1, k], [k, 1], [0, 1]];
        for (const d of [-0.5, -0.1, 0.3]) {
            expect(offsetCusps(arc, d, 128)).toEqual([]);
            const {x, y} = offsetTrace(arc, d, 128);
            expect(x.concat(y).some(Number.isNaN)).toBe(false);
        }
    });

    it("breaks only at a singular sample", () => {
        const back = [[0, 0], [1, 0], [0, 0]]; // r' = 0 at t = 1/2
        const {x, y} = offsetTrace(back, 0.1, 65);
        expect(x.filter(Number.isNaN)).toHaveLength(1);
        expect(y.filter(Number.isNaN)).toHaveLength(1);
        expect(x).toHaveLength(65);
        const factors = speedFactorSamples(back, 0.1, 65);
        expect(factors.factor.filter(Number.isNaN)).toHaveLength(1);
        expect(Number.isNaN(factors.factor[32])).toBe(true);
        // a singular first sample does not start with a break
        const start = offsetTrace([[0, 0], [0, 0], [1, 1], [2, 0]], 0.1, 33);
        expect(start.x.some(Number.isNaN)).toBe(false);
    });

    it("speedFactorSamples gives t and 1 + d*kappa", () => {
        const {t, factor} = speedFactorSamples(PARABOLA, -0.5, 65);
        expect(t[0]).toBe(0);
        expect(t[64]).toBe(1);
        expect(factor[32]).toBeCloseTo(0, 12);
        expect(factor[0]).toBeGreaterThan(0);
    });

    it("empty or degenerate input returns empty results", () => {
        expect(offsetTrace([], 1, 64)).toEqual({x: [], y: []});
        expect(offsetTrace([[0, 0]], 1, 64)).toEqual({x: [], y: []});
        expect(offsetTrace(PARABOLA, NaN, 64)).toEqual({x: [], y: []});
        expect(offsetTrace(PARABOLA, 1, 0)).toEqual({x: [], y: []});
        expect(speedFactorSamples([], 1, 64)).toEqual({t: [], factor: []});
        expect(offsetCusps([], 1, 64)).toEqual([]);
        expect(offsetCusps([[1, 1], [1, 1], [1, 1]], 1, 64)).toEqual([]);
    });
});
