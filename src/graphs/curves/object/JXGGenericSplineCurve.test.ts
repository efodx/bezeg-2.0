import JXG, {Board} from 'jsxgraph';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {JXGGenericSplineCurve} from './JXGGenericSplineCurve';

const SEVEN = [[0, 0], [1, 2], [2, 3], [3, 1], [4, 0], [5, 2], [6, 3]];

const boards: Board[] = [];
function makeBoard(): Board {
    const host = document.createElement('div');
    host.id = `generic-spline-${boards.length}`;
    document.body.appendChild(host);
    const board = JXG.JSXGraph.initBoard(host.id, {boundingbox: [-2, 6, 8, -2], renderer: 'no', showCopyright: false, showNavigation: false});
    boards.push(board);
    return board;
}

afterEach(() => {
    boards.splice(0).forEach(board => JXG.JSXGraph.freeBoard(board));
    document.body.innerHTML = '';
});

const names = (curve: JXGGenericSplineCurve) => curve.getJxgPoints().map(point => point.name);

describe('JXGGenericSplineCurve completed changes', () => {
    it('draws the derived points and labels for the requested degree and continuity', () => {
        const curve = new JXGGenericSplineCurve(SEVEN, 1, 3, makeBoard());
        const spline = curve.getCurve();
        expect(curve.getJxgPoints()).toHaveLength(spline.getPoints().length);
        expect(curve.nonFreeJsxPoints).toHaveLength(spline.getNonFreePoints().length);
        expect(names(curve)[0]).toBe('$$p_{\\scriptsize0}^{\\scriptsize(1)}$$');
    });

    it('redraws the derived points and relabels after one change, matching a curve built there', () => {
        const changed = new JXGGenericSplineCurve(SEVEN, 1, 3, makeBoard());
        expect(changed.changeSpline({degree: 4, continuity: 3})).toBe(true);
        const built = new JXGGenericSplineCurve(SEVEN, 3, 4, makeBoard());

        const spline = changed.getCurve();
        expect([spline.getDegree(), spline.getContinuity()]).toEqual([4, 3]);
        expect(changed.nonFreeJsxPoints).toHaveLength(spline.getNonFreePoints().length);
        expect(changed.getJxgPoints()).toHaveLength(spline.getPoints().length);
        expect(names(changed)).toEqual(names(built));
        expect(changed.getJxgPoints().map(p => [p.X(), p.Y()])).toEqual(built.getJxgPoints().map(p => [p.X(), p.Y()]));
        // Every drawn derived point follows the new model, and the old ones are gone from the board.
        changed.nonFreeJsxPoints.forEach(point => expect(changed.board.objectsList).toContain(point));
    });

    it('removes the previous derived points from the board when the structure changes', () => {
        const board = makeBoard();
        const curve = new JXGGenericSplineCurve(SEVEN, 1, 3, board);
        const previous = [...curve.nonFreeJsxPoints];
        curve.changeSpline({degree: 2, continuity: 1});
        previous.forEach(point => expect(board.objectsList).not.toContain(point));
        expect(curve.getJxgPoints().filter(point => previous.includes(point))).toEqual([]);
    });

    it('regenerates and redraws exactly once per completed change', () => {
        const curve = new JXGGenericSplineCurve(SEVEN, 1, 2, makeBoard());
        const generate = vi.spyOn(curve.getCurve(), 'generateBezierCurves');
        const refresh = vi.spyOn(curve as any, 'refreshNonFreeJsxGraphPoints');
        const label = vi.spyOn(curve, 'labelJxgPoints');
        curve.changeSpline({degree: 6, continuity: 5});
        expect([generate.mock.calls.length, refresh.mock.calls.length, label.mock.calls.length]).toEqual([1, 1, 1]);
    });

    it('neither regenerates nor redraws for the current state or a rejected target', () => {
        const curve = new JXGGenericSplineCurve(SEVEN, 1, 3, makeBoard());
        const before = [...curve.nonFreeJsxPoints];
        const generate = vi.spyOn(curve.getCurve(), 'generateBezierCurves');
        const refresh = vi.spyOn(curve as any, 'refreshNonFreeJsxGraphPoints');
        const label = vi.spyOn(curve, 'labelJxgPoints');
        expect(curve.changeSpline({degree: 3, continuity: 1})).toBe(false);
        expect(() => curve.changeSpline({degree: 7})).toThrow(RangeError);
        expect(() => curve.changeSpline({degree: 8})).toThrow(RangeError);
        expect(() => curve.changeSpline({continuity: 3})).toThrow(RangeError);
        expect([generate.mock.calls.length, refresh.mock.calls.length, label.mock.calls.length]).toEqual([0, 0, 0]);
        expect(curve.nonFreeJsxPoints).toEqual(before);
    });

    it('restores a stored degree above the change limit, as stored Presets may hold', () => {
        const curve = new JXGGenericSplineCurve(SEVEN, 2, 9, makeBoard());
        expect([curve.getCurve().getDegree(), curve.getCurve().getContinuity()]).toEqual([9, 2]);
        expect(JXGGenericSplineCurve.toDto(curve)).toMatchObject({degree: 9, continuity: 2});
        expect(curve.getJxgPoints()).toHaveLength(curve.getCurve().getPoints().length);
    });

    it('round-trips degree, continuity and the drawn points through the Preset DTO', () => {
        const board = makeBoard();
        const original = new JXGGenericSplineCurve(SEVEN, 2, 5, board);
        original.changeSpline({degree: 4, continuity: 1});
        const dto = JXGGenericSplineCurve.toDto(original);
        const restored = JXGGenericSplineCurve.fromDto(dto, makeBoard());
        expect(dto).toMatchObject({degree: 4, continuity: 1});
        expect(JXGGenericSplineCurve.toDto(restored)).toEqual(dto);
        expect(names(restored)).toEqual(names(original));
    });
});
