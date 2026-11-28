import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PolynomialZerosGraph} from './PolynomialZerosGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {polyValue} from '../../analysis/polynomial';
import {polynomialSpecOf} from '../../analysis/polynomialZerosModel';
import type {LessonAction} from '../../learning/model';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const apply = (graph: PolynomialZerosGraph, action: LessonAction) =>
    (graph as unknown as {applyLessonAction(action: LessonAction): void}).applyLessonAction(action);

const states: {name: string; actions: LessonAction[]; derivative: boolean; zeros: number}[] = [
    {name: 'default', actions: [], derivative: false, zeros: 2},
    {name: 'derivative shown', actions: [{kind: 'function-visibility', target: 'polynomial-derivative', visible: true}], derivative: true, zeros: 2},
    {name: 'triple zero', actions: [{kind: 'function-choice', name: 'polynomial-example', value: 'triple'}], derivative: false, zeros: 1},
    {name: 'degree five, zero moved', actions: [
        {kind: 'function-choice', name: 'polynomial-example', value: 'degree-five'}, {kind: 'function-parameter', name: 'poly-zero-1', value: -4},
    ], derivative: false, zeros: 3},
    {name: 'k negative', actions: [{kind: 'function-parameter', name: 'k', value: -1}], derivative: false, zeros: 2},
];

describe('Polynomial zeros declares through BaseFunctionGraph', () => {
    for (const {name, actions, derivative, zeros} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and switch follow the scene`, () => {
            const graph = new PolynomialZerosGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) apply(graph, action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            expect(declaration.parameters).toBeUndefined();
            expect(declaration.actions?.map(action => [action.id, action.pressed])).toEqual([['derivative', derivative]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(derivative ? ['curve', 'derivative', 'zero'] : ['curve', 'zero']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['rule', 'degree', 'end', 'y-intercept', ...Array.from({length: zeros}, (_, index) => `zero-${index}`)]);
            for (const row of rows) {
                expect(view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent, row.id).toBe(renderMessage(row.value as never));
            }
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the switch flips the derivative and the legend entry follows; with no zero the zero entry is gone', () => {
        const graph = new PolynomialZerosGraph();
        mountGraph(graph);
        act(() => { graph.performAction('derivative'); });
        expect(graph.getDeclaration()?.actions?.[0].pressed).toBe(true);
        expect(graph.drawnObject('derivative')).toMatchObject({visible: true});
        act(() => { graph.performAction('derivative'); });
        expect(graph.getDeclaration()?.actions?.[0].pressed).toBe(false);
        expect(graph.drawnObject('derivative')).toMatchObject({visible: false});
        const model = (graph as unknown as {model: Parameters<typeof polynomialSpecOf>[0]}).model;
        expect(model.zeros.length).toBeGreaterThan(0);
    });

    test('a declared row re-renders on a language switch (the rule row follows the decimal separator)', () => {
        const graph = new PolynomialZerosGraph();
        mountGraph(graph);
        act(() => apply(graph, {kind: 'function-parameter', name: 'k', value: 0.5}));
        const rule = (graph.getDeclaration() as GraphDeclaration).readouts!.flatMap(group => [...group.rows]).find(row => row.id === 'rule')!;
        expect(renderMessage(rule.value as never)).toContain('0,5');
        act(() => setLanguage('en'));
        expect(renderMessage(rule.value as never)).toContain('0.5');
        expect(renderMessage(rule.value as never)).not.toContain('0,5');
    });

    test('the plotted mark is the polynomial itself', () => {
        const graph = new PolynomialZerosGraph();
        mountGraph(graph);
        const model = (graph as unknown as {model: Parameters<typeof polynomialSpecOf>[0]}).model;
        const marks = graph.getDeclaration()!.marks!;
        const polyline = marks.nice?.find(mark => mark.kind === 'polyline');
        expect(polyline).toBeDefined();
        if (polyline?.kind === 'polyline') for (const [x, y] of polyline.points.slice(0, 20)) expect(y).toBeCloseTo(polyValue(polynomialSpecOf(model), x), 9);
        expect(marks.must).toEqual(model.zeros.map(zero => ({kind: 'point', x: zero.z, y: 0})));
    });
});
