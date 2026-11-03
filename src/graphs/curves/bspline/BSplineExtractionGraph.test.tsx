import React from 'react';
import JXG from 'jsxgraph';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test, vi} from 'vitest';
import BSplineExtractionGraph from './BSplineExtractionGraph';
import {GraphHost} from '../../base/GraphHost';
import {setLanguage} from '../../../localization';
import {affectedPieces, casteljau, distinctInteriorKnots, expectedPieceCount, extract, movedIndices, pieceParameter, piecesOf} from './bsplineExtractionModel';
import {insertionExample} from './bsplineInsertionModel';
import type {ControlPoint} from './bsplineDeBoorModel';

const liveSubscriptions = vi.hoisted(() => ({count: 0}));
vi.mock('../../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            liveSubscriptions.count++;
            const unsubscribe = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) { released = true; liveSubscriptions.count--; } unsubscribe(); };
        },
    };
});

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

afterEach(() => setLanguage('sl'));

class ObservedGraph extends BSplineExtractionGraph {
    liveBoard() { return this.board; }
    sceneOf() { return this['scene']!; }
    polygons(): [number, number][][] {
        return this.sceneOf().piecePolygonElements().map(c => c.dataX.map((x, i) => [x, c.dataY[i]] as [number, number]));
    }
    /** Simulates dragging control point `index` to (x, y): the board point moves and its drag handlers fire. */
    drag(index: number, x: number, y: number) {
        const point = this.sceneOf().curve.getJxgPoints()[index];
        point.setPosition(JXG.COORDS_BY_USER, [x, y]);
        (point as unknown as { triggerEventHandlers(names: string[], args: unknown[]): void }).triggerEventHandlers(['drag'], []);
    }
    /** Pieces whose polygon is drawn with the emphasized stroke width. */
    emphasized(): number[] {
        return this.sceneOf().piecePolygonElements()
            .map((c, i) => (c as unknown as { evalVisProp(name: string): number }).evalVisProp('strokeWidth') > 1.5 ? i : -1)
            .filter(i => i >= 0);
    }
}

const mount = () => {
    const graph = new ObservedGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, board: graph.liveBoard()};
};

const TOL = 1e-12;
const expectRows = (actual: readonly (readonly number[])[], expected: readonly (readonly number[])[]) => {
    expect(actual.length).toBe(expected.length);
    expected.forEach((row, i) => row.forEach((value, d) => expect(Math.abs(actual[i][d] - value)).toBeLessThanOrEqual(TOL)));
};

const L2_PIECES = [[[0, 0], [1, 2], [2, 2]], [[2, 2], [3, 2], [4, 0]]];
const CUBIC_PIECES = [
    [[0, 0], [1, 2], [1.5, 2.5], [2, 2.25]],
    [[2, 2.25], [2.5, 2], [3, 1], [3.5, 1]],
    [[3.5, 1], [4, 1], [5, 3], [6, 0]],
];

describe('L4 acceptance 1: the spec pieces', () => {
    test('the L2 example gives the two spec pieces, on the state, the seam accessor and the board polygons', () => {
        const {graph, view} = mount();
        graph.boardUpdate();
        const pieces = graph.pieces();
        expect(pieces.map(p => [p.start, p.end])).toEqual([[0, 1], [1, 2]]);
        pieces.forEach((piece, i) => expectRows(piece.points, L2_PIECES[i]));
        L2_PIECES.forEach((expected, i) => expectRows(graph.pieceControlPoints(i)!, expected));
        expect(graph.pieceControlPoints(2)).toBeUndefined();
        expect(graph.polygons()).toHaveLength(2);
        graph.polygons().forEach((polygon, i) => expectRows(polygon, L2_PIECES[i]));
        view.unmount();
    });

    test('the cubic gives the three spec pieces', () => {
        const {graph, view} = mount();
        act(() => graph.selectExample('cubic'));
        graph.boardUpdate();
        expect(graph.pieces().map(p => [p.start, p.end])).toEqual([[0, 1], [1, 2], [2, 3]]);
        graph.pieces().forEach((piece, i) => expectRows(piece.points, CUBIC_PIECES[i]));
        expect(graph.polygons()).toHaveLength(3);
        graph.polygons().forEach((polygon, i) => expectRows(polygon, CUBIC_PIECES[i]));
        view.unmount();
    });

    test('each piece has its own colour', () => {
        const {graph, view} = mount();
        act(() => graph.selectExample('cubic'));
        const colours = graph.sceneOf().piecePolygonElements().map(c => (c as unknown as { evalVisProp(n: string): string }).evalVisProp('strokeColor'));
        expect(new Set(colours).size).toBe(3);
        view.unmount();
    });
});

