/**
 * Monotone partition kernel (spec C3, dBCKO 3.2 `MakeMonotone`). A simple polygon is swept downwards: events are the
 * vertices in the family order (decreasing y, ties by increasing x, through `compareEventPositions`), and vertex p is
 * *below* q when it comes later in that order. The tie rule is the symbolic shear y - eps*x: every decision below is
 * `orient`, which the shear leaves unchanged, or a comparison of ranks, so no double is compared and no case for
 * horizontal edges exists.
 *
 * A clockwise polygon is processed as its counter-clockwise reversal (as `earClippingTrace` does); every index in
 * the output is an input index. With succ(i) the counter-clockwise successor of vertex i, edge e_i runs from i to
 * succ(i). The status holds the edges with the interior to their right ("left edges": tail processed before head),
 * left to right, by edge id; the position of a vertex against a status edge is the sign of one `orient`, exact.
 *
 * Vertex types (orient(pred, v, succ) > 0 means a convex interior angle): start/split have both neighbours below
 * (convex/reflex), end/merge both above (convex/reflex), regular otherwise. Helpers follow dBCKO: a start vertex, a
 * split vertex and a regular vertex on the left boundary become the helper of the edge they start; the edge directly
 * left of a split, merge or right-boundary regular vertex gets that vertex as helper. A diagonal goes to the helper
 * whenever the helper is a merge vertex, and always for a split vertex.
 *
 * Trace for n vertices, d diagonals and L left edges (edges whose tail is processed before their head):
 * `phase`, then per vertex a `pop` (event id = input vertex index; its note key is `monotone.pop.<type>`), the
 * `status-insert` and `status-remove` events (L each) and the `report` events (d), then `done`: n + 2L + d + 2.
 * Per vertex the order is: diagonal to the helper of the incoming edge, `status-remove` of the incoming edge,
 * diagonal to the helper of the left edge, `status-insert` of the outgoing edge. A diagonal is the item [i, j] with
 * i < j. `predicateCount` is the running number of `orient` calls: one per vertex for its classification (counted at
 * its `pop`) and one per exact edge comparison of a status search; a comparison made by a search that emits no event
 * is counted on the next event. Pure TypeScript.
 */
import type {GridPoint} from '../grid';
import {orient, polygonSimplicity} from '../predicates';
import {doubledSignedArea} from '../polygonMeasures';
import {RationalPoint} from '../rational';
import {compareEventPositions} from './eventOrder';
import {checkSweepPoints, SWEEP_MAX_POLYGON_VERTICES, type SweepInputRefusal} from './limits';
import {type SweepEvent, sweepEventBuilder, type SweepState, sweepStateAt, type SweepTrace} from './sweepTrace';

/** Note keys of the monotone partition trace; `pop` carries the vertex type. */
export type MonotonePartitionNote =
    | 'monotone.phase' | 'monotone.diagonal' | 'monotone.insert' | 'monotone.remove' | 'monotone.done'
    | `monotone.pop.${VertexType}`;
export type MonotonePartitionEvent = SweepEvent<Diagonal, MonotonePartitionNote>;
export type MonotonePartitionTrace = SweepTrace<Diagonal, MonotonePartitionNote>;
const sweepEvent = sweepEventBuilder<Diagonal, MonotonePartitionNote>();

export type VertexType = 'start' | 'end' | 'split' | 'merge' | 'regular';

/** A diagonal as input vertex indices, smaller first. */
export type Diagonal = readonly [number, number];

export type MonotoneRefusal = SweepInputRefusal | 'fewer-than-three' | 'too-many' | 'not-simple' | 'collinear-vertices';

/** `index`: the offending vertex (coordinate refusals, collinear); `edges`: the offending edge pair (not simple). */
export interface MonotoneRefused {
    readonly ok: false;
    readonly reason: MonotoneRefusal;
    readonly index?: number;
    readonly edges?: readonly [number, number];
}

/** `helper` became the helper of `edge` and holds after trace event `event` (the last event emitted before it). */
export interface HelperChange {
    readonly event: number;
    readonly edge: number;
    readonly helper: number;
}

