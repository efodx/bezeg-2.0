import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {FourierSeriesGraph} from './FourierSeriesGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {fourierGibbsPeak, fourierPartialSum, fourierTarget, type FourierSeriesModel} from '../../analysis/fourierSeriesModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenFourierGraph extends FourierSeriesGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
}

const choice = (value: string): LessonAction => ({kind: 'function-choice', name: 'fourier-example', value});
const parameter = (name: 'fourier-n' | 'fourier-x' | 'fourier-epsilon', value: number): LessonAction => ({kind: 'function-parameter', name, value});

const states: {name: string; actions: LessonAction[]}[] = [
    {name: 'default', actions: []},
    {name: 'N 1', actions: [parameter('fourier-n', 1), parameter('fourier-x', 1.57)]},
    {name: 'even N 100', actions: [parameter('fourier-n', 100), parameter('fourier-x', 1.57)]},
    {name: 'at the jump x 0', actions: [parameter('fourier-x', 0)]},
    {name: 'epsilon 0.02, x 2.5', actions: [parameter('fourier-epsilon', 0.02), parameter('fourier-x', 2.5)]},
    {name: 'sawtooth N 40', actions: [choice('sawtooth'), parameter('fourier-n', 40), parameter('fourier-x', -2)]},
    {name: 'N 1001', actions: [parameter('fourier-n', 1001), parameter('fourier-x', 0.05)]},
];

const ROWS = ['n', 'order', 'terms', 'x', 'epsilon', 'sum', 'target', 'error', 'jump-left', 'jump-right', 'peak-x', 'peak-value', 'overshoot', 'overshoot-limit'];

describe('Fourier series declares its panel, puck and legend', () => {
    for (const {name, actions} of states) {
        test(`${name}: consistent, bound, rows equal the kernel, legend resolves`, () => {
            const graph = new DrivenFourierGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect(declaration.parameters?.map(entry => entry.key)).toEqual(['fourier-n']);
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
            const model = (graph as unknown as {model: FourierSeriesModel}).model;
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            expect(text('n')).toBe(String(model.n));
            expect(text('sum')).toBe(formatNumber(fourierPartialSum(model.example, model.n, model.x), 'sl', 5));
            expect(text('target')).toBe(formatNumber(fourierTarget(model.example, model.x), 'sl', 4));
            expect(text('peak-value')).toBe(formatNumber(fourierGibbsPeak(model.example, model.n).value, 'sl', 5));
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['sum', 'target', 'jump', 'band', 'error', 'peak', 'window']);
            const errorShown = Math.abs(fourierTarget(model.example, model.x) - fourierPartialSum(model.example, model.n, model.x)) > 0;
            for (const entry of declaration.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn?.visible, entry.id).toBe(entry.id === 'error' ? errorShown : true);
            }
            expect(view.container.querySelector('.function-legend')).toBeNull();
            // Both curves the learner compares are marked, so the view director keeps them in view.
            expect(declaration.marks?.nice?.length).toBe(2);
        });
    }

    test('writing through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenFourierGraph();
        mountGraph(graph);
        const model = () => (graph as unknown as {model: FourierSeriesModel}).model;
        act(() => { graph.parameters!.write('fourier-n', 51, 'learner'); });
        expect(graph.parameters!.read('fourier-n')).toBe(51);
        expect(model().n).toBe(51);
        act(() => { graph.parameters!.write('fourier-n', 1002, 'learner'); });
        expect(graph.parameters!.read('fourier-n')).toBe(51);
        act(() => { graph.parameters!.write('fourier-n', 2.5, 'learner'); });
        expect(model().n).toBe(51);
    });
});
