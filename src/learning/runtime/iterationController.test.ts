import {AnimationScheduler} from './animation';
import {IterationController, IterationOutcome} from './iterationController';

/** Manual frame source: tests decide when each requested frame runs and what time it reports. */
function manualScheduler() {
    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
    /** Runs the one pending frame, `elapsed` ms after the previous one. Returns false when no frame was pending. */
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    return {scheduler, callbacks, frame};
}

const INTERVAL = 100;

/** A toy bisection of x^2 - 2 on [1, 2]; the real graphs keep their own bracket state behind the same seam. */
function bisectionHarness(options: {maxIterations?: number; stopAtWidth?: number} = {}) {
    const frames = manualScheduler();
    const state = {a: 1, b: 2, midpoints: [] as number[]};
    const f = (x: number) => x * x - 2;
    const completed = vi.fn();
    const resets = vi.fn();
    const controller = new IterationController({
        transition: (): IterationOutcome => {
            const mid = (state.a + state.b) / 2;
            state.midpoints.push(mid);
            if (f(state.a) * f(mid) <= 0) state.b = mid; else state.a = mid;
            return options.stopAtWidth !== undefined && state.b - state.a <= options.stopAtWidth ? 'complete' : 'continue';
        },
        stepIntervalMs: INTERVAL,
        maxIterations: options.maxIterations ?? 20,
        onReset: () => {state.a = 1; state.b = 2; state.midpoints = []; resets();},
        onComplete: completed,
        scheduler: frames.scheduler,
    });
    /** Plays by feeding frames of exactly one step interval until `steps` transitions ran. */
    const playSteps = (steps: number) => {
        const target = controller.iteration + steps;
        frames.frame(0);
        for (let guard = 0; controller.iteration < target && guard < 1000; guard += 1) {
            if (!frames.frame(INTERVAL)) break;
        }
    };
    return {controller, state, frames, completed, resets, playSteps};
}

test('Next step repeated k times equals playing k steps', () => {
    for (const k of [1, 3, 7]) {
        const manual = bisectionHarness();
        for (let i = 0; i < k; i += 1) manual.controller.nextStep();

        const played = bisectionHarness();
        played.controller.play();
        played.playSteps(k);
        played.controller.pause();

        expect(played.controller.iteration).toBe(k);
        expect(played.state).toEqual(manual.state);
        expect(manual.state.midpoints.slice(0, 3)).toEqual([1.5, 1.25, 1.375].slice(0, Math.min(k, 3)));
    }
});

test('playback performs the first step after one full interval and at most one step per frame', () => {
    const {controller, frames, state} = bisectionHarness();
    controller.play();
    frames.frame(0);
    frames.frame(INTERVAL - 1);
    expect(controller.iteration).toBe(0);
    frames.frame(1);
    expect(controller.iteration).toBe(1);
    // A very long frame does not catch up on missed steps.
    frames.frame(INTERVAL * 50);
    expect(controller.iteration).toBe(2);
    expect(state.midpoints).toHaveLength(2);
});

test('pause stops stepping and resume continues from the paused state without a time jump', () => {
    const {controller, frames, state, playSteps} = bisectionHarness();
    controller.play();
    playSteps(2);
    const paused = JSON.parse(JSON.stringify(state));
    controller.pause();
    expect(controller.status).toBe('paused');
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(10_000)).toBe(false);
    expect(state).toEqual(paused);

    controller.play();
    expect(controller.status).toBe('playing');
    // The first frame after resuming reports no elapsed time, however long the pause was.
    frames.frame(10_000);
    expect(controller.iteration).toBe(2);
    frames.frame(INTERVAL);
    expect(controller.iteration).toBe(3);
    expect(state.midpoints.slice(0, 2)).toEqual(paused.midpoints);
    expect(state.midpoints).toHaveLength(3);
});

