import {describe, expect, it} from 'vitest';
import type {GridPoint} from './grid';
import {
    earClippingStateAt, earClippingTrace, guardClass, guardView, threeColouring,
    type EarClippingOutcome, type EarTriangle,
} from './earClipping';
import {doubledSignedArea} from './polygonMeasures';
import {orient, polygonSimplicity} from './predicates';
import {clampTraceIndex} from './trace';

const pts = (...xy: [number, number][]): GridPoint[] => xy.map(([x, y]) => ({x, y}));
const pentagon = pts([0, 0], [6, 0], [6, 4], [3, 2], [0, 4]);
const comb = pts([0, 0], [18, 0], [16, 2], [15, 6], [14, 2], [10, 2], [9, 6], [8, 2], [4, 2], [3, 6], [2, 2]);

function solve(vertices: readonly GridPoint[]) {
    const out: EarClippingOutcome = earClippingTrace(vertices);
    if (!out.ok) throw new Error(`refused: ${out.reason}`);
    return out;
}

const coords = (vertices: readonly GridPoint[], t: EarTriangle) => t.map((i) => [vertices[i].x, vertices[i].y]);
const classSets = (vertices: readonly GridPoint[], colours: readonly number[]) =>
    [0, 1, 2].map((c) => colours.flatMap((k, v) => (k === c ? [`${vertices[v].x},${vertices[v].y}`] : [])).sort());

function checkTriangulation(vertices: readonly GridPoint[], triangles: readonly EarTriangle[]) {
    const n = vertices.length;
    expect(triangles).toHaveLength(n - 2);
    let sum = 0n;
    const edges = new Map<string, number>();
    for (const t of triangles) {
        const tri = t.map((i) => vertices[i]);
        expect(orient(tri[0], tri[1], tri[2])).toBe(1);
        sum += doubledSignedArea(tri);
        vertices.forEach((p, v) => {
            if (t.includes(v)) return;
            const inside = orient(tri[0], tri[1], p) >= 0 && orient(tri[1], tri[2], p) >= 0 && orient(tri[2], tri[0], p) >= 0;
            expect(inside).toBe(false);
        });
        for (let k = 0; k < 3; k++) {
            const key = [t[k], t[(k + 1) % 3]].sort((a, b) => a - b).join('-');
            edges.set(key, (edges.get(key) ?? 0) + 1);
        }
    }
    expect(sum).toBe(doubledSignedArea(vertices) < 0n ? -doubledSignedArea(vertices) : doubledSignedArea(vertices));
    for (let i = 0; i < n; i++) {
        expect(edges.get([i, (i + 1) % n].sort((a, b) => a - b).join('-'))).toBe(1);
    }
    const diagonals = [...edges.entries()].filter(([key, c]) => {
        const [a, b] = key.split('-').map(Number);
        const boundary = (b - a + n) % n === 1 || (a - b + n) % n === 1;
        if (boundary) return false;
        expect(c).toBe(2);
        return true;
    });
    expect(diagonals).toHaveLength(n - 3);
}

