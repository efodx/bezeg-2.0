/**
 * Revolve a profile polyline about a coordinate axis into an inscribed k-gon mesh (ADR 0051 section 3).
 *
 * The profile is a list of [t, r] points: t is the position along the axis and r >= 0 the distance
 * from it. Ring vertices sit at angles 2*pi*j/k. A profile point with r = 0 becomes one apex vertex,
 * and the seam (angle 2*pi back to 0) reuses the first ring vertex, so the mesh is welded: distinct
 * indices have distinct coordinates. The result is a `Float64Array` solid in real units.
 */
import type {Solid} from "./solid";

export type Axis = "x" | "y" | "z";

export const REVOLVE_K = 48;
export const MAX_PROFILE_POINTS = 64;

const AXIS_INDEX: Record<Axis, number> = {x: 0, y: 1, z: 2};

/** The ratio of an inscribed regular k-gon area to its circle: (k / 2 pi) sin(2 pi / k). */
export function kgonFactor(k: number): number {
    return (k / (2 * Math.PI)) * Math.sin((2 * Math.PI) / k);
}

/** Exact volume of the solid of revolution of the polyline: the sum of frustums pi h (r0^2 + r0 r1 + r1^2) / 3. */
export function frustumSum(profile: ReadonlyArray<readonly [number, number]>): number {
    let sum = 0;
    for (let i = 0; i + 1 < profile.length; i++) {
        const [t0, r0] = profile[i];
        const [t1, r1] = profile[i + 1];
        sum += (Math.PI * (t1 - t0) * (r0 * r0 + r0 * r1 + r1 * r1)) / 3;
    }
    return sum;
}

function assertProfile(profile: ReadonlyArray<readonly [number, number]>, k: number): void {
    if (!Number.isInteger(k) || k < 3) {
        throw new RangeError("Revolve needs an integer k >= 3");
    }
    if (profile.length < 2 || profile.length > MAX_PROFILE_POINTS) {
        throw new RangeError(`A profile has 2..${MAX_PROFILE_POINTS} points`);
    }
    profile.forEach(([t, r], i) => {
        if (!Number.isFinite(t) || !Number.isFinite(r) || r < 0) {
            throw new RangeError(`Profile point ${i} must be finite with r >= 0`);
        }
        if (i > 0 && !(t > profile[i - 1][0])) {
            throw new RangeError("Profile positions along the axis must strictly increase");
        }
        if (r === 0 && i > 0 && i < profile.length - 1) {
            throw new RangeError("Only the first or last profile point may lie on the axis");
        }
    });
    if (profile.length === 2 && profile[0][1] === 0 && profile[1][1] === 0) {
        throw new RangeError("A profile on the axis encloses no volume");
    }
}

/** Closed outward mesh of the profile revolved about `axis`; ring angle runs counter-clockwise in the cyclic axis order. */
export function revolve(profile: ReadonlyArray<readonly [number, number]>, k: number = REVOLVE_K, axis: Axis = "z"): Solid {
    assertProfile(profile, k);
    const a = AXIS_INDEX[axis];
    const u = (a + 1) % 3;
    const v = (a + 2) % 3;
    const coords: number[] = [];
    // start[i] is the first vertex index of profile point i (its ring, or the single apex).
    const start: number[] = [];
    const cos: number[] = [];
    const sin: number[] = [];
    for (let j = 0; j < k; j++) {
        cos.push(Math.cos((2 * Math.PI * j) / k));
        sin.push(Math.sin((2 * Math.PI * j) / k));
    }
    for (const [t, r] of profile) {
        start.push(coords.length / 3);
        const count = r === 0 ? 1 : k;
        for (let j = 0; j < count; j++) {
            const p = [0, 0, 0];
            p[a] = t;
            p[u] = r * cos[j];
            p[v] = r * sin[j];
            coords.push(p[0], p[1], p[2]);
        }
    }
    const last = profile.length - 1;
    const faces: number[][] = [];
    const apexAt = (i: number) => profile[i][1] === 0;
    if (!apexAt(0)) {
        faces.push(Array.from({length: k}, (_, j) => start[0] + k - 1 - j));
    }
    if (!apexAt(last)) {
        faces.push(Array.from({length: k}, (_, j) => start[last] + j));
    }
    for (let i = 0; i < last; i++) {
        for (let j = 0; j < k; j++) {
            const j1 = (j + 1) % k;
            if (apexAt(i)) {
                faces.push([start[i], start[i + 1] + j1, start[i + 1] + j]);
            } else if (apexAt(i + 1)) {
                faces.push([start[i] + j, start[i] + j1, start[i + 1]]);
            } else {
                faces.push([start[i] + j, start[i] + j1, start[i + 1] + j1, start[i + 1] + j]);
            }
        }
    }
    return {vertices: Float64Array.from(coords), faces};
}
