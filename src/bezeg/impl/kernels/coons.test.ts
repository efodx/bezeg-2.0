import {describe, expect, it} from "vitest";
import {
    CORNER_RELATIVE_TOLERANCE,
    CoonsBoundaries,
    coonsBicubicNet,
    coonsBilinearNet,
    coonsCornerCheck,
    coonsRuledCNet,
    coonsRuledDNet,
    Vec3,
} from "./coons";
import {PointImpl} from "../point/point-impl";
import {TensorProductBezierPatch} from "../patch/tensor-product-bezier-patch";

const defaultBoundaries = (): CoonsBoundaries => ({
    c0: [[0, 0, 0], [1, 0, 2], [2, 0, 2], [3, 0, 0]],
    c1: [[0, 3, 0], [1, 3, -1], [2, 3, -1], [3, 3, 0]],
    d0: [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0]],
    d1: [[3, 0, 0], [3, 1, 1], [3, 2, 1], [3, 3, 0]],
});

function lcg(seed: number): () => number {
    let s = seed;
    return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

/** Random boundaries with matching corners. */
function randomBoundaries(seed: number): CoonsBoundaries {
    const r = lcg(seed);
    const pt = (): Vec3 => [r() * 8 - 4, r() * 8 - 4, r() * 8 - 4];
    const mk = (a: Vec3, z: Vec3): Vec3[] => [a, pt(), pt(), z];
    const s00 = pt(), s10 = pt(), s01 = pt(), s11 = pt();
    return {c0: mk(s00, s10), c1: mk(s01, s11), d0: mk(s00, s01), d1: mk(s10, s11)};
}

const bern = (t: number): number[] => {
    const s = 1 - t;
    return [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
};

const curve = (pts: ReadonlyArray<Vec3>, t: number): Vec3 => {
    const w = bern(t);
    return [0, 1, 2].map(k => pts.reduce((a, p, i) => a + w[i] * p[k], 0)) as Vec3;
};

const netAt = (net: Vec3[][], u: number, v: number): Vec3 => {
    const wu = bern(u), wv = bern(v);
    return [0, 1, 2].map(k => {
        let a = 0;
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) a += wu[i] * wv[j] * net[i][j][k];
        return a;
    }) as Vec3;
};

/** Independent general blend S = Lc + Ld - B evaluated directly from the boundary curves. */
function blend(b: CoonsBoundaries, u: number, v: number): {s: Vec3; lc: Vec3; ld: Vec3; bi: Vec3} {
    const c0 = curve(b.c0, u), c1 = curve(b.c1, u), d0 = curve(b.d0, v), d1 = curve(b.d1, v);
    const avg = (p: Vec3, q: Vec3): Vec3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
    const s00 = avg(b.c0[0], b.d0[0]), s10 = avg(b.c0[3], b.d1[0]);
    const s01 = avg(b.c1[0], b.d0[3]), s11 = avg(b.c1[3], b.d1[3]);
    const lc = [0, 1, 2].map(k => (1 - v) * c0[k] + v * c1[k]) as Vec3;
    const ld = [0, 1, 2].map(k => (1 - u) * d0[k] + u * d1[k]) as Vec3;
    const bi = [0, 1, 2].map(k =>
        (1 - u) * (1 - v) * s00[k] + u * (1 - v) * s10[k] + (1 - u) * v * s01[k] + u * v * s11[k]) as Vec3;
    const s = [0, 1, 2].map(k => lc[k] + ld[k] - bi[k]) as Vec3;
    return {s, lc, ld, bi};
}

const near = (a: Vec3, b: Vec3, tol: number) => a.forEach((x, k) => expect(Math.abs(x - b[k])).toBeLessThan(tol));

describe("coons kernel", () => {
    it("default example: centre and interior control points", () => {
        const b = defaultBoundaries();
        const net = coonsBicubicNet(b);
        const c = blend(b, 0.5, 0.5);
        near(c.s, [1.5, 1.5, 0.75], 1e-12);
        expect(c.lc[2]).toBeCloseTo(0.375, 12);
        expect(c.ld[2]).toBeCloseTo(0.375, 12);
        expect(c.bi[2]).toBeCloseTo(0, 12);
        near(netAt(net, 0.5, 0.5), [1.5, 1.5, 0.75], 1e-12);
        // net[i][j]: i is the u index, j the v index
        near(net[1][1], [1, 1, 4 / 3], 1e-12);
        near(net[1][2], [1, 2, 1 / 3], 1e-12);
        near(net[2][1], [2, 1, 5 / 3], 1e-12);
        near(net[2][2], [2, 2, 2 / 3], 1e-12);
    });

    it("blend equals the bicubic net at seeded random (u,v), default and random boundaries", () => {
        for (const b of [defaultBoundaries(), randomBoundaries(7), randomBoundaries(12345)]) {
            expect(coonsCornerCheck(b)).toEqual([]);
            const net = coonsBicubicNet(b);
            const lc = coonsRuledCNet(b), ld = coonsRuledDNet(b), bi = coonsBilinearNet(b);
            const r = lcg(99);
            for (let n = 0; n < 50; n++) {
                const u = r(), v = r();
                const e = blend(b, u, v);
                near(netAt(net, u, v), e.s, 1e-12);
                near(netAt(lc, u, v), e.lc, 1e-12);
                near(netAt(ld, u, v), e.ld, 1e-12);
                near(netAt(bi, u, v), e.bi, 1e-12);
            }
        }
    });

    it("reproduces each boundary when corners coincide", () => {
        for (const b of [defaultBoundaries(), randomBoundaries(3)]) {
            const net = coonsBicubicNet(b);
            for (let k = 0; k <= 20; k++) {
                const t = k / 20;
                near(netAt(net, t, 0), curve(b.c0, t), 1e-12);
                near(netAt(net, t, 1), curve(b.c1, t), 1e-12);
                near(netAt(net, 0, t), curve(b.d0, t), 1e-12);
                near(netAt(net, 1, t), curve(b.d1, t), 1e-12);
            }
        }
    });

    it("a moved corner is reported and the boundary is no longer reproduced", () => {
        const b = defaultBoundaries();
        b.d1 = [[3, 0, 0], [3, 1, 1], [3, 2, 1], [3, 3, 2]]; // corner u1v1 of d1 moved by 2 in z
        const bad = coonsCornerCheck(b);
        expect(bad.map(m => m.corner)).toEqual(["u1v1"]);
        expect(bad[0].distance).toBeCloseTo(2, 12);
        const net = coonsBicubicNet(b);
        // B averages the two end points meeting at each corner: both boundaries miss by g/2 = 1.
        const end = netAt(net, 1, 1);
        expect(Math.abs(end[2] - curve(b.c1, 1)[2])).toBeCloseTo(1, 12);
        expect(Math.abs(end[2] - curve(b.d1, 1)[2])).toBeCloseTo(1, 12);
    });

    it("reports several mismatched corners, with tolerance relative to scale", () => {
        const b = defaultBoundaries();
        b.c0 = b.c0.map((p, i): Vec3 => i === 0 ? [0, 0, 1] : p);
        b.c1 = b.c1.map((p, i): Vec3 => i === 3 ? [3, 3, 1] : p);
        expect(coonsCornerCheck(b).map(m => m.corner).sort()).toEqual(["u0v0", "u1v1"]);
    });

    it("corner tolerance is translation invariant and scales with the extent", () => {
        const shift = (b: CoonsBoundaries, z: number): CoonsBoundaries => {
            const m = (pts: ReadonlyArray<Vec3>): Vec3[] => pts.map(p => [p[0] + z, p[1] + z, p[2] + z]);
            return {c0: m(b.c0), c1: m(b.c1), d0: m(b.d0), d1: m(b.d1)};
        };
        const moved = shift(defaultBoundaries(), 1e6);
        moved.c0 = moved.c0.map((p, i): Vec3 => i === 0 ? [p[0], p[1], p[2] + 1e-4] : p);
        expect(coonsCornerCheck(moved).map(m => m.corner)).toEqual(["u0v0"]);
        expect(coonsCornerCheck(shift(defaultBoundaries(), 1e6))).toEqual([]);
        const extent = 3; // default boundaries span 3 in x and y, 3 in z
        const withGap = (gap: number): CoonsBoundaries => {
            const b = defaultBoundaries();
            b.c0 = b.c0.map((p, i): Vec3 => i === 0 ? [p[0], p[1], p[2] + gap] : p);
            return b;
        };
        expect(coonsCornerCheck(withGap(0.5 * CORNER_RELATIVE_TOLERANCE * extent))).toEqual([]);
        expect(coonsCornerCheck(withGap(2 * CORNER_RELATIVE_TOLERANCE * extent)).map(m => m.corner)).toEqual(["u0v0"]);
    });

    it("feeds TensorProductBezierPatch with the same orientation", () => {
        const net = coonsBicubicNet(defaultBoundaries());
        const patch = new TensorProductBezierPatch(net.map(row => row.map(p => new PointImpl(p[0], p[1], [], p[2]))));
        expect(patch.m).toBe(3);
        expect(patch.n).toBe(3);
        const p = patch.eval(0.25, 0.75);
        near([p.X(), p.Y(), p.Z()], netAt(net, 0.25, 0.75), 1e-12);
    });

    it("rejects invalid input with RangeError", () => {
        const b = defaultBoundaries();
        expect(() => coonsBicubicNet({...b, c0: b.c0.slice(0, 3)})).toThrow(RangeError);
        expect(() => coonsBicubicNet({...b, d1: [...b.d1, [0, 0, 0]]})).toThrow(/d1/);
        expect(() => coonsBicubicNet({...b, c1: [[0, 0, NaN], b.c1[1], b.c1[2], b.c1[3]]})).toThrow(RangeError);
        expect(() => coonsCornerCheck({...b, d0: [[0, 0, Infinity], b.d0[1], b.d0[2], b.d0[3]]})).toThrow(/finite/);
        expect(() => coonsBilinearNet({...b, c0: [[0, 0] as unknown as Vec3, b.c0[1], b.c0[2], b.c0[3]]})).toThrow(RangeError);
    });
});
