import {Board} from "jsxgraph";
import {AbstractJXGPointControlledCurve, PointControlledCurveAttributes, PointControlledCurveState} from "./AbstractJXGPointControlledCurve";
import {BSplineCurve, InvalidKnotVectorError} from "../../../bezeg/impl/curve/bspline-curve";
import {clampedUniformKnots} from "../../../bezeg/impl/curve/bspline";
import {assertPlanarAdapter, assertPlanarDto} from "./planarDtoGuard";

export interface JXGBSplineCurveConstructorParams {
    points: number[][],
    degree: number,
    knots: number[],
    weights?: number[],
    state?: PointControlledCurveState
}

/**
 * Draws a {@link BSplineCurve} on a board: draggable control points and the curve sampled over its raw domain
 * [u_k, u_{n+1}]. The board objects (curve, control points, polygon, hull) are owned and removed by `dispose`.
 */
export class JXGBSplineCurve extends AbstractJXGPointControlledCurve<BSplineCurve, PointControlledCurveAttributes> {

    /**
     * @throws InvalidKnotVectorError, InvalidBSplineWeightsError, RangeError before any board object exists.
     */
    constructor(points: number[][], degree: number, knots: readonly number[], weights: readonly number[] | undefined, board: Board) {
        BSplineCurve.check(points.length, degree, knots, weights);
        super(points, board);
        try {
            this.pointControlledCurve.setSpline(this.pointControlledCurve.getPoints(), degree, knots, weights);
            const curve = this.pointControlledCurve;
            this.setIntervalStart(() => curve.getDomain()[0]);
            this.setIntervalEnd(() => curve.getDomain()[1]);
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    static toDto(curve: JXGBSplineCurve): JXGBSplineCurveConstructorParams {
        assertPlanarAdapter(curve);
        const model = curve.pointControlledCurve;
        const weights = model.getWeights();
        return {
            points: model.getPoints().map(point => [point.X(), point.Y()]),
            degree: model.getDegree(),
            knots: model.getKnots(),
            ...(weights ? {weights} : {}),
            state: curve.exportState(),
        };
    }

    static fromDto(params: JXGBSplineCurveConstructorParams, board: Board): JXGBSplineCurve {
        assertPlanarDto(params);
        const curve = new JXGBSplineCurve(params.points, params.degree, params.knots, params.weights, board);
        if (params.state) {
            board.suspendUpdate();
            try {
                curve.importState(params.state);
            } finally {
                board.unsuspendUpdate();
            }
        }
        return curve;
    }

    /**
     * The point count is tied to the knots, so the inherited board paths (click-to-add, delete) are refused before they
     * create or remove a board object; a graph changes the count through {@link BSplineCurve.setSpline} with new knots.
     */
    override addPoint(_x: number, _y: number): void {
        throw new InvalidKnotVectorError("wrong_length");
    }

    override removePoint(_i: number): void {
        throw new InvalidKnotVectorError("wrong_length");
    }

    override getDefaultAttributes(): PointControlledCurveAttributes {
        return {...super.getDefaultAttributes(), allowShowPoints: true};
    }

    /**
     * The base constructor calls this before the subclass can hold its arguments, so it builds a clamped uniform cubic
     * (or the highest degree the points allow); the constructor then installs the requested degree, knots and weights.
     */
    protected getInitialCurve(points: number[][]): BSplineCurve {
        const degree = Math.min(3, points.length - 1);
        const modelPoints = points.map((point, i) => this.createEditableInputPoint(point[0], point[1], this.styles.point.pi(i, () => this.isShowingJxgPoints())));
        return new BSplineCurve(modelPoints, degree, clampedUniformKnots(degree, points.length - 1));
    }
}
