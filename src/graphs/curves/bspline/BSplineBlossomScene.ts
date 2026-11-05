import type {Board, GeometryElement, Point, Segment, Text} from "jsxgraph";
import {onLanguageChange} from "../../../localization";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {JXGBSplineCurve} from "../object/JXGBSplineCurve";
import {constructionLevelColor, constructionLevelDash, GraphPalette} from "../../styles/GraphPalette";
import type {ControlPoint} from "./bsplineDeBoorModel";
import {blossomArgumentText, BlossomSnapshot, blossomSnapshot} from "./bsplineBlossomModel";

interface SceneSettings {
    board: Board;
    /** Read lazily: the scene state is the only copy of the data; the model curve is rebuilt from it by {@link BSplineBlossomScene.sync}. */
    degree: () => number;
    knots: () => readonly number[];
    points: () => readonly ControlPoint[];
    segment: () => number;
    args: () => readonly number[];
    showBezier: () => boolean;
    fontSize: () => number;
    /** A drag of a control point reports every point's coordinates, so the owner writes them to the state. */
    onPointsDrag: (points: ControlPoint[]) => void;
}

/**
 * The owned board objects of the blossom graph for one degree and control-point count: the B-spline curve layer
 * ({@link JXGBSplineCurve}), the blossom triangle (levels 1..k of the kernel's triangle with their segments, the last point labelled
 * f(args)) and the segment's Bezier points with their polygon (shown on request). A change of degree or point count builds a new scene.
 */
export class BSplineBlossomScene {
    private readonly board: Board;
    readonly degree: number;
    readonly pointCount: number;
    readonly curve: JXGBSplineCurve;
    private elements: GeometryElement[] = [];
    private levelPoints: Point[][] = [];
    private bezierPoints: Point[] = [];
    private bezierSegments: Segment[] = [];
    private label?: Text;
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private cacheKey = '';
    private cached: BlossomSnapshot | undefined;

    constructor(private readonly settings: SceneSettings) {
        this.board = settings.board;
        this.degree = settings.degree();
        this.pointCount = settings.points().length;
        this.curve = new JXGBSplineCurve(settings.points().map(point => [point[0], point[1]]), this.degree, settings.knots(), undefined, this.board);
        try {
            this.build();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    ownedElements(): readonly GeometryElement[] { return this.elements; }
    /** The points of level r = 1..k. */
    levelElements(level: number): readonly Point[] { return this.levelPoints[level] ?? []; }
    bezierElements(): readonly Point[] { return this.bezierPoints; }
    bezierSegmentElements(): readonly Segment[] { return this.bezierSegments; }
    labelElement(): Text | undefined { return this.label; }

    fits(degree: number, pointCount: number): boolean {
        return degree === this.degree && pointCount === this.pointCount;
    }

    /** The snapshot of the model curve's current points (they lead the state during a drag); cached while its inputs are unchanged. */
    snapshot(): BlossomSnapshot | undefined {
        const model = this.curve.getCurve();
        const points = model.getPoints().map(point => [point.X(), point.Y()] as ControlPoint);
        const key = `${this.settings.segment()}|${this.settings.args().join(',')}|${model.getKnots().join(',')}|${points.join(';')}`;
        if (key !== this.cacheKey) {
            this.cached = blossomSnapshot(model.getKnots(), this.degree, points, this.settings.segment(), this.settings.args());
            this.cacheKey = key;
        }
        return this.cached;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const quiet = {fixed: true, highlight: false, withLabel: false, name: ''};
        const k = this.degree;
        const coordinate = (read: (s: BlossomSnapshot) => ControlPoint, axis: 0 | 1) => () => {
            const snap = this.snapshot();
            return snap ? read(snap)[axis] : NaN;
        };
        const bezierColor = GraphPalette.controlPoint;
        for (let i = 0; i <= k; i++) {
            const marker = this.create<Point>('point', [coordinate(s => s.bezier[i], 0), coordinate(s => s.bezier[i], 1)], {
                ...quiet, size: 6, face: 'diamond', strokeColor: bezierColor, fillColor: 'none', strokeWidth: 2, visible: () => this.settings.showBezier(),
            });
            // Markers sit on draggable control points: they must never take a pointer hit from them.
            marker.hasPoint = () => false;
            this.bezierPoints.push(marker);
        }
        for (let i = 0; i < k; i++) {
            this.bezierSegments.push(this.create<Segment>('segment', [this.bezierPoints[i], this.bezierPoints[i + 1]], {
                ...quiet, strokeColor: bezierColor, strokeWidth: 1.5, dash: 3, visible: () => this.settings.showBezier(),
            }));
        }
        for (let r = 1; r <= k; r++) {
            const count = k + 1 - r;
            const color = r === k ? GraphPalette.constructionAccent : constructionLevelColor(r);
            const points: Point[] = [];
            for (let i = 0; i < count; i++) {
                points.push(this.create<Point>('point', [coordinate(s => s.levels[r][i], 0), coordinate(s => s.levels[r][i], 1)], {
                    ...quiet, size: r === k ? 5 : 4, strokeColor: color, fillColor: color,
                }));
            }
            this.levelPoints[r] = points;
            for (let i = 0; i + 1 < count; i++) {
                this.create<Segment>('segment', [points[i], points[i + 1]], {...quiet, strokeColor: color, strokeWidth: 1.5, dash: constructionLevelDash(r)});
            }
        }
        const final = this.levelPoints[k][0];
        this.label = this.create<Text>('text', [() => final.X() + 0.1, () => final.Y() + 0.1, () => this.labelText()], {
            anchorX: 'left', anchorY: 'bottom', fixed: true, highlight: false, useMathJax: false, fontSize: () => this.settings.fontSize(),
            strokeColor: GraphPalette.label,
        });
        this.curve.getJxgPoints().forEach(point => point.on('drag', () => this.settings.onPointsDrag(
            this.curve.getJxgPoints().map(p => [p.X(), p.Y()] as ControlPoint))));
        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && this.board.renderer) this.board.update();
        });
    }

    /** "f(a, b)" with the current arguments, in the language's number format. */
    labelText(): string {
        return `f(${blossomArgumentText(this.settings.args().slice(0, this.degree))})`;
    }

    /** Brings the model curve in line with the state (a typed point, a Preset that kept the shape). */
    sync(): void {
        if (this.disposed) return;
        const model = this.curve.getCurve();
        const knots = this.settings.knots();
        const current = model.getKnots();
        if (knots.length === current.length && knots.some((knot, i) => knot !== current[i])) model.setKnots(knots);
        const points = this.settings.points();
        if (points.length !== this.pointCount) return;
        model.getPoints().forEach((point, i) => {
            if (point instanceof PointImpl && (point.X() !== points[i][0] || point.Y() !== points[i][1])) point.setCoordinates(points[i][0], points[i][1]);
        });
    }

    /** Removes every owned element (later ones first), the curve layer and the language subscription. Idempotent. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.stopLanguageUpdates?.();
        this.stopLanguageUpdates = undefined;
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        this.levelPoints = [];
        this.bezierPoints = [];
        this.bezierSegments = [];
        this.label = undefined;
        if (present.length) this.board.removeObject(present);
        this.curve.dispose();
    }
}
