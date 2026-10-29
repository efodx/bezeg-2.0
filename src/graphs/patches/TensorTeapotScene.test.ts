import {buildTeapotScene, TEAPOT_SHADING_CELLS} from "./TensorTeapotScene";
import {patchFromNet} from "./patchSceneBuilder";
import {resolveTeapotPatch, TEAPOT_PATCH_COUNT, teapotControlPoints, teapotPatches, teapotVertices} from "./teapot/utahTeapot";
import type {Xyz} from "./surface-view/surfaceScene";

const camera = {az: 0, el: 0.4, distance: 8, projection: "perspective" as const, target: [0, 0, 0] as Xyz};
const boundaries = (patch: Xyz[][]) => [
    ["u0", patch[0]], ["u1", patch[3]], ["v0", patch.map(row => row[0])], ["v1", patch.map(row => row[3])],
] as const;
const rowKey = (points: readonly Xyz[]) => {
    const forward = JSON.stringify(points), reverse = JSON.stringify([...points].reverse());
    return forward < reverse ? forward : reverse;
};
const distance = (a: Xyz, b: Xyz) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("Utah teapot source fixture", () => {
    it("retains the pinned 32-patch table, raw source extents, point ordering and tensor corners", () => {
        expect(TEAPOT_PATCH_COUNT).toBe(32);
        expect(teapotPatches).toHaveLength(512);
        expect(Math.min(...teapotPatches)).toBe(0);
        expect(Math.max(...teapotPatches)).toBe(289);
        expect(teapotVertices).toHaveLength(870);
        expect(teapotVertices.every(Number.isFinite)).toBe(true);
        const controls = teapotControlPoints();
        expect(controls).toHaveLength(32 * 16);
        expect(controls[0]).toEqual([1.4, 0, 2.4]);
        expect([teapotVertices[867], teapotVertices[868], teapotVertices[869]]).toEqual([1.5, -0.84, 0.075]);
        expect([Math.min(...controls.map(p => p[0])), Math.max(...controls.map(p => p[0]))]).toEqual([-3, 3.525]);
        expect([Math.min(...controls.map(p => p[1])), Math.max(...controls.map(p => p[1]))]).toEqual([-2, 2]);
        expect([Math.min(...controls.map(p => p[2])), Math.max(...controls.map(p => p[2]))]).toEqual([0, 3.15]);
        const patch = patchFromNet(resolveTeapotPatch(0));
        const at = (u: number, v: number): Xyz => { const p = patch.eval(u, v); return [p.X(), p.Y(), p.Z() ?? 0]; };
        expect(at(0, 0)).toEqual([1.4, 0, 2.4]);
        expect(at(1, 0)).toEqual(resolveTeapotPatch(0)[3][0]);
        expect(at(0, 1)).toEqual(resolveTeapotPatch(0)[0][3]);
        expect(at(1, 1)).toEqual(resolveTeapotPatch(0)[3][3]);
        expect(() => resolveTeapotPatch(32)).toThrow(RangeError);
    });

    it("checks exact shared control boundaries and their sampled curves, including the cusp groups", () => {
        const groups = new Map<string, string[]>();
        for (let k = 0; k < TEAPOT_PATCH_COUNT; k++) for (const [edge, row] of boundaries(resolveTeapotPatch(k))) {
            const id = `${k}-${edge}`, key = rowKey(row);
            groups.set(key, [...(groups.get(key) ?? []), id]);
        }
        const sharedGroups = [...groups.values()].filter(ids => ids.length > 1);
        const unshared = [...groups.values()].filter(ids => ids.length === 1).flat();
        expect(sharedGroups.filter(ids => ids.length === 2)).toHaveLength(52);
        expect(sharedGroups.filter(ids => ids.length === 4)).toHaveLength(2); // collapsed lid and bottom cusp rows
        expect(sharedGroups.flatMap(ids => ids.flatMap((id, i) => ids.slice(i + 1).map(other => [id, other])))).toHaveLength(64);
        expect(unshared).toHaveLength(16);
        expect(unshared.sort()).toEqual([
            "0-u0", "1-u0", "12-u0", "13-u0", "14-u1", "15-u1", "16-u0", "17-u0", "18-u1", "19-u1", "2-u0",
            "24-u1", "25-u1", "26-u1", "27-u1", "3-u0",
        ]);

        const scene = buildTeapotScene({camera, showBoundaryCurves: true, showShading: false}, 4);
        const lines = new Map(scene.polylines.map(line => [line.id.replace(/^patch-/, "").replace("-boundary-", "-"), line.points]));
        let compared = 0;
        for (const ids of sharedGroups) for (let i = 0; i < ids.length; i++) for (const other of ids.slice(i + 1)) {
            const a = lines.get(ids[i])!, b = lines.get(other)!;
            expect(a).toHaveLength(33);
            const direct = a.every((p, j) => distance(p, b[j]) <= 1e-12);
            const reversed = a.every((p, j) => distance(p, b[b.length - 1 - j]) <= 1e-12);
            expect(direct || reversed).toBe(true);
            compared++;
        }
        expect(compared).toBe(64);

        const shaded = buildTeapotScene({camera, showBoundaryCurves: true, showShading: true}, 5);
        const positions = shaded.mesh?.positions;
        expect(positions).toBeDefined();
        expect(positions!.length).toBe(TEAPOT_PATCH_COUNT * 9 * 9 * 3);
        expect(positions!.length).toBeGreaterThan(0);
        const positionAt = (patchIndex: number, localVertex: number): Xyz => {
            const offset = (patchIndex * 9 * 9 + localVertex) * 3;
            return [positions![offset], positions![offset + 1], positions![offset + 2]];
        };
        const meshBoundary = (id: string): Xyz[] => {
            const match = /^(\d+)-(u0|u1|v0|v1)$/.exec(id);
            if (!match) throw new Error(`Invalid teapot boundary ID: ${id}`);
            const patchIndex = Number(match[1]), edge = match[2];
            const localIndices = edge.startsWith("u")
                ? Array.from({length: 9}, (_, j) => (edge === "u0" ? 0 : 8) * 9 + j)
                : Array.from({length: 9}, (_, i) => i * 9 + (edge === "v0" ? 0 : 8));
            return localIndices.map(index => positionAt(patchIndex, index));
        };
        let meshPairs = 0;
        for (const ids of sharedGroups) for (let i = 0; i < ids.length; i++) for (const other of ids.slice(i + 1)) {
            const a = meshBoundary(ids[i]), b = meshBoundary(other);
            expect(a).toHaveLength(9);
            expect(b).toHaveLength(9);
            const direct = a.every((p, j) => distance(p, b[j]) <= 1e-12);
            const reversed = a.every((p, j) => distance(p, b[b.length - 1 - j]) <= 1e-12);
            expect(direct || reversed).toBe(true);
            meshPairs++;
        }
        expect(meshPairs).toBe(64);
    });
});

