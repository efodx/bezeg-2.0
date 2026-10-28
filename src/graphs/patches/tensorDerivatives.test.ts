import {patchFromNet} from "./patchSceneBuilder";
import type {Xyz} from "./surface-view/surfaceScene";
import {
    collapsedEdgeNet, cornerDifferentials, differentialsWithDrawing, drawDifferentials, netDiagonal, parallelCornerNet,
    smoothDomeNet, tensorDifferentials,
} from "./tensorDerivatives";

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

const sub = (a: Xyz, b: Xyz): Xyz => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Xyz, b: Xyz): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Xyz): number => Math.hypot(a[0], a[1], a[2]);
const lin = (k: number, a: Xyz): Xyz => [k * a[0], k * a[1], k * a[2]];
const expectVec = (actual: Xyz, expected: Xyz, digits = 12) => {
    for (let c = 0; c < 3; c++) expect(actual[c]).toBeCloseTo(expected[c], digits);
};
const xyzOf = (p: {X(): number; Y(): number; Z?(): number}): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0];
const scaledNet = (net: Xyz[][], k: number): Xyz[][] => net.map(row => row.map(p => lin(k, p)));
const reasonOf = (net: Xyz[][], u: number, v: number) => {
    const normal = tensorDifferentials(patchFromNet(net), u, v).normal;
    return normal.kind === "defined" ? "defined" : normal.reason;
};

describe("tensorDifferentials against finite differences", () => {
    const rand = rng(11);
    for (const [m, n] of [[1, 1], [2, 3], [3, 2], [4, 4]]) {
        it(`matches central differences for bidegree (${m}, ${n})`, () => {
            const patch = patchFromNet(randomNet(m, n, rand));
            const h = 1e-5;
            for (const [u, v] of [[0.3, 0.6], [0.55, 0.2], [0.8, 0.9]]) {
                const d = tensorDifferentials(patch, u, v);
                const at = (a: number, b: number) => xyzOf(patch.eval(a, b));
                const fdU = lin(1 / (2 * h), sub(at(u + h, v), at(u - h, v)));
                const fdV = lin(1 / (2 * h), sub(at(u, v + h), at(u, v - h)));
                const mixed = lin(1 / (4 * h * h), sub(sub(at(u + h, v + h), at(u + h, v - h)), sub(at(u - h, v + h), at(u - h, v - h))));
                expect(len(sub(d.su, fdU)) / len(d.su)).toBeLessThan(1e-6);
                expect(len(sub(d.sv, fdV)) / len(d.sv)).toBeLessThan(1e-6);
                expect(len(sub(d.twist, mixed)) / Math.max(len(d.twist), 1e-9)).toBeLessThan(1e-4);
                expectVec(d.point, at(u, v));
            }
        });
    }
    it("gives a unit normal perpendicular to both tangents", () => {
        const rand2 = rng(5);
        for (let trial = 0; trial < 20; trial++) {
            const patch = patchFromNet(randomNet(1 + (trial % 4), 1 + ((trial * 3) % 4), rand2));
            const d = tensorDifferentials(patch, rand2(), rand2());
            if (d.normal.kind !== "defined") throw new Error("random net should be nondegenerate");
            expect(len(d.normal.unit)).toBeCloseTo(1, 12);
            expect(dot(d.normal.unit, d.su) / len(d.su)).toBeCloseTo(0, 12);
            expect(dot(d.normal.unit, d.sv) / len(d.sv)).toBeCloseTo(0, 12);
        }
    });
});

describe("normal orientation", () => {
    it("is S_u x S_v: +z for the planar identity net and -z when u and v swap", () => {
        const flat: Xyz[][] = [[[0, 0, 0], [0, 1, 0]], [[1, 0, 0], [1, 1, 0]]];
        const swapped: Xyz[][] = [[[0, 0, 0], [1, 0, 0]], [[0, 1, 0], [1, 1, 0]]];
        const unit = (net: Xyz[][]) => {
            const n = tensorDifferentials(patchFromNet(net), 0.5, 0.5).normal;
            if (n.kind !== "defined") throw new Error("expected a defined normal");
            return n.unit;
        };
        expectVec(unit(flat), [0, 0, 1]);
        expectVec(unit(swapped), [0, 0, -1]);
    });
});

