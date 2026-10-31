/**
 * Delaunay triangulation by incremental insertion followed by Lawson flips as a step trace (spec
 * triangulation-voronoi-lessons.md "Delaunay construction" and B3; task triangulation-voronoi/04).
 *
 * Every decision uses the exact predicates `orient` and `incircle` (ADR 0021). Payloads hold point indices into the
 * input, never coordinates. Pure TypeScript: no React, JSXGraph, localization or graph state.
 */
import {assertGridPoint, type GridPoint} from './grid';
import {HULL_TRACE_MAX_POINTS} from './hullInput';
import {incircle, incircleValue, orient} from './predicates';
import {stateAt, type Trace, type TraceEvent} from './trace';
import {createTriangulation, edges, flip, type Triangulation, type TriangulationRefusal} from './triangulation';

export const DELAUNAY_MAX_POINTS = HULL_TRACE_MAX_POINTS;

export type DelaunayOutcome =
    | { readonly ok: true; readonly value: Triangulation }
    | { readonly ok: false; readonly refusal: TriangulationRefusal };

const lex = (points: readonly GridPoint[], p: number, q: number): number =>
    points[p].x - points[q].x || points[p].y - points[q].y;

function assertInput(points: readonly GridPoint[]): void {
    if (!Array.isArray(points)) throw new TypeError('points must be an array');
    if (points.length > DELAUNAY_MAX_POINTS) throw new RangeError(`at most ${DELAUNAY_MAX_POINTS} points are supported`);
    points.forEach((p, i) => assertGridPoint(p, `points[${i}]`));
}

/**
 * Incremental triangulation: points are inserted in lexicographic order of (x, y). The leading points collinear with
 * the first two form a chain; the first point off that line is joined to every chain segment. Each later point is
 * joined to every hull edge (counter-clockwise) it sees strictly (`orient(a, b, q) < 0`); a hull edge collinear with
 * the point is not joined, so no degenerate triangle arises. Refuses with 03's kinds `duplicate-point` and
 * `degenerate-points` (fewer than three points or all collinear). Throws RangeError for non-grid points or more than
 * 40 points. The triangulation is valid but in general not Delaunay.
 */
export function incrementalTriangulation(points: readonly GridPoint[]): DelaunayOutcome {
    assertInput(points);
    const n = points.length;
    const order = points.map((_, i) => i).sort((p, q) => lex(points, p, q));
    for (let i = 0; i + 1 < n; i++) {
        if (lex(points, order[i], order[i + 1]) === 0) {
            const indices: readonly [number, number] = [Math.min(order[i], order[i + 1]), Math.max(order[i], order[i + 1])];
            return {ok: false, refusal: {kind: 'duplicate-point', indices}};
        }
    }
    if (n < 3) return {ok: false, refusal: {kind: 'degenerate-points'}};
    let chainLength = 2;
    while (chainLength < n && orient(points[order[0]], points[order[1]], points[order[chainLength]]) === 0) chainLength++;
    if (chainLength === n) return {ok: false, refusal: {kind: 'degenerate-points'}};

    const chain = order.slice(0, chainLength);
    const apex = order[chainLength];
    const triangles: number[][] = [];
    for (let i = 0; i + 1 < chainLength; i++) {
        const [a, b] = [chain[i], chain[i + 1]];
        triangles.push(orient(points[a], points[b], points[apex]) > 0 ? [a, b, apex] : [b, a, apex]);
    }
    // Hull boundary counter-clockwise, collinear boundary points included.
    let cycle = orient(points[chain[0]], points[chain[chainLength - 1]], points[apex]) > 0
        ? [...chain, apex]
        : [...[...chain].reverse(), apex];

    for (let k = chainLength + 1; k < n; k++) {
        const q = order[k];
        const m = cycle.length;
        const sees = cycle.map((a, i) => orient(points[a], points[cycle[(i + 1) % m]], points[q]) < 0);
        let start = -1;
        for (let i = 0; i < m; i++) if (sees[i] && !sees[(i + m - 1) % m]) start = i;
        if (start < 0) throw new Error('internal error: a new lexicographic maximum sees no hull edge strictly');
        let end = start;
        while (sees[(end + 1) % m]) end++;
        // Visible edge a -> b has q strictly on its right, so (a, q, b) is counter-clockwise.
        for (let i = start; i <= end; i++) triangles.push([cycle[i % m], q, cycle[(i + 1) % m]]);
        // The new cycle drops the vertices strictly inside the visible arc and puts q between its ends.
        const next: number[] = [];
        for (let i = end + 1; i <= start + m; i++) next.push(cycle[i % m]);
        next.push(q);
        cycle = next;
    }
    const result = createTriangulation(points, triangles);
    if (!result.ok) throw new Error(`internal error: incremental triangulation refused (${result.refusal.kind})`);
    return {ok: true, value: result.value};
}

export type LawsonKind = 'phase' | 'test' | 'flip' | 'done';
export type LawsonNote = 'phase-start' | 'test-legal' | 'test-illegal' | 'flip-edge' | 'done-delaunay';

export interface LawsonPayload {
    /** `phase`: the start triangulation. */
    readonly triangulation?: Triangulation;
    /** `test`: the interior edge under test (`a < b`). `flip`: the edge removed. */
    readonly edge?: readonly [number, number];
    /** `test`: the opposite vertices of the two triangles at the edge, sorted. */
    readonly apexes?: readonly [number, number];
    /** `test`: sign of incircle of the opposite vertex of the other triangle (1 means the edge is illegal). */
    readonly sign?: -1 | 0 | 1;
    /** `test`: the exact incircle determinant, for the readout. */
    readonly value?: bigint;
    /** `flip`: the edge added (`a < b`). */
    readonly added?: readonly [number, number];
}

