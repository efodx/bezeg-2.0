import {Point} from "../../api/point/point";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";

/** What a scheme may read while it builds its spans. Everything is read lazily, at evaluation time. */
export interface SplineBuildContext {
    readonly points: ReadonlyArray<Point>;
    /** Knot vector of the spans: cached per spline version, so computed points share one computation. */
    knots(): number[];
    /** Current value of the editable per-join parameter `j` (the spline's `b`). */
    parameter(j: number): number;
}

export interface SplineBuild {
    /** The Bezier spans in parameter order. Consecutive spans share their join point. */
    curves: PolynomialBezierCurve[];
    /** The control points the scheme computed (as opposed to the free points the user places). */
    computedPoints: Point[];
}

/**
 * What distinguishes one kind of Bezier spline from another: where its computed control points
 * lie, which spans define its knots, and which parameters the user can edit. `BezierSpline`
 * supplies everything else (evaluation, caching, transforms, bounding box).
 */
export interface SplineScheme {
    /** Whether `getPoints()` lists the computed points too, or only the free points. */
    readonly listsComputedPoints: boolean;

    /** Initial values of the editable per-join parameters; reset on every (re)generation. */
    initialParameters?(pointCount: number): number[];

    /** Builds the spans from the free points. May call `context.knots()` and `parameter()` only lazily. */
    build(context: SplineBuildContext): SplineBuild;

    /**
     * The (start, end) pairs whose lengths ** alpha define the knot intervals, one per span.
     * `curves` are the spans produced by `build`.
     */
    knotSpans(points: ReadonlyArray<Point>, curves: ReadonlyArray<PolynomialBezierCurve>): ReadonlyArray<readonly [Point, Point]>;
}

/** Knot spans taken from the ends of each Bezier span. */
export function spanEndpoints(curves: ReadonlyArray<PolynomialBezierCurve>): Array<readonly [Point, Point]> {
    return curves.map(curve => {
        const points = curve.getPoints();
        return [points[0], points[points.length - 1]] as const;
    });
}
