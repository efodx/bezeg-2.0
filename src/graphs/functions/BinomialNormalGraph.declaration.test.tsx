import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {BinomialNormalGraph} from './BinomialNormalGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {binomialNormalView, type BinomialNormalModel} from '../../analysis/binomialNormalModel';
import {GraphPalette} from '../styles/GraphPalette';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenBinomialNormalGraph extends BinomialNormalGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
    modelNow() { return this.model; }
}

const parameter = (name: 'binomial-n' | 'binomial-p' | 'binomial-k', value: number): LessonAction => ({kind: 'function-parameter', name, value});
const example = (value: string): LessonAction => ({kind: 'function-choice', name: 'binomial-normal-example', value});
const correction = (value: 'on' | 'off'): LessonAction => ({kind: 'function-choice', name: 'binomial-correction', value});
const poisson = (visible: boolean): LessonAction => ({kind: 'function-visibility', target: 'poisson-bars', visible});

const states: {name: string; actions: LessonAction[]; poisson?: boolean; tail?: boolean}[] = [
    {name: 'default', actions: []},
    {name: 'k 12', actions: [parameter('binomial-k', 12)]},
    {name: 'correction off, k 6', actions: [correction('off'), parameter('binomial-k', 6)]},
    {name: 'n 50, k 22', actions: [parameter('binomial-n', 50), parameter('binomial-k', 22)]},
    {name: 'fair100', actions: [example('fair100')]},
    {name: 'rare with Poisson', actions: [example('rare')], poisson: true},
    {name: 'Poisson tail', actions: [parameter('binomial-n', 10), parameter('binomial-p', 0.9), parameter('binomial-k', 9), poisson(true)], poisson: true, tail: true},
    {name: 'p 0.3, k 0', actions: [parameter('binomial-p', 0.3), parameter('binomial-k', 0)]},
];

const ROWS = ['n', 'p', 'mean', 'sigma', 'k', 'exact', 'corrected', 'uncorrected', 'poisson', 'error-corrected', 'error-uncorrected', 'error-poisson'];

