import {Point} from "../../api/point/point";
import {PointImpl} from "../point/point-impl";
import {AbstractPointControlledCurve} from "./abstract-point-controlled-curve";
import {VOLATILE} from "../versioning";
import {
    basisAll,
    deBoorTriangle,
    DeBoorTriangle,
    derivativeSource,
    domain,
    evaluate,
    evaluateRational,
    findSpan,
    KnotVectorError,
    liftToHomogeneous,
    normalizeKnotsForDisplay,
    validateKnotVector,
    validateWeights,
    WeightError,
} from "./bspline";

/** A knot vector the kernel refuses; `reason` is the code the UI localizes. */
export class InvalidKnotVectorError extends Error {
    constructor(readonly reason: KnotVectorError) {
        super(`Invalid knot vector: ${reason}`);
        this.name = "InvalidKnotVectorError";
    }
}

/** Weights the kernel refuses; `reason` is the code the UI localizes, `index` the first offender when there is one. */
export class InvalidBSplineWeightsError extends Error {
    constructor(readonly reason: WeightError, readonly index?: number) {
        super(`Invalid weights: ${reason}${index === undefined ? "" : ` at index ${index}`}`);
        this.name = "InvalidBSplineWeightsError";
    }
}

/**
 * A B-spline (or NURBS, with weights) of degree k with n + 1 control points and a raw knot vector of n + k + 2 knots.
 * Parameters are raw knot values; the valid domain is [u_k, u_{n+1}]. All mathematics is the pure kernel in `./bspline`.
 * Affine gestures (move, scale, rotate, flip) move the control points and keep the knots and weights. The control point
 * count and the knot vector change together, through {@link setSpline}.
 */
export class BSplineCurve extends AbstractPointControlledCurve {
    private degree: number;
    private knots: number[];
    private weights?: number[];
    private cachedT?: number;
    private cachedVersion?: number;
    private cachedPoint?: PointImpl;

    /** @throws InvalidKnotVectorError, InvalidBSplineWeightsError; RangeError for a degree below 1 or too few points. */
    constructor(points: Array<Point>, degree: number, knots: readonly number[], weights?: readonly number[]) {
        super(points);
        BSplineCurve.check(points.length, degree, knots, weights);
        this.degree = degree;
        this.knots = [...knots];
        this.weights = weights && [...weights];
    }

    /** Validates a spline description without building it; throws what the constructor throws. */
    static check(pointCount: number, degree: number, knots: readonly number[], weights?: readonly number[]): void {
        if (!Number.isInteger(degree) || degree < 1) {
            throw new RangeError(`B-spline degree must be an integer >= 1, got ${degree}`);
        }
        if (pointCount < degree + 1) {
            throw new RangeError(`B-spline of degree ${degree} needs at least ${degree + 1} control points, got ${pointCount}`);
        }
        const result = validateKnotVector(knots, degree, pointCount - 1);
        if (!result.ok) throw new InvalidKnotVectorError(result.reason);
        if (weights) {
            const check = validateWeights(weights, pointCount);
            if (!check.ok) throw new InvalidBSplineWeightsError(check.reason, check.index);
        }
    }

    getDegree(): number {
        return this.degree;
    }

    getKnots(): number[] {
        return [...this.knots];
    }

    /** The weights, or undefined for a polynomial B-spline. */
    getWeights(): number[] | undefined {
        return this.weights && [...this.weights];
    }

    /** Replaces the knot vector for the current points and degree. Refuses, leaving the curve unchanged, with the kernel's code. */
    setKnots(knots: readonly number[]): void {
        BSplineCurve.check(this.points.length, this.degree, knots, this.weights);
        this.knots = [...knots];
        this.touch();
    }

    /** Replaces the weights (undefined: polynomial). Refuses, leaving the curve unchanged, with the kernel's code. */
    setWeights(weights: readonly number[] | undefined): void {
        BSplineCurve.check(this.points.length, this.degree, this.knots, weights);
        this.weights = weights && [...weights];
        this.touch();
    }

    /** Replaces points, degree, knots and weights atomically; nothing changes when the description is refused. */
    setSpline(points: Point[], degree: number, knots: readonly number[], weights?: readonly number[]): void {
        BSplineCurve.check(points.length, degree, knots, weights);
        this.points = points;
        this.degree = degree;
        this.knots = [...knots];
        this.weights = weights && [...weights];
        this.touch();
    }

