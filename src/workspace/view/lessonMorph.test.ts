import {afterEach, describe, expect, test} from 'vitest';
import {ParameterArbiter} from '../../graphs/base/writes/parameterArbiter';
import {LessonMorph, type MorphRange} from './lessonMorph';
import {GLIDE_MS} from './motion';

/** Frames run by hand under a fake clock, one every 16 ms. */
class Scheduler {
    time = 0;
    private next = 1;
    private callbacks = new Map<number, () => void>();
    request = (callback: () => void) => { const id = this.next++; this.callbacks.set(id, callback); return id; };
    cancel = (id: number) => { this.callbacks.delete(id); };
    now = () => this.time;
    pending() { return this.callbacks.size; }
    frame(ms = 16) {
        this.time += ms;
        for (const [id, callback] of [...this.callbacks.entries()]) { this.callbacks.delete(id); callback(); }
    }
    run(ms: number) {
        const end = this.time + ms;
        while (this.callbacks.size > 0 && this.time < end) this.frame(Math.min(16, end - this.time));
    }
}

class DomainError extends Error { override name = 'DomainError'; }

const RANGES: MorphRange[] = [
    {key: 'a', min: 0, max: 10, step: 0.5},
    {key: 'b', min: 0, max: 100, step: 1},
];

interface Rig {clock: Scheduler; arbiter: ParameterArbiter; morph: LessonMorph; values: Record<string, number | boolean>; applied: {key: string; value: unknown}[]; reduced: {on: boolean}; refuse: {from: number; to: number} | undefined}
const rigs: Rig[] = [];

function rig(): Rig {
    const clock = new Scheduler();
    const arbiter = new ParameterArbiter({isDomainError: error => error instanceof DomainError, strict: true});
    const values: Record<string, number | boolean> = {a: 0, b: 50, flag: false};
    const applied: Rig['applied'] = [];
    const made: Rig = {clock, arbiter, morph: undefined as unknown as LessonMorph, values, applied, reduced: {on: false}, refuse: undefined};
    for (const key of ['a', 'b', 'flag']) {
        arbiter.bind(key, {
            read: () => values[key],
            apply: value => {
                if (key === 'a' && typeof value === 'number' && made.refuse && value > made.refuse.from && value < made.refuse.to) throw new DomainError('no');
                values[key] = value as number | boolean;
                applied.push({key, value});
            },
        });
    }
    made.morph = new LessonMorph({arbiter, rangeKeys: () => RANGES, now: clock.now, requestFrame: clock.request, cancelFrame: clock.cancel, reducedMotion: () => made.reduced.on});
    rigs.push(made);
    return made;
}

afterEach(() => { for (const made of rigs.splice(0)) { made.morph.dispose(); made.arbiter.dispose(); } });

/** A lesson step: the new values, written as the lesson (after the frame change ended the animation leases, as `stopAnimations` does). */
const stepTo = (made: Rig, next: Record<string, number | boolean>) => () => {
    made.arbiter.endAllLeases('frame');
    for (const [key, value] of Object.entries(next)) made.arbiter.write(key, value, 'lesson');
};

