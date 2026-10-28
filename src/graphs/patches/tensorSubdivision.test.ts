import {describe, expect, it} from "vitest";
import type {TensorProductBezierPatch} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import {patchFromNet} from "./patchSceneBuilder";
import type {Xyz} from "./surface-view/surfaceScene";
import {canElevate, locateInPieces, SUBDIVISION_RANGE, subdivisionPieces} from "./tensorSubdivision";

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const randomNet = (m: number, n: number, rand: () => number): Xyz[][] =>
    Array.from({length: m + 1}, () => Array.from({length: n + 1}, (): Xyz => [rand() * 4 - 2, rand() * 4 - 2, rand() * 4 - 2]));

const binomial = (n: number, k: number): number => (k === 0 ? 1 : (binomial(n, k - 1) * (n - k + 1)) / k);
const bernstein = (n: number, i: number, t: number): number => binomial(n, i) * t ** i * (1 - t) ** (n - i);

/** Independent Bernstein-sum evaluator; valid for any real (u, v), so it also differentiates across boundaries. */
function evalNet(net: Xyz[][], u: number, v: number): Xyz {
    const m = net.length - 1, n = net[0].length - 1;
    const out: Xyz = [0, 0, 0];
    for (let i = 0; i <= m; i++) {
        for (let j = 0; j <= n; j++) {
            const w = bernstein(m, i, u) * bernstein(n, j, v);
            for (let c = 0; c < 3; c++) out[c] += w * net[i][j][c];
        }
    }
    return out;
}
const netOf = (patch: TensorProductBezierPatch): Xyz[][] =>
    patch.getControlNet().map(row => row.map((p): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0]));
const expectVec = (actual: Xyz, expected: Xyz, digits = 10) => {
    for (let c = 0; c < 3; c++) expect(actual[c]).toBeCloseTo(expected[c], digits);
};
const SPLITS = [0.05, 0.3, 0.5, 0.77, 0.95];
const DEGREES: [number, number][] = [[1, 1], [2, 3], [3, 2], [4, 4]];

