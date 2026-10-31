import {describe, expect, it} from 'vitest';
import type {GridPoint} from './grid';
import {monotoneChainTrace} from './monotoneChain';
import {incircle, onSegment, orient, segmentIntersection} from './predicates';
import {
    createTriangulation,
    edges,
    flip,
    hullEdges,
    illegalEdges,
    neighbourAcross,
    triangulationCounts,
    type TriangleIndices,
    type Triangulation,
} from './triangulation';

const P = (x: number, y: number): GridPoint => ({x, y});
const pts = (list: readonly (readonly [number, number])[]): GridPoint[] => list.map(([x, y]) => P(x, y));

/** Deterministic LCG so failures reproduce. */
function rng(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return (s >>> 8) % n;
    };
}

const B2_POINTS = pts([[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]]);
const B2_T0: TriangleIndices[] = [[1, 2, 6], [1, 5, 4], [1, 6, 5], [2, 3, 4], [4, 0, 1], [4, 5, 6], [6, 2, 4]];
const SAMPLE_1 = pts([[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]]);

function mustCreate(points: readonly GridPoint[], triangles: readonly (readonly number[])[]): Triangulation {
    const result = createTriangulation(points, triangles);
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusal)}`);
    return result.value;
}

/** k from the library-independent monotone chain: points on a strict hull edge, hull vertices included. */
function boundaryCount(points: readonly GridPoint[]): number {
    const output = monotoneChainTrace(points).find(e => e.kind === 'output');
    const hull = output?.payload.hull ?? [];
    return points.filter((p, i) => hull.some((u, j) => {
        const v = hull[(j + 1) % hull.length];
        return i === u || onSegment(p, points[u], points[v]);
    })).length;
}

/**
 * Reference triangulation by a lexicographic sweep: the first non-collinear point closes a fan over the collinear
 * prefix; every later point (strictly outside the hull so far) is joined to all strictly visible boundary edges.
 */
function sweepTriangulation(points: readonly GridPoint[]): TriangleIndices[] {
    const order = points.map((_, i) => i).sort((i, j) => points[i].x - points[j].x || points[i].y - points[j].y);
    const ccw = (a: number, b: number, c: number): TriangleIndices =>
        orient(points[a], points[b], points[c]) > 0 ? [a, b, c] : [a, c, b];
    let k = 2;
    while (k < order.length && orient(points[order[0]], points[order[1]], points[order[k]]) === 0) k++;
    const triangles: TriangleIndices[] = [];
    for (let i = 0; i + 1 < k; i++) triangles.push(ccw(order[i], order[i + 1], order[k]));
    for (let m = k + 1; m < order.length; m++) {
        const p = order[m];
        const directed = new Set(triangles.flatMap(([a, b, c]) => [`${a},${b}`, `${b},${c}`, `${c},${a}`]));
        const boundary = [...directed].map(s => s.split(',').map(Number))
            .filter(([u, v]) => !directed.has(`${v},${u}`));
        for (const [u, v] of boundary) if (orient(points[u], points[v], points[p]) < 0) triangles.push([v, u, p]);
    }
    return triangles;
}

/** Random distinct grid points with no three collinear (general position). */
function generalPosition(random: (n: number) => number, n: number, size: number): GridPoint[] {
    for (;;) {
        const points: GridPoint[] = [];
        while (points.length < n) {
            const p = P(random(size), random(size));
            if (!points.some(q => q.x === p.x && q.y === p.y)) points.push(p);
        }
        let collinear = false;
        for (let i = 0; i < n && !collinear; i++) {
            for (let j = i + 1; j < n && !collinear; j++) {
                for (let l = j + 1; l < n; l++) {
                    if (orient(points[i], points[j], points[l]) === 0) {
                        collinear = true;
                        break;
                    }
                }
            }
        }
        if (!collinear) return points;
    }
}

/** Independent edge census straight from a triangle list. */
function census(tri: Triangulation): { edges: number; interior: number } {
    const uses = new Map<string, number>();
    for (const [a, b, c] of tri.triangles) {
        for (const [u, v] of [[a, b], [b, c], [c, a]]) {
            const key = `${Math.min(u, v)},${Math.max(u, v)}`;
            uses.set(key, (uses.get(key) ?? 0) + 1);
        }
    }
    return {edges: uses.size, interior: [...uses.values()].filter(c => c === 2).length};
}

/**
 * Independent geometric oracle for "these triangles triangulate the points": strictly counter-clockwise, interiors
 * pairwise disjoint (separating edge line, exact), doubled areas sum to the hull's, every point a vertex, and no point
 * on a triangle except at its corners (no T-junction, nothing inside). Shares no code with the validator.
 */
function isTriangulationOracle(points: readonly GridPoint[], triangles: readonly (readonly number[])[]): boolean {
    const corners = (t: readonly number[]) => t.map(i => points[i]);
    if (triangles.some(t => orient(points[t[0]], points[t[1]], points[t[2]]) <= 0)) return false;
    const separates = (t: readonly number[], u: readonly number[]): boolean => [0, 1, 2].some(i =>
        corners(u).every(q => orient(points[t[i]], points[t[(i + 1) % 3]], q) <= 0));
    for (let i = 0; i < triangles.length; i++) {
        for (let j = i + 1; j < triangles.length; j++) {
            if (!separates(triangles[i], triangles[j]) && !separates(triangles[j], triangles[i])) return false;
        }
    }
    const used = new Set(triangles.flat());
    if (used.size !== points.length) return false;
    for (const t of triangles) {
        const [a, b, c] = corners(t);
        for (let p = 0; p < points.length; p++) {
            if (t.includes(p)) continue;
            const q = points[p];
            const inside = orient(a, b, q) >= 0 && orient(b, c, q) >= 0 && orient(c, a, q) >= 0;
            if (inside) return false; // strictly inside, or on an edge: a vertex lying on a triangle
        }
    }
    const order = points.map((_, i) => i).sort((i, j) => points[i].x - points[j].x || points[i].y - points[j].y);
    const hullOf = (ordered: number[]): number[] => {
        const chain: number[] = [];
        for (const p of ordered) {
            while (chain.length >= 2 && orient(points[chain[chain.length - 2]], points[chain[chain.length - 1]], points[p]) <= 0) {
                chain.pop();
            }
            chain.push(p);
        }
        return chain.slice(0, -1);
    };
    const hull = [...hullOf(order), ...hullOf([...order].reverse())].map(i => points[i]);
    const doubled = (v: readonly GridPoint[]) => v.reduce((sum, p, i) => {
        const q = v[(i + 1) % v.length];
        return sum + p.x * q.y - q.x * p.y;
    }, 0);
    return triangles.reduce((sum, t) => sum + doubled(corners(t)), 0) === doubled(hull);
}

/** Every flip result must equal what the validator rebuilds from its triangle list alone. */
function expectValid(tri: Triangulation): void {
    const rebuilt = mustCreate(tri.points, tri.triangles);
    expect(tri.nbr).toEqual(rebuilt.nbr);
    const k = boundaryCount(tri.points);
    const n = tri.points.length;
    expect(tri.triangles.length).toBe(2 * n - 2 - k);
    const counts = triangulationCounts(tri);
    expect(counts.edges).toBe(3 * n - 3 - k);
    expect(counts.hullEdges).toBe(k);
    expect(census(tri)).toEqual({edges: counts.edges, interior: counts.interiorEdges});
}

describe('the B2 example, triangulation T0', () => {
    const tri = mustCreate(B2_POINTS, B2_T0);

    it('has 7 triangles and 13 edges: 8 interior and 5 on the hull', () => {
        expect(triangulationCounts(tri)).toEqual({points: 7, triangles: 7, edges: 13, interiorEdges: 8, hullEdges: 5});
        expect(boundaryCount(B2_POINTS)).toBe(5);
        expect(hullEdges(tri).map(e => [e.a, e.b])).toEqual([[0, 1], [0, 4], [1, 2], [2, 3], [3, 4]]);
        expect(edges(tri)).toHaveLength(13);
        expectValid(tri);
    });

    it('lists each undirected edge once, sorted, with its one or two triangles', () => {
        const all = edges(tri);
        const keys = all.map(e => [e.a, e.b]);
        expect(keys).toEqual([...keys].sort((p, q) => p[0] - q[0] || p[1] - q[1]));
        expect(new Set(keys.map(k => k.join(','))).size).toBe(13);
        expect(all.every(e => e.a < e.b && e.triangles.length === (e.interior ? 2 : 1))).toBe(true);
        const e14 = all.find(e => e.a === 1 && e.b === 4);
        expect(e14).toMatchObject({interior: true, triangles: [1, 4]});
    });

    it('knows the neighbours by hand: the edge opposite each vertex of (1,2,6)', () => {
        expect(neighbourAcross(tri, 0, 0)).toBe(6); // edge 2-6 shared with (6,2,4)
        expect(neighbourAcross(tri, 0, 1)).toBe(2); // edge 6-1 shared with (1,6,5)
        expect(neighbourAcross(tri, 0, 2)).toBe(-1); // edge 1-2 is on the hull
        expect(() => neighbourAcross(tri, 7, 0)).toThrow(RangeError);
        expect(() => neighbourAcross(tri, 0, 3)).toThrow(RangeError);
    });

    it('has exactly the illegal edges p1p4, p2p4, p4p6, in lexicographic order', () => {
        expect(illegalEdges(tri).map(e => [e.a, e.b])).toEqual([[1, 4], [2, 4], [4, 6]]);
    });

    it('agrees with incircle from both sides of every interior edge', () => {
        for (const e of edges(tri).filter(x => x.interior)) {
            const [first, second] = e.triangles.map(t => tri.triangles[t]);
            const c = first.find(v => v !== e.a && v !== e.b)!;
            const d = second.find(v => v !== e.a && v !== e.b)!;
            const [a, b] = orient(tri.points[e.a], tri.points[e.b], tri.points[c]) > 0 ? [e.a, e.b] : [e.b, e.a];
            const viaC = incircle(tri.points[a], tri.points[b], tri.points[c], tri.points[d]);
            const viaD = incircle(tri.points[b], tri.points[a], tri.points[d], tri.points[c]);
            expect(viaC).toBe(viaD);
        }
    });

    it('is a frozen value; flip leaves it unchanged and returns a valid new one', () => {
        const before = JSON.stringify(tri);
        const result = flip(tri, [1, 4]);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(JSON.stringify(tri)).toBe(before);
        expect(Object.isFrozen(tri) && Object.isFrozen(tri.triangles) && Object.isFrozen(tri.triangles[0])).toBe(true);
        expect(Object.isFrozen(result.value) && Object.isFrozen(result.value.nbr[0])).toBe(true);
        expectValid(result.value);
        const keys = edges(result.value).map(e => `${e.a},${e.b}`);
        expect(keys).toContain('0,5');
        expect(keys).not.toContain('1,4');
        expect(triangulationCounts(result.value)).toEqual(triangulationCounts(tri));
        expect(illegalEdges(result.value).map(e => [e.a, e.b])).not.toContainEqual([1, 4]);
    });

    it('accepts the flip edge in either vertex order', () => {
        const forward = flip(tri, [1, 4]);
        const backward = flip(tri, [4, 1]);
        expect(forward.ok && backward.ok && forward.value.triangles).toEqual(backward.ok && backward.value.triangles);
    });

    it('Lawson flips of illegal edges reach a locally Delaunay triangulation with no point inside a circumcircle', () => {
        let current = tri;
        for (let step = 0; step < 50; step++) {
            const illegal = illegalEdges(current);
            if (illegal.length === 0) break;
            const result = flip(current, [illegal[0].a, illegal[0].b]);
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            current = result.value;
            expectValid(current);
        }
        expect(illegalEdges(current)).toEqual([]);
        for (const [a, b, c] of current.triangles) {
            current.points.forEach((p, i) => {
                if (i !== a && i !== b && i !== c) {
                    expect(incircle(current.points[a], current.points[b], current.points[c], p)).toBeLessThanOrEqual(0);
                }
            });
        }
    });
});

describe('counts with collinear boundary points (convexity sample 1)', () => {
    it('every valid triangulation of the nine points has 2*9-2-6 = 10 triangles', () => {
        expect(boundaryCount(SAMPLE_1)).toBe(6);
        const tri = mustCreate(SAMPLE_1, sweepTriangulation(SAMPLE_1));
        expect(tri.triangles).toHaveLength(10);
        expect(triangulationCounts(tri)).toMatchObject({triangles: 10, edges: 3 * 9 - 3 - 6, hullEdges: 6});
        // (2,0) is index 7 and lies on the hull edge (0,0)-(4,0): the hull edges are split there
        const split = hullEdges(tri).map(e => `${e.a},${e.b}`);
        expect(split).toContain('2,7');
        expect(split).toContain('1,7');
        expect(split).not.toContain('1,2');
    });

    it('stays at 10 triangles under random legal flips', () => {
        const random = rng(7);
        let current = mustCreate(SAMPLE_1, sweepTriangulation(SAMPLE_1));
        for (let i = 0; i < 60; i++) {
            const interior = edges(current).filter(e => e.interior);
            const e = interior[random(interior.length)];
            const result = flip(current, [e.a, e.b]);
            if (result.ok) current = result.value;
            expect(current.triangles).toHaveLength(10);
            expectValid(current);
        }
    });

    it('a quadrilateral with three collinear corners is not strictly convex, and its flip is refused', () => {
        // a=(0,0) lies on the segment from c=(0,4) to d=(0,-3); the boundary has 4 points, so n=4, k=4, T=2
        const points = pts([[0, 0], [4, 0], [0, 4], [0, -3]]);
        const tri = mustCreate(points, [[0, 1, 2], [1, 0, 3]]);
        expect(triangulationCounts(tri)).toMatchObject({triangles: 2, edges: 5, interiorEdges: 1, hullEdges: 4});
        const result = flip(tri, [0, 1]);
        expect(result).toEqual({ok: false, refusal: {kind: 'not-convex', edge: [0, 1]}});
        // the triangle without the boundary point a is not a triangulation of the four points
        expect(createTriangulation(points, [[3, 1, 2]])).toEqual({ok: false, refusal: {kind: 'missing-point', point: 0}});
    });
});

describe('flip', () => {
    it('refuses a hull edge and an edge that does not exist', () => {
        const tri = mustCreate(B2_POINTS, B2_T0);
        expect(flip(tri, [0, 1])).toEqual({ok: false, refusal: {kind: 'hull-edge', edge: [0, 1]}});
        expect(flip(tri, [3, 2])).toEqual({ok: false, refusal: {kind: 'hull-edge', edge: [3, 2]}});
        expect(flip(tri, [0, 6])).toEqual({ok: false, refusal: {kind: 'no-such-edge', edge: [0, 6]}});
    });

    it('refuses a non-convex quadrilateral and never builds a degenerate triangle', () => {
        // triangles (0,1,3) and (1,2,3) share the diagonal 1-3 of a dart: the reflex corner is 3
        const points = pts([[0, 0], [10, 0], [10, 10], [4, 2]]);
        const tri = mustCreate(points, [[0, 1, 3], [1, 2, 3], [0, 3, 2]]);
        expect(flip(tri, [1, 3])).toEqual({ok: false, refusal: {kind: 'not-convex', edge: [1, 3]}});
        expect(flip(tri, [0, 3])).toEqual({ok: false, refusal: {kind: 'not-convex', edge: [0, 3]}});
        expect(flip(tri, [2, 3])).toEqual({ok: false, refusal: {kind: 'not-convex', edge: [2, 3]}});
    });

    it('succeeds exactly when the diagonals cross properly (independent oracle), on random general-position sets', () => {
        const random = rng(2024);
        let succeeded = 0;
        let refused = 0;
        for (let round = 0; round < 25; round++) {
            const points = generalPosition(random, 5 + random(6), 14);
            const tri = mustCreate(points, sweepTriangulation(points));
            for (const e of edges(tri).filter(x => x.interior)) {
                const [first, second] = e.triangles.map(t => tri.triangles[t]);
                const c = first.find(v => v !== e.a && v !== e.b)!;
                const d = second.find(v => v !== e.a && v !== e.b)!;
                const crossing = segmentIntersection(points[e.a], points[e.b], points[c], points[d]) === 'proper';
                const result = flip(tri, [e.a, e.b]);
                expect(result.ok).toBe(crossing);
                if (result.ok) {
                    succeeded++;
                    expectValid(result.value);
                    // flipping the new diagonal back restores the triangle set
                    const back = flip(result.value, [Math.min(c, d), Math.max(c, d)]);
                    expect(back.ok).toBe(true);
                    if (back.ok) {
                        const sorted = (t: Triangulation) => t.triangles
                            .map(v => v.indexOf(Math.min(...v))).map((r, i) => {
                                const v = t.triangles[i];
                                return [v[r], v[(r + 1) % 3], v[(r + 2) % 3]].join();
                            }).sort();
                        expect(sorted(back.value)).toEqual(sorted(tri));
                    }
                } else {
                    refused++;
                    expect(result.refusal.kind).toBe('not-convex');
                }
            }
        }
        expect(succeeded).toBeGreaterThan(20);
        expect(refused).toBeGreaterThan(5);
    });
});

describe('random general-position sets', () => {
    it('keep 2n-2-k triangles and 3n-3-k edges through random legal flips, valid at every step', () => {
        const random = rng(99);
        let flips = 0;
        for (let round = 0; round < 30; round++) {
            const points = generalPosition(random, 4 + random(8), 16);
            let current = mustCreate(points, sweepTriangulation(points));
            expectValid(current);
            for (let step = 0; step < 25; step++) {
                const interior = edges(current).filter(e => e.interior);
                const e = interior[random(interior.length)];
                const before = JSON.stringify(current);
                const result = flip(current, [e.a, e.b]);
                expect(JSON.stringify(current)).toBe(before);
                if (!result.ok) continue;
                flips++;
                current = result.value;
                expectValid(current);
            }
        }
        expect(flips).toBeGreaterThan(100);
    });

    it('Lawson flipping ends with no illegal edge and an empty circumcircle for every triangle', () => {
        const random = rng(5);
        for (let round = 0; round < 20; round++) {
            const points = generalPosition(random, 5 + random(8), 20);
            let current = mustCreate(points, sweepTriangulation(points));
            for (let step = 0; step < 400; step++) {
                const illegal = illegalEdges(current);
                if (illegal.length === 0) break;
                const result = flip(current, [illegal[0].a, illegal[0].b]);
                expect(result.ok).toBe(true); // an illegal edge always has a convex quadrilateral
                if (!result.ok) return;
                current = result.value;
            }
            expect(illegalEdges(current)).toEqual([]);
            for (const [a, b, c] of current.triangles) {
                current.points.forEach((p, i) => {
                    if (i !== a && i !== b && i !== c) {
                        expect(incircle(current.points[a], current.points[b], current.points[c], p)).toBeLessThanOrEqual(0);
                    }
                });
            }
        }
    });
});

describe('createTriangulation refusals', () => {
    const refusal = (points: readonly GridPoint[], triangles: readonly (readonly number[])[]) => {
        const result = createTriangulation(points, triangles);
        return result.ok ? null : result.refusal;
    };

    it('refuses a clockwise triangle, naming it', () => {
        const triangles = B2_T0.map((t, i): TriangleIndices => (i === 3 ? [t[0], t[2], t[1]] : t));
        expect(refusal(B2_POINTS, triangles)).toEqual({kind: 'not-counter-clockwise', triangle: 3});
    });

    it('refuses a degenerate (collinear or repeated-vertex) triangle as not strictly counter-clockwise', () => {
        const points = pts([[0, 0], [2, 0], [4, 0], [0, 3]]);
        expect(refusal(points, [[0, 1, 2], [0, 2, 3]])).toEqual({kind: 'not-counter-clockwise', triangle: 0});
        expect(refusal(points, [[0, 0, 3]])).toEqual({kind: 'not-counter-clockwise', triangle: 0});
    });

    it('refuses a missing point', () => {
        // drop both triangles that use p5 (it is interior): no longer covers; the first failure is the unused point
        const triangles: TriangleIndices[] = [[1, 2, 6], [2, 3, 4], [4, 0, 1], [6, 2, 4]];
        expect(refusal(B2_POINTS, triangles)).toEqual({kind: 'missing-point', point: 5});
    });

    it('refuses overlapping triangles: two on the same side of an edge, and a third use of an edge', () => {
        const sameSide = refusal(B2_POINTS, [[1, 2, 6], [1, 6, 5], [1, 2, 5], ...B2_T0.slice(3)]);
        expect(sameSide).toEqual({kind: 'edge-same-direction', edge: [1, 5]});
        const overused = refusal(B2_POINTS, [...B2_T0, [4, 0, 5]]);
        expect(overused).toEqual({kind: 'edge-overused', edge: [4, 5]});
    });

    it('refuses a wrong triangle count', () => {
        expect(refusal(B2_POINTS, B2_T0.slice(0, 6))).toEqual({kind: 'wrong-triangle-count', expected: 7, actual: 6});
        expect(refusal(pts([[0, 0], [4, 0], [0, 4]]), [])).toEqual({kind: 'missing-point', point: 0});
    });

    it('refuses indices out of range, malformed triangles, bad and duplicate points, and collinear sets', () => {
        expect(refusal(B2_POINTS, [[1, 2, 7]])).toEqual({kind: 'index-out-of-range', triangle: 0, corner: 2});
        expect(refusal(B2_POINTS, [[1, -1, 2]])).toEqual({kind: 'index-out-of-range', triangle: 0, corner: 1});
        expect(refusal(B2_POINTS, [[1, 1.5, 2]])).toEqual({kind: 'index-out-of-range', triangle: 0, corner: 1});
        expect(refusal(B2_POINTS, [[1, 2]])).toEqual({kind: 'malformed-triangle', triangle: 0});
        expect(refusal([P(0, 0), P(0.5, 1), P(3, 3)], [])).toEqual({kind: 'invalid-point', index: 1});
        expect(refusal([P(0, 0), P(1, 0), P(0, 0), P(0, 1)], [])).toEqual({kind: 'duplicate-point', indices: [0, 2]});
        expect(refusal(pts([[0, 0], [1, 1], [2, 2]]), [])).toEqual({kind: 'degenerate-points'});
        expect(refusal(pts([[0, 0], [1, 1]]), [])).toEqual({kind: 'degenerate-points'});
    });

    it('refuses triangulations whose free edges are not the hull boundary split at collinear points', () => {
        // the square with the extra boundary point p4=(2,0): triangulating the bare square leaves p4 unused
        const square = pts([[0, 0], [4, 0], [4, 4], [0, 4], [2, 0]]);
        expect(refusal(square, [[0, 1, 2], [0, 2, 3]])).toEqual({kind: 'missing-point', point: 4});
        const ok = mustCreate(square, [[0, 4, 3], [4, 1, 2], [4, 2, 3]]);
        expect(hullEdges(ok).map(e => `${e.a},${e.b}`)).toEqual(['0,3', '0,4', '1,2', '1,4', '2,3']);
        // found by exhaustive search: five triangles, right count, every point used, but an overlapping pinched cover
        const pinched = pts([[0, 0], [4, 0], [4, 4], [0, 4], [2, 0], [2, 2]]);
        const bad = [[0, 1, 2], [0, 2, 3], [0, 4, 5], [1, 3, 4], [2, 5, 4]];
        expect(refusal(pinched, bad)).toEqual({kind: 'hull-edge-unexpected', edge: [0, 1]});
        expect(isTriangulationOracle(pinched, bad)).toBe(false);
    });

    it('accepts the validated value regardless of input mutation afterwards (copies are taken)', () => {
        const points = [...B2_POINTS];
        const triangles: number[][] = B2_T0.map(t => [...t]);
        const tri = mustCreate(points, triangles);
        points[0] = P(100, 100);
        triangles[0][0] = 5;
        expect(tri.points[0]).toEqual(P(0, 0));
        expect(tri.triangles[0]).toEqual([1, 2, 6]);
    });
});

describe('the validator against an independent oracle', () => {
    it('accepts exactly the true triangulations among every small triangle subset (with collinear boundary points)', () => {
        const sets = [
            pts([[0, 0], [4, 0], [4, 4], [0, 4], [2, 0], [2, 2]]),
            pts([[0, 0], [4, 0], [8, 0], [4, 6], [4, 3], [2, 1]]),
        ];
        let accepted = 0;
        let rejected = 0;
        let unexpectedHull = 0;
        const disagreements: string[] = [];
        for (const points of sets) {
            const all: number[][] = [];
            for (let a = 0; a < 6; a++) {
                for (let b = a + 1; b < 6; b++) {
                    for (let c = b + 1; c < 6; c++) {
                        // each CCW triangle once, starting at its smallest index
                        if (orient(points[a], points[b], points[c]) > 0) all.push([a, b, c]);
                        else if (orient(points[a], points[c], points[b]) > 0) all.push([a, c, b]);
                    }
                }
            }
            const chosen: number[][] = [];
            const walk = (start: number, size: number): void => {
                if (chosen.length === size) {
                    const result = createTriangulation(points, chosen);
                    if (result.ok !== isTriangulationOracle(points, chosen)) disagreements.push(JSON.stringify(chosen));
                    if (result.ok) accepted++;
                    else {
                        rejected++;
                        if (result.refusal.kind === 'hull-edge-unexpected') unexpectedHull++;
                    }
                    return;
                }
                for (let i = start; i < all.length; i++) {
                    chosen.push(all[i]);
                    walk(i + 1, size);
                    chosen.pop();
                }
            };
            for (const size of [4, 5, 6]) walk(0, size);
        }
        expect(disagreements).toEqual([]);
        expect(accepted).toBeGreaterThanOrEqual(8);
        expect(rejected).toBeGreaterThan(1000);
        expect(unexpectedHull).toBeGreaterThan(0);
    });
});
