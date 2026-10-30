import {FOV_DEG} from './surfaceMath';
import type {SurfaceCamera, Xyz} from './surfaceScene';

/**
 * Pure camera projection of the surface view (renderer-free: no JSXGraph, no Three).
 *
 * `SurfaceCamera` has fixed semantics: perspective, z up, `az`/`el` in radians, `distance` from `target`, and a
 * vertical field of view of `FOV_DEG`; the eye is `cameraPosition(az, el, distance, target)`. `makeCameraModel`
 * turns a camera and a viewport (CSS pixels) into a model, and `projectToScreen` maps a world point to
 *  - screen x/y in CSS pixels from the host's top-left corner, y down,
 *  - NDC x/y in [-1, 1] (y up), the same convention as a Three `PerspectiveCamera` with aspect `width / height`,
 *  - view depth, the distance along the view axis from the eye; larger is farther away.
 * It is the single projection used for drawing, depth order, picking and labels. The horizontal field of view
 * follows from the aspect ratio: one world unit spans the same number of pixels horizontally and vertically.
 * `pinholeOracle.test-helper.ts` is an independent implementation that the tests compare this module against.
 */

export interface JsxViewport {
    width: number;
    height: number;
}

export interface JsxCameraModel {
    target: Xyz;
    distance: number;
    right: Xyz;
    up: Xyz;
    /** Unit vector from the target towards the eye. */
    back: Xyz;
    /** 1 / tan(fov / 2). */
    focal: number;
    width: number;
    height: number;
}

export interface ScreenPoint {
    x: number;
    y: number;
    ndcX: number;
    ndcY: number;
    depth: number;
}

export function makeCameraModel(camera: SurfaceCamera, viewport: JsxViewport): JsxCameraModel {
    const {az, el} = camera;
    const sa = Math.sin(az), ca = Math.cos(az), se = Math.sin(el), ce = Math.cos(el);
    return {
        target: camera.target,
        distance: camera.distance,
        right: [ca, sa, 0],
        up: [-se * sa, se * ca, ce],
        back: [ce * sa, -ce * ca, se],
        focal: 1 / Math.tan((FOV_DEG * Math.PI) / 360),
        width: viewport.width,
        height: viewport.height,
    };
}

export const newScreenPoint = (): ScreenPoint => ({x: 0, y: 0, ndcX: 0, ndcY: 0, depth: 0});

/** Screen position, NDC and view depth of a world point; writes into `out` so frame loops allocate nothing. */
export function projectToScreen(m: JsxCameraModel, x: number, y: number, z: number, out: ScreenPoint = newScreenPoint()): ScreenPoint {
    const dx = x - m.target[0], dy = y - m.target[1], dz = z - m.target[2];
    const w = m.distance - (m.back[0] * dx + m.back[1] * dy + m.back[2] * dz);
    const k = m.focal / w;
    const aspect = m.width / m.height;
    out.depth = w;
    out.ndcX = (m.right[0] * dx + m.right[1] * dy + m.right[2] * dz) * k / aspect;
    out.ndcY = (m.up[0] * dx + m.up[1] * dy + m.up[2] * dz) * k;
    out.x = (out.ndcX + 1) * m.width / 2;
    out.y = (1 - out.ndcY) * m.height / 2;
    return out;
}
