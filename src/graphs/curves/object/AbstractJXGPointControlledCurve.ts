import type {DisplaySettings} from "../../base/DisplaySettings";
import {GraphStyles, settingsForBoard, stylesForBoard} from "../../styles/GraphStyles";
import {Board, PointAttributes, SegmentAttributes} from "jsxgraph";
import {JXGPointWrapper} from "./JXGPointWrapper";
import {PointControlledCurve} from "../../../bezeg/api/curve/point-controlled-curve";
import {dynamicAttributes} from "../../styles/dynamicAttributes";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {Point} from "../../../bezeg/api/point/point";
import {ModelPointBinding} from "./ModelPointBinding";
import {graphSessionForBoard} from "../../base/GraphSession";
import {GraphPalette} from "../../styles/GraphPalette";
import {bindMovablePointCursor} from "../../base/bindMovablePointCursor";
import {assertPlanarPoints} from "../../../bezeg/impl/point/planar-guard";

export interface PointControlledCurveAttributes {
    allowShowControlPolygon: boolean
    allowShowConvexHull: boolean,
    allowShowPoints: boolean,
    selectable: boolean | undefined
}

export interface PointControlledCurveState {
    showingControlPolygon: boolean;
    showingJxgPoints: boolean;
    showingConvexHull: boolean;
    evaluationPointT?: number;
}

const pendingFullUpdates = new WeakSet<object>();

export function evaluationPointLabel(t: number): string {
    return t === 0.5 ? '$$B(\\frac{1}{2})$$' : `$$B(${t})$$`;
}

/**
 * JSXGraph cannot infer dependencies hidden behind callback-based curve
 * coordinates. A control-point drag therefore needs both math-cache
 * invalidation and a full board pass to redraw those callbacks.
 */
export function refreshAfterControlPointDrag(board: Pick<Board, 'fullUpdate'>): void {
    const session = graphSessionForBoard(board as Board);
    if (session) {
        session.requestFullUpdate();
        return;
    }
    const boardState = board as Board & {inUpdate?: boolean};
    if (!boardState.inUpdate) {
        board.fullUpdate();
        return;
    }
    if (pendingFullUpdates.has(board)) return;
    pendingFullUpdates.add(board);
    setTimeout(() => {
        pendingFullUpdates.delete(board);
        board.fullUpdate();
    }, 0);
}

/**
 * Class that wraps a PointControlledCurve with methods for dealing with JSXGraph
 */
export abstract class AbstractJXGPointControlledCurve<T extends PointControlledCurve, Attr extends PointControlledCurveAttributes> {
    coords?: JXG.Coords;
    jxgPoints: JXG.Point[] = [];
    readonly pointControlledCurve: T;
    readonly board: Board;

    /** Display settings of the graph that owns this curve's board. */
    protected get displaySettings(): DisplaySettings {
        return settingsForBoard(this.board);
    }

    /** Style presets bound to the display settings of the graph that owns this curve's board. */
    protected get styles(): GraphStyles {
        return stylesForBoard(this.board);
    }
    protected boundBoxPoints: JXG.Point[] = [];
    protected resizingStart: JXG.Point | undefined;
    private jxgCurve: JXG.Curve;
    private boundBoxSegments: JXG.Segment[] = [];
    private convexHull: JXG.Polygon | undefined = undefined;
    private evaluationPoint: JXG.Point | undefined;
    private evaluationPointT?: number;
    private selected: boolean = false;
    private dragging: boolean = false;
    private rotating: boolean = false;
    private resizing: boolean = false;
    private intervalStart: number | (() => number) = 0;
    private intervalEnd: number | (() => number) = 1;
    private controlPolygonSegments: JXG.Segment[] = [];
    private showingControlPolygon: boolean = false;
    private showingJxgPoints: boolean = true;
    private showingConvexHull: boolean = false;
    private rotationCenter?: number[];
    private readonly convexHullRefresher = this.refreshConvexHull.bind(this);
    private attributes: Attr = {allowShowControlPolygon: true} as Attr;
    private readonly editablePointBindings = new Map<PointImpl, ModelPointBinding>();
    private readonly editablePointsByJxgPoint = new Map<JXG.Point, PointImpl>();

