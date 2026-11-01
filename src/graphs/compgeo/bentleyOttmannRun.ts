import {Rational, RationalPoint} from "../../compgeo/rational";
import {bentleyOttmannTrace, type BentleyOttmannRefusal} from "../../compgeo/sweep/bentleyOttmann";
import {containsPoint, type IntersectionPoint, lowerEndpoint, type Segment, upperEndpoint} from "../../compgeo/sweep/segments";
import {foldSweepEvent, initialSweepState} from "../../compgeo/sweep/sweepTrace";

/**
 * The Bentley-Ottmann trace as one uniform run for the graph and its panel (spec C2). Pure TypeScript: no React, JSXGraph or
 * localization. Segments are indices into the input (0 is the first segment); positions stay exact `RationalPoint`s, so the
 * double value is only taken where something is drawn or shown. Step 0 is the trace right after the initial scheduling of the
 * endpoints (the queue is full, no event is popped), so the leading `schedule` events are not steps of their own.
 */
export type BentleyOttmannNote = "start" | "pop" | "enter" | "leave" | "swap" | "schedule" | "test" | "report" | "done";

/** What happens at an event point: segments start there (upper endpoint), end there (lower endpoint), or only cross there. */
export type EventKind = "upper" | "lower" | "endpoint" | "crossing";

export type NeighbourOutcomeName = "none" | "schedule" | "queued" | "passed";

/** The segments through an event point, by role. All ascending. */
export interface EventSegments {
    readonly starts: readonly number[];
    readonly ends: readonly number[];
    /** Segments that contain the point without having an endpoint there. */
    readonly passes: readonly number[];
}

export interface BentleyOttmannEventInfo {
    readonly note: BentleyOttmannNote;
    /** The sweep position after this event; none before the first pop. */
    readonly position?: RationalPoint;
    /** `enter` and `leave`: the segment. */
    readonly segment?: number;
    /** `swap`: the reversed status block (indices into the status). */
    readonly block?: readonly [number, number];
    /** `test`: the neighbour pair and its outcome. */
    readonly pair?: readonly [number, number];
    readonly outcome?: NeighbourOutcomeName;
    /** `schedule`: the position scheduled. `report`: the point. */
    readonly point?: RationalPoint;
    /** `report`: every segment through the point. */
    readonly through?: readonly number[];
}

/** An event still waiting in the queue, in processing order. */
export interface BentleyOttmannQueued {
    readonly id: number;
    readonly position: RationalPoint;
    readonly kind: EventKind;
}

export interface BentleyOttmannView {
    /** The sweep position (the last popped event); null before the first pop. */
    readonly position: RationalPoint | null;
    /** Role of the current event point, and its segments; undefined before the first pop and at `done`. */
    readonly kind: EventKind | undefined;
    readonly current: EventSegments;
    /** Segments crossing the sweep line, left to right. */
    readonly status: readonly number[];
    /** The events still to be popped, in processing order. */
    readonly queue: readonly BentleyOttmannQueued[];
    /** The pair of the neighbour test that is this very step, if it is one. */
    readonly test: {readonly pair: readonly [number, number]; readonly outcome: NeighbourOutcomeName} | undefined;
    /** Intersection points reported up to and including this step. */
    readonly reports: readonly IntersectionPoint[];
    readonly neighbourTests: number;
    readonly done: boolean;
}

export interface BentleyOttmannRun {
    readonly segments: readonly Segment[];
    readonly refusal: BentleyOttmannRefusal | undefined;
    /** Number of steps; indices run 0 .. length - 1 and the last step is `done`. 0 for a refused input. */
    readonly length: number;
    /** Events popped in all (the spec's 13 for the default example) and the number of pair tests brute force would make. */
    readonly eventCount: number;
    readonly pairTotal: number;
    /** The final intersection points with their segments, in processing order. */
    readonly points: readonly IntersectionPoint[];
    clamp(step: number): number;
    event(index: number): BentleyOttmannEventInfo | undefined;
    view(index: number): BentleyOttmannView;
}

/** Segment names are shown from s1, like the board labels of the segments mode. */
export const segmentName = (k: number): string => `s${k + 1}`;

const NO_SEGMENTS: EventSegments = Object.freeze({starts: [], ends: [], passes: []});

const EMPTY_VIEW: BentleyOttmannView = Object.freeze({
    position: null, kind: undefined, current: NO_SEGMENTS, status: [], queue: [], test: undefined, reports: [], neighbourTests: 0, done: false,
});

function emptyRun(segments: readonly Segment[], refusal: BentleyOttmannRefusal | undefined): BentleyOttmannRun {
    return {
        segments, refusal, length: 0, eventCount: 0, pairTotal: 0, points: [],
        clamp: () => 0, event: () => undefined, view: () => EMPTY_VIEW,
    };
}

