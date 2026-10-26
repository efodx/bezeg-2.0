import {PointImpl} from "../point/point-impl";
import {Point} from "../../api/point/point";
import {PolynomialBezierCurve} from "./polynomial-bezier-curve";
import {MaybeVersioned, maxVersion, VOLATILE} from "../versioning";
import {elevateRational, extrapolateRational, subdivideRational, WeightedNet} from "../kernels/bezier-kernels";


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
        const {rows, weights} = elevateRational({rows: this.curveRows(), weights: this.getEffectiveWeights()});
        const n = this.points.length;
        const newPoints = [this.points[0], ...rows.slice(1, n).map(([x, y, z = 0]) => new PointImpl(x, y, undefined, z)), this.points[n - 1]];
        return new RationalBezierCurve(newPoints, weights) as this;
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
        const {rows, weights} = extrapolateRational(t, this.homogeneousSource());
        return new RationalBezierCurve(rows.map(([x, y, z = 0]) => new PointImpl(x, y, undefined, z)), weights) as this;
    }

    /**
     * Returns two bezier curves that together form the current one.
     * @param t
     */
    override subdivide(t: number): this[] {
        return subdivideRational(t, this.homogeneousSource())
            .map(({rows, weights}) => new RationalBezierCurve(rows.map(([x, y, z = 0]) => new PointImpl(x, y, undefined, z)), weights)) as this[];
    };

    // Subdivision and extrapolation use the stored weights, not the current reactive ones.
    private homogeneousSource(): WeightedNet {
        return {rows: this.curveRows(), weights: this.weights};
    }

    private curveRows(): number[][] {
        const coordinates = this.points.map(point => [point.X(), point.Y(), point.Z?.() ?? 0]);
        const hasHeight = coordinates.some(([, , z]) => z !== 0);
        if (!hasHeight) coordinates.forEach(row => { row.length = 2; });
        return coordinates;
    }

    /**
     * Returns the full decasteljau scheme for desired t.
     * @param t
     * @param pointsAtT
     */
    override decasteljau(t: number, pointsAtT: number[][]): number[][][] {
        // TODO think about removing pointsAtT argument
        const decasteljauScheme: number[][][] = [];
        this.runDeCasteljau(t, pointsAtT, this.evaluationWeights(), decasteljauScheme);
        return decasteljauScheme;
    }

    // Evaluation uses the same projected recurrence as the full construction. A homogeneous
    // evaluator would change existing behavior at zero intermediate weights.
    protected override evaluationWeights(): number[] {
        return this.reactiveWeights ? this.reactiveWeights.map(w => w()) : [...this.weights];
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
