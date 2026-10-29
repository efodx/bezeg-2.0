/**
 * The triangular patch scene and its pure helpers, checked against an independent evaluator (the trivariate Bernstein
 * sum written out here), not against the patch class's own de Casteljau: mesh vertices, the three iso families, the
 * boundary curves, the de Casteljau levels, elevation and lowering, the three-piece split, and the lattice rows.
 */
import {buildTriangularScene, isInteriorPoint, TriangularSceneInput} from "./TriangularPatchScene";
import {changeTriangularDegree, defaultTriangularNet, elevateTriangularNet, lowerTriangularNet, triangularFromNet} from "./TriangularPatchDegree";
import {parseTriangularPointId, triangularIndex, triangularIndices, triangularNetLength, triangularPointId, triangularRows} from "./TriangularPatchLattice";
import type {SurfaceScene, Xyz} from "./surface-view/surfaceScene";

const camera = {az: 0, el: 0.5, distance: 10, projection: "perspective" as const, target: [0, 0, 0] as Xyz};
const input = (net: Xyz[], over: Partial<TriangularSceneInput> = {}): TriangularSceneInput => ({
    net, u: 0.3, v: 0.2, camera, showControlNet: true, showIsoCurves: false, showBoundaryCurves: false, showShading: false,
    showDeCasteljau: false, isoDensity: 8, shadingDensity: 8, zMode: false, ...over,
});
const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);
const near = (actual: readonly number[], expected: readonly number[], digits = 10) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, k) => expect(actual[k]).toBeCloseTo(value, digits));
};
const polyline = (scene: SurfaceScene, id: string) => {
    const found = scene.polylines.find(line => line.id === id);
    if (!found) throw new Error(`no polyline ${id}`);
    return found;
};

/** Independent evaluation: sum of n!/(i!j!k!) u^i v^j w^k b_ijk over the canonical net. */
function reference(net: ReadonlyArray<Xyz>, u: number, v: number, w = 1 - u - v): Xyz {
    const n = (Math.sqrt(8 * net.length + 1) - 3) / 2;
    const sum: Xyz = [0, 0, 0];
    triangularIndices(n).forEach(([i, j, k], index) => {
        const weight = factorial(n) / (factorial(i) * factorial(j) * factorial(k)) * u ** i * v ** j * w ** k;
        for (let axis = 0; axis < 3; axis++) sum[axis] += weight * net[index][axis];
    });
    return sum;
}
/** A 1D Bezier curve through control points (Bernstein sum). */
function curve(points: ReadonlyArray<Xyz>, s: number): Xyz {
    const n = points.length - 1;
    const sum: Xyz = [0, 0, 0];
    points.forEach((p, j) => {
        const weight = factorial(n) / (factorial(j) * factorial(n - j)) * s ** j * (1 - s) ** (n - j);
        for (let axis = 0; axis < 3; axis++) sum[axis] += weight * p[axis];
    });
    return sum;
}
/** Identity map (u, v, w) -> (x, y, z), elevated to the given degree: the surface is the plane x + y + z = 1 with x = u, y = v, z = w. */
function identityNet(degree: number): Xyz[] {
    let net: Xyz[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let n = 1; n < degree; n++) net = elevateTriangularNet(net);
    return net;
}
const nets = [1, 2, 3, 4].map(degree => [degree, defaultTriangularNet(degree)] as const);
const barycentrics: ReadonlyArray<readonly [number, number]> = [[0, 0], [1, 0], [0, 1], [0.2, 0.3], [0.5, 0.5], [1 / 3, 1 / 3], [0.05, 0.9], [0.7, 0.1]];

