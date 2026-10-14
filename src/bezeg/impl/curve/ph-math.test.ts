import {describe, expect, it} from "vitest";
import {binomial, phControlPoints, phDegree, phOffsetRational, phSigmas, Vec} from "./ph-math";

const w: Vec[] = [[-3.3, 0], [0.2, -4], [2, -3.2]];
const start: Vec = [1, -1];

/** Bezier derivative r'(t) from control points. */
function derivative(p: ReadonlyArray<Vec>, t: number): Vec {
    const n = p.length - 1;
    let x = 0, y = 0;
    for (let k = 0; k < n; k++) {
        const b = binomial(n - 1, k) * (1 - t) ** (n - 1 - k) * t ** k;
        x += b * n * (p[k + 1][0] - p[k][0]);
        y += b * n * (p[k + 1][1] - p[k][1]);
    }
    return [x, y];
}

function bezier(p: ReadonlyArray<Vec>, t: number): Vec {
    const n = p.length - 1;
    let x = 0, y = 0;
    p.forEach((q, k) => {
        const b = binomial(n, k) * (1 - t) ** (n - k) * t ** k;
        x += b * q[0];
        y += b * q[1];
    });
    return [x, y];
}

describe("ph-math", () => {
    it("computes binomials and degree", () => {
        expect([0, 1, 2, 3, 4].map(k => binomial(4, k))).toEqual([1, 4, 6, 4, 1]);
        expect([1, 2, 3].map(phDegree)).toEqual([1, 3, 5]);
    });

    it("r'(t) equals the complex square of the hodograph polynomial w(t)", () => {
        const p = phControlPoints(start, w);
        expect(p).toHaveLength(6);
        expect(p[0]).toEqual(start);
        for (const t of [0, 0.2, 0.5, 0.9, 1]) {
            // r'(t) = w(t)^2 as complex numbers, with w(t) the degree-2 Bezier curve through the hodograph points.
            const [wx, wy] = bezier(w, t);
            const [dx, dy] = derivative(p, t);
            expect(dx).toBeCloseTo(wx * wx - wy * wy, 9);
            expect(dy).toBeCloseTo(2 * wx * wy, 9);
        }
    });

    it("sigma is the Bernstein form of the speed |r'(t)|", () => {
        const p = phControlPoints(start, w);
        const sigmas = phSigmas(w);
        expect(sigmas).toHaveLength(5);
        for (const t of [0, 0.3, 0.7, 1]) {
            const speedFromSigma = sigmas.reduce((sum, s, k) => sum + s * binomial(4, k) * (1 - t) ** (4 - k) * t ** k, 0);
            expect(speedFromSigma).toBeCloseTo(Math.hypot(...derivative(p, t)), 9);
        }
    });

    it("offset curve lies at distance d from the PH curve along the normal", () => {
        const p = phControlPoints(start, w);
        const d = 0.4;
        const {points, weights} = phOffsetRational(p, phSigmas(w), d);
        expect(points).toHaveLength(10);
        expect(weights).toHaveLength(10);
        for (const t of [0, 0.35, 0.8, 1]) {
            // rational Bezier point in homogeneous form
            const n = points.length - 1;
            let x = 0, y = 0, h = 0;
            points.forEach((q, k) => {
                const b = binomial(n, k) * (1 - t) ** (n - k) * t ** k * weights[k];
                x += b * q[0];
                y += b * q[1];
                h += b;
            });
            const offset: Vec = [x / h, y / h];
            const base = bezier(p, t);
            expect(Math.hypot(offset[0] - base[0], offset[1] - base[1])).toBeCloseTo(d, 9);
        }
    });
});
