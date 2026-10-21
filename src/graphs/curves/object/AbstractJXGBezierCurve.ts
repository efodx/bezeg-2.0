import {AbstractJXGPointControlledCurve, PointControlledCurveAttributes} from "./AbstractJXGPointControlledCurve";
import {JXGBezierCurveState} from "./JXGBezierCurve";
import {BezierCurve} from "../../../bezeg/api/curve/bezier-curve";
import {Point} from "../../../bezeg/api/point/point";
import {versionOf, VOLATILE} from "../../../bezeg/impl/versioning";

export interface BezierCurveAttributes extends PointControlledCurveAttributes {
    allowSubdivision: boolean,
    allowExtrapolation: boolean,
    allowElevation: boolean
    allowDecasteljau: boolean,
    allowShrink: boolean
}

/**
 * Control points of the degree-elevated curve computed from the given control points:
 * P'_0 = P_0, P'_i = (i/(n+1)) P_{i-1} + (1 - i/(n+1)) P_i, P'_{n+1} = P_n, where n + 1 = points.length.
 * Pure, so callers can recompute it on every update and follow dragged control points.
 */
export function elevatedControlPoints(points: ReadonlyArray<{ X(): number, Y(): number }>): [number, number][] {
    const count = points.length;
    if (count === 0) return [];
    const result: [number, number][] = [[points[0].X(), points[0].Y()]];
    for (let i = 1; i < count; i++) {
        const a = i / count;
        result.push([a * points[i - 1].X() + (1 - a) * points[i].X(), a * points[i - 1].Y() + (1 - a) * points[i].Y()]);
    }
    result.push([points[count - 1].X(), points[count - 1].Y()]);
    return result;
}

/** The extrapolation parameter t extends the curve past its end (t = 1) by at most half its parameter interval. Sliders and the lesson action use these. */
export const EXTRAPOLATION_T_MIN = 1;
export const EXTRAPOLATION_T_MAX = 1.5;

export abstract class AbstractJXGBezierCurve<T extends BezierCurve, Attr extends BezierCurveAttributes> extends AbstractJXGPointControlledCurve<T, Attr> {
    subdivisionT: number = 0.5;
    extrapolationT: number = 1.2;
    subdivisionPoint: JXG.Point | null = null;
    extrapolationPoint: JXG.Point | null = null;
    decasteljauPoints: JXG.Point[] = [];
    cachedDecasteljauScheme: Point[][] = [];
    cacheRevision: number = -1;
    private lastDecasteljauT?: number;
    lastDecasteljauN: number = -1;
    showingDecasteljauScheme: boolean = false;
    showingDecasteljauPoints: boolean = false;
    protected subdivisionResultConsumer?: (curve: this) => void;
    private decasteljauT: number = 0.5;
    private decasteljauSegments: JXG.Segment[] = [];
    private elevationPoints: JXG.Point[] = [];
    private elevationSegments: JXG.Segment[] = [];
    private showingElevatePoints: boolean = false;

    private decasteljauElements(): JXG.GeometryElement[] {
        return [...this.decasteljauPoints, ...this.decasteljauSegments];
    }

    /**
     * Subdivides the curve at t.
     * This JXGBezierCurve becomes the part that was at [0,t] while the method returns the part from [t,1]
     * @param t
     */
    abstract subdivide(t: number): this

    abstract extrapolate(t: number): void

    abstract elevate(t: number): void

    setSubdivisionResultConsumer(consumer: ((curve: this) => void)) {
        this.subdivisionResultConsumer = consumer;
    }

    override addPoint(x: number, y: number) {
        super.addPoint(x, y);
        this.rebuildElevatePoints();
        if (this.decasteljauSegments.length !== 0) {
            this.generateLineSegments();
        }
        if (this.isShowingControlPolygon()) {
            this.showControlPolygon();
        }
    }

    override removePoint(i: number) {
        super.removePoint(i);
        this.rebuildElevatePoints();
        if (this.decasteljauSegments.length !== 0) {
            this.generateLineSegments();
        }
        if (!this.showingDecasteljauScheme) {
            this.hideDecasteljauScheme();
        }
        if (this.isShowingControlPolygon()) {
            this.showControlPolygon();
        }
    }

    showCurrentDecasteljauScheme(show?: boolean) {
        // TODO.... just look at it...
        if (show === undefined || show) {
            if (this.showingDecasteljauScheme) return;
            this.showDecasteljauScheme();
        } else {
            if (!this.showingDecasteljauScheme) return;
            this.hideDecasteljauScheme();
        }
    }


    isShowingDecasteljauScheme() {
        return this.showingDecasteljauScheme;
    }


    hideDecasteljauScheme() {
        this.decasteljauElements().forEach(el => el.hide());
        this.showingDecasteljauScheme = false;
        if (!this.isShowingControlPolygon()) {
            this.hideControlPolygon();
        }
    }

