import {describe, expect, it} from "vitest";
import {Point} from "../../api/point/point";
import {PointImpl} from "../point/point-impl";
import {TensorProductBezierPatch} from "./tensor-product-bezier-patch";
import {TriangularBezierPatch} from "./triangular-bezier-patch";

type Row = [number, number, number];
const indices = (n: number): Array<[number, number, number]> => {
    const result: Array<[number, number, number]> = [];
    for (let i = n; i >= 0; i--) for (let j = n - i; j >= 0; j--) result.push([i, j, n - i - j]);
    return result;
};
const pointRows = (points: Point[]): Row[] => points.map(p => [p.X(), p.Y(), p.Z?.() ?? 0]);
const point = (row: readonly number[]) => new PointImpl(row[0], row[1], undefined, row[2] ?? 0);
const close = (actual: number[], expected: number[], digits = 10) => actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], digits));
const patchFromRows = (rows: Row[]) => new TriangularBezierPatch(rows.map(point));

function choose(n: number, k: number): number {
    let value = 1;
    for (let i = 1; i <= k; i++) value = value * (n - i + 1) / i;
    return value;
}

/** Independent direct Bernstein sum; this does not use the triangular recurrence. */
function bernstein(rows: Row[], n: number, u: number, v: number): Row {
    const w = 1 - u - v;
    return rows.reduce((sum, p, index) => {
        const [i, j, k] = indices(n)[index];
        const coefficient = choose(n, i) * choose(n - i, j) * u ** i * v ** j * w ** k;
        return sum.map((value, d) => value + coefficient * p[d]) as Row;
    }, [0, 0, 0] as Row);
}

const fixture = (n: number): Row[] => indices(n).map(([i, j, k], q) => [
    0.7 * i - 0.3 * j + 0.2 * k + q * 0.013,
    -0.2 * i + 0.8 * j + 0.1 * k - q * 0.019,
    0.11 * i * j + 0.07 * j * k + 0.03 * i * k + q * 0.009,
]);

