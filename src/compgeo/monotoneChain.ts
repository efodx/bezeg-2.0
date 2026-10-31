import {assertGridPoint, type GridPoint} from './grid';
import {orientValue} from './predicates';
import {stateAt, type Trace, type TraceEvent} from './trace';

/** Input limit; keeps traces to a few hundred events. */
export const MONOTONE_CHAIN_MAX_POINTS = 40;

export type MonotoneChainKind = 'phase' | 'test' | 'accept' | 'reject' | 'output' | 'done';
export type MonotoneChainNote =
    | 'phase-lower' | 'phase-upper' | 'test-turn-left' | 'test-turn-right' | 'test-collinear'
    | 'accept-push' | 'reject-pop' | 'output-hull' | 'done-hull' | 'done-collinear' | 'done-fewer-than-three';

export type ChainName = 'lower' | 'upper';

export interface MonotoneChainPayload {
    readonly chain?: ChainName;
    /** `test`: [a, b, p] (last two chain points and the candidate). `accept`/`reject`: the point. Else empty. */
    readonly points: readonly number[];
    /** `test` only: sign and exact value of orient(a, b, p). */
    readonly sign?: -1 | 0 | 1;
    readonly value?: number;
    /** `output` only: hull indices, CCW from the lexicographically smallest point. */
    readonly hull?: readonly number[];
}

export type MonotoneChainEvent = TraceEvent<MonotoneChainKind, MonotoneChainPayload>;
export type MonotoneChainTrace = Trace<MonotoneChainKind, MonotoneChainPayload>;

/**
 * Andrew's monotone chain as a step trace. Points are sorted by x then y, duplicates kept once (the first input
 * index), then the lower chain and the upper chain are built, popping while orient <= 0 so collinear hull points
 * are dropped. All indices refer to the input array. Throws on non-grid points or more than 40 points.
 *
 * Event sequence, n' = number of distinct points:
 *  - n' < 3: `output`, `done` (noteKey 'done-fewer-than-three').
 *  - otherwise per chain (lower, then upper): one `phase`; per point zero or more `test` (a, b, p with sign and exact
 *    orientValue), each `test` with value <= 0 followed by `reject` (b popped), then `accept` (p pushed); finally
 *    `output` (hull) and `done` ('done-hull', or 'done-collinear' when the hull is a segment).
 *
 * Length bound: per chain 1 phase + n' accepts + at most n' rejects + at most 2n' tests, so at most 8n' + 4 events
 * in total, i.e. at most 324 for 40 points. Exactly one `done`, always last. `predicateCount` equals the number of
 * `test` events so far.
 */
export function monotoneChainTrace(points: readonly GridPoint[]): MonotoneChainTrace {
    if (!Array.isArray(points)) throw new TypeError('points must be an array');
    if (points.length > MONOTONE_CHAIN_MAX_POINTS) {
        throw new RangeError(`at most ${MONOTONE_CHAIN_MAX_POINTS} points are supported`);
    }
    points.forEach((p, i) => assertGridPoint(p, `points[${i}]`));

    const order = points.map((_, i) => i).sort((i, j) =>
        points[i].x - points[j].x || points[i].y - points[j].y || i - j);
    const unique = order.filter((idx, k) =>
        k === 0 || points[idx].x !== points[order[k - 1]].x || points[idx].y !== points[order[k - 1]].y);

    const events: MonotoneChainEvent[] = [];
    let count = 0;
    const push = (kind: MonotoneChainKind, noteKey: MonotoneChainNote, payload: MonotoneChainPayload) => {
        events.push(Object.freeze({kind, noteKey, payload: Object.freeze(payload), predicateCount: count}));
    };

    if (unique.length < 3) {
        push('output', 'output-hull', {points: [], hull: Object.freeze([...unique])});
        push('done', 'done-fewer-than-three', {points: []});
        return Object.freeze(events);
    }

    const build = (ordered: readonly number[], chain: ChainName): number[] => {
        push('phase', chain === 'lower' ? 'phase-lower' : 'phase-upper', {chain, points: []});
        const result: number[] = [];
        for (const p of ordered) {
            while (result.length >= 2) {
                const a = result[result.length - 2];
                const b = result[result.length - 1];
                const value = orientValue(points[a], points[b], points[p]);
                const sign = value > 0 ? 1 : value < 0 ? -1 : 0;
                count++;
                push('test', sign > 0 ? 'test-turn-left' : sign < 0 ? 'test-turn-right' : 'test-collinear',
                    {chain, points: [a, b, p], sign, value});
                if (value > 0) break;
                result.pop();
                push('reject', 'reject-pop', {chain, points: [b]});
            }
            result.push(p);
            push('accept', 'accept-push', {chain, points: [p]});
        }
        return result;
    };

    const lower = build(unique, 'lower');
    const upper = build([...unique].reverse(), 'upper');
    const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
    push('output', 'output-hull', {points: [], hull: Object.freeze(hull)});
    push('done', hull.length === 2 ? 'done-collinear' : 'done-hull', {points: []});
    return Object.freeze(events);
}

export interface MonotoneChainState {
    readonly phase: ChainName | null;
    readonly lower: readonly number[];
    readonly upper: readonly number[];
    /** Payload of the most recent `test`, cleared by the next accept, phase or output. */
    readonly lastTest: MonotoneChainPayload | null;
    /** Hull indices once `output` has been reached, else null. */
    readonly hull: readonly number[] | null;
    readonly done: boolean;
}

export const MONOTONE_CHAIN_INITIAL_STATE: MonotoneChainState = Object.freeze({
    phase: null, lower: Object.freeze([]), upper: Object.freeze([]), lastTest: null, hull: null, done: false,
});

/** Pure fold step; arrays in the returned state are frozen. */
export function foldMonotoneChain(state: MonotoneChainState, event: MonotoneChainEvent): MonotoneChainState {
    const {kind, payload} = event;
    const upperChain = payload.chain === 'upper';
    const current = upperChain ? state.upper : state.lower;
    const withChain = (chain: readonly number[]) =>
        upperChain ? {upper: Object.freeze(chain)} : {lower: Object.freeze(chain)};
    switch (kind) {
        case 'phase':
            return {...state, phase: payload.chain ?? null, lastTest: null};
        case 'test':
            return {...state, lastTest: payload};
        case 'accept':
            return {...state, ...withChain([...current, payload.points[0]]), lastTest: null};
        case 'reject':
            return {...state, ...withChain(current.slice(0, -1))};
        case 'output':
            return {...state, hull: payload.hull ?? null, lastTest: null};
        case 'done':
            return {...state, done: true};
        default:
            return state;
    }
}

export function monotoneChainStateAt(trace: MonotoneChainTrace, index: number): MonotoneChainState {
    return stateAt(trace, index, foldMonotoneChain, MONOTONE_CHAIN_INITIAL_STATE);
}
