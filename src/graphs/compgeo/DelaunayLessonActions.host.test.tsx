import {stepWhile} from './boundedSteps.testing';
import React from 'react';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DELAUNAY_STEP_INTERVAL_MS, DelaunayGraph} from './DelaunayGraph';
import {TriangulationGraph} from './TriangulationGraph';
import {EarClippingGraph} from './EarClippingGraph';
import {HullTraceGraph} from './HullTraceGraph';
import {PointSetGraph} from './PointSetGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {LessonAction, LessonAnimationCommand, UnsupportedLessonActionError} from '../../learning/model';
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

class Observed extends DelaunayGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
const trace = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});
const traceStep = (step: number | 'end'): PointSetAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const selectTriangle = (triangle: number | null): PointSetAction => ({kind: 'point-set', operation: 'select-triangle', triangle});
const setPoints = (points: [number, number][]): PointSetAction => ({kind: 'point-set', operation: 'set-points', mode: 'points', points});
const apply = (graph: Observed, ...actions: LessonAction[]) => act(() => { for (const action of actions) graph.run1(action); });
const parts = () => [...document.querySelectorAll('[data-delaunay], [data-readout]')].map(node => node.textContent);
const click = (action: string) => act(() => { fireEvent.click(document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement); });
const clickTriangle = (index: number) => act(() => { fireEvent.click(document.querySelector(`button[data-triangle="${String(index)}"]`) as HTMLButtonElement); });
const selected = () => document.querySelector('[data-delaunay="selected-triangle"]')?.textContent;
const shownCount = (graph: Observed) => graph.triangulation()?.triangles.length ?? 0;
const sortedTriples = (graph: Observed) => (graph.triangulation()?.triangles ?? []).map(tri => [...tri].sort().join(',')).sort();

/** A mounted graph (default scene: the quad with diagonal ac) on a manual scheduler. */
function setup() {
    cleanup();
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, frames};
}
const snapshot = (graph: Observed) => ({step: graph.step, state: graph.state, shown: parts(), playing: graph.isPlaying, triangles: graph.triangulation()?.triangles});
const playOneTick = (graph: Observed, frames: ReturnType<typeof manualScheduler>) => {
    apply(graph, trace('play'));
    act(() => { frames.frame(0); });
    act(() => { frames.frame(DELAUNAY_STEP_INTERVAL_MS); });
};

test('the default scene is stopped with nothing scheduled, and the trace actions and set-trace-step are supported', () => {
    const {graph, frames} = setup();
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    for (const command of ['next-step', 'reset', 'play', 'pause', 'replay'] as const) expect(graph.supportsLessonAction(trace(command))).toBe(true);
    expect(graph.supportsLessonAction(traceStep('end'))).toBe(true);
    expect(graph.supportsLessonAction(selectTriangle(0))).toBe(true);
});

test('the next-step action repeated k times equals the Next button repeated k times, step and readouts', () => {
    for (const k of [1, 2, 3, 5]) {
        const viaAction = setup();
        for (let i = 0; i < k; i++) apply(viaAction.graph, trace('next-step'));
        const fromAction = snapshot(viaAction.graph);
        const viaButton = setup();
        for (let i = 0; i < k; i++) click('next-step');
        expect(snapshot(viaButton.graph)).toEqual(fromAction);
        expect(fromAction.step).toBe(Math.min(k, viaButton.graph.run().length - 1));
    }
});

test('set-trace-step clamps a number, end equals Next pressed until done, and a bad step throws', () => {
    const viaNext = setup();
    stepWhile(() => viaNext.graph.step < viaNext.graph.run().length - 1, () => click('next-step'));
    const fromNext = snapshot(viaNext.graph);

    const {graph} = setup();
    const last = graph.run().length - 1;
    const stepAfter = (step: number | 'end') => { apply(graph, traceStep(step)); return graph.step; };
    expect([stepAfter(1), stepAfter(999), stepAfter(-3), stepAfter(1.9)]).toEqual([1, last, 0, 1]);
    apply(graph, traceStep(999));
    expect(graph.state).toMatchObject({step: last});
    apply(graph, traceStep(0));
    apply(graph, traceStep('end'));
    expect(snapshot(graph)).toEqual(fromNext);
    expect(() => graph.run1(traceStep(Number.NaN))).toThrow('set-trace-step');
    expect(() => graph.run1(traceStep('last' as 'end'))).toThrow('set-trace-step');
    expect(graph.step).toBe(last);
});

test('set-trace-step pauses a running playback and leaves no scheduler callback', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([true, 1]);
    apply(graph, traceStep(1));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([1, false, 0]);
    apply(graph, trace('next-step'));
    expect(graph.step).toBe(2);
});

test('reset, pause, play and replay act like their buttons', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect([graph.isPlaying, graph.step > 0, frames.callbacks.size]).toEqual([true, true, 1]);
    apply(graph, trace('pause'));
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([false, 0]);
    apply(graph, traceStep(2));
    apply(graph, trace('reset'));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    apply(graph, traceStep(2));
    apply(graph, trace('replay'));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, true, 1]);
    apply(graph, trace('pause'));
    expect(frames.callbacks.size).toBe(0);
    // Button parity: the Reset button after the same preparation lands on the same snapshot.
    apply(graph, traceStep(3));
    apply(graph, trace('reset'));
    const viaAction = snapshot(graph);
    apply(graph, traceStep(3));
    click('reset');
    expect(snapshot(graph)).toEqual(viaAction);
});

