import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {GrowthGraph, type GrowthIds} from './GrowthGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';
import {DEFAULT_GROWTH_STATE} from '../../recursion/recursionModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends GrowthGraph {
    rows() { return this.readoutRows(); }
    statusLine() { return this.statusText(); }
}

const shown = (value: unknown): string => (value as {text?: string}).text ?? '';

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...DEFAULT_GROWTH_STATE, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<GrowthIds>};
}

/** The pucks of each panel (the 8 bindings), the rows whose value the kernel fixes, and the status sentence. */
const states: {name: string; state: Record<string, unknown>; pucks: string[]; row: string; value: string; status: RegExp}[] = [
    {name: 'arithmetic', state: {}, pucks: ['growth-d', 'growth-n', 'growth-panel'], row: 'nth', value: '21', status: /^Aritmetično zaporedje: a₁₀ = 21 in vsota S₁₀ = 120/},
    {name: 'geometric', state: {kind: 'geometric', a1: 3, q: 20, n: 10}, pucks: ['growth-n', 'growth-panel', 'growth-q'], row: 'ratio', value: '2', status: /^Geometrijsko zaporedje/},
    {name: 'geometric with a limit', state: {kind: 'geometric', a1: 3, q: 5, n: 10}, pucks: ['growth-n', 'growth-panel', 'growth-q'], row: 'ratio', value: '0,5', status: /./},
    {name: 'interest', state: {panel: 'interest', rate: 20}, pucks: ['growth-panel', 'growth-rate', 'growth-years'], row: 'simple', value: '2000', status: /^Po 10 letih: navadno obrestovanje 2000/},
    {name: 'log, exponential', state: {panel: 'log'}, pucks: ['growth-logq', 'growth-model', 'growth-n', 'growth-panel'], row: '', value: '', status: /./},
    {name: 'log, power', state: {panel: 'log', logModel: 'power'}, pucks: ['growth-model', 'growth-n', 'growth-panel'], row: '', value: '', status: /./},
];

const expected: Record<string, string[]> = {
    'arithmetic': ['bars'], 'geometric': ['bars'], 'geometric with a limit': ['bars', 'limit'], 'interest': ['simple', 'compound', 'relative', 'continuous'],
    'log, exponential': ['points', 'chord'], 'log, power': ['points', 'chord'],
};

describe('Growth declaration', () => {
    for (const {name, state, pucks, row, value, status} of states) {
        test(`${name}: consistent, the pucks of the panel, the rows, the status as a note`, () => {
            const {graph, declaration, view} = setup(state);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);

            const params = (current.parameters ?? []).map(entry => entry.key).sort();
            expect(params).toEqual(pucks);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
                if (entry.kind === 'choice') expect(entry.options.length).toBeLessThanOrEqual(4);
            }
            expect(current.actions ?? []).toEqual([]);
            // The curves of the panel are legend entries (no board captions), each resolving to a visible curve; the limit only where the sequence has one.
            const legend = (current.legend ?? []).map(entry => entry.id);
            expect(legend, name).toEqual(expected[name]);
            for (const id of legend) expect(graph.drawnObject(id)?.visible, id).toBe(true);

            const rows = current.readouts![0].rows;
            expect(rows.map(entry => entry.id)).toEqual(graph.rows().map(entry => entry.id));
            if (row) expect(shown(graph.rows().find(entry => entry.id === row)?.value)).toBe(value);
            expect(renderMessage(current.notes!.find(note => note.id === 'status')!.text)).toBe(graph.statusLine());
            expect(graph.statusLine()).toMatch(status);
            expect(current.marks!.must!.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the bindings write, read back and refuse a value outside the range or an unknown option', () => {
        const {graph, view} = setup({});
        const keys = graph.parameters!.keys();
        expect([...keys].filter(key => key !== 'view').sort()).toEqual(['growth-d', 'growth-logq', 'growth-model', 'growth-n', 'growth-panel', 'growth-q', 'growth-rate', 'growth-years']);
        act(() => { graph.parameters!.write('growth-n', 12, 'learner'); });
        expect(graph.parameters!.read('growth-n')).toBe(12);
        expect(graph.state.n).toBe(12);
        act(() => { graph.parameters!.write('growth-d', -3, 'learner'); });
        expect(graph.state.d).toBe(-3);
        act(() => { graph.parameters!.write('growth-panel', 'interest', 'learner'); });
        expect(graph.parameters!.read('growth-panel')).toBe('interest');
        act(() => { graph.parameters!.write('growth-rate', 3.5, 'learner'); });
        expect(graph.state.rate).toBe(7);
        act(() => { graph.parameters!.write('growth-years', 20, 'learner'); });
        expect(graph.state.years).toBe(20);
        act(() => { graph.parameters!.write('growth-panel', 'log', 'learner'); });
        act(() => { graph.parameters!.write('growth-model', 'power', 'learner'); });
        expect(graph.state.logModel).toBe('power');
        act(() => { graph.parameters!.write('growth-model', 'exponential', 'learner'); });
        act(() => { graph.parameters!.write('growth-logq', 1.5, 'learner'); });
        expect(graph.state.logQ).toBe(150);
        const kept = graph.state;
        for (const [key, bad] of [['growth-n', 31], ['growth-d', 21], ['growth-rate', 41], ['growth-years', 0], ['growth-logq', 3.5], ['growth-panel', 'cone'], ['growth-model', 'cone']] as const) {
            expect(graph.parameters!.write(key, bad as never, 'learner').status).not.toBe('applied');
        }
        expect(graph.state).toBe(kept);
        view.unmount();
    });
});
