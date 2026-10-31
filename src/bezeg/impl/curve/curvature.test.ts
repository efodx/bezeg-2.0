import {describe, expect, it} from "vitest";
import {
    COMB_TOOTH_SIGN,
    combAtJoin,
    cuspParameters,
    curvatureAt,
    DerivativeSource,
    evolutePoint,
    offsetNormal,
    offsetPoint,
    offsetSpeedFactor,
    OFFSET_NORMAL_SIGN,
    osculatingCircle,
    polynomialBezierSource,
    rationalBezierSource,
    sampleComb,
    splineSpanSource,
    Vec2,
} from "./curvature";
import {
    archimedeanSpiralSource,
    cardioidSource,
    cycloidSource,
    parabolaSource,
    polarDerivatives,
    roseSource,
} from "./parametric-sources";
import {phControlPoints, phOffsetRational, phSigmas, Vec} from "./ph-math";
import {deCasteljauInPlace} from "../kernels/bezier-kernels";

/** Deterministic pseudo-random numbers in [-1, 1). */
function lcg(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return s / 2147483648 - 1;
    };
}

function kappaOfSource(source: DerivativeSource, t: number): number {
    const {d1, d2} = source.at(t);
    const c = curvatureAt(d1, d2, source.scale);
    if (c.kind !== 'regular') {
        throw new Error(`singular at ${t}`);
    }
    return c.kappa;
}

/** Independent point evaluation by de Casteljau (not through the kernel's derivative code). */
function bezierPoint(pts: ReadonlyArray<Vec2>, t: number): Vec2 {
    const rows = pts.map(p => [p[0], p[1]]);
    deCasteljauInPlace(t, rows);
    return [rows[0][0], rows[0][1]];
}

const CUBIC: Vec2[] = [[0, 0], [1, 0], [2, 1], [3, 3]];
const QUARTER_ARC: Vec2[] = [[1, 0], [1, 1], [0, 1]];
const QUARTER_WEIGHTS = [1, Math.SQRT1_2, 1];

describe("conventions", () => {
    it("exports one normal convention: offset uses the right normal", () => {
        expect(OFFSET_NORMAL_SIGN).toBe(-1);
        expect(offsetNormal([0, 1])).toEqual([-0, -1]);
        expect(COMB_TOOTH_SIGN).toBe(-1);
    });

    it("uses the left normal and positive kappa for a counter-clockwise turn", () => {
        const c = curvatureAt([1, 0], [0, 2]);
        expect(c.kind).toBe('regular');
        if (c.kind === 'regular') {
            expect(c.kappa).toBeCloseTo(2, 12);
            expect(c.normal[0]).toBeCloseTo(0, 12);
            expect(c.normal[1]).toBeCloseTo(1, 12);
        }
    });
});