describe('ear clipping', () => {
    it('clips the notched pentagon in the documented order', () => {
        const r = solve(pentagon);
        expect(r.reversed).toBe(false);
        expect(r.triangles.map((t) => coords(pentagon, t))).toEqual([
            [[6, 0], [6, 4], [3, 2]], [[0, 0], [6, 0], [3, 2]], [[0, 0], [3, 2], [0, 4]],
        ]);
        const tests = r.trace.filter((e) => e.kind === 'test');
        expect(tests[0].payload).toMatchObject({points: [4, 0, 1], ear: false, rejected: 3});
        expect(tests[1].payload).toMatchObject({points: [0, 1, 2], ear: false, rejected: 3});
        const colours = threeColouring(r.triangles, 5);
        expect(classSets(pentagon, colours).sort()).toEqual(
            [['0,0', '6,4'], ['3,2'], ['0,4', '6,0']].map((s) => [...s].sort()).sort());
        const guard = guardClass(colours);
        expect(guard.vertices).toEqual([3]);
        expect(guard.vertices.length).toBe(Math.floor(5 / 3));
        expect(guardView(r.triangles, 3)).toHaveLength(3);
    });

    it('triangulates the comb with 9 triangles and classes 4, 4, 3', () => {
        const r = solve(comb);
        expect(r.triangles).toHaveLength(9);
        checkTriangulation(comb, r.triangles);
        const colours = threeColouring(r.triangles, 11);
        expect(colours.reduce<number[]>((s, c) => (s[c]++, s), [0, 0, 0]).sort()).toEqual([3, 4, 4]);
    });

    it('holds the invariants on random simple grid polygons', () => {
        let seed = 12345;
        const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        const start = Date.now();
        let checked = 0;
        while (checked < 300 && Date.now() - start < 4000) {
            const n = 4 + Math.floor(rnd() * 12);
            const raw = Array.from({length: n}, () => ({x: Math.floor(rnd() * 21) - 10, y: Math.floor(rnd() * 21) - 10}));
            const c = {x: 0.37, y: 0.41};
            const poly = raw.sort((a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
            if (!polygonSimplicity(poly, true).simple) continue;
            const out = earClippingTrace(poly);
            if (!out.ok) continue;
            checked++;
            checkTriangulation(poly, out.triangles);
            const colours = threeColouring(out.triangles, poly.length);
            out.triangles.forEach((t) => expect(new Set(t.map((v) => colours[v])).size).toBe(3));
            for (let i = 0; i < poly.length; i++) expect(colours[i]).not.toBe(colours[(i + 1) % poly.length]);
            const guard = guardClass(colours);
            expect(guard.vertices.length).toBeLessThanOrEqual(Math.floor(poly.length / 3));
            for (const v of guard.vertices) {
                expect(guardView(out.triangles, v)).toEqual(out.triangles.filter((t) => t.includes(v)));
            }
        }
        expect(checked).toBeGreaterThanOrEqual(50);
    });

    it('reverses a clockwise input and keeps input indices', () => {
        const cw = [...pentagon].reverse();
        const r = solve(cw);
        expect(r.reversed).toBe(true);
        const ccw = solve(pentagon);
        const asCoords = (res: typeof r, v: readonly GridPoint[]) =>
            res.triangles.map((t) => coords(v, t).map((p) => p.join(',')).sort().join('|')).sort();
        expect(asCoords(r, cw)).toEqual(asCoords(ccw, pentagon));
        checkTriangulation(cw, r.triangles.map((t) => [t[0], t[1], t[2]] as const));
    });

    it('refuses invalid polygons with distinct reasons', () => {
        const reason = (v: GridPoint[]) => {
            const o = earClippingTrace(v);
            return o.ok ? 'ok' : o.reason;
        };
        expect(reason(pts([0, 0], [1, 1]))).toBe('fewer-than-three');
        expect(reason(pts([0, 0], [4, 4], [4, 0], [0, 4]))).toBe('not-simple');
        expect(reason(pts([0, 0], [2, 0], [4, 0]))).toBe('not-simple');
        expect(reason(pts([0, 0], [2, 0], [4, 0], [4, 3]))).toBe('collinear-vertices');
        expect(() => earClippingTrace(pts([0.5, 0], [1, 0], [1, 1]))).toThrow(RangeError);
        expect(() => earClippingTrace(Array.from({length: 41}, (_, i) => ({x: i, y: i * i % 7})))).toThrow(RangeError);
    });

    it('folds the trace to the final result and clamps stale indices', () => {
        const r = solve(comb);
        const last = r.trace.length - 1;
        const fin = earClippingStateAt(r.trace, last);
        expect(fin.triangles).toEqual(r.triangles);
        expect(fin.remaining).toEqual([]);
        expect(fin.done).toBe(true);
        expect(earClippingStateAt(r.trace, last + 50)).toEqual(fin);
        expect(earClippingStateAt(r.trace, -3)).toEqual(earClippingStateAt(r.trace, 0));
        expect(clampTraceIndex(r.trace, 1e9)).toBe(last);
        const mid = earClippingStateAt(r.trace, 10);
        expect(mid.triangles.length + mid.remaining.length).toBeGreaterThan(0);
        expect(r.trace.at(-1)?.predicateCount).toBeGreaterThan(0);
        expect(r.trace.filter((e) => e.kind === 'done')).toHaveLength(1);
    });
});
