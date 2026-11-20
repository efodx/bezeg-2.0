import {AbstractJXGPointControlledCurve, PointControlledCurveAttributes} from "./AbstractJXGPointControlledCurve";
import {JXGBezierCurveState} from "./JXGBezierCurve";
import {BezierCurve} from "../../../bezeg/api/curve/bezier-curve";
import {Point} from "../../../bezeg/api/point/point";
import {elevate} from "../../../bezeg/impl/kernels/bezier-kernels";
import {versionOf, VOLATILE} from "../../../bezeg/impl/versioning";
import {sampleLine, type PxBox} from "../../legend/boardLabelPlacement";
import {estimatedSchemeLabelSize, placeSchemeLabels, SCHEME_LABEL_MIN_BOARD_PX, type SchemeLabelPlacement, type SchemeLabelPoint} from "./decasteljauLabels";

/** The parts of JSXGraph's point and text objects used to measure a label (the typings omit them). */
interface SizedLabel {
    size?: number[];
    coords?: {scrCoords: number[]};
    evalVisProp(name: string): unknown;
    getAnchorX(): string;
    getAnchorY(): string;
}
interface SizedPoint {
    label?: SizedLabel;
    evalVisProp?(name: string): unknown;
}

/** The curve is sampled at this many parameter steps as an obstacle for the scheme labels. */
const CURVE_SAMPLE_COUNT = 48;
/** A scheme label keeps its spot across parameter steps up to this size (the steps of an animation or a slider drag). */
const SCHEME_LABEL_STICKY_DT = 0.1;

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
    if (points.length === 0) return [];
    return elevate(points.map(point => [point.X(), point.Y()])) as [number, number][];
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
    private schemeLabelMemo?: {key: string; fixedKey: string; t: number; placed: ReadonlyMap<string, SchemeLabelPlacement>};
    private schemeLabelFrom: ReadonlyMap<string, readonly [number, number]> = new Map();
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
        this.resetSchemeLabels();
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
        this.resetSchemeLabels();
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
                        ...this.styles.point.construction(r, i - 1, n, compactLabels, this.schemeLabelOffset),
                        name: () => this.showingDecasteljauPoints && this.showingDecasteljauScheme ? `$$p_${i - 1}^${r}$$` : ""
                    });
                } else {
                    pp1 = this.decasteljauPoints[this.decasteljauPoints.length - 1];
                }
                this.decasteljauPoints.push(pp1);

                pp2 = this.board.create('point', [() => this.getDecasteljauScheme(this.decasteljauT)[r][i].X(),
                    () => this.getDecasteljauScheme(this.decasteljauT)[r][i].Y()], {
                    ...this.styles.point.construction(r, i, n, compactLabels, this.schemeLabelOffset),
                    name: () => this.showingDecasteljauPoints && this.showingDecasteljauScheme ? `$$p_${i}^${r}$$` : ""
                });
                const segment = this.board!.create('segment', [pp1, pp2], this.styles.segment.construction(r, true));
                this.decasteljauSegments.push(segment);
                this.decasteljauPoints.push(pp1);
                this.decasteljauPoints.push(pp2);
            }
        }
        const drawingPoint = this.board?.create('point', [() => this.getDecasteljauScheme(this.decasteljauT)[n - 1][0].X(), () => this.getDecasteljauScheme(this.decasteljauT)[n - 1][0].Y()], {
            ...this.styles.point.result(n - 1, 0, n, compactLabels, this.schemeLabelOffset),
            name: () => this.showingDecasteljauPoints && this.showingDecasteljauScheme ? `$$p_${0}^${n - 1}$$` : ""
        });

        if (drawingPoint instanceof JXG.Point) {
            this.decasteljauPoints.push(drawingPoint);
        }
        this.jxgPoints.forEach((point, i) => point.setAttribute({name: () => this.showingDecasteljauPoints && this.showingDecasteljauScheme ? `$$p_${i}^0$$` : `$$p_${i}$$`}));

    }

    /** Forgets the memoised scheme label placement and the remembered label spots (the scheme elements are being rebuilt or disposed). */
    private resetSchemeLabels() {
        this.schemeLabelMemo = undefined;
        this.schemeLabelFrom = new Map();
    }

    /** The label offset (px, y up) the shared placement chose for scheme point `p_index^level`; null on narrow boards or while the labels are hidden. */
    private schemeLabelOffset = (level: number, index: number): readonly [number, number] | null => {
        const placed = this.schemeLabelPlacement()?.get(`${level}-${index}`);
        return placed ? placed.offset : null;
    };

    /** One placement per board state: the memo key is the board metrics, the control points, t, the font size and the measured label size. */
    private schemeLabelPlacement(): ReadonlyMap<string, SchemeLabelPlacement> | undefined {
        const board = this.board;
        const width = board?.canvasWidth, height = board?.canvasHeight;
        if (!(width >= SCHEME_LABEL_MIN_BOARD_PX) || !(height > 0) || !this.showingDecasteljauPoints || !this.showingDecasteljauScheme) return undefined;
        const settings = this.displaySettings;
        if (!settings.pointLabelsVisible) return undefined;
        const t = this.decasteljauT;
        const levels = this.getDecasteljauScheme(t);
        if (levels.length < 2) return undefined;
        const origin = board.origin.scrCoords, ux = board.unitX, uy = board.unitY;
        const px = (p: Point): readonly [number, number] => [origin[1] + p.X() * ux, origin[2] - p.Y() * uy];
        // JSXGraph measures a typeset label too tall (a 22 x 72 px box round a glyph about 26 px high), so the height is estimated; the width is measured when plausible.
        const [estimatedW, h] = estimatedSchemeLabelSize(settings.fontSize);
        const measuredW = this.decasteljauPoints.map(point => (point as unknown as SizedPoint).label?.size?.[0]).find((width): width is number => !!width && width > 1);
        const w = measuredW && measuredW >= estimatedW * 0.6 && measuredW <= estimatedW * 2 ? measuredW : estimatedW;
        // Only t changes between the frames of an animation: then a label keeps its spot (`prefer`). Any other change places the labels afresh.
        const fixedKey = [width, height, origin[1], origin[2], ux, uy, settings.fontSize, w, h, levels[0].map(p => `${p.X()},${p.Y()}`).join(";")].join("|");
        const key = `${fixedKey}|${t}`;
        if (this.schemeLabelMemo?.key === key) return this.schemeLabelMemo.placed;
        // A jump in t (a lesson action, a preset) places the labels afresh: the old spots belonged to another picture.
        if (this.schemeLabelMemo?.fixedKey !== fixedKey || Math.abs(t - this.schemeLabelMemo.t) > SCHEME_LABEL_STICKY_DT) this.schemeLabelFrom = new Map();

        const markerRadius = Number((this.jxgPoints[0] as unknown as SizedPoint | undefined)?.evalVisProp?.("size")) || 5;
        const points: SchemeLabelPoint[] = [];
        const markers: Array<readonly [number, number, number]> = [];
        const samples: Array<readonly [number, number]> = [];
        const toPx = (x: number, y: number): readonly [number, number] => [origin[1] + x * ux, origin[2] - y * uy];
        levels.forEach((full, r) => {
            // The scheme pads every level to the number of control points; level r has n - r points.
            const level = full.slice(0, levels[0].length - r);
            const coords = level.map(px);
            coords.forEach(([x, y], index) => {
                markers.push([x, y, markerRadius - 3]);
                if (r > 0) points.push({id: `${r}-${index}`, level: r, index, x, y, w, h});
            });
            samples.push(...sampleLine(level.map(p => p.X()), level.map(p => p.Y()), toPx, width, height, 9, 200));
        });
        const curve = this.getCurve();
        const curveX: number[] = [], curveY: number[] = [];
        for (let k = 0; k <= CURVE_SAMPLE_COUNT; k++) {
            const p = curve.eval(k / CURVE_SAMPLE_COUNT);
            curveX.push(p.X());
            curveY.push(p.Y());
        }
        samples.push(...sampleLine(curveX, curveY, toPx, width, height, 9, 400));

        const occupied: PxBox[] = [];
        for (const point of this.jxgPoints) {
            const label = (point as unknown as SizedPoint).label;
            if (!label || !label.evalVisProp("visible") || !label.size || !label.coords) continue;
            const [, lx, ly] = label.coords.scrCoords;
            const [lw, lh] = label.size;
            if (![lx, ly, lw, lh].every(Number.isFinite) || lw <= 1) continue;
            const x0 = label.getAnchorX() === "right" ? lx - lw : label.getAnchorX() === "middle" ? lx - lw / 2 : lx;
            const y1 = label.getAnchorY() === "top" ? ly + lh : label.getAnchorY() === "middle" ? ly + lh / 2 : ly;
            // The glyph is centred in the measured box (22 x 72 px round a glyph of 22 x 26 px).
            const centre = y1 - lh / 2;
            occupied.push({x0, y0: centre - h / 2, x1: x0 + lw, y1: centre + h / 2});
        }
        const strips: PxBox[] = [];
        type Tick = {evalVisProp(name: string): unknown; plaintext?: string; coords?: {scrCoords: number[]}};
        const axes = (board as unknown as {defaultAxes?: {x?: {defaultTicks?: {labels?: Tick[]}}; y?: {defaultTicks?: {labels?: Tick[]}}}}).defaultAxes;
        for (const [axis, ticks] of [["x", axes?.x?.defaultTicks?.labels], ["y", axes?.y?.defaultTicks?.labels]] as const) {
            for (const tick of ticks ?? []) {
                const [, sx, sy] = tick.coords?.scrCoords ?? [];
                if (!tick.evalVisProp("visible") || !Number.isFinite(sx) || !Number.isFinite(sy) || !tick.plaintext) continue;
                const tw = tick.plaintext.length * 7 + 10, th = 20;
                strips.push(axis === "x" ? {x0: sx - tw / 2, y0: sy, x1: sx + tw / 2, y1: sy + th} : {x0: sx - tw, y0: sy - th / 2, x1: sx, y1: sy + th / 2});
            }
        }
        const placed = placeSchemeLabels({
            width, height, points, markers, samples, strips, occupied, axisX: origin[1], axisY: origin[2], previous: this.schemeLabelFrom,
        });
        this.schemeLabelFrom = new Map([...placed].map(([id, value]) => [id, value.from]));
        this.schemeLabelMemo = {key, fixedKey, t, placed};
        return placed;
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
