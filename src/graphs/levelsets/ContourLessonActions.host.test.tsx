import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
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

const choose = (label: string, value: string) => act(() => { fireEvent.change(screen.getByLabelText(label), {target: {value}}); });
const type = (label: string, value: string) => act(() => { enterNumber(screen.getByRole('spinbutton', {name: label}) as HTMLInputElement, value); });
const typeLevel = (value: string) => type(t('number_field_label', {value0: t('levelsets_graph_level')}), value);
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-contour-status]')?.textContent;
const stateOf = (graph: TestGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state, the readouts and the status line after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: TestGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

const modeChooser = (mode: string) => choose(t('levelsets_graph_mode'), mode);
const functionChooser = (fn: string) => choose(t('levelsets_graph_fn'), fn);

test('set-mode and set-function reach the state of the chooser, including the probe fallback', () => {
    const viaMode = after(graph => apply(graph, setMode('gradient')));
    expect(viaMode).toEqual(after(() => modeChooser('gradient')));
    expect(viaMode.state).toEqual(expect.objectContaining({mode: 'gradient'}));
    const viaFunction = after(graph => apply(graph, setFunction('valley')));
    expect(viaFunction).toEqual(after(() => functionChooser('valley')));
    expect(viaFunction.state).toEqual(expect.objectContaining({fn: 'valley'}));
    // A probe outside the window of the new function returns to its default, as the chooser does.
    const viaFallback = after(graph => { apply(graph, setFunction('hills')); apply(graph, setProbe(60, 60)); apply(graph, setFunction('bowl')); });
    expect(viaFallback).toEqual(after(() => { functionChooser('hills'); modeChooser('gradient'); type('P, x', '3'); type('P, y', '3'); modeChooser('level-sets'); functionChooser('bowl'); }));
    expect(viaFallback.state).toEqual(expect.objectContaining({fn: 'bowl', probe: [12, 16]}));
});

test('set-level reaches the state of the level field and the count buttons', () => {
    const viaLevel = after(graph => apply(graph, setLevel(10)));
    expect(viaLevel).toEqual(after(() => typeLevel('1,25')));
    expect(viaLevel.state).toEqual(expect.objectContaining({level: 10}));
    const viaCount = after(graph => apply(graph, setLevel(undefined, 3)));
    expect(viaCount).toEqual(after(() => { press(t('levelsets_graph_count_plus')); press(t('levelsets_graph_count_plus')); }));
    expect(viaCount.state).toEqual(expect.objectContaining({levelCount: 3}));
    const both = after(graph => apply(graph, setLevel(-4, 5)));
    expect(both.state).toEqual(expect.objectContaining({level: -4, levelCount: 5}));
});

test('set-probe reaches the state of the typed probe point; set-numeric the checkbox', () => {
    const viaProbe = after(graph => { apply(graph, setMode('gradient')); apply(graph, setProbe(20, 10)); });
    expect(viaProbe).toEqual(after(() => { modeChooser('gradient'); type('P, x', '1'); type('P, y', '0,5'); }));
    expect(viaProbe.state).toEqual(expect.objectContaining({probe: [20, 10]}));
    const viaNumeric = after(graph => { apply(graph, setMode('gradient')); apply(graph, setNumeric(true)); });
    expect(viaNumeric).toEqual(after(() => { modeChooser('gradient'); act(() => { fireEvent.click(screen.getByRole('checkbox', {name: t('levelsets_graph_numeric')})); }); }));
    expect(viaNumeric.state).toEqual(expect.objectContaining({numeric: true}));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
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
    const viaControl = after(() => {
        functionChooser('hills');
        modeChooser('gradient');
        type('P, x', '1');
        type('P, y', '1');
        act(() => { fireEvent.click(screen.getByRole('checkbox', {name: t('levelsets_graph_numeric')})); });
        press(t('levelsets_graph_count_plus'));
        press(t('levelsets_graph_count_plus'));
        press(t('levelsets_graph_count_plus'));
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
