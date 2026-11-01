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

/** A requested degree and/or continuity; a missing field keeps its current value. */
export interface GenericSplineChange {
    degree?: number;
    continuity?: number;
}

export interface IntegerRange {
    min: number;
    max: number;
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

    getContinuity() {
        return this.genericScheme.continuity;
    }

    getDegree() {
        return this.genericScheme.degree;
    }

    /**
     * The highest degree a change may raise the spline to: one below the number of free points, where the
     * spline is one Bezier piece of exactly that degree. The first span takes `degree + 1` free points, so
     * a higher degree draws the same degree `n - 1` piece under a degree it does not have. A spline
     * that already sits above this (a stored Preset, or points removed afterwards) may still lower its
     * degree, and `degreeRange().max` then reports the current degree.
     */
    getMaxDegree() {
        return Math.max(1, this.points.length - 1);
    }

    /** The continuity orders reachable at the current degree. */
    continuityRange(): IntegerRange {
        return {min: 0, max: this.getDegree() - 1};
    }

    /** The degrees reachable at the current continuity. */
    degreeRange(): IntegerRange {
        return {min: this.getContinuity() + 1, max: Math.max(this.getMaxDegree(), this.getDegree())};
    }

    /**
     * Moves to a completed degree/continuity target. The target is validated as a whole, so a step that
     * is only invalid on the way (raising continuity before degree) needs no intermediate state, and the
     * spans and computed points are regenerated once. Nothing changes when the target is rejected.
     *
     * @returns whether the structure changed; false means the target equals the current state and nothing was regenerated.
     * @throws RangeError for a target that is not a whole `0 <= continuity < degree <= degreeRange().max`.
     */
    change(target: GenericSplineChange): boolean {
        const degree = target.degree ?? this.getDegree();
        const continuity = target.continuity ?? this.getContinuity();
        const limit = Math.max(this.getMaxDegree(), this.getDegree());
        if (!Number.isInteger(degree) || !Number.isInteger(continuity) || continuity < 0 || continuity >= degree || degree > limit) {
            throw new RangeError(this.rejection(target, limit));
        }
        return this.apply(degree, continuity);
    }

    /**
     * Applies the degree and continuity a stored Preset or file records. This accepts every pair the
     * Preset validation accepts, including a degree above `getMaxDegree()` that stored data may hold.
     */
    restore(degree: number, continuity: number): boolean {
        if (!Number.isInteger(degree) || !Number.isInteger(continuity) || continuity < 0 || continuity >= degree) {
            throw new RangeError(`Continuity (${continuity}) must be a whole number smaller than the degree (${degree}).`);
        }
        return this.apply(degree, continuity);
    }

    private apply(degree: number, continuity: number): boolean {
        if (degree === this.getDegree() && continuity === this.getContinuity()) {
            return false;
        }
        const previous = {degree: this.getDegree(), continuity: this.getContinuity()};
        this.genericScheme.degree = degree;
        this.genericScheme.continuity = continuity;
        try {
            this.generateBezierCurves();
        } catch (error) {
            // generateBezierCurves assigns the spans only after the scheme built them, so a throw keeps the old
            // spans and only the recorded target needs undoing; the version was not touched yet, so cached
            // values stay valid. It also resets the editable parameters `b` before building; this scheme has
            // none (`b` is always empty), so nothing user-edited is lost here.
            this.genericScheme.degree = previous.degree;
            this.genericScheme.continuity = previous.continuity;
            throw error;
        }
        this.touch();
        return true;
    }

    private rejection(target: GenericSplineChange, limit: number): string {
        if (target.degree === undefined) {
            return `The continuity order must be a whole number from 0 to ${this.getDegree() - 1} at degree ${this.getDegree()}.`;
        }
        if (target.continuity === undefined) {
            return `The degree must be a whole number from ${this.getContinuity() + 1} to ${limit} at continuity ${this.getContinuity()}.`;
        }
        return `The degree ${target.degree} and continuity ${target.continuity} do not fit: the degree is a whole number up to ${limit} and the continuity order a whole number from 0 to the degree minus 1.`;
    }
}
