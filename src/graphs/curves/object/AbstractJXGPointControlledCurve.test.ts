import {Board} from 'jsxgraph';
import {geometryCache} from '../../../bezeg/cache/GeometryCache';
import {evaluationPointLabel, refreshAfterControlPointDrag} from './AbstractJXGPointControlledCurve';

test('labels the fixed midpoint evaluation explicitly', () => {
    expect(evaluationPointLabel(0.5)).toBe('$$B(\\frac{1}{2})$$');
});

test('refreshes callback-based curve geometry after a control-point drag', async () => {
    const board = {fullUpdate: jest.fn(), inUpdate: true} as unknown as Board;
    const revisionBefore = geometryCache.revision;

    refreshAfterControlPointDrag(board);

    expect(geometryCache.revision).toBe(revisionBefore + 1);
    expect(board.fullUpdate).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(board.fullUpdate).toHaveBeenCalledTimes(1);
});