export interface MonotonePartition {
    readonly ok: true;
    /** True when the input was clockwise; all indices still refer to the input. */
    readonly reversed: boolean;
    readonly trace: MonotonePartitionTrace;
    /** Vertex type per input index. */
    readonly types: readonly VertexType[];
    /** Vertex indices in processing order: the `pop` events' ids. */
    readonly order: readonly number[];
    /** In processing order. */
    readonly diagonals: readonly Diagonal[];
    /** Counter-clockwise input-index lists starting at their top vertex; sorted by top vertex in processing order. */
    readonly pieces: readonly (readonly number[])[];
    readonly helperChanges: readonly HelperChange[];
}

export type MonotoneOutcome = MonotonePartition | MonotoneRefused;

/** True when the polygon (valid, three or more vertices) is clockwise; the reversal is processed instead. */
function isClockwise(vertices: readonly GridPoint[]): boolean {
    return doubledSignedArea(vertices) < 0n;
}

/** Counter-clockwise neighbours of every input vertex: `succ[i]` follows i, `pred[i]` precedes it. */
function neighbours(n: number, reversed: boolean): { pred: number[]; succ: number[] } {
    const pred: number[] = [];
    const succ: number[] = [];
    for (let i = 0; i < n; i++) {
        pred.push(reversed ? (i + 1) % n : (i + n - 1) % n);
        succ.push(reversed ? (i + n - 1) % n : (i + 1) % n);
    }
    return {pred, succ};
}

/** Vertex indices in processing order, and `rank[i]` = position of vertex i in it. */
function processingOrder(vertices: readonly GridPoint[]): { order: number[]; rank: number[] } {
    const points = vertices.map((v) => RationalPoint.fromGrid(v));
    const order = vertices.map((_, i) => i).sort((a, b) => compareEventPositions(points[a], points[b]));
    const rank: number[] = [];
    order.forEach((v, k) => {
        rank[v] = k;
    });
    return {order, rank};
}

function classifyWith(
    pred: readonly number[],
    succ: readonly number[],
    rank: readonly number[],
    i: number,
    convex: boolean,
): VertexType {
    const before = rank[pred[i]] > rank[i];
    const after = rank[succ[i]] > rank[i];
    if (before && after) return convex ? 'start' : 'split';
    if (!before && !after) return convex ? 'end' : 'merge';
    return 'regular';
}

/**
 * Vertex types by input index. The polygon must be simple with at least three vertices and no three consecutive
 * collinear vertices; throws a RangeError for fewer than three vertices or a collinear vertex (the trace refuses
 * these before calling it). A clockwise polygon is classified as its reversal.
 */
export function classifyVertices(vertices: readonly GridPoint[]): VertexType[] {
    const n = vertices.length;
    if (n < 3) throw new RangeError('at least three vertices are required');
    const {pred, succ} = neighbours(n, isClockwise(vertices));
    const {rank} = processingOrder(vertices);
    return vertices.map((_, i) => {
        const turn = orient(vertices[pred[i]], vertices[i], vertices[succ[i]]);
        if (turn === 0) throw new RangeError(`vertex ${i} is collinear with its neighbours`);
        return classifyWith(pred, succ, rank, i, turn > 0);
    });
}

/**
 * Independent monotonicity check: walks the cycle of `piece` (input indices) and counts local maxima (both cycle
 * neighbours later in the processing order) and minima (both earlier); y-monotone means exactly one of each.
 * Uses its own integer comparison, not the classification code.
 */
export function isYMonotone(piece: readonly number[], vertices: readonly GridPoint[]): boolean {
    const m = piece.length;
    if (m < 3) return false;
    const later = (a: GridPoint, b: GridPoint) => a.y < b.y || (a.y === b.y && a.x > b.x); // a processed after b
    let maxima = 0;
    let minima = 0;
    for (let k = 0; k < m; k++) {
        const prev = vertices[piece[(k + m - 1) % m]];
        const cur = vertices[piece[k]];
        const next = vertices[piece[(k + 1) % m]];
        if (later(prev, cur) && later(next, cur)) maxima++;
        if (later(cur, prev) && later(cur, next)) minima++;
    }
    return maxima === 1 && minima === 1;
}

