import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {MeanValueGraph} from './MeanValueGraph';
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
const states: {name: string; example: string; writes: [string, number][]; revealed: boolean; legend: string[]; status: string[]}[] = [
    {name: 'default (hidden)', example: 'square', writes: [], revealed: false, legend: ['function', 'secant', 'tangent'], status: ['differ']},
    {name: 'square revealed', example: 'square', writes: [], revealed: true, legend: ['function', 'secant', 'tangent', 'matches'], status: ['differ', 'matches']},
    {name: 'square c=1 revealed (agree)', example: 'square', writes: [['mvt-c', 1]], revealed: true, legend: ['function', 'secant', 'tangent', 'matches'], status: ['agree', 'matches']},
    {name: 'cube hidden', example: 'cube', writes: [], revealed: false, legend: ['function', 'secant', 'tangent'], status: ['differ']},
    {name: 'cube revealed (two matches)', example: 'cube', writes: [], revealed: true, legend: ['function', 'secant', 'tangent', 'matches'], status: ['differ', 'matches']},
    {name: 'abs revealed at the corner (none)', example: 'abs', writes: [['mvt-c', 0]], revealed: true, legend: ['function', 'secant'], status: ['hypothesis', 'corner', 'matches-none']},
    {name: 'abs [0, 1] revealed (interval)', example: 'abs', writes: [['mvt-b', 3], ['mvt-c', 1], ['mvt-a', 0.5]], revealed: true, legend: ['function', 'secant', 'tangent', 'matches'], status: ['agree', 'matches-interval']},
];

describe('MeanValue declares through BaseFunctionGraph', () => {
    for (const {name, example, writes, revealed, legend, status} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new MeanValueGraph();
            const {view} = mountGraph(graph);
            act(() => {
                runAs('learner', () => (graph as unknown as Setters).setExample(example));
                for (const [key, value] of writes) graph.parameters!.write(key, value, 'lesson');
                if (revealed) graph.performAction('show-matches');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([
                ['mvt-a', 'range', 'board'], ['mvt-b', 'range', 'board'], ['mvt-c', 'range', 'board'],
            ]);
            expect(declaration.actions?.map(action => [action.id, action.pressed, action.puck])).toEqual([['show-matches', revealed, true]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(declaration.formula?.tex).toMatch(/^f\(x\)=/);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows).toHaveLength(10);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.status?.map(line => line.id)).toEqual(status);
            // marks keep a, b and c with their labels below the axis and their points on the graph in sight
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(3 * 2 + 3);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the marks cover the curve, the secant and the tangent, not only the first function', () => {
        const graph = new MeanValueGraph();
        mountGraph(graph);
        const marks = graph.getDeclaration()!.marks!;
        // x^2 on [0, 2] with c = 0.5: the secant is y = 2x and the tangent y = x - 0.25; each is one sampled polyline of the marks
        const lines = (marks.nice ?? []).flatMap(mark => mark.kind === 'polyline' ? [mark.points] : []);
        expect(lines).toHaveLength(3);
        const fits = (points: readonly (readonly [number, number])[], f: (x: number) => number) => points.every(([x, y]) => Math.abs(y - f(x)) < 1e-9);
        expect(fits(lines[0], x => x * x)).toBe(true);
        expect(fits(lines[1], x => 2 * x)).toBe(true);
        expect(fits(lines[2], x => x - 0.25)).toBe(true);
        expect(marks.must).toContainEqual({kind: 'point', x: 0.5, y: 0.25}); // the point on the graph at c
    });

    test('the matches row reads skrite until revealed, then lists the point', () => {
        const graph = new MeanValueGraph();
        mountGraph(graph);
        const text = () => {
            const row = (graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).find(r => r.id === 'matches')!;
            return 'kind' in row.value && row.value.kind === 'number' ? formatNumber(row.value.value, 'sl', row.value.maxDecimals) : renderMessage(row.value as never);
        };
        expect(text()).toBe('skrite');
        act(() => { graph.performAction('show-matches'); });
        expect(text()).toBe('1');
        act(() => { graph.performAction('show-matches'); });
        expect(text()).toBe('skrite');
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new MeanValueGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('mvt-c', 1.25, 'learner'); });
        expect(graph.parameters!.read('mvt-c')).toBe(1.25);
        act(() => { graph.parameters!.write('mvt-a', 1.5, 'learner'); }); // a would pass c
        expect(graph.parameters!.read('mvt-a')).toBe(0);
        act(() => { graph.parameters!.write('mvt-b', 9, 'learner'); }); // outside the range
        expect(graph.parameters!.read('mvt-b')).toBe(2);
    });
});
