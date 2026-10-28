import {buildTensorScene, CURVE_SAMPLES, parsePatchPointId, patchFromNet, patchPointId, type TensorSceneInput} from "./patchSceneBuilder";
import type {SceneLabel, ScenePoint, ScenePolyline, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

/** Point ids of patch `B`: `b-i-j`, distinct from `A`'s `p-i-j`. */
export const joinPointId = (i: number, j: number): string => `b-${i}-${j}`;

/** Parses `b-i-j`; undefined for any other id. */
export function parseJoinPointId(id: string): [number, number] | undefined {
    const match = /^b-(\d+)-(\d+)$/.exec(id);
    return match ? [Number(match[1]), Number(match[2])] : undefined;
}

/** What the join scene is built from: patch `A` as the tensor scene input, plus patch `B` and the readout parameter `joinV`. */
export interface JoinSceneInput extends TensorSceneInput {
    /** `netB[i][j]`; `B`'s `u = 0` boundary meets `A`'s `u = 1` boundary. */
    readonly netB: ReadonlyArray<ReadonlyArray<Xyz>>;
    /** The `v` of the cross-boundary derivative arrows. */
    readonly joinV: number;
}

/** The two cross-boundary derivatives at `v`, and the one factor both are drawn with. */
export interface JoinArrows {
    /** `S_A(1, v)` and `S_B(0, v)`. */
    readonly pointA: Xyz;
    readonly pointB: Xyz;
    /** `S_{A,u}(1, v)` and `S_{B,u}(0, v)`, true size. */
    readonly derivativeA: Xyz;
    readonly derivativeB: Xyz;
    /** Both vectors are drawn multiplied by this; 0 when both vanish. */
    readonly drawScale: number;
}

const DISPLAY_FRACTION = 0.25;
const HEAD_FRACTION = 0.2;

const sub = (a: Xyz, b: Xyz): Xyz => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Xyz, b: Xyz): Xyz => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Xyz, k: number): Xyz => [a[0] * k, a[1] * k, a[2] * k];
const length = (a: Xyz): number => Math.hypot(a[0], a[1], a[2]);
const cross = (a: Xyz, b: Xyz): Xyz => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const xyzOf = (p: {X(): number; Y(): number; Z?(): number}): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0];

/**
 * `S_{A,u}(1, v)` and `S_{B,u}(0, v)` with one common display factor `k = 0.25 D / max(|S_{A,u}|, |S_{B,u}|)`, `D` the
 * bounding-box diagonal of both nets (the `drawDifferentials` idea): equal vectors draw equal and a ratio `alpha` draws as `alpha`.
 */
export function joinArrows(netA: ReadonlyArray<ReadonlyArray<Xyz>>, netB: ReadonlyArray<ReadonlyArray<Xyz>>, v: number): JoinArrows {
    const patchA = patchFromNet(netA), patchB = patchFromNet(netB);
    const derivativeA = xyzOf(patchA.partialU(1, v)), derivativeB = xyzOf(patchB.partialU(0, v));
    const points = [...netA, ...netB].flat();
    const extent = [0, 1, 2].map(c => Math.max(...points.map(p => p[c])) - Math.min(...points.map(p => p[c])));
    const longest = Math.max(length(derivativeA), length(derivativeB));
    return {
        pointA: xyzOf(patchA.eval(1, v)), pointB: xyzOf(patchB.eval(0, v)), derivativeA, derivativeB,
        drawScale: longest > 0 ? DISPLAY_FRACTION * Math.hypot(...extent) / longest : 0,
    };
}

/** A direction perpendicular to `d`, from the world axis least aligned with it. */
function perpendicular(d: Xyz): Xyz {
    const a = d.map(Math.abs);
    const axis: Xyz = a[0] <= a[1] && a[0] <= a[2] ? [1, 0, 0] : a[1] <= a[2] ? [0, 1, 0] : [0, 0, 1];
    const p = cross(d, axis);
    const l = length(p);
    return l > 0 ? scale(p, 1 / l) : [0, 0, 0];
}

/** The shaft and the two head segments of the arrow `delta` from `from`, as polylines `<id>-shaft`, `<id>-head-0`, `<id>-head-1`. */
function arrowPolylines(id: string, role: ScenePolyline["role"], from: Xyz, delta: Xyz): ScenePolyline[] {
    const tip = add(from, delta);
    const side = scale(perpendicular(delta), 0.35 * HEAD_FRACTION * length(delta));
    const base = add(tip, scale(delta, -HEAD_FRACTION));
    return [
        {id: `${id}-shaft`, role, points: [from, tip]},
        {id: `${id}-head-0`, role, points: [tip, add(base, side)]},
        {id: `${id}-head-1`, role, points: [tip, sub(base, side)]},
    ];
}

