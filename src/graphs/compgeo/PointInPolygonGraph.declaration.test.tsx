import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PointInPolygonGraph, type PointInPolygonIds} from './PointInPolygonGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: PointInPolygonGraph) => graph.getDeclaration() as GraphDeclaration<PointInPolygonIds>;
const action = (graph: PointInPolygonGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const polygon = (closed: boolean, points: [number, number][]) => ({mode: 'polygon' as const, closed, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});

const STATES: readonly {name: string; apply(graph: PointInPolygonGraph): void; notes: string[]}[] = [
    {name: 'default (inside)', apply: () => {}, notes: ['location', 'crossings', 'even-odd', 'winding', 'nonzero']},
    {name: 'notch (outside)', apply: graph => { graph.setQuery({x: 3, y: 3}); }, notes: ['location', 'crossings', 'even-odd', 'winding', 'nonzero']},
    {name: 'on an edge', apply: graph => { graph.setQuery({x: 3, y: 0}); }, notes: ['location', 'boundary-note']},
    {name: 'pentagram centre', apply: graph => { graph.loadFigure('pentagram'); }, notes: ['location', 'crossings', 'even-odd', 'winding', 'nonzero', 'not-simple']},
    {name: 'values hidden', apply: graph => { graph.setOverlay('values', false); }, notes: ['hidden']},
    {name: 'open polygon', apply: graph => { graph.loadModel(polygon(false, [[0, 0], [4, 0], [4, 4]])); }, notes: ['open']},
    {name: 'two vertices', apply: graph => { graph.loadModel(polygon(true, [[0, 0], [4, 0]])); }, notes: ['too-few']},
    {name: 'self-crossing', apply: graph => { graph.loadModel(polygon(true, [[0, 0], [4, 4], [4, 0], [0, 4]])); graph.setQuery({x: 2, y: 1}); }, notes: ['location', 'crossings', 'even-odd', 'winding', 'nonzero', 'not-simple']},
];

describe('point-in-polygon declaration', () => {
    test.each(STATES)('$name: consistent, marks include q, the notes equal the panel', ({apply, notes}) => {
        const graph = new PointInPolygonGraph();
        const {view} = mountGraph(graph);
        act(() => runAs('learner', () => apply(graph)));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual([
            ...graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})),
            {kind: 'point', x: graph.query.x * unit, y: graph.query.y * unit},
        ]);
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'query', 'ray', 'winding']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(graph.drawnObject('query')!.visible).toBe(true);

        expect(declaration.notes!.map(candidate => candidate.id)).toEqual(notes);
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(candidate => normalise(renderMessage(candidate.text)))).toEqual(panel);
    });

    test('the sentences follow q', () => {
        const graph = new PointInPolygonGraph();
        mountGraph(graph);
        const text = () => declare(graph).notes!.map(note => renderMessage(note.text));
        expect(text()[0]).toBe('Točka q je znotraj večkotnika.');
        act(() => runAs('learner', () => { graph.setQuery({x: 3, y: 3}); }));
        expect(text()[0]).toBe('Točka q je zunaj večkotnika.');
        expect(text()[3]).toBe('Ovojno število: 0');
        act(() => runAs('learner', () => { graph.loadFigure('pentagram'); }));
        expect(text()[0]).toBe('Točka q je znotraj ali zunaj, odvisno od pravila.');
        expect(text()[3]).toBe('Ovojno število: 2');
    });

    test('ray and winding are board pucks that follow the overlays; the verdict and the grid stay in Orodja', () => {
        const graph = new PointInPolygonGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'ray', 'winding', 'values', 'closed']);
        expect(action(graph, 'ray')).toMatchObject({placement: 'board', puck: true, pressed: true});
        expect(action(graph, 'winding')).toMatchObject({placement: 'board', puck: true, pressed: false});
        expect(action(graph, 'values')).toMatchObject({placement: 'tools', pressed: true});
        expect(action(graph, 'grid')).toMatchObject({placement: 'tools', pressed: false});
        for (const id of ['grid', 'ray', 'winding', 'values']) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
            expect(graph.overlayShown(id as 'grid'), id).toBe(!was);
        }
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('puck labels fit the strip', () => {
        const graph = new PointInPolygonGraph();
        mountGraph(graph);
        for (const id of ['ray', 'winding']) expect(renderMessage(action(graph, id).label).length, id).toBeLessThanOrEqual(16);
    });

    test('a hidden ray hides its legend entry', () => {
        const graph = new PointInPolygonGraph();
        mountGraph(graph);
        expect(graph.drawnObject('ray')!.visible).toBe(true);
        act(() => graph.performAction('ray'));
        expect(graph.drawnObject('ray')!.visible).toBe(false);
    });
});
