// Sweeps on a real arbiter with a fake clock: the arbiter's exclusion rules decide who moves a key.
import {describe, expect, it} from 'vitest';
import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {message} from '../../localization';
import {countSweepValue, planCountSweep, planRangeSweep, rangeSweepValue} from './sweepModel';
import {Sweeps} from './sweeps';

const range: RangeParameter = {kind: 'range', key: 'a', label: message('shell_card_tools'), placement: 'board', min: 0, max: 10, step: 0.5};
const other: RangeParameter = {...range, key: 'b'};
const count: CountParameter = {kind: 'count', key: 'n', label: message('shell_card_legend'), placement: 'board', min: 1, max: 20};

function setup(initial: Record<string, number> = {a: 5, b: 5, n: 10}) {
    const values = {...initial};
    const arbiter = new ParameterArbiter({isDomainError: () => false, strict: true});
    for (const key of Object.keys(values)) arbiter.bind(key, {read: () => values[key], apply: (value: number) => { values[key] = value; }});
    let queue: Array<{id: number; callback: FrameRequestCallback}> = [];
    let next = 1;
    const sweeps = new Sweeps(arbiter, {
        request: callback => { const id = next++; queue.push({id, callback}); return id; },
        cancel: id => { queue = queue.filter(entry => entry.id !== id); },
    });
    /** One frame of every pending request at `time` ms. */
    const frame = (time: number) => { const run = queue; queue = []; for (const entry of run) entry.callback(time); };
    return {values, arbiter, sweeps, frame, pending: () => queue.length};
}

describe('the sweep plans', () => {
    it('swings a quarter of the range to each side of the start, starting at the start', () => {
        const plan = planRangeSweep(range, 5);
        expect(plan.halfWidth).toBe(2.5);
        expect(rangeSweepValue(range, plan, 0)).toBe(5);
        expect(rangeSweepValue(range, plan, 1000)).toBe(7.5);
        expect(rangeSweepValue(range, plan, 2000)).toBe(5);
        expect(rangeSweepValue(range, plan, 3000)).toBe(2.5);
    });

    it('keeps the swing inside the range near an end, and honours a declared half-width and period', () => {
        const plan = planRangeSweep(range, 0);
        const seen = Array.from({length: 40}, (_, i) => rangeSweepValue(range, plan, i * 100));
        expect(Math.min(...seen)).toBe(0);
        expect(Math.max(...seen)).toBe(5);
        expect(seen[0]).toBe(0);
        const declared = {...range, sweep: {halfWidth: 1, period: 2000}};
        expect(rangeSweepValue(declared, planRangeSweep(declared, 5), 500)).toBe(6);
        expect(planRangeSweep({...range, sweep: {halfWidth: 99}}, 5).halfWidth).toBe(5);
    });

    it('falls back to the defaults for a declared half-width or period that is not finite and positive', () => {
        for (const sweep of [{period: 0}, {period: -5}, {period: NaN}, {halfWidth: 0}, {halfWidth: NaN}, {halfWidth: -1}]) {
            const plan = planRangeSweep({...range, sweep}, 5);
            expect(plan.halfWidth).toBe(2.5);
            expect(plan.period).toBe(4000);
            expect(Number.isFinite(rangeSweepValue(range, plan, 700))).toBe(true);
        }
    });

    it('steps a count by one every 600 ms between the ends, within three of the start', () => {
        const plan = planCountSweep(count, 10);
        const seen = Array.from({length: 16}, (_, i) => countSweepValue(plan, i * 600));
        expect(seen).toEqual([10, 11, 12, 13, 12, 11, 10, 9, 8, 7, 8, 9, 10, 11, 12, 13]);
        expect(countSweepValue(plan, 599)).toBe(10);
        expect(Array.from({length: 8}, (_, i) => countSweepValue(planCountSweep(count, 20), i * 600))).toEqual([20, 19, 18, 17, 18, 19, 20, 19]);
        expect(countSweepValue(planCountSweep({min: 3, max: 3}, 3), 5000)).toBe(3);
    });
});

