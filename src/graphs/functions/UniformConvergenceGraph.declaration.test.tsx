import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {UniformConvergenceGraph} from './UniformConvergenceGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Setters = {setExample(value: string): void};
const LEGEND = ['function', 'limit', 'limit-open', 'band', 'error', 'supremum', 'attained', 'not-attained'];
const states: {name: string; example: string; writes: [string, number][]; revealed: boolean; status: string[]}[] = [
    {name: 'default (hidden)', example: 'power', writes: [], revealed: false, status: ['hidden']},
    {name: 'power on [0, 0.8] revealed', example: 'power', writes: [], revealed: true, status: ['attained', 'shared-n', 'not-covered']},
    {name: 'power on [0, 1] revealed (not attained, jump)', example: 'power', writes: [['uniform-r', 1]], revealed: true, status: ['not-attained', 'no-shared-n', 'not-covered', 'jump']},
    {name: 'power on [0, 1] at x = 0.99 (pointwise N beyond n)', example: 'power', writes: [['uniform-r', 1], ['uniform-x', 0.99]], revealed: false, status: ['hidden', 'jump', 'pointwise-beyond']},
    {name: 'x/n hidden', example: 'scaled', writes: [], revealed: false, status: ['hidden']},
    {name: 'x/n revealed', example: 'scaled', writes: [], revealed: true, status: ['attained', 'shared-n', 'not-covered']},
    {name: 'x/n revealed, epsilon 0.5', example: 'scaled', writes: [['uniform-epsilon', 0.5]], revealed: true, status: ['attained', 'shared-n', 'covered']},
];

describe('UniformConvergence declares through BaseFunctionGraph', () => {
    for (const {name, example, writes, revealed, status} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new UniformConvergenceGraph();
            const {view} = mountGraph(graph);
            act(() => {
                runAs('learner', () => (graph as unknown as Setters).setExample(example));
                for (const [key, value] of writes) graph.parameters!.write(key, value, 'lesson');
                if (revealed) graph.performAction('show-supremum');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([
                ['uniform-x', 'range', 'board'], ['uniform-epsilon', 'range', 'board'], ['uniform-r', 'range', 'board'],
            ]);
            expect(declaration.actions?.map(action => [action.id, action.pressed, action.puck])).toEqual([['show-supremum', revealed, true]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(LEGEND);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(declaration.formula?.tex).toMatch(/f_n\(x\)=/);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows).toHaveLength(11);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.status?.map(line => line.id)).toEqual(status);
            // marks keep r and x with their labels below the axis, the values at x and the band corners in sight
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(2 * 2 + 2 + 4);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the marks cover f_n, the limit and the band edges, not only f_n', () => {
        const graph = new UniformConvergenceGraph();
        mountGraph(graph);
        const marks = graph.getDeclaration()!.marks!;
        // x^5 on [0, 0.8] with epsilon 0.1: f_n, then the limit piece y = 0 and the band edges y = -0.1 and y = 0.1 on [0, 0.8]
        const lines = (marks.nice ?? []).flatMap(mark => mark.kind === 'polyline' ? [mark.points] : []);
        expect(lines).toHaveLength(4);
        const fits = (points: readonly (readonly [number, number])[], f: (x: number) => number) => points.every(([x, y]) => Math.abs(y - f(x)) < 1e-9);
        expect(fits(lines[0], x => x ** 5)).toBe(true);
        expect(fits(lines[1], () => 0)).toBe(true);
        expect(fits(lines[2], () => -0.1)).toBe(true);
        expect(fits(lines[3], () => 0.1)).toBe(true);
        expect(marks.must).toContainEqual({kind: 'point', x: 0.5, y: 0.5 ** 5}); // the value of f_n at x
        expect(marks.must).toContainEqual({kind: 'point', x: 0.8, y: 0.1}); // a band corner
    });

    test('the supremum rows read skrito until revealed, then give the value', () => {
        const graph = new UniformConvergenceGraph();
        mountGraph(graph);
        const text = () => {
            const row = (graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).find(r => r.id === 'supremum')!;
            return 'kind' in row.value && row.value.kind === 'formatted' ? row.value.text : renderMessage(row.value as never);
        };
        expect(text()).toBe('skrito');
        act(() => { graph.performAction('show-supremum'); });
        expect(text()).toBe('0,32768');
        act(() => { graph.performAction('show-supremum'); });
        expect(text()).toBe('skrito');
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new UniformConvergenceGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('uniform-x', 0.3, 'learner'); });
        expect(graph.parameters!.read('uniform-x')).toBe(0.3);
        act(() => { graph.parameters!.write('uniform-r', 0.2, 'learner'); }); // r would pass below x
        expect(graph.parameters!.read('uniform-r')).toBe(0.8);
        act(() => { graph.parameters!.write('uniform-epsilon', 5, 'learner'); }); // outside the range
        expect(graph.parameters!.read('uniform-epsilon')).toBe(0.1);
    });
});
