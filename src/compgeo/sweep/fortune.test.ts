import {describe, expect, it} from 'vitest';
import type {GridPoint} from '../grid';
import {incircle, orient} from '../predicates';
import {Rational, RationalPoint} from '../rational';
import {circumcentre} from '../triangle';
import {type VoronoiDiagram, voronoiFromDelaunay} from '../voronoi';
import {compareSurdHeights} from './eventOrder';
import {
    compareToBreakpoint,
    type FortuneResult,
    fortuneQueueOrder,
    fortuneStateAt,
    fortuneTrace,
} from './fortune';
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SITES} from './limits';
import {sweepStateAt} from './sweepTrace';
import {lcg} from './testPolygons';

const R = Rational.of;
const key = (p: { x: Rational; y: Rational }): string => `${p.x.format()},${p.y.format()}`;

function run(sites: readonly GridPoint[]): FortuneResult {
    const result = fortuneTrace(sites);
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    return result;
}

/**
 * Structural equality of two Voronoi values: the same vertices (exact points with their sites), the same edge per site
 * pair (segment: same endpoints as points, either orientation; ray: same vertex point and a positive multiple of the
 * direction; line: same line), and the same cells (site and edge sequence). Returns a difference or null.
 */
function sameVoronoiDiagram(a: VoronoiDiagram, b: VoronoiDiagram): string | null {
    const vertices = (d: VoronoiDiagram): string[] => d.vertices.map((v) => `${key(v.point)}:${v.sites.join(',')}`).sort();
    if (JSON.stringify(vertices(a)) !== JSON.stringify(vertices(b))) return `vertices ${vertices(a)} vs ${vertices(b)}`;
    if (a.edges.length !== b.edges.length) return `edge count ${a.edges.length} vs ${b.edges.length}`;
    const byPair = (d: VoronoiDiagram) => new Map(d.edges.map((e) => [e.sites.join(','), e] as const));
    const [ea, eb] = [byPair(a), byPair(b)];
    for (const [pair, x] of ea) {
        const y = eb.get(pair);
        if (y === undefined) return `edge ${pair} missing`;
        if (x.kind !== y.kind) return `edge ${pair}: ${x.kind} vs ${y.kind}`;
        if (x.kind === 'segment' && y.kind === 'segment') {
            const ends = (d: VoronoiDiagram, e: typeof x): string => [key(d.vertices[e.from].point), key(d.vertices[e.to].point)].sort().join('|');
            if (ends(a, x) !== ends(b, y)) return `segment ${pair}: ${ends(a, x)} vs ${ends(b, y)}`;
        } else if (x.kind === 'ray' && y.kind === 'ray') {
            if (key(a.vertices[x.vertex].point) !== key(b.vertices[y.vertex].point)) return `ray ${pair}: vertex differs`;
            const cross = x.direction.x * y.direction.y - x.direction.y * y.direction.x;
            const dot = x.direction.x * y.direction.x + x.direction.y * y.direction.y;
            if (cross !== 0 || dot <= 0) return `ray ${pair}: direction ${JSON.stringify(x.direction)} vs ${JSON.stringify(y.direction)}`;
        } else if (x.kind === 'line' && y.kind === 'line') {
            const cross = x.direction.x * y.direction.y - x.direction.y * y.direction.x;
            const offset = x.point.sub(y.point);
            const along = offset.x.mul(R(y.direction.y)).sub(offset.y.mul(R(y.direction.x)));
            if (cross !== 0 || !along.isZero()) return `line ${pair} differs`;
        }
    }
    for (let s = 0; s < a.cells.length; s++) {
        const cell = (d: VoronoiDiagram): string => `${d.cells[s].site}:${d.cells[s].edges.map((e) => d.edges[e].sites.join('-')).join(' ')}:${d.cells[s].bounded}`;
        if (cell(a) !== cell(b)) return `cell ${s}: ${cell(a)} vs ${cell(b)}`;
    }
    return null;
}

function expectDual(sites: readonly GridPoint[]): FortuneResult {
    const result = run(sites);
    const dual = voronoiFromDelaunay(sites);
    if (!dual.ok) throw new Error(`dual refused ${dual.refusal.kind}`);
    expect(sameVoronoiDiagram(result.diagram, dual.value), JSON.stringify(sites)).toBeNull();
    return result;
}

/** Strictly inside the circle through a, b, c (any orientation). */
const strictlyInside = (a: GridPoint, b: GridPoint, c: GridPoint, p: GridPoint): boolean =>
    incircle(a, b, c, p) * orient(a, b, c) > 0;