describe("subdivisionPieces", () => {
    it("exposes the route range", () => {
        expect(SUBDIVISION_RANGE).toEqual({min: 0.05, max: 0.95});
    });

    for (const direction of ["u", "v"] as const) {
        it(`reproduces the original on both pieces when splitting in ${direction}`, () => {
            const rand = rng(11);
            for (const [m, n] of DEGREES) {
                const net = randomNet(m, n, rand);
                for (const value of SPLITS) {
                    const [left, right] = subdivisionPieces(patchFromNet(net), direction, value);
                    expect([left.m, left.n, right.m, right.n]).toEqual([m, n, m, n]);
                    const leftNet = netOf(left), rightNet = netOf(right);
                    for (let k = 0; k < 6; k++) {
                        const s = rand(), t = rand();
                        const leftAt: [number, number] = direction === "u" ? [s, t] : [t, s];
                        const rightAt: [number, number] = leftAt;
                        const leftOriginal: [number, number] = direction === "u" ? [value * s, t] : [t, value * s];
                        const rightParameter = value + (1 - value) * s;
                        const rightOriginal: [number, number] = direction === "u" ? [rightParameter, t] : [t, rightParameter];
                        expectVec(evalNet(leftNet, ...leftAt), evalNet(net, ...leftOriginal));
                        expectVec(evalNet(rightNet, ...rightAt), evalNet(net, ...rightOriginal));
                        // The patch's own evaluator agrees with the Bernstein sum.
                        const own = right.eval(...rightAt);
                        expectVec([own.X(), own.Y(), own.Z?.() ?? 0], evalNet(net, ...rightOriginal));
                    }
                }
            }
        });
    }

    it("shares the boundary: last row of L equals first row of R and equals S(u0, v)", () => {
        const rand = rng(5);
        const net = randomNet(3, 2, rand);
        const [left, right] = subdivisionPieces(patchFromNet(net), "u", 0.35);
        const leftNet = netOf(left), rightNet = netOf(right);
        for (let j = 0; j <= 2; j++) expectVec(leftNet[3][j], rightNet[0][j]);
        for (const v of [0, 0.2, 0.9, 1]) expectVec(evalNet(leftNet, 1, v), evalNet(net, 0.35, v));
        const [bottom, top] = subdivisionPieces(patchFromNet(net), "v", 0.6);
        const bottomNet = netOf(bottom), topNet = netOf(top);
        for (let i = 0; i <= 3; i++) expectVec(bottomNet[i][2], topNet[i][0]);
        for (const u of [0, 0.4, 1]) expectVec(evalNet(topNet, u, 0), evalNet(net, u, 0.6));
    });

    it("satisfies the chain rule against central differences of the original", () => {
        const rand = rng(21);
        const net = randomNet(3, 3, rand);
        const h = 1e-6;
        const derivative = (u: number, v: number): Xyz => {
            const p = evalNet(net, u + h, v), q = evalNet(net, u - h, v);
            return [(p[0] - q[0]) / (2 * h), (p[1] - q[1]) / (2 * h), (p[2] - q[2]) / (2 * h)];
        };
        for (const u0 of [0.2, 0.5, 0.8]) {
            const [left, right] = subdivisionPieces(patchFromNet(net), "u", u0);
            for (const v of [0, 0.37, 1]) {
                const reference = derivative(u0, v);
                const l = left.partialU(1, v), r = right.partialU(0, v);
                expectVec([l.X(), l.Y(), l.Z?.() ?? 0], reference.map(x => u0 * x) as Xyz, 5);
                expectVec([r.X(), r.Y(), r.Z?.() ?? 0], reference.map(x => (1 - u0) * x) as Xyz, 5);
            }
        }
    });

    it("rejects values outside (0, 1) and unknown directions", () => {
        const patch = patchFromNet(randomNet(2, 2, rng(1)));
        for (const value of [0, 1, -0.2, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
            expect(() => subdivisionPieces(patch, "u", value)).toThrow(RangeError);
        }
        expect(() => subdivisionPieces(patch, "w" as "u", 0.5)).toThrow(RangeError);
    });
});

describe("locateInPieces", () => {
    it("maps by hand-computed values", () => {
        expect(locateInPieces("u", 0.25, 0.1, 0.7)).toEqual({piece: "left", u: expect.closeTo(0.4, 12), v: 0.7});
        expect(locateInPieces("u", 0.25, 0.625, 0.7)).toEqual({piece: "right", u: expect.closeTo(0.5, 12), v: 0.7});
        expect(locateInPieces("v", 0.5, 0.3, 0.75)).toEqual({piece: "right", u: 0.3, v: 0.5});
        expect(locateInPieces("v", 0.5, 0.3, 0.125)).toEqual({piece: "left", u: 0.3, v: 0.25});
    });

    it("reports the split value on the left piece with s = 1, and the ends exactly", () => {
        expect(locateInPieces("u", 0.3, 0.3, 0.4)).toEqual({piece: "left", u: 1, v: 0.4});
        expect(locateInPieces("v", 0.6, 0.4, 0.6)).toEqual({piece: "left", u: 0.4, v: 1});
        expect(locateInPieces("u", 0.3, 0, 0.4)).toEqual({piece: "left", u: 0, v: 0.4});
        expect(locateInPieces("u", 0.3, 1, 0.4)).toEqual({piece: "right", u: 1, v: 0.4});
    });

    for (const direction of ["u", "v"] as const) {
        it(`evaluates the located piece to the original point (${direction})`, () => {
            const rand = rng(33);
            const net = randomNet(3, 2, rand);
            for (const value of SPLITS) {
                const [left, right] = subdivisionPieces(patchFromNet(net), direction, value);
                const nets = {left: netOf(left), right: netOf(right)};
                for (let k = 0; k < 20; k++) {
                    const u = rand(), v = rand();
                    const at = locateInPieces(direction, value, u, v);
                    expect(at.u).toBeGreaterThanOrEqual(0);
                    expect(at.u).toBeLessThanOrEqual(1);
                    expect(at.v).toBeGreaterThanOrEqual(0);
                    expect(at.v).toBeLessThanOrEqual(1);
                    expectVec(evalNet(nets[at.piece], at.u, at.v), evalNet(net, u, v));
                }
                // The split value itself: both pieces give the original point.
                const onSplit = locateInPieces(direction, value, direction === "u" ? value : 0.4, direction === "v" ? value : 0.4);
                expect(onSplit.piece).toBe("left");
                expectVec(evalNet(nets.left, onSplit.u, onSplit.v), evalNet(net, direction === "u" ? value : 0.4, direction === "v" ? value : 0.4));
            }
        });
    }

    it("rejects values outside (0, 1)", () => {
        expect(() => locateInPieces("u", 0, 0.5, 0.5)).toThrow(RangeError);
        expect(() => locateInPieces("v", 1, 0.5, 0.5)).toThrow(RangeError);
    });
});

describe("degree elevation", () => {
    for (const direction of ["u", "v"] as const) {
        it(`leaves the surface unchanged for every degree below 4 (${direction})`, () => {
            const rand = rng(77);
            for (let degree = 1; degree <= 3; degree++) {
                for (const other of [1, 2, 4]) {
                    const net = direction === "u" ? randomNet(degree, other, rand) : randomNet(other, degree, rand);
                    const patch = patchFromNet(net);
                    expect(canElevate(patch, direction)).toBe(true);
                    const elevated = patch.elevate(direction);
                    expect(direction === "u" ? elevated.m : elevated.n).toBe(degree + 1);
                    const elevatedNet = netOf(elevated);
                    for (let k = 0; k < 8; k++) {
                        const u = rand(), v = rand();
                        expectVec(evalNet(elevatedNet, u, v), evalNet(net, u, v));
                    }
                    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expectVec(evalNet(elevatedNet, u, v), evalNet(net, u, v), 12);
                }
            }
        });

        it(`is unavailable at degree 4 (${direction})`, () => {
            const net = direction === "u" ? randomNet(4, 2, rng(2)) : randomNet(2, 4, rng(2));
            const patch = patchFromNet(net);
            expect(canElevate(patch, direction)).toBe(false);
            expect(() => patch.elevate(direction)).toThrow(RangeError);
            // The other direction is still available.
            expect(canElevate(patch, direction === "u" ? "v" : "u")).toBe(true);
        });
    }
});