describe("lattice", () => {
    it.each([1, 2, 3, 4])("degree %i: canonical order, index lookup and point ids agree", degree => {
        const lattice = triangularIndices(degree);
        expect(lattice).toHaveLength(triangularNetLength(degree));
        expect(lattice[0]).toEqual([degree, 0, 0]);
        expect(lattice[degree * (degree + 1) / 2]).toEqual([0, degree, 0]);
        expect(lattice[lattice.length - 1]).toEqual([0, 0, degree]);
        lattice.forEach(([i, j, k], index) => {
            expect(i + j + k).toBe(degree);
            expect(triangularIndex(degree, i, j)).toBe(index);
            expect(parseTriangularPointId(triangularPointId(i, j, k))).toEqual([i, j, k]);
        });
        expect(new Set(lattice.map(index => index.join())).size).toBe(lattice.length);
    });
    it("rejects ids that are not t-i-j-k", () => {
        for (const id of ["p-1-2", "t-1-2", "t-1-2-x", "t--1-2-3", "x-t-1-2-3", ""]) expect(parseTriangularPointId(id)).toBeUndefined();
    });
    it.each([1, 2, 3, 4])("degree %i: the rows draw every lattice edge exactly once", degree => {
        const lattice = triangularIndices(degree);
        const key = (a: number, b: number) => a < b ? `${a}-${b}` : `${b}-${a}`;
        // An edge joins two lattice points whose index triples differ by a unit step along one of the three directions.
        const expected = new Set<string>();
        lattice.forEach((p, a) => lattice.forEach((q, b) => {
            const d = p.map((value, axis) => value - q[axis]);
            if (a < b && d.every(value => Math.abs(value) <= 1) && d.filter(value => value !== 0).length === 2) expected.add(key(a, b));
        }));
        expect(expected.size).toBe(3 * degree * (degree + 1) / 2);
        const drawn: string[] = [];
        for (const row of triangularRows(degree)) {
            // Each row keeps one barycentric index constant.
            const axis = row.family === "i" ? 0 : row.family === "j" ? 1 : 2;
            for (const index of row.indices) expect(lattice[index][axis]).toBe(row.value);
            for (let t = 1; t < row.indices.length; t++) drawn.push(key(row.indices[t - 1], row.indices[t]));
        }
        expect(drawn).toHaveLength(expected.size);
        expect(new Set(drawn)).toEqual(expected);
    });
});

describe("shaded mesh", () => {
    it.each(nets)("degree %i: every vertex equals the evaluation at its barycentric parameter", (_degree, net) => {
        for (const density of [8, 16] as const) {
            const scene = buildTriangularScene(input(net, {showShading: true, shadingDensity: density}), 1);
            const positions = scene.mesh!.positions;
            expect(scene.meshOwners).toEqual([{id: "triangular-patch-0", kind: "triangular", faceStart: 0, faceCount: scene.mesh!.faces.length}]);
            expect(positions).toHaveLength(3 * (density + 1) * (density + 2) / 2);
            let vertex = 0;
            for (let i = 0; i <= density; i++) for (let j = 0; j <= density - i; j++) {
                near(Array.from(positions).slice(3 * vertex, 3 * vertex + 3), reference(net, i / density, j / density), 9);
                vertex++;
            }
        }
    });
    it("the faces tile the triangle: d^2 faces, valid indices, positive orientation, total area 1/2", () => {
        const density = 8;
        const scene = buildTriangularScene(input(identityNet(1), {showShading: true, shadingDensity: density}), 1);
        const {positions, faces} = scene.mesh!;
        expect(faces).toHaveLength(3 * density * density);
        // The identity patch maps (u, v) to (x, y): the face areas in xy are the parameter-space areas.
        let area = 0;
        for (let f = 0; f < faces.length; f += 3) {
            const [a, b, c] = [faces[f], faces[f + 1], faces[f + 2]].map(index => {
                expect(index).toBeGreaterThanOrEqual(0);
                expect(index).toBeLessThan(positions.length / 3);
                return [positions[3 * index], positions[3 * index + 1]];
            });
            const signed = ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
            expect(signed).toBeGreaterThan(0);
            area += signed;
        }
        expect(area).toBeCloseTo(0.5, 12);
    });
    it("the chord tolerance is zero for a plane and positive for a curved patch", () => {
        const plane = buildTriangularScene(input(identityNet(3), {showShading: true}), 1);
        expect(plane.mesh!.chordTolerance).toBeLessThan(1e-12);
        const dome = buildTriangularScene(input(defaultTriangularNet(3), {showShading: true}), 1);
        expect(dome.mesh!.chordTolerance).toBeGreaterThan(1e-3);
    });
    it("is absent when shading is off", () => {
        expect(buildTriangularScene(input(defaultTriangularNet(2)), 1).mesh).toBeUndefined();
    });
});

