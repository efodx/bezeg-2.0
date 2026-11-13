import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import PhasePortraitGraph, {MAX_FRAME_MS} from './PhasePortraitGraph';

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

/** The graph with a fake frame clock and motion allowed, so a playback can be started and its pause observed. */
class ClockedGraph extends PhasePortraitGraph {
    clock = new FakeClock();
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return false; }
}

const mount = (): ClockedGraph => {
    const graph = new ClockedGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
type Seed = {X: number; Y: number};
const apply = (graph: PhasePortraitGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMatrix = (A: number, B: number, C: number, D: number): LessonAction => ({kind: 'phase', operation: 'set-matrix', A, B, C, D});
const setSystem = (system: string): LessonAction => ({kind: 'phase', operation: 'set-system', system} as unknown as LessonAction);
const setSeeds = (seeds: readonly Seed[]): LessonAction => ({kind: 'phase', operation: 'set-seeds', seeds});
const setZoom = (zoom: number): LessonAction => ({kind: 'phase', operation: 'set-zoom', zoom});
const setEquilibrium = (equilibrium: number): LessonAction => ({kind: 'phase', operation: 'set-equilibrium', equilibrium});
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const chooseSystem = (system: string) => act(() => { fireEvent.change(field(t('phase_graph_system_label')), {target: {value: system}}); });
const entry = (name: 'a' | 'b' | 'c' | 'd', value: string) => type(t(`phase_graph_matrix_${name}_label`), value);
const seedX = (n: number, value: string) => type(t('phase_graph_seed_x_label', {value0: String(n)}), value);
const seedY = (n: number, value: string) => type(t('phase_graph_seed_y_label', {value0: String(n)}), value);
const seedTheta = (n: number, value: string) => type(t('phase_graph_seed_theta_label', {value0: String(n)}), value);
const seedOmega = (n: number, value: string) => type(t('phase_graph_seed_omega_label', {value0: String(n)}), value);
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-phase-status]')?.textContent;
const inset = () => document.querySelector('[data-phase-inset]')?.getAttribute('aria-label');
const stateOf = (graph: PhasePortraitGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state, the readouts, the status and the inset after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: ClockedGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status(), inset: inset()};
    cleanup();
    return result;
}

test('set-matrix reaches the state, readouts, status and inset of typing the four entries', () => {
    const viaAction = after(graph => apply(graph, setMatrix(4, -4, 4, 0)));
    expect(viaAction).toEqual(after(() => { entry('a', '1'); entry('b', '-1'); entry('c', '1'); entry('d', '0'); }));
    expect(viaAction.state).toEqual(expect.objectContaining({system: 'linear', A: 4, B: -4, C: 4, D: 0}));
});

test('set-system reaches the state and readouts of the system chooser, keeping the matrix and the seeds', () => {
    for (const system of ['pendulum', 'weak-spiral', 'linear']) {
        const viaAction = after(graph => apply(graph, setSystem(system)));
        expect(viaAction, system).toEqual(after(() => chooseSystem(system)));
    }
    const pendulum = after(graph => apply(graph, setSystem('pendulum')));
    expect(pendulum.state).toEqual(expect.objectContaining({system: 'pendulum', A: -16, B: -4, C: -8, D: -12, seeds: [{X: 20, Y: 0}], equilibrium: 0}));
});

test('set-system returns the equilibrium to 0 where the system has no such one, like the chooser', () => {
    const graph = mount();
    apply(graph, setSystem('pendulum'));
    act(() => { fireEvent.change(field(t('phase_graph_equilibrium_label')), {target: {value: '1'}}); });
    expect(graph.state.equilibrium).toBe(1);
    apply(graph, setSystem('linear'));
    expect(graph.state.equilibrium).toBe(0);
});

const chooseEquilibrium = (value: string) => act(() => { fireEvent.change(field(t('phase_graph_equilibrium_label')), {target: {value}}); });
const typeZoom = (value: string) => type(t('phase_graph_zoom_label'), value);

test('set-zoom reaches the state, readouts, status and inset of the zoom control', () => {
    for (const zoom of [0, 1, 3, 6]) {
        const viaAction = after(graph => apply(graph, setZoom(zoom)));
        expect(viaAction, String(zoom)).toEqual(after(() => typeZoom(String(zoom))));
        expect(viaAction.state, String(zoom)).toEqual(expect.objectContaining({zoom}));
    }
});

test('set-equilibrium reaches the state, readouts, status and inset of the equilibrium chooser', () => {
    const viaAction = after(graph => { apply(graph, setSystem('pendulum')); apply(graph, setEquilibrium(1)); });
    expect(viaAction).toEqual(after(() => { chooseSystem('pendulum'); chooseEquilibrium('1'); }));
    expect(viaAction.state).toEqual(expect.objectContaining({system: 'pendulum', equilibrium: 1}));
    expect(after(graph => { apply(graph, setSystem('pendulum')); apply(graph, setEquilibrium(1)); apply(graph, setEquilibrium(0)); })).toEqual(after(() => chooseSystem('pendulum')));
});

