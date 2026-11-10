import {describe, expect, it} from "vitest";
import {cone, cube, isClosed, isConvex, prism, pyramid, vertexCount} from "./solid";
import {frustumSum, kgonFactor, revolve} from "./revolve";
import {coneVolume, meshVolume, prismVolume, pyramidVolume, sphereVolume} from "./volume";

function coordinateKeys(vertices: ArrayLike<number>): Set<string> {
    const keys = new Set<string>();
    for (let i = 0; i < vertices.length; i += 3) {
        keys.add(`${vertices[i]},${vertices[i + 1]},${vertices[i + 2]}`);
    }
    return keys;
}

/** Shoelace centroid and area of the region between the profile and the axis (Pappus oracle). */
function pappusVolume(profile: ReadonlyArray<readonly [number, number]>): number {
    const poly = [...profile, [profile[profile.length - 1][0], 0] as const, [profile[0][0], 0] as const];
    let twiceArea = 0;
    let cy = 0;
    for (let i = 0; i < poly.length; i++) {
        const [x0, y0] = poly[i];
        const [x1, y1] = poly[(i + 1) % poly.length];
        const cross = x0 * y1 - x1 * y0;
        twiceArea += cross;
        cy += (y0 + y1) * cross;
    }
    const area = Math.abs(twiceArea) / 2;
    const centroidR = Math.abs(cy / (3 * twiceArea));
    return 2 * Math.PI * centroidR * area;
}

describe("kgonFactor", () => {
    it("is 0.99715 for k = 48 and lowers every volume", () => {
        expect(kgonFactor(48)).toBeCloseTo(0.99715, 5);
        expect(kgonFactor(4)).toBeCloseTo(2 / Math.PI, 14);
        expect(kgonFactor(3)).toBeLessThan(kgonFactor(48));
    });
});

describe("revolve", () => {
    const sqrtProfile = Array.from({length: 9}, (_, i) => [i / 2, Math.sqrt(i / 2)] as [number, number]);
    const sphereProfile = Array.from({length: 13}, (_, i) => {
        const x = -3 + i / 2;
        return [x, Math.sqrt(Math.max(0, 9 - x * x))] as [number, number];
    });

    it("mesh volume equals the frustum sum times the k-gon factor (SV5, 8-segment sqrt profile)", () => {
        const solid = revolve(sqrtProfile, 48, "x");
        expect(isClosed(solid)).toBe(true);
        const mesh = meshVolume(solid);
        expect(mesh / (frustumSum(sqrtProfile) * kgonFactor(48))).toBeCloseTo(1, 12);
        expect(mesh).toBeCloseTo(24.8629, 4);
        expect(1 - mesh / (8 * Math.PI)).toBeCloseTo(0.011, 3);
    });

    it("agrees with Pappus' theorem scaled by the k-gon factor", () => {
        const profile = [[0, 1], [1, 2.5], [3, 1.5], [4, 0.5]] as const;
        expect(meshVolume(revolve(profile, 48, "z")) / (pappusVolume(profile) * kgonFactor(48))).toBeCloseTo(1, 12);
    });

    it("k = 4 and k = 6 cylinders are exact prisms", () => {
        const profile = [[0, 2], [5, 2]] as const;
        expect(meshVolume(revolve(profile, 4, "z"))).toBeCloseTo(prismVolume(2 * 2 * 2, 5), 12);
        expect(meshVolume(revolve(profile, 6, "z"))).toBeCloseTo(prismVolume(1.5 * Math.sqrt(3) * 4, 5), 12);
    });

    it("welds the axis and the seam: an apex is one vertex and no coordinates repeat", () => {
        const solid = revolve(sphereProfile, 48, "x");
        expect(vertexCount(solid)).toBe(2 + 48 * 11);
        expect(coordinateKeys(solid.vertices).size).toBe(vertexCount(solid));
        expect(isClosed(solid)).toBe(true);
        expect(meshVolume(solid) / (frustumSum(sphereProfile) * kgonFactor(48))).toBeCloseTo(1, 12);
    });

    it("a ring-only profile has no apex and a one-apex profile has one", () => {
        const cylinder = revolve([[0, 1], [2, 1]], 12, "y");
        expect(vertexCount(cylinder)).toBe(24);
        expect(coordinateKeys(cylinder.vertices).size).toBe(24);
        expect(isClosed(cylinder)).toBe(true);
        const tip = revolve([[0, 0], [1, 1], [2, 1]], 12, "y");
        expect(vertexCount(tip)).toBe(25);
        expect(coordinateKeys(tip.vertices).size).toBe(25);
        expect(isClosed(tip)).toBe(true);
        expect(meshVolume(tip) / (frustumSum([[0, 0], [1, 1], [2, 1]]) * kgonFactor(12))).toBeCloseTo(1, 12);
    });

    it("gives the same closed volume about each axis", () => {
        const volumes = (["x", "y", "z"] as const).map(axis => {
            const solid = revolve(sqrtProfile, 48, axis);
            expect(isClosed(solid)).toBe(true);
            return meshVolume(solid);
        });
        expect(volumes[1]).toBeCloseTo(volumes[0], 12);
        expect(volumes[2]).toBeCloseTo(volumes[0], 12);
    });

    it("rejects unusable profiles", () => {
        expect(() => revolve([[0, 1]], 48, "z")).toThrow(RangeError);
        expect(() => revolve([[0, 1], [0, 2]], 48, "z")).toThrow(RangeError);
        expect(() => revolve([[0, 1], [1, -1]], 48, "z")).toThrow(RangeError);
        expect(() => revolve([[0, 1], [1, 0], [2, 1]], 48, "z")).toThrow(RangeError);
        expect(() => revolve([[0, 0], [1, 0]], 48, "z")).toThrow(RangeError);
        expect(() => revolve([[0, 1], [1, 1]], 2, "z")).toThrow(RangeError);
        const long = (n: number) => Array.from({length: n}, (_, i) => [i, 1] as [number, number]);
        expect(isClosed(revolve(long(64), 8, "z"))).toBe(true);
        expect(() => revolve(Array.from({length: 65}, (_, i) => [i, 1] as [number, number]), 48, "z")).toThrow(RangeError);
    });
});

describe("builders against formulas", () => {
    it("cube, prism and pyramid meshes", () => {
        expect(meshVolume(cube())).toBeCloseTo(1, 12);
        const square = [[0, 0], [8, 0], [8, 8], [0, 8]] as const;
        expect(meshVolume(prism(square, 0, 12))).toBeCloseTo(prismVolume(4, 3), 12);
        expect(meshVolume(pyramid(square, 0, [4, 4, 8]))).toBeCloseTo(pyramidVolume(4, 2), 12);
        expect(prismVolume(4, 3)).toBe(12);
        expect(pyramidVolume(16, 4)).toBeCloseTo(64 / 3, 12);
    });

    it("cone mesh carries the k-gon factor and is a closed convex apex mesh", () => {
        const solid = cone(3, 4);
        expect(isClosed(solid)).toBe(true);
        expect(isConvex(solid)).toBe(true);
        expect(vertexCount(solid)).toBe(49);
        expect(meshVolume(solid) / (coneVolume(3, 4) * kgonFactor(48))).toBeCloseTo(1, 12);
        expect(coneVolume(3, 4)).toBeCloseTo(37.699, 3);
        expect(sphereVolume(3)).toBeCloseTo(113.097, 3);
        expect(() => cone(0, 1)).toThrow(RangeError);
    });
});
