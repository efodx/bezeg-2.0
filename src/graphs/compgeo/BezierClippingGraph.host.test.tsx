import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BezierClippingGraph, BEZIER_CLIPPING_STEP_INTERVAL_MS} from './BezierClippingGraph';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';
import {BEZIER_CLIPPING_PRESET_KEY} from './bezierClippingPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {clipBezierPair, ClipPoint} from '../../bezeg/impl/kernels/bezier-clipping';
import {LessonAction} from '../../learning/model';
import {PointSetModel} from '../../compgeo/pointSetModel';
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

class Observed extends BezierClippingGraph {
    liveBoard() { return this.board; }
    run1(action: LessonAction) { this.applyLessonAction(action); }
    boardOf(p: {x: number; y: number}) { return this.toBoard(p, this.model); }
    figureState(graphState: Record<string, unknown> | undefined) { return this.figurePresetGraphState(graphState as never) as unknown as {step: number; clipToleranceExponent: number}; }
}

interface Shown {
    elType: string; name?: string; dataX?: number[]; dataY?: number[]; visProp: Record<string, unknown>;
    X?(): number; Y?(): number; moveTo?(to: number[], t: number): void; triggerEventHandlers?(names: string[], args: unknown[]): void;
}
const objects = (graph: Observed) => graph.liveBoard().objectsList as unknown as Shown[];
const ofKind = (graph: Observed, pattern: RegExp) => objects(graph).filter(o => pattern.test(o.name ?? ''));
const OVERLAY_NAME = /^(fatLineBand|fatLineEdges|clipKept-[AB]|clipDiscarded-[AB])$/;
const overlayObjects = (graph: Observed) => ofKind(graph, OVERLAY_NAME);
/** The raw data of a drawn curve; a curve without data fails the check. */
const dataOf = (o: Shown): number[][] => {
    if (!o.dataX || !o.dataY || o.dataX.length === 0 || o.dataX.length !== o.dataY.length) throw new Error(`curve ${o.name} has no data`);
    return [o.dataX, o.dataY];
};
/** Number of polylines (split on NaN breaks) in a curve of data; the curve of one NaN point has none. */
const polylines = (o: Shown): number => {
    const [xs] = dataOf(o);
    const parts: number[][] = [[]];
    xs.forEach(x => { if (Number.isNaN(x)) parts.push([]); else parts[parts.length - 1].push(x); });
    return parts.filter(p => p.length > 0).length;
};
const one = (graph: Observed, name: string) => {
    const found = ofKind(graph, new RegExp(`^${name}$`));
    expect(found).toHaveLength(1);
    return found[0];
};

const mount = (graph: Observed) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const model = (points: Array<[number, number]>, gridStepExponent = 0): PointSetModel =>
    ({mode: 'points', closed: false, gridStepExponent, points: points.map(([x, y]) => ({x, y}))});
const A_NET: Array<[number, number]> = [[0, 0], [2, 4], [4, 0]];
const TANGENT = model([...A_NET, [0, 4], [2, 0], [4, 4]]);
const OFFSET_BOARD: Array<[number, number]> = [...A_NET, [0, 4.5], [2, 0.5], [4, 4.5]];
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const stepTo = (graph: Observed, target: number) => act(() => { while (graph.step < target) graph.nextStep(); });
const drag = (graph: Observed, name: string, to: [number, number]) => {
    const point = one(graph, name);
    act(() => { point.moveTo!(to, 0); point.triggerEventHandlers!(['drag'], []); });
};
function tick(frames: ReturnType<typeof manualScheduler>, ticks: number) {
    act(() => { frames.frame(0); });
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(BEZIER_CLIPPING_STEP_INTERVAL_MS); });
}
const tuples = (m: PointSetModel): ClipPoint[] => m.points.map(p => [p.x, p.y] as const);
const stepsAt = (m: PointSetModel, tolerance: number) => {
    const pts = tuples(m);
    return clipBezierPair(pts.slice(0, 3), pts.slice(3), {tolerance}).trace.length;
};
const presetState = (fields: object) => ({initialized: true, overlays: {control: true, hull: true, fatLine: true, kept: true, discarded: true}, ...fields});
const crossing = () => ({id: BEZIER_CLIPPING_PRESET_KEY, data: CURVE_PAIR_CROSSING});

/** A mounted graph on a manual scheduler. */
function setup() {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    const view = mount(graph);
    return {graph, frames, view};
}
/** Plays three ticks, so a running Play is observable. */
function playing() {
    const ctx = setup();
    act(() => { ctx.graph.play(); });
    tick(ctx.frames, 3);
    expect([ctx.graph.step, ctx.graph.isPlaying]).toEqual([3, true]);
    return ctx;
}
const stopped = (graph: Observed, frames: ReturnType<typeof manualScheduler>) => expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);

