import {describe, expect, it} from 'vitest';
import {convexHull} from '../bezeg/impl/curve/geometry';
import {PointImpl} from '../bezeg/impl/point/point-impl';
import {
    giftWrappingStateAt,
    giftWrappingTrace,
    GIFT_WRAPPING_MAX_POINTS,
    type GiftWrappingTrace,
} from './giftWrapping';
import type {GridPoint} from './grid';
import {monotoneChainStateAt, monotoneChainTrace} from './monotoneChain';
import {slowHullStateAt, slowHullTrace} from './slowHull';
import {stateAt} from './trace';

const p = (x: number, y: number): GridPoint => ({x, y});
const SAMPLE: GridPoint[] = [p(2, 2), p(4, 0), p(0, 0), p(5, 3), p(2, 5), p(-1, 3), p(3, 1), p(2, 0), p(1, 1)];
const coords = (pts: GridPoint[], idx: readonly number[]) => idx.map((i) => [pts[i].x, pts[i].y]);
const finalState = (t: GiftWrappingTrace) => giftWrappingStateAt(t, t.length - 1);
const distinctCount = (pts: GridPoint[]) => new Set(pts.map((q) => `${q.x},${q.y}`)).size;

function rng(seed: number) {
    let s = seed >>> 0;
    return (n: number) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s % n;
    };
}

describe('giftWrappingTrace on sample 1', () => {
    const trace = giftWrappingTrace(SAMPLE);

    it('makes 5 wraps and 35 orientation tests with exact values', () => {
        expect(trace.filter((e) => e.kind === 'accept')).toHaveLength(5);
        const tests = trace.filter((e) => e.kind === 'test');
        expect(tests).toHaveLength(35);
        expect(trace[trace.length - 1].predicateCount).toBe(35);
        for (const e of tests) {
            const [a, b, c] = e.payload.points.map((i) => SAMPLE[i]);
            const exact = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
            expect(e.payload.value).toBe(exact === 0 ? 0 : exact);
            expect(e.payload.sign).toBe(Math.sign(exact));
        }
    });

    it('ends with the CCW hull from the smallest point; (2,0) is skipped', () => {
        const s = finalState(trace);
        expect(s.done).toBe(true);
        expect(coords(SAMPLE, s.hull!)).toEqual([[-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]]);
        expect(coords(SAMPLE, s.hull!)).not.toContainEqual([2, 0]);
        expect(coords(SAMPLE, s.wrapped)).toEqual(coords(SAMPLE, s.hull!));
    });

    it('takes the farthest of collinear candidates', () => {
        // From (0,0) the candidates (2,0) and (4,0) are collinear: the wrap must land on (4,0).
        const wrap = trace.filter((e) => e.kind === 'accept').map((e) => coords(SAMPLE, e.payload.points));
        expect(wrap).toContainEqual([[0, 0], [4, 0]]);
        expect(trace.some((e) => e.noteKey === 'test-replace-farther' || e.noteKey === 'test-keep-nearer')).toBe(true);
    });
});

