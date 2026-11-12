import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import type {LessonAction} from '../../../learning/model';
import {setLanguage, t} from '../../../localization';
import {enterNumber} from '../../../inputs/testEntry';
import type {MotionChoice} from '../../../kinematics/kinematicsModel';
import {KinematicsGraph} from './KinematicsGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): KinematicsGraph => {
    const graph = new KinematicsGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: KinematicsGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMotion = (motion: MotionChoice): LessonAction => ({kind: 'kinematics', operation: 'set-motion', motion});
const setTime = (value: number): LessonAction => ({kind: 'kinematics', operation: 'set-time', t: value});
const setParams = (params: Omit<Extract<LessonAction, {kind: 'kinematics'; operation: 'set-params'}>, 'kind' | 'operation'>): LessonAction => ({kind: 'kinematics', operation: 'set-params', ...params});
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const choose = (motion: MotionChoice) => act(() => { fireEvent.change(field(t('kinematics_graph_motion_label')), {target: {value: motion}}); });
const toggle = (label: string) => act(() => { fireEvent.click(field(label)); });
const slide = (value: number) => act(() => { fireEvent.change(screen.getByRole('slider'), {target: {value: String(value)}}); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-kinematics-status]')?.textContent;
const stateOf = (graph: KinematicsGraph) => JSON.parse(JSON.stringify({...graph.state, time: graph.time})) as Record<string, unknown>;

/** The state (with the time), the readouts and the status line after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: KinematicsGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

test('set-motion reaches the state, readouts and status of choosing the motion in the list', () => {
    for (const motion of ['cardioid', 'rose', 'spiral', 'projectile', 'circular', 'cycloid'] as const) {
        const viaAction = after(graph => { apply(graph, setTime(1)); apply(graph, setMotion(motion)); });
        const viaControl = after(() => { slide(1); choose(motion); });
        expect({motion, ...viaAction}).toEqual({motion, ...viaControl});
        expect(viaAction.state).toEqual(expect.objectContaining({motion, time: motion === 'cycloid' ? 1 : 0})); // choosing the motion already shown changes nothing
    }
});

test('set-time reaches the state, readouts and status of moving the time slider', () => {
    for (const value of [0, 1.57, 3.14, 6.28]) {
        const viaAction = after(graph => apply(graph, setTime(value)));
        const viaControl = after(() => slide(value));
        expect({value, ...viaAction}).toEqual({value, ...viaControl});
        expect(viaAction.state.time).toBe(value);
    }
});

test('set-params reaches the state, readouts and status of typing into the fields and the four switches', () => {
    const viaAction = after(graph => {
        apply(graph, setMotion('circular'));
        apply(graph, setParams({radius: 1, omega: 1, b: 0.5, showVelocity: false, showAcceleration: false, split: true, trace: false}));
    });
    const viaControl = after(() => {
        choose('circular');
        type(t('kinematics_graph_radius_label'), '1'); type(t('kinematics_graph_omega_label'), '1'); type(t('kinematics_graph_b_label'), '0,5');
        toggle(t('kinematics_graph_show_velocity')); toggle(t('kinematics_graph_show_acceleration'));
        toggle(t('kinematics_graph_split')); toggle(t('kinematics_graph_trace'));
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({motion: 'circular', radius: 1, omega: 1, b: 0.5, showVelocity: false, showAcceleration: false, split: true, trace: false}));
    const projectile = after(graph => { apply(graph, setMotion('projectile')); apply(graph, setParams({v0: 13, alpha: 50})); });
    expect(projectile).toEqual(after(() => { choose('projectile'); type(t('kinematics_graph_v0_label'), '13'); type(t('kinematics_graph_alpha_label'), '50'); }));
    expect(projectile.state).toEqual(expect.objectContaining({v0: 13, alpha: 50}));
});

test('a scene runs its actions in one synchronous sequence: set-motion, set-time, then set-params, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMotion('circular'));
        capabilities.apply(setTime(1.1206)); // inside the period of the new motion, not only of the cycloid
        capabilities.apply(setParams({radius: 1, omega: 1, b: 0.5}));
        capabilities.apply(setTime(3.14));
    });
    expect(graph.state).toEqual(expect.objectContaining({motion: 'circular', radius: 1, omega: 1, b: 0.5}));
    expect(graph.time).toBe(3.14);
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    const viaControl = after(() => { choose('circular'); type(t('kinematics_graph_radius_label'), '1'); type(t('kinematics_graph_omega_label'), '1'); type(t('kinematics_graph_b_label'), '0,5'); slide(3.14); });
    expect(viaControl).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMotion('circular'));
    apply(graph, setParams({b: 0.5, split: true}));
    apply(graph, setTime(2));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMotion('rose'))).toBe(true);
    expect(graph.supportsLessonAction(setTime(1))).toBe(true);
    expect(graph.supportsLessonAction(setParams({b: 0}))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'combinatorics', operation: 'set-target', a: 1, b: 1})).toBe(false);
    apply(graph, setMotion('circular'));
    apply(graph, setParams({radius: 1, omega: 1, b: 0.5}));
    apply(graph, setTime(2));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const bad: LessonAction[] = [
        setTime(-0.1), setTime(7), setTime(Number.NaN), setTime(Number.POSITIVE_INFINITY), setTime(JSON.parse('"1"')),
        setMotion(JSON.parse('"hyperbola"')), setMotion(JSON.parse('3')),
        setParams({radius: 9}), setParams({radius: 0.1}), setParams({omega: Number.NaN}), setParams({b: 0.97}), setParams({b: 1.5}), setParams({b: -0.1}),
        setParams({v0: 1000}), setParams({alpha: 120}), setParams({radius: 1.03}),
        setParams({showVelocity: JSON.parse('"yes"')}),
        {kind: 'kinematics', operation: 'play'} as unknown as LessonAction,
    ];
    for (const action of bad) {
        expect(() => apply(graph, action), JSON.stringify(action)).toThrow();
        expect(stateOf(graph), JSON.stringify(action)).toEqual(before);
        expect(readouts(), JSON.stringify(action)).toEqual(beforeReadouts);
    }
    // b needs the circular motion: a motion change drops it, and setting it on another motion is refused.
    apply(graph, setMotion('cardioid'));
    expect(graph.state.b).toBe(0);
    const onCardioid = stateOf(graph);
    expect(() => apply(graph, setParams({b: 0.5}))).toThrow();
    expect(stateOf(graph)).toEqual(onCardioid);
});
