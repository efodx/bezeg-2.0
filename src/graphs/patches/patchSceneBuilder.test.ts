import {defaultPatchPresets} from "./patchPresetCollections";
import {bernstein, patchBernsteinWeight} from "./patchBernstein";
import {buildTensorScene, CURVE_SAMPLES, parsePatchPointId, patchPointId, TensorSceneInput} from "./patchSceneBuilder";
import type {SurfaceCamera, Xyz} from "./surface-view/surfaceScene";
import {assertFiniteScene} from "./surface-view/surfaceScene";

const camera: SurfaceCamera = {az: 0, el: 0.5, distance: 8, projection: "perspective", target: [0, 0, 0]};
const saddleNet: Xyz[][] = [[[-1, -1, 1], [-1, 1, -1]], [[1, -1, -1], [1, 1, 1]]];
const input = (over: Partial<TensorSceneInput> = {}): TensorSceneInput => ({
    net: saddleNet, u: 0.25, v: 0.75, camera, showControlNet: true, showIsoCurves: true, showBoundaryCurves: true, showShading: true,
    isoDensity: 8, shadingDensity: 8, zMode: false, ...over,
});
const ids = (scene: ReturnType<typeof buildTensorScene>, prefix: string) => scene.polylines.filter(p => p.id.startsWith(prefix)).length;

describe("buildTensorScene", () => {
    it("passes the revision through and produces a finite scene", () => {
        const scene = buildTensorScene(input(), 7);
        expect(scene.revision).toBe(7);
        assertFiniteScene(scene);
    });
    it("places the evaluated marker at S(u,v) exactly (bilinear saddle z = x*y)", () => {
        const scene = buildTensorScene(input(), 1);
        // x = 2u - 1 = -0.5, y = 2v - 1 = 0.5 so z = -0.25
        expect(scene.markers).toEqual([{id: "evaluated", xyz: [-0.5, 0.5, -0.25].map(c => expect.closeTo(c, 12)), role: "evaluated"}]);
        expect(scene.labels).toEqual([{id: "surface-point", text: "S(u,v)", anchor: scene.markers[0].xyz}]);
    });
    it("emits control points p-i-j in net order with net rows and columns", () => {
        const scene = buildTensorScene(input(), 1);
        expect(scene.points.map(p => p.id)).toEqual(["p-0-0", "p-0-1", "p-1-0", "p-1-1"]);
        expect(scene.points[2].xyz).toEqual([1, -1, -1]);
        expect(ids(scene, "net-row-")).toBe(2);
        expect(ids(scene, "net-col-")).toBe(2);
        expect(scene.polylines.find(p => p.id === "net-col-1")?.points).toEqual([[-1, 1, -1], [1, 1, 1]]);
        expect(patchPointId(2, 3)).toBe("p-2-3");
        expect(parsePatchPointId("p-2-3")).toEqual([2, 3]);
        expect(parsePatchPointId("x-2-3")).toBeUndefined();
    });
    it("has density+1 iso curves per family, four boundary curves through the corners", () => {
        for (const density of [8, 16] as const) {
            const scene = buildTensorScene(input({isoDensity: density}), 1);
            expect(ids(scene, "iso-u-")).toBe(density + 1);
            expect(ids(scene, "iso-v-")).toBe(density + 1);
        }
        const scene = buildTensorScene(input(), 1);
        const boundary = scene.polylines.filter(p => p.role === "boundary");
        expect(boundary).toHaveLength(4);
        const ends = boundary.map(p => [p.points[0], p.points[CURVE_SAMPLES]]);
        expect(ends).toContainEqual([[-1, -1, 1], [-1, 1, -1]]); // u = 0 edge
        expect(ends).toContainEqual([[-1, -1, 1], [1, -1, -1]]); // v = 0 edge
        // The iso curve at index 4 of 8 is u = 0.5; its middle sample is S(0.5, 0.5) = (0, 0, 0)
        const mid = scene.polylines.find(p => p.id === "iso-u-4")!.points[CURVE_SAMPLES / 2];
        expect(mid.map(Math.abs)).toEqual([0, 0, 0].map(c => expect.closeTo(c, 12)));
    });
    it("builds the mesh from the shading density and hides what the switches turn off", () => {
        const eight = buildTensorScene(input(), 1).mesh!;
        expect(eight.positions.length / 3).toBe(81);
        expect(eight.faces.length / 3).toBe(2 * 8 * 8);
        expect(buildTensorScene(input({shadingDensity: 16}), 1).mesh!.positions.length / 3).toBe(17 * 17);
        const off = buildTensorScene(input({showShading: false, showIsoCurves: false, showBoundaryCurves: false, showControlNet: false}), 1);
        expect(off.mesh).toBeUndefined();
        expect(off.polylines).toEqual([]);
        expect(off.points).toEqual([]);
        expect(off.interaction.editable).toBe(false);
    });
    it("marks the selected point and passes zMode and the camera", () => {
        const scene = buildTensorScene(input({selectedPointId: "p-1-0", zMode: true}), 1);
        expect(scene.points.filter(p => p.selected).map(p => p.id)).toEqual(["p-1-0"]);
        expect(scene.interaction).toEqual({zMode: true, editable: true});
        expect(scene.camera).toEqual(camera);
    });
    it("builds the default bicubic dome with a raised centre", () => {
        const dto = defaultPatchPresets[1].data()[0][1];
        const net: Xyz[][] = Array.from({length: 4}, (_, i) => dto.net.slice(i * 4, i * 4 + 4).map(p => [...p] as Xyz));
        const scene = buildTensorScene(input({net, u: 0.5, v: 0.5}), 1);
        expect(scene.points).toHaveLength(16);
        expect(scene.markers[0].xyz[2]).toBeGreaterThan(1);
    });
    it("highlights the row and column of the selected point with the net's own points", () => {
        // net[i][j]: row i holds b_i0..b_in, column j holds b_0j..b_mj.
        const net: Xyz[][] = [[[0, 0, 0], [0, 1, 0], [0, 2, 0]], [[1, 0, 0], [1, 1, 5], [1, 2, 0]]];
        const scene = buildTensorScene(input({net, selectedPointId: "p-1-2"}), 1);
        const highlights = scene.polylines.filter(p => p.role === "highlight");
        expect(highlights.map(p => p.id)).toEqual(["highlight-row", "highlight-col"]);
        expect(highlights[0].points).toEqual(net[1]);
        expect(highlights[1].points).toEqual([[0, 2, 0], [1, 2, 0]]);
    });
    it("highlights nothing without a selection, with the net hidden, or for an index the net lacks", () => {
        const count = (over: Partial<TensorSceneInput>) => buildTensorScene(input(over), 1).polylines.filter(p => p.role === "highlight").length;
        expect(count({})).toBe(0);
        expect(count({selectedPointId: "p-0-0", showControlNet: false})).toBe(0);
        expect(count({selectedPointId: "p-2-0"})).toBe(0);
        expect(count({selectedPointId: "p-0-2"})).toBe(0);
        expect(buildTensorScene(input({selectedPointId: "p-2-0"}), 1).points.some(p => p.selected)).toBe(false);
        expect(count({selectedPointId: "p-0-1"})).toBe(2);
    });
});

