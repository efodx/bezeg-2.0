import {buildJoinScene, joinArrows, joinPointId, type JoinSceneInput, parseJoinPointId} from "./TensorJoinScene";
import {buildTensorScene} from "./patchSceneBuilder";
import {enforceJoin} from "./tensorJoins";
import type {SurfaceScene, Xyz} from "./surface-view/surfaceScene";

const CAMERA = {az: 0.5, el: 0.4, distance: 8, projection: "perspective" as const, target: [0, 0, 0] as Xyz};

/** A bicubic `A` over x in [0, 3] with a non-planar relief; `B` is another bicubic over x in [3, 6]. */
const netA = (): Xyz[][] => Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j): Xyz => [i, j - 1.5, Math.sin(i + 2 * j) + 0.3 * i * j]));
const rawB = (): Xyz[][] => Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j): Xyz => [3 + i, j - 1.5, Math.cos(2 * i - j) + 0.2 * j]));

const input = (net: Xyz[][], netB: Xyz[][], overrides: Partial<JoinSceneInput> = {}): JoinSceneInput => ({
    net, netB, u: 0.5, v: 0.5, camera: CAMERA, showControlNet: true, showIsoCurves: true, showBoundaryCurves: true, showShading: true,
    isoDensity: 8, shadingDensity: 8, zMode: false, joinV: 0.4, ...overrides,
});

const joined = (mode: "c0" | "c1" | "g1", alpha = 1) => {
    const a = netA();
    return input(a, enforceJoin(a, rawB(), mode, alpha));
};

const line = (scene: SurfaceScene, id: string) => scene.polylines.find(item => item.id === id);
const lines = (scene: SurfaceScene, prefix: string) => scene.polylines.filter(item => item.id.startsWith(prefix));

/** Bernstein basis, written out for the test (not the kernel under test). */
const bernstein = (n: number, k: number, t: number): number => {
    const binom = (a: number, b: number): number => b === 0 || b === a ? 1 : binom(a - 1, b - 1) + binom(a - 1, b);
    return binom(n, k) * t ** k * (1 - t) ** (n - k);
};

/** `S_u(u, v)` of a net by the textbook formula `m sum (b_{i+1,j} - b_ij) B_i^{m-1}(u) B_j^n(v)`. */
function derivativeU(net: ReadonlyArray<ReadonlyArray<Xyz>>, u: number, v: number): Xyz {
    const m = net.length - 1, n = net[0].length - 1;
    const sum: Xyz = [0, 0, 0];
    for (let i = 0; i < m; i++) for (let j = 0; j <= n; j++) {
        const weight = m * bernstein(m - 1, i, u) * bernstein(n, j, v);
        for (let c = 0; c < 3; c++) sum[c] += weight * (net[i + 1][j][c] - net[i][j][c]);
    }
    return sum;
}

