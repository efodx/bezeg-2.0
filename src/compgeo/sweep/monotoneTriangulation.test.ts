import {describe, expect, it} from 'vitest';
import {earClippingTrace} from '../earClipping';
import type {GridPoint} from '../grid';
import {doubledSignedArea} from '../polygonMeasures';
import {orient, polygonSimplicity} from '../predicates';
import {SWEEP_COORD_LIMIT} from './limits';
import {isYMonotone, monotonePartitionTrace} from './monotonePartition';
import {
    type MonotoneTriangulation,
    monotoneTriangulationTrace,
    partitionAndTriangulate,
    type PartitionAndTriangulation,
    type Triangle,
} from './monotoneTriangulation';
import {sweepStateAt} from './sweepTrace';
import {lcg, starPolygon, untangledPolygon} from './testPolygons';

const pts = (...xy: [number, number][]): GridPoint[] => xy.map(([x, y]) => ({x, y}));

/** C3's polygon (indices 0..5) and its two pieces as stand-alone polygons. */
const first = pts([0, 0], [4, 3], [8, 0], [12, 8], [8, 5], [4, 8]);
const pieceOne = pts([0, 0], [4, 3], [8, 5], [4, 8]);
const pieceTwo = pts([4, 3], [8, 0], [12, 8], [8, 5]);

function triangulate(vertices: readonly GridPoint[], piece?: readonly number[]): MonotoneTriangulation {
    const out = monotoneTriangulationTrace(vertices, piece);
    if (!out.ok) throw new Error(`refused: ${out.reason}`);
    return out;
}

function combined(vertices: readonly GridPoint[]): PartitionAndTriangulation {
    const out = partitionAndTriangulate(vertices);
    if (!out.ok) throw new Error(`refused: ${out.reason}`);
    return out;
}

const area2 = (vertices: readonly GridPoint[], t: Triangle): bigint => doubledSignedArea(t.map((i) => vertices[i]));
const sum = (values: readonly bigint[]): bigint => values.reduce((a, b) => a + b, 0n);

/** Stack (status) after every trace event. */
const stacks = (result: MonotoneTriangulation): (readonly number[])[] =>
    result.trace.map((_, i) => sweepStateAt(result.trace, i).status);

/** The stack after the last event of each vertex step: just before the next `pop` and at `done`. */
function stackPerStep(result: MonotoneTriangulation): (readonly number[])[] {
    const all = stacks(result);
    const steps: (readonly number[])[] = [];
    result.trace.forEach((event, i) => {
        if (i > 1 && (event.kind === 'pop' || event.kind === 'done')) steps.push(all[i - 1]);
    });
    return steps;
}

/** Trace length 6m - 9 + T, with T the number of `neighbour-test` events. */
function expectedTraceLength(m: number, result: MonotoneTriangulation): number {
    return 6 * m - 9 + result.trace.filter((e) => e.kind === 'neighbour-test').length;
}

/** True when w lies in the closed triangle abc (counter-clockwise), exact. */
const inClosedTriangle = (a: GridPoint, b: GridPoint, c: GridPoint, w: GridPoint): boolean =>
    orient(a, b, w) >= 0 && orient(b, c, w) >= 0 && orient(c, a, w) >= 0;

/**
 * Invariants of a triangulation of the polygon `cycle` (input indices, counter-clockwise) by `triangles`
 * (spec C4 acceptance 1, 2): m - 2 positive triangles, area sum, no other vertex inside or on a triangle, every
 * boundary edge used once and every diagonal once in each direction (so the triangles tile the polygon).
 */
function checkTriangulation(
    vertices: readonly GridPoint[],
    cycle: readonly number[],
    triangles: readonly Triangle[],
    diagonals: readonly (readonly [number, number])[],
) {
    const m = cycle.length;
    expect(triangles).toHaveLength(m - 2);
    expect(diagonals).toHaveLength(m - 3);
    const outline = cycle.map((i) => vertices[i]);
    expect(sum(triangles.map((t) => area2(vertices, t)))).toBe(doubledSignedArea(outline));
    const directed = new Map<string, number>();
    for (const t of triangles) {
        expect(area2(vertices, t)).toBeGreaterThan(0n);
        t.forEach((v) => expect(cycle).toContain(v));
        for (const w of cycle) {
            if (t.includes(w)) continue;
            expect(inClosedTriangle(vertices[t[0]], vertices[t[1]], vertices[t[2]], vertices[w])).toBe(false);
        }
        for (let k = 0; k < 3; k++) {
            const key = `${t[k]}>${t[(k + 1) % 3]}`;
            directed.set(key, (directed.get(key) ?? 0) + 1);
        }
    }
    const expected = new Map<string, number>();
    cycle.forEach((v, k) => expected.set(`${v}>${cycle[(k + 1) % m]}`, 1));
    for (const [a, b] of diagonals) {
        expected.set(`${a}>${b}`, 1);
        expected.set(`${b}>${a}`, 1);
    }
    expect(directed).toEqual(expected);
}