test('play then pause, a scene change, Back, a state restore and unmount leave no pending scheduler callback', () => {
    const {graph, frames} = setup();
    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    apply(graph, trace('pause'));
    expect(frames.callbacks.size).toBe(0);

    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, setPoints([[0, 0], [4, 0], [4, 3], [0, 3], [2, 1]]));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);

    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    playOneTick(graph, frames);
    act(() => { capabilities.stopAnimations?.(); });
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([false, 0]);
    apply(graph, trace('play'));
    act(() => { capabilities.restoreState(checkpoint); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);
    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { graph.unmount(); });
    expect(frames.callbacks.size).toBe(0);
});

test('select-triangle selects like a panel click, null clears, and a step change clears it', () => {
    const {graph} = setup();
    apply(graph, selectTriangle(1));
    expect(graph.selectedTriangle()).toBe(1);
    const viaAction = selected();
    expect(viaAction).toBeTruthy();
    apply(graph, selectTriangle(null));
    expect([graph.selectedTriangle(), selected()]).toEqual([undefined, undefined]);
    clickTriangle(1);
    expect([graph.selectedTriangle(), selected()]).toEqual([1, viaAction]);
    apply(graph, selectTriangle(0));
    expect(graph.selectedTriangle()).toBe(0);
    apply(graph, trace('next-step'));
    expect(graph.selectedTriangle()).toBeUndefined();
    apply(graph, selectTriangle(0), traceStep(0));
    expect(graph.selectedTriangle()).toBeUndefined();
});

test('select-triangle out of range, negative or not an integer throws and changes nothing', () => {
    const {graph} = setup();
    apply(graph, selectTriangle(0));
    const before = snapshot(graph);
    for (const triangle of [2, 99, -1, 0.5, Number.NaN, '1' as unknown as number, undefined as unknown as number]) {
        expect(() => graph.run1(selectTriangle(triangle))).toThrow('select-triangle');
    }
    expect(snapshot(graph)).toEqual(before);
    expect(graph.selectedTriangle()).toBe(0);
});

test('the index is into the triangulation shown at the current step', () => {
    const {graph} = setup();
    apply(graph, setPoints([[0, 0], [6, 0], [6, 5], [0, 5], [3, 2], [1, 3]]));
    const count = shownCount(graph);
    expect(count).toBeGreaterThan(2);
    apply(graph, traceStep('end'));
    expect(shownCount(graph)).toBe(count);
    const corners = graph.triangulation()!.triangles[count - 1];
    apply(graph, selectTriangle(count - 1));
    expect(graph.selectedTriangle()).toBe(count - 1);
    expect(selected()).toContain(`P${String(Math.min(...corners) + 1)}`);
    expect(() => graph.run1(selectTriangle(count))).toThrow('select-triangle');
});

test('set-points, set-trace-step and select-triangle run in one synchronous sequence', () => {
    const {graph, frames} = setup();
    act(() => {
        graph.run1(trace('play'));
        graph.run1(setPoints([[0, 0], [4, 0], [4, 3], [0, 3], [2, 1]]));
        graph.run1(traceStep('end'));
        graph.run1(selectTriangle(2));
    });
    expect(graph.model.points).toHaveLength(5);
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([graph.run().length - 1, false, 0]);
    expect(graph.selectedTriangle()).toBe(2);
    expect(selected()).toBeTruthy();
});

test('select-triangle is refused by the triangulation, ear clipping, hull trace and base point-set graphs', () => {
    for (const other of [new TriangulationGraph(), new EarClippingGraph(), new HullTraceGraph(), new PointSetGraph()]) {
        expect(() => other.applyPointSetAction(selectTriangle(0))).toThrow(UnsupportedLessonActionError);
        expect(() => other.applyPointSetAction(selectTriangle(null))).toThrow(UnsupportedLessonActionError);
    }
});

test('15a operations on the Delaunay graph restart the trace from the new start, never leaving trace and drawing apart', () => {
    const {graph, frames} = setup();
    // flip-edge at a later step flips the shown triangulation and makes it the new start.
    apply(graph, traceStep('end'));
    expect(sortedTriples(graph)).toEqual(['0,1,3', '1,2,3']);
    apply(graph, {kind: 'point-set', operation: 'flip-edge', edge: [1, 3]});
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(sortedTriples(graph)).toEqual(['0,1,2', '0,2,3']);
    expect(graph.run().length).toBeGreaterThan(1);
    // select-edge selects without touching the trace or the triangulation.
    apply(graph, trace('next-step'), {kind: 'point-set', operation: 'select-edge', edge: [0, 2]});
    expect([graph.step, graph.selectedEdge() !== undefined]).toEqual([1, true]);
    // set-triangulation replaces the start, returns to step 0 and pauses.
    playOneTick(graph, frames);
    apply(graph, {kind: 'point-set', operation: 'set-triangulation', triangles: [[0, 1, 3], [1, 2, 3]]});
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    expect(sortedTriples(graph)).toEqual(['0,1,3', '1,2,3']);
    expect(graph.run().illegal(0)).toHaveLength(0);
    // An invalid list is refused and the scene is untouched.
    const before = graph.state;
    expect(() => graph.run1({kind: 'point-set', operation: 'set-triangulation', triangles: [[0, 1, 2]]})).toThrow('set-triangulation');
    expect(graph.state).toBe(before);
});
