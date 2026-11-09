import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {EPICYCLE_CIRCLE_SEGMENTS, EPICYCLE_PERIOD_MS, EpicycleGraph} from './EpicycleGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {LessonAction} from '../../learning/model';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {
    analyzeEpicycle, defaultEpicycleModel, EPICYCLE_TRACE_SAMPLES, epicycleExample, EpicycleModel, epicycleTerms, maxTraceError,
} from '../../analysis/epicycleModel';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => setLanguage('sl'));

type Curve = { elType?: string; dataX?: number[]; dataY?: number[] };

/** The frame driver of the tests: a frame runs only when a test says how much time passed. */
class ManualScheduler implements AnimationScheduler {
    private next = 1;
    private readonly callbacks = new Map<number, FrameRequestCallback>();
    now = 0;

    request(callback: FrameRequestCallback): number {
        const handle = this.next++;
        this.callbacks.set(handle, callback);
        return handle;
    }

    cancel(handle: number): void {
        this.callbacks.delete(handle);
    }

    get pending(): number {
        return this.callbacks.size;
    }

    advance(ms: number): void {
        this.now += ms;
        const frame = [...this.callbacks.values()];
        this.callbacks.clear();
        frame.forEach(callback => callback(this.now));
    }
}

/** A real graph through the real host and a real JSXGraph board (jsdom). */
/** A board point with the event trigger JSXGraph's typings leave out. */
type Handle = JXG.Point & { triggerEventHandlers(names: string[], args: unknown[]): void };

class ObservedEpicycleGraph extends EpicycleGraph {
    lesson(action: LessonAction) {
        this.applyLessonAction(action);
    }

    modelNow() {
        return this.model;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }

    boardNow() {
        return this.board;
    }

    exitLesson() {
        this.stopLessonAnimations();
    }

    /** The board curves in creation order: control polygon, loop, circles, chain, trace. */
    curves(): Curve[] {
        return (this.board.objectsList as unknown as Curve[]).filter(object => object.elType === 'curve');
    }

    analysis() {
        return this.analysisOf(this.model);
    }

    trace() {
        return this.traceOf(this.model);
    }

    vertexPoint(i: number) {
        return (this as unknown as { vertexHandles: Handle[] }).vertexHandles[i];
    }

    controlPoint(i: number, which: 1 | 2) {
        return (this as unknown as { controlHandles: Handle[] }).controlHandles[2 * i + which - 1];
    }

    visibleHandles(): number {
        const handles = this as unknown as { vertexHandles: JXG.Point[]; controlHandles: JXG.Point[] };
        return [...handles.vertexHandles, ...handles.controlHandles].filter(point => point.visPropCalc.visible).length;
    }
}

const mount = (scheduler = new ManualScheduler()) => {
    const graph = new ObservedEpicycleGraph({scheduler});
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return {graph, scheduler, view};
};

const act1 = (graph: ObservedEpicycleGraph, ...actions: LessonAction[]) => act(() => { actions.forEach(action => graph.lesson(action)); });
const setN = (N: number): LessonAction => ({kind: 'function-parameter', name: 'epicycle-n', value: N});
const example = (value: string): LessonAction => ({kind: 'function-choice', name: 'epicycle-example', value});
const param = (value: string): LessonAction => ({kind: 'function-choice', name: 'epicycle-parametrization', value});
const status = () => document.querySelector('.epicycle-status')?.textContent;
const refusal = () => document.querySelector('[data-refusal-notice]')?.textContent ?? '';
const rows = () => document.querySelectorAll('[data-testid="epicycle-table"] tbody tr');
const cell = (k: number) => document.querySelector(`[data-testid="epicycle-table"] tr[data-k="${k}"] td`)?.textContent;
const vertexField = (i: number, axis: 'x' | 'y') => screen.getByLabelText(new RegExp(`^Krajišče ${i + 1}, koordinata ${axis}$`)) as HTMLInputElement;
const controlField = (i: number, which: 1 | 2, axis: 'x' | 'y') => screen.getByLabelText(new RegExp(`^Kontrolna točka ${i + 1}\\.${which}, koordinata ${axis}$`)) as HTMLInputElement;
const PLAY_LABEL = 'Predvajaj';
const playButton = () => screen.getByTestId('epicycle-play');
/** Drags a handle as the board does: the position changes, then the drag handlers run. */
const drag = (point: Handle, x: number, y: number) => act(() => {
    point.moveTo([x, y]);
    point.triggerEventHandlers(['drag'], []);
});

