import React from 'react';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {EAR_CLIPPING_STEP_INTERVAL_MS, EarClippingGraph} from './EarClippingGraph';
import {EAR_CLIPPING_EXAMPLE_2} from './earClippingPresetCollection';
import {HullTraceGraph} from './HullTraceGraph';
import {PointSetGraph} from './PointSetGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {LessonAction, LessonAnimationCommand, UnsupportedLessonActionError} from '../../learning/model';
import {POINT_SET_OVERLAY_NAMES} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

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

class Observed extends EarClippingGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

const trace = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});
const traceStep = (step: number | 'end'): PointSetAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const overlay = (name: (typeof POINT_SET_OVERLAY_NAMES)[number], visible: boolean): PointSetAction => ({kind: 'point-set', operation: 'set-overlay', overlay: name, visible});
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });
type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
const part = (name: string) => document.querySelector(`[data-ear-clipping="${name}"]`)?.textContent;
const status = () => ['step', 'note', 'detail', 'triangles', 'count'].map(part);
const result = () => ['triangles', 'diagonals', 'classes', 'guards'].map(name => document.querySelector(`[data-result="${name}"]`)?.textContent);
const click = (action: string) => act(() => {
    fireEvent.click(document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement);
});
/** A mounted graph on a manual scheduler; the previous one is unmounted first (one board per document). */
function setup() {
    cleanup();
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, frames};
}
const playOneTick = (graph: Observed, frames: ReturnType<typeof manualScheduler>) => {
    apply(graph, trace('play'));
    act(() => { frames.frame(0); });
    act(() => { frames.frame(EAR_CLIPPING_STEP_INTERVAL_MS); });
};
const snapshot = (graph: Observed) => ({step: graph.step, state: graph.state, shown: status(), result: result(), playing: graph.isPlaying});

test('the default scene is Example 1 at step 0, stopped with nothing scheduled, and the trace actions are supported', () => {
    const {graph, frames} = setup();
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.run().length]).toEqual([0, false, 0, 12]);
    for (const command of ['next-step', 'reset', 'play', 'pause', 'replay'] as const) expect(graph.supportsLessonAction(trace(command))).toBe(true);
    expect(graph.supportsLessonAction(traceStep('end'))).toBe(true);
});

test('set-trace-step clamps a number like a stored Preset step, and end is the last step', () => {
    const {graph} = setup();
    const last = graph.run().length - 1;
    const stepAfter = (step: number | 'end') => { apply(graph, traceStep(step)); return graph.step; };
    expect([stepAfter(5), stepAfter(999), stepAfter(-3), stepAfter(2.9), stepAfter(Number.MAX_SAFE_INTEGER)]).toEqual([5, last, 0, 2, last]);
    // The stored step is clamped too, not only the step getter.
    apply(graph, traceStep(999));
    expect(graph.state).toMatchObject({step: last});
    apply(graph, traceStep(-3));
    expect(graph.state).toMatchObject({step: 0});
    expect(stepAfter('end')).toBe(last);
    expect(graph.state).toMatchObject({step: last});
    expect(() => graph.run1(traceStep(Number.NaN))).toThrow('set-trace-step');
    expect(() => graph.run1(traceStep(Number.POSITIVE_INFINITY))).toThrow('set-trace-step');
    expect(() => graph.run1(traceStep('last' as 'end'))).toThrow('set-trace-step');
    expect(graph.step).toBe(last);
});

test('set-trace-step end equals Next step pressed until done: step, readouts, board and result', () => {
    for (const comb of [false, true]) {
        const viaNext = setup();
        if (comb) apply(viaNext.graph, {kind: 'point-set', operation: 'set-points', mode: 'polygon', closed: true, points: EAR_CLIPPING_EXAMPLE_2.points.map(p => [p.x, p.y])});
        while (viaNext.graph.step < viaNext.graph.run().length - 1) apply(viaNext.graph, trace('next-step'));
        const fromNext = snapshot(viaNext.graph);
        const board = viaNext.graph['board'].objectsList.length;

        const viaEnd = setup();
        if (comb) apply(viaEnd.graph, {kind: 'point-set', operation: 'set-points', mode: 'polygon', closed: true, points: EAR_CLIPPING_EXAMPLE_2.points.map(p => [p.x, p.y])});
        apply(viaEnd.graph, traceStep('end'));
        expect(snapshot(viaEnd.graph)).toEqual(fromNext);
        expect(viaEnd.graph['board'].objectsList.length).toBe(board);
        expect(fromNext.step).toBe(viaEnd.graph.run().length - 1);
        expect(result()[0]).toContain(comb ? '9' : '3');
    }
});

