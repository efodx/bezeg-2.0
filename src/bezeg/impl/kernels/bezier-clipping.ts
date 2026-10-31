import {subdivide} from "./bezier-kernels";
import type {Trace, TraceEvent} from "../../../compgeo/trace";

/**
 * Bézier clipping for curve-curve intersection (advanced Bézier lessons, D2; ADR 0028, plan "AB-1d plan").
 * Two planar nets of degree 1 to 3 are intersected by repeatedly clipping one curve against the fat line of the
 * other (the strip between the two lines parallel to the chord that contain all control points), swapping roles,
 * and halving the wider range when a clip stalls. Pure arithmetic on `[x, y]` tuples: no React, JSXGraph,
 * localization, global state or `src/compgeo` predicate (the hull-band cut uses candidate points, not orientation).
 * A finite run illustrates the algorithm; the tolerance is a stopping rule, not a proof of a root.
 */

/** A 2D control point. */
export type ClipPoint = readonly [number, number];
/** A closed parameter range [lo, hi] of one curve, in the curve's own global parameter. */
export type ClipRange = readonly [number, number];
/** Which curve of the pair: the first or the second input net. */
export type ClipTarget = "A" | "B";
/** `empty`: everything discarded; `found`: results and no limit hit; `limit`: the clip cap or depth limit was hit. */
export type ClipStatus = "empty" | "found" | "limit";
export type ClipLimitReason = "clips" | "depth";

export interface ClipOptions {
    /** Stop when both global parameter widths are at most this (default 1e-6). */
    tolerance?: number;
    /** Maximum number of clips, discards included (default 200). */
    maxClips?: number;
    /** Maximum subdivision depth (default 40). */
    maxDepth?: number;
    /** A clip keeping more than this fraction of the width triggers a split (default 0.8). */
    shrinkThreshold?: number;
}

export const CLIP_DEFAULTS = {tolerance: 1e-6, maxClips: 200, maxDepth: 40, shrinkThreshold: 0.8} as const;
/** The discard margin as a fraction of the control-point scale (acceptance 4). */
export const CLIP_MARGIN_FACTOR = 1e-12;

/** The fat line of a net: the band `dmin <= n·(P - origin) <= dmax` around the chord direction (unit normal n). */
export interface FatLine {
    origin: ClipPoint;
    normal: ClipPoint;
    dmin: number;
    dmax: number;
}

/** A distance control point: abscissa `i/m` and signed distance `d_i` of the i-th control point to a fat line. */
export interface DistancePoint {
    t: number;
    d: number;
}

/** A pair of live parameter ranges; `target` is the curve to clip next. */
export interface ClipPairView {
    pair: number;
    depth: number;
    target: ClipTarget;
    aRange: ClipRange;
    bRange: ClipRange;
}

/** Trace payload: pair ids and parameter ranges only (no coordinates). Ranges are after the event. */
export interface ClipPayload {
    pair: number;
    depth: number;
    /** The curve clipped by this event (clip, discard); the curve to clip next for other events. */
    target: ClipTarget;
    aRange: ClipRange;
    bRange: ClipRange;
    /** Fraction of the clipped curve's range kept (clip events), otherwise null. */
    keep: number | null;
    /** The two halves after a split (left half first), otherwise empty. */
    children: readonly ClipPairView[];
    /** Why a pair stayed unresolved (limit events), otherwise null. */
    reason: ClipLimitReason | null;
}

export type ClipTraceKind = "phase" | "clip" | "discard" | "split" | "output" | "limit" | "done";
export type ClipNoteKey = "start" | "clipped" | "discarded" | "split" | "found" | "limitClips" | "limitDepth" | "finished";
export type ClipEvent = TraceEvent<ClipTraceKind, ClipPayload>;
export type ClipTrace = Trace<ClipTraceKind, ClipPayload>;

/** One reported root region: both parameter ranges, merged over adjacent pieces. */
export interface ClipResult {
    aRange: ClipRange;
    bRange: ClipRange;
}

export interface ClipRun {
    status: ClipStatus;
    results: ClipResult[];
    /** Pairs still alive when a limit stopped them; with `limit` no live range is lost. */
    unresolved: ClipPairView[];
    clipCount: number;
    trace: ClipTrace;
}

