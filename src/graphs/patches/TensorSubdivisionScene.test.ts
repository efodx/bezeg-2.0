import {describe, expect, it} from "vitest";
import {buildTensorScene, patchFromNet} from "./patchSceneBuilder";
import {buildSubdivisionScene, pieceCorrespondence, withSubdivisionPieces} from "./TensorSubdivisionScene";
import type {SurfaceScene, Xyz} from "./surface-view/surfaceScene";

const binomial = (n: number, k: number): number => (k === 0 ? 1 : (binomial(n, k - 1) * (n - k + 1)) / k);
const bernstein = (n: number, i: number, t: number): number => binomial(n, i) * t ** i * (1 - t) ** (n - i);

/** Independent Bernstein-sum evaluator of a net. */
function evalNet(net: Xyz[][], u: number, v: number): Xyz {
    const m = net.length - 1, n = net[0].length - 1;
    const out: Xyz = [0, 0, 0];
    for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++) {
        const w = bernstein(m, i, u) * bernstein(n, j, v);
        for (let c = 0; c < 3; c++) out[c] += w * net[i][j][c];
    }
    return out;
}
const near = (actual: readonly number[], expected: readonly number[]) => expected.forEach((value, k) => expect(actual[k]).toBeCloseTo(value, 12));

/** A bicubic net with no symmetry. */
const NET: Xyz[][] = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map((j): Xyz => [i + 0.1 * j * j, j - 0.2 * i, Math.sin(1.7 * i + 0.9 * j) + 0.3 * i * j]));
const BILINEAR: Xyz[][] = [[[0, 0, 0], [0, 1, 0]], [[1, 0, 2], [1, 1, 4]]];
const lines = <T extends {id: string}>(polylines: T[], prefix: string) => polylines.filter(line => line.id.startsWith(prefix));
const sceneOf = (net: Xyz[][]): SurfaceScene => buildTensorScene({
    net, u: 0.7, v: 0.3, camera: {az: 0, el: 0, distance: 5, projection: "perspective", target: [0, 0, 0]},
    showControlNet: true, showIsoCurves: true, showBoundaryCurves: true, showShading: true, isoDensity: 8, shadingDensity: 8, zMode: false, selectedPointId: "p-1-1",
}, 1);

describe("buildSubdivisionScene", () => {
    it("draws the piece nets: the left net role net, the right net role net-2, split by the de Casteljau points of the bilinear net", () => {
        const {polylines} = buildSubdivisionScene(patchFromNet(BILINEAR), "u", 0.4);
        const left = lines(polylines, "piece-l-row-"), right = lines(polylines, "piece-r-row-");
        // Hand computed: the split rows are (1 - 0.4) b_0j + 0.4 b_1j = (0.4, j, 0.8 [+1.6 j]) on both pieces.
        expect(left.map(l => l.points)).toEqual([BILINEAR[0], [[0.4, 0, 0.8], [0.4, 1, 1.6]]].map(row => row.map(p => p.map(c => expect.closeTo(c, 12)))));
        expect(right.map(l => l.points)).toEqual([[[0.4, 0, 0.8], [0.4, 1, 1.6]], BILINEAR[1]].map(row => row.map(p => p.map(c => expect.closeTo(c, 12)))));
        expect(left.every(l => l.role === "net") && right.every(l => l.role === "net-2")).toBe(true);
        expect(lines(polylines, "piece-l-col-")).toHaveLength(2);
    });
    it("ids and counts: rows and columns of both pieces for a bicubic net split in v", () => {
        const {polylines, labels} = buildSubdivisionScene(patchFromNet(NET), "v", 0.25);
        for (const side of ["l", "r"]) {
            expect(lines(polylines, `piece-${side}-row-`)).toHaveLength(4);
            expect(lines(polylines, `piece-${side}-col-`)).toHaveLength(4);
        }
        expect(labels.map(l => l.id)).toEqual(["piece-l-label", "piece-r-label"]);
        expect(new Set(polylines.map(l => l.id)).size).toBe(polylines.length);
    });
    it("the pieces display the original surface: every piece net row is a control row of a piece with the same image", () => {
        const scene = buildSubdivisionScene(patchFromNet(NET), "u", 0.4);
        const net = (side: string) => lines(scene.polylines, `piece-${side}-row-`).map(l => l.points);
        for (const [s, t] of [[0, 0.2], [0.5, 0.9], [1, 1], [0.3, 0.6]]) {
            near(evalNet(net("l"), s, t), evalNet(NET, 0.4 * s, t));
            near(evalNet(net("r"), s, t), evalNet(NET, 0.4 + 0.6 * s, t));
        }
    });
    it("the split curve is S(u0, .) for u and S(., v0) for v, lying on the surface", () => {
        for (const [direction, at] of [["u", (t: number) => evalNet(NET, 0.4, t)], ["v", (t: number) => evalNet(NET, t, 0.4)]] as const) {
            const curve = buildSubdivisionScene(patchFromNet(NET), direction, 0.4).polylines.find(l => l.id === "split-curve")!;
            expect(curve.role).toBe("highlight");
            expect(curve.points).toHaveLength(33);
            curve.points.forEach((p, k) => near(p, at(k / 32)));
        }
    });
    it("on the cut the right piece at local 0 and the left piece at local 1 are the same point S(cut), both directions", () => {
        for (const direction of ["u", "v"] as const) {
            const value = 0.4;
            const [left, right] = buildSubdivisionScene(patchFromNet(NET), direction, value).pieces;
            for (const t of [0, 0.15, 0.5, 0.9, 1]) {
                const expected = direction === "u" ? evalNet(NET, value, t) : evalNet(NET, t, value);
                const onLeft = direction === "u" ? left.eval(1, t) : left.eval(t, 1);
                const onRight = direction === "u" ? right.eval(0, t) : right.eval(t, 0);
                near([onLeft.X(), onLeft.Y(), onLeft.Z?.() ?? 0], expected);
                near([onRight.X(), onRight.Y(), onRight.Z?.() ?? 0], expected);
            }
        }
    });
    it("rejects a split value outside (0, 1)", () => {
        expect(() => buildSubdivisionScene(patchFromNet(NET), "u", 1)).toThrow(RangeError);
    });
});

