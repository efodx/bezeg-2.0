import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import type {RandomMode} from '../../random/randomModel';
import {SimulationGraph} from './SimulationGraph';

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
}
class ObservedGraph extends SimulationGraph {
    clock = new FakeClock();
    protected override animationScheduler() { return this.clock; }
    liveBoard() { return this.board; }
}

const mount = (): ObservedGraph => {
    const graph = new ObservedGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
type RunAction = Extract<LessonAction, {kind: 'random'; operation: 'set-run'}>;
type OverlayAction = Extract<LessonAction, {kind: 'random'; operation: 'set-overlay'}>;
const apply = (graph: SimulationGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMode = (mode: RandomMode): LessonAction => ({kind: 'random', operation: 'set-mode', mode});
const setRun = (fields: Omit<RunAction, 'kind' | 'operation'>): LessonAction => ({kind: 'random', operation: 'set-run', ...fields});
const setOverlay = (fields: Omit<OverlayAction, 'kind' | 'operation'>): LessonAction => ({kind: 'random', operation: 'set-overlay', ...fields});
const setPosition = (shown: number): LessonAction => ({kind: 'random', operation: 'set-position', shown});
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const chooseMode = (mode: RandomMode) => act(() => { fireEvent.change(field(t('random_graph_mode_label')), {target: {value: mode}}); });
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const toggleOverlay = () => act(() => { fireEvent.click(screen.getByLabelText(t('random_graph_overlay_label'))); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-random-status]')?.textContent;
const stateOf = (graph: SimulationGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
type Probe = {elType: string; dataX?: number[]; dataY?: number[]};
const drawing = (graph: ObservedGraph) => (graph.liveBoard().objectsList as unknown as Probe[])
    .filter(o => o.elType === 'curve').map(o => JSON.stringify([o.dataX ?? [], o.dataY ?? []])).sort();

/** The state, the readouts, the status line and the drawing after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: ObservedGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status(), drawing: drawing(graph)};
    cleanup();
    return result;
}

test('set-mode reaches the state, readouts and drawing of choosing the mode in the list', () => {
    const viaAction = after(graph => apply(graph, setMode('frequency')));
    expect(viaAction).toEqual(after(() => chooseMode('frequency')));
    expect(viaAction.state).toEqual(expect.objectContaining({mode: 'frequency', n: 10000, shown: 10000}));
    expect(after(graph => apply(graph, setMode('galton'))).state).toEqual(after(() => undefined).state);
});

test('set-run reaches the state, readouts and drawing of typing into the fields', () => {
    const galton = after(graph => apply(graph, setRun({seed: 43, n: 100, rows: 8, pPercent: 30})));
    const galtonControl = after(() => {
        type(t('random_graph_seed_label'), '43');
        type(t('random_graph_n_galton'), '100');
        type(t('random_graph_rows_label'), '8');
        type(t('random_graph_p_label'), '30');
    });
    expect(galton).toEqual(galtonControl);
    expect(galton.state).toEqual(expect.objectContaining({seed: 43, n: 100, shown: 100, rows: 8, pPercent: 30}));

    const frequency = after(graph => { apply(graph, setMode('frequency')); apply(graph, setRun({seed: 7, n: 100})); });
    const frequencyControl = after(() => {
        chooseMode('frequency');
        type(t('random_graph_seed_label'), '7');
        type(t('random_graph_n_frequency'), '100');
    });
    expect(frequency).toEqual(frequencyControl);
});

test('set-overlay reaches the state, readouts and drawing of the switch and the second seed field', () => {
    const viaAction = after(graph => { apply(graph, setMode('frequency')); apply(graph, setOverlay({overlay: true, seed2: 99})); });
    const viaControl = after(() => {
        chooseMode('frequency');
        toggleOverlay();
        type(t('random_graph_seed2_label'), '99');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({overlay: 1, seed2: 99}));
    const off = after(graph => { apply(graph, setOverlay({overlay: true})); apply(graph, setOverlay({overlay: false})); });
    expect(off.state).toEqual(expect.objectContaining({overlay: 0, seed2: 43}));
});

test('set-position reaches the state, readouts and drawing of Replay and Next', () => {
    const viaAction = after(graph => apply(graph, setPosition(10)));
    // the stops of n = 1000 are 0, 1, 2, 5, 10, ...: Replay goes to 0, four Next presses to 10
    const viaControl = after(() => { press(t('replay')); for (let i = 0; i < 4; i++) press(t('next_step')); });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({shown: 10, n: 1000}));
    expect(after(graph => apply(graph, setPosition(0))).state).toEqual(expect.objectContaining({shown: 0}));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('frequency'));
        capabilities.apply(setRun({seed: 5, n: 100}));
        capabilities.apply(setOverlay({overlay: true}));
        capabilities.apply(setPosition(20));
        capabilities.apply(setRun({seed: 6}));
    });
    expect(graph.state).toEqual(expect.objectContaining({mode: 'frequency', seed: 6, n: 100, shown: 20, overlay: 1}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status(), drawing: drawing(graph)};
    cleanup();
    // stops of n = 100: 0, 1, 2, 5, 10, 20; typing the seed leaves `shown` where it is
    const viaControl = after(() => {
        chooseMode('frequency');
        type(t('random_graph_seed_label'), '5');
        type(t('random_graph_n_frequency'), '100');
        toggleOverlay();
        press(t('replay'));
        for (let i = 0; i < 5; i++) press(t('next_step'));
        type(t('random_graph_seed_label'), '6');
    });
    expect(viaControl).toEqual(here);
});

test('every write halts the playback', () => {
    const graph = mount();
    for (const action of [setRun({seed: 1}), setMode('frequency'), setOverlay({overlay: true}), setPosition(10), setRun({})]) {
        press(t('replay'));
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        apply(graph, action);
        expect(graph.isPlaying(), JSON.stringify(action)).toBe(false);
    }
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMode('frequency'));
    apply(graph, setRun({seed: 9, n: 100}));
    apply(graph, setOverlay({overlay: true}));
    apply(graph, setPosition(10));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMode('walk'))).toBe(true);
    expect(graph.supportsLessonAction(setRun({seed: 1}))).toBe(true);
    expect(graph.supportsLessonAction(setOverlay({overlay: true}))).toBe(true);
    expect(graph.supportsLessonAction(setPosition(1))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setRun({seed: 11, n: 100}));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const bad: LessonAction[] = [
        setMode(JSON.parse('"dice"')), setMode(JSON.parse('3')),
        setRun({seed: -1}), setRun({seed: 1000000}), setRun({seed: 1.5}), setRun({n: 0}), setRun({n: 100001}), setRun({rows: 0}), setRun({rows: 13}),
        setRun({pPercent: 52}), setRun({pPercent: 100}), setRun({pPercent: 0}), setRun({seed: Number.NaN}), setRun({n: Number.POSITIVE_INFINITY}),
        setRun({rows: JSON.parse('"8"')}), setRun({seed: 5, n: 0}), // one bad field refuses the whole action: the seed stays 11
        setOverlay({overlay: JSON.parse('1')}), setOverlay({overlay: true, seed2: 1000000}), setOverlay({overlay: true, seed2: 2.5}),
        setPosition(101), setPosition(-1), setPosition(3), setPosition(Number.NaN), setPosition(JSON.parse('"10"')),
        {kind: 'random', operation: 'set-start', x: 1} as unknown as LessonAction,
        {kind: 'random', operation: 'set-run', shown: 5} as unknown as LessonAction,
        {kind: 'random', operation: 'set-run', mode: 'walk'} as unknown as LessonAction,
        {kind: 'random', operation: 'set-mode', mode: 'walk', n: 5} as unknown as LessonAction,
        {kind: 'random', operation: 'set-position', shown: 10, seed: 3} as unknown as LessonAction,
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(/^random[ :]/);
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
    // a second run belongs to the modes that have one
    apply(graph, setMode('area'));
    expect(() => apply(graph, setOverlay({overlay: true}))).toThrow(/random set-overlay: the mode area has no second run/);
    expect(stateOf(graph)).toEqual(expect.objectContaining({mode: 'area', overlay: 0}));
});
