import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import BSplineNurbsGraph, {errorText, type BSplineNurbsIds} from './BSplineNurbsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {currentLanguage, renderMessage, setLanguage} from '../../../localization';
import {formatNumber} from '../../../analysis/format';
import {runAs} from '../../base/writes/writeSource';
import {domain} from '../../../bezeg/impl/curve/bspline';
import {angleDegrees, nurbsPointAt} from './bsplineNurbsModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: BSplineNurbsGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new BSplineNurbsGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<BSplineNurbsIds>};
}

const text = (declaration: GraphDeclaration<BSplineNurbsIds>) =>
    Object.fromEntries((declaration.notes ?? []).map(note => [note.id, renderMessage(note.text)]));

const states: {name: string; steps: Step[]; circle: boolean}[] = [
    {name: 'default circle', steps: [], circle: true},
    {name: 't = 1/8', steps: [graph => learner(() => graph.setT(0.125))], circle: true},
    {name: 't at the end of the domain', steps: [graph => learner(() => graph.setT(1))], circle: true},
    {name: 'the unit weights', steps: [graph => learner(() => graph.selectExample('unit'))], circle: true},
    {name: 'a corner weight 2', steps: [graph => learner(() => graph.setWeight(1, 2))], circle: true},
    {name: 'the circle hidden', steps: [graph => learner(() => graph.setShowCircle(false))], circle: false},
    {name: 'a point moved', steps: [graph => learner(() => graph.editPoint(2, [0.2, 1.4]))], circle: true},
    {name: 'reset after an edit', steps: [graph => learner(() => { graph.setWeight(1, 2); graph.resetToOrigin(); })], circle: true},
];

describe('NURBS declaration', () => {
    for (const {name, steps, circle} of states) {
        test(`${name}: consistent, drawn and the sentences of the old panel`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();
            const {points, t} = graph.state;

            expect(checkDeclaration(current)).toEqual([]);
            expect(current.marks?.must?.length).toBe(points.length + 1);

            // the sentences: the radial error and the point with its angle, in the language's separators
            const notes = text(current);
            expect(notes.error).toBe(`Največji odmik od enotske krožnice: ${errorText(graph.radialError())}`);
            const point = nurbsPointAt(graph.state, t);
            const num = (value: number, digits: number) => formatNumber(value, currentLanguage(), digits);
            expect(notes.point).toBe(`C(t) = (${num(point[0], 5)}, ${num(point[1], 5)}), kot ${num(angleDegrees(point), 3)}°`);

            // the parameter t is a board range puck over the knot domain, bound by key
            const [low, high] = domain(graph.state.knots, graph.state.degree, points.length - 1);
            expect(current.parameters).toEqual([expect.objectContaining({key: 'nurbs-t', kind: 'range', symbol: 't', placement: 'board', min: low, max: high, step: 0.001})]);
            expect(renderMessage(current.parameters![0].label)).toBe('Parameter');

            // the circle switch is a pressed puck and follows the state
            const action = current.actions!.find(candidate => candidate.id === 'circle')!;
            expect(action).toMatchObject({placement: 'board', puck: true, pressed: circle, enabled: true});
            expect(renderMessage(action.label).length).toBeLessThanOrEqual(16);

            // the legend resolves to drawn objects
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(['curve', 'control', 'marker', ...(circle ? ['circle'] : [])]);
            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(true);
            }
            view.unmount();
        });
    }

    test('the declared action runs as the learner', () => {
        const {graph, declaration, view} = setup();
        act(() => graph.performAction('circle'));
        expect(graph.state.showCircle).toBe(false);
        expect(declaration().actions!.find(action => action.id === 'circle')!.pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });

    test('the sentences and the legend follow a language switch', () => {
        const {declaration, view} = setup();
        expect(text(declaration()).error).toMatch(/^Največji odmik od enotske krožnice: /);
        expect(text(declaration()).point).toMatch(/^C\(t\) = \(0,92979, 0,36809\), kot 21,598°$/);
        act(() => setLanguage('en'));
        expect(text(declaration()).error).toMatch(/^Largest deviation from the unit circle: /);
        expect(text(declaration()).point).toBe('C(t) = (0.92979, 0.36809), angle 21.598°');
        expect(renderMessage(declaration().legend!.find(entry => entry.id === 'marker')!.label)).toBe('Point C(t)');
        view.unmount();
    });
});
