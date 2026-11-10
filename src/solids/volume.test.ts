import {describe, expect, it} from "vitest";
import {cube, gridSolid, isClosed} from "./solid";
import {meshVolume, newellVector, sectionAreaFromLoop} from "./volume";

describe("sectionAreaFromLoop", () => {
    it("measures planar polygons with no plane normal, in either orientation", () => {
        const tri: Array<[number, number, number]> = [[0, 0, 0], [3, 0, 0], [0, 4, 0]];
        expect(sectionAreaFromLoop(tri)).toBeCloseTo(6, 12);
        expect(sectionAreaFromLoop([...tri].reverse())).toBeCloseTo(6, 12);
        // The same triangle tilted: legs 3 along x and 5 along (0,3,4)/5*5 -> area 3*5/2.
        expect(sectionAreaFromLoop([[0, 0, 0], [3, 0, 0], [0, 3, 4]])).toBeCloseTo(7.5, 12);
        // Unit-square-by-sqrt2 rectangle across the cube diagonal (SV1: x+y=1).
        expect(sectionAreaFromLoop([[1, 0, 0], [0, 1, 0], [0, 1, 1], [1, 0, 1]])).toBeCloseTo(Math.SQRT2, 12);
    });

    it("gives the vector sense by orientation", () => {
        const [, , z] = newellVector([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]]);
        expect(z).toBeCloseTo(2, 12);
    });
});

describe("meshVolume", () => {
    it("is translation invariant and signed", () => {
        const c = cube();
        const shifted = gridSolid(
            Array.from({length: 8}, (_, i) => [c.vertices[3 * i] - 12, c.vertices[3 * i + 1] + 8, c.vertices[3 * i + 2] - 12] as [number, number, number]),
            c.faces,
        );
        expect(isClosed(shifted)).toBe(true);
        expect(meshVolume(shifted)).toBeCloseTo(1, 12);
    });

    it("is 0 for an empty mesh", () => {
        expect(meshVolume({vertices: new Float64Array(0), faces: []})).toBe(0);
    });
});
