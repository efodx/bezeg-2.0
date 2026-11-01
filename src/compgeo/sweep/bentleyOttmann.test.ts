import {describe, expect, it} from 'vitest';
import {Rational, RationalPoint} from '../rational';
import {bentleyOttmannTrace, checkBentleyOttmannInput, type NeighbourOutcome} from './bentleyOttmann';
import {compareEventPositions} from './eventOrder';
import {SWEEP_COORD_LIMIT, SWEEP_MAX_SEGMENTS} from './limits';
import {
    bruteForceIntersections,
    compareAtSweep,
    type IntersectionPoint,
    lowerEndpoint,
    type Segment,
    segmentIntersection,
    upperEndpoint,
} from './segments';
import {foldSweepEvent, initialSweepState, type SweepState, sweepStateAt, type SweepTrace} from './sweepTrace';

const R = (n: number, d = 1) => Rational.of(n, d);
const P = (xn: number, xd: number, yn: number, yd: number) => new RationalPoint(R(xn, xd), R(yn, yd));
const seg = (ax: number, ay: number, bx: number, by: number): Segment => ({a: {x: ax, y: ay}, b: {x: bx, y: by}});
const fmt = (p: RationalPoint) => `(${p.x.format()},${p.y.format()})`;

function run(segments: readonly Segment[]): SweepTrace<IntersectionPoint> {
    const result = bentleyOttmannTrace(segments);
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusal)}`);
    return result.trace;
}

/** Fold states after the last event of each pop group (the status after the event point is fully handled). */
function popGroups(trace: SweepTrace<IntersectionPoint>) {
    const pops = trace.flatMap((e, i) => (e.kind === 'pop' ? [i] : []));
    return pops.map((start, k) => {
        const stop = k + 1 < pops.length ? pops[k + 1] - 1 : trace.length - 2; // the last group ends before the trailing `done`
        return {start, stop, events: trace.slice(start, stop + 1), state: sweepStateAt(trace, stop)};
    });
}

/** Spec C2 default example: s0..s3. */
const C2: readonly Segment[] = [seg(0, 0, 6, 4), seg(0, 4, 6, 0), seg(1, -1, 2, 5), seg(4, 5, 5, -1)];

describe('Bentley-Ottmann default example (spec C2)', () => {
    // Event positions and the status after each, copied from the spec text (not from the kernel).
    const SPEC_EVENTS: readonly { at: RationalPoint; status: readonly number[] }[] = [
        {at: P(2, 1, 5, 1), status: [2]},
        {at: P(4, 1, 5, 1), status: [2, 3]},
        {at: P(0, 1, 4, 1), status: [1, 2, 3]},
        {at: P(6, 1, 4, 1), status: [1, 2, 3, 0]},
        {at: P(33, 20, 29, 10), status: [2, 1, 3, 0]},
        {at: P(87, 20, 29, 10), status: [2, 1, 0, 3]},
        {at: P(3, 1, 2, 1), status: [2, 0, 1, 3]},
        {at: P(21, 16, 7, 8), status: [0, 2, 1, 3]},
        {at: P(75, 16, 7, 8), status: [0, 2, 3, 1]},
        {at: P(0, 1, 0, 1), status: [2, 3, 1]},
        {at: P(6, 1, 0, 1), status: [2, 3]},
        {at: P(1, 1, -1, 1), status: [3]},
        {at: P(5, 1, -1, 1), status: []},
    ];
    const SPEC_CROSSINGS: readonly { at: RationalPoint; segments: readonly number[] }[] = [
        {at: P(33, 20, 29, 10), segments: [1, 2]},
        {at: P(87, 20, 29, 10), segments: [0, 3]},
        {at: P(3, 1, 2, 1), segments: [0, 1]},
        {at: P(21, 16, 7, 8), segments: [0, 2]},
        {at: P(75, 16, 7, 8), segments: [1, 3]},
    ];

    it('pops exactly the 13 events in order with the spec status after each', () => {
        const groups = popGroups(run(C2));
        expect(groups).toHaveLength(13);
        groups.forEach((group, k) => {
            const pop = group.events[0].payload as { position: RationalPoint };
            expect(fmt(pop.position), `event ${k}`).toBe(fmt(SPEC_EVENTS[k].at));
            expect(group.state.status, `status after event ${k}`).toEqual(SPEC_EVENTS[k].status);
            expect(group.state.position?.equals(SPEC_EVENTS[k].at)).toBe(true);
        });
    });

    it('reports the five crossings with the exact rationals, each once, with their segments', () => {
        const trace = run(C2);
        const final = sweepStateAt(trace, trace.length - 1);
        expect(final.output.map((o) => ({at: fmt(o.point), segments: o.segments}))).toEqual(
            SPEC_CROSSINGS.map((c) => ({at: fmt(c.at), segments: c.segments})),
        );
        expect(final.done).toBe(true);
        expect(final.status).toEqual([]);
        expect(final.queue).toEqual([]);
    });

    it('counts 9 neighbour tests (hand-derived) against the 6 pairs, with these outcomes', () => {
        const trace = run(C2);
        const tests = trace.flatMap((e) => (e.kind === 'neighbour-test' ? [e.payload as { a: number; b: number; outcome: NeighbourOutcome }] : []));
        expect(tests.map((t) => [t.a, t.b, t.outcome])).toEqual([
            [2, 3, 'none'],
            [1, 2, 'schedule'],
            [3, 0, 'schedule'],
            [1, 3, 'schedule'],
            [1, 0, 'schedule'],
            [2, 0, 'schedule'],
            [1, 3, 'queued'],
            [2, 1, 'passed'],
            [2, 3, 'none'],
        ]);
        const final = sweepStateAt(trace, trace.length - 1);
        expect(final.neighbourTests).toBe(9);
    });

    it('swaps the two segments of a crossing in one status-swap and schedules each crossing once', () => {
        const trace = run(C2);
        const swaps = trace.filter((e) => e.kind === 'status-swap').map((e) => e.payload);
        expect(swaps).toEqual([{first: 0, last: 1}, {first: 2, last: 3}, {first: 1, last: 2}, {first: 0, last: 1}, {first: 2, last: 3}]);
        const scheduled = trace.filter((e) => e.kind === 'schedule').map((e) => (e.payload as { position: RationalPoint }).position);
        expect(scheduled).toHaveLength(13); // 8 endpoints + 5 crossings
        expect(new Set(scheduled.map(fmt)).size).toBe(13);
    });
});

describe('Bentley-Ottmann degenerate example', () => {
    const a = seg(0, 0, 4, 4);
    const b = seg(0, 4, 4, 0);
    const c = seg(0, 2, 4, 2);
    const d = seg(2, 0, 2, 4);

    function group(segments: readonly Segment[], at: RationalPoint) {
        const trace = run(segments);
        const groups = popGroups(trace);
        const index = groups.findIndex((g) => (g.events[0].payload as { position: RationalPoint }).position.equals(at));
        return {groups, index, trace};
    }

    it('three segments through (2,2): one report with all three and the block reversed in one step', () => {
        const {groups, index, trace} = group([a, b, c], P(2, 1, 2, 1));
        const before = sweepStateAt(trace, groups[index].start - 1).status;
        expect(before).toEqual([2, 1, 0]); // c (horizontal) is placed at its left endpoint; b left of a
        expect(groups[index].state.status).toEqual([0, 1, 2]);
        expect(groups[index].events.map((e) => e.kind)).toEqual(['pop', 'report', 'status-swap']);
        expect(groups[index].events[1].payload).toEqual({item: {point: P(2, 1, 2, 1), segments: [0, 1, 2]}});
        expect(groups[index].events[2].payload).toEqual({first: 0, last: 2});
        const reports = trace.filter((e) => e.kind === 'report');
        expect(reports).toHaveLength(1);
    });

    it('adding the vertical d gives one report with four segments and the whole block reversed', () => {
        const {groups, index, trace} = group([a, b, c, d], P(2, 1, 2, 1));
        const before = sweepStateAt(trace, groups[index].start - 1).status;
        expect(before).toEqual([2, 1, 3, 0]);
        expect(groups[index].state.status).toEqual([0, 3, 1, 2]);
        expect(groups[index].events[1].payload).toEqual({item: {point: P(2, 1, 2, 1), segments: [0, 1, 2, 3]}});
        expect(groups[index].events[2].payload).toEqual({first: 0, last: 3});
        expect(trace.filter((e) => e.kind === 'report')).toHaveLength(1);
    });
});

describe('Bentley-Ottmann special cases', () => {
    it('handles an empty set and a single segment', () => {
        const empty = run([]);
        expect(empty.map((e) => e.kind)).toEqual(['done']);
        const one = run([seg(0, 0, 3, 3)]);
        expect(sweepStateAt(one, one.length - 1).output).toEqual([]);
        expect(sweepStateAt(one, one.length - 1).neighbourTests).toBe(0);
    });

    it('reports a shared endpoint and an endpoint on an interior (T contact) once each', () => {
        const trace = run([seg(0, 0, 4, 4), seg(4, 4, 8, 0), seg(2, 2, 6, 2)]); // (4,4) shared, (2,2) on s0's interior
        const out = sweepStateAt(trace, trace.length - 1).output.map((o) => [fmt(o.point), o.segments]);
        expect(out).toEqual([
            ['(4,4)', [0, 1]],
            ['(2,2)', [0, 2]],
            ['(6,2)', [1, 2]],
        ]);
    });

    it('lets collinear segments that only touch pass (no overlap)', () => {
        const trace = run([seg(0, 0, 2, 0), seg(2, 0, 4, 0), seg(4, 0, 4, 3)]);
        const out = sweepStateAt(trace, trace.length - 1).output.map((o) => [fmt(o.point), o.segments]);
        expect(out).toEqual([
            ['(2,0)', [0, 1]],
            ['(4,0)', [1, 2]],
        ]);
    });

    it('treats a zero-length segment as a point event: reported with the segments through it, never in the status', () => {
        const trace = run([seg(0, 0, 4, 4), seg(2, 2, 2, 2), seg(2, 2, 2, 2), seg(5, 5, 5, 5)]);
        const final = sweepStateAt(trace, trace.length - 1);
        expect(final.output).toEqual([{point: P(2, 1, 2, 1), segments: [0, 1, 2]}]);
        const inserted = trace.filter((e) => e.kind === 'status-insert').map((e) => (e.payload as { id: number }).id);
        expect(inserted).toEqual([0]);
    });
});

describe('Bentley-Ottmann refusals (before any trace)', () => {
    it('refuses more than the segment limit', () => {
        const many = Array.from({length: SWEEP_MAX_SEGMENTS + 1}, (_, i) => seg(0, 3 * i, 1, 3 * i + 1));
        expect(bentleyOttmannTrace(many)).toEqual({
            ok: false,
            refusal: {reason: 'too-many-segments', count: SWEEP_MAX_SEGMENTS + 1, max: SWEEP_MAX_SEGMENTS},
        });
        expect(bentleyOttmannTrace(many.slice(0, SWEEP_MAX_SEGMENTS)).ok).toBe(true);
    });

    it('refuses off-grid and out-of-range endpoints, naming the segment and end', () => {
        expect(bentleyOttmannTrace([seg(0, 0, 1, 1), seg(0, 0, 0.5, 1)])).toEqual({
            ok: false,
            refusal: {reason: 'not-grid', segment: 1, end: 'b'},
        });
        expect(bentleyOttmannTrace([seg(SWEEP_COORD_LIMIT + 1, 0, 1, 1)])).toEqual({
            ok: false,
            refusal: {reason: 'out-of-range', segment: 0, end: 'a'},
        });
        expect(bentleyOttmannTrace([seg(-SWEEP_COORD_LIMIT, 0, SWEEP_COORD_LIMIT, 0)]).ok).toBe(true);
    });

    it('refuses collinear overlap and names the first pair', () => {
        const segments = [seg(0, 0, 4, 0), seg(1, 1, 2, 2), seg(2, 0, 6, 0), seg(3, 3, 1, 1)];
        const result = bentleyOttmannTrace(segments);
        expect(result).toEqual({ok: false, refusal: {reason: 'overlap', pair: [0, 2]}});
        expect(checkBentleyOttmannInput([seg(1, 1, 2, 2), seg(3, 3, 1, 1)])).toEqual({reason: 'overlap', pair: [0, 1]});
        // a contained and an identical segment overlap too
        expect(checkBentleyOttmannInput([seg(0, 0, 5, 5), seg(1, 1, 3, 3)])).toEqual({reason: 'overlap', pair: [0, 1]});
        expect(checkBentleyOttmannInput([seg(0, 0, 5, 0), seg(5, 0, 0, 0)])).toEqual({reason: 'overlap', pair: [0, 1]});
    });
});

// ---- random grid sets against the brute-force oracle ----

/** Deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Generator = (rand: () => number) => Segment[];

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const count = (rand: () => number) => int(rand, 2, SWEEP_MAX_SEGMENTS);

/** Uniform endpoints on a small grid (some zero-length ones occur by chance). */
const uniform: Generator = (rand) => {
    const n = count(rand);
    return Array.from({length: n}, () => seg(int(rand, 0, 6), int(rand, 0, 6), int(rand, 0, 6), int(rand, 0, 6)));
};

/** Draws up to a random count of segments, skipping candidates that overlap an earlier one (the sweep refuses those). */
function fill(rand: () => number, draw: (out: readonly Segment[]) => Segment): Segment[] {
    const out: Segment[] = [];
    const n = count(rand);
    for (let tries = 0; out.length < n && tries < 40 * n; tries++) {
        const candidate = draw(out);
        if (!out.some((o) => segmentIntersection(o, candidate).kind === 'overlap')) out.push(candidate);
    }
    return out;
}

/** Endpoints drawn from a tiny pool: many shared endpoints and endpoints on other segments. */
const sharedEndpoints: Generator = (rand) => {
    const pool = Array.from({length: int(rand, 3, 7)}, () => ({x: int(rand, 0, 4), y: int(rand, 0, 4)}));
    const pick = () => pool[int(rand, 0, pool.length - 1)];
    return fill(rand, () => ({a: pick(), b: pick()}));
};

/** Axis-parallel segments (verticals, horizontals) mixed with a few slanted ones. */
const axisParallel: Generator = (rand) =>
    fill(rand, () => {
        const kind = rand();
        const x = int(rand, 0, 6);
        const y = int(rand, 0, 6);
        if (kind < 0.35) return seg(x, y, x, int(rand, 0, 6)); // vertical
        if (kind < 0.7) return seg(x, y, int(rand, 0, 6), y); // horizontal
        return seg(x, y, int(rand, 0, 6), int(rand, 0, 6));
    });

/** Endpoints placed on lattice points of earlier segments (T contacts), plus vertical and horizontal hosts. */
const endpointOnInterior: Generator = (rand) =>
    fill(rand, (out) => {
        if (out.length === 0 || rand() < 0.3) {
            const k = int(rand, 1, 3);
            const dx = int(rand, -2, 2);
            const dy = int(rand, -2, 2);
            const x = int(rand, 2, 8);
            const y = int(rand, 2, 8);
            return seg(x, y, x + 2 * k * dx, y + 2 * k * dy); // even multiple: its midpoint is a lattice point
        }
        const host = out[int(rand, 0, out.length - 1)];
        const t = int(rand, 0, 2); // 0: start, 1: midpoint, 2: end of the host (lattice points of the host only)
        const mid = {x: (host.a.x + host.b.x) / 2, y: (host.a.y + host.b.y) / 2};
        const anchor = t === 0 ? host.a : t === 1 ? (Number.isInteger(mid.x) && Number.isInteger(mid.y) ? mid : host.a) : host.b;
        return seg(anchor.x, anchor.y, int(rand, 0, 10), int(rand, 0, 10));
    });

/** Several lines through a common centre (three or more segments through one point); some end at the centre. */
const concurrent: Generator = (rand) => {
    const centres = [{x: int(rand, 3, 5), y: int(rand, 3, 5)}, {x: int(rand, 3, 5), y: int(rand, 3, 5)}];
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1], [2, 1], [1, 2], [2, -1], [1, -2]];
    return fill(rand, () => {
        const c = centres[rand() < 0.7 ? 0 : 1];
        const [dx, dy] = dirs[int(rand, 0, dirs.length - 1)];
        const along = int(rand, 1, 2);
        const back = rand() < 0.3 ? 0 : int(rand, 1, 2); // 0: the segment starts at the centre
        return seg(c.x - back * dx, c.y - back * dy, c.x + along * dx, c.y + along * dy);
    });
};

const GENERATORS: readonly (readonly [string, Generator])[] = [
    ['uniform', uniform],
    ['shared endpoints', sharedEndpoints],
    ['axis parallel', axisParallel],
    ['endpoint on interior', endpointOnInterior],
    ['concurrent', concurrent],
];
const SETS_PER_GENERATOR = 220;

const keyOf = (p: RationalPoint) => fmt(p);

/** All structural checks of one trace against the oracle; returns facts for the coverage assertions. */
function checkAgainstOracle(segments: readonly Segment[]) {
    const oracle = bruteForceIntersections(segments);
    const trace = run(segments);
    const final = sweepStateAt(trace, trace.length - 1);

    // Reported points and segment sets equal the brute-force ones (set equality), each point once.
    const asEntry = (o: IntersectionPoint) => `${keyOf(o.point)}:${o.segments.join(',')}`;
    expect(final.output.map(asEntry).sort()).toEqual(oracle.points.map(asEntry).sort());
    expect(new Set(final.output.map((o) => keyOf(o.point))).size).toBe(final.output.length);

    // No event scheduled twice (by id and by position); events popped in strictly increasing processing order.
    const scheduled = trace.flatMap((e) => (e.kind === 'schedule' ? [e.payload as { id: number; position: RationalPoint }] : []));
    expect(new Set(scheduled.map((s) => s.id)).size).toBe(scheduled.length);
    expect(new Set(scheduled.map((s) => keyOf(s.position))).size).toBe(scheduled.length);
    const pops = trace.flatMap((e) => (e.kind === 'pop' ? [e.payload as { id: number; position: RationalPoint }] : []));
    expect(pops.map((p) => p.id).sort((a, b) => a - b)).toEqual(scheduled.map((s) => s.id).sort((a, b) => a - b));
    for (let i = 1; i < pops.length; i++) expect(compareEventPositions(pops[i - 1].position, pops[i].position)).toBe(-1);

    // Counters: the folded neighbour-test counter equals the number of neighbour-test events; predicates are cumulative.
    expect(final.neighbourTests).toBe(trace.filter((e) => e.kind === 'neighbour-test').length);
    expect(final.predicateCalls).toBe(trace[trace.length - 1].predicateCount);
    for (let i = 1; i < trace.length; i++) expect(trace[i].predicateCount).toBeGreaterThanOrEqual(trace[i - 1].predicateCount);
    expect(final.done).toBe(true);
    expect(final.status).toEqual([]);
    expect(final.queue).toEqual([]);

    // Status membership and order after every event point; every neighbour test replayed.
    for (const group of popGroups(trace)) {
        const p = group.state.position;
        if (p === null) throw new Error('no position after a pop');
        expect([...group.state.status].sort((x, y) => x - y), `status members after ${fmt(p)}`).toEqual(expectedStatus(segments, p));
        checkStatusOrder(segments, group.state, p);
    }
    checkNeighbourTests(segments, trace);
    return {oracle, trace};
}

/** Exact abscissa of a segment at height y for the status order: a horizontal one (or a point) sits at x0. */
function statusX(s: Segment, y: Rational, x0: Rational): Rational {
    if (s.a.y === s.b.y) return x0;
    const low = lowerEndpoint(s);
    const up = upperEndpoint(s);
    return R(low.x).add(R(up.x - low.x).mul(y.sub(R(low.y))).div(R(up.y - low.y)));
}

/**
 * Acceptance 4, written from the definition (exact x at the event height) and not from the kernel's own comparisons.
 * Adjacent status entries are non-decreasing in x at y = p.y (a horizontal segment sits at p.x). A tie at or left of
 * p must be in the order just below (compareAtSweep); a tie at a point further right on the line has not been
 * processed yet and must still be in the order just above, checked at a height strictly above p.y inside both
 * segments (they meet only once, so no further crossing can hide between).
 */
function checkStatusOrder(segments: readonly Segment[], state: SweepState<IntersectionPoint>, p: RationalPoint) {
    for (let i = 1; i < state.status.length; i++) {
        const s = segments[state.status[i - 1]];
        const t = segments[state.status[i]];
        const xs = statusX(s, p.y, p.x);
        const xt = statusX(t, p.y, p.x);
        const label = `${state.status[i - 1]},${state.status[i]} at ${fmt(p)}`;
        expect(xs.compare(xt), `x order of ${label}`).toBeLessThanOrEqual(0);
        if (xs.compare(xt) < 0) continue;
        if (xs.compare(p.x) <= 0) {
            expect(compareAtSweep(s, t, p.y, p.x), `tie at or left of p, ${label}`).toBe(-1);
        } else {
            const top = (u: Segment) => R(upperEndpoint(u).y);
            const ceiling = top(s).compare(top(t)) < 0 ? top(s) : top(t);
            expect(ceiling.compare(p.y), `both segments extend above ${label}`).toBeGreaterThan(0);
            const above = p.y.add(ceiling).div(R(2));
            expect(compareAtSweep(s, t, above, p.x), `not-yet-crossed pair just above, ${label}`).toBe(-1);
        }
    }
}

/** The segments that must be in the status after the event at p: started by p in event order, not yet ended, not a point. */
function expectedStatus(segments: readonly Segment[], p: RationalPoint): number[] {
    return segments.flatMap((s, i) => {
        if (s.a.x === s.b.x && s.a.y === s.b.y) return [];
        const started = compareEventPositions(RationalPoint.fromGrid(upperEndpoint(s)), p) <= 0;
        const unfinished = compareEventPositions(p, RationalPoint.fromGrid(lowerEndpoint(s))) < 0;
        return started && unfinished ? [i] : [];
    });
}

/** Replays the trace: every neighbour test is of an adjacent pair and its outcome is recomputed from the folded state. */
function checkNeighbourTests(segments: readonly Segment[], trace: SweepTrace<IntersectionPoint>) {
    let state = initialSweepState<IntersectionPoint>();
    trace.forEach((event, index) => {
        if (event.kind === 'neighbour-test') {
            const {a, b, outcome} = event.payload as { a: number; b: number; outcome: NeighbourOutcome };
            const position = state.position;
            if (position === null) throw new Error('neighbour test before the first pop');
            expect(Math.abs(state.status.indexOf(a) - state.status.indexOf(b)), `pair ${a},${b} adjacent`).toBe(1);
            expect(state.status.includes(a) && state.status.includes(b)).toBe(true);
            const contact = segmentIntersection(segments[a], segments[b]);
            let expected: NeighbourOutcome = 'none';
            if (contact.kind === 'point') {
                if (compareEventPositions(position, contact.point) >= 0) expected = 'passed';
                else if (state.queue.some((q) => q.position.equals(contact.point))) expected = 'queued';
                else expected = 'schedule';
                if (expected === 'schedule') {
                    const next = trace[index + 1];
                    expect(next.kind).toBe('schedule');
                    expect((next.payload as { position: RationalPoint }).position.equals(contact.point)).toBe(true);
                }
            }
            expect(outcome, `outcome of ${a},${b} at ${fmt(position)}`).toBe(expected);
        }
        state = foldSweepEvent(state, event);
    });
}

describe('status order check', () => {
    it('rejects a wrong order even when the pair meets later on the same line', () => {
        const segments = [seg(4, 4, 4, 0), seg(0, 2, 6, 2)]; // vertical s0 crosses the horizontal s1 at (4,2), right of p
        const p = P(0, 1, 2, 1);
        const at = (status: number[]) => ({...initialSweepState<IntersectionPoint>(), position: p, status});
        expect(() => checkStatusOrder(segments, at([0, 1]), p)).toThrow(); // s0 is at x=4, right of the horizontal at x=0
        expect(() => checkStatusOrder(segments, at([1, 0]), p)).not.toThrow();
    });

    it('requires the order just above for a not-yet-crossed tie on the line', () => {
        const segments = [seg(2, 4, 6, 2), seg(6, 4, 2, 2)]; // cross at (4,3); s0 is left of s1 above, right below
        const p = P(0, 1, 3, 1);
        const at = (status: number[]) => ({...initialSweepState<IntersectionPoint>(), position: p, status});
        expect(() => checkStatusOrder(segments, at([0, 1]), p)).not.toThrow();
        expect(() => checkStatusOrder(segments, at([1, 0]), p)).toThrow();
    });
});

describe('Bentley-Ottmann against the brute-force oracle (seeded random grid sets)', () => {
    const facts = new Map<string, { sets: number; multi: number; interior: number; shared: number; axis: number; points: number }>();

    for (const [name, generator] of GENERATORS) {
        it(`${name}: ${SETS_PER_GENERATOR} sets agree with bruteForceIntersections`, () => {
            const rand = rng(0x5eed + name.length);
            const stat = {sets: 0, multi: 0, interior: 0, shared: 0, axis: 0, points: 0};
            let refused = 0;
            for (let k = 0; k < SETS_PER_GENERATOR; k++) {
                const segments = generator(rand);
                const oracle = bruteForceIntersections(segments);
                if (oracle.overlaps.length > 0) {
                    // overlapping sets are refused, naming the lexicographically first overlapping pair
                    expect(bentleyOttmannTrace(segments)).toEqual({ok: false, refusal: {reason: 'overlap', pair: oracle.overlaps[0]}});
                    refused++;
                    continue;
                }
                try {
                    checkAgainstOracle(segments);
                } catch (error) {
                    throw new Error(`${String(error)}
