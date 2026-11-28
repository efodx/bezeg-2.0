import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {CorrelationGraph} from './CorrelationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {correlationView, fitCorrelationView, type CorrelationModel} from '../../analysis/correlationModel';
import {GraphPalette} from '../styles/GraphPalette';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenCorrelationGraph extends CorrelationGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
    modelNow(): CorrelationModel { return this.model; }
}

const choice = (value: 'default' | 'outlier' | 'parabola' | 'parabola-right' | 'ring'): LessonAction => ({kind: 'function-choice', name: 'correlation-example', value});
const show = (target: 'correlation-residuals' | 'correlation-x-on-y', visible: boolean): LessonAction => ({kind: 'function-visibility', target, visible});
const set = (index: number, x: number, y: number): LessonAction => ({kind: 'correlation', operation: 'set-point', index, x, y});
const remove = (index: number): LessonAction => ({kind: 'correlation', operation: 'remove-point', index});

const states: {name: string; actions: LessonAction[]}[] = [
    {name: 'default', actions: []},
    {name: 'outlier example', actions: [choice('outlier')]},
    {name: 'parabola', actions: [choice('parabola')]},
    {name: 'ring, x on y', actions: [choice('ring'), show('correlation-x-on-y', true)]},
    {name: 'residuals off', actions: [show('correlation-residuals', false)]},
    {name: 'point moved to (3, 8)', actions: [set(3, 3, 8)]},
    {name: 'two points', actions: [remove(0), remove(0)]},
    {name: 'same x', actions: [set(0, 1, 0), set(1, 1, 1), set(2, 1, 2), set(3, 1, 3)]},
    {name: 'same y', actions: [set(0, 0, 2), set(1, 1, 2), set(2, 2, 2), set(3, 3, 2)]},
];

const ROWS = ['n', 'r', 'r2', 'slope', 'intercept', 'equation', 'ssres', 'identity'];

describe('Correlation declares its panel, two switch pucks and legend', () => {
    for (const {name, actions} of states) {
        test(`${name}: consistent, rows equal the kernel, legend resolves, no caption`, () => {
            const graph = new DrivenCorrelationGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            const model = graph.modelNow();
            expect(declaration.parameters ?? []).toEqual([]);
            expect(declaration.actions?.map(entry => entry.id)).toEqual(['residuals', 'x-on-y']);
            expect(declaration.actions?.map(entry => entry.pressed)).toEqual([model.residuals, model.xOnY]);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(model.xOnY ? [...ROWS, 'xony'] : ROWS);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            // The values come from the kernel, not from the declaration under test.
            const kernel = correlationView(model).result;
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            expect(text('n')).toBe(String(kernel.n));
            expect(text('r')).toBe(kernel.r === undefined ? '—' : formatNumber(kernel.r, 'sl', 5));
            expect(text('slope')).toBe(kernel.yOnX === undefined ? '—' : formatNumber(kernel.yOnX.slope, 'sl', 6));
            // The refusal sentences are a declared status under Odčitki; nothing is left on the board as a caption.
            expect((declaration.status ?? []).length).toBe(correlationView(model).status === 'ok' ? 0 : 1);
            expect(graph.captionPlainLines()).toEqual([]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['points', 'line-y', 'line-x', 'residual']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(graph.drawnObject('points')!.color.toLowerCase()).toBe(GraphPalette.controlPoint.toLowerCase());
            expect(graph.drawnObject('line-y')!.color.toLowerCase()).toBe(GraphPalette.primaryCurve.toLowerCase());
            expect(graph.drawnObject('line-x')!.visible).toBe(model.xOnY && correlationView(model).xOnYLine !== undefined);
            expect(graph.drawnObject('residual')!.visible).toBe(model.residuals && correlationView(model).yOnXLine !== undefined);
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the marks name every point and both ends of the regression line as must', () => {
        const graph = new DrivenCorrelationGraph();
        mountGraph(graph);
        const points = () => graph.getDeclaration()!.marks!.must.flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : []);
        // default data (0,1) (1,2) (2,2) (3,4): the four points and the line y = 0.9x + 0.9 across the fitted view
        const [left, , right] = fitCorrelationView(graph.modelNow().points);
        expect(points()).toEqual(expect.arrayContaining([[0, 1], [1, 2], [2, 2], [3, 4]]));
        for (const x of [left, right]) {
            const end = points().find(([px]) => px === x);
            expect(end, `line end at x = ${x}`).toBeDefined();
            expect(end![1]).toBeCloseTo(0.9 * x + 0.9, 9);
        }
        // a moved point is a mark wherever it is; the x-on-y line adds its ends once shown
        const before = points().length;
        act(() => { graph.applyLessonAction(set(3, 3, 8)); graph.applyLessonAction(show('correlation-x-on-y', true)); });
        expect(points()).toEqual(expect.arrayContaining([[3, 8]]));
        expect(points().length).toBeGreaterThan(before);
    });

    test('the follow box is wide enough for the director to fit every must mark into the strip between the cards (it zooms out at most 2.2 times)', () => {
        const graph = new DrivenCorrelationGraph();
        mountGraph(graph);
        act(() => { graph.applyLessonAction(set(3, 3, 8)); });
        const declaration = graph.getDeclaration()!;
        const xs = declaration.marks!.must.flatMap(mark => mark.kind === 'point' ? [mark.x] : []);
        const ys = declaration.marks!.must.flatMap(mark => mark.kind === 'point' ? [mark.y] : []);
        const span = Math.max(...xs) - Math.min(...xs);
        const [left, top, right, bottom] = declaration.followView!;
        expect(left).toBeLessThanOrEqual(Math.min(...xs));
        expect(right).toBeGreaterThanOrEqual(Math.max(...xs));
        expect(top).toBeGreaterThanOrEqual(Math.max(...ys));
        expect(bottom).toBeLessThanOrEqual(Math.min(...ys));
        expect((right - left) / span).toBeGreaterThanOrEqual(1.5);
    });

    test('the switches are actions: pressed follows the model and performAction flips it', () => {
        const graph = new DrivenCorrelationGraph();
        mountGraph(graph);
        act(() => { graph.performAction('residuals'); });
        expect(graph.modelNow().residuals).toBe(false);
        expect(graph.getDeclaration()!.actions!.find(entry => entry.id === 'residuals')!.pressed).toBe(false);
        act(() => { graph.performAction('x-on-y'); });
        expect(graph.modelNow().xOnY).toBe(true);
        expect(graph.getDeclaration()!.actions!.find(entry => entry.id === 'x-on-y')!.pressed).toBe(true);
        expect(() => graph.performAction('other')).toThrow();
    });
});