    constructor(points: number[][], board: Board, attributes?: Attr) {
        if (points.some(point => point.length > 2 && point[2] !== 0)) {
            throw new Error("JSXGraph curve adapters only support planar points (z must be 0).");
        }
        this.board = board;
        this.setAttributes(this.getDefaultAttributes());
        if (attributes) {
            this.setAttributes(attributes);
        }
        this.pointControlledCurve = this.getInitialCurve(points);
        // TODO the starting curve is hardly ever actually used... Maybe think differently about this.
        this.jxgCurve = this.board.create('curve',
            [(t: number) => {
                return this.pointControlledCurve.eval(t).X();
            },
                (t: number) => {
                    return this.pointControlledCurve.eval(t).Y();
                },
                () => {
                    if (typeof this.intervalStart == "number") {
                        return this.intervalStart;
                    }
                    return this.intervalStart();
                },
                () => {
                    if (typeof this.intervalEnd == "number") {
                        return this.intervalEnd;
                    }
                    return this.intervalEnd();
                }],
            this.styles.curve.default
        );
        this.addBoundingBox();
        this.hideBoundingBox();
        this.board.on("update", this.convexHullRefresher);
    }

    getDefaultAttributes(): Attr {
        return {allowShowControlPolygon: true, allowShowConvexHull: true} as Attr;
    }


    isShowingControlPolygon() {
        return this.showingControlPolygon;
    }

    setIntervalStart(t: number | (() => number)) {
        this.intervalStart = t;
    }

    setIntervalEnd(t: number | (() => number)) {
        this.intervalEnd = t;
    }

    addPoint(x: number, y: number) {
        let p = this.createEditableInputPoint(x, y, this.styles.point.pi(this.pointControlledCurve.getPoints().length, () => this.isShowingJxgPoints()));
        this.pointControlledCurve.addPoint(p);
        this.labelJxgPoints();
    }

    removePoint(i: number) {
        const point = this.pointControlledCurve.getPoints()[i];
        const jxgPoint = this.jxgPoints[i];
        if (point instanceof PointImpl) this.unbindEditableInputPoint(point);
        if (jxgPoint) {
            this.board.removeObject(jxgPoint);
            this.jxgPoints.splice(i, 1);
        }
        if (point) this.pointControlledCurve.removePoint(point);
        this.labelJxgPoints();
    }

    labelJxgPoints() {
        this.getJxgPoints().forEach((point, i) => point.setName(this.styles.point.pi(i, () => this.isShowingJxgPoints()).name as string));
    }

    move(newCoords: JXG.Coords) {
        let [dx, dy] = [newCoords.usrCoords[1] - this.coords!.usrCoords[1], newCoords.usrCoords[2] - this.coords!.usrCoords[2]];
        this.pointControlledCurve.moveFor(dx, dy);
    }

    resize(newCoords: JXG.Coords) {
        let [minX, maxX, minY, maxY] = this.pointControlledCurve.getBoundingBox();
        let [dx, dy] = [newCoords.usrCoords[1] - this.coords!.usrCoords[1], newCoords.usrCoords[2] - this.coords!.usrCoords[2]];
        let [xDir, yDir] = this.getResizingDir();
        dx = dx * xDir;
        dy = dy * yDir;
        let xScale = (2 * dx + maxX - minX) / (maxX - minX);
        let yScale = (2 * dy + maxY - minY) / (maxY - minY);
        this.pointControlledCurve.scale(xScale, yScale);
    }

    rotate(newCoords: JXG.Coords) {
        let [xCenter, yCenter] = this.rotationCenter!;
        let k1, k2;
        k1 = (yCenter - newCoords.usrCoords[2]) / (xCenter - newCoords.usrCoords[1]);
        k2 = (yCenter - this.coords!.usrCoords[2]) / (xCenter - this.coords!.usrCoords[1]);
        let theta = Math.atan((k1 - k2) / (1 + k1 * k2));
        this.pointControlledCurve.rotate(theta);
    }

    processMouseUp(e: PointerEvent) {
        const newCoords = this.getMouseCoords(e);
        if (this.dragging) {
            this.stopDragging();
            this.move(newCoords);
            return;
        }
        if (this.resizing) {
            this.stopResizing();
            this.resize(newCoords);
            return;
        }
        if (this.rotating) {
            this.stopRotating();
            this.rotate(newCoords);
            return;
        }
    }

