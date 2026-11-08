/**
 * Interval sweep kernel (spec C1). Closed intervals on the x-axis are swept by a vertical line from left to right:
 * the family's downward order (decreasing y, ties by increasing x) restricted to y = 0, so event positions are the
 * exact `RationalPoint`s (x, 0) and `compareEventPositions` applies unchanged. Ties at one x enter before they
 * leave (closed intervals touch), then by interval index.
 *
 * Trace length for n valid intervals and p overlapping pairs: one `pop` and one `status-insert` or `status-remove`
 * per endpoint (4n), one `report` per pair (p), one `done`: 4n + p + 1. Event ids are 2*i (enter) and 2*i + 1
 * (leave) for interval i; the status holds open interval indices in index order. A pair is reported when the later
 * interval enters while the other is open, as the item [smaller index, larger index]. Pure TypeScript.
 */
import {Rational, RationalPoint} from '../rational';
import {checkSweepCoordinate, SWEEP_MAX_INTERVALS, type SweepInputRefusal} from './limits';
import {compareEventPositions} from './eventOrder';
import {type QueueEntry, sweepEventBuilder, type SweepEvent, sweepStateAt, type SweepTrace} from './sweepTrace';

/** Note keys of the interval sweep trace. */
export type IntervalSweepNote = 'interval.pop' | 'interval.leave' | 'interval.enter' | 'interval.report' | 'interval.done';
export type IntervalSweepTrace = SweepTrace<IntervalPair, IntervalSweepNote>;
const sweepEvent = sweepEventBuilder<IntervalPair, IntervalSweepNote>();

export interface Interval {
    readonly lo: number;
    readonly hi: number;
}

/** A reported overlapping pair of interval indices, smaller first. */
export type IntervalPair = readonly [number, number];

export type IntervalRefusal = SweepInputRefusal | 'too-many' | 'inverted';

export type IntervalSweepResult =
    | { readonly ok: true; readonly trace: IntervalSweepTrace }
    | { readonly ok: false; readonly reason: IntervalRefusal; readonly index?: number };

/** Queue order: position, then entering before leaving, then interval index. */
export const compareIntervalEvents = (a: QueueEntry, b: QueueEntry): number =>
    compareEventPositions(a.position, b.position) || (a.id & 1) - (b.id & 1) || (a.id >> 1) - (b.id >> 1);

/** Checks the input; refuses (never clips) too many intervals, bad endpoints and lo > hi. */
export function checkIntervals(intervals: readonly Interval[]): { readonly ok: true } | Extract<IntervalSweepResult, { ok: false }> {
    if (intervals.length > SWEEP_MAX_INTERVALS) return {ok: false, reason: 'too-many'};
    for (let i = 0; i < intervals.length; i++) {
        for (const value of [intervals[i].lo, intervals[i].hi]) {
            const check = checkSweepCoordinate(value);
            if (!check.ok) return {ok: false, reason: check.reason, index: i};
        }
        if (intervals[i].lo > intervals[i].hi) return {ok: false, reason: 'inverted', index: i};
    }
    return {ok: true};
}

export function intervalSweepTrace(intervals: readonly Interval[]): IntervalSweepResult {
    const check = checkIntervals(intervals);
    if (!check.ok) return check;
    const queue: QueueEntry[] = [];
    intervals.forEach((interval, i) => {
        queue.push({id: 2 * i, position: new RationalPoint(Rational.fromInt(interval.lo), Rational.ZERO)});
        queue.push({id: 2 * i + 1, position: new RationalPoint(Rational.fromInt(interval.hi), Rational.ZERO)});
    });
    queue.sort(compareIntervalEvents);
    const trace: SweepEvent<IntervalPair, IntervalSweepNote>[] = [];
    const open: number[] = [];
    for (const entry of queue) {
        const i = entry.id >> 1;
        trace.push(sweepEvent('pop', entry, 0, 'interval.pop'));
        if (entry.id & 1) {
            open.splice(open.indexOf(i), 1);
            trace.push(sweepEvent('status-remove', {id: i}, 0, 'interval.leave'));
        } else {
            const at = open.findIndex((j) => j > i);
            const index = at < 0 ? open.length : at;
            trace.push(sweepEvent('status-insert', {id: i, index}, 0, 'interval.enter'));
            for (const j of open) {
                const item: IntervalPair = j < i ? [j, i] : [i, j];
                trace.push(sweepEvent('report', {item}, 0, 'interval.report'));
            }
            open.splice(index, 0, i);
        }
    }
    trace.push(sweepEvent('done', {}, 0, 'interval.done'));
    return {ok: true, trace};
}

export interface IntervalReadouts {
    /** Open interval count after each endpoint event, in processing order. */
    readonly openCounts: readonly number[];
    readonly maxOpen: number;
    /** x of the first endpoint after which `maxOpen` is reached, and of the next endpoint (null when none). */
    readonly maxStart: number | null;
    readonly maxEnd: number | null;
    readonly pairs: readonly IntervalPair[];
}

/** Readouts derived from the trace through `sweepStateAt`. */
export function intervalReadouts(trace: IntervalSweepTrace): IntervalReadouts {
    const openCounts: number[] = [];
    const xs: number[] = [];
    trace.forEach((event, index) => {
        if (event.kind !== 'status-insert' && event.kind !== 'status-remove') return;
        const state = sweepStateAt(trace, index, compareIntervalEvents);
        openCounts.push(state.status.length);
        xs.push(state.position === null ? 0 : Number(state.position.x.num / state.position.x.den));
    });
    const maxOpen = Math.max(0, ...openCounts);
    const first = openCounts.indexOf(maxOpen);
    const pairs = sweepStateAt(trace, trace.length - 1, compareIntervalEvents).output;
    return {
        openCounts,
        maxOpen,
        maxStart: maxOpen > 0 ? xs[first] : null,
        maxEnd: maxOpen > 0 && first + 1 < xs.length ? xs[first + 1] : null,
        pairs,
    };
}

/** Test oracle: pairs with max(lo) <= min(hi), and the greatest number of intervals sharing a point. */
export function bruteForceIntervalOverlaps(intervals: readonly Interval[]): { pairs: IntervalPair[]; maxDepth: number } {
    const pairs: IntervalPair[] = [];
    for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
            if (Math.max(intervals[i].lo, intervals[j].lo) <= Math.min(intervals[i].hi, intervals[j].hi)) pairs.push([i, j]);
        }
    }
    const maxDepth = Math.max(0, ...intervals.map((p) => intervals.filter((q) => q.lo <= p.lo && p.lo <= q.hi).length));
    return {pairs, maxDepth};
}
