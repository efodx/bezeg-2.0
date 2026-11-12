import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import LogisticMapGraph, {STEP_INTERVAL_MS} from './LogisticMapGraph';

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
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

/** The graph with a fake frame clock, so a playback can be started and its pause observed. */
class ClockedGraph extends LogisticMapGraph {
    clock = new FakeClock();
    protected override animationScheduler() { return this.clock; }
}

const mount = (): ClockedGraph => {
    const graph = new ClockedGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: LogisticMapGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setR = (R: number): LessonAction => ({kind: 'phase', operation: 'set-r', R});
const setSeed = (X: number): LessonAction => ({kind: 'phase', operation: 'set-seed', X});
const setStep = (step: number): LessonAction => ({kind: 'phase', operation: 'set-step', step});
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const rField = () => t('number_field_label', {value0: t('phase_graph_logistic_r_label')});
const xField = () => t('phase_graph_logistic_x_label');
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-logistic-status]')?.textContent;
const stateOf = (graph: LogisticMapGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state, the readouts and the status after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: ClockedGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

test('set-r reaches the state, readouts and status of typing r', () => {
    const viaAction = after(graph => apply(graph, setR(310)));
    expect(viaAction).toEqual(after(() => type(rField(), '3,1')));
    expect(viaAction.state).toEqual(expect.objectContaining({R: 310, X: 20, step: 0}));
    expect(viaAction.readouts).toContain('period=' + t('phase_graph_logistic_period_value', {value0: '2'}));
});

test('set-seed reaches the state and readouts of typing the start x0', () => {
    const viaAction = after(graph => apply(graph, setSeed(21)));
    expect(viaAction).toEqual(after(() => type(xField(), '0,21')));
    expect(viaAction.state).toEqual(expect.objectContaining({X: 21}));
});

test('set-step reaches the state and readouts of pressing Next step', () => {
    const viaAction = after(graph => apply(graph, setStep(3)));
    expect(viaAction).toEqual(after(() => { for (let i = 0; i < 3; i++) press(t('next_step')); }));
    expect(viaAction.state).toEqual(expect.objectContaining({step: 3}));
});

test('typing the start or r keeps the number of drawn steps; Reset sets it to 0 (what the PP4 two-close-starts prompt tells the learner)', () => {
    const graph = mount();
    apply(graph, setR(400));
    apply(graph, setStep(5));
    type(xField(), '0,21');
    expect(graph.state).toEqual(expect.objectContaining({X: 21, step: 5}));
    type(rField(), '3,9');
    expect(graph.state).toEqual(expect.objectContaining({R: 390, step: 5}));
    press(t('reset'));
    expect(graph.state.step).toBe(0);
    press(t('next_step'));
    press(t('next_step'));
    type(xField(), '0,2');
    expect(graph.state).toEqual(expect.objectContaining({X: 20, step: 2}));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setR(400));
        capabilities.apply(setSeed(30));
        capabilities.apply(setStep(12));
        capabilities.apply(setR(346));
        capabilities.apply(setStep(5));
    });
    expect(graph.state).toEqual(expect.objectContaining({R: 346, X: 30, step: 5}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    const viaControl = after(() => {
        type(rField(), '3,46');
        type(xField(), '0,3');
        for (let i = 0; i < 5; i++) press(t('next_step'));
    });
    expect(viaControl).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setR(355));
    apply(graph, setSeed(55));
    apply(graph, setStep(9));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('a valid action pauses a running playback; the step it sets is kept', () => {
    const graph = mount();
    act(() => { graph.play(); });
    graph.clock.tick(0);
    graph.clock.tick(STEP_INTERVAL_MS);
    expect(graph.isPlaying()).toBe(true);
    const played = graph.state.step;
    expect(played).toBeGreaterThan(0);
    apply(graph, setR(310));
    expect(graph.isPlaying()).toBe(false);
    expect(graph.state.step).toBe(played);
    act(() => { graph.play(); });
    apply(graph, setStep(7));
    expect(graph.isPlaying()).toBe(false);
    expect(graph.state.step).toBe(7);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setR(310))).toBe(true);
    expect(graph.supportsLessonAction(setSeed(20))).toBe(true);
    expect(graph.supportsLessonAction(setStep(1))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setR(350));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const bad: LessonAction[] = [
        setR(249), setR(401), setR(310.5), setR(Number.NaN), setR(Number.POSITIVE_INFINITY), setR(JSON.parse('"310"')), setR(JSON.parse('null')),
        setSeed(0), setSeed(100), setSeed(20.5), setSeed(Number.NaN), setSeed(JSON.parse('"20"')),
        setStep(-1), setStep(61), setStep(2.5), setStep(Number.NaN), setStep(JSON.parse('null')),
        {kind: 'phase', operation: 'set-zoom', zoom: 1} as unknown as LessonAction,
        {kind: 'phase', operation: 'set-r', R: 310, X: 20} as unknown as LessonAction,
        {kind: 'phase', operation: 'set-seed', X: 20, step: 3} as unknown as LessonAction,
        {kind: 'phase', operation: 'set-step', step: 3, R: 310} as unknown as LessonAction,
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(/^phase[ :]/);
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
    expect(() => apply(graph, setR(401))).toThrow(/phase set-r: R out-of-range/);
    expect(() => apply(graph, setSeed(20.5))).toThrow(/phase set-seed: X off-grid/);
    expect(() => apply(graph, setStep(61))).toThrow(/phase set-step: step out-of-range/);
    expect(() => apply(graph, {kind: 'phase', operation: 'set-r', R: 310, X: 20} as unknown as LessonAction)).toThrow(/phase set-r: no such field X/);
});
