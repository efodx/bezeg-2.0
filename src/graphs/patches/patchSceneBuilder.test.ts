import {defaultPatchPresets} from "./patchPresetCollections";
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
});
