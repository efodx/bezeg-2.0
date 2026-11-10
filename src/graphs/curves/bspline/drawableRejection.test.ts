import {drawableRejection} from './bsplineDeBoorModel';
import {renderMessage} from '../../../localization';
import type {BSplinePresetData} from './bsplinePresetCollection';

/** A clamped degree-1 curve with `count` control points: knots 0, 0, 1, …, count − 1, count − 1. */
function degreeOne(count: number): BSplinePresetData {
    const points = Array.from({length: count}, (_, i) => [i, i % 2] as const);
    const inner = Array.from({length: count - 2}, (_, i) => i + 1);
    return {degree: 1, points, knots: [0, 0, ...inner, count - 1, count - 1]};
}

test('a curve over the graph limit is refused with the limit, not with the minimum count', () => {
    const rejection = drawableRejection(degreeOne(17), 16);
    expect(rejection?.key).toBe('bspline_too_many_points');
    expect(rejection && renderMessage(rejection)).toBe('ta prikaz sprejme B-zlepek z največ 16 kontrolnimi točkami, prednastavitev jih ima 17');
});

test('a curve at the limit and a curve under the minimum keep their decisions', () => {
    expect(drawableRejection(degreeOne(16), 16)).toBeUndefined();
    expect(drawableRejection({degree: 3, points: [[0, 0], [1, 1], [2, 0]], knots: [0, 0, 0, 0, 1, 1, 1]}, 16)?.key).toBe('bspline_too_few_points');
});
