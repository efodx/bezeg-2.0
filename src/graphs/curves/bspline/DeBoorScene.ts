import type {Board, GeometryElement, Point, Segment, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange} from "../../../localization";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {JXGBSplineCurve} from "../object/JXGBSplineCurve";
import type {DeBoorTriangle} from "../../../bezeg/impl/curve/bspline";
import {constructionLevelColor, constructionLevelDash, GraphPalette} from "../../styles/GraphPalette";
import {clampParameter, ControlPoint, deBoorReadoutLines, entryPoint} from "./bsplineDeBoorModel";

interface SceneSettings {
    board: Board;
    /** Read lazily: the scene state is the only copy of the data; the model curve is rebuilt from it by {@link DeBoorScene.sync}. */
    degree: () => number;
    knots: () => readonly number[];
    points: () => readonly ControlPoint[];
    t: () => number;
    level: () => number;
    fontSize: () => number;
    /** A drag of a control point reports every point's coordinates, so the owner writes them to the state. */
    onPointsDrag: (points: ControlPoint[]) => void;
}

/**
 * The owned board objects of the de Boor graph, for one degree and control-point count: the B-spline curve layer
 * ({@link JXGBSplineCurve}, with its draggable control points), k + 1 rings on the active control points (level 0 of the triangle),
 * the points and segments of levels 1..k (shown up to the revealed level) and the readout text. A change of degree or point count
 * builds a new scene. {@link dispose} removes every object and releases the language subscription.
 */
export class DeBoorScene {
    private readonly board: Board;
    readonly degree: number;
    readonly pointCount: number;
    readonly curve: JXGBSplineCurve;
    private elements: GeometryElement[] = [];
    /** levelPoints[r][i]: entry i of level r. Level 0 holds the rings on the active control points. */
    private levelPoints: Point[][] = [];
    private levelSegments: Segment[][] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private readoutElement?: Text;

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

    /** Every element this scene created besides the curve layer's own. */
    ownedElements(): readonly GeometryElement[] { return this.elements; }
    ringElements(): readonly Point[] { return this.levelPoints[0]; }
    levelElements(level: number): readonly Point[] { return this.levelPoints[level]; }
    segmentElements(level: number): readonly Segment[] { return this.levelSegments[level]; }
    readout(): Text | undefined { return this.readoutElement; }

    /** Whether this scene has the shape (degree and control-point count) the state now asks for. */
    fits(degree: number, pointCount: number): boolean {
        return degree === this.degree && pointCount === this.pointCount;
    }

    /** The parameter domain of the model curve. */
    domain(): [number, number] { return this.curve.getCurve().getDomain(); }

    /** The slider value held inside the model curve's domain. */
    parameter(): number {
        return clampParameter(this.curve.getCurve().getKnots(), this.degree, this.settings.t());
    }

    /** The de Boor triangle of the model curve at the slider parameter. */
    triangle(): DeBoorTriangle {
        return this.curve.getCurve().deBoorTriangle(this.parameter());
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const quiet = {fixed: true, highlight: false, withLabel: false, name: ''};
        const k = this.degree;
        const weighted = () => this.curve.getCurve().getWeights() !== undefined;
        // One triangle per board update: the first element drawn after a state change recomputes it, the others reuse it.
        let cacheKey = '';
        let cached: DeBoorTriangle | undefined;
        const triangle = (): DeBoorTriangle => {
            const model = this.curve.getCurve();
            const key = `${this.parameter()}|${model.getKnots().join(',')}|${model.getPoints().map(point => `${point.X()},${point.Y()}`).join(';')}`;
            if (!cached || key !== cacheKey) {
                cached = this.triangle();
                cacheKey = key;
            }
            return cached;
        };
        const coordinate = (r: number, i: number, axis: 0 | 1) => () => {
            try {
                return entryPoint(triangle().levels[r][i], weighted())[axis];
            } catch {
                return NaN;
            }
        };

        for (let r = 0; r <= k; r++) {
            const count = k + 1 - r;
            const color = r === k ? GraphPalette.constructionAccent : constructionLevelColor(r);
            const points: Point[] = [];
            for (let i = 0; i < count; i++) {
                points.push(r === 0
                    ? this.create<Point>('point', [coordinate(0, i, 0), coordinate(0, i, 1)], {
                        ...quiet, size: 8, face: 'o', strokeColor: constructionLevelColor(0), fillColor: 'none', strokeWidth: 2.5,
                        highlightStrokeColor: constructionLevelColor(0),
                    })
                    : this.create<Point>('point', [coordinate(r, i, 0), coordinate(r, i, 1)], {
                        ...quiet, size: r === k ? 5 : 4, strokeColor: color, fillColor: color, visible: () => this.settings.level() >= r,
                    }));
            }
            // The rings sit on top of draggable control points: they must never take a pointer hit from them.
            // fixed + highlight:false alone still lets a fixed point win the hit test, so hasPoint is overridden;
            // the drag-through test in DeBoorGraph.test.tsx guards this against JSXGraph upgrades.
            if (r === 0) points.forEach(ring => { ring.hasPoint = () => false; });
            this.levelPoints.push(points);
            const segments: Segment[] = [];
            for (let i = 0; i + 1 < count; i++) {
                segments.push(this.create<Segment>('segment', [points[i], points[i + 1]], {
                    ...quiet, strokeColor: color, strokeWidth: 1.5, dash: constructionLevelDash(r),
                    visible: () => r === 0 || this.settings.level() >= r,
                }));
            }
            this.levelSegments.push(segments);
        }

        const box = () => this.board.getBoundingBox();
        this.readoutElement = this.create<Text>('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => this.readoutText().split("\n").join("<br>"),
        ], {anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false, fontSize: () => this.settings.fontSize(),
            strokeColor: GraphPalette.label});

        // A released scene's point may still receive an event: it must not write the state of its successor.
        this.curve.getJxgPoints().forEach(point => point.on('drag', () => {
            if (this.disposed) return;
            this.settings.onPointsDrag(this.curve.getJxgPoints().map(p => [p.X(), p.Y()] as ControlPoint));
        }));

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && this.board.renderer) this.board.update();
        });
    }

    /** The readout lines as one text, up to the revealed level. */
    readoutText(): string {
        try {
            const model = this.curve.getCurve();
            return deBoorReadoutLines(this.triangle(), model.getKnots(), this.degree, this.parameter(), this.settings.level(),
                model.getWeights() !== undefined, currentLanguage()).join("\n");
        } catch {
            return '';
        }
    }

    /** Brings the model curve in line with the state (a typed point or knot, a Preset that kept the shape). */
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
        this.levelSegments = [];
        if (present.length) this.board.removeObject(present);
        this.curve.dispose();
    }
}
