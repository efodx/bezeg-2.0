import {Board} from 'jsxgraph';
import {AbstractJXGPointControlledCurve, evaluationPointLabel, refreshAfterControlPointDrag} from './AbstractJXGPointControlledCurve';
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
});
