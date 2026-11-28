import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import BSplineBasisGraph, {type BSplineBasisIds} from './BSplineBasisGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {currentLanguage, message, renderMessage, setLanguage, type MessageNumber} from '../../../localization';
import {formatNumber} from '../../../analysis/format';
import {runAs} from '../../base/writes/writeSource';
import {readoutLines, domainNote} from './bsplineBasisModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: BSplineBasisGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new BSplineBasisGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<BSplineBasisIds>};
}

/** The notes, the rows' names and values: the value rows joined as the old sentence, the sum row through the old sentence. */
const text = (declaration: GraphDeclaration<BSplineBasisIds>) => {
    const rows = (declaration.readouts ?? []).flatMap(group => group.rows);
    const values = rows.filter(row => row.id !== 'sum');
    const sum = rows.find(row => row.id === 'sum')!;
    return {
        ...(Object.fromEntries((declaration.notes ?? []).map(note => [note.id, renderMessage(note.text)])) as Record<'head' | 'domain', string>),
        values: values.map(row => `${renderMessage(row.name!)} = ${formatNumber((row.value as MessageNumber).value, currentLanguage(), 4)}`).join('   '),
        count: values.length,
        sum: renderMessage(message('bsb_readout_sum', {value0: sum.value as MessageNumber})),
    };
};

const states: {name: string; steps: Step[]; clamped: boolean; count: number}[] = [
    {name: 'default (degree 2, t = 0,5)', steps: [], clamped: true, count: 3},
    {name: 't = 1,5', steps: [graph => learner(() => graph.setDisplayedT(1.5))], clamped: true, count: 3},
    {name: 'degree 3', steps: [graph => learner(() => graph.setDegree(3))], clamped: true, count: 4},
    {name: 'degree 1, t = 0,25', steps: [graph => learner(() => { graph.setDegree(1); graph.setDisplayedT(0.25); })], clamped: true, count: 2},
    {name: 'unclamped uniform', steps: [graph => learner(() => { graph.setClamped(false); graph.setDisplayedT(2.5); })], clamped: false, count: 3},
    {name: 'an interior knot moved', steps: [graph => learner(() => { graph.editKnot(3, 0.5); graph.setDisplayedT(0.75); })], clamped: true, count: 3},
    {name: 'normalized domain', steps: [graph => learner(() => { graph.setNormalized(true); graph.setDisplayedT(0.3); })], clamped: true, count: 3},
];

describe('B-spline basis declaration', () => {
    for (const {name, steps, clamped, count} of states) {
        test(`${name}: consistent and the lines of the old panel`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();
            const {knots, degree, normalized, t} = graph.state;

            expect(checkDeclaration(current)).toEqual([]);
            expect(current.marks?.must?.length).toBe(1);

            // the four lines of the old panel, in the language's separators
            const lines = [...readoutLines(knots, degree, t, normalized, 'sl'), domainNote(knots, degree, normalized, 'sl')];
            const notes = text(current);
            expect(notes.head).toBe(lines[0]);
            expect(notes.values).toBe(lines[1]);
            expect(notes.count).toBe(count);
            expect(notes.sum).toBe(lines[2]);
            expect(notes.domain).toBe(lines[3]);

            // t and the degree are board pucks over the displayed domain and the degrees 1 to 3
            const shown = normalized ? [0, 1] : [graph.state.knots[degree], graph.state.knots[knots.length - degree - 1]];
            expect(current.parameters).toEqual([
                expect.objectContaining({key: 'basis-t', kind: 'range', symbol: 't', placement: 'board', min: shown[0], max: shown[1]}),
                expect.objectContaining({key: 'basis-degree', kind: 'count', symbol: 'k', placement: 'board', min: 1, max: 3}),
            ]);
            expect(graph.parameters?.read('basis-degree')).toBe(degree);

            // one legend entry per basis function, named N_{i,k}, resolving to the drawn curve and visible
            const total = knots.length - degree - 1;
            expect((current.legend ?? []).map(entry => renderMessage(entry.label)))
                .toEqual(Array.from({length: total}, (_, i) => `N${i},${degree}`));
            for (const entry of current.legend ?? []) {
                expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            }

            // the clamped switch is a pressed puck and follows the state
            const action = current.actions!.find(candidate => candidate.id === 'clamped')!;
            expect(action).toMatchObject({placement: 'board', puck: true, pressed: clamped, enabled: true});
            expect(renderMessage(action.label).length).toBeLessThanOrEqual(16);
            view.unmount();
        });
    }

    test('the parameters are bound: the arbiter writes t by its displayed value and the degree, and refuses nonsense', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.parameters?.write('basis-t', 1.5, 'learner'));
        expect(graph.state.t).toBe(1.5);
        expect(graph.parameters?.read('basis-t')).toBe(1.5);
        act(() => graph.parameters?.write('basis-degree', 3, 'learner'));
        expect(graph.state.degree).toBe(3);
        expect(text(declaration()).head).toMatch(/stopnje 3$/);
        expect(graph.parameters?.write('basis-degree', 4, 'learner').status).toBe('refused-domain');
        expect(graph.parameters?.write('basis-t', Number.NaN, 'learner').status).toBe('refused-domain');
        expect(graph.state.degree).toBe(3);
        view.unmount();
    });

    test('the declared action runs as the learner', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.performAction('clamped'));
        expect(declaration().actions!.find(action => action.id === 'clamped')!.pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });

    test('the lines follow a language switch', () => {
        const {declaration, view} = setup();
        expect(text(declaration()).sum).toBe('vsota = 1');
        act(() => setLanguage('en'));
        expect(text(declaration()).values).toBe('N0,2 = 0.25   N1,2 = 0.625   N2,2 = 0.125');
        expect(text(declaration()).domain).toBe('domain [0, 2]');
        view.unmount();
    });
});
