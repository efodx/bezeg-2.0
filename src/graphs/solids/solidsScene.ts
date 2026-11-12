import type {Solid, Vec3} from '../../solids/solid';
import {isClosed, realCoords, toTriangles, vertexCount} from '../../solids/solid';
import {clipSolid, sectionConvex, type CutPoint} from '../../solids/section';
import {discVolume, meshVolume, sectionAreaFromLoop, sliceAreaAt} from '../../solids/volume';
import type {SolidsState} from '../../solids/solidsModel';
import {cursorOf, offsetOf, shearOf, stackPair, type StackPair} from '../../solids/solidsModel';
import type {SceneLabel, SceneMeshOwner, ScenePlane, ScenePolyline, SceneMarker, SurfaceScene, Xyz} from '../patches/surface-view/surfaceScene';
import {
    cylinderFootprint, CYLINDER_EXACT_VOLUME, exactVolume, footprint, gridSolid, isRevolveId, REVOLVE_PROFILES, revolveSolid, standingCone, standingCylinder,
} from './solidsCatalog';

/** The stored fields that decide the geometry; the camera is not one of them. */
export type SolidsGeometry = Omit<SolidsState, 'camera'>;

export interface SectionCorner {
    readonly kind: 'vertex' | 'edge';
    /** The vertex index for a vertex, or the two end indices of the edge. */
    readonly vertices: readonly number[];
}

/** Plain numbers only; the panels word and format them. */
export type SolidsReadouts =
    | {
        readonly mode: 'section';
        readonly kind: 'empty' | 'point' | 'segment' | 'polygon';
        /** Sides of the section polygon (0 for empty, 1 for a point, 2 for a segment). */
        readonly sides: number;
        /** Computed from the cut points by Newell's vector; undefined when the section has no area to report. */
        readonly area: number | undefined;
        readonly coplanarFace: boolean;
        readonly corners: readonly SectionCorner[];
        /** Volume of the kept mesh (below the plane) and of the whole solid, both by signed tetrahedra. */
        readonly keptVolume: number;
        readonly solidVolume: number;
    }
    | {
        readonly mode: 'stack';
        /** `sheared`: the straight solid and its shear; `failing`: a cone and a cylinder of equal height, whose slice areas differ. */
        readonly pair: StackPair;
        /** The first solid (the straight one, or the cone), the second (the sheared copy, or the cylinder), by signed tetrahedra. */
        readonly meshVolume: number;
        readonly otherVolume: number;
        /** The exact volumes of the two solids. */
        readonly exact: number;
        readonly otherExact: number;
        /** The z of the compared slices (the cursor) and their areas, computed from the meshes by `sliceAreaAt`. */
        readonly sliceHeight: number;
        readonly sliceArea: number;
        readonly otherSliceArea: number;
    }
    | {readonly mode: 'volume'; readonly meshVolume: number; readonly exact: number}
    | {
        readonly mode: 'revolve';
        readonly axis: 'x' | 'y';
        readonly meshVolume: number;
        readonly exact: number;
        /** Midpoint disc (or washer) sum with `discs` cells. */
        readonly discSum: number;
        readonly discs: number;
    };

export interface SolidsDrawing {
    /** The meshes the scene draws; every one passes `isClosed`. */
    readonly solids: readonly Solid[];
    readonly scene: Pick<SurfaceScene, 'points' | 'polylines' | 'mesh' | 'meshOwners' | 'planes' | 'markers' | 'labels'>;
    readonly readouts: SolidsReadouts;
    /** Points the camera is fitted to. */
    readonly framed: readonly Xyz[];
}

/** A mesh is drawn only when it is closed; an empty one draws nothing. */
export const drawable = (solid: Solid): Solid | undefined => solid.faces.length > 0 && isClosed(solid) ? solid : undefined;

const xyzOf = (v: Vec3): Xyz => [v[0], v[1], v[2]];

function meshOf(solids: readonly Solid[]): Pick<SurfaceScene, 'mesh' | 'meshOwners'> {
    const positions: number[] = [];
    const faces: number[] = [];
    const owners: SceneMeshOwner[] = [];
    solids.forEach((solid, k) => {
        const {positions: p, triangles} = toTriangles(solid);
        const base = positions.length / 3;
        for (const c of p) positions.push(c);
        const start = faces.length;
        for (const i of triangles) faces.push(base + i);
        owners.push({id: `solid-${k}`, kind: 'solid', faceStart: start, faceCount: triangles.length});
    });
    if (faces.length === 0) return {};
    return {mesh: {positions: Float32Array.from(positions), faces, visible: true}, meshOwners: owners};
}

