import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {HULL_PENTAGON_MODEL, PolygonAreaGraph, type PolygonAreaIds} from './PolygonAreaGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const polygon = (points: [number, number][], closed = true) => ({mode: 'polygon' as const, closed, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const declare = (graph: PolygonAreaGraph) => graph.getDeclaration() as GraphDeclaration<PolygonAreaIds>;
const action = (graph: PolygonAreaGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;

const STATES: readonly {name: string; apply(graph: PolygonAreaGraph): void; points: number; outline: boolean}[] = [
    {name: 'default', apply: () => {}, points: 5, outline: true},
    {name: 'a point moved', apply: graph => { graph.movePointTo(2, {x: 6, y: 1}); }, points: 5, outline: true},
    {name: 'a point added', apply: graph => { graph.addPointAt({x: 1, y: 6}); }, points: 6, outline: true},
    {name: 'a point removed', apply: graph => { graph.select(1); graph.removeSelected(); }, points: 4, outline: true},
    {name: 'opened', apply: graph => { graph.setPolygonClosed(false); }, points: 5, outline: false},
    {name: 'closed again', apply: graph => { graph.setPolygonClosed(false); graph.setPolygonClosed(true); }, points: 5, outline: true},
    {name: 'two points', apply: graph => { graph.loadModel(polygon([[0, 0], [4, 1]])); }, points: 2, outline: false},
    {name: 'empty', apply: graph => { graph.clear(); }, points: 0, outline: false},
];

describe('polygon area declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, readout equals the panel', ({apply, points, outline}) => {
        const graph = new PolygonAreaGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        // points are board-owned: no parameter is declared, nothing is bound
        expect(declaration.parameters).toBeUndefined();
        expect(graph.parameters?.keys() ?? []).toEqual([]);

        // the marks are exactly the model's points, plus the outline of a closed polygon
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x, y: p.y})));
        expect(declaration.marks!.must.length).toBe(points);
        expect(declaration.marks!.nice?.length ?? 0).toBe(outline ? 1 : 0);

        // the legend resolves; points are drawn exactly when there are some
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'fan', 'lattice']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(graph.drawnObject('points')!.visible).toBe(points > 0);

        // the notes are the sentences of the panel, in its order
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThan(0);
    });

    test('marks stay put on an unchanged state and follow a drag', () => {
        const graph = new PolygonAreaGraph();
        mountGraph(graph);
        act(() => graph.loadModel(HULL_PENTAGON_MODEL));
        const before = declare(graph).marks!;
        act(() => { graph.movePointTo(3, {x: 7, y: 2}); });
        expect(declare(graph).marks!.must[3]).toEqual({kind: 'point', x: 7, y: 2});
        expect(declare(graph).marks!.must).not.toEqual(before.must);
    });

    test('the switches are actions that run as the learner and follow the state', () => {
        const graph = new PolygonAreaGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'fan', 'lattice', 'values', 'closed']);
        expect(action(graph, 'fan')).toMatchObject({placement: 'board', puck: true, pressed: true});
        expect(action(graph, 'lattice')).toMatchObject({placement: 'board', puck: true, pressed: true});
        expect(action(graph, 'grid')).toMatchObject({placement: 'tools', section: 'display', pressed: false});
        expect(action(graph, 'closed')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        for (const id of ['grid', 'fan', 'lattice', 'values']) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
            expect(graph.overlayShown(id as 'grid'), id).toBe(!was);
        }
        act(() => graph.performAction('closed'));
        expect(action(graph, 'closed').pressed).toBe(false);
        expect(graph.model.closed).toBe(false);
        act(() => graph.performAction('closed'));
        expect(graph.model.closed).toBe(true);
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a hidden overlay hides its legend entry', () => {
        const graph = new PolygonAreaGraph();
        mountGraph(graph);
        expect(graph.drawnObject('fan')!.visible).toBe(true);
        expect(graph.drawnObject('lattice')!.visible).toBe(true);
        act(() => graph.performAction('fan'));
        expect(graph.drawnObject('fan')!.visible).toBe(false);
        expect(graph.drawnObject('lattice')!.visible).toBe(true);
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });

    test('closed is not declared outside polygon mode', () => {
        const graph = new PolygonAreaGraph();
        mountGraph(graph);
        act(() => graph.loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}]}));
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'fan', 'lattice', 'values']);
    });
});
