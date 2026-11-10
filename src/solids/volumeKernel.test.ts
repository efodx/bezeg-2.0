import {describe, expect, it} from "vitest";
import {cube, gridSolid, isClosed, prism, pyramid, type Solid} from "./solid";
import {kgonFactor, revolve} from "./revolve";
import {discVolume, meshVolume, sliceAreaAt, sphereVolume} from "./volume";

const sphereF = (x: number) => Math.sqrt(Math.max(0, 9 - x * x));

describe("discVolume", () => {
    it("sphere: 6 midpoint discs overshoot, 60 discs get close (SV5)", () => {
        const six = discVolume(sphereF, -3, 3, 6, "midpoint");
        expect(six).toBeCloseTo(114.668, 3);
        expect(six).toBeGreaterThan(sphereVolume(3));
        expect(discVolume(sphereF, -3, 3, 60, "midpoint")).toBeCloseTo(113.113, 3);
    });

    it("x^2 on [0,1]: 5 midpoint discs undershoot pi/5 (SV5)", () => {
        const five = discVolume(x => x * x, 0, 1, 5, "midpoint");
        expect(five).toBeCloseTo(0.6075, 4);
        expect(five).toBeLessThan(Math.PI / 5);
    });

    it("sqrt x on [0,4] is exact for the midpoint rule: 8 pi", () => {
        expect(discVolume(Math.sqrt, 0, 4, 7, "midpoint")).toBeCloseTo(8 * Math.PI, 12);
    });

    it("cone r = 3z/4 on [0,4]: 4, 10, 100 discs (SV4)", () => {
        const f = (z: number) => 3 * z / 4;
        expect(discVolume(f, 0, 4, 4, "midpoint")).toBeCloseTo(37.110, 3);
        expect(discVolume(f, 0, 4, 10, "midpoint")).toBeCloseTo(37.605, 3);
        expect(discVolume(f, 0, 4, 100, "midpoint")).toBeCloseTo(37.698, 3);
        expect(discVolume(f, 0, 4, 100, "midpoint")).toBeLessThan(12 * Math.PI);
    });

    it("squares the radius: a constant radius 2 gives 4 pi h", () => {
        expect(discVolume(() => 2, 0, 3, 5, "midpoint")).toBeCloseTo(12 * Math.PI, 12);
    });
});

/** The same solid with the top ring (z > 0) shifted by `dx` grid units (an exact integer shear). */
function shearedPrism(base: ReadonlyArray<readonly [number, number]>, z1: number, dx: number): Solid {
    const straight = prism(base, 0, z1);
    const verts: Array<[number, number, number]> = [];
    for (let i = 0; i < straight.vertices.length; i += 3) {
        const z = straight.vertices[i + 2];
        verts.push([straight.vertices[i] + (z > 0 ? dx : 0), straight.vertices[i + 1], z]);
    }
    return gridSolid(verts, straight.faces);
}

describe("Cavalieri (SV3)", () => {
    const heights = Array.from({length: 100}, (_, i) => 3 * (i + 0.5) / 100);

    it("sheared square prism: equal volume 12 and slice area 4 at 100 heights", () => {
        const base = [[-4, 0], [4, 0], [4, 8], [-4, 8]] as const;
        const straight = prism(base, 0, 12);
        const oblique = shearedPrism(base, 12, 6);
        expect(isClosed(oblique)).toBe(true);
        expect(meshVolume(straight)).toBeCloseTo(12, 12);
        expect(meshVolume(oblique)).toBeCloseTo(12, 12);
        for (const h of heights) {
            expect(sliceAreaAt(straight, h)).toBeCloseTo(4, 12);
            expect(sliceAreaAt(oblique, h)).toBeCloseTo(sliceAreaAt(straight, h), 12);
        }
    });

    it("slanted stack of cylinders: same volume and slice area as the straight one", () => {
        const straight = revolve([[0, 1], [3, 1]], 48, "z");
        const v = straight.vertices;
        const slanted = {vertices: Float64Array.from(v, (c, i) => (i % 3 === 0 ? c + 0.5 * v[i + 2] : c)), faces: straight.faces};
        expect(meshVolume(slanted)).toBeCloseTo(meshVolume(straight), 12);
        for (const h of heights) {
            expect(sliceAreaAt(slanted, h)).toBeCloseTo(Math.PI * kgonFactor(48), 12);
            expect(sliceAreaAt(straight, h)).toBeCloseTo(Math.PI * kgonFactor(48), 12);
        }
    });

    it("rejects heights outside the open vertex range", () => {
        const c = cube();
        for (const h of [-0.5, 0, 1, 2, NaN]) {
            expect(() => sliceAreaAt(c, h)).toThrow(RangeError);
        }
    });

    it("a cone and a cylinder have unequal slice areas", () => {
        const c = revolve([[0, 1], [3, 0]], 48, "z");
        const cyl = revolve([[0, 1], [3, 1]], 48, "z");
        expect(sliceAreaAt(cyl, 1.5) / sliceAreaAt(c, 1.5)).toBeCloseTo(4, 10);
    });

    it("slice areas of a pyramid shrink as (1 - z/H)^2 and the cube has area 1", () => {
        const base = [[0, 0], [8, 0], [8, 8], [0, 8]] as const;
        const p = pyramid(base, 0, [4, 4, 8]);
        for (const z of [0.25, 0.5, 1, 1.75]) {
            expect(sliceAreaAt(p, z)).toBeCloseTo(4 * (1 - z / 2) ** 2, 12);
        }
        expect(sliceAreaAt(cube(), 0.3)).toBeCloseTo(1, 12);
    });
});

describe("three pyramids tile the cube (SV4)", () => {
    it("meshes with common apex (1,1,1) and bases x=0, y=0, z=0 sum to volume 1", () => {
        const g = 4;
        const square = [[0, 0], [g, 0], [g, g], [0, g]] as const;
        const bottom = pyramid(square, 0, [g, g, g]);
        // Cyclic coordinate permutation (x,y,z) -> (y,z,x) keeps orientation outward.
        const rotate = (s: Solid): Solid => {
            const verts: Array<[number, number, number]> = [];
            for (let i = 0; i < s.vertices.length; i += 3) {
                verts.push([s.vertices[i + 1], s.vertices[i + 2], s.vertices[i]]);
            }
            return gridSolid(verts, s.faces);
        };
        const second = rotate(bottom);
        const third = rotate(second);
        let sum = 0;
        for (const s of [bottom, second, third]) {
            expect(isClosed(s)).toBe(true);
            expect(meshVolume(s)).toBeCloseTo(1 / 3, 12);
            sum += meshVolume(s);
        }
        expect(sum).toBeCloseTo(meshVolume(cube()), 12);
        expect(Array.from(second.vertices.slice(-3))).toEqual([g, g, g]);
    });
});