const shaft = (scene: SurfaceScene, id: string): Xyz => {
    const [from, to] = line(scene, `${id}-shaft`)!.points;
    return [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
};
const len = (a: Xyz) => Math.hypot(...a);

describe("two patches in one scene", () => {
    it("keeps A's objects as the tensor scene draws them and gives B's the same with b- ids", () => {
        const data = joined("c1");
        const scene = buildJoinScene(data, 7);
        const onlyA = buildTensorScene(data, 7);
        expect(scene.revision).toBe(7);
        for (const polyline of onlyA.polylines) expect(line(scene, polyline.id), polyline.id).toEqual(polyline);
        expect(scene.points.filter(point => point.id.startsWith("p-"))).toEqual(onlyA.points);
        expect(scene.points.filter(point => point.id.startsWith("b-"))).toHaveLength(16);
        expect(new Set(scene.points.map(point => point.id)).size).toBe(32);
        expect(scene.points.find(point => point.id === joinPointId(2, 3))!.xyz).toEqual(data.netB[2][3]);
        expect(parseJoinPointId("b-2-3")).toEqual([2, 3]);
        expect(parseJoinPointId("p-2-3")).toBeUndefined();
    });
    it("draws A's net in role net and B's in role net-2, B's iso and boundary curves like A's", () => {
        const scene = buildJoinScene(joined("c1"), 1);
        expect(lines(scene, "net-").map(item => item.role)).toEqual(Array(8).fill("net"));
        expect(lines(scene, "b-net-").map(item => item.role)).toEqual(Array(8).fill("net-2"));
        expect(lines(scene, "b-iso-")).toHaveLength(lines(scene, "iso-").length);
        expect(lines(scene, "b-boundary-").map(item => item.role)).toEqual(Array(4).fill("boundary"));
        // B's boundary u = 0 starts at B's first control point.
        expect(line(scene, "b-boundary-u0")!.points[0]).toEqual(joined("c1").netB[0][0]);
    });
    it("draws the two boundaries in the highlight role; for an enforced join they coincide", () => {
        const scene = buildJoinScene(joined("c0"), 1);
        const a = line(scene, "join-boundary-a")!, b = line(scene, "join-boundary-b")!;
        expect([a.role, b.role]).toEqual(["highlight", "highlight"]);
        a.points.forEach((point, k) => point.forEach((value, c) => expect(value).toBeCloseTo(b.points[k][c], 12)));
        // Unenforced B leaves a gap the boundaries show.
        const gap = buildJoinScene(input(netA(), rawB()), 1);
        expect(line(gap, "join-boundary-a")!.points[0]).not.toEqual(line(gap, "join-boundary-b")!.points[0]);
    });
    it("concatenates both surfaces into one mesh with B's faces offset by A's vertex count", () => {
        const data = joined("c1");
        const scene = buildJoinScene(data, 1);
        const a = buildTensorScene(data, 1).mesh!, b = buildTensorScene({...data, net: data.netB}, 1).mesh!;
        const vertices = a.positions.length / 3;
        expect(scene.mesh!.positions).toEqual([...a.positions, ...b.positions]);
        expect(scene.mesh!.faces).toHaveLength(a.faces.length + b.faces.length);
        expect(scene.mesh!.faces.slice(0, a.faces.length)).toEqual(a.faces);
        expect(scene.mesh!.faces.slice(a.faces.length)).toEqual(b.faces.map(index => index + vertices));
        expect(Math.max(...scene.mesh!.faces)).toBe(2 * vertices - 1);
        expect(scene.mesh!.chordTolerance).toBeGreaterThan(0);
        expect(scene.meshOwners).toEqual([
            {id: "join-patch-a", kind: "join", faceStart: 0, faceCount: a.faces.length},
            {id: "join-patch-b", kind: "join", faceStart: a.faces.length, faceCount: b.faces.length},
        ]);
    });
    it("draws no mesh with the shading off and no net, points or markers beyond A's when the net is off", () => {
        const off = buildJoinScene({...joined("c1"), showShading: false, showControlNet: false}, 1);
        expect(off.mesh).toBeUndefined();
        expect(off.points).toEqual([]);
        expect(lines(off, "net-")).toEqual([]);
        expect(lines(off, "b-net-")).toEqual([]);
        expect(off.interaction.editable).toBe(false);
        expect(off.markers).toHaveLength(1);
    });
    it("highlights the selected point of the patch it belongs to, with a label naming it", () => {
        const data = joined("c1");
        const onB = buildJoinScene({...data, selectedPointId: "b-3-2"}, 1);
        expect(onB.points.filter(point => point.selected).map(point => point.id)).toEqual(["b-3-2"]);
        expect(line(onB, "b-highlight-row")!.points).toEqual(data.netB[3]);
        expect(line(onB, "highlight-row")).toBeUndefined();
        expect(onB.labels.find(label => label.id === "b-selected-point")).toMatchObject({text: "Q_{32}", pointId: "b-3-2", anchor: data.netB[3][2]});
        expect(onB.labels.find(label => label.id === "selected-point")).toBeUndefined();
        const onA = buildJoinScene({...data, selectedPointId: "p-1-2"}, 1);
        expect(onA.points.filter(point => point.selected).map(point => point.id)).toEqual(["p-1-2"]);
        expect(line(onA, "highlight-row")!.points).toEqual(data.net[1]);
        expect(line(onA, "b-highlight-row")).toBeUndefined();
    });
});

describe("the cross-boundary derivative arrows", () => {
    it("start at the boundary points of v = joinV and carry S_{A,u}(1, v) and S_{B,u}(0, v), evaluated independently", () => {
        const data = joined("c1");
        const arrows = joinArrows(data.net, data.netB, 0.4);
        const expectedA = derivativeU(data.net, 1, 0.4), expectedB = derivativeU(data.netB, 0, 0.4);
        arrows.derivativeA.forEach((value, c) => expect(value).toBeCloseTo(expectedA[c], 10));
        arrows.derivativeB.forEach((value, c) => expect(value).toBeCloseTo(expectedB[c], 10));
        const scene = buildJoinScene(data, 1);
        expect(line(scene, "join-su-a-shaft")!.role).toBe("vector-u");
        expect(line(scene, "join-su-b-shaft")!.role).toBe("vector-v");
        expect(line(scene, "join-su-a-shaft")!.points[0]).toEqual(arrows.pointA);
        // The boundary point is on A's net-derived curve: sum of the last row with Bernstein weights.
        const last = data.net[3];
        [0, 1, 2].forEach(c => expect(arrows.pointA[c]).toBeCloseTo(last.reduce((sum, p, j) => sum + bernstein(3, j, 0.4) * p[c], 0), 10));
        expect(scene.labels.filter(label => label.id.startsWith("join-su")).map(label => label.text)).toEqual(["S_{A,u}", "S_{B,u}"]);
        expect(line(scene, "join-su-a-head-0")).toBeDefined();
        expect(line(scene, "join-su-a-head-1")).toBeDefined();
    });
    it("draw equal for C1", () => {
        const scene = buildJoinScene(joined("c1"), 1);
        const a = shaft(scene, "join-su-a"), b = shaft(scene, "join-su-b");
        a.forEach((value, c) => expect(value).toBeCloseTo(b[c], 10));
    });
    it("draw in the ratio alpha for G1, both at one common factor", () => {
        for (const alpha of [0.5, 2, 3.5]) {
            const data = joined("g1", alpha);
            const arrows = joinArrows(data.net, data.netB, 0.4);
            const trueA = derivativeU(data.net, 1, 0.4), trueB = derivativeU(data.netB, 0, 0.4);
            // The independent check on the geometry: S_{B,u} = alpha S_{A,u} at every v.
            trueB.forEach((value, c) => expect(value).toBeCloseTo(alpha * trueA[c], 9));
            const scene = buildJoinScene(data, 1);
            const a = shaft(scene, "join-su-a"), b = shaft(scene, "join-su-b");
            b.forEach((value, c) => expect(value).toBeCloseTo(alpha * a[c], 9));
            expect(len(b) / len(a)).toBeCloseTo(alpha, 9);
            // One factor: each drawn arrow is its true derivative times drawScale, and the longer true vector has the display length.
            a.forEach((value, c) => expect(value).toBeCloseTo(trueA[c] * arrows.drawScale, 9));
            b.forEach((value, c) => expect(value).toBeCloseTo(trueB[c] * arrows.drawScale, 9));
            expect(Math.max(len(a), len(b))).toBeCloseTo(0.25 * Math.hypot(...[0, 1, 2].map(c => {
                const values = [...data.net, ...data.netB].flat().map(p => p[c]);
                return Math.max(...values) - Math.min(...values);
            })), 9);
        }
    });
    it("differ for a join that is only C0", () => {
        const data = joined("c0");
        const arrows = joinArrows(data.net, data.netB, 0.4);
        expect(len([0, 1, 2].map(c => arrows.derivativeB[c] - arrows.derivativeA[c]) as Xyz)).toBeGreaterThan(0.1);
    });
    it("follow joinV", () => {
        const data = joined("c1");
        const at = (joinV: number) => line(buildJoinScene({...data, joinV}, 1), "join-su-a-shaft")!.points[0];
        expect(at(0.1)).not.toEqual(at(0.9));
        expect(at(0)).toEqual(data.net[3][0]);
        expect(at(1)).toEqual(data.net[3][3]);
    });
    it("are omitted where both derivatives vanish, and the vanishing one only when just one does", () => {
        const flatA: Xyz[][] = [[[0, 0, 0], [0, 1, 0]], [[0, 0, 0], [0, 1, 0]]];
        const flatB: Xyz[][] = [[[0, 0, 0], [0, 1, 0]], [[0, 0, 0], [0, 1, 0]]];
        const none = buildJoinScene(input(flatA, flatB), 1);
        expect(none.polylines.filter(item => item.id.startsWith("join-su"))).toEqual([]);
        expect(none.labels.filter(item => item.id.startsWith("join-su"))).toEqual([]);
        expect(joinArrows(flatA, flatB, 0.5).drawScale).toBe(0);
        const oneSided = buildJoinScene(input(flatA, [[[0, 0, 0], [0, 1, 0]], [[1, 0, 0], [1, 1, 0]]]), 1);
        expect(line(oneSided, "join-su-a-shaft")).toBeUndefined();
        expect(line(oneSided, "join-su-b-shaft")).toBeDefined();
    });
});
