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

/** Samples per iso and boundary curve; enough for degree 4 to look smooth. */
export const CURVE_SAMPLES = 32;

export const patchPointId = (i: number, j: number): string => `p-${i}-${j}`;
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
    const points = input.showControlNet
        ? input.net.flatMap((row, i) => row.map((p, j) => {
            const id = patchPointId(i, j);
            return {id, xyz: [...p] as Xyz, ...(id === input.selectedPointId ? {selected: true} : {})};
        }))
        : [];
    const mesh = input.showShading ? patch.sampleMesh(input.shadingDensity) : undefined;
    const anchor = xyz(patch.eval(input.u, input.v));
    return {
        revision,
        points,
        polylines,
        ...(mesh ? {mesh: {positions: mesh.vertices.flatMap(xyz), faces: mesh.faces.flatMap(face => [...face]), visible: true}} : {}),
        markers: [{id: "evaluated", xyz: anchor, role: "evaluated"}],
        labels: [{id: "surface-point", text: "S(u,v)", anchor}],
        camera: {...input.camera, target: [...input.camera.target]},
        interaction: {zMode: input.zMode, editable: input.showControlNet},
    };
}
