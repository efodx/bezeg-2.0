import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {EulerGraph} from './EulerGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber, formatSignificant} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {eulerView, type EulerModel} from '../../analysis/eulerModel';
import {ERROR_DISPLAY_DIGITS} from '../../analysis/quadratureModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenEulerGraph extends EulerGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
}

const choice = (name: 'euler-example' | 'euler-step', value: string): LessonAction => ({kind: 'function-choice', name, value});
const parameter = (name: 'euler-end' | 'euler-x0' | 'euler-y0', value: number): LessonAction => ({kind: 'function-parameter', name, value});

const states: {name: string; actions: LessonAction[]}[] = [
    {name: 'default', actions: []},
    {name: 'step 0.25', actions: [choice('euler-step', '0.25')]},
    {name: 'step 0.0625, end 2', actions: [choice('euler-step', '0.0625'), parameter('euler-end', 2)]},
    {name: 'blow-up stops before the end', actions: [choice('euler-example', 'blow-up'), parameter('euler-end', 3)]},
    {name: 'end at x0', actions: [parameter('euler-end', 0)]},
    {name: 'linear relaxation, step 0.125', actions: [choice('euler-example', 'linear-relaxation'), choice('euler-step', '0.125')]},
];

const ROWS = ['h', 'steps', 'end', 'value', 'exact', 'error', 'double-error', 'ratio'];

describe('Euler declares its panel, step, end, equation and legend', () => {
    for (const {name, actions} of states) {
        test(`${name}: consistent, bound, rows equal the kernel, legend resolves`, () => {
            const graph = new DrivenEulerGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect(declaration.parameters?.map(entry => entry.key).sort()).toEqual(['euler-end', 'euler-example', 'euler-step']);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(ROWS);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            // The values come from the kernel, not from the declaration under test.
            const model = (graph as unknown as {model: EulerModel}).model;
            const kernel = eulerView(model);
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            const precise = (value: number | undefined) => value === undefined ? 'ni' : formatNumber(value, 'sl', 4);
            const significant = (value: number | undefined, digits: number) => value === undefined ? 'ni' : formatSignificant(value, 'sl', digits);
            expect(text('steps')).toBe(String(kernel.stepsTaken));
            expect(text('value')).toBe(precise(kernel.endValue));
            expect(text('exact')).toBe(precise(kernel.exact));
            expect(text('error')).toBe(significant(kernel.error, ERROR_DISPLAY_DIGITS));
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['field', 'polyline', 'exact', 'initial']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            // The polyline needs at least one step: at the end x = x0 there is nothing to draw.
            expect(graph.drawnObject('polyline')?.visible).toBe(kernel.stepsTaken > 0);
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the end of a blow-up run is not reached: no Euler value, no error', () => {
        const graph = new DrivenEulerGraph();
        const {view} = mountGraph(graph);
        act(() => { graph.applyLessonAction(choice('euler-example', 'blow-up')); graph.applyLessonAction(parameter('euler-end', 3)); });
        const model = (graph as unknown as {model: EulerModel}).model;
        expect(eulerView(model).endValue).toBeUndefined();
        expect(view.container.querySelector('[data-readout="value"] dd')?.textContent).toBe('ni');
    });

    test('writing through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenEulerGraph();
        mountGraph(graph);
        const model = () => (graph as unknown as {model: EulerModel}).model;
        act(() => { graph.parameters!.write('euler-step', 2, 'learner'); });
        expect(graph.parameters!.read('euler-step')).toBe(2);
        expect(model().step).toBe(0.25);
        act(() => { graph.parameters!.write('euler-step', 9, 'learner'); });
        expect(graph.parameters!.read('euler-step')).toBe(2);
        act(() => { graph.parameters!.write('euler-end', 2.5, 'learner'); });
        expect(graph.parameters!.read('euler-end')).toBe(2.5);
        act(() => { graph.parameters!.write('euler-end', 99, 'learner'); });
        expect(graph.parameters!.read('euler-end')).toBe(2.5);
        act(() => { graph.parameters!.write('euler-example', 'linear-relaxation', 'learner'); });
        expect(graph.parameters!.read('euler-example')).toBe('linear-relaxation');
    });
});
