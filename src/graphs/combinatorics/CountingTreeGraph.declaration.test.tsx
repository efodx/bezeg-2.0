import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {CountingTreeGraph, type CountingTreeIds} from './CountingTreeGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends CountingTreeGraph {
    statusLine() { return document.querySelector('[data-combinatorics-status]')?.textContent ?? ''; }
    panelRows() { return [...document.querySelectorAll('[data-readout]')].map(row => [row.getAttribute('data-readout'), row.textContent ?? '']); }
}

const plain = (text: string): string => text.replace(/[  ]/g, ' ');
const FRESH = {view: 'choices', n: 6, k: 3, ordered: true, repetition: false, counts: [1, 4, 4, 2], t: 50};

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...FRESH, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<CountingTreeIds>};
}

const states: {name: string; state: Record<string, unknown>; params: string[]; actions: string[]; rows: string[]; row: string; value: string; status: string}[] = [
    {name: 'default, variations 3 of 6', state: {}, params: ['counting-n', 'counting-k'], actions: ['ordered', 'repetition'],
        rows: ['kind', 'count', 'leaves', 'product'], row: 'count', value: '120', status: 'Variacije pri n = 6, k = 3: 120.'},
    {name: 'variations with repetition', state: {repetition: true}, params: ['counting-n', 'counting-k'], actions: ['ordered', 'repetition'],
        rows: ['kind', 'count', 'leaves', 'product'], row: 'product', value: '6 · 6 · 6 = 216', status: 'Variacije s ponavljanjem pri n = 6, k = 3: 216.'},
    {name: 'combinations 3 of 6', state: {ordered: false}, params: ['counting-n', 'counting-k'], actions: ['ordered', 'repetition'],
        rows: ['kind', 'count', 'leaves', 'product', 'orderings', 'division', 'orderings-list'], row: 'division', value: '120 / 6 = 20', status: 'Kombinacije pri n = 6, k = 3: 20.'},
    {name: 'combinations with repetition', state: {n: 4, k: 2, ordered: false, repetition: true}, params: ['counting-n', 'counting-k'], actions: ['ordered', 'repetition'],
        rows: ['kind', 'count', 'leaves'], row: 'count', value: '10', status: 'Kombinacije s ponavljanjem pri n = 4, k = 2: 10.'},
    {name: 'permutations of 5', state: {n: 5, k: 5}, params: ['counting-n', 'counting-k'], actions: ['ordered', 'repetition'],
        rows: ['kind', 'count', 'leaves', 'product'], row: 'count', value: '120', status: 'pri n = 5, k = 5: 120.'},
    {name: 'letters of MISSISSIPPI', state: {view: 'multiset'}, params: [], actions: [],
        rows: ['letters', 'arrangements', 'all-different'], row: 'arrangements', value: '11! / (1! · 4! · 4! · 2!) = 34 650', status: 'Razporeditve 11 črk'},
    {name: 'row 7, place 3', state: {view: 'row', n: 7, k: 3}, params: ['counting-n', 'counting-k', 'counting-t'], actions: [],
        rows: ['row-sum', 'alternating', 'hockey', 'weight', 'weight-sum'], row: 'hockey', value: '(3 nad 3) + (4 nad 3) + (5 nad 3) + (6 nad 3) + (7 nad 3) = 70 = (8 nad 4)',
        status: 'Vrstica 7: vsota 128, izmenična vsota 0.'},
    {name: 'row 10, place 5, weight 0,25', state: {view: 'row', n: 10, k: 5, t: 25}, params: ['counting-n', 'counting-k', 'counting-t'], actions: [],
        rows: ['row-sum', 'alternating', 'hockey', 'weight', 'weight-sum'], row: 'hockey', value: '(5 nad 5) + (6 nad 5) + … + (10 nad 5) = 462 = (11 nad 6)',
        status: 'Vrstica 10: vsota 1 024'},
];

describe('Counting tree declaration', () => {
    for (const {name, state, params, actions, rows, row, value, status} of states) {
        test(`${name}: consistent, the pucks, the rows and the note`, () => {
            const {graph, declaration, view} = setup(state);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect((current.parameters ?? []).map(entry => entry.key)).toEqual(params);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(entry.placement).toBe('board');
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
            }
            expect((current.actions ?? []).map(action => action.id)).toEqual(actions);
            for (const action of current.actions ?? []) expect(renderMessage(action.label).length).toBeLessThanOrEqual(16);
            expect(current.legend ?? []).toEqual([]);
            const declared = current.readouts![0].rows;
            expect(declared.map(entry => entry.id)).toEqual(rows);
            // the panel shows the declared rows' values
            expect(graph.panelRows().map(([id]) => id)).toEqual(rows);
            const shown = declared.find(entry => entry.id === row)!;
            const text = 'kind' in shown.value && shown.value.kind === 'formatted' ? shown.value.text : renderMessage(shown.value as never);
            expect(plain(text)).toBe(value);
            expect(plain(graph.panelRows().find(([id]) => id === row)![1] ?? '').endsWith(value)).toBe(true);
            expect(current.notes!.map(entry => entry.id)).toEqual(['status']);
            const note = renderMessage(current.notes!.find(entry => entry.id === 'status')!.text);
            expect(note).toBe(graph.statusLine());
            expect(plain(note)).toContain(status);
            expect(current.marks!.must.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the bindings write n, k and the weight through the typed setters, read them back and refuse the rest', () => {
        const {graph, view} = setup({});
        expect([...graph.parameters!.keys()].filter(key => key !== 'view').sort()).toEqual(['counting-k', 'counting-n', 'counting-t']);
        act(() => { graph.parameters!.write('counting-n', 8, 'learner'); });
        expect(graph.state.n).toBe(8);
        expect(graph.parameters!.read('counting-n')).toBe(8);
        act(() => { graph.parameters!.write('counting-k', 2, 'learner'); });
        expect(graph.state.k).toBe(2);
        const kept = graph.state;
        expect(graph.parameters!.write('counting-n', 2.5, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('counting-n', 21, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('counting-k', 9, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('counting-n', '3' as never, 'learner').status).not.toBe('applied');
        expect(graph.state).toBe(kept);
        act(() => { graph.parameters!.write('counting-t', 0.25, 'learner'); });
        expect(graph.state.t).toBe(25);
        expect(graph.parameters!.read('counting-t')).toBe(0.25);
        view.unmount();
    });

    test('the switch actions flip order and repetition as the learner, lowering k like the switches, and an unknown id is refused', () => {
        const {graph, view} = setup({n: 3, k: 3});
        act(() => graph.performAction('ordered'));
        expect(graph.state.ordered).toBe(false);
        expect(graph.getDeclaration()!.actions!.find(action => action.id === 'ordered')!.pressed).toBe(false);
        act(() => graph.performAction('repetition'));
        expect(graph.state.repetition).toBe(true);
        act(() => graph.performAction('repetition'));
        expect(graph.state.repetition).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });
});
