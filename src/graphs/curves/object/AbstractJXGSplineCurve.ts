/**
 * Class that wraps a BezierCurve with methods for dealing with JSXGraph
 */
import {AbstractJXGPointControlledCurve, PointControlledCurveState} from "./AbstractJXGPointControlledCurve";
import {Board} from "jsxgraph";
import {Point} from "../../../bezeg/api/point/point";
import {BezierSpline} from "../../../bezeg/impl/curve/bezier-spline";

export interface JSXSplineConstructorParams {
    points: number[][],
    state: SplineCurveState
}

export interface SplineCurveState extends PointControlledCurveState {
    labelAll: boolean;
    hideFixed: boolean;
}

export abstract class AbstractJXGSplineCurve<C extends BezierSpline> extends AbstractJXGPointControlledCurve<C, any> {
    nonFreeJsxPoints!: JXG.Point[];
    labelAll: boolean = true;
    hideFixed: boolean = false;

    constructor(points: number[][], board: Board) {
        super(points, board);
        this.pointControlledCurve.generateBezierCurves();
        this.refreshNonFreeJsxGraphPoints();
        this.labelJxgPoints();
    }

    override addPoint(x: number, y: number) {
        let p = this.createEditableInputPoint(x, y, this.styles.point.pi(this.pointControlledCurve.getPoints().length, () => this.isShowingJxgPoints()));
        this.pointControlledCurve.addPoint(p);
        this.refreshNonFreeJsxGraphPoints();
        this.labelJxgPoints();
    }

    override removePoint(i: number) {
        const pointToRemove = this.getJxgPoints()[i];
        if (!pointToRemove) return;
        const modelPoint = this.getEditableInputPoint(pointToRemove);
        if (!modelPoint) return;
        this.unbindEditableInputPoint(modelPoint);
        this.board.removeObject(pointToRemove);
        this.pointControlledCurve.removePoint(modelPoint);
        this.jxgPoints = this.jxgPoints.filter(point => point !== pointToRemove);
        this.refreshNonFreeJsxGraphPoints();
        this.labelJxgPoints();
    }

    getAllFreeJxgPoints() {
        return super.getJxgPoints().filter(point => !this.nonFreeJsxPoints.includes(point));
    }

    getAllNonFreeJxgPoints() {
        return super.getJxgPoints().filter(point => this.nonFreeJsxPoints.includes(point));
    }


    setLabelAll(all: boolean) {
        this.labelAll = all;
        this.labelJxgPoints();
    }

    getLabelAll() {
        return this.labelAll;
    }

    override importState(state: SplineCurveState) {
        super.importState(state);
        if (state.labelAll !== undefined) {
            this.setLabelAll(state.labelAll);
        }
        if (state.hideFixed !== undefined) {
            this.setHideFixed(state.hideFixed);
        }
    }

    override exportState() {
        return {
            ...super.exportState(),
            labelAll: this.labelAll,
            hideFixed: this.hideFixed
        } as SplineCurveState;
    }

    getHideFixed() {
        return this.hideFixed;
    }

    setHideFixed(hideFixed: boolean) {
        this.hideFixed = hideFixed;
        this.board.update();
    }

    override labelJxgPoints() {
        if (this.labelAll) {
            const labels: string[] = [];
            const curves = this.getCurve().getUnderlyingCurves();
            curves.forEach((curve, c) => {
                curve.getPoints().forEach((point, i) => {
                    if (i !== 0 || labels.length === 0) {
                        const name = "$$p_{\\scriptsize" + i + "}^{\\scriptsize(" + (c + 1) + ")}$$";
                        labels.push(name);
                    } else {
                        var name = " $$ p_{\\scriptsize" + (curves[c - 1].getPoints().length - 1) + "}^{\\scriptsize(" + c + ")}$$";
                        var name = " $$ p_{\\scriptsize" + (curves[c - 1].getPoints().length - 1) + "}^{\\scriptsize(" + c + ")}{\\scriptsize=}p_{\\scriptsize" + 0 + "}^{\\scriptsize(" + (c + 1) + ")}$$";
                        labels[labels.length - 1] = name;
                    }
                });
            });

            //    const name = this.styles.point.pi(i, () => this.isShowingJxgPoints()).name as string;
            this.getJxgPoints().forEach((point, i) => point.setName(labels[i]));
        } else {
            this.getJxgPoints().forEach((point, i) => point.setName(""));
            this.getAllFreeJxgPoints().forEach((point, i) => point.setName(this.styles.point.pi(i, () => this.isShowingJxgPoints()).name as string));
        }
    }

    protected refreshNonFreeJsxGraphPoints() {
        const previousPoints = this.nonFreeJsxPoints ?? [];
        if (previousPoints.length > 0) {
            this.board.removeObject(previousPoints);
            const previousSet = new Set(previousPoints);
            this.jxgPoints = this.jxgPoints.filter(point => !previousSet.has(point));
        }
        const spline = this.getCurve();
        // This may look dumb, but in reality this makes us able to change underlying non-free points
        this.nonFreeJsxPoints = spline.getNonFreePoints()
            .map(p => this.createFixedJsxPoint(p))
            .map(point => point.point);
    }

    protected createFixedJsxPoint(p: Point) {
        return this.createJSXGraphPoint(() => p.X(), () => p.Y(), {
            ...this.styles.point.splineJoin,
            visible: () => !this.hideFixed
        });
    }
}
