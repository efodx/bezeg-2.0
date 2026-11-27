import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {MonotonePartitionGraph, type MonotonePartitionIds} from './MonotonePartitionGraph';
import {MonotoneTriangulationGraph} from './MonotoneTriangulationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: MonotonePartitionGraph) => graph.getDeclaration() as GraphDeclaration<MonotonePartitionIds>;
const action = (graph: MonotonePartitionGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const learner = (change: () => void) => runAs('learner', change);
const toStep = (graph: MonotonePartitionGraph, step: number | 'end') =>
    learner(() => graph.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step} as never));
const polygon = (points: [number, number][]) => ({mode: 'polygon', closed: true, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const EXAMPLE_2: [number, number][] = [[4, 0], [10, 2], [8, 5], [12, 9], [7, 7], [5, 12], [3, 7], [0, 9], [2, 4]];
const CLOCKWISE: [number, number][] = [[0, 0], [0, 4], [3, 2], [6, 4], [6, 0]];
const BOWTIE: [number, number][] = [[0, 0], [4, 4], [4, 0], [0, 4]];

const STATES: readonly {name: string; apply(graph: MonotonePartitionGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'example 1, step 5', apply: graph => toStep(graph, 5)},
    {name: 'example 1, a diagonal', apply: graph => toStep(graph, 8)},
    {name: 'example 1, end', apply: graph => toStep(graph, 'end')},
    {name: 'example 2, end', apply: graph => { learner(() => graph.loadModel(polygon(EXAMPLE_2) as never)); toStep(graph, 'end'); }},
    {name: 'clockwise polygon', apply: graph => { learner(() => graph.loadModel(polygon(CLOCKWISE) as never)); toStep(graph, 2); }},
    {name: 'self-crossing polygon', apply: graph => { learner(() => graph.loadModel(polygon(BOWTIE) as never)); }},
    {name: 'two points', apply: graph => { learner(() => graph.loadModel(polygon([[0, 0], [3, 1]]) as never)); }},
];

describe('monotone partition declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new MonotonePartitionGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'sweep', 'status', 'diagonal', 'pieces', 'types']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        const panel = [...view.container.querySelectorAll('[data-readout-note]')]
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const notes = (declaration.notes ?? []).map(note => normalise(renderMessage(note.text)));
        expect(notes).toEqual(panel);
    });

    test('the sentences follow the step: the diagonal list grows, the summary comes at the end', () => {
        const graph = new MonotonePartitionGraph();
        mountGraph(graph);
        const text = (id: string) => {
            const note = declare(graph).notes!.find(candidate => candidate.id === id);
            return note ? renderMessage(note.text) : undefined;
        };
        expect(text('diagonals')).toBe('Diagonal doslej še ni.');
        expect(text('summary')).toBeUndefined();
        act(() => toStep(graph, 8));
        expect(text('diagonals')).toBe('Diagonale doslej (1): v2–v5');
        act(() => toStep(graph, 'end'));
        expect(text('summary')).toBe('Kosov je 2 = število diagonal (1) + 1.');
        expect(declare(graph).notes!.slice(-3).map(note => note.id)).toEqual(['summary', 'type-counts', 'balance']);
    });

    test('a clockwise polygon says it was reversed; a refused polygon has only its refusal', () => {
        const graph = new MonotonePartitionGraph();
        mountGraph(graph);
        act(() => { learner(() => graph.loadModel(polygon(CLOCKWISE) as never)); });
        expect(declare(graph).notes![0].id).toBe('reversed');
        act(() => { learner(() => graph.loadModel(polygon(BOWTIE) as never)); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['refusal']);
        expect(action(graph, 'next-step').enabled).toBe(false);
    });

    test('a drag moves the marks', () => {
        const graph = new MonotonePartitionGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { learner(() => { graph.movePointTo(1, {x: 5, y: 3}); }); });
        expect(declare(graph).marks!.must[1]).toEqual({kind: 'point', x: 5, y: 3});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the legend follows what the sweep draws', () => {
        const graph = new MonotonePartitionGraph();
        mountGraph(graph);
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect([visible('sweep'), visible('status'), visible('diagonal'), visible('pieces'), visible('types')]).toEqual([true, false, false, false, false]);
        act(() => toStep(graph, 8));
        expect([visible('status'), visible('diagonal'), visible('pieces'), visible('types')]).toEqual([true, true, false, true]);
        act(() => toStep(graph, 'end'));
        expect(visible('pieces')).toBe(true);
        act(() => { learner(() => graph.performAction('sweep')); });
        expect(visible('sweep')).toBe(false);
        expect(action(graph, 'sweep').pressed).toBe(false);
    });

    test('the playback is a tools action; the sweep switch is no puck', () => {
        const graph = new MonotonePartitionGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'sweep', 'next-step', 'play', 'reset']);
        expect(action(graph, 'sweep')).toMatchObject({placement: 'tools', section: 'display'});
        for (const id of ['next-step', 'play', 'reset']) expect(action(graph, id), id).toMatchObject({placement: 'tools', section: 'playback'});
        expect(action(graph, 'reset').enabled).toBe(false);
        act(() => graph.performAction('next-step'));
        expect(graph.step).toBe(1);
        act(() => graph.performAction('reset'));
        expect(graph.step).toBe(0);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(true);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('the triangulation graph that inherits the class declares its own workspace', () => {
        const graph = new MonotoneTriangulationGraph();
        mountGraph(graph);
        expect(graph.getDeclaration()).toBeDefined();
        expect(graph.getDeclaration()!.legend!.map(entry => entry.id)).toContain('triangles');
    });
});
