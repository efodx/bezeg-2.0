import type {Point} from "../../bezeg/api/point/point";
import {PointImpl} from "../../bezeg/impl/point/point-impl";
import {TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import type {ScenePolyline, SurfaceCamera, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

export type PatchDensity = 8 | 16;

/** The tensor patch state the scene is built from; plain data, no graph or renderer types. */
export interface TensorSceneInput {
    /** `net[i][j]` is `b_ij` (i along u, j along v). */
    readonly net: ReadonlyArray<ReadonlyArray<Xyz>>;
    readonly u: number;
    readonly v: number;
    readonly camera: SurfaceCamera;
    readonly showControlNet: boolean;
    readonly showIsoCurves: boolean;
    readonly showBoundaryCurves: boolean;
    readonly showShading: boolean;
    readonly isoDensity: PatchDensity;
    readonly shadingDensity: PatchDensity;
    readonly zMode: boolean;
    readonly selectedPointId?: string;
}

/**
 * The facets of a density-d mesh deviate from the surface by up to a chord error. This samples it where it is largest
 * for a smooth cell, the cell centre against the midpoint of the facets' shared diagonal, and doubles it to cover the
 * edge midpoints and grazing views. Cached per net, so camera events do not resample.
 */
const chordToleranceCache = new WeakMap<object, Map<number, number>>();
function chordTolerance(patch: TensorProductBezierPatch, net: object, mesh: {vertices: readonly Point[]}, density: number): number {
    const perNet = chordToleranceCache.get(net) ?? new Map<number, number>();
    chordToleranceCache.set(net, perNet);
    const cached = perNet.get(density);
    if (cached !== undefined) return cached;
    const stride = density + 1;
    let deviation = 0;
    for (let i = 0; i < density; i++) for (let j = 0; j < density; j++) {
        const b = mesh.vertices[(i + 1) * stride + j], d = mesh.vertices[i * stride + j + 1];
        const centre = patch.eval((i + 0.5) / density, (j + 0.5) / density);
        deviation = Math.max(deviation, Math.hypot(centre.X() - (b.X() + d.X()) / 2, centre.Y() - (b.Y() + d.Y()) / 2, centre.Z() - ((b.Z?.() ?? 0) + (d.Z?.() ?? 0)) / 2));
    }
    perNet.set(density, 2 * deviation);
    return 2 * deviation;
}

/** Samples per iso and boundary curve; enough for degree 4 to look smooth. */
export const CURVE_SAMPLES = 32;

export const patchPointId = (i: number, j: number): string => `p-${i}-${j}`;

/** LaTeX naming control point (i, j) as P_{ij}; a patch has degrees 1 to 4, so every index is one digit. */
const pointLabelLatex = (i: number, j: number): string => `P_{${i}${j}}`;

/** Parses `p-i-j`; undefined for any other id. */
export function parsePatchPointId(id: string): [number, number] | undefined {
    const match = /^p-(\d+)-(\d+)$/.exec(id);
    return match ? [Number(match[1]), Number(match[2])] : undefined;
}

export function patchFromNet(net: ReadonlyArray<ReadonlyArray<Xyz>>): TensorProductBezierPatch {
    return new TensorProductBezierPatch(net.map(row => row.map(([x, y, z]) => new PointImpl(x, y, undefined, z))));
}

const xyz = (point: Point): Xyz => [point.X(), point.Y(), point.Z?.() ?? 0];

/** Builds the whole scene. `revision` is the host's monotonic counter for geometry changes. */
export function buildTensorScene(input: TensorSceneInput, revision: number): SurfaceScene {
    const patch = patchFromNet(input.net);
    const {n} = patch;
    const polylines: ScenePolyline[] = [];
    const sampled = (at: (t: number) => PointImpl): Xyz[] =>
        Array.from({length: CURVE_SAMPLES + 1}, (_, k) => xyz(at(k / CURVE_SAMPLES)));
    if (input.showIsoCurves) {
        for (let k = 0; k <= input.isoDensity; k++) {
            const t = k / input.isoDensity;
            polylines.push({id: `iso-u-${k}`, role: "iso", points: sampled(s => patch.eval(t, s))});
            polylines.push({id: `iso-v-${k}`, role: "iso", points: sampled(s => patch.eval(s, t))});
        }
    }
    if (input.showBoundaryCurves) {
        const edges: ReadonlyArray<readonly [string, (t: number) => PointImpl]> = [
            ["boundary-u0", t => patch.eval(0, t)], ["boundary-u1", t => patch.eval(1, t)],
            ["boundary-v0", t => patch.eval(t, 0)], ["boundary-v1", t => patch.eval(t, 1)],
        ];
        for (const [id, at] of edges) polylines.push({id, role: "boundary", points: sampled(at)});
    }
    if (input.showControlNet) {
        input.net.forEach((row, i) => polylines.push({id: `net-row-${i}`, role: "net", points: row.map(p => [...p])}));
        for (let j = 0; j <= n; j++) polylines.push({id: `net-col-${j}`, role: "net", points: input.net.map(row => [...row[j]])});
    }
    const selected = input.selectedPointId === undefined ? undefined : parsePatchPointId(input.selectedPointId);
    // A selection the net no longer has (a lowered degree, before the host clears it) marks and highlights nothing.
    const selectedIndex = selected !== undefined && selected[0] < input.net.length && selected[1] <= n ? selected : undefined;
    if (input.showControlNet && selectedIndex !== undefined) {
        const [i, j] = selectedIndex;
        polylines.push({id: "highlight-row", role: "highlight", points: input.net[i].map(p => [...p])});
        polylines.push({id: "highlight-col", role: "highlight", points: input.net.map(row => [...row[j]])});
    }
    const selectedId = selectedIndex === undefined ? undefined : patchPointId(selectedIndex[0], selectedIndex[1]);
    const points = input.showControlNet
        ? input.net.flatMap((row, i) => row.map((p, j) => {
            const id = patchPointId(i, j);
            return {id, xyz: [...p] as Xyz, ...(id === selectedId ? {selected: true} : {})};
        }))
        : [];
    const mesh = input.showShading ? patch.sampleMesh(input.shadingDensity) : undefined;
    const anchor = xyz(patch.eval(input.u, input.v));
    return {
        revision,
        points,
        polylines,
        ...(mesh ? {mesh: {positions: mesh.vertices.flatMap(xyz), faces: mesh.faces.flatMap(face => [...face]), visible: true,
            chordTolerance: chordTolerance(patch, input.net, mesh, input.shadingDensity)}} : {}),
        ...(mesh ? {meshOwners: [{id: "tensor-patch-0", kind: "tensor" as const, faceStart: 0, faceCount: mesh.faces.length * 3}]} : {}),
        markers: [{id: "evaluated", xyz: anchor, role: "evaluated"}],
        labels: [
            {id: "surface-point", text: "S(u,v)", anchor},
            // The selected control point is named on the surface; the view hides the name when the point is occluded.
            ...(input.showControlNet && selectedIndex !== undefined
                ? [{id: "selected-point", text: pointLabelLatex(selectedIndex[0], selectedIndex[1]), anchor: [...input.net[selectedIndex[0]][selectedIndex[1]]] as Xyz,
                    pointId: patchPointId(selectedIndex[0], selectedIndex[1])}]
                : []),
        ],
        camera: {...input.camera, target: [...input.camera.target]},
        interaction: {zMode: input.zMode, editable: input.showControlNet},
    };
}