    isSelectable(e: PointerEvent) {
        if (this.attributes.selectable === false) {
            return false;
        }
        let coords = this.getMouseCoords(e);
        return this.jxgCurve?.hasPoint(coords.scrCoords[1], coords.scrCoords[2]);
        //&& !this.jxgPoints.some(point => point.hasPoint(coords.scrCoords[1], coords.scrCoords[2]))
    }

    processMouseDown(e: PointerEvent) {
        this.coords = this.getMouseCoords(e);
        if (this.selected && this.boundBoxPoints?.some(point => point.hasPoint(this.coords!.scrCoords[1], this.coords!.scrCoords[2]))) {
            this.startResizing();
        } else if (this.selected && !this.isMouseInsideBoundingBox() && this.isMouseInsidePaddedBoundingBox()) {
            this.startRotating();
        }
        if (this.selected && !this.resizing && !this.rotating) {
            this.startDragging();
        }
    }

    processMouseMove(e: PointerEvent) {
        const newCoords = this.getMouseCoords(e);
        if (this.dragging) {
            this.move(newCoords);
        }
        if (this.resizing) {
            this.resize(newCoords);
        }
        if (this.rotating) {
            this.rotate(newCoords);
        }
        this.board.update();
        this.coords = newCoords;
    }

    needToProcessMoveEvent() {
        return this.dragging || this.resizing || this.rotating;
    }

    getResizingDir(): number[] {
        if (this.boundBoxPoints[0].hasPoint(this.coords!.scrCoords[1], this.coords!.scrCoords[2])) {
            return [-1, -1];
        }
        if (this.boundBoxPoints[1].hasPoint(this.coords!.scrCoords[1], this.coords!.scrCoords[2])) {
            return [-1, 1];
        }
        if (this.boundBoxPoints[2].hasPoint(this.coords!.scrCoords[1], this.coords!.scrCoords[2])) {
            return [1, 1];
        }
        return [1, -1];
    }

    startResizing() {
        this.resizingStart = this.boundBoxPoints?.filter(point => point.hasPoint(this.coords!.scrCoords[1], this.coords!.scrCoords[2]))[0]!;
        this.resizing = true;
    }

    stopResizing() {
        this.resizing = false;
    }

    startDragging() {
        this.dragging = true;
    }

    stopDragging() {
        this.dragging = false;
    }

    startRotating() {
        this.rotating = true;
        this.rotationCenter = [this.jxgPoints.map(point => point.X()).reduce((previousValue, currentValue) => previousValue + currentValue) / this.jxgPoints.length,
            this.jxgPoints.map(point => point.Y()).reduce((previousValue, currentValue) => previousValue + currentValue) / this.jxgPoints.length];
        this.hideBoundingBox();
    }

    stopRotating() {
        this.rotating = false;
        this.showBoundingBox();
    }

    showControllPolygon(show: boolean) {
        if (show) {
            this.showControlPolygon();
        } else {
            this.hideControlPolygon();
        }
    }

    showControlPolygon() {
        this.showControlPolygonInternal();
        this.showingControlPolygon = true;
    }

    hideControlPolygon() {
        this.controlPolygonSegments.forEach(segment => segment.hide());
        this.showingControlPolygon = false;
    }

    select() {
        if (this.selected) {
            return;
        }
        this.jxgPoints.forEach(point => point.setAttribute({fixed: true}));
        this.showBoundingBox();
        this.selected = true;
    }

    deselect() {
        if (!this.selected) {
            return;
        }
        this.jxgPoints.forEach(point => point.setAttribute({fixed: false}));
        this.hideBoundingBox();
        this.selected = false;
    }

    isSelected() {
        return this.selected;
    }

    getCurve() {
        return this.pointControlledCurve;
    }

    getJxgCurve() {
        return this.jxgCurve;
    }

    getJxgPoints(): JXG.Point[] {
        return this.jxgPoints;
    }

