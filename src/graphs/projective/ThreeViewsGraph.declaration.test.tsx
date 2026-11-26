import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ThreeViewsGraph, type ThreeViewsIds} from './ThreeViewsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const LEGEND = ['circle', 'line', 'image', 'directions', 'points'] as const;

/** `directions`: the asymptote rays or the axis ray are drawn (L meets the circle); `points`: P or P' is drawn. */
const STATES: readonly {name: string; apply(graph: ThreeViewsGraph): void; directions: boolean; points: boolean; notes: number}[] = [
    {name: 'default ellipse (c = 2)', apply: () => {}, directions: false, points: false, notes: 6},
    {name: 'parabola (c = 1)', apply: graph => { graph.setCTenths(10); }, directions: true, points: false, notes: 6},
    {name: 'hyperbola (c = 0)', apply: graph => { graph.setCTenths(0); }, directions: true, points: false, notes: 6},
    {name: 'point on the circle', apply: graph => { graph.setCTenths(5); graph.togglePoint(true); graph.placePoint(2); }, directions: true, points: true, notes: 7},
    {name: 'point on L (at infinity)', apply: graph => { graph.setCTenths(0); graph.togglePoint(true); graph.placePoint(0); }, directions: true, points: true, notes: 7},
    {name: 'clipped image', apply: graph => { graph.setCTenths(9); graph.togglePoint(true); graph.placePoint(6); }, directions: true, points: true, notes: 8},
    {name: 'L below the circle', apply: graph => { graph.setCTenths(-15); }, directions: false, points: false, notes: 6},
];

describe('three-views declaration', () => {
    test('the graph binds no parameters, so nothing is declared as one', () => {
        const graph = new ThreeViewsGraph();
        mountGraph(graph);
        const declaration = graph.getDeclaration() as GraphDeclaration<ThreeViewsIds>;
        expect(declaration.parameters).toBeUndefined();
        expect(graph.parameters?.keys() ?? []).toEqual([]);
    });

    test.each(STATES)('$name: consistent, drawn and equal to the panel', ({apply, directions, points, notes}) => {
        const graph = new ThreeViewsGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = graph.getDeclaration() as GraphDeclaration<ThreeViewsIds>;

        expect(checkDeclaration(declaration)).toEqual([]);

        // the legend resolves to what the board drew now
        expect(declaration.legend!.map(entry => entry.id)).toEqual([...LEGEND]);
        const visible = {circle: true, line: true, image: true, directions, points};
        for (const entry of declaration.legend!) {
            const object = graph.drawnObject(entry.object);
            expect(object, entry.id).toBeDefined();
            expect(object!.visible, entry.id).toBe(visible[entry.id]);
        }

        // the notes are the sentences of the panel, in its order
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBe(notes);
        expect(declaration.notes!.length).toBe(notes);
        expect(declaration.status).toBeUndefined();

        // the view keeps both panels
        expect(declaration.marks!.must).toHaveLength(2);
    });

    test('the legend colours differ where the board draws different things, and an unknown id resolves to nothing', () => {
        const graph = new ThreeViewsGraph();
        mountGraph(graph);
        const colour = (id: string) => graph.drawnObject(id)!.color;
        expect(colour('circle')).not.toBe(colour('image'));
        expect(colour('line')).not.toBe(colour('directions'));
        expect(graph.drawnObject('nothing')).toBeUndefined();
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('the notes follow the language', () => {
        const graph = new ThreeViewsGraph();
        mountGraph(graph);
        const first = renderMessage(graph.getDeclaration()!.notes![1].text);
        act(() => setLanguage('en'));
        expect(renderMessage(graph.getDeclaration()!.notes![1].text)).not.toBe(first);
    });
});
