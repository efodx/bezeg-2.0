/**
 * SV4: the unit cube cut into three congruent pyramids with the common apex (1, 1, 1) and, as bases, the faces x = 0, y = 0 and
 * z = 0 (each of volume 1/3 = B h / 3 with B = h = 1). They are grid solids (the cube spans 0..4 in grid units) with outward faces.
 */

import {gridSolid, type Solid, type Vec3} from "./solid";

const G = 4;

/** The outward normal of each pyramid's base, in the order of `cubePyramids` (the cube's faces x = 0, y = 0, z = 0). */
export const CUBE_PYRAMID_NORMALS: ReadonlyArray<Vec3> = [[-1, 0, 0], [0, -1, 0], [0, 0, -1]];

function pyramidOnFace(axis: 0 | 1 | 2): Solid {
    const [a, b] = ([0, 1, 2] as const).filter(c => c !== axis);
    const base = ([[0, 0], [G, 0], [G, G], [0, G]] as const).map(([u, v]) => {
        const p: [number, number, number] = [0, 0, 0];
        p[a] = u;
        p[b] = v;
        return p;
    });
    const verts: Array<[number, number, number]> = [...base, [G, G, G]];
    const centre = [0, 1, 2].map(c => verts.reduce((sum, v) => sum + v[c], 0) / verts.length);
    const raw: number[][] = [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]];
    // Orient each face outward: its normal must point away from the centroid.
    const faces = raw.map(face => {
        const [p, q, r] = [verts[face[0]], verts[face[1]], verts[face[2]]];
        const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        const w = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
        const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        const out = n[0] * (p[0] - centre[0]) + n[1] * (p[1] - centre[1]) + n[2] * (p[2] - centre[2]);
        return out > 0 ? face : [...face].reverse();
    });
    return gridSolid(verts, faces);
}

/** The three pyramids, with bases in x = 0, y = 0 and z = 0 (in that order); a fresh set on every call. */
export function cubePyramids(): readonly [Solid, Solid, Solid] {
    return [pyramidOnFace(0), pyramidOnFace(1), pyramidOnFace(2)];
}