/** Brute force: the sites minimising y_p(s_x) at level s_y over all sites strictly above it. */
function bruteArcSites(sites: readonly GridPoint[], processed: readonly number[], s: GridPoint): number[] {
    const level = R(s.y);
    let best: Rational | null = null;
    let at: number[] = [];
    for (const p of processed) {
        if (sites[p].y <= s.y) continue; // sites at the level have no parabola yet
        const u = R(sites[p].y).sub(level);
        const value = R(s.x - sites[p].x).mul(R(s.x - sites[p].x)).div(R(2).mul(u)).add(R(sites[p].y).add(level).mul(R(1, 2)));
        const order = best === null ? -1 : value.compare(best);
        if (order < 0) {
            best = value;
            at = [p];
        } else if (order === 0) at.push(p);
    }
    return at;
}

/** Number of points on the boundary of the convex hull (collinear boundary points included). */
function hullBoundary(sites: readonly GridPoint[]): number {
    let count = 0;
    for (let p = 0; p < sites.length; p++) {
        let onBoundary = false;
        for (let a = 0; a < sites.length && !onBoundary; a++) {
            for (let b = 0; b < sites.length && !onBoundary; b++) {
                if (a === b) continue;
                // the closed segment ab holds p and every site lies on one closed side of the line ab
                const [signs, between] = [sites.map((q) => orient(sites[a], sites[b], q)), orient(sites[a], sites[b], sites[p]) === 0];
                if (!between) continue;
                const oneSide = !(signs.includes(1) && signs.includes(-1));
                if (!oneSide) continue;
                const dx = sites[b].x - sites[a].x;
                const dy = sites[b].y - sites[a].y;
                const t = (sites[p].x - sites[a].x) * dx + (sites[p].y - sites[a].y) * dy;
                onBoundary = t >= 0 && t <= dx * dx + dy * dy;
            }
        }
        if (onBoundary) count++;
    }
    return count;
}

function distinctSites(rnd: () => number, n: number, range: number): GridPoint[] {
    const out: GridPoint[] = [];
    while (out.length < n) {
        const p = {x: Math.floor(rnd() * (2 * range + 1)) - range, y: Math.floor(rnd() * (2 * range + 1)) - range};
        if (!out.some((q) => q.x === p.x && q.y === p.y)) out.push(p);
    }
    return out;
}

const hasCollinearTriple = (sites: readonly GridPoint[]): boolean =>
    sites.some((a, i) => sites.some((b, j) => j > i && sites.some((c, k) => k > j && orient(a, b, c) === 0)));

const hasCocircularQuad = (sites: readonly GridPoint[]): boolean =>
    sites.some((a, i) => sites.some((b, j) => j > i && sites.some((c, k) => k > j && orient(a, b, c) !== 0
        && sites.some((d, m) => m > k && incircle(a, b, c, d) === 0))));

const hasEqualY = (sites: readonly GridPoint[]): boolean => sites.some((a, i) => sites.some((b, j) => j > i && a.y === b.y));

/**
 * Checks the circle-event claims and the arc-above rule of one run; returns small counters for the test logs.
 *
 * Cancel rule (asserted for every input, cocircular and degenerate ones included). A circle event is scheduled only
 * when its breakpoints converge, and cancelled only when its middle arc gets or loses a neighbour. Either a site lies
 * strictly inside the circle (the arriving site cut the triple), or the circle through the three sites is empty: then
 * its centre is a Voronoi vertex, the cancel is a false alarm caused by four or more cocircular sites, and another
 * circle event with the exact same centre was executed (the first cocircular triple to pop removes an arc of the
 * others, which cancels theirs; the vertex is merged by exact centre). The check asserts this disjunction. A site hit
 * on a cocircular configuration could in principle supersede it instead, but it never did in 14 000 further sets of
 * up to 12 sites (grid ranges 2 to 5, see 22-random.log), so that branch is not accepted here.
 */
function checkRun(sites: readonly GridPoint[], result: FortuneResult): {
    cancelled: number; executed: number; hits: number; inside: number; byExecuted: number;
} {
    let cancelled = 0;
    let executed = 0;
    let inside = 0;
    let byExecuted = 0;
    for (const circle of result.circles) {
        const [a, b, c] = circle.sites.map((s) => sites[s]);
        if (circle.fate.kind === 'executed') {
            executed++;
            expect(sites.some((p) => strictlyInside(a, b, c, p)), 'executed circle is empty').toBe(false);
        } else {
            cancelled++;
            if (sites.some((p) => strictlyInside(a, b, c, p))) {
                inside++;
            } else {
                expect(result.circles.some((o) => o.fate.kind === 'executed' && o.centre.equals(circle.centre)),
                    `cancelled empty circle ${circle.id} has no executed event at its centre`).toBe(true);
                byExecuted++;
            }
        }
    }
    // the arc above each site agrees with the brute-force minimum
    const processed: number[] = [];
    let hits = 0;
    for (const event of result.siteEvents) {
        const s = sites[event.site];
        const before = sweepStateAt(result.trace, event.event - 1);
        const best = bruteArcSites(sites, processed, s);
        const beachSites = before.status.map((arc) => result.arcSite[arc]);
        if (event.hit !== null) {
            hits++;
            expect(best).toContain(result.arcSite[event.hit[0]]);
            expect(best).toContain(result.arcSite[event.hit[1]]);
            expect(best.length).toBeGreaterThanOrEqual(2);
        } else if (event.above !== null) {
            if (best.length > 0) expect(best, `site ${event.site}`).toContain(result.arcSite[event.above]);
            else expect(event.above).toBe(before.status[before.status.length - 1]); // only pointed arcs: appended
        } else {
            expect(beachSites).toHaveLength(0);
        }
        processed.push(event.site);
    }
    return {cancelled, executed, hits, inside, byExecuted};
}