describe('L4 acceptance 2: every piece as a Bezier equals the B-spline', () => {
    test.each([['quadratic'], ['cubic']] as const)('%s: 25 parameters per interval within 1e-12', id => {
        const {graph, view} = mount();
        act(() => graph.selectExample(id));
        const model = graph.sceneOf().curve.getCurve();
        graph.pieces().forEach(piece => {
            for (let i = 0; i <= 24; i++) {
                const s = i / 24;
                const p = model.eval(pieceParameter(piece, s));
                const q = casteljau(piece.points, s);
                expect(Math.hypot(p.X() - q[0], p.Y() - q[1])).toBeLessThanOrEqual(TOL);
            }
        });
        view.unmount();
    });

    test('the drawn piece curves lie on the B-spline too', () => {
        const {graph, view} = mount();
        graph.boardUpdate();
        const model = graph.sceneOf().curve.getCurve();
        graph.sceneOf().pieceCurveElements().forEach((curve, index) => {
            const piece = graph.pieces()[index];
            expect(curve.dataX.length).toBeGreaterThan(20);
            curve.dataX.forEach((x, i) => {
                const p = model.eval(pieceParameter(piece, i / (curve.dataX.length - 1)));
                expect(Math.hypot(p.X() - x, p.Y() - curve.dataY[i])).toBeLessThanOrEqual(TOL);
            });
        });
        view.unmount();
    });
});

describe('L4 acceptance 3: piece count = distinct interior knots + 1', () => {
    test('shown in the inspector and after a knot edit', () => {
        const {graph, view} = mount();
        const count = () => document.querySelector('[data-extraction-readout="count"]')!.textContent;
        expect(count()).toContain('2');
        act(() => graph.selectExample('cubic'));
        expect(graph.pieces()).toHaveLength(3);
        expect(count()).toContain('3');
        expect(distinctInteriorKnots(graph.state.knots, graph.state.degree) + 1).toBe(3);
        // 1 -> 2 makes the interior knot 2 triple: one distinct interior knot, two pieces.
        act(() => { expect(graph.editKnot(4, 2)).toBeUndefined(); });
        expect(graph.state.knots).toEqual([0, 0, 0, 0, 2, 2, 2, 3, 3, 3, 3]);
        expect(graph.pieces()).toHaveLength(2);
        expect(graph.pieces()).toHaveLength(expectedPieceCount(graph.state.knots, graph.state.degree));
        expect(graph.sceneOf().piecePolygonElements()).toHaveLength(2);
        expect(count()).toContain('2');
        view.unmount();
    });
});

describe('L4 acceptance 4: the extraction operator', () => {
    test.each([['quadratic'], ['cubic']] as const)('%s: rows are non-negative and sum to 1, and operator * P gives the refined points', id => {
        const data = insertionExample(id);
        const extraction = extract(data.knots, data.degree, data.points)!;
        expect(extraction.operator.length).toBe(extraction.points.length);
        extraction.operator.forEach(row => {
            expect(Math.abs(row.reduce((a, b) => a + b, 0) - 1)).toBeLessThanOrEqual(TOL);
            row.forEach(v => expect(v).toBeGreaterThanOrEqual(0));
        });
        extraction.points.forEach((point, i) => [0, 1].forEach(d =>
            expect(Math.abs(point[d] - extraction.operator[i].reduce((acc, w, j) => acc + w * data.points[j][d], 0))).toBeLessThanOrEqual(TOL)));
    });
});

