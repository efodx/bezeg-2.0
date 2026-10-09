import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {BezierCurve} from "../../api/curve/bezier-curve";
import {AbstractPointControlledCurve} from "./abstract-point-controlled-curve";

import {geometryCache} from "../../cache/GeometryCache";


export class PolynomialBezierCurve extends AbstractPointControlledCurve implements BezierCurve {
    private lastGeometryRevision?: number;
    private cachedPoints: Map<number, PointImpl> = new Map();
    private evaluationScratch: number[][] = [];

    elevate(): this {
        let newPoints = [];
        newPoints.push(this.points[0]);
        let n = this.points.length, x, y;
        for (let i = 1; i < n; i++) {
            x = i / n * this.points[i - 1].X() + (1 - i / n) * this.points[i].X();
            y = i / n * this.points[i - 1].Y() + (1 - i / n) * this.points[i].Y();
            newPoints.push(new PointImpl(x, y));
        }
        newPoints.push(this.points[n - 1]);
        return new PolynomialBezierCurve(newPoints) as this;
    }

    /**
     * Calculates a point on this curve at parameter t.
     * @param {number} t
     * @returns {Point} point
     */
    eval(t: number): Point {
        const currentRevision = geometryCache.revision;
        if (currentRevision !== this.lastGeometryRevision) {
            this.cachedPoints.clear();
            this.lastGeometryRevision = currentRevision;
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
                for (let i = 0; i < this.points.length; i++) {
                    pointsAtT[i][0] = this.points[i].X();
                    pointsAtT[i][1] = this.points[i].Y();
                }
            } else {
                pointsAtT = this.points.map(point => [point.X(), point.Y()]);
            }
            const point = this.evaluatePoint(t, pointsAtT);
            this.cachedPoints.set(t, point);
            return point;
        }
        return cached;
    }

    /** Evaluate only the final point; keep full intermediate rows for constructions. */
    protected evaluatePoint(t: number, pointsAtT: number[][]): PointImpl {
        const n = pointsAtT.length;
        for (let r = 1; r < n; r++) {
            for (let i = 0; i < n - r; i++) {
                pointsAtT[i][0] = (1 - t) * pointsAtT[i][0] + t * pointsAtT[i + 1][0];
                pointsAtT[i][1] = (1 - t) * pointsAtT[i][1] + t * pointsAtT[i + 1][1];
            }
        }
        return new PointImpl(pointsAtT[0][0], pointsAtT[0][1]);
    }

    /**
     * Returns the full decasteljau scheme for desired t.
     * @param t
     */
    decasteljauScheme(t: number): Point[][] {
        const pointsAtT = this.points.map(point => [point.X(), point.Y()]);
        const decasteljauInternal = this.decasteljau(t, pointsAtT);
        return decasteljauInternal.map(row => row.map(([x, y]) => new PointImpl(x, y)));
    }

    /**
     * Returns a new bezier curve that is the extrapolated version of the current one.
     * @param t
     */
    extrapolate(t: number): this {
        const decasteljauScheme = this.decasteljauScheme(t);
        const newPoints = decasteljauScheme.map(row => row[0]);
        return new PolynomialBezierCurve(newPoints) as this;
    }

    /**
     * Returns two bezier curves that together form the current one.
     * @param t
     */
    subdivide(t: number): this[] {
        const decasteljauScheme = this.decasteljauScheme(t);
        const n = decasteljauScheme.length;
        const points1 = decasteljauScheme.map(row => row[0]);
        const points2 = decasteljauScheme.map((row, i) => row[n - 1 - i]).reverse();
        const bezierCurve1 = new PolynomialBezierCurve(points1);
        const bezierCurve2 = new PolynomialBezierCurve(points2);
        return [bezierCurve1, bezierCurve2] as this[];
    };

    decasteljau(t: number, pointsAtT: number[][]): number[][][] {
        // TODO think about removing pointsAtT argument
        const decasteljauScheme = [];
        const n = this.points.length;
        decasteljauScheme.push(pointsAtT.map(row => [...row]));
        for (let r = 1; r < n; r++) {
            for (let i = 0; i < n - r; i++) {
                for (let d = 0; d < pointsAtT[i].length; d++) {
                    pointsAtT[i][d] = ((1 - t) * pointsAtT[i][d] + t * pointsAtT[i + 1][d]);
                }
            }
            decasteljauScheme.push(pointsAtT.map(row => [...row]));
        }
        return decasteljauScheme;
    }
}
