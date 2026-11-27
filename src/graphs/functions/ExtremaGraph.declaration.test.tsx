import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ExtremaGraph} from './ExtremaGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Setters = {setExample(value: string): void; setRevealed(value: boolean): void};
const states: {name: string; example: string; writes: Record<string, number>; revealed: boolean; legend: string[]; rows: number; status: string[]}[] = [
    {name: 'default (hidden)', example: 'square', writes: {}, revealed: false, legend: ['function', 'endpoint', 'stationary', 'pieces'], rows: 2 + 3 + 2 + 2, status: ['hidden']},
    {name: 'square revealed', example: 'square', writes: {}, revealed: true, legend: ['function', 'endpoint', 'stationary', 'global', 'pieces'], rows: 9, status: ['revealed']},
    {name: 'cube hidden', example: 'cube', writes: {}, revealed: false, legend: ['function', 'endpoint', 'stationary', 'pieces'], rows: 9, status: ['hidden']},
    {name: 'abs revealed (corner, tie)', example: 'abs', writes: {}, revealed: true, legend: ['function', 'endpoint', 'corner', 'global', 'pieces'], rows: 9, status: ['revealed', 'corner', 'tie']},
    {name: 'sine [-4, 4] hidden', example: 'sine', writes: {}, revealed: false, legend: ['function', 'endpoint', 'stationary', 'pieces'], rows: 2 + 4 + 3 + 2, status: ['hidden']},
    {name: 'sine [0, pi] revealed (tie)', example: 'sine', writes: {'extrema-a': 0, 'extrema-b': Math.PI}, revealed: true, legend: ['function', 'endpoint', 'stationary', 'global', 'pieces'], rows: 2 + 3 + 2 + 2, status: ['revealed', 'tie']},
    {name: 'square a=-0.5, b=1.5 revealed', example: 'square', writes: {'extrema-a': -0.5, 'extrema-b': 1.5}, revealed: true, legend: ['function', 'endpoint', 'stationary', 'global', 'pieces'], rows: 9, status: ['revealed']},
];

describe('Extrema declares through BaseFunctionGraph', () => {
    for (const {name, example, writes, revealed, legend, rows: rowCount, status} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new ExtremaGraph();
            const {view} = mountGraph(graph);
            act(() => {
                runAs('learner', () => (graph as unknown as Setters).setExample(example));
                for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson');
                if (revealed) graph.performAction('show-classification');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([
                ['extrema-a', 'range', 'board'], ['extrema-b', 'range', 'board'],
            ]);
            expect(declaration.actions?.map(action => [action.id, action.pressed, action.puck])).toEqual([['show-classification', revealed, true]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(declaration.formula?.tex).toMatch(/^f\(x\)=/);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows).toHaveLength(rowCount);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.status?.map(line => line.id)).toEqual(status);
            // marks keep the candidates, their labels (above and below the point) and the signs row in sight
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(2 + 2 * 3);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the global rows read skrito until the classification is shown, and the candidate rows add the classification', () => {
        const graph = new ExtremaGraph();
        mountGraph(graph);
        const rowText = (id: string) => {
            const value = Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, row.value]))[id];
            return 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : renderMessage(value as never);
        };
        expect(rowText('global-minimum')).toBe('skrito');
        expect(rowText('candidate-0')).toBe('f = 1, f′ = −2');
        act(() => { graph.performAction('show-classification'); });
        expect(rowText('global-minimum')).toBe('0 pri x = 0');
        expect(rowText('candidate-0')).toBe('f = 1, f′ = −2; lokalni maksimum');
        act(() => { graph.performAction('show-classification'); });
        expect(rowText('global-maximum')).toBe('skrito');
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new ExtremaGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('extrema-b', 1.25, 'learner'); });
        expect(graph.parameters!.read('extrema-b')).toBe(1.25);
        act(() => { graph.parameters!.write('extrema-a', 1.5, 'learner'); }); // a would pass b
        expect(graph.parameters!.read('extrema-a')).toBe(-1);
        act(() => { graph.parameters!.write('extrema-b', 9, 'learner'); }); // outside [-4, 4]
        expect(graph.parameters!.read('extrema-b')).toBe(1.25);
    });
});
