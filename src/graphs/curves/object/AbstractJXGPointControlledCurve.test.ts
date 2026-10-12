import {Board} from 'jsxgraph';
import {evaluationPointLabel, refreshAfterControlPointDrag} from './AbstractJXGPointControlledCurve';
import {GraphSession, GraphSessionDependencies} from '../../base/GraphSession';

test('labels the fixed midpoint evaluation explicitly', () => {
    expect(evaluationPointLabel(0.5)).toBe('$$B(\\frac{1}{2})$$');
});

test('refreshes callback-based curve geometry after a control-point drag', async () => {
    const board = {fullUpdate: jest.fn(), inUpdate: true} as unknown as Board;
    refreshAfterControlPointDrag(board);

    expect(board.fullUpdate).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(board.fullUpdate).toHaveBeenCalledTimes(1);
});

test('does not run a deferred drag refresh after its graph session is disposed', async () => {
    const board = {fullUpdate: jest.fn(), inUpdate: true} as unknown as Board;
    const freeBoard = jest.fn();
    const dependencies = {
        initBoard: jest.fn(() => board),
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
