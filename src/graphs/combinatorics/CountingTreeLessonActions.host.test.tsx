import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {CountingTreeGraph} from './CountingTreeGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): CountingTreeGraph => {
    const graph = new CountingTreeGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: CountingTreeGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const choices = (n: number, k: number, ordered: boolean, repetition: boolean): LessonAction =>
    ({kind: 'combinatorics', operation: 'set-counting-mode', view: 'choices', n, k, ordered, repetition});
const multiset = (counts: readonly [number, number, number, number]): LessonAction => ({kind: 'combinatorics', operation: 'set-counting-mode', view: 'multiset', counts});
/** The typed field of a control: a slider's exact field is named "<label>, vrednost" and shares the label with its range input. */
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const choose = (label: string, value: string) => act(() => { fireEvent.change(field(label), {target: {value}}); });
const click = (label: string) => act(() => { fireEvent.click(field(label)); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-combinatorics-status]')?.textContent;
const stateOf = (graph: CountingTreeGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
const nLabel = () => t('combinatorics_counting_n_label');
const kLabel = () => t('combinatorics_counting_k_label');

/** The state, the readouts, the status line and the drawn figure after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: CountingTreeGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status(), drawn: graph.drawnKey(), table: graph.table().map(row => String(row.count))};
    cleanup();
    return result;
}

test('set-counting-mode (choices) reaches the state, readouts and figure of the n and k fields and the two switches', () => {
    // The controls are used in an order that never makes k exceed n on the way (a smaller n would lower k).
    const cases: [number, number, boolean, boolean, () => void][] = [
        [3, 2, true, false, () => { type(nLabel(), '3'); type(kLabel(), '2'); }],
        [5, 5, true, false, () => { type(nLabel(), '5'); type(kLabel(), '5'); }],
        [6, 3, true, true, () => { click(t('combinatorics_counting_repetition')); }],
        [4, 3, true, true, () => { click(t('combinatorics_counting_repetition')); type(nLabel(), '4'); }],
        [6, 3, false, false, () => { click(t('combinatorics_counting_ordered')); }],
    ];
    for (const [n, k, ordered, repetition, control] of cases) {
        const viaAction = after(graph => apply(graph, choices(n, k, ordered, repetition)));
        const viaControl = after(control);
        expect({n, k, ordered, repetition, ...viaAction}).toEqual({n, k, ordered, repetition, ...viaControl});
        expect(viaAction.state).toEqual(expect.objectContaining({view: 'choices', n, k, ordered, repetition}));
    }
});

test('set-counting-mode (multiset) reaches the state and readouts of the Vsebina select and the four letter counts', () => {
    const viaAction = after(graph => apply(graph, multiset([2, 3, 1, 4])));
    const viaControl = after(() => {
        choose(t('combinatorics_view_label'), 'multiset');
        ['M', 'I', 'S', 'P'].forEach((letter, kind) => type(t('combinatorics_counting_letter_count', {value0: letter}), String([2, 3, 1, 4][kind])));
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({view: 'multiset', counts: [2, 3, 1, 4]}));
    // The multiset view keeps the choices values it left, as the select does; going back is a choices action.
    const back = after(graph => { apply(graph, multiset([1, 4, 4, 2])); apply(graph, choices(6, 3, true, false)); });
    expect(back).toEqual(after(() => undefined));
});

test('a scene runs its actions in one synchronous sequence: each action reads the state the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(choices(4, 4, true, false));
        capabilities.apply(choices(6, 3, true, true));
        capabilities.apply(multiset([1, 4, 4, 2]));
        capabilities.apply(choices(4, 3, true, true));
    });
    expect(graph.state).toEqual(expect.objectContaining({view: 'choices', n: 4, k: 3, ordered: true, repetition: true}));
    expect(graph.drawnKey()).not.toBe('choices-table'); // 4^3 = 64 leaves draw the tree
    expect(stateOf(graph)).not.toEqual(free);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, choices(5, 5, true, false));
    apply(graph, multiset([2, 2, 2, 2]));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports the action; invalid scene data and the lattice graph\'s operations are lesson-content errors and change nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(choices(6, 3, true, false))).toBe(true);
    expect(graph.supportsLessonAction(multiset([1, 4, 4, 2]))).toBe(true);
    apply(graph, choices(4, 3, false, false));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const bad: LessonAction[] = [
        choices(21, 3, true, false), choices(6, 21, true, true), choices(-1, 0, true, false), choices(6, -1, true, false),
        choices(3, 4, true, false), // k above n without repetition
        choices(2.5, 2, true, false), choices(6, 1.5, true, false), choices(Number.NaN, 2, true, false), choices(6, Number.NaN, true, false),
        choices(6, 3, JSON.parse('"yes"'), false),
        {kind: 'combinatorics', operation: 'set-counting-mode', view: JSON.parse('"row"'), n: 6, k: 3, ordered: true, repetition: false} as unknown as LessonAction,
        {kind: 'combinatorics', operation: 'set-counting-mode', view: JSON.parse('"spin"')} as unknown as LessonAction,
        multiset([21, 1, 1, 1]), multiset([1, -1, 1, 1]), multiset([1, 1.5, 1, 1]), multiset([1, 1, Number.NaN, 1]),
        {kind: 'combinatorics', operation: 'set-counting-mode', view: 'multiset', counts: JSON.parse('[1,2,3]')} as unknown as LessonAction,
        {kind: 'combinatorics', operation: 'set-target', a: 2, b: 2},
        {kind: 'combinatorics', operation: 'set-lattice-display', view: 'triangle', showCounts: true},
        {kind: 'combinatorics', operation: 'set-expansion', n: 5, c: 2},
        {kind: 'combinatorics', operation: JSON.parse('"set-row"')} as unknown as LessonAction,
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
    expect(readouts()).toEqual(beforeReadouts);
});
