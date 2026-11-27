import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {BentleyOttmannGraph, type BentleyOttmannIds} from './BentleyOttmannGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: BentleyOttmannGraph) => graph.getDeclaration() as GraphDeclaration<BentleyOttmannIds>;
const action = (graph: BentleyOttmannGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const learner = (change: () => void) => runAs('learner', change);
const toStep = (graph: BentleyOttmannGraph, step: number | 'end') =>
    learner(() => graph.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step} as never));
const segments = (list: [number, number, number, number][]) => ({mode: 'segments', closed: false, gridStepExponent: 0,
    points: list.flatMap(([ax, ay, bx, by]) => [{x: ax, y: ay}, {x: bx, y: by}])});
const DEGENERATE: [number, number, number, number][] = [[0, 0, 4, 4], [0, 4, 4, 0], [0, 2, 4, 2], [2, 0, 2, 4]];

const STATES: readonly {name: string; apply(graph: BentleyOttmannGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'example 1, step 9', apply: graph => toStep(graph, 9)},
    {name: 'example 1, step 16', apply: graph => toStep(graph, 16)},
    {name: 'example 1, end', apply: graph => toStep(graph, 'end')},
    {name: 'degenerate, step 15', apply: graph => { learner(() => graph.loadModel(segments(DEGENERATE) as never)); toStep(graph, 15); }},
    {name: 'no segments', apply: graph => { learner(() => graph.loadModel(segments([]) as never)); }},
    {name: 'overlap (refused)', apply: graph => { learner(() => graph.loadModel(segments([[0, 0, 4, 0], [2, 0, 6, 0]]) as never)); }},
];

describe('segment intersections declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new BentleyOttmannGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'sweep', 'status', 'current', 'test', 'crossing']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        const panel = [...view.container.querySelectorAll('[data-readout-note]')]
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const notes = declaration.notes!.map(note => normalise(renderMessage(note.text)));
        expect(notes).toEqual(panel);
    });

    test('the sentences follow the step: counter first, summary and crossings at the end', () => {
        const graph = new BentleyOttmannGraph();
        mountGraph(graph);
        expect(renderMessage(declare(graph).notes![0].text)).toBe('Korak 1 od 47');
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['step', 'note', 'status-count', 'tests', 'crossings']);
        act(() => toStep(graph, 'end'));
        const notes = declare(graph).notes!;
        expect(notes.map(note => note.id)).toEqual(
            ['step', 'note', 'position', 'status-count', 'tests', 'summary', 'crossings', 'crossing-0', 'crossing-1', 'crossing-2', 'crossing-3', 'crossing-4']);
        expect(renderMessage(notes.find(note => note.id === 'crossing-0')!.text)).toContain('33/20');
    });

    test('an empty set has only its hint, a refused set only its refusal', () => {
        const graph = new BentleyOttmannGraph();
        mountGraph(graph);
        act(() => { learner(() => graph.loadModel(segments([]) as never)); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['empty']);
        expect(action(graph, 'next-step').enabled).toBe(false);
        act(() => { learner(() => graph.loadModel(segments([[0, 0, 4, 0], [2, 0, 6, 0]]) as never)); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['refusal']);
        expect(action(graph, 'play').enabled).toBe(false);
    });

    test('a drag moves the marks', () => {
        const graph = new BentleyOttmannGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { learner(() => { graph.movePointTo(1, {x: 5, y: 1}); }); });
        expect(declare(graph).marks!.must[1]).toEqual({kind: 'point', x: 5, y: 1});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the legend follows what the sweep draws', () => {
        const graph = new BentleyOttmannGraph();
        mountGraph(graph);
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        // Step 0 is before the first event: the sweep line is not on the board yet.
        expect([visible('sweep'), visible('current'), visible('test'), visible('crossing')]).toEqual([false, false, false, false]);
        act(() => toStep(graph, 9));
        expect([visible('sweep'), visible('current')]).toEqual([true, true]);
        act(() => toStep(graph, 'end'));
        expect(visible('crossing')).toBe(true);
        act(() => toStep(graph, 16));
        expect([visible('status'), visible('current'), visible('crossing')]).toEqual([true, true, true]);
        act(() => { learner(() => graph.performAction('sweep')); });
        expect([visible('sweep'), visible('status'), visible('crossing')]).toEqual([false, false, false]);
        expect(action(graph, 'sweep').pressed).toBe(false);
    });

    test('the playback is a tools action; the sweep switch is no puck', () => {
        const graph = new BentleyOttmannGraph();
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
});