/** Splits the cycles along the diagonals (non-crossing, inside the polygon) into pieces; see `monotonePartitionTrace`. */
function buildPieces(
    cycle: readonly number[],
    diagonals: readonly Diagonal[],
    rank: readonly number[],
): number[][] {
    let pieces: number[][] = [[...cycle]];
    for (const [a, b] of diagonals) {
        // Two pieces share two vertices only along an existing edge, so the piece where a and b are not cyclic
        // neighbours is the one the new diagonal cuts.
        const at = pieces.findIndex((piece) => {
            const ia = piece.indexOf(a);
            const ib = piece.indexOf(b);
            if (ia < 0 || ib < 0) return false;
            const gap = Math.abs(ia - ib);
            return gap !== 1 && gap !== piece.length - 1;
        });
        if (at < 0) throw new Error(`diagonal ${a}-${b} does not cut a piece`);
        const piece = pieces[at];
        const ia = piece.indexOf(a);
        const ib = piece.indexOf(b);
        const walk = (from: number, to: number): number[] => {
            const part: number[] = [];
            for (let k = from; ; k = (k + 1) % piece.length) {
                part.push(piece[k]);
                if (k === to) return part;
            }
        };
        pieces = [...pieces.slice(0, at), walk(ia, ib), walk(ib, ia), ...pieces.slice(at + 1)];
    }
    const rotated = pieces.map((piece) => {
        let top = 0;
        piece.forEach((v, k) => {
            if (rank[v] < rank[piece[top]]) top = k;
        });
        return [...piece.slice(top), ...piece.slice(0, top)];
    });
    return rotated.sort((p, q) => {
        for (let k = 0; k < Math.min(p.length, q.length); k++) {
            if (rank[p[k]] !== rank[q[k]]) return rank[p[k]] - rank[q[k]];
        }
        return p.length - q.length;
    });
}

/**
 * Monotone partition as a sweep trace. Refusals, in this order, before any trace: fewer than three vertices,
 * more than `SWEEP_MAX_POLYGON_VERTICES`, coordinate refusals (`checkSweepPoints`, with the vertex index), a
 * non-simple polygon (`edges`), three consecutive collinear vertices (`index` names the middle vertex). Never clips or
 * repairs. The pieces are the faces of the polygon plus its diagonals.
 */
