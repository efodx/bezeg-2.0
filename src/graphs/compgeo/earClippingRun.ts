import type {GridPoint} from "../../compgeo/grid";
import {
    earClippingStateAt, earClippingTrace, EarClippingNote, EarClippingOutcome, EarClippingState, EarTriangle, guardClass, threeColouring,
} from "../../compgeo/earClipping";
import {orient} from "../../compgeo/predicates";
import {clampTraceIndex} from "../../compgeo/trace";

/**
 * Ear clipping run for the graph: the refusal or the trace plus everything the overlays and the readouts need, computed
 * once per polygon. Pure TypeScript: no React, JSXGraph or localization. Point numbers are indices into the input.
 */
export type EarRefusal = "fewer-than-three" | "not-simple" | "collinear-vertices" | "unsupported";

export interface EarEventInfo {
    readonly kind: string;
    readonly note: EarClippingNote;
    readonly predicateCount: number;
    /** [previous, apex, next] of a test, accept or output event; empty for phase and done. */
    readonly points: readonly number[];
    /** A rejected test: 'reflex', or the vertex found in the triangle. */
    readonly rejected?: "reflex" | number;
}

export interface EarSummary {
    readonly triangles: number;
    readonly diagonals: number;
    /** Sizes of colours 0, 1, 2 (letters A, B, C). */
    readonly classSizes: readonly [number, number, number];
    readonly guardCount: number;
    readonly guardVertices: readonly number[];
}

export interface EarRun {
    readonly refusal?: EarRefusal;
    /** True when the input is clockwise (the trace runs on the reversed cycle; the model is untouched). */
    readonly reversed: boolean;
    /** Number of events; step indices run 0 .. length - 1 and the last event is `done`. 0 for a refusal. */
    readonly length: number;
    readonly totalPredicates: number;
    /** All n - 2 triangles of the finished triangulation (input indices, counter-clockwise). */
    readonly triangles: readonly EarTriangle[];
    /** Fisk colour (0, 1, 2) of every vertex; empty for a refusal. */
    readonly colours: readonly number[];
    /** Vertices with a reflex angle (input indices). */
    readonly reflex: readonly number[];
    /** Smallest colour class: its colour and vertices. */
    readonly guards: {readonly colour: number; readonly vertices: readonly number[]};
    readonly summary: EarSummary | undefined;
    clamp(step: number): number;
    event(index: number): EarEventInfo | undefined;
    state(index: number): EarClippingState;
}

const NOTES: readonly EarClippingNote[] = [
    "phase-start", "test-reflex", "test-blocked", "test-ear", "accept-ear", "output-ear", "output-last-triangle", "done-triangulated",
];
const EMPTY_STATE: EarClippingState = {triangles: [], remaining: [], candidate: null, done: false};

function refused(refusal: EarRefusal): EarRun {
    return {
        refusal, reversed: false, length: 0, totalPredicates: 0, triangles: [], colours: [], reflex: [], guards: {colour: 0, vertices: []},
        summary: undefined, clamp: () => 0, event: () => undefined, state: () => EMPTY_STATE,
    };
}

/** Both diagonals and polygon edges are triangle edges; a diagonal is a triangle edge that is not a polygon edge. */
export function diagonalsOf(triangles: readonly EarTriangle[], n: number): readonly (readonly [number, number])[] {
    const seen = new Set<string>();
    const out: [number, number][] = [];
    for (const triangle of triangles) {
        for (let k = 0; k < 3; k++) {
            const a = Math.min(triangle[k], triangle[(k + 1) % 3]);
            const b = Math.max(triangle[k], triangle[(k + 1) % 3]);
            const onBoundary = b - a === 1 || (a === 0 && b === n - 1);
            const key = `${a},${b}`;
            if (onBoundary || seen.has(key)) continue;
            seen.add(key);
            out.push([a, b]);
        }
    }
    return out;
}

/** Runs ear clipping on the polygon's vertices in order. Never throws: input the kernel refuses with an exception is `unsupported`. */
export function runEarClipping(points: readonly GridPoint[]): EarRun {
    let outcome: EarClippingOutcome;
    try {
        outcome = earClippingTrace(points);
    } catch {
        return refused("unsupported");
    }
    if (!outcome.ok) {
        switch (outcome.reason) {
            case "fewer-than-three": return refused("fewer-than-three");
            case "collinear-vertices": return refused("collinear-vertices");
            case "not-simple":
            case "zero-area": return refused("not-simple");
        }
    }
    const {trace, triangles, reversed} = outcome;
    const n = points.length;
    const colours = threeColouring(triangles, n);
    const guards = guardClass(colours);
    const count = (c: number) => colours.filter(x => x === c).length;
    const classSizes: [number, number, number] = [count(0), count(1), count(2)];
    const reflex = points.flatMap((_, i) => {
        const turn = orient(points[(i + n - 1) % n], points[i], points[(i + 1) % n]);
        return (reversed ? -turn : turn) < 0 ? [i] : [];
    });
    return {
        reversed, length: trace.length, totalPredicates: trace[trace.length - 1].predicateCount, triangles, colours, reflex, guards,
        summary: {
            triangles: triangles.length, diagonals: diagonalsOf(triangles, n).length, classSizes,
            guardCount: guards.vertices.length, guardVertices: guards.vertices,
        },
        clamp: step => clampTraceIndex(trace, step),
        event: index => {
            const e = trace[clampTraceIndex(trace, index)];
            const note = e && NOTES.find(known => known === e.noteKey);
            if (!e || !note) return undefined;
            return {kind: e.kind, note, predicateCount: e.predicateCount, points: e.payload.points, rejected: e.payload.rejected};
        },
        state: index => earClippingStateAt(trace, index),
    };
}
