/**
 * Monotone triangulation kernel (spec C4, dBCKO 3.3 `TriangulateMonotonePolygon`). A y-monotone polygon (or one piece
 * of a monotone partition, given as input indices) is swept downwards in the order of task 14 (decreasing y, ties by
 * increasing x); vertex p is *below* q when it comes later. In that order u_1 is the top and u_m the bottom vertex;
 * going counter-clockwise from the top to the bottom is the *left* chain, the rest the *right* chain. Every index in
 * the output is an input index. No double is compared: the order is an integer comparison and every visibility
 * decision is the sign of one `orient`.
 *
 * The stack is the sweep state's `status` list, bottom to top, so `sweepStateAt` folds it with no new event kind: a
 * push is a `status-insert` at the end, a pop a `status-remove`. u_1 and u_2 are pushed. For u_3 .. u_(m-1) (the top
 * of the stack is u_(j-1)): on the other chain than the top of the stack, every stack vertex is popped, a diagonal
 * goes to each popped vertex except the last (the bottom of the stack), and u_(j-1) and u_j are pushed. On the same
 * chain, the top is popped, then further vertices as long as the diagonal from u_j is inside, and the last popped
 * vertex and u_j are pushed. Each such visibility test is a `neighbour-test` between u_j and the next stack vertex s,
 * outcome `visible` or `blocked`; with l the last popped vertex, it is visible when orient(s, l, u_j) > 0 on the left
 * chain and orient(u_j, l, s) > 0 on the right chain (a strict convex turn at l), one `orient` per test. For u_m all
 * stack vertices are popped with diagonals to all but the first and last popped, and nothing is pushed: the stack is
 * empty at `done`.
 *
 * Trace for m vertices and T visibility tests: `phase`, per vertex a `pop` (event id = input vertex index; its note
 * key is `monotoneTri.pop.<top|left|right|bottom>`), 2m-4 `status-insert` and as many `status-remove` events, the T
 * `neighbour-test` events, the m-3 `report` events (each diagonal is the item [i, j] with i < j), then `done`:
 * 6m - 9 + T events. `predicateCount` is the running number of `orient` calls, so it equals T at `done`. The m-2
 * triangles are counter-clockwise triples of input indices.
 *
 * `partitionAndTriangulate` runs the monotone partition of task 14 and then this kernel on each piece. The comparison
 * counts are totals of `predicateCount` over the traces; on small inputs they illustrate the growth of the two
 * methods, they do not prove it. Pure TypeScript.
 */
import type {GridPoint} from '../grid';
import {orient, polygonSimplicity} from '../predicates';
import {doubledSignedArea} from '../polygonMeasures';
import {RationalPoint} from '../rational';
import {earClippingTrace} from '../earClipping';
import {checkSweepPoints, SWEEP_MAX_POLYGON_VERTICES} from './limits';
import {
    type Diagonal,
    isYMonotone,
    monotonePartitionTrace,
    type MonotonePartition,
    type MonotoneRefusal,
    type MonotoneRefused,
} from './monotonePartition';
import {type SweepEvent, sweepEvent, type SweepTrace} from './sweepTrace';

export type Chain = 'top' | 'left' | 'right' | 'bottom';

/** A counter-clockwise triple of input vertex indices. */
export type Triangle = readonly [number, number, number];

export type MonotoneTriangulationRefusal = MonotoneRefusal | 'not-monotone';

/** `index` and `edges` as in `MonotoneRefused`. */
export interface MonotoneTriangulationRefused {
    readonly ok: false;
    readonly reason: MonotoneTriangulationRefusal;
    readonly index?: number;
    readonly edges?: readonly [number, number];
}

export interface MonotoneTriangulation {
    readonly ok: true;
    /** The triangulated cycle: counter-clockwise input indices starting at the top vertex. */
    readonly piece: readonly number[];
    /** The piece's vertices in processing order: the `pop` events' ids. */
    readonly order: readonly number[];
    /** `chains[k]` is the chain of `order[k]`: `top` first, `bottom` last, the others `left` or `right`. */
    readonly chains: readonly Chain[];
    readonly trace: SweepTrace<Diagonal>;
    /** In the order they are reported; m - 3 of them. */
    readonly diagonals: readonly Diagonal[];
    /** m - 2 triangles, each in the cyclic order of the piece, as input indices. */
    readonly triangles: readonly Triangle[];
}

export type MonotoneTriangulationOutcome = MonotoneTriangulation | MonotoneTriangulationRefused;

