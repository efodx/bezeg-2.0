import {
    type CoonsCornerMismatch, coonsBicubicNet, coonsBilinearNet, coonsCornerCheck, coonsRuledCNet, coonsRuledDNet,
} from "../../bezeg/impl/kernels/coons";
import {CURVE_SAMPLES, patchFromNet} from "./patchSceneBuilder";
import type {SceneLabel, ScenePolyline, SurfaceCamera, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

/** Plain data of the Coons patch Demonstration: no graph or renderer types. */
export const COONS_BOUNDARY_NAMES = ["c0", "c1", "d0", "d1"] as const;
export type CoonsBoundaryName = typeof COONS_BOUNDARY_NAMES[number];
export type CoonsBoundaryPoints = Record<CoonsBoundaryName, Xyz[]>;

/** Which surface the single mesh shows: `lc` and `ld` the ruled surfaces, `b` the bilinear corner surface, `s` the Coons patch. */
export const COONS_SHOWN = ["lc", "ld", "b", "s"] as const;
export type CoonsShown = typeof COONS_SHOWN[number];
export const isCoonsShown = (value: unknown): value is CoonsShown => COONS_SHOWN.some(name => name === value);

/** The mesh density; the same as the tensor patch's default shading density. */
export const COONS_SHADING_DENSITY = 16;

/** The spec's default example (D4): corners coincide, the centre is (1.5, 1.5, 0.75). */
export function defaultCoonsBoundaries(): CoonsBoundaryPoints {
    return {
        c0: [[0, 0, 0], [1, 0, 2], [2, 0, 2], [3, 0, 0]],
        c1: [[0, 3, 0], [1, 3, -1], [2, 3, -1], [3, 3, 0]],
        d0: [[0, 0, 0], [0, 1, 0], [0, 2, 0], [0, 3, 0]],
        d1: [[3, 0, 0], [3, 1, 1], [3, 2, 1], [3, 3, 0]],
    };
}

/** The four corners: the two boundary end points that meet there, the first being the one a linked corner is edited through. */
export const COONS_CORNERS: ReadonlyArray<{readonly name: CoonsCornerMismatch["corner"]; readonly members: ReadonlyArray<readonly [CoonsBoundaryName, number]>}> = [
    {name: "u0v0", members: [["c0", 0], ["d0", 0]]},
    {name: "u1v0", members: [["c0", 3], ["d1", 0]]},
    {name: "u0v1", members: [["c1", 0], ["d0", 3]]},
    {name: "u1v1", members: [["c1", 3], ["d1", 3]]},
];

export const coonsPointId = (name: CoonsBoundaryName, index: number): string => `${name}-${index}`;

/** Parses `c0-2` and the like; undefined for any other id. */
export function parseCoonsPointId(id: string): [CoonsBoundaryName, number] | undefined {
    const match = /^(c0|c1|d0|d1)-([0-3])$/.exec(id);
    const name = COONS_BOUNDARY_NAMES.find(candidate => candidate === match?.[1]);
    return match && name ? [name, Number(match[2])] : undefined;
}

/** The corner a boundary end point belongs to, or undefined for an interior control point. */
const cornerOf = (name: CoonsBoundaryName, index: number) =>
    COONS_CORNERS.find(corner => corner.members.some(([n, i]) => n === name && i === index));

/** Whether control point `index` of `name` is an end point, which another boundary's end point meets at a corner. */
export const isCoonsCornerPoint = (name: CoonsBoundaryName, index: number): boolean => cornerOf(name, index) !== undefined;

/** With linked corners the second member of a corner is not a point of its own; its id is the first member's. */
export function canonicalCoonsPointId(id: string, linkedCorners: boolean): string {
    const parsed = parseCoonsPointId(id);
    if (!parsed || !linkedCorners) return id;
    const corner = cornerOf(parsed[0], parsed[1]);
    return corner ? coonsPointId(corner.members[0][0], corner.members[0][1]) : id;
}

const copy = (points: ReadonlyArray<Xyz>): Xyz[] => points.map((p): Xyz => [...p]);
export const cloneCoonsBoundaries = (b: CoonsBoundaryPoints): CoonsBoundaryPoints =>
    ({c0: copy(b.c0), c1: copy(b.c1), d0: copy(b.d0), d1: copy(b.d1)});

/** `b` with control point `index` of `name` at `position`; with linked corners the other end point of a corner moves too. Never edits `b`. */
export function moveCoonsPoint(b: CoonsBoundaryPoints, linkedCorners: boolean, name: CoonsBoundaryName, index: number, position: Xyz): CoonsBoundaryPoints {
    const next = cloneCoonsBoundaries(b);
    next[name][index] = [...position];
    const corner = linkedCorners ? cornerOf(name, index) : undefined;
    if (corner) for (const [n, i] of corner.members) next[n][i] = [...position];
    return next;
}

/** Each corner pair moved to its average: the b's rule for the bilinear surface, applied to the data (turning linking on). */
export function snapCoonsCorners(b: CoonsBoundaryPoints): CoonsBoundaryPoints {
    const next = cloneCoonsBoundaries(b);
    for (const corner of COONS_CORNERS) {
        const [[n0, i0], [n1, i1]] = corner.members;
        const p = b[n0][i0], q = b[n1][i1];
        const middle: Xyz = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
        next[n0][i0] = [...middle];
        next[n1][i1] = [...middle];
    }
    return next;
}

/** The mismatched corners; empty when the four boundaries meet. */
export const coonsMismatches = (b: CoonsBoundaryPoints): CoonsCornerMismatch[] => coonsCornerCheck(b);

/** The bicubic net (`net[i][j]`, i along u) of the surface `shown`. */
export function coonsNet(b: CoonsBoundaryPoints, shown: CoonsShown): Xyz[][] {
    switch (shown) {
        case "lc": return coonsRuledCNet(b);
        case "ld": return coonsRuledDNet(b);
        case "b": return coonsBilinearNet(b);
        case "s": return coonsBicubicNet(b);
    }
}

/** The four interior control points of the Coons net, in the order P11, P12, P21, P22. */
export function coonsInteriorPoints(b: CoonsBoundaryPoints): ReadonlyArray<{readonly i: number; readonly j: number; readonly xyz: Xyz}> {
    const net = coonsBicubicNet(b);
    return [[1, 1], [1, 2], [2, 1], [2, 2]].map(([i, j]) => ({i, j, xyz: net[i][j]}));
}

/** The point of the shown surface at (u, v). */
export function coonsSurfacePoint(b: CoonsBoundaryPoints, shown: CoonsShown, u: number, v: number): Xyz {
    const p = patchFromNet(coonsNet(b, shown)).eval(u, v);
    return [p.X(), p.Y(), p.Z?.() ?? 0];
}

export interface CoonsSceneInput {
    readonly boundaries: CoonsBoundaryPoints;
    readonly linkedCorners: boolean;
    readonly shown: CoonsShown;
    readonly showControlNet: boolean;
    readonly showShading: boolean;
    readonly camera: SurfaceCamera;
    readonly zMode: boolean;
    readonly selectedPointId?: string;
}

const cubicAt = (points: ReadonlyArray<Xyz>, t: number): Xyz => {
    const s = 1 - t, w = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
    return [0, 1, 2].map(axis => points.reduce((sum, p, k) => sum + w[k] * p[axis], 0)) as Xyz;
};

/** The label of the selected control point, e.g. `c_0` with its index; shown on the surface view. */
const pointLabelLatex = (name: CoonsBoundaryName, index: number): string => `${name[0]}_${name[1]}\\,[${index}]`;

/** Builds the whole scene: the four boundary curves and polygons always, the mesh of the shown surface, its net on demand. One mesh per scene. */
export function buildCoonsScene(input: CoonsSceneInput, revision: number): SurfaceScene {
    const {boundaries, linkedCorners, shown} = input;
    const net = coonsNet(boundaries, shown);
    const patch = patchFromNet(net);
    const polylines: ScenePolyline[] = [];
    for (const name of COONS_BOUNDARY_NAMES) {
        polylines.push({id: `boundary-${name}`, role: "boundary", points: Array.from({length: CURVE_SAMPLES + 1}, (_, k) => cubicAt(boundaries[name], k / CURVE_SAMPLES))});
        polylines.push({id: `polygon-${name}`, role: "construction", points: copy(boundaries[name])});
    }
    if (input.showControlNet) {
        net.forEach((row, i) => polylines.push({id: `net-row-${i}`, role: "net", points: copy(row)}));
        for (let j = 0; j < 4; j++) polylines.push({id: `net-col-${j}`, role: "net", points: net.map(row => [...row[j]] as Xyz)});
    }
    const selectedId = input.selectedPointId === undefined ? undefined : canonicalCoonsPointId(input.selectedPointId, linkedCorners);
    const points = COONS_BOUNDARY_NAMES.flatMap(name => boundaries[name].flatMap((p, index) => {
        const id = coonsPointId(name, index);
        // A linked corner is one point: the second member is the first one's twin and is not drawn.
        if (linkedCorners && canonicalCoonsPointId(id, true) !== id) return [];
        return [{id, xyz: [...p] as Xyz, ...(id === selectedId ? {selected: true} : {})}];
    }));
    const selected = selectedId === undefined ? undefined : parseCoonsPointId(selectedId);
    const labels: SceneLabel[] = selected
        ? [{id: "selected-point", text: pointLabelLatex(selected[0], selected[1]), anchor: [...boundaries[selected[0]][selected[1]]] as Xyz, pointId: selectedId}]
        : [];
    const mesh = input.showShading ? patch.sampleMesh(COONS_SHADING_DENSITY) : undefined;
    const centre = patch.eval(0.5, 0.5);
    return {
        revision,
        points,
        polylines,
        ...(mesh ? {mesh: {positions: mesh.vertices.flatMap(p => [p.X(), p.Y(), p.Z?.() ?? 0]), faces: mesh.faces.flatMap(face => [...face]), visible: true}} : {}),
        ...(mesh ? {meshOwners: [{id: "tensor-patch-0", kind: "tensor" as const, faceStart: 0, faceCount: mesh.faces.length * 3}]} : {}),
        markers: [{id: "evaluated", xyz: [centre.X(), centre.Y(), centre.Z?.() ?? 0], role: "evaluated"}],
        labels,
        camera: {...input.camera, target: [...input.camera.target]},
        // The boundary control points are always editable; the interior net is a derived drawing, not a set of points.
        interaction: {zMode: input.zMode, editable: true},
    };
}
