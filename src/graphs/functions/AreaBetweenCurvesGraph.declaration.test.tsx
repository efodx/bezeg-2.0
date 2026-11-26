import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {AreaBetweenCurvesGraph} from './AreaBetweenCurvesGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const states: {name: string; writes: Record<string, number | string>; notes: string[]}[] = [
    {name: 'default (between)', writes: {}, notes: ['intersections']},
    {name: 'under f', writes: {'area-mode': 'under-f', a: 0, b: 4}, notes: ['intersections']},
    {name: 'under g', writes: {'area-mode': 'under-g', a: -1, b: 5}, notes: ['intersections']},
    {name: 'reversed bounds', writes: {a: 3, b: 1}, notes: ['intersections', 'reversed']},
];

describe('Area between curves declares through BaseFunctionGraph', () => {
    for (const {name, writes, notes} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new AreaBetweenCurvesGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson'); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual([['a', 'board'], ['b', 'board'], ['area-mode', 'board']]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['f', 'g', 'positive', 'negative']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(graph.drawnObject('f')).toMatchObject({visible: true});
            expect(declaration.notes?.map(note => note.id)).toEqual(notes);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['a', 'b', 'int-f', 'int-g', 'signed', 'unsigned', 'shaded']);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            expect(declaration.marks?.must.map(mark => mark.kind)).toEqual(['point', 'point', 'point', 'point']);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new AreaBetweenCurvesGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('area-mode', 'under-g', 'learner'); });
        expect(graph.parameters!.read('area-mode')).toBe('under-g');
        act(() => { graph.parameters!.write('area-mode', 'nonsense', 'learner'); });
        expect(graph.parameters!.read('area-mode')).toBe('under-g');
        act(() => { graph.parameters!.write('a', 1, 'learner'); });
        expect(graph.parameters!.read('a')).toBe(1);
        act(() => { graph.parameters!.write('a', 999, 'learner'); });
        expect(graph.parameters!.read('a')).toBe(1);
    });
});