describe("TriangularBezierPatch", () => {
    it("uses the canonical flat order and matches independent Bernstein evaluation for degrees 1–4", () => {
        for (let n = 1; n <= 4; n++) {
            const rows = fixture(n);
            const patch = patchFromRows(rows);
            expect(patch.degree).toBe(n);
            expect(pointRows(patch.getControlNet())).toEqual(rows);
            for (const [u, v] of [[0.12, 0.19], [0.31, 0.27], [0.03, 0.91]]) {
                close(pointRows([patch.eval(u, v)])[0], bernstein(rows, n, u, v), 11);
            }
        }
    });

    it("interpolates the vertices, reproduces affine maps, and exposes the three edge curves", () => {
        const patch = patchFromRows(fixture(3));
        const net = pointRows(patch.getControlNet());
        close(pointRows([patch.eval(1, 0)])[0], net[0]);
        close(pointRows([patch.eval(0, 1)])[0], net[indices(3).findIndex(([, j, k]) => j === 3 && k === 0)]);
        close(pointRows([patch.eval(0, 0)])[0], net[net.length - 1]);

        const affine = patchFromRows(indices(2).map(([i, j, k]) => [2 * i / 2 + 3 * j / 2 + 4 * k / 2, -i / 2 + 5 * j / 2 + 7 * k / 2, 0.5 * i / 2 - 0.4 * j / 2 + 2 * k / 2]));
        for (const [u, v] of [[0.2, 0.3], [0.6, 0.1]]) close(pointRows([affine.eval(u, v)])[0], [2 * u + 3 * v + 4 * (1 - u - v), -u + 5 * v + 7 * (1 - u - v), 0.5 * u - 0.4 * v + 2 * (1 - u - v)]);

        const curves = patch.boundaryCurves();
        expect(curves).toHaveLength(3);
        close(pointRows([curves[0].eval(0), curves[0].eval(1)]).flat(), [...net[0], ...net[indices(3).findIndex(([, j, k]) => j === 3 && k === 0)]]);
        close(pointRows([curves[1].eval(0), curves[1].eval(1)]).flat(), [...net[indices(3).findIndex(([, j, k]) => j === 3 && k === 0)], ...net[net.length - 1]]);
        close(pointRows([curves[2].eval(0), curves[2].eval(1)]).flat(), [...net[net.length - 1], ...net[0]]);
        for (const t of [0.13, 0.37, 0.8]) {
            close(pointRows([curves[0].eval(t)])[0], pointRows([patch.eval(1 - t, t)])[0]);
            close(pointRows([curves[1].eval(t)])[0], pointRows([patch.eval(0, 1 - t)])[0]);
            close(pointRows([curves[2].eval(t)])[0], pointRows([patch.eval(t, 0)])[0]);
        }
        const issued = curves[0];
        const oldStart = issued.eval(0).X();
        patch.getControlNet()[0].setX(oldStart + 2);
        expect(issued.eval(0).X()).toBe(oldStart + 2);
        patch.setControlNet(fixture(3).map(point));
        expect(issued.eval(0).X()).toBe(oldStart + 2);
    });

    it("returns the complete barycentric scheme with independently checkable intermediate levels", () => {
        const rows: Row[] = [[1, 2, 3], [4, 1, 0], [0, 3, 2], [2, 5, 1], [7, 2, 4], [3, 1, 6]];
        const patch = patchFromRows(rows);
        const scheme = patch.decasteljauScheme(0.2, 0.3);
        expect(scheme).toHaveLength(3);
        expect(scheme[1]).toHaveLength(3);
        expect(scheme[2]).toHaveLength(1);
        const bary = [0.2, 0.3, 0.5];
        const expectedFirst = indices(1).map(([i, j, k]) => {
            const at = (a: number, b: number, c: number) => rows[indices(2).findIndex(([x, y, z]) => x === a && y === b && z === c)];
            return at(i + 1, j, k).map((x, d) => bary[0] * x + bary[1] * at(i, j + 1, k)[d] + bary[2] * at(i, j, k + 1)[d]);
        });
        scheme[1].forEach((row, i) => close(row, expectedFirst[i]));
        close(scheme[2][0], bernstein(rows, 2, 0.2, 0.3));
    });

    it("elevates exactly through degree four and rejects degree-five elevation", () => {
        for (let n = 1; n < 4; n++) {
            const source = fixture(n);
            const patch = patchFromRows(source);
            const elevated = patch.elevate();
            expect(elevated.degree).toBe(n + 1);
            const output = pointRows(elevated.getControlNet());
            indices(n + 1).forEach(([i, j, k], index) => {
                const expected: Row = [0, 0, 0];
                if (i) source[indices(n).findIndex(([a, b, c]) => a === i - 1 && b === j && c === k)].forEach((x, d) => expected[d] += i * x / (n + 1));
                if (j) source[indices(n).findIndex(([a, b, c]) => a === i && b === j - 1 && c === k)].forEach((x, d) => expected[d] += j * x / (n + 1));
                if (k) source[indices(n).findIndex(([a, b, c]) => a === i && b === j && c === k - 1)].forEach((x, d) => expected[d] += k * x / (n + 1));
                close(output[index], expected, 12);
            });
            for (const [u, v] of [[0.17, 0.28], [0.42, 0.33]]) close(pointRows([elevated.eval(u, v)])[0], pointRows([patch.eval(u, v)])[0]);
        }
        expect(() => patchFromRows(fixture(4)).elevate()).toThrow(RangeError);
    });

    it("subdivides from scheme levels into three patches with explicit parameter maps", () => {
        const patch = patchFromRows(fixture(4));
        const [abp, bcp, cap] = patch.subdivide(0.23, 0.31);
        const p = [0.23, 0.31, 0.46];
        for (const [a, b, c] of [[0.2, 0.3, 0.5], [0, 0, 1], [0.6, 0.4, 0]]) {
            close(pointRows([abp.eval(a, b)])[0], pointRows([patch.eval(a + c * p[0], b + c * p[1])])[0]);
            close(pointRows([bcp.eval(a, b)])[0], pointRows([patch.eval(c * p[0], a + c * p[1])])[0]);
            close(pointRows([cap.eval(a, b)])[0], pointRows([patch.eval(b + c * p[0], c * p[1])])[0]);
        }
        expect(() => patch.subdivide(0.5, 0.5)).toThrow(/strictly interior/);
        expect(() => patch.subdivide(0, 0)).toThrow(/strictly interior/);
    });

    it("computes analytic partials and a unit normal, rejecting degenerate normals", () => {
        const patch = patchFromRows(indices(3).map(([i, j, k]) => [i / 3, j / 3, (i / 3) ** 2 + 0.6 * (j / 3) ** 2 + 0.2 * (k / 3) ** 2]));
        const u = 0.24, v = 0.33, h = 1e-6;
        const pu = pointRows([patch.partialU(u, v)])[0];
        const pv = pointRows([patch.partialV(u, v)])[0];
        const plusU = pointRows([patch.eval(u + h, v)])[0], minusU = pointRows([patch.eval(u - h, v)])[0];
        const plusV = pointRows([patch.eval(u, v + h)])[0], minusV = pointRows([patch.eval(u, v - h)])[0];
        close(pu, plusU.map((x, d) => (x - minusU[d]) / (2 * h)), 7);
        close(pv, plusV.map((x, d) => (x - minusV[d]) / (2 * h)), 7);
        const normal = patch.normal(u, v);
        expect(Math.hypot(normal.X(), normal.Y(), normal.Z())).toBeCloseTo(1, 12);
        expect(() => patchFromRows(indices(1).map(() => [0, 0, 0])).normal(0.2, 0.3)).toThrow(/normal is undefined/);
    });

    it("samples one barycentric lattice with positive orientation and defensive copies", () => {
        const patch = patchFromRows(fixture(2));
        const mesh = patch.sampleMesh(4);
        expect(mesh.vertices).toHaveLength(15);
        expect(mesh.faces).toHaveLength(16);
        for (const [a, b, c] of mesh.faces) {
            const [u0, v0] = mesh.parameters[a], [u1, v1] = mesh.parameters[b], [u2, v2] = mesh.parameters[c];
            expect((u1 - u0) * (v2 - v0) - (v1 - v0) * (u2 - u0)).toBeGreaterThan(0);
        }
        mesh.parameters[0] = [99, 99];
        mesh.faces[0] = [99, 99, 99];
        mesh.vertices[0].setX(99);
        const fresh = patch.sampleMesh(4);
        expect(fresh.parameters[0]).toEqual([0, 0]);
        expect(fresh.faces[0]).not.toEqual([99, 99, 99]);
        expect(fresh.vertices[0].X()).not.toBe(99);
        const anotherDensity = patch.sampleMesh(3);
        expect(anotherDensity.vertices).toHaveLength(10);
        expect(anotherDensity.faces).toHaveLength(9);
        expect(anotherDensity.parameters[4]).toEqual([1 / 3, 0]);
        close(pointRows([anotherDensity.vertices[4]])[0], pointRows([patch.eval(1 / 3, 0)])[0]);
        expect(() => patch.sampleMesh(2, 3)).toThrow(/one uniform interval/);
        expect(() => patch.sampleMesh(257)).toThrow(/cannot exceed 256/);
    });

    it("keeps versions, cache density, replacement, and volatile inputs correct", () => {
        const a = new PointImpl(0, 0), b = new PointImpl(1, 0), c = new PointImpl(0, 1);
        const patch = new TriangularBezierPatch([a, b, c]);
        const first = patch.eval(0.2, 0.3);
        close(pointRows([patch.eval(0.2, 0.3)])[0], pointRows([first])[0]);
        const mesh = patch.sampleMesh(2);
        expect(mesh.vertices).toHaveLength(6);
        a.setX(3);
        expect(patch.eval(0.2, 0.3).X()).not.toBe(first.X());
        expect(patch.sampleMesh(2).vertices[3].X()).toBe(1.5);
        const beforeReplacement = patch.eval(1, 0).X();
        patch.setControlNet([new PointImpl(8, 0), b, c]);
        expect(patch.eval(1, 0).X()).toBe(8);
        expect(patch.eval(1, 0).X()).not.toBe(beforeReplacement);

        let live = 4;
        const volatile = new TriangularBezierPatch([new PointImpl(() => live, 0), b, c]);
        expect(volatile.eval(1, 0).X()).toBe(4);
        live = 9;
        expect(volatile.eval(1, 0).X()).toBe(9);
    });

    it("validates degree, finite coordinates and simplex inputs", () => {
        expect(() => new TriangularBezierPatch([point([0, 0, 0]), point([1, 0, 0])])).toThrow(RangeError);
        expect(() => new TriangularBezierPatch([point([0, 0, 0]), point([1, 0, 0]), point([0, Infinity, 0])])).toThrow(/finite/);
        const patch = patchFromRows(fixture(1));
        for (const [u, v] of [[NaN, 0], [Infinity, 0], [-0.1, 0], [0.7, 0.4]]) expect(() => patch.eval(u, v)).toThrow(RangeError);
    });

    it("accepts floating-point roundoff along the closed simplex edge", () => {
        const patch = patchFromRows(fixture(1));
        expect(() => patch.eval(0.8, 0.2)).not.toThrow();
        expect(() => patch.sampleMesh(5)).not.toThrow();
        expect(() => patch.eval(0.7, 0.300001)).toThrow(RangeError);
        expect(() => patch.eval(-Number.EPSILON, 0.2)).toThrow(RangeError);

        let edgeSamples = 0;
        let finite = true;
        for (let density = 1; density <= 256; density++) for (let step = 0; step <= density; step++) {
            const t = step / density;
            for (const [u, v] of [[t, 0], [0, t], [t, 1 - t]]) {
                const values = [patch.eval(u, v), patch.partialU(u, v), patch.partialV(u, v)];
                finite &&= values.every(value => [value.X(), value.Y(), value.Z?.() ?? 0].every(Number.isFinite));
                edgeSamples++;
            }
        }
        expect(edgeSamples).toBe(3 * (256 * 257 / 2 + 256));
        expect(finite).toBe(true);

        for (const density of [5, 6, 8, 10, 16, 256]) {
            const mesh = patch.sampleMesh(density);
            expect(mesh.vertices).toHaveLength((density + 1) * (density + 2) / 2);
            expect(mesh.faces).toHaveLength(density * density);
            expect(mesh.vertices.every(value => [value.X(), value.Y(), value.Z?.() ?? 0].every(Number.isFinite))).toBe(true);
        }
    });

    it("invalidates primed evaluation and mesh caches when a control becomes non-finite", () => {
        const a = new PointImpl(0, 0), patch = new TriangularBezierPatch([a, new PointImpl(1, 0), new PointImpl(0, 1)]);
        patch.eval(0.2, 0.3);
        patch.sampleMesh(5);
        a.setX(NaN);
        expect(() => patch.eval(0.2, 0.3)).toThrow(/finite/);
        expect(() => patch.sampleMesh(5)).toThrow(/finite/);
        a.setX(Infinity);
        expect(() => patch.boundingBox()).toThrow(/finite/);
    });

    it("matches a nonplanar bilinear tensor patch on each half of the unit square", () => {
        const tensor = new TensorProductBezierPatch([
            [point([0, 0, 0]), point([0, 1, 0])],
            [point([1, 0, 0]), point([1, 1, 1])],
        ]);
        // On x=u,y=v the product z=uv is the degree-two Bernstein basis term
        // 2uv, hence only control coefficient (i,j,k)=(1,1,0) is nonzero.
        const triangular = patchFromRows(indices(2).map(([i, j]) => [i / 2, j / 2, i === 1 && j === 1 ? 0.5 : 0]));
        // The upper square half uses global x=a+b, y=b+c. Expanding xy in
        // degree-two Bernstein form gives four nonzero coefficients.
        const upper = patchFromRows(indices(2).map(([i, j, k]) => [
            (i + j) / 2,
            (j + k) / 2,
            i === 1 && j === 1 && k === 0 ? 0.5 :
                i === 1 && j === 0 && k === 1 ? 0.5 :
                    i === 0 && j === 2 && k === 0 ? 1 :
                        i === 0 && j === 1 && k === 1 ? 0.5 : 0,
        ]));
        for (const [u, v] of [[0.1, 0.2], [0.55, 0.3], [0, 1]]) {
            close(pointRows([tensor.eval(u, v)])[0], pointRows([triangular.eval(u, v)])[0]);
            const c = 1 - u - v;
            close(pointRows([tensor.eval(u + v, v + c)])[0], pointRows([upper.eval(u, v)])[0]);
        }
    });
});
