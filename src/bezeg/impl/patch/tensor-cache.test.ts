import {Point} from "../../api/point/point";
import {PointImpl} from "../point/point-impl";
import {TensorProductBezierPatch} from "./tensor-product-bezier-patch";

const coordinates = (point: Point) => [point.X(), point.Y(), point.Z?.() ?? 0];

function instrumentedPoint(x: number, y: number, reads: {count: number}): Point {
    return {
        X: () => { reads.count++; return x; },
        Y: () => { reads.count++; return y; },
        Z: () => { reads.count++; return 0; },
        setX: () => undefined,
        setY: () => undefined,
        setZ: () => undefined,
        isYFunction: () => false,
        isXFunction: () => false,
        version: () => 1,
    };
}

function cacheMap<K, V>(patch: TensorProductBezierPatch, name: "pointCache" | "meshCache"): Map<K, V> {
    return (patch as unknown as Record<typeof name, Map<K, V>>)[name];
}

function makePatch(reads = {count: 0}) {
    return new TensorProductBezierPatch([
        [instrumentedPoint(0, 0, reads), instrumentedPoint(0, 1, reads)],
        [instrumentedPoint(1, 0, reads), instrumentedPoint(1, 1, reads)],
    ]);
}

describe("tensor patch cache safety", () => {
    it("returns an evaluation value that cannot mutate the cached result", () => {
        const patch = makePatch();
        const first = patch.eval(0.25, 0.75);
        first.setX(900);

        expect(coordinates(patch.eval(0.25, 0.75))).toEqual([0.25, 0.75, 0]);
    });

    it("evicts old evaluation entries after 128 distinct parameter pairs", () => {
        const reads = {count: 0};
        const patch = makePatch(reads);
        for (let i = 0; i <= 128; i++) patch.eval(i / 129, 0.37);
        const afterPopulation = reads.count;

        patch.eval(0, 0.37);

        expect(reads.count).toBeGreaterThan(afterPopulation);
        expect(cacheMap<string, unknown>(patch, "pointCache").size).toBeLessThanOrEqual(128);
    });

    it("evicts old sampled meshes after four different densities", () => {
        const patch = makePatch();
        const meshes = cacheMap<string, unknown>(patch, "meshCache");
        for (let density = 1; density <= 5; density++) patch.sampleMesh(density);

        expect(meshes.size).toBeLessThanOrEqual(4);
        expect(meshes.has("1,1")).toBe(false);
        patch.sampleMesh(1);
        expect(meshes.has("1,1")).toBe(true);
    });

    it("rejects excessive mesh density before reading control coordinates", () => {
        const reads = {count: 0};
        const patch = makePatch(reads);
        const before = reads.count;

        expect(() => patch.sampleMesh(257, 1)).toThrow(RangeError);
        expect(() => patch.sampleMesh(1, 257)).toThrow(RangeError);
        expect(reads.count).toBe(before);
    });

    it("refreshes primed evaluation, mesh, and bounds after replacement and tracked edits", () => {
        const p00 = new PointImpl(0, 0);
        const patch = new TensorProductBezierPatch([
            [p00, instrumentedPoint(0, 1, {count: 0})],
            [instrumentedPoint(1, 0, {count: 0}), instrumentedPoint(1, 1, {count: 0})],
        ]);
        const prime = () => {
            patch.eval(0, 0);
            patch.sampleMesh(2);
            patch.boundingBox();
        };

        prime();
        p00.setX(7);
        expect(coordinates(patch.eval(0, 0))).toEqual([7, 0, 0]);
        expect(coordinates(patch.sampleMesh(2).vertices[0])).toEqual([7, 0, 0]);
        expect(patch.boundingBox()).toEqual([0, 7, 0, 1, 0, 0]);

        prime();
        patch.setControlNet([
            [instrumentedPoint(20, 3, {count: 0}), instrumentedPoint(20, 4, {count: 0})],
            [instrumentedPoint(21, 3, {count: 0}), instrumentedPoint(21, 4, {count: 0})],
        ]);
        expect(coordinates(patch.eval(0, 0))).toEqual([20, 3, 0]);
        expect(coordinates(patch.sampleMesh(2).vertices[0])).toEqual([20, 3, 0]);
        expect(patch.boundingBox()).toEqual([20, 21, 3, 4, 0, 0]);
    });
});
