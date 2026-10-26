import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {BezierCurve} from "../../api/curve/bezier-curve";
import {AbstractPointControlledCurve} from "./abstract-point-controlled-curve";

import {VOLATILE} from "../versioning";
import {deCasteljauInPlace, elevate, extrapolate, subdivide} from "../kernels/bezier-kernels";


export class PolynomialBezierCurve extends AbstractPointControlledCurve implements BezierCurve {
    private lastVersion?: number;
    private cachedPoints: Map<number, PointImpl> = new Map();
    private evaluationScratch: number[][] = [];

    private coordinateRows(): number[][] {
        const coordinates = this.points.map(point => [point.X(), point.Y(), point.Z?.() ?? 0]);
        const hasHeight = coordinates.some(([, , z]) => z !== 0);
        if (!hasHeight) coordinates.forEach(row => { row.length = 2; });
        return coordinates;
    }

    elevate(): this {
        const elevated = elevate(this.coordinateRows());
        const n = this.points.length;
        const newPoints = [this.points[0], ...elevated.slice(1, n).map(([x, y, z = 0]) => new PointImpl(x, y, undefined, z)), this.points[n - 1]];
        return new PolynomialBezierCurve(newPoints) as this;
    }

    /**
     * Calculates a point on this curve at parameter t.
     * @param {number} t
     * @returns {Point} point
     */
    eval(t: number): Point {
        // Valid while this curve's version (own stamp plus control point versions) is unchanged;
        // a volatile curve is never cached.
        const currentVersion = this.version();
        const volatile = currentVersion === VOLATILE;
        if (volatile || currentVersion !== this.lastVersion) {
            this.cachedPoints.clear();
            this.lastVersion = volatile ? undefined : currentVersion;
        }
        const cached = this.cachedPoints.get(t);
        if (cached === undefined) {
            let pointsAtT: number[][];
            if (this.points.length >= 5) {
                // Reuse only temporary rows; refresh every coordinate on a cache miss
                // because control points can be reactive or replaced at the same degree.
                if (this.evaluationScratch.length !== this.points.length) {
                    this.evaluationScratch = Array.from({length: this.points.length}, () => [0, 0]);
                }
                pointsAtT = this.evaluationScratch;
                let hasHeight = false;
                for (let i = 0; i < this.points.length; i++) {
                    const point = this.points[i];
                    pointsAtT[i][0] = point.X();
                    pointsAtT[i][1] = point.Y();
                    const z = point.Z?.() ?? 0;
                    pointsAtT[i][2] = z;
                    hasHeight ||= z !== 0;
                }
                if (!hasHeight) pointsAtT.forEach(row => { row.length = 2; });
            } else {
                pointsAtT = this.coordinateRows();
            }
            const point = this.evaluatePoint(t, pointsAtT);
            if (!volatile) {
                this.cachedPoints.set(t, point);
            }
            return point;
        }
        return cached;
    }

    /** Evaluate only the final point; keep full intermediate rows for constructions. */
    protected evaluatePoint(t: number, pointsAtT: number[][]): PointImpl {
        this.runDeCasteljau(t, pointsAtT, this.evaluationWeights());
        return new PointImpl(pointsAtT[0][0], pointsAtT[0][1], undefined, pointsAtT[0][2] ?? 0);
    }

    /** Weights for the projected (rational) recurrence, or undefined for a plain polynomial curve. */
    protected evaluationWeights(): number[] | undefined {
        return undefined;
    }

    /** The de Casteljau recurrence in place on `rows`; see {@link deCasteljauInPlace}. */
    protected runDeCasteljau(t: number, rows: number[][], weights?: number[], scheme?: number[][][]): void {
        deCasteljauInPlace(t, rows, weights, scheme);
    }

    /**
     * Returns the full decasteljau scheme for desired t.
     * @param t
     */
    decasteljauScheme(t: number): Point[][] {
        const pointsAtT = this.coordinateRows();
        const decasteljauInternal = this.decasteljau(t, pointsAtT);
        return decasteljauInternal.map(row => row.map(([x, y, z = 0]) => new PointImpl(x, y, undefined, z)));
    }

    /**
     * Returns a new bezier curve that is the extrapolated version of the current one.
     * @param t
     */
    extrapolate(t: number): this {
        const newPoints = extrapolate(t, this.coordinateRows()).map(([x, y, z = 0]) => new PointImpl(x, y, undefined, z));
        return new PolynomialBezierCurve(newPoints) as this;
    }

    /**
     * Returns two bezier curves that together form the current one.
     * @param t
     */
    subdivide(t: number): this[] {
        return subdivide(t, this.coordinateRows())
            .map(rows => new PolynomialBezierCurve(rows.map(([x, y, z = 0]) => new PointImpl(x, y, undefined, z)))) as this[];
    };

    decasteljau(t: number, pointsAtT: number[][]): number[][][] {
        // TODO think about removing pointsAtT argument
        const decasteljauScheme: number[][][] = [];
        this.runDeCasteljau(t, pointsAtT, undefined, decasteljauScheme);
        return decasteljauScheme;
    }
}
