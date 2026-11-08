import {describe, expect, it} from 'vitest';
import {Rational, RationalPoint} from '../rational';
import {
    foldSweepEvent,
    initialSweepState,
    sweepEventBuilder,
    type SweepEvent,
    type SweepKind,
    type SweepPayloads,
    type SweepState,
    sweepStateAt,
    type SweepTrace,
} from './sweepTrace';

const pt = (xn: number, xd: number, yn: number, yd: number) => new RationalPoint(Rational.of(xn, xd), Rational.of(yn, yd));
const note = 'sweep.test' as const;

type Out = string;
const build = sweepEventBuilder<Out, typeof note>();
const ev = <K extends SweepKind>(kind: K, payload: SweepPayloads<Out>[K], count = 0) => build(kind, payload, count, note);

/** A short piece of C2: schedule the upper endpoints, pop them, insert, test, swap at the crossing, report. */
const trace: SweepTrace<Out, typeof note> = [
    ev('phase', {phase: 'init'}),
    ev('schedule', {id: 1, position: pt(4, 1, 5, 1)}),
    ev('schedule', {id: 0, position: pt(2, 1, 5, 1)}), // same y, smaller x: before id 1
    ev('schedule', {id: 2, position: pt(33, 20, 29, 10)}),
    ev('pop', {id: 0, position: pt(2, 1, 5, 1)}),
    ev('status-insert', {id: 2, index: 0}),
    ev('pop', {id: 1, position: pt(4, 1, 5, 1)}),
    ev('status-insert', {id: 3, index: 1}, 1),
    ev('neighbour-test', {a: 2, b: 3, outcome: 'none'}, 2),
    ev('status-insert', {id: 1, index: 0}, 3),
    ev('neighbour-test', {a: 1, b: 2, outcome: 'cross'}, 4),
    ev('pop', {id: 2, position: pt(33, 20, 29, 10)}, 4),
    ev('status-swap', {first: 0, last: 1}, 4),
    ev('report', {item: '(33/20,29/10)'}, 4),
    ev('cancel', {id: 99}, 4),
    ev('status-remove', {id: 3}, 4),
    ev('done', {}, 4),
];

describe('sweep fold', () => {
    it('keeps the queue in exact event order and ignores a repeated schedule', () => {
        const s = sweepStateAt(trace, 3);
        expect(s.queue.map((q) => q.id)).toEqual([0, 1, 2]);
        const again = foldSweepEvent(s, ev('schedule', {id: 1, position: pt(0, 1, 0, 1)}));
        expect(again.queue.map((q) => q.id)).toEqual([0, 1, 2]);
    });

    it('pops events, moves the sweep position and maintains the status', () => {
        const s = sweepStateAt(trace, 9);
        expect(s.position?.equals(pt(4, 1, 5, 1))).toBe(true);
        expect(s.queue.map((q) => q.id)).toEqual([2]);
        expect(s.status).toEqual([1, 2, 3]);
        expect(s.neighbourTests).toBe(1);
        expect(s.predicateCalls).toBe(3);
    });

    it('swaps the status block, reports output, cancels and finishes', () => {
        const s = sweepStateAt(trace, 13);
        expect(s.status).toEqual([2, 1, 3]);
        expect(s.output).toEqual(['(33/20,29/10)']);
        expect(s.neighbourTests).toBe(2);
        expect(s.done).toBe(false);
        const last = sweepStateAt(trace, trace.length - 1);
        expect(last.status).toEqual([2, 1]);
        expect(last.queue).toEqual([]);
        expect(last.done).toBe(true);
        expect(last.predicateCalls).toBe(4);
    });

    it('reverses a longer block in one step and ignores invalid indices', () => {
        let s: SweepState<Out> = initialSweepState<Out>();
        for (const id of [5, 6, 7, 8]) s = foldSweepEvent(s, ev('status-insert', {id, index: 99}));
        expect(s.status).toEqual([5, 6, 7, 8]);
        expect(foldSweepEvent(s, ev('status-swap', {first: 1, last: 3})).status).toEqual([5, 8, 7, 6]);
        expect(foldSweepEvent(s, ev('status-swap', {first: 2, last: 9})).status).toEqual([5, 6, 7, 8]);
        expect(foldSweepEvent(s, ev('status-swap', {first: 3, last: 1})).status).toEqual([5, 6, 7, 8]);
        expect(foldSweepEvent(s, ev('status-insert', {id: 0, index: -4})).status).toEqual([0, 5, 6, 7, 8]);
        expect(foldSweepEvent(s, ev('status-remove', {id: 42})).status).toEqual([5, 6, 7, 8]);
    });

    it('does not mutate the input state or the event', () => {
        const before = sweepStateAt(trace, 9);
        const snapshot = JSON.stringify(before, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
        const queue = before.queue;
        const status = before.status;
        const output = before.output;
        foldSweepEvent(before, ev('status-swap', {first: 0, last: 2}));
        foldSweepEvent(before, ev('schedule', {id: 77, position: pt(0, 1, 9, 1)}));
        foldSweepEvent(before, ev('pop', {id: 2, position: pt(0, 1, 0, 1)}));
        foldSweepEvent(before, ev('report', {item: 'x'}));
        foldSweepEvent(before, ev('status-remove', {id: 1}));
        expect(JSON.stringify(before, (_, v) => (typeof v === 'bigint' ? v.toString() : v))).toBe(snapshot);
        expect(before.queue).toBe(queue);
        expect(before.status).toBe(status);
        expect(before.output).toBe(output);
        const init = initialSweepState<Out>();
        foldSweepEvent(init, ev('status-insert', {id: 1, index: 0}));
        expect(init).toEqual(initialSweepState<Out>());
    });

    it('ignores unknown kinds', () => {
        const state = sweepStateAt(trace, 9);
        // Run-time data from a newer producer or an import: outside the static contract, hence the explicit double cast.
        const unknown = {kind: 'mystery', payload: {phase: 'x'}, predicateCount: 99, noteKey: note} as unknown as SweepEvent<Out, typeof note>;
        expect(foldSweepEvent(state, unknown)).toBe(state);
        const withUnknown: SweepTrace<Out, typeof note> = [...trace.slice(0, 5), unknown, ...trace.slice(5)];
        expect(sweepStateAt(withUnknown, withUnknown.length - 1)).toEqual(sweepStateAt(trace, trace.length - 1));
    });

    it('clamps a stale step index and handles an empty trace', () => {
        const last = sweepStateAt(trace, trace.length - 1);
        expect(sweepStateAt(trace, 1000)).toEqual(last);
        expect(sweepStateAt(trace, -5)).toEqual(sweepStateAt(trace, 0));
        expect(sweepStateAt(trace, Number.NaN)).toEqual(sweepStateAt(trace, 0));
        expect(sweepStateAt([], 3)).toEqual(initialSweepState<Out>());
    });

    it('accepts a custom queue comparator', () => {
        const byId = (a: { id: number }, b: { id: number }) => b.id - a.id;
        const s = sweepStateAt(trace, 3, byId);
        expect(s.queue.map((q) => q.id)).toEqual([2, 1, 0]);
    });
});