describe("iso-line families", () => {
    it.each([1, 2, 3, 4])("degree %i: u-, v- and w-lines keep u, v and w constant (identity patch reads (x, y, z) = (u, v, w))", degree => {
        const density = 8;
        const scene = buildTriangularScene(input(identityNet(degree), {showIsoCurves: true, isoDensity: density}), 1);
        const axisOf = {"iso-u": 0, "iso-v": 1, "iso-w": 2} as const;
        const roleOf = {"iso-u": "iso", "iso-v": "iso-v", "iso-w": "iso-w"} as const;
        for (const [family, axis] of Object.entries(axisOf)) {
            for (let k = 0; k < density; k++) {
                const line = polyline(scene, `${family}-${k}`);
                expect(line.role).toBe(roleOf[family as keyof typeof roleOf]);
                for (const point of line.points) {
                    expect(point[axis]).toBeCloseTo(k / density, 12);
                    expect(point[0] + point[1] + point[2]).toBeCloseTo(1, 12);
                    for (const other of point) expect(other).toBeGreaterThanOrEqual(-1e-12);
                }
            }
        }
        expect(scene.polylines.filter(line => line.id.startsWith("iso-"))).toHaveLength(3 * density);
    });
    it("the three families have three distinct roles, and every line equals the independent evaluation", () => {
        const net = defaultTriangularNet(3);
        const scene = buildTriangularScene(input(net, {showIsoCurves: true, isoDensity: 8}), 1);
        expect(new Set(scene.polylines.filter(line => line.id.startsWith("iso-")).map(line => line.role)).size).toBe(3);
        const t = 3 / 8, last = polyline(scene, "iso-u-3").points.length - 1;
        polyline(scene, "iso-u-3").points.forEach((p, k) => near(p, reference(net, t, (k / last) * (1 - t)), 9));
        polyline(scene, "iso-v-3").points.forEach((p, k) => near(p, reference(net, (k / last) * (1 - t), t), 9));
        polyline(scene, "iso-w-3").points.forEach((p, k) => near(p, reference(net, (k / last) * (1 - t), (1 - k / last) * (1 - t)), 9));
    });
    it("is absent when the iso-lines are off", () => {
        expect(buildTriangularScene(input(defaultTriangularNet(2)), 1).polylines.some(line => line.id.startsWith("iso-"))).toBe(false);
    });
});

describe("boundary curves", () => {
    it.each(nets)("degree %i: each equals the Bezier curve of its boundary row of the net", (degree, net) => {
        const scene = buildTriangularScene(input(net, {showBoundaryCurves: true}), 1);
        const at = (i: number, j: number) => net[triangularIndex(degree, i, j)];
        const range = Array.from({length: degree + 1}, (_, a) => a);
        // u = 0 runs along v = s (b(0,j,n-j)), v = 0 along u = s (b(i,0,n-i)), w = 0 along u = s with v = 1 - s (b(i,n-i,0)).
        const rows: Record<string, Xyz[]> = {
            "boundary-u0": range.map(j => at(0, j)),
            "boundary-v0": range.map(i => at(i, 0)),
            "boundary-w0": range.map(i => at(i, degree - i)),
        };
        for (const [id, row] of Object.entries(rows)) {
            const line = polyline(scene, id);
            expect(line.role).toBe("boundary");
            const last = line.points.length - 1;
            line.points.forEach((p, k) => near(p, curve(row, k / last), 9));
        }
    });
    it("a boundary curve starts and ends at net corners", () => {
        const net = defaultTriangularNet(3);
        const scene = buildTriangularScene(input(net, {showBoundaryCurves: true}), 1);
        const first = (id: string) => polyline(scene, id).points[0], end = (id: string) => polyline(scene, id).points.slice(-1)[0];
        const [a, b, c] = [net[0], net[6], net[net.length - 1]];
        near(first("boundary-u0"), c); near(end("boundary-u0"), b);
        near(first("boundary-v0"), c); near(end("boundary-v0"), a);
        near(first("boundary-w0"), b); near(end("boundary-w0"), a);
    });
});

