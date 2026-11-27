import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {IntervalSweepGraph, type IntervalSweepIds} from './IntervalSweepGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: IntervalSweepGraph) => graph.getDeclaration() as GraphDeclaration<IntervalSweepIds>;
const action = (graph: IntervalSweepGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const learner = (change: () => void) => runAs('learner', change);
const toStep = (graph: IntervalSweepGraph, step: number | 'end') =>
    learner(() => graph.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step} as never));
const intervals = (pairs: [number, number][]) => ({mode: 'intervals', closed: false, gridStepExponent: 0,
    points: pairs.flatMap(([a, b], k) => [{x: a, y: k + 1}, {x: b, y: k + 1}])});

const STATES: readonly {name: string; apply(graph: IntervalSweepGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'example 1, step 4', apply: graph => toStep(graph, 4)},
    {name: 'example 1, step 6', apply: graph => toStep(graph, 6)},
    {name: 'example 1, end', apply: graph => toStep(graph, 'end')},
    {name: 'ties, end', apply: graph => { learner(() => graph.loadModel(intervals([[0, 3], [3, 6], [3, 3], [5, 8]]) as never)); toStep(graph, 'end'); }},
    {name: 'no intervals', apply: graph => { learner(() => graph.loadModel(intervals([]) as never)); }},
];

describe('interval sweep declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new IntervalSweepGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'sweep', 'open', 'pair']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        const panel = [...view.container.querySelectorAll('[data-readout-note]')]
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const notes = declaration.notes!.map(note => normalise(renderMessage(note.text)));
        expect(notes).toEqual(panel);
    });

    test('the sentences follow the step: counter first, comparison only at the end', () => {
        const graph = new IntervalSweepGraph();
        mountGraph(graph);
        expect(renderMessage(declare(graph).notes![0].text)).toBe('Korak 1 od 26');
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['step', 'note', 'open', 'counts', 'max', 'pairs']);
        act(() => toStep(graph, 'end'));
        const notes = declare(graph).notes!;
        expect(notes.map(note => note.id)).toEqual(['step', 'note', 'open', 'counts', 'max', 'pairs', 'comparison']);
        expect(renderMessage(notes.find(note => note.id === 'max')!.text)).toBe('Največ odprtih: 3 na [3, 4]');
        expect(renderMessage(notes.find(note => note.id === 'comparison')!.text)).toBe('Najdenih parov: 5; vseh parov bi preizkusili: 10.');
    });

    test('an empty set has only its hint', () => {
        const graph = new IntervalSweepGraph();
        mountGraph(graph);
        act(() => { learner(() => graph.loadModel(intervals([]) as never)); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['empty']);
        expect(action(graph, 'next-step').enabled).toBe(false);
    });

    test('a drag moves the marks', () => {
        const graph = new IntervalSweepGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { learner(() => { graph.movePointTo(1, {x: 5, y: 1}); }); });
        expect(declare(graph).marks!.must[1]).toEqual({kind: 'point', x: 5, y: 1});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the legend follows what the sweep draws', () => {
        const graph = new IntervalSweepGraph();
        mountGraph(graph);
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect([visible('sweep'), visible('open'), visible('pair')]).toEqual([true, true, false]);
        act(() => toStep(graph, 4));
        expect(visible('pair')).toBe(true);
        act(() => { learner(() => graph.performAction('sweep')); });
        expect(visible('sweep')).toBe(false);
        expect(action(graph, 'sweep').pressed).toBe(false);
    });

    test('the playback is a tools action; the sweep switch is no puck', () => {
        const graph = new IntervalSweepGraph();
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
