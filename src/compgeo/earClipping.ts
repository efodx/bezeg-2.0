import {assertGridPoint, type GridPoint} from './grid';
import {HULL_TRACE_MAX_POINTS} from './hullInput';
import {orient, polygonSimplicity} from './predicates';
import {doubledSignedArea} from './polygonMeasures';
import {stateAt, type Trace, type TraceEvent} from './trace';

export const EAR_CLIPPING_MAX_VERTICES = HULL_TRACE_MAX_POINTS;

export type EarClippingKind = 'phase' | 'test' | 'accept' | 'output' | 'done';
export type EarClippingNote =
    | 'phase-start' | 'test-reflex' | 'test-blocked' | 'test-ear' | 'accept-ear' | 'output-ear'
    | 'output-last-triangle' | 'done-triangulated';
export type EarClippingRefusal = 'fewer-than-three' | 'not-simple' | 'zero-area' | 'collinear-vertices';

export interface EarClippingPayload {
    /** `phase`: the counter-clockwise cycle. `test`/`accept`/`output`: [previous, apex, next] input indices. Else empty. */
    readonly points: readonly number[];
    /** `test` only: whether the apex is an ear. */
    readonly ear?: boolean;
    /** `test` only, rejected: 'reflex' (orient <= 0) or the first remaining vertex in the closed triangle. */
    readonly rejected?: 'reflex' | number;
}

export type EarClippingEvent = TraceEvent<EarClippingKind, EarClippingPayload>;
export type EarClippingTrace = Trace<EarClippingKind, EarClippingPayload>;
export type EarTriangle = readonly [number, number, number];

export type EarClippingOutcome =
    | { readonly ok: false; readonly reason: EarClippingRefusal }
    | {
    readonly ok: true;
    /** True when the input was clockwise and clipped in reversed order; indices still refer to the input. */
    readonly reversed: boolean;
    readonly trace: EarClippingTrace;
    /** n - 2 triangles in clipping order, each counter-clockwise, as input indices. */
    readonly triangles: readonly EarTriangle[];
};

/**
 * Ear clipping as a step trace. Refusals (in this order): fewer than three vertices, non-simple, zero area, an
 * `orient` of 0 at any vertex. Throws RangeError for non-grid points or more than 40 vertices. A clockwise polygon is
 * reversed first. Ear rule: scan the remaining counter-clockwise cycle from its lowest remaining input index; the
 * apex v_j with neighbours v_i, v_l is an ear when orient(v_i, v_j, v_l) > 0 and no other remaining vertex lies in
 * the closed triangle (boundary blocks). Clip the first ear, then rescan from the lowest remaining index. With three
 * left, output the last triangle and finish.
 *
 * Events: `phase` (cycle), then per candidate `test`, per clip `accept` and `output`, finally `output` (last
 * triangle) and `done`. `predicateCount` counts `orient` calls (blocking checks short-circuit).
 */
export function earClippingTrace(vertices: readonly GridPoint[]): EarClippingOutcome {
    if (vertices.length > EAR_CLIPPING_MAX_VERTICES) {
        throw new RangeError(`at most ${EAR_CLIPPING_MAX_VERTICES} vertices are supported`);
    }
    vertices.forEach((v, i) => assertGridPoint(v, `vertices[${i}]`));
    const n = vertices.length;
    if (n < 3) return {ok: false, reason: 'fewer-than-three'};
    if (!polygonSimplicity(vertices, true).simple) return {ok: false, reason: 'not-simple'};
    const area = doubledSignedArea(vertices);
    if (area === 0n) return {ok: false, reason: 'zero-area'};
    for (let i = 0; i < n; i++) {
        if (orient(vertices[(i + n - 1) % n], vertices[i], vertices[(i + 1) % n]) === 0) {
            return {ok: false, reason: 'collinear-vertices'};
        }
    }
    const reversed = area < 0n;
    const cycle = vertices.map((_, i) => i);
    if (reversed) cycle.reverse();

    const events: EarClippingEvent[] = [];
    const triangles: EarTriangle[] = [];
    let count = 0;
    const push = (kind: EarClippingKind, noteKey: EarClippingNote, payload: EarClippingPayload) => {
        events.push(Object.freeze({kind, noteKey, payload: Object.freeze(payload), predicateCount: count}));
    };
    const o = (a: number, b: number, c: number) => {
        count++;
        return orient(vertices[a], vertices[b], vertices[c]);
    };

    let remaining = cycle;
    push('phase', 'phase-start', {points: Object.freeze([...remaining])});
    while (remaining.length > 3) {
        const m = remaining.length;
        const lowest = remaining.indexOf(Math.min(...remaining));
        let clipped = false;
        for (let k = 0; k < m && !clipped; k++) {
            const pos = (lowest + k) % m;
            const i = remaining[(pos + m - 1) % m];
            const j = remaining[pos];
            const l = remaining[(pos + 1) % m];
            const tri = Object.freeze([i, j, l]);
            if (o(i, j, l) <= 0) {
                push('test', 'test-reflex', {points: tri, ear: false, rejected: 'reflex'});
                continue;
            }
            const blocker = remaining.find((p) =>
                p !== i && p !== j && p !== l && o(i, j, p) >= 0 && o(j, l, p) >= 0 && o(l, i, p) >= 0);
            if (blocker !== undefined) {
                push('test', 'test-blocked', {points: tri, ear: false, rejected: blocker});
                continue;
            }
            push('test', 'test-ear', {points: tri, ear: true});
            push('accept', 'accept-ear', {points: tri});
            push('output', 'output-ear', {points: tri});
            triangles.push([i, j, l]);
            remaining = remaining.filter((p) => p !== j);
            clipped = true;
        }
        if (!clipped) throw new Error('ear clipping found no ear; the two-ears theorem was violated');
    }
    const last: EarTriangle = [remaining[0], remaining[1], remaining[2]];
    triangles.push(last);
    push('output', 'output-last-triangle', {points: last});
    push('done', 'done-triangulated', {points: []});
    return {ok: true, reversed, trace: Object.freeze(events), triangles: Object.freeze(triangles)};
}

