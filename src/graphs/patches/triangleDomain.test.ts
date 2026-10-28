import {clampToTriangle, isInTriangle} from "./triangleDomain";

describe("clampToTriangle", () => {
    it("keeps interior and boundary points unchanged", () => {
        for (const [u, v] of [[0.25, 0.5], [1 / 3, 1 / 3], [0, 0], [1, 0], [0, 1], [0.5, 0.5], [0.3, 0], [0, 0.7], [0.4, 0.6]]) {
            expect(clampToTriangle(u, v)).toEqual([u, v]);
            expect(isInTriangle(u, v)).toBe(true);
        }
    });

    it("projects a point beyond the hypotenuse orthogonally onto u + v = 1", () => {
        expect(clampToTriangle(1, 1)).toEqual([0.5, 0.5]);
        expect(clampToTriangle(0.75, 0.75)).toEqual([0.5, 0.5]);
        expect(clampToTriangle(0.75, 0.5)).toEqual([0.625, 0.375]);
        expect(clampToTriangle(0.25, 1)).toEqual([0.125, 0.875]);
        expect(isInTriangle(...clampToTriangle(0.7, 0.7))).toBe(true);
    });

    it("moves a point beyond a leg onto that leg", () => {
        expect(clampToTriangle(-0.5, 0.25)).toEqual([0, 0.25]);
        expect(clampToTriangle(0.25, -2)).toEqual([0.25, 0]);
        expect(clampToTriangle(0.75, -0.125)).toEqual([0.75, 0]);
    });

    it("moves a point in a vertex region onto the vertex", () => {
        expect(clampToTriangle(-1, -1)).toEqual([0, 0]);
        expect(clampToTriangle(2, -1)).toEqual([1, 0]);
        expect(clampToTriangle(-1, 2)).toEqual([0, 1]);
        expect(clampToTriangle(1.5, 0.5)).toEqual([1, 0]);
        expect(clampToTriangle(-0.5, 1.5)).toEqual([0, 1]);
    });

    it("never returns negative zero or u + v above 1", () => {
        expect(Object.is(clampToTriangle(-1, -1)[0], 0)).toBe(true);
        for (const [u, v] of [[0.6000000000000001, 0.5], [0.9, 0.9], [0.1, 3], [3, 0.1]]) {
            const [x, y] = clampToTriangle(u, v);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(x + y).toBeLessThanOrEqual(1);
        }
    });
});