describe("contract: curvatureAt and osculatingCircle", () => {
    it("a straight cubic has kappa 0 and a line as osculating circle", () => {
        const line = polynomialBezierSource([[0, 0], [1, 1], [2, 2], [5, 5]]);
        for (const t of [0, 0.3, 0.77, 1]) {
            expect(Math.abs(kappaOfSource(line, t))).toBeLessThan(1e-12);
            const {point, d1, d2} = line.at(t);
            expect(osculatingCircle(point, d1, d2, line.scale).kind).toBe('line');
        }
    });

    it("a rational quadratic quarter arc has constant kappa 1 (counter-clockwise), scaled arcs 1/R", () => {
        for (const radius of [1, 2.5]) {
            const pts = QUARTER_ARC.map(p => [p[0] * radius, p[1] * radius]);
            const arc = rationalBezierSource(pts, QUARTER_WEIGHTS);
            for (const t of [0, 0.1, 0.5, 0.9, 1]) {
                expect(kappaOfSource(arc, t)).toBeCloseTo(1 / radius, 10);
                const {point, d1, d2} = arc.at(t);
                const circle = osculatingCircle(point, d1, d2, arc.scale);
                expect(circle.kind).toBe('circle');
                if (circle.kind === 'circle') {
                    expect(circle.radius).toBeCloseTo(radius, 9);
                    expect(circle.centre[0]).toBeCloseTo(0, 9);
                    expect(circle.centre[1]).toBeCloseTo(0, 9);
                }
            }
        }
    });

    it("a near-circle cubic arc has |kappa| close to 1/R", () => {
        const k = 0.5522847498;
        const arc = polynomialBezierSource([[1, 0], [1, k], [k, 1], [0, 1]]);
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
            expect(Math.abs(kappaOfSource(arc, t) - 1)).toBeLessThan(3e-2);
        }
        expect(Math.abs(kappaOfSource(arc, 0.5) - 1)).toBeLessThan(1e-2);
        // Exact oracle: endpoint formula (n-1)/n * h/a^2 with a = |b1-b0| = k, h = dist(b2, line x=1) = 1-k.
        expect(kappaOfSource(arc, 0)).toBeCloseTo((2 / 3) * (1 - k) / (k * k), 12);
    });

    it("kappa flips sign under reversal of orientation", () => {
        const fwd = polynomialBezierSource(CUBIC);
        const rev = polynomialBezierSource([...CUBIC].reverse());
        for (const t of [0, 0.2, 0.5, 0.9, 1]) {
            expect(kappaOfSource(rev, 1 - t)).toBeCloseTo(-kappaOfSource(fwd, t), 12);
        }
    });

    it("endpoint formula kappa(0) = (n-1)/n * h/a^2 agrees with the hodograph on random curves", () => {
        const rnd = lcg(7);
        for (const n of [2, 3, 4, 5]) {
            for (let trial = 0; trial < 20; trial++) {
                const pts: Vec2[] = Array.from({length: n + 1}, () => [3 * rnd(), 3 * rnd()]);
                const [b0, b1, b2] = pts;
                const a = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]);
                if (a < 0.2) continue;
                // signed distance h of b2 from the line b0 b1 (positive on the left)
                const h = ((b1[0] - b0[0]) * (b2[1] - b0[1]) - (b1[1] - b0[1]) * (b2[0] - b0[0])) / a;
                const formula = (n - 1) / n * h / (a * a);
                expect(kappaOfSource(polynomialBezierSource(pts), 0)).toBeCloseTo(formula, 9);
                // and at the other end by reversal
                const last = pts[n], prev = pts[n - 1], prev2 = pts[n - 2];
                const a1 = Math.hypot(prev[0] - last[0], prev[1] - last[1]);
                if (a1 < 0.2) continue;
                const h1 = ((prev[0] - last[0]) * (prev2[1] - last[1]) - (prev[1] - last[1]) * (prev2[0] - last[0])) / a1;
                expect(kappaOfSource(polynomialBezierSource(pts), 1)).toBeCloseTo(-(n - 1) / n * h1 / (a1 * a1), 9);
            }
        }
    });

    it("kappa = dphi/ds by central differences of the tangent angle over polyline arc length", () => {
        const source = polynomialBezierSource(CUBIC);
        const angle = (t: number) => {
            const {d1} = source.at(t);
            return Math.atan2(d1[1], d1[0]);
        };
        const h = 1e-3;
        for (const t of [0.2, 0.5, 0.8]) {
            // arc length of the curve between t-h and t+h from an independent fine polyline of points
            let length = 0;
            const steps = 400;
            let prev = bezierPoint(CUBIC, t - h);
            for (let i = 1; i <= steps; i++) {
                const q = bezierPoint(CUBIC, t - h + 2 * h * i / steps);
                length += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
                prev = q;
            }
            const numeric = (angle(t + h) - angle(t - h)) / length;
            expect(numeric).toBeCloseTo(kappaOfSource(source, t), 5);
        }
    });

    it("singular cases return singular and never NaN or Infinity", () => {
        expect(curvatureAt([0, 0], [1, 1]).kind).toBe('singular');
        expect(curvatureAt([1e-14, 0], [1, 1], 1).kind).toBe('singular');
        expect(curvatureAt([NaN, 0], [1, 1]).kind).toBe('singular');
        expect(curvatureAt([Infinity, 0], [1, 1]).kind).toBe('singular');
        expect(osculatingCircle([0, 0], [0, 0], [1, 1]).kind).toBe('singular');
        // coincident first two control points: r'(0) = 0
        const cusp = polynomialBezierSource([[0, 0], [0, 0], [1, 1], [2, 0]]);
        expect(cusp.at(0).d1).toEqual([0, 0]);
        expect(curvatureAt(cusp.at(0).d1, cusp.at(0).d2, cusp.scale).kind).toBe('singular');
        // all control points equal
        const dot = polynomialBezierSource([[1, 1], [1, 1], [1, 1]]);
        expect(curvatureAt(dot.at(0.5).d1, dot.at(0.5).d2, dot.scale).kind).toBe('singular');
        expect(sampleComb(dot, 0, 1, 20, 1)).toEqual([]);
        // tolerance is relative to the polygon size
        const tiny = polynomialBezierSource([[0, 0], [1e-7, 0], [2e-7, 1e-7]]);
        expect(curvatureAt(tiny.at(0.5).d1, tiny.at(0.5).d2, tiny.scale).kind).toBe('regular');
    });

    it("rejects non-planar rows and accepts a zero third coordinate", () => {
        expect(() => polynomialBezierSource([[0, 0, 1], [1, 0, 0]])).toThrow(/planar/);
        expect(() => polynomialBezierSource([[0], [1]])).toThrow();
        expect(() => rationalBezierSource([[0, 0, 0.5], [1, 0, 0]], [1, 1])).toThrow(/planar/);
        expect(() => polynomialBezierSource([[0, 0, 0], [1, 0, 0], [1, 1, 0]])).not.toThrow();
    });
});