    showDecasteljauScheme() {
        if ((this.getCurve().getPoints().length > 1) && this.lastDecasteljauN !== this.pointControlledCurve.getPoints().length) {
            this.lastDecasteljauN = this.pointControlledCurve.getPoints().length;
            this.generateLineSegments();
        } else {
            this.decasteljauElements().forEach(el => el.show());
            this.showControlPolygonInternal();
        }
        this.showingDecasteljauScheme = true;
    }

    override exportState(): JXGBezierCurveState {
        return {
            ...super.exportState(),
            showingDecasteljauScheme: this.showingDecasteljauScheme,
            subdivisionT: this.subdivisionT,
            decasteljauT: this.decasteljauT,
            extrapolationT: this.extrapolationT
        } as JXGBezierCurveState;
    }

    override dispose(): void {
        const auxiliaryObjects = [
            ...this.decasteljauPoints,
            ...this.decasteljauSegments,
            ...this.elevationPoints,
            ...this.elevationSegments,
            this.subdivisionPoint,
            this.extrapolationPoint,
        ].filter((object): object is JXG.Point | JXG.Segment => object !== null);
        if (this.board.renderer && auxiliaryObjects.length > 0) {
            this.board.removeObject(Array.from(new Set(auxiliaryObjects)) as JXG.GeometryElement[]);
        }
        this.decasteljauPoints = [];
        this.decasteljauSegments = [];
        this.elevationPoints = [];
        this.elevationSegments = [];
        this.showingElevatePoints = false;
        this.subdivisionPoint = null;
        this.extrapolationPoint = null;
        this.cachedDecasteljauScheme = [];
        this.cacheRevision = -1;
        this.lastDecasteljauN = -1;
        this.showingDecasteljauScheme = false;
        this.showingDecasteljauPoints = false;
        super.dispose();
    }

    isShowingElevatePoints() {
        return this.showingElevatePoints;
    }

    /**
     * Shows the control points of the elevated curve as live points (recomputed from the current control
     * points on every update) joined by a dashed polyline. Idempotent.
     */
    showElevatePoints() {
        if (this.showingElevatePoints) return;
        this.showingElevatePoints = true;
        this.createElevatePoints();
    }

    hideElevatePoints() {
        this.showingElevatePoints = false;
        this.removeElevatePoints();
    }

    /** Recreates the overlay for the current number of control points when it is being shown. */
    rebuildElevatePoints() {
        if (!this.showingElevatePoints) return;
        this.removeElevatePoints();
        this.createElevatePoints();
    }

    private removeElevatePoints() {
        const objects = [...this.elevationSegments, ...this.elevationPoints];
        if (this.board.renderer && objects.length > 0) {
            this.board.removeObject(objects as JXG.GeometryElement[]);
        }
        this.elevationPoints = [];
        this.elevationSegments = [];
    }

    private createElevatePoints() {
        const count = this.pointControlledCurve.getPoints().length;
        if (count < 2) return;
        const at = (i: number) => elevatedControlPoints(this.pointControlledCurve.getPoints())[i];
        // One recomputation per index and coordinate is cheap (n is small); stay stateless to avoid stale caches.
        this.elevationPoints = Array.from({length: count + 1}, (_, i) => this.board.create('point', [
            () => (at(i) ?? [NaN, NaN])[0], () => (at(i) ?? [NaN, NaN])[1]], {
            ...this.styles.point.fixed,
            name: "",
        }) as JXG.Point);
        for (let i = 1; i < this.elevationPoints.length; i++) {
            this.elevationSegments.push(this.board.create('segment', [this.elevationPoints[i - 1], this.elevationPoints[i]], {
                ...this.styles.segment.controlPolygon,
            }) as JXG.Segment);
        }
    }

