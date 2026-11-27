import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {GeometricSeriesGraph} from './GeometricSeriesGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Setters = {setExample(value: string): void; setTerms(value: number): void; setTolerance(value: number): void};
const LEGEND = ['term', 'sum', 'limit', 'band'];
interface State {name: string; example: string; terms: number; tolerance: number; status: string[]; limit: boolean; band: boolean}
const states: State[] = [
    {name: 'default, one term', example: 'default', terms: 1, tolerance: 0, status: ['convergent'], limit: true, band: false},
    {name: 'default, 5 terms', example: 'default', terms: 5, tolerance: 0, status: ['convergent'], limit: true, band: false},
    {name: 'default, 8 terms, band 0.01', example: 'default', terms: 8, tolerance: 0.01, status: ['convergent', 'tolerance'], limit: true, band: true},
    {name: 'default, 3 terms, band 0.5 (first term within is 2, beyond 3 shown)', example: 'default', terms: 3, tolerance: 0.5, status: ['convergent', 'tolerance'], limit: true, band: true},
    {name: 'alternating, 4 terms', example: 'alternating', terms: 4, tolerance: 0, status: ['convergent'], limit: true, band: false},
    {name: 'divergent q = -1, 6 terms', example: 'divergent', terms: 6, tolerance: 0, status: ['oscillating'], limit: false, band: false},
    {name: 'all 50 terms', example: 'default', terms: 50, tolerance: 0, status: ['convergent', 'complete'], limit: true, band: false},
];

const rowValue = (row: {value: unknown}): string => {
    const value = row.value as any;
    return 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value);
};

const arrange = (graph: GeometricSeriesGraph, {example, terms, tolerance}: Pick<State, 'example' | 'terms' | 'tolerance'>) => {
    const setters = graph as unknown as Setters;
    runAs('learner', () => { setters.setExample(example); setters.setTerms(terms); setters.setTolerance(tolerance); });
};

describe('Geometric series declares through IterativeFunctionGraph', () => {
    for (const state of states) {
        test(`${state.name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new GeometricSeriesGraph();
            const {view} = mountGraph(graph);
            act(() => arrange(graph, state));
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([['series-q', 'range', 'board'], ['series-tolerance', 'range', 'board']]);
            expect(declaration.parameters?.map(parameter => parameter.symbol)).toEqual(['q', undefined]);
            expect(declaration.actions?.map(action => action.id)).toEqual(['next-step', 'play', 'reset']);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(LEGEND);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(graph.drawnObject('term'), 'term').toMatchObject({visible: true});
            expect(graph.drawnObject('sum'), 'sum').toMatchObject({visible: true});
            expect(graph.drawnObject('limit')?.visible, 'limit').toBe(state.limit);
            expect(graph.drawnObject('band')?.visible, 'band').toBe(state.band);
            expect(declaration.formula?.tex).toMatch(/^S_n=/);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows).toHaveLength(7);
            for (const row of rows) expect(view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent, row.id).toBe(rowValue(row));
            expect(declaration.status?.map(line => line.id)).toEqual(state.status);
            expect([...view.container.querySelectorAll('[data-series-status]')].map(element => element.getAttribute('data-series-status'))).toEqual(state.status);
            // marks keep the tops of every shown term and partial sum in sight
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(2 * state.terms);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('a series without a limit is a warning status, a convergent one is not', () => {
        const graph = new GeometricSeriesGraph();
        mountGraph(graph);
        const tones = () => graph.getDeclaration()!.status!.map(line => line.tone);
        expect(tones()).toEqual([undefined]);
        act(() => arrange(graph, {example: 'divergent', terms: 6, tolerance: 0}));
        expect(tones()).toEqual(['warning']);
        act(() => { graph.parameters!.write('series-q', 1, 'lesson'); });
        expect(graph.getDeclaration()!.status!.map(line => [line.id, line.tone])).toEqual([['constant', 'warning']]);
        act(() => { graph.parameters!.write('series-q', 1.5, 'lesson'); });
        expect(graph.getDeclaration()!.status!.map(line => [line.id, line.tone])).toEqual([['divergent', 'warning']]);
    });

    test('the followed view holds every mark and is framed to the shown terms, not to the fifty indices', () => {
        for (const state of states) {
            const graph = new GeometricSeriesGraph();
            mountGraph(graph);
            act(() => arrange(graph, state));
            const follow = graph.getDeclaration()!.followView!;
            const [left, top, right, bottom] = follow;
            for (const mark of graph.getDeclaration()!.marks!.must) {
                const {x, y} = mark as {x: number; y: number};
                expect(x >= left && x <= right && y <= top && y >= bottom, `${state.name} mark ${x},${y} in ${follow}`).toBe(true);
            }
            expect(top).toBeGreaterThan(0);
            expect(bottom).toBeLessThanOrEqual(0);
            if (state.terms <= 5) expect(right, `${state.name} is framed to five indices`).toBeLessThanOrEqual(7);
        }
    });

    test('the followed view holds the band edges and the limit, and moves in steps of five terms', () => {
        const graph = new GeometricSeriesGraph();
        mountGraph(graph);
        act(() => arrange(graph, {example: 'default', terms: 8, tolerance: 0.01}));
        const [, top, right, bottom] = graph.getDeclaration()!.followView!;
        expect(top).toBeGreaterThan(2.01);
        expect(bottom).toBeLessThan(0);
        expect(right).toBe(11.5);
        act(() => arrange(graph, {example: 'default', terms: 10, tolerance: 0.01}));
        expect(graph.getDeclaration()!.followView![2]).toBe(11.5);
        act(() => arrange(graph, {example: 'default', terms: 11, tolerance: 0.01}));
        expect(graph.getDeclaration()!.followView![2]).toBe(16.5);
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new GeometricSeriesGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('series-q', -0.75, 'learner'); });
        expect(graph.parameters!.read('series-q')).toBe(-0.75);
        act(() => { graph.parameters!.write('series-q', 2.5, 'learner'); }); // above 2
        act(() => { graph.parameters!.write('series-q', Number.NaN, 'learner'); });
        expect(graph.parameters!.read('series-q')).toBe(-0.75);
        act(() => { graph.parameters!.write('series-tolerance', 0.25, 'learner'); });
        expect(graph.parameters!.read('series-tolerance')).toBe(0.25);
        act(() => { graph.parameters!.write('series-tolerance', 1.5, 'learner'); }); // above 1
        act(() => { graph.parameters!.write('series-tolerance', -0.1, 'learner'); }); // below 0
        expect(graph.parameters!.read('series-tolerance')).toBe(0.25);
    });
});
