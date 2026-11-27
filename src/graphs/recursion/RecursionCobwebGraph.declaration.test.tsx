import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {RecursionCobwebGraph, type CobwebIds} from './RecursionCobwebGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';
import {DEFAULT_COBWEB_STATE} from '../../recursion/recursionModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends RecursionCobwebGraph {
    rows() { return this.readoutRows(); }
    statusLine() { return this.statusText(); }
}

const shown = (value: unknown): string => (value as {text?: string}).text ?? '';

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...DEFAULT_COBWEB_STATE, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<CobwebIds>};
}

/** The pucks of each map, a row whose value the kernel fixes, and the status sentence. */
const states: {name: string; state: Record<string, unknown>; pucks: string[]; row: string; value: string; status: RegExp; help: boolean}[] = [
    {name: 'line', state: {}, pucks: ['cobweb-c', 'cobweb-m', 'cobweb-map', 'cobweb-x'], row: 'fixed', value: '2', status: /^Negibna točka x\* = 2 je privlačna/, help: true},
    {name: 'line, spiral, step 4', state: {M: -16, C: 90, X: 100, step: 4}, pucks: ['cobweb-c', 'cobweb-m', 'cobweb-map', 'cobweb-x'], row: 'slope', value: '−0,8', status: /Po 4 korakih je x₄ = 3,3616/, help: true},
    {name: 'line, repelling', state: {M: -24, C: 100, X: 460, step: 4}, pucks: ['cobweb-c', 'cobweb-m', 'cobweb-map', 'cobweb-x'], row: 'steps', value: '', status: /odbojna/, help: true},
    {name: 'line, 2-cycle', state: {M: -20, C: 100, X: 460, step: 3}, pucks: ['cobweb-c', 'cobweb-m', 'cobweb-map', 'cobweb-x'], row: 'fixed', value: '5', status: /^Dvojni cikel/, help: true},
    {name: 'line, no fixed point', state: {M: 20, C: 100}, pucks: ['cobweb-c', 'cobweb-m', 'cobweb-map', 'cobweb-x'], row: '', value: '', status: /^Negibne točke ni/, help: true},
    {name: 'cosine', state: {map: 'cosine', step: 8}, pucks: ['cobweb-map', 'cobweb-x'], row: 'map', value: '', status: /^Pri kosinusu/, help: false},
    {name: 'logistic', state: {map: 'logistic', R: 15, X: 10}, pucks: ['cobweb-map', 'cobweb-r', 'cobweb-x'], row: 'rate', value: '1,5', status: /^Negibna točka x\* = 0,333333 je privlačna/, help: true},
    {name: 'logistic, extinction', state: {map: 'logistic', R: 8, X: 10, step: 11}, pucks: ['cobweb-map', 'cobweb-r', 'cobweb-x'], row: 'rate', value: '0,8', status: /^Izumrtje/, help: true},
    {name: 'line, far iterates', state: {M: -60, C: 100, X: 1000, step: 60}, pucks: ['cobweb-c', 'cobweb-m', 'cobweb-map', 'cobweb-x'], row: '', value: '', status: /./, help: true},
];

describe('Cobweb declaration', () => {
    for (const {name, state, pucks, row, value, status, help} of states) {
        test(`${name}: consistent, the pucks of the map, the rows, the status as a note`, () => {
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

            const rows = current.readouts![0].rows;
            expect(rows.map(entry => entry.id)).toEqual(graph.rows().map(entry => entry.id));
            if (row && value) expect(shown(graph.rows().find(entry => entry.id === row)?.value)).toBe(value);
            expect(renderMessage(current.notes!.find(note => note.id === 'status')!.text)).toBe(graph.statusLine());
            expect(graph.statusLine()).toMatch(status);
            expect(current.notes!.some(note => note.id === 'help')).toBe(help);
            // The director keeps the start, the fixed point and the first iterates clear of the cards (a few, so the set stays small); the frame it follows holds them and the origin.
            const must = (current.marks?.must ?? []).flatMap(mark => (mark.kind === 'point' ? [mark] : []));
            expect(current.marks?.must.length).toBe(must.length);
            expect(must.length).toBeGreaterThan(0);
            expect(must.length).toBeLessThanOrEqual(2 * 6 + 2);
            const derived = graph.derived();
            expect(must).toContainEqual({kind: 'point', x: derived.x0, y: derived.x0});
            const [left, top, right, bottom] = current.followView!;
            for (const mark of must) {
                expect(mark.x >= left && mark.x <= right && mark.y >= bottom && mark.y <= top).toBe(true);
            }
            expect(graph.getDeclaration()!.marks).toBe(current.marks);
            view.unmount();
        });
    }

    test('the bindings write, read back and refuse a value outside the range or an unknown option', () => {
        const {graph, view} = setup({});
        const keys = graph.parameters!.keys();
        expect([...keys].filter(key => key !== 'view').sort()).toEqual(['cobweb-c', 'cobweb-m', 'cobweb-map', 'cobweb-r', 'cobweb-x']);
        act(() => { graph.parameters!.write('cobweb-m', -0.8, 'learner'); });
        expect(graph.parameters!.read('cobweb-m')).toBe(-0.8);
        expect(graph.state.M).toBe(-16);
        act(() => { graph.parameters!.write('cobweb-c', 9, 'learner'); });
        expect(graph.state.C).toBe(90);
        act(() => { graph.parameters!.write('cobweb-x', 1, 'learner'); });
        expect(graph.state.X).toBe(100);
        act(() => { graph.parameters!.write('cobweb-map', 'logistic', 'learner'); });
        expect(graph.parameters!.read('cobweb-map')).toBe('logistic');
        expect(graph.state.X).toBe(10);
        act(() => { graph.parameters!.write('cobweb-r', 2.5, 'learner'); });
        expect(graph.state.R).toBe(25);
        const kept = graph.state;
        for (const [key, bad] of [['cobweb-m', 3.5], ['cobweb-c', 11], ['cobweb-r', 3], ['cobweb-x', 1], ['cobweb-map', 'cone']] as const) {
            expect(graph.parameters!.write(key, bad as never, 'learner').status).not.toBe('applied');
        }
        expect(graph.state).toBe(kept);
        view.unmount();
    });
});
