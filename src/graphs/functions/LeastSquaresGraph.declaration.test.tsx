import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {LeastSquaresGraph} from './LeastSquaresGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {fitPolynomial, lineResidualSumOfSquares} from '../../analysis/leastSquares';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import {leastSquaresNumber} from './leastSquaresMessages';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Lsq = {
    model: {points: readonly (readonly [number, number])[]; degree: number; slope: number; intercept: number; manualLine: boolean; showSquares: boolean};
    setPoint(index: number, value: readonly [number, number]): void; setManualLine(value: boolean): void; addPoint(): void;
};

const states: {name: string; setup: (graph: LeastSquaresGraph) => void; params: string[]; legend: string[]; manual: boolean}[] = [
    {name: 'default', setup: () => undefined, params: ['lsq-degree'], legend: ['points', 'fit', 'residual', 'square'], manual: false},
    {name: 'degree 2', setup: g => { g.parameters!.write('lsq-degree', 2, 'learner'); }, params: ['lsq-degree'], legend: ['points', 'fit', 'residual', 'square'], manual: false},
    {name: 'outlier', setup: g => { (g as unknown as Lsq).setPoint(3, [3, 8]); }, params: ['lsq-degree'], legend: ['points', 'fit', 'residual', 'square'], manual: false},
    {name: 'manual line', setup: g => {
        (g as unknown as Lsq).setManualLine(true);
        g.parameters!.write('lsq-slope', 1, 'learner');
        g.parameters!.write('lsq-intercept', 1, 'learner');
    }, params: ['lsq-slope', 'lsq-intercept'], legend: ['points', 'manual', 'residual', 'square'], manual: true},
    {name: 'squares hidden', setup: g => { g.performAction('squares'); }, params: ['lsq-degree'], legend: ['points', 'fit', 'residual'], manual: false},
    {name: 'five points, degree 4', setup: g => { (g as unknown as Lsq).addPoint(); g.parameters!.write('lsq-degree', 4, 'learner'); },
        params: ['lsq-degree'], legend: ['points', 'fit', 'residual', 'square'], manual: false},
];

describe('Least squares declares through BaseFunctionGraph', () => {
    for (const {name, setup, params, legend, manual} of states) {
        test(`${name}: consistent, rows equal the inspector and the kernel, legend resolves, marks hold the data`, () => {
            const graph = new LeastSquaresGraph();
            const {view} = mountGraph(graph);
            act(() => {
                if (name === 'squares hidden') (graph as unknown as Lsq).setManualLine(false);
                setup(graph);
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => parameter.key)).toEqual(params);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});

            const model = (graph as unknown as Lsq).model;
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const expected = 'kind' in row.value && row.value.kind === 'number' ? formatNumber(row.value.value, 'sl', row.value.maxDecimals)
                    : 'kind' in row.value && row.value.kind === 'formatted' ? row.value.text : renderMessage(row.value as never);
                expect(shown, row.id).toBe(expected);
            }
            const value = (id: string) => rows.find(row => row.id === id)?.value as {kind: 'formatted'; text: string} | undefined;
            const points = model.points;
            const sum = manual ? lineResidualSumOfSquares(points, model.slope, model.intercept) : fitPolynomial(points, model.degree).residualSumOfSquares;
            expect(value('sum')?.text, 'sum of squares against the kernel').toBe(leastSquaresNumber(sum));
            expect(rows.some(row => row.id === 'optimal-sum')).toBe(manual);

            const must = declaration.marks?.must ?? [];
            expect(must.map(mark => (mark.kind === 'point' ? [mark.x, mark.y] : []))).toEqual(model.points.map(([x, y]) => [x, y]));
            expect(declaration.marks?.nice?.[0]?.kind).toBe('polyline');
        });
    }

    test('the switches are actions that follow the model; the pucks write through the arbiter and a refused value changes nothing', () => {
        const graph = new LeastSquaresGraph();
        mountGraph(graph);
        const pressed = (id: string) => (graph.getDeclaration() as GraphDeclaration).actions?.find(action => action.id === id)?.pressed;
        expect(pressed('squares')).toBe(true);
        act(() => graph.performAction('squares'));
        expect(pressed('squares')).toBe(false);
        act(() => graph.performAction('manual'));
        expect(pressed('manual')).toBe(true);
        expect(() => graph.performAction('nothing')).toThrow();
        act(() => { graph.parameters!.write('lsq-slope', 2, 'learner'); });
        expect(graph.parameters!.read('lsq-slope')).toBe(2);
        act(() => { graph.parameters!.write('lsq-slope', 99, 'learner'); });
        expect(graph.parameters!.read('lsq-slope')).toBe(2);
        act(() => graph.performAction('manual'));
        act(() => { graph.parameters!.write('lsq-degree', 3, 'learner'); });
        act(() => { graph.parameters!.write('lsq-degree', 9, 'learner'); });
        expect(graph.parameters!.read('lsq-degree')).toBe(3);
    });
});
