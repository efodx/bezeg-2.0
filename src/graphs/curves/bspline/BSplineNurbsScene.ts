import type {Board, GeometryElement, Point} from "jsxgraph";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {JXGBSplineCurve} from "../object/JXGBSplineCurve";
import {GraphPalette} from "../../styles/GraphPalette";
import type {ControlPoint} from "./bsplineDeBoorModel";

interface SceneSettings {
    board: Board;
    /** Read lazily: the scene state is the only copy of the data; the model curve is rebuilt from it by {@link BSplineNurbsScene.sync}. */
    degree: () => number;
    knots: () => readonly number[];
    points: () => readonly ControlPoint[];
    weights: () => readonly number[];
    showCircle: () => boolean;
    /** The marked curve point C(t), or undefined when it cannot be evaluated. */
    marker: () => ControlPoint | undefined;
    /** A drag of a control point reports every point's coordinates, so the owner writes them to the state. */
    onPointsDrag: (points: ControlPoint[]) => void;
}

/**
 * The owned board objects of the NURBS circle graph for one degree and control-point count: the weighted B-spline curve layer
 * ({@link JXGBSplineCurve}), the unit-circle overlay and the marker at C(t). It draws no text. A change of degree or point count builds a new scene.
 */
export class BSplineNurbsScene {
    private readonly board: Board;
    readonly degree: number;
    readonly pointCount: number;
    readonly curve: JXGBSplineCurve;
    private elements: GeometryElement[] = [];
    private circle?: GeometryElement;
    private marker?: Point;
    private disposed = false;

    constructor(private readonly settings: SceneSettings) {
        this.board = settings.board;
        this.degree = settings.degree();
        this.pointCount = settings.points().length;
        this.curve = new JXGBSplineCurve(settings.points().map(point => [point[0], point[1]]), this.degree, settings.knots(), [...settings.weights()], this.board);
        try {
            this.build();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    ownedElements(): readonly GeometryElement[] { return this.elements; }
    circleElement(): GeometryElement | undefined { return this.circle; }
    markerElement(): Point | undefined { return this.marker; }

    /** Whether a scene built for these values can show them by `sync`: the curve takes its degree and knots only when built. */
    fits(degree: number, knots: readonly number[], pointCount: number): boolean {
        const current = this.curve.getCurve().getKnots();
        return degree === this.degree && pointCount === this.pointCount
            && knots.length === current.length && knots.every((knot, i) => knot === current[i]);
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const quiet = {fixed: true, highlight: false, withLabel: false, name: ''};
        // The overlay first, so the live curve and polygon draw over it.
        this.circle = this.create('curve', [(angle: number) => Math.cos(angle), (angle: number) => Math.sin(angle), 0, 2 * Math.PI], {
            ...quiet, strokeColor: GraphPalette.label, strokeWidth: 2, strokeOpacity: 0.5, dash: 2, visible: () => this.settings.showCircle(),
        });
        this.marker = this.create<Point>('point', [() => this.settings.marker()?.[0] ?? NaN, () => this.settings.marker()?.[1] ?? NaN], {
            ...quiet, size: 4, strokeColor: GraphPalette.constructionAccent, fillColor: GraphPalette.constructionAccent,
        });
        // A released scene's handler is inert: its points are gone and must never write the state.
        this.curve.getJxgPoints().forEach(point => point.on('drag', () => {
            if (this.disposed) return;
            this.settings.onPointsDrag(this.curve.getJxgPoints().map(p => [p.X(), p.Y()] as ControlPoint));
        }));
    }

    /** Brings the model curve in line with the state (a typed weight, a Preset that kept the shape). */
    sync(): void {
        if (this.disposed) return;
        const model = this.curve.getCurve();
        const weights = this.settings.weights();
        const current = model.getWeights();
        if (weights.length === this.pointCount && (!current || weights.some((w, i) => w !== current[i]))) model.setWeights(weights);
        const points = this.settings.points();
        if (points.length !== this.pointCount) return;
        model.getPoints().forEach((point, i) => {
            if (point instanceof PointImpl && (point.X() !== points[i][0] || point.Y() !== points[i][1])) point.setCoordinates(points[i][0], points[i][1]);
        });
    }

    /** Removes every owned element (later ones first) and the curve layer. Idempotent. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        this.circle = undefined;
        this.marker = undefined;
        if (present.length) this.board.removeObject(present);
        this.curve.dispose();
    }
}
