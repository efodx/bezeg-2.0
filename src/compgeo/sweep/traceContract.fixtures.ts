/**
 * Compile-time fixtures of the correlated trace contract (task 2). They have no run-time behaviour: `just typecheck`
 * compiles them, and every `@ts-expect-error` fails the check with TS2578 if the restriction it pins is removed.
 */
import {RationalPoint} from '../rational';
import type {MonotonePartitionEvent} from './monotonePartition';
import type {MonotoneTriangulationNote} from './monotoneTriangulation';
import {sweepEventBuilder, type SweepEvent} from './sweepTrace';

// Valid: each kind carries its own payload and a note of the producing algorithm.
export const validPop: MonotonePartitionEvent = {
    kind: 'pop', payload: {id: 0, position: RationalPoint.fromGrid({x: 0, y: 0})}, predicateCount: 1, noteKey: 'monotone.pop.start',
};
export const validReport: MonotonePartitionEvent = {
    kind: 'report', payload: {item: [0, 2]}, predicateCount: 1, noteKey: 'monotone.diagonal',
};
export const validDone: SweepEvent<number, 'x.done'> = {kind: 'done', payload: {}, predicateCount: 0, noteKey: 'x.done'};

// Rejected: a known kind with the payload of another kind.
export const mismatchedPayload: MonotonePartitionEvent = {
    kind: 'pop',
    // @ts-expect-error the `pop` payload is a queue entry, not `{item}`
    payload: {item: [0, 2]},
    predicateCount: 0,
    noteKey: 'monotone.pop.start',
};

// Rejected: a note that the algorithm does not produce (a typo, and another algorithm's note).
export const typoNote: MonotonePartitionEvent = {
    kind: 'phase', payload: {phase: 'start'}, predicateCount: 0,
    // @ts-expect-error not a monotone partition note
    noteKey: 'monotone.fase',
};
export const foreignNote: MonotonePartitionEvent = {
    kind: 'phase', payload: {phase: 'start'}, predicateCount: 0,
    // @ts-expect-error a monotone triangulation note on a monotone partition event
    noteKey: 'monotoneTri.phase' satisfies MonotoneTriangulationNote,
};

// Rejected through the constructor: payload must match the kind, the note must belong to the builder's union.
const build = sweepEventBuilder<number, 'x.note'>();
export const builtOk = build('report', {item: 3}, 0, 'x.note');
// @ts-expect-error `pop` needs a queue entry
export const builtMismatch = build('pop', {item: 3}, 0, 'x.note');
// @ts-expect-error the note is not in the builder's union
export const builtBadNote = build('done', {}, 0, 'x.other');
