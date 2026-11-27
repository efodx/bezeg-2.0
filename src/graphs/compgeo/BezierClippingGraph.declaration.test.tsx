import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {BezierClippingGraph, type BezierClippingIds} from './BezierClippingGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import {CLIPPING_CROSSING, CLIPPING_OFFSET, CLIPPING_TANGENT} from '../../learning/content/bezierClippingGuidedLessons';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: BezierClippingGraph) => graph.getDeclaration() as GraphDeclaration<BezierClippingIds>;
const action = (graph: BezierClippingGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;
const load = (graph: BezierClippingGraph, points: ReadonlyArray<readonly [number, number]>, gridStepExponent = 0) =>
    graph.applyPointSetAction({kind: 'point-set', operation: 'load-model', points, gridStepExponent});
const stepTo = (graph: BezierClippingGraph, step: number | 'end') =>
    graph.applyPointSetAction({kind: 'point-set', operation: 'set-trace-step', step});

/** `expected`: the step and clip-count sentences of the recorded panel (`__parity__/bezier-clipping.json`), written out so a wrong kernel run fails here and not only a panel-against-declaration comparison. */
const STATES: readonly {name: string; apply(graph: BezierClippingGraph): void; expected?: [string, string]}[] = [
    {name: 'default', apply: () => {}, expected: ['Korak 1 od 26', 'Število rezov: 0']},
    {name: 'step 4', apply: graph => stepTo(graph, 4), expected: ['Korak 5 od 26', 'Število rezov: 3']},
    {name: 'crossing, end', apply: graph => stepTo(graph, 'end'), expected: ['Korak 26 od 26', 'Število rezov: 21']},
    {name: 'a point moved', apply: graph => { graph.movePointTo(1, {x: 3, y: 5}); }},
    {name: 'hulls apart', apply: graph => load(graph, [[0, 0], [2, 1], [4, 0], [0, 6], [2, 8], [4, 6]]), expected: ['Korak 1 od 3', 'Število rezov: 0']},
    {name: 'tangent, tolerance 10, end', apply: graph => { load(graph, CLIPPING_TANGENT); graph.setClipTolerance(10); stepTo(graph, 'end'); }, expected: ['Korak 505 od 505', 'Število rezov: 200']},
    {name: 'offset, end', apply: graph => { load(graph, CLIPPING_OFFSET, -1); stepTo(graph, 'end'); }, expected: ['Korak 22 od 22', 'Število rezov: 17']},
];

describe('bezier clipping declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the points, notes equal the panel', ({apply, expected}) => {
        const graph = new BezierClippingGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        // the points are board-owned and the tolerance has no arbiter key: no parameter is declared
        expect(declaration.parameters).toBeUndefined();
        expect((graph.parameters?.keys() ?? []).filter(key => key !== 'view')).toEqual([]);

        // the marks are exactly the model's points (6, a curve pair never has an outline)
        const unit = 2 ** graph.model.gridStepExponent;
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x * unit, y: p.y * unit})));
        expect(declaration.marks!.must.length).toBe(6);

        // every legend entry resolves, and the curves and points are drawn
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'curveA', 'curveB', 'control', 'hull', 'fatLine', 'kept', 'discarded']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        for (const id of ['points', 'curveA', 'curveB']) expect(graph.drawnObject(id)!.visible, id).toBe(true);

        // the notes are the sentences of the panel, in its order
        const panel = [...view.container.querySelectorAll('[data-bezier-clipping="readout"] [data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThanOrEqual(3);

        if (expected) {
            const text = declaration.notes!.map(note => normalise(renderMessage(note.text)));
            expect([text[0], text[2]]).toEqual(expected);
        }
    });

    test('a drag moves the marks', () => {
        const graph = new BezierClippingGraph();
        mountGraph(graph);
        const before = declare(graph).marks!.must;
        act(() => { graph.movePointTo(2, {x: 6, y: 2}); });
        expect(declare(graph).marks!.must[2]).toEqual({kind: 'point', x: 6, y: 2});
        expect(declare(graph).marks!.must).not.toEqual(before);
    });

    test('the overlay switches and the playback are actions that run as the learner and follow the state', () => {
        const graph = new BezierClippingGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'control', 'hull', 'fatLine', 'kept', 'discarded', 'next-step', 'play', 'reset']);
        for (const id of ['fatLine', 'kept', 'discarded']) expect(action(graph, id), id).toMatchObject({placement: 'board', puck: true, pressed: true});
        for (const id of ['fatLine', 'kept', 'discarded']) expect(renderMessage(action(graph, id).label).length, id).toBeLessThanOrEqual(16);
        for (const id of ['control', 'hull']) expect(action(graph, id), id).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        expect(action(graph, 'grid')).toMatchObject({placement: 'tools', pressed: false});
        for (const id of ['grid', 'control', 'hull', 'fatLine', 'kept', 'discarded']) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
            expect(graph.overlayShown(id as 'grid'), id).toBe(!was);
        }
        expect(action(graph, 'reset').enabled).toBe(false);
        expect(action(graph, 'next-step').enabled).toBe(true);
        act(() => graph.performAction('next-step'));
        expect(graph.step).toBe(1);
        expect(action(graph, 'reset').enabled).toBe(true);
        act(() => graph.performAction('reset'));
        expect(graph.step).toBe(0);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(true);
        act(() => graph.performAction('play'));
        expect(action(graph, 'play').pressed).toBe(false);
        act(() => stepTo(graph, 'end'));
        expect(action(graph, 'next-step').enabled).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a hidden overlay hides its legend entry; the curves stay', () => {
        const graph = new BezierClippingGraph();
        mountGraph(graph);
        expect(graph.drawnObject('kept')!.visible).toBe(true);
        act(() => graph.performAction('kept'));
        expect(graph.drawnObject('kept')!.visible).toBe(false);
        expect(graph.drawnObject('discarded')!.visible).toBe(true);
        expect(graph.drawnObject('curveA')!.visible).toBe(true);
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });

    test('the crossing pair loads on the grid', () => {
        const graph = new BezierClippingGraph();
        mountGraph(graph);
        act(() => load(graph, CLIPPING_CROSSING));
        expect(declare(graph).notes!.map(note => note.id)).toEqual(['step', 'status', 'clips', 'widest']);
    });
});
