import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {FortuneGraph, type FortuneIds} from './FortuneGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: FortuneGraph) => graph.getDeclaration() as GraphDeclaration<FortuneIds>;
const action = (graph: FortuneGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const learner = (change: () => void) => runAs('learner', change);
const toStep = (graph: FortuneGraph, step: number | 'end') =>
    learner(() => graph.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step} as never));
const model = (points: [number, number][]) => ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});

const STATES: readonly {name: string; apply(graph: FortuneGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'example 1, step 3', apply: graph => toStep(graph, 3)},
    {name: 'example 1, false alarm step 4', apply: graph => toStep(graph, 4)},
    {name: 'example 1, end', apply: graph => toStep(graph, 'end')},
    {name: 'collinear, end', apply: graph => { learner(() => graph.loadExample('collinear')); toStep(graph, 'end'); }},
    {name: 'one site', apply: graph => { learner(() => graph.loadModel(model([[0, 0]]) as never)); }},
];


describe('fortune declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the sites, notes equal the panel', ({apply}) => {
        const graph = new FortuneGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        if (graph.run().box) expect(declaration.marks!.nice).toHaveLength(1);

        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'sweep', 'beach', 'vertices', 'false-alarm']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();

        const listed = (element: Element) => element.matches('[data-fortune=height], [data-queue-entry], [data-current], [data-fortune-queue-empty]');
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].filter(element => !listed(element))
            .map(element => normalise(element.textContent ?? '')).filter(text => text !== '');
        const notes = declaration.notes!.filter(note => !['current', 'queue', 'cancelled'].includes(note.id)).map(note => normalise(renderMessage(note.text)));
        expect(notes).toEqual(panel);
    });

    test('the sweep height is a row with its formula, absent before the first event', () => {
        const graph = new FortuneGraph();
        mountGraph(graph);
        expect(declare(graph).readouts).toBeUndefined();
        act(() => toStep(graph, 3));
        const row = declare(graph).readouts![0].rows[0];
        expect(row).toMatchObject({id: 'height', symbol: 'y', valueTex: '3'});
        act(() => toStep(graph, 6));
        expect(declare(graph).readouts![0].rows[0].valueTex).toContain('\\sqrt');
        act(() => toStep(graph, 'end'));
        expect(declare(graph).readouts![0].rows[0].valueTex).toContain('\approx');
    });

    test('the queue and the false alarms are one note each; the step counter leads', () => {
        const graph = new FortuneGraph();
        mountGraph(graph);
        expect(renderMessage(declare(graph).notes![0].text)).toBe('Korak 1 od 8');
        act(() => toStep(graph, 4));
        const notes = declare(graph).notes!;
        const text = (id: string) => renderMessage(notes.find(note => note.id === id)!.text);
        expect(text('alarm-0')).toBe('Lažni alarm: krožni dogodek (B, A, C) je preklican, ker krog ni več prazen.');
        expect(text('current')).toBe('Pravkar obdelani dogodek: mesto D');
        expect(text('queue')).toBe('Vrsta dogodkov: krožni dogodek (B, A, D); krožni dogodek (D, A, C)');
        expect(text('cancelled')).toBe('Preklicani krožni dogodki (lažni alarmi): krožni dogodek (B, A, C)');
        act(() => toStep(graph, 'end'));
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['step', 'note', 'vertices']);
    });

    test('a refused set has only its refusal', () => {
        const graph = new FortuneGraph();
        mountGraph(graph);
        act(() => { learner(() => graph.loadModel(model([[0, 0]]) as never)); });
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['refusal']);
        expect(action(graph, 'next-step').enabled).toBe(false);
    });

    test('a drag moves the marks', () => {
        const graph = new FortuneGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { learner(() => { graph.movePointTo(0, {x: 1, y: 5}); }); });
        expect(declare(graph).marks!.must[0]).toEqual({kind: 'point', x: 1, y: 5});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the legend follows what the sweep draws; the playback is a tools action, no puck', () => {
        const graph = new FortuneGraph();
        mountGraph(graph);
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect([visible('sweep'), visible('beach'), visible('vertices'), visible('false-alarm')]).toEqual([true, true, false, false]);
        act(() => toStep(graph, 4));
        expect([visible('vertices'), visible('false-alarm')]).toEqual([false, true]);
        act(() => toStep(graph, 6));
        expect(visible('vertices')).toBe(true);
        act(() => toStep(graph, 'end'));
        expect([visible('sweep'), visible('beach'), visible('vertices'), visible('false-alarm')]).toEqual([false, false, false, false]);

        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'next-step', 'play', 'reset']);
        for (const id of ['next-step', 'play', 'reset']) expect(action(graph, id), id).toMatchObject({placement: 'tools', section: 'playback'});
        act(() => toStep(graph, 0));
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
