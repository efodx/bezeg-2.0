import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {ComplexPowerGraph, STEP_INTERVAL_MS} from './ComplexPowerGraph';

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

class ObservedGraph extends ComplexPowerGraph {
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
const setZ = (A: number, B: number): LessonAction => ({kind: 'complex-power', operation: 'set-z', A, B});
const setN = (n: number): LessonAction => ({kind: 'complex-power', operation: 'set-n', n});
const field = (name: string) => screen.getByRole('spinbutton', {name}) as HTMLInputElement;
const type = (name: string, value: string) => act(() => { enterNumber(field(name), value); });
const press = (name: string) => act(() => { fireEvent.click(screen.getByRole('button', {name})); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-complex-power-status]')?.textContent;
const counter = () => document.querySelector('[data-step-counter]')?.textContent;
const stateOf = (graph: ComplexPowerGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
const snapshot = (graph: ComplexPowerGraph) => ({state: stateOf(graph), readouts: readouts(), status: status(), counter: counter()});

/** The state, the readouts, the status and the counter after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: ObservedGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = snapshot(graph);
    cleanup();
    return result;
}

test('set-z equals typing z and dragging the handle', () => {
    const typed = after(graph => apply(graph, setZ(16, 12)));
    expect(typed).toEqual(after(() => { type('z, Re', '0,8'); type('z, Im', '0,6'); }));
    expect(typed.state).toEqual(expect.objectContaining({A: 16, B: 12, n: 5}));

    const dragged = after(graph => apply(graph, setZ(10, -30)));
    expect(dragged).toEqual(after(graph => {
        const handle = graph.dragHandle() as EventedPoint;
        handle.setPosition(JXG.COORDS_BY_USER, [0.5, -1.5]);
        act(() => { handle.triggerEventHandlers(['drag'], []); });
    }));
    expect(dragged.state).toEqual(expect.objectContaining({A: 10, B: -30}));
});

test('set-n equals the n field and the steppers', () => {
    const typed = after(graph => apply(graph, setN(8)));
    expect(typed).toEqual(after(() => type(t('complex_power_graph_n_label'), '8')));
    expect(typed.state).toEqual(expect.objectContaining({n: 8}));

    const up = after(graph => apply(graph, setN(6)));
    expect(up).toEqual(after(() => press(t('increase_count'))));
    const down = after(graph => apply(graph, setN(4)));
    expect(down).toEqual(after(() => press(t('decrease_count'))));
    expect(after(graph => apply(graph, setN(5))).state).toEqual(after(() => undefined).state);
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setZ(16, 12));
        capabilities.apply(setN(1));
        capabilities.apply(setN(3));
        graph.stepOnce();
        expect(graph.state).toEqual(expect.objectContaining({A: 16, B: 12, n: 4}));
        capabilities.apply(setZ(10, 10));
    });
    expect(graph.state).toEqual(expect.objectContaining({A: 10, B: 10, n: 4}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = snapshot(graph);
    cleanup();
    expect(after(() => {
        type('z, Re', '0,8'); type('z, Im', '0,6');
        type(t('complex_power_graph_n_label'), '1');
        type(t('complex_power_graph_n_label'), '3');
        press(t('next_step'));
        type('z, Re', '0,5'); type('z, Im', '0,5');
    })).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setZ(-8, 30));
    apply(graph, setN(2));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
    expect(free).toEqual(expect.objectContaining({A: 20, B: 20, n: 5}));
});

test('a valid action pauses a playing run and never starts one', () => {
    const graph = mount();
    apply(graph, setN(2));
    expect(graph.isPlaying()).toBe(false);
    expect(graph.clock.pending()).toBe(false);
    act(() => { graph.play(); });
    expect(graph.isPlaying()).toBe(true);
    graph.clock.tick(0);
    graph.clock.tick(STEP_INTERVAL_MS);
    expect(graph.state.n).toBeGreaterThan(2);
    apply(graph, setN(3));
    expect(graph.isPlaying()).toBe(false);
    expect(graph.state.n).toBe(3);
    graph.clock.tick(3 * STEP_INTERVAL_MS);
    expect(graph.state.n).toBe(3);
    act(() => { graph.play(); });
    expect(graph.isPlaying()).toBe(true);
    apply(graph, setZ(4, 4));
    expect(graph.isPlaying()).toBe(false);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setZ(1, 1))).toBe(true);
    expect(graph.supportsLessonAction(setN(2))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setZ(16, 12));
    apply(graph, setN(3));
    const before = snapshot(graph);
    const raw = (value: string) => JSON.parse(value) as never;
    const bad: [LessonAction, RegExp][] = [
        [setZ(41, 0), /^complex-power set-z: re is out-of-range\.$/], [setZ(0, -41), /^complex-power set-z: im is out-of-range\.$/],
        [setZ(1.5, 0), /^complex-power set-z: A must be a whole number\.$/], [setZ(0, 0.5), /^complex-power set-z: B must be a whole number\.$/],
        [setZ(Number.NaN, 0), /^complex-power set-z: A must be a whole number\.$/], [setZ(raw('"3"'), 0), /^complex-power set-z: A must be a whole number\.$/],
        [setZ(10, 41), /^complex-power set-z: im is out-of-range\.$/], // one bad field refuses the whole action: A stays 16
        [setN(0), /^complex-power set-n: n is out-of-range\.$/], [setN(9), /^complex-power set-n: n is out-of-range\.$/],
        [setN(2.5), /^complex-power set-n: n must be a whole number\.$/], [setN(Number.POSITIVE_INFINITY), /^complex-power set-n: n must be a whole number\.$/],
        [{kind: 'complex-power', operation: 'set-z', A: 1, B: 1, n: 2} as unknown as LessonAction, /^complex-power set-z: no such field n\.$/],
        [{kind: 'complex-power', operation: 'set-n', n: 2, A: 1} as unknown as LessonAction, /^complex-power set-n: no such field A\.$/],
        [{kind: 'complex-power', operation: 'set-n', re: 0.5, n: 2} as unknown as LessonAction, /^complex-power set-n: no such field re\.$/],
        [{kind: 'complex-power', operation: 'fly'} as unknown as LessonAction, /^complex-power: no operation in /],
    ];
    for (const [action, message] of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(message);
        expect(snapshot(graph), label).toEqual(before);
    }
});
