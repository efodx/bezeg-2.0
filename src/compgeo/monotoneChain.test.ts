import {describe, expect, it} from 'vitest';
import {convexHull} from '../bezeg/impl/curve/geometry';
import {PointImpl} from '../bezeg/impl/point/point-impl';
import type {GridPoint} from './grid';
import {
    MONOTONE_CHAIN_MAX_POINTS,
    type MonotoneChainOptions,
    monotoneChainStateAt,
    monotoneChainTrace,
    type MonotoneChainTrace,
} from './monotoneChain';
import {stateAt} from './trace';

const p = (x: number, y: number): GridPoint => ({x, y});
const SAMPLE: GridPoint[] = [p(2, 2), p(4, 0), p(0, 0), p(5, 3), p(2, 5), p(-1, 3), p(3, 1), p(2, 0), p(1, 1)];
const coords = (pts: GridPoint[], idx: readonly number[]) => idx.map((i) => [pts[i].x, pts[i].y]);
/** `JSON.stringify` of each event of sample 1's default trace, recorded before chain options existed. */
const SAMPLE1_DEFAULT_TRACE = [
    '{"kind":"phase","noteKey":"phase-lower","payload":{"chain":"lower","points":[]},"predicateCount":0}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[5]},"predicateCount":0}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[2]},"predicateCount":0}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"lower","points":[5,2,8],"sign":1,"value":4},"predicateCount":1}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[8]},"predicateCount":1}',
    '{"kind":"test","noteKey":"test-turn-right","payload":{"chain":"lower","points":[2,8,7],"sign":-1,"value":-2},"predicateCount":2}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"lower","points":[8]},"predicateCount":2}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"lower","points":[5,2,7],"sign":1,"value":6},"predicateCount":3}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[7]},"predicateCount":3}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"lower","points":[2,7,0],"sign":1,"value":4},"predicateCount":4}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[0]},"predicateCount":4}',
    '{"kind":"test","noteKey":"test-collinear","payload":{"chain":"lower","points":[7,0,4],"sign":0,"value":0},"predicateCount":5}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"lower","points":[0]},"predicateCount":5}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"lower","points":[2,7,4],"sign":1,"value":10},"predicateCount":6}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[4]},"predicateCount":6}',
    '{"kind":"test","noteKey":"test-turn-right","payload":{"chain":"lower","points":[7,4,6],"sign":-1,"value":-5},"predicateCount":7}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"lower","points":[4]},"predicateCount":7}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"lower","points":[2,7,6],"sign":1,"value":2},"predicateCount":8}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[6]},"predicateCount":8}',
    '{"kind":"test","noteKey":"test-turn-right","payload":{"chain":"lower","points":[7,6,1],"sign":-1,"value":-2},"predicateCount":9}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"lower","points":[6]},"predicateCount":9}',
    '{"kind":"test","noteKey":"test-collinear","payload":{"chain":"lower","points":[2,7,1],"sign":0,"value":0},"predicateCount":10}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"lower","points":[7]},"predicateCount":10}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"lower","points":[5,2,1],"sign":1,"value":12},"predicateCount":11}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[1]},"predicateCount":11}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"lower","points":[2,1,3],"sign":1,"value":12},"predicateCount":12}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"lower","points":[3]},"predicateCount":12}',
    '{"kind":"phase","noteKey":"phase-upper","payload":{"chain":"upper","points":[]},"predicateCount":12}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[3]},"predicateCount":12}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[1]},"predicateCount":12}',
    '{"kind":"test","noteKey":"test-turn-right","payload":{"chain":"upper","points":[3,1,6],"sign":-1,"value":-4},"predicateCount":13}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"upper","points":[1]},"predicateCount":13}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[6]},"predicateCount":13}',
    '{"kind":"test","noteKey":"test-turn-right","payload":{"chain":"upper","points":[3,6,4],"sign":-1,"value":-10},"predicateCount":14}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"upper","points":[6]},"predicateCount":14}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[4]},"predicateCount":14}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"upper","points":[3,4,0],"sign":1,"value":9},"predicateCount":15}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[0]},"predicateCount":15}',
    '{"kind":"test","noteKey":"test-collinear","payload":{"chain":"upper","points":[4,0,7],"sign":0,"value":0},"predicateCount":16}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"upper","points":[0]},"predicateCount":16}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"upper","points":[3,4,7],"sign":1,"value":15},"predicateCount":17}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[7]},"predicateCount":17}',
    '{"kind":"test","noteKey":"test-turn-right","payload":{"chain":"upper","points":[4,7,8],"sign":-1,"value":-5},"predicateCount":18}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"upper","points":[7]},"predicateCount":18}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"upper","points":[3,4,8],"sign":1,"value":14},"predicateCount":19}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[8]},"predicateCount":19}',
    '{"kind":"test","noteKey":"test-turn-right","payload":{"chain":"upper","points":[4,8,2],"sign":-1,"value":-3},"predicateCount":20}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"upper","points":[8]},"predicateCount":20}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"upper","points":[3,4,2],"sign":1,"value":19},"predicateCount":21}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[2]},"predicateCount":21}',
    '{"kind":"test","noteKey":"test-turn-right","payload":{"chain":"upper","points":[4,2,5],"sign":-1,"value":-11},"predicateCount":22}',
    '{"kind":"reject","noteKey":"reject-pop","payload":{"chain":"upper","points":[2]},"predicateCount":22}',
    '{"kind":"test","noteKey":"test-turn-left","payload":{"chain":"upper","points":[3,4,5],"sign":1,"value":12},"predicateCount":23}',
    '{"kind":"accept","noteKey":"accept-push","payload":{"chain":"upper","points":[5]},"predicateCount":23}',
    '{"kind":"output","noteKey":"output-hull","payload":{"points":[],"hull":[5,2,1,3,4]},"predicateCount":23}',
    '{"kind":"done","noteKey":"done-hull","payload":{"points":[]},"predicateCount":23}',
];
const finalState = (t: MonotoneChainTrace) => monotoneChainStateAt(t, t.length - 1);

