import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {HULL_TRACE_SAMPLE_1, HULL_TRACE_STEP_INTERVAL_MS, HullTraceGraph} from './HullTraceGraph';
import {HULL_TRACE_PRESET_KEY} from './hullTracePresetCollection';
import {HULL_ALGORITHMS, HullAlgorithm} from './hullTraceRun';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
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

class Observed extends HullTraceGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; dataX?: number[]; dataY?: number[]};
const sceneObjects = (graph: Observed) => (graph.liveBoard().objectsList as Shown[]).filter(o =>
    o.elType === 'curve' || o.elType === 'polygon' || (o.elType === 'point' && /^P\d+$/.test(o.name ?? '')));
const countOf = (graph: Observed, elType: string) => sceneObjects(graph).filter(o => o.elType === elType).length;
/** The drawn trace as data: every overlay curve's coordinates, in creation order. */
const drawnCurves = (graph: Observed) => sceneObjects(graph).filter(o => o.elType === 'curve').map(o => [o.dataX, o.dataY]);

const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const part = (name: string) => document.querySelector(`[data-hull-trace="${name}"]`)?.textContent;
const status = () => ['step', 'note', 'detail', 'count'].map(part);
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const model = (points: Array<[number, number]>): PointSetModel => ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
/** Plays `ticks` playback steps: the first frame starts the clock, each later one is a full interval. */
function tick(frames: ReturnType<typeof manualScheduler>, ticks: number) {
    act(() => { frames.frame(0); });
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(HULL_TRACE_STEP_INTERVAL_MS); });
}
/** A saved scene state with hull fields; spreading a plain object keeps them out of the base state's excess-property check. */
const saveState = (fields: object) => ({initialized: true, ...fields});
const hullOf = (graph: Observed, algorithm: HullAlgorithm) => {
    act(() => { graph.setAlgorithm(algorithm); });
    for (let i = 0; i < graph.run().length; i++) if (!graph.run().view(graph.step).done) click('next-step');
    return graph.run().view(graph.step).hull;
};

test('the default scene is sample 1 with the monotone chain at step 0, and the overlays are shown', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(HULL_TRACE_SAMPLE_1);
    expect(graph.algorithm).toBe('monotone-chain');
    expect(graph.step).toBe(0);
    expect(graph.isPlaying).toBe(false);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(countOf(graph, 'point')).toBe(9);
});