describe('L4 acceptance 5: an existing break', () => {
    // Quadratic, six points, knot 1 with multiplicity 3 = k + 1: two disconnected pieces.
    const breakData = {degree: 2, knots: [0, 0, 0, 1, 1, 1, 2, 2, 2], points: [[0, 0], [1, 2], [2, 0], [3, 0], [4, 2], [5, 0]] as ControlPoint[]};

    test('the model gives finite pieces, two of them, and a finite operator', () => {
        const extraction = extract(breakData.knots, breakData.degree, breakData.points)!;
        expect(extraction).toBeDefined();
        expect(extraction.pieces).toHaveLength(2);
        expectRows(extraction.pieces[0].points, breakData.points.slice(0, 3));
        expectRows(extraction.pieces[1].points, breakData.points.slice(3));
        extraction.operator.flat().forEach(v => expect(Number.isFinite(v)).toBe(true));
        extraction.pieces.flatMap(p => p.points.flat()).forEach(v => expect(Number.isFinite(v)).toBe(true));
        expect(piecesOf(breakData.knots, breakData.degree, breakData.points)).toHaveLength(expectedPieceCount(breakData.knots, breakData.degree));
    });

    test('the graph imports it and draws finite polygons', () => {
        const {graph, view} = mount();
        act(() => graph.importPresetData(breakData));
        graph.boardUpdate();
        expect(graph.pieces()).toHaveLength(2);
        expect(graph.polygons()).toHaveLength(2);
        graph.polygons().flat().flat().forEach(v => expect(Number.isFinite(v)).toBe(true));
        graph.sceneOf().pieceCurveElements().forEach(c => [...c.dataX, ...c.dataY].forEach(v => expect(Number.isFinite(v)).toBe(true)));
        view.unmount();
    });
});

describe('moving a control point updates the pieces and highlights the affected ones', () => {
    test('the polygons follow the dragged point', () => {
        const {graph, view} = mount();
        act(() => graph.drag(1, 1.5, 2.5));
        graph.boardUpdate();
        expectRows([graph.polygons()[0][1]], [[1.5, 2.5]]);
        expectRows(graph.pieces()[0].points, graph.polygons()[0]);
        view.unmount();
    });

    test('affectedPieces is the support: end points touch one piece, a middle point all', () => {
        const q = insertionExample('quadratic');
        const pq = piecesOf(q.knots, q.degree, q.points);
        expect(affectedPieces(q.knots, q.degree, pq, [0])).toEqual([0]);
        expect(affectedPieces(q.knots, q.degree, pq, [3])).toEqual([1]);
        expect(affectedPieces(q.knots, q.degree, pq, [1])).toEqual([0, 1]);
        const c = insertionExample('cubic');
        const pc = piecesOf(c.knots, c.degree, c.points);
        expect(affectedPieces(c.knots, c.degree, pc, [0])).toEqual([0]);
        expect(affectedPieces(c.knots, c.degree, pc, [6])).toEqual([2]);
        expect(affectedPieces(c.knots, c.degree, pc, [3])).toEqual([0, 1, 2]);
        expect(movedIndices([[0, 0], [1, 1]], [[0, 0], [1, 2]])).toEqual([1]);
    });

    test.each([['quadratic', 0], ['quadratic', 3], ['quadratic', 1], ['cubic', 0], ['cubic', 6], ['cubic', 3]] as const)(
        '%s: dragging point %i emphasizes exactly the pieces whose Bezier points changed', (id, index) => {
            const {graph, view} = mount();
            act(() => graph.selectExample(id));
            graph.boardUpdate();
            expect(graph.emphasized()).toEqual([]);
            const before = graph.pieces();
            const [x, y] = graph.state.points[index];
            act(() => graph.drag(index, x + 0.3, y + 0.7));
            graph.boardUpdate();
            expect(graph.state.moved).toEqual([index]);
            const changed = graph.pieces().map((piece, i) =>
                piece.points.some((p, j) => Math.hypot(p[0] - before[i].points[j][0], p[1] - before[i].points[j][1]) > 1e-9) ? i : -1).filter(i => i >= 0);
            expect(graph.affected()).toEqual(changed);
            expect(graph.emphasized()).toEqual(changed);
            const marked = [...document.querySelectorAll('[data-extraction-readout="pieces"] li')]
                .map((li, i) => li.getAttribute('data-affected') === 'true' ? i : -1).filter(i => i >= 0);
            expect(marked).toEqual(changed);
            view.unmount();
        });

    test('Reset clears the highlight and restores the example', () => {
        const {graph, view} = mount();
        act(() => graph.drag(0, 0.5, 0.5));
        expect(graph.emphasized()).toEqual([0]);
        act(() => screen.getByRole('button', {name: 'Nazaj na primer'}).click());
        graph.boardUpdate();
        expect(graph.state.moved).toEqual([]);
        expect(graph.emphasized()).toEqual([]);
        expectRows(graph.state.points, insertionExample('quadratic').points);
        expectRows(graph.polygons()[0], L2_PIECES[0]);
        view.unmount();
    });
});