test('set-trace-step pauses a running playback, leaves no scheduler callback and keeps later Next steps working', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, traceStep(4));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([4, false, 0]);
    apply(graph, trace('next-step'));
    expect(graph.step).toBe(5);
    apply(graph, traceStep('end'));
    apply(graph, trace('next-step'));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([graph.run().length - 1, false, 0]);
    apply(graph, trace('play'));
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([false, 0]);
});

test('the next-step action repeated k times equals the Next button repeated k times', () => {
    const viaAction = setup();
    for (let k = 0; k < 7; k++) apply(viaAction.graph, trace('next-step'));
    const fromAction = snapshot(viaAction.graph);

    const viaButton = setup();
    for (let k = 0; k < 7; k++) click('next-step');
    expect(snapshot(viaButton.graph)).toEqual(fromAction);
    expect(fromAction.step).toBe(7);
});

test('reset, pause, replay and play act like their buttons', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    apply(graph, trace('pause'));
    expect([graph.isPlaying, graph.step > 0, frames.callbacks.size]).toEqual([false, true, 0]);
    apply(graph, traceStep(6));
    apply(graph, trace('reset'));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    apply(graph, traceStep(6));
    apply(graph, trace('replay'));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, true, 1]);
    apply(graph, trace('pause'));
    expect(frames.callbacks.size).toBe(0);
});

test('edit actions pause and return to step 0; set-overlay keeps the step', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    apply(graph, traceStep(7));
    apply(graph, overlay('guards', true));
    apply(graph, overlay('trace', false));
    expect([graph.step, graph.overlayShown('guards'), graph.overlayShown('trace')]).toEqual([7, true, false]);
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    const stepBefore = graph.step;
    apply(graph, overlay('colouring', true));
    expect([graph.step, graph.isPlaying]).toEqual([stepBefore, true]);
    apply(graph, {kind: 'point-set', operation: 'set-points', mode: 'polygon', closed: true, points: [[0, 0], [4, 0], [4, 4], [0, 4]]});
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.model.points.length]).toEqual([0, false, 0, 4]);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
});

test('Back (stopping the lesson animations), a state restore and unmount pause playback and leave no scheduler callback', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    const stoppedAt = graph.step;
    act(() => { capabilities.stopAnimations?.(); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, stoppedAt]);

    apply(graph, traceStep(8));
    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { capabilities.restoreState(checkpoint); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);

    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { graph.unmount(); });
    expect(frames.callbacks.size).toBe(0);
});

test('a language switch leaves the step and playback as they are', () => {
    const {graph, frames} = setup();
    apply(graph, traceStep(5));
    act(() => { setLanguage('en'); });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([5, false, 0]);
    expect(part('step')).toBe('Step 6 of 12');
    act(() => { setLanguage('sl'); });
    expect(part('step')).toBe('Korak 6 od 12');
});

test('the four new overlays are accepted by the ear clipping graph and rejected by the hull trace and the base graph', () => {
    const {graph} = setup();
    const names = ['reflex', 'triangulation', 'colouring', 'guards'] as const;
    for (const name of names) {
        expect(POINT_SET_OVERLAY_NAMES).toContain(name);
        apply(graph, overlay(name, false));
        expect(graph.overlayShown(name)).toBe(false);
        apply(graph, overlay(name, true));
        expect(graph.overlayShown(name)).toBe(true);
    }
    for (const other of [new HullTraceGraph(), new PointSetGraph()]) {
        for (const name of names) {
            expect(() => other.applyPointSetAction(overlay(name, true))).toThrow(UnsupportedLessonActionError);
        }
    }
    // The hull trace keeps owning the trace overlay of its own.
    expect(() => new HullTraceGraph().applyPointSetAction(overlay('trace', true))).not.toThrow();
});

test('set-trace-step is refused by the base point-set graph and by the hull trace', () => {
    for (const other of [new PointSetGraph(), new HullTraceGraph()]) {
        expect(() => other.applyPointSetAction(traceStep(3))).toThrow(UnsupportedLessonActionError);
        expect(() => other.applyPointSetAction(traceStep('end'))).toThrow(UnsupportedLessonActionError);
    }
});
