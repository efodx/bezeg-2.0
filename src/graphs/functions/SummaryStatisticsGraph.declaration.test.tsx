import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {SummaryStatisticsGraph} from './SummaryStatisticsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {fitSummaryView, summaryStatisticsView, type SummaryModel} from '../../analysis/summaryStatisticsModel';
import {GraphPalette} from '../styles/GraphPalette';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenSummaryGraph extends SummaryStatisticsGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
    modelNow() { return this.model; }
}

const choice = (name: 'summary-example' | 'summary-rule' | 'summary-sigma', value: string): LessonAction => ({kind: 'function-choice', name, value});
const show = (target: 'summary-box-plot' | 'summary-sigma-band', visible: boolean): LessonAction => ({kind: 'function-visibility', target, visible});
const add = (value: number): LessonAction => ({kind: 'summary', operation: 'add-value', value});
const set = (index: number, value: number): LessonAction => ({kind: 'summary', operation: 'set-value', index, value});
const remove = (index: number): LessonAction => ({kind: 'summary', operation: 'remove-value', index});

const states: {name: string; actions: LessonAction[]}[] = [
    {name: 'default', actions: []},
    {name: 'outlier example', actions: [choice('summary-example', 'outlier')]},
    {name: 'even example, exclusive rule', actions: [choice('summary-example', 'even'), choice('summary-rule', 'exclusive')]},
    {name: 'sample sigma, band on', actions: [choice('summary-sigma', 'sample'), show('summary-sigma-band', true)]},
    {name: 'largest moved to 30', actions: [set(6, 30)]},
    {name: 'box plot off', actions: [show('summary-box-plot', false)]},
    {name: 'too few values', actions: [remove(0), remove(0), remove(0), remove(0), remove(0)]},
    {name: 'one value, sample sigma', actions: [remove(0), remove(0), remove(0), remove(0), remove(0), remove(0), choice('summary-sigma', 'sample')]},
];

const ROWS = ['n', 'mean', 'median', 'sigma', 'q1', 'q3', 'iqr', 'fences', 'outliers', 'convention'];