describe('refusals', () => {
    it('refuses before any trace, in the specified order', () => {
        expect(fortuneTrace([{x: 0, y: 0}])).toEqual({ok: false, reason: 'fewer-than-two'});
        expect(fortuneTrace([])).toEqual({ok: false, reason: 'fewer-than-two'});
        const many = Array.from({length: SWEEP_MAX_SITES + 1}, (_, i) => ({x: i, y: i * i}));
        expect(fortuneTrace(many)).toEqual({ok: false, reason: 'too-many'});
        expect(fortuneTrace([{x: 0, y: 0}, {x: SWEEP_COORD_LIMIT + 1, y: 0}])).toEqual({ok: false, reason: 'out-of-range', index: 1});
        expect(fortuneTrace([{x: 0.5, y: 0}, {x: 1, y: 0}])).toEqual({ok: false, reason: 'not-grid', index: 0});
        expect(fortuneTrace([{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 0}, {x: 1, y: 1}]))
            .toEqual({ok: false, reason: 'duplicate-sites', indices: [1, 3]});
        // coordinate refusals come before duplicates, and the size limits before both
        expect(fortuneTrace([{x: 0, y: 0}, {x: 0, y: 0}, {x: 5000, y: 0}])).toEqual({ok: false, reason: 'out-of-range', index: 2});
        expect(fortuneTrace([...many.slice(0, 12), {x: 0, y: 0}]).ok).toBe(false);
    });

    it('accepts the largest allowed input', () => {
        const rnd = lcg(5);
        expect(fortuneTrace(distinctSites(rnd, SWEEP_MAX_SITES, 10)).ok).toBe(true);
        expect(fortuneTrace([{x: -SWEEP_COORD_LIMIT, y: -SWEEP_COORD_LIMIT}, {x: SWEEP_COORD_LIMIT, y: SWEEP_COORD_LIMIT}]).ok).toBe(true);
    });
});