describe("corner identities", () => {
    it("matches the m, n weighted control-net differences at all four corners", () => {
        const rand = rng(23);
        for (let m = 1; m <= 4; m++) for (let n = 1; n <= 4; n++) {
            const net = randomNet(m, n, rand);
            const corners = cornerDifferentials(patchFromNet(net));
            expect(corners.map(c => [c.u, c.v])).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
            const p = (i: number, j: number) => net[i][j];
            const [a, b] = [m, n];
            // Corner (cu, cv) with neighbours stepping inward: i0/i1 are the corner and inner u index.
            for (const {u, v, differentials: d} of corners) {
                const i0 = u === 0 ? 0 : a, i1 = u === 0 ? 1 : a - 1, j0 = v === 0 ? 0 : b, j1 = v === 0 ? 1 : b - 1;
                const su = lin(u === 0 ? a : -a, sub(p(i1, j0), p(i0, j0)));
                const sv = lin(v === 0 ? b : -b, sub(p(i0, j1), p(i0, j0)));
                const sign = (u === 0 ? 1 : -1) * (v === 0 ? 1 : -1);
                const second = sub(sub(p(i1, j1), p(i1, j0)), sub(p(i0, j1), p(i0, j0)));
                expectVec(d.point, p(i0, j0));
                expectVec(d.su, su);
                expectVec(d.sv, sv);
                expectVec(d.twist, lin(sign * a * b, second));
            }
            const first = corners[0].differentials;
            expectVec(first.su, lin(m, sub(net[1][0], net[0][0])));
            expectVec(first.sv, lin(n, sub(net[0][1], net[0][0])));
            expectVec(first.twist, lin(m * n, sub(sub(net[1][1], net[1][0]), sub(net[0][1], net[0][0]))));
        }
    });
});

describe("degeneracy classification", () => {
    it("reports zero-sv on the collapsed edge although the interior normal is defined", () => {
        const net = collapsedEdgeNet();
        expect(reasonOf(net, 0, 0.5)).toBe("zero-sv");
        expect(reasonOf(net, 0, 0)).toBe("zero-sv");
        expect(reasonOf(net, 0.3, 0.5)).toBe("defined");
        const limit = tensorDifferentials(patchFromNet(net), 1e-4, 0.5).normal;
        expect(limit.kind).toBe("defined");
    });
    it("reports parallel when P10-P00 and P01-P00 are parallel", () => {
        expect(reasonOf(parallelCornerNet(), 0, 0)).toBe("parallel");
        expect(reasonOf(parallelCornerNet(), 0.5, 0.5)).toBe("defined");
    });
    it("reports zero-su, zero-sv and both-zero on constructed nets", () => {
        const collapsedV: Xyz[][] = [[[0, 0, 0], [0, 0, 0]], [[1, 0, 0], [0, 1, 1]]];
        expect(reasonOf(collapsedV, 0, 0)).toBe("zero-sv");
        const transposed: Xyz[][] = [[[0, 0, 0], [1, 0, 0]], [[0, 0, 0], [0, 1, 1]]];
        expect(reasonOf(transposed, 0.5, 0)).toBe("zero-su");
        expect(reasonOf([[[0, 0, 0], [0, 0, 0]], [[0, 0, 0], [0, 0, 0]]], 0.5, 0.5)).toBe("both-zero");
        const corner: Xyz[][] = [[[0, 0, 0], [0, 0, 0]], [[0, 0, 0], [3, 3, 3]]];
        expect(reasonOf(corner, 0, 0)).toBe("both-zero");
    });
    it("is defined everywhere on a smooth dome", () => {
        for (const u of [0, 0.3, 1]) for (const v of [0, 0.7, 1]) expect(reasonOf(smoothDomeNet(), u, v)).toBe("defined");
    });
    it("is scale invariant: 1e-3 and 1e3 give the same classification and relative normal", () => {
        const cases: Array<[Xyz[][], number, number]> = [
            [collapsedEdgeNet(), 0, 0.5], [collapsedEdgeNet(), 0.3, 0.5], [parallelCornerNet(), 0, 0], [smoothDomeNet(), 0.4, 0.4],
        ];
        for (const [net, u, v] of cases) {
            const base = reasonOf(net, u, v);
            expect(reasonOf(scaledNet(net, 1e-3), u, v)).toBe(base);
            expect(reasonOf(scaledNet(net, 1e3), u, v)).toBe(base);
            expect(reasonOf(scaledNet(net, 1e-8), u, v)).toBe(base);
            expect(reasonOf(scaledNet(net, 1e8), u, v)).toBe(base);
        }
        expect(reasonOf(scaledNet(collapsedEdgeNet(), 1e-6), 0, 0.5)).toBe("zero-sv");
    });
    it("uses the cross product of nearly parallel but distinct tangents relative to the net size", () => {
        // Tilt the v tangent by an angle far above the tolerance: still defined, at any scale.
        const tilt = (k: number): Xyz[][] => scaledNet([[[0, 0, 0], [0, 1, 0]], [[1, 0, 0], [1, 1, 1e-4]]], k);
        expect(reasonOf(tilt(1), 0, 0)).toBe("defined");
        expect(reasonOf(tilt(1e-3), 0, 0)).toBe("defined");
        expect(reasonOf(tilt(1e3), 0, 0)).toBe("defined");
    });
});

