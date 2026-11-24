import {expect, test} from 'vitest';
import {marksToPoints} from './viewMarks';

test('marksToPoints maps points, boxes and polylines, and tolerates a polyline without points', () => {
    const {must, nice} = marksToPoints({
        must: [{kind: 'point', x: 1, y: 2}, {kind: 'polyline', points: []}],
        nice: [{kind: 'box', left: 0, top: 3, right: 4, bottom: 1}, {kind: 'polyline', points: [[5, 6], [7, 8]]}],
    });
    expect(must).toEqual([[1, 2]]);
    expect(nice).toEqual([[0, 3], [4, 3], [4, 1], [0, 1], [5, 6], [7, 8]]);
    expect(marksToPoints({must: [{kind: 'polyline', points: []}]})).toEqual({must: [], nice: []});
});
