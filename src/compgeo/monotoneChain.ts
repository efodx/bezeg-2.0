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
    /** The active rule options; present on every event only when they differ from the defaults, else absent. */
    readonly options?: MonotoneChainOptions;
}

/**
 * Rule variants for lesson A5. `pop`: 'non-left' pops while orient <= 0 (collinear points dropped, the default);
 * 'right' pops only while orient < 0 (collinear points stay). `duplicates`: 'merge' keeps one of equal points
 * (the default); 'keep' skips the deduplication after the sort.
 */
export interface MonotoneChainOptions {
    readonly pop: 'non-left' | 'right';
    readonly duplicates: 'merge' | 'keep';
}

export const MONOTONE_CHAIN_DEFAULT_OPTIONS: MonotoneChainOptions =
    Object.freeze({pop: 'non-left', duplicates: 'merge'});

export type MonotoneChainEvent = TraceEvent<MonotoneChainKind, MonotoneChainPayload>;
export type MonotoneChainTrace = Trace<MonotoneChainKind, MonotoneChainPayload>;

/**
 * Andrew's monotone chain as a step trace. Points are sorted by x then y, duplicates kept once (the first input
 * index), then the lower chain and the upper chain are built, popping while orient <= 0 so collinear hull points
 * are dropped. All indices refer to the input array. Throws on non-grid points or more than 40 points.
 *
 * Options (default `{pop: 'non-left', duplicates: 'merge'}`, the behaviour just described). The default trace has no
 * `options` field and is byte-identical to the trace before options existed; any other trace records the options on
 * every event payload. Outputs per combination (hull entries are input indices; sample 1 is the nine points in input
 * order (2,2) (4,0) (0,0) (5,3) (2,5) (-1,3) (3,1) (2,0) (1,1)):
 *  - non-left + merge (default): sample 1 gives (-1,3) (0,0) (4,0) (5,3) (2,5); (2,0) is dropped. Three collinear
 *    points (0,0) (1,0) (2,0) give the segment ends (0,0) (2,0), noteKey 'done-collinear'. A set with a duplicate
 *    gives the hull of the set without it, with the first input index of each point.
 *  - right + merge: orient value 0 does not pop. Sample 1 gives (-1,3) (0,0) (2,0) (4,0) (5,3) (2,5), i.e. the hull
 *    plus the input points on hull edges, (2,0), in boundary order; (2,2) is interior and still leaves the chains.
 *    Three collinear points give (0,0) (1,0) (2,0) (1,0): both chains keep all three, so the middle point is listed
 *    twice and the output is not a polygon boundary (the rule's known failure on collinear input; the noteKey is
 *    'done-hull' because the output has four entries).
 *  - non-left + keep: equal points are not merged, but the twin is tested with value 0 and popped, so the output
 *    has the same points as the default one (the retained copy may be a different input index). (0,0) (0,0) (1,1)
 *    (2,2) gives (0,0) (2,2). Three copies of one point give that point twice.
 *  - right + keep: copies of a point are adjacent in the sort and orient(a, a, p) = 0 never pops, so every copy
 *    stays on both chains, even if the point is not a hull vertex there. A point with m >= 2 copies is listed 2m
 *    times (2m-1 at the first or last point in sort order); the true boundary is still contained in order. The
 *    square (0,0) (0,0) (2,0) (2,2) (0,2) gives indices 0 1 2 3 4 1 ((0,0) three times). (0,0) (2,-1) (2,-1) (4,0)
 *    (2,3) gives 0 1 2 3 4 2 1: (2,-1) is a lower vertex, listed four times.
 *
 * Event sequence, n' = number of distinct points (all points under `keep`):
 *  - n' < 3: `output`, `done` (noteKey 'done-fewer-than-three').
 *  - otherwise per chain (lower, then upper): one `phase`; per point zero or more `test` (a, b, p with sign and exact
 *    orientValue), each `test` that pops (value <= 0 under 'non-left', < 0 under 'right') followed by `reject` (b
 *    popped), then `accept` (p pushed); finally `output` (hull) and `done` ('done-hull', or 'done-collinear' when
 *    the hull has exactly two entries).
 *
 * Length bound: per chain 1 phase + n' accepts + at most n' rejects + at most 2n' tests, so at most 8n' + 4 events
 * in total, i.e. at most 324 for 40 points. Exactly one `done`, always last. `predicateCount` equals the number of
 * `test` events so far.
 */
export function monotoneChainTrace(
    points: readonly GridPoint[],
    options: Partial<MonotoneChainOptions> = {},
): MonotoneChainTrace {
    if (!Array.isArray(points)) throw new TypeError('points must be an array');
    if (points.length > MONOTONE_CHAIN_MAX_POINTS) {
        throw new RangeError(`at most ${MONOTONE_CHAIN_MAX_POINTS} points are supported`);
    }
    points.forEach((p, i) => assertGridPoint(p, `points[${i}]`));
    const rule: MonotoneChainOptions = {...MONOTONE_CHAIN_DEFAULT_OPTIONS, ...options};
    if (rule.pop !== 'non-left' && rule.pop !== 'right') throw new RangeError(`unknown pop rule: ${String(rule.pop)}`);
    if (rule.duplicates !== 'merge' && rule.duplicates !== 'keep') {
        throw new RangeError(`unknown duplicates rule: ${String(rule.duplicates)}`);
    }
    const isDefault = rule.pop === 'non-left' && rule.duplicates === 'merge';
    const popsOn = (value: number) => (rule.pop === 'right' ? value < 0 : value <= 0);

    const order = points.map((_, i) => i).sort((i, j) =>
        points[i].x - points[j].x || points[i].y - points[j].y || i - j);
    const unique = rule.duplicates === 'keep' ? order : order.filter((idx, k) =>
        k === 0 || points[idx].x !== points[order[k - 1]].x || points[idx].y !== points[order[k - 1]].y);

    const events: MonotoneChainEvent[] = [];
    let count = 0;
    const push = (kind: MonotoneChainKind, noteKey: MonotoneChainNote, payload: MonotoneChainPayload) => {
        const recorded = isDefault ? payload : {...payload, options: Object.freeze({...rule})};
        events.push(Object.freeze({kind, noteKey, payload: Object.freeze(recorded), predicateCount: count}));
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
                if (!popsOn(value)) break;
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
