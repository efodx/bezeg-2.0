import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {QuadratureGraph} from './QuadratureGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber, formatSignificant} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {ERROR_DISPLAY_DIGITS, quadratureView, type QuadratureModel} from '../../analysis/quadratureModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenQuadratureGraph extends QuadratureGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
}

type ParameterName = 'quadrature-a' | 'quadrature-b' | 'quadrature-n';
const choice = (name: 'quadrature-rule' | 'quadrature-function', value: string): LessonAction => ({kind: 'function-choice', name, value});
const parameter = (name: ParameterName, value: number): LessonAction => ({kind: 'function-parameter', name, value});

const states: {name: string; actions: LessonAction[]}[] = [
    {name: 'default', actions: []},
    {name: 'trapezoid n = 8', actions: [parameter('quadrature-n', 8)]},
    {name: 'simpson, n = 2', actions: [choice('quadrature-rule', 'simpson')]},
    {name: 'simpson, even n = 12', actions: [choice('quadrature-rule', 'simpson'), parameter('quadrature-n', 12)]},
    {name: 'bounds 0.5 and 2', actions: [parameter('quadrature-a', 0.5), parameter('quadrature-b', 2)]},
    {name: 'e^x, simpson, n = 4', actions: [choice('quadrature-function', 'exp'), choice('quadrature-rule', 'simpson'), parameter('quadrature-n', 4)]},
];

const ROWS = ['n', 'approximation', 'exact', 'error', 'half-error', 'ratio'];

const modelOf = (graph: QuadratureGraph) => (graph as unknown as {model: QuadratureModel}).model;

describe('Quadrature declares its panel, rule, n, bounds, function and legend', () => {
    for (const {name, actions} of states) {
        test(`${name}: consistent, bound, rows equal the kernel, legend resolves`, () => {
            const graph = new DrivenQuadratureGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect(declaration.parameters?.map(entry => entry.key).sort())
                .toEqual(['quadrature-a', 'quadrature-b', 'quadrature-function', 'quadrature-n', 'quadrature-rule']);
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
            const model = modelOf(graph);
            const kernel = quadratureView(model);
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            const precise = (value: number) => formatNumber(value, 'sl', 4);
            const significant = (value: number | undefined) => value === undefined ? 'ni' : formatSignificant(value, 'sl', ERROR_DISPLAY_DIGITS);
            expect(text('n')).toBe(String(model.n));
            expect(text('approximation')).toBe(precise(kernel.approximation));
            expect(text('exact')).toBe(precise(kernel.exact));
            expect(text('error')).toBe(significant(kernel.error));
            expect(text('half-error')).toBe(significant(kernel.halfError));
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['function', 'bound', 'shapes']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the declared range of n follows the rule: Simpson steps by two', () => {
        const graph = new DrivenQuadratureGraph();
        mountGraph(graph);
        const range = () => graph.getDeclaration()!.parameters!.find(entry => entry.key === 'quadrature-n') as {min: number; step: number};
        expect(range().step).toBe(1);
        act(() => { graph.applyLessonAction(choice('quadrature-rule', 'simpson')); });
        expect(range().step).toBe(2);
    });

    test('writing through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenQuadratureGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('quadrature-n', 5, 'learner'); });
        expect(graph.parameters!.read('quadrature-n')).toBe(5);
        expect(modelOf(graph).n).toBe(5);
        act(() => { graph.parameters!.write('quadrature-rule', 'simpson', 'learner'); });
        expect(graph.parameters!.read('quadrature-rule')).toBe('simpson');
        const n = graph.parameters!.read('quadrature-n');
        expect(modelOf(graph).n % 2).toBe(0);
        // An odd n under Simpson is refused.
        act(() => { graph.parameters!.write('quadrature-n', 7, 'learner'); });
        expect(graph.parameters!.read('quadrature-n')).toBe(n);
        act(() => { graph.parameters!.write('quadrature-n', 10, 'learner'); });
        expect(graph.parameters!.read('quadrature-n')).toBe(10);
        // The bounds: a must stay below b, b above a.
        act(() => { graph.parameters!.write('quadrature-a', 1, 'learner'); });
        expect(graph.parameters!.read('quadrature-a')).toBe(1);
        act(() => { graph.parameters!.write('quadrature-a', 4, 'learner'); });
        expect(graph.parameters!.read('quadrature-a')).toBe(1);
        act(() => { graph.parameters!.write('quadrature-b', 0.5, 'learner'); });
        expect(graph.parameters!.read('quadrature-b')).toBe(Math.PI);
        act(() => { graph.parameters!.write('quadrature-function', 'square', 'learner'); });
        expect(graph.parameters!.read('quadrature-function')).toBe(modelOf(graph).fn);
    });
});
