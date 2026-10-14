import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {BezierCurve} from "../../api/curve/bezier-curve";
import {AbstractPointControlledCurve} from "./abstract-point-controlled-curve";

import {VOLATILE} from "../versioning";


export class PolynomialBezierCurve extends AbstractPointControlledCurve implements BezierCurve {
    private lastVersion?: number;
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
                for (let i = 0; i < this.points.length; i++) {
                    pointsAtT[i][0] = this.points[i].X();
                    pointsAtT[i][1] = this.points[i].Y();
                }
            } else {
                pointsAtT = this.points.map(point => [point.X(), point.Y()]);
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
        return new PointImpl(pointsAtT[0][0], pointsAtT[0][1]);
    }

    /** Weights for the projected (rational) recurrence, or undefined for a plain polynomial curve. */
    protected evaluationWeights(): number[] | undefined {
        return undefined;
    }

    /**
     * The one de Casteljau recurrence, in place on `rows` (one coordinate row per control point).
     * With `weights` each step blends by the weighted (projected) coefficients and updates them;
     * the weights array is consumed. If `scheme` is given, a copy of the rows is appended to it
     * before the first step and after every step.
     */
    protected runDeCasteljau(t: number, rows: number[][], weights?: number[], scheme?: number[][][]): void {
        const n = rows.length;
        scheme?.push(rows.map(row => [...row]));
        for (let r = 1; r < n; r++) {
            for (let i = 0; i < n - r; i++) {
                let left = 1 - t;
                let right = t;
                if (weights) {
                    const w = left * weights[i] + right * weights[i + 1];
                    left = left * weights[i] / w;
                    right = right * weights[i + 1] / w;
                    weights[i] = w;
                }
                const row = rows[i];
                const next = rows[i + 1];
                if (row.length === 2) {
                    row[0] = left * row[0] + right * next[0];
                    row[1] = left * row[1] + right * next[1];
                } else {
                    for (let d = 0; d < row.length; d++) {
                        row[d] = left * row[d] + right * next[d];
                    }
                }
            }
            scheme?.push(rows.map(row => [...row]));
        }
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
        const decasteljauScheme: number[][][] = [];
        this.runDeCasteljau(t, pointsAtT, undefined, decasteljauScheme);
        return decasteljauScheme;
    }
}
