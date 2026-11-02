import type {GridPoint} from "../../compgeo/grid";
import type {Diagonal} from "../../compgeo/sweep/monotonePartition";
import {
    type Chain, partitionAndTriangulate, type MonotoneTriangulation, type PartitionAndTriangulation, type Triangle,
} from "../../compgeo/sweep/monotoneTriangulation";
import {sweepStateAt} from "../../compgeo/sweep/sweepTrace";
import {type PartitionRun, partitionRunOf, runMonotonePartition} from "./monotonePartitionRun";

/**
 * The combined trace of `partitionAndTriangulate` as one uniform run (spec C4, task 17). Pure TypeScript: no React,
 * JSXGraph or localization. Every readout (chain, stack, test outcome, triangles, predicate counts) comes from the
 * kernel result; nothing is recomputed from coordinates here.
 *
 * Steps. The run is a `PartitionRun` whose `length` counts all steps, so the playback of task 16 carries over. Steps
 * `0 .. boundary` are the partition trace (task 16), its last event `done` being the boundary step: the pieces appear.
 * Then each piece contributes its own events without the `phase` event (the piece is outlined from its first `pop` on)
 * and without its `done` event, except for the last piece, whose `done` is the last step. So neither the boundary nor
 * the change from one piece to the next costs a step that changes nothing. A refused polygon gives an empty run.
 *
 * Triangles. The kernel lists the triangles in the order it emits them but does not put them in the trace. By the
 * kernel's construction, every `status-remove` of a vertex's group of events except the first one (the first one only
 * lifts the top of the stack) finishes one triangle, together with the `report` that follows it when there is one.
 * The run reads this off the event kinds (no coordinates) and `finishedTriangles` pairs it with the kernel list, so a
 * mismatch of the two counts throws.
 */
export type TriangulationNote = "pop" | "push" | "unstack" | "test" | "diagonal" | "done";

export interface TriangulationEventInfo {
    readonly note: TriangulationNote;
    /** `pop`, `push`, `unstack`: the vertex. */
    readonly vertex?: number;
    /** `pop`: the chain of the vertex. */
    readonly chain?: Chain;
    /** `push`, `unstack`: the stack size after the event. */
    readonly stackSize?: number;
    /** `test`: the vertex under test, the stack vertex it would connect to, and the outcome. */
    readonly test?: {readonly a: number; readonly b: number; readonly outcome: "visible" | "blocked"};
    readonly diagonal?: Diagonal;
}

export interface TriangulationView {
    /** The piece being triangulated, from 0, in the kernel's piece order. */
    readonly piece: number;
    /** The piece's counter-clockwise cycle of input indices. */
    readonly cycle: readonly number[];
    /** The piece's vertices top to bottom, with the chain of each. */
    readonly order: readonly number[];
    readonly chains: readonly Chain[];
    /** The vertex of the last `pop` of this piece; null before the first one (not reachable by a step). */
    readonly vertex: number | null;
    readonly chain: Chain | null;
    /** The stack, bottom to top. */
    readonly stack: readonly number[];
    /** The visibility test of this very step, or null when the step is another event. */
    readonly test: {readonly a: number; readonly b: number; readonly outcome: "visible" | "blocked"} | null;
    /** The diagonals of this piece reported so far. */
    readonly diagonals: readonly Diagonal[];
    /** The diagonals already in the drawing before this piece: those of the partition and of the earlier pieces. */
    readonly earlierDiagonals: readonly Diagonal[];
    /** Finished triangles so far: those of the earlier pieces and of this piece. */
    readonly triangles: readonly Triangle[];
    /** Finished triangles of this piece so far. */
    readonly pieceTriangles: number;
    /** True at the last step. */
    readonly done: boolean;
    /** Running predicate count of the monotone method up to this step. */
    readonly predicateCount: number;
}

export interface TriangulationRun extends PartitionRun {
    /** The partition phase alone (task 16's run). */
    readonly partition: PartitionRun;
    /** The step of the partition's `done` event: the last step of the partition phase. */
    readonly boundary: number;
    /** True when the partition added no diagonal (the polygon was already y-monotone). */
    readonly alreadyMonotone: boolean;
    /** Number of pieces, and the vertex and triangle counts of piece `k` (from the kernel's lists). */
    readonly pieceCount: number;
    pieceSize(piece: number): number;
    /** All triangles of the finished triangulation (n - 2), and its diagonals (n - 3), as the kernel lists them. */
    readonly triangles: readonly Triangle[];
    readonly allDiagonals: readonly Diagonal[];
    /** Total `predicateCount` of the monotone method and of ear clipping, from the kernel. Null for a refused input. */
    readonly counts: {readonly monotone: number; readonly earClipping: number} | null;
    /** `null` for a partition step, else the piece of the triangulation step. */
    pieceAt(step: number): number | null;
    triangulationEvent(step: number): TriangulationEventInfo | undefined;
    triangulationView(step: number): TriangulationView | undefined;
}

interface Step {
    readonly piece: number;
    readonly local: number;
}

interface PieceData {
    readonly result: MonotoneTriangulation;
    /** `ready[j]` is the local trace index at which the j-th triangle of the kernel list is finished. */
    readonly ready: readonly number[];
}

