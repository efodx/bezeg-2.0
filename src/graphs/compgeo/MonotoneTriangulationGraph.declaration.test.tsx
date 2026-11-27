import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {MonotoneTriangulationGraph, type MonotoneTriangulationIds} from './MonotoneTriangulationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: MonotoneTriangulationGraph) => graph.getDeclaration() as GraphDeclaration<MonotoneTriangulationIds>;
const learner = (change: () => void) => runAs('learner', change);
const toStep = (graph: MonotoneTriangulationGraph, step: number | 'end') =>
    learner(() => graph.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step} as never));
const polygon = (points: [number, number][]) => ({mode: 'polygon', closed: true, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const EXAMPLE_3: [number, number][] = [[4, 0], [8, 2], [6, 4], [9, 7], [5, 9], [1, 8], [3, 6], [0, 5]];
const CLOCKWISE: [number, number][] = [[0, 0], [0, 4], [3, 2], [6, 4], [6, 0]];
const BOWTIE: [number, number][] = [[0, 0], [4, 4], [4, 0], [0, 4]];

const STATES: readonly {name: string; apply(graph: MonotoneTriangulationGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'partition phase', apply: graph => toStep(graph, 8)},
    {name: 'partition done', apply: graph => toStep(graph, 14)},
    {name: 'top vertex', apply: graph => toStep(graph, 15)},
    {name: 'test', apply: graph => toStep(graph, 21)},
    {name: 'piece done', apply: graph => toStep(graph, 28)},
    {name: 'end', apply: graph => toStep(graph, 'end')},
    {name: 'already monotone, end', apply: graph => { learner(() => graph.loadModel(polygon(EXAMPLE_3) as never)); toStep(graph, 'end'); }},
    {name: 'clockwise polygon', apply: graph => { learner(() => graph.loadModel(polygon(CLOCKWISE) as never)); toStep(graph, 2); }},
    {name: 'self-crossing polygon', apply: graph => { learner(() => graph.loadModel(polygon(BOWTIE) as never)); }},
];

describe('monotone triangulation declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new MonotoneTriangulationGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'sweep', 'status', 'diagonal', 'pieces', 'types', 'triangles', 'stack', 'chains', 'test']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        const panel = [...view.container.querySelectorAll('[data-readout-note]')]
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const notes = (declaration.notes ?? []).map(note => normalise(renderMessage(note.text)));
        expect(notes).toEqual(panel);
    });

    test('the notes follow the phase: partition sentences, then piece, test and the comparison at the end', () => {
        const graph = new MonotoneTriangulationGraph();
        mountGraph(graph);
        const ids = () => declare(graph).notes!.map(note => note.id);
        const text = (id: string) => {
            const note = declare(graph).notes!.find(candidate => candidate.id === id);
            return note ? renderMessage(note.text) : undefined;
        };
        act(() => toStep(graph, 8));
        expect(ids()).toContain('diagonals');
        expect(ids()).not.toContain('piece');
        act(() => toStep(graph, 21));
        expect(ids()).toEqual(expect.arrayContaining(['piece', 'chain-vertex', 'test', 'triangle-diagonals', 'triangles']));
        expect(ids()).not.toContain('comparison-ear');
        act(() => toStep(graph, 'end'));
        expect(ids().slice(-4)).toEqual(['comparison-monotone', 'comparison-ear', 'comparison-growth', 'comparison-note']);
        expect(text('triangles')).toBe('Trikotnikov: 4 = n − 2 pri n = 6.');
    });

    test('a refused polygon has only its refusal', () => {
        const graph = new MonotoneTriangulationGraph();
        mountGraph(graph);
        act(() => { learner(() => graph.loadModel(polygon(BOWTIE) as never)); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['refusal']);
    });

    test('the legend follows what the triangulation phase draws', () => {
        const graph = new MonotoneTriangulationGraph();
        mountGraph(graph);
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        const own = () => [visible('status'), visible('pieces'), visible('types'), visible('triangles'), visible('stack'), visible('chains'), visible('test')];
        act(() => toStep(graph, 8));
        expect(own()).toEqual([true, false, true, false, false, false, false]);
        act(() => toStep(graph, 21));
        expect(own()).toEqual([false, false, false, false, true, true, true]);
        act(() => toStep(graph, 'end'));
        expect(visible('triangles')).toBe(true);
        expect(visible('diagonal')).toBe(true);
    });

    test('the sweep switch is named for the triangulation and the playback is a tools action', () => {
        const graph = new MonotoneTriangulationGraph();
        mountGraph(graph);
        const sweep = declare(graph).actions!.find(candidate => candidate.id === 'sweep')!;
        expect(renderMessage(sweep.label)).toBe('Pometalna premica, verigi in sklad');
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'sweep', 'next-step', 'play', 'reset']);
        act(() => graph.performAction('next-step'));
        expect(graph.step).toBe(1);
    });
});
