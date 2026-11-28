import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {EpicycleGraph} from './EpicycleGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../localization';
import {formatNumber} from '../../analysis/format';
import {normalise} from '../base/declare/parity';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const NO_CUBIC = ['controls'];
const LOOP_LEGEND = ['chain', 'circles', 'trace', 'loop', 'polygon', 'vertices', 'controls'];
const OUTLINE_LEGEND = ['chain', 'circles', 'trace', 'loop'];

type Apply = (graph: EpicycleGraph) => void;
const states: {name: string; apply: Apply; rows: string[]; notes: string[]; legend: string[]; status: RegExp; hidden?: string[]}[] = [
    {name: 'default circle, N = 5', apply: () => undefined, rows: ['centre', 'circle-1', 'circle-2', 'circle-3'], notes: ['status'], legend: LOOP_LEGEND, status: /^N = 5; členov: 11; največji vrteči se člen: k = 1, \|cₖ\| = 1,0001/},
    {name: 'circle, N = 0 has no rotating circle', apply: g => g.setN(0), rows: ['centre'], notes: ['status'], legend: LOOP_LEGEND, status: /brez vrtečih se členov/},
    {name: 'circle, N = 1 has two circles', apply: g => g.setN(1), rows: ['centre', 'circle-1', 'circle-2'], notes: ['status'], legend: LOOP_LEGEND, status: /^N = 1; členov: 3;/},
    {name: 'diamond, N = 9', apply: g => { g.setExample('diamond'); g.setN(9); }, rows: ['centre', 'circle-1', 'circle-2', 'circle-3'], notes: ['status'], legend: LOOP_LEGEND, status: /\|cₖ\| = 0,8106/, hidden: NO_CUBIC},
    {name: 'uneven, chord, N = 9', apply: g => { g.setExample('uneven'); g.setParametrization('chord'); g.setN(9); }, rows: ['centre', 'circle-1', 'circle-2', 'circle-3'], notes: ['status'], legend: LOOP_LEGEND, status: /k = -1, \|cₖ\| = 1,7843/},
    {name: 'uneven, N = 50 adds the cap note', apply: g => { g.setExample('uneven'); g.setN(50); }, rows: ['centre', 'circle-1', 'circle-2', 'circle-3'], notes: ['n-cap', 'status'], legend: LOOP_LEGEND, status: /^N = 50; členov: 101;/},
    {name: 'outline of Slovenia has no handles in the legend', apply: g => { g.setExample('slovenia'); g.setN(12); }, rows: ['centre', 'circle-1', 'circle-2', 'circle-3'], notes: ['status'], legend: OUTLINE_LEGEND, status: /^N = 12;/},
];

describe('Epicycles declares the workspace', () => {
    for (const {name, apply, rows, notes, legend, status, hidden = []} of states) {
        test(`${name}: consistent, pucks bound, rows and status follow the model, legend follows the scene`, () => {
            const graph = new EpicycleGraph();
            const {view} = mountGraph(graph);
            act(() => { runAs('lesson', () => apply(graph)); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([
                ['epicycle-n', 'count', 'board'], ['epicycle-parametrization', 'choice', 'board'],
            ]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object)?.visible, entry.id).toBe(!hidden.includes(entry.id));
            const declared = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(declared.map(row => row.id)).toEqual(rows);
            expect(declaration.notes?.map(note => note.id)).toEqual(notes);
            const status$ = declaration.notes!.find(note => note.id === 'status')!;
            expect(normalise(renderMessage(status$.text))).toMatch(status);
            // The panel's sentence is the declared one.
            expect(view.container.querySelector('[data-epicycle-status]')?.textContent).toBe(normalise(renderMessage(status$.text)));
            expect(declaration.marks?.must).toHaveLength(1);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the circle rows are the largest terms by rank: the diamond names k = 1, -3, 5', () => {
        const graph = new EpicycleGraph();
        mountGraph(graph);
        act(() => { runAs('lesson', () => { graph.setExample('diamond'); graph.setN(9); }); });
        const rows = graph.getDeclaration()!.readouts![0].rows;
        expect(rows.map(row => [row.symbol, 'value' in row.value ? formatNumber(row.value.value, 'sl', row.value.maxDecimals) : ''])).toEqual([
            ['|c_0|', '0'], ['|c_{1}|', '0,8106'], ['|c_{-3}|', '0,0901'], ['|c_{5}|', '0,0324'],
        ]);
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new EpicycleGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('epicycle-n', 7, 'learner'); });
        expect(graph.parameters!.read('epicycle-n')).toBe(7);
        act(() => { graph.parameters!.write('epicycle-parametrization', 'chord', 'learner'); });
        expect(graph.parameters!.read('epicycle-parametrization')).toBe('chord');
        act(() => { graph.parameters!.write('epicycle-n', 99, 'learner'); });
    });
});