describe('default example A, B, C, D', () => {
    const sites = [{x: 0, y: 5}, {x: -4, y: 3}, {x: 4, y: 3}, {x: 0, y: -3}];
    const [A, B, C, D] = [0, 1, 2, 3];
    const result = run(sites);

    it('processes the sites A, B, C, then D, then two circle events', () => {
        expect(result.order).toEqual([A, B, C, D, 5, 6]);
        expect(result.trace[0].kind).toBe('phase');
        expect(result.trace[result.trace.length - 1].kind).toBe('done');
    });

    it('has the beach line A, B, A, C, A after the third site and schedules (B, A, C)', () => {
        const popD = result.siteEvents[3].event;
        const before = fortuneStateAt(result, sites, popD - 1);
        expect(before.beach).toEqual([A, B, A, C, A]);
        expect(before.sweep.queue.map((q) => q.id)).toEqual([D, 4]); // D at -3 before the circle event at -5
        const event = result.circles[0];
        expect(event.sites).toEqual([B, A, C]);
        expect(key(event.centre)).toBe('0,0');
        expect(event.r2.equals(R(25))).toBe(true);
        expect(compareSurdHeights(event.centre.y, event.r2, R(-5), R(0))).toBe(0); // height -5
    });

    it('lets D split the arc of A and cancel that event; the circle contains D', () => {
        const event = result.circles[0];
        expect(event.fate).toMatchObject({kind: 'cancelled', reason: 'split'});
        const [a, b, c] = event.sites.map((s) => sites[s]);
        expect(strictlyInside(a, b, c, sites[D])).toBe(true);
        const cancel = result.trace[event.fate.event];
        expect(cancel.kind).toBe('cancel');
        expect(cancel.payload).toEqual({id: event.id});
        expect(result.siteEvents[3].above).not.toBeNull();
        expect(result.arcSite[result.siteEvents[3].above ?? -1]).toBe(A);
        const afterD = fortuneStateAt(result, sites, event.fate.event);
        expect(afterD.beach).toEqual([A, B, A, D, A, C, A]);
        expect(afterD.sweep.queue.map((q) => q.id)).toEqual([]);
    });

    it('has two true events at 1 - sqrt(65)/2, centres (-1/2, 1) then (1/2, 1), each reported once', () => {
        const [first, second] = result.circles.slice(1);
        expect(result.circles).toHaveLength(3);
        expect([key(first.centre), key(second.centre)]).toEqual(['-1/2,1', '1/2,1']);
        for (const event of [first, second]) {
            expect(event.r2.equals(R(65, 4))).toBe(true);
            expect(event.fate.kind).toBe('executed');
            expect(compareSurdHeights(event.centre.y, event.r2, R(1), R(65, 4))).toBe(0);
        }
        expect(first.sites.slice().sort()).toEqual([A, B, D]);
        expect(second.sites.slice().sort()).toEqual([A, C, D]);
        const reports = result.trace.filter((e) => e.kind === 'report');
        expect(reports.map((e) => e.payload)).toEqual([{item: 0}, {item: 1}]);
        expect(result.diagram.vertices.map((v) => key(v.point))).toEqual(['-1/2,1', '1/2,1']);
        // popped after D, in that order, at equal height
        expect(result.order.slice(4)).toEqual([first.id, second.id]);
    });

    it('gives the final diagram: 2 vertices, 1 finite edge on y = 1 and 4 rays', () => {
        const d = result.diagram;
        expect(d.vertices).toHaveLength(2);
        expect(d.edges.filter((e) => e.kind === 'segment')).toHaveLength(1);
        expect(d.edges.filter((e) => e.kind === 'ray')).toHaveLength(4);
        const segment = d.edges.find((e) => e.kind === 'segment');
        expect(segment?.sites).toEqual([A, D]);
        expect(d.vertices.every((v) => v.point.y.equals(R(1)))).toBe(true);
        expectDual(sites);
    });

    it('folds the state: beach, breakpoints with their traced edge, height, vertices', () => {
        const last = result.trace.length - 1;
        const end = fortuneStateAt(result, sites, last);
        expect(end.sweep.done).toBe(true);
        expect(end.vertices).toEqual([0, 1]);
        expect(end.sweep.queue).toEqual([]);
        expect(end.beach).toEqual([A, B, D, C, A]); // final beach line
        expect(end.breakpoints.map((b) => [b.leftSite, b.rightSite])).toEqual([[A, B], [B, D], [D, C], [C, A]]);
        for (const bp of end.breakpoints) {
            expect(result.diagram.edges[bp.edge ?? -1].sites).toEqual([Math.min(bp.leftSite, bp.rightSite), Math.max(bp.leftSite, bp.rightSite)]);
        }
        expect(end.height).toEqual({kind: 'surd', q: R(1), r: R(65, 4)});
        const early = fortuneStateAt(result, sites, 0);
        expect(early.height).toBeNull();
        expect(early.beach).toEqual([]);
        expect(early.sweep.queue).toEqual([]);
        const afterSites = fortuneStateAt(result, sites, 1 + 4);
        expect(afterSites.sweep.queue.map((q) => q.id)).toEqual([1, 2, 3]); // A popped; B and C tie at 3, by x
        expect(fortuneStateAt(result, sites, result.siteEvents[0].event).height).toEqual({kind: 'rational', value: R(5)});
    });

    it('orders the queue exactly: by height, then x, with surd heights', () => {
        const order = fortuneQueueOrder(result, sites);
        const entry = (id: number) => ({id, position: result.circles[Math.max(id - 4, 0)].centre});
        expect(order(entry(5), entry(6))).toBeLessThan(0); // equal heights, centre x -1/2 before 1/2
        expect(order(entry(3), entry(4))).toBeLessThan(0); // D at -3 before the event at -5
        expect(order(entry(5), entry(3))).toBeGreaterThan(0); // 1 - sqrt(65)/2 is below -3
    });

    it('counts predicates monotonically, at least one per breakpoint test', () => {
        const counts = result.trace.map((e) => e.predicateCount);
        for (let k = 1; k < counts.length; k++) expect(counts[k]).toBeGreaterThanOrEqual(counts[k - 1]);
        expect(counts[counts.length - 1]).toBeGreaterThanOrEqual(8);
    });
});

describe('second example A, B, C', () => {
    it('has one executed event at -5 with the vertex (0, 0)', () => {
        const sites = [{x: 0, y: 5}, {x: -4, y: 3}, {x: 4, y: 3}];
        const result = expectDual(sites);
        expect(result.circles).toHaveLength(1);
        expect(result.circles[0].fate.kind).toBe('executed');
        expect(result.diagram.vertices.map((v) => key(v.point))).toEqual(['0,0']);
        expect(result.diagram.edges.map((e) => e.kind)).toEqual(['ray', 'ray', 'ray']);
        expect(result.order).toEqual([0, 1, 2, 3]);
    });
});