/** The step state after a trace prefix; the last index equals the run's final fields. */
export interface ClipState {
    clipCount: number;
    active: ClipPairView[];
    discarded: ClipPairView[];
    results: ClipResult[];
    unresolved: ClipPairView[];
    status: ClipStatus | "running";
}

export const INITIAL_CLIP_STATE: ClipState = {clipCount: 0, active: [], discarded: [], results: [], unresolved: [], status: "running"};

type Net = number[][];

function validateNet(points: readonly ClipPoint[], name: string): ClipPoint[] {
    if (!Array.isArray(points) || points.length < 2 || points.length > 4) {
        throw new RangeError(`${name} needs 2 to 4 control points (degree 1 to 3), got ${Array.isArray(points) ? points.length : "none"}`);
    }
    return points.map(p => {
        if (!Array.isArray(p) || p.length !== 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
            throw new RangeError(`${name} control points must be [x, y] with finite numbers`);
        }
        return [p[0], p[1]] as const;
    });
}

/** The scale s: the largest absolute control coordinate of both nets, at least 1; the margin is `CLIP_MARGIN_FACTOR * s`. */
export function clipScale(a: readonly ClipPoint[], b: readonly ClipPoint[]): number {
    let s = 1;
    for (const p of [...a, ...b]) s = Math.max(s, Math.abs(p[0]), Math.abs(p[1]));
    return s;
}

/**
 * The fat line of `net`: direction of the chord P_n - P_0, else the vector to the farthest control point when the
 * chord is not longer than `margin`, else (1, 0); band = min and max signed distance of all control points.
 */
export function bezierFatLine(net: readonly ClipPoint[], margin = 0): FatLine {
    const p0 = net[0];
    const last = net[net.length - 1];
    let dir: [number, number] = [last[0] - p0[0], last[1] - p0[1]];
    let len = Math.hypot(dir[0], dir[1]);
    if (!(len > margin)) {
        dir = [0, 0];
        len = 0;
        for (const p of net) {
            const l = Math.hypot(p[0] - p0[0], p[1] - p0[1]);
            if (l > len) {
                len = l;
                dir = [p[0] - p0[0], p[1] - p0[1]];
            }
        }
        if (!(len > margin)) {
            dir = [1, 0];
            len = 1;
        }
    }
    const normal: ClipPoint = [-dir[1] / len, dir[0] / len];
    let dmin = Infinity;
    let dmax = -Infinity;
    for (const p of net) {
        const d = normal[0] * (p[0] - p0[0]) + normal[1] * (p[1] - p0[1]);
        dmin = Math.min(dmin, d);
        dmax = Math.max(dmax, d);
    }
    return {origin: p0, normal, dmin, dmax};
}

/** The distance control points (i/m, d_i) of `net` against `line`: the signed distance is a Bézier polynomial in them. */
export function distanceControlPoints(net: readonly ClipPoint[], line: FatLine): DistancePoint[] {
    const m = net.length - 1;
    return net.map((p, i) => ({
        t: i / m,
        d: line.normal[0] * (p[0] - line.origin[0]) + line.normal[1] * (p[1] - line.origin[1]),
    }));
}

/**
 * The t-range where conv{(t_i, d_i)} meets lo <= d <= hi, or null if it does not: the min and max t over the control
 * points inside the band and over the crossings of every segment P_iP_j with a band line (no orientation test).
 */
export function bandClipInterval(points: readonly DistancePoint[], lo: number, hi: number): ClipRange | null {
    let tmin = Infinity;
    let tmax = -Infinity;
    const take = (t: number) => {
        if (t < tmin) tmin = t;
        if (t > tmax) tmax = t;
    };
    for (const p of points) if (p.d >= lo && p.d <= hi) take(p.t);
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const pi = points[i];
            const pj = points[j];
            if (pi.d === pj.d) continue;
            for (const line of [lo, hi]) {
                if ((pi.d <= line && pj.d >= line) || (pi.d >= line && pj.d <= line)) {
                    take(pi.t + (line - pi.d) / (pj.d - pi.d) * (pj.t - pi.t));
                }
            }
        }
    }
    if (tmin > tmax) return null;
    return [Math.max(0, tmin), Math.min(1, tmax)];
}

