import {cone, cube, prism, pyramid, type Solid} from '../../solids/solid';
import {revolve, REVOLVE_K} from '../../solids/revolve';
import {coneVolume, prismVolume, pyramidVolume, sphereVolume} from '../../solids/volume';
import type {SolidId} from '../../solids/solidsModel';

/**
 * The solids of the graph in real units (docs/specs/solids-volumes-lessons.md, SV1 to SV5): their meshes, exact volumes and the
 * profiles of the solids of revolution. Pure data and kernel calls: no React, JSXGraph or localization.
 */

const SQUARE_2 = [[-4, -4], [4, -4], [4, 4], [-4, 4]] as const; // grid units of 1/4: a 2 x 2 square about the origin
const SQUARE_4 = [[-8, -8], [8, -8], [8, 8], [-8, 8]] as const; // 4 x 4

/** The convex grid solids a section is offered for. */
export function gridSolid(id: SolidId): Solid | undefined {
    switch (id) {
        case 'cube': return cube();
        case 'triangular-prism': return prism([[-4, -4], [4, -4], [-4, 4]], -6, 6);
        case 'square-prism': return prism(SQUARE_2, -6, 6);
        case 'square-pyramid': return pyramid(SQUARE_4, -8, [0, 0, 8]);
        default: return undefined;
    }
}

/** Exact volume of a grid solid (the analytic formula, not the mesh). */
export function gridExactVolume(id: SolidId): number | undefined {
    switch (id) {
        case 'cube': return 1;
        case 'triangular-prism': return prismVolume(2, 3);
        case 'square-prism': return prismVolume(4, 3);
        case 'square-pyramid': return pyramidVolume(16, 4);
        default: return undefined;
    }
}

/** A solid of revolution: the graph of `f` over [a, b] turned about the x-axis. */
export interface RevolveProfile {
    readonly a: number;
    readonly b: number;
    readonly f: (x: number) => number;
    /** Segments of the polyline the mesh is built from (at most 63; the kernel allows 64 vertices). */
    readonly segments: number;
    /** pi times the integral of f squared. */
    readonly exact: number;
    /** About the y-axis (the region under f turned about it), for profiles that start on the axis and grow. */
    readonly aboutY?: {
        /** The height f(b) where the washers end. */
        readonly top: number;
        /** The inverse of f: the inner radius of the washer at height y. */
        readonly inner: (y: number) => number;
        /** pi times the integral of (b squared minus inner squared). */
        readonly exact: number;
    };
}

export type RevolveId = 'cone' | 'sqrt' | 'parabola' | 'sphere';

export const REVOLVE_PROFILES: Readonly<Record<RevolveId, RevolveProfile>> = {
    cone: {
        a: 0, b: 4, f: x => 3 * x / 4, segments: 1, exact: coneVolume(3, 4),
        aboutY: {top: 3, inner: y => 4 * y / 3, exact: 32 * Math.PI},
    },
    sqrt: {
        a: 0, b: 4, f: Math.sqrt, segments: 8, exact: 8 * Math.PI,
        aboutY: {top: 2, inner: y => y * y, exact: 128 * Math.PI / 5},
    },
    parabola: {
        a: 0, b: 1, f: x => x * x, segments: 8, exact: Math.PI / 5,
        aboutY: {top: 1, inner: Math.sqrt, exact: Math.PI / 2},
    },
    sphere: {a: -3, b: 3, f: x => Math.sqrt(Math.max(0, 9 - x * x)), segments: 12, exact: sphereVolume(3)},
};

export const isRevolveId = (id: SolidId): id is RevolveId => id === 'cone' || id === 'sqrt' || id === 'parabola' || id === 'sphere';

/** The profile points [x, r] of the mesh; the ends stay exactly where the graph meets the axis. */
export function profilePoints(profile: RevolveProfile): Array<[number, number]> {
    const {a, b, f, segments} = profile;
    return Array.from({length: segments + 1}, (_, i): [number, number] => {
        const x = i === segments ? b : a + (b - a) * i / segments;
        return [x, i === 0 || i === segments ? Math.max(0, f(x)) : f(x)];
    });
}