test('the iteration limit stops playback, runs onComplete once and rejects further steps', () => {
    const {controller, frames, completed, state, playSteps} = bisectionHarness({maxIterations: 3});
    controller.play();
    playSteps(10);
    expect(controller.iteration).toBe(3);
    expect(controller.isComplete()).toBe(true);
    expect(controller.status).toBe('complete');
    expect(controller.isPlaying()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(controller.nextStep()).toBe(false);
    controller.play();
    expect(controller.isPlaying()).toBe(false);
    expect(state.midpoints).toHaveLength(3);
});

test('a transition that reports completion ends manual stepping too', () => {
    const {controller, completed} = bisectionHarness({stopAtWidth: 0.25});
    expect(controller.nextStep()).toBe(true);
    expect(controller.nextStep()).toBe(true);
    expect(controller.isComplete()).toBe(true);
    expect(completed).toHaveBeenCalledTimes(1);
    expect(controller.nextStep()).toBe(false);
});

test('reset stops playback, restores the initial state and allows the iteration to run again', () => {
    const {controller, frames, state, resets, playSteps} = bisectionHarness({maxIterations: 2});
    controller.play();
    playSteps(5);
    expect(controller.isComplete()).toBe(true);
    controller.reset();
    expect(resets).toHaveBeenCalledTimes(1);
    expect(controller.status).toBe('idle');
    expect(controller.iteration).toBe(0);
    expect(state).toEqual({a: 1, b: 2, midpoints: []});
    expect(frames.callbacks.size).toBe(0);
    expect(controller.nextStep()).toBe(true);
    expect(state.midpoints).toEqual([1.5]);
});

test('reset can start from a restored iteration index and is complete at the limit', () => {
    const {controller} = bisectionHarness({maxIterations: 4});
    controller.reset(2);
    expect(controller.iteration).toBe(2);
    expect(controller.isComplete()).toBe(false);
    controller.reset(99);
    expect(controller.iteration).toBe(4);
    expect(controller.isComplete()).toBe(true);
});

test('no callback runs after dispose, including a frame that was already requested', () => {
    const {controller, frames, completed, resets, state} = bisectionHarness();
    controller.play();
    frames.frame(0);
    expect(frames.callbacks.size).toBe(1);
    const pending = [...frames.callbacks.values()][0];
    controller.dispose();
    expect(frames.callbacks.size).toBe(0);
    pending(INTERVAL * 10);
    expect(controller.nextStep()).toBe(false);
    controller.play();
    controller.reset();
    expect(frames.callbacks.size).toBe(0);
    expect(state.midpoints).toEqual([]);
    expect(completed).not.toHaveBeenCalled();
    expect(resets).not.toHaveBeenCalled();
});

test('scene replacement pauses and resets, so no queued frame mutates the new scene', () => {
    const {controller, frames, state, playSteps} = bisectionHarness();
    controller.play();
    playSteps(2);
    controller.reset();
    state.a = 5;
    expect(frames.frame(INTERVAL * 10)).toBe(false);
    expect(controller.iteration).toBe(0);
    expect(state.a).toBe(5);
});

test('a failing transition pauses playback and rethrows', () => {
    const frames = manualScheduler();
    const controller = new IterationController({
        transition: () => {throw new Error('invalid bracket');},
        stepIntervalMs: INTERVAL,
        maxIterations: 5,
        scheduler: frames.scheduler,
    });
    controller.play();
    frames.frame(0);
    expect(() => frames.frame(INTERVAL)).toThrow('invalid bracket');
    expect(controller.isPlaying()).toBe(false);
    expect(controller.iteration).toBe(0);
    expect(frames.callbacks.size).toBe(0);
});

test('rejects an invalid interval or iteration limit', () => {
    const transition = () => undefined;
    expect(() => new IterationController({transition, stepIntervalMs: 0, maxIterations: 5})).toThrow(RangeError);
    expect(() => new IterationController({transition, stepIntervalMs: 100, maxIterations: 0})).toThrow(RangeError);
    expect(() => new IterationController({transition, stepIntervalMs: 100, maxIterations: 1.5})).toThrow(RangeError);
});
