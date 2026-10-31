import type {GridPoint} from './grid';
import {distinctHullInput, HULL_TRACE_MAX_POINTS, sortedLex} from './hullInput';
import {onSegment, orientValue} from './predicates';
import {stateAt, type Trace, type TraceEvent} from './trace';

export const SLOW_HULL_MAX_POINTS = HULL_TRACE_MAX_POINTS;

export type SlowHullKind = 'accept' | 'reject' | 'output' | 'done';
export type SlowHullNote =
    | 'accept-edge' | 'reject-edge' | 'output-hull' | 'done-hull' | 'done-collinear' | 'done-fewer-than-three';

export interface SlowHullPayload {
    /** `accept`/`reject`: [i, j], the directed pair examined. Else empty. */
    readonly points: readonly number[];
    /** `reject` only: the first other point strictly right of i->j, or collinear and outside the segment. */
    readonly witness?: number;
    /** `accept`/`reject` only: orientation tests performed for this pair (n' - 2, no early exit). */
    readonly tests?: number;
    /** `output` only: hull indices, CCW from the lexicographically smallest point. */
    readonly hull?: readonly number[];
}

export type SlowHullEvent = TraceEvent<SlowHullKind, SlowHullPayload>;
export type SlowHullTrace = Trace<SlowHullKind, SlowHullPayload>;

/**
 * The O(n^3) edge test as a step trace. For every ordered pair (i, j) of distinct points every other point k is
 * tested with the exact orientation; (i, j) is a hull edge when every k is strictly left of i->j or lies on the
 * segment ij. There is no early exit. Duplicates are kept once (first input index); indices refer to the input.
 * Throws on non-grid points or more than 40 points.
 *
 * Event sequence, n' = number of distinct points:
 *  - n' < 3: `output`, `done` ('done-fewer-than-three').
 *  - otherwise one `accept` or `reject` per ordered pair (n'(n'-1) events, payload [i, j], `tests` = n' - 2 and, for
 *    `reject`, the first witness), then `output` (hull) and `done` ('done-hull', or 'done-collinear' for a segment).
 *
 * Length bound: n'(n'-1) + 2 events, i.e. at most 1562 for 40 points. `predicateCount` advances by n' - 2 per pair
 * and ends at n'(n'-1)(n'-2) (59280 for 40 points). Exactly one `done`, always last.
 */
export function slowHullTrace(points: readonly GridPoint[]): SlowHullTrace {
    const {unique, start} = distinctHullInput(points);
    const events: SlowHullEvent[] = [];
    let count = 0;
    const push = (kind: SlowHullKind, noteKey: SlowHullNote, payload: SlowHullPayload) => {
        events.push(Object.freeze({kind, noteKey, payload: Object.freeze(payload), predicateCount: count}));
    };

    if (unique.length < 3) {
        push('output', 'output-hull', {points: [], hull: Object.freeze(sortedLex(points, unique))});
        push('done', 'done-fewer-than-three', {points: []});
        return Object.freeze(events);
    }

    const next = new Map<number, number>();
    for (const i of unique) {
        for (const j of unique) {
            if (i === j) continue;
            let witness: number | undefined;
            for (const k of unique) {
                if (k === i || k === j) continue;
                const value = orientValue(points[i], points[j], points[k]);
                if (witness === undefined
                    && (value < 0 || (value === 0 && !onSegment(points[k], points[i], points[j])))) {
                    witness = k;
                }
            }
            const tests = unique.length - 2;
            count += tests;
            if (witness === undefined) {
                next.set(i, j);
                push('accept', 'accept-edge', {points: [i, j], tests});
            } else {
                push('reject', 'reject-edge', {points: [i, j], witness, tests});
            }
        }
    }
    const hull = cycleFrom(start, next);
    push('output', 'output-hull', {points: [], hull: Object.freeze(hull)});
    push('done', hull.length === 2 ? 'done-collinear' : 'done-hull', {points: []});
    return Object.freeze(events);
}

/** Follows accepted directed edges from `start` until the cycle closes. */
function cycleFrom(start: number, next: ReadonlyMap<number, number>): number[] {
    const cycle = [start];
    let cur = next.get(start);
    while (cur !== undefined && cur !== start && cycle.length <= next.size) {
        cycle.push(cur);
        cur = next.get(cur);
    }
    return cycle;
}

export interface SlowHullState {
    /** Accepted directed edges so far, as [i, j]. */
    readonly edges: readonly (readonly [number, number])[];
    /** Pair examined by the most recent accept/reject, cleared by output. */
    readonly current: readonly number[] | null;
    /** Witness of the most recent reject, else null. */
    readonly witness: number | null;
    /** Hull vertex cycle once `output` has been reached, else null. */
    readonly hull: readonly number[] | null;
    readonly done: boolean;
}

export const SLOW_HULL_INITIAL_STATE: SlowHullState = Object.freeze({
    edges: Object.freeze([]), current: null, witness: null, hull: null, done: false,
});

/** Pure fold step; arrays in the returned state are frozen. */
export function foldSlowHull(state: SlowHullState, event: SlowHullEvent): SlowHullState {
    const {kind, payload} = event;
    switch (kind) {
        case 'accept':
            return {
                ...state, current: payload.points, witness: null,
                edges: Object.freeze([...state.edges, Object.freeze([payload.points[0], payload.points[1]] as const)]),
            };
        case 'reject':
            return {...state, current: payload.points, witness: payload.witness ?? null};
        case 'output':
            return {...state, current: null, witness: null, hull: payload.hull ?? null};
        case 'done':
            return {...state, done: true};
        default:
            return state;
    }
}

export function slowHullStateAt(trace: SlowHullTrace, index: number): SlowHullState {
    return stateAt(trace, index, foldSlowHull, SLOW_HULL_INITIAL_STATE);
}
