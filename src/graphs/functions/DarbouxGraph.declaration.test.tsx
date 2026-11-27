import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {DarbouxGraph} from './DarbouxGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Writes = Record<string, number>;
const states: {name: string; writes: Writes; lower: boolean; upper: boolean; status: string; example?: string}[] = [
    {name: 'default (both sums shown)', writes: {}, lower: true, upper: true, status: 'trapped'},
    {name: 'both hidden', writes: {}, lower: false, upper: false, status: 'hidden'},
    {name: 'only lower shown', writes: {}, lower: true, upper: false, status: 'hidden'},
    {name: 'only upper shown', writes: {}, lower: false, upper: true, status: 'hidden'},
    {name: 'a=0.5, b=1.5, n=8', writes: {'darboux-a': 0.5, 'darboux-b': 1.5, 'darboux-n': 8}, lower: true, upper: true, status: 'trapped'},
    {name: 'sine [0, pi] n=1', writes: {'darboux-b': Math.PI, 'darboux-n': 1}, example: 'sine', lower: true, upper: true, status: 'trapped'},
    {name: 'n at the limit', writes: {'darboux-n': 128}, lower: true, upper: true, status: 'limit'},
];

describe('Darboux declares through BaseFunctionGraph', () => {
    for (const {name, writes, lower, upper, example, status} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new DarbouxGraph();
            const {view} = mountGraph(graph);
            act(() => {
                if (example) runAs('learner', () => (graph as unknown as {setExample(value: string): void}).setExample(example));
                for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson');
                if (!lower) graph.performAction('show-lower-sum');
                if (!upper) graph.performAction('show-upper-sum');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([
                ['darboux-a', 'range', 'board'], ['darboux-b', 'range', 'board'], ['darboux-n', 'count', 'board'],
            ]);
            expect(declaration.actions?.map(action => [action.id, action.pressed, action.puck])).toEqual([['show-lower-sum', lower, true], ['show-upper-sum', upper, true]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['function', ...(lower ? ['lower'] : []), ...(upper ? ['upper'] : []), 'partition']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(graph.drawnObject('lower')?.visible).toBe(lower);
            expect(graph.drawnObject('upper')?.visible).toBe(upper);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['a', 'b', 'n', 'lower', 'upper', 'integral', 'gap']);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.status?.map(line => line.id)).toContain(status);
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(4);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('a hidden sum reads skrito in the declared rows and gives its value after the switch puck', () => {
        const graph = new DarbouxGraph();
        mountGraph(graph);
        const rowText = (id: string) => {
            const value = Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, row.value]))[id];
            return 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : renderMessage(value as never);
        };
        expect(rowText('upper')).toBe('3,75');
        act(() => { graph.performAction('show-upper-sum'); });
        expect(rowText('upper')).toBe('skrito');
        expect(rowText('gap')).toBe('skrito');
        act(() => { graph.performAction('show-upper-sum'); });
        expect(rowText('gap')).toBe('2');
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DarbouxGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('darboux-b', 1.25, 'learner'); });
        expect(graph.parameters!.read('darboux-b')).toBe(1.25);
        act(() => { graph.parameters!.write('darboux-a', 1.5, 'learner'); }); // a would pass b
        expect(graph.parameters!.read('darboux-a')).toBe(0);
        act(() => { graph.parameters!.write('darboux-n', 2.5, 'learner'); }); // not a whole number
        expect(graph.parameters!.read('darboux-n')).toBe(4);
    });
});
