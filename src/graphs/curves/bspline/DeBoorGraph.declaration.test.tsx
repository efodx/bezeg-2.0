import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import DeBoorGraph, {type DeBoorIds} from './DeBoorGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: DeBoorGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new DeBoorGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<DeBoorIds>};
}

const write = (value: number): Step => graph => { graph.parameters!.write('deboor-t', value, 'learner'); };

const states: {name: string; steps: Step[]; t: number; level: number; degree: number}[] = [
    {name: 'default', steps: [], t: 0.5, level: 0, degree: 2},
    {name: 't in the second span', steps: [write(1.5)], t: 1.5, level: 0, degree: 2},
    {name: 't at a knot', steps: [write(1)], t: 1, level: 0, degree: 2},
    {name: 'two levels revealed', steps: [graph => graph.performAction('next-level'), graph => graph.performAction('next-level')], t: 0.5, level: 2, degree: 2},
    {name: 'degree 3', steps: [graph => learner(() => graph.setDegree(3))], t: 0.5, level: 0, degree: 3},
    {name: 'degree 1', steps: [graph => learner(() => graph.setDegree(1))], t: 0.5, level: 0, degree: 1},
    {name: 'a fifth point added', steps: [graph => learner(() => graph.changePointCount(true))], t: 0.5, level: 0, degree: 2},
];

describe('De Boor declaration', () => {
    for (const {name, steps, t, level, degree} of states) {
        test(`${name}: consistent, bound, drawn`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();

            expect(checkDeclaration(current)).toEqual([]);
            expect(graph.state.degree).toBe(degree);
            for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys(), parameter.key).toContain(parameter.key);
            expect(current.parameters).toMatchObject([{key: 'deboor-t', kind: 'range', placement: 'board', symbol: 't'}]);
            expect(graph.parameters!.read('deboor-t')).toBe(t);

            // every legend entry resolves to a drawn object; the intermediate points only exist from degree 2
            for (const entry of current.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(degree >= 2 ? ['curve', 'control', 'active', 'levels', 'point'] : ['curve', 'control', 'active', 'point']);
            // the final point of the triangle appears with the last level
            expect(graph.drawnObject('point')!.visible).toBe(level >= degree);
            expect(graph.drawnObject('active')!.visible).toBe(true);

            expect(graph.state.level).toBe(level);
            expect(current.actions).toMatchObject([
                {id: 'next-level', placement: 'tools', enabled: level < degree},
                {id: 'play', pressed: false},
                {id: 'reset-levels', enabled: level > 0},
            ]);
            expect(current.marks?.must?.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the legend text and the parameter label follow the language; a refused write carries a reason', () => {
        const {graph, declaration, view} = setup();
        const label = () => renderMessage(declaration().parameters![0].label);
        const point = () => renderMessage(declaration().legend!.find(entry => entry.id === 'point')!.label);
        expect(label()).toBe('Parameter');
        expect(point()).toBe('Točka krivulje C(t)');
        const refusal = () => {
            const result = graph.parameters!.write('deboor-t', Number.NaN, 'learner');
            expect(result.status).toBe('refused-domain');
            return result.status === 'refused-domain' ? result.error.message : '';
        };
        expect(refusal()).toBe('Parameter mora biti končno število.');
        setLanguage('en');
        expect(point()).toBe('Curve point C(t)');
        expect(refusal()).toBe('The parameter must be a finite number.');
        view.unmount();
    });

    test('performAction runs the playback methods as the learner and refuses an unknown action', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.performAction('next-level'));
        expect(graph.state.level).toBe(1);
        expect(declaration().actions!.find(a => a.id === 'reset-levels')!.enabled).toBe(true);
        act(() => graph.performAction('reset-levels'));
        expect(graph.state.level).toBe(0);
        act(() => graph.performAction('play'));
        expect(declaration().actions!.find(a => a.id === 'play')!.pressed).toBe(true);
        act(() => graph.performAction('play'));
        expect(declaration().actions!.find(a => a.id === 'play')!.pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
        view.unmount();
    });
});
