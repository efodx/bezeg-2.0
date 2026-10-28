import {CURVE_SAMPLES, patchFromNet, type TensorSceneInput} from "./patchSceneBuilder";
import {resolveTeapotPatch, TEAPOT_PATCH_COUNT} from "./teapot/utahTeapot";
import type {ScenePolyline, SurfaceScene, Xyz} from "./surface-view/surfaceScene";

/** What the capstone scene is built from: only the view and the two switches it offers (no net, iso curves or parameter point). */
export type TeapotSceneInput = Pick<TensorSceneInput, "camera" | "showBoundaryCurves" | "showShading">;

/** Shading cells per patch side. The 16 option stays off until the ADR 0018 stress acceptance has been run on a 32-patch scene. */
export const TEAPOT_SHADING_CELLS = 8;

/** Two mesh vertices closer than this make a face degenerate (zero area). */
const COINCIDENT = 1e-12;

const xyz = (point: {X(): number; Y(): number; Z?(): number}): Xyz => [point.X(), point.Y(), point.Z?.() ?? 0];

const coincident = (positions: readonly number[], a: number, b: number): boolean =>
    Math.abs(positions[3 * a] - positions[3 * b]) <= COINCIDENT && Math.abs(positions[3 * a + 1] - positions[3 * b + 1]) <= COINCIDENT
    && Math.abs(positions[3 * a + 2] - positions[3 * b + 2]) <= COINCIDENT;

/**
 * The Utah teapot as 32 bicubic patches in one scene: one merged mesh (each patch sampled at {@link TEAPOT_SHADING_CELLS}
 * cells per side, patch `k`'s vertices following patch `k - 1`'s) and, with `showBoundaryCurves`, four boundary polylines
 * per patch (`patch-<k>-boundary-u0` and so on, role `boundary`) so the seams between owners are visible. No control net,
 * points, iso curves, markers or labels, and the scene is not editable.
 *
 * Degenerate faces: the lid (patches 20 to 23) and bottom (28 to 31) patches have one boundary row collapsed to a single
 * point (the cusps), so half the faces of that cell row have two coincident vertices and zero area. They are dropped from the
 * mesh (8 faces per such patch, 64 in all); every patch keeps its remaining faces and its vertices, so all 32 owners stay.
 */
export function buildTeapotScene(input: TeapotSceneInput, revision: number): SurfaceScene {
    const polylines: ScenePolyline[] = [];
    const positions: number[] = [];
    const faces: number[] = [];
    for (let k = 0; k < TEAPOT_PATCH_COUNT; k++) {
        const patch = patchFromNet(resolveTeapotPatch(k));
        if (input.showBoundaryCurves) {
            const sampled = (at: (t: number) => Xyz): Xyz[] => Array.from({length: CURVE_SAMPLES + 1}, (_, s) => at(s / CURVE_SAMPLES));
            polylines.push(
                {id: `patch-${k}-boundary-u0`, role: "boundary", points: sampled(t => xyz(patch.eval(0, t)))},
                {id: `patch-${k}-boundary-u1`, role: "boundary", points: sampled(t => xyz(patch.eval(1, t)))},
                {id: `patch-${k}-boundary-v0`, role: "boundary", points: sampled(t => xyz(patch.eval(t, 0)))},
                {id: `patch-${k}-boundary-v1`, role: "boundary", points: sampled(t => xyz(patch.eval(t, 1)))},
            );
        }
        if (input.showShading) {
            const mesh = patch.sampleMesh(TEAPOT_SHADING_CELLS);
            const offset = positions.length / 3;
            for (const vertex of mesh.vertices) positions.push(...xyz(vertex));
            for (const [a, b, c] of mesh.faces) {
                const [ia, ib, ic] = [a + offset, b + offset, c + offset];
                if (!coincident(positions, ia, ib) && !coincident(positions, ib, ic) && !coincident(positions, ia, ic)) faces.push(ia, ib, ic);
            }
        }
    }
    return {
        revision,
        points: [],
        polylines,
        ...(input.showShading ? {mesh: {positions, faces, visible: true}} : {}),
        markers: [],
        labels: [],
        camera: {...input.camera, target: [...input.camera.target]},
        interaction: {zMode: false, editable: false},
    };
}
