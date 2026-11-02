import type {GridPoint} from "../../compgeo/grid";
import {
    type Diagonal, monotonePartitionTrace, type MonotonePartition, type MonotoneRefused, partitionStateAt, type VertexType,
} from "../../compgeo/sweep/monotonePartition";

/**
 * The monotone partition trace as one uniform run for the graph and its panel (spec C3). Pure TypeScript: no React,
 * JSXGraph or localization. Vertices are indices into the input (0 is the first vertex); every readout comes from the
 * kernel result (`types`, `diagonals`, `pieces`, `partitionStateAt`), nothing is recomputed from coordinates here.
 * Step `i` is trace event `i`: step 0 is the `phase` event (the polygon with the sweep line above it), the last step is
 * `done`. `partitionStateAt` shows the new helper of a regular vertex with the interior to its left already at that
 * vertex's `pop` (one step before its status search); the view shows the kernel's state as it is.
 */
export type PartitionNote = "phase" | "pop" | "insert" | "remove" | "diagonal" | "done";

export interface PartitionEventInfo {
    readonly note: PartitionNote;
    /** `pop`: the vertex. */
    readonly vertex?: number;
    /** `insert`, `remove`: the edge. */
    readonly edge?: number;
    /** `diagonal`: the reported diagonal. */
    readonly diagonal?: Diagonal;
    /** `insert`, `remove`: the status size after the event. */
    readonly statusSize?: number;
}

export interface PartitionView {
    /** The vertex of the last `pop`; null before the first one. */
    readonly vertex: number | null;
    readonly type: VertexType | null;
    /** Vertices popped so far in processing order (the current one last). */
    readonly processed: readonly number[];
    /** Vertices still to be popped, in processing order. */
    readonly queue: readonly number[];
    /** Edge ids left to right, with the helper vertex of each. */
    readonly status: readonly number[];
    readonly helpers: ReadonlyMap<number, number>;
    /** The status edges that belong to the current vertex: its own edges and the edges whose helper it is. */
    readonly current: ReadonlySet<number>;
    readonly diagonals: readonly Diagonal[];
    readonly done: boolean;
}

export interface PartitionRun {
    readonly vertices: readonly GridPoint[];
    readonly refusal: MonotoneRefused | undefined;
    /** Counter-clockwise input processed as such; true when the input was clockwise (all indices still refer to the input). */
    readonly reversed: boolean;
    /** Number of steps; indices run 0 .. length - 1 and the last step is `done`. 0 for a refused input. */
    readonly length: number;
    readonly types: readonly VertexType[];
    readonly diagonals: readonly Diagonal[];
    readonly pieces: readonly (readonly number[])[];
    readonly typeCounts: Readonly<Record<VertexType, number>>;
    clamp(step: number): number;
    event(index: number): PartitionEventInfo | undefined;
    view(index: number): PartitionView;
    /** The two end vertices of edge `edge` (it runs from `edge` to its counter-clockwise successor). */
    edgeEnds(edge: number): readonly [number, number];
}

/** Vertices and edges are shown from 1, like the point labels of the point-set graphs. */
export const vertexName = (k: number): string => `v${k + 1}`;
export const edgeName = (k: number): string => `e${k + 1}`;

const NO_COUNTS: Readonly<Record<VertexType, number>> = Object.freeze({start: 0, end: 0, split: 0, merge: 0, regular: 0});
const EMPTY_VIEW: PartitionView = Object.freeze({
    vertex: null, type: null, processed: [], queue: [], status: [], helpers: new Map<number, number>(), current: new Set<number>(), diagonals: [], done: false,
});

function emptyRun(vertices: readonly GridPoint[], refusal: MonotoneRefused): PartitionRun {
    return {
        vertices, refusal, reversed: false, length: 0, types: [], diagonals: [], pieces: [], typeCounts: NO_COUNTS,
        clamp: () => 0, event: () => undefined, view: () => EMPTY_VIEW, edgeEnds: edge => [edge, edge],
    };
}

function eventInfo(result: MonotonePartition, index: number, statusSize: number): PartitionEventInfo {
    const event = result.trace[index];
    const payload = event.payload;
    if (event.kind === "pop" && "id" in payload) return {note: "pop", vertex: payload.id};
    if (event.kind === "status-insert" && "id" in payload) return {note: "insert", edge: payload.id, statusSize};
    if (event.kind === "status-remove" && "id" in payload) return {note: "remove", edge: payload.id, statusSize};
    if (event.kind === "report" && "item" in payload) return {note: "diagonal", diagonal: payload.item as Diagonal};
    return {note: event.kind === "done" ? "done" : "phase"};
}

/** Builds the run of `vertices`. Never throws on input: a refused polygon gives an empty run that carries the refusal. */
export function runMonotonePartition(vertices: readonly GridPoint[]): PartitionRun {
    const result = monotonePartitionTrace(vertices);
    return result.ok ? partitionRunOf(vertices, result) : emptyRun(vertices, result);
}

/** The run of an accepted kernel result, so that a caller that already holds one (task 17) does not trace twice. */
export function partitionRunOf(vertices: readonly GridPoint[], result: MonotonePartition): PartitionRun {
    const n = vertices.length;
    const length = result.trace.length;
    const typeCounts: Record<VertexType, number> = {start: 0, end: 0, split: 0, merge: 0, regular: 0};
    for (const type of result.types) typeCounts[type]++;
    const views = new Map<number, PartitionView>();
    const clamp = (step: number) => (Number.isFinite(step) ? Math.min(Math.max(Math.trunc(step), 0), length - 1) : 0);
    const succ = (edge: number) => (result.reversed ? (edge + n - 1) % n : (edge + 1) % n);
    const pred = (vertex: number) => (result.reversed ? (vertex + 1) % n : (vertex + n - 1) % n);
    const view = (raw: number): PartitionView => {
        const index = clamp(raw);
        const cached = views.get(index);
        if (cached) return cached;
        const state = partitionStateAt(result, index);
        let pops = 0;
        for (let k = 0; k <= index; k++) if (result.trace[k].kind === "pop") pops++;
        const vertex = state.vertex?.index ?? null;
        const current = new Set<number>();
        if (vertex !== null) {
            for (const edge of state.sweep.status) {
                if (edge === vertex || edge === pred(vertex) || state.helpers.get(edge) === vertex) current.add(edge);
            }
        }
        const built: PartitionView = {
            vertex, type: state.vertex?.type ?? null, processed: result.order.slice(0, pops), queue: result.order.slice(pops),
            status: state.sweep.status, helpers: state.helpers, current, diagonals: state.sweep.output, done: state.sweep.done,
        };
        views.set(index, built);
        return built;
    };
    return {
        vertices, refusal: undefined, reversed: result.reversed, length, types: result.types, diagonals: result.diagonals,
        pieces: result.pieces, typeCounts, clamp,
        event: index => eventInfo(result, clamp(index), view(index).status.length),
        view,
        edgeEnds: edge => [edge, succ(edge)],
    };
}