/** The net of the curve restricted to the global range [t0, t1], always cut from the original net (never compounded). */
export function subNet(net: readonly ClipPoint[], t0: number, t1: number): ClipPoint[] {
    let rows: Net = net.map(p => [p[0], p[1]]);
    if (t1 < 1) rows = subdivide(t1, rows)[0];
    if (t0 > 0 && t1 > 0) rows = subdivide(Math.min(1, t0 / t1), rows)[1];
    return rows.map(r => [r[0], r[1]] as const);
}

/** Merges results whose A ranges and B ranges both overlap or touch within `tolerance` (bounding ranges, to a fixed point). */
export function mergeClipResults(results: readonly ClipResult[], tolerance: number): ClipResult[] {
    const out: ClipResult[] = results.map(r => ({aRange: r.aRange, bRange: r.bRange}));
    const near = (p: ClipRange, q: ClipRange) => p[0] <= q[1] + tolerance && q[0] <= p[1] + tolerance;
    let merged = true;
    while (merged) {
        merged = false;
        for (let i = 0; i < out.length && !merged; i++) {
            for (let j = i + 1; j < out.length && !merged; j++) {
                if (near(out[i].aRange, out[j].aRange) && near(out[i].bRange, out[j].bRange)) {
                    out[i] = {
                        aRange: [Math.min(out[i].aRange[0], out[j].aRange[0]), Math.max(out[i].aRange[1], out[j].aRange[1])],
                        bRange: [Math.min(out[i].bRange[0], out[j].bRange[0]), Math.max(out[i].bRange[1], out[j].bRange[1])],
                    };
                    out.splice(j, 1);
                    merged = true;
                }
            }
        }
    }
    return out;
}

/** The pure step fold for `stateAt(trace, i, foldClipEvent, INITIAL_CLIP_STATE)`; it never mutates its input. */
export function foldClipEvent(state: ClipState, event: ClipEvent, tolerance: number = CLIP_DEFAULTS.tolerance): ClipState {
    const p = event.payload;
    const view: ClipPairView = {pair: p.pair, depth: p.depth, target: p.target, aRange: p.aRange, bRange: p.bRange};
    const without = state.active.filter(v => v.pair !== p.pair);
    const base = {...state, clipCount: event.predicateCount};
    switch (event.kind) {
        case "phase":
            return {...base, active: [...state.active, view]};
        case "clip":
            // The pair continues; the other curve is clipped next.
            return {...base, active: state.active.map(v => v.pair === p.pair ? {...view, target: p.target === "A" ? "B" : "A"} : v)};
        case "discard":
            return {...base, active: without, discarded: [...state.discarded, view]};
        case "split":
            return {...base, active: [...without, ...p.children]};
        case "output":
            return {...base, active: without, results: mergeClipResults([...state.results, {aRange: p.aRange, bRange: p.bRange}], tolerance)};
        case "limit":
            return {...base, active: without, unresolved: [...state.unresolved, view]};
        case "done":
            return {...base, status: state.unresolved.length > 0 ? "limit" : state.results.length > 0 ? "found" : "empty"};
        default:
            return base;
    }
}

/** The step fold bound to a run's tolerance (merging depends on it): `stateAt(trace, i, clipFold(tol), INITIAL_CLIP_STATE)`. */
export function clipFold(tolerance: number = CLIP_DEFAULTS.tolerance): (state: ClipState, event: ClipEvent) => ClipState {
    return (state, event) => foldClipEvent(state, event, tolerance);
}

interface LivePair {
    pair: number;
    depth: number;
    target: ClipTarget;
    aRange: ClipRange;
    bRange: ClipRange;
}

/**
 * Intersects two planar Bézier nets (degree 1 to 3) by Bézier clipping, depth first with A's left half first.
 * Throws RangeError for unsupported degree, non-2D or non-finite points.
 */
