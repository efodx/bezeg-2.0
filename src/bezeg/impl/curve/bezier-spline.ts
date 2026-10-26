import {Point} from "../../api/point/point";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {AbstractPointControlledCurve} from "./abstract-point-controlled-curve";
import {boundingBoxOf, chordKnots} from "./geometry";
import {PointImpl} from "../point/point-impl";
import {VOLATILE} from "../versioning";
import {SplineScheme} from "./spline-scheme";
import {assertPlanarPoints} from "../point/planar-guard";

/**
 * A piecewise Bezier curve whose spans, computed control points and knots come from a
 * `SplineScheme`. The concrete spline classes (C1, C2, G1, ...) are this class with one scheme.
 */
class BezierSpline extends AbstractPointControlledCurve {
    protected bezierCurves: PolynomialBezierCurve[] = [];
    protected nonFreePoints: Array<Point> = [];
    protected b: number[] = [];
    protected alpha: number = 0;
    private knots: number[] = [];
    private knotsVersion = VOLATILE;

    /**
     * @constructor
     * @param {Array.<Point>} points - Curve's free control points
     * @param scheme - how the spans, computed points and knots are derived from them
     */
    constructor(points: Array<Point>, protected readonly scheme: SplineScheme) {
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

    /** Rebuilds the spans and computed points (and resets the editable parameters) from the free points. */
    generateBezierCurves(): void {
        assertPlanarPoints(this.points, "BezierSpline");
        this.b = this.scheme.initialParameters?.(this.points.length) ?? [];
        const {curves, computedPoints} = this.scheme.build({
            points: this.points,
            knots: () => this.getU(),
            parameter: j => this.b[j],
        });
        this.bezierCurves = curves;
        this.nonFreePoints = computedPoints;
        this.bindNonFreePoints();
    }

    override version(): number {
        assertPlanarPoints(this.points, "BezierSpline");
        return super.version();
    }

    /**
     * Declares the spline as the dependency of its computed (non-free) points: they are
     * functions of the free points, alpha, b and the structure, all covered by version().
     */
    private bindNonFreePoints() {
        this.nonFreePoints.forEach(point => {
            if (point instanceof PointImpl) {
                point.dependOn([this]);
            }
        });
    }

    eval(t: number): Point {
        const n = this.bezierCurves.length;
        const u = this.getU();
        // First span whose end knot lies beyond t (binary search; u is non-decreasing).
        let low = 0;
        let high = n;
        while (low < high) {
            const middle = (low + high) >> 1;
            if (t < u[middle + 1]) {
                high = middle;
            } else {
                low = middle + 1;
            }
        }
        if (low === n) {
            return this.bezierCurves[n - 1].eval(1);
        }
        return this.bezierCurves[low].eval((t - u[low]) / (u[low + 1] - u[low]));
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
        return this.scheme.listsComputedPoints ? this.getAllCurvePoints() : this.points;
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

    /**
     * Knot vector of the spans. Cached against this spline's version, so the many computed
     * points that read it share one computation; never cached while a control point is volatile.
     */
    protected getU(): number[] {
        const version = this.version();
        if (version !== VOLATILE && version === this.knotsVersion) {
            return this.knots;
        }
        const knots = chordKnots(this.scheme.knotSpans(this.points, this.bezierCurves), this.alpha);
        if (version !== VOLATILE) {
            this.knots = knots;
            this.knotsVersion = version;
        }
        return knots;
    }

}


export {BezierSpline};
