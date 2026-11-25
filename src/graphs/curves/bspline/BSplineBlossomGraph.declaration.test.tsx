import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import BSplineBlossomGraph, {type BSplineBlossomIds} from './BSplineBlossomGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: BSplineBlossomGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new BSplineBlossomGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<BSplineBlossomIds>};
}

const write = (key: BSplineBlossomIds['param'], value: unknown): Step => graph => { graph.parameters!.write(key, value, 'learner'); };

const states: {name: string; steps: Step[]; showBezier: boolean; curveNote: boolean}[] = [
    {name: 'default', steps: [], showBezier: true, curveNote: false},
    {name: 'an a, b pair in the first segment', steps: [write('blossom-a', 0.25), write('blossom-b', 0.75)], showBezier: true, curveNote: false},
    {name: 'a = b inside the segment', steps: [write('blossom-a', 0.5), write('blossom-b', 0.5)], showBezier: true, curveNote: true},
    {name: 'a = b outside the segment', steps: [write('blossom-a', 1.5), write('blossom-b', 1.5)], showBezier: true, curveNote: true},
    {name: 'the second segment', steps: [write('blossom-segment', '3'), write('blossom-a', 1.25), write('blossom-b', 1.5)], showBezier: true, curveNote: false},
    {name: 'degree 3', steps: [graph => learner(() => graph.setDegree(3))], showBezier: true, curveNote: false},
    {name: 'the Bezier points hidden', steps: [graph => graph.performAction('show-bezier')], showBezier: false, curveNote: false},
];

describe('Blossom declaration', () => {
    for (const {name, steps, showBezier, curveNote} of states) {
        test(`${name}: consistent, bound, drawn and the sentences of the old panel`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();
            const degree = graph.state.degree;

            expect(checkDeclaration(current)).toEqual([]);
            for (const parameter of current.parameters ?? []) expect(graph.parameters!.keys(), parameter.key).toContain(parameter.key);
            expect((current.parameters ?? []).filter(p => p.kind === 'range').map(p => p.key)).toEqual(['blossom-a', 'blossom-b', 'blossom-c'].slice(0, degree));

            // the legend resolves to drawn objects; the Bezier markers follow the switch
            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(entry.id === 'bezier' ? showBezier : true);
            }
            expect(current.actions).toMatchObject([{id: 'show-bezier', placement: 'board', puck: true, pressed: showBezier}]);

            // the notes are the sentences the inspector used to show; the curve sentence only for equal arguments
            const notes = Object.fromEntries((current.notes ?? []).map(note => [note.id, renderMessage(note.text)]));
            expect(Object.keys(notes).sort()).toEqual((curveNote ? ['bezier-points', 'curve', 'reversed', 'symmetry', 'value'] : ['bezier-points', 'reversed', 'symmetry', 'value']).sort());
            expect(notes.value).toMatch(/^f\(/);
            expect(notes.reversed).toMatch(/^Obrnjen vrstni red: f\(/);
            expect((graph.curveCheck() !== undefined)).toBe(curveNote);
            expect(current.marks?.must?.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the segment is a choice puck for two segments and the legend text is localized', () => {
        const {declaration, view} = setup();
        const choice = declaration().parameters!.find(p => p.key === 'blossom-segment');
        expect(choice).toMatchObject({kind: 'choice', placement: 'board', puck: true});
        expect(declaration().legend!.find(entry => entry.id === 'triangle')).toBeDefined();
        setLanguage('en');
        expect(renderMessage(declaration().legend!.find(entry => entry.id === 'triangle')!.label)).not.toBe('');
        view.unmount();
    });

    test('performAction toggles the Bezier points as the learner and refuses an unknown action', () => {
        const {graph, declaration, view} = setup();
        expect(declaration().actions![0].pressed).toBe(true);
        act(() => graph.performAction('show-bezier'));
        expect(declaration().actions![0].pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
        view.unmount();
    });
});
