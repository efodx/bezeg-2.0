import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import BSplineInsertionGraph, {type BSplineInsertionIds} from './BSplineInsertionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import {joinReports, multiplicityRows} from './bsplineInsertionModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: BSplineInsertionGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new BSplineInsertionGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<BSplineInsertionIds>};
}

const text = (declaration: GraphDeclaration<BSplineInsertionIds>) =>
    Object.fromEntries((declaration.notes ?? []).map(note => [note.id, renderMessage(note.text)]));

const num = (value: number) => String(value).replace('.', ',');

const states: {name: string; steps: Step[]; ghost: boolean; comb: boolean}[] = [
    {name: 'default quadratic', steps: [], ghost: false, comb: true},
    {name: 'an insertion of an existing knot', steps: [graph => learner(() => graph.insert(1))], ghost: true, comb: true},
    {name: 'an insertion of a new knot', steps: [graph => learner(() => graph.insert(0.5))], ghost: true, comb: true},
    {name: 'the comb hidden', steps: [graph => learner(() => graph.setShowComb(false))], ghost: false, comb: false},
    {name: 'the cubic with the double knot', steps: [graph => learner(() => graph.selectExample('cubic'))], ghost: false, comb: true},
    {name: 'the cubic with a triple and then a quadruple knot', steps: [graph => learner(() => { graph.selectExample('cubic'); graph.insert(2); graph.insert(2); })], ghost: true, comb: true},
    {name: 'a point moved after an insertion', steps: [graph => learner(() => { graph.insert(0.5); graph.editPoint(2, [3, 3]); })], ghost: true, comb: true},
    {name: 'reset after an insertion', steps: [graph => learner(() => { graph.insert(0.5); graph.resetToOrigin(); })], ghost: false, comb: true},
];

describe('Insertion declaration', () => {
    for (const {name, steps, ghost, comb} of states) {
        test(`${name}: consistent, drawn and the sentences of the old panel`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();
            const {knots, degree, points} = graph.state;

            expect(checkDeclaration(current)).toEqual([]);
            expect(current.parameters ?? []).toEqual([]);
            expect(current.marks?.must?.length).toBe(points.length);

            // the sentences follow the kernel: multiplicity and continuity per interior knot, the jumps while the comb is shown
            const notes = text(current);
            const rows = multiplicityRows(knots, degree);
            const reports = joinReports(knots, degree, points);
            expect('ghost' in notes).toBe(ghost);
            rows.forEach((row, index) => {
                const continuity = row.continuity >= 0 ? `C${row.continuity}` : 'prekinitev (nezvezno)';
                expect(notes[`mult-${index + 1}`]).toBe(`u = ${num(row.knot)}: večkratnost ${row.multiplicity}, zveznost ${continuity}`);
            });
            expect(Object.keys(notes).filter(id => id.startsWith('mult-'))).toHaveLength(rows.length);
            expect(Object.keys(notes).filter(id => id.startsWith('jump-'))).toHaveLength(comb ? reports.length : 0);
            if (comb) reports.forEach((report, index) => expect(notes[`jump-${index + 1}`]).toContain(`u = ${num(report.t)}: κ `));

            // the comb switch is a pressed puck and follows the state; the insertion button is an Orodja action
            const actions = current.actions ?? [];
            expect(actions.find(action => action.id === 'comb')).toMatchObject({placement: 'board', puck: true, pressed: comb, enabled: true});
            expect(renderMessage(actions.find(action => action.id === 'comb')!.label).length).toBeLessThanOrEqual(16);
            expect(actions.find(action => action.id === 'insert')).toMatchObject({placement: 'tools', enabled: true});

            // the legend resolves to drawn objects
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(['curve', 'control', ...(ghost ? ['ghost'] : []), ...(comb ? ['comb'] : [])]);
            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(true);
            }
            view.unmount();
        });
    }

    test('the declared actions run as the learner: the comb puck flips the comb and insert inserts the field value', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.performAction('comb'));
        expect(graph.state.showComb).toBe(false);
        expect(declaration().actions!.find(action => action.id === 'comb')!.pressed).toBe(false);
        act(() => graph.performAction('insert'));
        expect(graph.state.points).toHaveLength(5);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });

    test('the sentences and the legend follow a language switch', () => {
        const {declaration, view} = setup(graph => learner(() => graph.insert(1)));
        expect(text(declaration())['mult-1']).toBe('u = 1: večkratnost 2, zveznost C0');
        act(() => setLanguage('en'));
        expect(text(declaration())['mult-1']).toBe('u = 1: multiplicity 2, continuity C0');
        expect(text(declaration())['ghost']).toBe('The faded polygon is the one before the last insertion.');
        expect(renderMessage(declaration().legend!.find(entry => entry.id === 'ghost')!.label)).toBe('Previous polygon');
        view.unmount();
    });
});
