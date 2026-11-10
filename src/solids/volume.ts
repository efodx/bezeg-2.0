import {realCoords, vertexCount, type Solid, type Vec3} from "./solid";
import {FUNCTION_CATALOG} from "../analysis/functions";
import {riemannSum, type SumMethod} from "../analysis/riemann";

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

/** Prism volume: base area times height. */
export function prismVolume(baseArea: number, height: number): number {
    return baseArea * height;
}

/** Pyramid volume: one third of base area times height. */
export function pyramidVolume(baseArea: number, height: number): number {
    return baseArea * height / 3;
}

/** Exact cone volume pi r^2 h / 3. */
export function coneVolume(radius: number, height: number): number {
    return Math.PI * radius * radius * height / 3;
}

/** Exact sphere volume 4 pi r^3 / 3. */
export function sphereVolume(radius: number): number {
    return 4 * Math.PI * radius ** 3 / 3;
}

/**
 * Disc sum pi * (Riemann sum of f^2) over [a, b] with n discs by the given rule, using the
 * `riemannSum` of the integral demonstration unchanged. An approximation of pi * integral f^2.
 */
export function discVolume(f: (x: number) => number, a: number, b: number, n: number, rule: SumMethod): number {
    const squared = {...FUNCTION_CATALOG.square, value: (x: number) => f(x) ** 2};
    return Math.PI * riemannSum(squared, a, b, n, rule);
}

/**
 * Area of the horizontal cross-section z = height of a closed outward mesh, by Green's theorem on
 * the oriented cut segments of the fan triangles. A vertex at exactly the height counts as above.
 * Shares no code with `sectionConvex`; also valid for non-convex meshes. Throws RangeError unless
 * the height is strictly between the lowest and highest vertex; a vertex at an interior height
 * counts as above the cut.
 */
export function sliceAreaAt(solid: Solid, height: number): number {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < vertexCount(solid); i++) {
        const z = realCoords(solid, i)[2];
        lo = Math.min(lo, z);
        hi = Math.max(hi, z);
    }
    if (!(height > lo && height < hi)) {
        throw new RangeError("Slice height must lie strictly between the lowest and highest vertex");
    }
    let twice = 0;
    for (const f of solid.faces) {
        const p0 = realCoords(solid, f[0]);
        for (let k = 1; k + 1 < f.length; k++) {
            const tri = [p0, realCoords(solid, f[k]), realCoords(solid, f[k + 1])];
            let down: Vec3 | undefined;
            let up: Vec3 | undefined;
            for (let i = 0; i < 3; i++) {
                const p = tri[i];
                const q = tri[(i + 1) % 3];
                const pa = p[2] >= height;
                const qa = q[2] >= height;
                if (pa === qa) {
                    continue;
                }
                const s = (height - p[2]) / (q[2] - p[2]);
                const c: Vec3 = [p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1]), height];
                if (pa) {
                    down = c;
                } else {
                    up = c;
                }
            }
            if (down && up) {
                twice += down[0] * up[1] - up[0] * down[1];
            }
        }
    }
    return twice / 2;
}
