import {intervalsTouch, runIntervalSweep} from './intervalSweepRun';

const iv = (lo: number, hi: number) => ({lo, hi});

describe('intervalsTouch', () => {
    test('one shared endpoint touches', () => {
        expect(intervalsTouch(iv(0, 3), iv(3, 5))).toBe(true);
        expect(intervalsTouch(iv(2, 2), iv(2, 5))).toBe(true);
        expect(intervalsTouch(iv(0, 4), iv(4, 4))).toBe(true);
    });
    test('a zero-length interval strictly inside another overlaps', () => {
        expect(intervalsTouch(iv(2, 2), iv(0, 4))).toBe(false);
        expect(intervalsTouch(iv(0, 4), iv(2, 2))).toBe(false);
    });
    test('identical intervals, also zero-length, do not touch', () => {
        expect(intervalsTouch(iv(2, 2), iv(2, 2))).toBe(false);
        expect(intervalsTouch(iv(1, 3), iv(1, 3))).toBe(false);
    });
    test('a real overlap does not touch', () => {
        expect(intervalsTouch(iv(0, 4), iv(2, 7))).toBe(false);
    });
});

describe('runIntervalSweep reports', () => {
    const touching = (intervals: ReturnType<typeof iv>[]) => {
        const run = runIntervalSweep(intervals);
        return [...Array(run.length).keys()].map(i => run.event(i)).filter(e => e?.note === 'report').map(e => e?.touching);
    };
    test('a zero-length interval strictly inside another is an overlap', () => {
        expect(touching([iv(0, 4), iv(2, 2)])).toEqual([false]);
    });
    test('two identical zero-length intervals overlap', () => {
        expect(touching([iv(2, 2), iv(2, 2)])).toEqual([false]);
    });
    test('a zero-length interval on an endpoint touches', () => {
        expect(touching([iv(0, 4), iv(4, 4)])).toEqual([true]);
    });
});

describe('the queue of a view', () => {
    test('lists the pops after the step, entering as +', () => {
        const run = runIntervalSweep([iv(0, 4), iv(2, 7)]);
        const left = (i: number) => run.view(i).queue.map(q => `${q.interval}${q.entering ? '+' : '-'}${q.x}`);
        expect(left(0)).toEqual(['1+2', '0-4', '1-7']);
        expect(left(run.length - 1)).toEqual([]);
    });
});