test('Next step repeated k times and Play advanced k ticks give the same drawn state and status; Play stops at done', () => {
    const k = 12;
    const byNext = new Observed();
    const first = mount(byNext);
    for (let i = 0; i < k; i++) click('next-step');
    const nextSnapshot = {step: byNext.step, status: status(), curves: drawnCurves(byNext), objects: sceneObjects(byNext).length};
    first.unmount();

    const frames = manualScheduler();
    const byPlay = new Observed({}, frames.scheduler);
    mount(byPlay);
    click('play-pause');
    expect(byPlay.isPlaying).toBe(true);
    expect(button('play-pause').textContent).toBe('Premor');
    tick(frames, k);
    expect(byPlay.isPlaying).toBe(true);
    expect({step: byPlay.step, status: status(), curves: drawnCurves(byPlay), objects: sceneObjects(byPlay).length}).toEqual(nextSnapshot);
    expect(nextSnapshot.step).toBe(k);
    expect(nextSnapshot.curves.length).toBeGreaterThan(0);

    // Play runs to done and stops there; nothing stays scheduled
    for (let ran = true, i = 0; ran && i < byPlay.run().length + 5; i++) act(() => { ran = frames.frame(HULL_TRACE_STEP_INTERVAL_MS); });
    expect(byPlay.step).toBe(byPlay.run().length - 1);
    expect(byPlay.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(button('play-pause').textContent).toBe('Predvajaj');
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
    expect(byPlay.run().view(byPlay.step).done).toBe(true);

    // Reset returns to step 0
    click('reset');
    expect(byPlay.step).toBe(0);
    expect(part('step')).toBe(`Korak 1 od ${byPlay.run().length}`);
    expect(byPlay.isPlaying).toBe(false);
});

test('an edit while playing recomputes the trace, returns to step 0 and pauses; so does an algorithm switch', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    click('play-pause');
    tick(frames, 5);
    expect(graph.step).toBe(5);
    load(graph, model([[0, 0], [4, 0], [2, 3], [2, 1]]));
    expect(graph.step).toBe(0);
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.run().totalPredicates).toBeGreaterThan(0);
    expect(countOf(graph, 'point')).toBe(4);

    // a dragged point and an added point are edits too
    click('next-step');
    click('next-step');
    click('play-pause');
    act(() => { graph.movePointTo(3, {x: 3, y: 1}); });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    click('play-pause');
    act(() => { graph.addPointAt({x: 5, y: 5}); });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);

    // the algorithm switch, through the real select
    click('play-pause');
    tick(frames, 3);
    expect(graph.step).toBe(3);
    fireEvent.change(screen.getByRole('combobox', {name: 'Algoritem'}), {target: {value: 'gift-wrapping'}});
    expect(graph.algorithm).toBe('gift-wrapping');
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    // after the pause Play works again
    click('play-pause');
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('a scene change and unmount pause playback and leave nothing scheduled or drawn', async () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    const view = mount(graph);
    const initialObjects = sceneObjects(graph).length;
    act(() => { graph.saveCurrentPreset('mine'); });
    click('play-pause');
    tick(frames, 4);
    expect(graph.isPlaying).toBe(true);
    await settle(() => graph.selectPreset('mine'));
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.step).toBe(0);
    click('next-step');
    click('next-step');
    const stepped = sceneObjects(graph).length;
    click('reset');
    expect(sceneObjects(graph).length).toBe(initialObjects);
    expect(stepped).toBeGreaterThanOrEqual(initialObjects);

    click('play-pause');
    tick(frames, 3);
    expect(frames.callbacks.size).toBe(1);
    view.unmount();
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(HULL_TRACE_STEP_INTERVAL_MS)).toBe(false);
});

test('a StrictMode remount gets a working controller and draws the scene once', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph, true);
    expect(countOf(graph, 'point')).toBe(9);
    click('play-pause');
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('the algorithm, points and step index survive a Preset round trip; an out-of-range index is clamped', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setAlgorithm('gift-wrapping'); });
    click('next-step');
    click('next-step');
    click('next-step');
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(HULL_TRACE_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({algorithm: 'gift-wrapping', step: 3});
    expect(saved.graphState).not.toHaveProperty('playing');
    load(graph, model([[0, 0], [1, 1]]));
    expect(graph.step).toBe(0);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.algorithm, graph.step, graph.model]).toEqual(['gift-wrapping', 3, HULL_TRACE_SAMPLE_1]);
    expect(graph.isPlaying).toBe(false);

    act(() => { graph.importPreset({id: HULL_TRACE_PRESET_KEY, graphState: saveState({algorithm: 'slow-edge-test', step: 999999}), data: HULL_TRACE_SAMPLE_1}); });
    expect(graph.algorithm).toBe('slow-edge-test');
    expect(graph.step).toBe(graph.run().length - 1);
    expect(graph.exportPreset().graphState).toMatchObject({step: graph.run().length - 1});
    act(() => { graph.importPreset({id: HULL_TRACE_PRESET_KEY, graphState: saveState({algorithm: 'monotone-chain', step: -4}), data: model([[0, 0], [1, 0], [0, 1]])}); });
    expect([graph.algorithm, graph.step]).toEqual(['monotone-chain', 0]);
});

