import {Point} from "../../api/point/point";
import {PointImpl} from "../point/point-impl";
import {BezierCurve} from "../../api/curve/bezier-curve";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {RationalBezierCurve} from "./rational-bezier-curve";
import {AbstractPointControlledCurve} from "./abstract-point-controlled-curve";
import {currentStamp, maxVersion, NO_MEMO, Versioned, VersionedMemo, VOLATILE} from "../versioning";
import {phControlPoints, phOffsetRational, phSigmas, Vec} from "./ph-math";

/**
 * Represents a PH Bezier curve.
 * The underlying curve is still a Bezier curve. The maths lives in ph-math.ts; this class
 * caches it per version and exposes it as points the rest of the app can bind to.
 */
export class PhBezierCurve extends AbstractPointControlledCurve implements BezierCurve {
    private d: number = 0.2;
    private underlyingBezierCurve!: BezierCurve;
    private underlyingCurveControlPoints!: Point[];
    private offsetCurves: BezierCurve[] = [];
    private sigmas!: Array<() => number>;
    private sigmaMemo!: VersionedMemo<number[]>;
    private controlPointMemo!: VersionedMemo<Vec[]>;
    private bezierCurveS?: BezierCurve;
    private bezierCurveSigma?: BezierCurve;

    constructor(points: Point[], w: Point[]) {
        super(points);
        this._w = w;
        this.rebuild();
        this.addOffsetCurve();
    }

    private _w: Point[];

    get w(): Point[] {
        return this._w;
    }

    /**
     * Replaces the hodograph points. A different number of points changes the degree, so
     * everything derived from it (control points, sigmas, arc length, offsets) is rebuilt;
     * with the same number the existing derived points read the new `w` directly.
     */
    set w(value: Point[]) {
        const degreeChanged = value.length !== this._w.length;
        this._w = value;
        if (degreeChanged) {
            const offsetCount = this.offsetCurves.length;
            this.rebuild();
            for (let i = 0; i < offsetCount; i++) {
                this.addOffsetCurve();
            }
        }
        this.touch();
    }

    /** Builds everything derived from the base point and the degree implied by `w`. */
    private rebuild() {
        this.bezierCurveS = undefined;
        this.bezierCurveSigma = undefined;
        this.offsetCurves = [];
        const hodographVectors = () => this._w.map((q): Vec => [q.X(), q.Y()]);
        this.sigmaMemo = new VersionedMemo(() => phSigmas(hodographVectors()), [this.inputs]);
        this.controlPointMemo = new VersionedMemo(
            () => phControlPoints([this.points[0].X(), this.points[0].Y()], hodographVectors()), [this.inputs]);
        const controlPointMemo = this.controlPointMemo;
        this.underlyingCurveControlPoints = [this.points[0]];
        for (let k = 1; k <= this.degree; k++) {
            this.underlyingCurveControlPoints.push(PointImpl.derived(() => controlPointMemo.get()[k], [this.inputs]));
        }
        this.underlyingBezierCurve = new PolynomialBezierCurve(this.underlyingCurveControlPoints);
        const sigmaMemo = this.sigmaMemo;
        this.sigmas = Array.from({length: this.degree}, (_, k) => () => sigmaMemo.get()[k]);
    }

    /**
     * Version of everything the derived geometry is computed from: the structural stamp (w
     * replacement, offset distance and count, transforms), the base point and the hodograph
     * points `w`. It never looks at the derived control points, so it has no cycle with them.
     * VOLATILE if any generating point is volatile.
     */
    private inputsVersion(): number {
        const stamp = currentStamp();
        if (stamp === this.inputsMemoStamp) {
            return this.inputsMemo;
        }
        const base = super.version();
        const version = base === VOLATILE ? VOLATILE : maxVersion(this._w, base);
        if (version !== VOLATILE) {
            this.inputsMemoStamp = stamp;
            this.inputsMemo = version;
        }
        return version;
    }

    private inputsMemoStamp = NO_MEMO;
    private inputsMemo = VOLATILE;

    /** Declared as the dependency of every hodograph-derived point so they cache. */
    private readonly inputs: Versioned = {version: () => this.inputsVersion()};

    private derived(x: number | (() => number), y: number | (() => number)): PointImpl {
        return new PointImpl(x, y, [this.inputs]);
    }

    override version(): number {
        return this.inputsVersion();
    }

    get degree() {
        return 2 * this._w.length - 1;
    }

    setOffsetCurveNumber(num: number) {
        while (num !== this.offsetCurves.length && num !== undefined) {
            if (num > this.offsetCurves.length) {
                this.addOffsetCurve();
            } else {
                this.removeOffsetCurve();
            }
        }
    }