describe("control net and markers", () => {
    it.each([1, 2, 3, 4])("degree %i: net points are the net in canonical order with t-i-j-k ids, one polyline per lattice row", degree => {
        const net = defaultTriangularNet(degree);
        const scene = buildTriangularScene(input(net), 1);
        expect(scene.points.map(p => p.id)).toEqual(triangularIndices(degree).map(([i, j, k]) => triangularPointId(i, j, k)));
        scene.points.forEach((p, k) => expect(p.xyz).toEqual(net[k]));
        expect(scene.polylines.filter(line => line.role === "net")).toHaveLength(triangularRows(degree).length);
        for (const row of triangularRows(degree)) expect(polyline(scene, `net-${row.family}-${row.value}`).points).toEqual(row.indices.map(index => net[index]));
    });
    it("the evaluated marker and label sit on S(u, v, w), and a hidden net hides points and rows", () => {
        const net = defaultTriangularNet(3);
        const scene = buildTriangularScene(input(net, {u: 0.15, v: 0.6, showControlNet: false}), 1);
        near(scene.markers.find(m => m.role === "evaluated")!.xyz, reference(net, 0.15, 0.6), 10);
        near(scene.labels.find(l => l.id === "surface-point")!.anchor, reference(net, 0.15, 0.6), 10);
        expect(scene.points).toEqual([]);
        expect(scene.polylines.some(line => line.role === "net")).toBe(false);
        expect(scene.interaction.editable).toBe(false);
    });
    it("marks the selected point and labels it; a selection of another degree marks nothing", () => {
        const net = defaultTriangularNet(3);
        const scene = buildTriangularScene(input(net, {selectedPointId: "t-1-1-1"}), 1);
        expect(scene.points.filter(p => p.selected).map(p => p.id)).toEqual(["t-1-1-1"]);
        expect(scene.labels.find(l => l.id === "selected-point")).toMatchObject({text: "P_{111}", pointId: "t-1-1-1"});
        const stale = buildTriangularScene(input(net, {selectedPointId: "t-1-1-2"}), 1);
        expect(stale.points.some(p => p.selected)).toBe(false);
        expect(stale.labels.some(l => l.id === "selected-point")).toBe(false);
    });
});

