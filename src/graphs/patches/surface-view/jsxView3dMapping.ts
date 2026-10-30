import type {JsxViewport} from './jsxProjection';
import type {SurfaceCamera, Xyz} from './surfaceScene';

/**
 * How `SurfaceCamera` maps onto JSXGraph 1.14.1's `view3d` (`projection: 'central'`). The adapter draws the mesh itself
 * with `jsxProjection.ts`; `view3d` only hosts the draggable `point3d` control points and markers, so it must put every
 * world point exactly where the pure projection does.
 *  - The board's bounding box is [-W/2, H/2, W/2, -H/2] (1 unit = 1 CSS pixel, y up).
 *  - View3d always looks at the centre of its bounding cube, so the cube is centred on `camera.target`.
 *  - View3d's camera distance is `diag(bbox) * r`, so `r = distance / diag(bbox)`.
 *  - View3d's azimuth is `PI - az` (its y axis is mirrored against ours), its elevation is `el`.
 *  - View3d maps NDC +-1 to +-size/0.8 board units on each axis and applies no aspect correction of its own, so the
 *    view is square, `0.4 * height` on both sides: x is then scaled by `height / 2` like y, as the pure projection says.
 *    (A `0.4 * width` by `0.4 * height` view stretched everything horizontally by the aspect ratio.)
 */

export interface View3dFrame {
    size: [number, number];
    llftCorner: [number, number];
}

/** Size and lower-left corner (board units) of the `view3d`, centred on the board origin. */
export function view3dFrame(viewport: JsxViewport): View3dFrame {
    const side = 0.4 * viewport.height;
    return {size: [side, side], llftCorner: [-side / 2, -side / 2]};
}

/** View3d azimuth in [0, 2 PI) and elevation for a camera. */
export function view3dAngles(camera: SurfaceCamera): {az: number; el: number} {
    return {az: (((Math.PI - camera.az) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), el: camera.el};
}

/** Half side of the cube that view3d clamps point drags to: it must contain the whole scene and the camera target. */
export function bboxHalfSide(target: Xyz, min: Xyz, max: Xyz): number {
    let far = 0;
    for (let i = 0; i < 3; i++) far = Math.max(far, Math.abs(min[i] - target[i]), Math.abs(max[i] - target[i]));
    return Math.max(2, far * 1.25);
}

/** The view3d `r` that puts the camera `distance` away from the cube centre. */
export const viewRadiusFor = (halfSide: number, distance: number): number => distance / (2 * Math.sqrt(3) * halfSide);
