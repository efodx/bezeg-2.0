import {describe, expect, it} from 'vitest';
import {SWEEP_COORD_LIMIT, SWEEP_MAX_INTERVALS} from './limits';
import {
    bruteForceIntervalOverlaps,
    intervalReadouts,
    intervalSweepTrace,
    type Interval,
    type IntervalPair,
    type IntervalSweepResult,
    type IntervalSweepTrace,
} from './intervalSweep';
import {sweepStateAt} from './sweepTrace';

const spec: Interval[] = [{lo: 0, hi: 4}, {lo: 2, hi: 7}, {lo: 3, hi: 5}, {lo: 6, hi: 9}, {lo: 8, hi: 10}];

function traceOf(intervals: readonly Interval[]): IntervalSweepTrace {
    const result: IntervalSweepResult = intervalSweepTrace(intervals);
    if (!result.ok) throw new Error(`refused: ${result.reason}`);
    return result.trace;
}

const key = (p: IntervalPair): string => `${p[0]},${p[1]}`;
const keys = (pairs: readonly IntervalPair[]): string[] => pairs.map(key).sort();

/** Every report must directly follow the status-insert of one of its two intervals (reported on entering). */
function reportsFollowInserts(trace: IntervalSweepTrace): boolean {
    let last: { kind: string; id: number } | null = null;
    for (const event of trace) {
        if (event.kind === 'status-insert' || event.kind === 'status-remove') {
            last = {kind: event.kind, id: (event.payload as { id: number }).id};
        } else if (event.kind === 'report') {
            const item = (event.payload as { item: IntervalPair }).item;
            if (last === null || last.kind !== 'status-insert' || !item.includes(last.id)) return false;
        }
    }
    return true;
}

/** Deterministic LCG so a failing seed reproduces. */
function rng(seed: number): (n: number) => number {
    let s = seed;
    return (n) => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return Math.floor((s / 2 ** 32) * n);
    };
}

describe('interval sweep, spec example', () => {
    const trace = traceOf(spec);
    const pops = trace.filter((e) => e.kind === 'pop').map((e) => (e.payload as { id: number; position: { x: { num: bigint } } }));

    it('processes endpoints 0+,2+,3+,4-,5-,6+,7-,8+,9-,10- in order', () => {
        const label = pops.map((p) => `${Number(p.position.x.num)}${p.id & 1 ? '-' : '+'}`);
        expect(label).toEqual(['0+', '2+', '3+', '4-', '5-', '6+', '7-', '8+', '9-', '10-']);
    });

    it('has open counts 1,2,3,2,1,2,1,2,1,0 and maximum 3 on [3,4]', () => {
        const readouts = intervalReadouts(trace);
        expect(readouts.openCounts).toEqual([1, 2, 3, 2, 1, 2, 1, 2, 1, 0]);
        expect(readouts.maxOpen).toBe(3);
        expect(readouts.maxStart).toBe(3);
        expect(readouts.maxEnd).toBe(4);
    });

    it('reports pairs ab, ac, bc, bd, de in that order', () => {
        expect(intervalReadouts(trace).pairs.map(key)).toEqual(['0,1', '0,2', '1,2', '1,3', '3,4']);
    });

    it('reports each pair while the later interval enters', () => {
        expect(reportsFollowInserts(trace)).toBe(true);
        const kinds = trace.slice(0, 7).map((e) => e.kind);
        expect(kinds).toEqual(['pop', 'status-insert', 'pop', 'status-insert', 'report', 'pop', 'status-insert']);
    });

    it('keeps the status in index order and ends empty', () => {
        const afterThird = trace.findIndex((e, i) => e.kind === 'status-insert' && sweepStateAt(trace, i).status.length === 3);
        expect(sweepStateAt(trace, afterThird).status).toEqual([0, 1, 2]);
        expect(sweepStateAt(trace, trace.length - 1).status).toEqual([]);
    });
});