/** Invariants of one triangulation trace (stack discipline, counts, length). */
function checkTrace(vertices: readonly GridPoint[], result: MonotoneTriangulation) {
    const m = result.piece.length;
    const trace = result.trace;
    expect(trace[0].kind).toBe('phase');
    expect(trace[trace.length - 1].kind).toBe('done');
    expect(trace).toHaveLength(expectedTraceLength(m, result));
    const pops = trace.filter((e) => e.kind === 'pop');
    expect(pops.map((e) => (e.payload as { id: number }).id)).toEqual(result.order);
    // The queue order of task 14: decreasing y, ties by increasing x.
    for (let k = 1; k < m; k++) {
        const p = vertices[result.order[k - 1]];
        const q = vertices[result.order[k]];
        expect(p.y > q.y || (p.y === q.y && p.x < q.x)).toBe(true);
    }
    expect(trace.filter((e) => e.kind === 'status-insert')).toHaveLength(2 * m - 4);
    expect(trace.filter((e) => e.kind === 'status-remove')).toHaveLength(2 * m - 4);
    expect(trace.filter((e) => e.kind === 'report')).toHaveLength(m - 3);
    // Running predicate count: one `orient` per visibility test, none otherwise.
    let tests = 0;
    for (const event of trace) {
        if (event.kind === 'neighbour-test') tests++;
        expect(event.predicateCount).toBe(tests);
    }
    expect(trace[trace.length - 1].predicateCount).toBe(tests);
    // Stack: after each vertex step the new vertex is on top and the stack is in processing order; empty at `done`.
    const steps = stackPerStep(result);
    expect(steps).toHaveLength(m);
    steps.forEach((stack, k) => {
        if (k === m - 1) {
            expect(stack).toEqual([]);
            return;
        }
        expect(stack[stack.length - 1]).toBe(result.order[k]);
        const ranks = stack.map((v) => result.order.indexOf(v));
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    });
    expect(sweepStateAt(trace, trace.length - 1).output).toEqual(result.diagonals);
    expect(sweepStateAt(trace, trace.length - 1).neighbourTests).toBe(tests);
    expect(result.chains[0]).toBe('top');
    expect(result.chains[m - 1]).toBe('bottom');
}