test('the default model mounts without console errors: a fixed object set, equal axis units about +-3,2, a full trace at t = 0', () => {
    const errors = vi.spyOn(console, 'error');
    const {graph, scheduler} = mount();
    expect(graph.modelNow()).toEqual(defaultEpicycleModel());
    const board = graph.boardNow();
    expect(board.unitX).toBeCloseTo(board.unitY, 9);
    const [left, top, right, bottom] = board.getBoundingBox();
    expect(Math.max(Math.abs(left), Math.abs(right), Math.abs(top), Math.abs(bottom))).toBeGreaterThan(3.1);
    expect(Math.max(Math.abs(left), Math.abs(right), Math.abs(top), Math.abs(bottom))).toBeLessThan(5);
    const [polygon, loop, circles, chain, trace] = graph.curves();
    expect(graph.curves()).toHaveLength(5);
    expect(trace.dataX).toHaveLength(EPICYCLE_TRACE_SAMPLES + 1);
    expect(loop.dataX).toHaveLength(EPICYCLE_TRACE_SAMPLES + 1);
    expect(chain.dataX).toHaveLength(1 + 1 + 2 * 5);
    expect(circles.dataX).toHaveLength(2 * 5 * (EPICYCLE_CIRCLE_SEGMENTS + 1) + (2 * 5 - 1));
    expect(polygon.dataX!.filter(Number.isNaN)).toHaveLength(3);
    expect(graph.visibleHandles()).toBe(4 + 8);
    expect(graph.state.initialized).toBe(true);
    expect(playButton().textContent).toBe(PLAY_LABEL);
    expect(scheduler.pending).toBe(0);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(errors.mock.calls.filter(call => !String(call[0]).includes('ReactDOMTestUtils.act'))).toEqual([]);
    errors.mockRestore();
});

test('the status and the table come from the model: N, the terms, the largest term and the sampled trace error', () => {
    const {graph} = mount();
    const model = graph.modelNow();
    const analysis = analyzeEpicycle(model);
    expect(rows()).toHaveLength(2 * model.N + 1);
    const {terms} = epicycleTerms(analysis, model.N);
    expect(document.querySelector('[data-testid="epicycle-table"] tbody tr:nth-child(2)')?.getAttribute('data-k')).toBe(String(terms[0].k));
    expect(cell(1)).toBe('1,0001');
    expect(status()).toContain(`N = ${model.N}`);
    expect(status()).toContain(`členov: ${2 * model.N + 1}`);
    const error = maxTraceError(analysis, model.N);
    expect(status()).toContain(String(Number(error.toFixed(5))).replace('.', ','));
    // the visible lines carry no live role; one hidden LiveReadout announces them
    expect(document.querySelector('.epicycle-status')?.getAttribute('aria-live')).toBeNull();
    expect(document.querySelectorAll('[data-readout-live]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-epicycle-status]').length).toBeGreaterThan(0);
});

test('the object count is the same at N = 1 and N = 50, and at N = 50 the table has 101 rows and the cap is said', () => {
    const {graph} = mount();
    act1(graph, setN(1));
    const atOne = graph.ownedObjects();
    expect(rows()).toHaveLength(3);
    expect(screen.queryByTestId('epicycle-n-cap')).toBeNull();
    act1(graph, setN(50));
    expect(graph.ownedObjects()).toBe(atOne);
    expect(rows()).toHaveLength(101);
    expect(screen.getByTestId('epicycle-n-cap').textContent).toContain('50');
    act1(graph, setN(49));
    expect(screen.queryByTestId('epicycle-n-cap')).toBeNull();
    // N stays one Slider (0..50 is too long to step): the -1/+1 buttons are gone
    expect(screen.queryByLabelText('Povečaj N za 1')).toBeNull();
    expect(screen.queryByLabelText('Zmanjšaj N za 1')).toBeNull();
});

test('everything the graph made is disposed on unmount, and a pending frame is cancelled', () => {
    const {graph, scheduler, view} = mount();
    act1(graph, example('uneven'));
    const board = graph.boardNow();
    const all = board.objectsList as unknown as Array<{ id: string; elType?: string }>;
    const owned = all.filter(object => object.elType === 'curve' || object.elType === 'point');
    // 5 curves, the pool of 8 + 16 handles, and the 4 defining points of the board's two axes (observed: 2 per axis, removed with the board).
    expect(owned.length).toBe(5 + 24 + 4);
    expect(Object.keys(board.objects).length).toBe(board.objectsList.length);
    act(() => { fireEvent.click(playButton()); });
    expect(scheduler.pending).toBe(1);
    view.unmount();
    expect(scheduler.pending).toBe(0);
    // freeBoard empties the id map (objectsList keeps stale references).
    expect(owned.some(object => board.objects[object.id])).toBe(false);
    expect(Object.keys(board.objects)).toHaveLength(0);
});