    /** Same-count point replacement only; a different count needs a new knot vector, use {@link setSpline}. */
    override setPoints(points: Point[]): void {
        BSplineCurve.check(points.length, this.degree, this.knots, this.weights);
        super.setPoints(points);
    }

    /** The count of a B-spline is tied to its knots: use {@link setSpline}. */
    override addPoint(_point: Point): void {
        throw new InvalidKnotVectorError("wrong_length");
    }

    /** The count of a B-spline is tied to its knots: use {@link setSpline}. */
    override removePoint(_point: Point): void {
        throw new InvalidKnotVectorError("wrong_length");
    }

    /** n, the index of the last control point. */
    private lastIndex(): number {
        return this.points.length - 1;
    }

    /** The raw parameter domain [u_k, u_{n+1}]. */
    getDomain(): [number, number] {
        return domain(this.knots, this.degree, this.lastIndex());
    }

    /** Raw parameter to the display parameter in [0, 1] (the toggle is display only). */
    toDisplayParameter(t: number): number {
        const [a, b] = this.getDomain();
        return (t - a) / (b - a);
    }

    /** Display parameter in [0, 1] back to the raw parameter. */
    fromDisplayParameter(s: number): number {
        const [a, b] = this.getDomain();
        return a + s * (b - a);
    }

    /** The knots with the domain mapped to [0, 1]; knots outside the domain fall outside it. */
    getDisplayKnots(): number[] {
        return normalizeKnotsForDisplay(this.knots, this.degree, this.lastIndex());
    }

    private coordinateRows(): number[][] {
        const rows = this.points.map(point => [point.X(), point.Y(), point.Z?.() ?? 0]);
        if (!rows.some(([, , z]) => z !== 0)) rows.forEach(row => { row.length = 2; });
        return rows;
    }

    /**
     * The curve point at raw parameter t in the domain. A t outside the domain by no more than the sampling rounding
     * tolerance (1e-9 of the domain length) is taken as the nearest end; the kernel refuses anything further out.
     */
    eval(t: number): Point {
        const [start, end] = this.getDomain();
        const slack = 1e-9 * (end - start);
        if (t < start && t >= start - slack) t = start;
        else if (t > end && t <= end + slack) t = end;
        const version = this.version();
        const volatile = version === VOLATILE;
        if (!volatile && this.cachedPoint && this.cachedT === t && this.cachedVersion === version) {
            return this.cachedPoint;
        }
        const rows = this.coordinateRows();
        const row = this.weights
            ? evaluateRational(this.knots, this.degree, rows, this.weights, t)
            : evaluate(this.knots, this.degree, rows, t);
        const point = new PointImpl(row[0], row[1], undefined, row[2] ?? 0);
        if (volatile) {
            this.cachedPoint = undefined;
        } else {
            this.cachedT = t;
            this.cachedVersion = version;
            this.cachedPoint = point;
        }
        return point;
    }

    /**
     * The de Boor triangle at t: levels[0] are the k + 1 active control points, levels[k][0] the curve point. For a
     * weighted curve the rows are homogeneous (w P, w; project with `projectHomogeneous`), and the point is the
     * projection of levels[k][0].
     */
    deBoorTriangle(t: number): DeBoorTriangle {
        const rows = this.coordinateRows();
        return deBoorTriangle(this.knots, this.degree, this.weights ? liftToHomogeneous(rows, this.weights) : rows, t);
    }

    /** The knot span index i with u_i <= t < u_{i+1} (the last non-empty span at the right end). */
    activeSpan(t: number): number {
        return findSpan(this.knots, this.degree, this.lastIndex(), t);
    }

    /** Indices span - k .. span of the k + 1 control points (and basis functions) active at t. */
    activeIndices(t: number): number[] {
        const span = this.activeSpan(t);
        return Array.from({length: this.degree + 1}, (_, r) => span - this.degree + r);
    }

    /** All n + 1 basis functions N_{i,k}(t) of the knot vector (not weight dependent). */
    basis(t: number): number[] {
        return basisAll(this.knots, this.degree, t);
    }

    /**
     * r, r', r'' over the domain for the curvature kernel (planar, polynomial curves). Undefined for a weighted curve,
     * whose derivatives this kernel does not provide.
     */
    derivativeSource(): ReturnType<typeof derivativeSource> | undefined {
        if (this.weights) return undefined;
        return derivativeSource(this.knots, this.degree, this.points.map(point => [point.X(), point.Y()]));
    }
}