describe('C3 pieces: hand-checked stacks', () => {
    it('piece 1 (0,0),(4,3),(8,5),(4,8): top (4,8), right chain (8,5),(4,3), empty left chain', () => {
        const result = triangulate(first, [0, 1, 4, 5]);
        expect(result.piece).toEqual([5, 0, 1, 4]);
        expect(result.order).toEqual([5, 4, 1, 0]);
        expect(result.chains).toEqual(['top', 'right', 'right', 'bottom']);
        // After (4,8) and (8,5): [5], [5,4]. (4,3): pop 4; orient((4,3),(8,5),(4,8)) = 20 > 0, so the diagonal
        // (4,3)-(4,8) is inside, pop 5, push 5 and 1: [5,1]. (0,0) is the bottom: pop all, no further diagonal.
        expect(stackPerStep(result)).toEqual([[5], [5, 4], [5, 1], []]);
        expect(result.diagonals).toEqual([[1, 5]]);
        expect(result.triangles).toEqual([[5, 1, 4], [5, 0, 1]]);
        expect(result.trace.map((e) => e.kind)).toEqual([
            'phase', 'pop', 'status-insert', 'pop', 'status-insert', 'pop', 'status-remove', 'neighbour-test',
            'status-remove', 'report', 'status-insert', 'status-insert', 'pop', 'status-remove', 'status-remove', 'done',
        ]);
        const test = result.trace.find((e) => e.kind === 'neighbour-test');
        expect(test?.payload).toEqual({a: 1, b: 5, outcome: 'visible'});
        expect(result.trace).toHaveLength(16);
        expect(result.trace[result.trace.length - 1].predicateCount).toBe(1);
        checkTriangulation(first, [0, 1, 4, 5], result.triangles, result.diagonals);
        checkTrace(first, result);
    });

    it('piece 2 (4,3),(8,0),(12,8),(8,5): top (12,8), left chain (8,5),(4,3), empty right chain', () => {
        const result = triangulate(first, [1, 2, 3, 4]);
        expect(result.piece).toEqual([3, 4, 1, 2]);
        expect(result.order).toEqual([3, 4, 1, 2]);
        expect(result.chains).toEqual(['top', 'left', 'left', 'bottom']);
        // (4,3) on the same chain: pop 4; orient((12,8),(8,5),(4,3)) = -4 < 0, blocked, so push 4 and 1: [3,4,1].
        // (8,0) is the bottom: pop 1 and 4 (the diagonal (8,0)-(8,5) to the middle vertex 4), then 3.
        expect(stackPerStep(result)).toEqual([[3], [3, 4], [3, 4, 1], []]);
        expect(result.diagonals).toEqual([[2, 4]]);
        expect(result.triangles).toEqual([[4, 1, 2], [3, 4, 2]]);
        const test = result.trace.find((e) => e.kind === 'neighbour-test');
        expect(test?.payload).toEqual({a: 1, b: 3, outcome: 'blocked'});
        expect(result.trace).toHaveLength(16);
        checkTriangulation(first, [1, 2, 3, 4], result.triangles, result.diagonals);
        checkTrace(first, result);
    });

    it('gives the same stacks when the piece is a stand-alone, clockwise or rotated polygon', () => {
        expect(stackPerStep(triangulate(pieceOne))).toEqual([[3], [3, 2], [3, 1], []]);
        expect(stackPerStep(triangulate(pieceTwo))).toEqual([[2], [2, 3], [2, 3, 0], []]);
        expect(triangulate(first, [4, 3, 2, 1]).piece).toEqual([3, 4, 1, 2]);
        expect(triangulate(first, [2, 3, 4, 1]).triangles).toEqual(triangulate(first, [1, 2, 3, 4]).triangles);
    });
});

describe('chains alternating: no visibility test', () => {
    // Hand check: (4,10) top, right (6,7), left (1,6), right (5,4), bottom (3,0). Every vertex after the second is on
    // the other chain than the top of the stack, so the whole stack is popped each time and no orient is called.
    const zigzag = pts([4, 10], [1, 6], [3, 0], [5, 4], [6, 7]);

    it('pops the whole stack on a chain change and reports the diagonals', () => {
        const result = triangulate(zigzag);
        expect(result.order).toEqual([0, 4, 1, 3, 2]);
        expect(result.chains).toEqual(['top', 'right', 'left', 'right', 'bottom']);
        // (1,6): pop 4 (diagonal 1-4), pop 0 (the bottom, adjacent), push 4 and 1. (5,4): pop 1 (diagonal 3-1),
        // pop 4 (bottom of the other chain, adjacent), push 1 and 3. (3,0): pop 3 and 1, no middle vertex.
        expect(stackPerStep(result)).toEqual([[0], [0, 4], [4, 1], [1, 3], []]);
        expect(result.diagonals).toEqual([[1, 4], [1, 3]]);
        expect(result.trace.some((e) => e.kind === 'neighbour-test')).toBe(false);
        expect(result.trace).toHaveLength(21);
        expect(result.trace[result.trace.length - 1].predicateCount).toBe(0);
        checkTriangulation(zigzag, [0, 1, 2, 3, 4], result.triangles, result.diagonals);
        checkTrace(zigzag, result);
    });
});

