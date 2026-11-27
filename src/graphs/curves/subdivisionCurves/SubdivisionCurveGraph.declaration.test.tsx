import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {SubdivisionCurveGraph} from './SubdivisionCurveGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import {stageOf} from './subdivisionModel';

vi.mock('../../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Edits = {nextStep(): boolean; setRule(rule: string): void; setClosed(closed: boolean): void; setShowLimit(show: boolean): void; addPoint(): void;
    movePoint(index: number, x: number, y: number): boolean};
const states: {name: string; edit: (g: Edits) => void; legend: string[]; notes: string[]}[] = [
    {name: 'default', edit: () => undefined, legend: ['points', 'polygon', 'stage'], notes: ['step', 'vertices']},
    {name: 'step 2, limit shown', edit: g => { g.nextStep(); g.nextStep(); g.setShowLimit(true); }, legend: ['points', 'polygon', 'stage', 'limit'], notes: ['step', 'vertices']},
    {name: 'four-point, limit switched on but not drawn', edit: g => g.setRule('four-point'), legend: ['points', 'polygon', 'stage'], notes: ['step', 'vertices']},
    {name: 'closed, Chaikin, step 3', edit: g => { g.setRule('chaikin'); g.setClosed(true); g.setShowLimit(true); g.nextStep(); g.nextStep(); g.nextStep(); }, legend: ['points', 'polygon', 'stage', 'limit'], notes: ['step', 'vertices']},
    {name: 'all six steps', edit: g => { for (let i = 0; i < 6; i++) g.nextStep(); }, legend: ['points', 'polygon', 'stage'], notes: ['step', 'vertices', 'complete']},
    {name: 'fifth point', edit: g => { g.setClosed(false); g.addPoint(); }, legend: ['points', 'polygon', 'stage'], notes: ['step', 'vertices']},
];

describe('subdivision curves declare their workspace', () => {
    for (const {name, edit, legend, notes} of states) {
        test(`${name}: consistent, notes equal the panel, legend and pucks follow the scene`, () => {
            const graph = new SubdivisionCurveGraph();
            const {view} = mountGraph(graph);
            act(() => { runAs('learner', () => edit(graph as unknown as Edits)); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual([['subdiv-rule', 'choice', 'board']]);
            expect(declaration.actions?.map(action => [action.id, action.placement, action.pressed])).toEqual([
                ['closed', 'board', graph.state.closed], ['limit', 'tools', graph.state.showLimit],
            ]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(legend);
            for (const entry of declaration.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(true);
            }
            expect(declaration.notes?.map(note => note.id)).toEqual(notes);
            for (const note of declaration.notes ?? []) {
                expect(view.container.querySelector(`[data-subdivision-status="${note.id}"]`)?.textContent, note.id).toBe(renderMessage(note.text));
            }
            const marks = declaration.marks!;
            expect(marks.must).toEqual(graph.state.points.map(([x, y]) => ({kind: 'point', x, y})));
            const lines = (marks.nice ?? []).flatMap(mark => mark.kind === 'polyline' ? [mark.points] : []);
            expect(lines).toHaveLength(1);
            expect(lines[0].length).toBeGreaterThanOrEqual(Math.min(stageOf(graph.state).length, 300));
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the limit switch is not available outside the Chaikin rule', () => {
        const graph = new SubdivisionCurveGraph();
        mountGraph(graph);
        expect(graph.getDeclaration()!.actions!.find(action => action.id === 'limit')!.enabled).toBe(true);
        act(() => { graph.parameters!.write('subdiv-rule', 'four-point', 'learner'); });
        expect(graph.getDeclaration()!.actions!.find(action => action.id === 'limit')!.enabled).toBe(false);
    });

    test('the marks follow the shown stage when the step and the points change', () => {
        const graph = new SubdivisionCurveGraph();
        mountGraph(graph);
        const first = graph.getDeclaration()!.marks!;
        act(() => { runAs('learner', () => graph.nextStep()); });
        const second = graph.getDeclaration()!.marks!;
        expect(second).not.toBe(first);
        const line = (second.nice ?? []).flatMap(mark => mark.kind === 'polyline' ? [mark.points] : [])[0];
        expect(line).toEqual(stageOf(graph.state).map(([x, y]) => [x, y]));
        act(() => { runAs('learner', () => graph.movePoint(1, 2, 7)); });
        expect(graph.getDeclaration()!.marks!.must).toContainEqual({kind: 'point', x: 2, y: 7});
    });

    test('a write through the arbiter changes the rule and reads back; a refused value changes nothing', () => {
        const graph = new SubdivisionCurveGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('subdiv-rule', 'four-point', 'learner'); });
        expect(graph.parameters!.read('subdiv-rule')).toBe('four-point');
        expect(graph.state.rule).toBe('four-point');
        act(() => { graph.parameters!.write('subdiv-rule', 'loop', 'learner'); });
        expect(graph.parameters!.read('subdiv-rule')).toBe('four-point');
    });

    test('the actions flip the polygon and the limit as the learner', () => {
        const graph = new SubdivisionCurveGraph();
        mountGraph(graph);
        act(() => graph.performAction('closed'));
        expect(graph.state.closed).toBe(true);
        act(() => graph.performAction('limit'));
        expect(graph.state.showLimit).toBe(true);
        expect(() => graph.performAction('nope')).toThrow();
    });

    test('the legend names, the notes and the puck options follow the language', () => {
        const graph = new SubdivisionCurveGraph();
        mountGraph(graph);
        const labels = () => (graph.getDeclaration()!.legend ?? []).map(entry => renderMessage(entry.label));
        expect(labels()[1]).toBe('Začetni poligon');
        act(() => { setLanguage('en'); });
        expect(labels()[1]).toBe('Starting polygon');
        expect(renderMessage(graph.getDeclaration()!.notes![0].text)).toBe('Step 0 of 6');
    });
});
