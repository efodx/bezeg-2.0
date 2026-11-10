/**
 * Solid mesh: vertices, polygon faces (outward, counter-clockwise seen from outside), builders and
 * the tested properties `isClosed` and `isConvex`.
 *
 * Coordinates. An `Int32Array` holds grid coordinates in units of 1/4 (range -12..12), so the unit
 * cube spans 0..4. A `Float64Array` holds computed coordinates in real units (for example the
 * output of `clipSolid`). Use `realCoords` to read either in real units. Section decisions only
 * accept the grid form (ADR 0051 section 2).
 */

import {REVOLVE_K, revolve} from "./revolve";

export type Vec3 = readonly [number, number, number];

export interface Solid {
    /** Flat x,y,z triples: `Int32Array` grid units of 1/4, or `Float64Array` real units. */
    readonly vertices: Int32Array | Float64Array;
    /** Polygon faces as vertex indices, outward and counter-clockwise seen from outside. */
    readonly faces: ReadonlyArray<ReadonlyArray<number>>;
}

export const GRID_UNITS_PER_ONE = 4;
export const GRID_LIMIT = 12;

export function vertexCount(solid: Solid): number {
    return solid.vertices.length / 3;
}

export function isGridSolid(solid: Solid): boolean {
    return solid.vertices instanceof Int32Array;
}

/** Vertex i in real units (grid coordinates divided by 4 for a grid solid). */
export function realCoords(solid: Solid, i: number): Vec3 {
    const k = isGridSolid(solid) ? 1 / GRID_UNITS_PER_ONE : 1;
    const v = solid.vertices;
    return [v[3 * i] * k, v[3 * i + 1] * k, v[3 * i + 2] * k];
}

/** Throws when a vertex is not an integer in -12..12, so off-grid solids cannot enter a section. */
export function assertGridSolid(solid: Solid): void {
    if (!isGridSolid(solid)) {
        throw new RangeError("Section needs an Int32Array grid solid (units of 1/4)");
    }
    for (const c of solid.vertices) {
        if (c < -GRID_LIMIT || c > GRID_LIMIT) {
            throw new RangeError(`Grid coordinate ${c} is outside -${GRID_LIMIT}..${GRID_LIMIT}`);
        }
    }
}

/** Builds a grid solid from integer grid coordinates (units of 1/4), rejecting off-grid input. */
export function gridSolid(vertices: ReadonlyArray<readonly [number, number, number]>, faces: ReadonlyArray<ReadonlyArray<number>>): Solid {
    const flat = new Int32Array(vertices.length * 3);
    vertices.forEach((v, i) => {
        for (let k = 0; k < 3; k++) {
            if (!Number.isInteger(v[k]) || v[k] < -GRID_LIMIT || v[k] > GRID_LIMIT) {
                throw new RangeError(`Vertex ${i} coordinate ${v[k]} is not an integer in -${GRID_LIMIT}..${GRID_LIMIT}`);
            }
            flat[3 * i + k] = v[k];
        }
    });
    return {vertices: flat, faces: faces.map(f => [...f])};
}

/** The unit cube [0,1]^3: vertex index is x + 2y + 4z with each bit a coordinate 0 or 1. */
export function cube(): Solid {
    const g = GRID_UNITS_PER_ONE;
    const verts: Array<[number, number, number]> = [];
    for (let i = 0; i < 8; i++) {
        verts.push([(i & 1) * g, ((i >> 1) & 1) * g, ((i >> 2) & 1) * g]);
    }
    return gridSolid(verts, [
        [0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5],
    ]);
}

function assertBase(base: ReadonlyArray<readonly [number, number]>): void {
    if (base.length < 3) {
        throw new RangeError("A base polygon needs at least three corners");
    }
}

/** Right prism on a counter-clockwise base polygon (grid x,y), from grid height z0 to z1 > z0. */
export function prism(base: ReadonlyArray<readonly [number, number]>, z0: number, z1: number): Solid {
    assertBase(base);
    if (!(z1 > z0)) {
        throw new RangeError("Prism needs z1 > z0");
    }
    const n = base.length;
    const verts = [...base.map(p => [p[0], p[1], z0] as [number, number, number]),
        ...base.map(p => [p[0], p[1], z1] as [number, number, number])];
    const faces: number[][] = [base.map((_, i) => n - 1 - i), base.map((_, i) => n + i)];
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push([i, j, n + j, n + i]);
    }
    return gridSolid(verts, faces);
}

