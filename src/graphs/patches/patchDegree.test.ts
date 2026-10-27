import {patchBernsteinWeight} from "./patchBernstein";
import {lowerNetDegree} from "./patchDegree";
import type {Xyz} from "./surface-view/surfaceScene";

function evalNet(net: readonly (readonly Xyz[])[], u: number, v: number): Xyz {
    const m = net.length - 1, n = net[0].length - 1;
    const out: Xyz = [0, 0, 0];
    net.forEach((row, i) => row.forEach((p, j) => {
        const w = patchBernsteinWeight(m, n, i, j, u, v);
        out[0] += w * p[0]; out[1] += w * p[1]; out[2] += w * p[2];
    }));
    return out;
}
const close = (a: readonly number[], b: readonly number[], eps: number) => a.forEach((x, k) => expect(Math.abs(x - b[k])).toBeLessThanOrEqual(eps));

describe("lowerNetDegree", () => {
    it("lowering u leaves a net that varies only in v unchanged (z = 0, 2, 0 along v)", () => {
        const net: Xyz[][] = [0, 1, 2].map(i => [0, 1, 2].map((j): Xyz => [j, i, [0, 2, 0][j]]));
        const lowered = lowerNetDegree(net, "u", 1);
        expect(lowered).toHaveLength(2);
        lowered[0].forEach((p, j) => close(p, [j, 0, [0, 2, 0][j]], 1e-12));
        lowered[1].forEach((p, j) => close(p, [j, 2, [0, 2, 0][j]], 1e-12));
        close(evalNet(lowered, 0.5, 0.5), evalNet(net, 0.5, 0.5), 1e-12);
    });
    it("an exact elevation is undone, in both directions", () => {
        const net: Xyz[][] = [[[0, 0, 0], [0, 1, 3], [0, 2, 0]], [[1, 0, 1], [1, 1, 2], [1, 2, 4]], [[2, 0, 0], [2, 1, 5], [2, 2, 1]]];
        // Degree elevation along u: b'_i = (i/(m+1)) b_(i-1) + (1 - i/(m+1)) b_i.
        const raise = (rows: readonly Xyz[][]): Xyz[][] => {
            const m = rows.length - 1;
            return Array.from({length: m + 2}, (_, i) => rows[0].map((_, j): Xyz => {
                const a = i === 0 ? [0, 0, 0] : rows[i - 1][j], b = i === m + 1 ? [0, 0, 0] : rows[i][j];
                const wa = i / (m + 1), wb = 1 - wa;
                return [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]];
            }));
        };
        const raisedU = raise(net);
        lowerNetDegree(raisedU, "u", 2).forEach((row, i) => row.forEach((p, j) => close(p, net[i][j], 1e-12)));
        const transpose = (rows: readonly Xyz[][]) => rows[0].map((_, j) => rows.map(row => row[j]));
        const raisedV = transpose(raise(transpose(net)));
        lowerNetDegree(raisedV, "v", 2).forEach((row, i) => row.forEach((p, j) => close(p, net[i][j], 1e-12)));
    });
    it("interpolates the original surface along the collocation lines of the lowered direction", () => {
        const net: Xyz[][] = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map((j): Xyz => [i, j, Math.sin(i * 1.7 + j * 0.9) * 2]));
        const lowered = lowerNetDegree(net, "u", 2);
        expect([lowered.length, lowered[0].length]).toEqual([3, 4]);
        // Corners stay, the untouched direction keeps its degree.
        for (const k of [0, 1, 2]) for (const v of [0, 0.3, 0.8, 1]) close(evalNet(lowered, k / 2, v), evalNet(net, k / 2, v), 1e-12);
    });
});
