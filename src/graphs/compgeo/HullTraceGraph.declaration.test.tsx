import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {HullTraceGraph, type HullTraceIds} from './HullTraceGraph';
import {HullRobustnessGraph} from './HullRobustnessGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import type {HullAlgorithm} from './hullTraceRun';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: HullTraceGraph) => graph.getDeclaration() as GraphDeclaration<HullTraceIds>;
const action = (graph: HullTraceGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const toEnd = (graph: HullTraceGraph) => { while (graph.step < graph.run().length - 1) graph.nextStep(); };
const withAlgorithm = (algorithm: HullAlgorithm) => (graph: HullTraceGraph) => graph.setAlgorithm(algorithm);

const STATES: readonly {name: string; apply(graph: HullTraceGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'step 5', apply: graph => { for (let i = 0; i < 5; i++) graph.nextStep(); }},
    {name: 'end (totals)', apply: toEnd},
    {name: 'gift wrapping, end', apply: graph => { withAlgorithm('gift-wrapping')(graph); toEnd(graph); }},
    {name: 'slow edge test, step 3', apply: graph => { withAlgorithm('slow-edge-test')(graph); for (let i = 0; i < 3; i++) graph.nextStep(); }},
    {name: 'a point moved', apply: graph => { graph.movePointTo(1, {x: 3, y: 5}); }},
];

describe('convex hull declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new HullTraceGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();

        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));

        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'trace', 'hull']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(graph.drawnObject('points')!.visible).toBe(true);

        const panel = [...view.container.querySelectorAll('[data-hull-trace-status] [data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThanOrEqual(1);
    });

    test('the totals appear once the trace is done', () => {
        const graph = new HullTraceGraph();
        mountGraph(graph);
        expect(declare(graph).notes!.some(note => note.id.startsWith('total-'))).toBe(false);
        act(() => toEnd(graph));
        expect(declare(graph).notes!.filter(note => note.id.startsWith('total-')).map(note => note.id))
            .toEqual(['total-monotone-chain', 'total-slow-edge-test', 'total-gift-wrapping']);
    });

    test('a drag moves the marks', () => {
        const graph = new HullTraceGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { graph.movePointTo(2, {x: 6, y: 2}); });
        expect(declare(graph).marks!.must[2]).toEqual({kind: 'point', x: 6, y: 2});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the algorithm is a three-segment choice puck, the trace and hull are switch pucks, the playback is in tools', () => {
        const graph = new HullTraceGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id))
            .toEqual(['grid', 'trace', 'hull', 'monotone-chain', 'slow-edge-test', 'gift-wrapping', 'next-step', 'play', 'reset']);
        for (const id of ['trace', 'hull']) {
            expect(action(graph, id), id).toMatchObject({placement: 'board', puck: true, pressed: true});
            expect(renderMessage(action(graph, id).label).length, id).toBeLessThanOrEqual(16);
        }
        const group = ['monotone-chain', 'slow-edge-test', 'gift-wrapping'];
        expect(group.map(id => action(graph, id).pressed)).toEqual([true, false, false]);
        for (const id of group) expect(action(graph, id), id).toMatchObject({placement: 'board', puck: {group: {key: 'algorithm'}}});
        act(() => graph.performAction('slow-edge-test'));
        expect(graph.algorithm).toBe('slow-edge-test');
        expect(group.map(id => action(graph, id).pressed)).toEqual([false, true, false]);
        expect(action(graph, 'slow-edge-test').puck).toMatchObject({group: {help: expect.anything()}});
        act(() => graph.performAction('trace'));
        expect(action(graph, 'trace').pressed).toBe(false);
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

    test('the robustness graph, which shares the class, declares its own choice pucks and no algorithm choice', () => {
        const graph = new HullRobustnessGraph();
        mountGraph(graph);
        const ids = graph.getDeclaration()!.actions!.map(candidate => candidate.id);
        expect(ids).toEqual(expect.arrayContaining(['non-left', 'right', 'merge', 'keep']));
        expect(ids).not.toContain('monotone-chain');
    });
});
