import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import CurveCombGraph, {type CombCurveKind, type CombIds} from './CurveCombGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: CurveCombGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new CurveCombGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<CombIds>};
}

const kind = (value: CombCurveKind): Step => g => learner(() => g.setCurveKind(value));
const shown = (value: boolean): Step => g => learner(() => g.setCombShown(value));

const states: {name: string; steps: Step[]; shown: boolean; joins: boolean}[] = [
    {name: 'default (the cubic, comb hidden)', steps: [], shown: false, joins: false},
    {name: 'the cubic, comb shown', steps: [shown(true)], shown: true, joins: false},
    {name: 'C1 spline, comb shown', steps: [kind('c1'), shown(true)], shown: true, joins: true},
    {name: 'C2 spline, comb shown', steps: [kind('c2'), shown(true)], shown: true, joins: true},
    {name: 'G1 spline, comb shown', steps: [kind('g1'), shown(true)], shown: true, joins: true},
    {name: 'G1 spline, comb hidden again', steps: [kind('g1'), shown(true), shown(false)], shown: false, joins: false},
];

describe('curve-comb declaration', () => {
    for (const {name, steps, shown: on, joins} of states) {
        test(`${name}: consistent, the legend resolves, the readout is the old caption`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();

            expect(checkDeclaration(current)).toEqual([]);

            // the comb is listed only while it is drawn, and every entry resolves to a drawn object
            const ids = (current.legend ?? []).map(entry => entry.id);
            expect(ids.includes('comb')).toBe(on);
            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(true);
            }

            // the notes are the sentences of the old board caption, one per sentence
            const text = (current.notes ?? []).map(note => renderMessage(note.text)).join(' ');
            expect(text).toBe(graph.comb()!.readoutText());
            expect((current.notes ?? []).length > 0).toBe(joins);
            if (joins) expect(text).toMatch(/^Stik \d: ukrivljenost κ levo/);

            // the switch puck follows the state, the gain puck is bound
            const action = (current.actions ?? []).find(candidate => candidate.id === 'comb-shown');
            expect(action).toMatchObject({placement: 'board', puck: true, pressed: on});
            expect(current.parameters?.map(parameter => parameter.key)).toEqual(['comb-gain']);
            expect(graph.parameters?.read('comb-gain')).toBe(graph.state.combGain);
            view.unmount();
        });
    }

    test('the marks follow the curve and the comb: the tooth tips are marked only while the comb is shown', () => {
        const hidden = setup(kind('c1'));
        const without = hidden.declaration().marks!;
        hidden.view.unmount();
        const {graph, declaration, view} = setup(kind('c1'), shown(true));
        const marks = declaration().marks!;
        expect(marks.must!.length).toBe(without.must!.length);
        expect(marks.nice!.length).toBeGreaterThan(without.nice!.length);
        act(() => learner(() => graph.setCombGain(3)));
        const longer = graph.getDeclaration()!.marks!;
        expect(JSON.stringify(longer.nice)).not.toBe(JSON.stringify(marks.nice));
        view.unmount();
    });

    test('the action flips the comb and the gain writes through the arbiter; a bad gain is a catalog refusal', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.performAction('comb-shown'));
        expect(graph.state.combShown).toBe(true);
        expect(declaration().actions!.find(candidate => candidate.id === 'comb-shown')!.pressed).toBe(true);
        act(() => graph.performAction('comb-shown'));
        expect(graph.state.combShown).toBe(false);
        act(() => { graph.parameters!.write('comb-gain', 2.5, 'learner'); });
        expect(graph.state.combGain).toBe(2.5);
        const result = graph.parameters!.write('comb-gain', 9, 'learner');
        expect(result.status).toBe('refused-domain');
        expect(result.status === 'refused-domain' ? result.error.message : '').toMatch(/od 0,1 do 6|od 0\.1 do 6/);
        view.unmount();
    });

    test('the sentences follow a language switch', () => {
        const {declaration, view} = setup(kind('c1'), shown(true));
        expect(renderMessage(declaration().notes![0].text)).toMatch(/^Stik 1: ukrivljenost κ levo/);
        act(() => setLanguage('en'));
        expect(renderMessage(declaration().notes![0].text)).toMatch(/^Join 1: curvature κ left 1\.3333/);
        view.unmount();
    });
});
