import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {RecursionCobwebGraph, SPEED_DEFAULT} from './RecursionCobwebGraph';
import {GrowthGraph} from './GrowthGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    private handle = 0;
    request(callback: FrameRequestCallback) { this.callback = callback; return ++this.handle; }
    cancel() { this.callback = undefined; }
    pending() { return this.callback !== undefined; }
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

class ObservedGraph extends RecursionCobwebGraph {
    clock = new FakeClock();
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return false; }
}

const mount = (): ObservedGraph => {
    const graph = new ObservedGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
type MapAction = Extract<LessonAction, {kind: 'recursion'; operation: 'set-map'}>;
type ParamsAction = Extract<LessonAction, {kind: 'recursion'; operation: 'set-params'}>;
const apply = (graph: {getLessonCapabilities(): {apply(action: LessonAction): void}}, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMap = (fields: Omit<MapAction, 'kind' | 'operation'>): LessonAction => ({kind: 'recursion', operation: 'set-map', ...fields});
const setParams = (fields: Omit<ParamsAction, 'kind' | 'operation'>): LessonAction => ({kind: 'recursion', operation: 'set-params', ...fields});
const setStart = (X: number): LessonAction => ({kind: 'recursion', operation: 'set-start', X});
const setStep = (step: number): LessonAction => ({kind: 'recursion', operation: 'set-step', step});
/** The typed field of a control: a slider's exact field is named "<label>, vrednost" and shares the label with its range input. */
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const chooseMap = (map: string) => act(() => { fireEvent.change(field(t('recursion_graph_map_label')), {target: {value: map}}); });
const nextStep = (times: number) => { for (let i = 0; i < times; i++) act(() => { fireEvent.click(screen.getByRole('button', {name: t('next_step')})); }); };
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-recursion-status]')?.textContent;
const counter = () => document.querySelector('[data-step-counter]')?.textContent;
const stateOf = (graph: RecursionCobwebGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
const snapshot = (graph: RecursionCobwebGraph) => ({state: stateOf(graph), readouts: readouts(), status: status(), counter: counter()});

/** The state, the readouts, the status and the counter after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: ObservedGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = snapshot(graph);
    cleanup();
    return result;
}

test('set-map equals the map chooser, the start falling back as the chooser does', () => {
    const cosine = after(graph => apply(graph, setMap({map: 'cosine'})));
    expect(cosine).toEqual(after(() => chooseMap('cosine')));
    expect(cosine.state).toEqual(expect.objectContaining({map: 'cosine'}));

    const logistic = after(graph => apply(graph, setMap({map: 'logistic'})));
    expect(logistic).toEqual(after(() => chooseMap('logistic')));
    expect(logistic.state).toEqual(expect.objectContaining({map: 'logistic', X: 10}));

    const fallback = after(graph => { apply(graph, setStart(460)); apply(graph, setMap({map: 'cosine'})); });
    expect(fallback).toEqual(after(() => { type(t('recursion_graph_x_label'), '4,6'); chooseMap('cosine'); }));
    expect(fallback.state).toEqual(expect.objectContaining({map: 'cosine', X: 0}));
    expect(after(graph => apply(graph, setMap({}))).state).toEqual(after(() => undefined).state);
});

test('set-params equals typing m, c and r', () => {
    const affine = after(graph => apply(graph, setParams({M: -16, C: 90})));
    expect(affine).toEqual(after(() => {
        type(t('recursion_graph_m_label'), '-0,8');
        type(t('recursion_graph_c_label'), '9');
    }));
    expect(affine.state).toEqual(expect.objectContaining({M: -16, C: 90}));

    const logistic = after(graph => { apply(graph, setMap({map: 'logistic'})); apply(graph, setParams({R: 29})); });
    expect(logistic).toEqual(after(() => { chooseMap('logistic'); type(t('recursion_graph_r_label'), '2,9'); }));
    expect(logistic.state).toEqual(expect.objectContaining({map: 'logistic', R: 29}));
});

test('set-start equals typing x0 and set-step equals the Next step button', () => {
    const start = after(graph => apply(graph, setStart(-250)));
    expect(start).toEqual(after(() => type(t('recursion_graph_x_label'), '-2,5')));
    expect(start.state).toEqual(expect.objectContaining({X: -250}));

    const stepped = after(graph => apply(graph, setStep(4)));
    expect(stepped).toEqual(after(() => nextStep(4)));
    expect(stepped.state).toEqual(expect.objectContaining({step: 4}));
    expect(after(graph => { apply(graph, setStep(11)); apply(graph, setStep(0)); }).state).toEqual(after(() => undefined).state);
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setParams({M: -24, C: 100}));
        capabilities.apply(setStart(460));
        capabilities.apply(setStep(11));
        capabilities.apply(setMap({map: 'cosine'}));
        capabilities.apply(setStart(0));
        capabilities.apply(setStep(8));
    });
    expect(graph.state).toEqual(expect.objectContaining({map: 'cosine', M: -24, C: 100, X: 0, step: 8}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = snapshot(graph);
    cleanup();
    expect(after(() => {
        type(t('recursion_graph_m_label'), '-1,2');
        type(t('recursion_graph_c_label'), '10');
        type(t('recursion_graph_x_label'), '4,6');
        chooseMap('cosine');
        type(t('recursion_graph_x_label'), '0');
        nextStep(8);
    })).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMap({map: 'logistic'}));
    apply(graph, setParams({R: 25}));
    apply(graph, setStep(12));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('a valid action pauses a playing iteration and never starts one', () => {
    const graph = mount();
    apply(graph, setStep(2));
    expect(graph.isPlaying()).toBe(false);
    expect(graph.clock.pending()).toBe(false);
    act(() => { graph.play(); });
    expect(graph.isPlaying()).toBe(true);
    graph.clock.tick(0);
    graph.clock.tick(SPEED_DEFAULT);
    expect(graph.state.step).toBeGreaterThan(2);
    apply(graph, setStep(5));
    expect(graph.isPlaying()).toBe(false);
    expect(graph.state.step).toBe(5);
    graph.clock.tick(3 * SPEED_DEFAULT);
    expect(graph.state.step).toBe(5);
    act(() => { graph.play(); });
    apply(graph, setParams({M: 10}));
    expect(graph.isPlaying()).toBe(false);
});

test('the graphs support their actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMap({map: 'cosine'}))).toBe(true);
    expect(graph.supportsLessonAction(setParams({M: 1}))).toBe(true);
    expect(graph.supportsLessonAction(setStart(0))).toBe(true);
    expect(graph.supportsLessonAction(setStep(1))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setParams({M: -16, C: 90}));
    apply(graph, setStep(3));
    const before = snapshot(graph);
    const raw = (value: string) => JSON.parse(value) as never;
    const bad: [LessonAction, RegExp][] = [
        [setParams({M: 61}), /^recursion set-params: M is outside/], [setParams({M: -61}), /^recursion set-params: M is outside/],
        [setParams({M: 1.5}), /^recursion set-params: M must be a whole number/], [setParams({C: 101}), /^recursion set-params: C is outside/],
        [setParams({C: 0.5}), /^recursion set-params: C must be a whole number/],
        [setParams({R: 30}), /^recursion set-params: R is outside/], [setParams({R: 4}), /^recursion set-params: R is outside/],
        [setParams({M: Number.NaN}), /^recursion set-params: M must be a finite number/], [setParams({C: raw('"2"')}), /^recursion set-params: C must be a finite number/],
        [setParams({M: 20, R: 30}), /^recursion set-params: R is outside/], // one bad field refuses the whole action: M stays -16
        [setStart(1001), /^recursion set-start: X is outside/], [setStart(-1001), /^recursion set-start: X is outside/], [setStart(0.5), /^recursion set-start: X must be a whole number/],
        [setStart(Number.POSITIVE_INFINITY), /^recursion set-start: X must be a finite number/],
        [setStep(61), /^recursion set-step: step is outside/], [setStep(-1), /^recursion set-step: step is outside/], [setStep(2.5), /^recursion set-step: step must be a whole number/],
        [setMap({map: raw('"hyperbolic"')}), /^recursion set-map: map must be one of/],
        // growth-graph fields and operations
        [setMap({panel: 'interest'}), /^recursion set-map: panel belongs to the growth graph\.$/], [setMap({sequence: 'geometric'}), /^recursion set-map: sequence belongs to the growth graph\.$/],
        [setParams({a1: 1}), /^recursion set-params: a1 belongs to the growth graph\.$/], [setParams({d: 1, q: 5, n: 3}), /^recursion set-params: d, q, n belongs to the growth graph\.$/],
        [{kind: 'recursion', operation: 'set-interest', capital: 5}, /^recursion set-interest: this operation belongs to the growth graph\.$/],
        // unknown fields
        [{kind: 'recursion', operation: 'set-start', x: 1} as unknown as LessonAction, /^recursion set-start: no such field x\.$/],
        [{kind: 'recursion', operation: 'set-start', X: 5, step: 2} as unknown as LessonAction, /^recursion set-start: no such field step\.$/],
        [{kind: 'recursion', operation: 'set-params', X: 5} as unknown as LessonAction, /^recursion set-params: no such field X\.$/],
        [{kind: 'recursion', operation: 'set-map', M: 5} as unknown as LessonAction, /^recursion set-map: no such field M\.$/],
        [{kind: 'recursion', operation: 'set-step', n: 5} as unknown as LessonAction, /^recursion set-step: /],
    ];
    for (const [action, message] of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(message);
        expect(snapshot(graph), label).toEqual(before);
    }
});

test('the growth graph refuses the cobweb fields and operations, with the same message shape', () => {
    const growth = new GrowthGraph();
    render(<MemoryRouter><GraphHost create={() => growth}/></MemoryRouter>);
    const before = {state: JSON.parse(JSON.stringify(growth.state)) as unknown, readouts: readouts(), status: status()};
    const bad: [LessonAction, RegExp][] = [
        [setMap({map: 'cosine'}), /^recursion set-map: map belongs to the cobweb graph\.$/],
        [setParams({M: 10}), /^recursion set-params: M belongs to the cobweb graph\.$/],
        [setParams({a1: 5, C: 10, R: 15}), /^recursion set-params: C, R belongs to the cobweb graph\.$/],
        [setStart(0), /^recursion set-start: this operation belongs to the cobweb graph\.$/],
        [setStep(1), /^recursion set-step: this operation belongs to the cobweb graph\.$/],
    ];
    for (const [action, message] of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(growth, action), label).toThrow(message);
        expect({state: JSON.parse(JSON.stringify(growth.state)) as unknown, readouts: readouts(), status: status()}, label).toEqual(before);
    }
});
