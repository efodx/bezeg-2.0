import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {FivePointGraph, type FivePointIds} from './FivePointGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const LEGEND = ['conic', 'line-pair', 'arc', 'continuation', 'polygon', 'tangents', 'points'] as const;

/** `conic`: the conic is drawn; `arc`: the arc, its polygon and tangents are drawn; `continuation` needs the arc and the switch. */
const STATES: readonly {name: string; apply(graph: FivePointGraph): void; conic: boolean; arc: boolean; linePair?: boolean; continuation?: boolean; notes: number}[] = [
    {name: 'default ellipse', apply: () => {}, conic: true, arc: true, notes: 7},
    {name: 'hyperbola', apply: graph => graph.loadExample('hyperbola'), conic: true, arc: true, notes: 7},
    {name: 'parabola', apply: graph => graph.loadExample('parabola'), conic: true, arc: true, notes: 7},
    {name: 'continuation on', apply: graph => graph.setExtrapolation(true), conic: true, arc: true, continuation: true, notes: 7},
    {name: 'three collinear', apply: graph => graph.loadExample('three-collinear'), conic: false, arc: false, linePair: true, notes: 2},
    {name: 'four collinear', apply: graph => graph.loadExample('four-collinear'), conic: false, arc: false, notes: 1},
    {name: 'complementary third point', apply: graph => { graph.loadExample('ellipse'); graph.chooseEnd('a', 2); graph.chooseEnd('b', 4); graph.chooseThird(0); }, conic: true, arc: false, notes: 2},
    {name: 'stale conic', apply: graph => { graph.loadExample('ellipse'); graph.moveTo(3, 2, 0); }, conic: true, arc: false, linePair: true, notes: 2},
];

describe('five-point declaration', () => {
    test('the graph binds no parameters, so nothing is declared as one', () => {
        const graph = new FivePointGraph();
        mountGraph(graph);
        const declaration = graph.getDeclaration() as GraphDeclaration<FivePointIds>;
        expect(declaration.parameters).toBeUndefined();
        expect(graph.parameters?.keys() ?? []).toEqual([]);
    });

    test.each(STATES)('$name: consistent, drawn and equal to the panel', ({apply, conic, arc, linePair, continuation, notes}) => {
        const graph = new FivePointGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = graph.getDeclaration() as GraphDeclaration<FivePointIds>;

        expect(checkDeclaration(declaration)).toEqual([]);

        // the legend resolves to what the board drew now
        expect(declaration.legend!.map(entry => entry.id)).toEqual([...LEGEND]);
        const visible = {conic, 'line-pair': linePair === true, arc, continuation: continuation === true, polygon: arc, tangents: arc, points: true};
        for (const entry of declaration.legend!) {
            const object = graph.drawnObject(entry.object);
            expect(object, entry.id).toBeDefined();
            expect(object!.visible, entry.id).toBe(visible[entry.id]);
        }

        // the notes are the sentences of the panel, in its order; the status is the first of them
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBe(notes);
        expect(declaration.notes![0].id).toBe('status');
        expect(declaration.notes![0].tone).toBe(arc ? undefined : 'warning');
        expect(declaration.status).toBeUndefined();

        // the view keeps the five points
        expect(declaration.marks!.must).toHaveLength(5);
    });

    test('the legend colours differ where the board draws different things, and an unknown id resolves to nothing', () => {
        const graph = new FivePointGraph();
        mountGraph(graph);
        const colour = (id: string) => graph.drawnObject(id)!.color;
        expect(colour('conic')).not.toBe(colour('arc'));
        expect(colour('polygon')).not.toBe(colour('tangents'));
        expect(graph.drawnObject('nothing')).toBeUndefined();
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('the notes follow the language', () => {
        const graph = new FivePointGraph();
        mountGraph(graph);
        const first = renderMessage(graph.getDeclaration()!.notes![0].text);
        act(() => setLanguage('en'));
        expect(renderMessage(graph.getDeclaration()!.notes![0].text)).not.toBe(first);
    });
});