export interface EarClippingState {
    /** Triangles clipped so far (input indices). */
    readonly triangles: readonly EarTriangle[];
    /** The remaining cycle, counter-clockwise. */
    readonly remaining: readonly number[];
    /** Payload of the current candidate test, cleared by the next accept or output. */
    readonly candidate: EarClippingPayload | null;
    readonly done: boolean;
}

export const EAR_CLIPPING_INITIAL_STATE: EarClippingState = Object.freeze({
    triangles: Object.freeze([]), remaining: Object.freeze([]), candidate: null, done: false,
});

/** Pure fold step. */
export function foldEarClipping(state: EarClippingState, event: EarClippingEvent): EarClippingState {
    const {kind, payload} = event;
    switch (kind) {
        case 'phase':
            return {...state, remaining: payload.points};
        case 'test':
            return {...state, candidate: payload};
        case 'accept':
            return {...state, candidate: null, remaining: state.remaining.filter((p) => p !== payload.points[1])};
        case 'output': {
            const [a, b, c] = payload.points;
            const triangles = Object.freeze([...state.triangles, [a, b, c] as const]);
            return {
                ...state, triangles, candidate: null,
                remaining: event.noteKey === 'output-last-triangle' ? Object.freeze([]) : state.remaining,
            };
        }
        case 'done':
            return {...state, done: true};
        default:
            return state;
    }
}

export function earClippingStateAt(trace: EarClippingTrace, index: number): EarClippingState {
    return stateAt(trace, index, foldEarClipping, EAR_CLIPPING_INITIAL_STATE);
}

/**
 * Colours 0, 1, 2 for the n vertices of a triangulation by walking the dual tree from the last triangle; each
 * triangle receives three distinct colours. Triangles sharing two vertices are dual neighbours. Throws when the
 * triangles are not a connected triangulation covering every vertex.
 */
export function threeColouring(triangles: readonly EarTriangle[], n: number): readonly number[] {
    const colours: number[] = new Array<number>(n).fill(-1);
    if (triangles.length === 0) return Object.freeze(colours);
    const visited = new Array<boolean>(triangles.length).fill(false);
    const first = triangles.length - 1;
    triangles[first].forEach((v, c) => {
        colours[v] = c;
    });
    visited[first] = true;
    const queue = [first];
    for (let head = 0; head < queue.length; head++) {
        const t = triangles[queue[head]];
        triangles.forEach((u, idx) => {
            if (visited[idx]) return;
            const shared = u.filter((v) => t.includes(v));
            if (shared.length !== 2) return;
            const fresh = u.find((v) => !shared.includes(v));
            const free = [0, 1, 2].find((c) => !shared.some((v) => colours[v] === c));
            if (fresh === undefined || free === undefined) return;
            colours[fresh] = free;
            visited[idx] = true;
            queue.push(idx);
        });
    }
    if (colours.some((c) => c < 0)) throw new Error('triangles are not a connected triangulation of all vertices');
    return Object.freeze(colours);
}

/** The smallest colour class (ties: lowest colour): its colour and its vertex indices, ascending. */
export function guardClass(colours: readonly number[]): { readonly colour: number; readonly vertices: readonly number[] } {
    let best = 0;
    let bestSize = Infinity;
    for (const colour of [0, 1, 2]) {
        const size = colours.filter((c) => c === colour).length;
        if (size < bestSize) {
            best = colour;
            bestSize = size;
        }
    }
    return {colour: best, vertices: colours.flatMap((c, v) => (c === best ? [v] : []))};
}

/** The triangles containing `vertex`: exactly what a guard standing there sees. */
export function guardView(triangles: readonly EarTriangle[], vertex: number): readonly EarTriangle[] {
    return triangles.filter((t) => t.includes(vertex));
}
