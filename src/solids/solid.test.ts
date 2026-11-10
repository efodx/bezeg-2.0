import {describe, expect, it} from "vitest";
import {
    assertGridSolid, cube, gridSolid, isClosed, isConvex, prism, pyramid, toTriangles, vertexCount, type Solid,
} from "./solid";
import {meshVolume} from "./volume";

/** Concave U-shaped base (cell size 4 grid units = 1), counter-clockwise; area 5. */
const U_BASE: Array<[number, number]> = [[0, 0], [12, 0], [12, 8], [8, 8], [8, 4], [4, 4], [4, 8], [0, 8]];
const SQUARE_BASE: Array<[number, number]> = [[-8, -8], [8, -8], [8, 8], [-8, 8]];

function flipFace(solid: Solid, index: number): Solid {
    return {vertices: solid.vertices, faces: solid.faces.map((f, i) => (i === index ? [...f].reverse() : f))};
}

describe("builders", () => {
    const solids: Array<[string, Solid, number]> = [
        ["cube", cube(), 1],
        ["triangular prism", prism([[0, 0], [8, 0], [0, 8]], 0, 12), 6],
        ["square pyramid", pyramid(SQUARE_BASE, -8, [0, 0, 8]), 64 / 3],
        ["hexagonal prism", prism([[4, 0], [8, 0], [12, 4], [8, 8], [4, 8], [0, 4]], -4, 4), 8],
    ];

    for (const [name, solid, volume] of solids) {
        it(`${name} is closed, convex and outward with the formula volume`, () => {
            expect(isClosed(solid)).toBe(true);
            expect(isConvex(solid)).toBe(true);
            // Closed forms: 1; (2*2/2)*3; 4*4*4/3; hexagon (3x2 box minus four corner halves = 4) * height 2.
            expect(meshVolume(solid)).toBeCloseTo(volume, 12);
        });
    }

    it("converts to fan triangles that cover every face", () => {
        const {positions, triangles} = toTriangles(cube());
        expect(positions.length).toBe(24);
        expect(triangles.length).toBe(6 * 2 * 3);
        expect(Math.max(...positions)).toBe(1);
    });
});

describe("isClosed and isConvex", () => {
    it("rejects a mesh with one flipped face", () => {
        const bad = flipFace(cube(), 3);
        expect(isClosed(bad)).toBe(false);
        expect(isConvex(bad)).toBe(false);
    });

    it("rejects a mesh with a missing face and a repeated vertex", () => {
        const c = cube();
        expect(isClosed({vertices: c.vertices, faces: c.faces.slice(1)})).toBe(false);
        expect(isClosed({vertices: c.vertices, faces: [[0, 0, 1], ...c.faces.slice(1)]})).toBe(false);
        expect(isClosed({vertices: c.vertices, faces: [[0, 2, 99], ...c.faces.slice(1)]})).toBe(false);
    });

    it("rejects an inward-oriented whole mesh as not convex-outward", () => {
        const c = cube();
        const inward = {vertices: c.vertices, faces: c.faces.map(f => [...f].reverse())};
        expect(isClosed(inward)).toBe(true);
        expect(isConvex(inward)).toBe(false);
        expect(meshVolume(inward)).toBeCloseTo(-1, 12);
    });

    it("is closed but not convex for the U prism, and an empty mesh is closed", () => {
        const u = prism(U_BASE, 0, 8);
        expect(isClosed(u)).toBe(true);
        expect(isConvex(u)).toBe(false);
        expect(meshVolume(u)).toBeCloseTo(5 * 2, 12);
        expect(isClosed({vertices: new Float64Array(0), faces: []})).toBe(true);
    });

    it("rejects a non-planar face", () => {
        const verts: Array<[number, number, number]> = [[0, 0, 0], [4, 0, 0], [4, 4, 1], [0, 4, 0]];
        const sheet = gridSolid(verts, [[0, 1, 2, 3], [3, 2, 1, 0]]);
        expect(isClosed(sheet)).toBe(true);
        expect(isConvex(sheet)).toBe(false);
    });
});

describe("grid validation", () => {
    it("rejects off-grid and out-of-range vertices", () => {
        expect(() => gridSolid([[0.5, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 1, 2]])).toThrow(RangeError);
        expect(() => gridSolid([[13, 0, 0], [1, 0, 0], [0, 1, 0]], [[0, 1, 2]])).toThrow(RangeError);
        expect(() => prism([[0, 0], [20, 0], [0, 4]], 0, 4)).toThrow(RangeError);
        expect(() => prism([[0, 0], [4, 0], [0, 4]], 4, 4)).toThrow(RangeError);
        expect(() => pyramid([[0, 0], [4, 0], [0, 4]], 4, [0, 0, 4])).toThrow(RangeError);
    });

    it("rejects float and out-of-range stored coordinates for sections", () => {
        const c = cube();
        expect(() => assertGridSolid({vertices: Float64Array.from(c.vertices), faces: c.faces})).toThrow(RangeError);
        const wide = Int32Array.from(c.vertices);
        wide[0] = 13;
        expect(() => assertGridSolid({vertices: wide, faces: c.faces})).toThrow(RangeError);
        expect(vertexCount(c)).toBe(8);
    });
});
