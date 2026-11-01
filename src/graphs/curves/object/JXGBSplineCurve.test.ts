import JXG, {Board} from 'jsxgraph';
import {afterEach, describe, expect, it} from 'vitest';
import {JXGBSplineCurve} from './JXGBSplineCurve';
import {InvalidKnotVectorError} from '../../../bezeg/impl/curve/bspline-curve';

const POINTS = [[0, 0], [1, 2], [3, 2], [4, 0]];
const KNOTS = [0, 0, 0, 1, 2, 2, 2];

const boards: Board[] = [];
function makeBoard(): Board {
    const host = document.createElement('div');
    host.id = `bspline-${boards.length}`;
    document.body.appendChild(host);
    const board = JXG.JSXGraph.initBoard(host.id, {boundingbox: [-2, 6, 8, -2], renderer: 'no', showCopyright: false, showNavigation: false});
    boards.push(board);
    return board;
}

afterEach(() => {
    boards.splice(0).forEach(board => JXG.JSXGraph.freeBoard(board));
    document.body.innerHTML = '';
});

const drag = (curve: JXGBSplineCurve, index: number, x: number, y: number) => {
    const point = curve.getJxgPoints()[index];
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    // JSXGraph's typings omit the event dispatcher a real pointer drag goes through.
    (point as unknown as {triggerEventHandlers(events: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);
};

describe('JXGBSplineCurve', () => {
    it('installs the requested degree, knots and weights and samples over the raw domain', () => {
        const board = makeBoard();
        const curve = new JXGBSplineCurve(POINTS, 2, KNOTS, undefined, board);
        const model = curve.getCurve();
        expect([model.getDegree(), model.getKnots(), model.getDomain()]).toEqual([2, KNOTS, [0, 2]]);
        expect(curve.getJxgPoints()).toHaveLength(4);
        board.update();
        const jxgCurve = curve.getJxgCurve();
        expect([jxgCurve.minX(), jxgCurve.maxX()]).toEqual([0, 2]);
        expect([jxgCurve.X(0, true), jxgCurve.Y(0, true)]).toEqual([0, 0]);
        expect(jxgCurve.X(1.5, true)).toBeCloseTo(3, 12);
        expect(jxgCurve.Y(1.5, true)).toBeCloseTo(1.5, 12);
        expect(jxgCurve.X(2, true)).toBeCloseTo(4, 12);
    });

    it('dragging a control point moves the model point and redraws the curve', () => {
        const board = makeBoard();
        const curve = new JXGBSplineCurve(POINTS, 2, KNOTS, undefined, board);
        board.update();
        const before = curve.getCurve().eval(0.5);
        const tail = curve.getCurve().eval(1.5);
        drag(curve, 0, -1, 3);
        expect([curve.getCurve().getPoints()[0].X(), curve.getCurve().getPoints()[0].Y()]).toEqual([-1, 3]);
        expect(curve.getCurve().eval(0.5).X()).not.toBeCloseTo(before.X(), 6);
        expect(curve.getCurve().eval(1.5).X()).toBeCloseTo(tail.X(), 12);
        board.update();
        expect([curve.getJxgCurve().X(0, true), curve.getJxgCurve().Y(0, true)]).toEqual([-1, 3]);
    });

    it('moveFor translates the points and keeps the knots', () => {
        const curve = new JXGBSplineCurve(POINTS, 2, KNOTS, undefined, makeBoard());
        curve.getCurve().moveFor(1, 1);
        expect(curve.getCurve().getKnots()).toEqual(KNOTS);
        expect(curve.getJxgPoints()[0].X()).toBeCloseTo(1, 12);
        expect(curve.getJxgPoints()[0].Y()).toBeCloseTo(1, 12);
    });

    it('refuses an invalid description before it creates any board object', () => {
        const board = makeBoard();
        const baseline = board.objectsList.length;
        expect(() => new JXGBSplineCurve(POINTS, 2, [0, 0, 0, 2, 1, 2, 2], undefined, board)).toThrow(InvalidKnotVectorError);
        expect(board.objectsList).toHaveLength(baseline);
    });

    it('refuses adding or removing a point without touching the board or the model', () => {
        const board = makeBoard();
        const curve = new JXGBSplineCurve(POINTS, 2, KNOTS, undefined, board);
        const objects = board.objectsList.length;
        expect(() => curve.addPoint(5, 5)).toThrow(InvalidKnotVectorError);
        expect(() => curve.removePoint(0)).toThrow(InvalidKnotVectorError);
        expect(board.objectsList).toHaveLength(objects);
        expect(curve.getJxgPoints()).toHaveLength(4);
        expect(curve.getCurve().getPoints()).toHaveLength(4);
    });

    it('dispose leaves no board objects, with the polygon, hull and evaluation point shown', () => {
        const board = makeBoard();
        const baseline = board.objectsList.length;
        const curve = new JXGBSplineCurve(POINTS, 2, KNOTS, [1, 2, 1, 1], board);
        curve.showControlPolygon();
        curve.showConvexHull(true);
        curve.showEvaluationPoint(0.5);
        expect(board.objectsList.length).toBeGreaterThan(baseline + 5);
        curve.dispose();
        expect(board.objectsList).toHaveLength(baseline);
    });

    it('round-trips through its DTO, weights included', () => {
        const board = makeBoard();
        const curve = new JXGBSplineCurve(POINTS, 2, KNOTS, [1, 2, 1, 1], board);
        const dto = JXGBSplineCurve.toDto(curve);
        expect(dto).toMatchObject({points: POINTS, degree: 2, knots: KNOTS, weights: [1, 2, 1, 1]});
        const copy = JXGBSplineCurve.fromDto(dto, makeBoard());
        expect(JXGBSplineCurve.toDto(copy)).toEqual(dto);
    });
});