describe("Bernstein weights", () => {
    it("sum to one over all (i, j) at any (u, v), for every degree pair", () => {
        for (let m = 1; m <= 4; m++) for (let n = 1; n <= 4; n++) for (const [u, v] of [[0, 0], [0.13, 0.9], [0.5, 0.5], [1, 0.37]]) {
            let sum = 0;
            for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) sum += patchBernsteinWeight(m, n, i, j, u, v);
            expect(sum).toBeCloseTo(1, 12);
        }
    });
    it("has exact known values", () => {
        // B_1^3(0.25) = 3 * 0.25 * 0.75^2 = 27/64; B_2^2(0.5) = 1/4
        expect(bernstein(3, 1, 0.25)).toBeCloseTo(27 / 64, 14);
        expect(patchBernsteinWeight(3, 2, 1, 2, 0.25, 0.5)).toBeCloseTo(27 / 256, 14);
        expect(patchBernsteinWeight(1, 1, 0, 1, 0.25, 0.75)).toBeCloseTo(0.75 * 0.75, 14);
    });
    it("reproduces S(u, v) as the weighted sum of the net", () => {
        const net: Xyz[][] = [[[0, 0, 0], [0, 1, 2], [0, 2, 0]], [[1, 0, 1], [1, 1, 5], [1, 2, 1]], [[3, 0, 0], [3, 1, 2], [3, 2, 0]]];
        const [u, v] = [0.3, 0.8];
        const sum: number[] = [0, 0, 0];
        net.forEach((row, i) => row.forEach((p, j) => p.forEach((c, k) => { sum[k] += patchBernsteinWeight(2, 2, i, j, u, v) * c; })));
        const marker = buildTensorScene(input({net, u, v}), 1).markers[0].xyz;
        sum.forEach((c, k) => expect(c).toBeCloseTo(marker[k], 12));
    });
});
