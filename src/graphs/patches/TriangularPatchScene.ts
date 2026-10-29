import type {TriangularBezierPatch} from "../../bezeg/impl/patch/triangular-bezier-patch";
import type {Point} from "../../bezeg/api/point/point";
import type {PointImpl} from "../../bezeg/impl/point/point-impl";
import {buildTensorScene, CURVE_SAMPLES, PatchDensity} from "./patchSceneBuilder";
import {tensorNetFromTriangular} from "./TriangularTensorComparison";
import {LatticeRowFamily, parseTriangularPointId, triangularIndex, triangularIndices, triangularPointId, triangularRows} from "./TriangularPatchLattice";
import {triangularFromNet} from "./TriangularPatchDegree";
import type {SceneMarker, ScenePolyline, SurfaceCamera, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

/** The triangular patch state the scene is built from; plain data, no graph or renderer types. */
export interface TriangularSceneInput {
    /** The net in canonical order: index 0 is `b_(n,0,0)`, the last is `b_(0,0,n)`. */
    readonly net: ReadonlyArray<Xyz>;
    readonly u: number;
    readonly v: number;
    readonly camera: SurfaceCamera;
    readonly showControlNet: boolean;
    readonly showIsoCurves: boolean;
    readonly showBoundaryCurves: boolean;
    readonly showShading: boolean;
    /** The barycentric de Casteljau scheme at `(u, v, w)`: the intermediate nets and their points. */
    readonly showDeCasteljau: boolean;
    readonly isoDensity: PatchDensity;
    readonly shadingDensity: PatchDensity;
    readonly zMode: boolean;
    readonly selectedPointId?: string;
    /** Transient: the three sub-triangle nets and the three curves that cut the patch at `(u, v, w)`. */
    readonly subdivisionPreview?: boolean;
    /** Transient: also draws the tensor-product patch derived from the net (curves and net only, role `compare`). */
    readonly compareTensor?: boolean;
}

const xyz = (point: Point): Xyz => [point.X(), point.Y(), point.Z?.() ?? 0];
const pointLabelLatex = (i: number, j: number, k: number): string => `P_{${i}${j}${k}}`;

/** True when the barycentric point is strictly inside the triangle, where the three-piece split is defined. */
export const isInteriorPoint = (u: number, v: number): boolean => u > 0 && v > 0 && u + v < 1;

/**
 * Like the tensor scene's tolerance: the facets deviate from the surface by up to a chord error, sampled at every
 * face's parameter centroid and edge midpoints (where it peaks for a smooth patch) and doubled. Cached per net.
 */
/** Barycentric weights within a facet where its deviation from the surface is sampled: the centroid and edge midpoints. */
const FACET_SAMPLES: ReadonlyArray<readonly [number, number, number]> = [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5]];
const chordToleranceCache = new WeakMap<object, Map<number, number>>();
function chordTolerance(patch: TriangularBezierPatch, net: object, density: number): number {
    const perNet = chordToleranceCache.get(net) ?? new Map<number, number>();
    chordToleranceCache.set(net, perNet);
    const cached = perNet.get(density);
    if (cached !== undefined) return cached;
    const mesh = patch.sampleMesh(density);
    let deviation = 0;
    const coordinates = (p: Point): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0];
    for (const face of mesh.faces) {
        const corners = face.map(index => coordinates(mesh.vertices[index]));
        const parameters = face.map(index => mesh.parameters[index]);
        for (const weights of FACET_SAMPLES) {
            const u = parameters.reduce((sum, p, k) => sum + weights[k] * p[0], 0);
            const v = parameters.reduce((sum, p, k) => sum + weights[k] * p[1], 0);
            const surface = coordinates(patch.eval(u, v));
            deviation = Math.max(deviation, Math.hypot(...surface.map((value, axis) => value - corners.reduce((sum, c, k) => sum + weights[k] * c[axis], 0))));
        }
    }
    perNet.set(density, 2 * deviation);
    return 2 * deviation;
}

const rowPolyline = (id: string, role: ScenePolyline["role"], rows: ReadonlyArray<Xyz>, indices: readonly number[]): ScenePolyline =>
    ({id, role, points: indices.map(index => [...rows[index]] as Xyz)});

/** Net rows of a flat canonical net as polylines with ids `<prefix>-<family>-<value>`. */
function latticePolylines(prefix: string, role: ScenePolyline["role"], flat: ReadonlyArray<Xyz>, degree: number): ScenePolyline[] {
    return triangularRows(degree).map(row => rowPolyline(`${prefix}-${row.family}-${row.value}`, role, flat, row.indices));
}