    addOffsetCurve() {
        const len = this.offsetCurves.length;
        const offset = new VersionedMemo(
            () => phOffsetRational(this.controlPointMemo.get(), this.sigmaMemo.get(), (len + 1) * this.d), [this.inputs]);
        const count = 2 * this.degree;
        const points = Array.from({length: count}, (_, k) => PointImpl.derived(() => offset.get().points[k], [this.inputs]));
        const weights = Array.from({length: count}, (_, k) => () => offset.get().weights[k]);
        this.offsetCurves.push(new RationalBezierCurve(points, weights, [this.inputs]));
        this.touch();
    }

    removeOffsetCurve() {
        this.offsetCurves.pop();
        this.touch();
    }

    tk(tkminus1: number, deltas: number, k: number) {
        let tk0 = tkminus1 + deltas / this.sigma(tkminus1);
        tk0 = tk0 - (this.s(tk0) - k * deltas) / this.sigma(tk0);
        tk0 = tk0 - (this.s(tk0) - k * deltas) / this.sigma(tk0);
        tk0 = tk0 - (this.s(tk0) - k * deltas) / this.sigma(tk0);
        tk0 = tk0 - (this.s(tk0) - k * deltas) / this.sigma(tk0);
        return tk0;
    }

    s(t: number) {
        if (!this.bezierCurveS) {
            const s = [];
            const lastS = this.sigmas.reduce((acc, sigma) => {
                    // The intermediate ones are calculated here
                    s.push(acc);
                    return () => acc() + 1 / this.degree * sigma();
                },
                () => 0);
            s.push(lastS);
            this.bezierCurveS = new PolynomialBezierCurve(s.map(p => this.derived(p, 1)));
        }
        return this.bezierCurveS.eval(t).X();

    }

    /** Exact total arc length s(1) of the curve on [0, 1]. */
    arcLength(): number {
        return this.s(1);
    }

    sigma(t: number) {
        if (!this.bezierCurveSigma) {
            this.bezierCurveSigma = new PolynomialBezierCurve(this.sigmas.map(sigma => this.derived(sigma, 1)));
        }
        return this.bezierCurveSigma.eval(t).X();
    }

    getOffsetCurves() {
        return this.offsetCurves;
    }

    setOffsetCurveDistance(d: number) {
        this.d = d;
        this.touch();
    }

    getOffsetCurveDistance() {
        return this.d;
    }

    // Delegate Methods for the underlying bezier curve
    subdivide(t: number): BezierCurve[] {
        // TODO this shouldnt really be used...
        return this.underlyingBezierCurve.subdivide(t);
    }

    decasteljau(t: number, pointsAtT: number[][]): number[][][] {
        // TODO this shouldnt really be used...
        return this.underlyingBezierCurve.decasteljau(t, pointsAtT);
    }

    override rotate(theta: number) {
        const rotateByHalfTheta = [[Math.cos(theta / 2), -Math.sin(theta / 2)], [Math.sin(theta / 2), Math.cos(theta / 2)]];
        const [cX, cY] = [this.underlyingBezierCurve.getPoints().map(point => point.X()).reduce((previousValue, currentValue) => previousValue + currentValue) / this.underlyingBezierCurve.getPoints().length,
            this.underlyingBezierCurve.getPoints().map(point => point.Y()).reduce((previousValue, currentValue) => previousValue + currentValue) / this.underlyingBezierCurve.getPoints().length];
        this._w.forEach(point => this.transformPoint(point, 0, 0, rotateByHalfTheta, undefined));
        const rotateByTheta = [[Math.cos(theta), -Math.sin(theta)], [Math.sin(theta), Math.cos(theta)]];
        const newCenter = new PointImpl(cX, cY);
        this.transformPoint(newCenter, this.points[0].X(), this.points[0].Y(), rotateByTheta, undefined);
        this.moveFor(cX - newCenter.X(), cY - newCenter.Y());
    }

    elevate(): BezierCurve {
        return this.underlyingBezierCurve.elevate();
    }

    decasteljauScheme(t: number): Point[][] {
        return this.underlyingBezierCurve.decasteljauScheme(t);
    }

    override scale(xScale: number) {
        xScale = Math.sqrt(xScale);
        this._w.forEach(point => this.transformPoint(point, 0, 0, [[xScale, 0], [0, xScale]], undefined));
        const [cX, cY] = this.getBoundingBoxCenter();
        const newCenter = new PointImpl(cX, cY);
        this.transformPoint(newCenter, this.points[0].X(), this.points[0].Y(), [[xScale, 0], [0, xScale]], undefined);
        this.moveFor(2 * (cX - newCenter.X()), 2 * (cY - newCenter.Y()));
    }

    override getBoundingBox(): number[] {
        return this.underlyingBezierCurve.getBoundingBox();
    }

    extrapolate(t: number): BezierCurve {
        return this.underlyingBezierCurve.extrapolate(t);
    }

    override getPoints(): Point[] {
        return this.underlyingBezierCurve.getPoints();
    }

    eval(t: number): Point {
        return this.underlyingBezierCurve.eval(t);
    }

    override getConvexHull(): Point[] {
        return this.underlyingBezierCurve.getConvexHull();
    }

}
