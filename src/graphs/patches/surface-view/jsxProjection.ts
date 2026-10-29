import {FOV_DEG} from './surfaceMath';
import type {SurfaceCamera, Xyz} from './surfaceScene';

/**
 * Pure camera mathematics of the JSXGraph surface view (gate version).
 *
 * Mapping of `SurfaceCamera` onto JSXGraph's `view3d` with `projection: 'central'` (JSXGraph 1.14.1):
 *  - Board units are CSS pixels, the board's bounding box is [-W/2, H/2, W/2, -H/2], y up.
 *  - View3d always looks at the centre of its bounding cube, so the cube is centred on `camera.target`.
 *  - View3d's camera distance is `diag(bbox) * r`, so `r = distance / diag(bbox)`.
 *  - View3d's azimuth is `PI - az` (its y axis is mirrored against the Three convention), elevation is `el`.
 *  - View3d maps NDC +-1 to +-size/0.8 board units, so the view size is 0.4 * [W, H] and `fov` is `FOV_DEG`,
 *    which makes the vertical field of view exactly the camera's.
 * `projectToBoard` reproduces `view3d.project3DTo2D` for that setup; the test compares both.
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
    /** Unit vector from the target towards the camera. */
    back: Xyz;
    /** 1 / tan(fov / 2). */
    focal: number;
    halfWidth: number;
    halfHeight: number;
    /** View3d azimuth and elevation matching this camera. */
    jsxAz: number;
    jsxEl: number;
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
        halfWidth: viewport.width / 2,
        halfHeight: viewport.height / 2,
        jsxAz: Math.PI - az,
        jsxEl: el,
    };
}

/** Distance along the view axis from the camera to `p`; larger is farther away. */
export function viewDepth(m: JsxCameraModel, x: number, y: number, z: number): number {
    const dx = x - m.target[0], dy = y - m.target[1], dz = z - m.target[2];
    return m.distance - (m.back[0] * dx + m.back[1] * dy + m.back[2] * dz);
}

/** Board coordinates (y up, origin at the view centre) of a world point. */
export function projectToBoard(m: JsxCameraModel, x: number, y: number, z: number): [number, number] {
    const dx = x - m.target[0], dy = y - m.target[1], dz = z - m.target[2];
    const w = m.distance - (m.back[0] * dx + m.back[1] * dy + m.back[2] * dz);
    const k = m.focal / w;
    return [
        (m.right[0] * dx + m.right[1] * dy + m.right[2] * dz) * k * m.halfWidth,
        (m.up[0] * dx + m.up[1] * dy + m.up[2] * dz) * k * m.halfHeight,
    ];
}

/** Half side of the cube that view3d clamps point drags to: it must contain the whole scene and the camera target. */
export function bboxHalfSide(target: Xyz, min: Xyz, max: Xyz): number {
    let far = 0;
    for (let i = 0; i < 3; i++) far = Math.max(far, Math.abs(min[i] - target[i]), Math.abs(max[i] - target[i]));
    return Math.max(2, far * 1.25);
}

/** The view3d `r` that puts the camera `distance` away from the cube centre. */
export const viewRadiusFor = (halfSide: number, distance: number): number => distance / (2 * Math.sqrt(3) * halfSide);
