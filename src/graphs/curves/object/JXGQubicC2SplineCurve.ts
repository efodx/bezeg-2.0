import {AbstractJXGSplineCurve, JSXSplineConstructorParams} from "./AbstractJXGSplineCurve";
import {Board} from "jsxgraph";
import {C2CubicBezierSpline} from "../../../bezeg/impl/curve/C2CubicBezierSpline";
import {assertPlanarAdapter, assertPlanarDto} from "./planarDtoGuard";


export class JXGQubicC2SplineCurve extends AbstractJXGSplineCurve<C2CubicBezierSpline> {
    static toDto(curve: JXGQubicC2SplineCurve): JSXSplineConstructorParams {
        assertPlanarAdapter(curve);
        return {
            points: curve.pointControlledCurve.points.map(point => [point.X(), point.Y()]),
            state: curve.exportState()
        };
    }

    static fromDto(params: JSXSplineConstructorParams, board: Board): JXGQubicC2SplineCurve {
        assertPlanarDto(params);
        const curve = new JXGQubicC2SplineCurve(params.points, board);
        if (params.state) {
            curve.importState(params.state);
        }
        return curve;
    }

    override getJxgPoints(): JXG.Point[] {
        return super.getAllFreeJxgPoints();
    }

    override labelJxgPoints() {
        if (this.labelAll) {
            this.getJxgPoints().forEach((point, i) => point.setName(this.styles.point.pi(i - 1, () => this.isShowingJxgPoints()).name as string));
        } else {
            this.getJxgPoints().forEach((point, i) => point.setName(""));
            this.getAllFreeJxgPoints().forEach((point, i) => point.setName(this.styles.point.pi(i, () => this.isShowingJxgPoints()).name as string));
        }

    }

    protected getInitialCurve(points: number[][]): C2CubicBezierSpline {
        const modelPoints = points.map((point, i) => this.createEditableInputPoint(point[0], point[1], this.styles.point.pi(i, () => this.isShowingJxgPoints())));
        return new C2CubicBezierSpline(modelPoints);
    }
}