describe('Summary statistics declares its panel, two choice pucks, two switch pucks and legend', () => {
    for (const {name, actions} of states) {
        test(`${name}: consistent, bound, rows equal the kernel, legend resolves, no caption`, () => {
            const graph = new DrivenSummaryGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect(declaration.parameters?.map(entry => entry.key)).toEqual(['summary-rule', 'summary-sigma']);
            expect(declaration.actions?.map(entry => entry.id)).toEqual(['box-plot', 'sigma-band']);
            const model: SummaryModel = graph.modelNow();
            expect(declaration.actions?.map(entry => entry.pressed)).toEqual([model.boxPlot, model.sigmaBand]);
            expect(graph.parameters!.read('summary-rule')).toBe(model.rule);
            expect(graph.parameters!.read('summary-sigma')).toBe(model.sigma);
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
            const kernel = summaryStatisticsView(model);
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            expect(text('n')).toBe(String(kernel.n));
            expect(text('mean')).toBe(formatNumber(kernel.mean, 'sl', 6));
            expect(text('median')).toBe(formatNumber(kernel.median, 'sl', 2));
            expect(text('sigma')).toBe(kernel.sigma === undefined ? '—' : formatNumber(kernel.sigma, 'sl', 4));
            if (kernel.summary.status === 'ok') {
                expect(text('q1')).toBe(formatNumber(kernel.summary.q1, 'sl', 2));
                expect(text('q3')).toBe(formatNumber(kernel.summary.q3, 'sl', 2));
                expect(text('iqr')).toBe(formatNumber(kernel.summary.iqr, 'sl', 2));
            } else {
                expect(text('q1')).toBe('—');
            }
            // The too-few sentence is a declared status shown once under Odčitki; nothing is left on the board as a caption.
            const statuses = declaration.status ?? [];
            if (model.boxPlot && kernel.summary.status === 'too-few') expect(renderMessage(statuses[0].text)).toMatch(/vsaj 3 vrednosti/);
            else expect(statuses).toEqual([]);
            expect(graph.captionPlainLines()).toEqual([]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['values', 'mean', 'median', 'box', 'outlier', 'fence', 'band']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(graph.drawnObject('mean')!.color.toLowerCase()).toBe(GraphPalette.comparisonCurve.toLowerCase());
            expect(graph.drawnObject('box')!.color.toLowerCase()).toBe(GraphPalette.primaryCurve.toLowerCase());
            expect(graph.drawnObject('band')!.visible).toBe(model.sigmaBand && kernel.sigma !== undefined);
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the marks name the dots, the markers, the box with its fences and the band as must', () => {
        const graph = new DrivenSummaryGraph();
        mountGraph(graph);
        const points = () => graph.getDeclaration()!.marks!.must.flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : []);
        // school data 4,5,5,6,6,7,8: the ends of the dots, the mean and median markers, the whiskers and the fences, no band
        expect(points()).toEqual(expect.arrayContaining([[4, 0], [8, 0.35], [2.75, 0.8], [8.75, 2.2]]));
        expect(points().some(([, y]) => y === -1.7)).toBe(false);
        act(() => { graph.applyLessonAction(show('summary-sigma-band', true)); });
        expect(points().some(([, y]) => y === -1.7)).toBe(true);
        act(() => { graph.applyLessonAction(show('summary-box-plot', false)); graph.applyLessonAction(set(6, 30)); });
        // the largest dot is part of the marks wherever it is; with the box off the fences are not
        expect(points()).toEqual(expect.arrayContaining([[30, 0.35]]));
        expect(points().some(([x]) => x === 8.75)).toBe(false);
    });

    test('the frame follows the fitted data, so the lesson scene\'s stored box cannot put the moved dot under a card (step 2: 8 moved to 30)', () => {
        const graph = new DrivenSummaryGraph();
        mountGraph(graph);
        act(() => { graph.applyLessonAction(set(6, 30)); });
        const follow = graph.getDeclaration()!.followView!;
        const fitted = fitSummaryView([4, 5, 5, 6, 6, 7, 30]);
        expect(follow[0]).toBeLessThanOrEqual(fitted[0]);
        expect(follow[2]).toBeGreaterThanOrEqual(fitted[2]);
        expect([follow[1], follow[3]]).toEqual([fitted[1], fitted[3]]);
    });

    test('the follow box is wide enough for the director to fit every must mark into the strip between the cards (it zooms out at most 2.2 times)', () => {
        const graph = new DrivenSummaryGraph();
        mountGraph(graph);
        act(() => { graph.applyLessonAction(set(6, 30)); graph.applyLessonAction(show('summary-sigma-band', true)); graph.applyLessonAction(add(20)); });
        const declaration = graph.getDeclaration()!;
        const xs = declaration.marks!.must.flatMap(mark => mark.kind === 'point' ? [mark.x] : []);
        const span = Math.max(...xs) - Math.min(...xs);
        const [left, , right] = declaration.followView!;
        expect(left).toBeLessThanOrEqual(Math.min(...xs));
        expect(right).toBeGreaterThanOrEqual(Math.max(...xs));
        expect((right - left) / span).toBeGreaterThanOrEqual(1.5);
    });

    test('the switches are actions: pressed follows the model and performAction flips it', () => {
        const graph = new DrivenSummaryGraph();
        mountGraph(graph);
        act(() => { graph.performAction('box-plot'); });
        expect(graph.modelNow().boxPlot).toBe(false);
        expect(graph.getDeclaration()!.actions!.find(entry => entry.id === 'box-plot')!.pressed).toBe(false);
        act(() => { graph.performAction('sigma-band'); });
        expect(graph.modelNow().sigmaBand).toBe(true);
        expect(graph.getDeclaration()!.actions!.find(entry => entry.id === 'sigma-band')!.pressed).toBe(true);
        expect(() => graph.performAction('other')).toThrow();
    });

    test('writing a choice through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenSummaryGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('summary-rule', 'exclusive', 'learner'); });
        expect(graph.modelNow().rule).toBe('exclusive');
        act(() => { graph.parameters!.write('summary-sigma', 'sample', 'learner'); });
        expect(graph.parameters!.read('summary-sigma')).toBe('sample');
        act(() => { graph.parameters!.write('summary-rule', 'other', 'learner'); });
        expect(graph.parameters!.read('summary-rule')).toBe('exclusive');
    });
});
