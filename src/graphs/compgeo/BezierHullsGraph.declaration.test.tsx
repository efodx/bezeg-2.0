import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {BezierHullsGraph, type BezierHullsIds} from './BezierHullsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: BezierHullsGraph) => graph.getDeclaration() as GraphDeclaration<BezierHullsIds>;
const action = (graph: BezierHullsGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const stepTo = (graph: BezierHullsGraph, step: number | 'end') =>
    graph.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step});

const STATES: readonly {name: string; apply(graph: BezierHullsGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'step 3', apply: graph => stepTo(graph, 3)},
    {name: 'end', apply: graph => stepTo(graph, 'end')},
    {name: 'a point moved', apply: graph => { graph.movePointTo(1, {x: 3, y: 5}); }},
];

describe('bezier hulls declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply}) => {
        const graph = new BezierHullsGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters).toBeUndefined();

        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));

        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'curveA', 'curveB', 'control', 'hull', 'pieces']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        for (const id of ['points', 'curveA', 'curveB']) expect(graph.drawnObject(id)!.visible, id).toBe(true);

        const panel = [...view.container.querySelectorAll('[data-bezier-hulls="readout"] [data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThanOrEqual(3);
    });

    test('the first sentence is the step counter', () => {
        const graph = new BezierHullsGraph();
        mountGraph(graph);
        expect(renderMessage(declare(graph).notes![0].text)).toMatch(/^Korak 1 od \d+$/);
        act(() => stepTo(graph, 2));
        expect(renderMessage(declare(graph).notes![0].text)).toMatch(/^Korak 3 od \d+$/);
    });

    test('a drag moves the marks', () => {
        const graph = new BezierHullsGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { graph.movePointTo(2, {x: 6, y: 2}); });
        expect(declare(graph).marks!.must[2]).toEqual({kind: 'point', x: 6, y: 2});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the pieces switch is a puck, the other switches and the playback are tools actions that follow the state', () => {
        const graph = new BezierHullsGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'control', 'hull', 'pieces', 'next-step', 'play', 'reset']);
        expect(action(graph, 'pieces')).toMatchObject({placement: 'board', puck: true, pressed: true});
        expect(renderMessage(action(graph, 'pieces').label).length).toBeLessThanOrEqual(16);
        for (const id of ['control', 'hull']) expect(action(graph, id), id).toMatchObject({placement: 'tools', pressed: true});
        for (const id of ['grid', 'control', 'hull', 'pieces']) {
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
});
