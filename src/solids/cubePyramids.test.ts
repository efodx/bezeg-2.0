import {describe, expect, it} from "vitest";
import {cubePyramids, CUBE_PYRAMID_NORMALS} from "./cubePyramids";
import {faceNormal, isClosed, realCoords, vertexCount, type Solid, type Vec3} from "./solid";
import {meshVolume} from "./volume";

const vertexSet = (solid: Solid, map: (v: Vec3) => Vec3 = v => v): string[] => {
    const out: string[] = [];
    for (let i = 0; i < vertexCount(solid); i++) out.push(map(realCoords(solid, i)).map(c => c.toFixed(9)).join(","));
    return out.sort();
};

/** Strictly inside a convex mesh with outward faces; `undefined` when the point lies on a face plane (shared faces are excluded by the caller). */
const side = (solid: Solid, p: Vec3): "inside" | "outside" | "on" => {
    let on = false;
    for (const face of solid.faces) {
        const n = faceNormal(solid, face);
        const v0 = realCoords(solid, face[0]);
        const d = n[0] * (p[0] - v0[0]) + n[1] * (p[1] - v0[1]) + n[2] * (p[2] - v0[2]);
        if (Math.abs(d) < 1e-9) on = true;
        else if (d > 0) return "outside";
    }
    return on ? "on" : "inside";
};

describe("cubePyramids (SV4)", () => {
    const pyramids = cubePyramids();

    it("returns three closed solids with outward faces", () => {
        expect(pyramids).toHaveLength(3);
        for (const solid of pyramids) {
            expect(isClosed(solid)).toBe(true);
            expect(meshVolume(solid)).toBeGreaterThan(0);
        }
    });

    it("each pyramid has volume 1/3 and the three add up to the unit cube", () => {
        const volumes = pyramids.map(meshVolume);
        for (const v of volumes) expect(Math.abs(v - 1 / 3)).toBeLessThan(1e-12);
        expect(Math.abs(volumes[0] + volumes[1] + volumes[2] - 1)).toBeLessThan(1e-12);
    });

    it("has the common apex (1,1,1) and the unit squares of x = 0, y = 0, z = 0 as bases", () => {
        pyramids.forEach((solid, axis) => {
            const set = vertexSet(solid);
            expect(set).toContain("1.000000000,1.000000000,1.000000000");
            const base = set.filter(s => s.split(",")[axis] === "0.000000000");
            expect(base).toHaveLength(4);
            expect(set).toHaveLength(5);
        });
    });

    it("are congruent: a coordinate permutation maps one onto the next", () => {
        const cycle = (v: Vec3): Vec3 => [v[2], v[0], v[1]];
        expect(vertexSet(pyramids[1])).toEqual(vertexSet(pyramids[0], cycle));
        expect(vertexSet(pyramids[2])).toEqual(vertexSet(pyramids[1], cycle));
        expect(vertexSet(pyramids[0])).toEqual(vertexSet(pyramids[2], cycle));
    });

    it("names the outward normals of the three bases", () => {
        expect(CUBE_PYRAMID_NORMALS).toEqual([[-1, 0, 0], [0, -1, 0], [0, 0, -1]]);
    });

    it("have disjoint interiors that fill the open cube: every off-face grid point lies in exactly one", () => {
        const n = 12;
        let counted = 0;
        for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) for (let k = 1; k < n; k++) {
            const p: Vec3 = [i / n + 0.0013, j / n + 0.0029, k / n + 0.0041];
            const states = pyramids.map(s => side(s, p));
            if (states.includes("on")) continue;
            counted++;
            expect(states.filter(s => s === "inside")).toHaveLength(1);
        }
        expect(counted).toBeGreaterThan(1000);
    });

    it("a point outside the cube lies in none", () => {
        for (const solid of pyramids) expect(side(solid, [1.5, 0.5, 0.5])).toBe("outside");
    });
});
