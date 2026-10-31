import {describe, expect, it} from 'vitest';
import {convexHull} from '../bezeg/impl/curve/geometry';
import {PointImpl} from '../bezeg/impl/point/point-impl';
import type {GridPoint} from './grid';
import {monotoneChainStateAt, monotoneChainTrace} from './monotoneChain';
import {slowHullStateAt, slowHullTrace, SLOW_HULL_MAX_POINTS, type SlowHullTrace} from './slowHull';
import {stateAt} from './trace';

const p = (x: number, y: number): GridPoint => ({x, y});
const SAMPLE: GridPoint[] = [p(2, 2), p(4, 0), p(0, 0), p(5, 3), p(2, 5), p(-1, 3), p(3, 1), p(2, 0), p(1, 1)];
const coords = (pts: GridPoint[], idx: readonly number[]) => idx.map((i) => [pts[i].x, pts[i].y]);
const finalState = (t: SlowHullTrace) => slowHullStateAt(t, t.length - 1);

function rng(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s % n;
    };
}

describe('slowHullTrace on sample 1', () => {
    const trace = slowHullTrace(SAMPLE);
    const pairs = trace.filter((e) => e.kind === 'accept' || e.kind === 'reject');

    it('examines 72 ordered pairs with 504 orientation tests and accepts 5 directed edges', () => {
        expect(pairs).toHaveLength(72);
        expect(trace[trace.length - 1].predicateCount).toBe(504);
        expect(trace.filter((e) => e.kind === 'accept')).toHaveLength(5);
        expect(finalState(trace).edges).toHaveLength(5);
    });

    it('ends with the CCW hull from the smallest point; (2,0) is not a vertex', () => {
        const s = finalState(trace);
        expect(s.done).toBe(true);
        expect(coords(SAMPLE, s.hull!)).toEqual([[-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]]);
        expect(coords(SAMPLE, s.hull!)).not.toContainEqual([2, 0]);
        // (2,0) lies on the segment (0,0)-(4,0): the pair (0,0)->(2,0) has the witness (4,0).
        const rejected = trace.find((e) => e.kind === 'reject' && e.payload.points[0] === 2 && e.payload.points[1] === 7)!;
        expect(rejected.payload.witness).toBe(1);
    });

    it('accepted edges are the hull edges in order', () => {
        const edges = finalState(trace).edges.map(([i, j]) => [SAMPLE[i].x, SAMPLE[i].y, SAMPLE[j].x, SAMPLE[j].y]);
        expect(edges).toContainEqual([0, 0, 4, 0]);
        expect(edges).toContainEqual([-1, 3, 0, 0]);
        expect(edges).not.toContainEqual([4, 0, 0, 0]);
    });
});

