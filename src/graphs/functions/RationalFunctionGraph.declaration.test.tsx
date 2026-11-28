import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {RationalFunctionGraph} from './RationalFunctionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {polyValue} from '../../analysis/polynomial';
import {rationalSpecsOf, type RationalFunctionModel} from '../../analysis/rationalFunctionModel';
import type {LessonAction} from '../../learning/model';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const apply = (graph: RationalFunctionGraph, action: LessonAction) =>
    (graph as unknown as {applyLessonAction(action: LessonAction): void}).applyLessonAction(action);
const example = (value: string): LessonAction => ({kind: 'function-choice', name: 'rational-example', value});

const states: {name: string; actions: LessonAction[]}[] = [
    {name: 'default (oblique)', actions: []},
    {name: 'hole', actions: [example('hole')]},
    {name: 'horizontal, probe moved', actions: [example('horizontal'), {kind: 'function-parameter', name: 'rational-probe', value: 4}]},
    {name: 'double pole, k negative', actions: [example('double-pole'), {kind: 'function-parameter', name: 'k', value: -2}]},
];

describe('Rational function declares through BaseFunctionGraph', () => {
    for (const {name, actions} of states) {
        test(`${name}: consistent, rows equal the inspector, legend entries are drawn and visible`, () => {
            const graph = new RationalFunctionGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) apply(graph, action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual([['probe', 'board']]);
            expect(declaration.legend?.[0].id).toBe('curve');
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.length).toBeGreaterThan(4);
            for (const row of rows) {
                expect(view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent, row.id).toBe(renderMessage(row.value as never));
            }
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('declared rows re-render on a language switch (rule and asymptote follow the decimal separator)', () => {
        const graph = new RationalFunctionGraph();
        mountGraph(graph);
        act(() => apply(graph, {kind: 'function-parameter', name: 'k', value: 0.5}));
        const rows = (graph.getDeclaration() as GraphDeclaration).readouts!.flatMap(group => [...group.rows]);
        for (const id of ['rule', 'asymptote']) {
            const row = rows.find(candidate => candidate.id === id)!;
            expect(renderMessage(row.value as never), id).toContain('0,5');
            act(() => setLanguage('en'));
            expect(renderMessage(row.value as never), id).toContain('0.5');
            expect(renderMessage(row.value as never), id).not.toContain('0,5');
            act(() => setLanguage('sl'));
        }
    });

    test('legend entries follow what the board draws: hole and zeros appear and disappear', () => {
        const graph = new RationalFunctionGraph();
        mountGraph(graph);
        const ids = () => graph.getDeclaration()!.legend!.map(entry => entry.id);
        expect(ids()).toEqual(['curve', 'numerator-zero', 'denominator-zero', 'asymptote']);
        act(() => { apply(graph, example('hole')); });
        expect(ids()).toContain('hole');
        expect(graph.drawnObject('hole-0')).toMatchObject({visible: true});
        act(() => { apply(graph, example('oblique')); });
        expect(ids()).not.toContain('hole');
    });

    test('the probe is a declared puck: an arbiter write changes the model and reads back; a value outside the bounds changes nothing', () => {
        const graph = new RationalFunctionGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('probe', 4, 'learner'); });
        expect(graph.parameters!.read('probe')).toBe(4);
        act(() => { graph.parameters!.write('probe', 99, 'learner'); });
        expect(graph.parameters!.read('probe')).toBe(4);
    });

    test('the plotted mark is the fraction itself', () => {
        const graph = new RationalFunctionGraph();
        mountGraph(graph);
        const model = (graph as unknown as {model: RationalFunctionModel}).model;
        const {numerator, denominator} = rationalSpecsOf(model);
        const polyline = graph.getDeclaration()!.marks!.nice?.find(mark => mark.kind === 'polyline');
        expect(polyline).toBeDefined();
        if (polyline?.kind === 'polyline') for (const [x, y] of polyline.points.slice(0, 20)) expect(y).toBeCloseTo(polyValue(numerator, x) / polyValue(denominator, x), 9);
    });
});