describe("de Casteljau levels", () => {
    it.each([2, 3, 4])("degree %i: level l holds the net of degree n - l with the multinomial combination of the original net", degree => {
        const net = defaultTriangularNet(degree);
        const [u, v] = [0.25, 0.35], w = 1 - u - v;
        const scene = buildTriangularScene(input(net, {u, v, showDeCasteljau: true}), 1);
        for (let level = 1; level < degree; level++) {
            const lattice = triangularIndices(degree - level);
            const markers = scene.markers.filter(m => m.id.startsWith(`construction-${level}-`));
            expect(markers).toHaveLength(lattice.length);
            lattice.forEach(([a, b], index) => {
                const expected: Xyz = [0, 0, 0];
                for (const [p, q, r] of triangularIndices(level)) {
                    const weight = factorial(level) / (factorial(p) * factorial(q) * factorial(r)) * u ** p * v ** q * w ** r;
                    const source = net[triangularIndex(degree, a + p, b + q)];
                    for (let axis = 0; axis < 3; axis++) expected[axis] += weight * source[axis];
                }
                near(markers.find(m => m.id === `construction-${level}-${index}`)!.xyz, expected, 10);
            });
            expect(scene.polylines.filter(line => line.id.startsWith(`construction-${level}-`))).toHaveLength(triangularRows(degree - level).length);
        }
        expect(scene.markers.filter(m => m.role === "construction").length).toBe(Array.from({length: degree - 1}, (_, k) => triangularNetLength(degree - 1 - k)).reduce((a, b) => a + b, 0));
    });
    it("a degree 1 patch has no intermediate level, and the switch off draws none", () => {
        expect(buildTriangularScene(input(defaultTriangularNet(1), {showDeCasteljau: true}), 1).markers.filter(m => m.role === "construction")).toHaveLength(0);
        expect(buildTriangularScene(input(defaultTriangularNet(3)), 1).markers.filter(m => m.role === "construction")).toHaveLength(0);
    });
});

describe("degree changes", () => {
    it.each([1, 2, 3])("elevating a degree %i net keeps the surface at sampled barycentrics", degree => {
        const net = defaultTriangularNet(degree).map((p, k): Xyz => [p[0], p[1] + 0.1 * k, p[2] - 0.05 * k * k]);
        const raised = elevateTriangularNet(net);
        expect(raised).toHaveLength(triangularNetLength(degree + 1));
        for (const [u, v] of barycentrics) near(reference(raised, u, v), reference(net, u, v), 10);
        // The corners stay.
        near(raised[0], net[0]); near(raised[raised.length - 1], net[net.length - 1]);
    });
    it("raising by several degrees equals repeated elevation, and lowering after raising restores the net", () => {
        const net = defaultTriangularNet(1);
        const raised = changeTriangularDegree(net, 1, 4);
        expect(raised).toHaveLength(15);
        for (const [u, v] of barycentrics) near(reference(raised, u, v), reference(net, u, v), 10);
        const back = changeTriangularDegree(raised, 4, 1);
        back.forEach((p, k) => near(p, net[k], 9));
        const cubic = defaultTriangularNet(3).map((p, k): Xyz => [p[0] + 0.01 * k, p[1], p[2] + 0.2 * (k % 3)]);
        const round = changeTriangularDegree(changeTriangularDegree(cubic, 3, 4), 4, 3);
        round.forEach((p, k) => near(p, cubic[k], 9));
    });
    it("lowering interpolates at the lattice points and keeps the three corners (an approximation, not exact)", () => {
        const cubic = defaultTriangularNet(3);
        const lowered = lowerTriangularNet(cubic, 2);
        expect(lowered).toHaveLength(6);
        triangularIndices(2).forEach(([i, j]) => near(reference(lowered, i / 2, j / 2), reference(cubic, i / 2, j / 2), 9));
        near(lowered[0], cubic[0]); near(lowered[5], cubic[cubic.length - 1]);
        // The dome is a true cubic, so the quadratic cannot reproduce it between lattice points.
        expect(Math.hypot(...reference(lowered, 0.3, 0.3).map((value, axis) => value - reference(cubic, 0.3, 0.3)[axis]))).toBeGreaterThan(1e-3);
    });
    it("changing to the same degree returns an equal net", () => {
        const net = defaultTriangularNet(2);
        expect(changeTriangularDegree(net, 2, 2)).toEqual(net);
    });
    it.each(nets)("the default degree %i net has the canonical length, its corners at the triangle corners and a finite surface", (degree, net) => {
        expect(net).toHaveLength(triangularNetLength(degree));
        const [a, b, c] = [net[0], net[degree * (degree + 1) / 2], net[net.length - 1]];
        expect([a.slice(0, 2), b.slice(0, 2), c.slice(0, 2)]).toEqual([[-1.5, -1.3], [1.5, -1.3], [0, 1.3]]);
        expect(Number.isFinite(triangularFromNet(net).eval(0.3, 0.3).Z())).toBe(true);
    });
});