test('visible handle labels count from 1 while lesson action names stay 0-based', () => {
    const {graph} = mount();
    expect(() => vertexField(0, 'x')).not.toThrow();
    expect(screen.queryByLabelText(/^Krajišče 0, /)).toBeNull();
    expect(vertexField(0, 'x').value).toBe(String(graph.modelNow().vertices[0].x).replace('.', ','));
    act1(graph, {kind: 'function-parameter', name: 'epicycle-vertex-0-x', value: 0.5});
    expect(vertexField(0, 'x').value).toBe('0,5');
});

test('a keyboard step on a vertex and on a control changes the model, the table and the status', () => {
    const {graph} = mount();
    const beforeStatus = status();
    const beforeCell = cell(1);
    act(() => { fireEvent.keyDown(vertexField(0, 'x'), {key: 'ArrowUp'}); });
    expect(graph.modelNow().vertices[0].x).toBeCloseTo(1.05, 12);
    expect(graph.vertexPoint(0).X()).toBeCloseTo(1.05, 12);
    // The adjacent controls moved with it.
    const span0 = graph.modelNow().spans[0];
    expect(span0.kind === 'cubic' && span0.c1.x).toBeCloseTo(epicycleExample('circle').spans[0].kind === 'cubic' ? (epicycleExample('circle').spans[0] as { c1: { x: number } }).c1.x + 0.05 : 0, 12);
    expect(status()).not.toBe(beforeStatus);
    expect(cell(1)).not.toBe(beforeCell);
    const afterVertexStatus = status();
    act(() => { fireEvent.keyDown(controlField(1, 2, 'y'), {key: 'ArrowDown', shiftKey: true}); });
    const span1 = graph.modelNow().spans[1];
    const original = epicycleExample('circle').spans[1];
    // The shared field snaps a Shift step to the 0,05 grid (the circle's c2.y = 0,5523 minus 0,5 lands on 0,05).
    expect(original.kind === 'cubic' && original.c2.y).toBeCloseTo(0.5523, 3);
    expect(span1.kind === 'cubic' && span1.c2.y).toBeCloseTo(0.05, 12);
    expect(graph.controlPoint(1, 2).Y()).toBeCloseTo(0.05, 12);
    expect(status()).not.toBe(afterVertexStatus);
    const {terms} = epicycleTerms(analyzeEpicycle(graph.modelNow()), graph.modelNow().N);
    expect(cell(terms[0].k)).toBeDefined();
});

test('a drag snaps to 0,05 and changes the model; a rejected drag returns the handle and shows the reason', () => {
    const {graph} = mount();
    act1(graph, example('uneven'));
    drag(graph.vertexPoint(0), -1.9631, -1.0212);
    expect(graph.modelNow().vertices[0]).toEqual({x: -1.95, y: -1});
    const before = graph.modelNow();
    // Vertex 3 is (1, 2): its previous second control (0,55; 2,15) would leave the range at y = 3 (3,15).
    drag(graph.vertexPoint(3), 1, 3);
    expect(graph.modelNow()).toBe(before);
    expect(graph.vertexPoint(3).X()).toBe(1);
    expect(graph.vertexPoint(3).Y()).toBe(2);
    expect(refusal()).toMatch(/^Premik ni mogoč.*med -3 in 3/);
    drag(graph.controlPoint(0, 1), -2.1, -0.6);
    expect(graph.modelNow()).not.toBe(before);
    expect(refusal()).toBe('');
    // A control on a line arc does not exist: the diamond has none.
    act1(graph, example('diamond'));
    expect(graph.visibleHandles()).toBe(4);
});