describe("spec numbers", () => {
    it("cubic (0,0),(1,0),(2,1),(3,3)", () => {
        const s = polynomialBezierSource(CUBIC);
        expect(kappaOfSource(s, 0)).toBeCloseTo(2 / 3, 6);
        expect(kappaOfSource(s, 0.5)).toBeCloseTo(0.235702, 6);
        expect(kappaOfSource(s, 1)).toBeCloseTo(0.059628, 6);
        // endpoint formula (2/3) * (1/sqrt5) / 5 at t = 1
        expect(kappaOfSource(s, 1)).toBeCloseTo(2 / 3 * (1 / Math.sqrt(5)) / 5, 12);
    });

    it("parabola y = x^2: curvature, osculating circle and evolute", () => {
        const p = parabolaSource();
        expect(kappaOfSource(p, 0)).toBeCloseTo(2, 12);
        let {point, d1, d2} = p.at(0);
        let circle = osculatingCircle(point, d1, d2);
        expect(circle.kind === 'circle' && circle.radius).toBeCloseTo(0.5, 12);
        expect(circle.kind === 'circle' && circle.centre[0]).toBeCloseTo(0, 12);
        expect(circle.kind === 'circle' && circle.centre[1]).toBeCloseTo(0.5, 12);
        ({point, d1, d2} = p.at(1));
        expect(kappaOfSource(p, 1)).toBeCloseTo(0.17889, 5);
        circle = osculatingCircle(point, d1, d2);
        expect(circle.kind === 'circle' && circle.radius).toBeCloseTo(5.5902, 4);
        expect(circle.kind === 'circle' && circle.centre[0]).toBeCloseTo(-4, 9);
        expect(circle.kind === 'circle' && circle.centre[1]).toBeCloseTo(3.5, 9);
    });

    it("parabola evolute equals (-4x^3, 3x^2 + 1/2) to 1e-9", () => {
        const p = parabolaSource();
        for (let x = -1.5; x <= 1.5; x += 0.125) {
            const {point, d1, d2} = p.at(x);
            const c = curvatureAt(d1, d2);
            if (c.kind !== 'regular') throw new Error("regular expected");
            const e = evolutePoint(point, c.normal, c.kappa);
            expect(e).toBeDefined();
            expect(e![0]).toBeCloseTo(-4 * x ** 3, 9);
            expect(e![1]).toBeCloseTo(3 * x * x + 0.5, 9);
        }
    });

    it("evolutePoint is undefined (not infinite) where kappa is zero", () => {
        expect(evolutePoint([0, 0], [0, 1], 0)).toBeUndefined();
        expect(evolutePoint([0, 0], [0, 1], 1e-12)).toBeUndefined();
        expect(evolutePoint([0, 0], [0, 1], NaN)).toBeUndefined();
        expect(evolutePoint([1, 1], [0, 1], 2)).toEqual([1, 1.5]);
    });

    it("cardioid rho = 1 + cos(theta)", () => {
        const c = cardioidSource();
        expect(kappaOfSource(c, 0)).toBeCloseTo(0.75, 12);
        expect(kappaOfSource(c, Math.PI / 2)).toBeCloseTo(1.06066, 5);
        expect(kappaOfSource(c, Math.PI / 2)).toBeCloseTo(3 / 2 ** 1.5, 12);
        // theta = pi is the cusp: rho = 0
        expect(curvatureAt(c.at(Math.PI).d1, c.at(Math.PI).d2, c.scale).kind).toBe('singular');
    });

    it("cycloid R = 1: |kappa| = 1/(4 sin(t/2)), negative on the arch, singular at the cusps", () => {
        const c = cycloidSource(1);
        for (const t of [0.4, Math.PI / 2, Math.PI, 4, 5.9]) {
            const k = kappaOfSource(c, t);
            expect(k).toBeLessThan(0);
            expect(Math.abs(k)).toBeCloseTo(1 / (4 * Math.sin(t / 2)), 12);
        }
        expect(1 / Math.abs(kappaOfSource(c, Math.PI / 2))).toBeCloseTo(2 * Math.SQRT2, 12);
        expect(1 / Math.abs(kappaOfSource(c, Math.PI))).toBeCloseTo(4, 12);
        for (const t of [0, 2 * Math.PI]) {
            expect(curvatureAt(c.at(t).d1, c.at(t).d2, c.scale).kind).toBe('singular');
        }
        // scales as 1/R
        expect(kappaOfSource(cycloidSource(3), 1)).toBeCloseTo(kappaOfSource(c, 1) / 3, 12);
    });

    it("rose and spiral sources: curvature against closed forms", () => {
        // rose rho = cos(2 theta) at theta = 0: rho=1, rho'=0, rho''=-4 => kappa = (rho^2 + 2rho'^2 - rho rho'')/|.|^3 = 5
        expect(kappaOfSource(roseSource(2), 0)).toBeCloseTo(5, 12);
        // spiral rho = theta at theta = 1: (1 + 2 * 1 - 0) / (1 + 1)^1.5
        expect(kappaOfSource(archimedeanSpiralSource(1), 1)).toBeCloseTo(3 / 2 ** 1.5, 12);
        // generic helper reproduces the unit circle rho = 1
        const {d1, d2} = polarDerivatives(1, 0, 0, 0.7);
        expect(kappaOfSource({at: () => ({point: [0, 0], d1, d2}), scale: 1}, 0)).toBeCloseTo(1, 12);
    });
});

