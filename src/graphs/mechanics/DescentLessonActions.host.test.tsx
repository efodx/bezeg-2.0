import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {DescentMode} from '../../mechanics/trackModel';
import {DescentGraph} from './DescentGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): DescentGraph => {
    const graph = new DescentGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
type ParamsAction = Extract<LessonAction, {kind: 'descent'; operation: 'set-params'}>;
const apply = (graph: DescentGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMode = (mode: DescentMode): LessonAction => ({kind: 'descent', operation: 'set-mode', mode});
const setTime = (value: number): LessonAction => ({kind: 'descent', operation: 'set-time', t: value});
const setParams = (params: Omit<ParamsAction, 'kind' | 'operation'>): LessonAction => ({kind: 'descent', operation: 'set-params', ...params});
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (key: typeof KEYS[keyof typeof KEYS], value: string) => act(() => { enterNumber(field(t(key)), value); });
const toggle = (key: 'descent_graph_show_cycloid' | 'descent_graph_show_arc') => act(() => { fireEvent.click(field(t(key))); });
const choose = (mode: DescentMode) => act(() => { fireEvent.change(field(t('descent_graph_mode_label')), {target: {value: mode}}); });
const slide = (value: number) => act(() => { fireEvent.change(screen.getByRole('slider'), {target: {value: String(value)}}); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-descent-status]')?.textContent;
const stateOf = (graph: DescentGraph) => JSON.parse(JSON.stringify({...graph.state, time: graph.time, playing: graph.playing})) as Record<string, unknown>;

/** The state (with the time), the readouts and the status line after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: DescentGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

const KEYS = {
    radius: 'descent_graph_radius_label', endX: 'descent_graph_end_x_label', endY: 'descent_graph_end_y_label',
    p1x: 'descent_graph_p1x_label', p1y: 'descent_graph_p1y_label', p2x: 'descent_graph_p2x_label', p2y: 'descent_graph_p2y_label',
    theta1: 'descent_graph_theta1_label', theta2: 'descent_graph_theta2_label', theta3: 'descent_graph_theta3_label',
} as const;

test('set-mode reaches the state, readouts and status of choosing the experiment in the list', () => {
    for (const mode of ['track', 'tautochrone', 'race'] as const) {
        const viaAction = after(graph => { apply(graph, setTime(0.4)); apply(graph, setMode(mode)); });
        const viaControl = after(() => { slide(0.4); choose(mode); });
        expect({mode, ...viaAction}).toEqual({mode, ...viaControl});
        expect(viaAction.state).toEqual(expect.objectContaining({mode, time: mode === 'race' ? 0.4 : 0})); // choosing the mode already shown changes nothing
    }
});

test('set-time reaches the state, readouts and status of moving the time slider', () => {
    for (const value of [0, 0.4, 1.1, 1.19]) {
        const viaAction = after(graph => apply(graph, setTime(value)));
        const viaControl = after(() => slide(value));
        expect({value, ...viaAction}).toEqual({value, ...viaControl});
        expect(viaAction.state.time).toBe(value);
    }
});

test('set-params reaches the state, readouts and status of typing into the fields and the switches', () => {
    const race = after(graph => apply(graph, setParams({radius: 0.25})));
    expect(race).toEqual(after(() => type(KEYS.radius, '0,25')));
    expect(race.state).toEqual(expect.objectContaining({radius: 0.25}));

    const track = after(graph => {
        apply(graph, setMode('track'));
        apply(graph, setParams({endX: 3, endY: 1.5, p1x: 0.25, p1y: 1, p2x: 1.5, p2y: 1.75, showCycloid: false}));
    });
    const trackControl = after(() => {
        choose('track');
        for (const [name, value] of [['endX', '3'], ['endY', '1,5'], ['p1x', '0,25'], ['p1y', '1'], ['p2x', '1,5'], ['p2y', '1,75']] as const) type(KEYS[name], value);
        toggle('descent_graph_show_cycloid');
    });
    expect(track).toEqual(trackControl);
    expect(track.state).toEqual(expect.objectContaining({mode: 'track', endX: 3, endY: 1.5, p1x: 0.25, p1y: 1, p2x: 1.5, p2y: 1.75, showCycloid: false}));

    const bead = after(graph => {
        apply(graph, setMode('tautochrone'));
        apply(graph, setParams({radius: 2, theta1: 1, theta2: 2.05, theta3: 3.1, showArc: true}));
    });
    const beadControl = after(() => {
        choose('tautochrone');
        for (const [name, value] of [['radius', '2'], ['theta1', '1'], ['theta2', '2,05'], ['theta3', '3,1']] as const) type(KEYS[name], value);
        toggle('descent_graph_show_arc');
    });
    expect(bead).toEqual(beadControl);
    expect(bead.state).toEqual(expect.objectContaining({mode: 'tautochrone', radius: 2, theta1: 1, theta2: 2.05, theta3: 3.1, showArc: true}));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote (also a shortened run)', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('track'));
        capabilities.apply(setParams({endX: 3, endY: 1.5, p1x: 1, p1y: 0.5, p2x: 2, p2y: 1}));
        capabilities.apply(setTime(1.24)); // only inside the run of the new track
        capabilities.apply(setParams({p1x: 0.25, p1y: 1, p2x: 1.5, p2y: 1.75})); // shortens the run: the time follows
        capabilities.apply(setTime(0.99));
    });
    expect(graph.state).toEqual(expect.objectContaining({mode: 'track', endX: 3, endY: 1.5, p1x: 0.25, p1y: 1, p2x: 1.5, p2y: 1.75}));
    expect(graph.time).toBe(0.99);
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    const viaControl = after(() => {
        choose('track');
        for (const [name, value] of [['endX', '3'], ['endY', '1,5'], ['p1x', '1'], ['p1y', '0,5'], ['p2x', '2'], ['p2y', '1']] as const) type(KEYS[name], value);
        slide(1.24);
        for (const [name, value] of [['p1x', '0,25'], ['p1y', '1'], ['p2x', '1,5'], ['p2y', '1,75']] as const) type(KEYS[name], value);
        slide(0.99);
    });
    expect(viaControl).toEqual(here);
});

test('every action halts a running playback; playback is never left running by a scene', () => {
    for (const action of [setTime(0.5), setMode('track'), setParams({radius: 2})]) {
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
    apply(graph, setMode('track'));
    apply(graph, setParams({p1x: 0.25, showCycloid: false}));
    apply(graph, setTime(0.5));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMode('track'))).toBe(true);
    expect(graph.supportsLessonAction(setTime(1))).toBe(true);
    expect(graph.supportsLessonAction(setParams({radius: 1}))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'kinematics', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setMode('track'));
    apply(graph, setParams({p1x: 0.5, p1y: 1}));
    apply(graph, setTime(0.5));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const bad: LessonAction[] = [
        setTime(-0.1), setTime(5), setTime(Number.NaN), setTime(Number.POSITIVE_INFINITY), setTime(JSON.parse('"1"')),
        setMode(JSON.parse('"hyperbola"')), setMode(JSON.parse('3')),
        setParams({radius: 0.1}), setParams({radius: 3.25}), setParams({radius: 1.1}), setParams({endX: 6.5}), setParams({endX: Number.NaN}), setParams({endY: 0}),
        setParams({p1x: 0.3}), setParams({p1y: -2.25}), setParams({p2y: 4.5}), setParams({theta1: 3.5}), setParams({theta2: 0.03}), setParams({theta3: -0.05}),
        setParams({showCycloid: JSON.parse('"yes"')}), setParams({showArc: JSON.parse('1')}), setParams({p1x: Number.POSITIVE_INFINITY}),
        {kind: 'descent', operation: 'play'} as unknown as LessonAction,
        {kind: 'descent', operation: 'set-params', speed: 3} as unknown as LessonAction,
        {kind: 'descent', operation: 'set-params', mode: 'race'} as unknown as LessonAction,
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow();
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
});