segments: ${JSON.stringify(segments.map((q) => [q.a.x, q.a.y, q.b.x, q.b.y]))}`);
                }
                stat.sets++;
                stat.points += oracle.points.length;
                if (segments.some((s) => s.a.x === s.b.x || s.a.y === s.b.y)) stat.axis++;
                for (const point of oracle.points) {
                    if (point.segments.length >= 3) stat.multi++;
                    const roles = point.segments.map((i) => {
                        const isEnd = RationalPoint.fromGrid(upperEndpoint(segments[i])).equals(point.point) ||
                            RationalPoint.fromGrid(lowerEndpoint(segments[i])).equals(point.point);
                        return isEnd ? 'end' : 'interior';
                    });
                    if (roles.includes('end') && roles.includes('interior')) stat.interior++;
                    if (roles.filter((r) => r === 'end').length >= 2) stat.shared++;
                }
            }
            facts.set(name, stat);
            expect(stat.sets + refused).toBe(SETS_PER_GENERATOR);
            expect(stat.sets).toBeGreaterThan(SETS_PER_GENERATOR / 2); // the generators are not mostly refused
        });
    }

    it('the generators force each degenerate class often enough to mean something', () => {
        const total = (key: 'multi' | 'interior' | 'shared' | 'axis' | 'points') =>
            [...facts.values()].reduce((sum, f) => sum + f[key], 0);
        expect(total('points')).toBeGreaterThan(1000);
        expect(total('multi')).toBeGreaterThan(100); // three or more segments through one point
        expect(total('interior')).toBeGreaterThan(100); // an endpoint on another segment's interior
        expect(total('shared')).toBeGreaterThan(100); // two endpoints at one point
        expect(total('axis')).toBeGreaterThan(300); // sets with a vertical or horizontal segment
        expect(facts.get('concurrent')?.multi).toBeGreaterThan(50);
        expect(facts.get('endpoint on interior')?.interior).toBeGreaterThan(50);
    });

    it('the trace is a pure function of the input', () => {
        const rand = rng(77);
        for (let k = 0; k < 40; k++) {
            const segments = concurrent(rand);
            if (bruteForceIntersections(segments).overlaps.length > 0) continue;
            expect(run(segments)).toEqual(run(segments));
        }
    });
});
