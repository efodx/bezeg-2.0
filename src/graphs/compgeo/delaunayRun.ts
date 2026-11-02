import {angleVector, lawsonStateAt, lawsonTrace, LawsonEvent, LawsonNote, LawsonState, LawsonTrace} from "../../compgeo/delaunay";
import type {GridPoint} from "../../compgeo/grid";
import {incircle, incircleValue} from "../../compgeo/predicates";
import {circumcentre, circumradiusSquared} from "../../compgeo/triangle";
import {clampTraceIndex} from "../../compgeo/trace";
import {edges, type Triangulation} from "../../compgeo/triangulation";

/**
 * The Lawson trace of a starting triangulation plus what the board and the readouts need at each step, computed once per
 * starting triangulation and memoized per step. Pure TypeScript: no React, JSXGraph or localization.
 */
export interface DelaunayEventInfo {
    readonly kind: LawsonEvent["kind"];
    readonly note: LawsonNote;
    readonly event: LawsonEvent;
}

/** The two triangles of an interior edge as a quadrilateral: the edge a-b, the apex c of the first triangle and d, the apex that is tested against the circle of a, b, c (counter-clockwise a, b, c). */
export interface DelaunayQuad {
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly d: number;
}

export interface DelaunayRun {
    /** Number of events; step indices run 0 .. length - 1 and the last event is `done`. 0 without a triangulation. */
    readonly length: number;
    readonly start: Triangulation | undefined;
    /** True when some edge test of the whole trace had incircle determinant 0 (cocircular points: the result is not unique). */
    readonly cocircular: boolean;
    clamp(step: number): number;
    event(index: number): DelaunayEventInfo | undefined;
    state(index: number): LawsonState;
    /** The interior edges (sorted index pairs) that are illegal in the triangulation shown at `index`. */
    illegal(index: number): readonly (readonly [number, number])[];
}

const EMPTY_STATE: LawsonState = {triangulation: null, testing: null, flips: 0, done: false};
const NOTES: readonly LawsonNote[] = ["phase-start", "test-legal", "test-illegal", "flip-edge", "done-delaunay"];
const NO_RUN: DelaunayRun = {
    length: 0, start: undefined, cocircular: false, clamp: () => 0, event: () => undefined, state: () => EMPTY_STATE, illegal: () => [],
};

/** The quadrilateral of an interior edge, derived the way `lawsonTrace` derives it (the first triangle of the edge gives c). */
export function edgeQuad(tri: Triangulation, a: number, b: number): DelaunayQuad | undefined {
    const e = edges(tri).find(candidate => candidate.a === Math.min(a, b) && candidate.b === Math.max(a, b));
    if (!e || e.triangles.length !== 2) return undefined;
    const [t, u] = e.triangles;
    const corner = tri.nbr[t].indexOf(u);
    const d = tri.triangles[u].find(v => v !== tri.triangles[t][(corner + 1) % 3] && v !== tri.triangles[t][(corner + 2) % 3]);
    if (d === undefined) return undefined;
    return {a: tri.triangles[t][(corner + 1) % 3], b: tri.triangles[t][(corner + 2) % 3], c: tri.triangles[t][corner], d};
}

/** Interior edges with incircle > 0 (illegal), as sorted index pairs in the order of `edges`. */
export function illegalEdges(tri: Triangulation): readonly (readonly [number, number])[] {
    const out: [number, number][] = [];
    for (const e of edges(tri)) {
        if (!e.interior) continue;
        const q = edgeQuad(tri, e.a, e.b);
        if (q && incircle(tri.points[q.a], tri.points[q.b], tri.points[q.c], tri.points[q.d]) > 0) out.push([e.a, e.b]);
    }
    return out;
}

/** The incircle determinant for an edge's quadrilateral, exact. */
export function quadValue(tri: Triangulation, quad: DelaunayQuad): bigint {
    return incircleValue(tri.points[quad.a], tri.points[quad.b], tri.points[quad.c], tri.points[quad.d]);
}

/** The circumcircle of three grid points in grid units, converted from the exact rationals to doubles for drawing only. Undefined for collinear points. */
export function circumcircle(a: GridPoint, b: GridPoint, c: GridPoint): {x: number; y: number; r: number} | undefined {
    const centre = circumcentre(a, b, c);
    const r2 = circumradiusSquared(a, b, c);
    if (centre.kind !== "point" || r2.kind !== "value") return undefined;
    return {x: centre.point.x.toNumber(), y: centre.point.y.toNumber(), r: Math.sqrt(r2.value.toNumber())};
}

/** Never throws: no triangulation, or a start the kernel cannot trace, gives the empty run. */
export function runDelaunay(start: Triangulation | undefined): DelaunayRun {
    if (!start) return NO_RUN;
    let trace: LawsonTrace;
    try {
        trace = lawsonTrace(start);
    } catch {
        return NO_RUN;
    }
    const states = new Map<number, LawsonState>();
    const illegals = new Map<number, readonly (readonly [number, number])[]>();
    const state = (index: number): LawsonState => {
        const i = clampTraceIndex(trace, index);
        let known = states.get(i);
        if (!known) {
            known = lawsonStateAt(trace, i);
            states.set(i, known);
        }
        return known;
    };
    return {
        length: trace.length, start,
        cocircular: trace.some(e => e.kind === "test" && e.payload.sign === 0),
        clamp: step => clampTraceIndex(trace, step),
        event: index => {
            const e = trace[clampTraceIndex(trace, index)];
            const note = e && NOTES.find(known => known === e.noteKey);
            return e && note ? {kind: e.kind, note, event: e} : undefined;
        },
        state,
        illegal: index => {
            const i = clampTraceIndex(trace, index);
            let known = illegals.get(i);
            if (!known) {
                const tri = state(i).triangulation;
                known = tri ? illegalEdges(tri) : [];
                illegals.set(i, known);
            }
            return known;
        },
    };
}

/** Smallest angle and the sorted vector in degrees of a triangulation. Display only. */
export function angleSummary(tri: Triangulation): {min: number; vector: readonly number[]} {
    const vector = angleVector(tri);
    return {min: vector[0], vector};
}
