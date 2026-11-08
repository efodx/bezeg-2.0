import type {GridPoint} from "../../compgeo/grid";
import {monotoneChainStateAt, monotoneChainTrace, type MonotoneChainNote, type MonotoneChainOptions} from "../../compgeo/monotoneChain";
import {slowHullStateAt, slowHullTrace, type SlowHullNote} from "../../compgeo/slowHull";
import {giftWrappingStateAt, giftWrappingTrace, type GiftWrappingNote} from "../../compgeo/giftWrapping";
import {clampTraceIndex} from "../../compgeo/trace";

/**
 * Algorithm dispatch for the hull trace graph: one uniform run over the three accepted hull traces, so the graph, the
 * overlays and the status line never branch on the algorithm. Pure TypeScript: no React, JSXGraph or localization.
 * Point numbers in every result are indices into the input points.
 */
export const HULL_ALGORITHMS = ["monotone-chain", "slow-edge-test", "gift-wrapping"] as const;
export type HullAlgorithm = typeof HULL_ALGORITHMS[number];
export const DEFAULT_HULL_ALGORITHM: HullAlgorithm = "monotone-chain";

/** The saved algorithm, or undefined for anything that is not one of the three ids (the importer rejects it with a message). */
export function parseHullAlgorithm(value: unknown): HullAlgorithm | undefined {
    return HULL_ALGORITHMS.find(algorithm => algorithm === value);
}

/**
 * The saved step index: a finite number is accepted (a non-integer or out-of-range index is clamped on restore, see
 * `clampTraceIndex`); anything else is undefined and rejected by the importer.
 */
