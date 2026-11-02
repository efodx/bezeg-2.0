import {describe, expect, it} from 'vitest';
import {DELAUNAY_MAX_POINTS, incrementalTriangulation} from './delaunay';
import type {GridPoint} from './grid';
import {boundaryCount, insertPoint} from './pointInsertion';
import {orient} from './predicates';
import {createTriangulation, edges, flip, triangulationCounts, type Triangulation} from './triangulation';

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
const B2_T0 = [[1, 2, 6], [1, 5, 4], [1, 6, 5], [2, 3, 4], [4, 0, 1], [4, 5, 6], [6, 2, 4]];
const SAMPLE_1 = pts([[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]]);

function must(points: readonly GridPoint[], triangles: readonly (readonly number[])[]): Triangulation {
    const r = createTriangulation(points, triangles);
    if (!r.ok) throw new Error(`invalid: ${r.refusal.kind}`);
    return r.value;
}

/** The square (0,0),(4,0),(4,4),(0,4) split along the diagonal 0-2. */
const SQUARE = pts([[0, 0], [4, 0], [4, 4], [0, 4]]);
const squareTri = (): Triangulation => must(SQUARE, [[0, 1, 2], [0, 2, 3]]);

const doubledArea = (a: GridPoint, b: GridPoint, c: GridPoint): bigint =>
    BigInt(b.x - a.x) * BigInt(c.y - a.y) - BigInt(b.y - a.y) * BigInt(c.x - a.x);

/** The structural invariants of B2 acceptance 2 and 4. */
function checkInvariants(tri: Triangulation): void {
    const n = tri.points.length;
    const {k} = boundaryCount(tri);
    const counts = triangulationCounts(tri);
    expect(counts.triangles).toBe(2 * n - 2 - k);
    expect(counts.edges).toBe(3 * n - 3 - k);
    expect(counts.hullEdges).toBe(k);
    let sum = 0n;
    for (const [a, b, c] of tri.triangles) {
        const area = doubledArea(tri.points[a], tri.points[b], tri.points[c]);
        expect(area > 0n).toBe(true);
        sum += area;
    }
    // Doubled hull area by the shoelace sum over the boundary edges.
    let hull = 0n;
    tri.triangles.forEach((v, t) => {
        for (let i = 0; i < 3; i++) {
            if (tri.nbr[t][i] !== -1) continue;
            const a = tri.points[v[(i + 1) % 3]], b = tri.points[v[(i + 2) % 3]];
            hull += BigInt(a.x) * BigInt(b.y) - BigInt(b.x) * BigInt(a.y);
        }
    });
    expect(sum).toBe(hull);
    for (let p = 0; p < n; p++) {
        for (const v of tri.triangles) {
            if (v.includes(p)) continue;
            const [a, b, c] = v.map(i => tri.points[i]);
            const q = tri.points[p];
            expect(orient(a, b, q) > 0 && orient(b, c, q) > 0 && orient(c, a, q) > 0).toBe(false);
        }
    }
}

describe('boundaryCount', () => {
    it('B2 example T0: 7 triangles, 13 edges, 8 interior, k = 5, no collinear', () => {
        const tri = must(B2_POINTS, B2_T0);
        expect(triangulationCounts(tri)).toMatchObject({triangles: 7, edges: 13, interiorEdges: 8, hullEdges: 5});
        expect(boundaryCount(tri)).toEqual({k: 5, corners: 5, collinear: 0});
    });

    it('sample 1 (nine hull-lesson points): k = 6, one collinear, 10 triangles', () => {
        const r = incrementalTriangulation(SAMPLE_1);
        if (!r.ok) throw new Error('refused');
        expect(boundaryCount(r.value)).toEqual({k: 6, corners: 5, collinear: 1});
        expect(r.value.triangles.length).toBe(10);
    });
});