test('the trace is whole at t = 0 and stopped, and the part up to t otherwise', () => {
    const {graph} = mount();
    act1(graph, {kind: 'function-parameter', name: 'epicycle-time', value: Math.PI});
    const part = graph.curves()[4];
    expect(part.dataX!.length).toBe(EPICYCLE_TRACE_SAMPLES / 2 + 2);
    const tip = graph.curves()[3];
    expect(part.dataX![part.dataX!.length - 1]).toBeCloseTo(tip.dataX![tip.dataX!.length - 1], 12);
    act1(graph, {kind: 'function-parameter', name: 'epicycle-time', value: 0});
    expect(graph.curves()[4].dataX).toHaveLength(EPICYCLE_TRACE_SAMPLES + 1);
    expect(() => act1(graph, {kind: 'function-parameter', name: 'epicycle-time', value: 2 * Math.PI})).toThrow();
});

test('playback is stopped by default, follows frame timestamps, and recomputes only the chain and the trace slice per step', () => {
    const {graph, scheduler} = mount();
    const analysis = graph.analysis();
    const trace = graph.trace();
    expect(graph.time).toBe(0);
    act(() => { fireEvent.click(playButton()); });
    expect(graph.playing).toBe(true);
    expect(scheduler.pending).toBe(1);
    act(() => scheduler.advance(16)); // the first frame only sets the baseline
    expect(graph.time).toBe(0);
    act(() => scheduler.advance(EPICYCLE_PERIOD_MS / 4));
    expect(graph.time).toBeCloseTo(Math.PI / 2, 9);
    // The same elapsed time in more frames gives the same time (timestamps, not frame counts).
    act(() => { for (let i = 0; i < 5; i++) scheduler.advance(EPICYCLE_PERIOD_MS / 20); });
    expect(graph.time).toBeCloseTo(Math.PI, 9);
    expect(graph.analysis()).toBe(analysis);
    expect(graph.trace()).toBe(trace);
    expect(graph.curves()[4].dataX!.length).toBeLessThan(EPICYCLE_TRACE_SAMPLES);
    act(() => scheduler.advance(EPICYCLE_PERIOD_MS * 0.6));
    expect(graph.time).toBeLessThan(Math.PI);
    act(() => { fireEvent.click(playButton()); });
    expect(graph.playing).toBe(false);
    expect(scheduler.pending).toBe(0);
    // N changes the trace but not the analysis; an edit of the loop changes the analysis.
    act1(graph, setN(7));
    expect(graph.analysis()).toBe(analysis);
    expect(graph.trace()).not.toBe(trace);
    act1(graph, {kind: 'function-parameter', name: 'epicycle-vertex-0-x', value: 1.1});
    expect(graph.analysis()).not.toBe(analysis);
});

test('playback pauses on a drag, N, an example, the parametrization, an import, a lesson exit and unmount, with no frame left pending', () => {
    const { graph, scheduler, view } = mount();
    const playing = () => {
        if (!graph.playing) act(() => { fireEvent.click(playButton()); });
        expect(graph.playing).toBe(true);
        expect(scheduler.pending).toBe(1);
    };
    const stopped = () => {
        expect(graph.playing).toBe(false);
        expect(scheduler.pending).toBe(0);
        expect(playButton().textContent).toBe(PLAY_LABEL);
    };
    playing();
    drag(graph.vertexPoint(0), 1.2, 0);
    stopped();
    playing();
    act1(graph, setN(9));
    stopped();
    playing();
    act1(graph, param('chord'));
    stopped();
    playing();
    act(() => scheduler.advance(16));
    act(() => scheduler.advance(2500));
    expect(graph.time).toBeGreaterThan(0);
    act1(graph, example('diamond'));
    stopped();
    expect(graph.time).toBe(0);
    expect(graph.curves()[4].dataX).toHaveLength(EPICYCLE_TRACE_SAMPLES + 1);
    playing();
    act(() => scheduler.advance(16));
    act(() => scheduler.advance(2500));
    act(() => { graph.importPreset({id: 'stored', data: JSON.parse(JSON.stringify(epicycleExample('uneven')))}); });
    stopped();
    expect(graph.time).toBe(0);
    playing();
    act(() => { graph.exitLesson(); });
    stopped();
    playing();
    view.unmount();
    expect(scheduler.pending).toBe(0);
});