describe('agreement and oracle', () => {
    const hullOf = (pts: GridPoint[]) => finalState(slowHullTrace(pts)).hull!;
    const chainHull = (pts: GridPoint[]) => {
        const t = monotoneChainTrace(pts);
        return monotoneChainStateAt(t, t.length - 1).hull!;
    };
    const asOracle = (pts: GridPoint[]) => pts.map((q) => new PointImpl(q.x, q.y));

    it('matches monotoneChainTrace on sample 1, collinear input and n in {0,1,2}', () => {
        const cases = [SAMPLE, [], [p(3, 3)], [p(3, 3), p(3, 3)], [p(0, 0), p(2, 1)],
            [p(0, 0), p(1, 1), p(2, 2), p(3, 3), p(-1, -1)], [p(1, 5), p(1, 2), p(1, 9), p(1, 2)]];
        for (const pts of cases) expect(coords(pts, hullOf(pts))).toEqual(coords(pts, chainHull(pts)));
    });

    it('matches convexHull on random sets with duplicates and collinear points', () => {
        const next = rng(2468);
        for (let run = 0; run < 300; run++) {
            const n = next(13);
            const range = 1 + next(6);
            const pts = Array.from({length: n}, () => p(next(range) - 2, next(range) - 2));
            const expected = convexHull(asOracle(pts)).map((q) => [q.X(), q.Y()]);
            expect(coords(pts, hullOf(pts))).toEqual(expected);
        }
    });

    it('gives a point or segment with a distinct noteKey for degenerate input', () => {
        const last = (pts: GridPoint[]) => {
            const t = slowHullTrace(pts);
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
    const next = rng(99);
    const inputs: GridPoint[][] = [[], [p(0, 0)], SAMPLE];
    for (let run = 0; run < 15; run++) {
        inputs.push(Array.from({length: next(SLOW_HULL_MAX_POINTS + 1)}, () => p(next(9) - 4, next(9) - 4)));
    }
    inputs.push(Array.from({length: 40}, (_, i) => p(i, i * i)));
    inputs.push(Array.from({length: 40}, (_, i) => p(i, 0)));

    it('ends with exactly one done and stays within n(n-1)+2 <= 1562 events', () => {
        for (const pts of inputs) {
            const t = slowHullTrace(pts);
            const n = new Set(pts.map((q) => `${q.x},${q.y}`)).size;
            expect(t.filter((e) => e.kind === 'done')).toHaveLength(1);
            expect(t[t.length - 1].kind).toBe('done');
            expect(t.length).toBeLessThanOrEqual(Math.max(n * (n - 1), 0) + 2);
            expect(t.length).toBeLessThanOrEqual(1562);
        }
    });

    it('predicateCount is non-decreasing and equals the tests performed', () => {
        for (const pts of inputs) {
            const t = slowHullTrace(pts);
            let tests = 0;
            let prev = 0;
            for (const e of t) {
                tests += e.payload.tests ?? 0;
                expect(e.predicateCount).toBe(tests);
                expect(e.predicateCount).toBeGreaterThanOrEqual(prev);
                prev = e.predicateCount;
            }
            const n = new Set(pts.map((q) => `${q.x},${q.y}`)).size;
            expect(prev).toBe(n < 3 ? 0 : n * (n - 1) * (n - 2));
        }
    });

    it('stateAt is pure, frozen, and folding all events equals the final output', () => {
        const t = slowHullTrace(SAMPLE);
        const snapshot = JSON.stringify(t);
        for (let i = 0; i < t.length; i++) {
            const a = slowHullStateAt(t, i);
            expect(slowHullStateAt(t, i)).toEqual(a);
            expect(Object.isFrozen(a.edges)).toBe(true);
        }
        expect(JSON.stringify(t)).toBe(snapshot);
        expect(Object.isFrozen(t) && Object.isFrozen(t[0])).toBe(true);
        expect(finalState(t).hull).toEqual(t.find((e) => e.kind === 'output')!.payload.hull);
        expect(slowHullStateAt(t, 10_000)).toEqual(finalState(t));
        expect(slowHullStateAt(t, -5)).toEqual(slowHullStateAt(t, 0));
        expect(stateAt(t, 0, (s: number) => s + 1, 0)).toBe(1);
    });

    it('is deterministic and does not mutate its input', () => {
        const copy = SAMPLE.map((q) => ({...q}));
        expect(slowHullTrace(SAMPLE)).toEqual(slowHullTrace(copy));
        expect(SAMPLE).toEqual(copy);
    });
});

describe('input validation', () => {
    it('rejects more than 40 points and non-grid points', () => {
        expect(() => slowHullTrace(Array.from({length: 41}, (_, i) => p(i, 0)))).toThrow(RangeError);
        expect(() => slowHullTrace([p(0, 0), p(0.5, 1), p(1, 1)])).toThrow(RangeError);
        expect(() => slowHullTrace(null as unknown as GridPoint[])).toThrow(TypeError);
    });
    it('accepts exactly 40 points', () => {
        expect(() => slowHullTrace(Array.from({length: 40}, (_, i) => p(i, i % 3)))).not.toThrow();
    });
});
