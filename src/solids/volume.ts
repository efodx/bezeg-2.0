import {realCoords, vertexCount, type Solid, type Vec3} from "./solid";

/**
 * Volume of a closed mesh by signed tetrahedra (fan triangles against the first vertex as origin).
 * Positive for outward counter-clockwise faces; an empty mesh has volume 0.
 */
export function meshVolume(solid: Solid): number {
    if (vertexCount(solid) === 0) {
        return 0;
    }
    const o = realCoords(solid, 0);
    let sum = 0;
    for (const f of solid.faces) {
        const a = realCoords(solid, f[0]);
        for (let k = 1; k + 1 < f.length; k++) {
            const b = realCoords(solid, f[k]);
            const c = realCoords(solid, f[k + 1]);
            const ax = a[0] - o[0], ay = a[1] - o[1], az = a[2] - o[2];
            const bx = b[0] - o[0], by = b[1] - o[1], bz = b[2] - o[2];
            const cx = c[0] - o[0], cy = c[1] - o[1], cz = c[2] - o[2];
            sum += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
        }
    }
    return sum / 6;
}

/** Newell vector (twice the signed area vector) of a closed loop of points. */
export function newellVector(points: ReadonlyArray<Vec3>): Vec3 {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        x += (a[1] - b[1]) * (a[2] + b[2]);
        y += (a[2] - b[2]) * (a[0] + b[0]);
        z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return [x, y, z];
}

/**
 * Area of a planar polygon from its boundary-ordered corners (real units), as half the length of
 * the Newell vector. It uses no plane normal, so it is independent of the clipping plane.
 */
export function sectionAreaFromLoop(points: ReadonlyArray<Vec3>): number {
    const [x, y, z] = newellVector(points);
    return Math.hypot(x, y, z) / 2;
}
