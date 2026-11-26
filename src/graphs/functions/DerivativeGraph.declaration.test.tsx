import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {DerivativeGraph} from './DerivativeGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {catalogFunction} from '../../analysis/functions';
import {differenceQuotient} from '../../analysis/derivative';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const states: {name: string; writes: Record<string, number>; tangent: boolean}[] = [
    {name: 'default', writes: {}, tangent: false},
    {name: 'half step', writes: {h: 0.5}, tangent: false},
    {name: 'smallest step', writes: {h: 0.01}, tangent: false},
    {name: 'negative step', writes: {h: -0.5, x0: 2}, tangent: false},
    {name: 'tangent shown', writes: {x0: -1, h: 1}, tangent: true},
];

describe('Derivative declares through BaseFunctionGraph', () => {
    for (const {name, writes, tangent} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new DerivativeGraph();
            const {view} = mountGraph(graph);
            act(() => {
                for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson');
                if (tangent) graph.performAction('tangent');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual([['h', 'board'], ['x0', 'board']]);
            expect(declaration.actions?.map(action => [action.id, action.pressed])).toEqual([['tangent', tangent]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(tangent ? ['curve', 'secant', 'tangent', 'point-p', 'point-q'] : ['curve', 'secant', 'point-p', 'point-q']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(graph.drawnObject('tangent')?.visible).toBe(tangent);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['x0', 'h', 'f-x0', 'f-x0h', 'quotient', 'derivative', 'difference']);
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

    test('the quotient, f(x_0) and f(x_0 + h) rows equal the kernel values for a known x0 and h', () => {
        const graph = new DerivativeGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('x0', 1.5, 'lesson'); graph.parameters!.write('h', 0.25, 'lesson'); });
        const square = catalogFunction('square');
        const rows = Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, row.value]));
        const shown = (id: string) => { const v = rows[id]; return 'kind' in v && v.kind === 'number' ? formatNumber(v.value, 'sl', v.maxDecimals) : renderMessage(v as never); };
        expect(shown('quotient')).toBe(formatNumber(differenceQuotient(square, 1.5, 0.25), 'sl', 4));
        expect(shown('f-x0')).toBe(formatNumber(square.value(1.5), 'sl', 4));
        expect(shown('f-x0h')).toBe(formatNumber(square.value(1.75), 'sl', 4));
        expect(shown('derivative')).toBe(formatNumber(square.derivative(1.5), 'sl', 4));
    });

    test('a write through the arbiter changes the model and reads back; a step at zero moves to the band edge; a refused value changes nothing', () => {
        const graph = new DerivativeGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('x0', 1.5, 'learner'); });
        expect(graph.parameters!.read('x0')).toBe(1.5);
        act(() => { graph.parameters!.write('h', 0, 'learner'); });
        expect(Math.abs(graph.parameters!.read('h') as number)).toBe(0.01);
        act(() => { graph.parameters!.write('h', 5, 'learner'); });
        expect(graph.parameters!.read('h')).not.toBe(5);
    });
});
