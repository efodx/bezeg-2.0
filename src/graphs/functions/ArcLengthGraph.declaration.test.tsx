import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ArcLengthGraph} from './ArcLengthGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const states: {name: string; writes: Record<string, number>}[] = [
    {name: 'default', writes: {}},
    {name: 'one segment', writes: {n: 1}},
    {name: 'many segments', writes: {n: 40}},
    {name: 'narrow interval', writes: {a: 1, b: 1.5, n: 3}},
    {name: 'reversed endpoints', writes: {a: 2.5, b: 0.5, n: 5}},
];

describe('Arc length declares through BaseFunctionGraph', () => {
    for (const {name, writes} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new ArcLengthGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson'); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual([['n', 'board'], ['a', 'board'], ['b', 'board']]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve', 'polyline', 'point-a', 'point-b']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['a', 'b', 'n', 'polyline', 'arc', 'difference']);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            expect(declaration.marks?.must.map(mark => mark.kind)).toEqual(['point', 'point']);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new ArcLengthGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('n', 7, 'learner'); });
        expect(graph.parameters!.read('n')).toBe(7);
        act(() => { graph.parameters!.write('b', 99, 'learner'); });
        expect(graph.parameters!.read('b')).not.toBe(99);
        act(() => { graph.parameters!.write('a', 0.25, 'learner'); });
        expect(graph.parameters!.read('a')).toBe(0.25);
    });
});
