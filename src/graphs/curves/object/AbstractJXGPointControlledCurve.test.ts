import JXG, {Board} from 'jsxgraph';
import {AbstractJXGPointControlledCurve, evaluationPointLabel, PointControlledCurveAttributes, refreshAfterControlPointDrag} from './AbstractJXGPointControlledCurve';
import {PolynomialBezierCurve} from '../../../bezeg/impl/curve/polynomial-bezier-curve';
import {PointImpl} from '../../../bezeg/impl/point/point-impl';
import {GraphSession, GraphSessionDependencies} from '../../base/GraphSession';

test('labels the fixed midpoint evaluation explicitly', () => {
    expect(evaluationPointLabel(0.5)).toBe('$$B(\\frac{1}{2})$$');
});

test('refreshes callback-based curve geometry after a control-point drag', async () => {
    const board = {fullUpdate: vi.fn(), inUpdate: true} as unknown as Board;
    refreshAfterControlPointDrag(board);

    expect(board.fullUpdate).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(board.fullUpdate).toHaveBeenCalledTimes(1);
});

test('does not run a deferred drag refresh after its graph session is disposed', async () => {
    const board = {fullUpdate: vi.fn(), inUpdate: true, containerObj: document.createElement('div')} as unknown as Board;
    const freeBoard = vi.fn();
    const dependencies = {
        initBoard: vi.fn(() => board),
        freeBoard,
    } as GraphSessionDependencies;
    const session = new GraphSession(dependencies);
    session.createBoard('jgbox', {} as any);

    refreshAfterControlPointDrag(board);
    session.dispose();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(board.fullUpdate).not.toHaveBeenCalled();
    expect(freeBoard).toHaveBeenCalledTimes(1);
});

test('rotating with a pointer vertically aligned with the pivot keeps control points finite and at their pivot distances', () => {
    const points = [new PointImpl(0, 0), new PointImpl(2, 3), new PointImpl(4, 0)];
    const centre = [2, 1];
    const distances = points.map(p => Math.hypot(p.X() - centre[0], p.Y() - centre[1]));
    const curve = new PolynomialBezierCurve(points);
    const fake = {
        pointControlledCurve: curve,
        rotationCenter: centre,
        coords: {usrCoords: [1, 2, 4]},
    };
    AbstractJXGPointControlledCurve.prototype.rotate.call(fake, {usrCoords: [1, 5, 1]} as never);
    points.forEach((p, i) => {
        expect(Number.isFinite(p.X()) && Number.isFinite(p.Y())).toBe(true);
        expect(Math.hypot(p.X() - centre[0], p.Y() - centre[1])).toBeCloseTo(distances[i], 9);
    });
    // Pointer goes from straight above the pivot to its right: a -90 degree (clockwise) step.
    expect(points[0].X()).toBeCloseTo(1, 9);
    expect(points[0].Y()).toBeCloseTo(3, 9);
});

test('a resize step that would collapse the box to zero width leaves the curve unchanged', () => {
    const points = [new PointImpl(0, 0), new PointImpl(2, 3), new PointImpl(4, 0)];
    const curve = new PolynomialBezierCurve(points);
    const fake = {
        pointControlledCurve: curve,
        coords: {usrCoords: [1, 4, 0]},
        getResizingDir: () => [1, -1],
    };
    // Right handle dragged 2 units left: factor (4 - 2*2) / 4 = 0, refused.
    AbstractJXGPointControlledCurve.prototype.resize.call(fake, {usrCoords: [1, 2, 0]} as never);
    expect(points.map(p => [p.X(), p.Y()])).toEqual([[0, 0], [2, 3], [4, 0]]);

    // Right handle dragged 1 unit right: factor (4 + 2) / 4 = 1.5 about the box centre x = 2.
    AbstractJXGPointControlledCurve.prototype.resize.call(fake, {usrCoords: [1, 5, 0]} as never);
    expect(points[0].X()).toBeCloseTo(-1, 9);
    expect(points[2].X()).toBeCloseTo(5, 9);
    expect(points[1].Y()).toBeCloseTo(3, 9);
});

test('a construction that throws after creating control points leaves no objects on the board', () => {
    const host = document.createElement('div');
    host.id = 'construct-leak';
    document.body.appendChild(host);
    const board = JXG.JSXGraph.initBoard(host.id, {boundingbox: [-2, 6, 8, -2], renderer: 'no', showCopyright: false, showNavigation: false});
    class ThrowingCurve extends AbstractJXGPointControlledCurve<PolynomialBezierCurve, PointControlledCurveAttributes> {
        protected getInitialCurve(points: number[][]): PolynomialBezierCurve {
            points.forEach(([x, y]) => this.createEditableInputPoint(x, y));
            throw new Error('construction failed');
        }
    }
    const before = board.objectsList.length;

    expect(() => new ThrowingCurve([[0, 0], [1, 2], [3, 0]], board)).toThrow('construction failed');

    expect(board.objectsList.length).toBe(before);
    JXG.JSXGraph.freeBoard(board);
    document.body.innerHTML = '';
});
