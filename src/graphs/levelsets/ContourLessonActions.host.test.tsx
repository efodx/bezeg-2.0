import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {chooseOnPuckNow, installBoardShims, openTools, puckControl, REAL_GRAPH_TEST_TIMEOUT, typePuck, waitForPucks} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import type {SurfaceScene, SurfaceView} from '../patches/surface-view/surfaceScene';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import ContourMapGraph from './ContourMapGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

class FakeView implements SurfaceView {
    attach() { return Promise.resolve(); }
    reconcile(_scene: SurfaceScene) {}
    onEdit() { return () => {}; }
    setAriaLabel() {}
    onLayout() { return () => {}; }
    capture(): never { throw new Error('unused'); }
    fitCamera() {}
    dispose() {}
}

class TestGraph extends ContourMapGraph {
    override createSurfaceView() { return new FakeView(); }
}

const mount = (): TestGraph => {
    const graph = new TestGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: TestGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMode = (mode: 'level-sets' | 'gradient' | 'descent' | 'lagrange'): LessonAction => ({kind: 'levelsets', operation: 'set-mode', mode});
const setFunction = (fn: 'bowl' | 'saddle' | 'valley' | 'hills' | 'product'): LessonAction => ({kind: 'levelsets', operation: 'set-function', fn});
const setLevel = (level?: number, levelCount?: number): LessonAction => ({kind: 'levelsets', operation: 'set-level', level, levelCount});
const setProbe = (X: number, Y: number): LessonAction => ({kind: 'levelsets', operation: 'set-probe', X, Y});
const setNumeric = (numeric: boolean): LessonAction => ({kind: 'levelsets', operation: 'set-numeric', numeric});

/** A mount that waits until the puck strip has laid out, so a test can type into a puck, flip a switch puck or pick a mode. */
const mountWithPucks = async (): Promise<TestGraph> => {
    const graph = mount();
    await waitForPucks('contour-mode');
    await openTools(); // the probe and start rows, the function and the constraint stay in Orodja
    return graph;
};

const choose = (label: string, value: string) => act(() => { fireEvent.change(screen.getByLabelText(label), {target: {value}}); });
const type = (label: string, value: string) => act(() => { enterNumber(screen.getByRole('spinbutton', {name: label}) as HTMLInputElement, value); });
// The level c, the count, the step H, the point on the line, the circle angle, the mode and the numeric switch are pucks (task 08 lane L29).
const typeLevel = (value: string) => typePuck('contour-level', value);
const typeCount = (value: string) => typePuck('contour-count', value);
const toggleNumeric = () => act(() => { fireEvent.click(puckControl('numeric')); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-contour-status]')?.textContent;
const stateOf = (graph: TestGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state, the readouts and the status line after running `edit` on a fresh graph and then unmounting it. */
async function after(edit: (graph: TestGraph) => void) {
    const graph = await mountWithPucks();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

const modeChooser = (mode: string) => chooseOnPuckNow('contour-mode', mode);
const functionChooser = (fn: string) => choose(t('levelsets_graph_fn'), fn);

test('set-mode and set-function reach the state of the chooser, including the probe fallback', async () => {
    const viaMode = await after(graph => apply(graph, setMode('gradient')));
    expect(viaMode).toEqual(await after(() => modeChooser('gradient')));
    expect(viaMode.state).toEqual(expect.objectContaining({mode: 'gradient'}));
    const viaFunction = await after(graph => apply(graph, setFunction('valley')));
    expect(viaFunction).toEqual(await after(() => functionChooser('valley')));
    expect(viaFunction.state).toEqual(expect.objectContaining({fn: 'valley'}));
    // A probe outside the window of the new function returns to its default, as the chooser does.
    const viaFallback = await after(graph => { apply(graph, setFunction('hills')); apply(graph, setProbe(60, 60)); apply(graph, setFunction('bowl')); });
    expect(viaFallback).toEqual(await after(() => { functionChooser('hills'); modeChooser('gradient'); type('P, x', '3'); type('P, y', '3'); modeChooser('level-sets'); functionChooser('bowl'); }));
    expect(viaFallback.state).toEqual(expect.objectContaining({fn: 'bowl', probe: [12, 16]}));
});

test('set-level reaches the state of the level field and the count buttons', async () => {
    const viaLevel = await after(graph => apply(graph, setLevel(10)));
    expect(viaLevel).toEqual(await after(() => typeLevel('1,25')));
    expect(viaLevel.state).toEqual(expect.objectContaining({level: 10}));
    const viaCount = await after(graph => apply(graph, setLevel(undefined, 3)));
    expect(viaCount).toEqual(await after(() => { typeCount('3'); }));
    expect(viaCount.state).toEqual(expect.objectContaining({levelCount: 3}));
    const both = await after(graph => apply(graph, setLevel(-4, 5)));
    expect(both.state).toEqual(expect.objectContaining({level: -4, levelCount: 5}));
});

test('set-probe reaches the state of the typed probe point; set-numeric the checkbox', async () => {
    const viaProbe = await after(graph => { apply(graph, setMode('gradient')); apply(graph, setProbe(20, 10)); });
    expect(viaProbe).toEqual(await after(() => { modeChooser('gradient'); type('P, x', '1'); type('P, y', '0,5'); }));
    expect(viaProbe.state).toEqual(expect.objectContaining({probe: [20, 10]}));
    const viaNumeric = await after(graph => { apply(graph, setMode('gradient')); apply(graph, setNumeric(true)); });
    expect(viaNumeric).toEqual(await after(() => { modeChooser('gradient'); toggleNumeric(); }));
    expect(viaNumeric.state).toEqual(expect.objectContaining({numeric: true}));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', async () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setFunction('hills'));
        capabilities.apply(setProbe(20, 20));
        capabilities.apply(setMode('gradient'));
        capabilities.apply(setNumeric(true));
        capabilities.apply(setLevel(undefined, 4));
        capabilities.apply(setFunction('valley'));
    });
    expect(graph.state).toEqual(expect.objectContaining({fn: 'valley', mode: 'gradient', numeric: true, levelCount: 4, probe: [20, 20]}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    const viaControl = await after(() => {
        functionChooser('hills');
        modeChooser('gradient');
        type('P, x', '1');
        type('P, y', '1');
        toggleNumeric();
        typeCount('4');
        functionChooser('valley');
    });
    expect(viaControl).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMode('gradient'));
    apply(graph, setFunction('saddle'));
    apply(graph, setLevel(0, 5));
    apply(graph, setProbe(-20, 10));
    apply(graph, setNumeric(true));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    for (const action of [setMode('gradient'), setFunction('hills'), setLevel(1), setProbe(1, 1), setNumeric(true)]) expect(graph.supportsLessonAction(action)).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setMode('gradient'));
    apply(graph, setProbe(20, 10));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const bad: LessonAction[] = [
        setProbe(12.5, 16), setProbe(81, 0), setProbe(0, -81), setProbe(Number.NaN, 0), setProbe(JSON.parse('"3"'), 0), setProbe(JSON.parse('null'), 0),
        setLevel(361), setLevel(-361), setLevel(0.5), setLevel(undefined, 0), setLevel(undefined, 10), setLevel(undefined, 2.5), setLevel(), setLevel(Number.POSITIVE_INFINITY),
        setMode(JSON.parse('"descend"')), setFunction(JSON.parse('"cone"')), setFunction(JSON.parse('null')), setNumeric(JSON.parse('"yes"')),
        {kind: 'levelsets', operation: 'set-probe', X: 1, Y: 1, level: 3} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-mode', mode: 'gradient', fn: 'hills'} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-numeric', numeric: true, id: 'x'} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-objective', p: 1, q: 1},
        {kind: 'levelsets', operation: 'set-constraints', constraints: [{a: 1, b: 1, c: 1}]},
        {kind: 'levelsets', operation: 'set-sweep', sweep: 3},
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(/^levelsets[ :]/);
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
    expect(() => apply(graph, setProbe(12.5, 16))).toThrow(/levelsets set-probe: probe\[0\] off-grid/);
    expect(() => apply(graph, setLevel(undefined, 10))).toThrow(/levelsets set-level: levelCount out-of-range/);
    expect(() => apply(graph, setFunction(JSON.parse('"cone"')))).toThrow(/levelsets set-function: fn unknown-value/);
    expect(() => apply(graph, {kind: 'levelsets', operation: 'set-sweep', sweep: 3})).toThrow(/levelsets set-sweep: this operation belongs to the linear-programming graph/);
    // A probe outside the window of the current function is refused (the saddle window is narrower than the bowl's)
    apply(graph, setFunction('saddle'));
    const saddle = stateOf(graph);
    expect(() => apply(graph, setProbe(80, 0))).toThrow(/levelsets set-probe: probe/);
    expect(stateOf(graph)).toEqual(saddle);
});

// ---- Batch C: descent and Lagrange actions ------------------------------------------------------------------------------

const setStart = (X: number, Y: number): LessonAction => ({kind: 'levelsets', operation: 'set-start', X, Y});
const setStep = (step: number): LessonAction => ({kind: 'levelsets', operation: 'set-step', step});
const setConstraint = (constraint?: 'line' | 'circle', lineParam?: number, circleParam?: number): LessonAction => ({kind: 'levelsets', operation: 'set-constraint', constraint, lineParam, circleParam});
const typeStart = (axis: 'x' | 'y', value: string) => type(`P0, ${axis}`, value);
const nextStep = () => act(() => { fireEvent.click(document.querySelector('[data-action="next-step"]') as Element); });

test('set-start reaches the state of the start fields; set-step the step slider', async () => {
    const viaStart = await after(graph => { apply(graph, setMode('descent')); apply(graph, setStart(-8, 4)); });
    expect(viaStart).toEqual(await after(() => { modeChooser('descent'); typeStart('x', '-2'); }));
    expect(viaStart.state).toEqual(expect.objectContaining({start: [-8, 4]}));
    const viaBoth = await after(graph => { apply(graph, setMode('descent')); apply(graph, setStart(6, -2)); });
    expect(viaBoth).toEqual(await after(() => { modeChooser('descent'); typeStart('x', '1,5'); typeStart('y', '-0,5'); }));
    expect(viaBoth.state).toEqual(expect.objectContaining({start: [6, -2]}));
    const viaStep = await after(graph => { apply(graph, setMode('descent')); apply(graph, setStep(10)); });
    expect(viaStep).toEqual(await after(() => { modeChooser('descent'); typePuck('contour-step', '10'); }));
    expect(viaStep.state).toEqual(expect.objectContaining({step: 10}));
});

test('set-constraint reaches the state of the chooser and of the point controls', async () => {
    const viaCircle = await after(graph => { apply(graph, setMode('lagrange')); apply(graph, setConstraint('circle', undefined, 12)); });
    expect(viaCircle).toEqual(await after(() => { modeChooser('lagrange'); choose(t('levelsets_graph_constraint'), 'circle'); typePuck('contour-circle', '90'); }));
    expect(viaCircle.state).toEqual(expect.objectContaining({constraint: 'circle', circleParam: 12}));
    const viaLine = await after(graph => { apply(graph, setMode('lagrange')); apply(graph, setConstraint(undefined, 8)); });
    expect(viaLine).toEqual(await after(() => { modeChooser('lagrange'); typePuck('contour-line-x', '2'); }));
    expect(viaLine.state).toEqual(expect.objectContaining({constraint: 'line', lineParam: 8}));
});

test('the circle angle slider takes degrees on the 7,5 degree grid and refuses anything else', async () => {
    const graph = await mountWithPucks();
    modeChooser('lagrange');
    choose(t('levelsets_graph_constraint'), 'circle');
    const angle = (value: string) => typePuck('contour-circle', value);
    angle('90');
    expect(graph.state).toEqual(expect.objectContaining({constraint: 'circle', circleParam: 12}));
    angle('45');
    expect(graph.state).toEqual(expect.objectContaining({circleParam: 6}));
    for (const refused of ['44', '360', '-7,5']) {
        angle(refused);
        expect(graph.state).toEqual(expect.objectContaining({circleParam: 6}));
    }
    angle('352,5');
    expect(graph.state).toEqual(expect.objectContaining({circleParam: 47}));
});

test('a descent and Lagrange scene runs in one synchronous sequence with the Batch B actions; no action sets the step counter', async () => {
    const graph = mount();
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setFunction('valley'));
        capabilities.apply(setMode('descent'));
        capabilities.apply(setStart(8, 4));
        capabilities.apply(setStep(9));
        capabilities.apply(setMode('lagrange'));
        capabilities.apply(setConstraint('circle', undefined, 18));
    });
    expect(graph.state).toEqual(expect.objectContaining({fn: 'valley', mode: 'lagrange', start: [8, 4], step: 9, constraint: 'circle', circleParam: 18}));
    const here = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    const viaControl = await after(() => {
        functionChooser('valley');
        modeChooser('descent');
        typePuck('contour-step', '9');
        modeChooser('lagrange');
        choose(t('levelsets_graph_constraint'), 'circle');
        typePuck('contour-circle', '135');
    });
    expect(viaControl).toEqual(here);
    // The step counter is not an action's business: pressing step moves it, and a changing action returns it to 0 as the matching control does.
    cleanup();
    const second = mount();
    apply(second, setMode('descent'));
    nextStep();
    expect(second.step).toBe(1);
    apply(second, setStep(10));
    expect(second.step).toBe(0);
});