/** Deterministic LCG so failures reproduce. */
function rng(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s % n;
    };
}

describe('monotoneChainTrace on sample 1', () => {
    const trace = monotoneChainTrace(SAMPLE);
    const tests = trace.filter((e) => e.kind === 'test');

    it('records the hand-checked pops with exact values', () => {
        const pops = trace.filter((e) => e.kind === 'test' && (e.payload.value ?? 1) <= 0).map((e) => ({
            chain: e.payload.chain,
            at: [SAMPLE[e.payload.points[2]].x, SAMPLE[e.payload.points[2]].y],
            value: e.payload.value,
        }));
        const lower = pops.filter((x) => x.chain === 'lower');
        expect(lower).toEqual([
            {chain: 'lower', at: [2, 0], value: -2},
            {chain: 'lower', at: [2, 5], value: 0},
            {chain: 'lower', at: [3, 1], value: -5},
            {chain: 'lower', at: [4, 0], value: -2},
            {chain: 'lower', at: [4, 0], value: 0},
        ]);
    });

    it('every test carries three indices and the exact orientValue', () => {
        for (const e of tests) {
            expect(e.payload.points).toHaveLength(3);
            const [a, b, c] = e.payload.points.map((i) => SAMPLE[i]);
            const exact = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
            expect(e.payload.value).toBe(exact === 0 ? 0 : exact);
            expect(e.payload.sign).toBe(Math.sign(exact));
        }
    });

    it('ends with the CCW hull from the smallest point; (2,0) is not a vertex', () => {
        const s = finalState(trace);
        expect(s.done).toBe(true);
        expect(coords(SAMPLE, s.hull!)).toEqual([[-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]]);
        expect(coords(SAMPLE, s.hull!)).not.toContainEqual([2, 0]);
    });

    it('state mid-trace shows the chains being built', () => {
        const firstAccepts = monotoneChainStateAt(trace, 3); // phase, accept, accept, (test or accept)
        expect(firstAccepts.phase).toBe('lower');
        expect(coords(SAMPLE, firstAccepts.lower).slice(0, 2)).toEqual([[-1, 3], [0, 0]]);
        expect(firstAccepts.hull).toBeNull();
    });
});

