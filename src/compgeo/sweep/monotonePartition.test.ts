import {describe, expect, it} from 'vitest';
import type {GridPoint} from '../grid';
import {doubledSignedArea, strictlyInsidePolygon} from '../polygonMeasures';
import {polygonSimplicity, segmentIntersection} from '../predicates';
import {SWEEP_COORD_LIMIT, SWEEP_MAX_POLYGON_VERTICES} from './limits';
import {
    classifyVertices,
    isYMonotone,
    monotonePartitionTrace,
    partitionStateAt,
    type Diagonal,
    type MonotonePartition,
    type VertexType,
} from './monotonePartition';

const pts = (...xy: [number, number][]): GridPoint[] => xy.map(([x, y]) => ({x, y}));
const coord = (p: GridPoint): string => `${p.x},${p.y}`;

const first = pts([0, 0], [4, 3], [8, 0], [12, 8], [8, 5], [4, 8]);
const second = pts([4, 0], [10, 2], [8, 5], [12, 9], [7, 7], [5, 12], [3, 7], [0, 9], [2, 4]);
/** Notch from below with a flat plateau (3,-3)-(5,-3): the tie rule decides between split and regular. */
const plateau = pts([0, -6], [3, -3], [5, -3], [8, -6], [8, 0], [0, 0]);

function solve(vertices: readonly GridPoint[]): MonotonePartition {
    const out = monotonePartitionTrace(vertices);
    if (!out.ok) throw new Error(`refused: ${out.reason}`);
    return out;
}

/** Test-side order (decreasing y, ties by increasing x), independent of the kernel. */
const processedBefore = (a: GridPoint, b: GridPoint): boolean => a.y > b.y || (a.y === b.y && a.x < b.x);
const orderOf = (vertices: readonly GridPoint[]): number[] =>
    vertices.map((_, i) => i).sort((p, q) => (processedBefore(vertices[p], vertices[q]) ? -1 : 1));
const diagKeys = (diagonals: readonly Diagonal[]): string[] => diagonals.map((d) => d.join('-')).sort();
const pieceKeys = (vertices: readonly GridPoint[], pieces: readonly (readonly number[])[]): string[] =>
    pieces.map((piece) => [...piece].map((i) => coord(vertices[i])).sort().join('|')).sort();
const absArea = (vertices: readonly GridPoint[]): bigint => {
    const a = doubledSignedArea(vertices);
    return a < 0n ? -a : a;
};
const countTypes = (types: readonly VertexType[]): Record<VertexType, number> => {
    const counts: Record<VertexType, number> = {start: 0, end: 0, split: 0, merge: 0, regular: 0};
    types.forEach((t) => counts[t]++);
    return counts;
};

/** Trace length n + 2L + d + 2, with L the number of edges whose tail is processed before their head. */
function expectedTraceLength(vertices: readonly GridPoint[], result: MonotonePartition): number {
    const n = vertices.length;
    let left = 0;
    for (let i = 0; i < n; i++) {
        const j = result.reversed ? (i + n - 1) % n : (i + 1) % n;
        if (processedBefore(vertices[i], vertices[j])) left++;
    }
    return n + 2 * left + result.diagonals.length + 2;
}

