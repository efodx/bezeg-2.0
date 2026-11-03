/**
 * Fortune's algorithm (de Berg et al. 7.2) as an exact step trace (spec C5, task sweep-algorithms/22, ADR 0035).
 * Pure TypeScript: no React, JSXGraph, localization or graph state; no Delaunay or triangulation import (the output is
 * the plain `VoronoiDiagram` value, and the type is imported only as a type). No double enters any decision.
 *
 * Direction and order. The sweep line moves downwards. Events are processed by decreasing height, ties by increasing x.
 * A site event is at its grid height (the surd height with r = 0); a circle event is at c_y - sqrt(R^2) with rational
 * c_y and R^2, compared by `compareSurdHeights`; its x is its centre's x. Tie rule between a site event and a circle
 * event: an equal height and an equal x happen exactly when the site lies on that circle (the circle's lowest point is
 * the only point of the circle at that height), and then the circle event goes first. If the heights are equal and the
 * x differ, the family order (increasing x) applies, and then the site is outside the circle. Two circle events with
 * the same height and x are ordered by id.
 *
 * Which arc lies above a new site s (level l = s_y). With u_p = p_y - l > 0 the parabola of site p is
 *   y_p(x) = (x - p_x)^2 / (2 u_p) + (p_y + l) / 2,
 * and the beach line is the lower envelope of these. Take adjacent arcs, i on the left and j on the right, and
 *   D(x) = 2 u_i u_j (y_i(x) - y_j(x)) = u_j (x - i_x)^2 - u_i (x - j_x)^2 + u_i u_j (u_i - u_j),
 * a quadratic whose leading coefficient is u_j - u_i = j_y - i_y. The breakpoint is the root of D at which D changes
 * from negative to positive (the left arc is the lower one on its left, the right arc on its right). With vertex
 * x* = (u_j i_x - u_i j_x) / (u_j - u_i) between the two roots, and d = sign D(s_x), c = sign (s_x - x*):
 *   j_y > i_y (D opens upwards, the breakpoint is the LARGER root):  s_x < bp iff d < 0 or c < 0;
 *                                                                     s_x = bp iff d = 0 and c >= 0.
 *   j_y < i_y (D opens downwards, the breakpoint is the SMALLER root): s_x < bp iff d < 0 and c < 0;
 *                                                                      s_x = bp iff d = 0 and c <= 0.
 *   j_y = i_y: D is linear and the breakpoint is the bisector x = (i_x + j_x) / 2.
 * Sites at the level itself (u = 0, "pointed" arcs, only equal-y sites) are the limit u -> 0+: a pointed arc against
 * a wide one has its breakpoint at the pointed site's x, two pointed arcs have it at the midpoint. All of it is sign
 * tests on rationals; the combinatorial fallback of the spec was not needed. The test file checks the rule against
 * the brute-force minimum of y_p(s_x) over all processed sites.
 *
 * A site exactly below a breakpoint (s_x = bp) is not a split: s is inserted between i and j, the vertex of i, j, s is
 * reported at once (the breakpoint of i, j ends there and (i, s), (s, j) start there), and the diverging triple
 * (i, s, j) is not scheduled.
 *
 * Circle events. A triple of consecutive arcs (a, b, c) is scheduled iff orient(a, b, c) < 0 (clockwise: the
 * breakpoints converge). A pending event stays valid while its middle arc is still on the beach line with neighbours
 * of the recorded sites (the dBCKO rule: splitting a neighbour arc does not change the circle); otherwise it is
 * cancelled (a false alarm). Vertices are merged by exact centre equality, so cocircular sites give one vertex.
 *
 * Output edges. Each Voronoi edge is the union of the traces of the breakpoints of one site pair. A trace starts at a
 * vertex, at a split (an inner point of the edge), or at infinity (the first sites at one height: the vertical
 * bisector), and ends at a vertex or at infinity (a breakpoint left on the final beach line). A pair with two vertices
 * is a segment, with one vertex and one infinite end a ray, with two infinite ends a line, and with a single vertex only
 * a zero-length edge between cocircular sites, which is dropped. The ray direction is the right-hand normal of the
 * vector from the left to the right site of the open breakpoint (reversed for an end at infinity at the start).
 */