/** The refusals of task 14 for the polygon itself, in its order; null when the polygon is acceptable. */
function polygonRefusal(vertices: readonly GridPoint[]): MonotoneRefused | null {
    const n = vertices.length;
    if (n < 3) return {ok: false, reason: 'fewer-than-three'};
    if (n > SWEEP_MAX_POLYGON_VERTICES) return {ok: false, reason: 'too-many'};
    const input = checkSweepPoints(vertices);
    if (!input.ok) return {ok: false, reason: input.reason, index: input.index};
    const simplicity = polygonSimplicity(vertices, true);
    if (!simplicity.simple) return {ok: false, reason: 'not-simple', edges: simplicity.edges};
    for (let i = 0; i < n; i++) {
        if (orient(vertices[(i + n - 1) % n], vertices[i], vertices[(i + 1) % n]) === 0) {
            return {ok: false, reason: 'collinear-vertices', index: i};
        }
    }
    return null;
}

/** True when p is processed before q: decreasing y, ties by increasing x (integer comparison, exact). */
const processedBefore = (p: GridPoint, q: GridPoint): boolean => p.y > q.y || (p.y === q.y && p.x < q.x);

/**
 * Triangulates a y-monotone polygon, or the piece `piece` of it (distinct input indices of one cycle of the polygon,
 * in either direction; a clockwise piece is reversed). Refusals: those of `monotonePartitionTrace` for the polygon
 * itself, then `not-monotone` when `isYMonotone` fails for the cycle. Throws a RangeError for a `piece` that is not
 * a list of distinct input indices.
 */
export function monotoneTriangulationTrace(
    vertices: readonly GridPoint[],
    piece?: readonly number[],
): MonotoneTriangulationOutcome {
    const refusal = polygonRefusal(vertices);
    if (refusal) return refusal;
    let cycle: number[];
    if (piece === undefined) {
        cycle = vertices.map((_, i) => i);
    } else {
        const distinct = new Set(piece);
        if (distinct.size !== piece.length || piece.some((i) => !Number.isInteger(i) || i < 0 || i >= vertices.length)) {
            throw new RangeError('piece must list distinct input vertex indices');
        }
        cycle = [...piece];
    }
    if (cycle.length >= 3 && doubledSignedArea(cycle.map((i) => vertices[i])) < 0n) cycle.reverse();
    if (!isYMonotone(cycle, vertices)) return {ok: false, reason: 'not-monotone'};

    const m = cycle.length;
    let top = 0;
    cycle.forEach((v, k) => {
        if (processedBefore(vertices[v], vertices[cycle[top]])) top = k;
    });
    cycle = [...cycle.slice(top), ...cycle.slice(0, top)];
    const position = new Map<number, number>(cycle.map((v, k) => [v, k]));
    const order = [...cycle].sort((p, q) => (processedBefore(vertices[p], vertices[q]) ? -1 : 1));
    const bottomPosition = position.get(order[m - 1]) ?? 0;
    const chains: Chain[] = order.map((v, k) => {
        if (k === 0) return 'top';
        if (k === m - 1) return 'bottom';
        return (position.get(v) ?? 0) < bottomPosition ? 'left' : 'right';
    });
    const chainOf = new Map<number, Chain>(order.map((v, k) => [v, chains[k]]));

    const events: SweepEvent<Diagonal>[] = [];
    const diagonals: Diagonal[] = [];
    const triangles: Triangle[] = [];
    const stack: number[] = [];
    let calls = 0;
    const emit = (event: SweepEvent<Diagonal>) => events.push(event);
    const push = (v: number) => {
        emit(sweepEvent('status-insert', {id: v, index: stack.length}, calls, 'monotoneTri.push'));
        stack.push(v);
    };
    const pop = (): number => {
        const v = stack.pop();
        if (v === undefined) throw new Error('monotone triangulation popped an empty stack');
        emit(sweepEvent('status-remove', {id: v}, calls, 'monotoneTri.pop'));
        return v;
    };
    const diagonal = (a: number, b: number) => {
        const item: Diagonal = a < b ? [a, b] : [b, a];
        diagonals.push(item);
        emit(sweepEvent('report', {item}, calls, 'monotoneTri.diagonal'));
    };
    const triangle = (a: number, b: number, c: number) => {
        const sorted = [a, b, c].sort((p, q) => (position.get(p) ?? 0) - (position.get(q) ?? 0));
        triangles.push([sorted[0], sorted[1], sorted[2]]);
    };

    emit(sweepEvent('phase', {phase: 'start'}, calls, 'monotoneTri.phase'));
    for (let k = 0; k < m; k++) {
        const v = order[k];
        emit(sweepEvent('pop', {id: v, position: RationalPoint.fromGrid(vertices[v])}, calls,
            `monotoneTri.pop.${chains[k]}`));
        if (k < 2) {
            push(v);
        } else if (k === m - 1) {
            // The bottom vertex: the top and the bottom of the stack are adjacent to it, the others get diagonals.
            let previous = pop();
            while (stack.length > 0) {
                const s = pop();
                if (stack.length > 0) diagonal(v, s);
                triangle(v, previous, s);
                previous = s;
            }
        } else if (chains[k] !== chainOf.get(stack[stack.length - 1])) {
            // Other chain: all of the stack is visible; the last popped vertex (the bottom) is adjacent to v.
            const topOfStack = stack[stack.length - 1];
            let previous = pop();
            diagonal(v, previous);
            while (stack.length > 0) {
                const s = pop();
                if (stack.length > 0) diagonal(v, s);
                triangle(v, previous, s);
                previous = s;
            }
            push(topOfStack);
            push(v);
        } else {
            // Same chain: pop while the diagonal from v to the next stack vertex lies inside the polygon.
            let last = pop();
            while (stack.length > 0) {
                const s = stack[stack.length - 1];
                calls++;
                const turn = chains[k] === 'left'
                    ? orient(vertices[s], vertices[last], vertices[v])
                    : orient(vertices[v], vertices[last], vertices[s]);
                const visible = turn > 0;
                emit(sweepEvent('neighbour-test', {a: v, b: s, outcome: visible ? 'visible' : 'blocked'}, calls,
                    visible ? 'monotoneTri.visible' : 'monotoneTri.blocked'));
                if (!visible) break;
                pop();
                diagonal(v, s);
                triangle(s, last, v);
                last = s;
            }
            push(last);
            push(v);
        }
    }
    emit(sweepEvent('done', {}, calls, 'monotoneTri.done'));

    return {
        ok: true,
        piece: Object.freeze(cycle),
        order: Object.freeze(order),
        chains: Object.freeze(chains),
        trace: Object.freeze(events.map((event) => Object.freeze(event))),
        diagonals: Object.freeze(diagonals),
        triangles: Object.freeze(triangles.map((t) => Object.freeze(t))),
    };
}