export function clipBezierPair(netA: readonly ClipPoint[], netB: readonly ClipPoint[], options: ClipOptions = {}): ClipRun {
    const a = validateNet(netA, "net A");
    const b = validateNet(netB, "net B");
    const tolerance = options.tolerance ?? CLIP_DEFAULTS.tolerance;
    const maxClips = options.maxClips ?? CLIP_DEFAULTS.maxClips;
    const maxDepth = options.maxDepth ?? CLIP_DEFAULTS.maxDepth;
    const shrink = options.shrinkThreshold ?? CLIP_DEFAULTS.shrinkThreshold;
    const margin = CLIP_MARGIN_FACTOR * clipScale(a, b);

    const events: ClipEvent[] = [];
    let clipCount = 0;
    const emit = (kind: ClipTraceKind, noteKey: ClipNoteKey, pair: LivePair, extra: Partial<ClipPayload> = {}) => {
        events.push({
            kind, noteKey, predicateCount: clipCount,
            payload: {pair: pair.pair, depth: pair.depth, target: pair.target, aRange: pair.aRange, bRange: pair.bRange, keep: null, children: [], reason: null, ...extra},
        });
    };
    const view = (v: LivePair): ClipPairView => ({pair: v.pair, depth: v.depth, target: v.target, aRange: v.aRange, bRange: v.bRange});

    let nextId = 1;
    let results: ClipResult[] = [];
    const unresolved: ClipPairView[] = [];
    emit("phase", "start", {pair: 0, depth: 0, target: "A", aRange: [0, 1], bRange: [0, 1]});
    const stack: LivePair[] = [{pair: 0, depth: 0, target: "A", aRange: [0, 1], bRange: [0, 1]}];

    outer: while (stack.length > 0) {
        const pair = stack.pop() as LivePair;
        for (;;) {
            if (pair.aRange[1] - pair.aRange[0] <= tolerance && pair.bRange[1] - pair.bRange[0] <= tolerance) {
                emit("output", "found", pair);
                results = mergeClipResults([...results, {aRange: pair.aRange, bRange: pair.bRange}], tolerance);
                break;
            }
            if (clipCount >= maxClips) {
                // Stop everything; every live pair is kept as unresolved, in processing order.
                for (const rest of [pair, ...stack.reverse()]) {
                    emit("limit", "limitClips", rest, {reason: "clips"});
                    unresolved.push(view(rest));
                }
                stack.length = 0;
                break outer;
            }
            const clipA = pair.target === "A";
            const range = clipA ? pair.aRange : pair.bRange;
            const other = clipA ? pair.bRange : pair.aRange;
            const clipped = subNet(clipA ? a : b, range[0], range[1]);
            const line = bezierFatLine(subNet(clipA ? b : a, other[0], other[1]), margin);
            const interval = bandClipInterval(distanceControlPoints(clipped, line), line.dmin - margin, line.dmax + margin);
            clipCount++;
            if (interval === null) {
                emit("discard", "discarded", pair);
                break;
            }
            const width = range[1] - range[0];
            const next: ClipRange = [
                Math.max(range[0], range[0] + width * interval[0]),
                Math.min(range[1], range[0] + width * interval[1]),
            ];
            const keep = interval[1] - interval[0];
            const clippedTarget = pair.target;
            if (clipA) pair.aRange = next; else pair.bRange = next;
            pair.target = clipA ? "B" : "A";
            // The clip event names the clipped curve; the live pair already waits for the other one.
            emit("clip", "clipped", pair, {keep, target: clippedTarget});
            if (keep > shrink) {
                if (pair.depth + 1 > maxDepth) {
                    emit("limit", "limitDepth", pair, {reason: "depth"});
                    unresolved.push(view(pair));
                    break;
                }
                const splitA = pair.aRange[1] - pair.aRange[0] >= pair.bRange[1] - pair.bRange[0];
                const r = splitA ? pair.aRange : pair.bRange;
                const mid = (r[0] + r[1]) / 2;
                const halves: ClipRange[] = [[r[0], mid], [mid, r[1]]];
                const children: LivePair[] = halves.map(h => ({
                    pair: nextId++, depth: pair.depth + 1, target: pair.target,
                    aRange: splitA ? h : pair.aRange, bRange: splitA ? pair.bRange : h,
                }));
                emit("split", "split", pair, {children: children.map(view)});
                stack.push(children[1], children[0]);
                break;
            }
        }
    }

    const status: ClipStatus = unresolved.length > 0 ? "limit" : results.length > 0 ? "found" : "empty";
    emit("done", "finished", {pair: 0, depth: 0, target: "A", aRange: [0, 1], bRange: [0, 1]});
    return {status, results, unresolved, clipCount, trace: events};
}