test('a valid descent action pauses a running playback; the checkpoint restores the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const checkpoint = capabilities.captureState();
    apply(graph, setMode('descent'));
    act(() => { graph.play(); });
    expect(graph.playing).toBe(true);
    apply(graph, setStep(5));
    expect(graph.playing).toBe(false);
    act(() => { graph.play(); });
    expect(graph.playing).toBe(true);
    apply(graph, setStep(5));
    expect(graph.playing).toBe(false);
    apply(graph, setStart(0, 0));
    apply(graph, setMode('lagrange'));
    apply(graph, setConstraint('circle', 4, 30));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
});

test('the new actions are supported; invalid ones are refused with the parse message and change nothing', () => {
    const graph = mount();
    for (const action of [setStart(8, 4), setStep(3), setConstraint('line', 4)]) expect(graph.supportsLessonAction(action)).toBe(true);
    apply(graph, setFunction('hills'));
    apply(graph, setMode('descent'));
    apply(graph, setStart(4, 4));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const bad: LessonAction[] = [
        setStart(1.5, 0), setStart(0, 1.5), setStart(1000, 0), setStart(0, -1000), setStart(Number.NaN, 0), setStart(JSON.parse('"2"'), 0),
        setStep(0), setStep(31), setStep(2.5), setStep(Number.NaN), setStep(JSON.parse('null')),
        setConstraint(), setConstraint('line'), setConstraint(JSON.parse('"cone"')), setConstraint(undefined, 0.5), setConstraint(undefined, 1000), setConstraint(undefined, undefined, 49),
        setConstraint(undefined, undefined, 2.5),
        {kind: 'levelsets', operation: 'set-start', X: 1, Y: 1, step: 3} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-step', step: 3, X: 1} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-constraint', constraint: 'circle', step: 3} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-constraint', constraint: 'circle', param: 3} as unknown as LessonAction,
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(/^levelsets[ :]/);
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
    expect(() => apply(graph, setStart(1.5, 0))).toThrow(/levelsets set-start: start\[0\] off-grid/);
    expect(() => apply(graph, setStep(31))).toThrow(/levelsets set-step: step out-of-range/);
    expect(() => apply(graph, setConstraint())).toThrow(/levelsets set-constraint: needs constraint/);
    // A line on the hills is refused, as the chooser omits it.
    expect(() => apply(graph, setConstraint('line'))).toThrow(/levelsets set-constraint: constraint inconsistent/);
    expect(stateOf(graph)).toEqual(before);
});