    showEvaluationPoint(t: number): void {
        if (!Number.isFinite(t) || t < 0 || t > 1) {
            throw new Error('The curve evaluation parameter must be between 0 and 1.');
        }
        this.hideEvaluationPoint();
        this.evaluationPointT = t;
        this.evaluationPoint = this.board.create('point', [
            () => this.pointControlledCurve.eval(t).X(),
            () => this.pointControlledCurve.eval(t).Y(),
        ], {
            ...this.styles.point.fixed,
            name: evaluationPointLabel(t),
        });
        this.board.fullUpdate();
    }

    hideEvaluationPoint(): void {
        if (this.evaluationPoint) {
            this.board.removeObject(this.evaluationPoint);
            this.evaluationPoint = undefined;
        }
        this.evaluationPointT = undefined;
    }

    /** Remove the base JSXGraph objects owned by this curve before its scene is replaced. */
    dispose(): void {
        this.disposeEditableInputPoints();
        if (!this.board.renderer) {
            this.convexHull = undefined;
            this.evaluationPoint = undefined;
            this.evaluationPointT = undefined;
            this.controlPolygonSegments = [];
            this.boundBoxSegments = [];
            this.boundBoxPoints = [];
            this.jxgPoints = [];
            return;
        }
        this.board.off('update', this.convexHullRefresher);
        const ownedObjects = [
            this.convexHull,
            this.evaluationPoint,
            ...this.controlPolygonSegments,
            ...this.boundBoxSegments,
            ...this.boundBoxPoints,
            this.jxgCurve,
            ...this.jxgPoints,
        ].filter(object => object !== undefined).reverse() as JXG.GeometryElement[];
        this.board.removeObject(ownedObjects);
        this.convexHull = undefined;
        this.evaluationPoint = undefined;
        this.evaluationPointT = undefined;
        this.controlPolygonSegments = [];
        this.boundBoxSegments = [];
        this.boundBoxPoints = [];
        this.jxgPoints = [];
    }

    showBoundingBox() {
        this.boundBoxSegments.map(segment => segment.show());
        this.boundBoxPoints.map(point => point.show());
    }

    hideBoundingBox() {
        this.boundBoxSegments.map(segment => segment.hide());
        this.boundBoxPoints.map(point => point.hide());
    }

    isMouseInsideBoundingBox() {
        let [minX, maxX, minY, maxY] = this.pointControlledCurve.getBoundingBox();
        let x = this.coords!.usrCoords[1];
        let y = this.coords!.usrCoords[2];
        return (x < maxX && x > minX && y < maxY && y > minY);
    }

    isMouseInsidePaddedBoundingBox() {
        // this is so we can actually rotate and resize the curve
        let padding = 0.3;
        let [minX, maxX, minY, maxY] = this.pointControlledCurve.getBoundingBox();
        minX = minX - padding;
        maxX = maxX + padding;
        minY = minY - padding;
        maxY = maxY + padding;
        let x = this.coords!.usrCoords[1];
        let y = this.coords!.usrCoords[2];
        return (x < maxX && x > minX && y < maxY && y > minY);
    }

    hideJxgPoints() {
        this.showingJxgPoints = false;
    }

    showJxgPoints(show?: boolean) {
        if (show === undefined || show) {
            this.showingJxgPoints = true;
        } else {
            this.hideJxgPoints();
        }
    }


    isShowingJxgPoints() {
        return this.showingJxgPoints;
    }

    hasPoint(x: number, y: number) {
        return this.jxgCurve.hasPoint(x, y);
    }

    showConvexHull(show: boolean) {
        if (show) {
            this.showingConvexHull = true;
        } else {
            this.showingConvexHull = false;
        }
        this.board.update();
    }

    isShowingConvexHull() {
        return this.showingConvexHull;
    }

    getAttributes(): Attr {
        return this.attributes;
    }

    exportState() {
        return {
            showingJxgPoints: this.showingJxgPoints,
            showingControlPolygon: this.showingControlPolygon,
            showingConvexHull: this.showingConvexHull,
            evaluationPointT: this.evaluationPointT,
        } as PointControlledCurveState;
    }

