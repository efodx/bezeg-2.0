import {expect, test} from 'vitest';
import {runMonotonePartition} from './monotonePartitionRun';
import {MONOTONE_PARTITION_EXAMPLE_1, MONOTONE_PARTITION_EXAMPLE_2} from './monotonePartitionPresetCollection';

const points = (model: {points: ReadonlyArray<{x: number; y: number}>}) => model.points.map(p => ({x: p.x, y: p.y}));
const example1 = points(MONOTONE_PARTITION_EXAMPLE_1);
const example2 = points(MONOTONE_PARTITION_EXAMPLE_2);

test('the processed and queued vertices split the processing order at every step', () => {
    const run = runMonotonePartition(example2);
    expect(run.length).toBe(21);
    const order = run.view(run.length - 1).processed;
    expect(order).toEqual([5, 7, 3, 6, 4, 2, 8, 1, 0]);
    for (let step = 0; step < run.length; step++) {
        const view = run.view(step);
        expect([...view.processed, ...view.queue]).toEqual(order);
    }
    expect(run.view(0).processed).toEqual([]);
    expect(run.view(0).vertex).toBeNull();
    expect(run.view(7)).toMatchObject({vertex: 6, type: 'merge', queue: [4, 2, 8, 1, 0]});
});

test('clamp keeps steps inside the trace and ignores non-finite values', () => {
    const run = runMonotonePartition(example1);
    expect([run.clamp(-3), run.clamp(1.9), run.clamp(1e9), run.clamp(NaN), run.clamp(Infinity)]).toEqual([0, 1, run.length - 1, 0, 0]);
});

test('the status entries of the current vertex are its own edges and the edges whose helper it is', () => {
    const run = runMonotonePartition(example2);
    // Regular vertex 2 is popped at step 12 with the helper of edge 7 still the merge vertex 4; the kernel names 2 as the helper at step 13.
    expect(run.view(12).vertex).toBe(2);
    expect([...run.view(12).current]).toEqual([]);
    expect(run.view(12).helpers.get(7)).toBe(4);
    expect([...run.view(13).current]).toEqual([7]);
    expect(run.view(13).helpers.get(7)).toBe(2);
    // Edge 5 leaves the status at step 8, right after its end vertex 6 is popped.
    expect(run.view(8).status).toEqual([7, 3]);
    expect(run.view(8).diagonals).toEqual([]);
    expect(run.view(11).diagonals).toEqual([[4, 6]]);
});

test('the kernel state is shown as it is: the new helper of a regular vertex is already there at its pop (task 14 evidence)', () => {
    const run = runMonotonePartition(example2);
    // Vertex 1 is popped at step 17; edge 8 was inserted at step 16 with itself as helper, and vertex 1 is its helper from the pop on.
    expect(run.event(16)).toMatchObject({note: 'insert', edge: 8});
    expect(run.view(16).helpers.get(8)).toBe(8);
    expect(run.event(17)).toMatchObject({note: 'pop', vertex: 1});
    expect(run.view(17).helpers.get(8)).toBe(1);
    expect([...run.view(17).current]).toEqual([8]);
});

test('events carry the status size after an insert or remove, and the diagonal on a report', () => {
    const run = runMonotonePartition(example2);
    expect(run.event(2)).toEqual({note: 'insert', edge: 5, statusSize: 1});
    expect(run.event(8)).toEqual({note: 'remove', edge: 5, statusSize: 2});
    expect(run.event(11)).toEqual({note: 'diagonal', diagonal: [4, 6]});
    expect(run.event(0)).toEqual({note: 'phase'});
    expect(run.event(run.length - 1)).toEqual({note: 'done'});
});

test('a clockwise input is processed as counter-clockwise and still reports input indices', () => {
    const forward = runMonotonePartition(example1);
    const backward = runMonotonePartition([...example1].reverse());
    expect(forward.reversed).toBe(false);
    expect(backward.reversed).toBe(true);
    expect(backward.typeCounts).toEqual(forward.typeCounts);
    expect(backward.diagonals).toHaveLength(1);
    const n = example1.length;
    expect(backward.edgeEnds(2)).toEqual([2, 1]);
    expect(forward.edgeEnds(2)).toEqual([2, 3]);
    expect(forward.edgeEnds(n - 1)).toEqual([n - 1, 0]);
    expect(backward.edgeEnds(0)).toEqual([0, n - 1]);
});

test('a clockwise input gets the same diagonals under the index map i -> n-1-i', () => {
    for (const example of [example1, example2]) {
        const n = example.length;
        const key = (d: readonly number[]) => [...d].sort((a, b) => a - b).join('-');
        const forward = runMonotonePartition(example).diagonals.map(key).sort();
        const backward = runMonotonePartition([...example].reverse()).diagonals
            .map(d => key(d.map(i => n - 1 - i))).sort();
        expect(forward.length).toBeGreaterThan(0);
        expect(backward).toEqual(forward);
    }
});

test('counts and pieces come from the kernel result', () => {
    const run = runMonotonePartition(example2);
    expect(run.typeCounts).toEqual({start: 3, end: 1, split: 0, merge: 2, regular: 3});
    expect(run.diagonals).toEqual([[4, 6], [2, 4]]);
    expect(run.pieces).toHaveLength(3);
});

test('a refused input gives an empty run that carries the refusal and never throws', () => {
    const run = runMonotonePartition(example1.slice(0, 2));
    expect(run.refusal).toBeDefined();
    expect(run.length).toBe(0);
    expect(run.view(5).vertex).toBeNull();
    expect(run.view(5).status).toEqual([]);
    expect(run.event(0)).toBeUndefined();
    expect(run.clamp(7)).toBe(0);
});