describe('interval sweep, ties', () => {
    it('reports touching closed intervals [0,2] and [2,3]', () => {
        expect(intervalReadouts(traceOf([{lo: 0, hi: 2}, {lo: 2, hi: 3}])).pairs.map(key)).toEqual(['0,1']);
    });

    it('reports a zero-length interval inside another', () => {
        const readouts = intervalReadouts(traceOf([{lo: 3, hi: 5}, {lo: 4, hi: 4}]));
        expect(readouts.pairs.map(key)).toEqual(['0,1']);
        expect(readouts.maxOpen).toBe(2);
    });

    it('reports two identical zero-length intervals once and enters before leaving', () => {
        const readouts = intervalReadouts(traceOf([{lo: 1, hi: 1}, {lo: 1, hi: 1}]));
        expect(readouts.pairs.map(key)).toEqual(['0,1']);
        expect(readouts.openCounts).toEqual([1, 2, 1, 0]);
    });

    it('does not report intervals separated by a gap', () => {
        expect(intervalReadouts(traceOf([{lo: 0, hi: 1}, {lo: 2, hi: 3}])).pairs).toEqual([]);
    });

    it('reaches the maximum at a touching point [2,2]', () => {
        expect(intervalReadouts(traceOf([{lo: 0, hi: 2}, {lo: 2, hi: 4}]))).toMatchObject({maxOpen: 2, maxStart: 2, maxEnd: 2});
    });

    it('handles the empty set', () => {
        const trace = traceOf([]);
        expect(trace.map((e) => e.kind)).toEqual(['done']);
        expect(intervalReadouts(trace)).toMatchObject({openCounts: [], maxOpen: 0, maxStart: null, maxEnd: null});
    });
});

describe('interval sweep, refusals', () => {
    it('refuses more than the maximum number of intervals', () => {
        const many = Array.from({length: SWEEP_MAX_INTERVALS + 1}, (_, i) => ({lo: i, hi: i}));
        expect(intervalSweepTrace(many)).toEqual({ok: false, reason: 'too-many'});
        expect(intervalSweepTrace(many.slice(0, SWEEP_MAX_INTERVALS)).ok).toBe(true);
    });

    it('refuses non-integer and out-of-range endpoints, naming the interval', () => {
        expect(intervalSweepTrace([{lo: 0, hi: 1}, {lo: 0.5, hi: 2}])).toEqual({ok: false, reason: 'not-grid', index: 1});
        expect(intervalSweepTrace([{lo: 0, hi: NaN}])).toEqual({ok: false, reason: 'not-grid', index: 0});
        expect(intervalSweepTrace([{lo: 0, hi: SWEEP_COORD_LIMIT + 1}])).toEqual({ok: false, reason: 'out-of-range', index: 0});
        expect(intervalSweepTrace([{lo: -SWEEP_COORD_LIMIT - 1, hi: 0}])).toEqual({ok: false, reason: 'out-of-range', index: 0});
        expect(intervalSweepTrace([{lo: -SWEEP_COORD_LIMIT, hi: SWEEP_COORD_LIMIT}]).ok).toBe(true);
    });

    it('refuses lo > hi', () => {
        expect(intervalSweepTrace([{lo: 3, hi: 2}])).toEqual({ok: false, reason: 'inverted', index: 0});
    });
});

describe('interval sweep, random sets against the brute-force oracle', () => {
    it('reports exactly the brute-force pairs once each, the same maximum, and a 4n+p+1 trace', () => {
        const next = rng(20261101);
        for (let round = 0; round < 300; round++) {
            const n = next(SWEEP_MAX_INTERVALS + 1);
            const span = 1 + next(12); // small span forces shared endpoints
            const intervals: Interval[] = Array.from({length: n}, () => {
                const a = next(span + 1) - 3;
                const len = next(3) === 0 ? 0 : next(span + 1);
                return {lo: a, hi: a + len};
            });
            const trace = traceOf(intervals);
            const oracle = bruteForceIntervalOverlaps(intervals);
            const readouts = intervalReadouts(trace);
            const label = `round ${round}: ${JSON.stringify(intervals)}`;
            expect(keys(readouts.pairs), label).toEqual(keys(oracle.pairs));
            expect(new Set(readouts.pairs.map(key)).size, label).toBe(readouts.pairs.length);
            expect(readouts.maxOpen, label).toBe(oracle.maxDepth);
            expect(reportsFollowInserts(trace), label).toBe(true);
            expect(trace.length, label).toBe(4 * n + oracle.pairs.length + 1);
            expect(trace[trace.length - 1].kind).toBe('done');
            expect(sweepStateAt(trace, trace.length - 1).done).toBe(true);
        }
    });
});
