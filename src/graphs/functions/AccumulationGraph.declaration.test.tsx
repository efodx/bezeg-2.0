import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {AccumulationGraph} from './AccumulationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {accumulation} from '../../analysis/accumulation';
import {catalogFunction} from '../../analysis/functions';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Writes = Record<string, number>;
const states: {name: string; writes: Writes; shown: boolean; status: string; fn?: string}[] = [
    {name: 'default (A hidden)', writes: {}, shown: false, status: 'hidden'},
    {name: 'A shown', writes: {}, shown: true, status: 'rising'},
    {name: 'x = pi, flat', writes: {'accum-x': Math.PI}, shown: true, status: 'flat'},
    {name: 'x left of a', writes: {'accum-a': 2, 'accum-x': -1}, shown: true, status: 'reversed'},
    {name: 'x = a, empty', writes: {'accum-x': 0}, shown: true, status: 'empty'},
    {name: 'exp, hidden', writes: {'accum-a': -2, 'accum-x': 1}, shown: false, fn: 'exp', status: 'hidden'},
];

describe('Accumulation declares through BaseFunctionGraph', () => {
    for (const {name, writes, shown, fn, status} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new AccumulationGraph();
            const {view} = mountGraph(graph);
            act(() => {
                if (fn) runAs('learner', () => (graph as unknown as {setFunction(value: string): void}).setFunction(fn));
                for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson');
                if (shown) graph.performAction('show-accumulation');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual([['accum-a', 'board'], ['accum-x', 'board']]);
            expect(declaration.actions?.map(action => [action.id, action.pressed, action.puck])).toEqual([['show-accumulation', shown, true]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(shown ? ['function', 'accumulation', 'tangent', 'positive', 'negative'] : ['function', 'positive', 'negative']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(graph.drawnObject('accumulation')?.visible).toBe(shown);
            expect(graph.drawnObject('tangent')?.visible).toBe(shown);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['a', 'x', 'f-x', 'signed-integral', 'slope', 'above-axis', 'below-axis']);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.status?.map(line => line.id)).toContain(status);
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(3);
            expect(declaration.marks?.nice?.length).toBe(shown ? 2 : 1);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the readout values equal the kernel values for a known a and x, and say hidden while A is hidden', () => {
        const graph = new AccumulationGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('accum-a', 0, 'lesson'); graph.parameters!.write('accum-x', 2, 'lesson'); });
        const rowText = (id: string) => {
            const value = Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, row.value]))[id];
            return 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : renderMessage(value as never);
        };
        expect(rowText('signed-integral')).toBe('skrito');
        act(() => { graph.performAction('show-accumulation'); });
        expect(rowText('signed-integral')).toBe(formatNumber(accumulation(catalogFunction('sin'), 0, 2), 'sl', 4));
        expect(rowText('slope')).toBe(formatNumber(Math.sin(2), 'sl', 4));
    });

    test('a write through the arbiter changes the model and reads back; a value outside the range changes nothing', () => {
        const graph = new AccumulationGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('accum-a', -1.5, 'learner'); });
        expect(graph.parameters!.read('accum-a')).toBe(-1.5);
        act(() => { graph.parameters!.write('accum-x', 3, 'learner'); });
        expect(graph.parameters!.read('accum-x')).toBe(3);
        act(() => { graph.parameters!.write('accum-x', 99, 'learner'); });
        expect(graph.parameters!.read('accum-x')).toBe(3);
    });
});
