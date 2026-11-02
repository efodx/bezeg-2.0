import React from 'react';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BENTLEY_OTTMANN_STEP_INTERVAL_MS, BentleyOttmannGraph} from './BentleyOttmannGraph';
import {HullTraceGraph} from './HullTraceGraph';
import {PointSetGraph} from './PointSetGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {LessonAction, LessonAnimationCommand, UnsupportedLessonActionError} from '../../learning/model';
import {sceneActions} from '../../learning/runtime/lessonCatalog';
import {compgeoGuidedLessons} from '../../learning/content/compgeoGuidedLessons';
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

class Observed extends BentleyOttmannGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
const trace = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});
const traceStep = (step: number | 'end'): PointSetAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const setPoints = (mode: 'intervals' | 'segments', points: readonly (readonly [number, number])[]): PointSetAction => ({kind: 'point-set', operation: 'set-points', mode, points});
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });
const part = (name: string) => document.querySelector(`[data-bentley-ottmann="${name}"]`)?.textContent;
const status = () => ['step', 'tests', 'summary', 'crossings'].map(part);
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
    act(() => { frames.frame(BENTLEY_OTTMANN_STEP_INTERVAL_MS); });
};
const snapshot = (graph: Observed) => ({step: graph.step, state: graph.state, shown: status(), playing: graph.isPlaying});


const order = (graph: Observed) => graph.run().view(graph.step).status.map(k => `s${k + 1}`);

test('the default scene is Example 1 at step 0, stopped with nothing scheduled, and the trace actions are supported', () => {
    const {graph, frames} = setup();
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.run().length]).toEqual([0, false, 0, 47]);
    for (const command of ['next-step', 'reset', 'play', 'pause', 'replay'] as const) expect(graph.supportsLessonAction(trace(command))).toBe(true);
    expect(graph.supportsLessonAction(traceStep('end'))).toBe(true);
});

test('set-trace-step clamps a number like a stored Preset step, and end is the last step', () => {
    const {graph} = setup();
    const last = graph.run().length - 1;
    const stepAfter = (step: number | 'end') => { apply(graph, traceStep(step)); return graph.step; };
    expect([stepAfter(5), stepAfter(999), stepAfter(-3), stepAfter(2.9), stepAfter(Number.MAX_SAFE_INTEGER)]).toEqual([5, last, 0, 2, last]);
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

test('set-trace-step end equals Next step pressed until done: step, readouts and board', () => {
    const viaNext = setup();
    const last = viaNext.graph.run().length - 1;
    for (let k = 0; k < last && viaNext.graph.step < last; k++) apply(viaNext.graph, trace('next-step'));
    expect(viaNext.graph.step).toBe(last);
    const fromNext = snapshot(viaNext.graph);
    const board = viaNext.graph['board'].objectsList.length;

    const viaEnd = setup();
    apply(viaEnd.graph, traceStep('end'));
    expect(snapshot(viaEnd.graph)).toEqual(fromNext);
    expect(viaEnd.graph['board'].objectsList.length).toBe(board);
    expect(fromNext.step).toBe(46);
    expect(fromNext.shown[2]).toBe('Obdelanih dogodkov: 13; presečišč: 5; preizkusov sosednjih daljic: 9; vseh parov: 6.');
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
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([46, false, 0]);
    apply(graph, trace('play'));
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([false, 0]);
});

test('the next-step action repeated k times equals the Next button repeated k times', () => {
    const viaAction = setup();
    for (let k = 0; k < 9; k++) apply(viaAction.graph, trace('next-step'));
    const fromAction = snapshot(viaAction.graph);

    const viaButton = setup();
    for (let k = 0; k < 9; k++) click('next-step');
    expect(snapshot(viaButton.graph)).toEqual(fromAction);
    expect(fromAction.step).toBe(9);
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

test('an edit action pauses playback and returns to step 0', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    apply(graph, traceStep(7));
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, setPoints('segments', [[0, 0], [4, 4], [0, 4], [4, 0]]));
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

test('set-points with segments is accepted by the segment sweep, intervals are refused; the hull trace refuses segments', () => {
    const {graph} = setup();
    const sample: readonly (readonly [number, number])[] = [[0, 0], [4, 4], [0, 4], [4, 0]];
    apply(graph, setPoints('segments', sample));
    expect(graph.model).toMatchObject({mode: 'segments', points: [{x: 0, y: 0}, {x: 4, y: 4}, {x: 0, y: 4}, {x: 4, y: 0}]});
    expect(() => graph.run1(setPoints('intervals', [[0, 1], [3, 1]]))).toThrow(UnsupportedLessonActionError);
    expect(() => graph.run1(setPoints('segments', [[0, 0], [4, 4], [1, 1]]))).toThrow();
    expect(graph.model.points).toHaveLength(4);
    expect(() => new HullTraceGraph().applyPointSetAction(setPoints('segments', sample))).toThrow(UnsupportedLessonActionError);
    expect(() => new PointSetGraph().applyPointSetAction(setPoints('segments', sample))).toThrow(UnsupportedLessonActionError);
});

// ---- The lesson scenes ----------------------------------------------------------------------------------------------

const lesson = () => compgeoGuidedLessons.find(entry => entry.demonstrationId === 'segment-intersections')!;
const STEPS = ['segint-segments', 'segint-predict', 'segint-insert', 'segint-neighbours', 'segint-swap', 'segint-summary', 'segint-explore'];

const TESTS = (done: number, all: number) => `Preizkusov sosednjih daljic doslej: ${done}; preizkus vseh parov bi jih imel ${all}.`;
const SUMMARY_DEFAULT = 'Obdelanih dogodkov: 13; presečišč: 5; preizkusov sosednjih daljic: 9; vseh parov: 6.';
/** The readout lines each scene must show (step, tests, summary, crossings) and the status order left to right. */
const EXPECTED: Record<string, {readonly shown: readonly (string | undefined)[]; readonly order: readonly string[]}> = {
    'segint-segments': {shown: ['Korak 1 od 47', TESTS(0, 6), undefined, 'Presečišč še ni.'], order: []},
    'segint-predict': {shown: ['Korak 1 od 47', TESTS(0, 6), undefined, 'Presečišč še ni.'], order: []},
    'segint-insert': {shown: ['Korak 12 od 47', TESTS(2, 6), undefined, 'Presečišč še ni.'], order: ['s2', 's3', 's4', 's1']},
    'segint-neighbours': {shown: ['Korak 10 od 47', TESTS(2, 6), undefined, 'Presečišč še ni.'], order: ['s2', 's3', 's4']},
    'segint-swap': {shown: ['Korak 17 od 47', TESTS(3, 6), undefined, 'Presečišča doslej (1)'], order: ['s3', 's2', 's4', 's1']},
    'segint-summary': {shown: ['Korak 47 od 47', TESTS(9, 6), SUMMARY_DEFAULT, 'Presečišča doslej (5)'], order: []},
    'segint-explore': {shown: ['Korak 16 od 25', TESTS(3, 6), undefined, 'Presečišča doslej (1)'], order: ['s1', 's4', 's2', 's3']},
};
const readouts = () => ['step', 'tests', 'summary', 'crossings'].map(part).map(value => value ?? undefined);

test('the seven scenes run in one synchronous sequence, show the readouts the text quotes, frame their segments and never play', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    expect(lesson().steps.map(step => step.id)).toEqual(STEPS);
    for (const stepId of STEPS) {
        const scene = lesson().steps.find(step => step.id === stepId)!.scene!;
        act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(scene)) capabilities.apply(action);
        });
        expect(readouts(), stepId).toEqual(EXPECTED[stepId].shown);
        expect(order(graph), stepId).toEqual(EXPECTED[stepId].order);
        expect([graph.isPlaying, frames.callbacks.size], stepId).toEqual([false, 0]);
        // Every board point of the scene lies inside the lesson view [left, top, right, bottom].
        if (scene.basedOn !== 'demonstration-default' || !scene.view) throw new Error('every scene frames its segments');
        const view = scene.view;
        for (const p of graph.model.points) {
            expect(p.x, stepId).toBeGreaterThanOrEqual(view[0]);
            expect(p.x, stepId).toBeLessThanOrEqual(view[2]);
            expect(p.y, stepId).toBeLessThanOrEqual(view[1]);
            expect(p.y, stepId).toBeGreaterThanOrEqual(view[3]);
        }
    }
});

