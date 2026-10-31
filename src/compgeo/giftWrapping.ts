import type {GridPoint} from './grid';
import {distinctHullInput, HULL_TRACE_MAX_POINTS, sortedLex} from './hullInput';
import {orientValue} from './predicates';
import {stateAt, type Trace, type TraceEvent} from './trace';

export const GIFT_WRAPPING_MAX_POINTS = HULL_TRACE_MAX_POINTS;

export type GiftWrappingKind = 'test' | 'accept' | 'output' | 'done';
export type GiftWrappingNote =
    | 'test-replace-clockwise' | 'test-replace-farther' | 'test-keep-counterclockwise' | 'test-keep-nearer'
    | 'accept-wrap' | 'output-hull' | 'done-hull' | 'done-collinear' | 'done-fewer-than-three';

export interface GiftWrappingPayload {
    /** `test`: [current, candidate, p]. `accept`: [from, to] of the wrap. Else empty. */
    readonly points: readonly number[];
    /** `test` only: sign and exact value of orient(current, candidate, p). */
    readonly sign?: -1 | 0 | 1;
    readonly value?: number;
    /** `test` only: whether p replaces the candidate. */
    readonly replaced?: boolean;
    /** `output` only: hull indices, CCW from the lexicographically smallest point. */
    readonly hull?: readonly number[];
}

export type GiftWrappingEvent = TraceEvent<GiftWrappingKind, GiftWrappingPayload>;
export type GiftWrappingTrace = Trace<GiftWrappingKind, GiftWrappingPayload>;

const dist2 = (a: GridPoint, b: GridPoint) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/**
 * Gift wrapping (Jarvis march) as a step trace. Starts at the lexicographically smallest point. Each wrap takes the
 * first other point (input order after removing duplicates, first index kept) as candidate and compares every
 * remaining point p against it with the exact orientation of (current, candidate, p): p replaces the candidate when
 * it is clockwise of it, or collinear and farther from the current point (ties take the farthest, so collinear
 * points are skipped). Stops when a wrap returns to the start. Indices refer to the input. Throws on non-grid points
 * or more than 40 points.
 *
 * Event sequence, n' = number of distinct points:
 *  - n' < 3: `output`, `done` ('done-fewer-than-three').
 *  - otherwise per wrap n' - 2 `test` events (exact orientValue) then one `accept` ([from, to]); finally `output`
 *    (hull) and `done` ('done-hull', or 'done-collinear' for a segment).
 *
 * Length bound: at most n' wraps, so at most n'(n'-2) tests + n' accepts + 2 <= n'(n'-1) + 2 = 1562 events for 40
 * points. Exactly one `done`, always last. `predicateCount` equals the number of `test` events so far.
 */
export function giftWrappingTrace(points: readonly GridPoint[]): GiftWrappingTrace {
    const {unique, start} = distinctHullInput(points);
    const events: GiftWrappingEvent[] = [];
    let count = 0;
    const push = (kind: GiftWrappingKind, noteKey: GiftWrappingNote, payload: GiftWrappingPayload) => {
        events.push(Object.freeze({kind, noteKey, payload: Object.freeze(payload), predicateCount: count}));
    };

    if (unique.length < 3) {
        push('output', 'output-hull', {points: [], hull: Object.freeze(sortedLex(points, unique))});
        push('done', 'done-fewer-than-three', {points: []});
        return Object.freeze(events);
    }

    const hull: number[] = [];
    let current = start;
    do {
        if (hull.length >= unique.length) throw new Error('gift wrapping did not close; invalid orientation result');
        hull.push(current);
        const others = unique.filter((i) => i !== current);
        let candidate = others[0];
        for (const q of others.slice(1)) {
            const value = orientValue(points[current], points[candidate], points[q]);
            const sign = value > 0 ? 1 : value < 0 ? -1 : 0;
            const farther = sign === 0 && dist2(points[current], points[q]) > dist2(points[current], points[candidate]);
            const replaced = sign < 0 || farther;
            count++;
            push('test',
                sign < 0 ? 'test-replace-clockwise'
                    : sign > 0 ? 'test-keep-counterclockwise'
                        : farther ? 'test-replace-farther' : 'test-keep-nearer',
                {points: [current, candidate, q], sign, value, replaced});
            if (replaced) candidate = q;
        }
        push('accept', 'accept-wrap', {points: [current, candidate]});
        current = candidate;
    } while (current !== start);

    push('output', 'output-hull', {points: [], hull: Object.freeze([...hull])});
    push('done', hull.length === 2 ? 'done-collinear' : 'done-hull', {points: []});
    return Object.freeze(events);
}

export interface GiftWrappingState {
    /** Hull vertices found so far: the start, then each wrap's target except the closing return to the start. */
    readonly wrapped: readonly number[];
    /** Payload of the most recent `test`, cleared by the next accept or output. */
    readonly lastTest: GiftWrappingPayload | null;
    /** Hull indices once `output` has been reached, else null. */
    readonly hull: readonly number[] | null;
    readonly done: boolean;
}

export const GIFT_WRAPPING_INITIAL_STATE: GiftWrappingState = Object.freeze({
    wrapped: Object.freeze([]), lastTest: null, hull: null, done: false,
});

/** Pure fold step; arrays in the returned state are frozen. */
export function foldGiftWrapping(state: GiftWrappingState, event: GiftWrappingEvent): GiftWrappingState {
    const {kind, payload} = event;
    switch (kind) {
        case 'test':
            return {...state, lastTest: payload};
        case 'accept': {
            const [from, to] = payload.points;
            const base = state.wrapped.length === 0 ? [from] : state.wrapped;
            const wrapped = to === base[0] ? base : [...base, to];
            return {...state, wrapped: Object.freeze([...wrapped]), lastTest: null};
        }
        case 'output':
            return {...state, hull: payload.hull ?? null, lastTest: null};
        case 'done':
            return {...state, done: true};
        default:
            return state;
    }
}

export function giftWrappingStateAt(trace: GiftWrappingTrace, index: number): GiftWrappingState {
    return stateAt(trace, index, foldGiftWrapping, GIFT_WRAPPING_INITIAL_STATE);
}
