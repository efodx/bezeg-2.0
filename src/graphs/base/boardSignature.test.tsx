import 'jsxgraph';
import {boardSignature} from './realGraphTestHarness';

type FakeCurve = {elType: string; visPropCalc: {visible: boolean}; points: Array<{usrCoords: number[]}>; numberPoints?: number};
const curve = (xs: number[], numberPoints?: number): FakeCurve => ({
    elType: 'curve', visPropCalc: {visible: true}, numberPoints,
    points: xs.map(x => ({usrCoords: [1, x, 0]})),
});
const signatureOf = (...objects: FakeCurve[]) => boardSignature({objectsList: objects} as unknown as JXG.Board);

describe('boardSignature curves', () => {
    test('points JSXGraph keeps past numberPoints after a data array shrinks are not part of the drawing', () => {
        expect(signatureOf(curve([0, 1, 2, 3, 4], 3))).toEqual(signatureOf(curve([0, 1, 2])));
    });

    test('a curve with nothing to draw equals a missing one', () => {
        expect(signatureOf(curve([0, 1], 0), curve([]))).toEqual([]);
    });

    test('a differing drawn tail is still reported', () => {
        expect(signatureOf(curve([0, 1, 2], 3))).not.toEqual(signatureOf(curve([0, 1, 3])));
    });
});