/** Invariants of any successful partition (spec C3 acceptance 1-4). */
function checkPartition(vertices: readonly GridPoint[], result: MonotonePartition) {
    const n = vertices.length;
    const counts = countTypes(result.types);
    expect(counts.start + counts.split).toBe(counts.end + counts.merge);
    expect(result.pieces).toHaveLength(result.diagonals.length + 1);
    const total = result.pieces.reduce((sum, piece) => sum + doubledSignedArea(piece.map((i) => vertices[i])), 0n);
    expect(total).toBe(absArea(vertices));
    for (const piece of result.pieces) {
        expect(doubledSignedArea(piece.map((i) => vertices[i]))).toBeGreaterThan(0n);
        expect(isYMonotone(piece, vertices)).toBe(true);
    }
    const doubled = vertices.map((v) => ({x: 2 * v.x, y: 2 * v.y}));
    result.diagonals.forEach(([a, b], k) => {
        expect(a).toBeLessThan(b);
        expect((a + 1) % n === b || (b + 1) % n === a).toBe(false);
        // Midpoint strictly inside, on the polygon scaled by 2 so that the midpoint stays on the grid.
        expect(strictlyInsidePolygon({x: vertices[a].x + vertices[b].x, y: vertices[a].y + vertices[b].y}, doubled)).toBe(true);
        for (let e = 0; e < n; e++) {
            const f = (e + 1) % n;
            const shared = [e, f].includes(a) || [e, f].includes(b);
            const outcome = segmentIntersection(vertices[a], vertices[b], vertices[e], vertices[f]);
            expect(outcome).toBe(shared ? 'touch' : 'none');
        }
        result.diagonals.slice(k + 1).forEach(([c, d]) => {
            const shared = [c, d].includes(a) || [c, d].includes(b);
            expect(c === a && d === b).toBe(false);
            expect(segmentIntersection(vertices[a], vertices[b], vertices[c], vertices[d])).toBe(shared ? 'touch' : 'none');
        });
    });
    const last = result.trace[result.trace.length - 1];
    expect(last.kind).toBe('done');
    expect(result.trace).toHaveLength(expectedTraceLength(vertices, result));
    expect(result.trace.filter((e) => e.kind === 'pop')).toHaveLength(n);
    expect(result.order).toEqual(orderOf(vertices));
}

describe('classifyVertices', () => {
    it('gives the spec types for the first example, with the tie rule at height 8', () => {
        expect(classifyVertices(first)).toEqual(['end', 'split', 'end', 'start', 'merge', 'start']);
    });

    it('gives the spec types for the second example', () => {
        expect(classifyVertices(second)).toEqual(
            ['end', 'regular', 'regular', 'start', 'merge', 'start', 'merge', 'start', 'regular'],
        );
    });

    it('classifies a clockwise polygon as its reversal', () => {
        expect(classifyVertices([...first].reverse())).toEqual([...classifyVertices(first)].reverse());
    });

    it('throws for fewer than three vertices and for a collinear vertex', () => {
        expect(() => classifyVertices(pts([0, 0], [1, 1]))).toThrow(RangeError);
        expect(() => classifyVertices(pts([0, 0], [2, 0], [4, 0], [2, 3]))).toThrow(RangeError);
    });
});