describe('partitionAndTriangulate, C3 polygon', () => {
    const result = combined(first);

    it('gives 4 triangles and 3 diagonals, doubled areas summing to 80', () => {
        expect(result.triangles).toHaveLength(4);
        expect(result.diagonals).toHaveLength(3);
        expect([...result.diagonals].map((d) => d.join('-')).sort()).toEqual(['1-4', '1-5', '2-4']);
        expect(sum(result.triangles.map((t) => area2(first, t)))).toBe(80n);
        expect(result.partition.diagonals).toEqual([[1, 4]]);
        expect(result.pieces.map((p) => p.piece)).toEqual(result.partition.pieces);
        expect(result.pieces.map((p) => p.result.triangles.length)).toEqual([2, 2]);
        checkTriangulation(first, [0, 1, 2, 3, 4, 5], result.triangles, result.diagonals);
    });

    it('records the traces in one sequence with offsets', () => {
        const partitionLength = result.partition.trace.length;
        const lengths = result.pieces.map((p) => p.result.trace.length);
        expect(result.offsets.partition).toBe(0);
        expect(result.offsets.pieces).toEqual([partitionLength, partitionLength + lengths[0]]);
        expect(result.trace).toHaveLength(partitionLength + lengths[0] + lengths[1]);
        const end = result.trace[result.trace.length - 1];
        expect(end.kind).toBe('done');
        expect(end.predicateCount).toBe(result.counts.monotone);
        expect(sweepStateAt(result.trace, result.trace.length - 1).output).toEqual(result.diagonals);
        result.pieces.forEach(({result: piece}, k) => {
            const at = result.offsets.pieces[k];
            expect(result.trace.slice(at, at + piece.trace.length).map((e) => [e.kind, e.noteKey])).toEqual(
                piece.trace.map((e) => [e.kind, e.noteKey]),
            );
        });
    });

    it('reads the counts back from the traces and compares with ear clipping', () => {
        const partitionCount = result.partition.trace[result.partition.trace.length - 1].predicateCount;
        const pieceCounts = result.pieces.map((p) => p.result.trace.filter((e) => e.kind === 'neighbour-test').length);
        expect(pieceCounts).toEqual([1, 1]);
        expect(result.counts.monotone).toBe(partitionCount + 2);
        const ear = earClippingTrace(first);
        if (!ear.ok) throw new Error('ear clipping refused');
        expect(result.counts.earClipping).toBe(ear.trace[ear.trace.length - 1].predicateCount);
        expect(ear.triangles).toHaveLength(result.triangles.length);
        // Observed on this polygon: monotone total 9 (partition) + 1 + 1 = 11 against 21 for ear clipping.
        expect(result.counts).toEqual({monotone: 11, earClipping: 21});
    });
});

describe('monotone input, refusals and non-monotone input', () => {
    it('a monotone polygon needs no partition diagonal and one piece', () => {
        const result = combined(pieceOne);
        expect(result.partition.diagonals).toEqual([]);
        expect(result.partition.pieces).toHaveLength(1);
        expect(result.pieces).toHaveLength(1);
        expect(result.triangles).toHaveLength(2);
        expect(result.diagonals).toHaveLength(1);
        expect(isYMonotone(result.partition.pieces[0], pieceOne)).toBe(true);
    });

    it('refuses a non-monotone polygon with not-monotone, while partitionAndTriangulate succeeds', () => {
        expect(monotoneTriangulationTrace(first)).toEqual({ok: false, reason: 'not-monotone'});
        const second = pts([4, 0], [10, 2], [8, 5], [12, 9], [7, 7], [5, 12], [3, 7], [0, 9], [2, 4]);
        expect(monotoneTriangulationTrace(second)).toEqual({ok: false, reason: 'not-monotone'});
        const whole = combined(second);
        expect(whole.triangles).toHaveLength(7);
        expect(whole.diagonals).toHaveLength(6);
        expect(sum(whole.triangles.map((t) => area2(second, t)))).toBe(116n);
        checkTriangulation(second, second.map((_, i) => i), whole.triangles, whole.diagonals);
        // A piece that is not monotone is refused too.
        expect(monotoneTriangulationTrace(first, [0, 1, 2, 3, 4, 5])).toEqual({ok: false, reason: 'not-monotone'});
    });

    it('passes on the refusals of task 14 for the polygon itself', () => {
        const bowtie = pts([0, 0], [4, 4], [4, 0], [0, 4]);
        const collinear = pts([0, 0], [2, 0], [4, 0], [2, 3]);
        const far = pts([0, 0], [SWEEP_COORD_LIMIT + 1, 0], [0, 5]);
        for (const bad of [pts([0, 0], [1, 1]), bowtie, collinear, far]) {
            const expected = monotonePartitionTrace(bad);
            expect(expected.ok).toBe(false);
            expect(monotoneTriangulationTrace(bad)).toEqual(expected);
            expect(partitionAndTriangulate(bad)).toEqual(expected);
        }
        expect(monotoneTriangulationTrace(bowtie)).toMatchObject({reason: 'not-simple'});
        expect(monotoneTriangulationTrace(collinear)).toMatchObject({reason: 'collinear-vertices', index: 1});
        expect(monotoneTriangulationTrace(far)).toMatchObject({reason: 'out-of-range', index: 1});
    });

    it('throws for a piece that is not distinct input indices', () => {
        expect(() => monotoneTriangulationTrace(first, [0, 1, 1, 4])).toThrow(RangeError);
        expect(() => monotoneTriangulationTrace(first, [0, 1, 4, 9])).toThrow(RangeError);
        expect(monotoneTriangulationTrace(first, [0, 1])).toEqual({ok: false, reason: 'not-monotone'});
    });
});

