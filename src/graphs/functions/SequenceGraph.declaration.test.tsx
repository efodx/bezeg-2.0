import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {SequenceGraph} from './SequenceGraph';
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
const LEGEND = ['inside', 'outside', 'band', 'limit', 'threshold'];
interface State {name: string; example: string; epsilon: number; limit: number; threshold: number; terms: number; shown: boolean; status: string[]; inside: boolean; outside: boolean}
const states: State[] = [
    {name: 'reciprocal default (certificate hidden)', example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 1, shown: false, status: ['hidden'], inside: false, outside: true},
    {name: 'reciprocal N 11, 12 terms, certified', example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 11, terms: 12, shown: true, status: ['certified'], inside: true, outside: true},
    {name: 'reciprocal N 5, 12 terms, threshold fails', example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 12, shown: true, status: ['threshold-fails'], inside: true, outside: true},
    {name: 'alternating sign eps 1.5, 4 terms, only this epsilon', example: 'alternating-sign', epsilon: 1.5, limit: 0, threshold: 5, terms: 4, shown: true, status: ['epsilon-satisfied'], inside: true, outside: false},
    {name: 'natural eps 0.5, 12 terms, divergent', example: 'natural', epsilon: 0.5, limit: 0, threshold: 5, terms: 12, shown: true, status: ['divergent'], inside: false, outside: true},
    {name: 'reciprocal L 0.5, not the limit', example: 'reciprocal', epsilon: 0.1, limit: 0.5, threshold: 5, terms: 12, shown: true, status: ['not-the-limit'], inside: true, outside: true},
    {name: 'reciprocal N 11, 8 terms, beyond the shown terms', example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 11, terms: 8, shown: true,
        status: ['certified', 'beyond-terms', 'n-min-beyond-terms'], inside: false, outside: true},
    {name: 'reciprocal, all 40 terms, hidden', example: 'reciprocal', epsilon: 0.1, limit: 0, threshold: 5, terms: 40, shown: false, status: ['hidden', 'complete'], inside: true, outside: true},
];

const rowValue = (row: {value: unknown}): string => {
    const value = row.value as any;
    return 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value);
};