describe("offsets and cusps", () => {
    const p = parabolaSource();
    const ts = Array.from({length: 401}, (_, i) => -1 + i / 200);

    it("offsetSpeedFactor is 1 + d*kappa", () => {
        expect(offsetSpeedFactor(2, -0.5)).toBe(0);
        expect(offsetSpeedFactor(0.5, 3)).toBe(2.5);
    });

    it("parabola d = -1: cusps at x = +-0.383210 and offset points on the evolute", () => {
        const cusps = cuspParameters(p, ts, -1);
        expect(cusps).toHaveLength(2);
        const [neg, pos] = cusps;
        expect(neg).toBeCloseTo(-0.38321, 6);
        expect(pos).toBeCloseTo(0.38321, 6);
        expect(pos).toBeCloseTo(Math.sqrt((2 ** (2 / 3) - 1) / 4), 9);
        for (const x of cusps) {
            const {point, d1, d2} = p.at(x);
            const c = curvatureAt(d1, d2);
            if (c.kind !== 'regular') throw new Error("regular expected");
            const o = offsetPoint(point, c.normal, -1);
            expect(o[0]).toBeCloseTo(-4 * x ** 3, 9);
            expect(o[1]).toBeCloseTo(3 * x * x + 0.5, 9);
        }
        const {point, d1, d2} = p.at(pos);
        const c = curvatureAt(d1, d2);
        if (c.kind !== 'regular') throw new Error("regular expected");
        const o = offsetPoint(point, c.normal, -1);
        expect(o[0]).toBeCloseTo(-0.2251, 4);
        expect(o[1]).toBeCloseTo(0.9406, 4);
    });

    it("parabola d = -1/2: the first cusp is at x = 0, the point (0, 1/2)", () => {
        const cusps = cuspParameters(p, ts, -0.5);
        expect(cusps).toHaveLength(1);
        // double root (1 + d*kappa ~ 6x^2 underflows near 1e-8), so only ~1e-8 accuracy
        expect(cusps[0]).toBeCloseTo(0, 6);
        const {point, d1, d2} = p.at(cusps[0]);
        const c = curvatureAt(d1, d2);
        if (c.kind !== 'regular') throw new Error("regular expected");
        const o = offsetPoint(point, c.normal, -0.5);
        expect(o[0]).toBeCloseTo(0, 6);
        expect(o[1]).toBeCloseTo(0.5, 9);
    });

    it("no cusps for small |d| and for d on the convex-outside (positive) side", () => {
        expect(cuspParameters(p, ts, -0.3)).toEqual([]);
        expect(cuspParameters(p, ts, 5)).toEqual([]);
    });

    it("cusp search skips intervals with singular samples", () => {
        const cyc = cycloidSource(1);
        const tCyc = Array.from({length: 65}, (_, i) => 2 * Math.PI * i / 64);
        // kappa = -1/(4 sin(t/2)), 1 + d*kappa = 0 at sin(t/2) = d/4 for d = 2 => t = pi/3 and 5pi/3
        const cusps = cuspParameters(cyc, tCyc, 2);
        expect(cusps).toHaveLength(2);
        expect(cusps[0]).toBeCloseTo(Math.PI / 3, 9);
        expect(cusps[1]).toBeCloseTo(5 * Math.PI / 3, 9);
    });

    it("offset distance to the base curve equals |d| at regular samples (foot point from orthogonality)", () => {
        for (const d of [-0.3, 0.2, 0.45, -0.1]) {
            for (let x = -1; x <= 1.0001; x += 0.25) {
                const {point, d1, d2} = p.at(x);
                const c = curvatureAt(d1, d2);
                if (c.kind !== 'regular') throw new Error("regular expected");
                const o = offsetPoint(point, c.normal, d);
                // distance to the parabola: bisection on (o - r(s)) . r'(s) = 0 near x
                const g = (s: number) => (o[0] - s) * 1 + (o[1] - s * s) * 2 * s;
                let lo = x - 0.5, hi = x + 0.5;
                for (let i = 0; i < 100; i++) {
                    const mid = (lo + hi) / 2;
                    if (g(lo) * g(mid) <= 0) hi = mid; else lo = mid;
                }
                const s = (lo + hi) / 2;
                expect(Math.hypot(o[0] - s, o[1] - s * s)).toBeCloseTo(Math.abs(d), 9);
            }
        }
    });

    it("right-normal offset of a PH cubic and quintic equals phOffsetRational", () => {
        const cases: { start: Vec; w: Vec[] }[] = [
            {start: [1, -1], w: [[-3.3, 0], [0.2, -4]]},
            {start: [0.5, 2], w: [[1.5, 0.4], [-0.6, 1.1], [0.8, -1.3]]},
        ];
        for (const {start, w} of cases) {
            const pts = phControlPoints(start, w);
            const sigmas = phSigmas(w);
            const polynomial = polynomialBezierSource(pts.map(q => [q[0], q[1]]));
            for (const d of [-0.7, 0.4, 1.3]) {
                const offset = phOffsetRational(pts, sigmas, d);
                const rational = rationalBezierSource(offset.points.map(q => [q[0], q[1]]), offset.weights);
                for (const t of [0, 0.15, 0.5, 0.83, 1]) {
                    const {point, d1, d2} = polynomial.at(t);
                    const c = curvatureAt(d1, d2, polynomial.scale);
                    if (c.kind !== 'regular') throw new Error("regular expected");
                    const kernel = offsetPoint(point, c.normal, d);
                    const exact = rational.at(t).point;
                    expect(kernel[0]).toBeCloseTo(exact[0], 9);
                    expect(kernel[1]).toBeCloseTo(exact[1], 9);
                }
            }
        }
    });
});

