/**
 * The tensor patch derived from a triangular net: exact points, the shared boundaries, the translational identity,
 * and how the comparison reaches the scene (the `compare` role, no mesh, nothing selectable).
 */
import {tensorNetFromTriangular} from "./TriangularTensorComparison";
import {buildTriangularScene, TriangularSceneInput} from "./TriangularPatchScene";
import {defaultTriangularNet, triangularFromNet} from "./TriangularPatchDegree";
import {triangularIndices} from "./TriangularPatchLattice";
import {patchFromNet} from "./patchSceneBuilder";
import type {Xyz} from "./surface-view/surfaceScene";

const camera = {az: 0, el: 0.5, distance: 10, projection: "perspective" as const, target: [0, 0, 0] as Xyz};
const input = (net: Xyz[], over: Partial<TriangularSceneInput> = {}): TriangularSceneInput => ({
    net, u: 0.3, v: 0.2, camera, showControlNet: true, showIsoCurves: true, showBoundaryCurves: true, showShading: true,
    showDeCasteljau: false, isoDensity: 8, shadingDensity: 8, zMode: false, ...over,
});
const xyz = (p: {X(): number; Y(): number; Z?(): number}): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0];
const near = (actual: readonly number[], expected: readonly number[], digits = 12) =>
    expected.forEach((value, k) => expect(Math.abs(actual[k] - value)).toBeLessThan(10 ** -digits));
const ts = [0, 0.1, 0.37, 0.5, 0.82, 1];
const triangular = (net: Xyz[], u: number, v: number) => xyz(triangularFromNet(net).eval(u, v));
const tensor = (net: Xyz[], n: number, u: number, v: number) => xyz(patchFromNet(tensorNetFromTriangular(net, n)).eval(u, v));

describe("tensorNetFromTriangular", () => {
    it("n = 2: the exact points of P_00 = b_002, P_a0 = b_a0(2-a), P_0b = b_0b(2-b) and P_ab = P_a0 + P_0b - P_00", () => {
        const f = (i: number, j: number, k: number): Xyz => [3 * i + j + 1, 5 * j + k + 2, 7 * i + 2 * j - k + 3];
        const net = triangularIndices(2).map(([i, j, k]) => f(i, j, k));
        expect(tensorNetFromTriangular(net, 2)).toEqual([
            [[1, 4, 1], [2, 8, 4], [3, 12, 7]],
            [[4, 3, 9], [5, 7, 12], [6, 11, 15]],
            [[7, 2, 17], [8, 6, 20], [9, 10, 23]],
        ]);
    });
    it.each([1, 2, 3, 4])("degree %i: an (n+1) x (n+1) net whose first row and column are the triangular boundary points", degree => {
        const net = defaultTriangularNet(degree);
        const tensorNet = tensorNetFromTriangular(net, degree);
        expect(tensorNet).toHaveLength(degree + 1);
        tensorNet.forEach(row => expect(row).toHaveLength(degree + 1));
        const index = (i: number, j: number) => triangularIndices(degree).findIndex(([a, b]) => a === i && b === j);
        for (let a = 0; a <= degree; a++) {
            expect(tensorNet[a][0]).toEqual(net[index(a, 0)]);
            expect(tensorNet[0][a]).toEqual(net[index(0, a)]);
        }
    });
    it.each([1, 2, 3, 4])("degree %i: shares the boundary curves v = 0 and u = 0 with the triangular patch (1e-12)", degree => {
        const net = defaultTriangularNet(degree).map(([x, y, z]): Xyz => [x + 2, y - 1, z + 3]);
        for (const t of ts) {
            near(tensor(net, degree, t, 0), triangular(net, t, 0));
            near(tensor(net, degree, 0, t), triangular(net, 0, t));
        }
    });
    it.each([1, 2, 3, 4])("degree %i: S(u, v) = S(u, 0) + S(0, v) - S(0, 0) (on a net away from the origin)", degree => {
        const net = defaultTriangularNet(degree).map(([x, y, z]): Xyz => [x + 2, y - 1, z + 3]);
        const patch = patchFromNet(tensorNetFromTriangular(net, degree));
        for (const u of ts) for (const v of ts) {
            const sum = [0, 1, 2].map(axis => xyz(patch.eval(u, 0))[axis] + xyz(patch.eval(0, v))[axis] - xyz(patch.eval(0, 0))[axis]);
            near(xyz(patch.eval(u, v)), sum);
        }
    });
    it("the interior differs from the triangular patch for the default cubic (a non-vacuous comparison)", () => {
        const net = defaultTriangularNet(3);
        const distance = (a: Xyz, b: Xyz) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        expect(distance(tensor(net, 3, 0.3, 0.3), triangular(net, 0.3, 0.3))).toBeGreaterThan(0.1);
        expect(distance(tensor(net, 3, 0.2, 0.5), triangular(net, 0.2, 0.5))).toBeGreaterThan(0.1);
    });
});

