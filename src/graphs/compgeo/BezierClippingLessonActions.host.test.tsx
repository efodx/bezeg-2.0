import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BezierClippingGraph} from './BezierClippingGraph';
import {BezierHullsGraph} from './BezierHullsGraph';
import {HullRobustnessGraph} from './HullRobustnessGraph';
import {HullTraceGraph} from './HullTraceGraph';
import {PointSetGraph} from './PointSetGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {sceneActions} from '../../learning/runtime/lessonCatalog';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends BezierClippingGraph {
    run1(action: LessonAction) { this.applyLessonAction(action); }
    liveBoard() { return this.board; }
}

type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
const loadModel = (points: ReadonlyArray<readonly [number, number]>, gridStepExponent: number): PointSetAction =>
    ({kind: 'point-set', operation: 'load-model', points, gridStepExponent});
const setTolerance = (exponent: number): PointSetAction => ({kind: 'point-set', operation: 'set-clip-tolerance', exponent});
const traceStep = (step: number | 'end'): PointSetAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const overlay = (name: string, visible: boolean) => ({kind: 'point-set', operation: 'set-overlay', overlay: name, visible}) as unknown as PointSetAction;
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });

const OFFSET = [[0, 0], [2, 4], [4, 0], [0, 4.5], [2, 0.5], [4, 4.5]] as const;

function setup() {
    cleanup();
    const graph = new Observed();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}
const drawn = (graph: Observed, pattern: RegExp) =>
    (graph.liveBoard().objectsList as unknown as Array<{name?: string}>).filter(o => pattern.test(o.name ?? ''));

test('load-model replaces the pair on the given grid, returns to step 0 and pauses', () => {
    const graph = setup();
    act(() => { graph.nextStep(); graph.nextStep(); });
    expect(graph.step).toBe(2);
    apply(graph, loadModel(OFFSET, -1));
    expect(graph.model.gridStepExponent).toBe(-1);
    expect(graph.model.points[3]).toEqual({x: 0, y: 9});
    expect(graph.model.points.map(p => p.y)).toEqual([0, 8, 0, 9, 1, 9]);
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
});

test('load-model refuses an off-grid point, a bad exponent, a bad count and a bad shape', () => {
    const graph = setup();
    const before = graph.model;
    expect(() => graph.run1(loadModel([[0, 0], [2, 4], [4, 0], [0, 4.25], [2, 0.5], [4, 4.5]], -1))).toThrow('load-model');
    expect(() => graph.run1(loadModel(OFFSET, 99))).toThrow('load-model');
    expect(() => graph.run1(loadModel(OFFSET.slice(0, 5), -1))).toThrow();
    expect(() => graph.run1({kind: 'point-set', operation: 'load-model', points: 'x', gridStepExponent: 0} as unknown as PointSetAction)).toThrow('load-model');
    expect(graph.model).toBe(before);
});

test('set-clip-tolerance sets 10^-k, returns to step 0 and throws on an invalid exponent', () => {
    const graph = setup();
    act(() => { graph.nextStep(); graph.nextStep(); });
    apply(graph, setTolerance(3));
    expect([graph.clipToleranceExponent, graph.step, graph.tolerance]).toEqual([3, 0, 1e-3]);
    apply(graph, setTolerance(10));
    expect(graph.clipToleranceExponent).toBe(10);
    for (const bad of [2, 11, 4.5, Number.NaN, Number.POSITIVE_INFINITY, -6]) {
        expect(() => graph.run1(setTolerance(bad))).toThrow('set-clip-tolerance');
    }
    expect(() => graph.run1({kind: 'point-set', operation: 'set-clip-tolerance', exponent: '6'} as unknown as PointSetAction)).toThrow('set-clip-tolerance');
    expect(graph.clipToleranceExponent).toBe(10);
});

test('set-overlay accepts fatLine, kept and discarded, and still refuses an overlay of another graph', () => {
    const graph = setup();
    for (const [name, pattern] of [['fatLine', /^fatLine/], ['kept', /^clipKept-/], ['discarded', /^clipDiscarded-/]] as const) {
        apply(graph, overlay(name, false));
        expect(graph.overlayShown(name)).toBe(false);
        expect(drawn(graph, pattern)).toHaveLength(0);
        apply(graph, overlay(name, true));
        expect(drawn(graph, pattern).length).toBeGreaterThan(0);
    }
    expect(() => graph.run1(overlay('diagram', true))).toThrow(UnsupportedLessonActionError);
    expect(() => graph.run1(overlay('kept', 'yes' as unknown as boolean))).toThrow('visible');
});

