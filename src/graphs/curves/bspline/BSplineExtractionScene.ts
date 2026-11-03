import type {Board, GeometryElement} from "jsxgraph";
import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {JXGBSplineCurve} from "../object/JXGBSplineCurve";
import type {ControlPoint} from "./bsplineDeBoorModel";
import {extract, pieceColor, pieceCurveLines, piecePolygonLines} from "./bsplineExtractionModel";

interface SceneSettings {
    board: Board;
    /** Read lazily: the scene state is the only copy of the data; the model curve is rebuilt from it by {@link BSplineExtractionScene.sync}. */
    degree: () => number;
    knots: () => readonly number[];
    points: () => readonly ControlPoint[];
    /** Indices of the pieces to emphasize (those the last drag changed). */
    highlighted: () => readonly number[];
    /** The number of Bezier pieces the scene draws; fixed per scene. */
    pieceCount: () => number;
    /** A drag of a control point reports every point's coordinates, so the owner writes them to the state. */
    onPointsDrag: (points: ControlPoint[]) => void;
}

export type DataCurve = GeometryElement & { dataX: number[]; dataY: number[]; updateDataArray: () => void };

/**
 * The owned board objects of the extraction graph for one degree, control-point count and piece count: the B-spline curve layer
 * ({@link JXGBSplineCurve}) and, per Bezier piece, the piece drawn as a Bezier curve and its Bezier control polygon, both in the
 * piece's colour. The piece readout is the graph's inspector text. A change of any of the three counts builds a new scene.
 */
export class BSplineExtractionScene {
    private readonly board: Board;
    readonly degree: number;
    readonly pointCount: number;
    readonly pieceCount: number;
    readonly curve: JXGBSplineCurve;
    private elements: GeometryElement[] = [];
    private pieceCurves: DataCurve[] = [];
    private piecePolygons: DataCurve[] = [];
    private disposed = false;

    constructor(private readonly settings: SceneSettings) {
        this.board = settings.board;
        this.degree = settings.degree();
        this.pointCount = settings.points().length;
        this.pieceCount = settings.pieceCount();
        this.curve = new JXGBSplineCurve(settings.points().map(point => [point[0], point[1]]), this.degree, settings.knots(), undefined, this.board);
        try {
            this.build();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    ownedElements(): readonly GeometryElement[] { return this.elements; }
    /** The piece drawn as a Bezier curve, one per piece. */
    pieceCurveElements(): readonly DataCurve[] { return this.pieceCurves; }
    /** The Bezier control polygon of each piece. */
    piecePolygonElements(): readonly DataCurve[] { return this.piecePolygons; }

    fits(degree: number, pointCount: number, pieceCount: number): boolean {
        return degree === this.degree && pointCount === this.pointCount && pieceCount === this.pieceCount;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    /** The extraction of the model curve as it is drawn now (a drag moves the model points directly). */
    private currentPieces() {
        const model = this.curve.getCurve();
        return extract(model.getKnots(), this.degree, model.getPoints().map(point => [point.X(), point.Y()] as ControlPoint))?.pieces ?? [];
    }

    private build() {
        const quiet = {fixed: true, highlight: false, withLabel: false, name: ''};
        // One extraction per board update: the first piece curve refreshes it, the rest reuse it.
        let key = '';
        let pieces = this.currentPieces();
        const refresh = () => {
            const model = this.curve.getCurve();
            const next = `${model.getKnots().join(',')}|${model.getPoints().map(p => `${p.X()},${p.Y()}`).join(';')}`;
            if (next !== key) {
                pieces = this.currentPieces();
                key = next;
            }
            return pieces;
        };
        const emphasized = (index: number) => this.settings.highlighted().includes(index);
        const line = (index: number, polygon: boolean): DataCurve => {
            const curve = this.create<DataCurve>('curve', [[], []], {
                ...quiet, strokeColor: pieceColor(index),
                strokeWidth: () => (emphasized(index) ? 5 : 3) - (polygon ? 2 : 0),
                strokeOpacity: () => (polygon ? 0.9 : emphasized(index) ? 1 : 0.75),
                dash: polygon ? 2 : 0,
            });
            curve.updateDataArray = () => {
                const piece = refresh()[index];
                const data = piece ? (polygon ? piecePolygonLines(piece) : pieceCurveLines(piece)) : [[], []];
                curve.dataX = [...data[0]];
                curve.dataY = [...data[1]];
            };
            return curve;
        };
        for (let i = 0; i < this.pieceCount; i++) {
            this.piecePolygons.push(line(i, true));
            this.pieceCurves.push(line(i, false));
        }
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

    /** Removes every owned element (later ones first) and the curve layer. Idempotent. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        this.pieceCurves = [];
        this.piecePolygons = [];
        if (present.length) this.board.removeObject(present);
        this.curve.dispose();
    }
}
