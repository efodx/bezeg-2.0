import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";

export class GenericBezierSpline extends BezierSpline {
    protected degree: number;
    protected continuity: number;

    /**
     * @constructor
     * @param {Array.<Point>} points - Curve's control points
     * @param degree
     * @param continuity
     */
    constructor(points: Array<Point>, degree: number, continuity: number) {
        super(points, false);
        this.degree = degree;
        this.continuity = continuity;
        this.generateBezierCurves();
    }

    generateBezierCurves() {
        const degree = this.degree;
        const continuity = this.continuity;
        const step = degree - continuity;
        if (!(step >= 1)) {
            throw new RangeError(`Continuity (${continuity}) must be smaller than degree (${degree}).`);
        }
        this.bezierCurves = [];
        this.nonFreePoints = [];
        this.bezierCurves.push(new PolynomialBezierCurve(this.points.slice(0, degree + 1)));

        for (let i = degree; i < this.points.length - 1; i = i + step) {
            const bezierCurvePoints = [this.points[i]];

            const previousBezierCurve = this.bezierCurves[this.bezierCurves.length - 1];
            const l = this.bezierCurves.length;
            const nonFreePoints = [];
            for (let j = 1; j <= continuity; j++) {
                const nonFreePoint = PointImpl.derived(() => {
                    const u = this.getU();
                    const deltaU1 = u[l] - u[l - 1];
                    const deltaU2 = u[l + 1] - u[l];

                    const nextT = (deltaU2 + deltaU1) / deltaU1;
                    const decasteljau = previousBezierCurve.decasteljauScheme(nextT);
                    const point = decasteljau[degree][degree - j];
                    return [point.X(), point.Y()];
                });
                nonFreePoints.push(nonFreePoint);
                bezierCurvePoints.push(nonFreePoint);
            }

            bezierCurvePoints.push(...this.points.slice(i + 1, i + step + 1));
            this.nonFreePoints.push(...nonFreePoints);
            this.bezierCurves.push(new PolynomialBezierCurve(bezierCurvePoints));
        }
        this.bindNonFreePoints();
    }

    /**
     * Setters only record the parameters. Callers must call `generateBezierCurves()` once both
     * degree and continuity are final (an intermediate state can have degree === continuity).
     */
    setContinuity(continuity: number) {
        this.continuity = continuity;
        this.touch();
    }

    getContinuity() {
        return this.continuity;
    }

    setDegree(degree: number) {
        this.degree = degree;
        this.touch();
    }

    getDegree() {
        return this.degree;
    }
}
