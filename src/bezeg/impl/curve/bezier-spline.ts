import {Point} from "../../api/point/point";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {AbstractPointControlledCurve} from "./abstract-point-controlled-curve";
import {boundingBoxOf, chordKnots} from "./geometry";
import {PointImpl} from "../point/point-impl";

abstract class BezierSpline extends AbstractPointControlledCurve {
    protected bezierCurves: PolynomialBezierCurve[] = [];
    protected nonFreePoints: Array<Point> = [];
    protected b: number[] = [];
    protected alpha: number = 0;

    /**
     * @constructor
     * @param {Array.<Point>} points - Curve's control points
     */
    constructor(points: Array<Point>) {
        super(points);
        this.generateBezierCurves();
    }

    setAlpha(alpha: number) {
        this.alpha = alpha;
        this.touch();
    }

    getAlpha() {
        return this.alpha;
    }

    abstract generateBezierCurves(): void;

    /**
     * Declares the spline as the dependency of its computed (non-free) points: they are
     * functions of the free points, alpha, b and the structure, all covered by version().
     * Call at the end of every generateBezierCurves().
     */
    protected bindNonFreePoints() {
        this.nonFreePoints.forEach(point => {
            if (point instanceof PointImpl) {
                point.dependOn([this]);
            }
        });
    }

    eval(t: number): Point {
        let n = this.bezierCurves.length;
        let u = this.getU();
        for (let i = 0; i < n; i++) {
            if (t < u[i + 1]) {
                t = t - u[i];
                t = t / (u[i + 1] - u[i]);
                return this.bezierCurves[i].eval(t);
            }
        }
        return this.bezierCurves[this.bezierCurves.length - 1].eval(1);
    }


    setB(j: number, b: number) {
        this.b[j] = b;
        this.touch();
    }

    getB(j: number) {
        return this.b[j];
    }

    getBs() {
        return this.b;
    }

    getNumOfBs() {
        return this.b.length;
    }

    getNonFreePoints() {
        return this.nonFreePoints;
    }

    override getPoints(): Point[] {
        return this.getAllCurvePoints();
    }

    getAllCurvePoints(): Point[] {
        const points: Point[] = [];
        points.push(...this.bezierCurves[0].getPoints());
        this.bezierCurves.slice(1).forEach(curve => {
            points.push(...curve.getPoints().slice(1));
        });
        return points;
    }

    override addPoint(point: Point) {
        super.addPoint(point);
        this.generateBezierCurves();
    }

    override removePoint(point: Point) {
        super.removePoint(point);
        this.generateBezierCurves();
    }

    override getBoundingBox() {
        // we include non-free points for this so the curve is always inside the bounding box, might change it to actual curve min and max
        return boundingBoxOf(this.points.concat(this.getNonFreePoints()));
    }

    getUnderlyingCurves() {
        return this.bezierCurves;
    }

    protected getU() {
        return chordKnots(this.bezierCurves.map(curve => {
            const points = curve.getPoints();
            return [points[0], points[points.length - 1]] as const;
        }), this.alpha);
    }

}


export {BezierSpline};
