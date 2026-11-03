import type {Board, GeometryElement, Point} from "jsxgraph";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {JXGBSplineCurve} from "../object/JXGBSplineCurve";
import {GraphPalette} from "../../styles/GraphPalette";
import type {ControlPoint} from "./bsplineDeBoorModel";
import {combBySpan, combPolylines} from "./bsplineInsertionModel";

interface SceneSettings {
    board: Board;
    /** Read lazily: the scene state is the only copy of the data; the model curve is rebuilt from it by {@link BSplineInsertionScene.sync}. */
    degree: () => number;
    knots: () => readonly number[];
    points: () => readonly ControlPoint[];
    /** The previous control polygon after an insertion; empty when there is none. Its length is fixed per scene. */
    ghost: () => readonly ControlPoint[];
    showComb: () => boolean;
    /** A drag of a control point reports every point's coordinates, so the owner writes them to the state. */
    onPointsDrag: (points: ControlPoint[]) => void;
}

type DataCurve = GeometryElement & { dataX: number[]; dataY: number[]; updateDataArray: () => void };

/**
 * The owned board objects of the insertion graph for one degree, control-point count and ghost length: the B-spline curve layer
 * ({@link JXGBSplineCurve}), the faded ghost of the previous control polygon, the curvature comb (teeth and tip envelope, computed
 * per knot span and broken between spans). The kappa jump readout is the graph's inspector text, not a board object. A change of any of the three counts builds a new scene.
 */
export class BSplineInsertionScene {
    private readonly board: Board;
    readonly degree: number;
    readonly pointCount: number;
    readonly ghostCount: number;
    readonly curve: JXGBSplineCurve;
    private elements: GeometryElement[] = [];
    private ghostPoints: Point[] = [];
    private ghostSegments: GeometryElement[] = [];
    private teethCurve?: DataCurve;
    private envelopeCurve?: DataCurve;
    private disposed = false;

    constructor(private readonly settings: SceneSettings) {
        this.board = settings.board;
        this.degree = settings.degree();
        this.pointCount = settings.points().length;
        this.ghostCount = settings.ghost().length;
        this.curve = new JXGBSplineCurve(settings.points().map(point => [point[0], point[1]]), this.degree, settings.knots(), undefined, this.board);
        try {
            this.build();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    ownedElements(): readonly GeometryElement[] { return this.elements; }
    ghostElements(): readonly Point[] { return this.ghostPoints; }
    ghostSegmentElements(): readonly GeometryElement[] { return this.ghostSegments; }
    combElements(): readonly DataCurve[] { return this.teethCurve && this.envelopeCurve ? [this.teethCurve, this.envelopeCurve] : []; }

    fits(degree: number, pointCount: number, ghostCount: number): boolean {
        return degree === this.degree && pointCount === this.pointCount && ghostCount === this.ghostCount;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    /** The model curve's current vector and points, read where the board draws them (a drag moves the model points directly). */
    private current(): { knots: number[], points: ControlPoint[] } {
        const model = this.curve.getCurve();
        return {knots: model.getKnots(), points: model.getPoints().map(point => [point.X(), point.Y()] as ControlPoint)};
    }

    private build() {
        const quiet = {fixed: true, highlight: false, withLabel: false, name: ''};

        // Ghost first, so the live curve and polygon draw over it.
        const ghost = this.settings.ghost();
        for (let i = 0; i < ghost.length; i++) {
            this.ghostPoints.push(this.create<Point>('point', [() => this.settings.ghost()[i]?.[0] ?? NaN, () => this.settings.ghost()[i]?.[1] ?? NaN],
                {...quiet, visible: false, size: 0}));
        }
        for (let i = 0; i + 1 < ghost.length; i++) {
            this.ghostSegments.push(this.create('segment', [this.ghostPoints[i], this.ghostPoints[i + 1]],
                {...quiet, strokeColor: GraphPalette.label, strokeWidth: 2, strokeOpacity: 0.35, dash: 2}));
        }

        // One computation per board update: the teeth curve, drawn first, refreshes it; the envelope reuses it.
        let key = '';
        let lines: ReturnType<typeof combPolylines> = {teeth: [[], []], envelope: [[], []]};
        const refresh = () => {
            const {knots, points} = this.current();
            const next = `${knots.join(',')}|${points.map(p => `${p[0]},${p[1]}`).join(';')}`;
            if (next !== key) {
                try {
                    lines = combPolylines(combBySpan(knots, this.degree, points));
                } catch {
                    lines = {teeth: [[], []], envelope: [[], []]};
                }
                key = next;
            }
            return lines;
        };
        const comb = (select: 'teeth' | 'envelope', strokeWidth: number, color: string, opacity: number): DataCurve => {
            const curve = this.create<DataCurve>('curve', [[], []], {
                ...quiet, strokeColor: color, strokeWidth, strokeOpacity: opacity, visible: () => this.settings.showComb(),
            });
            curve.updateDataArray = () => {
                const data = refresh()[select];
                curve.dataX = [...data[0]];
                curve.dataY = [...data[1]];
            };
            return curve;
        };
        this.teethCurve = comb('teeth', 1, GraphPalette.constructionAccent, 0.6);
        this.envelopeCurve = comb('envelope', 1.5, GraphPalette.constructionAccent, 1);

        this.curve.getJxgPoints().forEach(point => point.on('drag', () => this.settings.onPointsDrag(
            this.curve.getJxgPoints().map(p => [p.X(), p.Y()] as ControlPoint))));
    }

    /** Brings the model curve in line with the state (a typed knot, a Preset that kept the shape). */
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
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        this.ghostPoints = [];
        this.ghostSegments = [];
        if (present.length) this.board.removeObject(present);
        this.curve.dispose();
    }
}