test('the Preset collection rejects an invalid algorithm or step with an actionable message and accepts the saved fields', () => {
    const collection = new Observed().presetCollection();
    const checkState = (graphState: unknown) => collection.checkGraphState?.(graphState);
    expect(checkState({initialized: true, overlays: {trace: true, hull: false}, algorithm: 'gift-wrapping', step: 7})).toBeUndefined();
    expect(checkState({initialized: true, algorithm: 'bubble-sort'})?.key).toBe('hulltrace_invalid_algorithm');
    expect(checkState({initialized: true, algorithm: 7})?.key).toBe('hulltrace_invalid_algorithm');
    expect(checkState({initialized: true, step: 'first'})?.key).toBe('hulltrace_invalid_step');
    expect(checkState({initialized: true, speed: 2})?.key).toBe('invalid_value');
    expect(checkState({initialized: true, overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
    expect('data' in collection.check(HULL_TRACE_SAMPLE_1)).toBe(true);
    expect(collection.key).toBe('compgeo-hull-trace');
    setLanguage('en');
    expect(checkState({algorithm: 'x'})?.key).toBe('hulltrace_invalid_algorithm');
});

test('sample 1: the first pop of the monotone chain shows value -2 at (2, 0); the final hull and the counts are right for all three', () => {
    const graph = new Observed();
    mount(graph);
    let guard = 0;
    while (part('note') !== 'Srednjo točko odstranimo z verige.' && guard++ < 200) click('next-step');
    // the pop is preceded by the test with value -2 for the candidate (2, 0), which is point P8
    click('reset');
    guard = 0;
    while (!(part('detail') ?? '').includes('−2') && guard++ < 200) click('next-step');
    expect(part('detail')).toBe('Orientacija trojice = −2; preizkušana točka P8 (2, 0)');
    expect(part('note')).toBe('Zavoj v desno: srednja točka ni na ovojnici in jo odstranimo.');
    expect(part('count')).toMatch(/^Orientacijskih preizkusov doslej: \d+$/);

    const expectedHull = [5, 2, 1, 3, 4]; // (-1,3), (0,0), (4,0), (5,3), (2,5) as input indices
    for (const algorithm of HULL_ALGORITHMS) {
        expect(hullOf(graph, algorithm)).toEqual(expectedHull);
        expect(countOf(graph, 'polygon')).toBe(1);
        expect(part('note')).toBe('Konec: konveksna ovojnica je izrisana.');
    }
    const rows = [...document.querySelectorAll('[data-hull-trace="totals"] li')].map(li => li.textContent);
    expect(rows).toEqual([
        'Monotona veriga (Andrew): 23',
        'Počasen preizkus robov (učni algoritem): 504',
        'Ovijanje (Jarvisov algoritem): 35',
    ]);
});

test('the slow test is labelled a teaching algorithm with its cost; the English catalog is used after a language switch', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setAlgorithm('slow-edge-test'); });
    expect(screen.getByText(/Učni algoritem: vsak urejen par točk/)).toBeInTheDocument();
    act(() => { setLanguage('en'); });
    expect(screen.getByText(/A teaching algorithm: it tests every ordered pair/)).toBeInTheDocument();
    expect(button('next-step').textContent).toBe('Next step');
    expect(part('step')).toBe(`Step 1 of ${graph.run().length}`);
});

test('fewer than three points and collinear points show a point or segment hull with the trace message, not an error', () => {
    const graph = new Observed();
    mount(graph);
    for (const algorithm of HULL_ALGORITHMS) {
        act(() => { graph.setAlgorithm(algorithm); });
        load(graph, model([[1, 1]]));
        expect(hullOf(graph, algorithm)).toEqual([0]);
        expect(part('note')).toBe('Konec: manj kot tri različne točke, ovojnica je točka ali daljica.');
        expect(countOf(graph, 'polygon')).toBe(0);
        load(graph, model([[0, 0], [3, 0]]));
        expect(hullOf(graph, algorithm)).toHaveLength(2);
        expect(countOf(graph, 'curve')).toBeGreaterThan(0);
        load(graph, model([[0, 0], [1, 1], [2, 2], [3, 3]]));
        expect(hullOf(graph, algorithm)).toEqual([0, 3]);
        expect(part('note')).toBe('Konec: vse točke so na isti premici, ovojnica je daljica.');
        load(graph, model([]));
        expect(graph.run().view(graph.step)).toBeDefined();
    }
});
