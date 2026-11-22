import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {NotablePointsGraph, type NotablePointsIds} from './NotablePointsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const OVERLAYS = ['triangle', 'centroid', 'circumcentre', 'incentre', 'orthocentre'] as const;
const model = (...points: [number, number][]) => ({mode: 'points' as const, closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});

const STATES: readonly {name: string; apply(graph: NotablePointsGraph): void; drawn: boolean | 'degenerate'}[] = [
    {name: 'default', apply: () => {}, drawn: true},
    {name: 'obtuse example', apply: graph => graph.loadExample('obtuse'), drawn: true},
    {name: 'right example', apply: graph => graph.loadExample('right'), drawn: true},
    {name: 'degenerate example', apply: graph => graph.loadExample('degenerate'), drawn: 'degenerate'},
    {name: 'scalene acute', apply: graph => graph.loadModel(model([0, 0], [5, 1], [1, 4])), drawn: true},
    {name: 'obtuse custom', apply: graph => graph.loadModel(model([0, 0], [7, 0], [3, 3])), drawn: true},
    {name: 'two points', apply: graph => graph.loadModel(model([0, 0], [5, 1])), drawn: false},
];

describe('triangle centres declaration', () => {
    test.each(STATES)('$name: consistent, drawn and equal to the panel', ({apply, drawn}) => {
        const graph = new NotablePointsGraph();
        const {view} = mountGraph(graph);
        act(() => { for (const id of OVERLAYS) graph.setOverlay(id, true); });
        act(() => apply(graph));
        const declaration = graph.getDeclaration() as GraphDeclaration<NotablePointsIds>;

        expect(checkDeclaration(declaration)).toEqual([]);
        // nothing is bound in the arbiter, so nothing is declared as a parameter
        expect(declaration.parameters).toBeUndefined();
        expect(graph.parameters?.keys() ?? []).toEqual([]);

        // the legend resolves to what the board drew; a missing triangle draws nothing, a degenerate one only its sides and the centroid
        expect(declaration.legend!.map(entry => entry.id)).toEqual([...OVERLAYS]);
        for (const entry of declaration.legend!) {
            const object = graph.drawnObject(entry.object);
            expect(object, entry.id).toBeDefined();
            expect(object!.visible, entry.id).toBe(drawn === 'degenerate' ? ['triangle', 'centroid'].includes(entry.id) : drawn);
        }

        // the notes are the sentences of the panel, in its order
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBeGreaterThan(0);
    });

    test('a hidden overlay hides its legend entry, and a centre has its own colour', () => {
        const graph = new NotablePointsGraph();
        mountGraph(graph);
        act(() => graph.setOverlay('orthocentre', false));
        expect(graph.drawnObject('orthocentre')!.visible).toBe(false);
        expect(graph.drawnObject('centroid')!.visible).toBe(true);
        expect(new Set(['centroid', 'circumcentre', 'incentre', 'orthocentre'].map(id => graph.drawnObject(id)!.color)).size).toBe(4);
        expect(graph.drawnObject('nothing')).toBeUndefined();
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('the declaration leaves a centre outside the view unmarked (board state is not declared)', () => {
        const graph = new NotablePointsGraph();
        mountGraph(graph);
        act(() => graph.loadModel(model([0, 0], [7, 0], [1, 1])));
        const text = graph.getDeclaration()!.notes!.map(note => renderMessage(note.text)).join('\n');
        expect(text).toContain('H = (1, 6), zunaj trikotnika');
        expect(text).not.toContain('zunaj pogleda');
    });

    test('the overlay switches are actions that run as the learner and follow the state', () => {
        const graph = new NotablePointsGraph();
        mountGraph(graph);
        const action = (id: string) => (graph.getDeclaration() as GraphDeclaration<NotablePointsIds>).actions!.find(candidate => candidate.id === id)!;
        expect((graph.getDeclaration() as GraphDeclaration<NotablePointsIds>).actions!.map(candidate => candidate.id)).toEqual([...OVERLAYS]);
        expect(action('triangle')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        expect(action('circumcentre')).toMatchObject({placement: 'board', pressed: false});
        act(() => graph.performAction('circumcentre'));
        expect(action('circumcentre').pressed).toBe(true);
        expect(graph.overlayShown('circumcentre')).toBe(true);
        expect(graph.drawnObject('circumcentre')!.visible).toBe(true);
        act(() => graph.performAction('circumcentre'));
        expect(action('circumcentre').pressed).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });
});