describe('the root of the breakpoint test', () => {
    // two sites alone: arcs (high | low | high); the left crossing is the breakpoint of (high | low), the right one of
    // (low | high). Roots from the quadratic formula in doubles (test only), away from ties.
    it('agrees with the numeric roots of the two parabolas', () => {
        const rnd = lcg(11);
        let checked = 0;
        for (let t = 0; t < 400; t++) {
            const [p, q] = distinctSites(rnd, 2, 12);
            if (p.y === q.y) continue;
            const [high, low] = p.y > q.y ? [p, q] : [q, p];
            const level = low.y - 1 - Math.floor(rnd() * 5);
            const [uH, uL] = [high.y - level, low.y - level];
            // y_high(x) - y_low(x) = 0  <=>  uL (x-hx)^2 - uH (x-lx)^2 + uH uL (uH - uL) = 0
            const a = uL - uH;
            const b = -2 * uL * high.x + 2 * uH * low.x;
            const c = uL * high.x ** 2 - uH * low.x ** 2 + uH * uL * (uH - uL);
            const disc = Math.sqrt(b * b - 4 * a * c);
            const roots = [(-b - disc) / (2 * a), (-b + disc) / (2 * a)].sort((m, n) => m - n);
            for (const [left, right, root] of [[high, low, roots[0]], [low, high, roots[1]]] as const) {
                for (const x of [-30, -9, -3.5, 0, 2.5, 7, 15, 33]) {
                    if (Math.abs(x - root) < 1e-6) continue;
                    expect(compareToBreakpoint(R(Math.round(x * 2), 2), left, right, R(level)), `${JSON.stringify([left, right, level, x])}`)
                        .toBe(x < root ? -1 : 1);
                    checked++;
                }
            }
        }
        expect(checked).toBeGreaterThan(4000);
    });

    it('handles equal heights, pointed arcs and exact hits', () => {
        const level = R(0);
        expect(compareToBreakpoint(R(0), {x: -2, y: 4}, {x: 2, y: 4}, level)).toBe(0);
        expect(compareToBreakpoint(R(-1), {x: -2, y: 4}, {x: 2, y: 4}, level)).toBe(-1);
        expect(compareToBreakpoint(R(3), {x: -2, y: 4}, {x: 2, y: 4}, level)).toBe(1);
        // pointed left arc at the level 3: breakpoint at its x
        expect(compareToBreakpoint(R(-3), {x: -4, y: 3}, {x: 0, y: 5}, R(3))).toBe(1);
        expect(compareToBreakpoint(R(-5), {x: -4, y: 3}, {x: 0, y: 5}, R(3))).toBe(-1);
        expect(compareToBreakpoint(R(-3), {x: 0, y: 5}, {x: 4, y: 3}, R(3))).toBe(-1);
        expect(compareToBreakpoint(R(5), {x: 0, y: 5}, {x: 4, y: 3}, R(3))).toBe(1);
        expect(compareToBreakpoint(R(2), {x: 0, y: 3}, {x: 4, y: 3}, R(3))).toBe(0); // two pointed arcs: the midpoint
        expect(() => compareToBreakpoint(R(0), {x: 0, y: 0}, {x: 1, y: 1}, R(1))).toThrow(RangeError);
        // (0,5) | (0,3) at the level 0: D(0) > 0 between the roots, so the site (0,0) is right of the breakpoint
        expect(compareToBreakpoint(R(0), {x: 0, y: 5}, {x: 0, y: 3}, level)).toBe(1);
        expect(compareToBreakpoint(R(0), {x: 0, y: 3}, {x: 0, y: 5}, level)).toBe(-1);
    });

    // Exact hits with unequal arc heights (u_i != u_j), found by enumeration and checked against the parabolas:
    // y_i(x) = (x - i_x)^2 / (2 u_i) + (i_y + l) / 2 equals y_j at s_x, with i the lower arc just left of s_x and j just
    // right of it. Right site higher takes the larger root, right site lower the smaller one.
    it('returns 0 exactly at the breakpoint of arcs with unequal heights, and the signs on both sides', () => {
        const level = R(0);
        const cases: readonly [GridPoint, GridPoint, number][] = [
            [{x: -4, y: 1}, {x: 3, y: 2}, -1], // right higher: u = 1, 2
            [{x: -4, y: 2}, {x: 3, y: 1}, 0], // right lower: u = 2, 1
            [{x: -4, y: 1}, {x: -2, y: 5}, -2],
            [{x: -4, y: 3}, {x: -1, y: 6}, -1],
        ];
        for (const [left, right, root] of cases) {
            const heightOf = (p: GridPoint, x: number): Rational => R((x - p.x) ** 2).div(R(2 * p.y)).add(R(p.y, 2));
            expect(heightOf(left, root).compare(heightOf(right, root)), `parabolas meet at ${root}`).toBe(0);
            expect(compareToBreakpoint(R(root), left, right, level), JSON.stringify([left, right, root])).toBe(0);
            expect(compareToBreakpoint(R(2 * root - 1, 2), left, right, level)).toBe(-1);
            expect(compareToBreakpoint(R(2 * root + 1, 2), left, right, level)).toBe(1);
        }
    });
});

