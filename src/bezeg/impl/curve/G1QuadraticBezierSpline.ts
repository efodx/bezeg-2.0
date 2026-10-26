import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {SplineScheme, spanEndpoints} from "./spline-scheme";
import {assertPlanarPoints} from "../point/planar-guard";

/**
 * Quadratic spline P0 P1 P2 | P2 N2 P3 | P3 N3 P4 | ...: the first span is the free points P0 P1 P2;
 * every later span starts at a free point and has a computed control point that continues the
 * previous span's last control leg, `start + b * (start - previousControl)`. The ratio b (1 by default)
 * is editable per join and keeps the tangent direction continuous (G1).
 */
const G1_QUADRATIC_SCHEME: SplineScheme = {
    listsComputedPoints: true,

    initialParameters: pointCount => new Array<number>(Math.max(0, pointCount - 3)).fill(1),

    build(context) {
        assertPlanarPoints(context.points, "G1QuadraticBezierSpline");
        const points = context.points;
        const curves: PolynomialBezierCurve[] = [];
        const computedPoints: Point[] = [];
        if (points.length >= 2) {
            curves.push(new PolynomialBezierCurve(points.slice(0, 3)));
            let previousControl = points[1];
            for (let i = 2; i < points.length - 1; i++) {
                const start = points[i];
                const previous = previousControl;
                const j = i - 2;
                const control = PointImpl.derived(() => {
                    const b = context.parameter(j);
                    return [start.X() + b * (start.X() - previous.X()), start.Y() + b * (start.Y() - previous.Y())];
                });
                computedPoints.push(control);
                curves.push(new PolynomialBezierCurve([start, control, points[i + 1]]));
                previousControl = control;
            }
        }
        return {curves, computedPoints};
    },

    knotSpans: (_points, curves) => spanEndpoints(curves),
};

export class G1QuadraticBezierSpline extends BezierSpline {
    constructor(points: Array<Point>) {
        super(points, G1_QUADRATIC_SCHEME);
    }
}
