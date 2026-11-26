import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {LinearFunctionGraph} from './LinearFunctionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {lineThroughPoints} from '../../analysis/linear';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class Observed extends LinearFunctionGraph {
    point(index: 0 | 1, x: number, y: number) { runAs('lesson', () => this.setPoint(index, x, y)); }
    modelNow() { return this.model; }
}

const shown = (value: unknown) => {
    const v = value as {kind?: string; value: number; maxDecimals?: number};
    return v.kind === 'number' ? formatNumber(v.value, 'sl', v.maxDecimals) : renderMessage(value as never);
};
const rowsOf = (declaration: GraphDeclaration) => (declaration.readouts ?? []).flatMap(group => [...group.rows]);

const states: {name: string; run: (graph: Observed) => void; knPucks: boolean; legend: string[]}[] = [
    {name: 'default', run: () => undefined, knPucks: true, legend: ['line', 'triangle', 'intercept', 'point-p1', 'point-p2']},
    {name: 'P1 moved', run: g => g.point(0, -2, 3), knPucks: true, legend: ['line', 'triangle', 'intercept', 'point-p1', 'point-p2']},
    {name: 'k written', run: g => g.parameters!.write('k', 2, 'lesson'), knPucks: true, legend: ['line', 'triangle', 'intercept', 'point-p1', 'point-p2']},
    {name: 'n written', run: g => g.parameters!.write('n', -1.5, 'lesson'), knPucks: true, legend: ['line', 'triangle', 'intercept', 'point-p1', 'point-p2']},
    {name: 'vertical', run: g => g.point(1, g.modelNow().x1, g.modelNow().y1 + 2), knPucks: false, legend: ['line', 'triangle', 'point-p1', 'point-p2']},
    {name: 'coincident', run: g => g.point(1, g.modelNow().x1, g.modelNow().y1), knPucks: false, legend: ['point-p1', 'point-p2']},
];

describe('Linear function declares through BaseFunctionGraph', () => {
    for (const {name, run, knPucks, legend} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new Observed();
            const {view} = mountGraph(graph);
            act(() => run(graph));
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect((declaration.parameters ?? []).map(parameter => [parameter.key, parameter.placement])).toEqual(knPucks ? [['k', 'board'], ['n', 'board']] : []);
            expect(declaration.actions ?? []).toEqual([]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            const rows = rowsOf(declaration);
            expect(rows.map(row => row.id)).toEqual(['equation', 'k', 'n', 'dx', 'dy']);
            for (const row of rows) expect(view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent, row.id).toBe(shown(row.value));
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the k, n, dx and dy rows equal the kernel values for known points', () => {
        const graph = new Observed();
        mountGraph(graph);
        act(() => { graph.point(0, -1, 1); graph.point(1, 3, 5); });
        const line = lineThroughPoints({x: -1, y: 1}, {x: 3, y: 5});
        if (line.kind !== 'line') throw new Error('expected a line');
        const rows = Object.fromEntries(rowsOf(graph.getDeclaration()!).map(row => [row.id, shown(row.value)]));
        expect([rows.k, rows.n, rows.dx, rows.dy]).toEqual([line.k, line.n, 4, 4].map(value => formatNumber(value, 'sl')));
        const must = graph.getDeclaration()!.marks!.must;
        expect(must.length).toBe(4);
    });

    test('a write through the arbiter changes the model and reads back; a vertical line has no slope to write', () => {
        const graph = new Observed();
        mountGraph(graph);
        act(() => { graph.parameters!.write('k', 2, 'learner'); });
        expect(graph.parameters!.read('k')).toBe(2);
        act(() => { graph.point(1, graph.modelNow().x1, graph.modelNow().y1 + 2); });
        expect(Number.isNaN(graph.parameters!.read('k') as number)).toBe(true);
    });
});
