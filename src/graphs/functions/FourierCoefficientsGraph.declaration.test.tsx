import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {FourierCoefficientsGraph} from './FourierCoefficientsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import type {FourierCoefficientsModel} from '../../analysis/fourierCoefficientsModel';
import {fourierProjection} from '../../analysis/fourierCoefficientsModel';
import {fourierSupError} from '../../analysis/fourierDecay';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenFourierGraph extends FourierCoefficientsGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
}

const choice = (name: 'fourier-view' | 'fourier-layout' | 'fourier-term' | 'fourier-selection-1' | 'fourier-selection-2' | 'fourier-scale', value: string): LessonAction => ({kind: 'function-choice', name, value});
const parameter = (name: 'fourier-order' | 'fourier-harmonic' | 'fourier-n' | 'fourier-handle-0' | 'fourier-handle-1', value: number): LessonAction => ({kind: 'function-parameter', name, value});

const states: {name: string; actions: LessonAction[]; decay: boolean}[] = [
    {name: 'default', actions: [], decay: false},
    {name: 'sine coefficient k 3', actions: [choice('fourier-term', 'b'), parameter('fourier-harmonic', 3)], decay: false},
    {name: 'constant term a0', actions: [parameter('fourier-harmonic', 0)], decay: false},
    {name: 'K 6, k 5', actions: [parameter('fourier-order', 6), parameter('fourier-harmonic', 5)], decay: false},
    {name: 'jump layout', actions: [choice('fourier-layout', 'jump'), parameter('fourier-harmonic', 2)], decay: false},
    {name: 'decay default', actions: [choice('fourier-view', 'decay')], decay: true},
    {name: 'decay N 3, other examples', actions: [choice('fourier-view', 'decay'), parameter('fourier-n', 3), choice('fourier-selection-1', 'sawtooth'), choice('fourier-selection-2', 'jump')], decay: true},
];

const PROJECTION_ROWS = ['order', 'selected', 'square-integral', 'parseval', 'seam'];
const DECAY_ROWS = ['n', 'sup-1', 'sup-2', 'sup-3'];

describe('Fourier coefficients declares its panel, pucks and legend', () => {
    for (const {name, actions, decay} of states) {
        test(`${name}: consistent, bound, rows equal the kernel, legend resolves`, () => {
            const graph = new DrivenFourierGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect(declaration.parameters?.map(entry => entry.key)).toEqual(decay ? ['fourier-n'] : ['fourier-order', 'fourier-harmonic', 'fourier-term']);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(decay ? DECAY_ROWS : name === 'constant term a0' ? ['order', 'selected', 'a0', ...PROJECTION_ROWS.slice(2)] : PROJECTION_ROWS);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            // The values come from the kernel, not from the declaration under test.
            const model = (graph as unknown as {model: FourierCoefficientsModel}).model;
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            if (decay) {
                model.selections.forEach((id, slot) => expect(text(`sup-${slot + 1}`)).toBe(formatNumber(fourierSupError(id, model.n), 'sl', 5)));
                expect(text('n')).toBe(String(model.n));
                expect(declaration.legend?.map(entry => entry.id)).toEqual(['f-0', 'sum-0', 'f-1', 'sum-1', 'f-2', 'sum-2']);
            } else {
                const projection = fourierProjection(model);
                expect(text('order')).toBe(String(model.K));
                expect(text('square-integral')).toBe(formatNumber(projection.squareIntegral, 'sl', 5));
                expect(text('parseval')).toBe(formatNumber(projection.parseval, 'sl', 5));
                const constant = model.selected.term === 'a' && model.selected.k === 0;
                expect(text('selected')).toBe(formatNumber(constant ? projection.selectedValue / 2 : projection.selectedValue, 'sl', 5));
                expect(declaration.legend?.map(entry => entry.id)).toEqual(['f', 'harmonic', 'positive', 'negative', 'sum', 'midpoint']);
            }
            for (const entry of declaration.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                // Everything but the midpoint ring (only at a jump) is drawn in the view the declaration describes.
                if (entry.id !== 'midpoint') expect(drawn?.visible, entry.id).toBe(true);
            }
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the midpoint ring is drawn only where f jumps', () => {
        const graph = new DrivenFourierGraph();
        mountGraph(graph);
        expect(graph.drawnObject('midpoint')?.visible).toBe(false);
        act(() => { graph.applyLessonAction(choice('fourier-layout', 'jump')); });
        expect(graph.drawnObject('midpoint')?.visible).toBe(true);
    });

    test('writing through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenFourierGraph();
        mountGraph(graph);
        const model = () => (graph as unknown as {model: FourierCoefficientsModel}).model;
        act(() => { graph.parameters!.write('fourier-order', 8, 'learner'); });
        expect(graph.parameters!.read('fourier-order')).toBe(8);
        expect(model().K).toBe(8);
        act(() => { graph.parameters!.write('fourier-order', 99, 'learner'); });
        expect(graph.parameters!.read('fourier-order')).toBe(8);
        act(() => { graph.parameters!.write('fourier-harmonic', 3, 'learner'); });
        expect(model().selected.k).toBe(3);
        // K may not drop below the chosen harmonic.
        act(() => { graph.parameters!.write('fourier-order', 2, 'learner'); });
        expect(graph.parameters!.read('fourier-order')).toBe(8);
        act(() => { graph.parameters!.write('fourier-term', 'b', 'learner'); });
        expect(graph.parameters!.read('fourier-term')).toBe('b');
        act(() => { graph.parameters!.write('fourier-harmonic', 0, 'learner'); });
        expect(graph.parameters!.read('fourier-harmonic')).toBe(3);
        act(() => { graph.applyLessonAction(choice('fourier-view', 'decay')); graph.parameters!.write('fourier-n', 7, 'learner'); });
        expect(model().n).toBe(7);
    });
});