describe('random general-position site sets', () => {
    it('equals the Delaunay dual, with empty executed and non-empty cancelled circles', () => {
        const rnd = lcg(2026);
        let accepted = 0;
        let attempts = 0;
        const stats = {cancelled: 0, executed: 0, equalY: 0, bySize: new Map<number, number>()};
        while (accepted < 300 && attempts < 20000) {
            attempts++;
            const n = 3 + Math.floor(rnd() * (SWEEP_MAX_SITES - 2));
            const sites = distinctSites(rnd, n, 10);
            if (hasCollinearTriple(sites) || hasCocircularQuad(sites)) continue;
            accepted++;
            if (hasEqualY(sites)) stats.equalY++;
            const result = expectDual(sites);
            const counts = checkRun(sites, result);
            stats.cancelled += counts.cancelled;
            stats.executed += counts.executed;
            expect(counts.byExecuted).toBe(0); // general position: no false alarms
            // a hit (site below a breakpoint) can occur in general position too
            expect(result.diagram.vertices.length).toBe(2 * n - 2 - hullBoundary(sites));
            expect(result.circles.length).toBe(counts.cancelled + counts.executed);
            expect(result.diagram.vertices.every((v) => v.sites.length === 3)).toBe(true);
            stats.bySize.set(n, (stats.bySize.get(n) ?? 0) + 1);
        }
        // Observed with this seed (see docs/reviews/sweep-algorithms/22-random.log): 300 sets, n = 3..12.
        expect(accepted).toBe(300);
        expect(stats.cancelled).toBeGreaterThan(100);
        expect(stats.executed).toBeGreaterThan(1000);
        expect(stats.bySize.size).toBe(SWEEP_MAX_SITES - 2);
    });

    it('also holds with all-distinct heights and with large coordinates', () => {
        const rnd = lcg(77);
        let done = 0;
        let attempts = 0;
        while (done < 60 && attempts < 5000) {
            attempts++;
            const n = 3 + Math.floor(rnd() * (SWEEP_MAX_SITES - 2));
            const sites = distinctSites(rnd, n, SWEEP_COORD_LIMIT);
            if (hasCollinearTriple(sites) || hasCocircularQuad(sites)) continue;
            done++;
            const result = expectDual(sites);
            checkRun(sites, result);
        }
        expect(done).toBe(60);
    });

    it('keeps the trace consistent: queue empties, every circle has a fate, status ends with the final beach line', () => {
        const rnd = lcg(404);
        for (let t = 0; t < 60; t++) {
            const sites = distinctSites(rnd, 3 + Math.floor(rnd() * 10), 8);
            const result = run(sites);
            const final = fortuneStateAt(result, sites, result.trace.length - 1);
            expect(final.sweep.queue).toEqual([]);
            expect(final.sweep.done).toBe(true);
            expect(final.vertices).toEqual(result.diagram.vertices.map((_, i) => i));
            const pops = result.trace.filter((e) => e.kind === 'pop').length;
            expect(pops).toBe(sites.length + result.circles.filter((c) => c.fate.kind === 'executed').length);
            for (const c of result.circles) {
                expect(result.trace[c.scheduled].kind).toBe('schedule');
                expect(result.trace[c.fate.event].kind).toBe(c.fate.kind === 'executed' ? 'pop' : 'cancel');
                expect(c.fate.event).toBeGreaterThan(c.scheduled);
            }
            // a status never holds two equal neighbours
            const beach = final.beach;
            for (let k = 0; k + 1 < beach.length; k++) expect(beach[k]).not.toBe(beach[k + 1]);
            expect(result.arcSite.length).toBeGreaterThanOrEqual(sites.length);
        }
    });
});