describe('Sequence declares through IterativeFunctionGraph', () => {
    for (const {name, example, epsilon, limit, threshold, terms, shown, status, inside, outside} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new SequenceGraph();
            const {view} = mountGraph(graph);
            act(() => {
                runAs('learner', () => (graph as unknown as Setters).setExample(example));
                graph.parameters!.write('sequence-epsilon', epsilon, 'lesson');
                graph.parameters!.write('sequence-limit', limit, 'lesson');
                graph.parameters!.write('sequence-threshold', threshold, 'lesson');
                for (let i = 1; i < terms; i++) graph.performAction('next-step');
                if (shown) graph.performAction('show-certificate');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([
                ['sequence-epsilon', 'range', 'board'], ['sequence-limit', 'range', 'board'], ['sequence-threshold', 'range', 'board'],
            ]);
            expect(declaration.parameters?.map(parameter => parameter.symbol)).toEqual(['ε', 'L', 'N']);
            expect(declaration.actions?.filter(action => action.puck).map(action => [action.id, action.pressed])).toEqual([['show-certificate', shown]]);
            expect(declaration.actions?.map(action => action.id)).toEqual(['next-step', 'play', 'reset', 'show-certificate']);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(LEGEND);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            for (const id of ['band', 'limit']) expect(graph.drawnObject(id), id).toMatchObject({visible: true});
            expect(graph.drawnObject('inside')?.visible, 'inside terms').toBe(inside);
            expect(graph.drawnObject('outside')?.visible, 'outside terms').toBe(outside);
            expect(declaration.formula?.tex).toMatch(/^a_n=/);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows).toHaveLength(11);
            for (const row of rows) expect(view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent, row.id).toBe(rowValue(row));
            expect(declaration.status?.map(line => line.id)).toEqual(status);
            expect([...view.container.querySelectorAll('[data-sequence-status]')].map(element => element.getAttribute('data-sequence-status'))).toEqual(status);
            // marks keep every shown term and the label of the threshold marker in sight
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(terms + 1);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the certificate rows read skrito until the certificate is shown, and the switch puck reports its state', () => {
        const graph = new SequenceGraph();
        mountGraph(graph);
        const rowText = (id: string) => rowValue(Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, row]))[id]);
        expect(rowText('certificate')).toBe('skrito');
        expect(rowText('n-min')).toBe('skrito');
        act(() => { graph.performAction('show-certificate'); });
        expect(rowText('certificate')).toBe('N ne deluje');
        expect(rowText('n-min')).toBe('11');
        expect(graph.getDeclaration()!.actions!.find(action => action.id === 'show-certificate')!.pressed).toBe(true);
        act(() => { graph.performAction('show-certificate'); });
        expect(rowText('n-min')).toBe('skrito');
    });

    test('the verdict status keeps the tone the removed board caption gave it: confirmed is success, a refusal is a warning, hidden has none', () => {
        const graph = new SequenceGraph();
        mountGraph(graph);
        const verdictTone = () => graph.getDeclaration()!.status!.find(line => ['hidden', 'certified', 'threshold-fails', 'not-the-limit', 'oscillating', 'epsilon-satisfied', 'divergent'].includes(line.id))!.tone;
        expect(verdictTone()).toBeUndefined();
        act(() => { graph.parameters!.write('sequence-threshold', 11, 'lesson'); for (let i = 1; i < 12; i++) graph.performAction('next-step'); graph.performAction('show-certificate'); });
        expect(verdictTone()).toBe('success');
        act(() => { graph.parameters!.write('sequence-threshold', 5, 'lesson'); });
        expect(verdictTone()).toBe('warning');
        act(() => { graph.parameters!.write('sequence-limit', 0.5, 'lesson'); });
        expect(verdictTone()).toBe('warning');
    });

    test('the followed view holds every shown term, the band and the threshold marker, and is not the example box of forty indices', () => {
        for (const {example, epsilon, limit, threshold, terms} of states) {
            const graph = new SequenceGraph();
            mountGraph(graph);
            act(() => {
                runAs('learner', () => (graph as unknown as Setters).setExample(example));
                graph.parameters!.write('sequence-epsilon', epsilon, 'lesson');
                graph.parameters!.write('sequence-limit', limit, 'lesson');
                graph.parameters!.write('sequence-threshold', threshold, 'lesson');
                for (let i = 1; i < terms; i++) graph.performAction('next-step');
            });
            const follow = graph.getDeclaration()!.followView!;
            expect(follow, example).toBeDefined();
            const [left, top, right, bottom] = follow;
            for (const mark of graph.getDeclaration()!.marks!.must) {
                const {x, y} = mark as {x: number; y: number};
                expect(x >= left && x <= right && y <= top && y >= bottom, `${example} mark ${x},${y} in ${follow}`).toBe(true);
            }
            expect(bottom).toBeLessThan(limit - epsilon);
            expect(top).toBeGreaterThan(limit + epsilon);
            if (terms <= 15 && threshold <= 15) expect(right, `${example} with ${terms} terms is not framed to the 40 indices`).toBeLessThanOrEqual(17);
        }
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new SequenceGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('sequence-epsilon', 0.25, 'learner'); });
        expect(graph.parameters!.read('sequence-epsilon')).toBe(0.25);
        act(() => { graph.parameters!.write('sequence-epsilon', 2.5, 'learner'); }); // above 2
        act(() => { graph.parameters!.write('sequence-epsilon', 0.255, 'learner'); }); // off the 0.01 grid
        expect(graph.parameters!.read('sequence-epsilon')).toBe(0.25);
        act(() => { graph.parameters!.write('sequence-limit', -0.5, 'learner'); });
        expect(graph.parameters!.read('sequence-limit')).toBe(-0.5);
        act(() => { graph.parameters!.write('sequence-limit', 3, 'learner'); }); // outside [-2, 2]
        expect(graph.parameters!.read('sequence-limit')).toBe(-0.5);
        act(() => { graph.parameters!.write('sequence-threshold', 20, 'learner'); });
        expect(graph.parameters!.read('sequence-threshold')).toBe(20);
        act(() => { graph.parameters!.write('sequence-threshold', 0, 'learner'); }); // below 1
        act(() => { graph.parameters!.write('sequence-threshold', 12.5, 'learner'); }); // not an integer
        expect(graph.parameters!.read('sequence-threshold')).toBe(20);
    });
});