describe("the comparison in the scene", () => {
    const net = defaultTriangularNet(3);
    const compare = (scene: ReturnType<typeof buildTriangularScene>) => scene.polylines.filter(line => line.role === "compare");

    it("adds only compare-role polylines, with the tensor boundary, iso and net counts, and leaves the rest of the scene unchanged", () => {
        const base = buildTriangularScene(input(net), 1);
        const scene = buildTriangularScene(input(net, {compareTensor: true}), 1);
        expect(compare(base)).toHaveLength(0);
        // 4 boundary curves, 2 x 9 iso lines (density 8), 2 x 4 net rows and columns for degree 3.
        expect(compare(scene)).toHaveLength(4 + 18 + 8);
        expect(scene.polylines.filter(line => line.role !== "compare")).toEqual(base.polylines);
        expect(new Set(scene.polylines.map(line => line.id)).size).toBe(scene.polylines.length);
        expect(scene.mesh?.positions).toEqual(base.mesh?.positions);
        expect(scene.points).toEqual(base.points);
        expect(scene.markers).toEqual(base.markers);
    });
    it("the compare boundary curves follow the derived net: u = 0 and v = 0 lie on the triangular boundaries", () => {
        const scene = buildTriangularScene(input(net, {compareTensor: true}), 1);
        const byId = (id: string) => scene.polylines.find(line => line.id === id)!;
        const own = byId("boundary-v0").points, theirs = byId("compare-boundary-v0").points;
        expect(theirs).toHaveLength(own.length);
        own.forEach((p, k) => near(theirs[k], p));
        const own0 = byId("boundary-u0").points, theirs0 = byId("compare-boundary-u0").points;
        own0.forEach((p, k) => near(theirs0[k], p));
        // The other two curves are the tensor patch's own: they do not lie on the triangular patch's hypotenuse curve.
        const far = byId("compare-boundary-u1").points[16];
        expect(Math.hypot(...[0, 1, 2].map(axis => far[axis] - byId("boundary-w0").points[16][axis]))).toBeGreaterThan(0.1);
    });
    it("honours the Prikaz switches: no net, iso or boundary switch means no compare line of that kind; never a mesh or a highlight", () => {
        const none = buildTriangularScene(input(net, {compareTensor: true, showControlNet: false, showIsoCurves: false, showBoundaryCurves: false, selectedPointId: "t-1-1-1"}), 1);
        expect(compare(none)).toHaveLength(0);
        const netOnly = buildTriangularScene(input(net, {compareTensor: true, showIsoCurves: false, showBoundaryCurves: false, selectedPointId: "t-1-1-1"}), 1);
        expect(compare(netOnly).every(line => line.id.startsWith("compare-net-"))).toBe(true);
        expect(netOnly.polylines.filter(line => line.role === "highlight")).toHaveLength(3);
    });
});