import type {GridPoint} from '../grid';
import {orient} from '../predicates';
import {Rational, RationalPoint} from '../rational';
import {circumcentre} from '../triangle';
import type {IntegerVector, VoronoiCell, VoronoiDiagram, VoronoiEdge, VoronoiVertex} from '../voronoi';
import {compareEventPositions, compareSurdHeights} from './eventOrder';
import {checkSweepPoints, SWEEP_MAX_SITES, type SweepInputRefusal} from './limits';
import {
    type QueueComparator,
    type QueueEntry,
    type SweepEvent,
    sweepEvent,
    type SweepKind,
    type SweepPayloads,
    type SweepState,
    sweepStateAt,
    type SweepTrace,
} from './sweepTrace';

export type FortuneRefusal = SweepInputRefusal | 'fewer-than-two' | 'too-many' | 'duplicate-sites';

/** `index`: the offending site (coordinate refusals); `indices`: the two equal sites (duplicates, ascending). */
export interface FortuneRefused {
    readonly ok: false;
    readonly reason: FortuneRefusal;
    readonly index?: number;
    readonly indices?: readonly [number, number];
}

export type CircleFate =
    | { readonly kind: 'executed'; readonly event: number; readonly vertex: number }
    | { readonly kind: 'cancelled'; readonly event: number; readonly reason: 'split' | 'neighbour' };

/**
 * A scheduled circle event. `id` is its queue id (`siteCount + index in circles`); `arcs` and `sites` are the triple
 * of consecutive arcs (left, middle, right) at scheduling time; the event height is `centre.y - sqrt(r2)`. `event`
 * fields are trace indices.
 */
export interface CircleEvent {
    readonly id: number;
    readonly scheduled: number;
    readonly arcs: readonly [number, number, number];
    readonly sites: readonly [number, number, number];
    readonly centre: RationalPoint;
    readonly r2: Rational;
    readonly fate: CircleFate;
}

/**
 * One site event. `arc`: the new arc. `above`: the arc found above the site (split, or for a pointed arc the arc the
 * site is appended to); null for the first site and for a site exactly below a breakpoint. `hit`: the two arcs (left,
 * right) on either side of that breakpoint, else null. `event`: trace index of the `pop`.
 */
export interface SiteEvent {
    readonly site: number;
    readonly event: number;
    readonly arc: number;
    readonly above: number | null;
    readonly hit: readonly [number, number] | null;
}

export interface FortuneResult {
    readonly ok: true;
    /** `report` items are indices into `diagram.vertices`. Queue ids: sites `0..n-1` (site index), circles `n + k`. */
    readonly trace: SweepTrace<number>;
    /** Arc id to site index (a site can own several arcs). */
    readonly arcSite: readonly number[];
    readonly siteCount: number;
    /** Every scheduled circle event, in scheduling order. */
    readonly circles: readonly CircleEvent[];
    readonly siteEvents: readonly SiteEvent[];
    /** Queue ids in processing order (executed events only). */
    readonly order: readonly number[];
    readonly diagram: VoronoiDiagram;
}

export type FortuneOutcome = FortuneResult | FortuneRefused;

/** Sweep height: a rational (site event) or the surd `q - sqrt(r)` (circle event). */
export type SweepHeight =
    | { readonly kind: 'rational'; readonly value: Rational }
    | { readonly kind: 'surd'; readonly q: Rational; readonly r: Rational };

const big = (n: number): bigint => BigInt(n);
const half = Rational.of(1, 2);
const sq = (v: Rational): Rational => v.mul(v);

function gcd(a: number, b: number): number {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) [x, y] = [y, x % y];
    return x;
}

function reduced(x: number, y: number): IntegerVector {
    const g = gcd(x, y);
    return {x: x / g + 0, y: y / g + 0}; // `+ 0` turns -0 into 0
}

/**
 * Sign of `x - bp` for the breakpoint bp of the adjacent arcs `left | right` at sweep level `level` (sites need
 * `y >= level`, otherwise a RangeError): -1 when x is left of it, 0 when it is on it, 1 when right of it. Exact; the
 * root selection is derived in the module comment.
 */
