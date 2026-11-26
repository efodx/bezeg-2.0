import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ContinuityGraph} from './ContinuityGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const states: {name: string; a: number | undefined; notes: string[]}[] = [
    {name: 'default', a: undefined, notes: []},
    {name: 'continuous (a = 1.5)', a: 1.5, notes: ['corner']},
    {name: 'jump (a = 0)', a: 0, notes: []},
    {name: 'jump (a = 3)', a: 3, notes: []},
];

describe('Continuity declares through BaseFunctionGraph', () => {
    for (const {name, a, notes} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and puck follow the scene`, () => {
            const graph = new ContinuityGraph();
            const {view} = mountGraph(graph);
            if (a !== undefined) act(() => { graph.parameters!.write('a', a, 'lesson'); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual([['a', 'board']]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve', 'value', 'right']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(declaration.notes?.map(note => note.id)).toEqual(notes);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['a', 'value', 'left-limit', 'right-limit', 'jump', 'status', 'left-slope', 'right-slope']);
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
        const graph = new ContinuityGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('a', 1.5, 'learner'); });
        expect(graph.parameters!.read('a')).toBe(1.5);
        act(() => { graph.parameters!.write('a', 7, 'learner'); });
        expect(graph.parameters!.read('a')).toBe(1.5);
    });
});