    generateLineSegments() {
        this.board.removeObject(this.decasteljauElements());
        this.decasteljauSegments = [];
        this.decasteljauPoints = [];
        const n = this.pointControlledCurve.getPoints().length;
        const compactLabels = () => this.board.canvasWidth < 480;
        this.showControlPolygonInternal();
        for (let r = 1; r < n; r++) {
            for (let i = 1; i < n - r; i++) {
                let pp1 = null;
                let pp2 = null;
                if (i === 1) {
                    pp1 = this.board.create('point', [() => this.getDecasteljauScheme(this.decasteljauT)[r][i - 1].X(),
                        () => this.getDecasteljauScheme(this.decasteljauT)[r][i - 1].Y()], {
                        ...this.styles.point.construction(r, i - 1, n, compactLabels),
                        name: () => this.showingDecasteljauPoints && this.showingDecasteljauScheme ? `$$p_${i - 1}^${r}$$` : ""
                    });
                } else {
                    pp1 = this.decasteljauPoints[this.decasteljauPoints.length - 1];
                }
                this.decasteljauPoints.push(pp1);

                pp2 = this.board.create('point', [() => this.getDecasteljauScheme(this.decasteljauT)[r][i].X(),
                    () => this.getDecasteljauScheme(this.decasteljauT)[r][i].Y()], {
                    ...this.styles.point.construction(r, i, n, compactLabels),
                    name: () => this.showingDecasteljauPoints && this.showingDecasteljauScheme ? `$$p_${i}^${r}$$` : ""
                });
                const segment = this.board!.create('segment', [pp1, pp2], this.styles.segment.construction(r, true));
                this.decasteljauSegments.push(segment);
                this.decasteljauPoints.push(pp1);
                this.decasteljauPoints.push(pp2);
            }
        }
        const drawingPoint = this.board?.create('point', [() => this.getDecasteljauScheme(this.decasteljauT)[n - 1][0].X(), () => this.getDecasteljauScheme(this.decasteljauT)[n - 1][0].Y()], {
            ...this.styles.point.result(n - 1, 0, n, compactLabels),
            name: () => this.showingDecasteljauPoints && this.showingDecasteljauScheme ? `$$p_${0}^${n - 1}$$` : ""
        });

        if (drawingPoint instanceof JXG.Point) {
            this.decasteljauPoints.push(drawingPoint);
        }
        this.jxgPoints.forEach((point, i) => point.setAttribute({name: () => this.showingDecasteljauPoints && this.showingDecasteljauScheme ? `$$p_${i}^0$$` : `$$p_${i}$$`}));

    }

    getDecasteljauScheme(t: number) {
        // Valid while the curve's version is unchanged; a volatile curve is never cached.
        const cacheRevision = versionOf(this.pointControlledCurve);
        if (cacheRevision !== VOLATILE && this.cacheRevision === cacheRevision && this.lastDecasteljauT === t) {
            return this.cachedDecasteljauScheme;
        } else {
            this.cachedDecasteljauScheme = this.pointControlledCurve.decasteljauScheme(t);
            this.cacheRevision = cacheRevision;
            this.lastDecasteljauT = t;
            return this.cachedDecasteljauScheme;
        }
    }

    getJXGDecasteljauPoints() {
        return this.decasteljauPoints;
    }

    override deselect() {
        if (this.subdivisionPoint) {
            this.board.removeObject(this.subdivisionPoint);
        }
        if (this.extrapolationPoint) {
            this.board.removeObject(this.extrapolationPoint);
        }
        super.deselect();
        this.subdivisionPoint = null;
        this.extrapolationPoint = null;
    }

    setSubdivisionT(t: number) {
        this.subdivisionT = t;
        this.board.update();
    }

    setExtrapolationT(t: number) {
        this.extrapolationT = t;
        this.board.update();
    }

    getExtrapolationT() {
        return this.extrapolationT;
    }

    createSubdivisionPoint() {
        if (this.board && !this.subdivisionPoint && this) {
            this.subdivisionPoint = this.board.create('point', [() => this.getCurve().eval(this.subdivisionT).X(),
                () => this.getCurve().eval(this.subdivisionT).Y()], this.styles.point.default) as JXG.Point;
            this.subdivisionPoint.hide();
        }
    }

    createExtrapolationPoint() {
        if (this.board && !this.extrapolationPoint && this) {
            this.extrapolationPoint = this.board.create('point', [() => this.getCurve().eval(this.extrapolationT).X(),
                () => this.getCurve().eval(this.extrapolationT).Y()], this.styles.point.default) as JXG.Point;
            this.extrapolationPoint.hide();
        }
    }

    showDecasteljauPoints() {
        this.showingDecasteljauPoints = true;
    }

    hideDecasteljauPoints() {
        this.showingDecasteljauPoints = false;
    }

    isShowingDecasteljauPoints() {
        return this.showingDecasteljauPoints;
    }

    showCutPoint() {
        this.setIntervalEnd(() => this.subdivisionT);
        this.subdivisionPoint?.show();
    }

    hideCutPoint() {
        this.setIntervalEnd(1);
        this.subdivisionPoint?.hide();
    }

    showSubdivisionPoint() {
        this.subdivisionPoint?.show();
    }

    hideSubdivisionPoint() {
        this.subdivisionPoint?.hide();
    }

    showExtrapolationPoint() {
        this.setIntervalEnd(() => this.extrapolationT);
        this.extrapolationPoint?.show();
    }

    hideExtrapolationPoint() {
        this.setIntervalEnd(1);
        this.extrapolationPoint?.hide();
    }

    setDecasteljauT(t: number) {
        // The coordinate callbacks read this value; callers own the board update.
        this.decasteljauT = t;
    }

    getDecasteljauT() {
        return this.decasteljauT;
    }

    getSubdivisionT() {
        return this.subdivisionT;
    }

}
