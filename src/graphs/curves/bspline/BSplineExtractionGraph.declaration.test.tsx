import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import BSplineExtractionGraph, {type BSplineExtractionIds} from './BSplineExtractionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import {piecesOf} from './bsplineExtractionModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: BSplineExtractionGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new BSplineExtractionGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<BSplineExtractionIds>};
}

const text = (declaration: GraphDeclaration<BSplineExtractionIds>) =>
    Object.fromEntries((declaration.notes ?? []).map(note => [note.id, renderMessage(note.text)]));

const states: {name: string; steps: Step[]; pieces: number; moved: boolean; changed: number[]}[] = [
    {name: 'default quadratic', steps: [], pieces: 2, moved: false, changed: []},
    {name: 'a point moved', steps: [graph => learner(() => graph.editPoint(2, [2, 3.5]))], pieces: 2, moved: true, changed: [1, 2]},
    {name: 'the first point moved', steps: [graph => learner(() => graph.editPoint(0, [0.5, 0.5]))], pieces: 2, moved: true, changed: [1]},
    {name: 'the cubic example', steps: [graph => learner(() => graph.selectExample('cubic'))], pieces: 3, moved: false, changed: []},
    {name: 'the cubic with a point moved', steps: [graph => learner(() => { graph.selectExample('cubic'); graph.editPoint(3, [3, 2]); })], pieces: 3, moved: true, changed: [1, 2, 3]},
    {name: 'a typed knot', steps: [graph => learner(() => { graph.selectExample('cubic'); graph.editKnot(5, 1.5); })], pieces: 3, moved: false, changed: []},
    {name: 'reset after a move', steps: [graph => learner(() => { graph.editPoint(2, [2, 3.5]); graph.resetToOrigin(); })], pieces: 2, moved: false, changed: []},
];

describe('Extraction declaration', () => {
    for (const {name, steps, pieces, moved, changed} of states) {
        test(`${name}: consistent, drawn and the sentences of the old panel`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();
            const kernel = piecesOf(graph.state.knots, graph.state.degree, graph.state.points);

            expect(checkDeclaration(current)).toEqual([]);
            expect(current.parameters ?? []).toEqual([]);
            expect(current.actions ?? []).toEqual([]);
            expect(current.marks?.must?.length).toBe(graph.state.points.length);

            // the sentences follow the kernel's pieces
            const notes = text(current);
            expect(kernel).toHaveLength(pieces);
            expect(notes.count).toBe(`Število odsekov: ${pieces} (različni notranji vozli + 1)`);
            expect(Object.keys(notes).filter(id => id.startsWith('piece-'))).toHaveLength(pieces);
            expect('affected' in notes).toBe(moved);
            kernel.forEach((piece, index) => {
                const sentence = notes[`piece-${index + 1}`];
                expect(sentence.startsWith(`Odsek ${index + 1}: u ∈ [`), sentence).toBe(true);
                expect(sentence.endsWith('(spremenjen)'), sentence).toBe(changed.includes(index + 1));
                expect(piece.points.length).toBe(graph.state.degree + 1);
            });

            // the legend resolves to drawn objects: the control points and one entry per piece
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(['control', ...kernel.map((_, i) => `piece-${i + 1}`)]);
            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(true);
            }
            view.unmount();
        });
    }

    test('the sentences and the legend follow a language switch', () => {
        const {declaration, view} = setup(graph => learner(() => graph.editPoint(0, [0.5, 0.5])));
        expect(text(declaration())['piece-1']).toBe('Odsek 1: u ∈ [0, 1], točke (0,5, 0,5), (1, 2), (2, 2) (spremenjen)');
        act(() => setLanguage('en'));
        expect(text(declaration())['piece-1']).toBe('Piece 1: u ∈ [0, 1], points (0.5, 0.5), (1, 2), (2, 2) (changed)');
        expect(renderMessage(declaration().legend![1].label)).toBe('Piece 1');
        view.unmount();
    });
});
