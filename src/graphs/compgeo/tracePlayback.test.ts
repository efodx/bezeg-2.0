import {AnimationScheduler} from '../../learning/runtime/animation';
import {TracePlayback} from './tracePlayback';

function manualScheduler() {
    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
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

/** A store-like host: the step index lives here, and every write is reported to `settle` like a graph's `setState` does. */
function harness(length: number, interval = 400) {
    const frames = manualScheduler();
    const h = {
        length, step: 0, busy: false, interval, renders: 0,
        playback: undefined as unknown as TracePlayback,
        /** A write that names the step (a restore, a lesson action, Reset). */
        write(step: number) { h.step = Math.max(0, Math.min(step, Math.max(h.length - 1, 0))); h.playback.settle(false, true); },
        /** A write of a new model: the step returns to 0 (or to a named step). */
        editModel(named?: number) { h.step = named ?? 0; h.playback.settle(true, named !== undefined); },
        /** A write of a new model whose graph keeps the step (Fortune), or counts another input as a model (Delaunay triangles). */
        editKeepingStep(kept: number) { h.step = kept; h.playback.settle(true, false); },
    };
    h.playback = new TracePlayback({
        runLength: () => h.length,
        step: () => h.step,
        writeStep: step => h.write(step),
        exportBusy: () => h.busy,
        requestRender: () => { h.renders += 1; },
        intervalMs: () => h.interval,
    }, frames.scheduler);
    /** The first frame starts the clock; each later one is a full interval. */
    const ticks = (count: number, elapsed = h.interval) => {
        frames.frame(0);
        for (let i = 0; i < count; i++) frames.frame(elapsed);
    };
    return {h, frames, ticks};
}

test('Next step to the end and Play to the end reach the same nonempty final step; both stop and leave nothing scheduled', () => {
    const byNext = harness(6);
    for (let i = 0; i < 10; i++) byNext.h.playback.nextStep();
    const byPlay = harness(6);
    byPlay.h.playback.play();
    expect(byPlay.h.playback.isPlaying).toBe(true);
    byPlay.ticks(20);
    expect(byNext.h.step).toBe(5);
    expect(byPlay.h.step).toBe(5);
    expect(byPlay.h.playback.isPlaying).toBe(false);
    expect(byPlay.frames.callbacks.size).toBe(0);
    // finished: Play and Next step are no-ops
    byPlay.h.playback.play();
    byPlay.h.playback.nextStep();
    expect([byPlay.h.playback.isPlaying, byPlay.h.step, byPlay.frames.callbacks.size]).toEqual([false, 5, 0]);
});

test('Play advances one step per interval and never catches up after a long frame', () => {
    const {h, frames, ticks} = harness(50);
    h.playback.play();
    ticks(3);
    expect(h.step).toBe(3);
    frames.frame(5000);
    expect(h.step).toBe(4);
    frames.frame(100);
    expect(h.step).toBe(4);
});

test('Reset after completion and Replay run the trace again; a seek after completion restarts a working controller', () => {
    const {h, frames, ticks} = harness(4);
    h.playback.play();
    ticks(10);
    expect(h.step).toBe(3);
    h.playback.resetTrace();
    expect([h.step, h.playback.isPlaying]).toEqual([0, false]);
    h.playback.resetTrace();
    h.playback.play();
    ticks(10);
    expect(h.step).toBe(3);
    // seek back from done, outside advance(): the controller is reset to that step and Play continues from it
    h.write(1);
    expect(h.playback.isPlaying).toBe(false);
    h.playback.play();
    ticks(1);
    expect(h.step).toBe(2);
    h.playback.pause();
    expect(frames.callbacks.size).toBe(0);
});

test('a new model returns to step 0 and stops playback; a model written with a named step keeps it', () => {
    const {h, frames, ticks} = harness(8);
    h.playback.play();
    ticks(3);
    expect(h.step).toBe(3);
    h.editModel();
    expect([h.step, h.playback.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    h.playback.play();
    ticks(2);
    h.length = 5;
    h.editModel(2);
    expect([h.step, h.playback.isPlaying, frames.callbacks.size]).toEqual([2, false, 0]);
    h.playback.nextStep();
    expect(h.step).toBe(3);
});

test('an empty or refused run and a running export refuse Next step and Play without scheduling anything', () => {
    const empty = harness(0);
    empty.h.playback.nextStep();
    empty.h.playback.play();
    expect([empty.h.step, empty.h.playback.isPlaying, empty.frames.callbacks.size]).toEqual([0, false, 0]);
    expect(empty.h.renders).toBe(0);
    // a seek to the last event refuses Next step the same way: no write, no render
    const atLast = harness(4);
    atLast.h.write(3);
    const rendersBefore = atLast.h.renders;
    atLast.h.playback.nextStep();
    expect(atLast.h.renders).toBe(rendersBefore);

    const exporting = harness(5);
    exporting.h.busy = true;
    exporting.h.playback.nextStep();
    exporting.h.playback.play();
    expect([exporting.h.step, exporting.h.playback.isPlaying, exporting.frames.callbacks.size]).toEqual([0, false, 0]);
    exporting.h.busy = false;
    exporting.h.playback.nextStep();
    expect(exporting.h.step).toBe(1);
});

test('a run that shrinks while playing ends at its last event', () => {
    const {h, ticks} = harness(10);
    h.playback.play();
    ticks(2);
    h.length = 3;
    h.step = 2;
    h.playback.nextStep();
    expect(h.step).toBe(2);
});

test('replacement pauses; unmount cancels the pending frame and silences the controller; mount gives a working one', () => {
    const {h, frames, ticks} = harness(10);
    h.playback.play();
    ticks(2);
    h.playback.halt();
    expect([h.playback.isPlaying, frames.callbacks.size]).toEqual([false, 0]);

    h.playback.play();
    ticks(1);
    expect(frames.callbacks.size).toBe(1);
    h.playback.unmount();
    expect([h.playback.isPlaying, frames.callbacks.size]).toEqual([false, 0]);
    const stepAtUnmount = h.step;
    expect(frames.frame(400)).toBe(false);
    h.playback.play();
    h.playback.nextStep();
    expect([h.step, frames.callbacks.size]).toEqual([stepAtUnmount, 0]);

    h.playback.mount();
    h.playback.play();
    ticks(1);
    expect(h.step).toBe(stepAtUnmount + 1);
});

test('a changed tick replaces the idle controller before it runs; the new interval is used', () => {
    const {h, frames} = harness(20, 400);
    h.interval = 50;
    h.playback.play();
    frames.frame(0);
    frames.frame(50);
    expect(h.step).toBe(1);
    h.playback.pause();
    h.interval = 400;
    h.playback.play();
    frames.frame(0);
    frames.frame(50);
    expect(h.step).toBe(1);
    frames.frame(400);
    expect(h.step).toBe(2);
});

test('a model edit that leaves the step where the graph put it (Fortune keeps it) restarts a finished playback from there', () => {
    const {h, ticks} = harness(6);
    h.playback.play();
    ticks(10);
    expect([h.step, h.playback.isPlaying]).toEqual([5, false]);
    h.editKeepingStep(2);
    expect([h.step, h.playback.isPlaying]).toEqual([2, false]);
    h.playback.play();
    expect(h.playback.isPlaying).toBe(true);
    ticks(10);
    expect([h.step, h.playback.isPlaying]).toEqual([5, false]);
});

test('each graph ticks at its own interval: a frame shorter than the interval does not advance, a full one advances once', () => {
    for (const interval of [50, 400, 500, 600]) {
        const {h, frames} = harness(10, interval);
        h.playback.play();
        frames.frame(0);
        frames.frame(interval - 1);
        expect(h.step).toBe(0);
        frames.frame(1);
        expect(h.step).toBe(1);
    }
});
