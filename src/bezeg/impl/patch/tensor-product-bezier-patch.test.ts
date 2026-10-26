import {createRequire} from "node:module";
import {describe, expect, it} from "vitest";
import {Point} from "../../api/point/point";
import {PointImpl} from "../point/point-impl";
import {TensorProductBezierPatch} from "./tensor-product-bezier-patch";

const require = createRequire(import.meta.url);
const teapot = require("../../../../docs/prototypes/bezier-patches/teapot-data.js") as {
    resolvePatch(index: number): number[][];
};

const binomial = (n: number, k: number): number => k === 0 ? 1 : binomial(n, k - 1) * (n - k + 1) / k;
function bernsteinNet(net: number[][][], u: number, v: number): number[] {
    const m = net.length - 1, n = net[0].length - 1, out = [0, 0, 0];
    for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) {
        const weight = binomial(m, i) * u ** i * (1 - u) ** (m - i) * binomial(n, j) * v ** j * (1 - v) ** (n - j);
        for (let d = 0; d < 3; d++) out[d] += weight * net[i][j][d];
    }
    return out;
}
const point = ([x, y, z = 0]: number[]) => new PointImpl(x, y, undefined, z);
const makeNet = (m: number, n: number) => Array.from({length: m + 1}, (_, i) =>
    Array.from({length: n + 1}, (_, j) => point([
        Math.sin(i * 1.3 + j * 0.4) * 2 + i,
        Math.cos(i * 0.2 - j * 0.8) * 3 - j,
        Math.sin(i * 0.8 + j * 1.1),
    ])));
function coords(p: Point): number[] { return [p.X(), p.Y(), p.Z?.() ?? 0]; }
function close(actual: number[], expected: number[], digits = 10) {
    actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], digits));
}
function numeric(net: Point[][]): number[][][] { return net.map(row => row.map(coords)); }

