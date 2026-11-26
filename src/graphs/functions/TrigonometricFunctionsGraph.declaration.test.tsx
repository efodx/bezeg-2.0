import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TrigonometricFunctionsGraph} from './TrigonometricFunctionsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {amplitude, formatPhase, formatWithPi, period, phaseShift, valueRange} from '../../analysis/trigonometric';
import type {LessonAction} from '../../learning/model';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const states: {name: string; writes: Record<string, number>; fn: string; reference: boolean}[] = [
    {name: 'default', writes: {}, fn: 'sin', reference: false},
    {name: 'amplitude and omega', writes: {A: 2, omega: 2}, fn: 'sin', reference: false},
    {name: 'phase and midline', writes: {phi: Math.PI / 2, B: 1}, fn: 'cos', reference: false},
    {name: 'tan', writes: {omega: 0.5}, fn: 'tan', reference: false},
    {name: 'reference shown', writes: {A: -1.5}, fn: 'sin', reference: true},
];

const shown = (value: unknown) => {
    const v = value as {kind?: string; value: number; maxDecimals?: number; text?: string};
    if (v.kind === 'formatted') return v.text!;
    return v.kind === 'number' ? formatNumber(v.value, 'sl', v.maxDecimals) : renderMessage(value as never);
};

describe('Trigonometric functions declares through BaseFunctionGraph', () => {
    for (const {name, writes, fn, reference} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new TrigonometricFunctionsGraph();
            const {view} = mountGraph(graph);
            act(() => {
                (graph as unknown as {applyLessonAction(action: LessonAction): void}).applyLessonAction({kind: 'function-choice', name: 'trig-function', value: fn});
                for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson');
                if (reference) graph.performAction('reference');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual(
                [['A', 'board'], ['omega', 'board'], ['phi', 'board'], ['B', 'board']]);
            expect(declaration.actions?.map(action => [action.id, action.pressed])).toEqual([['reference', reference]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(reference ? ['curve', 'midline', 'reference'] : ['curve', 'midline']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['equation', 'A', 'omega', 'phase-value', 'B', 'phi', 'amplitude', 'period', 'shift', 'range']);
            for (const row of rows) {
                expect(view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent, row.id).toBe(shown(row.value));
            }
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('amplitude, period, shift and range rows equal the kernel values for known A, omega, phi and B', () => {
        const graph = new TrigonometricFunctionsGraph();
        mountGraph(graph);
        act(() => {
            graph.parameters!.write('A', 2, 'lesson'); graph.parameters!.write('omega', 2, 'lesson');
            graph.parameters!.write('phi', Math.PI / 2, 'lesson'); graph.parameters!.write('B', 1, 'lesson');
        });
        const p = {fn: 'sin' as const, A: 2, omega: 2, phi: Math.PI / 2, B: 1};
        const rows = Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, shown(row.value)]));
        expect(rows.amplitude).toBe(formatNumber(amplitude(p)!, 'sl'));
        expect(rows.period).toBe(formatWithPi(period(p), 'sl'));
        expect(rows.shift).toBe(formatWithPi(phaseShift(p), 'sl'));
        const range = valueRange(p)!;
        expect(rows.range).toBe(`[${formatNumber(range[0], 'sl')}; ${formatNumber(range[1], 'sl')}]`);
        expect(rows['phase-value']).toBe(formatPhase(p.phi, 'sl'));
        expect([rows.A, rows.omega, rows.B]).toEqual(['2', '2', '1']);
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new TrigonometricFunctionsGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('omega', 2, 'learner'); });
        expect(graph.parameters!.read('omega')).toBe(2);
        act(() => { graph.parameters!.write('A', 99, 'learner'); });
        expect(graph.parameters!.read('A')).toBe(1);
    });
});
