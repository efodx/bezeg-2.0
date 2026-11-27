import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {DelaunayGraph, type DelaunayIds} from './DelaunayGraph';
import {TriangulationGraph} from './TriangulationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: DelaunayGraph) => graph.getDeclaration() as GraphDeclaration<DelaunayIds>;
const action = (graph: DelaunayGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const stepTo = (graph: DelaunayGraph, step: number | 'end') =>
    graph.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step});
const learner = (act: () => void) => runAs('learner', act);

const STATES: readonly {name: string; apply(graph: DelaunayGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'quad, test step', apply: graph => { learner(() => { graph.loadExample(0); stepTo(graph, 1); }); }},
    {name: 'seven, triangle selected', apply: graph => { learner(() => { graph.loadExample(1); graph.selectTriangle(2); }); }},
    {name: 'square, end', apply: graph => { learner(() => { graph.loadExample(2); stepTo(graph, 'end'); }); }},
    {name: 'quad, point added', apply: graph => { learner(() => { graph.loadExample(0); graph.addPointAt({x: 2, y: 1}); }); }},
];

describe('delaunay declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new DelaunayGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();

        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));

        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'triangulation', 'angles']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        // The old panel is kept in the DOM (hidden by the declared presenter): every sentence and row it shows is a declared note.
        const panel = [...view.container.querySelectorAll('[data-readout-note], [data-readout]:not([data-readout-live])')]
            .filter(element => !element.closest('[data-readout-live]'))
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const notes = declaration.notes!.map(note => normalise(renderMessage(note.text)));
        expect([...notes].sort()).toEqual([...panel].sort());
    });

    test('the first sentence is the step counter and a circle test brings the circumcircle into the marks', () => {
        const graph = new DelaunayGraph();
        mountGraph(graph);
        expect(renderMessage(declare(graph).notes![0].text)).toMatch(/^Korak 1 od \d+$/);
        expect(declare(graph).marks!.nice ?? []).toEqual([]);
        act(() => { learner(() => stepTo(graph, 1)); });
        expect(renderMessage(declare(graph).notes![0].text)).toMatch(/^Korak 2 od \d+$/);
        expect(declare(graph).marks!.nice).toEqual([expect.objectContaining({kind: 'box'})]);
    });

    test('a drag moves the marks', () => {
        const graph = new DelaunayGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { learner(() => { graph.movePointTo(2, {x: 6, y: 2}); }); });
        expect(declare(graph).marks!.must[2]).toEqual({kind: 'point', x: 6, y: 2});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the smallest angle is a puck, the other switches and the playback are tools actions that follow the state', () => {
        const graph = new DelaunayGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'triangulation', 'edges', 'angles', 'next-step', 'play', 'reset']);
        expect(action(graph, 'angles')).toMatchObject({placement: 'board', puck: true, pressed: false});
        expect(renderMessage(action(graph, 'angles').label).length).toBeLessThanOrEqual(16);
        expect(action(graph, 'triangulation')).toMatchObject({placement: 'tools', pressed: true});
        for (const id of ['grid', 'triangulation', 'edges', 'angles']) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
        }
        expect(action(graph, 'reset').enabled).toBe(false);
        act(() => graph.performAction('next-step'));
        expect(graph.step).toBe(1);
        expect(action(graph, 'reset').enabled).toBe(true);
        act(() => graph.performAction('reset'));
        expect(graph.step).toBe(0);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(true);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('the plain triangulation graph stays undeclared', () => {
        const graph = new TriangulationGraph();
        mountGraph(graph);
        expect(graph.getDeclaration()).toBeUndefined();
    });
});
