import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import HermiteGraph, {type HermiteIds} from './HermiteGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: HermiteGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new HermiteGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<HermiteIds>};
}

const states: {name: string; steps: Step[]; params: string[]; legend: string[]; mode: string; rule: string}[] = [
    {name: 'default', steps: [], params: ['hermite-mode', 'hermite-rule', 'hermite-tension'], legend: ['points', 'curve', 'tangents'], mode: 'catmull-rom', rule: 'uniform'},
    {name: 'bezier shown', steps: [graph => graph.performAction('bezier')], params: ['hermite-mode', 'hermite-rule', 'hermite-tension'],
        legend: ['points', 'curve', 'tangents', 'bezier'], mode: 'catmull-rom', rule: 'uniform'},
    {name: 'tangents hidden', steps: [graph => graph.performAction('tangents')], params: ['hermite-mode', 'hermite-rule', 'hermite-tension'],
        legend: ['points', 'curve'], mode: 'catmull-rom', rule: 'uniform'},
    {name: 'Hermite mode (no tension puck), chord rule',
        steps: [graph => { graph.parameters!.write('hermite-mode', 'hermite', 'learner'); graph.parameters!.write('hermite-rule', 'chord', 'learner'); }],
        params: ['hermite-mode', 'hermite-rule'], legend: ['points', 'curve', 'tangents'], mode: 'hermite', rule: 'chord'},
];

describe('Hermite and Catmull-Rom declaration', () => {
    for (const {name, steps, params, legend, mode, rule} of states) {
        test(`${name}: consistent, bound, drawn`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();

            expect(checkDeclaration(current)).toEqual([]);
            for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys(), parameter.key).toContain(parameter.key);
            expect((current.parameters ?? []).map(p => p.key)).toEqual(params);
            expect(current.parameters![0]).toMatchObject({kind: 'choice', placement: 'board', puck: true, options: [{value: 'catmull-rom'}, {value: 'hermite'}]});
            expect(current.parameters![1]).toMatchObject({kind: 'choice', placement: 'board', puck: true, options: [{value: 'uniform'}, {value: 'chord'}]});
            if (params.length === 3) expect(current.parameters![2]).toMatchObject({kind: 'range', placement: 'board', min: 0, max: 2});
            expect(graph.parameters!.read('hermite-mode')).toBe(mode);
            expect(graph.parameters!.read('hermite-rule')).toBe(rule);

            expect((current.legend ?? []).map(entry => entry.id)).toEqual(legend);
            for (const entry of current.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(current.notes ?? []).toEqual([]);
            expect(current.actions).toMatchObject([{id: 'tangents', placement: 'tools'}, {id: 'bezier', placement: 'tools'}]);
            expect(current.marks?.must?.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('writes are validated; a refused write carries a reason in both languages', () => {
        const {graph, view} = setup();
        const refusal = (key: 'hermite-mode' | 'hermite-rule' | 'hermite-tension', value: unknown) => {
            const result = graph.parameters!.write(key, value, 'learner');
            expect(result.status).toBe('refused-domain');
            return result.status === 'refused-domain' ? result.error.message : '';
        };
        expect(refusal('hermite-mode', 'bezier')).toBe('Vrsta krivulje je lahko Catmull-Romov zlepek ali Hermiteova krivulja.');
        expect(refusal('hermite-tension', 3)).toBe('Napetost mora biti število od 0 do 2.');
        setLanguage('en');
        expect(refusal('hermite-mode', 'bezier')).toBe('The curve type can be the Catmull-Rom spline or the Hermite curve.');
        act(() => { graph.parameters!.write('hermite-mode', 'hermite', 'learner'); });
        expect(refusal('hermite-tension', 1.5)).toBe('The tension only works for the Catmull-Rom spline.');
        view.unmount();
    });

    test('the curve legend names the curve type in the current language', () => {
        const {graph, declaration, view} = setup();
        const label = () => renderMessage(declaration().legend!.find(entry => entry.id === 'curve')!.label);
        expect(label()).toBe('Catmull-Romov zlepek');
        act(() => learner(() => graph.setMode('hermite')));
        expect(label()).toBe('Hermiteova krivulja');
        setLanguage('en');
        expect(label()).toBe('Hermite curve');
        view.unmount();
    });

    test('the display actions flip the switches as the learner', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.performAction('bezier'));
        expect(graph.state.showBezier).toBe(true);
        expect(declaration().actions!.find(a => a.id === 'bezier')!.pressed).toBe(true);
        act(() => learner(() => graph.performAction('tangents')));
        expect(graph.state.showTangents).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
        view.unmount();
    });
});