describe("pieceCorrespondence", () => {
    it.each([["u", 0.4, 0.1, 0.7, "left"], ["u", 0.4, 0.9, 0.2, "right"], ["v", 0.7, 0.3, 0.2, "left"], ["v", 0.7, 0.3, 0.95, "right"], ["u", 0.4, 0.4, 0.5, "left"]] as const)(
        "%s split at %s: S(%s, %s) is on the %s piece and equals the original point", (direction, value, u, v, piece) => {
            const result = pieceCorrespondence(patchFromNet(NET), direction, value, u, v);
            expect(result.location.piece).toBe(piece);
            near(result.point, evalNet(NET, u, v));
        });
    it("reports the local parameters of the piece", () => {
        const {location} = pieceCorrespondence(patchFromNet(NET), "u", 0.4, 0.7, 0.2);
        expect(location).toEqual({piece: "right", u: expect.closeTo(0.5, 12), v: 0.2});
    });
});

describe("withSubdivisionPieces", () => {
    const base = sceneOf(NET);
    const shown = withSubdivisionPieces(base, patchFromNet(NET), "u", 0.4, true);
    it("replaces the original net, its highlight and the control points by the piece nets and makes the scene read-only", () => {
        expect(base.points).toHaveLength(16);
        expect(shown.points).toEqual([]);
        expect(shown.interaction.editable).toBe(false);
        expect(shown.polylines.filter(l => l.role === "net")).toHaveLength(8);
        expect(shown.polylines.filter(l => l.role === "net-2")).toHaveLength(8);
        expect(shown.polylines.some(l => l.id.startsWith("net-") || l.id.startsWith("highlight-"))).toBe(false);
        expect(shown.labels.some(l => l.id === "selected-point")).toBe(false);
        expect(shown.labels.map(l => l.id)).toEqual(expect.arrayContaining(["surface-point", "piece-l-label", "piece-r-label"]));
    });
    it("keeps the surface mesh, the iso and boundary curves and the marker", () => {
        expect(shown.mesh).toEqual(base.mesh);
        expect(shown.markers).toEqual(base.markers);
        expect(shown.polylines.filter(l => l.role === "iso")).toEqual(base.polylines.filter(l => l.role === "iso"));
        expect(shown.polylines.filter(l => l.role === "boundary")).toEqual(base.polylines.filter(l => l.role === "boundary"));
    });
    it("with the net hidden only the split curve is added", () => {
        const bare = withSubdivisionPieces(base, patchFromNet(NET), "v", 0.5, false);
        expect(bare.polylines.some(l => l.id.startsWith("piece-"))).toBe(false);
        expect(bare.polylines.some(l => l.id === "split-curve")).toBe(true);
        expect(bare.labels.some(l => l.id.startsWith("piece-"))).toBe(false);
    });
});