describe('monotonePartitionTrace, first example', () => {
    const result = solve(first);

    it('matches the spec: order, types, one diagonal, two pieces of doubled area 40', () => {
        expect(result.reversed).toBe(false);
        expect(result.order.map((i) => coord(first[i]))).toEqual(['4,8', '12,8', '8,5', '4,3', '0,0', '8,0']);
        expect(result.types).toEqual(['end', 'split', 'end', 'start', 'merge', 'start']);
        expect(result.diagonals).toEqual([[1, 4]]);
        expect(result.pieces).toEqual([[5, 0, 1, 4], [3, 4, 1, 2]]);
        expect(pieceKeys(first, result.pieces)).toEqual(
            ['0,0|4,3|4,8|8,5', '12,8|4,3|8,0|8,5'].sort(),
        );
        expect(result.pieces.map((p) => doubledSignedArea(p.map((i) => first[i])))).toEqual([40n, 40n]);
        expect(doubledSignedArea(first)).toBe(80n);
        checkPartition(first, result);
    });

    it('reads the merge vertex as helper of its left edge before the split vertex is processed', () => {
        const splitPop = result.trace.findIndex((e) => e.kind === 'pop' && e.noteKey === 'monotone.pop.split');
        expect(splitPop).toBeGreaterThan(0);
        const before = partitionStateAt(result, splitPop - 1);
        expect(before.sweep.status).toEqual([5]);
        expect(before.helpers.get(5)).toBe(4);
        expect(before.vertex).toEqual({index: 4, type: 'merge'});
        const at = partitionStateAt(result, splitPop);
        expect(at.vertex).toEqual({index: 1, type: 'split'});
        expect(at.sweep.output).toEqual([]);
        const after = partitionStateAt(result, splitPop + 2); // report, then status-insert
        expect(after.sweep.status).toEqual([5, 1]);
        expect(after.sweep.output).toEqual([[1, 4]]);
        expect([after.helpers.get(5), after.helpers.get(1)]).toEqual([1, 1]);
    });

    it('folds to an empty status and the diagonal list at the end, and clamps the index', () => {
        const end = partitionStateAt(result, result.trace.length - 1);
        expect(end.sweep.done).toBe(true);
        expect(end.sweep.status).toEqual([]);
        expect(end.helpers.size).toBe(0);
        expect(end.sweep.output).toEqual(result.diagonals);
        expect(partitionStateAt(result, 1e6)).toEqual(end);
        const start = partitionStateAt(result, -5);
        expect(start.vertex).toBeNull();
        expect(start.sweep.status).toEqual([]);
        expect(end.sweep.predicateCalls).toBe(result.trace[result.trace.length - 1].predicateCount);
    });

    it('has a running predicate count that never decreases and starts classification at one per vertex', () => {
        const counts = result.trace.map((e) => e.predicateCount);
        counts.forEach((c, k) => k > 0 && expect(c).toBeGreaterThanOrEqual(counts[k - 1]));
        expect(counts[counts.length - 1]).toBeGreaterThanOrEqual(first.length);
        expect(result.trace.map((e) => e.kind)).toEqual([
            'phase', 'pop', 'status-insert', 'pop', 'status-insert', 'pop', 'status-remove', 'pop', 'report',
            'status-insert', 'pop', 'status-remove', 'pop', 'status-remove', 'done',
        ]);
    });

    it('gives the same diagonals in input indices, reversed, for the clockwise input', () => {
        const cw = [...first].reverse();
        const out = solve(cw);
        expect(out.reversed).toBe(true);
        const n = first.length;
        const mapped = result.diagonals.map(([a, b]) => [n - 1 - b, n - 1 - a]);
        expect(out.diagonals).toEqual(mapped);
        expect(out.types).toEqual([...result.types].reverse());
        expect(pieceKeys(cw, out.pieces)).toEqual(pieceKeys(first, result.pieces));
        checkPartition(cw, out);
        // The clockwise copy is processed as its reversal: edge ids are tail vertices of the reversal.
        const state = partitionStateAt(out, out.trace.findIndex((e) => e.noteKey === 'monotone.pop.split') - 1);
        expect(state.sweep.status).toEqual([0]);
        expect(state.helpers.get(0)).toBe(n - 1 - 4);
    });
});

describe('monotonePartitionTrace, second example', () => {
    const result = solve(second);

    it('has no split, and every merge vertex gets a diagonal', () => {
        expect(result.types).toEqual(['end', 'regular', 'regular', 'start', 'merge', 'start', 'merge', 'start', 'regular']);
        expect(doubledSignedArea(second)).toBe(116n);
        const counts = countTypes(result.types);
        expect(counts).toEqual({start: 3, end: 1, split: 0, merge: 2, regular: 3});
        expect(result.order.map((i) => coord(second[i]))).toEqual(
            ['5,12', '0,9', '12,9', '3,7', '7,7', '8,5', '2,4', '10,2', '4,0'],
        );
        // Merge vertex 6 (3,7) is joined to the merge vertex 4 (7,7) processed next, and 4 to the regular vertex 2 (8,5).
        expect(result.diagonals).toEqual([[4, 6], [2, 4]]);
        expect(result.pieces).toEqual([[5, 6, 4], [7, 8, 0, 1, 2, 4, 6], [3, 4, 2]]);
        expect(result.pieces.map((p) => doubledSignedArea(p.map((i) => second[i])))).toEqual([20n, 84n, 12n]);
        for (const v of result.order.filter((i) => result.types[i] === 'merge')) {
            expect(result.diagonals.some((d) => d.includes(v))).toBe(true);
        }
        checkPartition(second, result);
    });

    it('gives the same diagonals for the clockwise input', () => {
        const cw = [...second].reverse();
        const out = solve(cw);
        const n = second.length;
        expect(out.reversed).toBe(true);
        expect(out.diagonals).toEqual(result.diagonals.map(([a, b]) => [n - 1 - b, n - 1 - a]));
        checkPartition(cw, out);
    });
});

