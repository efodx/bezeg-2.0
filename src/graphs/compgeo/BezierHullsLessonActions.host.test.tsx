import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BEZIER_HULLS_STEP_INTERVAL_MS, BezierHullsGraph} from './BezierHullsGraph';
import {HullRobustnessGraph} from './HullRobustnessGraph';
import {HullTraceGraph} from './HullTraceGraph';
import {PointSetGraph} from './PointSetGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {LessonAction, LessonAnimationCommand, UnsupportedLessonActionError} from '../../learning/model';
import {BEZIER_HULLS_CROSSING, BEZIER_HULLS_SHIFTED} from '../../learning/content/compgeoGuidedLessons';
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

class Observed extends BezierHullsGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
const trace = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});
const traceStep = (step: number | 'end'): PointSetAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const setPoints = (points: ReadonlyArray<readonly [number, number]>): PointSetAction => ({kind: 'point-set', operation: 'set-points', mode: 'points', points});
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });
const part = (name: string) => document.querySelector(`[data-bezier-hulls="${name}"]`)?.textContent;

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
    act(() => { frames.frame(BEZIER_HULLS_STEP_INTERVAL_MS); });
};

test('the default scene is the crossing pair at step 0, stopped with nothing scheduled, and set-trace-step is supported', () => {
    const {graph, frames} = setup();
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.run().length]).toEqual([0, false, 0, 9]);
    for (const command of ['next-step', 'reset', 'play', 'pause', 'replay'] as const) expect(graph.supportsLessonAction(trace(command))).toBe(true);
    expect(graph.supportsLessonAction(traceStep('end'))).toBe(true);
    expect(graph.supportsLessonAction(traceStep(3))).toBe(true);
});

test('set-trace-step clamps a number like a stored Preset step, and end is the last step (step 8, 8 of 256)', () => {
    const {graph} = setup();
    const last = graph.run().length - 1;
    expect(last).toBe(8);
    const stepAfter = (step: number | 'end') => { apply(graph, traceStep(step)); return graph.step; };
    expect([stepAfter(5), stepAfter(999), stepAfter(-3), stepAfter(2.9), stepAfter(Number.MAX_SAFE_INTEGER)]).toEqual([5, last, 0, 2, last]);
    // The stored step is clamped too, not only the step getter.
    apply(graph, traceStep(999));
    expect(graph.state).toMatchObject({step: last});
    apply(graph, traceStep(-3));
    expect(graph.state).toMatchObject({step: 0});
    expect(stepAfter('end')).toBe(last);
    expect(graph.state).toMatchObject({step: last});
    expect(part('kept')).toBe('Ostane parov odsekov: 8 od 256');
    expect(part('tests')).toBe('Preizkušenih parov: 32, zavrženih: 24');
    expect(() => graph.run1(traceStep(Number.NaN))).toThrow('set-trace-step');
    expect(() => graph.run1(traceStep(Number.POSITIVE_INFINITY))).toThrow('set-trace-step');
    expect(() => graph.run1(traceStep('last' as 'end'))).toThrow('set-trace-step');
    expect(graph.step).toBe(last);
    expect(graph.state).toMatchObject({step: last});
});

test('set-trace-step end equals Next step pressed until done: step, state and readouts', () => {
    const {graph} = setup();
    for (let k = 0; k < 8; k++) apply(graph, trace('next-step'));
    const viaNext = {step: graph.step, state: graph.state, readout: part('readout'), playing: graph.isPlaying};
    apply(graph, trace('reset'));
    expect(graph.step).toBe(0);
    apply(graph, traceStep('end'));
    expect({step: graph.step, state: graph.state, readout: part('readout'), playing: graph.isPlaying}).toEqual(viaNext);
    expect(viaNext.step).toBe(8);
});

test('set-trace-step pauses a running playback, leaves no scheduler callback and keeps later Next steps working', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    expect(graph.step).toBeGreaterThan(0);
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

test('one synchronous sequence: set-points returns to step 0, then set-trace-step end reads the new pair (the doubled-grid twin shows 2 of 256)', () => {
    const {graph} = setup();
    act(() => {
        graph.run1(setPoints(BEZIER_HULLS_SHIFTED));
        graph.run1(traceStep('end'));
    });
    expect(graph.model.points.map(p => [p.x, p.y])).toEqual(BEZIER_HULLS_SHIFTED);
    expect(graph.model.gridStepExponent).toBe(0);
    expect(graph.step).toBe(graph.run().length - 1);
    expect(part('kept')).toBe('Ostane parov odsekov: 2 od 256');
    // The crossing pair after it: set-points returns to step 0 and the action after it sets the step.
    act(() => {
        graph.run1(traceStep('end'));
        graph.run1(setPoints(BEZIER_HULLS_CROSSING));
    });
    expect([graph.step, part('kept')]).toEqual([0, 'Ostane parov odsekov: 1 od 1']);
    act(() => { graph.run1(traceStep(2)); });
    expect([part('kept'), part('tests')]).toEqual(['Ostane parov odsekov: 2 od 4', 'Preizkušenih parov: 4, zavrženih: 2']);
});

test('the twin shows the same counts in English', () => {
    const {graph} = setup();
    act(() => { graph.run1(setPoints(BEZIER_HULLS_SHIFTED)); graph.run1(traceStep('end')); setLanguage('en'); });
    expect(part('kept')).toBe('Piece pairs that remain: 2 of 256');
});

test('set-trace-step is refused by the base point-set graph, the hull trace and the hull robustness graph', () => {
    for (const other of [new PointSetGraph(), new HullTraceGraph(), new HullRobustnessGraph()]) {
        expect(() => other.applyPointSetAction(traceStep(3))).toThrow(UnsupportedLessonActionError);
        expect(() => other.applyPointSetAction(traceStep('end'))).toThrow(UnsupportedLessonActionError);
    }
});
