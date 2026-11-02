import {expect, test} from 'vitest';
import {partitionAndTriangulate} from '../../compgeo/sweep/monotoneTriangulation';
import {lcg, starPolygon, untangledPolygon} from '../../compgeo/sweep/testPolygons';
import {runMonotoneTriangulation, type TriangulationRun} from './monotoneTriangulationRun';
import {
    MONOTONE_TRIANGULATION_EXAMPLE_1, MONOTONE_TRIANGULATION_EXAMPLE_2, MONOTONE_TRIANGULATION_EXAMPLE_3,
} from './monotoneTriangulationPresetCollection';

const points = (model: {points: ReadonlyArray<{x: number; y: number}>}) => model.points.map(p => ({x: p.x, y: p.y}));
const example1 = points(MONOTONE_TRIANGULATION_EXAMPLE_1);
const example2 = points(MONOTONE_TRIANGULATION_EXAMPLE_2);
const example3 = points(MONOTONE_TRIANGULATION_EXAMPLE_3);

/** The stack after each triangulation step of C3 example 1 (steps 15 to 43), recorded from the kernel and rechecked by hand (task 15 report). */
const EXAMPLE_1_STACKS: number[][] = [
    [], [5], [5], [5, 4], [5, 4], [5], [5], [], [], [5], [5, 1], [5, 1], [5], [],
    [], [3], [3], [3, 4], [3, 4], [3], [3], [3, 4], [3, 4, 1], [3, 4, 1], [3, 4], [3], [3], [], [],
];

const triSteps = (run: TriangulationRun) => [...Array(run.length).keys()].filter(i => run.pieceAt(i) !== null);

test('C3 example 1: 44 steps, the partition ends at step 14 and the first piece starts at step 15 with no step in between', () => {
    const run = runMonotoneTriangulation(example1);
    expect(run.length).toBe(44);
    expect(run.boundary).toBe(14);
    expect(run.event(14)).toMatchObject({note: 'done'});
    expect(run.pieceAt(14)).toBeNull();
    expect(run.triangulationEvent(15)).toMatchObject({note: 'pop', vertex: 5, chain: 'top'});
    expect(run.pieceAt(15)).toBe(0);
    // The second piece follows the last event of the first without a `phase` or `done` step.
    expect(run.pieceAt(28)).toBe(0);
    expect(run.pieceAt(29)).toBe(1);
    expect(run.triangulationEvent(28)).toMatchObject({note: 'unstack', vertex: 5, stackSize: 0});
    expect(run.triangulationEvent(29)).toMatchObject({note: 'pop', vertex: 3, chain: 'top'});
    expect(run.triangulationEvent(43)).toMatchObject({note: 'done'});
    expect(run.pieceCount).toBe(2);
    expect(run.alreadyMonotone).toBe(false);
});

test('C3 example 1: the stack after every triangulation step equals the kernel stacks recorded in task 15', () => {
    const run = runMonotoneTriangulation(example1);
    expect(triSteps(run)).toEqual([...Array(29).keys()].map(k => k + 15));
    expect(triSteps(run).map(i => run.triangulationView(i)?.stack)).toEqual(EXAMPLE_1_STACKS);
    // After each vertex's last event: [P5], [P5,P4], [P5,P1], [] for the first piece.
    const afterVertex = [16, 18, 25, 28].map(i => run.triangulationView(i)?.stack);
    expect(afterVertex).toEqual([[5], [5, 4], [5, 1], []]);
});

test('C3 example 1: 4 triangles and 3 diagonals, the counts of task 15, a blocked and a visible test', () => {
    const run = runMonotoneTriangulation(example1);
    expect(run.triangles).toHaveLength(4);
    expect(run.allDiagonals).toEqual([[1, 4], [1, 5], [2, 4]]);
    expect(run.counts).toEqual({monotone: 11, earClipping: 21});
    expect(run.triangulationEvent(21)).toMatchObject({note: 'test', test: {a: 1, b: 5, outcome: 'visible'}});
    expect(run.triangulationView(21)?.test).toEqual({a: 1, b: 5, outcome: 'visible'});
    expect(run.triangulationEvent(35)).toMatchObject({note: 'test', test: {a: 1, b: 3, outcome: 'blocked'}});
    expect(run.triangulationView(36)?.test).toBeNull();
    expect(run.triangulationView(21)?.predicateCount).toBe(10);
    expect(run.triangulationView(35)?.predicateCount).toBe(11);
    const last = run.triangulationView(run.length - 1);
    expect(last?.done).toBe(true);
    expect(last?.triangles).toEqual(run.triangles);
});