describe('equal heights', () => {
    it('processes equal-height vertices by increasing x and lets the rule decide split versus regular', () => {
        const result = solve(plateau);
        expect(result.order.map((i) => coord(plateau[i]))).toEqual(['0,0', '8,0', '3,-3', '5,-3', '0,-6', '8,-6']);
        // (3,-3) sees (5,-3) below it, so it is a reflex vertex with both neighbours below: split. (5,-3) is regular.
        expect(result.types).toEqual(['end', 'split', 'regular', 'end', 'regular', 'start']);
        expect(result.diagonals).toEqual([[1, 4]]); // to (8,0), helper of the left edge after it
        checkPartition(plateau, result);
        expect(solve([...plateau].reverse()).diagonals).toEqual([[1, 4]]);
    });
});

describe('refusals', () => {
    const refusal = (vertices: readonly GridPoint[]) => {
        const out = monotonePartitionTrace(vertices);
        if (out.ok) throw new Error('expected a refusal');
        return out;
    };

    it('refuses fewer than three vertices first', () => {
        expect(refusal(pts([0, 0], [1, 1])).reason).toBe('fewer-than-three');
        expect(refusal([]).reason).toBe('fewer-than-three');
    });

    it('refuses more than the vertex limit before looking at coordinates', () => {
        const many = Array.from({length: SWEEP_MAX_POLYGON_VERTICES + 1}, () => ({x: 0.5, y: 0}));
        expect(refusal(many).reason).toBe('too-many');
        const atLimit = Array.from({length: SWEEP_MAX_POLYGON_VERTICES}, (_, i) => ({x: i, y: i * i}));
        expect(monotonePartitionTrace(atLimit).ok).toBe(true);
    });

    it('refuses coordinates with the vertex index, before simplicity', () => {
        expect(refusal(pts([0, 0], [4, 0], [SWEEP_COORD_LIMIT + 1, 3])))
            .toEqual({ok: false, reason: 'out-of-range', index: 2});
        expect(refusal([{x: 0, y: 0}, {x: 1.5, y: 0}, {x: 0, y: 3}])).toEqual({ok: false, reason: 'not-grid', index: 1});
        expect(monotonePartitionTrace(pts([-SWEEP_COORD_LIMIT, 0], [SWEEP_COORD_LIMIT, 0], [0, 5])).ok).toBe(true);
    });

    it('refuses a non-simple polygon, with the offending edges', () => {
        const bowtie = pts([0, 0], [4, 4], [4, 0], [0, 4]);
        expect(refusal(bowtie)).toEqual({ok: false, reason: 'not-simple', edges: [0, 2]});
        expect(refusal(pts([0, 0], [4, 0], [4, 0], [0, 4])).reason).toBe('not-simple');
    });

    it('refuses three consecutive collinear vertices and names the middle one', () => {
        expect(refusal(pts([0, 0], [2, 0], [4, 0], [4, 4], [0, 4]))).toEqual({ok: false, reason: 'collinear-vertices', index: 1});
        expect(refusal(pts([0, 0], [4, 0], [4, 4], [2, 4], [0, 4]))).toEqual({ok: false, reason: 'collinear-vertices', index: 3});
        expect(refusal([...pts([0, 0], [4, 0], [4, 4], [2, 4], [0, 4])].reverse()).index).toBe(1);
        expect(refusal(pts([0, 0], [4, 0], [4, 4], [4, 2])).reason).toBe('not-simple'); // a vertex on an edge
    });
});