test('set-zoom and set-equilibrium run in one synchronous sequence with set-system', () => {
    const graph = mount();
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setSystem('pendulum'));
        capabilities.apply(setEquilibrium(1));
        capabilities.apply(setZoom(3));
    });
    expect(graph.state).toEqual(expect.objectContaining({system: 'pendulum', equilibrium: 1, zoom: 3}));
    const here = {state: stateOf(graph), readouts: readouts(), status: status(), inset: inset()};
    cleanup();
    expect(after(() => { chooseSystem('pendulum'); chooseEquilibrium('1'); typeZoom('3'); })).toEqual(here);
});

test('set-zoom and set-equilibrium refuse invalid values and change nothing', () => {
    const graph = mount();
    apply(graph, setZoom(2));
    const check = (action: LessonAction, pattern: RegExp) => {
        const before = {state: stateOf(graph), readouts: readouts(), status: status()};
        expect(() => apply(graph, action), JSON.stringify(action)).toThrow(pattern);
        expect({state: stateOf(graph), readouts: readouts(), status: status()}).toEqual(before);
    };
    for (const zoom of [7, -1, 1.5, Number.NaN]) check(setZoom(zoom), /^phase set-zoom: zoom /);
    check(setEquilibrium(1), /^phase set-equilibrium: equilibrium /);
    apply(graph, setSystem('weak-spiral'));
    check(setEquilibrium(1), /^phase set-equilibrium: equilibrium /);
    apply(graph, setSystem('pendulum'));
    check(setEquilibrium(2), /^phase set-equilibrium: equilibrium /);
    check(setEquilibrium(-1), /^phase set-equilibrium: equilibrium /);
});

test('set-system keeps the zoom and returns the equilibrium to 0 only where the system lacks it', () => {
    const graph = mount();
    apply(graph, setZoom(4));
    apply(graph, setSystem('pendulum'));
    apply(graph, setEquilibrium(1));
    expect(graph.state).toEqual(expect.objectContaining({zoom: 4, equilibrium: 1}));
    apply(graph, setSystem('weak-spiral'));
    expect(graph.state).toEqual(expect.objectContaining({zoom: 4, equilibrium: 0}));
});

test('a playback is paused by set-zoom and set-equilibrium', () => {
    const graph = mount();
    apply(graph, setSystem('pendulum'));
    for (const action of [setZoom(2), setEquilibrium(1)]) {
        act(() => { graph.play(); });
        graph.clock.tick(0);
        graph.clock.tick(MAX_FRAME_MS);
        expect(graph.playing).toBe(true);
        apply(graph, action);
        expect(graph.playing).toBe(false);
    }
});

test('set-seeds reaches the state and readouts of the seed count and the typed seeds', () => {
    const seeds = [{X: 20, Y: 20}, {X: -20, Y: 0}];
    const viaAction = after(graph => apply(graph, setSeeds(seeds)));
    expect(viaAction).toEqual(after(() => { press(t('phase_graph_seeds_plus')); seedX(1, '1'); seedY(1, '1'); seedX(2, '-1'); seedY(2, '0'); }));
    expect(viaAction.state).toEqual(expect.objectContaining({seeds}));
    expect(after(graph => apply(graph, setSeeds([{X: 20, Y: 0}])))).toEqual(after(() => undefined));
});