export function compareToBreakpoint(x: Rational, left: GridPoint, right: GridPoint, level: Rational): -1 | 0 | 1 {
    const uL = Rational.fromInt(left.y).sub(level);
    const uR = Rational.fromInt(right.y).sub(level);
    if (uL.sign() < 0 || uR.sign() < 0) throw new RangeError('compareToBreakpoint needs sites at or above the level');
    const lx = Rational.fromInt(left.x);
    const rx = Rational.fromInt(right.x);
    if (uL.isZero() && !uR.isZero()) return x.compare(lx);
    if (uR.isZero() && !uL.isZero()) return x.compare(rx);
    if (uL.equals(uR)) return x.compare(lx.add(rx).mul(half)); // equal heights, pointed or not: the bisector
    const d = uR.mul(sq(x.sub(lx))).sub(uL.mul(sq(x.sub(rx)))).add(uL.mul(uR).mul(uL.sub(uR))).sign();
    const c = x.compare(uR.mul(lx).sub(uL.mul(rx)).div(uR.sub(uL)));
    if (uR.compare(uL) > 0) { // right site higher: D opens upwards, the breakpoint is the larger root
        if (d < 0 || c < 0) return -1;
        return d === 0 ? 0 : 1;
    }
    // right site lower: D opens downwards, the breakpoint is the smaller root
    if (d === 0) return c <= 0 ? 0 : 1;
    if (d > 0) return 1; // between the roots, right of the smaller one
    return c < 0 ? -1 : 1;
}

interface EventKey {
    readonly q: Rational;
    readonly r: Rational;
    readonly x: Rational;
    readonly circle: boolean;
    readonly id: number;
}

/** Processing order: higher first, then increasing x, then circle before site, then id. */
function compareKeys(a: EventKey, b: EventKey): number {
    const byHeight = compareSurdHeights(a.q, a.r, b.q, b.r);
    if (byHeight !== 0) return -byHeight;
    const byX = a.x.compare(b.x);
    if (byX !== 0) return byX;
    if (a.circle !== b.circle) return a.circle ? -1 : 1;
    return a.id - b.id;
}

interface Arc {
    readonly id: number;
    readonly site: number;
}

interface InfiniteEnd {
    readonly left: number;
    readonly right: number;
    /** +1: the trace ends at infinity; -1: it starts there. */
    readonly sign: 1 | -1;
}

interface PairRecord {
    readonly lo: number;
    readonly hi: number;
    readonly vertices: Set<number>;
    readonly infinite: InfiniteEnd[];
}

const pairKey = (a: number, b: number): string => `${Math.min(a, b)},${Math.max(a, b)}`;

/** Exact ccw order of a cell's edges (the order of `voronoiFromDelaunay`): normals turn ccw along a convex boundary. */
function orderCellEdges(site: number, incident: readonly number[], edgeList: readonly VoronoiEdge[], points: readonly GridPoint[]): number[] {
    const angle = (a: GridPoint, b: GridPoint): number => {
        const hemisphere = (v: GridPoint): number => (v.y > 0 || (v.y === 0 && v.x > 0) ? 0 : 1);
        if (hemisphere(a) !== hemisphere(b)) return hemisphere(a) - hemisphere(b);
        const cross = big(a.x) * big(b.y) - big(a.y) * big(b.x);
        return cross > 0n ? -1 : cross < 0n ? 1 : 0;
    };
    const normal = (e: number): GridPoint => {
        const [i, j] = edgeList[e].sites;
        const other = i === site ? j : i;
        return {x: points[other].x - points[site].x, y: points[other].y - points[site].y};
    };
    const sorted = [...incident].sort((p, q) => angle(normal(p), normal(q)));
    for (let k = 0; k < sorted.length; k++) {
        const a = normal(sorted[k]);
        const b = normal(sorted[(k + 1) % sorted.length]);
        if (big(a.x) * big(b.y) - big(a.y) * big(b.x) <= 0n) return [...sorted.slice(k + 1), ...sorted.slice(0, k + 1)];
    }
    return sorted;
}