describe('degenerate inputs', () => {
    it('handles equal-y sites: pointed first arcs, tie by increasing x', () => {
        for (const sites of [
            [{x: 0, y: 5}, {x: -4, y: 3}, {x: 4, y: 3}],
            [{x: 3, y: 2}, {x: -3, y: 2}, {x: 0, y: -4}],
            [{x: 0, y: 0}, {x: 2, y: 0}, {x: 1, y: 3}, {x: 5, y: 3}],
            [{x: -1, y: 7}, {x: 6, y: 7}, {x: 2, y: 1}, {x: 9, y: 1}, {x: 4, y: -5}],
        ]) {
            const result = expectDual(sites);
            checkRun(sites, result);
        }
    });

    it('handles all sites at one height: vertical bisectors from infinity, no circle events', () => {
        const sites = [{x: 4, y: 2}, {x: -3, y: 2}, {x: 0, y: 2}, {x: 9, y: 2}];
        const result = expectDual(sites);
        expect(result.circles).toHaveLength(0);
        expect(result.diagram.vertices).toHaveLength(0);
        expect(result.diagram.edges.every((e) => e.kind === 'line')).toBe(true);
        expect(result.diagram.edges).toHaveLength(3);
        const two = expectDual([{x: 0, y: 1}, {x: 3, y: 1}]);
        expect(two.diagram.edges.map((e) => e.kind)).toEqual(['line']);
    });

    it('handles all sites collinear: parallel line edges, no vertices', () => {
        for (const sites of [
            [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}, {x: -3, y: -3}],
            [{x: 0, y: 5}, {x: 0, y: 3}, {x: 0, y: -1}],
            [{x: 0, y: 0}, {x: 4, y: 2}, {x: 2, y: 1}, {x: -2, y: -1}, {x: 6, y: 3}],
            [{x: 0, y: 0}, {x: 5, y: 0}],
            [{x: 1, y: 4}, {x: 3, y: 1}],
        ]) {
            const result = expectDual(sites);
            expect(result.diagram.vertices).toHaveLength(0);
            expect(result.diagram.edges).toHaveLength(sites.length - 1);
            expect(result.diagram.edges.every((e) => e.kind === 'line')).toBe(true);
            expect(result.circles).toHaveLength(0);
        }
    });

    it('handles four cocircular sites: one vertex of degree four, even with several circle events', () => {
        const rect = [{x: -3, y: 2}, {x: 3, y: 2}, {x: 3, y: -2}, {x: -3, y: -2}];
        const a = expectDual(rect);
        expect(a.diagram.vertices.map((v) => [key(v.point), v.sites.length])).toEqual([['0,0', 4]]);
        // unequal heights, four points on x^2 + y^2 = 25
        const circle = [{x: 0, y: 5}, {x: 4, y: 3}, {x: 3, y: -4}, {x: -4, y: 3}];
        const b = expectDual(circle);
        expect(b.diagram.vertices).toHaveLength(1);
        expect(b.diagram.vertices[0].sites).toEqual([0, 1, 2, 3]);
        expect(b.diagram.edges).toHaveLength(4);
        expect(b.circles.filter((c) => c.fate.kind === 'executed').length).toBeGreaterThanOrEqual(2);
        checkRun(circle, b);
        // six sites on one circle (all permutations of the input order give the same value)
        const six = [{x: 5, y: 0}, {x: -5, y: 0}, {x: 3, y: 4}, {x: -3, y: 4}, {x: 3, y: -4}, {x: -3, y: -4}];
        const shuffled = lcg(3);
        for (let t = 0; t < 20; t++) {
            const order = six.map((p) => ({p, k: shuffled()})).sort((x, y) => x.k - y.k).map((e) => e.p);
            const r = expectDual(order);
            expect(r.diagram.vertices).toHaveLength(1);
            expect(r.diagram.vertices[0].sites).toEqual([0, 1, 2, 3, 4, 5]);
            checkRun(order, r);
        }
    });

    it('creates a vertex at once for a site directly below a breakpoint', () => {
        const sites = [{x: -2, y: 4}, {x: 2, y: 4}, {x: 0, y: 0}];
        const result = expectDual(sites);
        expect(result.siteEvents[2].hit).not.toBeNull();
        expect(result.siteEvents[2].above).toBeNull();
        expect(key(result.diagram.vertices[0].point)).toBe('0,5/2');
        const popAt = result.siteEvents[2].event;
        expect(result.trace.slice(popAt, popAt + 3).map((e) => e.kind)).toEqual(['pop', 'status-insert', 'report']);
        expect(result.circles).toHaveLength(0);
        checkRun(sites, result);
    });

    it('finds exact hits among small-grid sets and still equals the dual', () => {
        const rnd = lcg(909);
        const seen = {hit: 0, cocircular: 0, equalY: 0, collinear: 0, total: 0, inside: 0, byExecuted: 0};
        for (let t = 0; t < 500; t++) {
            const sites = distinctSites(rnd, 3 + Math.floor(rnd() * 8), 3);
            const result = expectDual(sites);
            const counts = checkRun(sites, result);
            seen.inside += counts.inside;
            seen.byExecuted += counts.byExecuted;
            seen.total++;
            if (counts.hits > 0) seen.hit++;
            if (hasCocircularQuad(sites)) seen.cocircular++;
            if (hasEqualY(sites)) seen.equalY++;
            if (hasCollinearTriple(sites)) seen.collinear++;
            expect(result.diagram.vertices.length).toBeLessThanOrEqual(2 * sites.length - 2 - hullBoundary(sites));
        }
        expect(seen.byExecuted).toBeGreaterThan(50); // false alarms do occur and are covered by the rule
        expect(seen.inside).toBeGreaterThan(300);
        expect(seen.hit).toBeGreaterThan(10);
        expect(seen.cocircular).toBeGreaterThan(100);
        expect(seen.equalY).toBeGreaterThan(300);
        expect(seen.collinear).toBeGreaterThan(300);
    });
});

