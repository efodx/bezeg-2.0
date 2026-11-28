import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {EulerLineGraph, type EulerLineIds} from './EulerLineGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const declare = (graph: EulerLineGraph) => graph.getDeclaration() as GraphDeclaration<EulerLineIds>;
const action = (graph: EulerLineGraph, id: string) => declare(graph).actions!.find(candidate => candidate.id === id)!;

const STATES: readonly {name: string; apply(graph: EulerLineGraph): void; points: number}[] = [
    {name: 'default', apply: () => {}, points: 3},
    {name: 'right triangle', apply: graph => graph.loadExample('right'), points: 3},
    {name: 'isosceles', apply: graph => graph.loadExample('isosceles'), points: 3},
    {name: 'degenerate', apply: graph => graph.loadExample('degenerate'), points: 3},
    {name: 'a vertex moved', apply: graph => { graph.movePointTo(2, {x: 3, y: 6}); }, points: 3},
    {name: 'a vertex removed', apply: graph => { graph.select(1); graph.removeSelected(); }, points: 2},
    {name: 'empty', apply: graph => { graph.clear(); }, points: 0},
];

describe('euler line declaration', () => {
    test.each(STATES)('$name: consistent, marks follow the vertices, notes equal the panel', ({apply, points}) => {
        const graph = new EulerLineGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = declare(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        // points are board-owned: no parameter is declared, nothing is bound
        expect(declaration.parameters).toBeUndefined();
        expect((graph.parameters?.keys() ?? []).filter(key => key !== 'view')).toEqual([]);

        // the marks are exactly the vertices
        expect(declaration.marks!.must).toEqual(graph.model.points.map(p => ({kind: 'point', x: p.x, y: p.y})));
        expect(declaration.marks!.must.length).toBe(points);

        // the legend resolves; points are drawn exactly when there are some
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['points', 'triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(graph.drawnObject('points')!.visible).toBe(points > 0);

        // the notes are the sentences of the panel, in its order
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThan(0);
    });

    test('a too-far point is a note and has no board place', () => {
        const graph = new EulerLineGraph();
        mountGraph(graph);
        act(() => graph.loadModel({mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 7, y: 0}, {x: 2000000, y: 5}]}));
        const ids = declare(graph).notes!.map(note => note.id);
        expect(ids).toEqual(expect.arrayContaining(['too-far-h', 'too-far-o', 'too-far-n']));
        expect(ids).not.toContain('too-far-g');
    });

    test('the switches are display actions that run as the learner and follow the state', () => {
        const graph = new EulerLineGraph();
        mountGraph(graph);
        expect(declare(graph).actions!.map(candidate => candidate.id)).toEqual(['grid', 'triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle']);
        expect(declare(graph).actions!.filter(candidate => candidate.puck)).toEqual([]);
        expect(action(graph, 'line')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        expect(action(graph, 'circumcircle')).toMatchObject({placement: 'tools', section: 'display', pressed: false});
        for (const id of ['grid', 'triangle', 'centres', 'line', 'circle', 'ninepoints', 'circumcircle']) {
            const was = action(graph, id).pressed;
            act(() => graph.performAction(id));
            expect(action(graph, id).pressed, id).toBe(!was);
            expect(graph.overlayShown(id as 'grid'), id).toBe(!was);
        }
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('a hidden overlay hides its legend entry', () => {
        const graph = new EulerLineGraph();
        mountGraph(graph);
        expect(graph.drawnObject('line')!.visible).toBe(true);
        expect(graph.drawnObject('circumcircle')!.visible).toBe(false);
        act(() => graph.performAction('line'));
        act(() => graph.performAction('circumcircle'));
        expect(graph.drawnObject('line')!.visible).toBe(false);
        expect(graph.drawnObject('circumcircle')!.visible).toBe(true);
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });
});
