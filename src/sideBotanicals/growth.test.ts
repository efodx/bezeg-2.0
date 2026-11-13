import {GrowthHost, loadRamp, LOAD_MS, startGrowth} from './growth';

/** A clock driven by hand: `advance` moves it and runs the frame that was requested, if any. */
function run({reducedMotion = false} = {}, visit = {reached: 0}) {
    const page = {time: 0, pending: null as (() => void) | null, cancelled: 0};
    const host: GrowthHost = {
        now: () => page.time,
        reducedMotion: () => reducedMotion,
        requestFrame: (callback) => { page.pending = callback; return 1; },
        cancelFrame: () => { page.pending = null; page.cancelled++; },
    };
    const written: number[] = [];
    const stop = startGrowth((growth) => written.push(growth), host, visit);
    const advance = (ms: number, step = 16) => {
        for (let t = 0; t < ms; t += step) {
            page.time += step;
            const frame = page.pending;
            page.pending = null;
            frame?.();
        }
    };
    return {page, written, stop, visit, advance, last: () => written[written.length - 1]};
}

const isMonotonic = (values: number[]) => values.every((v, i) => i === 0 || v >= values[i - 1]);

test('the ramp rises monotonically from 0 to 1 and stays there', () => {
    const samples = Array.from({length: 61}, (_, i) => loadRamp(i * LOAD_MS / 50));
    expect(samples[0]).toBe(0);
    expect(isMonotonic(samples)).toBe(true);
    expect(loadRamp(LOAD_MS)).toBe(1);
    expect(loadRamp(LOAD_MS * 4)).toBe(1);
    expect(loadRamp(-100)).toBe(0);
});

test('growth starts at 0, rises monotonically and is complete after the animation, then requests no frames', () => {
    const {written, advance, last, page} = run();
    expect(written).toEqual([0]);
    advance(LOAD_MS / 2);
    expect(last()).toBeGreaterThan(.5);
    expect(last()).toBeLessThan(1);
    advance(LOAD_MS);
    expect(last()).toBe(1);
    expect(isMonotonic(written)).toBe(true);
    expect(page.pending).toBeNull();
});

test('reduced motion is fully grown at once with no frames', () => {
    const {written, page, visit} = run({reducedMotion: true});
    expect(written).toEqual([1]);
    expect(page.pending).toBeNull();
    expect(visit.reached).toBe(1);
});

test('stopping cancels the pending frame and writes nothing more', () => {
    const {stop, page, written, advance} = run();
    expect(page.pending).not.toBeNull();
    stop();
    expect(page.pending).toBeNull();
    expect(page.cancelled).toBe(1);
    advance(LOAD_MS);
    expect(written).toEqual([0]);
});

test('a later mount in the same visit continues from the growth reached and never regrows', () => {
    const first = run();
    first.advance(LOAD_MS / 2);
    first.stop();
    const reached = first.visit.reached;
    const second = run(undefined, first.visit);
    expect(second.written).toEqual([reached]);
    second.advance(LOAD_MS + 100);
    expect(second.last()).toBe(1);
    expect(isMonotonic(second.written)).toBe(true);
    const third = run(undefined, first.visit);
    expect(third.written).toEqual([1]);
    expect(third.page.pending).toBeNull();
});