export interface PartitionAndTriangulation {
    readonly ok: true;
    readonly partition: MonotonePartition;
    /** In the order task 14 lists the pieces. */
    readonly pieces: readonly { readonly piece: readonly number[]; readonly result: MonotoneTriangulation }[];
    /**
     * The partition trace followed by each piece's trace, in one sequence; `predicateCount` runs on from the previous
     * trace, so the last event's count is `counts.monotone`. Each segment keeps its own `phase` and `done`.
     */
    readonly trace: SweepTrace<Diagonal>;
    /** Index in `trace` of the first event of the partition (0) and of each piece, in `pieces` order. */
    readonly offsets: { readonly partition: number; readonly pieces: readonly number[] };
    /** Counter-clockwise triangles of the whole polygon, piece by piece; n - 2 of them. */
    readonly triangles: readonly Triangle[];
    /** The partition's diagonals, then each piece's; n - 3 of them. */
    readonly diagonals: readonly Diagonal[];
    /** Total `predicateCount` of the partition and all piece traces, and of `earClippingTrace` on the same polygon. */
    readonly counts: { readonly monotone: number; readonly earClipping: number };
}

export type PartitionAndTriangulationOutcome = PartitionAndTriangulation | MonotoneRefused;

/** Predicate count at the end of a trace (0 for an empty one). */
function finalCount(trace: SweepTrace<Diagonal>): number {
    return trace.length > 0 ? trace[trace.length - 1].predicateCount : 0;
}

/**
 * Monotone partition first (a monotone input gives no diagonal and one piece), then the triangulation of every piece;
 * returns the refusal of `monotonePartitionTrace` for an unacceptable polygon.
 */
export function partitionAndTriangulate(vertices: readonly GridPoint[]): PartitionAndTriangulationOutcome {
    const partition = monotonePartitionTrace(vertices);
    if (!partition.ok) return partition;
    const pieces = partition.pieces.map((piece) => {
        const result = monotoneTriangulationTrace(vertices, piece);
        if (!result.ok) throw new Error(`a piece of the partition was refused: ${result.reason}`);
        return {piece, result};
    });
    const events: SweepEvent<Diagonal>[] = [...partition.trace];
    const offsets: number[] = [];
    let base = finalCount(partition.trace);
    for (const {result} of pieces) {
        offsets.push(events.length);
        for (const event of result.trace) events.push(Object.freeze({...event, predicateCount: base + event.predicateCount}));
        base += finalCount(result.trace);
    }
    const ear = earClippingTrace(vertices);
    if (!ear.ok) throw new Error(`ear clipping refused a valid polygon: ${ear.reason}`);
    const earTrace = ear.trace;
    return {
        ok: true,
        partition,
        pieces: Object.freeze(pieces.map((entry) => Object.freeze(entry))),
        trace: Object.freeze(events),
        offsets: Object.freeze({partition: 0, pieces: Object.freeze(offsets)}),
        triangles: Object.freeze(pieces.flatMap(({result}) => result.triangles)),
        diagonals: Object.freeze([...partition.diagonals, ...pieces.flatMap(({result}) => result.diagonals)]),
        counts: Object.freeze({
            monotone: base,
            earClipping: earTrace.length > 0 ? earTrace[earTrace.length - 1].predicateCount : 0,
        }),
    };
}
