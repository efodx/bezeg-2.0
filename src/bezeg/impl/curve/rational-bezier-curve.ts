import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {MaybeVersioned, maxVersion, VOLATILE} from "../versioning";


export class RationalBezierCurve extends PolynomialBezierCurve {
    private weights: Array<number>;
    // This is a work around since I didn't plan on this curve being reactive to it's weights
    // So in case we provide weights that are functions, we use those in decasteljau scheme for calculating
    // However other bezier curve methods won't work, since the original weights will be just the reactiveWeights evaluated at start
    private reactiveWeights?: Array<() => number> = undefined;
    private standardForm = false;
    // Objects the reactive weights read; without them reactive weights make the curve volatile.
    private weightDependencies?: ReadonlyArray<MaybeVersioned>;

    /**
     * @constructor
     * @param {Array.<Point>} points - Curve's control points
     * @param weights - Curve's weights
     */
    constructor(points: Array<Point>, weights: Array<() => number> | Array<number>, weightDependencies?: ReadonlyArray<MaybeVersioned>) {
        super(points);
        this.weightDependencies = weightDependencies;
        if (typeof weights[0] == 'function') {
            this.reactiveWeights = weights as Array<() => number>;
            this.weights = this.reactiveWeights.map(w => w());
        } else {
            this.weights = weights as Array<number>;
        }
    }


    override elevate(): this {
        const ws = this.getEffectiveWeights();
        let newPoints = [];
        let newWeights = [];
        newPoints.push(this.points[0]);
        newWeights.push(ws[0]);
        let n = this.points.length, x, y;
        for (let i = 1; i < n; i++) {
            let w1 = ws[i - 1];
            let w2 = ws[i];
            let w = i / n * w1 + (1 - i / n) * w2;
            newWeights.push(w);
            x = i / n * this.points[i - 1].X() * w1 + (1 - i / n) * this.points[i].X() * w2;
            y = i / n * this.points[i - 1].Y() * w1 + (1 - i / n) * this.points[i].Y() * w2;

            x = x / w;
            y = y / w;
            newPoints.push(new PointImpl(x, y));
        }
        newPoints.push(this.points[n - 1]);
        newWeights.push(ws[n - 1]);
        return new RationalBezierCurve(newPoints, newWeights) as this;
    }

    /** Reactive weights are closures: volatile unless the constructor declared what they read. */
    override version(): number {
        if (!this.reactiveWeights) {
            return super.version();
        }
        const base = super.version();
        return this.weightDependencies && base !== VOLATILE ? maxVersion(this.weightDependencies, base) : VOLATILE;
    }

    setWeights(weights: number[]) {
        this.weights = weights;
        this.touch();
    }


    setReactiveWeights(weights: (() => number)[] | undefined) {
        this.reactiveWeights = weights;
        this.weightDependencies = undefined;
        this.touch();
    }

    /** Returns the weights currently used by evaluation, without standard-form display normalization. */
    getEffectiveWeights(): number[] {
        if (this.reactiveWeights) {
            return this.reactiveWeights.map(weight => weight());
        }
        return this.weights;
    }

    getWeights(): number[] {
        const weights = this.getEffectiveWeights();
        if (this.standardForm) {
            return this.standardize(weights);
        }
        return weights;
    }

    /**
     * Returns a new bezier curve that is the extrapolated version of the current one.
     * @param t
     */
    override extrapolate(t: number): this {
        const points = this.points.map((point, i) => [point.X() * this.weights[i], point.Y() * this.weights[i], this.weights[i]]);
        const decasteljauScheme = super.decasteljau(t, points);
        const pointsToProject = decasteljauScheme.map((row, i) => row[0]);
        const actualPoints = pointsToProject.map(p => new PointImpl(p[0] / p[2], p[1] / p[2]));
        const weights = pointsToProject.map(p => p[2]);
        return new RationalBezierCurve(actualPoints, weights) as this;
    }

    /**
     * Returns two bezier curves that together form the current one.
     * @param t
     */
    override subdivide(t: number): this[] {
        const points = this.points.map((point, i) => [point.X() * this.weights[i], point.Y() * this.weights[i], this.weights[i]]);
        const decasteljauScheme = super.decasteljau(t, points);
        const n = decasteljauScheme.length;
        const points1 = decasteljauScheme.map((row, i) => row[0]);
        const points2 = decasteljauScheme.map((row, i) => row[n - 1 - i]).reverse();
        const actualPoints1 = points1.map(p => new PointImpl(p[0] / p[2], p[1] / p[2]));
        const actualWeights = points1.map(p => p[2]);
        const actualPoints2 = points2.map(p => new PointImpl(p[0] / p[2], p[1] / p[2]));
        const actualWeights2 = points2.map(p => p[2]);
        const bezierCurve1 = new RationalBezierCurve(actualPoints1, actualWeights);
        const bezierCurve2 = new RationalBezierCurve(actualPoints2, actualWeights2);
        return [bezierCurve1, bezierCurve2] as this[];
    };

    /**
     * Returns the full decasteljau scheme for desired t.
     * @param t
     * @param pointsAtT
     */
    override decasteljau(t: number, pointsAtT: number[][]): number[][][] {
        // TODO think about removing pointsAtT argument
        const decasteljauScheme = [];
        const n = this.points.length;
        const ws = this.reactiveWeights ? this.reactiveWeights.map(w => w()) : this.weights.map(w => w);
        decasteljauScheme.push(pointsAtT.map(row => [...row]));
        for (let r = 1; r < n; r++) {
            for (let i = 0; i < n - r; i++) {
                const w = (1 - t) * ws[i] + t * ws[i + 1];
                for (let d = 0; d < pointsAtT[i].length; d++) {
                    pointsAtT[i][d] = ((1 - t) * ws[i] / w * pointsAtT[i][d] + t * ws[i + 1] / w * pointsAtT[i + 1][d]);
                }
                ws[i] = w;
            }
            decasteljauScheme.push(pointsAtT.map(row => [...row]));
        }
        return decasteljauScheme;
    }

    protected override evaluatePoint(t: number, pointsAtT: number[][]): PointImpl {
        const ws = this.reactiveWeights ? this.reactiveWeights.map(w => w()) : [...this.weights];
        const n = pointsAtT.length;
        for (let r = 1; r < n; r++) {
            for (let i = 0; i < n - r; i++) {
                const w = (1 - t) * ws[i] + t * ws[i + 1];
                const left = (1 - t) * ws[i] / w;
                const right = t * ws[i + 1] / w;
                pointsAtT[i][0] = left * pointsAtT[i][0] + right * pointsAtT[i + 1][0];
                pointsAtT[i][1] = left * pointsAtT[i][1] + right * pointsAtT[i + 1][1];
                ws[i] = w;
            }
        }
        // Use the same projected recurrence as the full construction. A homogeneous
        // evaluator would change existing behavior at zero intermediate weights.
        return new PointImpl(pointsAtT[0][0], pointsAtT[0][1]);
    }

    setStandardForm(standard: boolean) {
        this.standardForm = standard;
    }

    inStandardForm() {
        return this.standardForm;
    }

    private standardize(weights: Array<number>): Array<number> {
        const n = weights.length;
        return weights.map((w, i) => w / Math.pow(weights[n - 1] ** i * weights[0] ** (n - 1 - i), 1 / (n - 1)));
    }
}