test('a Preset keeps the loop, N and the parametrization, leaves the object count, and shows t = 0', () => {
    const {graph} = mount();
    const baseline = graph.ownedObjects();
    act1(graph, example('uneven'), param('chord'), setN(12), {kind: 'function-parameter', name: 'epicycle-control-2-1-x', value: -0.1});
    const stored = JSON.parse(JSON.stringify(graph.exportPresetData())) as EpicycleModel;
    expect(stored.parametrization).toBe('chord');
    expect(stored.N).toBe(12);
    act(() => { graph.importPreset({id: 'default', data: defaultEpicycleModel()}); });
    expect(graph.modelNow()).toEqual(defaultEpicycleModel());
    act(() => { graph.importPreset({id: 'stored', data: stored}); });
    expect(graph.modelNow()).toEqual(stored);
    expect(graph.modelNow()).toMatchObject({N: 12, parametrization: 'chord'});
    expect(vertexField(2, 'x').value).toBe(String(stored.vertices[2].x).replace('.', ',').replace('-', '−'));
    expect(graph.vertexPoint(2).X()).toBe(stored.vertices[2].x);
    expect(graph.ownedObjects()).toBe(baseline);
    expect(graph.time).toBe(0);
});

test('a malformed Preset is rejected with the rule and what to correct; the scene state is checked by the same rules', () => {
    const {graph} = mount();
    const collection = graph.presetCollection();
    const text = (data: unknown) => {
        const checked = collection.check(data);
        expect('rejection' in checked).toBe(true);
        return 'rejection' in checked ? renderMessage(checked.rejection) : '';
    };
    const model = defaultEpicycleModel();
    expect(collection.check(model)).toEqual({data: model});
    expect(text({...model, N: 51})).toMatch(/med 0 in 50.*Popravi vrednost v datoteki\.$/);
    expect(text({...model, vertices: model.vertices.slice(0, 3), spans: model.spans.slice(0, 3)})).toMatch(/med 4 in 8 krajišč.*Popravi vrednost v datoteki\.$/);
    expect(text({...model, vertices: [{x: 4, y: 0}, ...model.vertices.slice(1)]})).toMatch(/med -3 in 3\..*Popravi vrednost v datoteki\.$/);
    expect(text({...model, parametrization: 'arc'})).toContain('equal, chord');
    expect(text('nonsense')).toContain('neveljavni podatki');
    expect(collection.checkGraphState?.({...model, N: 3})).toBeUndefined();
    expect(collection.checkGraphState?.({N: 99})).toBeDefined();
    expect(graph.modelNow()).toEqual(model);
});

