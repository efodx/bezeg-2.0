import {describe, expect, it} from 'vitest';
import {convexHull} from '../bezeg/impl/curve/geometry';
import {PointImpl} from '../bezeg/impl/point/point-impl';
import type {GridPoint} from './grid';
import {
    MONOTONE_CHAIN_MAX_POINTS,
    monotoneChainStateAt,
    monotoneChainTrace,
    type MonotoneChainTrace,
} from './monotoneChain';
import {stateAt} from './trace';

const p = (x: number, y: number): GridPoint => ({x, y});
const SAMPLE: GridPoint[] = [p(2, 2), p(4, 0), p(0, 0), p(5, 3), p(2, 5), p(-1, 3), p(3, 1), p(2, 0), p(1, 1)];
const coords = (pts: GridPoint[], idx: readonly number[]) => idx.map((i) => [pts[i].x, pts[i].y]);
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