describe('a sweep', () => {
    it('moves its key by itself, frame by frame, as an animation write', () => {
        const {values, sweeps, frame} = setup();
        expect(sweeps.start(range)).toBe(true);
        expect(sweeps.isRunning('a')).toBe(true);
        frame(100); // the first frame is the origin
        frame(1100);
        expect(values.a).toBe(7.5);
        frame(3100);
        expect(values.a).toBe(2.5);
    });

    it('two sweeps run together, one lease each', () => {
        const {values, arbiter, sweeps, frame} = setup();
        sweeps.start(range);
        sweeps.start(count);
        sweeps.start(other);
        expect(arbiter.activeLeases()).toHaveLength(3);
        frame(0);
        frame(1200);
        expect(values.a).toBe(7.5);
        expect(values.n).toBe(12);
        expect(values.b).toBe(7.5);
    });

    it('a learner write ends the sweep and keeps the learner\'s value', () => {
        const {values, arbiter, sweeps, frame, pending} = setup();
        sweeps.start(range);
        frame(0);
        frame(1000);
        arbiter.write('a', 9, 'learner');
        expect(sweeps.isRunning('a')).toBe(false);
        expect(pending()).toBe(0);
        frame(2000);
        expect(values.a).toBe(9);
    });

    it('a held drag (a learner hold of the key) ends the sweep and no frame writes afterwards', () => {
        const {values, arbiter, sweeps, frame} = setup();
        sweeps.start(range);
        frame(0);
        frame(1000);
        const release = arbiter.hold('a');
        expect(sweeps.isRunning('a')).toBe(false);
        frame(1500);
        expect(values.a).toBe(7.5);
        expect(sweeps.start(range)).toBe(false); // held: refused
        release();
        expect(sweeps.start(range)).toBe(true);
    });

    it('a count step by the learner wins and keeps its value', () => {
        const {values, arbiter, sweeps, frame} = setup();
        sweeps.start(count);
        frame(0);
        frame(700);
        expect(values.n).toBe(11);
        arbiter.write('n', 5, 'learner');
        frame(1400);
        expect(values.n).toBe(5);
        expect(sweeps.isRunning('n')).toBe(false);
    });

    it('Esc (every lease ends as learner) and a lesson frame change stop every sweep', () => {
        for (const reason of ['learner', 'frame'] as const) {
            const {values, arbiter, sweeps, frame, pending} = setup();
            sweeps.start(range);
            sweeps.start(count);
            frame(0);
            frame(1000);
            const before = {...values};
            arbiter.endAllLeases(reason);
            expect(sweeps.isRunning('a') || sweeps.isRunning('n')).toBe(false);
            expect(pending()).toBe(0);
            frame(2500);
            expect(values).toEqual(before);
        }
    });

    it('a sweep and a playback on the same key never move it at once: the later lease replaces the earlier', () => {
        const {values, arbiter, sweeps, frame} = setup();
        sweeps.start(range);
        frame(0);
        frame(1000);
        let playbackEnded: string | undefined;
        const playback = arbiter.lease(['a'], reason => { playbackEnded = reason; })!;
        expect(sweeps.isRunning('a')).toBe(false); // the playback replaced the sweep
        playback.write('a', 1);
        frame(2000);
        expect(values.a).toBe(1); // the sweep's frame did not write
        // And the other way round: a sweep started on a playing key replaces the playback.
        expect(sweeps.start(range)).toBe(true);
        expect(playbackEnded).toBe('replaced');
        expect(playback.write('a', 2)).toEqual({status: 'refused-arbiter', reason: 'lease-ended'});
        frame(3000);
        frame(4000);
        expect(values.a).not.toBe(2);
    });

    it('never writes a non-finite value: it ends the sweep instead', () => {
        const run = setup();
        run.sweeps.start({...range, max: NaN});
        run.frame(0);
        run.frame(1000);
        expect(run.values.a).toBe(5);
        expect(run.sweeps.isRunning('a')).toBe(false);
    });

    it('stops itself when the setter refuses, and stop() releases the lease', () => {
        const values = {a: 5};
        const arbiter = new ParameterArbiter({isDomainError: () => true, strict: true});
        arbiter.bind('a', {read: () => values.a, apply: () => { throw new Error('no'); }});
        const queue: FrameRequestCallback[] = [];
        const sweeps = new Sweeps(arbiter, {request: callback => queue.push(callback), cancel: () => undefined});
        sweeps.start(range);
        queue.shift()!(0);
        queue.shift()!(1000);
        expect(sweeps.isRunning('a')).toBe(false);
        const running = setup();
        running.sweeps.start(range);
        running.sweeps.stop('a');
        expect(running.arbiter.activeLeases()).toHaveLength(0);
        expect(running.pending()).toBe(0);
    });
});