describe("comb", () => {
    it("teeth are normal to the tangent, have length gain*|kappa| and point away from the centre", () => {
        const source = polynomialBezierSource(CUBIC);
        const gain = 0.7;
        const teeth = sampleComb(source, 0, 1, 64, gain);
        expect(teeth).toHaveLength(64);
        for (const tooth of teeth) {
            const {point, d1, d2} = source.at(tooth.t);
            expect(tooth.base).toEqual(point);
            const v = [tooth.tip[0] - tooth.base[0], tooth.tip[1] - tooth.base[1]];
            const speed = Math.hypot(d1[0], d1[1]);
            expect(Math.abs(v[0] * d1[0] + v[1] * d1[1]) / speed).toBeLessThan(1e-9);
            expect(Math.hypot(v[0], v[1])).toBeCloseTo(gain * Math.abs(tooth.kappa), 12);
            expect(tooth.kappa).toBeCloseTo(kappaOfSource(source, tooth.t), 12);
            // centre of curvature = base + N/kappa; tooth direction is opposite to it
            const k = tooth.kappa;
            const toCentre = [-d1[1] / speed / k, d1[0] / speed / k];
            expect(v[0] * toCentre[0] + v[1] * toCentre[1]).toBeLessThan(0);
            expect(k).toBeCloseTo((d1[0] * d2[1] - d1[1] * d2[0]) / speed ** 3, 12);
        }
        expect(teeth[0].t).toBe(0);
        expect(teeth[63].t).toBe(1);
    });

    it("clamps the count to 8..256", () => {
        const source = polynomialBezierSource(CUBIC);
        expect(sampleComb(source, 0, 1, 1, 1)).toHaveLength(8);
        expect(sampleComb(source, 0, 1, -5, 1)).toHaveLength(8);
        expect(sampleComb(source, 0, 1, 1000, 1)).toHaveLength(256);
        expect(sampleComb(source, 0, 1, 100, 1)).toHaveLength(100);
        expect(sampleComb(source, 0, 1, NaN, 1)).toHaveLength(8);
    });

    it("clips teeth to the visible maximum, flags them, and rejects a non-finite gain", () => {
        const source = polynomialBezierSource(CUBIC);
        // kappa(0) = 2/3, so gain 3 gives a raw tooth of length 2 at t = 0.
        const teeth = sampleComb(source, 0, 1, 8, 3, 1);
        const first = teeth[0];
        expect(first.clipped).toBe(true);
        expect(Math.hypot(first.tip[0] - first.base[0], first.tip[1] - first.base[1])).toBeCloseTo(1, 12);
        expect(first.kappa).toBeCloseTo(2 / 3, 12);
        for (const tooth of teeth) {
            const len = Math.hypot(tooth.tip[0] - tooth.base[0], tooth.tip[1] - tooth.base[1]);
            expect(len).toBeLessThanOrEqual(1 + 1e-12);
            expect(tooth.clipped).toBe(3 * Math.abs(tooth.kappa) > 1);
        }
        expect(sampleComb(source, 0, 1, 8, 0.1, 1).every(tooth => !tooth.clipped)).toBe(true);
        expect(() => sampleComb(source, 0, 1, 8, Infinity)).toThrow(RangeError);
        expect(() => sampleComb(source, 0, 1, 8, NaN)).toThrow(RangeError);
    });

    it("omits singular samples instead of zeroing them", () => {
        const teeth = sampleComb(cycloidSource(1), 0, 2 * Math.PI, 9, 1);
        expect(teeth).toHaveLength(7);
        expect(teeth[0].t).toBeCloseTo(Math.PI / 4, 12);
        for (const tooth of teeth) {
            expect(Number.isFinite(tooth.tip[0]) && Number.isFinite(tooth.tip[1])).toBe(true);
        }
    });

    it("C2 cubic spline join has no curvature jump; C1 quadratic join has the independent one-sided jump", () => {
        const rnd = lcg(11);
        for (let trial = 0; trial < 10; trial++) {
            const b: Vec2[] = Array.from({length: 4}, () => [2 * rnd(), 2 * rnd()]);
            const c0 = b[3];
            const c1: Vec2 = [2 * b[3][0] - b[2][0], 2 * b[3][1] - b[2][1]];
            const c2: Vec2 = [b[1][0] - 2 * b[2][0] + b[3][0] - c0[0] + 2 * c1[0], b[1][1] - 2 * b[2][1] + b[3][1] - c0[1] + 2 * c1[1]];
            const c3: Vec2 = [2 * rnd() + 3, 2 * rnd()];
            const left = splineSpanSource(b, 0, 1);
            const right = splineSpanSource([c0, c1, c2, c3], 1, 2);
            const join = combAtJoin({source: left, t: 1}, {source: right, t: 1});
            if (join.jump === undefined) continue;
            expect(Math.abs(join.jump)).toBeLessThan(1e-9);
            expect(join.kappaLeft).toBeCloseTo(join.kappaRight!, 9);
        }

        const left = splineSpanSource([[0, 0], [1, 2], [2, 0]], 0, 1);
        const right = splineSpanSource([[2, 0], [3, -2], [6, -2]], 1, 2);
        const join = combAtJoin({source: left, t: 1}, {source: right, t: 1});
        expect(join.kappaLeft).toBeCloseTo(-16 / 20 ** 1.5, 12);
        expect(join.kappaRight).toBeCloseTo(24 / 20 ** 1.5, 12);
        expect(join.jump).toBeCloseTo(40 / 20 ** 1.5, 12);
        expect(Math.abs(join.jump!)).toBeGreaterThan(0.4);
    });

    it("spline span parameter mapping does not change curvature, only speed", () => {
        const unit = polynomialBezierSource(CUBIC);
        const span = splineSpanSource(CUBIC, 3, 7);
        for (const t of [3, 4.5, 6, 7]) {
            expect(kappaOfSource(span, t)).toBeCloseTo(kappaOfSource(unit, (t - 3) / 4), 12);
        }
        const a = span.at(5), b = unit.at(0.5);
        expect(a.d1[0]).toBeCloseTo(b.d1[0] / 4, 12);
        expect(a.d2[1]).toBeCloseTo(b.d2[1] / 16, 12);
    });

    it("combAtJoin reports undefined for singular sides", () => {
        const cusp = polynomialBezierSource([[0, 0], [0, 0], [1, 1], [2, 0]]);
        const join = combAtJoin({source: cusp, t: 0}, {source: cusp, t: 0.5});
        expect(join.kappaLeft).toBeUndefined();
        expect(join.jump).toBeUndefined();
        expect(join.kappaRight).toBeDefined();
    });
});