describe("drawing data", () => {
    const patch = patchFromNet(smoothDomeNet());
    const rand = rng(77);
    const twisted = patchFromNet(randomNet(3, 3, rand));
    const nearEnd = (a: Xyz, b: Xyz) => expectVec(a, b, 10);

    it("starts every arrow at the point and ends it at point + k * vector with one shared k", () => {
        for (const p of [patch, twisted]) {
            const {differentials: d, drawing} = differentialsWithDrawing(p, 0.35, 0.6);
            const k = drawing.vectorScale;
            expect(k).toBeGreaterThan(0);
            for (const name of ["su", "sv", "twist"] as const) {
                const arrow = drawing.arrows.find(a => a.name === name)!;
                nearEnd(arrow.shaft[0], d.point);
                const tip = [d.point[0] + k * d[name][0], d.point[1] + k * d[name][1], d.point[2] + k * d[name][2]] as Xyz;
                nearEnd(arrow.shaft[1], tip);
            }
            const lengths = ["su", "sv", "twist"].map(name => len(sub(drawing.arrows.find(a => a.name === name)!.shaft[1], d.point)));
            expect(Math.max(...lengths)).toBeCloseTo(drawing.displayLength, 10);
            expect(lengths[0] / lengths[1]).toBeCloseTo(len(d.su) / len(d.sv), 10);
            expect(lengths[2] / lengths[0]).toBeCloseTo(len(d.twist) / len(d.su), 10);
            expect(drawing.displayLength).toBeCloseTo(0.25 * netDiagonal(p), 12);
        }
    });
    it("draws the normal as a unit vector of display length, independent of k", () => {
        const {differentials: d, drawing} = differentialsWithDrawing(twisted, 0.4, 0.4);
        if (d.normal.kind !== "defined") throw new Error("expected a defined normal");
        const normal = drawing.arrows.find(a => a.name === "normal")!;
        nearEnd(normal.shaft[0], d.point);
        expect(len(sub(normal.shaft[1], d.point))).toBeCloseTo(drawing.displayLength, 10);
        expect(dot(sub(normal.shaft[1], d.point), d.normal.unit)).toBeCloseTo(drawing.displayLength, 10);
    });
    it("gives each arrow two head segments that start at the tip and fold back along the shaft", () => {
        const {drawing} = differentialsWithDrawing(twisted, 0.5, 0.5);
        for (const arrow of drawing.arrows) {
            const shaft = sub(arrow.shaft[1], arrow.shaft[0]);
            for (const [from, to] of arrow.head) {
                nearEnd(from, arrow.shaft[1]);
                const back = sub(to, from);
                expect(dot(back, shaft)).toBeLessThan(0);
                expect(len(back)).toBeLessThan(0.5 * len(shaft));
                expect(len(back)).toBeGreaterThan(0);
            }
        }
    });
    it("keeps tangent quad corners in the tangent plane, spanned by su and sv", () => {
        for (const p of [patch, twisted]) {
            const {differentials: d, drawing} = differentialsWithDrawing(p, 0.3, 0.7);
            if (d.normal.kind !== "defined") throw new Error("expected a defined normal");
            const quad = drawing.tangentQuad!;
            expect(quad).toHaveLength(4);
            for (const corner of quad) expect(dot(sub(corner, d.point), d.normal.unit)).toBeCloseTo(0, 10);
            // Parallelogram: opposite edges equal and the diagonals cross at the point.
            nearEnd(sub(quad[1], quad[0]), sub(quad[2], quad[3]));
            nearEnd(sub(quad[3], quad[0]), sub(quad[2], quad[1]));
            nearEnd(lin(0.5, [quad[0][0] + quad[2][0], quad[0][1] + quad[2][1], quad[0][2] + quad[2][2]]), d.point);
            // Edges are parallel to su and sv (cross product with the tangents vanishes).
            const edgeU = sub(quad[1], quad[0]), edgeV = sub(quad[3], quad[0]);
            expect(len([edgeU[1] * d.su[2] - edgeU[2] * d.su[1], edgeU[2] * d.su[0] - edgeU[0] * d.su[2], edgeU[0] * d.su[1] - edgeU[1] * d.su[0]]) / (len(edgeU) * len(d.su))).toBeLessThan(1e-10);
            expect(len([edgeV[1] * d.sv[2] - edgeV[2] * d.sv[1], edgeV[2] * d.sv[0] - edgeV[0] * d.sv[2], edgeV[0] * d.sv[1] - edgeV[1] * d.sv[0]]) / (len(edgeV) * len(d.sv))).toBeLessThan(1e-10);
        }
    });
    it("omits the quad and the normal arrow when the normal is degenerate", () => {
        for (const [net, u, v] of [[collapsedEdgeNet(), 0, 0.5], [parallelCornerNet(), 0, 0]] as Array<[Xyz[][], number, number]>) {
            const p = patchFromNet(net);
            const drawing = drawDifferentials(tensorDifferentials(p, u, v), p);
            expect(drawing.tangentQuad).toBeUndefined();
            expect(drawing.arrows.map(a => a.name)).toEqual(["su", "sv", "twist"]);
        }
    });
    it("scales with the net: drawn lengths are proportional to the net size", () => {
        const base = differentialsWithDrawing(patchFromNet(smoothDomeNet()), 0.3, 0.3).drawing;
        const big = differentialsWithDrawing(patchFromNet(scaledNet(smoothDomeNet(), 1e3)), 0.3, 0.3).drawing;
        expect(big.displayLength / base.displayLength).toBeCloseTo(1e3, 6);
    });
    it("draws zero-length arrows without NaN for a net collapsed to a point", () => {
        const p = patchFromNet([[[1, 1, 1], [1, 1, 1]], [[1, 1, 1], [1, 1, 1]]]);
        const {differentials, drawing} = differentialsWithDrawing(p, 0.5, 0.5);
        expect(differentials.normal).toEqual({kind: "degenerate", reason: "both-zero"});
        for (const arrow of drawing.arrows) for (const pt of [...arrow.shaft, ...arrow.head.flat()]) for (const c of pt) expect(Number.isFinite(c)).toBe(true);
    });
});
