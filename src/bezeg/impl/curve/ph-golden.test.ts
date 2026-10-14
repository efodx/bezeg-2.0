import {describe, expect, it} from "vitest";
import {PointImpl} from "../point/point-impl";
import {PhBezierCurve} from "./ph-bezier-curve";

const round = (n: number) => Math.round(n * 1e9) / 1e9;
const xy = (p: {X(): number, Y(): number}) => [round(p.X()), round(p.Y())];

const presets: Array<[string, number[], number[][]]> = [
    ['cubic', [-4.2, -2], [[-3.5, -1.7], [-2.6, 1.7]]],
    ['quintic', [1, -1], [[-3.3, 0], [0.2, -4], [2, -3.2]]],
    ['septic', [0, 0.5], [[1, 0.3], [-0.4, 1.1], [0.8, -0.9], [0.2, 0.6]]],
];

/** Golden values produced by the original implementation; the maths must stay bit-for-bit meaningful. */
describe.each(presets)("PH curve golden values (%s)", (_name, start, w) => {
    const build = () => {
        const curve = new PhBezierCurve([new PointImpl(start[0], start[1])], w.map(([x, y]) => new PointImpl(x, y)));
        curve.setOffsetCurveNumber(2);
        return curve;
    };

    it("control points, curve, sigma and arc length", () => {
        const curve = build();
        expect({
            controlPoints: curve.getPoints().map(xy),
            curve: [0, 0.25, 0.6, 1].map(t => xy(curve.eval(t))),
            sigma: [0, 0.5, 1].map(t => round(curve.sigma(t))),
            s: [0.3, 1].map(t => round(curve.s(t))),
            tk: round(curve.tk(0.2, 0.1, 2)),
        }).toMatchSnapshot();
    });

    it("offset curves", () => {
        const curve = build();
        expect(curve.getOffsetCurves().map(offset => ({
            points: offset.getPoints().map(xy),
            curve: [0, 0.4, 1].map(t => xy(offset.eval(t))),
        }))).toMatchSnapshot();
    });

    it("after moving a hodograph point and changing the offset distance", () => {
        const hodographs = w.map(([x, y]) => new PointImpl(x, y));
        const curve = new PhBezierCurve([new PointImpl(start[0], start[1])], hodographs);
        curve.setOffsetCurveNumber(2);
        hodographs[1].setCoordinates(hodographs[1].X() + 0.7, hodographs[1].Y() - 0.2);
        curve.setOffsetCurveDistance(0.35);
        expect({
            curve: [0.1, 0.9].map(t => xy(curve.eval(t))),
            s: round(curve.arcLength()),
            offset: curve.getOffsetCurves().map(offset => [0.2, 0.8].map(t => xy(offset.eval(t)))),
        }).toMatchSnapshot();
    });
});
