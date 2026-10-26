import {BezierSpline} from "./bezier-spline";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {SplineBuildContext, SplineScheme, spanEndpoints} from "./spline-scheme";
import {assertPlanarPoints} from "../point/planar-guard";

/**
 * Degree-n spline of continuity c: every span after the first starts at a free point, continues with
 * `c` computed points obtained by extrapolating the previous span (de Casteljau at the next knot
 * ratio), and takes the next `n - c` free points.
 */
class GenericSplineScheme implements SplineScheme {
    readonly listsComputedPoints = true;

    constructor(public degree: number, public continuity: number) {
    }

    build(context: SplineBuildContext) {
        assertPlanarPoints(context.points, "GenericBezierSpline");
        const degree = this.degree;
        const continuity = this.continuity;
        const step = degree - continuity;
        if (!(step >= 1)) {
            throw new RangeError(`Continuity (${continuity}) must be smaller than degree (${degree}).`);
        }
        const points = context.points;
        const curves: PolynomialBezierCurve[] = [new PolynomialBezierCurve(points.slice(0, degree + 1))];
        const computedPoints: Point[] = [];

        for (let i = degree; i < points.length - 1; i = i + step) {
            const spanPoints = [points[i]];
            const previousCurve = curves[curves.length - 1];
            const l = curves.length;
            for (let j = 1; j <= continuity; j++) {
                const extrapolated = PointImpl.derived(() => {
                    const u = context.knots();
                    const deltaU1 = u[l] - u[l - 1];
                    const deltaU2 = u[l + 1] - u[l];

                    const nextT = (deltaU2 + deltaU1) / deltaU1;
                    const point = previousCurve.decasteljauScheme(nextT)[degree][degree - j];
                    return [point.X(), point.Y()];
                });
                computedPoints.push(extrapolated);
                spanPoints.push(extrapolated);
            }
            spanPoints.push(...points.slice(i + 1, i + step + 1));
            curves.push(new PolynomialBezierCurve(spanPoints));
        }
        return {curves, computedPoints};
    }

    knotSpans(_points: ReadonlyArray<Point>, curves: ReadonlyArray<PolynomialBezierCurve>) {
        return spanEndpoints(curves);
    }
}

export class GenericBezierSpline extends BezierSpline {
    private readonly genericScheme: GenericSplineScheme;

    /**
     * @constructor
     * @param {Array.<Point>} points - Curve's control points
     * @param degree
     * @param continuity
     */
    constructor(points: Array<Point>, degree: number, continuity: number) {
        const scheme = new GenericSplineScheme(degree, continuity);
        super(points, scheme);
        this.genericScheme = scheme;
    }

    /**
     * Setters only record the parameters. Callers must call `generateBezierCurves()` once both
     * degree and continuity are final (an intermediate state can have degree === continuity).
     */
    setContinuity(continuity: number) {
        this.genericScheme.continuity = continuity;
        this.touch();
    }

    getContinuity() {
        return this.genericScheme.continuity;
    }

    setDegree(degree: number) {
        this.genericScheme.degree = degree;
        this.touch();
    }

    getDegree() {
        return this.genericScheme.degree;
    }
}
