import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {GrowthPanel, SequenceKind} from '../../recursion/recursionModel';
import {GrowthGraph} from './GrowthGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): GrowthGraph => {
    const graph = new GrowthGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
type MapAction = Extract<LessonAction, {kind: 'recursion'; operation: 'set-map'}>;
type ParamsAction = Extract<LessonAction, {kind: 'recursion'; operation: 'set-params'}>;
type InterestAction = Extract<LessonAction, {kind: 'recursion'; operation: 'set-interest'}>;
const apply = (graph: GrowthGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMap = (fields: Omit<MapAction, 'kind' | 'operation'>): LessonAction => ({kind: 'recursion', operation: 'set-map', ...fields});
const setParams = (fields: Omit<ParamsAction, 'kind' | 'operation'>): LessonAction => ({kind: 'recursion', operation: 'set-params', ...fields});
const setInterest = (fields: Omit<InterestAction, 'kind' | 'operation'>): LessonAction => ({kind: 'recursion', operation: 'set-interest', ...fields});
/** The typed field of a control: a slider's exact field is named "<label>, vrednost" and shares the label with its range input. */
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const choose = (label: string, value: string) => act(() => { fireEvent.change(screen.getByRole('combobox', {name: label}), {target: {value}}); });
const panel = (value: GrowthPanel) => choose(t('recursion_graph_growth_panel_label'), value);
const kind = (value: SequenceKind) => choose(t('recursion_graph_growth_kind_label'), value);
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-recursion-status]')?.textContent;
const stateOf = (graph: GrowthGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state, the readouts and the status line after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: GrowthGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

test('set-map reaches the state, readouts and status of choosing the panel and the kind in the lists', () => {
    const geometric = after(graph => apply(graph, setMap({sequence: 'geometric'})));
    expect(geometric).toEqual(after(() => kind('geometric')));
    expect(geometric.state).toEqual(expect.objectContaining({panel: 'sequence', kind: 'geometric'}));

    const interest = after(graph => apply(graph, setMap({panel: 'interest'})));
    expect(interest).toEqual(after(() => panel('interest')));
    expect(interest.state).toEqual(expect.objectContaining({panel: 'interest'}));

    const both = after(graph => apply(graph, setMap({panel: 'log', sequence: 'geometric'})));
    expect(both.state).toEqual(expect.objectContaining({panel: 'log', kind: 'geometric'}));
    expect(after(graph => apply(graph, setMap({}))).state).toEqual(after(() => undefined).state);
});

test('set-params reaches the state, readouts and status of typing into the sequence fields', () => {
    const arithmetic = after(graph => apply(graph, setParams({a1: 5, d: -3, n: 8})));
    const arithmeticControl = after(() => {
        type(t('recursion_graph_growth_a1_label'), '5');
        type(t('recursion_graph_growth_d_label'), '-3');
        type(t('recursion_graph_growth_n_label'), '8');
    });
    expect(arithmetic).toEqual(arithmeticControl);
    expect(arithmetic.state).toEqual(expect.objectContaining({a1: 5, d: -3, n: 8}));

    const geometric = after(graph => { apply(graph, setMap({sequence: 'geometric'})); apply(graph, setParams({q: 5, n: 10})); });
    const geometricControl = after(() => {
        kind('geometric');
        type(t('recursion_graph_growth_q_label'), '0,5');
        type(t('recursion_graph_growth_n_label'), '10');
    });
    expect(geometric).toEqual(geometricControl);
    expect(geometric.state).toEqual(expect.objectContaining({kind: 'geometric', q: 5, n: 10}));
});

test('set-interest reaches the state, readouts and status of typing into the interest fields', () => {
    const viaAction = after(graph => { apply(graph, setMap({panel: 'interest'})); apply(graph, setInterest({capital: 2000, rate: 7, years: 20, parts: 4})); });
    const viaControl = after(() => {
        panel('interest');
        type(t('recursion_graph_growth_capital_label'), '2000');
        type(t('recursion_graph_growth_rate_label'), '3,5');
        type(t('recursion_graph_growth_years_label'), '20');
        choose(t('recursion_graph_growth_parts_label'), '4');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({panel: 'interest', capital: 2000, rate: 7, years: 20, parts: 4}));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMap({sequence: 'geometric'}));
        capabilities.apply(setParams({a1: 3, q: 20, n: 10}));
        capabilities.apply(setParams({q: 5}));
        capabilities.apply(setMap({panel: 'interest'}));
        capabilities.apply(setInterest({years: 20, parts: 1}));
    });
    expect(graph.state).toEqual(expect.objectContaining({panel: 'interest', kind: 'geometric', q: 5, years: 20, parts: 1}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    const viaControl = after(() => {
        kind('geometric');
        type(t('recursion_graph_growth_q_label'), '2');
        type(t('recursion_graph_growth_q_label'), '0,5');
        panel('interest');
        type(t('recursion_graph_growth_years_label'), '20');
        choose(t('recursion_graph_growth_parts_label'), '1');
    });
    expect(viaControl).toEqual(here);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMap({sequence: 'geometric'}));
    apply(graph, setParams({q: 5}));
    apply(graph, setMap({panel: 'interest'}));
    apply(graph, setInterest({rate: 4}));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMap({panel: 'interest'}))).toBe(true);
    expect(graph.supportsLessonAction(setParams({a1: 1}))).toBe(true);
    expect(graph.supportsLessonAction(setInterest({capital: 1}))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setParams({a1: 4, d: 3}));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const bad: LessonAction[] = [
        setMap({panel: JSON.parse('"cobweb"')}), setMap({sequence: JSON.parse('"harmonic"')}), setMap({panel: JSON.parse('3')}),
        setParams({a1: 101}), setParams({a1: 1.5}), setParams({d: 21}), setParams({q: 31}), setParams({q: 2.5}), setParams({n: 0}), setParams({n: 31}),
        setParams({a1: Number.NaN}), setParams({n: Number.POSITIVE_INFINITY}), setParams({d: JSON.parse('"2"')}),
        setParams({a1: 7, n: 31}), // one bad field refuses the whole action: a1 stays 4
        setInterest({capital: 0}), setInterest({capital: 100001}), setInterest({rate: 0}), setInterest({rate: 81}), setInterest({rate: 2.5}),
        setInterest({years: 41}), setInterest({years: 0}), setInterest({parts: 3}), setInterest({parts: 366}), setInterest({parts: JSON.parse('"12"')}),
        {kind: 'recursion', operation: 'set-start', x: 1} as unknown as LessonAction,
        {kind: 'recursion', operation: 'set-params', capital: 5} as unknown as LessonAction,
        {kind: 'recursion', operation: 'set-params', panel: 'interest'} as unknown as LessonAction,
        {kind: 'recursion', operation: 'set-interest', a1: 5} as unknown as LessonAction,
        {kind: 'recursion', operation: 'set-map', n: 5} as unknown as LessonAction,
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow();
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
});