function buildCells(points: readonly GridPoint[], edgeList: readonly VoronoiEdge[]): VoronoiCell[] {
    const incident: number[][] = points.map(() => []);
    edgeList.forEach((e, index) => {
        incident[e.sites[0]].push(index);
        incident[e.sites[1]].push(index);
    });
    return points.map((_, site) => {
        const ordered = orderCellEdges(site, incident[site], edgeList, points);
        const bounded = ordered.length > 0 && ordered.every((e) => edgeList[e].kind === 'segment');
        return Object.freeze({site, edges: Object.freeze(ordered), bounded});
    });
}

/**
 * Fortune's sweep over 2..`SWEEP_MAX_SITES` distinct grid sites. Refusals come before any trace, in this order:
 * fewer than two sites, more than the limit, a coordinate outside the grid limit, two equal sites.
 */
export function fortuneTrace(sites: readonly GridPoint[]): FortuneOutcome {
    const n = sites.length;
    if (n < 2) return {ok: false, reason: 'fewer-than-two'};
    if (n > SWEEP_MAX_SITES) return {ok: false, reason: 'too-many'};
    const input = checkSweepPoints(sites);
    if (!input.ok) return {ok: false, reason: input.reason, index: input.index};
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (sites[i].x === sites[j].x && sites[i].y === sites[j].y) return {ok: false, reason: 'duplicate-sites', indices: [i, j]};
        }
    }

    const events: SweepEvent<number>[] = [];
    let calls = 0;
    const emit = <K extends SweepKind>(kind: K, payload: SweepPayloads<number>[K], noteKey: string): number => {
        events.push(Object.freeze(sweepEvent<number, K>(kind, payload, calls, noteKey)));
        return events.length - 1;
    };

    const arcSite: number[] = [];
    const circles: Mutable<CircleEvent>[] = [];
    const siteEvents: SiteEvent[] = [];
    const order: number[] = [];
    const beach: Arc[] = [];
    const vertexPoints: RationalPoint[] = [];
    const vertexSites: Set<number>[] = [];
    const vertexByCentre = new Map<string, number>();
    const pairs = new Map<string, PairRecord>();
    const pending: { key: EventKey; circle: number }[] = []; // circle < 0: a site event, key.id is the site

    const point = (s: number): RationalPoint => RationalPoint.fromGrid(sites[s]);
    const newArc = (site: number): Arc => {
        arcSite.push(site);
        return {id: arcSite.length - 1, site};
    };
    const pairOf = (a: number, b: number): PairRecord => {
        const key = pairKey(a, b);
        let record = pairs.get(key);
        if (record === undefined) {
            record = {lo: Math.min(a, b), hi: Math.max(a, b), vertices: new Set(), infinite: []};
            pairs.set(key, record);
        }
        return record;
    };
    const siteKey = (s: number): EventKey => ({
        q: Rational.fromInt(sites[s].y), r: Rational.ZERO, x: Rational.fromInt(sites[s].x), circle: false, id: s,
    });

    const processing = sites.map((_, i) => i).sort((a, b) => compareEventPositions(point(a), point(b)));
    emit('phase', {phase: 'start'}, 'fortune.phase');
    for (const s of processing) {
        pending.push({key: siteKey(s), circle: -1});
        emit('schedule', {id: s, position: point(s)}, 'fortune.schedule-site');
    }

    /** Registers a vertex (merging by exact centre) and reports it the first time. */
    const vertexAt = (centre: RationalPoint, triple: readonly number[]): number => {
        const key = `${centre.x.format()},${centre.y.format()}`;
        let index = vertexByCentre.get(key);
        const isNew = index === undefined;
        if (index === undefined) {
            index = vertexPoints.length;
            vertexByCentre.set(key, index);
            vertexPoints.push(centre);
            vertexSites.push(new Set());
        }
        for (const s of triple) vertexSites[index].add(s);
        if (isNew) emit('report', {item: index}, 'fortune.vertex');
        return index;
    };

    const circumcentreOf = (a: number, b: number, c: number): RationalPoint => {
        const centre = circumcentre(sites[a], sites[b], sites[c]);
        if (centre.kind !== 'point') throw new Error('internal error: circle through collinear sites');
        return centre.point;
    };

    let current: EventKey = pending[0].key;

    /** Schedules the circle event of the arcs at beach positions `at..at+2` when their breakpoints converge. */
    const tryTriple = (at: number): void => {
        if (at < 0 || at + 2 >= beach.length) return;
        const [a, b, c] = [beach[at], beach[at + 1], beach[at + 2]];
        if (a.site === c.site) return;
        calls++;
        if (orient(sites[a.site], sites[b.site], sites[c.site]) >= 0) return;
        const centre = circumcentreOf(a.site, b.site, c.site);
        const r2 = sq(centre.x.sub(Rational.fromInt(sites[a.site].x))).add(sq(centre.y.sub(Rational.fromInt(sites[a.site].y))));
        const id = n + circles.length;
        const key: EventKey = {q: centre.y, r: r2, x: centre.x, circle: true, id};
        const past = compareSurdHeights(key.q, key.r, current.q, current.r) > 0
            || (compareSurdHeights(key.q, key.r, current.q, current.r) === 0 && key.x.compare(current.x) < 0);
        if (past) throw new Error('internal error: circle event before the current event');
        const scheduled = emit('schedule', {id, position: centre}, 'fortune.schedule-circle');
        circles.push({
            id, scheduled, arcs: [a.id, b.id, c.id], sites: [a.site, b.site, c.site], centre, r2,
            fate: {kind: 'cancelled', event: -1, reason: 'neighbour'},
        });
        pending.push({key, circle: circles.length - 1});
    };

    /** Cancels pending circle events whose middle arc lost or changed a neighbour site. */
    const cancelBroken = (splitArc: number | null): void => {
        for (let p = 0; p < pending.length; p++) {
            const entry = pending[p];
            if (entry.circle < 0) continue;
            const circle = circles[entry.circle];
            const middle = beach.findIndex((arc) => arc.id === circle.arcs[1]);
            const valid = middle > 0 && middle < beach.length - 1
                && beach[middle - 1].site === circle.sites[0] && beach[middle + 1].site === circle.sites[2];
            if (valid) continue;
            const reason = circle.arcs[1] === splitArc ? 'split' : 'neighbour';
            const event = emit('cancel', {id: circle.id}, reason === 'split' ? 'fortune.cancel-split' : 'fortune.cancel-neighbour');
            circle.fate = {kind: 'cancelled', event, reason};
            pending.splice(p, 1);
            p--;
        }
    };

    const insertArc = (arc: Arc, index: number): void => {
        beach.splice(index, 0, arc);
        emit('status-insert', {id: arc.id, index}, 'fortune.insert');
    };

    const handleSite = (s: number): void => {
        const pop = emit('pop', {id: s, position: point(s)}, 'fortune.pop-site');
        order.push(s);
        if (beach.length === 0) {
            const arc = newArc(s);
            insertArc(arc, 0);
            siteEvents.push({site: s, event: pop, arc: arc.id, above: null, hit: null});
            return;
        }
        const level = Rational.fromInt(sites[s].y);
        const sx = Rational.fromInt(sites[s].x);
        let at = beach.length - 1;
        let hit = false;
        for (let m = 0; m + 1 < beach.length; m++) {
            calls++;
            const side = compareToBreakpoint(sx, sites[beach[m].site], sites[beach[m + 1].site], level);
            if (side < 0) {
                at = m;
                break;
            }
            if (side === 0) {
                at = m;
                hit = true;
                break;
            }
        }
        const arc = newArc(s);
        if (hit) {
            const [left, right] = [beach[at], beach[at + 1]];
            insertArc(arc, at + 1);
            const vertex = vertexAt(circumcentreOf(left.site, right.site, s), [left.site, right.site, s]);
            pairOf(left.site, right.site).vertices.add(vertex);
            pairOf(left.site, s).vertices.add(vertex);
            pairOf(s, right.site).vertices.add(vertex);
            siteEvents.push({site: s, event: pop, arc: arc.id, above: null, hit: [left.id, right.id]});
            cancelBroken(null);
            tryTriple(at - 1);
            tryTriple(at + 1);
            return;
        }
        const above = beach[at];
        if (sites[above.site].y === sites[s].y) { // a pointed arc: the equal-y sites start the beach line side by side
            insertArc(arc, at + 1);
            pairOf(above.site, s).infinite.push({left: above.site, right: s, sign: -1});
            siteEvents.push({site: s, event: pop, arc: arc.id, above: above.id, hit: null});
            cancelBroken(null);
            tryTriple(at - 1);
            return;
        }
        insertArc(arc, at + 1);
        const rest = newArc(above.site);
        insertArc(rest, at + 2);
        pairOf(above.site, s);
        siteEvents.push({site: s, event: pop, arc: arc.id, above: above.id, hit: null});
        cancelBroken(above.id);
        tryTriple(at - 1);
        tryTriple(at + 1);
    };

    const handleCircle = (k: number): void => {
        const circle = circles[k];
        const pop = emit('pop', {id: circle.id, position: circle.centre}, 'fortune.pop-circle');
        order.push(circle.id);
        const middle = beach.findIndex((arc) => arc.id === circle.arcs[1]);
        const [left, vanishing, right] = [beach[middle - 1], beach[middle], beach[middle + 1]];
        beach.splice(middle, 1);
        emit('status-remove', {id: vanishing.id}, 'fortune.remove');
        const triple = [left.site, vanishing.site, right.site];
        const vertex = vertexAt(circle.centre, triple);
        pairOf(left.site, vanishing.site).vertices.add(vertex);
        pairOf(vanishing.site, right.site).vertices.add(vertex);
        pairOf(left.site, right.site).vertices.add(vertex);
        circle.fate = {kind: 'executed', event: pop, vertex};
        cancelBroken(null);
        tryTriple(middle - 2);
        tryTriple(middle - 1);
    };

    while (pending.length > 0) {
        let best = 0;
        for (let p = 1; p < pending.length; p++) if (compareKeys(pending[p].key, pending[best].key) < 0) best = p;
        const [event] = pending.splice(best, 1);
        current = event.key;
        if (event.circle < 0) handleSite(event.key.id);
        else handleCircle(event.circle);
    }
    for (let m = 0; m + 1 < beach.length; m++) {
        pairOf(beach[m].site, beach[m + 1].site).infinite.push({left: beach[m].site, right: beach[m + 1].site, sign: 1});
    }
    emit('done', {}, 'fortune.done');

    const diagram = assemble(sites, vertexPoints, vertexSites, pairs);
    return {
        ok: true,
        trace: Object.freeze(events),
        arcSite: Object.freeze(arcSite),
        siteCount: n,
        circles: Object.freeze(circles.map((c) => Object.freeze({...c}))),
        siteEvents: Object.freeze(siteEvents.map((e) => Object.freeze(e))),
        order: Object.freeze(order),
        diagram,
    };
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function assemble(
    sites: readonly GridPoint[],
    vertexPoints: readonly RationalPoint[],
    vertexSites: readonly Set<number>[],
    pairs: ReadonlyMap<string, PairRecord>,
): VoronoiDiagram {
    const vertices: VoronoiVertex[] = vertexPoints.map((p, i) =>
        Object.freeze({point: p, sites: Object.freeze([...vertexSites[i]].sort((a, b) => a - b))}));
    const edgeList: VoronoiEdge[] = [];
    const records = [...pairs.values()].sort((a, b) => a.lo - b.lo || a.hi - b.hi);
    for (const record of records) {
        const sitesPair: readonly [number, number] = [record.lo, record.hi];
        const found = [...record.vertices].sort((a, b) => a - b);
        const infinite = record.infinite;
        if (infinite.length === 0 && found.length === 2) {
            edgeList.push(Object.freeze({kind: 'segment' as const, sites: sitesPair, from: found[0], to: found[1]}));
        } else if (infinite.length === 0 && found.length === 1) {
            continue; // zero length: both ends at one vertex (cocircular sites)
        } else if (infinite.length === 1 && found.length === 1) {
            const end = infinite[0];
            const dx = sites[end.right].x - sites[end.left].x;
            const dy = sites[end.right].y - sites[end.left].y;
            const direction = end.sign === 1 ? reduced(dy, -dx) : reduced(-dy, dx);
            edgeList.push(Object.freeze({kind: 'ray' as const, sites: sitesPair, vertex: found[0], direction}));
        } else if (infinite.length === 2 && found.length === 0) {
            const [a, b] = [sites[record.lo], sites[record.hi]].sort((p, q) => p.x - q.x || p.y - q.y);
            const middle = RationalPoint.fromGrid(a).add(RationalPoint.fromGrid(b)).scale(half);
            edgeList.push(Object.freeze({
                kind: 'line' as const, sites: sitesPair, point: middle, direction: reduced(-(b.y - a.y), b.x - a.x),
            }));
        } else {
            throw new Error(`internal error: edge ${record.lo},${record.hi} has ${found.length} vertices and ${infinite.length} infinite ends`);
        }
    }
    return {vertices, edges: edgeList, cells: buildCells(sites, edgeList)};
}