export function monotonePartitionTrace(vertices: readonly GridPoint[]): MonotoneOutcome {
    const n = vertices.length;
    if (n < 3) return {ok: false, reason: 'fewer-than-three'};
    if (n > SWEEP_MAX_POLYGON_VERTICES) return {ok: false, reason: 'too-many'};
    const input = checkSweepPoints(vertices);
    if (!input.ok) return {ok: false, reason: input.reason, index: input.index};
    const simplicity = polygonSimplicity(vertices, true);
    if (!simplicity.simple) return {ok: false, reason: 'not-simple', edges: simplicity.edges};
    const reversed = isClockwise(vertices);
    const {pred, succ} = neighbours(n, reversed);
    const convex: boolean[] = [];
    for (let i = 0; i < n; i++) {
        const turn = orient(vertices[pred[i]], vertices[i], vertices[succ[i]]);
        if (turn === 0) return {ok: false, reason: 'collinear-vertices', index: i};
        convex.push(turn > 0);
    }
    const {order, rank} = processingOrder(vertices);
    const types = vertices.map((_, i) => classifyWith(pred, succ, rank, i, convex[i]));

    const events: MonotonePartitionEvent[] = [];
    const diagonals: Diagonal[] = [];
    const helperChanges: HelperChange[] = [];
    const helper: number[] = [];
    const status: number[] = [];
    let calls = 0;
    const emit = (event: MonotonePartitionEvent) => events.push(event);
    const setHelper = (edge: number, vertex: number) => {
        helper[edge] = vertex;
        helperChanges.push({event: events.length - 1, edge, helper: vertex});
    };
    const diagonal = (v: number, h: number) => {
        const item: Diagonal = v < h ? [v, h] : [h, v];
        diagonals.push(item);
        emit(sweepEvent('report', {item}, calls, 'monotone.diagonal'));
    };
    const diagonalToMergeHelper = (v: number, edge: number) => {
        if (types[helper[edge]] === 'merge') diagonal(v, helper[edge]);
    };
    /** Number of status edges with vertex v to their right (binary search over the left-to-right status). */
    const edgesLeftOf = (v: number): number => {
        let lo = 0;
        let hi = status.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            const tail = status[mid]; // edge id = tail vertex
            calls++;
            if (orient(vertices[tail], vertices[succ[tail]], vertices[v]) > 0) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    };
    const leftEdge = (v: number): number => {
        const count = edgesLeftOf(v);
        if (count === 0) throw new Error(`no edge left of vertex ${v}`);
        return status[count - 1];
    };
    const insertEdge = (edge: number, index: number) => {
        status.splice(index, 0, edge);
        emit(sweepEvent('status-insert', {id: edge, index}, calls, 'monotone.insert'));
        setHelper(edge, edge);
    };
    const removeEdge = (edge: number) => {
        status.splice(status.indexOf(edge), 1);
        emit(sweepEvent('status-remove', {id: edge}, calls, 'monotone.remove'));
    };

    emit(sweepEvent('phase', {phase: 'start'}, calls, 'monotone.phase'));
    for (const v of order) {
        calls++; // the classification's orient
        emit(sweepEvent('pop', {id: v, position: RationalPoint.fromGrid(vertices[v])}, calls, `monotone.pop.${types[v]}`));
        const incoming = pred[v];
        if (types[v] === 'start') {
            insertEdge(v, edgesLeftOf(v));
        } else if (types[v] === 'end') {
            diagonalToMergeHelper(v, incoming);
            removeEdge(incoming);
        } else if (types[v] === 'split') {
            const count = edgesLeftOf(v);
            if (count === 0) throw new Error(`no edge left of vertex ${v}`);
            const left = status[count - 1];
            diagonal(v, helper[left]);
            setHelper(left, v);
            insertEdge(v, count);
        } else if (types[v] === 'merge') {
            diagonalToMergeHelper(v, incoming);
            removeEdge(incoming);
            const left = leftEdge(v);
            diagonalToMergeHelper(v, left);
            setHelper(left, v);
        } else if (rank[succ[v]] > rank[v]) { // regular, interior to the right: the boundary continues downwards
            const index = status.indexOf(incoming);
            diagonalToMergeHelper(v, incoming);
            removeEdge(incoming);
            insertEdge(v, index);
        } else { // regular, interior to the left
            const left = leftEdge(v);
            diagonalToMergeHelper(v, left);
            setHelper(left, v);
        }
    }
    emit(sweepEvent('done', {}, calls, 'monotone.done'));

    const cycle = vertices.map((_, i) => i);
    if (reversed) cycle.reverse();
    return {
        ok: true,
        reversed,
        trace: Object.freeze(events.map((event) => Object.freeze(event))),
        types: Object.freeze(types),
        order: Object.freeze(order),
        diagonals: Object.freeze(diagonals),
        pieces: Object.freeze(buildPieces(cycle, diagonals, rank).map((piece) => Object.freeze(piece))),
        helperChanges: Object.freeze(helperChanges),
    };
}

export interface PartitionState {
    /** Event queue (empty: the vertices are not scheduled), status as edge ids, diagonals so far, counters. */
    readonly sweep: SweepState<Diagonal>;
    /** Helper vertex of every status edge after the event, keyed by edge id. */
    readonly helpers: ReadonlyMap<number, number>;
    /** Vertex of the last `pop` at or before the index and its type; null before the first `pop`. */
    readonly vertex: { readonly index: number; readonly type: VertexType } | null;
}

/** Pure state after trace event `index` (clamped): `sweepStateAt`, the helper of each status edge, current vertex. */
export function partitionStateAt(result: MonotonePartition, index: number): PartitionState {
    const sweep = sweepStateAt(result.trace, index);
    const last = Math.min(Math.max(Math.trunc(index), 0), result.trace.length - 1);
    const helpers = new Map<number, number>();
    for (const change of result.helperChanges) {
        if (change.event <= last && sweep.status.includes(change.edge)) helpers.set(change.edge, change.helper);
    }
    let pops = 0;
    for (let k = 0; k <= last; k++) if (result.trace[k].kind === 'pop') pops++;
    const current = pops > 0 ? result.order[pops - 1] : null;
    const vertex = current === null ? null : {index: current, type: result.types[current]};
    return {sweep, helpers, vertex};
}