export function parseHullStep(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** `output-small` is the output step of a run with fewer than three distinct points, which no algorithm builds chains for. */
export type HullNote = MonotoneChainNote | SlowHullNote | GiftWrappingNote | "output-small";

export interface HullEventInfo {
    readonly kind: string;
    readonly note: HullNote;
    /** Orientation tests performed up to and including this event. */
    readonly predicateCount: number;
    /** A tested triple: `points` are [a, b, p] (monotone chain) or [current, candidate, p] (gift wrapping). */
    readonly test?: {readonly points: readonly number[]; readonly value: number};
    /** A directed pair under examination (slow edge test) and the first witness against it. */
    readonly pair?: {readonly from: number; readonly to: number; readonly witness?: number};
}

export interface HullView {
    /** Open point paths accepted so far (the chains, the wrapped path, or one two-point path per accepted edge). */
    readonly accepted: readonly (readonly number[])[];
    /** Segments being tested right now, as [from, to] pairs. */
    readonly probes: readonly (readonly [number, number])[];
    /** The hull polygon once the trace is done; null before. */
    readonly hull: readonly number[] | null;
    readonly done: boolean;
}

export interface HullRun {
    readonly algorithm: HullAlgorithm;
    /** Number of events; step indices run 0 .. length - 1 and the last event is `done`. */
    readonly length: number;
    /** Orientation tests of the whole run. */
    readonly totalPredicates: number;
    /** The step index cut to 0 .. length - 1 (`clampTraceIndex`); a non-finite index and an empty run give 0. */
    clamp(step: number): number;
    event(index: number): HullEventInfo | undefined;
    view(index: number): HullView;
}

const EMPTY_VIEW: HullView = Object.freeze({accepted: [], probes: [], hull: null, done: false});
const asPair = (a: number | undefined, b: number | undefined): readonly [number, number][] =>
    a === undefined || b === undefined ? [] : [[a, b]];
const longPaths = (paths: readonly (readonly number[])[]) => paths.filter(path => path.length >= 2);

function monotoneRun(points: readonly GridPoint[], options?: Partial<MonotoneChainOptions>): HullRun {
    const trace = monotoneChainTrace(points, options);
    return {
        algorithm: "monotone-chain", length: trace.length, totalPredicates: trace.length ? trace[trace.length - 1].predicateCount : 0,
        clamp: step => clampTraceIndex(trace, step),
        event: index => {
            const e = trace[clampTraceIndex(trace, index)];
            if (!e) return undefined;
            const test = e.kind === "test" && e.payload.value !== undefined ? {points: e.payload.points, value: e.payload.value} : undefined;
            return {kind: e.kind, note: e.noteKey, predicateCount: e.predicateCount, ...(test ? {test} : {})};
        },
        view: index => {
            if (!trace.length) return EMPTY_VIEW;
            const s = monotoneChainStateAt(trace, index);
            const t = s.lastTest?.points;
            return {
                accepted: longPaths([s.lower, s.upper]),
                probes: t ? [...asPair(t[0], t[1]), ...asPair(t[1], t[2])] : [],
                hull: s.done ? s.hull : null, done: s.done,
            };
        },
    };
}

function slowRun(points: readonly GridPoint[]): HullRun {
    const trace = slowHullTrace(points);
    return {
        algorithm: "slow-edge-test", length: trace.length, totalPredicates: trace.length ? trace[trace.length - 1].predicateCount : 0,
        clamp: step => clampTraceIndex(trace, step),
        event: index => {
            const e = trace[clampTraceIndex(trace, index)];
            if (!e) return undefined;
            const pair = e.payload.points.length === 2 ? {from: e.payload.points[0], to: e.payload.points[1], witness: e.payload.witness} : undefined;
            return {kind: e.kind, note: e.noteKey, predicateCount: e.predicateCount, ...(pair ? {pair} : {})};
        },
        view: index => {
            if (!trace.length) return EMPTY_VIEW;
            const s = slowHullStateAt(trace, index);
            const c = s.current;
            const probes = c ? [...asPair(c[0], c[1]), ...(s.witness === null ? [] : asPair(c[0], s.witness))] : [];
            return {accepted: s.edges.map(edge => [edge[0], edge[1]]), probes, hull: s.done ? s.hull : null, done: s.done};
        },
    };
}

function giftRun(points: readonly GridPoint[]): HullRun {
    const trace = giftWrappingTrace(points);
    return {
        algorithm: "gift-wrapping", length: trace.length, totalPredicates: trace.length ? trace[trace.length - 1].predicateCount : 0,
        clamp: step => clampTraceIndex(trace, step),
        event: index => {
            const e = trace[clampTraceIndex(trace, index)];
            if (!e) return undefined;
            const test = e.kind === "test" && e.payload.value !== undefined ? {points: e.payload.points, value: e.payload.value} : undefined;
            return {kind: e.kind, note: e.noteKey, predicateCount: e.predicateCount, ...(test ? {test} : {})};
        },
        view: index => {
            if (!trace.length) return EMPTY_VIEW;
            const s = giftWrappingStateAt(trace, index);
            const t = s.lastTest?.points;
            return {
                accepted: longPaths([s.wrapped]),
                probes: t ? [...asPair(t[0], t[1]), ...asPair(t[0], t[2])] : [],
                hull: s.done ? s.hull : null, done: s.done,
            };
        },
    };
}

const endsFewerThanThree = (run: HullRun): boolean => run.length > 0 && run.event(run.length - 1)?.note === "done-fewer-than-three";
const relabelOutput = (info: HullEventInfo | undefined): HullEventInfo | undefined =>
    info && info.note === "output-hull" ? {...info, note: "output-small"} : info;

/**
 * Runs one algorithm on the points. Never throws: input a trace refuses (more than 40 points, non-grid points) gives an
 * empty run, which the graph shows as an empty trace. `noteKey` is already the algorithm's own union.
 * `chainOptions` are the monotone chain's rule variants (task 19, lesson A5) and are ignored by the other two algorithms.
 */
export function runHullTrace(algorithm: HullAlgorithm, points: readonly GridPoint[], chainOptions?: Partial<MonotoneChainOptions>): HullRun {
    const empty: HullRun = {algorithm, length: 0, totalPredicates: 0, clamp: () => 0, event: () => undefined, view: () => EMPTY_VIEW};
    try {
        const run = algorithm === "monotone-chain" ? monotoneRun(points, chainOptions) : algorithm === "slow-edge-test" ? slowRun(points) : giftRun(points);
        return endsFewerThanThree(run) ? {...run, event: index => relabelOutput(run.event(index))} : run;
    } catch {
        return empty;
    }
}

/** Total orientation tests of each algorithm on the same points (the comparison row after `done`). */
export function hullPredicateTotals(points: readonly GridPoint[]): Readonly<Record<HullAlgorithm, number>> {
    return {
        "monotone-chain": runHullTrace("monotone-chain", points).totalPredicates,
        "slow-edge-test": runHullTrace("slow-edge-test", points).totalPredicates,
        "gift-wrapping": runHullTrace("gift-wrapping", points).totalPredicates,
    };
}