describe('event order with surd heights', () => {
    /** Heights c_y - sqrt(r) as doubles: what the exact comparison must not be replaced with. */
    const asDouble = (q: Rational, r: Rational): number => q.toNumber() - Math.sqrt(r.toNumber());

    it('orders circle events by exact height, ties by x, on every random run', () => {
        const rnd = lcg(31);
        for (let t = 0; t < 150; t++) {
            const sites = distinctSites(rnd, 3 + Math.floor(rnd() * 10), 6);
            const result = run(sites);
            const executed = result.order.filter((id) => id >= result.siteCount).map((id) => result.circles[id - result.siteCount]);
            // popped in non-increasing exact height; equal heights by increasing centre x (or same centre)
            for (let k = 0; k + 1 < executed.length; k++) {
                const [p, q] = [executed[k], executed[k + 1]];
                const byHeight = compareSurdHeights(p.centre.y, p.r2, q.centre.y, q.r2);
                expect(byHeight).toBeGreaterThanOrEqual(0);
                if (byHeight === 0) expect(p.centre.x.compare(q.centre.x)).toBeLessThanOrEqual(0);
            }
        }
    });

    // Exhaustive search (22-doubles.log): all 14 066 996 grid triples in [-10, 10]^2, 10 086 360 distinct circles, lowest
    // points compared with each other and with the 441 site heights. Heights q - sqrt(r) with irrational sqrt(r) gave no
    // double inversion or tie of distinct values in 97 690 359 near pairs. Doubles do fail on exact rational ties:
    // distinct circles whose lowest points are the same rational number (r a perfect square) get doubles one ulp apart
    // in either direction, so the double order contradicts the x tie rule. This is the smallest such set found (5 sites,
    // searched for effects on the real pop order): circles of equal height -25/3 with different centre x.
    it('pops circle events of equal exact height by increasing x, which doubles can invert', () => {
        const sites = [{x: -6, y: -8}, {x: 0, y: 0}, {x: -6, y: 8}, {x: 0, y: -8}, {x: 6, y: -4}];
        const result = run(sites);
        expect(result.order).toEqual([2, 1, 4, 5, 0, 3, 6, 9, 8]);
        const executed = result.order.filter((id) => id >= result.siteCount).map((id) => result.circles[id - result.siteCount]);
        let pairs = 0;
        let inverted = 0;
        for (let k = 0; k + 1 < executed.length; k++) {
            const [p, q] = [executed[k], executed[k + 1]];
            if (compareSurdHeights(p.centre.y, p.r2, q.centre.y, q.r2) !== 0 || p.centre.equals(q.centre)) continue;
            pairs++;
            expect(p.centre.x.compare(q.centre.x)).toBeLessThan(0);
            if (asDouble(p.centre.y, p.r2) < asDouble(q.centre.y, q.r2)) inverted++; // doubles would pop q first
        }
        expect(pairs).toBeGreaterThan(0);
        expect(inverted).toBeGreaterThan(0);
    });

    // A site at a circle's lowest point has the circle's height and x. Convention: the circle event pops first, so the
    // vertex is reported by that event and the site then hits the breakpoint of B | C. The opposite order (site first,
    // a hit on the zero-width arc of A) gives the same diagram but a different trace, so a flip is observed here.
    it('pops a circle event before a site at its lowest point', () => {
        const sites = [{x: 0, y: 5}, {x: -4, y: 3}, {x: 4, y: 3}, {x: 0, y: -5}]; // all on x^2 + y^2 = 25
        const result = expectDual(sites);
        expect(result.circles[0].centre.equals(RationalPoint.fromGrid({x: 0, y: 0}))).toBe(true);
        expect(result.circles[0].fate.kind).toBe('executed');
        expect(result.order).toEqual([0, 1, 2, 4, 3]);
        expect(result.siteEvents[3].hit).not.toBeNull(); // after the circle event the site is below the breakpoint of B | C
        expect(result.trace.filter((e) => e.kind === 'report')).toHaveLength(1); // one vertex, reported by the circle event
        const order = fortuneQueueOrder(result, sites);
        const entries = {circle: {id: 4, position: result.circles[0].centre}, site: {id: 3, position: RationalPoint.fromGrid(sites[3])}};
        expect(order(entries.circle, entries.site)).toBeLessThan(0);
        expect(order(entries.site, entries.circle)).toBeGreaterThan(0);
    });
});
