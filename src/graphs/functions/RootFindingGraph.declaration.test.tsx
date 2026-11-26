import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {RootFindingGraph} from './RootFindingGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {formatPrecise} from './BisectionGraph';
import {rootFindingExample} from '../../analysis/rootFinding';
import {rootFindingHistoryOf, type RootFindingModel} from '../../analysis/rootFindingModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenRootFindingGraph extends RootFindingGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
}

const next: LessonAction = {kind: 'animation', animationId: 'root-finding', command: 'next-step'};
const choice = (name: 'root-finding-method' | 'root-finding-example', value: string): LessonAction => ({kind: 'function-choice', name, value});
const start = (name: 'root-x0' | 'root-x1', value: number): LessonAction => ({kind: 'function-parameter', name, value});

const states: {name: string; actions: LessonAction[]; parameters: string[]}[] = [
    {name: 'default', actions: [], parameters: ['root-finding-method', 'root-finding-example', 'root-x0']},
    {name: 'newton step 1', actions: [next], parameters: ['root-finding-method', 'root-finding-example', 'root-x0']},
    {name: 'three roots, step 1 (root found)', actions: [choice('root-finding-example', 'cubic-three-roots'), start('root-x0', 0.5), next], parameters: ['root-finding-method', 'root-finding-example', 'root-x0']},
    {name: 'two-cycle, repeated iterate', actions: [choice('root-finding-example', 'cubic-two-cycle'), start('root-x0', 0), next, next], parameters: ['root-finding-method', 'root-finding-example', 'root-x0']},
    {name: 'secant, both starts', actions: [choice('root-finding-method', 'secant')], parameters: ['root-finding-method', 'root-finding-example', 'root-x0', 'root-x1']},
    {name: 'secant step 3', actions: [choice('root-finding-method', 'secant'), start('root-x1', 2), next, next, next], parameters: ['root-finding-method', 'root-finding-example', 'root-x0', 'root-x1']},
];

describe('Root finding declares its panel, starts, method, legend and playback', () => {
    for (const {name, actions, parameters} of states) {
        test(`${name}: consistent, bound, rows equal the inspector, legend resolves`, () => {
            const graph = new DrivenRootFindingGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => parameter.key).sort()).toEqual([...parameters].sort());
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['step', 'iterate', 'f-iterate', 'error', 'reference']);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            // The values come from the kernel, not from the declaration under test.
            const model = (graph as unknown as {model: RootFindingModel}).model;
            const history = rootFindingHistoryOf(model);
            const last = history.iterates[history.iterates.length - 1];
            const reference = rootFindingExample(model.example).referenceRoot;
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            expect(text('step')).toBe(String(history.stepsTaken));
            expect(text('iterate')).toBe(formatPrecise(last, 'sl'));
            expect(text('f-iterate')).toBe(formatPrecise(history.example.value(last), 'sl'));
            expect(text('error')).toBe(formatPrecise(Math.abs(last - reference), 'sl'));
            expect(text('reference')).toBe(formatPrecise(reference, 'sl'));
            expect(declaration.status?.map(line => line.id).length).toBe(1);
            const shownStatus = view.container.querySelector('[data-root-finding-status]')?.textContent ?? '';
            expect(shownStatus).toContain(renderMessage(declaration.status![0].text));
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['function', 'line', 'iterate', 'start']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(graph.drawnObject('function')?.visible).toBe(true);
            expect(declaration.marks?.nice?.[0]?.kind).toBe('polyline');
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the reference note shows the reference root', () => {
        const graph = new DrivenRootFindingGraph();
        mountGraph(graph);
        const note = (graph.getDeclaration() as GraphDeclaration).notes?.[0];
        expect(renderMessage(note!.text)).toContain(formatPrecise(Math.SQRT2, 'sl'));
    });

    test('writing through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenRootFindingGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('root-x0', 1.5, 'learner'); });
        expect(graph.parameters!.read('root-x0')).toBe(1.5);
        act(() => { graph.parameters!.write('root-x0', 9, 'learner'); });
        expect(graph.parameters!.read('root-x0')).toBe(1.5);
        act(() => { graph.parameters!.write('root-finding-method', 'secant', 'learner'); });
        expect(graph.parameters!.read('root-finding-method')).toBe('secant');
    });

    test('the playback actions step and reset the iteration and report their state', () => {
        const graph = new DrivenRootFindingGraph();
        mountGraph(graph);
        const actions = () => (graph.getDeclaration() as GraphDeclaration).actions!;
        expect(actions().map(action => [action.id, action.enabled])).toEqual([['next-step', true], ['play', true], ['reset', false]]);
        act(() => { graph.performAction('next-step'); });
        expect(actions().find(action => action.id === 'reset')?.enabled).toBe(true);
        expect((graph.getDeclaration() as GraphDeclaration).readouts![0].rows.find(row => row.id === 'step')?.value).toEqual({kind: 'number', value: 1, maxDecimals: 0});
        act(() => { graph.performAction('play'); });
        expect(actions().find(action => action.id === 'play')?.pressed).toBe(true);
        act(() => { graph.performAction('play'); });
        expect(actions().find(action => action.id === 'play')?.pressed).toBe(false);
        act(() => { graph.performAction('reset'); });
        expect((graph.getDeclaration() as GraphDeclaration).readouts![0].rows.find(row => row.id === 'step')?.value).toEqual({kind: 'number', value: 0, maxDecimals: 0});
        expect(() => graph.performAction('no-such-action')).toThrow();
    });
});