test('both languages: a live language switch keeps the scene, the model and the handles', () => {
    const {graph} = mount();
    act1(graph, example('uneven'), setN(8));
    const model = graph.modelNow();
    const objects = graph.ownedObjects();
    act(() => { setLanguage('en'); });
    expect(graph.modelNow()).toBe(model);
    expect(graph.ownedObjects()).toBe(objects);
    expect(screen.getByLabelText('End point 1, coordinate x')).toBeInTheDocument();
    expect(status()).toMatch(/^N = 8; terms: 17; largest rotating term/);
    expect(status()).toMatch(/\d\.\d+\.$/);
    expect(graph.visibleHandles()).toBe(6 + 12);
    act(() => { setLanguage('sl'); });
    expect(status()).toMatch(/\d,\d+\.$/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

test('a multi-action lesson scene runs in one synchronous tick and reads back from the state', () => {
    const {graph} = mount();
    act(() => {
        for (const action of [
            example('uneven'), param('chord'), setN(11),
            {kind: 'function-parameter', name: 'epicycle-vertex-2-x', value: -0.95},
            {kind: 'function-parameter', name: 'epicycle-vertex-2-y', value: 1.4},
            {kind: 'function-parameter', name: 'epicycle-control-1-1-y', value: 0.5},
            {kind: 'function-parameter', name: 'epicycle-time', value: 1.5},
        ] as LessonAction[]) graph.lesson(action);
    });
    const model = graph.modelNow();
    expect(model).toMatchObject({N: 11, parametrization: 'chord'});
    expect(model.vertices[2]).toEqual({x: -0.95, y: 1.4});
    const span1 = model.spans[1];
    expect(span1.kind === 'cubic' && span1.c1.y).toBe(0.5);
    expect(graph.time).toBe(1.5);
    expect(rows()).toHaveLength(23);
    expect(graph.vertexPoint(2).Y()).toBe(1.4);
    expect(() => act1(graph, {kind: 'function-parameter', name: 'epicycle-n', value: 51})).toThrow();
});

test('the chord fallback is a visible hint, and the hint goes with the cause', () => {
    const {graph} = mount();
    act1(graph, example('diamond'), param('chord'));
    expect(screen.queryByTestId('epicycle-chord-fallback')).toBeNull();
    act1(graph,
        {kind: 'function-parameter', name: 'epicycle-vertex-1-x', value: 1},
        {kind: 'function-parameter', name: 'epicycle-vertex-1-y', value: 0});
    expect(graph.analysis().fellBack).toBe(true);
    expect(screen.getByTestId('epicycle-chord-fallback').textContent).toContain('enakomerna');
    act1(graph, param('equal'));
    expect(screen.queryByTestId('epicycle-chord-fallback')).toBeNull();
});

test('the whole loop and the whole trace are drawn closed: the first sample is appended, the cached samples are not changed', () => {
    const {graph} = mount();
    const [, loop, , , trace] = graph.curves();
    for (const curve of [loop, trace]) {
        expect(curve.dataX).toHaveLength(EPICYCLE_TRACE_SAMPLES + 1);
        expect(curve.dataX![EPICYCLE_TRACE_SAMPLES]).toBe(curve.dataX![0]);
        expect(curve.dataY![EPICYCLE_TRACE_SAMPLES]).toBe(curve.dataY![0]);
    }
    expect(graph.trace().x).toHaveLength(EPICYCLE_TRACE_SAMPLES);
    act1(graph, {kind: 'function-parameter', name: 'epicycle-time', value: 1});
    expect(graph.curves()[4].dataX!.length).toBeLessThan(EPICYCLE_TRACE_SAMPLES);
});

const shifted = (dx: number, dy: number): EpicycleModel => {
    const model = defaultEpicycleModel();
    const move = (p: { x: number; y: number }) => ({x: p.x + dx, y: p.y + dy});
    return {...model, vertices: model.vertices.map(move), spans: model.spans.map(span => (span.kind === 'cubic' ? {...span, c1: move(span.c1), c2: move(span.c2)} : span))};
};

test('the largest rotating term ignores k = 0, also for a loop centred away from the origin', () => {
    const {graph} = mount();
    act(() => { graph.importPreset({id: 'off', data: shifted(2, 0)}); });
    const {centre, terms} = epicycleTerms(analyzeEpicycle(graph.modelNow()), graph.modelNow().N);
    const largest = terms.reduce((best, term) => (term.modulus > best.modulus ? term : best));
    expect(centre).toBeGreaterThan(largest.modulus);
    expect(largest.k).not.toBe(0);
    expect(status()).toContain(`k = ${largest.k},`);
    expect(status()).not.toContain('k = 0,');
});

test('at N = 0 the status says there are no rotating terms and names no k = 0 term', () => {
    const {graph} = mount();
    act1(graph, setN(0));
    expect(rows()).toHaveLength(1);
    expect(status()).toContain('N = 0');
    expect(status()).toContain('brez vrtečih se členov');
    expect(status()).not.toMatch(/k = 0/);
});

test('Reset while playing stops, returns to t = 0, cancels the frame and clears a rejection', async () => {
    const {graph, scheduler} = mount();
    act1(graph, {kind: 'function-parameter', name: 'epicycle-time', value: 2});
    act(() => { fireEvent.click(playButton()); });
    act(() => scheduler.advance(16));
    act(() => scheduler.advance(500));
    expect(graph.playing).toBe(true);
    await settle(() => graph.reset());
    expect(graph.playing).toBe(false);
    expect(graph.time).toBe(0);
    expect(scheduler.pending).toBe(0);
    expect(playButton().textContent).toBe(PLAY_LABEL);
    drag(graph.vertexPoint(0), 9, 9);
    expect(refusal()).not.toBe('');
    await settle(() => graph.reset());
    expect(refusal()).toBe('');
});

test('a lesson checkpoint restore while playing stops, takes the saved time, cancels the frame and clears a rejection', () => {
    const {graph, scheduler} = mount();
    const capabilities = graph.getLessonCapabilities();
    act1(graph, {kind: 'function-parameter', name: 'epicycle-time', value: 2});
    const checkpoint = capabilities.captureState();
    act1(graph, {kind: 'function-parameter', name: 'epicycle-time', value: 4});
    act(() => { fireEvent.click(playButton()); });
    expect(graph.playing).toBe(true);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(graph.playing).toBe(false);
    expect(graph.time).toBe(2);
    expect(scheduler.pending).toBe(0);
    expect(playButton().textContent).toBe(PLAY_LABEL);
    drag(graph.vertexPoint(0), 9, 9);
    expect(refusal()).not.toBe('');
    act(() => { capabilities.restoreState(checkpoint); });
    expect(refusal()).toBe('');
    expect(graph.time).toBe(2);
});