test('crossing pair at the default tolerance ends found with both roots 0.25 and 0.75 on both curves within tolerance', () => {
    const {graph} = setup();
    expect(graph.clipToleranceExponent).toBe(6);
    expect(graph.tolerance).toBe(1e-6);
    stepTo(graph, graph.run().length - 1);
    const state = graph.clipState;
    expect(state.status).toBe('found');
    expect(state.results).toHaveLength(2);
    const roots = [0.25, 0.75];
    state.results.forEach((result, i) => {
        for (const range of [result.aRange, result.bRange]) {
            expect(range[0] - 1e-6).toBeLessThanOrEqual(roots[i]);
            expect(range[1] + 1e-6).toBeGreaterThanOrEqual(roots[i]);
            expect(range[1] - range[0]).toBeLessThanOrEqual(1e-6);
        }
    });
});

test('the tangent pair needs at least three times the clips of the crossing, or ends at the limit', () => {
    const {graph} = setup();
    stepTo(graph, graph.run().length - 1);
    const crossingClips = graph.clipState.clipCount;
    expect(crossingClips).toBeGreaterThan(0);
    load(graph, TANGENT);
    stepTo(graph, graph.run().length - 1);
    const state = graph.clipState;
    expect(state.status === 'limit' || state.clipCount >= 3 * crossingClips).toBe(true);
});

test('the offset pair loaded by load-model (half grid steps) ends empty, its hulls overlap and its coordinates are exactly 4.5 and 0.5 board units', () => {
    const {graph} = setup();
    act(() => { graph.run1({kind: 'point-set', operation: 'load-model', points: OFFSET_BOARD, gridStepExponent: -1}); });
    expect(graph.model.gridStepExponent).toBe(-1);
    expect(graph.hullsApart).toBe(false);
    const boardYs = graph.model.points.map(p => graph.boardOf(p).y);
    expect([boardYs[3], boardYs[4], boardYs[5]]).toEqual([4.5, 0.5, 4.5]);
    expect(one(graph, 'B_0').Y!()).toBe(4.5);
    expect(one(graph, 'B_1').Y!()).toBe(0.5);
    stepTo(graph, graph.run().length - 1);
    expect(graph.clipState.status).toBe('empty');
    expect(graph.clipState.results).toHaveLength(0);
});

test('a tolerance change, a drag, an import and Reset each return to step 0 and stop a running Play', () => {
    let ctx = playing();
    act(() => { expect(ctx.graph.setClipTolerance(4)).toBe(true); });
    stopped(ctx.graph, ctx.frames);
    expect(ctx.graph.state).toMatchObject({step: 0, clipToleranceExponent: 4});
    ctx.view.unmount();

    ctx = playing();
    drag(ctx.graph, 'A_1', [2, 6]);
    stopped(ctx.graph, ctx.frames);
    expect(ctx.graph.model.points[1]).toEqual({x: 2, y: 6});
    ctx.view.unmount();

    ctx = playing();
    act(() => { ctx.graph.importPreset({...crossing(), graphState: presetState({})}); });
    stopped(ctx.graph, ctx.frames);
    ctx.view.unmount();

    ctx = playing();
    act(() => { ctx.graph.resetTrace(); });
    stopped(ctx.graph, ctx.frames);
    act(() => { ctx.graph.play(); });
    tick(ctx.frames, 2);
    expect(ctx.graph.step).toBe(2);
});

test('unmount during Play leaves no pending callback and a remount works', () => {
    const {graph, frames, view} = playing();
    expect(frames.callbacks.size).toBe(1);
    view.unmount();
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([false, 0]);
    expect(frames.frame(BEZIER_CLIPPING_STEP_INTERVAL_MS)).toBe(false);
    mount(graph);
    act(() => { graph.resetTrace(); });
    act(() => { graph.play(); });
    tick(frames, 2);
    expect([graph.step, graph.isPlaying]).toEqual([2, true]);
});

test('a Preset round trip keeps step and tolerance; a stale step clamps', async () => {
    const {graph} = setup();
    act(() => { graph.setClipTolerance(4); });
    stepTo(graph, 3);
    act(() => { graph.saveCurrentPreset('mine'); });
    act(() => { graph.setClipTolerance(8); });
    expect([graph.step, graph.clipToleranceExponent]).toEqual([0, 8]);
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = graph.selectPreset('mine'); });
    await act(async () => { await pending; });
    expect([graph.step, graph.clipToleranceExponent, graph.isPlaying]).toEqual([3, 4, false]);
    act(() => { graph.importPreset({...crossing(), graphState: presetState({step: 99999, clipToleranceExponent: 5})}); });
    expect(graph.clipToleranceExponent).toBe(5);
    expect(graph.step).toBe(graph.run().length - 1);
    expect(graph.run().length).toBe(stepsAt(CURVE_PAIR_CROSSING, 1e-5));
});

test('a Preset without a tolerance shows 6, even when the graph held another value', () => {
    const {graph} = setup();
    act(() => { graph.setClipTolerance(4); });
    act(() => { graph.importPreset({...crossing(), graphState: presetState({step: 2})}); });
    expect(graph.clipToleranceExponent).toBe(6);
    expect(graph.step).toBe(2);
    expect(graph.run().length).toBe(stepsAt(CURVE_PAIR_CROSSING, 1e-6));
    act(() => { graph.setClipTolerance(9); });
    act(() => { graph.importPreset(crossing()); });
    expect([graph.clipToleranceExponent, graph.step]).toEqual([6, 0]);
});