test('the default example shows the 13 events, the five crossings with their exact rationals and 9 tests against 6 pairs, as the text says', () => {
    const {graph} = setup();
    const scene = lesson().steps.find(step => step.id === 'segint-summary')!.scene!;
    expect(scene.basedOn === 'demonstration-default' ? scene.view : undefined).toEqual([-1, 6, 7, -2]);
    act(() => { for (const action of sceneActions(scene)) graph.getLessonCapabilities().apply(action); });
    const run = graph.run();
    expect([run.eventCount, run.pairTotal, run.points.length]).toEqual([13, 6, 5]);
    const crossings = [...document.querySelectorAll('[data-bentley-ottmann="crossing"]')].map(item => item.textContent);
    expect(crossings).toEqual([
        's2, s3 v točki (33/20 = 1,65; 29/10 = 2,9)',
        's1, s4 v točki (87/20 = 4,35; 29/10 = 2,9)',
        's1, s2 v točki (3; 2)',
        's1, s3 v točki (21/16 = 1,3125; 7/8 = 0,875)',
        's2, s4 v točki (75/16 = 4,6875; 7/8 = 0,875)',
    ]);
});

test('the degenerate example reports the point (2,2) once with all four segments, in one swap', () => {
    const {graph} = setup();
    const scene = lesson().steps.find(step => step.id === 'segint-explore')!.scene!;
    expect(scene.basedOn === 'demonstration-default' ? scene.view : undefined).toEqual([-1, 5, 5, -1]);
    act(() => { for (const action of sceneActions(scene)) graph.getLessonCapabilities().apply(action); });
    expect(graph.run().length).toBe(25);
    const crossings = [...document.querySelectorAll('[data-bentley-ottmann="crossing"]')].map(item => item.textContent);
    expect(crossings).toEqual(['s1, s2, s3, s4 v točki (2; 2)']);
    apply(graph, traceStep('end'));
    expect(readouts()[2]).toBe('Obdelanih dogodkov: 9; presečišč: 1; preizkusov sosednjih daljic: 3; vseh parov: 6.');
});
