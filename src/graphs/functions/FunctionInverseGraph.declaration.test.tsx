import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {FunctionInverseGraph} from './FunctionInverseGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Writes = Record<string, number | string>;
const states: {name: string; writes: Writes; inverse: boolean; tangent: boolean; params: string[]; legend: string[]}[] = [
    {name: 'default', writes: {}, inverse: true, tangent: true, params: ['inverse-x0', 'inverse-restriction'], legend: ['forward', 'inverse', 'mirror-line', 'connector']},
    {name: 'square, inverse hidden', writes: {'inverse-x0': 1.2}, inverse: false, tangent: false, params: ['inverse-x0', 'inverse-restriction'], legend: ['forward', 'mirror-line', 'connector']},
    {name: 'square x0 = 0 (vertical inverse tangent)', writes: {'inverse-x0': 0}, inverse: true, tangent: true, params: ['inverse-x0', 'inverse-restriction'], legend: ['forward', 'inverse', 'mirror-line', 'connector']},
    {name: 'exponential base 3', writes: {'inverse-restriction': 'exp', 'inverse-base': 3, 'inverse-x0': 0.5}, inverse: true, tangent: true, params: ['inverse-x0', 'inverse-base', 'inverse-restriction'], legend: ['forward', 'inverse', 'mirror-line', 'connector']},
    {name: 'exponential base 0.5, tangents hidden', writes: {'inverse-restriction': 'exp', 'inverse-base': 0.5, 'inverse-x0': -1}, inverse: true, tangent: false, params: ['inverse-x0', 'inverse-base', 'inverse-restriction'], legend: ['forward', 'inverse', 'mirror-line', 'connector']},
    {name: 'natural', writes: {'inverse-restriction': 'natural', 'inverse-x0': 1.5}, inverse: true, tangent: true, params: ['inverse-x0', 'inverse-restriction'], legend: ['forward', 'inverse', 'mirror-line', 'connector']},
];

describe('Function inverse declares through BaseFunctionGraph', () => {
    for (const {name, writes, inverse, tangent, params, legend} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new FunctionInverseGraph();
            const {view} = mountGraph(graph);
            act(() => {
                graph.parameters!.write('inverse-restriction', writes['inverse-restriction'] ?? 'square', 'lesson');
                for (const [key, value] of Object.entries(writes)) if (key !== 'inverse-restriction') graph.parameters!.write(key, value, 'lesson');
                if (!inverse) graph.performAction('inverse');
                if (!tangent) graph.performAction('tangent');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => parameter.key)).toEqual(params);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(declaration.actions?.map(action => [action.id, action.pressed])).toEqual([['inverse', inverse], ['tangent', tangent]]);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.length).toBeGreaterThanOrEqual(8);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            const polyline = declaration.marks?.nice?.[0];
            expect(polyline?.kind).toBe('polyline');
        });
    }

    test('the board puck actions flip the switches the inspector flips', () => {
        const graph = new FunctionInverseGraph();
        mountGraph(graph);
        act(() => { graph.performAction('inverse'); });
        expect(graph.getDeclaration()?.actions?.find(action => action.id === 'inverse')?.pressed).toBe(false);
        expect(graph.getDeclaration()?.legend?.map(entry => entry.id)).not.toContain('inverse');
        act(() => { graph.performAction('tangent'); });
        expect(graph.getDeclaration()?.actions?.find(action => action.id === 'tangent')?.pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new FunctionInverseGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('inverse-x0', 1.5, 'learner'); });
        expect(graph.parameters!.read('inverse-x0')).toBe(1.5);
        act(() => { graph.parameters!.write('inverse-x0', 3.5, 'learner'); });
        expect(graph.parameters!.read('inverse-x0')).toBe(1.5);
        act(() => { graph.parameters!.write('inverse-restriction', 'exp', 'learner'); });
        expect(graph.parameters!.read('inverse-restriction')).toBe('exp');
    });
});