describe('the lesson morph', () => {
    test('a range key glides from the old value to the new one; a toggle is at its new value at once; the lease is gone after', () => {
        const made = rig();
        made.morph.step(stepTo(made, {a: 10, flag: true}));
        expect(made.values.flag).toBe(true);
        expect(made.values.a).toBe(0); // the first painted frame is the old number
        expect(made.arbiter.activeLeases()).toHaveLength(1);
        made.clock.frame(16);
        made.clock.frame(16);
        expect(made.values.a).toBeGreaterThan(0);
        expect(made.values.a).toBeLessThan(10);
        expect(made.values.b).toBe(50); // an unchanged key is not written
        made.clock.run(GLIDE_MS + 100);
        expect(made.values.a).toBe(10);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        expect(made.clock.pending()).toBe(0);
    });

    test('the glide is ease-out, in monotone steps snapped to the declared step', () => {
        const made = rig();
        made.morph.step(stepTo(made, {a: 10}));
        const seen: number[] = [];
        while (made.clock.pending() > 0) { made.clock.frame(16); seen.push(made.values.a as number); }
        for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
        expect(seen.every(value => Math.abs(value * 2 - Math.round(value * 2)) < 1e-9)).toBe(true);
        expect(seen[Math.floor(seen.length / 2) - 1]).toBeGreaterThan(5);
    });

    test('a learner write mid-morph keeps the learner value; the other keys are at their targets the same tick; no later write', () => {
        const made = rig();
        made.morph.step(stepTo(made, {a: 10, b: 90}));
        made.clock.frame(16);
        made.arbiter.write('a', 3, 'learner');
        expect(made.values.a).toBe(3);
        expect(made.values.b).toBe(90);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        const count = made.applied.length;
        made.clock.run(GLIDE_MS + 100);
        expect(made.applied).toHaveLength(count);
        expect(made.values.a).toBe(3);
        expect(made.clock.pending()).toBe(0);
    });

    test('a new step during a morph never writes the old morph\'s targets, and its morph starts from the shown value', () => {
        const made = rig();
        made.morph.step(stepTo(made, {a: 10}));
        made.clock.run(96);
        const shown = made.values.a as number;
        expect(shown).toBeGreaterThan(0);
        expect(shown).toBeLessThan(10);
        const before = made.applied.length;
        made.morph.step(stepTo(made, {a: 0}));
        expect(made.values.a).toBe(shown);
        made.clock.run(GLIDE_MS + 100);
        expect(made.applied.slice(before).filter(entry => entry.value === 10)).toHaveLength(0);
        expect(made.values.a).toBe(0);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
    });

    test('reduced motion: no animation write, the values are at target when the step returns', () => {
        const made = rig();
        made.reduced.on = true;
        made.morph.step(stepTo(made, {a: 10, flag: true}));
        expect(made.values).toMatchObject({a: 10, flag: true});
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        expect(made.clock.pending()).toBe(0);
        expect(made.applied.filter(entry => entry.key === 'a')).toHaveLength(1);
    });

    test('no changed range key: no lease and no frame', () => {
        const made = rig();
        made.morph.step(stepTo(made, {flag: true}));
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        expect(made.clock.pending()).toBe(0);
        expect(made.morph.isRunning()).toBe(false);
    });

    test('a refused write finishes at once', () => {
        const made = rig();
        made.refuse = {from: 0.2, to: 9};
        made.morph.step(stepTo(made, {a: 10}));
        made.refuse = {from: 0.2, to: 9};
        made.clock.frame(16);
        expect(made.values.a).toBe(10);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        expect(made.clock.pending()).toBe(0);
    });

    test('a slow frame (more than 120 ms after the last) finishes at once', () => {
        const made = rig();
        made.morph.step(stepTo(made, {a: 10}));
        made.clock.frame(16);
        made.clock.frame(130);
        expect(made.values.a).toBe(10);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        expect(made.clock.pending()).toBe(0);
    });

    test('atTargets reads the target values mid-morph and restores the shown ones', () => {
        const made = rig();
        made.morph.step(stepTo(made, {a: 10}));
        made.clock.run(48);
        const shown = made.values.a;
        expect(made.morph.atTargets(() => made.values.a)).toBe(10);
        expect(made.values.a).toBe(shown);
        expect(made.morph.isRunning()).toBe(true);
        expect(made.morph.atTargets(() => 'idle')).toBe('idle');
    });

    test('disposal leaves no frame callback and no lease, and is idempotent', () => {
        const made = rig();
        made.morph.step(stepTo(made, {a: 10}));
        expect(made.clock.pending()).toBe(1);
        made.morph.dispose();
        made.morph.dispose();
        expect(made.clock.pending()).toBe(0);
        expect(made.arbiter.activeLeases()).toHaveLength(0);
        made.morph.step(stepTo(made, {a: 5}));
        expect(made.values.a).toBe(5);
        expect(made.clock.pending()).toBe(0);
    });
});
