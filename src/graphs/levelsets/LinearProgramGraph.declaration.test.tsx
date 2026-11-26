import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {LinearProgramGraph, type LinearProgramIds} from './LinearProgramGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Row = {a: number; b: number; c: number};
const dflt: Row[] = [{a: 1, b: 2, c: 8}, {a: 3, b: 1, c: 9}];

function setup(constraints: Row[], p: number, q: number, sweep: number) {
    const graph = new LinearProgramGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => {
        graph.applyLevelSetsAction({kind: 'levelsets', operation: 'set-constraints', constraints});
        graph.applyLevelSetsAction({kind: 'levelsets', operation: 'set-objective', p, q});
        graph.applyLevelSetsAction({kind: 'levelsets', operation: 'set-sweep', sweep});
    }));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<LinearProgramIds>};
}

const ALL = ['region', 'rows', 'vertex', 'optimum', 'objective', 'sweep', 'direction', 'walk'];
const states:{name: string; constraints: Row[]; p: number; q: number; sweep: number; row: string; value: string; status: string; puck: boolean; legend: string[]}[] = [
    {name: 'default', constraints: dflt, p: 3, q: 2, sweep: 9, row: 'optimum', value: '12', puck: true, legend: ALL,
        status: 'Največja vrednost 12 je v oglišču (2; 3) (točno).'},
    {name: 'sweep at 6', constraints: dflt, p: 3, q: 2, sweep: 6, row: 'sweep', value: '3x + 2y = 6', puck: true, legend: ALL,
        status: 'Največja vrednost 12 je v oglišču (2; 3) (točno).'},
    {name: 'segment of optima', constraints: dflt, p: 1, q: 2, sweep: 8, row: 'status', value: 'optimalna daljica', puck: true, legend: ALL,
        status: 'Največja vrednost 8 je na vsej daljici od (0; 4) do (2; 3); optimumov je neskončno (točno).'},
    {name: 'unbounded', constraints: [{a: 1, b: -1, c: 2}], p: 1, q: 1, sweep: 0, row: 'ray', value: '(1; 1)', puck: true, legend: ['region', 'rows', 'vertex', 'sweep', 'direction', 'clip'],
        status: 'Cilj ni omejen: v smeri (1; 1) raste brez meje (točno).'},
    {name: 'infeasible', constraints: [{a: 1, b: 1, c: -1}], p: 1, q: 1, sweep: 0, row: 'region', value: 'prazno', puck: true, legend: ['rows', 'sweep', 'direction'],
        status: 'Dopustnega območja ni: omejitveni pogoji se izključujejo (točno).'},
    {name: 'flat objective: no line, no sweep puck', constraints: dflt, p: 0, q: 0, sweep: 0, row: 'status', value: 'cilj je povsod 0', puck: false, legend: ['region', 'rows', 'vertex', 'direction', 'walk'],
        status: 'Kriterijska funkcija je povsod 0, zato je optimalna vsaka dopustna točka (točno).'},
];

describe('Linear program declaration', () => {
    for (const {name, constraints, p, q, sweep, row, value, status, puck, legend} of states) {
        test(`${name}: consistent, the rows of the panel, the status as a note`, () => {
            const {graph, declaration, view} = setup(constraints, p, q, sweep);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);

            // one range puck, the sweep value k, only while the objective has a line
            expect((current.parameters ?? []).map(entry => entry.key)).toEqual(puck ? ['lp-sweep'] : []);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(entry).toMatchObject({kind: 'range', placement: 'board', min: -100, max: 100, step: 1});
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
                expect(graph.parameters!.read(entry.key)).toBe(sweep);
            }
            expect(current.actions ?? []).toEqual([]);
            // the legend card names what is drawn now: each entry is a drawn object, the wording is the panel's former legend
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(legend);
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(graph.legend().map(entry => entry.id));
            for (const entry of current.legend ?? []) {
                expect(graph.drawnObject(entry.object)).toMatchObject({visible: true});
                expect(renderMessage(entry.label)).toBe(graph.legend().find(candidate => candidate.id === entry.id)!.text);
            }
            expect(graph.drawnObject('nothing')).toBeUndefined();

            // the declared rows are the panel's rows, with the values of the model
            const rows = current.readouts![0].rows;
            expect(rows.map(entry => entry.id)).toEqual(graph.readoutRows().map(entry => entry.id));
            expect(graph.readoutRows().find(entry => entry.id === row)?.value).toBe(value);
            expect(renderMessage(current.notes!.find(note => note.id === 'summary')!.text)).toBe(status);
            expect(graph.statusText()).toBe(status);
            view.unmount();
        });
    }

    test('the sweep puck writes, reads back and refuses a value off the range', () => {
        const {graph, view} = setup(dflt, 3, 2, 9);
        act(() => { graph.parameters!.write('lp-sweep', 12, 'learner'); });
        expect(graph.parameters!.read('lp-sweep')).toBe(12);
        expect(graph.state.sweep).toBe(12);
        expect(graph.parameters!.write('lp-sweep', 101, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('lp-sweep', 2.5, 'learner').status).not.toBe('applied');
        expect(graph.state.sweep).toBe(12);
        view.unmount();
    });
});