/** The queue order of the trace's `schedule` events (sites and circle events), for `sweepStateAt`. */
export function fortuneQueueOrder(result: FortuneResult, sites: readonly GridPoint[]): QueueComparator {
    const keyOf = (entry: QueueEntry): EventKey => {
        if (entry.id < result.siteCount) {
            return {
                q: Rational.fromInt(sites[entry.id].y), r: Rational.ZERO, x: Rational.fromInt(sites[entry.id].x),
                circle: false, id: entry.id,
            };
        }
        const circle = result.circles[entry.id - result.siteCount];
        return {q: circle.centre.y, r: circle.r2, x: circle.centre.x, circle: true, id: entry.id};
    };
    return (a, b) => compareKeys(keyOf(a), keyOf(b));
}

/** An open breakpoint: the two arcs (ids) and sites it separates, and the index in `diagram.edges` it traces. */
export interface Breakpoint {
    readonly left: number;
    readonly right: number;
    readonly leftSite: number;
    readonly rightSite: number;
    /** Null when the pair has no edge in the final diagram (a zero-length edge of cocircular sites). */
    readonly edge: number | null;
}

export interface FortuneState {
    readonly sweep: SweepState<number>;
    /** The beach line as site ids, left to right (`sweep.status` mapped through `arcSite`). */
    readonly beach: readonly number[];
    readonly breakpoints: readonly Breakpoint[];
    /** Height of the last popped event; null before the first pop. */
    readonly height: SweepHeight | null;
    /** Vertices reported so far, as indices into `diagram.vertices` (a copy of `sweep.output`). */
    readonly vertices: readonly number[];
}