describe('agreement and oracle', () => {
    const hullOf = (pts: GridPoint[]) => finalState(giftWrappingTrace(pts)).hull!;
    const chainHull = (pts: GridPoint[]) => {
        const t = monotoneChainTrace(pts);
        return monotoneChainStateAt(t, t.length - 1).hull!;
    };
    const slowHullOf = (pts: GridPoint[]) => {
        const t = slowHullTrace(pts);
        return slowHullStateAt(t, t.length - 1).hull!;
    };
    const asOracle = (pts: GridPoint[]) => pts.map((q) => new PointImpl(q.x, q.y));

    it('matches monotoneChainTrace and slowHullTrace on sample 1, collinear input and n in {0,1,2}', () => {
        const cases = [SAMPLE, [], [p(3, 3)], [p(3, 3), p(3, 3)], [p(0, 0), p(2, 1)],
            [p(0, 0), p(1, 1), p(2, 2), p(3, 3), p(-1, -1)], [p(1, 5), p(1, 2), p(1, 9), p(1, 2)]];
        for (const pts of cases) {
            expect(coords(pts, hullOf(pts))).toEqual(coords(pts, chainHull(pts)));
            expect(coords(pts, hullOf(pts))).toEqual(coords(pts, slowHullOf(pts)));
        }
    });

    it('matches convexHull on random sets with duplicates and collinear points', () => {
        const next = rng(13579);
        for (let run = 0; run < 400; run++) {
            const n = next(14);
            const range = 1 + next(6);
            const pts = Array.from({length: n}, () => p(next(range) - 2, next(range) - 2));
            const expected = convexHull(asOracle(pts)).map((q) => [q.X(), q.Y()]);
            expect(coords(pts, hullOf(pts))).toEqual(expected);
        }
    });

    it('gives a point or segment with a distinct noteKey for degenerate input', () => {
        const last = (pts: GridPoint[]) => {
            const t = giftWrappingTrace(pts);
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
    const next = rng(31);
    const inputs: GridPoint[][] = [[], [p(0, 0)], SAMPLE];
    for (let run = 0; run < 60; run++) {
        inputs.push(Array.from({length: next(GIFT_WRAPPING_MAX_POINTS + 1)}, () => p(next(9) - 4, next(9) - 4)));
    }
    inputs.push(Array.from({length: 40}, (_, i) => p(i, i * i))); // convex position: 40 wraps
    inputs.push(Array.from({length: 40}, (_, i) => p(i, 0)));

    it('ends with exactly one done and stays within n(n-1)+2 <= 1562 events', () => {
        for (const pts of inputs) {
            const t = giftWrappingTrace(pts);
            const n = distinctCount(pts);
            expect(t.filter((e) => e.kind === 'done')).toHaveLength(1);
            expect(t[t.length - 1].kind).toBe('done');
            expect(t.length).toBeLessThanOrEqual(Math.max(n * (n - 1), 0) + 2);
            expect(t.length).toBeLessThanOrEqual(1562);
        }
    });

    it('predicateCount is non-decreasing and equals the number of test events so far', () => {
        for (const pts of inputs) {
            let tests = 0;
            let prev = 0;
            for (const e of giftWrappingTrace(pts)) {
                if (e.kind === 'test') tests++;
                expect(e.predicateCount).toBe(tests);
                expect(e.predicateCount).toBeGreaterThanOrEqual(prev);
                prev = e.predicateCount;
            }
        }
    });

    it('stateAt is pure, frozen, and folding all events equals the final output', () => {
        const t = giftWrappingTrace(SAMPLE);
        const snapshot = JSON.stringify(t);
        for (let i = 0; i < t.length; i++) {
            const a = giftWrappingStateAt(t, i);
            expect(giftWrappingStateAt(t, i)).toEqual(a);
            expect(Object.isFrozen(a.wrapped)).toBe(true);
        }
        expect(JSON.stringify(t)).toBe(snapshot);
        expect(Object.isFrozen(t) && Object.isFrozen(t[0])).toBe(true);
        expect(finalState(t).hull).toEqual(t.find((e) => e.kind === 'output')!.payload.hull);
        expect(giftWrappingStateAt(t, 10_000)).toEqual(finalState(t));
        expect(giftWrappingStateAt(t, -5)).toEqual(giftWrappingStateAt(t, 0));
        expect(stateAt(t, 0, (s: number) => s + 1, 0)).toBe(1);
    });

    it('is deterministic and does not mutate its input', () => {
        const copy = SAMPLE.map((q) => ({...q}));
        expect(giftWrappingTrace(SAMPLE)).toEqual(giftWrappingTrace(copy));
        expect(SAMPLE).toEqual(copy);
    });
});

describe('input validation', () => {
    it('rejects more than 40 points and non-grid points', () => {
        expect(() => giftWrappingTrace(Array.from({length: 41}, (_, i) => p(i, 0)))).toThrow(RangeError);
        expect(() => giftWrappingTrace([p(0, 0), p(0.5, 1), p(1, 1)])).toThrow(RangeError);
        expect(() => giftWrappingTrace(null as unknown as GridPoint[])).toThrow(TypeError);
    });
    it('accepts exactly 40 points', () => {
        expect(() => giftWrappingTrace(Array.from({length: 40}, (_, i) => p(i, i % 3)))).not.toThrow();
    });
});