describe('oracle', () => {
    const asOracle = (pts: GridPoint[]) => pts.map((q) => new PointImpl(q.x, q.y));
    const check = (pts: GridPoint[]) => {
        const s = finalState(monotoneChainTrace(pts));
        const expected = convexHull(asOracle(pts)).map((q) => [q.X(), q.Y()]);
        expect(coords(pts, s.hull!)).toEqual(expected);
    };

    it('matches convexHull on random small-range sets with duplicates and collinear points', () => {
        const next = rng(12345);
        for (let run = 0; run < 400; run++) {
            const n = next(14);
            const range = 1 + next(6);
            const pts = Array.from({length: n}, () => p(next(range) - 2, next(range) - 2));
            check(pts);
        }
    });

    it('matches on all-collinear input and n in {0,1,2}', () => {
        check([]);
        check([p(3, 3)]);
        check([p(3, 3), p(3, 3)]);
        check([p(0, 0), p(2, 1)]);
        check([p(0, 0), p(1, 1), p(2, 2), p(3, 3), p(-1, -1)]);
        check([p(1, 5), p(1, 2), p(1, 9), p(1, 2)]);
    });

    it('gives a point or segment with a distinct noteKey for degenerate input', () => {
        const last = (pts: GridPoint[]) => {
            const t = monotoneChainTrace(pts);
            return {e: t[t.length - 1], hull: finalState(t).hull!};
        };
        expect(last([]).e.noteKey).toBe('done-fewer-than-three');
        expect(last([p(1, 1), p(1, 1)]).hull).toEqual([0]);
        const seg = last([p(0, 0), p(1, 1), p(2, 2), p(3, 3)]);
        expect(seg.e.noteKey).toBe('done-collinear');
        expect(seg.hull).toEqual([0, 3]);
        expect(last(SAMPLE).e.noteKey).toBe('done-hull');
    });
});

describe('trace contract', () => {
    const next = rng(777);
    const inputs: GridPoint[][] = [[], [p(0, 0)], SAMPLE];
    for (let run = 0; run < 60; run++) {
        inputs.push(Array.from({length: next(MONOTONE_CHAIN_MAX_POINTS + 1)}, () => p(next(9) - 4, next(9) - 4)));
    }
    inputs.push(Array.from({length: 40}, (_, i) => p(i, i * i))); // convex position: no pops
    inputs.push(Array.from({length: 40}, (_, i) => p(i, 0))); // all collinear

    it('ends with exactly one done and stays within 8n+4 <= 324 events', () => {
        for (const pts of inputs) {
            const t = monotoneChainTrace(pts);
            expect(t.filter((e) => e.kind === 'done')).toHaveLength(1);
            expect(t[t.length - 1].kind).toBe('done');
            expect(t.length).toBeLessThanOrEqual(8 * Math.max(pts.length, 3) + 4);
            expect(t.length).toBeLessThanOrEqual(324);
        }
    });

    it('predicateCount is non-decreasing and equals the number of test events so far', () => {
        for (const pts of inputs) {
            const t = monotoneChainTrace(pts);
            let tests = 0;
            let prev = 0;
            for (const e of t) {
                if (e.kind === 'test') tests++;
                expect(e.predicateCount).toBe(tests);
                expect(e.predicateCount).toBeGreaterThanOrEqual(prev);
                prev = e.predicateCount;
            }
        }
    });

    it('stateAt is pure, frozen, and folding all events equals the final output', () => {
        const t = monotoneChainTrace(SAMPLE);
        const snapshot = JSON.stringify(t);
        for (let i = 0; i < t.length; i++) {
            const a = monotoneChainStateAt(t, i);
            expect(monotoneChainStateAt(t, i)).toEqual(a);
            expect(Object.isFrozen(a.lower) && Object.isFrozen(a.upper)).toBe(true);
        }
        expect(JSON.stringify(t)).toBe(snapshot);
        expect(Object.isFrozen(t)).toBe(true);
        expect(Object.isFrozen(t[0])).toBe(true);
        const outputEvent = t.find((e) => e.kind === 'output')!;
        expect(finalState(t).hull).toEqual(outputEvent.payload.hull);
        expect(monotoneChainStateAt(t, 10_000)).toEqual(finalState(t));
        expect(monotoneChainStateAt(t, -5)).toEqual(monotoneChainStateAt(t, 0));
        expect(stateAt(t, 0, (s: number) => s + 1, 0)).toBe(1);
    });

    it('is deterministic and does not mutate its input', () => {
        const copy = SAMPLE.map((q) => ({...q}));
        expect(monotoneChainTrace(SAMPLE)).toEqual(monotoneChainTrace(copy));
        expect(SAMPLE).toEqual(copy);
    });
});