/** Local trace index at which each triangle of the piece is finished, read off the event kinds. */
function finishedTriangles(result: MonotoneTriangulation): number[] {
    const ready: number[] = [];
    let removes = 0;
    result.trace.forEach((event, index) => {
        if (event.kind === "pop") removes = 0;
        if (event.kind !== "status-remove") return;
        removes++;
        if (removes > 1) ready.push(result.trace[index + 1]?.kind === "report" ? index + 1 : index);
    });
    if (ready.length !== result.triangles.length) {
        throw new Error(`the trace finishes ${ready.length} triangles but the kernel lists ${result.triangles.length}`);
    }
    return ready;
}

const NO_COUNTS = null;

function emptyTriangulationRun(partition: PartitionRun): TriangulationRun {
    return {
        ...partition, partition, boundary: 0, alreadyMonotone: false, pieceCount: 0, pieceSize: () => 0, triangles: [], allDiagonals: [],
        counts: NO_COUNTS, pieceAt: () => null, triangulationEvent: () => undefined, triangulationView: () => undefined,
    };
}

function runOf(vertices: readonly GridPoint[], outcome: PartitionAndTriangulation): TriangulationRun {
    const partition = partitionRunOf(vertices, outcome.partition);
    const boundary = partition.length - 1;
    const steps: Step[] = Array.from({length: partition.length}, (_, local) => ({piece: -1, local}));
    const pieces: PieceData[] = outcome.pieces.map(({result}) => ({result, ready: finishedTriangles(result)}));
    pieces.forEach(({result}, piece) => {
        const last = piece === pieces.length - 1;
        const end = last ? result.trace.length - 1 : result.trace.length - 2;
        for (let local = 1; local <= end; local++) steps.push({piece, local});
    });
    const length = steps.length;
    const clamp = (step: number) => (Number.isFinite(step) ? Math.min(Math.max(Math.trunc(step), 0), length - 1) : 0);
    const stepAt = (raw: number): Step => steps[clamp(raw)];
    const views = new Map<number, TriangulationView>();

    const triangulationEvent = (raw: number): TriangulationEventInfo | undefined => {
        const {piece, local} = stepAt(raw);
        if (piece < 0) return undefined;
        const {result} = pieces[piece];
        const event = result.trace[local];
        const payload = event.payload;
        const size = () => sweepStateAt(result.trace, local).status.length;
        if (event.kind === "pop" && "id" in payload) {
            return {note: "pop", vertex: payload.id, chain: result.chains[result.order.indexOf(payload.id)]};
        }
        if (event.kind === "status-insert" && "id" in payload) return {note: "push", vertex: payload.id, stackSize: size()};
        if (event.kind === "status-remove" && "id" in payload) return {note: "unstack", vertex: payload.id, stackSize: size()};
        if (event.kind === "neighbour-test" && "outcome" in payload) {
            return {note: "test", test: {a: payload.a, b: payload.b, outcome: payload.outcome === "visible" ? "visible" : "blocked"}};
        }
        if (event.kind === "report" && "item" in payload) return {note: "diagonal", diagonal: payload.item};
        return {note: "done"};
    };

    const triangulationView = (raw: number): TriangulationView | undefined => {
        const index = clamp(raw);
        const {piece, local} = steps[index];
        if (piece < 0) return undefined;
        const cached = views.get(index);
        if (cached) return cached;
        const {result, ready} = pieces[piece];
        const state = sweepStateAt(result.trace, local);
        let popped: number | null = null;
        for (let k = 0; k <= local; k++) {
            const payload = result.trace[k].payload;
            if (result.trace[k].kind === "pop" && "id" in payload) popped = payload.id;
        }
        const earlier = pieces.slice(0, piece).flatMap(entry => entry.result.triangles);
        const own = ready.filter(at => at <= local).length;
        const info = triangulationEvent(index);
        const built: TriangulationView = {
            piece, cycle: result.piece, order: result.order, chains: result.chains, vertex: popped,
            chain: popped === null ? null : result.chains[result.order.indexOf(popped)],
            stack: state.status, test: info?.note === "test" && info.test ? info.test : null, diagonals: state.output,
            earlierDiagonals: [...outcome.partition.diagonals, ...pieces.slice(0, piece).flatMap(entry => entry.result.diagonals)],
            triangles: [...earlier, ...result.triangles.slice(0, own)], pieceTriangles: own, done: index === length - 1,
            predicateCount: outcome.trace[outcome.offsets.pieces[piece] + local].predicateCount,
        };
        views.set(index, built);
        return built;
    };

    return {
        ...partition, length, clamp, partition, boundary, alreadyMonotone: outcome.partition.diagonals.length === 0,
        event: raw => (stepAt(raw).piece < 0 ? partition.event(raw) : undefined),
        view: raw => partition.view(Math.min(clamp(raw), boundary)),
        pieceCount: pieces.length, pieceSize: piece => pieces[piece]?.result.piece.length ?? 0,
        triangles: outcome.triangles, allDiagonals: outcome.diagonals, counts: outcome.counts,
        pieceAt: raw => { const {piece} = stepAt(raw); return piece < 0 ? null : piece; },
        triangulationEvent, triangulationView,
    };
}

/** Builds the run of `vertices`. Never throws on input: a refused polygon gives an empty run that carries the refusal. */
export function runMonotoneTriangulation(vertices: readonly GridPoint[]): TriangulationRun {
    const outcome = partitionAndTriangulate(vertices);
    return outcome.ok ? runOf(vertices, outcome) : emptyTriangulationRun(runMonotonePartition(vertices));
}