/**
 * The region under the graph turned about the y-axis is a hollow solid: a cylinder of radius b and height f(b) with the bowl
 * `r = inner(y)` taken out. The kernel's `revolve` needs a profile that grows along the axis, so the solid is built from two
 * calls (`axis: 'y'`): the cylinder and the bowl. Both end in the same ring at height f(b), which is welded; the two discs
 * that lay over each other there are dropped and the bowl's faces are turned around. The mesh is closed, and its signed volume is
 * the cylinder's minus the bowl's.
 *
 * Self-touch: where the bowl reaches the axis (`inner(0) = 0`) the bowl tip touches the centre of the cylinder's bottom disc at one point, and at the top the
 * bowl rim meets the cylinder rim, so the boundary touches itself along the welded ring. This is accepted (SV5 decision 2): the
 * mesh still passes `isClosed` and the signed volume is exact, only the welded ring is shared by four faces.
 */
export function washerSolid(profile: RevolveProfile, k: number = REVOLVE_K): Solid {
    const y = profile.aboutY;
    if (!y) throw new RangeError('This profile has no y-axis solid');
    const outer = revolve([[0, profile.b], [y.top, profile.b]], k, 'y');
    const n = Math.max(2, profile.segments);
    const bowlProfile = Array.from({length: n + 1}, (_, i): [number, number] =>
        i === n ? [y.top, profile.b] : [y.top * i / n, i === 0 ? 0 : y.inner(y.top * i / n)]);
    const bowl = revolve(bowlProfile, k, 'y');
    const coords = Array.from(outer.vertices);
    const index = new Map<string, number>();
    for (let i = 0; i < coords.length / 3; i++) index.set(`${coords[3 * i]},${coords[3 * i + 1]},${coords[3 * i + 2]}`, i);
    const map: number[] = [];
    for (let i = 0; i < bowl.vertices.length / 3; i++) {
        const key = `${bowl.vertices[3 * i]},${bowl.vertices[3 * i + 1]},${bowl.vertices[3 * i + 2]}`;
        let at = index.get(key);
        if (at === undefined) {
            at = coords.length / 3;
            coords.push(bowl.vertices[3 * i], bowl.vertices[3 * i + 1], bowl.vertices[3 * i + 2]);
            index.set(key, at);
        }
        map.push(at);
    }
    // outer.faces[0] is the bottom disc, [1] the top disc; the bowl has no bottom, so its face 0 is its top disc.
    const faces = [outer.faces[0], ...outer.faces.slice(2), ...bowl.faces.slice(1).map(face => face.map(v => map[v]).reverse())];
    return {vertices: Float64Array.from(coords), faces};
}

/** The mesh of a solid of revolution about `axis`. */
export function revolveSolid(id: RevolveId, axis: 'x' | 'y', k: number = REVOLVE_K): Solid {
    const profile = REVOLVE_PROFILES[id];
    return axis === 'y' && profile.aboutY ? washerSolid(profile, k) : revolve(profilePoints(profile), k, 'x');
}

/** The cone of the Cavalieri and volume modes stands on the xy-plane (z-axis), the revolve modes lay it along x. */
export function standingCone(): Solid {
    return cone(3, 4);
}

/** The cylinder the cone is compared with (SV3, the failing pair): the same radius 3 and height 4, standing on the xy-plane. */
export function standingCylinder(): Solid {
    return revolve([[0, 3], [4, 3]], REVOLVE_K, 'z');
}

/** Exact volume of the cylinder of the failing pair. */
export const CYLINDER_EXACT_VOLUME = 36 * Math.PI;

/** Exact volume of the solid the volume mode shows. */
export function exactVolume(id: SolidId): number {
    const grid = gridExactVolume(id);
    if (grid !== undefined) return grid;
    return isRevolveId(id) ? (id === 'cone' ? coneVolume(3, 4) : REVOLVE_PROFILES[id].exact) : NaN;
}

/** The footprint of the standing solids at relative height t (0 at the bottom, 1 at the top), as a closed loop of [x, y]; empty where it is a point. */
export function footprint(id: SolidId, t: number): Array<[number, number]> {
    if (id === 'cube') return [[0, 0], [1, 0], [1, 1], [0, 1]];
    if (id === 'square-prism') return [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const r = 3 * (1 - t);
    if (id !== 'cone' || !(r > 1e-9)) return [];
    return Array.from({length: REVOLVE_K}, (_, j): [number, number] => [r * Math.cos(2 * Math.PI * j / REVOLVE_K), r * Math.sin(2 * Math.PI * j / REVOLVE_K)]);
}

/** The footprint of the cylinder at any height: its disc as the same k-gon the mesh uses. */
export function cylinderFootprint(): Array<[number, number]> {
    return Array.from({length: REVOLVE_K}, (_, j): [number, number] => [3 * Math.cos(2 * Math.PI * j / REVOLVE_K), 3 * Math.sin(2 * Math.PI * j / REVOLVE_K)]);
}
