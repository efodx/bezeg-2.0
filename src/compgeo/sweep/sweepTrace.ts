/**
 * Event-queue and status trace model of the sweep lessons (spec S0). The sweep kinds widen the core
 * `SharedTraceKind`; the derived state is a pure fold (nothing is mutated) and consumers ignore kinds they do not
 * know. Payloads hold object and event ids and exact `RationalPoint`s, never doubles. Pure TypeScript.
 */
import type {RationalPoint} from '../rational';
import {type SharedTraceKind, stateAt, type Trace, type TraceEvent} from '../trace';
import {compareEventPositions} from './eventOrder';

export type SweepKind =
    | SharedTraceKind
    | 'pop'
    | 'status-insert'
    | 'status-remove'
    | 'status-swap'
    | 'neighbour-test'
    | 'schedule'
    | 'cancel'
    | 'report';

/** An event in the queue: its id and exact position. */
export interface QueueEntry {
    readonly id: number;
    readonly position: RationalPoint;
}

/** Payload per kind. `phase`, `accept`, `reject` and `done` only carry display data and leave the state alone. */
export interface SweepPayloads<O> {
    readonly phase: { readonly phase: string };
    readonly test: { readonly a: number; readonly b: number };
    readonly accept: Record<string, never>;
    readonly reject: Record<string, never>;
    /** Appends `item` to the output, like `report`. */
    readonly output: { readonly item: O };
    readonly done: Record<string, never>;
    /** Event taken from the queue; the sweep position becomes `position`. */
    readonly pop: QueueEntry;
    /** Insert object `id` at status index `index` (clamped to the list). */
    readonly 'status-insert': { readonly id: number; readonly index: number };
    readonly 'status-remove': { readonly id: number };
    /** Reverses the contiguous status block `first..last` (inclusive); `last = first + 1` is a swap. */
    readonly 'status-swap': { readonly first: number; readonly last: number };
    /** Two object ids and the discrete outcome (e.g. `cross` or `none`); counts as one neighbour test. */
    readonly 'neighbour-test': { readonly a: number; readonly b: number; readonly outcome: string };
    /** Adds the event to the queue in order (ignored when the id is already queued). */
    readonly schedule: QueueEntry;
    readonly cancel: { readonly id: number };
    /** An output item, e.g. an intersection or a Voronoi vertex. */
    readonly report: { readonly item: O };
}

export type SweepPayload<O> = SweepPayloads<O>[SweepKind];
export type SweepEvent<O> = TraceEvent<SweepKind, SweepPayload<O>>;
export type SweepTrace<O> = Trace<SweepKind, SweepPayload<O>>;

/** Typed event constructor: the payload must match the kind. */
export function sweepEvent<O, K extends SweepKind>(
    kind: K,
    payload: SweepPayloads<O>[K],
    predicateCount: number,
    noteKey: string,
): SweepEvent<O> {
    return {kind, payload, predicateCount, noteKey};
}

export interface SweepState<O> {
    /** Position of the last popped event; null before the first pop. */
    readonly position: RationalPoint | null;
    /** Queued events in processing order. */
    readonly queue: readonly QueueEntry[];
    /** Object ids left to right along the sweep line. */
    readonly status: readonly number[];
    readonly output: readonly O[];
    /** Predicate evaluations up to the last event the fold understood. */
    readonly predicateCalls: number;
    /** Number of `neighbour-test` events (compare with the all-pairs count). */
    readonly neighbourTests: number;
    readonly done: boolean;
}

export function initialSweepState<O>(): SweepState<O> {
    return {position: null, queue: [], status: [], output: [], predicateCalls: 0, neighbourTests: 0, done: false};
}

/** Queue order: processing order of the positions; the default is the exact `compareEventPositions`. */
export type QueueComparator = (a: QueueEntry, b: QueueEntry) => number;

const byPosition: QueueComparator = (a, b) => compareEventPositions(a.position, b.position);

/** Type guard on the event kind; narrows the payload without a cast. */
function isKind<O, K extends SweepKind>(event: SweepEvent<O>, kind: K): event is TraceEvent<K, SweepPayloads<O>[K]> {
    return event.kind === kind;
}

function withoutId(queue: readonly QueueEntry[], id: number): readonly QueueEntry[] {
    return queue.some((entry) => entry.id === id) ? queue.filter((entry) => entry.id !== id) : queue;
}

/** Pure fold step: returns a new state and never mutates `state` or `event`; unknown kinds return `state` itself. */
export function foldSweepEvent<O>(
    state: SweepState<O>,
    event: SweepEvent<O>,
    compare: QueueComparator = byPosition,
): SweepState<O> {
    const counted: SweepState<O> = {...state, predicateCalls: event.predicateCount};
    if (isKind(event, 'pop')) {
        return {...counted, position: event.payload.position, queue: withoutId(state.queue, event.payload.id)};
    }
    if (isKind(event, 'schedule')) {
        const entry = event.payload;
        if (state.queue.some((queued) => queued.id === entry.id)) return counted;
        let at = state.queue.length;
        while (at > 0 && compare(entry, state.queue[at - 1]) < 0) at--; // after equal entries: stable
        return {...counted, queue: [...state.queue.slice(0, at), entry, ...state.queue.slice(at)]};
    }
    if (isKind(event, 'cancel')) return {...counted, queue: withoutId(state.queue, event.payload.id)};
    if (isKind(event, 'status-insert')) {
        const at = Math.min(Math.max(Math.trunc(event.payload.index), 0), state.status.length);
        return {...counted, status: [...state.status.slice(0, at), event.payload.id, ...state.status.slice(at)]};
    }
    if (isKind(event, 'status-remove')) {
        const at = state.status.indexOf(event.payload.id);
        if (at < 0) return counted;
        return {...counted, status: [...state.status.slice(0, at), ...state.status.slice(at + 1)]};
    }
    if (isKind(event, 'status-swap')) {
        const {first, last} = event.payload;
        if (!Number.isInteger(first) || !Number.isInteger(last) || first < 0 || last >= state.status.length || first > last) {
            return counted;
        }
        const block = state.status.slice(first, last + 1).reverse();
        return {...counted, status: [...state.status.slice(0, first), ...block, ...state.status.slice(last + 1)]};
    }
    if (isKind(event, 'neighbour-test')) return {...counted, neighbourTests: state.neighbourTests + 1};
    if (isKind(event, 'report') || isKind(event, 'output')) {
        return {...counted, output: [...state.output, event.payload.item]};
    }
    if (isKind(event, 'done')) return {...counted, done: true};
    if (event.kind === 'phase' || event.kind === 'test' || event.kind === 'accept' || event.kind === 'reject') {
        return counted;
    }
    return state; // a kind this model does not know
}

/** State after event `index` (clamped; an empty trace gives the initial state), via the core `stateAt`. */
export function sweepStateAt<O>(
    trace: SweepTrace<O>,
    index: number,
    compare: QueueComparator = byPosition,
): SweepState<O> {
    return stateAt(trace, index, (state: SweepState<O>, event: SweepEvent<O>) => foldSweepEvent(state, event, compare), initialSweepState<O>());
}
