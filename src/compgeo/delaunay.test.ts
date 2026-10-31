import {describe, expect, it} from 'vitest';
import {
    angleVector, delaunayTriangulation, foldLawson, incrementalTriangulation, lawsonStateAt, lawsonTrace,
    LAWSON_INITIAL_STATE, type LawsonTrace,
} from './delaunay';
import type {GridPoint} from './grid';
import {incircle, incircleValue, orient} from './predicates';
import {clampTraceIndex} from './trace';
import {
    createTriangulation, edges, flip, illegalEdges, triangulationCounts, type TriangleIndices, type Triangulation,
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

function mustCreate(points: readonly GridPoint[], triangles: readonly (readonly number[])[]): Triangulation {
    const result = createTriangulation(points, triangles);
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusal)}`);
    return result.value;
}

function mustIncremental(points: readonly GridPoint[]): Triangulation {
    const result = incrementalTriangulation(points);
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusal)}`);
    return result.value;
}

function mustDelaunay(points: readonly GridPoint[]): Triangulation {
    const result = delaunayTriangulation(points);
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusal)}`);
    return result.value;
}

/** Triangles as sorted index triples, in sorted order, as strings: the set a triangulation is compared by. */
const triangleSet = (tri: Triangulation): string[] =>
    tri.triangles.map((t) => [...t].sort((a, b) => a - b).join(',')).sort();

const sets = (...list: readonly (readonly [number, number, number])[]): string[] =>
    list.map((t) => [...t].sort((a, b) => a - b).join(',')).sort();

const edgeKeys = (list: readonly { a: number; b: number }[]): string[] => list.map((e) => `${e.a},${e.b}`);

/**
 * Independent brute-force Delaunay oracle: every non-collinear triple whose circumcircle has every other point
 * strictly outside. Valid as "the" Delaunay triangulation only in general position.
 */
function oracle(points: readonly GridPoint[]): string[] {
    const found: string[] = [];
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            for (let k = j + 1; k < points.length; k++) {
                const o = orient(points[i], points[j], points[k]);
                if (o === 0) continue;
                const [a, b, c] = o > 0 ? [i, j, k] : [i, k, j];
                let empty = true;
                for (let d = 0; d < points.length && empty; d++) {
                    if (d === i || d === j || d === k) continue;
                    if (incircle(points[a], points[b], points[c], points[d]) >= 0) empty = false;
                }
                if (empty) found.push(`${i},${j},${k}`);
            }
        }
    }
    return found.sort();
}

/** Random distinct points, each added only if no three are collinear and no four cocircular (checked exactly). */
function generalPositionSet(random: (n: number) => number, n: number, size: number): GridPoint[] | null {
    const result: GridPoint[] = [];
    for (let attempt = 0; result.length < n && attempt < 60; attempt++) {
        const p = P(random(size), random(size));
        let ok = true;
        for (let i = 0; i < result.length && ok; i++) {
            if (result[i].x === p.x && result[i].y === p.y) ok = false;
            for (let j = i + 1; j < result.length && ok; j++) {
                const o = orient(result[i], result[j], p);
                if (o === 0) {
                    ok = false;
                    break;
                }
                for (let k = j + 1; k < result.length && ok; k++) {
                    if (orient(result[i], result[j], result[k]) === 0) continue;
                    if (incircleValue(result[i], result[j], result[k], p) === 0n) ok = false;
                }
            }
        }
        if (ok) result.push(p);
    }
    return result.length === n ? result : null;
}

function degenerateSet(random: (n: number) => number, n: number, size: number): GridPoint[] {
    const result: GridPoint[] = [];
    for (let attempt = 0; result.length < n && attempt < 200; attempt++) {
        const p = P(random(size), random(size));
        if (!result.some((q) => q.x === p.x && q.y === p.y)) result.push(p);
    }
    return result;
}

/** Random successful flips (bounded attempts) applied to a valid triangulation. */
function randomFlips(tri: Triangulation, random: (n: number) => number, attempts: number): Triangulation {
    let current = tri;
    for (let i = 0; i < attempts; i++) {
        const interior = edges(current).filter((e) => e.interior);
        if (interior.length === 0) break;
        const e = interior[random(interior.length)];
        const result = flip(current, [e.a, e.b]);
        if (result.ok) current = result.value;
    }
    return current;
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] < b[i];
    }
    return false;
}

const fixed2 = (values: readonly number[]): string[] => values.map((v) => v.toFixed(2));

/** The task's independent flip rule: flip the first illegal edge until none is left. Returns the flipped edges. */
function referenceFlipOrder(tri: Triangulation): string[] {
    const flipped: string[] = [];
    let current = tri;
    for (let guard = 0; guard < 5000; guard++) {
        const illegal = illegalEdges(current);
        if (illegal.length === 0) return flipped;
        const e = illegal[0];
        const result = flip(current, [e.a, e.b]);
        if (!result.ok) throw new Error('reference flip refused');
        current = result.value;
        flipped.push(`${e.a},${e.b}`);
    }
    throw new Error('reference flip did not terminate');
}

const flipEdges = (trace: LawsonTrace): string[] =>
    trace.filter((e) => e.kind === 'flip').map((e) => (e.payload.edge ?? []).join(','));

let largestTrace = 0;

describe('Lawson flips: worked examples', () => {
    const a = P(0, 0), b = P(4, 0), c = P(5, 3), d = P(0, 2);
    const quad = () => mustCreate([a, b, c, d], [[0, 1, 2], [0, 2, 3]]);

    it('example 1: edge ac is illegal (incircle 64), one flip to bd, then both tests give -64', () => {
        expect(incircleValue(a, b, c, d)).toBe(64n);
        const start = quad();
        expect(edgeKeys(illegalEdges(start))).toEqual(['0,2']);
        const trace = lawsonTrace(start);
        expect(trace.map((e) => e.kind)).toEqual(['phase', 'test', 'flip', 'test', 'done']);
        expect(trace[1].payload).toMatchObject({edge: [0, 2], sign: 1, value: 64n});
        expect(trace[2].payload).toMatchObject({edge: [0, 2], added: [1, 3]});
        expect(trace[3].payload).toMatchObject({edge: [1, 3], sign: -1, value: -64n});
        // The same value from the other triangle pair, as the task states.
        expect(incircleValue(b, c, d, a)).toBe(-64n);
        expect(incircleValue(a, b, d, c)).toBe(-64n);
        const final = lawsonStateAt(trace, trace.length - 1);
        expect(final.flips).toBe(1);
        expect(final.done).toBe(true);
        expect(triangleSet(final.triangulation as Triangulation)).toEqual(sets([0, 1, 3], [1, 2, 3]));
    });

    it('example 1: angle vectors before and after', () => {
        const start = quad();
        expect(fixed2(angleVector(start))).toEqual(['19.65', '30.96', '40.60', '59.04', '101.31', '108.43']);
        expect(fixed2(angleVector(mustDelaunay([a, b, c, d])))).toEqual(['26.57', '37.87', '60.26', '63.43', '81.87', '90.00']);
        expect(angleVector(start)).toHaveLength(6);
    });

    it('example 2: exactly three flips, removing p1p4, p2p4, p4p6 in that order', () => {
        const trace = lawsonTrace(mustCreate(B2_POINTS, B2_T0));
        expect(flipEdges(trace)).toEqual(['1,4', '2,4', '4,6']);
        const final = lawsonStateAt(trace, trace.length - 1);
        expect(final.flips).toBe(3);
        expect(triangleSet(final.triangulation as Triangulation)).toEqual(
            sets([0, 1, 5], [0, 4, 5], [1, 2, 6], [1, 5, 6], [2, 3, 6], [3, 4, 5], [3, 5, 6]),
        );
        expect(angleVector(final.triangulation as Triangulation)[0]).toBeCloseTo(25.35, 2);
        expect(angleVector(mustCreate(B2_POINTS, B2_T0))[0]).toBeCloseTo(1.91, 2);
    });

    it('example 2: incremental insertion gives the stated triangles, two illegal edges, and Lawson reaches the same set', () => {
        const start = mustIncremental(B2_POINTS);
        expect(triangleSet(start)).toEqual(sets([0, 1, 6], [0, 4, 5], [0, 5, 6], [1, 2, 3], [1, 3, 6], [3, 4, 5], [3, 5, 6]));
        expect(edgeKeys(illegalEdges(start))).toEqual(['0,6', '1,3']);
        const trace = lawsonTrace(start);
        expect(flipEdges(trace)).toHaveLength(2);
        expect(triangleSet(mustDelaunay(B2_POINTS))).toEqual(
            sets([0, 1, 5], [0, 4, 5], [1, 2, 6], [1, 5, 6], [2, 3, 6], [3, 4, 5], [3, 5, 6]),
        );
        expect(triangleSet(mustDelaunay(B2_POINTS))).toEqual(oracle(B2_POINTS));
    });

    it('unit square: incremental gives two triangles, the only interior edge tests with value 0, no flip', () => {
        const square = pts([[0, 0], [0, 1], [1, 0], [1, 1]]);
        const start = mustIncremental(square);
        expect(triangleSet(start)).toEqual(sets([0, 1, 2], [1, 2, 3]));
        const trace = lawsonTrace(start);
        expect(trace.map((e) => e.kind)).toEqual(['phase', 'test', 'done']);
        expect(trace[1].payload).toMatchObject({edge: [1, 2], sign: 0, value: 0n});
        expect(flipEdges(trace)).toEqual([]);
        expect(triangleSet(mustDelaunay(square))).toEqual(triangleSet(start));
    });
});

describe('incrementalTriangulation', () => {
    it('refuses fewer than three points, duplicates and collinear sets with 03 refusal kinds', () => {
        expect(incrementalTriangulation([])).toEqual({ok: false, refusal: {kind: 'degenerate-points'}});
        expect(incrementalTriangulation(pts([[0, 0], [1, 1]]))).toEqual({ok: false, refusal: {kind: 'degenerate-points'}});
        expect(incrementalTriangulation(pts([[0, 0], [1, 1], [2, 2], [5, 5]])))
            .toEqual({ok: false, refusal: {kind: 'degenerate-points'}});
        expect(incrementalTriangulation(pts([[3, 0], [3, 7], [3, 2]])))
            .toEqual({ok: false, refusal: {kind: 'degenerate-points'}});
        expect(incrementalTriangulation(pts([[0, 0], [4, 0], [0, 3], [4, 0]])))
            .toEqual({ok: false, refusal: {kind: 'duplicate-point', indices: [1, 3]}});
        expect(delaunayTriangulation(pts([[0, 0], [1, 1]]))).toEqual({ok: false, refusal: {kind: 'degenerate-points'}});
    });

    it('throws RangeError beyond 40 points and for points off the grid', () => {
        const many = Array.from({length: 41}, (_, i) => P(i, i * i));
        expect(() => incrementalTriangulation(many)).toThrow(RangeError);
        const ok40 = Array.from({length: 40}, (_, i) => P(i, i * i));
        expect(incrementalTriangulation(ok40).ok).toBe(true);
        expect(() => incrementalTriangulation([P(0, 0), P(1, 0.5), P(0, 1)])).toThrow(RangeError);
    });

    it('a collinear prefix forms a chain joined to the first point off the line', () => {
        const points = pts([[0, 0], [0, 2], [0, 4], [3, 1]]);
        const tri = mustIncremental(points);
        expect(tri.triangles).toHaveLength(2);
        expect(triangleSet(tri)).toEqual(sets([0, 1, 3], [1, 2, 3]));
        const counts = triangulationCounts(tri);
        expect(counts.triangles).toBe(2 * 4 - 2 - counts.hullEdges);
        expect(counts.hullEdges).toBe(4);
    });

    it('a point collinear with a hull edge is not joined to it, so no degenerate triangle arises', () => {
        const points = pts([[0, 0], [0, 1], [1, 0], [2, 0]]);
        const tri = mustIncremental(points);
        expect(triangleSet(tri)).toEqual(sets([0, 1, 2], [1, 2, 3]));
        const counts = triangulationCounts(tri);
        expect(counts.triangles).toBe(2 * 4 - 2 - counts.hullEdges);
        // Same with the collinear run on the other side and the input in another order.
        const mirrored = mustIncremental(pts([[2, 0], [1, 0], [0, 1], [0, 0]]));
        expect(mirrored.triangles).toHaveLength(2);
        expect(triangleSet(mirrored)).toEqual(sets([3, 2, 1], [2, 1, 0]));
    });

    it('is valid on random sets with collinear points, with the 2n-2-k triangle count', () => {
        const random = rng(99);
        let valid = 0;
        for (let attempt = 0; attempt < 300; attempt++) {
            const points = degenerateSet(random, 3 + random(10), 4);
            const result = incrementalTriangulation(points);
            if (!result.ok) {
                expect(result.refusal.kind).toBe('degenerate-points');
                continue;
            }
            valid++;
            expect(createTriangulation(points, result.value.triangles).ok).toBe(true);
            const counts = triangulationCounts(result.value);
            expect(counts.triangles).toBe(2 * points.length - 2 - counts.hullEdges);
        }
        expect(valid).toBeGreaterThan(200);
    });
});

describe('Delaunay triangulation against an independent oracle', () => {
    it('equals the brute-force oracle on random general-position sets', () => {
        const random = rng(31337);
        let checked = 0;
        for (let attempt = 0; attempt < 600 && checked < 300; attempt++) {
            const points = generalPositionSet(random, 4 + random(11), 40);
            if (points === null) continue;
            checked++;
            const tri = mustDelaunay(points);
            expect(triangleSet(tri)).toEqual(oracle(points));
            expect(illegalEdges(tri)).toEqual([]);
        }
        expect(checked).toBeGreaterThanOrEqual(250);
    });

    it('with degeneracies: valid, no illegal edge, and no point strictly inside any circumcircle', () => {
        const random = rng(4242);
        let checked = 0;
        for (let attempt = 0; attempt < 500; attempt++) {
            const points = degenerateSet(random, 4 + random(9), 2 + random(4));
            const result = delaunayTriangulation(points);
            if (!result.ok) {
                expect(result.refusal.kind).toBe('degenerate-points');
                continue;
            }
            checked++;
            const tri = result.value;
            expect(createTriangulation(points, tri.triangles).ok).toBe(true);
            expect(illegalEdges(tri)).toEqual([]);
            for (const [i, j, k] of tri.triangles) {
                for (let d = 0; d < points.length; d++) {
                    if (d === i || d === j || d === k) continue;
                    expect(incircle(points[i], points[j], points[k], points[d])).toBeLessThanOrEqual(0);
                }
            }
        }
        expect(checked).toBeGreaterThan(300);
    });
});

describe('Lawson trace from random starts', () => {
    it('terminates with done; angle vector grows strictly at every flip; flip order and result match the references', () => {
        const random = rng(777);
        let runs = 0;
        let flips = 0;
        for (let attempt = 0; attempt < 400; attempt++) {
            const general = attempt % 2 === 0;
            const points = general
                ? generalPositionSet(random, 5 + random(8), 30)
                : degenerateSet(random, 5 + random(8), 5);
            if (points === null) continue;
            const base = incrementalTriangulation(points);
            if (!base.ok) continue;
            const start = randomFlips(base.value, random, random(25));
            const trace = lawsonTrace(start);
            runs++;
            largestTrace = Math.max(largestTrace, trace.length);
            expect(trace.filter((e) => e.kind === 'done')).toHaveLength(1);
            expect(trace[trace.length - 1].kind).toBe('done');

            // The angle vector increases strictly in lexicographic order at each flip.
            let before = start;
            let state = LAWSON_INITIAL_STATE;
            for (const event of trace) {
                const next = foldLawson(state, event);
                if (event.kind === 'flip') {
                    flips++;
                    const after = next.triangulation as Triangulation;
                    expect(lexLess(angleVector(before), angleVector(after))).toBe(true);
                    before = after;
                }
                state = next;
            }

            // Flip order: the independently stated rule.
            expect(flipEdges(trace)).toEqual(referenceFlipOrder(start));

            const final = state.triangulation as Triangulation;
            expect(illegalEdges(final)).toEqual([]);
            if (general) expect(triangleSet(final)).toEqual(oracle(points));
        }
        expect(runs).toBeGreaterThan(250);
        expect(flips).toBeGreaterThan(100);
        // Observed 2026-10-31: 157 events at most over 400 runs and 1352 flips; the bound leaves headroom.
        expect(largestTrace).toBeLessThan(1000);
    });

    it('restarts the scan at the first edge after a flip', () => {
        const trace = lawsonTrace(mustCreate(B2_POINTS, B2_T0));
        const edgeAfterFlip = trace.flatMap((e, i) => (e.kind === 'flip' ? [trace[i + 1]] : []));
        expect(edgeAfterFlip).toHaveLength(3);
        for (const next of edgeAfterFlip) expect(next.kind).toBe('test');
        // After the first flip the scan restarts at the lexicographically first interior edge of the new triangulation.
        const afterFirst = lawsonStateAt(trace, trace.findIndex((e) => e.kind === 'flip')).triangulation as Triangulation;
        const firstInterior = edges(afterFirst).find((e) => e.interior);
        expect(edgeAfterFlip[0].payload.edge).toEqual([firstInterior?.a, firstInterior?.b]);
    });

    it('state at the last index is the final triangulation, index 0 is the start, stale indices are clamped', () => {
        const start = mustCreate(B2_POINTS, B2_T0);
        const trace = lawsonTrace(start);
        const last = trace.length - 1;
        const final = lawsonStateAt(trace, last);
        expect(final.done).toBe(true);
        expect(final.triangulation).not.toBeNull();
        expect(triangleSet(final.triangulation as Triangulation)).toEqual(triangleSet(mustDelaunay(B2_POINTS)));
        expect(lawsonStateAt(trace, 0).triangulation).toBe(start);
        expect(lawsonStateAt(trace, 0)).toMatchObject({flips: 0, done: false, testing: null});
        expect(lawsonStateAt(trace, last + 50)).toEqual(final);
        expect(lawsonStateAt(trace, -3)).toEqual(lawsonStateAt(trace, 0));
        expect(lawsonStateAt(trace, Number.NaN)).toEqual(lawsonStateAt(trace, 0));
        expect(clampTraceIndex(trace, 1e9)).toBe(last);
        expect(lawsonStateAt([], 4)).toBe(LAWSON_INITIAL_STATE);
    });

    it('predicateCount is non-decreasing, counts one incircle per test, and the payloads are frozen', () => {
        const trace = lawsonTrace(mustIncremental(B2_POINTS));
        let previous = 0;
        for (const event of trace) {
            expect(event.predicateCount).toBeGreaterThanOrEqual(previous);
            previous = event.predicateCount;
            expect(Object.isFrozen(event)).toBe(true);
            expect(Object.isFrozen(event.payload)).toBe(true);
        }
        expect(trace[trace.length - 1].predicateCount).toBe(trace.filter((e) => e.kind === 'test').length);
        expect(trace[0].predicateCount).toBe(0);
        // A test event holds indices only.
        const test = trace.find((e) => e.kind === 'test');
        expect(test?.payload.edge).toBeDefined();
        expect(test?.payload.triangulation).toBeUndefined();
    });

    it('a Delaunay start gives one test per interior edge and no flip', () => {
        const delaunay = mustDelaunay(B2_POINTS);
        const trace = lawsonTrace(delaunay);
        const interior = edges(delaunay).filter((e) => e.interior).length;
        expect(trace.map((e) => e.kind)).toEqual(['phase', ...Array<string>(interior).fill('test'), 'done']);
    });

    it('rejects more than 40 points', () => {
        const points = Array.from({length: 41}, (_, i) => P(i, i * i));
        const tri = mustCreate(points, Array.from({length: 40}, (_, i) => [0, i, i + 1]).slice(1));
        expect(() => lawsonTrace(tri)).toThrow(RangeError);
    });
});