const renamedRole = (role: ScenePolyline["role"]): ScenePolyline["role"] => role === "net" ? "net-2" : role;

/**
 * Both patches in one scene. `A` is the tensor scene unchanged (ids `p-i-j`, `iso-…`, `net-…`); `B`'s objects are the same
 * with a `b-` id prefix, its net in role `net-2`, its points `b-i-j`. One mesh holds both surfaces (`B`'s faces offset by
 * `A`'s vertex count). `A`'s `u = 1` and `B`'s `u = 0` boundaries are drawn in role `highlight` (`join-boundary-a`/`-b`; they
 * coincide exactly when the join is at least C0). At `joinV` the arrows `S_{A,u}(1, v)` (role `vector-u`) and `S_{B,u}(0, v)`
 * (role `vector-v`) start at their own boundary points and share one display factor; a vanishing derivative has no arrow.
 */
export function buildJoinScene(input: JoinSceneInput, revision: number): SurfaceScene {
    const {netB, joinV, selectedPointId, ...shared} = input;
    const selectedB = selectedPointId === undefined ? undefined : parseJoinPointId(selectedPointId);
    const sceneInput = (net: ReadonlyArray<ReadonlyArray<Xyz>>, id: string | undefined): TensorSceneInput => ({...shared, net, ...(id === undefined ? {} : {selectedPointId: id})});
    // A selection on one patch is drawn on that patch only.
    const sceneA = buildTensorScene(sceneInput(input.net, selectedB ? undefined : selectedPointId), revision);
    const sceneB = buildTensorScene(sceneInput(netB, selectedB ? patchPointId(selectedB[0], selectedB[1]) : undefined), revision);

    const bPolylines: ScenePolyline[] = sceneB.polylines.map(line => ({id: `b-${line.id}`, role: renamedRole(line.role), points: line.points}));
    const bPoints: ScenePoint[] = sceneB.points.map(point => {
        const index = parsePatchPointId(point.id);
        return index === undefined ? point : {...point, id: joinPointId(index[0], index[1])};
    });
    const bLabels: SceneLabel[] = sceneB.labels.filter(label => label.id === "selected-point").map(label => ({
        ...label, id: "b-selected-point", text: label.text.replace(/^P/, "Q"),
        ...(selectedB ? {pointId: joinPointId(selectedB[0], selectedB[1])} : {}),
    }));

    const patchOfA = patchFromNet(input.net), patchOfB = patchFromNet(netB);
    const sampled = (at: (t: number) => Xyz): Xyz[] => Array.from({length: CURVE_SAMPLES + 1}, (_, k) => at(k / CURVE_SAMPLES));
    const boundaries: ScenePolyline[] = [
        {id: "join-boundary-a", role: "highlight", points: sampled(t => xyzOf(patchOfA.eval(1, t)))},
        {id: "join-boundary-b", role: "highlight", points: sampled(t => xyzOf(patchOfB.eval(0, t)))},
    ];

    const arrows = joinArrows(input.net, netB, joinV);
    const arrowLines: ScenePolyline[] = [];
    const arrowLabels: SceneLabel[] = [];
    if (arrows.drawScale > 0) {
        const parts: ReadonlyArray<readonly [string, ScenePolyline["role"], Xyz, Xyz, string]> = [
            ["join-su-a", "vector-u", arrows.pointA, arrows.derivativeA, "S_{A,u}"],
            ["join-su-b", "vector-v", arrows.pointB, arrows.derivativeB, "S_{B,u}"],
        ];
        for (const [id, role, from, derivative, text] of parts) {
            const delta = scale(derivative, arrows.drawScale);
            if (length(delta) === 0) continue;
            arrowLines.push(...arrowPolylines(id, role, from, delta));
            arrowLabels.push({id: `${id}-label`, text, anchor: add(from, delta)});
        }
    }

    const meshA = sceneA.mesh, meshB = sceneB.mesh;
    const mesh = meshA && meshB ? {
        positions: [...meshA.positions, ...meshB.positions],
        faces: [...meshA.faces, ...meshB.faces.map(index => index + meshA.positions.length / 3)],
        visible: meshA.visible && meshB.visible,
        chordTolerance: Math.max(meshA.chordTolerance ?? 0, meshB.chordTolerance ?? 0),
    } : undefined;

    return {
        ...sceneA,
        points: [...sceneA.points, ...bPoints],
        polylines: [...sceneA.polylines, ...bPolylines, ...boundaries, ...arrowLines],
        labels: [...sceneA.labels, ...bLabels, ...arrowLabels],
        ...(mesh ? {mesh} : {}),
    };
}
