import {growthGoal, GrowthHost, loadRamp, LOAD_GROWTH, LOAD_MS, MIN_SCROLL, startGrowth} from './growth';

/** A page driven by hand: `advance` moves the clock and runs the frame that was requested, if any. */
function fakePage({scrollable = 3000, reducedMotion = false} = {}) {
    const page = {time: 0, scrollY: 0, scrollable, listeners: new Set<() => void>(), pending: null as (() => void) | null, cancelled: 0};
    const host: GrowthHost = {
        now: () => page.time,
        scrollY: () => page.scrollY,
        scrollable: () => page.scrollable,
        reducedMotion: () => reducedMotion,
        requestFrame: (callback) => { page.pending = callback; return 1; },
        cancelFrame: () => { page.pending = null; page.cancelled++; },
        onScroll: (listener) => { page.listeners.add(listener); return () => page.listeners.delete(listener); },
    };
    const advance = (ms: number, step = 16) => {
        for (let t = 0; t < ms; t += step) {
            page.time += step;
            const frame = page.pending;
            page.pending = null;
            frame?.();
        }
    };
    const scrollTo = (y: number) => { page.scrollY = y; page.listeners.forEach((listener) => listener()); };
    return {page, host, advance, scrollTo};
}

function run(options?: Parameters<typeof fakePage>[0], visit = {reached: 0}) {
    const fake = fakePage(options), written: number[] = [];
    const stop = startGrowth((growth) => written.push(growth), fake.host, visit);
    return {...fake, written, stop, visit, last: () => written[written.length - 1]};
}

const isMonotonic = (values: number[]) => values.every((v, i) => i === 0 || v >= values[i - 1]);

test('the goal is the load growth at the top, 1 at the end, and 1 where the page cannot scroll', () => {
    expect(growthGoal(0, 3000)).toBe(LOAD_GROWTH);
    expect(growthGoal(1500, 3000)).toBeCloseTo(.8);
    expect(growthGoal(3000, 3000)).toBe(1);
    expect(growthGoal(9999, 3000)).toBe(1); // overscroll
    expect(growthGoal(-50, 3000)).toBe(LOAD_GROWTH);
    expect(growthGoal(0, MIN_SCROLL - 1)).toBe(1);
    expect(growthGoal(0, 0)).toBe(1);
    expect(growthGoal(0, Number.NaN)).toBe(1);
});

test('the load ramp rises monotonically from 0 to 1 and stays there', () => {
    const samples = Array.from({length: 61}, (_, i) => loadRamp(i * LOAD_MS / 50));
    expect(samples[0]).toBe(0);
    expect(isMonotonic(samples)).toBe(true);
    expect(loadRamp(LOAD_MS)).toBe(1);
    expect(loadRamp(LOAD_MS * 4)).toBe(1);
});

test('on a scrolling page growth starts at 0, ramps up and holds at the load growth until scrolling', () => {
    const {written, advance, last, page} = run();
    expect(written).toEqual([0]);
    advance(LOAD_MS / 2);
    expect(last()).toBeGreaterThan(.3);
    expect(last()).toBeLessThan(LOAD_GROWTH);
    advance(LOAD_MS * 2);
    expect(last()).toBeCloseTo(LOAD_GROWTH);
    expect(Math.max(...written)).toBeLessThanOrEqual(LOAD_GROWTH + 1e-9);
    expect(isMonotonic(written)).toBe(true);
    expect(page.pending).toBeNull(); // no frames while idle
});

test('scrolling carries growth to 1 in proportion to scroll progress', () => {
    const {advance, scrollTo, last, written} = run();
    advance(LOAD_MS + 100);
    scrollTo(1500);
    advance(1000);
    expect(last()).toBeCloseTo(.8);
    scrollTo(3000);
    advance(1000);
    expect(last()).toBe(1);
    expect(isMonotonic(written)).toBe(true);
});

test('growth never decreases when scrolling back up', () => {
    const {advance, scrollTo, last, written} = run();
    advance(LOAD_MS + 100);
    scrollTo(2400);
    advance(1000);
    const reached = last();
    scrollTo(0);
    advance(1000);
    expect(last()).toBe(reached);
    expect(isMonotonic(written)).toBe(true);
});

test('a jump to the page end grows in over several frames instead of popping', () => {
    const {advance, scrollTo, written} = run();
    advance(LOAD_MS + 100);
    advance(5000); // idle
    const before = written.length;
    scrollTo(3000);
    advance(16);
    expect(written[before] - written[before - 1]).toBeLessThan(.1);
    advance(1000);
    expect(written[written.length - 1]).toBe(1);
});

test('a page that cannot scroll grows straight to 1 during the load animation', () => {
    const {advance, last, written} = run({scrollable: 120});
    advance(LOAD_MS + 500);
    expect(last()).toBe(1);
    expect(isMonotonic(written)).toBe(true);
});

test('reduced motion is fully grown at once with no frames and no listener', () => {
    const {written, page, visit} = run({reducedMotion: true});
    expect(written).toEqual([1]);
    expect(page.pending).toBeNull();
    expect(page.listeners.size).toBe(0);
    expect(visit.reached).toBe(1);
});

test('stopping removes the scroll listener and cancels the pending frame', () => {
    const {stop, page, written, advance, scrollTo} = run();
    expect(page.listeners.size).toBe(1);
    expect(page.pending).not.toBeNull();
    stop();
    expect(page.listeners.size).toBe(0);
    expect(page.pending).toBeNull();
    expect(page.cancelled).toBe(1);
    scrollTo(3000);
    advance(500);
    expect(written).toEqual([0]);
});

test('a later mount in the same visit starts from the growth already reached', () => {
    const first = run();
    first.advance(LOAD_MS + 100);
    first.scrollTo(3000);
    first.advance(1000);
    first.stop();
    const second = run(undefined, first.visit);
    expect(second.written).toEqual([1]);
    second.advance(LOAD_MS + 100);
    expect(second.written.every((growth) => growth === 1)).toBe(true);
});
