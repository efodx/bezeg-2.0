import {describe, expect, it} from "vitest";
import {coonsBicubicNet, coonsBilinearNet, coonsRuledCNet, coonsRuledDNet} from "../../bezeg/impl/kernels/coons";
import {
    buildCoonsScene, canonicalCoonsPointId, COONS_BOUNDARY_NAMES, coonsInteriorPoints, coonsMismatches, coonsNet, coonsSurfacePoint, defaultCoonsBoundaries,
    moveCoonsPoint, parseCoonsPointId, snapCoonsCorners,
} from "./coonsScene";
import type {SurfaceCamera, Xyz} from "./surface-view/surfaceScene";

const camera: SurfaceCamera = {az: 0, el: 0.5, distance: 10, projection: "perspective", target: [0, 0, 0]};
const input = (over: Partial<Parameters<typeof buildCoonsScene>[0]> = {}) =>
    ({boundaries: defaultCoonsBoundaries(), linkedCorners: true, shown: "s" as const, showControlNet: true, showShading: true, camera, zMode: false, ...over});
const close = (a: readonly number[], b: readonly number[], digits = 12) => {
    expect(a).toHaveLength(b.length);
    a.forEach((x, k) => expect(x).toBeCloseTo(b[k], digits));
};

describe("default example", () => {
    it("has the interior net and centre of the spec", () => {
        const b = defaultCoonsBoundaries();
        const interior = coonsInteriorPoints(b);
        expect(interior.map(p => `${p.i}${p.j}`)).toEqual(["11", "12", "21", "22"]);
        close(interior[0].xyz, [1, 1, 4 / 3]);
        close(interior[1].xyz, [1, 2, 1 / 3]);
        close(interior[2].xyz, [2, 1, 5 / 3]);
        close(interior[3].xyz, [2, 2, 2 / 3]);
        close(coonsSurfacePoint(b, "s", 0.5, 0.5), [1.5, 1.5, 0.75]);
        expect(coonsMismatches(b)).toEqual([]);
    });

    it("builds the net of each shown surface from the kernel", () => {
        const b = defaultCoonsBoundaries();
        expect(coonsNet(b, "s")).toEqual(coonsBicubicNet(b));
        expect(coonsNet(b, "lc")).toEqual(coonsRuledCNet(b));
        expect(coonsNet(b, "ld")).toEqual(coonsRuledDNet(b));
        expect(coonsNet(b, "b")).toEqual(coonsBilinearNet(b));
    });
});

describe("scene", () => {
    it("has a non-empty mesh with one owner, the four boundaries and 12 linked points", () => {
        const scene = buildCoonsScene(input(), 3);
        expect(scene.revision).toBe(3);
        expect(scene.mesh!.faces.length).toBeGreaterThan(0);
        expect(scene.mesh!.positions.length).toBe(3 * 17 * 17);
        expect(scene.meshOwners).toHaveLength(1);
        expect(scene.points).toHaveLength(12);
        for (const name of COONS_BOUNDARY_NAMES) expect(scene.polylines.some(line => line.id === `boundary-${name}` && line.role === "boundary")).toBe(true);
        expect(scene.interaction.editable).toBe(true);
    });

    it("draws 16 points when the corners are not linked and none of the shared twins when linked", () => {
        expect(buildCoonsScene(input({linkedCorners: false}), 1).points).toHaveLength(16);
        const ids = buildCoonsScene(input(), 1).points.map(p => p.id);
        for (const twin of ["d0-0", "d1-0", "d0-3", "d1-3"]) expect(ids).not.toContain(twin);
    });

    it("keeps the control net on demand and draws the boundary curves and points either way", () => {
        const off = buildCoonsScene(input({showControlNet: false}), 1);
        expect(off.polylines.some(line => line.role === "net")).toBe(false);
        expect(off.polylines.filter(line => line.role === "boundary")).toHaveLength(4);
        expect(off.points).toHaveLength(12);
        expect(buildCoonsScene(input(), 1).polylines.filter(line => line.role === "net")).toHaveLength(8);
    });

    it("has no mesh when shading is off", () => {
        const scene = buildCoonsScene(input({showShading: false}), 1);
        expect(scene.mesh).toBeUndefined();
        expect(scene.meshOwners).toBeUndefined();
    });

    it("the mesh boundary rows equal the boundary curves when corners coincide", () => {
        const scene = buildCoonsScene(input(), 1);
        const positions = Array.from(scene.mesh!.positions);
        const vertex = (i: number, j: number): Xyz => [0, 1, 2].map(k => positions[3 * (i * 17 + j) + k]) as Xyz;
        const edge = (name: string) => scene.polylines.find(line => line.id === `boundary-${name}`)!.points;
        // vertex(i, j) is S(i/16, j/16); the boundary polylines have 33 samples.
        for (let k = 0; k <= 16; k++) {
            close(vertex(k, 0), edge("c0")[2 * k], 6);
            close(vertex(k, 16), edge("c1")[2 * k], 6);
            close(vertex(0, k), edge("d0")[2 * k], 6);
            close(vertex(16, k), edge("d1")[2 * k], 6);
        }
    });

    it("highlights the canonical point of a linked corner and the selection label", () => {
        const scene = buildCoonsScene(input({selectedPointId: "d1-3"}), 1);
        expect(scene.points.filter(p => p.selected).map(p => p.id)).toEqual(["c1-3"]);
        expect(scene.labels[0].pointId).toBe("c1-3");
        expect(canonicalCoonsPointId("d1-3", false)).toBe("d1-3");
        expect(canonicalCoonsPointId("c0-1", true)).toBe("c0-1");
    });
});

describe("editing", () => {
    it("moves both end points of a linked corner and one of an unlinked", () => {
        const b = defaultCoonsBoundaries();
        const linked = moveCoonsPoint(b, true, "d1", 3, [4, 4, 1]);
        expect(linked.d1[3]).toEqual([4, 4, 1]);
        expect(linked.c1[3]).toEqual([4, 4, 1]);
        expect(coonsMismatches(linked)).toEqual([]);
        const unlinked = moveCoonsPoint(b, false, "d1", 3, [4, 4, 1]);
        expect(unlinked.c1[3]).toEqual([3, 3, 0]);
        expect(coonsMismatches(unlinked).map(m => m.corner)).toEqual(["u1v1"]);
        expect(b.d1[3]).toEqual([3, 3, 0]);
    });

    it("moving an interior control point never moves another point", () => {
        const moved = moveCoonsPoint(defaultCoonsBoundaries(), true, "c0", 1, [1, 0, 5]);
        expect(moved.c0[1]).toEqual([1, 0, 5]);
        expect(moved.c0[0]).toEqual([0, 0, 0]);
    });

    it("snaps each corner pair to its average", () => {
        const broken = moveCoonsPoint(defaultCoonsBoundaries(), false, "d1", 3, [4, 5, 2]);
        const snapped = snapCoonsCorners(broken);
        expect(snapped.d1[3]).toEqual([3.5, 4, 1]);
        expect(snapped.c1[3]).toEqual([3.5, 4, 1]);
        expect(coonsMismatches(snapped)).toEqual([]);
        expect(broken.c1[3]).toEqual([3, 3, 0]);
    });

    it("parses only boundary point ids", () => {
        expect(parseCoonsPointId("d1-2")).toEqual(["d1", 2]);
        for (const id of ["p-1-1", "c2-0", "c0-4", "c0-", "xc0-1"]) expect(parseCoonsPointId(id)).toBeUndefined();
    });
});
