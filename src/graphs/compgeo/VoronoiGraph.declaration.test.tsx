import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {VoronoiGraph, type VoronoiIds} from './VoronoiGraph';
import {DegenerateSitesGraph} from './DegenerateSitesGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';
import {RationalPoint, Rational} from '../../compgeo/rational';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: VoronoiGraph) => graph.getDeclaration() as GraphDeclaration<VoronoiIds>;
const action = (graph: VoronoiGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const learner = (change: () => void) => runAs('learner', change);
const points = (list: [number, number][]) => ({mode: 'points', closed: false, gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});
const COLLINEAR: [number, number][] = [[0, 0], [2, 2], [4, 4]];

const STATES: readonly {name: string; apply(graph: VoronoiGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'diagram shown', apply: graph => learner(() => graph.setOverlay('diagram', true))},
    {name: 'diagram and duality, a triangle selected', apply: graph => {
        learner(() => { graph.setOverlay('diagram', true); graph.setOverlay('delaunay', true); graph.selectTriangle(0); });
    }},
    {name: 'a cell, three bisectors', apply: graph => learner(() => { graph.selectSite(5); graph.constructNext(); graph.constructNext(); graph.constructNext(); })},
    {name: 'a cell, construction done', apply: graph => learner(() => {
        graph.selectSite(5);
        for (let k = 0; k < 8; k++) graph.constructNext();
    })},
    {name: 'query on a border', apply: graph => learner(() => { graph.setOverlay('diagram', true); graph.setQueryPoint(new RationalPoint(Rational.of(4), Rational.of(-1))); })},
    {name: 'collinear sites', apply: graph => { learner(() => { graph.loadModel(points(COLLINEAR) as never); graph.setOverlay('diagram', true); }); }},
    {name: 'one site (refused)', apply: graph => { learner(() => graph.loadModel(points([[1, 1]]) as never)); }},
    {name: 'duplicate sites (refused)', apply: graph => { learner(() => graph.loadModel(points([[1, 1], [1, 1], [3, 0]]) as never)); }},
];

describe('voronoi declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the sites and q, notes equal the panel', ({apply}) => {
        const graph = new VoronoiGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();
        const unit = 2 ** graph.model.gridStepExponent;
        const query = graph.query;
        expect(declaration.marks!.must).toEqual([
            ...graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})),
            {kind: 'point', x: query.x.toNumber() * unit, y: query.y.toNumber() * unit},
        ]);
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'query', 'diagram', 'delaunay', 'bisector']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        const panel = [...view.container.querySelectorAll('[data-readout-note], [data-readout]')]
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const notes = declaration.notes!.map(note => normalise(renderMessage(note.text)));
        expect(notes).toEqual(panel);
    });

    test('the notes name what the scene shows', () => {
        const graph = new VoronoiGraph();
        mountGraph(graph);
        act(() => { learner(() => graph.setOverlay('diagram', false)); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['construction', 'query-at', 'query-nearest']);
        act(() => { learner(() => { graph.setOverlay('diagram', true); graph.setOverlay('delaunay', true); graph.selectTriangle(0); }); });
        const ids = declare(graph).notes!.map(note => note.id);
        expect(ids.slice(0, 8)).toEqual(['construction', 'sites', 'vertices', 'edges', 'rays', 'bounded', 'unbounded', 'vertex-0']);
        expect(ids.slice(-3)).toEqual(['query-at', 'query-nearest', 'selected-vertex']);
        act(() => { learner(() => graph.loadModel(points([[1, 1]]) as never)); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['refusal', 'query-at']);
    });

    test('the legend follows what is drawn', () => {
        const graph = new VoronoiGraph();
        mountGraph(graph);
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect([visible('query'), visible('diagram'), visible('delaunay'), visible('bisector')]).toEqual([true, true, false, false]);
        act(() => { learner(() => graph.performAction('diagram')); });
        expect(visible('diagram')).toBe(false);
        expect(action(graph, 'diagram').pressed).toBe(false);
        act(() => { learner(() => graph.performAction('diagram')); });
        expect(visible('diagram')).toBe(true);
        act(() => { learner(() => graph.performAction('delaunay')); });
        expect(visible('delaunay')).toBe(true);
        act(() => { learner(() => { graph.selectSite(5); }); });
        expect(visible('bisector')).toBe(false);
        act(() => { learner(() => { graph.constructNext(); }); });
        expect(visible('bisector')).toBe(true);
        act(() => { learner(() => graph.performAction('diagram')); });
        expect(visible('diagram')).toBe(false);
        expect(visible('bisector')).toBe(true);
    });

    test('the diagram and duality are pucks, the construction playback is a tools action', () => {
        const graph = new VoronoiGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'diagram', 'delaunay', 'next-step', 'play', 'reset']);
        for (const id of ['diagram', 'delaunay']) expect(action(graph, id), id).toMatchObject({placement: 'board', puck: true});
        expect(renderMessage(action(graph, 'delaunay').label)).toBe('Dualnost');
        for (const id of ['next-step', 'play', 'reset']) expect(action(graph, id), id).toMatchObject({placement: 'tools', section: 'playback'});
        // Without a chosen site there is nothing to step.
        expect([action(graph, 'next-step').enabled, action(graph, 'play').enabled, action(graph, 'reset').enabled]).toEqual([false, false, false]);
        act(() => { learner(() => graph.selectSite(5)); });
        expect(action(graph, 'next-step').enabled).toBe(true);
        act(() => graph.performAction('next-step'));
        expect(graph.construction).toBe(1);
        expect(action(graph, 'reset').enabled).toBe(true);
        act(() => graph.performAction('reset'));
        expect(graph.construction).toBe(0);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(true);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a drag moves the marks', () => {
        const graph = new VoronoiGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { learner(() => { graph.movePointTo(1, {x: 9, y: 1}); }); });
        expect(declare(graph).marks!.must[1]).toEqual({kind: 'point', x: 9, y: 1});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the degenerate-sites graph is declared too', () => {
        const graph = new DegenerateSitesGraph();
        mountGraph(graph);
        expect(graph.getDeclaration()).toBeDefined();
    });
});