describe('input validation', () => {
    it('rejects more than 40 points and non-grid points', () => {
        expect(() => monotoneChainTrace(Array.from({length: 41}, (_, i) => p(i, 0)))).toThrow(RangeError);
        expect(() => monotoneChainTrace([p(0, 0), p(0.5, 1), p(1, 1)])).toThrow(RangeError);
        expect(() => monotoneChainTrace([p(0, 0), p(Number.NaN, 1)])).toThrow(RangeError);
        expect(() => monotoneChainTrace([p(0, 0), p(2 ** 26, 1)])).toThrow(RangeError);
        expect(() => monotoneChainTrace(null as unknown as GridPoint[])).toThrow(TypeError);
    });
    it('accepts exactly 40 points', () => {
        expect(() => monotoneChainTrace(Array.from({length: 40}, (_, i) => p(i, i % 3)))).not.toThrow();
    });
});

describe('chain options', () => {
    const COMBOS: MonotoneChainOptions[] = [
        {pop: 'non-left', duplicates: 'merge'}, {pop: 'non-left', duplicates: 'keep'},
        {pop: 'right', duplicates: 'merge'}, {pop: 'right', duplicates: 'keep'},
    ];
    const hullOf = (pts: GridPoint[], options?: Partial<MonotoneChainOptions>) => {
        const t = monotoneChainTrace(pts, options);
        return {t, hull: finalState(t).hull!};
    };
    const key = (q: GridPoint) => `${q.x},${q.y}`;
    const cross = (o: GridPoint, a: GridPoint, b: GridPoint) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const asOracle = (pts: GridPoint[]) => pts.map((q) => new PointImpl(q.x, q.y));
    const oracle = (pts: GridPoint[]): GridPoint[] => convexHull(asOracle(pts)).map((q) => p(q.X(), q.Y()));

    /**
     * Independent reference for pop 'right': the oracle hull vertices with every distinct input point on an edge
     * (collinear and strictly between the endpoints) inserted after its edge's start, nearest first.
     */
    function boundaryReference(pts: GridPoint[]): GridPoint[] {
        const vertices = oracle(pts);
        const distinct = [...new Map(pts.map((q) => [key(q), q])).values()];
        const out: GridPoint[] = [];
        vertices.forEach((a, k) => {
            const b = vertices[(k + 1) % vertices.length];
            const along = (q: GridPoint) => (q.x - a.x) * (b.x - a.x) + (q.y - a.y) * (b.y - a.y);
            const onEdge = distinct
                .filter((q) => cross(a, b, q) === 0 && along(q) > 0 && along(q) < along(b))
                .sort((u, v) => along(u) - along(v));
            out.push(a, ...onEdge);
        });
        return out;
    }

    /** Random sets with a small coordinate range, so collinear points and duplicates are common. */
    function randomSets(seed: number, runs: number): GridPoint[][] {
        const next = rng(seed);
        return Array.from({length: runs}, () => {
            const range = 2 + next(5);
            return Array.from({length: 3 + next(12)}, () => p(next(range) - 2, next(range) - 2));
        });
    }

    it('default options, given explicitly or omitted, match the oracle and the recorded sample 1 trace', () => {
        const base = monotoneChainTrace(SAMPLE);
        expect(base.map((e) => JSON.stringify(e))).toEqual(SAMPLE1_DEFAULT_TRACE);
        expect(monotoneChainTrace(SAMPLE, {pop: 'non-left', duplicates: 'merge'})).toEqual(base);
        expect(monotoneChainTrace(SAMPLE, {})).toEqual(base);
        for (const e of base) expect('options' in e.payload).toBe(false);
        for (const pts of randomSets(31, 200)) {
            expect(coords(pts, hullOf(pts, {pop: 'non-left', duplicates: 'merge'}).hull))
                .toEqual(oracle(pts).map((q) => [q.x, q.y]));
        }
    });

    it('non-default traces record the options on every event', () => {
        for (const options of COMBOS.slice(1)) {
            const t = monotoneChainTrace(SAMPLE, options);
            for (const e of t) expect(e.payload.options).toEqual(options);
        }
        expect(monotoneChainTrace([p(0, 0)], {pop: 'right'})[0].payload.options)
            .toEqual({pop: 'right', duplicates: 'merge'});
    });

    it('rejects unknown option values', () => {
        expect(() => monotoneChainTrace(SAMPLE, {pop: 'left' as 'right'})).toThrow(RangeError);
        expect(() => monotoneChainTrace(SAMPLE, {duplicates: 'drop' as 'keep'})).toThrow(RangeError);
    });

    it('right + merge: sample 1 keeps (2,0) on the hull, and value 0 at (2,5) no longer pops', () => {
        const {t, hull} = hullOf(SAMPLE, {pop: 'right', duplicates: 'merge'});
        expect(coords(SAMPLE, hull)).toEqual([[-1, 3], [0, 0], [2, 0], [4, 0], [5, 3], [2, 5]]);
        const k = t.findIndex((e) => e.kind === 'test' && e.payload.chain === 'lower' && e.payload.points[2] === 4
            && e.payload.value === 0);
        expect(k).toBeGreaterThan(-1);
        expect(t[k + 1].kind).toBe('accept'); // the default trace has a 'reject' (pop of (2,2)) here
        expect(monotoneChainTrace(SAMPLE)[k + 1].kind).toBe('reject');
        expect(coords(SAMPLE, monotoneChainStateAt(t, k + 1).lower).slice(-3)).toEqual([[2, 0], [2, 2], [2, 5]]);
    });

    it('right + merge equals the hull plus the input points on hull edges, in boundary order', () => {
        let checked = 0;
        for (const pts of randomSets(2024, 600)) {
            if (oracle(pts).length < 3) continue; // collinear input is a separate, degenerate case
            const expected = boundaryReference(pts).map((q) => [q.x, q.y]);
            expect(coords(pts, hullOf(pts, {pop: 'right', duplicates: 'merge'}).hull)).toEqual(expected);
            checked++;
        }
        expect(checked).toBeGreaterThan(300);
    });

    it('three collinear points: non-left gives the ends, right lists the middle point twice', () => {
        const col = [p(0, 0), p(1, 0), p(2, 0)];
        for (const duplicates of ['merge', 'keep'] as const) {
            expect(hullOf(col, {pop: 'non-left', duplicates}).hull).toEqual([0, 2]);
            const right = hullOf(col, {pop: 'right', duplicates});
            expect(right.hull).toEqual([0, 1, 2, 1]);
            expect(right.t[right.t.length - 1].noteKey).toBe('done-hull');
        }
    });

    it('non-left + keep gives the same hull points as the default, also with duplicates', () => {
        expect(hullOf([p(0, 0), p(0, 0), p(1, 1), p(2, 2)], {duplicates: 'keep'}).hull).toEqual([0, 3]);
        expect(hullOf([p(1, 1), p(1, 1), p(1, 1)], {duplicates: 'keep'}).hull).toEqual([0, 2]); // one point, twice
        for (const pts of randomSets(99, 400)) {
            if (oracle(pts).length < 2) continue;
            const keep = hullOf(pts, {duplicates: 'keep'}).hull;
            expect(coords(pts, keep)).toEqual(coords(pts, hullOf(pts).hull)); // the retained copy may differ
        }
    });

    it('right + keep: a repeated point is listed on both chains and never popped', () => {
        // Twin copies are adjacent in the sort and orient(a, a, p) = 0, so neither copy is ever popped.
        const first = [p(0, 0), p(0, 0), p(2, 0), p(2, 2), p(0, 2)];
        expect(hullOf(first, {pop: 'right', duplicates: 'keep'}).hull).toEqual([0, 1, 2, 3, 4, 1]); // (0,0) three times
        expect(hullOf(first, {pop: 'right', duplicates: 'merge'}).hull).toEqual([0, 2, 3, 4]);
        // (2,-1) twice is a lower-chain vertex, but its copies also stay on the upper chain: four entries.
        const middle = [p(0, 0), p(2, -1), p(2, -1), p(4, 0), p(2, 3)];
        expect(hullOf(middle, {pop: 'right', duplicates: 'keep'}).hull).toEqual([0, 1, 2, 3, 4, 2, 1]);
        expect(hullOf(middle, {pop: 'right', duplicates: 'merge'}).hull).toEqual([0, 1, 3, 4]);
    });

    it('right + keep over random sets: contains the right + merge boundary in order and lists copies 2m or 2m-1 times', () => {
        let checked = 0;
        for (const pts of randomSets(555, 600)) {
            if (oracle(pts).length < 3) continue;
            const keys = hullOf(pts, {pop: 'right', duplicates: 'keep'}).hull.map((i) => key(pts[i]));
            // boundary points are never popped, so they appear as a subsequence
            const reference = boundaryReference(pts).map(key);
            let at = 0;
            for (const k of keys) if (k === reference[at]) at++;
            expect(at).toBe(reference.length);
            // a point with m >= 2 copies: 2m entries (both chains), 2m-1 at the first or last point in sort order
            const sorted = [...pts].sort((u, v) => u.x - v.x || u.y - v.y);
            const ends = [key(sorted[0]), key(sorted[sorted.length - 1])];
            for (const k of new Set(keys)) {
                const m = pts.filter((q) => key(q) === k).length;
                if (m < 2) continue;
                expect(keys.filter((x) => x === k).length).toBe(ends.includes(k) ? 2 * m - 1 : 2 * m);
            }
            checked++;
        }
        expect(checked).toBeGreaterThan(300);
    });

    it('every combination keeps the trace contract (one done, 8n+4 bound, predicateCount = tests so far)', () => {
        const inputs = [SAMPLE, [], [p(1, 1)], [p(1, 1), p(1, 1), p(1, 1)], ...randomSets(8, 40),
            Array.from({length: 40}, (_, i) => p(i % 4, 0))];
        for (const options of COMBOS) {
            for (const pts of inputs) {
                const t = monotoneChainTrace(pts, options);
                expect(t.filter((e) => e.kind === 'done')).toHaveLength(1);
                expect(t[t.length - 1].kind).toBe('done');
                expect(t.length).toBeLessThanOrEqual(8 * Math.max(pts.length, 3) + 4);
                let tests = 0;
                for (const e of t) {
                    if (e.kind === 'test') tests++;
                    expect(e.predicateCount).toBe(tests);
                }
            }
        }
    });
});
