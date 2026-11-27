import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {OrientationGraph, type OrientationIds} from './OrientationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const model = (points: [number, number][], gridStepExponent = 0) =>
    ({mode: 'points' as const, closed: false, gridStepExponent, points: points.map(([x, y]) => ({x, y}))});
const declare = (graph: OrientationGraph) => graph.getDeclaration() as GraphDeclaration<OrientationIds>;
const action = (graph: OrientationGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;

const STATES: readonly {name: string; apply(graph: OrientationGraph): void; points: number; note: string}[] = [
    {name: 'default (left turn)', apply: () => {}, points: 3, note: 'turn'},
    {name: 'right turn', apply: graph => { graph.loadModel(model([[0, 0], [4, 0], [3, -2]])); }, points: 3, note: 'turn'},
    {name: 'collinear', apply: graph => { graph.loadModel(model([[0, 0], [4, 0], [8, 0]])); }, points: 3, note: 'turn'},
    {name: 'a point moved', apply: graph => { graph.movePointTo(2, {x: 1, y: 5}); }, points: 3, note: 'turn'},
    {name: 'values hidden', apply: graph => { graph.setOverlay('values', false); }, points: 3, note: 'hidden'},
    {name: 'two points', apply: graph => { graph.loadModel(model([[0, 0], [4, 0]])); }, points: 2, note: 'missing'},
    {name: 'finer grid', apply: graph => { graph.loadModel(model([[0, 0], [4, 0], [3, 2]], -1)); }, points: 3, note: 'turn'},
];

describe('orientation declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, the note equals the panel', ({apply, points, note}) => {
        const graph = new OrientationGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        expect(declaration.marks!.must.length).toBe(points);

        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'turn']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        expect(declaration.notes!.map(candidate => candidate.id)).toEqual([note]);
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(candidate => normalise(renderMessage(candidate.text)))).toEqual(panel);
    });

    test('the sentence names the turn and the value', () => {
        const graph = new OrientationGraph();
        mountGraph(graph);
        const text = () => renderMessage(declare(graph).notes![0].text);
        expect(text()).toBe('Orientacija treh točk p, q, r: +8 (levi zavoj)');
        act(() => { graph.loadModel(model([[0, 0], [4, 0], [3, -2]])); });
        expect(text()).toBe('Orientacija treh točk p, q, r: −8 (desni zavoj)');
        act(() => { graph.loadModel(model([[0, 0], [4, 0], [8, 0]])); });
        expect(text()).toBe('Orientacija treh točk p, q, r: 0 (kolinearne točke)');
    });

    test('turn is a board puck that follows the overlay; the numbers and the grid stay in Orodja', () => {
        const graph = new OrientationGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'turn', 'values']);
        expect(action(graph, 'turn')).toMatchObject({placement: 'board', puck: true, pressed: true});
        expect(action(graph, 'values')).toMatchObject({placement: 'tools', pressed: true});
        expect(action(graph, 'grid')).toMatchObject({placement: 'tools', pressed: false});
        for (const id of ['grid', 'turn', 'values']) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
            expect(graph.overlayShown(id as 'grid'), id).toBe(!was);
        }
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a hidden turn hides its legend entry', () => {
        const graph = new OrientationGraph();
        mountGraph(graph);
        expect(graph.drawnObject('turn')!.visible).toBe(true);
        act(() => graph.performAction('turn'));
        expect(graph.drawnObject('turn')!.visible).toBe(false);
    });
});
