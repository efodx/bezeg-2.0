import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import LinearProgramGraph from './LinearProgramGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): LinearProgramGraph => {
    const graph = new LinearProgramGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
type Rows = Extract<LessonAction, {kind: 'levelsets'; operation: 'set-constraints'}>['constraints'];
const apply = (graph: LinearProgramGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setObjective = (p: number, q: number): LessonAction => ({kind: 'levelsets', operation: 'set-objective', p, q});
const setConstraints = (constraints: Rows): LessonAction => ({kind: 'levelsets', operation: 'set-constraints', constraints});
const setSweep = (sweep: number): LessonAction => ({kind: 'levelsets', operation: 'set-sweep', sweep});
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const status = () => document.querySelector('[data-lp-status]')?.textContent;
const stateOf = (graph: LinearProgramGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state, the readouts and the status line after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: LinearProgramGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    return result;
}

const typeRow = (n: number, a: string, b: string, c: string) => {
    type(t('levelsets_graph_lp_row_a', {value0: String(n)}), a);
    type(t('levelsets_graph_lp_row_b', {value0: String(n)}), b);
    type(t('levelsets_graph_lp_row_c', {value0: String(n)}), c);
};
const DEGENERATE: Rows = [{a: 1, b: 1, c: 4}, {a: 1, b: 3, c: 6}, {a: 1, b: 0, c: 3}];
const typeDegenerate = () => {
    press(t('levelsets_graph_lp_count_plus'));
    typeRow(1, '1', '1', '4');
    typeRow(2, '1', '3', '6');
    typeRow(3, '1', '0', '3');
};

test('set-objective reaches the state, readouts and status of typing p and q', () => {
    const viaAction = after(graph => apply(graph, setObjective(1, 2)));
    const viaControl = after(() => {
        type(t('levelsets_graph_lp_objective_p'), '1');
        type(t('levelsets_graph_lp_objective_q'), '2');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state).toEqual(expect.objectContaining({objective: {p: 1, q: 2}}));
    expect(viaAction.readouts).toContain('status=' + t('levelsets_graph_lp_status_segment'));
});

test('set-constraints reaches the state, readouts and status of the count and the row fields', () => {
    const viaAction = after(graph => apply(graph, setConstraints(DEGENERATE)));
    expect(viaAction).toEqual(after(typeDegenerate));
    expect(viaAction.state).toEqual(expect.objectContaining({constraints: DEGENERATE}));
    expect(viaAction.readouts).toContain('vertex-count=4');
    const fewer = after(graph => apply(graph, setConstraints([{a: 1, b: 2, c: 8}])));
    expect(fewer).toEqual(after(() => press(t('levelsets_graph_lp_count_minus'))));
});

test('set-sweep reaches the state and readouts of typing the value k', () => {
    const viaAction = after(graph => apply(graph, setSweep(12)));
    expect(viaAction).toEqual(after(() => type(t('levelsets_graph_lp_sweep'), '12')));
    expect(viaAction.state).toEqual(expect.objectContaining({sweep: 12}));
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setConstraints(DEGENERATE));
        capabilities.apply(setObjective(3, 2));
        capabilities.apply(setSweep(11));
        capabilities.apply(setObjective(1, 2));
    });
    expect(graph.state).toEqual(expect.objectContaining({constraints: DEGENERATE, objective: {p: 1, q: 2}, sweep: 11}));
    expect(stateOf(graph)).not.toEqual(free);
    const here = {state: stateOf(graph), readouts: readouts(), status: status()};
    cleanup();
    const viaControl = after(() => {
        typeDegenerate();
        type(t('levelsets_graph_lp_objective_p'), '1');
        type(t('levelsets_graph_lp_objective_q'), '2');
        type(t('levelsets_graph_lp_sweep'), '11');
    });
    expect(viaControl).toEqual(here);
});

test('a row object with an extra field is accepted and the extra field is dropped by parseLpState (only top-level action fields are refused)', () => {
    const graph = mount();
    const extra = [{a: 1, b: 1, c: 4, d: 7}] as unknown as Rows;
    apply(graph, setConstraints(extra));
    expect(stateOf(graph)).toEqual(expect.objectContaining({constraints: [{a: 1, b: 1, c: 4}]}));
    expect(JSON.stringify(graph.state)).not.toContain('"d"');
    expect(after(g => apply(g, setConstraints([{a: 1, b: 1, c: 4}]))).state).toEqual(stateOf(graph));
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setConstraints(DEGENERATE));
    apply(graph, setObjective(1, 1));
    apply(graph, setSweep(-3));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setObjective(1, 2))).toBe(true);
    expect(graph.supportsLessonAction(setConstraints(DEGENERATE))).toBe(true);
    expect(graph.supportsLessonAction(setSweep(3))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setObjective(1, 1));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const beforeStatus = status();
    const bad: LessonAction[] = [
        setObjective(10, 1), setObjective(1, -10), setObjective(1.5, 1), setObjective(Number.NaN, 1), setObjective(JSON.parse('"2"'), 1),
        setConstraints([]), setConstraints(Array.from({length: 6}, () => ({a: 1, b: 1, c: 1}))), setConstraints([{a: 0, b: 0, c: 1}]),
        setConstraints([{a: 10, b: 1, c: 1}]), setConstraints([{a: 1, b: 1, c: 31}]), setConstraints([{a: 1, b: 1.5, c: 1}]), setConstraints(JSON.parse('"rows"')),
        setConstraints(JSON.parse('[{"a": 1, "b": 1}]')), setSweep(101), setSweep(-101), setSweep(0.5), setSweep(Number.POSITIVE_INFINITY), setSweep(JSON.parse('null')),
        {kind: 'levelsets', operation: 'set-function', id: 'bowl'} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-objective', p: 1, q: 1, sweep: 2} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-sweep', sweep: 2, p: 1} as unknown as LessonAction,
        {kind: 'levelsets', operation: 'set-constraints', constraints: [{a: 1, b: 1, c: 1}], objective: {p: 1, q: 1}} as unknown as LessonAction,
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(/^levelsets[ :]/);
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
        expect(status(), label).toEqual(beforeStatus);
    }
    expect(() => apply(graph, setObjective(10, 1))).toThrow(/levelsets set-objective: objective[.]p out-of-range/);
    expect(() => apply(graph, setConstraints([{a: 0, b: 0, c: 1}]))).toThrow(/levelsets set-constraints: constraints\[0\] zero-row/);
});
