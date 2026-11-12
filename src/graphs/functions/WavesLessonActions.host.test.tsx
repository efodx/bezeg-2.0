import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {WavesMode} from '../../waves/wavesModel';
import {WavesGraph} from './WavesGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): WavesGraph => {
    const graph = new WavesGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
type ComponentsAction = Extract<LessonAction, {kind: 'waves'; operation: 'set-components'}>;
type SamplingAction = Extract<LessonAction, {kind: 'waves'; operation: 'set-sampling'}>;
const apply = (graph: WavesGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMode = (mode: WavesMode): LessonAction => ({kind: 'waves', operation: 'set-mode', mode});
const setTime = (value: number): LessonAction => ({kind: 'waves', operation: 'set-time', t: value});
const setComponents = (fields: Omit<ComponentsAction, 'kind' | 'operation'>): LessonAction => ({kind: 'waves', operation: 'set-components', ...fields});
const setSampling = (fields: Omit<SamplingAction, 'kind' | 'operation'>): LessonAction => ({kind: 'waves', operation: 'set-sampling', ...fields});
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const toggle = (key: 'waves_graph_show_phasors' | 'waves_graph_show_envelope' | 'waves_graph_show_alias' | 'waves_graph_show_join' | 'waves_graph_show_sinc') =>
    act(() => { fireEvent.click(field(t(key))); });
const choose = (mode: WavesMode) => act(() => { fireEvent.change(field(t('waves_graph_mode_label')), {target: {value: mode}}); });
const slide = (value: number) => act(() => { fireEvent.change(screen.getByRole('slider'), {target: {value: String(value)}}); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-waves-status]')?.textContent;
const stateOf = (graph: WavesGraph) => JSON.parse(JSON.stringify({...graph.state, time: graph.time, playing: graph.playing})) as Record<string, unknown>;

/** The state (with the time), the readouts and the status line after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: WavesGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

test('set-mode reaches the state, readouts and status of choosing the kind of waves in the list', () => {
    for (const mode of ['beats', 'standing', 'sampling', 'sum'] as const) {
        const viaAction = after(graph => { apply(graph, setTime(0.4)); apply(graph, setMode(mode)); });
        const viaControl = after(() => { slide(0.4); choose(mode); });
        expect({mode, ...viaAction}).toEqual({mode, ...viaControl});
        expect(viaAction.state).toEqual(expect.objectContaining({mode, time: mode === 'sum' ? 0.4 : 0})); // choosing the mode already shown changes nothing
    }
});

test('set-time reaches the state, readouts and status of moving the time slider', () => {
    for (const value of [0, 0.25, 0.5, 1]) {
        const viaAction = after(graph => apply(graph, setTime(value)));
        const viaControl = after(() => slide(value));
        expect({value, ...viaAction}).toEqual({value, ...viaControl});
        expect(viaAction.state.time).toBe(value);
    }
    expect(after(graph => { apply(graph, setMode('beats')); apply(graph, setTime(2)); }).state.time).toBe(2); // the window of the beats is 2 s
});

test('set-components reaches the state, readouts and status of typing into the fields and the switches', () => {
    const sum = after(graph => apply(graph, setComponents({a1: 3, a2: 2, p1: 0, p2: 90, f1: 5, showPhasors: false})));
    const sumControl = after(() => {
        type(t('waves_graph_a1_sum_label'), '3');
        type(t('waves_graph_a2_label'), '2');
        type(t('waves_graph_p1_label'), '0');
        type(t('waves_graph_p2_label'), '90');
        type(t('waves_graph_f_both_label'), '5');
        toggle('waves_graph_show_phasors');
    });
    expect(sum).toEqual(sumControl);
    expect(sum.state).toEqual(expect.objectContaining({mode: 'sum', a1: 3, a2: 2, p1: 0, p2: 90, f1: 5, showPhasors: false}));

    const beats = after(graph => { apply(graph, setMode('beats')); apply(graph, setComponents({f1: 10, f2: 11, showEnvelope: false})); });
    const beatsControl = after(() => {
        choose('beats');
        type(t('waves_graph_f1_beats_label'), '10');
        type(t('waves_graph_f2_beats_label'), '11');
        toggle('waves_graph_show_envelope');
    });
    expect(beats).toEqual(beatsControl);
    expect(beats.state).toEqual(expect.objectContaining({mode: 'beats', f1: 10, f2: 11, showEnvelope: false}));
});

test('set-sampling reaches the state, readouts and status of typing into the fields and the switches', () => {
    const viaAction = after(graph => { apply(graph, setMode('sampling')); apply(graph, setSampling({fs: 24, extra: 12, showJoin: true, showSinc: true, showAlias: false})); });
    const viaControl = after(() => {
        choose('sampling');
        type(t('waves_graph_fs_label'), '24');
        toggle('waves_graph_show_join');
        toggle('waves_graph_show_sinc');
        type(t('waves_graph_extra_label'), '12');
        toggle('waves_graph_show_alias');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({mode: 'sampling', fs: 24, extra: 12, showJoin: true, showSinc: true, showAlias: false}));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('beats'));
        capabilities.apply(setComponents({f1: 10, f2: 12, a1: 1}));
        capabilities.apply(setTime(1.9)); // only inside the 2 s window of the beats
        capabilities.apply(setComponents({f2: 11, showEnvelope: false}));
        capabilities.apply(setTime(0.5));
    });
    expect(graph.state).toEqual(expect.objectContaining({mode: 'beats', f1: 10, f2: 11, a1: 1, showEnvelope: false}));
    expect(graph.time).toBe(0.5);
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    const viaControl = after(() => {
        choose('beats');
        type(t('waves_graph_f1_beats_label'), '10');
        type(t('waves_graph_f2_beats_label'), '12');
        slide(1.9);
        type(t('waves_graph_f2_beats_label'), '11');
        toggle('waves_graph_show_envelope');
        slide(0.5);
    });
    expect(viaControl).toEqual(here);
});

test('every action halts a running playback; playback is never left running by a scene', () => {
    for (const action of [setTime(0.5), setMode('beats'), setComponents({a1: 2}), setSampling({fs: 24}), setComponents({}), setSampling({})]) {
        const graph = mount();
        act(() => { graph.play(); });
        expect(graph.playing, JSON.stringify(action)).toBe(true);
        apply(graph, action);
        expect(graph.playing, JSON.stringify(action)).toBe(false);
        cleanup();
    }
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMode('beats'));
    apply(graph, setComponents({f1: 10, f2: 12, showEnvelope: false}));
    apply(graph, setTime(0.5));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMode('beats'))).toBe(true);
    expect(graph.supportsLessonAction(setTime(1))).toBe(true);
    expect(graph.supportsLessonAction(setComponents({a1: 1}))).toBe(true);
    expect(graph.supportsLessonAction(setSampling({fs: 12}))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'descent', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setMode('beats'));
    apply(graph, setComponents({f1: 10, f2: 12}));
    apply(graph, setTime(0.5));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const bad: LessonAction[] = [
        setTime(-0.1), setTime(2.5), setTime(Number.NaN), setTime(Number.POSITIVE_INFINITY), setTime(JSON.parse('"1"')),
        setMode(JSON.parse('"wheel"')), setMode(JSON.parse('3')),
        setComponents({a1: 4.25}), setComponents({a1: 0.1}), setComponents({a2: -1}), setComponents({p1: 7}), setComponents({p2: 185}), setComponents({f1: 0}), setComponents({f1: 41}),
        setComponents({f2: 10.5}), setComponents({f1: Number.NaN}), setComponents({halfWaves: 7}), setComponents({halfWaves: 2.5}),
        setComponents({showPhasors: JSON.parse('"yes"')}), setComponents({showEnvelope: JSON.parse('1')}),
        setSampling({fs: 1}), setSampling({fs: 65}), setSampling({fs: 12.5}), setSampling({extra: 5}), setSampling({extra: 204}), setSampling({fs: Number.POSITIVE_INFINITY}),
        setSampling({showAlias: JSON.parse('0')}), setSampling({showJoin: JSON.parse('"true"')}), setSampling({showSinc: JSON.parse('null')}), setSampling({showSinc: JSON.parse('2')}),
        {kind: 'waves', operation: 'play'} as unknown as LessonAction,
        {kind: 'waves', operation: 'set-components', speed: 3} as unknown as LessonAction,
        {kind: 'waves', operation: 'set-components', mode: 'sum'} as unknown as LessonAction,
        {kind: 'waves', operation: 'set-components', fs: 12} as unknown as LessonAction,
        {kind: 'waves', operation: 'set-sampling', f1: 12} as unknown as LessonAction,
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow();
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
});
