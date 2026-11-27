import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {FixedPointGraph} from './FixedPointGraph';
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
const LEGEND = ['function', 'diagonal', 'box', 'cobweb', 'iterate', 'start', 'fixed-point', 'bound'];
const states: {name: string; example: string; x0?: number; steps: number; bound: boolean; range: [number, number]; status: string[]}[] = [
    {name: 'affine default (bound hidden)', example: 'affine', steps: 0, bound: false, range: [0, 2], status: ['bound-hidden']},
    {name: 'affine step 3, bound shown', example: 'affine', steps: 3, bound: true, range: [0, 2], status: ['hypotheses', 'bound-a-priori', 'bound-a-posteriori']},
    {name: 'affine step 0, bound shown (a posteriori pending)', example: 'affine', steps: 0, bound: true, range: [0, 2], status: ['hypotheses', 'bound-a-priori', 'bound-pending']},
    {name: 'affine step 10 (threshold)', example: 'affine', steps: 10, bound: false, range: [0, 2], status: ['threshold', 'bound-hidden']},
    {name: 'cosine x0 = 0.5, step 4, bound shown', example: 'cosine', x0: 0.5, steps: 4, bound: true, range: [0, 1], status: ['hypotheses', 'bound-a-priori', 'bound-a-posteriori']},
    {name: 'reflection step 4 (two-cycle), bound shown', example: 'reflection', steps: 4, bound: true, range: [0, 1], status: ['cycle', 'no-bound']},
    {name: 'reflection step 4 (two-cycle), bound hidden', example: 'reflection', steps: 4, bound: false, range: [0, 1], status: ['cycle', 'bound-hidden']},
];

describe('FixedPoint declares through IterativeFunctionGraph', () => {
    for (const {name, example, x0, steps, bound, range, status} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new FixedPointGraph();
            const {view} = mountGraph(graph);
            act(() => {
                runAs('learner', () => (graph as unknown as Setters).setExample(example));
                if (x0 !== undefined) graph.parameters!.write('fixed-point-x0', x0, 'lesson');
                for (let i = 0; i < steps; i++) graph.performAction('next-step');
                if (bound) graph.performAction('show-error-bound');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([['fixed-point-x0', 'range', 'board']]);
            expect(declaration.parameters?.map(parameter => 'min' in parameter ? [parameter.min, parameter.max] : [])).toEqual([range]);
            expect(declaration.actions?.filter(action => action.puck).map(action => [action.id, action.pressed])).toEqual([['show-error-bound', bound]]);
            expect(declaration.actions?.map(action => action.id)).toEqual(['next-step', 'play', 'reset', 'show-error-bound']);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(LEGEND);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            for (const id of ['function', 'diagonal', 'box', 'cobweb']) expect(graph.drawnObject(id), id).toMatchObject({visible: true});
            expect(declaration.formula?.tex).toMatch(/^T\(x\)=/);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows).toHaveLength(9);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.status?.map(line => line.id)).toEqual(status);
            expect([...view.container.querySelectorAll('[data-fixed-point-status]')].map(element => element.getAttribute('data-fixed-point-status'))).toEqual(status);
            // marks keep the interval square (4 corners), both ends of every cobweb leg and the x_k label in sight
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(4 + 2 * steps + 1);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the error bound rows read skrito until the bound is shown; the bound bar is drawn only then', () => {
        const graph = new FixedPointGraph();
        mountGraph(graph);
        act(() => { for (let i = 0; i < 3; i++) graph.performAction('next-step'); });
        const rowText = (id: string) => {
            const value = Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, row.value]))[id];
            return 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
        };
        expect(rowText('q')).toBe('skrito');
        expect(graph.drawnObject('bound')?.visible).toBe(false);
        act(() => { graph.performAction('show-error-bound'); });
        expect(rowText('q')).toBe('0,5');
        expect(rowText('a-posteriori')).toBe('0,125');
        expect(graph.drawnObject('bound')?.visible).toBe(true);
        act(() => { graph.performAction('show-error-bound'); });
        expect(rowText('a-priori')).toBe('skrito');
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new FixedPointGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('fixed-point-x0', 1.25, 'learner'); });
        expect(graph.parameters!.read('fixed-point-x0')).toBe(1.25);
        act(() => { graph.parameters!.write('fixed-point-x0', 2.5, 'learner'); }); // outside [0, 2]
        expect(graph.parameters!.read('fixed-point-x0')).toBe(1.25);
        act(() => { graph.parameters!.write('fixed-point-x0', 0.555, 'learner'); }); // off the 0.01 grid
        expect(graph.parameters!.read('fixed-point-x0')).toBe(1.25);
    });
});