test('set-seeds takes 1 to 6 seeds; the pendulum seeds are (theta, omega) typed the same way', () => {
    const six = [0, 1, 2, 3, 4, 5].map(i => ({X: i * 10 - 25, Y: 80 - i * 30}));
    const graph = mount();
    apply(graph, setSeeds(six));
    expect(graph.state.seeds).toEqual(six);
    cleanup();
    expect(after(g => { apply(g, setSystem('pendulum')); apply(g, setSeeds([{X: 0, Y: 40}])); }))
        .toEqual(after(() => { chooseSystem('pendulum'); seedTheta(1, '0'); seedOmega(1, '2'); }));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMatrix(0, -4, 4, 0));
        capabilities.apply(setSeeds([{X: 20, Y: 0}, {X: 0, Y: 20}]));
        capabilities.apply(setSystem('pendulum'));
        capabilities.apply(setMatrix(4, 0, 0, -4));
        capabilities.apply(setSystem('linear'));
        capabilities.apply(setSeeds([{X: 40, Y: 0}]));
    });
    expect(graph.state).toEqual(expect.objectContaining({system: 'linear', A: 4, B: 0, C: 0, D: -4, seeds: [{X: 40, Y: 0}]}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status(), inset: inset()};
    cleanup();
    const viaControl = after(() => { entry('a', '1'); entry('b', '0'); entry('c', '0'); entry('d', '-1'); seedX(1, '2'); seedY(1, '0'); });
    expect(viaControl).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMatrix(1, 2, 3, 4));
    apply(graph, setSystem('weak-spiral'));
    apply(graph, setSeeds([{X: 5, Y: 5}, {X: -5, Y: 5}]));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('a valid action pauses a running playback and keeps the time', () => {
    const graph = mount();
    for (const action of [setMatrix(4, 0, 0, 4), setSystem('pendulum'), setSeeds([{X: 0, Y: 40}])]) {
        act(() => { graph.play(); });
        graph.clock.tick(0);
        graph.clock.tick(MAX_FRAME_MS);
        expect(graph.playing, JSON.stringify(action)).toBe(true);
        const time = graph.time;
        expect(time).toBeGreaterThan(0);
        apply(graph, action);
        expect(graph.playing, JSON.stringify(action)).toBe(false);
        expect(graph.time).toBe(time);
    }
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMatrix(0, 0, 0, 0))).toBe(true);
    expect(graph.supportsLessonAction(setSystem('linear'))).toBe(true);
    expect(graph.supportsLessonAction(setSeeds([{X: 0, Y: 0}]))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setMatrix(4, -4, 4, 0));
    apply(graph, setSeeds([{X: 20, Y: 0}, {X: 0, Y: 20}]));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const seven = [0, 1, 2, 3, 4, 5, 6].map(i => ({X: i, Y: 0}));
    const unknownField = (action: object) => action as unknown as LessonAction;
    const bad: LessonAction[] = [
        setMatrix(17, 0, 0, 0), setMatrix(0, -17, 0, 0), setMatrix(0, 0, 1.5, 0), setMatrix(0, 0, 0, Number.NaN), setMatrix(JSON.parse('"4"'), 0, 0, 0), setMatrix(JSON.parse('null'), 0, 0, 0),
        setSystem('cubic'), setSystem(JSON.parse('null')),
        setSeeds([]), setSeeds(seven), setSeeds([{X: 81, Y: 0}]), setSeeds([{X: 0, Y: -81}]), setSeeds([{X: 0.5, Y: 0}]), setSeeds([{X: 0, Y: Number.NaN}]),
        setSeeds([{X: 0} as unknown as Seed]), setSeeds(JSON.parse('null')),
        unknownField({kind: 'phase', operation: 'set-zoom', zoom: 1, equilibrium: 0}),
        unknownField({kind: 'phase', operation: 'set-equilibrium', equilibrium: 0, zoom: 1}),
        unknownField({kind: 'phase', operation: 'set-matrix', A: 4, B: 0, C: 0, D: 0, system: 'linear'}),
        unknownField({kind: 'phase', operation: 'set-system', system: 'linear', A: 4}),
        unknownField({kind: 'phase', operation: 'set-seeds', seeds: [{X: 0, Y: 0}], zoom: 1}),
        {kind: 'phase', operation: 'set-r', R: 310},
        {kind: 'phase', operation: 'set-seed', X: 20},
        {kind: 'phase', operation: 'set-step', step: 3},
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(/^phase[ :]/);
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
    expect(() => apply(graph, setMatrix(17, 0, 0, 0))).toThrow(/phase set-matrix: A out-of-range/);
    expect(() => apply(graph, setMatrix(0, 0, 1.5, 0))).toThrow(/phase set-matrix: C off-grid/);
    expect(() => apply(graph, setSystem('cubic'))).toThrow(/phase set-system: system unknown-value/);
    expect(() => apply(graph, setSeeds(seven))).toThrow(/phase set-seeds: seeds out-of-range/);
    expect(() => apply(graph, setSeeds([{X: 81, Y: 0}]))).toThrow(/phase set-seeds: seeds\[0\]\.X out-of-range/);
    expect(() => apply(graph, unknownField({kind: 'phase', operation: 'set-matrix', A: 4, B: 0, C: 0, D: 0, system: 'linear'}))).toThrow(/phase set-matrix: no such field system/);
    expect(() => apply(graph, {kind: 'phase', operation: 'set-r', R: 310})).toThrow(/phase set-r: not an operation of the phase portrait/);
});

test('the logistic map refuses the phase portrait operations', async () => {
    const {default: LogisticMapGraph} = await import('./LogisticMapGraph');
    const graph = new LogisticMapGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    for (const action of [setMatrix(4, 0, 0, 4), setSystem('linear'), setSeeds([{X: 0, Y: 0}]), setZoom(1), setEquilibrium(0)]) {
        expect(() => apply(graph as unknown as PhasePortraitGraph, action)).toThrow(/not an operation of the logistic map/);
    }
});
