import {AbstractJXGSplineCurve, JSXSplineConstructorParams} from "./AbstractJXGSplineCurve";
import {Board} from "jsxgraph";
import {GenericBezierSpline, GenericSplineChange} from "../../../bezeg/impl/curve/GenericBezierSpline";
import {assertPlanarAdapter, assertPlanarDto} from "./planarDtoGuard";

export interface JSXGenericSplineConstructorParams extends JSXSplineConstructorParams {
    continuity: number,
    degree: number
}

export class JXGGenericSplineCurve extends AbstractJXGSplineCurve<GenericBezierSpline> {

    constructor(points: number[][], continuity: number, degree: number, board: Board) {
        super(points, board);
        this.finishConstruction(() => {
            this.board.suspendUpdate();
            try {
                // A stored Preset may hold a degree above the change limit, so it restores rather than changes.
                if (this.pointControlledCurve.restore(degree, continuity)) {
                    this.reconcileSplineDrawing();
                }
            } finally {
                this.board.unsuspendUpdate();
            }
        });
    }

    static toDto(curve: JXGGenericSplineCurve): JSXGenericSplineConstructorParams {
        assertPlanarAdapter(curve);
        return {
            points: curve.pointControlledCurve.points.map(point => [point.X(), point.Y()]),
            degree: curve.pointControlledCurve.getDegree(),
            continuity: curve.pointControlledCurve.getContinuity(),
            state: curve.exportState()
        };
    }

    static fromDto(params: JSXGenericSplineConstructorParams, board: Board): JXGGenericSplineCurve {
        assertPlanarDto(params);
        const curve = new JXGGenericSplineCurve(params.points, params.continuity, params.degree, board);
        if (params.state) {
            curve.importState(params.state);
        }
        return curve;
    }

    override getJxgPoints() {
        // We order them so that labeling of points gets done correctly!
        const freePoints: JXG.Point[] = this.getAllFreeJxgPoints();
        const nonFreePoints: JXG.Point[] = this.getAllNonFreeJxgPoints();
        return this.getCurve().getAllCurvePoints().map(point => point.isXFunction() || point.isYFunction())
            .map(fixed => {
                if (fixed) {
                    return nonFreePoints.shift()!;
                } else {
                    return freePoints.shift()!;
                }
            });
    }

    /**
     * Moves the spline to a completed degree/continuity target (see `GenericBezierSpline.change`) and
     * redraws the computed points and labels once.
     *
     * @returns whether anything changed
     * @throws RangeError when the target is rejected; the curve and drawing are then untouched
     */
    changeSpline(target: GenericSplineChange): boolean {
        if (!this.getCurve().change(target)) {
            return false;
        }
        this.reconcileSplineDrawing();
        return true;
    }

    protected getInitialCurve(points: number[][]): GenericBezierSpline {
        const modelPoints = points.map((point, i) => this.createEditableInputPoint(point[0], point[1], this.styles.point.pi(i, () => this.isShowingJxgPoints())));
        return new GenericBezierSpline(modelPoints, 3, 1);
    }
}