test('set-trace-step is supported and clamps like a stored step; end is the last step', () => {
    const graph = setup();
    expect(graph.supportsLessonAction(traceStep(3))).toBe(true);
    expect(graph.supportsLessonAction(loadModel(OFFSET, -1))).toBe(true);
    expect(graph.supportsLessonAction(setTolerance(5))).toBe(true);
    apply(graph, traceStep(5));
    expect(graph.step).toBe(5);
    apply(graph, traceStep(99999));
    expect(graph.step).toBe(graph.run().length - 1);
    apply(graph, traceStep(0));
    apply(graph, traceStep('end'));
    expect(graph.step).toBe(graph.run().length - 1);
});

test('one synchronous sequence: load-model, set-clip-tolerance and set-trace-step end read each other\'s writes', () => {
    const graph = setup();
    act(() => {
        graph.run1(setTolerance(4));
        graph.run1(loadModel(OFFSET, -1));
        graph.run1(traceStep('end'));
    });
    expect(graph.clipToleranceExponent).toBe(4);
    expect(graph.model.gridStepExponent).toBe(-1);
    expect(graph.step).toBe(graph.run().length - 1);
    expect(graph.clipState.status).toBe('empty');
    // set-trace-step then a model change: the model returns to step 0, the tolerance is kept.
    act(() => {
        graph.run1(traceStep('end'));
        graph.run1(loadModel([[0, 0], [2, 4], [4, 0], [0, 3], [2, -1], [4, 3]], 0));
    });
    expect([graph.step, graph.clipToleranceExponent, graph.model.gridStepExponent]).toEqual([0, 4, 0]);
    // a tolerance change after a step returns to step 0 within the same tick
    act(() => {
        graph.run1(traceStep(3));
        graph.run1(setTolerance(7));
        graph.run1(traceStep(2));
    });
    expect([graph.step, graph.clipToleranceExponent]).toEqual([2, 7]);
});

test('every other point-set graph throws UnsupportedLessonActionError for load-model and set-clip-tolerance', () => {
    for (const other of [new PointSetGraph(), new HullTraceGraph(), new HullRobustnessGraph(), new BezierHullsGraph()]) {
        expect(() => other.applyPointSetAction(loadModel(OFFSET, -1))).toThrow(UnsupportedLessonActionError);
        expect(() => other.applyPointSetAction(setTolerance(6))).toThrow(UnsupportedLessonActionError);
    }
    for (const name of ['fatLine', 'kept', 'discarded']) {
        expect(() => new BezierHullsGraph().applyPointSetAction(overlay(name, true))).toThrow(UnsupportedLessonActionError);
    }
});

test('the catalog passes good new actions through unchanged and rejects malformed ones', () => {
    const scene = (actions: LessonAction[]): Parameters<typeof sceneActions>[0] =>
        ({id: 'bezier-clipping', basedOn: 'demonstration-default', actions, expectedState: {sl: 's', en: 'e'}});
    const good = [loadModel(OFFSET, -1), setTolerance(6), overlay('kept', false), overlay('fatLine', true), overlay('discarded', false), traceStep('end')];
    expect(sceneActions(scene(good)).slice(1)).toEqual(good);
    const bad: unknown[] = [
        {kind: 'point-set', operation: 'load-model', points: [[0, 0], [1]], gridStepExponent: 0},
        {kind: 'point-set', operation: 'load-model', points: [[0, 0], [1, Number.NaN]], gridStepExponent: 0},
        {kind: 'point-set', operation: 'load-model', points: 'x', gridStepExponent: 0},
        {kind: 'point-set', operation: 'load-model', points: [[0, 0]], gridStepExponent: 0.5},
        {kind: 'point-set', operation: 'load-model', points: [[0, 0]]},
        {kind: 'point-set', operation: 'set-clip-tolerance'},
        {kind: 'point-set', operation: 'set-clip-tolerance', exponent: Number.NaN},
        {kind: 'point-set', operation: 'set-clip-tolerance', exponent: '6'},
    ];
    for (const action of bad) expect(() => sceneActions(scene([action as LessonAction]))).toThrow();
});