describe("three-piece split", () => {
    const net = defaultTriangularNet(3).map((p, k): Xyz => [p[0], p[1], p[2] + 0.05 * k]);
    const [u, v] = [0.3, 0.25], w = 1 - u - v;
    const corners: ReadonlyArray<readonly [number, number, number]> = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const point: readonly [number, number, number] = [u, v, w];
    const pieceCorners = [[0, 1], [1, 2], [2, 0]] as const;
    const scene = buildTriangularScene(input(net, {u, v, subdivisionPreview: true}), 1);
    const pieceNet = (index: number): Xyz[] => {
        const rows = triangularRows(3);
        // Reassemble the piece net from the preview rows: each lattice point appears in a row.
        const result: Xyz[] = new Array(triangularNetLength(3));
        for (const row of rows) polyline(scene, `piece-${index}-${row.family}-${row.value}`).points.forEach((p, t) => { result[row.indices[t]] = p; });
        return result;
    };
    it.each([0, 1, 2])("piece %i reproduces the surface on its sub-triangle", index => {
        const [first, second] = pieceCorners[index];
        const piece = pieceNet(index);
        // The sub-triangle's own barycentrics (s, t, r) map to s*first + t*second + r*P of the original.
        for (const [s, t] of [[0, 0], [1, 0], [0, 1], [0.2, 0.3], [0.5, 0.5], [0.1, 0.8]]) {
            const r = 1 - s - t;
            const mapped = [0, 1, 2].map(axis => s * corners[first][axis] + t * corners[second][axis] + r * point[axis]);
            near(reference(piece, s, t), reference(net, mapped[0], mapped[1], mapped[2]), 9);
        }
    });
    it("all three pieces share the split point and the corners; neighbouring pieces share their edge to it", () => {
        const pieces = [0, 1, 2].map(pieceNet);
        const split = reference(net, u, v);
        for (const piece of pieces) near(reference(piece, 0, 0), split, 9);
        near(reference(pieces[0], 1, 0), reference(net, 1, 0), 9);
        near(reference(pieces[0], 0, 1), reference(net, 0, 1), 9);
        near(reference(pieces[1], 0, 1), reference(net, 0, 0), 9);
        // Piece 0 and 1 share the edge B-P, piece 1 and 2 the edge C-P, piece 2 and 0 the edge A-P.
        for (const s of [0, 0.3, 0.7, 1]) {
            near(reference(pieces[0], 0, s), reference(pieces[1], s, 0), 9);
            near(reference(pieces[1], 0, s), reference(pieces[2], s, 0), 9);
            near(reference(pieces[2], 0, s), reference(pieces[0], s, 0), 9);
        }
    });
    it("the cut curves run from the split point to the corners", () => {
        const split = reference(net, u, v);
        const ends: Record<string, Xyz> = {"split-a": reference(net, 1, 0), "split-b": reference(net, 0, 1), "split-c": reference(net, 0, 0)};
        for (const [id, end] of Object.entries(ends)) {
            const line = polyline(scene, id);
            expect(line.role).toBe("boundary");
            near(line.points[0], split, 9);
            near(line.points[line.points.length - 1], end, 9);
        }
        // A cut lies on the surface along the segment from P: the midpoint equals the evaluation at the midpoint.
        const middle = polyline(scene, "split-a");
        near(middle.points[(middle.points.length - 1) / 2], reference(net, (u + 1) / 2, v / 2), 9);
    });
    it("is drawn only strictly inside the triangle, and only when the preview is on", () => {
        expect(isInteriorPoint(0.3, 0.3)).toBe(true);
        for (const [a, b] of [[0, 0.5], [0.5, 0], [0.5, 0.5], [0, 0], [1, 0]]) {
            expect(isInteriorPoint(a, b)).toBe(false);
            expect(buildTriangularScene(input(net, {u: a, v: b, subdivisionPreview: true}), 1).polylines.some(line => line.id.startsWith("piece-") || line.id.startsWith("split-"))).toBe(false);
        }
        expect(buildTriangularScene(input(net, {u, v}), 1).polylines.some(line => line.id.startsWith("piece-") || line.id.startsWith("split-"))).toBe(false);
    });
});

