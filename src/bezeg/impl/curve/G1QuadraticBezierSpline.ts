import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";

/**
 * Quadratic spline P0 P1 P2 | P2 N2 P3 | P3 N3 P4 | ...: the first span is the free points P0 P1 P2;
 * every later span starts at a free point and has a computed control point that continues the
 * previous span's last control leg, `start + b * (start - previousControl)`. The ratio b (1 by default)
 * is editable per join and keeps the tangent direction continuous (G1).
 */
export class G1QuadraticBezierSpline extends BezierSpline {

    generateBezierCurves() {
        const points = this.points;
        this.b = [];
        const nonFreePoints: Point[] = [];
        const curves: PolynomialBezierCurve[] = [];
        if (points.length >= 2) {
            curves.push(new PolynomialBezierCurve(points.slice(0, 3)));
            let previousControl = points[1];
            for (let i = 2; i < points.length - 1; i++) {
                const start = points[i];
                const previous = previousControl;
                const j = this.b.length;
                this.b.push(1);
                const control = PointImpl.derived(() => [
                    start.X() + this.b[j] * (start.X() - previous.X()),
                    start.Y() + this.b[j] * (start.Y() - previous.Y())]);
                nonFreePoints.push(control);
                curves.push(new PolynomialBezierCurve([start, control, points[i + 1]]));
                previousControl = control;
            }
        }
        this.nonFreePoints = nonFreePoints;
        this.bezierCurves = curves;
        this.bindNonFreePoints();
    }

}
