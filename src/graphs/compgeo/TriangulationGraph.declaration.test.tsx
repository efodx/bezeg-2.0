import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TriangulationGraph, type TriangulationIds} from './TriangulationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: TriangulationGraph) => graph.getDeclaration() as GraphDeclaration<TriangulationIds>;
const action = (graph: TriangulationGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;

const STATES: readonly {name: string; apply(graph: TriangulationGraph): void; notes: string[]}[] = [
    {name: 'default', apply: () => {}, notes: ['n', 'k', 'triangles', 'edges', 'angle', 'angle-before']},
    {name: 'triangulation hidden', apply: graph => { graph.setOverlay('triangulation', false); }, notes: ['n', 'k']},
    {name: 'point added', apply: graph => { graph.addPointAt({x: 6, y: 2}); }, notes: ['event', 'n', 'k', 'triangles', 'edges', 'angle', 'angle-before']},
    {name: 'edge flipped', apply: graph => { graph.selectEdge(1, 4); graph.flipSelected(); }, notes: ['event', 'n', 'k', 'triangles', 'edges', 'angle', 'angle-before']},
    {name: 'hull edge flip refused', apply: graph => { graph.selectEdge(0, 1); graph.flipSelected(); }, notes: ['n', 'k', 'triangles', 'edges', 'angle', 'angle-before']},
];

describe('point-set triangulation declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, the notes equal the panel', ({apply, notes}) => {
        const graph = new TriangulationGraph();
        const {view} = mountGraph(graph);
        act(() => runAs('learner', () => apply(graph)));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'triangulation', 'angles']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        expect(declaration.notes!.map(candidate => candidate.id)).toEqual(notes);
        // The old panel is kept in the DOM (hidden by the declared presenter): every sentence and row it shows is a declared note.
        const panel = [...view.container.querySelectorAll('[data-readout-note], [data-readout]:not([data-readout-live])')]
            .filter(element => !element.closest('[data-readout-live]'))
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const texts = declaration.notes!.map(note => normalise(renderMessage(note.text)));
        expect([...texts].sort()).toEqual([...panel].sort());
    });

    test('the counts sentence names the formula values', () => {
        const graph = new TriangulationGraph();
        mountGraph(graph);
        const sentences = declare(graph).notes!.map(note => renderMessage(note.text));
        expect(sentences[0]).toContain('7');
        act(() => runAs('learner', () => { graph.addPointAt({x: 6, y: 2}); }));
        expect(declare(graph).notes![0].id).toBe('event');
    });

    test('angles is a board puck that follows the overlay; the triangulation, edge numbers and grid stay in Orodja', () => {
        const graph = new TriangulationGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'triangulation', 'edges', 'angles']);
        expect(action(graph, 'angles')).toMatchObject({placement: 'board', puck: true, pressed: false});
        expect(action(graph, 'triangulation')).toMatchObject({placement: 'tools', pressed: true});
        expect(action(graph, 'edges')).toMatchObject({placement: 'tools', pressed: false});
        for (const id of ['grid', 'triangulation', 'edges', 'angles']) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
        }
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a hidden triangulation hides its legend entry', () => {
        const graph = new TriangulationGraph();
        mountGraph(graph);
        expect(graph.drawnObject('triangulation')!.visible).toBe(true);
        act(() => graph.performAction('triangulation'));
        expect(graph.drawnObject('triangulation')!.visible).toBe(false);
    });
});