    importState(state: PointControlledCurveState) {
        this.showConvexHull(state.showingConvexHull);
        this.showControllPolygon(state.showingControlPolygon);
        this.showJxgPoints(state.showingJxgPoints);
        if (typeof state.evaluationPointT === 'number') {
            this.showEvaluationPoint(state.evaluationPointT);
        } else {
            this.hideEvaluationPoint();
        }
    }

    setAttributes(attributes: Attr) {
        this.attributes = {...this.attributes, ...attributes};
    }

    showJxgPointss(show: boolean) {
        this.board.suspendUpdate();
        if (show) {
            this.showJxgPoints();
        } else {
            this.hideJxgPoints();
        }
        this.board.unsuspendUpdate();
    }

    processMouseCursor(e: PointerEvent) {
        const newCoords = this.getMouseCoords(e);
        const oldCoords = this.coords;
        this.coords = newCoords;

        if (this.isMouseInsideBoundingBox()) {
            this.board.containerObj.style.cursor = 'move';
        } else if (!this.isMouseInsideBoundingBox() && this.isMouseInsidePaddedBoundingBox()) {
            this.board.containerObj.style.cursor = 'pointer';
        } else {
            this.board.containerObj.style.cursor = 'default';
        }
        this.boundBoxPoints.forEach((p, i) => {
            if (p.hasPoint(newCoords.scrCoords[1], newCoords.scrCoords[2])) {
                this.board.containerObj.style.cursor = i % 2 !== 0 ? 'nwse-resize' : 'nesw-resize';
            }
        });

        this.coords = oldCoords;
    }

    protected abstract getInitialCurve(points: number[][]): T

    /**
     * Creates a JSXGraph point ands wraps it with the Point interface.
     * @param x
     * @param y
     * @param opts
     */
    protected createJSXGraphPoint(x: number | (() => number), y: number | (() => number), opts?: any): JXGPointWrapper {
        return new JXGPointWrapper(this.createJXGPoint(x, y, opts));
    }

    protected createEditableInputPoint(x: number, y: number, opts?: any): PointImpl {
        const modelPoint = new PointImpl(x, y);
        const jxgPoint = this.createJXGPoint(x, y, opts, false);
        const binding = new ModelPointBinding(modelPoint, jxgPoint, () => refreshAfterControlPointDrag(this.board));
        this.editablePointBindings.set(modelPoint, binding);
        this.editablePointsByJxgPoint.set(jxgPoint, modelPoint);
        return modelPoint;
    }

    protected replaceEditablePoints(points: Point[]): void {
        assertPlanarPoints(points, "JSXGraph curve adapter");
        this.clearJxgPoints();
        const editablePoints = points.map((point, i) => this.createEditableInputPoint(
            point.X(),
            point.Y(),
            this.styles.point.pi(i, () => this.isShowingJxgPoints()),
        ));
        this.pointControlledCurve.setPoints(editablePoints);
    }

    protected getEditableInputPoint(jxgPoint: JXG.Point): PointImpl | undefined {
        return this.editablePointsByJxgPoint.get(jxgPoint);
    }

    protected unbindEditableInputPoint(point: PointImpl): void {
        const binding = this.editablePointBindings.get(point);
        if (!binding) return;
        binding.dispose();
        this.editablePointBindings.delete(point);
        for (const [jxgPoint, boundPoint] of this.editablePointsByJxgPoint) {
            if (boundPoint === point) this.editablePointsByJxgPoint.delete(jxgPoint);
        }
    }

    private disposeEditableInputPoints(): void {
        this.editablePointBindings.forEach(binding => binding.dispose());
        this.editablePointBindings.clear();
        this.editablePointsByJxgPoint.clear();
    }

    private createJXGPoint(x: number | (() => number), y: number | (() => number), opts?: any, refreshOnDrag = true): JXG.Point {
        let point: JXG.Point;
        if (opts) {
            point = this.board.create('point', [x, y], opts);
        } else {
            point = this.board.create('point', [x, y]);
        }
        bindMovablePointCursor(point, this.board);
        if (refreshOnDrag) {
            point.on('drag', () => refreshAfterControlPointDrag(this.board));
        }
        this.jxgPoints.push(point);
        return point;
    }

    protected movePointsToNewPoints(newPoints: any[]) {
        newPoints.forEach(
            (point, i) => {
                this.pointControlledCurve.getPoints()[i].setX(point.X());
                this.pointControlledCurve.getPoints()[i].setY(point.Y());
            }
        );
    }

