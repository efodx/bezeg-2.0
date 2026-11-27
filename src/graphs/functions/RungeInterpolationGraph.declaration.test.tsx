import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {RungeInterpolationGraph} from './RungeInterpolationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {interpolationFunction} from '../../analysis/interpolation';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Setters = {setFunction(value: string): void; setDegree(value: number): void; setNodeRule(value: string): void; setShowError(value: boolean): void; setShowSemicircle(value: boolean): void};
const LEGEND = ['f', 'p', 'nodes', 'error', 'max', 'semicircle'];
const ROWS = ['function', 'degree', 'nodes', 'rule', 'grid-max', 'grid-max-at', 'grid'];
const states: {name: string; edit: (g: Setters) => void; visible: Record<string, boolean>}[] = [
    {name: 'default', edit: () => undefined, visible: {f: true, p: true, nodes: true, error: true, max: true, semicircle: false}},
    {name: 'n = 6, error hidden', edit: g => { g.setDegree(6); g.setShowError(false); }, visible: {f: true, p: true, nodes: true, error: false, max: false, semicircle: false}},
    {name: 'n = 20 (the cross is outside the view)', edit: g => g.setDegree(20), visible: {f: true, p: true, nodes: true, error: true, max: false, semicircle: false}},
    {name: 'Chebyshev with the semicircle', edit: g => { g.setNodeRule('chebyshev'); g.setShowSemicircle(true); }, visible: {f: true, p: true, nodes: true, error: true, max: true, semicircle: true}},
    {name: 'sin x, n = 5', edit: g => { g.setFunction('sine'); g.setDegree(5); }, visible: {f: true, p: true, nodes: true, error: true, max: true, semicircle: false}},
    {name: '|x|, n = 30 (the cross is outside the view)', edit: g => { g.setFunction('abs'); g.setDegree(30); }, visible: {f: true, p: true, nodes: true, error: true, max: false, semicircle: false}},
];

describe('Runge interpolation declares through BaseFunctionGraph', () => {
    for (const {name, edit, visible} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new RungeInterpolationGraph();
            const {view} = mountGraph(graph);
            act(() => { runAs('learner', () => edit(graph as unknown as Setters)); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([
                ['runge-degree', 'count', 'board'], ['runge-rule', 'choice', 'board'], ['runge-function', 'choice', 'board'],
            ]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(LEGEND);
            for (const entry of declaration.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(visible[entry.id]);
            }
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(ROWS);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.notes?.map(note => note.id)).toEqual(['grid-note']);
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(3);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the marks follow f over the starting view and keep the interval ends in sight', () => {
        const graph = new RungeInterpolationGraph();
        mountGraph(graph);
        const marks = graph.getDeclaration()!.marks!;
        const lines = (marks.nice ?? []).flatMap(mark => mark.kind === 'polyline' ? [mark.points] : []);
        expect(lines).toHaveLength(1);
        const f = interpolationFunction('runge');
        expect(lines[0].every(([x, y]) => Math.abs(y - f(x)) < 1e-9)).toBe(true);
        expect(marks.must).toContainEqual({kind: 'point', x: -1, y: f(-1)});
        expect(marks.must).toContainEqual({kind: 'point', x: 1, y: f(1)});
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new RungeInterpolationGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('runge-degree', 15, 'learner'); });
        expect(graph.parameters!.read('runge-degree')).toBe(15);
        act(() => { graph.parameters!.write('runge-rule', 'chebyshev', 'learner'); });
        expect(graph.parameters!.read('runge-rule')).toBe('chebyshev');
        act(() => { graph.parameters!.write('runge-function', 'abs', 'learner'); });
        expect(graph.parameters!.read('runge-function')).toBe('abs');
        act(() => { graph.parameters!.write('runge-degree', 41, 'learner'); });
        expect(graph.parameters!.read('runge-degree')).toBe(15);
        act(() => { graph.parameters!.write('runge-degree', 2.5, 'learner'); });
        expect(graph.parameters!.read('runge-degree')).toBe(15);
        act(() => { graph.parameters!.write('runge-function', 'cos', 'learner'); });
        expect(graph.parameters!.read('runge-function')).toBe('abs');
        act(() => { graph.parameters!.write('runge-rule', 'random', 'learner'); });
        expect(graph.parameters!.read('runge-rule')).toBe('chebyshev');
    });

    test('the legend names and the readout rows follow the language', () => {
        const graph = new RungeInterpolationGraph();
        mountGraph(graph);
        const labels = () => (graph.getDeclaration()!.legend ?? []).map(entry => renderMessage(entry.label));
        expect(labels()[0]).toBe('funkcija f');
        act(() => { setLanguage('en'); });
        expect(labels()[0]).toBe('function f');
    });
});
