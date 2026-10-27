import type {SurfaceCamera, Xyz} from './surfaceScene';

export const FOV_DEG = 38;
/** The steepest elevation: the top preset sits exactly at the orbit limit, so the first drag from it does not jump. */
export const MAX_ELEVATION = 1.54;
export const MIN_DISTANCE = 1.5;
export const MAX_DISTANCE = 80;

export const CAMERA_PRESETS = {
    front: {az: 0, el: 0},
    top: {az: 0, el: MAX_ELEVATION},
    side: {az: Math.PI / 2, el: 0.06},
    isometric: {az: Math.PI / 4, el: 0.55},
} as const;
export type CameraPresetName = keyof typeof CAMERA_PRESETS;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const clampElevation = (el: number): number => clamp(el, -MAX_ELEVATION, MAX_ELEVATION);
export const clampDistance = (d: number): number => clamp(d, MIN_DISTANCE, MAX_DISTANCE);

/** Z-up camera position. az=0, el=0 looks along +y from -y (front view). */
export function cameraPosition(az: number, el: number, distance: number, target: Xyz = [0, 0, 0]): Xyz {
    return [
        target[0] + distance * Math.cos(el) * Math.sin(az),
        target[1] - distance * Math.cos(el) * Math.cos(az),
        target[2] + distance * Math.sin(el),
    ];
}

export function presetCamera(name: CameraPresetName, from: SurfaceCamera): SurfaceCamera {
    return {...from, ...CAMERA_PRESETS[name]};
}

export function boundsOf(points: readonly Xyz[]): {min: Xyz; max: Xyz} {
    if (!points.length) return {min: [0, 0, 0], max: [0, 0, 0]};
    const min: Xyz = [Infinity, Infinity, Infinity];
    const max: Xyz = [-Infinity, -Infinity, -Infinity];
    for (const p of points) {
        for (let i = 0; i < 3; i++) {
            if (p[i] < min[i]) min[i] = p[i];
            if (p[i] > max[i]) max[i] = p[i];
        }
    }
    return {min, max};
}

/**
 * Distance at which the bounding sphere of the box fits both the vertical and
 * horizontal field of view (narrow portrait aspect ratios are limited by the
 * horizontal field). Sphere fitting is orientation independent, so the whole
 * net stays visible while orbiting.
 */
export function fitDistance(bounds: {min: Xyz; max: Xyz}, aspect: number, fovDeg: number = FOV_DEG): number {
    const radius = Math.max(0.5, Math.hypot(
        bounds.max[0] - bounds.min[0], bounds.max[1] - bounds.min[1], bounds.max[2] - bounds.min[2]) / 2);
    const vHalf = (fovDeg * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * Math.max(0.1, aspect));
    const half = Math.min(vHalf, hHalf);
    return clampDistance((radius / Math.sin(half)) * 1.08);
}

export const boundsCenter = (b: {min: Xyz; max: Xyz}): Xyz =>
    [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];

export function fitCameraTo(points: readonly Xyz[], aspect: number, from: SurfaceCamera): SurfaceCamera {
    const b = boundsOf(points);
    return {...from, target: boundsCenter(b), distance: fitDistance(b, aspect)};
}

export function orbit(camera: SurfaceCamera, dxPx: number, dyPx: number, radPerPx = 0.008): SurfaceCamera {
    return {...camera, az: camera.az - dxPx * radPerPx, el: clampElevation(camera.el + dyPx * radPerPx)};
}

export function zoom(camera: SurfaceCamera, factor: number): SurfaceCamera {
    return {...camera, distance: clampDistance(camera.distance * factor)};
}

/**
 * Intersection of a ray with the horizontal plane z = planeZ.
 * Returns null when the ray is parallel to or points away from the plane.
 */
export function intersectHorizontalPlane(origin: Xyz, dir: Xyz, planeZ: number): Xyz | null {
    if (Math.abs(dir[2]) < 1e-9) return null;
    const t = (planeZ - origin[2]) / dir[2];
    if (!(t > 0)) return null;
    return [origin[0] + t * dir[0], origin[1] + t * dir[1], planeZ];
}

/** Horizontal drag: x/y follow the plane hit (grab-offset preserving), z exactly the start z. */
export function horizontalDrag(start: Xyz, grabHit: Xyz, currentHit: Xyz): Xyz {
    return [start[0] + currentHit[0] - grabHit[0], start[1] + currentHit[1] - grabHit[1], start[2]];
}

/** Z-mode drag: only z changes, from vertical screen displacement (up = +z). */
export function zModeDrag(start: Xyz, dyPx: number, distance: number, heightPx: number): Xyz {
    return [start[0], start[1], start[2] - (dyPx * distance) / Math.max(1, heightPx)];
}