describe("TensorProductBezierPatch", () => {
    it("reproduces constant nets as a partition-of-unity check at every supported degree", () => {
        const constant = [5.25, -3.5, 8.75];
        for (let m = 1; m <= 4; m++) for (let n = 1; n <= 4; n++) {
            const net = Array.from({length: m + 1}, () => Array.from({length: n + 1}, () => point(constant)));
            const patch = new TensorProductBezierPatch(net);
            for (const [u, v] of [[0, 0], [0.13, 0.82], [0.5, 0.5], [1, 1]]) {
                close(coords(patch.eval(u, v)), constant);
                close(coords(TensorProductBezierPatch.evaluateBilinear(net, u, v)), constant);
            }
        }
    });

    it("matches an independent Bernstein sum on degree-1, degree-4, and nonsquare nets", () => {
        for (let m = 1; m <= 4; m++) for (let n = 1; n <= 4; n++) {
            const net = makeNet(m, n), patch = new TensorProductBezierPatch(net);
            for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.17, 0.63], [0.5, 0.5]]) {
                close(coords(patch.eval(u, v)), bernsteinNet(numeric(net), u, v));
                close(coords(patch.evalByColumns(u, v)), coords(patch.eval(u, v)));
                close(coords(TensorProductBezierPatch.evaluateBilinear(net, u, v)), bernsteinNet(numeric(net), u, v));
            }
            const scheme = patch.decasteljauScheme(0.17, 0.63);
            close(scheme.result, coords(patch.eval(0.17, 0.63)));
            const direct = TensorProductBezierPatch.bilinearDeCasteljauScheme(net, 0.17, 0.63);
            expect(direct.reducedNets).toHaveLength(Math.min(m, n) + 1);
            close(direct.result, bernsteinNet(numeric(net), 0.17, 0.63));
            expect(direct.remainderScheme).toHaveLength(Math.abs(m - n) + 1);
        }
    });

    it("interpolates four corners and all four exact boundaries", () => {
        const net = makeNet(3, 2), patch = new TensorProductBezierPatch(net);
        close(coords(patch.eval(0, 0)), coords(net[0][0]));
        close(coords(patch.eval(1, 0)), coords(net[3][0]));
        close(coords(patch.eval(0, 1)), coords(net[0][2]));
        close(coords(patch.eval(1, 1)), coords(net[3][2]));
        const [u0, u1, v0, v1] = patch.boundaryCurves();
        for (const t of [0, 0.23, 1]) {
            close(coords(u0.eval(t)), coords(patch.eval(0, t)));
            close(coords(u1.eval(t)), coords(patch.eval(1, t)));
            close(coords(v0.eval(t)), coords(patch.eval(t, 0)));
            close(coords(v1.eval(t)), coords(patch.eval(t, 1)));
        }
        close(coords(patch.isoCurveU(0.37).eval(0.61)), coords(patch.eval(0.37, 0.61)));
        close(coords(patch.isoCurveV(0.61).eval(0.37)), coords(patch.eval(0.37, 0.61)));
    });

    it("keeps issued iso-curves attached to their captured net while remaining live to point edits", () => {
        const original = makeNet(2, 1), patch = new TensorProductBezierPatch(original);
        const curve = patch.isoCurveU(0);
        const replacement = makeNet(2, 1);
        patch.setControlNet(replacement);
        original[0][0].setX(123);
        expect(curve.eval(0).X()).toBe(123);
        expect(patch.eval(0, 0).X()).toBe(replacement[0][0].X());
    });

    it("uses a distinct bilinear recurrence for square and nonsquare degrees", () => {
        const net = makeNet(1, 1), patch = new TensorProductBezierPatch(net);
        for (const [u, v] of [[0, 0], [0.25, 0.7], [1, 1]]) {
            close(coords(TensorProductBezierPatch.evaluateBilinear(net, u, v)), coords(patch.eval(u, v)));
        }
        expect(() => TensorProductBezierPatch.evaluateBilinear([[point([0, 0])]], 0.5, 0.5)).toThrow(RangeError);
    });

    it("preserves evaluation under subdivision and degree elevation in both directions", () => {
        const patch = new TensorProductBezierPatch(makeNet(3, 2)), split = 0.37;
        const [uLeft, uRight] = patch.subdivide("u", split);
        const [vLeft, vRight] = patch.subdivide("v", split);
        const elevatedU = patch.elevate("u"), elevatedV = patch.elevate("v");
        for (const [a, b] of [[0.1, 0.2], [0.62, 0.74], [0.9, 0.83]]) {
            close(coords(elevatedU.eval(a, b)), coords(patch.eval(a, b)));
            close(coords(elevatedV.eval(a, b)), coords(patch.eval(a, b)));
            close(coords(uLeft.eval(a, b)), coords(patch.eval(a * split, b)));
            close(coords(uRight.eval(a, b)), coords(patch.eval(split + a * (1 - split), b)));
            close(coords(vLeft.eval(a, b)), coords(patch.eval(a, b * split)));
            close(coords(vRight.eval(a, b)), coords(patch.eval(a, split + b * (1 - split))));
        }
    });

    it("is affine invariant and reports analytic partials, twist, and perpendicular unit normals", () => {
        const source = makeNet(4, 3), mapped = source.map(row => row.map(p => point([
            2 * p.X() - p.Y() + 4, p.X() + 3 * p.Y() - 2, 0.5 * p.Z!() + p.X(),
        ])));
        const patch = new TensorProductBezierPatch(source), transformed = new TensorProductBezierPatch(mapped);
        const [u, v] = [0.43, 0.58], h = 1e-5;
        const p = coords(patch.eval(u, v)), expected = [2 * p[0] - p[1] + 4, p[0] + 3 * p[1] - 2, 0.5 * p[2] + p[0]];
        close(coords(transformed.eval(u, v)), expected);
        const minusU = coords(patch.eval(u - h, v)), plusU = coords(patch.eval(u + h, v));
        const minusV = coords(patch.eval(u, v - h)), plusV = coords(patch.eval(u, v + h));
        const finiteU = plusU.map((x, i) => (x - minusU[i]) / (2 * h));
        const finiteV = plusV.map((x, i) => (x - minusV[i]) / (2 * h));
        close(coords(patch.partialU(u, v)), finiteU, 7);
        close(coords(patch.partialV(u, v)), finiteV, 7);
        const normal = coords(patch.normal(u, v)), du = coords(patch.partialU(u, v)), dv = coords(patch.partialV(u, v));
        expect(Math.hypot(...normal)).toBeCloseTo(1, 10);
        expect(normal.reduce((sum, x, i) => sum + x * du[i], 0)).toBeCloseTo(0, 10);
        expect(normal.reduce((sum, x, i) => sum + x * dv[i], 0)).toBeCloseTo(0, 10);
        close(coords(patch.twist(u, v)), coords(patch.partialUV(u, v)));
    });

    it("matches central finite differences for twist and both second pure partials", () => {
        const patch = new TensorProductBezierPatch(makeNet(4, 3));
        const [u, v, h] = [0.41, 0.57, 1e-4];
        const center = coords(patch.eval(u, v));
        const plusU = coords(patch.eval(u + h, v)), minusU = coords(patch.eval(u - h, v));
        const plusV = coords(patch.eval(u, v + h)), minusV = coords(patch.eval(u, v - h));
        const finiteUU = plusU.map((x, i) => (x - 2 * center[i] + minusU[i]) / (h * h));
        const finiteVV = plusV.map((x, i) => (x - 2 * center[i] + minusV[i]) / (h * h));
        const mixedCorners = [
            coords(patch.eval(u + h, v + h)), coords(patch.eval(u + h, v - h)),
            coords(patch.eval(u - h, v + h)), coords(patch.eval(u - h, v - h)),
        ];
        const finiteUV = center.map((_, i) => (mixedCorners[0][i] - mixedCorners[1][i] - mixedCorners[2][i] + mixedCorners[3][i]) / (4 * h * h));
        close(coords(patch.partialUU(u, v)), finiteUU, 5);
        close(coords(patch.partialVV(u, v)), finiteVV, 5);
        close(coords(patch.partialUV(u, v)), finiteUV, 5);
        close(coords(patch.twist(u, v)), finiteUV, 5);
    });

    it("exposes direct-recurrence net and remainder levels against fixed weighted-formula values", () => {
        // Affine coordinate controls make each expected bilinear blend explicit and exact.
        const net = Array.from({length: 4}, (_, i) => Array.from({length: 3}, (_, j) => point([
            i + j, 2 * i - j, 3 * i + 4 * j,
        ])));
        const u = 0.25, v = 0.5;
        const scheme = TensorProductBezierPatch.bilinearDeCasteljauScheme(net, u, v);
        expect(scheme.reducedNets).toHaveLength(3);
        expect(scheme.reducedNets[1]).toEqual([
            [[0.75, 0, 2.75], [1.75, -1, 6.75]],
            [[1.75, 2, 5.75], [2.75, 1, 9.75]],
            [[2.75, 4, 8.75], [3.75, 3, 12.75]],
        ]);
        expect(scheme.reducedNets[2]).toEqual([[[1.5, 0, 5.5]], [[2.5, 2, 8.5]]]);
        const remainderEnd = [
            (1 - u) * 1.5 + u * 2.5,
            (1 - u) * 0 + u * 2,
            (1 - u) * 5.5 + u * 8.5,
        ];
        // The kernel retains the inactive tail at each level, as in the univariate scheme API.
        expect(scheme.remainderScheme).toEqual([
            [[1.5, 0, 5.5], [2.5, 2, 8.5]],
            [remainderEnd, [2.5, 2, 8.5]],
        ]);
        expect(scheme.result).toEqual(remainderEnd);
        close(scheme.result, [1.75, 0.5, 6.25]);

        const transposed = net[0].map((_, j) => net.map(row => row[j]));
        expect(() => expect(TensorProductBezierPatch.bilinearDeCasteljauScheme(transposed, u, v).reducedNets.slice(1))
            .toEqual(scheme.reducedNets.slice(1))).toThrow();
    });

    it("winds every planar sampled triangle toward positive z and rejects a flipped-face mutation", () => {
        const patch = new TensorProductBezierPatch(Array.from({length: 2}, (_, i) =>
            Array.from({length: 2}, (_, j) => point([i, j, 0]))));
        const {vertices, faces} = patch.sampleMesh(1);
        const cross = (face: readonly [number, number, number]) => {
            const [a, b, c] = face.map(index => coords(vertices[index]));
            const ab = b.map((x, i) => x - a[i]), ac = c.map((x, i) => x - a[i]);
            return [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
        };
        const assertPositiveZ = (face: readonly [number, number, number]) => {
            const [x, y, z] = cross(face);
            expect(x).toBeCloseTo(0, 10);
            expect(y).toBeCloseTo(0, 10);
            expect(z).toBeGreaterThan(0);
        };
        expect(faces).toHaveLength(2);
        faces.forEach(assertPositiveZ);
        const [a, b, c] = faces[0];
        expect(() => assertPositiveZ([a, c, b])).toThrow();
    });

    it("invalidates caches on tracked edits, remains live for function-backed edits, and returns 3D bounds/mesh", () => {
        const source = point([1, 2, 3]);
        const dependent = PointImpl.derived(() => [source.X() * 2, source.Y() + 1, source.Z()], [source]);
        const patch = new TensorProductBezierPatch(Array.from({length: 2}, () => [dependent, point([0, 0, 0])]));
        const isoCurve = patch.isoCurveU(0);
        const isoBefore = coords(isoCurve.eval(0));
        const before = coords(patch.eval(0, 0));
        close(coords(patch.eval(0, 0)), before);
        source.setX(4);
        const after = coords(patch.eval(0, 0));
        expect(after).not.toEqual(before);
        close(after, [8, 3, 3]);
        const isoAfter = coords(isoCurve.eval(0));
        expect(isoAfter).not.toEqual(isoBefore);
        close(isoAfter, [8, 3, 3]);
        const live = new PointImpl(() => source.X(), () => source.Y(), undefined, () => source.Z());
        let mutable = live.X();
        const volatilePatch = new TensorProductBezierPatch(Array.from({length: 2}, () => [live, point([0, 0, 0])]));
        expect(volatilePatch.eval(0, 0).X()).toBe(mutable);
        source.setX(7); mutable = live.X();
        expect(volatilePatch.eval(0, 0).X()).toBe(mutable);
        const mesh = patch.sampleMesh(2, 3);
        expect(mesh.vertices).toHaveLength(12);
        expect(mesh.faces).toHaveLength(12);
        mesh.vertices[0].setX(-100);
        expect(patch.sampleMesh(2, 3).vertices[0].X()).not.toBe(-100);
        expect(patch.boundingBox()).toEqual([0, 14, 0, 3, 0, 3]);
    });

    it("rejects invalid nets and parameters, and makes a zero normal explicit", () => {
        expect(() => new TensorProductBezierPatch([[point([0, 0])]])).toThrow(RangeError);
        expect(() => new TensorProductBezierPatch([makeNet(1, 1)[0], [point([1, 2])]])).toThrow(RangeError);
        expect(() => new TensorProductBezierPatch([[point([NaN, 0]), point([0, 0])], [point([0, 0]), point([1, 1])]])).toThrow(RangeError);
        const flat = new TensorProductBezierPatch(Array.from({length: 2}, (_, i) => Array.from({length: 2}, (_, j) => point([i + j, 0, 0]))));
        expect(() => flat.normal(0.5, 0.5)).toThrow(/normal is undefined/);
        expect(() => flat.eval(Infinity, 0)).toThrow(RangeError);
        expect(() => flat.sampleMesh(0)).toThrow(RangeError);
        expect(() => flat.elevate("u").elevate("u").elevate("u").elevate("u").elevate("u")).toThrow(RangeError);
    });

    it("matches licensed Utah teapot patch 12 golden samples and rejects a grid-transpose mutation", () => {
        const raw = teapot.resolvePatch(12);
        const net = Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j) => point(raw[i * 4 + j])));
        const patch = new TensorProductBezierPatch(net);
        const goldens: Array<[number, number, number[]]> = [
            [0, 0, [-1.6, 0, 2.025]], [1, 0, [-2.7, 0, 1.8]], [0, 1, [-1.5, 0, 2.25]], [1, 1, [-3, 0, 1.8]],
            [0.2, 0.37, [-2.0007735792, -0.20979, 2.0922567408]],
            [0.5, 0.5, [-2.51875, -0.225, 2.0953125]],
            [0.83, 0.61, [-2.8584448228806, -0.21411, 1.96016281694865]],
        ];
        for (const [u, v, expected] of goldens) close(coords(patch.eval(u, v)), expected, 11);
        const transposed = Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j) => point(raw[j * 4 + i])));
        expect(() => goldens.forEach(([u, v, expected]) => close(coords(new TensorProductBezierPatch(transposed).eval(u, v)), expected, 11))).toThrow();
    });
});