/** Exact roles of the segments at `p`. */
export function segmentsAt(segments: readonly Segment[], p: RationalPoint): EventSegments {
    const starts: number[] = [];
    const ends: number[] = [];
    const passes: number[] = [];
    segments.forEach((s, k) => {
        const start = RationalPoint.fromGrid(upperEndpoint(s)).equals(p);
        const end = RationalPoint.fromGrid(lowerEndpoint(s)).equals(p);
        if (start) starts.push(k);
        if (end) ends.push(k);
        if (!start && !end && containsPoint(s, p)) passes.push(k);
    });
    return {starts, ends, passes};
}

export function eventKindOf(roles: EventSegments): EventKind {
    if (roles.starts.length > 0 && roles.ends.length > 0) return "endpoint";
    if (roles.starts.length > 0) return "upper";
    if (roles.ends.length > 0) return "lower";
    return "crossing";
}

function outcomeName(outcome: string): NeighbourOutcomeName {
    return outcome === "schedule" || outcome === "queued" || outcome === "passed" ? outcome : "none";
}

/** Builds the run of `segments`. Never throws on input: a refused input gives an empty run that carries the refusal. */
export function runBentleyOttmann(segments: readonly Segment[]): BentleyOttmannRun {
    const result = bentleyOttmannTrace(segments);
    if (!result.ok) return emptyRun(segments, result.refusal);
    const trace = result.trace;
    let base = 0;
    while (base + 1 < trace.length && trace[base + 1].kind === "schedule") base++;

    const kinds = new Map<number, EventKind>();
    for (const event of trace) {
        if (event.kind === "schedule" && "position" in event.payload) {
            kinds.set(event.payload.id, eventKindOf(segmentsAt(segments, event.payload.position)));
        }
    }
    const events: BentleyOttmannEventInfo[] = [];
    const views: BentleyOttmannView[] = [];
    let state = initialSweepState<IntersectionPoint>();
    let position: RationalPoint | undefined;
    let current: EventSegments = NO_SEGMENTS;
    let kind: EventKind | undefined;
    trace.forEach((event, index) => {
        state = foldSweepEvent(state, event);
        let info: BentleyOttmannEventInfo;
        let test: BentleyOttmannView["test"];
        const payload = event.payload;
        if (event.kind === "pop" && "position" in payload) {
            position = payload.position;
            current = segmentsAt(segments, position);
            kind = eventKindOf(current);
            info = {note: "pop", position};
        } else if (event.kind === "status-insert" && "index" in payload) {
            info = {note: "enter", position, segment: payload.id};
        } else if (event.kind === "status-remove" && "id" in payload) {
            info = {note: "leave", position, segment: payload.id};
        } else if (event.kind === "status-swap" && "first" in payload) {
            info = {note: "swap", position, block: [payload.first, payload.last]};
        } else if (event.kind === "neighbour-test" && "outcome" in payload) {
            const outcome = outcomeName(payload.outcome);
            test = {pair: [payload.a, payload.b], outcome};
            info = {note: "test", position, pair: [payload.a, payload.b], outcome};
        } else if (event.kind === "schedule" && "position" in payload) {
            info = {note: index <= base ? "start" : "schedule", position, point: payload.position};
        } else if (event.kind === "report" && "item" in payload) {
            info = {note: "report", position, point: payload.item.point, through: payload.item.segments};
        } else {
            current = NO_SEGMENTS;
            kind = undefined;
            info = {note: event.kind === "done" ? "done" : "start", position};
        }
        events.push(info);
        views.push({
            position: position ?? null, kind, current, status: state.status,
            queue: state.queue.map(entry => ({id: entry.id, position: entry.position, kind: kinds.get(entry.id) ?? "crossing"})),
            test, reports: state.output, neighbourTests: state.neighbourTests, done: state.done,
        });
    });
    const steps = trace.length - base;
    const clamp = (step: number) => (Number.isFinite(step) ? Math.min(Math.max(Math.trunc(step), 0), steps - 1) : 0);
    const n = segments.length;
    return {
        segments, refusal: undefined, length: steps,
        eventCount: trace.filter(event => event.kind === "pop").length, pairTotal: (n * (n - 1)) / 2, points: views[views.length - 1].reports,
        clamp,
        event: index => events[base + clamp(index)],
        view: index => views[base + clamp(index)] ?? EMPTY_VIEW,
    };
}

// ---- Exact display -------------------------------------------------------------------------------------------------

/** The decimals shown next to a fraction. */
export const RATIONAL_DECIMALS = 4;

export interface RationalText {
    /** The fraction `21/16`, or the integer `3`. */
    readonly fraction: string;
    /** The decimal with at most `RATIONAL_DECIMALS` places (decimal comma for Slovenian); for display only. */
    readonly decimal: string;
    /** Whether the decimal is the value exactly (the denominator divides 10^4). */
    readonly exact: boolean;
    readonly integer: boolean;
}

/** `21/16` with `1,3125`; `1/3` with `0,3333` marked inexact. `formatDecimal` is the language's number formatter. */
export function rationalText(value: Rational, formatDecimal: (value: number, decimals: number) => string): RationalText {
    return {
        fraction: value.format(), decimal: formatDecimal(value.toNumber(), RATIONAL_DECIMALS),
        exact: 10n ** BigInt(RATIONAL_DECIMALS) % value.den === 0n, integer: value.den === 1n,
    };
}