const boundsOf = (solid: Solid): {min: Xyz; max: Xyz} => {
    const min: Xyz = [Infinity, Infinity, Infinity];
    const max: Xyz = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < vertexCount(solid); i++) {
        const p = realCoords(solid, i);
        for (let c = 0; c < 3; c++) {
            min[c] = Math.min(min[c], p[c]);
            max[c] = Math.max(max[c], p[c]);
        }
    }
    return {min, max};
};

const corners8 = (b: {min: Xyz; max: Xyz}): Xyz[] => {
    const out: Xyz[] = [];
    for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) out.push([x, y, z]);
    return out;
};

/** The solid sheared by `shear` along x: a vertex moves by shear * (z - zmin) / (zmax - zmin), so each horizontal slice keeps its shape. */
export function shearSolid(solid: Solid, shear: number): Solid {
    const {min, max} = boundsOf(solid);
    const out = new Float64Array(solid.vertices.length);
    for (let i = 0; i < vertexCount(solid); i++) {
        const [x, y, z] = realCoords(solid, i);
        out.set([x + shear * (z - min[2]) / (max[2] - min[2]), y, z], 3 * i);
    }
    return {vertices: out, faces: solid.faces};
}

// ---- Section ----------------------------------------------------------------------------------------------------------

function planeQuad(solid: Solid, normal: readonly [number, number, number], offset: number): ScenePlane {
    const len = Math.hypot(...normal);
    const nu: Xyz = [normal[0] / len, normal[1] / len, normal[2] / len];
    const b = boundsOf(solid);
    const mid: Xyz = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
    const lift = nu[0] * mid[0] + nu[1] * mid[1] + nu[2] * mid[2] - offsetOf(offset) / len;
    const c: Xyz = [mid[0] - nu[0] * lift, mid[1] - nu[1] * lift, mid[2] - nu[2] * lift];
    const h: Xyz = Math.abs(nu[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const cross = (p: Xyz, q: Xyz): Xyz => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
    const raw = cross(h, nu);
    const rl = Math.hypot(...raw);
    const u: Xyz = [raw[0] / rl, raw[1] / rl, raw[2] / rl];
    const v = cross(nu, u);
    const half = 0.6 * Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
    const at = (s: number, t: number): Xyz => [c[0] + half * (s * u[0] + t * v[0]), c[1] + half * (s * u[1] + t * v[1]), c[2] + half * (s * u[2] + t * v[2])];
    return {id: 'plane', corners: [at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)]};
}

/** The corners of the solid numbered from 1, so that the text status can say which corner or edge a cut point lies on. */
const vertexLabels = (solid: Solid): SceneLabel[] =>
    Array.from({length: vertexCount(solid)}, (_, i): SceneLabel => ({id: `v-${i}`, text: String(i + 1), anchor: xyzOf(realCoords(solid, i))}));

const cornerOf = (point: CutPoint): SectionCorner =>
    point.kind === 'vertex' ? {kind: 'vertex', vertices: [point.vertex]} : {kind: 'edge', vertices: [point.a, point.b]};

function drawSection(s: SolidsGeometry): SolidsDrawing {
    const solid = gridSolid(s.solid);
    if (!solid) throw new RangeError(`The solid ${s.solid} has no plane section`);
    const sec = sectionConvex(solid, s.normal, s.offset);
    const kept = drawable(clipSolid(solid, s.normal, s.offset, 'below'));
    const polylines: ScenePolyline[] = [];
    const markers: SceneMarker[] = [];
    let sides = 0;
    let area: number | undefined;
    let corners: SectionCorner[] = [];
    if (sec.kind === 'point') {
        sides = 1;
        corners = sec.points.map(cornerOf);
        markers.push({id: 'cut-0', xyz: xyzOf(sec.v), role: 'construction'});
    } else if (sec.kind === 'segment') {
        sides = 2;
        corners = sec.points.map(cornerOf);
        sec.points.forEach((p, i) => markers.push({id: `cut-${i}`, xyz: xyzOf(p.xyz), role: 'construction'}));
        polylines.push({id: 'section', role: 'highlight', points: sec.points.map(p => xyzOf(p.xyz))});
    } else if (sec.kind === 'polygon') {
        const loop = sec.loop.map(i => sec.points[i]);
        sides = loop.length;
        area = sectionAreaFromLoop(loop.map(p => p.xyz));
        corners = loop.map(cornerOf);
        loop.forEach((p, i) => markers.push({id: `cut-${i}`, xyz: xyzOf(p.xyz), role: 'construction'}));
        polylines.push({id: 'section', role: 'highlight', points: [...loop, loop[0]].map(p => xyzOf(p.xyz))});
    }
    const b = boundsOf(solid);
    const solids = kept ? [kept] : [];
    const plane = planeQuad(solid, s.normal, s.offset);
    return {
        solids,
        scene: {points: [], polylines, ...meshOf(solids), planes: [plane], markers, labels: vertexLabels(solid)},
        readouts: {
            mode: 'section', kind: sec.kind, sides, area, coplanarFace: sec.kind === 'polygon' && sec.coplanarFace !== undefined, corners,
            keptVolume: kept ? meshVolume(kept) : 0, solidVolume: meshVolume(solid),
        },
        // The view shows the plane too, so the opening view frames it with the solid and does not cut it at the board edge.
        framed: [...corners8(b), ...plane.corners],
    };
}

// ---- Cavalieri stack --------------------------------------------------------------------------------------------------

/** Where the cone and the cylinder of the failing pair stand: side by side, so that neither hides the other. */
export const PAIR_OFFSET = 4;

/** The solid moved along x by `dx` (a plain translation, so its slice areas and volume stay the same). */
export function translateSolid(solid: Solid, dx: number): Solid {
    const out = Float64Array.from(solid.vertices);
    for (let i = 0; i < vertexCount(solid); i++) out[3 * i] += dx;
    return {vertices: out, faces: solid.faces};
}

const loopAt = (loop: ReadonlyArray<readonly [number, number]>, dx: number, z: number): Xyz[] =>
    [...loop, loop[0]].map(([x, y]): Xyz => [x + dx, y, z]);

function drawStack(s: SolidsGeometry): SolidsDrawing {
    const failing = stackPair(s.solid) === 'failing';
    const straight = s.solid === 'cone' ? standingCone() : gridSolid(s.solid);
    if (!straight) throw new RangeError(`The solid ${s.solid} has no stack`);
    const shear = failing ? 0 : shearOf(s.shear);
    // The second solid: the sheared copy, or the cylinder. The failing pair is moved apart (the cone left, the cylinder right).
    const first = failing ? translateSolid(straight, -PAIR_OFFSET) : straight;
    const second = failing ? translateSolid(standingCylinder(), PAIR_OFFSET) : shearSolid(straight, shear);
    const b = boundsOf(straight);
    const height = b.max[2] - b.min[2];
    const firstDx = failing ? -PAIR_OFFSET : 0;
    const secondLoop = (t: number) => failing ? cylinderFootprint() : footprint(s.solid, t);
    const secondDx = (t: number) => failing ? PAIR_OFFSET : shear * t;
    const polylines: ScenePolyline[] = [];
    for (let k = 0; k <= s.discs; k++) {
        const t = k / s.discs;
        const z = b.min[2] + height * t;
        const loop = footprint(s.solid, t);
        if (failing && loop.length > 0) polylines.push({id: `slab-first-${k}`, role: 'iso', points: loopAt(loop, firstDx, z)});
        const other = secondLoop(t);
        if (other.length > 0) polylines.push({id: `slab-${k}`, role: 'iso', points: loopAt(other, secondDx(t), z)});
    }
    const cursorT = cursorOf(s.cursor);
    const cursorZ = b.min[2] + height * cursorT;
    const cursorFirst = footprint(s.solid, cursorT);
    if (cursorFirst.length > 0) polylines.push({id: 'cursor-first', role: 'highlight', points: loopAt(cursorFirst, firstDx, cursorZ)});
    const cursorSecond = secondLoop(cursorT);
    polylines.push({id: 'cursor', role: 'highlight', points: loopAt(cursorSecond, secondDx(cursorT), cursorZ)});
    const solids = [first, second].map(drawable).filter((m): m is Solid => m !== undefined);
    const fb = boundsOf(first), sb = boundsOf(second);
    const exact = exactVolume(s.solid);
    return {
        solids,
        scene: {points: [], polylines, ...meshOf(solids), markers: [], labels: []},
        readouts: {
            mode: 'stack', pair: failing ? 'failing' : 'sheared', meshVolume: meshVolume(first), otherVolume: meshVolume(second), exact,
            otherExact: failing ? CYLINDER_EXACT_VOLUME : exact,
            sliceHeight: cursorZ, sliceArea: sliceAreaAt(first, cursorZ), otherSliceArea: sliceAreaAt(second, cursorZ),
        },
        framed: corners8({min: [Math.min(fb.min[0], sb.min[0]), Math.min(fb.min[1], sb.min[1]), b.min[2]], max: [Math.max(fb.max[0], sb.max[0]), Math.max(fb.max[1], sb.max[1]), b.max[2]]}),
    };
}

// ---- Volume -----------------------------------------------------------------------------------------------------------

function volumeSolid(s: SolidsGeometry): Solid {
    if (s.solid === 'cone') return standingCone();
    const grid = gridSolid(s.solid);
    if (grid) return grid;
    if (isRevolveId(s.solid)) return revolveSolid(s.solid, 'x');
    throw new RangeError(`Unknown solid ${s.solid}`);
}

function drawVolume(s: SolidsGeometry): SolidsDrawing {
    const solid = volumeSolid(s);
    const drawn = drawable(solid);
    const solids = drawn ? [drawn] : [];
    return {
        solids, scene: {points: [], polylines: [], ...meshOf(solids), markers: [], labels: []},
        readouts: {mode: 'volume', meshVolume: meshVolume(solid), exact: exactVolume(s.solid)}, framed: corners8(boundsOf(solid)),
    };
}

// ---- Solids of revolution ---------------------------------------------------------------------------------------------

const RING_POINTS = 32;

function drawRevolve(s: SolidsGeometry): SolidsDrawing {
    if (!isRevolveId(s.solid)) throw new RangeError(`The solid ${s.solid} is not a solid of revolution`);
    const profile = REVOLVE_PROFILES[s.solid];
    const aboutY = s.axis === 'y' && profile.aboutY ? profile.aboutY : undefined;
    const axis = aboutY ? 'y' : 'x';
    const solid = revolveSolid(s.solid, axis);
    const polylines: ScenePolyline[] = [];
    const curve = Array.from({length: 49}, (_, i): Xyz => {
        const x = profile.a + (profile.b - profile.a) * i / 48;
        return [x, profile.f(x), 0];
    });
    polylines.push({id: 'profile', role: 'boundary', points: curve});
    if (aboutY) polylines.push({id: 'axis', role: 'construction', points: [[0, -0.5, 0], [0, aboutY.top + 0.5, 0]]});
    else polylines.push({id: 'axis', role: 'construction', points: [[profile.a - 0.5, 0, 0], [profile.b + 0.5, 0, 0]]});
    for (let k = 0; k <= s.discs; k++) {
        const t = k / s.discs;
        const level = aboutY ? aboutY.top * t : profile.a + (profile.b - profile.a) * t;
        const r = aboutY ? profile.b : profile.f(level);
        if (!(r > 1e-9)) continue;
        const ring = Array.from({length: RING_POINTS + 1}, (_, j): Xyz => {
            const angle = 2 * Math.PI * j / RING_POINTS;
            return aboutY ? [r * Math.sin(angle), level, r * Math.cos(angle)] : [level, r * Math.cos(angle), r * Math.sin(angle)];
        });
        polylines.push({id: `disc-${k}`, role: 'iso', points: ring});
    }
    const drawn = drawable(solid);
    const solids = drawn ? [drawn] : [];
    const discSum = aboutY
        ? discVolume(y => Math.sqrt(Math.max(0, profile.b ** 2 - aboutY.inner(y) ** 2)), 0, aboutY.top, s.discs, 'midpoint')
        : discVolume(profile.f, profile.a, profile.b, s.discs, 'midpoint');
    return {
        solids, scene: {points: [], polylines, ...meshOf(solids), markers: [], labels: []},
        readouts: {mode: 'revolve', axis, meshVolume: meshVolume(solid), exact: aboutY ? aboutY.exact : profile.exact, discSum, discs: s.discs},
        framed: corners8(boundsOf(solid)),
    };
}

/** Everything the scene shows and the panels read out for the geometry fields of a state. */
export function drawSolids(s: SolidsGeometry): SolidsDrawing {
    switch (s.mode) {
        case 'section': return drawSection(s);
        case 'stack': return drawStack(s);
        case 'volume': return drawVolume(s);
        case 'revolve': return drawRevolve(s);
    }
}

export function buildSolidsScene(s: SolidsGeometry & {readonly camera: SurfaceScene['camera']}, revision: number, drawing: SolidsDrawing = drawSolids(s)): SurfaceScene {
    const {scene} = drawing;
    return {revision, ...scene, camera: {...s.camera, target: [...s.camera.target] as Xyz}, interaction: {zMode: false, editable: false}};
}