test('figure capture honours a stored tolerance, the default without one, and clamps a stale step to that run', () => {
    const {graph} = setup();
    act(() => { graph.setClipTolerance(9); });
    const lengths = [3, 10].map(k => stepsAt(CURVE_PAIR_CROSSING, 10 ** -k));
    expect(lengths[0]).not.toBe(lengths[1]);
    expect(graph.figureState({step: 99999, clipToleranceExponent: 3})).toMatchObject({clipToleranceExponent: 3, step: lengths[0] - 1});
    expect(graph.figureState({step: 99999, clipToleranceExponent: 10})).toMatchObject({clipToleranceExponent: 10, step: lengths[1] - 1});
    expect(graph.figureState({step: 99999})).toMatchObject({clipToleranceExponent: 6, step: stepsAt(CURVE_PAIR_CROSSING, 1e-6) - 1});
});

test('with kept, discarded or fatLine off none of that overlay is drawn; the other overlays stay', () => {
    const {graph} = setup();
    stepTo(graph, 3);
    expect(overlayObjects(graph)).toHaveLength(6);
    const groups: Array<['kept' | 'discarded' | 'fatLine', RegExp]> = [
        ['kept', /^clipKept-/], ['discarded', /^clipDiscarded-/], ['fatLine', /^fatLine/],
    ];
    for (const [id, pattern] of groups) {
        act(() => { graph.setOverlay(id, false); });
        expect(ofKind(graph, pattern)).toHaveLength(0);
        expect(overlayObjects(graph)).toHaveLength(4);
        act(() => { graph.setOverlay(id, true); });
        expect(overlayObjects(graph)).toHaveLength(6);
    }
});

test('the number of drawn overlay objects is fixed across the steps of a run, and a step with nothing discarded or alive still has its curves', () => {
    const {graph} = setup();
    const last = graph.run().length - 1;
    for (let step = 0; step <= last; step++) {
        stepTo(graph, step);
        expect(overlayObjects(graph).map(o => o.name).sort()).toEqual(
            ['clipDiscarded-A', 'clipDiscarded-B', 'clipKept-A', 'clipKept-B', 'fatLineBand', 'fatLineEdges']);
        for (const o of overlayObjects(graph)) expect(o.elType).toBe('curve');
    }
    expect(graph.step).toBe(last);
});

test('an empty set of ranges is a curve of one NaN point on the real board path (step 0 discards nothing; the offset pair ends with nothing alive)', () => {
    const {graph} = setup();
    // Step 0: everything is alive, nothing is discarded.
    for (const name of ['clipDiscarded-A', 'clipDiscarded-B']) {
        const o = one(graph, name);
        expect(o.elType).toBe('curve');
        const [xs, ys] = dataOf(o);
        expect([xs.length, ys.length]).toEqual([1, 1]);
        expect(Number.isNaN(xs[0]) && Number.isNaN(ys[0])).toBe(true);
        expect(polylines(o)).toBe(0);
    }
    expect(polylines(one(graph, 'clipKept-A'))).toBe(1);
    // A curve without data must fail the helper, so that a board dropping the data would not pass silently.
    expect(() => dataOf({elType: 'curve', visProp: {}, name: 'none'})).toThrow('no data');
    // End state with nothing alive: the offset pair is empty, so both kept curves are the curve of one NaN point.
    load(graph, model(OFFSET_BOARD.map(([x, y]) => [x * 2, y * 2] as [number, number]), -1));
    stepTo(graph, graph.run().length - 1);
    expect(graph.clipState.status).toBe('empty');
    for (const name of ['clipKept-A', 'clipKept-B']) {
        const o = one(graph, name);
        const [xs, ys] = dataOf(o);
        expect([xs.length, Number.isNaN(xs[0]), Number.isNaN(ys[0])]).toEqual([1, true, true]);
    }
    for (const name of ['clipDiscarded-A', 'clipDiscarded-B']) expect(polylines(one(graph, name))).toBe(1);
    expect(overlayObjects(graph)).toHaveLength(6);
});

test('memo: a step change keeps the trace identity, a tolerance change gives a new trace', () => {
    const {graph} = setup();
    const trace = graph.run();
    const state0 = graph.clipState;
    stepTo(graph, 2);
    expect(graph.run()).toBe(trace);
    expect(graph.clipState).not.toBe(state0);
    expect(graph.clipState).toBe(graph.clipState);
    act(() => { graph.setClipTolerance(5); });
    expect(graph.run()).not.toBe(trace);
    expect(graph.run()).toBe(graph.run());
    // The same tolerance is no change at all.
    const again = graph.run();
    act(() => { expect(graph.setClipTolerance(5)).toBe(false); });
    expect(graph.run()).toBe(again);
    act(() => { expect(graph.setClipTolerance(2)).toBe(false); expect(graph.setClipTolerance(11)).toBe(false); expect(graph.setClipTolerance(4.5)).toBe(false); });
    expect(graph.clipToleranceExponent).toBe(5);
});
