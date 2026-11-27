import React from 'react';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {runAs} from '../base/writes/writeSource';
import {installBoardShims, puckControl, REAL_GRAPH_TEST_TIMEOUT, typePuck, waitForPucks} from '../base/realGraphTestHarness';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import type {LessonAction} from '../../learning/model';
import {setLanguage} from '../../localization';
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

/** A mount that waits until the puck strip has laid out, so a test can type into a puck or flip a switch puck. */
const mount = async (): Promise<ObservedGraph> => {
    const graph = new ObservedGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('euler-angle');
    return graph;
};
type EventedPoint = JXG.Point & {triggerEventHandlers(names: string[], args: unknown[]): void};
const apply = (graph: {getLessonCapabilities(): {apply(action: LessonAction): void}}, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setAngle = (degrees: number): LessonAction => ({kind: 'complex-euler', operation: 'set-angle', degrees});
const setMotion = (patch: {omega?: number; velocity?: boolean; acceleration?: boolean}): LessonAction => ({kind: 'complex-euler', operation: 'set-motion', ...patch});
const setMode = (mode: 'motion' | 'product', b?: number): LessonAction => ({kind: 'complex-euler', operation: 'set-mode', mode, ...(b === undefined ? {} : {b})});
const setSeries = (degree: number): LessonAction => ({kind: 'complex-euler', operation: 'set-series', degree});
const type = (key: string, value: string) => typePuck(key, value);
const toggle = (key: string) => act(() => { fireEvent.click(puckControl(key)); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-euler-status]')?.textContent;
const stateOf = (graph: EulerCircleGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
const snapshot = (graph: EulerCircleGraph) => ({state: stateOf(graph), readouts: readouts(), status: status()});
/** The state, the readouts and the status after running `edit` on a fresh graph and then unmounting it. */
async function after(edit: (graph: ObservedGraph) => void) {
    const graph = await mount();
    edit(graph);
    const result = snapshot(graph);
    cleanup();
    return result;
}

test('set-angle equals typing theta and dragging the handle', async () => {
    const typed = await after(graph => apply(graph, setAngle(150)));
    expect(typed).toEqual(await after(() => type('euler-angle', '150')));
    expect(typed.state).toEqual(expect.objectContaining({degrees: 150, omega: 2, degree: 5}));

    const dragged = await after(graph => apply(graph, setAngle(90)));
    expect(dragged).toEqual(await after(graph => {
        const handle = graph.dragHandle() as EventedPoint;
        handle.setPosition(JXG.COORDS_BY_USER, [0, 1]);
        act(() => { handle.triggerEventHandlers(['drag'], []); });
    }));
    expect(dragged.state).toEqual(expect.objectContaining({degrees: 90}));
    expect((await after(graph => apply(graph, setAngle(360)))).state).toEqual(expect.objectContaining({degrees: 360}));
});

test('set-motion equals the omega field and the two arrow toggles', async () => {
    const omega = await after(graph => apply(graph, setMotion({omega: 3})));
    expect(omega).toEqual(await after(() => type('euler-omega', '3')));
    expect(omega.state).toEqual(expect.objectContaining({omega: 3, velocity: true, acceleration: false}));

    const arrows = await after(graph => apply(graph, setMotion({velocity: false, acceleration: true})));
    expect(arrows).toEqual(await after(() => { toggle('show-velocity'); toggle('show-acceleration'); }));
    expect(arrows.state).toEqual(expect.objectContaining({velocity: false, acceleration: true, omega: 2}));

    expect((await after(graph => apply(graph, setMotion({})))).state).toEqual((await after(() => undefined)).state);
});

test('set-mode equals the mode chooser and the second angle field', async () => {
    const product = await after(graph => apply(graph, setMode('product')));
    expect(product).toEqual(await after(() => toggle('product-mode')));
    expect(product.state).toEqual(expect.objectContaining({mode: 'product', b: 45, degrees: 30}));

    const second = await after(graph => apply(graph, setMode('product', 90)));
    expect(second).toEqual(await after(() => { toggle('product-mode'); type('euler-b', '90'); }));
    expect(second.state).toEqual(expect.objectContaining({mode: 'product', b: 90}));

    const back = await after(graph => { apply(graph, setMode('product', 90)); apply(graph, setMode('motion')); });
    expect(back).toEqual(await after(() => { toggle('product-mode'); type('euler-b', '90'); toggle('product-mode'); }));
    expect(back.state).toEqual(expect.objectContaining({mode: 'motion', b: 90}));
});

test('set-series equals the series stepper and its field', async () => {
    const typed = await after(graph => apply(graph, setSeries(13)));
    expect(typed).toEqual(await after(() => type('euler-degree', '13')));
    expect(typed.state).toEqual(expect.objectContaining({degree: 13}));
    expect((await after(graph => apply(graph, setSeries(6)))).state).toEqual((await after(() => type('euler-degree', '6'))).state);
    expect((await after(graph => apply(graph, setSeries(4)))).state).toEqual((await after(() => type('euler-degree', '4'))).state);
    expect((await after(graph => apply(graph, setSeries(5)))).state).toEqual((await after(() => undefined)).state);
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', async () => {
    const graph = await mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setAngle(180));
        capabilities.apply(setMode('product', 90));
        capabilities.apply(setMotion({omega: 4, acceleration: true}));
        capabilities.apply(setSeries(9));
        runAs('learner', () => graph.stepOnce());
        expect(graph.state).toEqual(expect.objectContaining({degrees: 185, mode: 'product', b: 90, omega: 4, acceleration: true, degree: 9}));
        capabilities.apply(setAngle(30));
    });
    expect(graph.state).toEqual(expect.objectContaining({degrees: 30, mode: 'product', b: 90, omega: 4, acceleration: true, degree: 9}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = snapshot(graph);
    cleanup();
    expect(await after(fresh => {
        type('euler-angle', '180');
        toggle('product-mode'); type('euler-b', '90');
        type('euler-omega', '4'); toggle('show-acceleration');
        type('euler-degree', '9');
        act(() => fresh.performAction('next-step'));
        type('euler-angle', '30');
    })).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', async () => {
    const graph = await mount();
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

test('a valid action pauses a playing run and never starts one', async () => {
    const graph = await mount();
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

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', async () => {
    const graph = await mount();
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
