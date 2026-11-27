import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {CrossRatioGraph, type CrossRatioIds} from './CrossRatioGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const LEGEND = ['line-p', 'line-q', 'originals', 'centre', 'line-points', 'images', 'rays'] as const;

/** `projection`: the images and rays are drawn (ok), rays only (coincident points), or neither. */
const STATES: readonly {name: string; apply(graph: CrossRatioGraph): void; drawn: 'ok' | 'rays' | 'none'; notes: number}[] = [
    {name: 'default', apply: () => {}, drawn: 'ok', notes: 4},
    {name: 'harmonic', apply: graph => graph.loadExample('harmonic'), drawn: 'ok', notes: 4},
    {name: 'image at infinity', apply: graph => graph.loadExample('infinity'), drawn: 'ok', notes: 5},
    {name: 'point D moved', apply: graph => { graph.loadExample('default'); graph.moveHandleTo(3, 6, 0); }, drawn: 'ok', notes: 4},
    {name: 'centre and N moved', apply: graph => { graph.moveHandleTo(4, 3, 6); graph.moveHandleTo(6, 4, 1); }, drawn: 'ok', notes: 4},
    {name: 'centre on the first line', apply: graph => graph.moveHandleTo(4, 2, 0), drawn: 'none', notes: 1},
    {name: 'two points coincide', apply: graph => { graph.moveHandleTo(4, 0, 5); graph.moveHandleTo(1, 0, 0); }, drawn: 'rays', notes: 1},
    {name: 'second line degenerate', apply: graph => { graph.loadExample('harmonic'); graph.moveHandleTo(6, 0, 1); }, drawn: 'none', notes: 1},
];

describe('cross-ratio declaration', () => {
    test('the graph binds no parameters, so nothing is declared as one', () => {
        const graph = new CrossRatioGraph();
        mountGraph(graph);
        const declaration = graph.getDeclaration() as GraphDeclaration<CrossRatioIds>;
        expect(declaration.parameters).toBeUndefined();
        expect((graph.parameters?.keys() ?? []).filter(key => key !== 'view')).toEqual([]);
    });

    test.each(STATES)('$name: consistent, drawn and equal to the panel', ({apply, drawn, notes}) => {
        const graph = new CrossRatioGraph();
        const {view} = mountGraph(graph);
        act(() => apply(graph));
        const declaration = graph.getDeclaration() as GraphDeclaration<CrossRatioIds>;

        expect(checkDeclaration(declaration)).toEqual([]);

        // the legend resolves to what the board drew; undefined projections draw no images (and no rays unless two points coincide)
        expect(declaration.legend!.map(entry => entry.id)).toEqual([...LEGEND]);
        for (const entry of declaration.legend!) {
            const object = graph.drawnObject(entry.object);
            expect(object, entry.id).toBeDefined();
            const expected = entry.id === 'images' ? drawn === 'ok' : entry.id === 'rays' ? drawn !== 'none' : true;
            expect(object!.visible, entry.id).toBe(expected);
        }

        // the notes are the sentences of the panel, in its order; the status is the panel's status sentence
        const panel = [...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.notes!.map(note => normalise(renderMessage(note.text)))).toEqual(panel);
        expect(panel.length).toBe(notes);
        const status = view.container.querySelector('[data-projective-line="status"]');
        expect(declaration.status!.map(line => normalise(renderMessage(line.text)))).toEqual([normalise(status?.textContent ?? '')]);
        expect(declaration.status![0].tone).toBe(drawn === 'ok' ? undefined : 'warning');
    });

    test('the legend colours differ where the board draws different things, and an unknown id resolves to nothing', () => {
        const graph = new CrossRatioGraph();
        mountGraph(graph);
        const colour = (id: string) => graph.drawnObject(id)!.color;
        expect(colour('line-p')).not.toBe(colour('line-q'));
        expect(colour('images')).not.toBe(colour('originals'));
        expect(graph.drawnObject('nothing')).toBeUndefined();
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('the notes follow the language', () => {
        const graph = new CrossRatioGraph();
        mountGraph(graph);
        const first = renderMessage(graph.getDeclaration()!.notes![0].text);
        act(() => setLanguage('en'));
        expect(renderMessage(graph.getDeclaration()!.notes![0].text)).not.toBe(first);
    });
});
