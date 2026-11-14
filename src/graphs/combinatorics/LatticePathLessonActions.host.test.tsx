import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {LatticePathGraph} from './LatticePathGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): LatticePathGraph => {
    const graph = new LatticePathGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: LatticePathGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setTarget = (a: number, b: number): LessonAction => ({kind: 'combinatorics', operation: 'set-target', a, b});
const setDisplay = (view: 'paths' | 'triangle', showCounts: boolean, split?: boolean): LessonAction =>
    ({kind: 'combinatorics', operation: 'set-lattice-display', view, showCounts, ...(split === undefined ? {} : {split})});
/** The typed field of a control: a slider's exact field is named "<label>, vrednost" and shares the label with its range input. */
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const choose = (label: string, value: string) => act(() => { fireEvent.change(field(label), {target: {value}}); });
const click = (label: string) => act(() => { fireEvent.click(field(label)); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-combinatorics-status]')?.textContent;
const stateOf = (graph: LatticePathGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state, the readouts and the status line after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: LatticePathGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

test('set-target reaches the state, readouts and status of typing a and b into the fields', () => {
    for (const [a, b] of [[2, 2], [6, 6], [0, 7], [20, 20], [3, 5]] as const) {
        const viaAction = after(graph => apply(graph, setTarget(a, b)));
        const viaControl = after(() => { type('T, a', String(a)); type('T, b', String(b)); });
        expect({a, b, ...viaAction}).toEqual({a, b, ...viaControl});
        expect(viaAction.state).toEqual(expect.objectContaining({a, b, route: 0}));
    }
});

test('set-target restarts the route at the first one, like a moved target', () => {
    const graph = mount();
    apply(graph, setTarget(2, 2));
    type(t('combinatorics_lattice_route_label'), '4');
    expect(graph.state.route).toBe(3);
    apply(graph, setTarget(5, 3));
    expect(graph.state.route).toBe(0);
});

test('set-lattice-display reaches the state, readouts and status of the Vsebina select and the count-label switch', () => {
    const viaAction = after(graph => { apply(graph, setTarget(5, 3)); apply(graph, setDisplay('paths', true)); apply(graph, setDisplay('triangle', true)); });
    const viaControl = after(() => {
        type('T, a', '5'); type('T, b', '3');
        click(t('combinatorics_lattice_show_counts'));
        choose(t('combinatorics_view_label'), 'triangle');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({view: 'triangle', showCounts: true, a: 5, b: 3}));
    const paths = after(graph => { apply(graph, setDisplay('triangle', false)); apply(graph, setDisplay('paths', false)); });
    expect(paths).toEqual(after(() => undefined));
});

const setExpansion = (n: number, c: number): LessonAction => ({kind: 'combinatorics', operation: 'set-expansion', n, c});

test('set-expansion reaches the state, readouts and status of the Vsebina select and the fields n and c', () => {
    for (const [n, c] of [[4, 1], [5, 2], [5, -3], [0, 0], [12, 9], [7, -9]] as const) {
        const viaAction = after(graph => apply(graph, setExpansion(n, c)));
        const viaControl = after(() => {
            choose(t('combinatorics_view_label'), 'expansion');
            type(t('combinatorics_lattice_n_label'), String(n)); type(t('combinatorics_lattice_c_label'), String(c));
        });
        expect({n, c, ...viaAction}).toEqual({n, c, ...viaControl});
        expect(viaAction.state).toEqual(expect.objectContaining({view: 'expansion', n, c}));
    }
});

test('set-expansion leaves the target, route and switches alone', () => {
    const graph = mount();
    apply(graph, setTarget(4, 3));
    apply(graph, setDisplay('paths', true, true));
    apply(graph, setExpansion(5, 2));
    expect(graph.state).toEqual(expect.objectContaining({a: 4, b: 3, route: 0, showCounts: true, split: true, view: 'expansion', n: 5, c: 2}));
});

test('set-lattice-display with split reaches the state, readouts and status of the switch; without split the switch is unchanged', () => {
    const viaAction = after(graph => { apply(graph, setTarget(4, 3)); apply(graph, setDisplay('paths', false, true)); });
    const viaControl = after(() => {
        type('T, a', '4'); type('T, b', '3');
        click(t('combinatorics_lattice_split'));
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({split: true, view: 'paths'}));
    const graph = mount();
    apply(graph, setDisplay('paths', false, true));
    apply(graph, setDisplay('triangle', true));
    expect(graph.state.split).toBe(true);
    apply(graph, setDisplay('paths', false, false));
    expect(graph.state.split).toBe(false);
    apply(graph, setDisplay('paths', false, true));
    expect(graph.state.split).toBe(true);
    apply(graph, setDisplay('paths', false));
    expect(graph.state.split).toBe(true);
});

test('invalid set-expansion and split actions are lesson-content errors and change nothing', () => {
    const graph = mount();
    apply(graph, setExpansion(5, 2));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const bad: LessonAction[] = [
        setExpansion(13, 2), setExpansion(-1, 2), setExpansion(5, 10), setExpansion(5, -10), setExpansion(2.5, 2), setExpansion(5, 0.5),
        setExpansion(Number.NaN, 2), setExpansion(5, Number.POSITIVE_INFINITY), setExpansion(JSON.parse('"5"'), 2),
        {kind: 'combinatorics', operation: 'set-lattice-display', view: 'triangle', showCounts: false, split: JSON.parse('"yes"')},
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
    expect(readouts()).toEqual(beforeReadouts);
});

test('a scene runs its actions in one synchronous sequence: each action reads the state the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setTarget(6, 6));
        capabilities.apply(setDisplay('paths', true));
        capabilities.apply(setTarget(5, 3));
        capabilities.apply(setDisplay('triangle', true));
        capabilities.apply(setExpansion(4, 1));
        capabilities.apply(setDisplay('paths', false, true));
    });
    expect(graph.state).toEqual(expect.objectContaining({a: 5, b: 3, view: 'paths', showCounts: false, route: 0, n: 4, c: 1, split: true}));
    expect(stateOf(graph)).not.toEqual(free);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setTarget(20, 20));
    apply(graph, setDisplay('triangle', true));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its two actions; invalid scene data and the counting graph\'s operation are lesson-content errors and change nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setTarget(2, 2))).toBe(true);
    expect(graph.supportsLessonAction(setDisplay('triangle', true))).toBe(true);
    const countingMode: LessonAction = {kind: 'combinatorics', operation: 'set-counting-mode', view: 'choices', n: 6, k: 3, ordered: true, repetition: false};
    expect(graph.supportsLessonAction(countingMode)).toBe(true); // registered by kind; the graph itself refuses the operation
    apply(graph, setTarget(4, 3));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const bad: LessonAction[] = [
        setTarget(21, 2), setTarget(2, 21), setTarget(-1, 2), setTarget(2, -1), setTarget(1000, 1000),
        setTarget(2.5, 2), setTarget(2, 0.5), setTarget(Number.NaN, 2), setTarget(2, Number.NaN), setTarget(Number.POSITIVE_INFINITY, 2),
        setDisplay(JSON.parse('"expansion"'), false), setDisplay(JSON.parse('"spin"'), false), setDisplay(JSON.parse('7'), false),
        {kind: 'combinatorics', operation: 'set-lattice-display', view: 'paths', showCounts: JSON.parse('"yes"')},
        countingMode,
        {kind: 'combinatorics', operation: JSON.parse('"set-row"')} as unknown as LessonAction,
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
    expect(readouts()).toEqual(beforeReadouts);
});
