import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {EulerCircleGraph, STEP_INTERVAL_MS} from './EulerCircleGraph';

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

class ObservedGraph extends EulerCircleGraph {
    clock = new FakeClock();
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return false; }
}

const mount = (): ObservedGraph => {
    const graph = new ObservedGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
type EventedPoint = JXG.Point & {triggerEventHandlers(names: string[], args: unknown[]): void};
const apply = (graph: {getLessonCapabilities(): {apply(action: LessonAction): void}}, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setAngle = (degrees: number): LessonAction => ({kind: 'complex-euler', operation: 'set-angle', degrees});
const setMotion = (patch: {omega?: number; velocity?: boolean; acceleration?: boolean}): LessonAction => ({kind: 'complex-euler', operation: 'set-motion', ...patch});
const setMode = (mode: 'motion' | 'product', b?: number): LessonAction => ({kind: 'complex-euler', operation: 'set-mode', mode, ...(b === undefined ? {} : {b})});
const setSeries = (degree: number): LessonAction => ({kind: 'complex-euler', operation: 'set-series', degree});
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const press = (name: string) => act(() => { fireEvent.click(screen.getByRole('button', {name})); });
const toggle = (label: string) => act(() => { fireEvent.click(screen.getByLabelText(label)); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-euler-status]')?.textContent;
const stateOf = (graph: EulerCircleGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
const snapshot = (graph: EulerCircleGraph) => ({state: stateOf(graph), readouts: readouts(), status: status()});
const angleLabel = () => t('euler_circle_graph_angle_label');
const omegaLabel = () => t('euler_circle_graph_omega_label');
const degreeLabel = () => t('euler_circle_graph_degree_label');
const secondLabel = () => t('euler_circle_graph_b_label');
const modeLabel = () => t('euler_circle_graph_mode_label');
const velocityLabel = () => t('euler_circle_graph_velocity_label');
const accelerationLabel = () => t('euler_circle_graph_acceleration_label');

/** The state, the readouts and the status after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: ObservedGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = snapshot(graph);
    cleanup();
    return result;
}

test('set-angle equals typing theta and dragging the handle', () => {
    const typed = after(graph => apply(graph, setAngle(150)));
    expect(typed).toEqual(after(() => type(angleLabel(), '150')));
    expect(typed.state).toEqual(expect.objectContaining({degrees: 150, omega: 2, degree: 5}));

    const dragged = after(graph => apply(graph, setAngle(90)));
    expect(dragged).toEqual(after(graph => {
        const handle = graph.dragHandle() as EventedPoint;
        handle.setPosition(JXG.COORDS_BY_USER, [0, 1]);
        act(() => { handle.triggerEventHandlers(['drag'], []); });
    }));
    expect(dragged.state).toEqual(expect.objectContaining({degrees: 90}));
    expect(after(graph => apply(graph, setAngle(360))).state).toEqual(expect.objectContaining({degrees: 360}));
});

test('set-motion equals the omega field and the two arrow toggles', () => {
    const omega = after(graph => apply(graph, setMotion({omega: 3})));
    expect(omega).toEqual(after(() => type(omegaLabel(), '3')));
    expect(omega.state).toEqual(expect.objectContaining({omega: 3, velocity: true, acceleration: false}));

    const arrows = after(graph => apply(graph, setMotion({velocity: false, acceleration: true})));
    expect(arrows).toEqual(after(() => { toggle(velocityLabel()); toggle(accelerationLabel()); }));
    expect(arrows.state).toEqual(expect.objectContaining({velocity: false, acceleration: true, omega: 2}));

    expect(after(graph => apply(graph, setMotion({}))).state).toEqual(after(() => undefined).state);
});

test('set-mode equals the mode chooser and the second angle field', () => {
    const product = after(graph => apply(graph, setMode('product')));
    expect(product).toEqual(after(() => toggle(modeLabel())));
    expect(product.state).toEqual(expect.objectContaining({mode: 'product', b: 45, degrees: 30}));

    const second = after(graph => apply(graph, setMode('product', 90)));
    expect(second).toEqual(after(() => { toggle(modeLabel()); type(secondLabel(), '90'); }));
    expect(second.state).toEqual(expect.objectContaining({mode: 'product', b: 90}));

    const back = after(graph => { apply(graph, setMode('product', 90)); apply(graph, setMode('motion')); });
    expect(back).toEqual(after(() => { toggle(modeLabel()); type(secondLabel(), '90'); toggle(modeLabel()); }));
    expect(back.state).toEqual(expect.objectContaining({mode: 'motion', b: 90}));
});

test('set-series equals the series stepper and its field', () => {
    const typed = after(graph => apply(graph, setSeries(13)));
    expect(typed).toEqual(after(() => type(degreeLabel(), '13')));
    expect(typed.state).toEqual(expect.objectContaining({degree: 13}));
    expect(after(graph => apply(graph, setSeries(6))).state).toEqual(after(() => press(t('increase_count'))).state);
    expect(after(graph => apply(graph, setSeries(4))).state).toEqual(after(() => press(t('decrease_count'))).state);
    expect(after(graph => apply(graph, setSeries(5))).state).toEqual(after(() => undefined).state);
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setAngle(180));
        capabilities.apply(setMode('product', 90));
        capabilities.apply(setMotion({omega: 4, acceleration: true}));
        capabilities.apply(setSeries(9));
        graph.stepOnce();
        expect(graph.state).toEqual(expect.objectContaining({degrees: 185, mode: 'product', b: 90, omega: 4, acceleration: true, degree: 9}));
        capabilities.apply(setAngle(30));
    });
    expect(graph.state).toEqual(expect.objectContaining({degrees: 30, mode: 'product', b: 90, omega: 4, acceleration: true, degree: 9}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = snapshot(graph);
    cleanup();
    expect(after(() => {
        type(angleLabel(), '180');
        toggle(modeLabel()); type(secondLabel(), '90');
        type(omegaLabel(), '4'); toggle(accelerationLabel());
        type(degreeLabel(), '9');
        press(t('next_step'));
        type(angleLabel(), '30');
    })).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setAngle(180));
    apply(graph, setMode('product', 90));
    apply(graph, setMotion({omega: 3, velocity: false}));
    apply(graph, setSeries(30));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
    expect(free).toEqual(expect.objectContaining({degrees: 30, omega: 2, degree: 5, velocity: true, acceleration: false, mode: 'motion', b: 45}));
});

test('a valid action pauses a playing run and never starts one', () => {
    const graph = mount();
    apply(graph, setAngle(10));
    expect(graph.isPlaying()).toBe(false);
    expect(graph.clock.pending()).toBe(false);
    act(() => { graph.play(); });
    expect(graph.isPlaying()).toBe(true);
    graph.clock.tick(0);
    graph.clock.tick(STEP_INTERVAL_MS);
    expect(graph.state.degrees).toBeGreaterThan(10);
    apply(graph, setAngle(100));
    expect(graph.isPlaying()).toBe(false);
    expect(graph.state.degrees).toBe(100);
    graph.clock.tick(3 * STEP_INTERVAL_MS);
    expect(graph.state.degrees).toBe(100);
    for (const action of [setMotion({omega: 3}), setMode('product'), setSeries(7), setMotion({})]) {
        act(() => { graph.play(); });
        expect(graph.isPlaying()).toBe(true);
        apply(graph, action);
        expect(graph.isPlaying(), JSON.stringify(action)).toBe(false);
    }
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setAngle(1))).toBe(true);
    expect(graph.supportsLessonAction(setMotion({omega: 2}))).toBe(true);
    expect(graph.supportsLessonAction(setMode('motion'))).toBe(true);
    expect(graph.supportsLessonAction(setSeries(2))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'complex-power', operation: 'set-n', n: 2})).toBe(false);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setAngle(120));
    apply(graph, setSeries(3));
    const before = snapshot(graph);
    const raw = (value: string) => JSON.parse(value) as never;
    const unknown = (action: object) => action as unknown as LessonAction;
    const bad: [LessonAction, RegExp][] = [
        [setAngle(361), /^complex-euler set-angle: degrees is out-of-range\.$/], [setAngle(-1), /^complex-euler set-angle: degrees is out-of-range\.$/],
        [setAngle(30.5), /^complex-euler set-angle: degrees is off-grid\.$/], [setAngle(Number.NaN), /^complex-euler set-angle: degrees is not-finite\.$/],
        [setAngle(raw('"30"')), /^complex-euler set-angle: degrees is not-finite\.$/],
        [unknown({kind: 'complex-euler', operation: 'set-angle'}), /^complex-euler set-angle: degrees is missing\.$/],
        [setMotion({omega: 0}), /^complex-euler set-motion: omega is out-of-range\.$/], [setMotion({omega: 5}), /^complex-euler set-motion: omega is out-of-range\.$/],
        [setMotion({omega: 2.5}), /^complex-euler set-motion: omega is off-grid\.$/],
        [setMotion({omega: 3, velocity: raw('"yes"')}), /^complex-euler set-motion: velocity is not-boolean\.$/], // one bad field refuses the whole action: omega stays 2
        [setMode('product', 47), /^complex-euler set-mode: b is off-grid\.$/], [setMode('product', 365), /^complex-euler set-mode: b is out-of-range\.$/],
        [setMode(raw('"both"')), /^complex-euler set-mode: mode is not-mode\.$/],
        [unknown({kind: 'complex-euler', operation: 'set-mode', b: 90}), /^complex-euler set-mode: mode is missing\.$/],
        [setSeries(0), /^complex-euler set-series: degree is out-of-range\.$/], [setSeries(31), /^complex-euler set-series: degree is out-of-range\.$/],
        [setSeries(2.5), /^complex-euler set-series: degree is off-grid\.$/], [setSeries(Number.POSITIVE_INFINITY), /^complex-euler set-series: degree is not-finite\.$/],
        [unknown({kind: 'complex-euler', operation: 'set-angle', degrees: 10, omega: 3}), /^complex-euler set-angle: no such field omega\.$/],
        [unknown({kind: 'complex-euler', operation: 'set-motion', omega: 3, degrees: 10}), /^complex-euler set-motion: no such field degrees\.$/],
        [unknown({kind: 'complex-euler', operation: 'set-mode', mode: 'product', degree: 3}), /^complex-euler set-mode: no such field degree\.$/],
        [unknown({kind: 'complex-euler', operation: 'set-series', degree: 3, mode: 'product'}), /^complex-euler set-series: no such field mode\.$/],
        [unknown({kind: 'complex-euler', operation: 'fly'}), /^complex-euler: no operation in /],
    ];
    for (const [action, message] of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(message);
        expect(snapshot(graph), label).toEqual(before);
    }
    // an action of another graph is not this graph's: the host refuses it and nothing changes
    expect(() => apply(graph, {kind: 'complex-power', operation: 'set-n', n: 2})).toThrow();
    expect(snapshot(graph)).toEqual(before);
});
