import {describe, expect, it} from "vitest";
import {DECASTELJAU_ORDERS, DecasteljauOrder} from "./patchDto";
import {patchFromNet} from "./patchSceneBuilder";
import {buildDeCasteljauConstruction} from "./TensorDeCasteljauScene";
import type {SceneMarker, Xyz} from "./surface-view/surfaceScene";

const U = 0.35, V = 0.6;
const netOf = (m: number, n: number): Xyz[][] => Array.from({length: m + 1}, (_, i) => Array.from({length: n + 1}, (_, j): Xyz => [
    Math.sin(i * 1.3 + j * 0.4) * 2 + i, Math.cos(i * 0.2 - j * 0.8) * 3 - j, Math.sin(i * 0.8 + j * 1.1)]));

// An independent recurrence: one blend of neighbours per level, no use of the library's schemes.
const blend = (a: readonly number[], b: readonly number[], t: number): number[] => a.map((x, d) => (1 - t) * x + t * b[d]);
const reduce = (points: readonly (readonly number[])[], t: number): number[][] => points.slice(1).map((p, i) => blend(points[i], p, t));
const levels = (points: readonly (readonly number[])[], t: number): number[][][] => {
    const out: number[][][] = [points.map(p => [...p])];
    while (out[out.length - 1].length > 1) out.push(reduce(out[out.length - 1], t));
    return out;
};

/** The expected markers of the construction by id, from the independent recurrence. */
function expectedMarkers(net: Xyz[][], order: DecasteljauOrder): Map<string, {role: string; xyz: number[]}> {
    const out = new Map<string, {role: string; xyz: number[]}>();
    const m = net.length - 1, n = net[0].length - 1;
    const second = (results: readonly (readonly number[])[], t: number) => {
        const scheme = levels(results, t);
        for (let level = 0; level < scheme.length - 1; level++) scheme[level].forEach((xyz, k) => out.set(`dc2-${level}-${k}`, {role: "construction-2", xyz}));
    };
    const lineage = (family: "row" | "col", lines: Xyz[][], t1: number, t2: number) => {
        const results: number[][] = [];
        lines.forEach((line, index) => {
            const scheme = levels(line, t1);
            for (let level = 1; level < scheme.length - 1; level++) scheme[level].forEach((xyz, k) => out.set(`dc1-${family}${index}-${level}-${k}`, {role: "construction", xyz}));
            results.push(scheme[scheme.length - 1][0]);
        });
        second(results, t2);
    };
    if (order === "rows") lineage("row", net, V, U);
    else if (order === "columns") lineage("col", net[0].map((_, j) => net.map(row => row[j])), U, V);
    else {
        let current: number[][][] = net.map(row => row.map(p => [...p]));
        for (let level = 1; level <= Math.min(m, n); level++) {
            current = Array.from({length: current.length - 1}, (_, i) => Array.from({length: current[0].length - 1}, (_, j) =>
                blend(blend(current[i][j], current[i + 1][j], U), blend(current[i][j + 1], current[i + 1][j + 1], U), V)));
            if (level < Math.min(m, n)) current.forEach((row, i) => row.forEach((xyz, j) => out.set(`dc1-${level}-${i}-${j}`, {role: "construction", xyz})));
        }
        // What is left is a single row or column of points, reduced along the direction it still has.
        second(current.length > 1 ? current.map(row => row[0]) : current[0], current.length > 1 ? U : V);
    }
    return out;
}

const sizes = [1, 2, 3, 4];
const cases = sizes.flatMap(m => sizes.flatMap(n => DECASTELJAU_ORDERS.map(order => [m, n, order] as const)));

describe("de Casteljau construction scene", () => {
    it.each(cases)("m=%i n=%i %s: the markers are the scheme points level by level, in the stage roles", (m, n, order) => {
        const net = netOf(m, n);
        const {markers} = buildDeCasteljauConstruction(patchFromNet(net), U, V, order);
        const expected = expectedMarkers(net, order);
        expect(markers.map(marker => marker.id).sort()).toEqual([...expected.keys()].sort());
        for (const marker of markers) {
            const want = expected.get(marker.id)!;
            expect(marker.role, marker.id).toBe(want.role);
            marker.xyz.forEach((value, d) => expect(Math.abs(value - want.xyz[d]), marker.id).toBeLessThan(1e-12));
        }
    });

    it.each(cases)("m=%i n=%i %s: one more reduction of the last drawn level gives S(u, v); ids are unique", (m, n, order) => {
        const patch = patchFromNet(netOf(m, n));
        const {markers, polylines} = buildDeCasteljauConstruction(patch, U, V, order);
        const surface = patch.eval(U, V);
        // The final point is the scene's evaluated marker, not part of the construction.
        const stage2 = markers.filter(marker => marker.role === "construction-2");
        if (stage2.length > 0) {
            const deepest = Math.max(...stage2.map(marker => Number(marker.id.split("-")[1])));
            const last = stage2.filter(marker => marker.id.startsWith(`dc2-${deepest}-`)).sort((a, b) => a.id.localeCompare(b.id));
            expect(last).toHaveLength(2);
            const direction = order === "columns" ? V : order === "rows" ? U : (m >= n ? U : V);
            const point = blend(last[0].xyz, last[1].xyz, direction);
            [surface.X(), surface.Y(), surface.Z()].forEach((value, d) => expect(Math.abs(value - point[d])).toBeLessThan(1e-12));
        } else {
            // Only the bilinear order of a square net has no stage 2: its last reduction already is S(u, v).
            expect(order).toBe("bilinear");
            expect(m).toBe(n);
        }
        expect(new Set(markers.map(marker => marker.id)).size).toBe(markers.length);
        expect(new Set(polylines.map(line => line.id)).size).toBe(polylines.length);
    });

    it.each(cases)("m=%i n=%i %s: level counts and the roles of polylines", (m, n, order) => {
        const {markers, polylines} = buildDeCasteljauConstruction(patchFromNet(netOf(m, n)), U, V, order);
        const levelsOf = (role: string, index: number) => new Set(markers.filter(marker => marker.role === role).map(marker => marker.id.split("-")[index]));
        if (order === "bilinear") {
            // min(m, n) bilinear reductions (the last one is stage 2's start), then |m - n| univariate levels.
            expect(levelsOf("construction", 1).size).toBe(Math.min(m, n) - 1);
            expect(levelsOf("construction-2", 1).size).toBe(Math.abs(m - n));
        } else {
            const [first, second] = order === "rows" ? [n, m] : [m, n];
            expect(levelsOf("construction", 2).size).toBe(first - 1);
            expect(levelsOf("construction-2", 1).size).toBe(second);
        }
        for (const line of polylines) {
            expect(line.points.length).toBeGreaterThanOrEqual(2);
            expect(line.role).toBe(line.id.startsWith("dc2-") ? "construction-2" : "construction");
        }
        expect(markers.every(marker => marker.role === "construction" || marker.role === "construction-2")).toBe(true);
    });

    it("rows and columns end at the same point but pass through different intermediate points", () => {
        const patch = patchFromNet(netOf(3, 3));
        const rows = buildDeCasteljauConstruction(patch, U, V, "rows"), columns = buildDeCasteljauConstruction(patch, U, V, "columns");
        const key = (marker: SceneMarker) => marker.xyz.map(value => value.toFixed(9)).join();
        const rowPoints = new Set(rows.markers.map(key));
        expect(columns.markers.filter(marker => !rowPoints.has(key(marker))).length).toBeGreaterThan(0);
    });
});
