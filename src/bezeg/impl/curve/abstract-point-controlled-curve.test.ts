import {describe, expect, test} from "vitest";
import {Point} from "../../api/point/point";
import {PointImpl} from "../point/point-impl";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {RationalBezierCurve} from "./rational-bezier-curve";
import {GenericBezierSpline} from "./GenericBezierSpline";
import {AbstractPointControlledCurve} from "./abstract-point-controlled-curve";

const xy = (points: Point[]) => points.map(p => [p.X(), p.Y()]);
const mean = (pairs: number[][]) => [pairs.reduce((s, p) => s + p[0], 0) / pairs.length, pairs.reduce((s, p) => s + p[1], 0) / pairs.length];
const bboxCentre = (pairs: number[][]) => {
    const xs = pairs.map(p => p[0]);
    const ys = pairs.map(p => p[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
};
const near = (actual: number[][], expected: number[][]) => {
    expect(actual).toHaveLength(expected.length);
    actual.forEach((p, i) => p.forEach((v, d) => expect(v).toBeCloseTo(expected[i][d], 10)));
};
const raw = [[-2, 1], [0, 4], [5, -2], [3, 1]];
const makePoints = () => raw.map(([x, y]) => new PointImpl(x, y));

type Factory = {name: string, make: () => AbstractPointControlledCurve & {eval(t: number): Point}, ts: number[]};
const factories: Factory[] = [
    {name: "polynomial Bezier", make: () => new PolynomialBezierCurve(makePoints()), ts: [0, 0.3, 0.7, 1]},
    {name: "rational Bezier", make: () => new RationalBezierCurve(makePoints(), [1, 2, 0.75, 1.5]), ts: [0, 0.3, 0.7, 1]},
    {
        name: "generic spline",
        make: () => new GenericBezierSpline([[0, 0], [1, 2], [3, 3], [4, 0], [5, -2], [7, 1], [8, 4]].map(([x, y]) => new PointImpl(x, y)), 3, 0),
        ts: [0, 0.4, 1.3, 2.5]
    },
];
const apply = (A: number[][], c: number[], p: number[], b = [0, 0]) =>
    [A[0][0] * (p[0] - c[0]) + A[0][1] * (p[1] - c[1]) + c[0] + b[0], A[1][0] * (p[0] - c[0]) + A[1][1] * (p[1] - c[1]) + c[1] + b[1]];

describe.each(factories)("point-controlled curve gestures: $name", ({make, ts}) => {
    test("moveFor translates every control point and the cached evaluation", () => {
        const curve = make();
        const before = xy(curve.getPoints());
        const evalBefore = ts.map(t => curve.eval(t));
        curve.moveFor(2.5, -1);
        near(xy(curve.getPoints()), before.map(p => [p[0] + 2.5, p[1] - 1]));
        ts.forEach((t, i) => {
            expect(curve.eval(t).X()).toBeCloseTo(evalBefore[i].X() + 2.5, 10);
            expect(curve.eval(t).Y()).toBeCloseTo(evalBefore[i].Y() - 1, 10);
        });
    });

    test("scale is about the bounding-box centre (not the centroid)", () => {
        const curve = make();
        const before = xy(curve.getPoints());
        const centre = bboxCentre(before);
        const evalBefore = ts.map(t => curve.eval(t));
        curve.scale(2, 0.5);
        near(xy(curve.getPoints()), before.map(p => apply([[2, 0], [0, 0.5]], centre, p)));
        expect(bboxCentre(xy(curve.getPoints()))[0]).toBeCloseTo(centre[0], 10);
        expect(bboxCentre(xy(curve.getPoints()))[1]).toBeCloseTo(centre[1], 10);
        ts.forEach((t, i) => {
            const expected = apply([[2, 0], [0, 0.5]], centre, [evalBefore[i].X(), evalBefore[i].Y()]);
            expect(curve.eval(t).X()).toBeCloseTo(expected[0], 10);
            expect(curve.eval(t).Y()).toBeCloseTo(expected[1], 10);
        });
    });

    test("uniform scale with one argument", () => {
        const curve = make();
        const before = xy(curve.getPoints());
        const centre = bboxCentre(before);
        curve.scale(3);
        near(xy(curve.getPoints()), before.map(p => apply([[3, 0], [0, 3]], centre, p)));
    });

    test("rotate turns about the centroid of the control points and preserves distances", () => {
        const curve = make();
        const before = xy(curve.getPoints());
        const centroid = mean(before);
        const theta = Math.PI / 3;
        const R = [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]];
        const evalBefore = ts.map(t => curve.eval(t));
        curve.rotate(theta);
        const after = xy(curve.getPoints());
        near(after, before.map(p => apply(R, centroid, p)));
        const centroidAfter = mean(after);
        expect(centroidAfter[0]).toBeCloseTo(centroid[0], 10);
        expect(centroidAfter[1]).toBeCloseTo(centroid[1], 10);
        before.forEach((p, i) => expect(Math.hypot(after[i][0] - centroid[0], after[i][1] - centroid[1]))
            .toBeCloseTo(Math.hypot(p[0] - centroid[0], p[1] - centroid[1]), 10));
        ts.forEach((t, i) => {
            const expected = apply(R, centroid, [evalBefore[i].X(), evalBefore[i].Y()]);
            expect(curve.eval(t).X()).toBeCloseTo(expected[0], 10);
            expect(curve.eval(t).Y()).toBeCloseTo(expected[1], 10);
        });
    });

    test("flip mirrors about the centroid per axis", () => {
        const curve = make();
        const before = xy(curve.getPoints());
        const centroid = mean(before);
        curve.flip(true, false);
        near(xy(curve.getPoints()), before.map(p => apply([[-1, 0], [0, 1]], centroid, p)));
        curve.flip(false, true);
        near(xy(curve.getPoints()), before.map(p => apply([[-1, 0], [0, -1]], centroid, p)));
    });
});

describe("gestures on special curves", () => {
    test("rational Bezier keeps its weights through every gesture", () => {
        const weights = [1, 2, 0.75, 1.5];
        const curve = new RationalBezierCurve(makePoints(), weights);
        curve.moveFor(1, 1);
        curve.scale(2);
        curve.rotate(0.4);
        curve.flip(true, true);
        expect(curve.getEffectiveWeights()).toEqual(weights);
    });

    test("3D polynomial curve keeps z through every gesture", () => {
        const zs = [3, -1, 2, 7];
        const points = raw.map(([x, y], i) => new PointImpl(x, y, undefined, zs[i]));
        const curve = new PolynomialBezierCurve(points);
        const zAt = curve.eval(0.4).Z?.();
        curve.moveFor(1, 2);
        curve.scale(2, 3);
        curve.rotate(0.9);
        curve.flip(true, false);
        expect(curve.getPoints().map(p => p.Z?.())).toEqual(zs);
        expect(curve.eval(0.4).Z?.()).toBeCloseTo(zAt as number, 12);
    });

    test("3D scale uses the XY bounding-box centre", () => {
        const points = raw.map(([x, y], i) => new PointImpl(x, y, undefined, i * 10));
        const curve = new PolynomialBezierCurve(points);
        const centre = bboxCentre(raw);
        curve.scale(2);
        near(xy(curve.getPoints()), raw.map(p => apply([[2, 0], [0, 2]], centre, p)));
    });
});
