import {describe, expect, test} from 'vitest';
import BaseCurveGraph from './BaseCurveGraph';
import {BSplineCurve} from '../../bezeg/impl/curve/bspline-curve';
import {C1QuadraticBezierSpline} from '../../bezeg/impl/curve/C1QuadraticBezierSpline';
import {PointImpl} from '../../bezeg/impl/point/point-impl';

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

type Marks = {nice: {points: number[][]}[]};
const pointsAt = (coords: number[][]) => coords.map(([x, y]) => new PointImpl(x, y));
/** The base's `curveViewMarks` read for one curve, with a cache that persists between reads of the returned function. */
const marksReader = (curve: object) => {
    const self = {jxgCurves: [{getCurve: () => curve}], curveMarksCache: undefined as unknown};
    return () => (BaseCurveGraph.prototype as unknown as {curveViewMarks(this: unknown): Marks}).curveViewMarks.call(self);
};

describe('curveViewMarks samples each curve over its own domain', () => {
    test('a B-spline is sampled over its raw knot domain, ending on its last point', () => {
        const spline = new BSplineCurve(pointsAt([[0, 0], [1, 2], [3, 2], [4, 0]]), 2, [0, 0, 0, 1, 2, 2, 2]);
        const polyline = marksReader(spline)().nice[0].points;
        expect(polyline).toHaveLength(25);
        expect(polyline[24]).toEqual([4, 0]);
    });

    test('a Bezier spline follows alpha, which moves its samples while its points stay', () => {
        const spline = new C1QuadraticBezierSpline(pointsAt([[0, 0], [1, 3], [3, 4], [5, 1], [8, 2], [9, 6]]));
        const read = marksReader(spline);
        const before = read();
        expect(read()).toBe(before);
        spline.setAlpha(1);
        const after = read();
        expect(after).not.toBe(before);
        expect(after.nice[0].points).not.toEqual(before.nice[0].points);
    });

    test('knots move the samples without moving the points, so they are part of the memo key', () => {
        const spline = new BSplineCurve(pointsAt([[0, 0], [1, 2], [3, 2], [4, 0], [5, 3]]), 2, [0, 0, 0, 1, 2, 3, 3, 3]);
        const read = marksReader(spline);
        const before = read();
        expect(read()).toBe(before);
        spline.setKnots([0, 0, 0, 1, 1.5, 3, 3, 3]);
        const after = read();
        expect(after).not.toBe(before);
        expect(after.nice[0].points).not.toEqual(before.nice[0].points);
    });

    test('a sample the curve refuses is left out; fewer than two samples draw no polyline', () => {
        const pts = pointsAt([[0, 0], [1, 1]]);
        const refusing = (refuse: (t: number) => boolean) => ({
            getPoints: () => pts, eval: (t: number) => { if (refuse(t)) throw new RangeError('outside'); return {X: () => t, Y: () => t}; },
        });
        expect(marksReader(refusing(t => t > 0.5))().nice[0].points.length).toBeGreaterThan(1);
        expect(marksReader(refusing(t => t > 0))().nice).toEqual([]);
    });
});
