import {stepWhile} from './boundedSteps.testing';
import React from 'react';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {HULL_TRACE_SAMPLE_1, HULL_TRACE_STEP_INTERVAL_MS, HullTraceGraph} from './HullTraceGraph';
import {HULL_ALGORITHMS, HullAlgorithm} from './hullTraceRun';
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

class Observed extends HullTraceGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

const trace = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});
const setAlgorithm = (algorithm: HullAlgorithm): LessonAction => ({kind: 'point-set', operation: 'set-algorithm', algorithm});
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });
const part = (name: string) => document.querySelector(`[data-hull-trace="${name}"]`)?.textContent;
const status = () => ['step', 'note', 'detail', 'count'].map(part);
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
const toEnd = (graph: Observed) => { stepWhile(() => graph.step < graph.run().length - 1, () => apply(graph, trace('next-step'))); };
/** Starts Play and runs one full tick. */
const playOneTick = (graph: Observed, frames: ReturnType<typeof manualScheduler>) => {
    apply(graph, trace('play'));
    act(() => { frames.frame(0); });
    act(() => { frames.frame(HULL_TRACE_STEP_INTERVAL_MS); });
};

test('sample 1 is the default scene; lesson mode starts stopped with nothing scheduled and the actions are supported', () => {
    const {graph, frames} = setup();
    expect(graph.model).toEqual(HULL_TRACE_SAMPLE_1);
    expect([graph.algorithm, graph.step, graph.isPlaying, frames.callbacks.size]).toEqual(['monotone-chain', 0, false, 0]);
    for (const command of ['next-step', 'reset', 'play', 'pause'] as const) expect(graph.supportsLessonAction(trace(command))).toBe(true);
    expect(graph.supportsLessonAction(setAlgorithm('gift-wrapping'))).toBe(true);
});

test('slow edge test on sample 1: 5 accepted directed edges and 504 orientation tests', () => {
    const {graph} = setup();
    apply(graph, setAlgorithm('slow-edge-test'));
    toEnd(graph);
    const view = graph.run().view(graph.step);
    expect(view.accepted).toHaveLength(5);
    expect(view.accepted.every(path => path.length === 2)).toBe(true);
    expect(graph.run().event(graph.step)?.predicateCount).toBe(504);
    expect(part('count')).toContain('504');
});

test('monotone chain Next steps reach the pop at (2, 0) with value -2 and the collinear rejection at (2, 5) with value 0', () => {
    const {graph} = setup();
    const stepsUntil = (matches: () => boolean) => {
        let guard = 0;
        while (!matches() && guard++ < 100) apply(graph, trace('next-step'));
        expect(guard).toBeLessThan(100);
    };
    stepsUntil(() => (part('detail') ?? '').includes('−2'));
    expect(part('detail')).toBe('Orientacija trojice = −2; preizkušana točka P8 (2, 0)');
    expect(part('note')).toBe('Zavoj v desno: srednja točka ni na ovojnici in jo odstranimo.');
    const popAt = graph.step;
    apply(graph, trace('next-step'));
    expect([graph.step, graph.run().event(graph.step)?.note]).toEqual([popAt + 1, 'reject-pop']);
    stepsUntil(() => (part('detail') ?? '').includes('= 0;'));
    expect(part('detail')).toBe('Orientacija trojice = 0; preizkušana točka P5 (2, 5)');
    expect(graph.run().event(graph.step)?.note).toBe('test-collinear');
    apply(graph, trace('next-step'));
    expect(graph.run().event(graph.step)?.note).toBe('reject-pop');
});

test('gift wrapping on sample 1: 5 wraps and 35 orientation tests', () => {
    const {graph} = setup();
    apply(graph, setAlgorithm('gift-wrapping'));
    let wraps = 0;
    for (let i = 0; i < graph.run().length; i++) if (graph.run().event(i)?.kind === 'accept') wraps++;
    expect(wraps).toBe(5);
    toEnd(graph);
    expect(graph.run().event(graph.step)?.predicateCount).toBe(35);
    expect(part('count')).toContain('35');
});

test('all three algorithms end on the 5-vertex hull of sample 1', () => {
    const {graph} = setup();
    for (const algorithm of HULL_ALGORITHMS) {
        apply(graph, setAlgorithm(algorithm));
        toEnd(graph);
        expect(graph.run().view(graph.step).hull).toEqual([5, 2, 1, 3, 4]);
        expect(part('note')).toBe('Konec: konveksna ovojnica je izrisana.');
    }
});

test('the next-step action repeated k times equals the Next button repeated k times, for every algorithm', () => {
    for (const algorithm of HULL_ALGORITHMS) {
        const viaAction = setup();
        apply(viaAction.graph, setAlgorithm(algorithm));
        for (let k = 0; k < 9; k++) apply(viaAction.graph, trace('next-step'));
        const fromAction = {step: viaAction.graph.step, state: viaAction.graph.state, shown: status(), playing: viaAction.graph.isPlaying};

        const viaButton = setup();
        act(() => { viaButton.graph.setAlgorithm(algorithm); });
        for (let k = 0; k < 9; k++) click('next-step');
        expect({step: viaButton.graph.step, state: viaButton.graph.state, shown: status(), playing: viaButton.graph.isPlaying}).toEqual(fromAction);
        expect(fromAction.step).toBe(9);
    }
});

test('set-algorithm switches, returns to step 0 and pauses a running playback', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    expect(graph.step).toBeGreaterThan(0);
    apply(graph, setAlgorithm('gift-wrapping'));
    expect([graph.algorithm, graph.step, graph.isPlaying, frames.callbacks.size]).toEqual(['gift-wrapping', 0, false, 0]);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
});

test('pause and reset act like their buttons; set-points pauses and resets', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    apply(graph, trace('pause'));
    expect([graph.isPlaying, graph.step > 0, frames.callbacks.size]).toEqual([false, true, 0]);
    apply(graph, trace('reset'));
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, {kind: 'point-set', operation: 'set-points', mode: 'points', points: [[0, 0], [4, 0], [2, 3], [2, 1]]});
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.model.points.length]).toEqual([0, false, 0, 4]);
});

test('Back (stopping the lesson animations) and unmount pause playback and leave no scheduler callback', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    const stoppedAt = graph.step;
    act(() => { graph.getLessonCapabilities().stopAnimations?.(); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, stoppedAt]);
    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { graph.unmount(); });
    expect(frames.callbacks.size).toBe(0);
});

test('set-algorithm is refused with a bad algorithm, and by a point-set graph that is not the hull trace', () => {
    const {graph} = setup();
    expect(() => graph.run1(setAlgorithm('nope' as HullAlgorithm))).toThrow('set-algorithm');
    expect(() => new PointSetGraph().applyPointSetAction({kind: 'point-set', operation: 'set-algorithm', algorithm: 'gift-wrapping'})).toThrow(UnsupportedLessonActionError);
    expect(new PointSetGraph().supportsLessonAction(trace('next-step'))).toBe(false);
});