describe("highlight lines through the selected point", () => {
    const net = defaultTriangularNet(3);
    const at = (...index: [number, number, number]): Xyz => [...net[triangularIndex(3, index[0], index[1])]] as Xyz;
    const lines = (scene: SurfaceScene) => Object.fromEntries(scene.polylines.filter(line => line.role === "highlight").map(line => [line.id, line.points]));

    it("draws the lattice lines i, j and k constant through an interior point, each parallel to a triangle edge", () => {
        const found = lines(buildTriangularScene(input(net, {selectedPointId: "t-1-1-1"}), 1));
        expect(found).toEqual({
            "highlight-i": [at(1, 2, 0), at(1, 1, 1), at(1, 0, 2)],
            "highlight-j": [at(2, 1, 0), at(1, 1, 1), at(0, 1, 2)],
            "highlight-k": [at(2, 0, 1), at(1, 1, 1), at(0, 2, 1)],
        });
    });

    it("draws the three lines through an edge point, the one along the edge reaching both corners", () => {
        const found = lines(buildTriangularScene(input(net, {selectedPointId: "t-2-1-0"}), 1));
        expect(found).toEqual({
            "highlight-i": [at(2, 1, 0), at(2, 0, 1)],
            "highlight-j": [at(2, 1, 0), at(1, 1, 1), at(0, 1, 2)],
            "highlight-k": [at(3, 0, 0), at(2, 1, 0), at(1, 2, 0), at(0, 3, 0)],
        });
    });

    it("omits the one-point line of a vertex", () => {
        const found = lines(buildTriangularScene(input(net, {selectedPointId: "t-3-0-0"}), 1));
        expect(found).toEqual({
            "highlight-j": [at(3, 0, 0), at(2, 0, 1), at(1, 0, 2), at(0, 0, 3)],
            "highlight-k": [at(3, 0, 0), at(2, 1, 0), at(1, 2, 0), at(0, 3, 0)],
        });
    });

    it("follows the net, the degree and the net's visibility; a stale or absent selection draws nothing", () => {
        const moved = net.map((p): Xyz => [...p]);
        moved[triangularIndex(3, 1, 1)] = [7, 8, 9];
        expect(lines(buildTriangularScene(input(moved, {selectedPointId: "t-1-1-1"}), 1))["highlight-j"][1]).toEqual([7, 8, 9]);

        const quadratic = defaultTriangularNet(2);
        const atQuadratic = (i: number, j: number): Xyz => quadratic[triangularIndex(2, i, j)];
        expect(lines(buildTriangularScene(input(quadratic, {selectedPointId: "t-1-1-0"}), 1))).toEqual({
            "highlight-i": [atQuadratic(1, 1), atQuadratic(1, 0)],
            "highlight-j": [atQuadratic(1, 1), atQuadratic(0, 1)],
            "highlight-k": [atQuadratic(2, 0), atQuadratic(1, 1), atQuadratic(0, 2)],
        });
        expect(lines(buildTriangularScene(input(quadratic, {selectedPointId: "t-1-1-1"}), 1))).toEqual({});
        expect(lines(buildTriangularScene(input(net, {selectedPointId: "t-1-1-1", showControlNet: false}), 1))).toEqual({});
        expect(lines(buildTriangularScene(input(net), 1))).toEqual({});
    });
});