describe("read-only capstone scene", () => {
    it("keeps all 32 mesh owners, filters only cusp faces and omits editor geometry", () => {
        const scene = buildTeapotScene({camera, showBoundaryCurves: true, showShading: true}, 9);
        expect(scene.revision).toBe(9);
        expect(scene.points).toEqual([]);
        expect(scene.markers).toEqual([]);
        expect(scene.labels).toEqual([]);
        expect(scene.polylines).toHaveLength(32 * 4);
        expect(scene.polylines.every(line => line.role === "boundary")).toBe(true);
        expect(scene.mesh?.positions).toHaveLength(32 * (TEAPOT_SHADING_CELLS + 1) ** 2 * 3);
        expect(scene.mesh?.faces).toHaveLength((32 * 2 * TEAPOT_SHADING_CELLS ** 2 - 64) * 3);
        expect(scene.meshOwners).toHaveLength(32);
        expect(scene.meshOwners?.map(owner => owner.id)).toEqual(Array.from({length: 32}, (_, k) => `teapot-patch-${k}`));
        expect(scene.meshOwners?.every(owner => owner.kind === "teapot" && owner.faceCount > 0 && owner.faceCount % 3 === 0)).toBe(true);
        expect(scene.meshOwners?.[0].faceStart).toBe(0);
        expect(scene.meshOwners?.slice(1).every((owner, index) => owner.faceStart === scene.meshOwners![index].faceStart + scene.meshOwners![index].faceCount)).toBe(true);
        expect(scene.interaction).toMatchObject({editable: false, zMode: false});
        expect(scene.mesh?.visible).toBe(true);
    });
});