    /**
     * Removes jxgPoints from the board and empties the jxgPoints array.
     * @private
     */
    protected clearJxgPoints() {
        this.disposeEditableInputPoints();
        this.board.removeObject(this.jxgPoints);
        this.jxgPoints = [];
    }

    protected showControlPolygonInternal() {
        if (this.controlPolygonSegments.length !== 0 && (this.controlPolygonSegments.length + 1 === this.pointControlledCurve.getPoints().length)) {
            this.controlPolygonSegments.forEach(segment => segment.show());
        } else {
            this.board!.removeObject(this.controlPolygonSegments);
            this.controlPolygonSegments = [];

            const segmentPoints = this.getJxgPoints();
            for (let i = 1; i < segmentPoints.length; i = i + 1) {
                const segment = this.board.create('segment', [segmentPoints[i - 1], segmentPoints[i]], this.styles.segment.controlPolygon);
                this.controlPolygonSegments.push(segment);
            }
        }
    }

    private hideHullInternal() {
        if (this.convexHull) {
            this.board.removeObject(this.convexHull);
            this.convexHull = undefined;
        }
    }

    private showHullInternal() {
        const hull = this.getCurve().getConvexHull();
        const jxgPoints = hull.map(p => this.jxgPoints.filter(point => point.X() === p.X() && point.Y() === p.Y())[0]);
        if (jxgPoints.filter(p => p !== undefined).length !== hull.length) {
            return;
        }
        this.convexHull = this.board.create('polygon', [...jxgPoints, jxgPoints[0]], {
            ...this.styles.segment.default,
            borders: {...this.styles.segment.default},
            fillOpacity: 0.175
        });
    }

    private addBoundingBox() {
        var board = this.board;
        let over = function (p: JXG.Point) {
            if (!p.visProp.fixed) {
                board.containerObj.style.cursor = 'pointer';
            }
        };
        let out = function (p: JXG.Point) {
            if (!p.visProp.fixed) {
                board.containerObj.style.cursor = 'default';
            }
        };
        const pointStyle = dynamicAttributes<PointAttributes>({name: "", color: GraphPalette.controlPolygon, opacity: 0.4, size: () => this.displaySettings.pointSize});
        const p = this.board.create('point', [() => this.pointControlledCurve.getBoundingBox()[0], () => this.pointControlledCurve.getBoundingBox()[2]], pointStyle);
        const p2 = this.board.create('point', [() => this.pointControlledCurve.getBoundingBox()[0], () => this.pointControlledCurve.getBoundingBox()[3]], pointStyle);
        const p3 = this.board.create('point', [() => this.pointControlledCurve.getBoundingBox()[1], () => this.pointControlledCurve.getBoundingBox()[3]], pointStyle);
        const p4 = this.board.create('point', [() => this.pointControlledCurve.getBoundingBox()[1], () => this.pointControlledCurve.getBoundingBox()[2]], pointStyle);
        this.boundBoxPoints = [p, p2, p3, p4];
        this.boundBoxPoints.forEach(p => p.on('over', () => over(p)));
        this.boundBoxPoints.forEach(p => p.on('out', () => out(p)));

        const segmentStyle: SegmentAttributes = {color: GraphPalette.constructionAccent, strokeWidth: 0.5, dash: 2, highlight: false};
        const segment = this.board.create('segment', [p, p2], segmentStyle);
        const segment2 = this.board.create('segment', [p2, p3], segmentStyle);
        const segment3 = this.board.create('segment', [p3, p4], segmentStyle);
        const segment4 = this.board.create('segment', [p4, p], segmentStyle);
        this.boundBoxSegments = [segment, segment2, segment3, segment4];
    }

    private getMouseCoords(e: PointerEvent) {
        const pos = this.board.getMousePosition(e);
        return new JXG.Coords(JXG.COORDS_BY_SCREEN, pos, this.board as Board);
    }

    private refreshConvexHull() {
        if (this.showingConvexHull) {
            this.hideHullInternal();
            this.showHullInternal();
        } else {
            this.hideHullInternal();
        }
    }
}