/**
 * Pure state after trace event `index` (clamped): `sweepStateAt` with the exact queue order, the beach line as sites,
 * the open breakpoints with their traced edge, the sweep height and the vertices reported so far. `sites` are the
 * input sites the result was computed from.
 */
export function fortuneStateAt(result: FortuneResult, sites: readonly GridPoint[], index: number): FortuneState {
    const sweep = sweepStateAt(result.trace, index, fortuneQueueOrder(result, sites));
    const beach = sweep.status.map((arc) => result.arcSite[arc]);
    const breakpoints: Breakpoint[] = [];
    for (let m = 0; m + 1 < sweep.status.length; m++) {
        const [a, b] = [beach[m], beach[m + 1]];
        const found = result.diagram.edges.findIndex((e) => e.sites[0] === Math.min(a, b) && e.sites[1] === Math.max(a, b));
        breakpoints.push({left: sweep.status[m], right: sweep.status[m + 1], leftSite: a, rightSite: b, edge: found < 0 ? null : found});
    }
    let pops = 0;
    const last = Math.min(Math.max(Math.trunc(index), 0), result.trace.length - 1);
    for (let k = 0; k <= last; k++) if (result.trace[k].kind === 'pop') pops++;
    let height: SweepHeight | null = null;
    if (pops > 0) {
        const id = result.order[pops - 1];
        if (id < result.siteCount) {
            height = {kind: 'rational', value: Rational.fromInt(sites[id].y)};
        } else {
            const circle = result.circles[id - result.siteCount];
            height = {kind: 'surd', q: circle.centre.y, r: circle.r2};
        }
    }
    return {sweep, beach, breakpoints, height, vertices: [...sweep.output]};
}
