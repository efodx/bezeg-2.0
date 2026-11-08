import {
    checkIntervals, compareIntervalEvents, type Interval, type IntervalPair, intervalReadouts, type IntervalRefusal, intervalSweepTrace,
} from "../../compgeo/sweep/intervalSweep";
import {sweepStateAt} from "../../compgeo/sweep/sweepTrace";
import {clampTraceIndex} from "../../compgeo/trace";

/**
 * The interval sweep trace as one uniform run for the graph and its panel (spec C1). Pure TypeScript: no React, JSXGraph or
 * localization. Interval numbers are indices into the input intervals (0 is `a`); x values are the grid integers of the model.
 */
export type IntervalNote = "pop" | "enter" | "leave" | "report" | "done";

export interface IntervalEventInfo {
    readonly note: IntervalNote;
    /** `pop` only: the event enters (true) or leaves (false) its interval. */
    readonly entering?: boolean;
    /** The interval of the event just popped; none at `done`. */
    readonly interval?: number;
    /** The x of the sweep line after this event; none at `done` of an empty trace. */
    readonly x?: number;
    /** `report` only: the pair and whether its intervals only touch (one endpoint shared, e.g. a zero-length interval on an end). */
    readonly pair?: IntervalPair;
    readonly touching?: boolean;
}

/** An event still waiting in the queue: the entering (lo) or leaving (hi) of an interval at x. */
export interface QueuedEvent {
    readonly interval: number;
    readonly entering: boolean;
    readonly x: number;
}

/**
 * Two intervals touch when they share exactly one point, that point is an endpoint of each, and they are not identical
 * (a zero-length interval strictly inside another, or two identical zero-length intervals, overlap rather than touch).
 */
export function intervalsTouch(p: Interval, q: Interval): boolean {
    const x = Math.max(p.lo, q.lo);
    if (x !== Math.min(p.hi, q.hi)) return false;
    const endpoint = (i: Interval) => x === i.lo || x === i.hi;
    return endpoint(p) && endpoint(q) && !(p.lo === q.lo && p.hi === q.hi);
}

export interface IntervalView {
    /** Position of the sweep line; null before the first event of an empty trace. */
    readonly x: number | null;
    /** The interval of the current event, if any. */
    readonly current: number | undefined;
    /** Open intervals (the status), in letter order (the kernel's status order). */
    readonly open: readonly number[];
    /** The events still to be popped after this step, in trace order (the kernel's sorted queue). */
    readonly queue: readonly QueuedEvent[];
    /** The pair reported by this very event, if it is a `report`. */
    readonly pair: IntervalPair | undefined;
    /** Pairs reported up to and including this event. */
    readonly pairs: readonly IntervalPair[];
    /** Open counts after each endpoint event processed so far. */
    readonly counts: readonly number[];
    readonly maxSoFar: number;
    readonly done: boolean;
}

export interface IntervalRun {
    readonly intervals: readonly Interval[];
    /** Why the input was refused (the run is then empty); undefined when the trace was built. */
    readonly refusal: {readonly reason: IntervalRefusal; readonly index?: number} | undefined;
    /** Number of events; step indices run 0 .. length - 1 and the last event is `done`. 0 for a refused input. */
    readonly length: number;
    /** Final maximum of open intervals, and the range (x of the endpoint reaching it and of the next endpoint) of its first occurrence. */
    readonly maxOpen: number;
    readonly maxStart: number | null;
    readonly maxEnd: number | null;
    readonly pairTotal: number;
    clamp(step: number): number;
    event(index: number): IntervalEventInfo | undefined;
    view(index: number): IntervalView;
}

const EMPTY_VIEW: IntervalView = Object.freeze({
    x: null, current: undefined, open: [], queue: [], pair: undefined, pairs: [], counts: [], maxSoFar: 0, done: false,
});

function emptyRun(intervals: readonly Interval[], refusal: IntervalRun["refusal"]): IntervalRun {
    return {
        intervals, refusal, length: 0, maxOpen: 0, maxStart: null, maxEnd: null, pairTotal: 0,
        clamp: () => 0, event: () => undefined, view: () => EMPTY_VIEW,
    };
}

/** Builds the run of `intervals`. Never throws: a refused input (`checkIntervals`) gives an empty run that carries the reason. */
export function runIntervalSweep(intervals: readonly Interval[]): IntervalRun {
    const check = checkIntervals(intervals);
    if (!check.ok) return emptyRun(intervals, {reason: check.reason, index: check.index});
    const result = intervalSweepTrace(intervals);
    if (!result.ok) return emptyRun(intervals, {reason: result.reason, index: result.index});
    const trace = result.trace;
    const readouts = intervalReadouts(trace);

    const popped: QueuedEvent[] = [];
    const poppedAt: number[] = [];
    trace.forEach((event, index) => {
        if (event.kind !== "pop") return;
        const interval = event.payload.id >> 1;
        const entering = (event.payload.id & 1) === 0;
        popped.push({interval, entering, x: entering ? intervals[interval].lo : intervals[interval].hi});
        poppedAt.push(index);
    });
    const events: IntervalEventInfo[] = [];
    const views: IntervalView[] = [];
    const counts: number[] = [];
    let current: number | undefined;
    let x: number | null = null;
    trace.forEach((event, index) => {
        const state = sweepStateAt(trace, index, compareIntervalEvents);
        let info: IntervalEventInfo;
        let pair: IntervalPair | undefined;
        if (event.kind === "pop") {
            const entering = (event.payload.id & 1) === 0;
            current = event.payload.id >> 1;
            x = entering ? intervals[current].lo : intervals[current].hi;
            info = {note: "pop", entering, interval: current, x};
        } else if (event.kind === "status-insert" || event.kind === "status-remove") {
            counts.push(state.status.length);
            info = {note: event.kind === "status-insert" ? "enter" : "leave", interval: current, x: x ?? undefined};
        } else if (event.kind === "report") {
            pair = event.payload.item;
            const [p, q] = [intervals[pair[0]], intervals[pair[1]]];
            info = {note: "report", interval: current, x: x ?? undefined, pair, touching: intervalsTouch(p, q)};
        } else {
            current = undefined;
            info = {note: "done", x: x ?? undefined};
        }
        events.push(info);
        views.push({
            x, current, open: state.status, queue: popped.slice(poppedAt.filter(at => at <= index).length), pair, pairs: state.output, counts: [...counts],
            maxSoFar: Math.max(0, ...counts), done: state.done,
        });
    });
    return {
        intervals, refusal: undefined, length: trace.length,
        maxOpen: readouts.maxOpen, maxStart: readouts.maxStart, maxEnd: readouts.maxEnd, pairTotal: readouts.pairs.length,
        clamp: step => clampTraceIndex(trace, step),
        event: index => events[clampTraceIndex(trace, index)],
        view: index => views[clampTraceIndex(trace, index)] ?? EMPTY_VIEW,
    };
}