describe('insertPoint cases', () => {
    it('inside a triangle: one triangle becomes three', () => {
        const tri = squareTri();
        const r = insertPoint(tri, P(3, 1));
        if (!r.ok) throw new Error('refused');
        expect(r.change).toBe('inside');
        expect(r.value.triangles.length).toBe(tri.triangles.length + 2);
        expect(r.value.points[4]).toEqual(P(3, 1));
        checkInvariants(r.value);
    });

    it('in the relative interior of an interior edge: both neighbours split, +2', () => {
        const r = insertPoint(squareTri(), P(2, 2));
        if (!r.ok) throw new Error('refused');
        expect(r.change).toBe('interior-edge');
        expect(r.value.triangles.length).toBe(4);
        expect(boundaryCount(r.value).k).toBe(4);
        checkInvariants(r.value);
    });

    it('in the relative interior of a hull edge: one triangle splits, +1, a collinear boundary point', () => {
        const r = insertPoint(squareTri(), P(2, 0));
        if (!r.ok) throw new Error('refused');
        expect(r.change).toBe('hull-edge');
        expect(r.value.triangles.length).toBe(3);
        expect(boundaryCount(r.value)).toEqual({k: 5, corners: 4, collinear: 1});
        checkInvariants(r.value);
    });

    it('outside: joined to the strictly visible edges, not to a collinear one', () => {
        const tri = squareTri();
        // From (6, 0) only the edge (4,0)-(4,4) is seen strictly; (0,0)-(4,0) is collinear and is not joined.
        const r = insertPoint(tri, P(6, 0));
        if (!r.ok) throw new Error('refused');
        expect(r.change).toBe('outside');
        expect(r.value.triangles.length).toBe(3);
        expect(boundaryCount(r.value)).toEqual({k: 5, corners: 4, collinear: 1});
        checkInvariants(r.value);
        const far = insertPoint(tri, P(8, 2));
        if (!far.ok) throw new Error('refused');
        expect(far.value.triangles.length).toBe(3);
        checkInvariants(far.value);
    });

    it('outside seeing several edges of the B2 triangulation', () => {
        const r = insertPoint(must(B2_POINTS, B2_T0), P(4, 20));
        if (!r.ok) throw new Error('refused');
        expect(r.change).toBe('outside');
        checkInvariants(r.value);
        expect(r.value.triangles.length).toBeGreaterThan(7);
    });

    it('refuses a duplicate and a point above the limit', () => {
        expect(insertPoint(squareTri(), P(4, 4))).toEqual({ok: false, refusal: {kind: 'duplicate-point', index: 2}});
        const many = Array.from({length: DELAUNAY_MAX_POINTS}, (_, i) => P(i, (i * i) % 7 + 20 * (i % 2)));
        const base = incrementalTriangulation(many);
        if (!base.ok) throw new Error('refused');
        expect(insertPoint(base.value, P(500, 500))).toEqual({
            ok: false, refusal: {kind: 'too-many-points', limit: DELAUNAY_MAX_POINTS},
        });
    });

    it('never mutates the input', () => {
        const tri = squareTri();
        const snapshot = JSON.parse(JSON.stringify(tri));
        for (const q of [P(3, 1), P(2, 2), P(2, 0), P(6, 0), P(4, 4), P(9, 9)]) insertPoint(tri, q);
        expect(JSON.parse(JSON.stringify(tri))).toEqual(snapshot);
    });
});

describe('random insertion after random flips', () => {
    interface Tally {
        flips: number;
        insertions: number;
        cases: Record<string, number>;
    }
    const newTally = (): Tally => ({flips: 0, insertions: 0, cases: {}});
    /** The random runs must not be vacuous: flips happened, points were inserted, and each case occurred. */
    function expectExercised(t: Tally, cases: readonly string[]) {
        expect(t.flips).toBeGreaterThan(300);
        expect(t.insertions).toBeGreaterThan(300);
        for (const c of cases) expect(t.cases[c] ?? 0, c).toBeGreaterThan(0);
    }

    function run(seed: number, span: number, tally: Tally): boolean {
        const next = rng(seed);
        const n = 4 + next(8);
        const seen = new Set<string>();
        const points: GridPoint[] = [];
        for (let tries = 0; points.length < n && tries < 200; tries++) {
            const p = P(next(span), next(span));
            const key = `${p.x},${p.y}`;
            if (!seen.has(key)) {
                seen.add(key);
                points.push(p);
            }
        }
        const base = incrementalTriangulation(points);
        if (!base.ok) return false; // degenerate set, skipped
        let tri = base.value;
        for (let f = 0, done = 0; f < 40 && done < 6; f++) {
            const interior = edges(tri).filter(e => e.interior);
            if (interior.length === 0) break;
            const e = interior[next(interior.length)];
            const r = flip(tri, [e.a, e.b]);
            if (r.ok) {
                tri = r.value;
                done++;
                tally.flips++;
            }
        }
        checkInvariants(tri);
        for (let added = 0, tries = 0; added < 4 && tries < 30 && tri.points.length < 15; tries++) {
            const q = P(next(span + 4) - 2, next(span + 4) - 2);
            const before = JSON.stringify(tri);
            const r = insertPoint(tri, q);
            expect(JSON.stringify(tri)).toBe(before);
            if (!r.ok) {
                expect(r.refusal.kind).toBe('duplicate-point');
                continue;
            }
            const grown = r.value.triangles.length - tri.triangles.length;
            if (r.change === 'inside' || r.change === 'interior-edge') expect(grown).toBe(2);
            if (r.change === 'hull-edge') expect(grown).toBe(1);
            tri = r.value;
            checkInvariants(tri);
            added++;
            tally.insertions++;
            tally.cases[r.change] = (tally.cases[r.change] ?? 0) + 1;
        }
        return true;
    }

    it('general-position grid sets', () => {
        let used = 0;
        const tally = newTally();
        for (let seed = 1; seed <= 400; seed++) if (run(seed, 30, tally)) used++;
        expect(used).toBeGreaterThan(300);
        expectExercised(tally, ['inside', 'outside']);
    });

    it('collinear-rich grid sets', () => {
        let used = 0;
        const tally = newTally();
        for (let seed = 1; seed <= 600; seed++) if (run(seed * 7919, 4, tally)) used++;
        expect(used).toBeGreaterThan(300);
        expectExercised(tally, ['inside', 'interior-edge', 'hull-edge', 'outside']);
    });
});