test('triangles are finished with the report that closes them, or with the removal when there is none', () => {
    const run = runMonotoneTriangulation(example1);
    const counts = triSteps(run).map(i => run.triangulationView(i)?.triangles.length);
    // 0 until the first report (step 23), 1, then the bottom vertex finishes the second (step 28); the second piece 2 -> 3 -> 4 at steps 41 and 42.
    expect(counts.slice(0, 9)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(counts[28 - 15]).toBe(2);
    expect(run.triangulationView(40)?.triangles).toHaveLength(2);
    expect(run.triangulationView(41)?.triangles).toHaveLength(3);
    expect(run.triangulationView(42)?.triangles).toHaveLength(4);
    expect(run.triangulationView(42)?.pieceTriangles).toBe(2);
    expect(run.triangulationView(41)?.earlierDiagonals).toEqual([[1, 4], [1, 5]]);
    expect(run.triangulationView(41)?.diagonals).toEqual([[2, 4]]);
});

test('the monotone example has no partition diagonal, one piece and shows the chain of every vertex', () => {
    const run = runMonotoneTriangulation(example3);
    expect(run.alreadyMonotone).toBe(true);
    expect(run.diagonals).toEqual([]);
    expect(run.pieceCount).toBe(1);
    expect(run.length).toBe(58);
    expect(run.view(run.boundary).diagonals).toEqual([]);
    expect(run.boundary).toBe(17);
    const view = run.triangulationView(run.boundary + 1);
    expect(view?.order).toEqual([4, 5, 3, 6, 7, 2, 1, 0]);
    expect(view?.chains).toEqual(['top', 'left', 'right', 'left', 'left', 'right', 'right', 'bottom']);
    expect(run.triangles).toHaveLength(6);
    expect(run.counts).toEqual({monotone: 13, earClipping: 58});
    // Both chains reach the visibility test: (3,6) then (0,5) on the left, (6,4) then (8,2) on the right.
    const tests = triSteps(run).map(i => run.triangulationEvent(i)).filter(e => e?.note === 'test').map(e => e?.test);
    expect(tests).toEqual([{a: 7, b: 3, outcome: 'visible'}, {a: 1, b: 7, outcome: 'visible'}]);
});

test('no step changes nothing: consecutive steps differ in the event or in what is drawn, across the boundary and between pieces', () => {
    for (const poly of [example1, example2, example3]) {
        const run = runMonotoneTriangulation(poly);
        const signature = (i: number) => {
            const tri = run.triangulationView(i);
            const piece = run.pieceAt(i);
            const partition = run.view(i);
            return JSON.stringify(tri
                ? [piece, tri.vertex, tri.stack, tri.diagonals, tri.triangles.length, tri.test, tri.done]
                : [partition.vertex, partition.status, partition.diagonals, [...partition.helpers], partition.done]);
        };
        for (let i = 1; i < run.length; i++) expect(signature(i), `step ${i}`).not.toBe(signature(i - 1));
    }
});

test('Next step order: the steps run through the partition, then each piece in the kernel order', () => {
    const run = runMonotoneTriangulation(example1);
    const pieces = triSteps(run).map(i => run.pieceAt(i));
    expect(pieces).toEqual([...Array(14).fill(0), ...Array(15).fill(1)]);
    expect(run.clamp(-1)).toBe(0);
    expect(run.clamp(1e9)).toBe(43);
    expect(run.clamp(NaN)).toBe(0);
    // The partition steps are task 16's own (view and event).
    expect(run.event(1)).toMatchObject({note: 'pop', vertex: 5});
    expect(run.view(run.length - 1)).toEqual(run.view(run.boundary));
});

test('a refused polygon gives an empty run that carries the refusal', () => {
    const run = runMonotoneTriangulation([{x: 0, y: 0}, {x: 1, y: 0}]);
    expect(run.refusal?.reason).toBe('fewer-than-three');
    expect(run.length).toBe(0);
    expect(run.triangulationView(0)).toBeUndefined();
    expect(run.pieceAt(0)).toBeNull();
    expect(run.counts).toBeNull();
});

test('random simple polygons: the trace finishes exactly the kernel triangles, the counts equal the traces, the length adds up', () => {
    const rnd = lcg(20261102);
    let checked = 0;
    for (let attempt = 0; attempt < 120 && checked < 80; attempt++) {
        const poly = attempt % 2 === 0 ? starPolygon(rnd) : untangledPolygon(rnd);
        const kernel = partitionAndTriangulate(poly);
        if (!kernel.ok) continue;
        const run = runMonotoneTriangulation(poly);
        checked++;
        const expected = kernel.partition.trace.length
            + kernel.pieces.reduce((sum, {result}, k) => sum + result.trace.length - (k === kernel.pieces.length - 1 ? 1 : 2), 0);
        expect(run.length).toBe(expected);
        expect(run.counts).toEqual(kernel.counts);
        const last = run.triangulationView(run.length - 1);
        expect(last?.triangles).toEqual(kernel.triangles);
        expect(last?.triangles).toHaveLength(poly.length - 2);
        expect(last?.predicateCount).toBe(kernel.counts.monotone);
        // Triangles never decrease and grow by at most one per step; the stack is empty at the end.
        let before = 0;
        for (const i of triSteps(run)) {
            const view = run.triangulationView(i);
            const count = view?.triangles.length ?? 0;
            expect(count - before).toBeGreaterThanOrEqual(0);
            expect(count - before).toBeLessThanOrEqual(1);
            before = count;
        }
        expect(last?.stack).toEqual([]);
    }
    expect(checked).toBeGreaterThanOrEqual(40);
});