describe('the readout and examples', () => {
    const items = () => [...document.querySelectorAll('[data-extraction-readout="pieces"] li')].map(li => li.textContent);

    test('lists interval and points per piece and follows the language', () => {
        const {graph, view} = mount();
        expect(items()).toHaveLength(2);
        expect(items()[0]).toBe('Odsek 1: u ∈ [0, 1], točke (0, 0), (1, 2), (2, 2)');
        act(() => graph.selectExample('cubic'));
        act(() => graph.drag(0, 0.5, 0.25));
        act(() => setLanguage('en'));
        expect(items()[0]).toContain('Piece 1: u ∈ [0, 1], points (0.5, 0.25)');
        expect(items()[0]).toContain('(changed)');
        expect(items()[2]).not.toContain('changed');
        view.unmount();
    });

    test('examples and import', () => {
        const {graph, view} = mount();
        act(() => graph.selectExample('cubic'));
        expect(graph.state.knots).toEqual([0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3]);
        act(() => graph.importPresetData({degree: 2, knots: [0, 0, 0, 1, 1, 1], points: [[0, 0], [1, 1], [2, 0]]}));
        expect(graph.state.example).toBe('custom');
        expect(graph.exportPresetData().points).toHaveLength(3);
        expect(() => graph.importPresetData({degree: 2, knots: [0, 0, 0, 1], points: [[0, 0], [1, 1], [2, 0]]})).toThrow();
        view.unmount();
    });
});

describe('disposal', () => {
    test('scene rebuilds and unmount leave no board objects and no language subscription', () => {
        const before = liveSubscriptions.count;
        const {graph, view, board} = mount();
        const owned = () => [...graph.sceneOf().ownedElements(), ...graph.sceneOf().curve.getJxgPoints(), graph.sceneOf().curve.getJxgCurve()];
        const first = owned();
        expect(first.length).toBeGreaterThanOrEqual(2 * 2 + 4);
        act(() => graph.selectExample('cubic'));
        expect(first.some(element => board.objectsList.includes(element))).toBe(false);
        const second = owned();
        expect(second.length).toBeGreaterThanOrEqual(2 * 3 + 7);
        expect(second.every(element => board.objectsList.includes(element))).toBe(true);
        expect(liveSubscriptions.count).toBe(before);
        view.unmount();
        expect(second.some(element => board.objectsList.includes(element))).toBe(false);
        expect(liveSubscriptions.count).toBe(before);
    });
});