describe('Binomial-normal declares its panel, three range pucks, two switch pucks and legend', () => {
    for (const {name, actions, poisson: withPoisson, tail} of states) {
        test(`${name}: consistent, bound, rows equal the kernel, legend resolves, no caption`, () => {
            const graph = new DrivenBinomialNormalGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect(declaration.parameters?.map(entry => entry.key)).toEqual(['binomial-n', 'binomial-p', 'binomial-k']);
            expect(declaration.actions?.map(entry => entry.id)).toEqual(['correction', 'poisson']);
            const model: BinomialNormalModel = graph.modelNow();
            expect(declaration.actions?.map(entry => entry.pressed)).toEqual([model.correction, model.poisson]);
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
            const kernel = binomialNormalView(model);
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            const five = (value: number) => formatNumber(value, 'sl', 5);
            expect(text('exact')).toBe(five(kernel.exact));
            expect(text('corrected')).toBe(five(kernel.corrected));
            expect(text('uncorrected')).toBe(five(kernel.uncorrected));
            expect(text('error-uncorrected')).toBe(five(kernel.uncorrectedError));
            expect(text('mean')).toBe(formatNumber(model.n * model.p, 'sl', 2));
            expect(text('sigma')).toBe(formatNumber(Math.sqrt(model.n * model.p * (1 - model.p)), 'sl', 2));
            expect(text('k')).toBe(formatNumber(model.k, 'sl', 2));
            expect(text('n')).toBe(formatNumber(model.n, 'sl', 2));
            // The tail of the Poisson law is declared and shown once, in the readout panel; nothing is left on the board as a caption.
            const statuses = declaration.status ?? [];
            if (tail) expect(renderMessage(statuses[0].text)).toMatch(/Poissonova porazdelitev ima nad n še verjetnost/);
            else expect(statuses).toEqual([]);
            expect(graph.captionPlainLines()).toEqual([]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['bars', 'shaded', 'normal', 'normal-area', ...(withPoisson ? ['poisson'] : [])]);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(graph.drawnObject('normal')).toEqual({color: GraphPalette.primaryCurve, visible: true});
            expect(graph.drawnObject('normal-area')).toEqual({color: GraphPalette.comparisonCurve, visible: true});
            expect(graph.drawnObject('shaded')).toEqual({color: GraphPalette.additionalCurves[0], visible: true});
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the marks are the normal curve, the bars and, while shown, the Poisson bars', () => {
        const graph = new DrivenBinomialNormalGraph();
        mountGraph(graph);
        expect(graph.getDeclaration()!.marks!.nice?.length).toBe(2);
        act(() => { graph.applyLessonAction(poisson(true)); });
        const marks = graph.getDeclaration()!.marks!;
        expect(marks.nice?.length).toBe(3);
        // B(20; 1/2): the tallest bar is the mass at 10, about 0.176
        const bars = (marks.nice![1] as {kind: "polyline"; points: readonly (readonly [number, number])[]}).points;
        expect(Math.max(...bars.map(([, y]) => y))).toBeCloseTo(0.176, 2);
    });

    test('the marks name the left bars as must, so a card cannot cover them (lesson step 5: B(100; 0,02), Poisson on)', () => {
        const graph = new DrivenBinomialNormalGraph();
        mountGraph(graph);
        act(() => {
            graph.applyLessonAction(example('fair100'));
            graph.applyLessonAction(parameter('binomial-p', 0.02));
            graph.applyLessonAction(parameter('binomial-k', 2));
            graph.applyLessonAction(poisson(true));
        });
        const must = graph.getDeclaration()!.marks!.must;
        // the k = 0 bar, mass (1 - 0.02)^100 = 0.1326, is the tallest thing at the left edge
        const bar0 = must.find(mark => mark.kind === 'point' && Math.abs(mark.x) < 0.5 && Math.abs(mark.y - 0.1326) < 0.002);
        expect(bar0).toBeDefined();
        // and the baseline at the view's left edge, where the normal curve starts
        expect(must.some(mark => mark.kind === 'point' && mark.x <= -0.5 && mark.y === 0)).toBe(true);
        // the frame follows the fitted bars (left of the k = 0 bar), so the lesson scene's stored box cannot decide the view
        const follow = graph.getDeclaration()!.followView!;
        expect(follow).toBeDefined();
        expect(follow[0]).toBeLessThanOrEqual(-0.5);
        expect(follow[1]).toBeGreaterThan(0.27);
    });

    test('the switches are actions: pressed follows the model and performAction flips it', () => {
        const graph = new DrivenBinomialNormalGraph();
        mountGraph(graph);
        act(() => { graph.performAction('correction'); });
        expect(graph.modelNow().correction).toBe(false);
        expect(graph.getDeclaration()!.actions!.find(entry => entry.id === 'correction')!.pressed).toBe(false);
        act(() => { graph.performAction('poisson'); });
        expect(graph.modelNow().poisson).toBe(true);
        expect(graph.getDeclaration()!.actions!.find(entry => entry.id === 'poisson')!.pressed).toBe(true);
        expect(() => graph.performAction('other')).toThrow();
    });

    test('writing through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenBinomialNormalGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('binomial-n', 30, 'learner'); });
        expect(graph.parameters!.read('binomial-n')).toBe(30);
        act(() => { graph.parameters!.write('binomial-k', 20, 'learner'); });
        expect(graph.modelNow().k).toBe(20);
        act(() => { graph.parameters!.write('binomial-p', 0.25, 'learner'); });
        expect(graph.modelNow().p).toBe(0.25);
        // out of range: refused, the model keeps its value
        act(() => { graph.parameters!.write('binomial-k', 31, 'learner'); });
        expect(graph.parameters!.read('binomial-k')).toBe(20);
        act(() => { graph.parameters!.write('binomial-p', 1, 'learner'); });
        expect(graph.parameters!.read('binomial-p')).toBe(0.25);
        act(() => { graph.parameters!.write('binomial-n', 1001, 'learner'); });
        expect(graph.parameters!.read('binomial-n')).toBe(30);
    });
});
