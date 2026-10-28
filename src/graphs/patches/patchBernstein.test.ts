import {triangularBernsteinWeight} from "./patchBernstein";
import {triangularIndices} from "./TriangularPatchLattice";

const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);

describe("triangularBernsteinWeight", () => {
    it("equals n!/(i! j! k!) u^i v^j w^k with an exact value at the centroid", () => {
        // 3!/(1! 1! 1!) (1/3)^3 = 6/27
        expect(triangularBernsteinWeight(3, [1, 1, 1], [1 / 3, 1 / 3, 1 / 3])).toBeCloseTo(6 / 27, 14);
        // 4!/(2! 1! 1!) 0.5^2 0.25 0.25 = 12 / 64
        expect(triangularBernsteinWeight(4, [2, 1, 1], [0.5, 0.25, 0.25])).toBeCloseTo(12 / 64, 14);
        for (const degree of [1, 2, 3, 4]) {
            for (const [i, j, k] of triangularIndices(degree)) {
                const expected = factorial(degree) / (factorial(i) * factorial(j) * factorial(k)) * 0.2 ** i * 0.5 ** j * 0.3 ** k;
                expect(triangularBernsteinWeight(degree, [i, j, k], [0.2, 0.5, 0.3])).toBeCloseTo(expected, 14);
            }
        }
    });

    it("sums to 1 over all triples at a non-trivial (u, v)", () => {
        for (const degree of [1, 2, 3, 4]) {
            const [u, v] = [0.17, 0.46];
            const sum = triangularIndices(degree).reduce((total, index) => total + triangularBernsteinWeight(degree, index, [u, v, 1 - u - v]), 0);
            expect(sum).toBeCloseTo(1, 12);
        }
    });

    it("is 1 at the corner of its own index and 0 elsewhere on the boundary", () => {
        expect(triangularBernsteinWeight(3, [3, 0, 0], [1, 0, 0])).toBe(1);
        expect(triangularBernsteinWeight(3, [2, 1, 0], [1, 0, 0])).toBe(0);
        expect(triangularBernsteinWeight(3, [0, 0, 3], [0, 0, 1])).toBe(1);
    });
});
