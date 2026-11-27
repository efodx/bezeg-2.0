import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {type VoronoiIds} from './VoronoiGraph';
import {DegenerateSitesGraph} from './DegenerateSitesGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: DegenerateSitesGraph) => graph.getDeclaration() as GraphDeclaration<VoronoiIds>;
const learner = (change: () => void) => runAs('learner', change);
const points = (list: [number, number][]) => ({mode: 'points', closed: false, gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});
const load = (graph: DegenerateSitesGraph, id: string) => (graph as unknown as {loadExample(id: string): void}).loadExample(id);

const STATES: readonly {name: string; apply(graph: DegenerateSitesGraph): void}[] = [
    {name: 'default (square, four-point)', apply: () => {}},
    {name: 'trapezoid', apply: graph => learner(() => load(graph, 'trapezoid'))},
    {name: 'near cocircular (one diagonal)', apply: graph => learner(() => load(graph, 'near'))},
    {name: 'collinear (sites mode)', apply: graph => learner(() => load(graph, 'collinear'))},
    {name: 'sites mode, cell construction', apply: graph => learner(() => { graph.setMode('sites'); graph.selectSite(0); graph.constructNext(); graph.constructNext(); })},
    {name: 'five sites, four-point refused', apply: graph => learner(() => {
        graph.setMode('sites');
        graph.loadModel(points([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]]) as never);
        graph.setMode('four-point');
    })},
    {name: 'three sites in four-point mode', apply: graph => learner(() => graph.loadModel(points([[0, 0], [4, 0], [4, 4]]) as never))},
    {name: 'one site (refused)', apply: graph => learner(() => { graph.setMode('sites'); graph.loadModel(points([[1, 1]]) as never); })},
];

describe('voronoi-degenerate declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the sites and q, notes equal the panel', ({apply}) => {
        const graph = new DegenerateSitesGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
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

    test('the notes name the four-point sentences and the refusals', () => {
        const graph = new DegenerateSitesGraph();
        mountGraph(graph);
        const ids = () => declare(graph).notes!.map(note => note.id);
        expect(ids().slice(0, 7)).toEqual(['four-fixed', 'incircle', 'four-vertices', 'diagonal-0', 'diagonal-1', 'verdict', 'construction']);
        act(() => { learner(() => load(graph, 'near')); });
        expect(ids()).toContain('verdict');
        expect(ids().filter(id => id.startsWith('diagonal-'))).toEqual(['diagonal-0', 'diagonal-1']);
        act(() => { learner(() => graph.loadModel(points([[0, 0], [4, 0], [4, 4]]) as never)); });
        expect(ids().slice(0, 2)).toEqual(['four-fixed', 'wrong-count']);
        act(() => { learner(() => { graph.setMode('sites'); graph.loadModel(points([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]]) as never); graph.setMode('four-point'); }); });
        expect(ids()[0]).toBe('mode-refused');
        expect(renderMessage(declare(graph).notes![0].text)).toContain('5');
    });

    test('the diagram and duality are pucks and the construction playback is a tools action', () => {
        const graph = new DegenerateSitesGraph();
        mountGraph(graph);
        const actions = declare(graph).actions!;
        expect(actions.map(candidate => candidate.id)).toEqual(['grid', 'diagram', 'delaunay', 'next-step', 'play', 'reset']);
        for (const id of ['diagram', 'delaunay']) expect(actions.find(candidate => candidate.id === id), id).toMatchObject({placement: 'board', puck: true});
        act(() => { learner(() => graph.performAction('delaunay')); });
        expect(declare(graph).actions!.find(candidate => candidate.id === 'delaunay')!.pressed).toBe(true);
        const play = () => declare(graph).actions!.find(candidate => candidate.id === 'play')!.pressed;
        act(() => { learner(() => graph.selectSite(0)); });
        expect(play()).toBe(false);
        act(() => graph.performAction('play'));
        expect(play()).toBe(true);
    });
});