export type LawsonEvent = TraceEvent<LawsonKind, LawsonPayload>;
export type LawsonTrace = Trace<LawsonKind, LawsonPayload>;

const sortedPair = (a: number, b: number): readonly [number, number] => Object.freeze(a < b ? [a, b] : [b, a]) as readonly [number, number];

/**
 * Lawson's flip algorithm as a step trace, from any valid triangulation of at most 40 points. Repeat: scan the interior
 * edges in lexicographic order of the sorted vertex-index pair; each scanned edge emits `test` with the sign of
 * `incircle` of the opposite vertex (and the exact value). The first edge with sign > 0 is flipped (`flip` event with
 * the removed and the added edge) and the scan restarts from the first edge. A full scan without a positive sign emits
 * `done`. Legal means `incircle <= 0`, so cocircular quadruples never flip. `predicateCount` counts one per edge test (a decision); the `incircleValue` readout is not counted.
 * Throws if `flip` refuses an illegal edge (the lemma of de Berg et al. says this cannot happen).
 */
export function lawsonTrace(tri: Triangulation): LawsonTrace {
    if (tri.points.length > DELAUNAY_MAX_POINTS) throw new RangeError(`at most ${DELAUNAY_MAX_POINTS} points are supported`);
    const events: LawsonEvent[] = [];
    let count = 0;
    const push = (kind: LawsonKind, noteKey: LawsonNote, payload: LawsonPayload) => {
        events.push(Object.freeze({kind, noteKey, payload: Object.freeze(payload), predicateCount: count}));
    };
    let current = tri;
    push('phase', 'phase-start', {triangulation: tri});
    for (let flipped = true; flipped;) {
        flipped = false;
        for (const e of edges(current)) {
            if (!e.interior) continue;
            const [t, u] = e.triangles;
            // The directed edge a -> b of t, so that (a, b, c) is counter-clockwise with c the apex of t.
            const corner = current.nbr[t].indexOf(u);
            const a = current.triangles[t][(corner + 1) % 3];
            const b = current.triangles[t][(corner + 2) % 3];
            const c = current.triangles[t][corner];
            const d = current.triangles[u].find((v) => v !== a && v !== b);
            if (d === undefined) throw new Error('internal error: corrupt triangulation');
            const pts = current.points;
            count++;
            const sign = incircle(pts[a], pts[b], pts[c], pts[d]);
            const value = incircleValue(pts[a], pts[b], pts[c], pts[d]);
            const edge = sortedPair(a, b);
            push('test', sign > 0 ? 'test-illegal' : 'test-legal', {edge, apexes: sortedPair(c, d), sign, value});
            if (sign > 0) {
                const result = flip(current, edge);
                if (!result.ok) throw new Error(`internal error: flip of an illegal edge refused (${result.refusal.kind})`);
                current = result.value;
                push('flip', 'flip-edge', {edge, added: sortedPair(c, d)});
                flipped = true;
                break;
            }
        }
    }
    push('done', 'done-delaunay', {});
    return Object.freeze(events);
}

export interface LawsonState {
    /** The current triangulation; null before the first event. */
    readonly triangulation: Triangulation | null;
    /** Payload of the edge under test, cleared by the next flip or by `done`. */
    readonly testing: LawsonPayload | null;
    readonly flips: number;
    readonly done: boolean;
}

export const LAWSON_INITIAL_STATE: LawsonState = Object.freeze({triangulation: null, testing: null, flips: 0, done: false});

/** Pure fold step. */
export function foldLawson(state: LawsonState, event: LawsonEvent): LawsonState {
    const {kind, payload} = event;
    switch (kind) {
        case 'phase':
            return {...state, triangulation: payload.triangulation ?? null};
        case 'test':
            return {...state, testing: payload};
        case 'flip': {
            if (state.triangulation === null || payload.edge === undefined) return state;
            const result = flip(state.triangulation, payload.edge);
            if (!result.ok) throw new Error(`corrupt Lawson trace: flip refused (${result.refusal.kind})`);
            return {...state, triangulation: result.value, testing: null, flips: state.flips + 1};
        }
        case 'done':
            return {...state, testing: null, done: true};
        default:
            return state;
    }
}

export function lawsonStateAt(trace: LawsonTrace, index: number): LawsonState {
    return stateAt(trace, index, foldLawson, LAWSON_INITIAL_STATE);
}

/** Incremental triangulation, then the final state of the Lawson trace. Same refusals as `incrementalTriangulation`. */
export function delaunayTriangulation(points: readonly GridPoint[]): DelaunayOutcome {
    const start = incrementalTriangulation(points);
    if (!start.ok) return start;
    const trace = lawsonTrace(start.value);
    const final = lawsonStateAt(trace, trace.length - 1).triangulation;
    if (final === null) throw new Error('internal error: empty Lawson trace');
    return {ok: true, value: final};
}

/** All 3T interior angles in degrees, ascending, as doubles. Display only: never used for a decision. */
export function angleVector(tri: Triangulation): number[] {
    const angles: number[] = [];
    for (const [a, b, c] of tri.triangles) {
        for (const [p, q, r] of [[a, b, c], [b, c, a], [c, a, b]]) {
            const o = tri.points[p], u = tri.points[q], v = tri.points[r];
            const ux = u.x - o.x, uy = u.y - o.y, vx = v.x - o.x, vy = v.y - o.y;
            angles.push(Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) * 180 / Math.PI);
        }
    }
    return angles.sort((x, y) => x - y);
}
