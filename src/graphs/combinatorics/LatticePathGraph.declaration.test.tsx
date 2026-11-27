import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {LatticePathGraph, type LatticePathIds} from './LatticePathGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends LatticePathGraph {
    statusLine() { return document.querySelector('[data-combinatorics-status]')?.textContent ?? ''; }
    panelRows() { return [...document.querySelectorAll('[data-readout]')].map(row => [row.getAttribute('data-readout'), row.textContent ?? '']); }
}

const plain = (text: string): string => text.replace(/[   ]/g, ' ');
const FRESH = {view: 'paths', a: 5, b: 3, route: 0, showCounts: false, split: false, n: 5, c: 2};

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...FRESH, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<LatticePathIds>};
}

const PATH_ROWS = ['target', 'count', 'formula', 'route', 'last-right', 'last-up', 'last-sum'];
const TRIANGLE_ROWS = ['entry', 'position', 'parent-left', 'parent-right', 'parents-sum', 'row-sum'];
const EXPANSION_ROWS = ['binomial', 'coefficients', 'coefficient-sum'];

const states: {name: string; state: Record<string, unknown>; params: string[]; actions: string[]; rows: string[]; row: string; value: string; status: string}[] = [
    {name: 'default, target (5, 3)', state: {}, params: ['lattice-a', 'lattice-b'], actions: ['show-counts', 'split'],
        rows: PATH_ROWS, row: 'formula', value: '(8 nad 5) = 56', status: 'Število poti do (5; 3): 56.'},
    {name: 'target (2, 2), route 4', state: {a: 2, b: 2, route: 3}, params: ['lattice-a', 'lattice-b'], actions: ['show-counts', 'split'],
        rows: PATH_ROWS, row: 'route', value: 'DGGD (pot 4 od 6)', status: 'Število poti do (2; 2): 6.'},
    {name: 'target (4, 3), split', state: {a: 4, b: 3, split: true, showCounts: true}, params: ['lattice-a', 'lattice-b'], actions: ['show-counts', 'split'],
        rows: PATH_ROWS, row: 'last-sum', value: '20 + 15 = 35', status: 'Število poti do (4; 3): 35.'},
    {name: 'target (10, 10), over the cap', state: {a: 10, b: 10}, params: ['lattice-a', 'lattice-b'], actions: [],
        rows: ['target', 'count', 'formula', 'last-right', 'last-up', 'last-sum'], row: 'count', value: '184 756', status: 'Poti so narisane samo do 12 korakov'},
    {name: 'triangle, row 8, place 5', state: {view: 'triangle'}, params: ['lattice-a', 'lattice-b'], actions: [],
        rows: TRIANGLE_ROWS, row: 'row-sum', value: '256 = 2⁸', status: 'Vrstica 8, mesto 5: 56 = 35 + 21.'},
    {name: 'triangle edge, row 5, place 5', state: {view: 'triangle', a: 5, b: 0}, params: ['lattice-a', 'lattice-b'], actions: [],
        rows: TRIANGLE_ROWS, row: 'parent-right', value: '–', status: 'Vrstica 5, mesto 5: 1 (rob trikotnika).'},
    {name: 'triangle, row beyond the drawn rows', state: {view: 'triangle', a: 10, b: 10}, params: ['lattice-a', 'lattice-b'], actions: [],
        rows: TRIANGLE_ROWS, row: 'entry', value: '(20 nad 10) = 184 756', status: 'Vrstica 20 je izven prikaza'},
    {name: 'expansion (x + 2)^5', state: {view: 'expansion'}, params: ['lattice-n', 'lattice-c'], actions: [],
        rows: EXPANSION_ROWS, row: 'coefficient-sum', value: '3⁵ = 243', status: '(x + 2)⁵: koeficienti'},
    {name: 'expansion (x − 3)^7', state: {view: 'expansion', n: 7, c: -3}, params: ['lattice-n', 'lattice-c'], actions: [],
        rows: EXPANSION_ROWS, row: 'binomial', value: '(x − 3)⁷', status: '(x − 3)⁷: koeficienti'},
];

describe('Lattice paths declaration', () => {
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
            expect(graph.panelRows().length).toBe(rows.length);
            const shown = declared.find(entry => entry.id === row)!;
            const text = 'kind' in shown.value && shown.value.kind === 'formatted' ? shown.value.text : renderMessage(shown.value as never);
            expect(plain(text)).toBe(value);
            expect(graph.panelRows().some(([, content]) => plain(content ?? '').endsWith(value))).toBe(true);
            expect(current.notes!.map(entry => entry.id)).toEqual(['status']);
            const note = renderMessage(current.notes!.find(entry => entry.id === 'status')!.text);
            expect(note).toBe(graph.statusLine());
            expect(plain(note)).toContain(status);
            expect(current.marks!.must.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the bindings write the steps and the expansion through the typed setters, read them back and refuse the rest', () => {
        const {graph, view} = setup({});
        expect([...graph.parameters!.keys()].filter(key => key.startsWith('lattice-')).sort()).toEqual(['lattice-a', 'lattice-b', 'lattice-c', 'lattice-n']);
        act(() => { graph.parameters!.write('lattice-a', 7, 'learner'); });
        expect(graph.state.a).toBe(7);
        expect(graph.parameters!.read('lattice-a')).toBe(7);
        act(() => { graph.parameters!.write('lattice-b', 2, 'learner'); });
        expect(graph.state.b).toBe(2);
        const kept = graph.state;
        expect(graph.parameters!.write('lattice-a', 2.5, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('lattice-b', 21, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('lattice-b', -1, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('lattice-a', '3' as never, 'learner').status).not.toBe('applied');
        expect(graph.state).toBe(kept);
        act(() => { graph.parameters!.write('lattice-n', 9, 'learner'); });
        expect(graph.state.n).toBe(9);
        act(() => { graph.parameters!.write('lattice-c', -4, 'learner'); });
        expect(graph.state.c).toBe(-4);
        expect(graph.parameters!.read('lattice-c')).toBe(-4);
        expect(graph.parameters!.write('lattice-c', 10, 'learner').status).not.toBe('applied');
        view.unmount();
    });

    test('the switch actions flip the count labels and the split as the learner, and an unknown id is refused', () => {
        const {graph, view} = setup({});
        act(() => graph.performAction('show-counts'));
        expect(graph.state.showCounts).toBe(true);
        expect(graph.getDeclaration()!.actions!.find(action => action.id === 'show-counts')!.pressed).toBe(true);
        act(() => graph.performAction('split'));
        expect(graph.state.split).toBe(true);
        act(() => graph.performAction('split'));
        expect(graph.state.split).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });
});