describe('isYMonotone', () => {
    it('accepts a convex polygon and the pieces of the examples, rejects a W shape', () => {
        expect(isYMonotone([0, 1, 2], pts([0, 0], [4, 0], [2, 3]))).toBe(true);
        expect(isYMonotone(first.map((_, i) => i), first)).toBe(false);
        expect(isYMonotone(second.map((_, i) => i), second)).toBe(false);
        expect(isYMonotone([0, 1], first)).toBe(false);
    });

    it('treats equal heights with the tie rule', () => {
        // The plateau cycle has two local maxima, (0,0) and (3,-3), the second only through the tie rule.
        expect(isYMonotone([0, 1, 2, 3, 4, 5], plateau)).toBe(false);
        expect(isYMonotone([0, 1, 5], plateau)).toBe(true);
    });
});

describe('random simple grid polygons', () => {
    function lcg(seed: number) {
        let s = seed;
        return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    }

    /** Star-shaped polygons: random points sorted by angle around an off-lattice centre. */
    function starPolygon(rnd: () => number): GridPoint[] {
        const n = 4 + Math.floor(rnd() * 12);
        const raw = Array.from({length: n}, () => ({x: Math.floor(rnd() * 21) - 10, y: Math.floor(rnd() * 21) - 10}));
        const c = {x: 0.37, y: 0.41};
        return raw.sort((a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
    }

    /** Non-star polygons: a random point cycle untangled by 2-opt reversals, bounded to 60 moves. */
    function untangledPolygon(rnd: () => number): GridPoint[] {
        const n = 5 + Math.floor(rnd() * 11);
        const poly = Array.from({length: n}, () => ({x: Math.floor(rnd() * 21) - 10, y: Math.floor(rnd() * 21) - 10}));
        for (let move = 0; move < 60; move++) {
            const bad = polygonSimplicity(poly, true);
            if (bad.simple) break;
            const [i, j] = bad.edges;
            if (i === j) break;
            const lo = Math.min(i, j) + 1;
            const hi = Math.max(i, j);
            const reversed = poly.slice(lo, hi + 1).reverse();
            poly.splice(lo, hi - lo + 1, ...reversed);
        }
        return poly;
    }

    it('partitions, stays monotone, inside and non-crossing, and exercises split and merge vertices', () => {
        const rnd = lcg(20261102);
        let checked = 0;
        let withBoth = 0;
        let withSplit = 0;
        let withMerge = 0;
        let withTies = 0;
        for (let attempt = 0; checked < 250 && attempt < 6000; attempt++) {
            const drawn = attempt % 2 === 0 ? starPolygon(rnd) : untangledPolygon(rnd);
            if (!polygonSimplicity(drawn, true).simple) continue;
            const poly = doubledSignedArea(drawn) < 0n ? [...drawn].reverse() : drawn; // counter-clockwise base
            const out = monotonePartitionTrace(poly);
            if (!out.ok) {
                expect(out.reason).toBe('collinear-vertices');
                continue;
            }
            checked++;
            checkPartition(poly, out);
            const counts = countTypes(out.types);
            if (counts.split > 0) withSplit++;
            if (counts.merge > 0) withMerge++;
            if (counts.split > 0 && counts.merge > 0) withBoth++;
            if (new Set(poly.map((p) => p.y)).size < poly.length) withTies++;
            const cw = [...poly].reverse();
            const outCw = solve(cw);
            expect(outCw.reversed).toBe(true);
            checkPartition(cw, outCw);
            expect(diagKeys(outCw.diagonals)).toEqual(
                diagKeys(out.diagonals.map(([a, b]) => [poly.length - 1 - b, poly.length - 1 - a] as const)),
            );
        }
        // Observed with this seed: 250 checked, 113 with a split, 106 with a merge, 51 with both, 183 with equal heights.
        expect(checked).toBeGreaterThanOrEqual(200);
        expect(withSplit).toBeGreaterThanOrEqual(60);
        expect(withMerge).toBeGreaterThanOrEqual(60);
        expect(withBoth).toBeGreaterThanOrEqual(25);
        expect(withTies).toBeGreaterThanOrEqual(100);
    });
});
