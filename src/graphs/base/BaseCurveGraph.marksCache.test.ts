import {expect, test} from 'vitest';
import BaseCurveGraph from './BaseCurveGraph';

/** A rational curve's weights move its samples while its points stay: the memoized marks must follow them. */
test('curveViewMarks recomputes when only a weight changes, and returns the same object when nothing changes', () => {
    const pts = [[0, 0], [1, 2], [2, 0]].map(([x, y]) => ({X: () => x, Y: () => y}));
    let w = 1;
    const model = {
        getPoints: () => pts,
        getWeights: () => [1, w, 1],
        eval: (t: number) => ({X: () => 2 * t, Y: () => 2 * t * (1 - t) * 2 * w / (1 + (w - 1) * 2 * t * (1 - t))}),
    };
    const self = {jxgCurves: [{getCurve: () => model}], curveMarksCache: undefined};
    const marks = () => (BaseCurveGraph.prototype as unknown as {curveViewMarks(this: unknown): {nice: {points: number[][]}[]}}).curveViewMarks.call(self);
    const first = marks();
    expect(marks()).toBe(first);
    w = 3;
    const second = marks();
    expect(second).not.toBe(first);
    expect(second.nice[0].points[12]).not.toEqual(first.nice[0].points[12]);
});
