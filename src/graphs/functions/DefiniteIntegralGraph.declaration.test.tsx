import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {DefiniteIntegralGraph} from './DefiniteIntegralGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {catalogFunction} from '../../analysis/functions';
import {exactIntegral, riemannSum} from '../../analysis/riemann';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const states: {name: string; writes: Record<string, number | string>}[] = [
    {name: 'default', writes: {}},
    {name: 'ten rectangles', writes: {n: 10}},
    {name: 'midpoint', writes: {'sum-method': 'midpoint', n: 4}},
    {name: 'trapezoid', writes: {'sum-method': 'trapezoid', n: 20}},
    {name: 'reversed bounds', writes: {a: 2, b: 0.5}},
];

describe('Definite integral declares through BaseFunctionGraph', () => {
    for (const {name, writes} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new DefiniteIntegralGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson'); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual([['n', 'board'], ['a', 'board'], ['b', 'board'], ['sum-method', 'board']]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve', 'positive', 'negative', 'point-a', 'point-b']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['a', 'b', 'n', 'h', 'sum', 'exact', 'difference']);
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

    test('the sum, exact and difference rows equal the kernel values for a known state', () => {
        const graph = new DefiniteIntegralGraph();
        mountGraph(graph);
        act(() => { for (const [key, value] of Object.entries({a: 0, b: 2, n: 8, 'sum-method': 'midpoint'})) graph.parameters!.write(key, value, 'lesson'); });
        const square = catalogFunction('square');
        const sum = riemannSum(square, 0, 2, 8, 'midpoint');
        const exact = exactIntegral(square, 0, 2);
        const rows = Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, row.value]));
        const shown = (id: string) => { const v = rows[id]; return 'kind' in v && v.kind === 'number' ? formatNumber(v.value, 'sl', v.maxDecimals) : renderMessage(v as never); };
        expect(shown('sum')).toBe(formatNumber(sum, 'sl', 4));
        expect(shown('exact')).toBe(formatNumber(exact, 'sl', 4));
        expect(shown('difference')).toBe(formatNumber(sum - exact, 'sl', 4));
        expect(shown('sum')).not.toBe(shown('exact'));
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DefiniteIntegralGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('n', 12, 'learner'); });
        expect(graph.parameters!.read('n')).toBe(12);
        act(() => { graph.parameters!.write('sum-method', 'right', 'learner'); });
        expect(graph.parameters!.read('sum-method')).toBe('right');
        act(() => { graph.parameters!.write('sum-method', 'simpson', 'learner'); });
        expect(graph.parameters!.read('sum-method')).toBe('right');
        act(() => { graph.parameters!.write('b', 99, 'learner'); });
        expect(graph.parameters!.read('b')).not.toBe(99);
    });
});
