import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import InterpolationGraph, {type InterpolationIds} from './InterpolationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: InterpolationGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new InterpolationGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<InterpolationIds>};
}

const states: {name: string; steps: Step[]; legend: string[]; notes: string[]; s: number; rule: string}[] = [
    {name: 'default', steps: [], legend: ['points', 'lagrange', 'bezier'], notes: ['lagrange-weights', 'bezier-weights'], s: 0.5, rule: 'uniform'},
    {name: 'hull shown', steps: [graph => graph.performAction('hull')], legend: ['points', 'lagrange', 'bezier', 'hull'], notes: ['lagrange-weights', 'bezier-weights'], s: 0.5, rule: 'uniform'},
    {name: 'bezier hidden', steps: [graph => graph.performAction('bezier')], legend: ['points', 'lagrange'], notes: ['lagrange-weights'], s: 0.5, rule: 'uniform'},
    {
        name: 'chord rule at s = 0.25',
        steps: [graph => { graph.parameters!.write('interp-rule', 'chord', 'learner'); graph.parameters!.write('interp-s', 0.25, 'learner'); }],
        legend: ['points', 'lagrange', 'bezier'], notes: ['lagrange-weights', 'bezier-weights'], s: 0.25, rule: 'chord',
    },
];

describe('Interpolation (Lagrange) declaration', () => {
    for (const {name, steps, legend, notes, s, rule} of states) {
        test(`${name}: consistent, bound, drawn`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();

            expect(checkDeclaration(current)).toEqual([]);
            for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys(), parameter.key).toContain(parameter.key);
            expect(current.parameters).toMatchObject([
                {key: 'interp-s', kind: 'range', placement: 'board', symbol: 's'},
                {key: 'interp-rule', kind: 'choice', placement: 'board', puck: true},
            ]);
            expect(current.parameters![1]).toMatchObject({options: [{value: 'uniform'}, {value: 'chord'}]});
            expect(graph.parameters!.read('interp-s')).toBe(s);
            expect(graph.parameters!.read('interp-rule')).toBe(rule);

            expect((current.legend ?? []).map(entry => entry.id)).toEqual(legend);
            for (const entry of current.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect((current.notes ?? []).map(note => note.id)).toEqual(notes);
            expect(current.actions).toMatchObject([{id: 'hull', placement: 'tools'}, {id: 'bezier', placement: 'tools'}, {id: 'basis', placement: 'tools'}]);
            expect(current.marks?.must?.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the puck snaps the position, the rule write is validated, and a refused write carries a reason in both languages', () => {
        const {graph, declaration, view} = setup();
        const refusal = (key: 'interp-s' | 'interp-rule', value: unknown) => {
            const result = graph.parameters!.write(key, value, 'learner');
            expect(result.status).toBe('refused-domain');
            return result.status === 'refused-domain' ? result.error.message : '';
        };
        expect(refusal('interp-s', Number.NaN)).toBe('Položaj mora biti število od 0 do 1.');
        expect(refusal('interp-rule', 'centripetal')).toBe('Parametri točk so lahko enakomerni ali po dolžini tetiv.');
        const legend = () => renderMessage(declaration().legend!.find(entry => entry.id === 'lagrange')!.label);
        expect(legend()).toBe('Lagrangeeva krivulja');
        setLanguage('en');
        expect(legend()).toBe('Lagrange curve');
        expect(refusal('interp-s', Number.NaN)).toBe('The position must be a number from 0 to 1.');
        expect(refusal('interp-rule', 'centripetal')).toBe('The point parameters can be uniform or by chord length.');
        view.unmount();
    });

    test('the display actions flip the switches as the learner', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.performAction('basis'));
        expect(graph.state.showBasis).toBe(true);
        expect(declaration().actions!.find(a => a.id === 'basis')!.pressed).toBe(true);
        act(() => graph.performAction('hull'));
        expect(graph.state.showHull).toBe(true);
        act(() => learner(() => graph.performAction('hull')));
        expect(graph.state.showHull).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
        view.unmount();
    });
});