/** Builds the whole scene. `revision` is the host's monotonic counter for geometry changes. */
export function buildTriangularScene(input: TriangularSceneInput, revision: number): SurfaceScene {
    const patch = triangularFromNet(input.net);
    const n = patch.degree;
    const polylines: ScenePolyline[] = [];
    const markers: SceneMarker[] = [];
    const sampled = (at: (s: number) => PointImpl): Xyz[] => Array.from({length: CURVE_SAMPLES + 1}, (_, k) => xyz(at(k / CURVE_SAMPLES)));
    if (input.showIsoCurves) {
        // Levels 0 to density - 1: level density is a single vertex. Level 0 coincides with a boundary curve.
        for (let k = 0; k < input.isoDensity; k++) {
            const t = k / input.isoDensity, rest = 1 - t;
            polylines.push({id: `iso-u-${k}`, role: "iso", points: sampled(s => patch.eval(t, s * rest))});
            polylines.push({id: `iso-v-${k}`, role: "iso-v", points: sampled(s => patch.eval(s * rest, t))});
            polylines.push({id: `iso-w-${k}`, role: "iso-w", points: sampled(s => patch.eval(s * rest, (1 - s) * rest))});
        }
    }
    if (input.showBoundaryCurves) {
        const edges: ReadonlyArray<readonly [string, (s: number) => PointImpl]> = [
            ["boundary-u0", s => patch.eval(0, s)], ["boundary-v0", s => patch.eval(s, 0)], ["boundary-w0", s => patch.eval(s, 1 - s)],
        ];
        for (const [id, at] of edges) polylines.push({id, role: "boundary", points: sampled(at)});
    }
    if (input.showControlNet) polylines.push(...latticePolylines("net", "net", input.net, n));
    if (input.showDeCasteljau && n > 1) {
        // Level l is the net of degree n - l; the last level is the surface point itself (the evaluated marker).
        const scheme = patch.decasteljauScheme(input.u, input.v);
        for (let level = 1; level < n; level++) {
            const flat = scheme[level].map((row): Xyz => [row[0], row[1], row[2] ?? 0]);
            polylines.push(...latticePolylines(`construction-${level}`, "construction", flat, n - level));
            flat.forEach((point, index) => markers.push({id: `construction-${level}-${index}`, xyz: point, role: "construction"}));
        }
    }
    if (input.subdivisionPreview && isInteriorPoint(input.u, input.v)) {
        const pieces = patch.subdivide(input.u, input.v);
        pieces.forEach((piece, index) => {
            const flat = piece.getControlNet().map(xyz);
            polylines.push(...latticePolylines(`piece-${index}`, "construction", flat, n));
        });
        // The three curves that cut the patch run from the split point to each corner.
        const cuts: ReadonlyArray<readonly [string, number, number]> = [["a", 1, 0], ["b", 0, 1], ["c", 0, 0]];
        for (const [id, u1, v1] of cuts) {
            polylines.push({id: `split-${id}`, role: "boundary", points: sampled(s => patch.eval(input.u + s * (u1 - input.u), input.v + s * (v1 - input.v)))});
        }
    }
    if (input.compareTensor) {
        // The tensor patch is drawn by the tensor scene builder (no mesh, no selection) and handed over in the `compare` role.
        const tensor = buildTensorScene({
            net: tensorNetFromTriangular(input.net, n), u: input.u, v: input.v, camera: input.camera, showControlNet: input.showControlNet,
            showIsoCurves: input.showIsoCurves, showBoundaryCurves: input.showBoundaryCurves, showShading: false,
            isoDensity: input.isoDensity, shadingDensity: input.shadingDensity, zMode: input.zMode,
        }, revision);
        polylines.push(...tensor.polylines.map((line): ScenePolyline => ({...line, id: `compare-${line.id}`, role: "compare"})));
    }
    const selected = input.selectedPointId === undefined ? undefined : parseTriangularPointId(input.selectedPointId);
    // A selection the net no longer has (a lowered degree, before the host clears it) marks nothing.
    const selectedIndex = selected !== undefined && selected[0] + selected[1] + selected[2] === n ? selected : undefined;
    const selectedId = selectedIndex === undefined ? undefined : triangularPointId(...selectedIndex);
    if (input.showControlNet && selectedIndex !== undefined) {
        // The three lattice lines through b_ijk, each parallel to one triangle edge. A vertex has a one-point line, which is left out.
        const through: Record<LatticeRowFamily, number> = {i: selectedIndex[0], j: selectedIndex[1], k: selectedIndex[2]};
        const rows = triangularRows(n);
        for (const family of ["i", "j", "k"] as const) {
            const row = rows.find(candidate => candidate.family === family && candidate.value === through[family]);
            if (row) polylines.push(rowPolyline(`highlight-${family}`, "highlight", input.net, row.indices));
        }
    }
    const points = input.showControlNet
        ? triangularIndices(n).map(([i, j, k], index) => {
            const id = triangularPointId(i, j, k);
            return {id, xyz: [...input.net[index]] as Xyz, ...(id === selectedId ? {selected: true} : {})};
        })
        : [];
    const anchor = xyz(patch.eval(input.u, input.v));
    markers.unshift({id: "evaluated", xyz: anchor, role: "evaluated"});
    const mesh = input.showShading ? patch.sampleMesh(input.shadingDensity) : undefined;
    const selectedPosition = selectedIndex === undefined ? undefined : input.net[triangularIndex(n, selectedIndex[0], selectedIndex[1])];
    return {
        revision,
        points,
        polylines,
        ...(mesh ? {mesh: {positions: mesh.vertices.flatMap(xyz), faces: mesh.faces.flatMap(face => [...face]), visible: true,
            chordTolerance: chordTolerance(patch, input.net, input.shadingDensity)}} : {}),
        ...(mesh ? {meshOwners: [{id: "triangular-patch-0", kind: "triangular" as const, faceStart: 0, faceCount: mesh.faces.length * 3}]} : {}),
        markers,
        labels: [
            {id: "surface-point", text: "S(u,v,w)", anchor},
            ...(input.showControlNet && selectedIndex !== undefined && selectedPosition !== undefined
                ? [{id: "selected-point", text: pointLabelLatex(...selectedIndex), anchor: [...selectedPosition] as Xyz, pointId: selectedId}]
                : []),
        ],
        camera: {...input.camera, target: [...input.camera.target]},
        interaction: {zMode: input.zMode, editable: input.showControlNet},
    };
}