describe('random simple grid polygons', () => {
    it('triangulates every piece and the whole polygon validly, with traces and counts consistent', () => {
        const rnd = lcg(20261102);
        let checked = 0;
        let partitioned = 0;
        let directlyMonotone = 0;
        let blocked = 0;
        let visible = 0;
        let cheaper = 0;
        for (let attempt = 0; checked < 250 && attempt < 6000; attempt++) {
            const drawn = attempt % 2 === 0 ? starPolygon(rnd) : untangledPolygon(rnd);
            if (!polygonSimplicity(drawn, true).simple) continue;
            const poly = doubledSignedArea(drawn) < 0n ? [...drawn].reverse() : drawn;
            if (!monotonePartitionTrace(poly).ok) continue;
            checked++;
            const n = poly.length;
            const whole = combined(poly);
            if (whole.partition.diagonals.length > 0) partitioned++;
            expect(whole.partition.diagonals.length > 0).toBe(!isYMonotone(poly.map((_, i) => i), poly));
            for (const {piece, result} of whole.pieces) {
                checkTriangulation(poly, piece, result.triangles, result.diagonals);
                checkTrace(poly, result);
                expect(result.piece).toEqual(piece);
                for (const e of result.trace) {
                    if (e.kind !== 'neighbour-test') continue;
                    if ((e.payload as { outcome: string }).outcome === 'visible') visible++;
                    else blocked++;
                }
            }
            checkTriangulation(poly, poly.map((_, i) => i), whole.triangles, whole.diagonals);
            // Same count as ear clipping; validity, not identical triangles (spec C4 acceptance 2).
            const ear = earClippingTrace(poly);
            if (!ear.ok) throw new Error(`ear clipping refused: ${ear.reason}`);
            expect(whole.triangles).toHaveLength(ear.triangles.length);
            expect(whole.triangles).toHaveLength(n - 2);
            // Counts: sums read back from the traces (acceptance 4).
            const partitionCount = whole.partition.trace[whole.partition.trace.length - 1].predicateCount;
            const pieceCounts = whole.pieces.map(
                (p) => p.result.trace.filter((e) => e.kind === 'neighbour-test').length,
            );
            expect(whole.counts.monotone).toBe(partitionCount + pieceCounts.reduce((a, b) => a + b, 0));
            expect(whole.counts.earClipping).toBe(ear.trace[ear.trace.length - 1].predicateCount);
            expect(whole.trace[whole.trace.length - 1].predicateCount).toBe(whole.counts.monotone);
            if (whole.counts.monotone < whole.counts.earClipping) cheaper++;
            // A directly monotone polygon is triangulated without the partition, to the same result.
            if (whole.partition.diagonals.length === 0) {
                directlyMonotone++;
                const direct = triangulate(poly);
                expect(direct.triangles).toEqual(whole.triangles);
                expect(direct.trace).toEqual(whole.pieces[0].result.trace);
            }
            // A clockwise input gives a valid triangulation of the same size, with the same counts.
            const cw = [...poly].reverse();
            const outCw = combined(cw);
            checkTriangulation(cw, cw.map((_, i) => n - 1 - i), outCw.triangles, outCw.diagonals);
            expect(outCw.counts.monotone).toBe(whole.counts.monotone);
        }
        // Observed with this seed: 250 checked, 168 partitioned, 82 directly monotone, 132 blocked and 567 visible tests, 237 cheaper than ear clipping.
        expect(checked).toBeGreaterThanOrEqual(200);
        expect(partitioned).toBeGreaterThanOrEqual(60);
        expect(directlyMonotone).toBeGreaterThanOrEqual(10);
        expect(blocked).toBeGreaterThanOrEqual(100);
        expect(visible).toBeGreaterThanOrEqual(100);
        expect(cheaper).toBeGreaterThanOrEqual(1);
    });
});