/** Pyramid on a counter-clockwise base polygon at grid height z0 with the given grid apex. */
export function pyramid(base: ReadonlyArray<readonly [number, number]>, z0: number, apex: readonly [number, number, number]): Solid {
    assertBase(base);
    if (!(apex[2] > z0)) {
        throw new RangeError("Pyramid apex must lie above the base");
    }
    const n = base.length;
    const verts = [...base.map(p => [p[0], p[1], z0] as [number, number, number]), [apex[0], apex[1], apex[2]] as [number, number, number]];
    const faces: number[][] = [base.map((_, i) => n - 1 - i)];
    for (let i = 0; i < n; i++) {
        faces.push([i, (i + 1) % n, n]);
    }
    return gridSolid(verts, faces);
}

/** Fan triangulation for `SceneMesh`: positions in real units and index triples. */
export function toTriangles(solid: Solid): {positions: Float64Array; triangles: number[]} {
    const n = vertexCount(solid);
    const positions = new Float64Array(3 * n);
    for (let i = 0; i < n; i++) {
        positions.set(realCoords(solid, i), 3 * i);
    }
    const triangles: number[] = [];
    for (const f of solid.faces) {
        for (let k = 1; k + 1 < f.length; k++) {
            triangles.push(f[0], f[k], f[k + 1]);
        }
    }
    return {positions, triangles};
}

/**
 * Every edge is used by exactly two faces, once in each direction, indices are valid and no face
 * repeats a vertex. An empty solid (no faces) is closed.
 */
export function isClosed(solid: Solid): boolean {
    const n = vertexCount(solid);
    const directed = new Map<number, number>();
    for (const f of solid.faces) {
        if (f.length < 3 || new Set(f).size !== f.length) {
            return false;
        }
        for (let i = 0; i < f.length; i++) {
            const a = f[i];
            const b = f[(i + 1) % f.length];
            if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a >= n || b >= n) {
                return false;
            }
            const key = a * n + b;
            if (directed.has(key)) {
                return false;
            }
            directed.set(key, 1);
        }
    }
    for (const key of directed.keys()) {
        const a = Math.floor(key / n);
        const b = key % n;
        if (!directed.has(b * n + a)) {
            return false;
        }
    }
    return true;
}

/** Newell normal of a face on raw (stored) coordinates; exact for grid solids. */
export function faceNormal(solid: Solid, face: ReadonlyArray<number>): Vec3 {
    const v = solid.vertices;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < face.length; i++) {
        const a = 3 * face[i];
        const b = 3 * face[(i + 1) % face.length];
        x += (v[a + 1] - v[b + 1]) * (v[a + 2] + v[b + 2]);
        y += (v[a + 2] - v[b + 2]) * (v[a] + v[b]);
        z += (v[a] - v[b]) * (v[a + 1] + v[b + 1]);
    }
    return [x, y, z];
}

/**
 * Convex with outward faces: every face is planar with a nonzero normal and no vertex lies strictly
 * on its outer side. Exact for grid solids; for computed (float) solids a relative tolerance of
 * 1e-9 absorbs rounding. Not used for any section decision.
 */
export function isConvex(solid: Solid): boolean {
    const v = solid.vertices;
    const n = vertexCount(solid);
    const tol = isGridSolid(solid) ? 0 : 1e-9;
    for (const f of solid.faces) {
        const [nx, ny, nz] = faceNormal(solid, f);
        const len = Math.hypot(nx, ny, nz);
        if (len === 0) {
            return false;
        }
        const o = 3 * f[0];
        const limit = tol * len;
        for (let i = 0; i < n; i++) {
            const h = nx * (v[3 * i] - v[o]) + ny * (v[3 * i + 1] - v[o + 1]) + nz * (v[3 * i + 2] - v[o + 2]);
            if (h > limit) {
                return false;
            }
        }
        for (const i of f) {
            const h = nx * (v[3 * i] - v[o]) + ny * (v[3 * i + 1] - v[o + 1]) + nz * (v[3 * i + 2] - v[o + 2]);
            if (Math.abs(h) > limit) {
                return false;
            }
        }
    }
    return true;
}

/** Cone with the base disc (radius r) at z = 0 and the apex at z = h, as an inscribed k-gon mesh. */
export function cone(r: number, h: number, k: number = REVOLVE_K): Solid {
    if (!(r > 0) || !(h > 0)) {
        throw new RangeError("Cone needs r > 0 and h > 0");
    }
    return revolve([[0, r], [h, 0]], k, "z");
}
