import {JsxCameraModel, makeCameraModel, newScreenPoint, projectToScreen} from './jsxProjection';
import type {SceneMesh, SurfaceScene, Xyz} from './surfaceScene';

export const FRAMING_ATTRIBUTE = 'data-surface-framing';

/** View depth range inside which a point counts as in frame; the clipping planes of the former Three view's camera. */
const NEAR = 0.05;
const FAR = 500;

export interface MeshBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
    inFrustum: boolean;
}

export interface SurfaceFraming {
    width: number;
    height: number;
    camera: {az: number; el: number; distance: number; target: number[]};
    meshBounds: MeshBounds;
    points: Array<{id: string; x: number; y: number; inFrustum: boolean}>;
}

export interface LocalBounds {
    min: Xyz;
    max: Xyz;
}

const round = (v: number): number => Math.round(v * 1000) / 1000;
const roundDown = (v: number): number => Math.floor(v * 1000) / 1000;
const roundUp = (v: number): number => Math.ceil(v * 1000) / 1000;

/** World-space box around the vertices the faces index (not the unreferenced ones); null for an empty or invalid mesh. */
export function indexedMeshBounds(mesh: SceneMesh): LocalBounds | null {
    const {positions, faces} = mesh;
    if (!mesh.visible || faces.length < 3 || faces.length % 3 !== 0) return null;
    const count = positions.length / 3;
    const min: Xyz = [Infinity, Infinity, Infinity], max: Xyz = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < faces.length; i++) {
        const v = faces[i];
        if (!Number.isInteger(v) || v < 0 || v >= count) return null;
        for (let axis = 0; axis < 3; axis++) {
            const c = positions[3 * v + axis];
            if (c < min[axis]) min[axis] = c;
            if (c > max[axis]) max[axis] = c;
        }
    }
    return [...min, ...max].every(Number.isFinite) ? {min, max} : null;
}

/** Screen box of the eight corners of `bounds`; because the projection is a perspective one it contains the mesh. */
export function projectMeshBounds(model: JsxCameraModel, bounds: LocalBounds): MeshBounds | null {
    const p = newScreenPoint();
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, inFrustum = true;
    for (const x of [bounds.min[0], bounds.max[0]]) {
        for (const y of [bounds.min[1], bounds.max[1]]) {
            for (const z of [bounds.min[2], bounds.max[2]]) {
                projectToScreen(model, x, y, z, p);
                if (![p.x, p.y, p.depth].every(Number.isFinite)) return null;
                left = Math.min(left, p.x);
                right = Math.max(right, p.x);
                top = Math.min(top, p.y);
                bottom = Math.max(bottom, p.y);
                if (!isInFrame(p.ndcX, p.ndcY, p.depth)) inFrustum = false;
            }
        }
    }
    return {left: roundDown(left), top: roundDown(top), right: roundUp(right), bottom: roundUp(bottom), inFrustum};
}

function isInFrame(ndcX: number, ndcY: number, depth: number): boolean {
    return Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1 && depth >= NEAR && depth <= FAR;
}

/**
 * Read-only evidence for the preview capture scripts, in the format the former Three view published: the canvas size in
 * CSS pixels, the camera, the screen box of the whole indexed mesh and every control point in screen pixels (y down).
 * Null when there is nothing to report.
 */
export function surfaceFraming(scene: SurfaceScene, bounds: LocalBounds, size: {width: number; height: number}): SurfaceFraming | null {
    const model = makeCameraModel(scene.camera, size);
    const meshBounds = projectMeshBounds(model, bounds);
    if (!meshBounds) return null;
    const p = newScreenPoint();
    const camera = scene.camera;
    return {
        width: size.width, height: size.height,
        camera: {az: camera.az, el: camera.el, distance: camera.distance, target: [...camera.target]},
        meshBounds,
        points: scene.points.map(pt => {
            projectToScreen(model, pt.xyz[0], pt.xyz[1], pt.xyz[2], p);
            return {id: pt.id, x: round(p.x), y: round(p.y), inFrustum: isInFrame(p.ndcX, p.ndcY, p.depth)};
        }),
    };
}
