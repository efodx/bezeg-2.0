import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange} from "../../../localization";
import {barycentricWeights, bezierCurvePoint, lagrangeBasis, ParameterRule, Point2} from "../../../analysis/interpolation";
import {GraphPalette} from "../../styles/GraphPalette";
import {convexHullOf, interpolationRejection, parametersOf, readoutAt, readoutLines} from "./interpolationModel";

interface SceneSettings {
    board: Board;
    /** Read lazily on every draw: the scene state is the only copy of the data. */
    points: () => readonly Point2[];
    rule: () => ParameterRule;
    showHull: () => boolean;
    showBezier: () => boolean;
    position: () => number;
    fontSize: () => number;
    /** A drag of data point i to (x, y); returns whether the model accepted it. The scene redraws from the state either way. */
    onMove: (index: number, x: number, y: number) => boolean;
}

/**
 * The owned elements of the Lagrange versus Bezier scene: the draggable data points, the Lagrange curve, the Bezier curve,
 * the hull outline, the two markers at the shared position and the weights readout. A scene is built for one point count;
 * adding or removing a point (or importing a Preset) builds a new one. {@link dispose} removes every element (the drag
 * listeners go with their points) and releases the language subscription.
 */
export class InterpolationScene {
    private readonly board: Board;
    private readonly count: number;
    private elements: GeometryElement[] = [];
    private dataPoints: Point[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private cacheKey?: {points: readonly Point2[]; rule: ParameterRule};
    private cacheValue?: {parameters: number[]; weights: number[]};

    constructor(private readonly settings: SceneSettings) {
        this.board = settings.board;
        this.count = settings.points().length;
        try {
            this.build();
        } catch (error) {
            this.dispose();
            throw error;
        }
    }

    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    pointElements(): readonly Point[] {
        return this.dataPoints;
    }

    get pointCount(): number {
        return this.count;
    }

    /** Barycentric data of the current points, recomputed only when the state's points or rule change. */
    private evaluator(): {parameters: number[]; weights: number[]} | undefined {
        const points = this.settings.points();
        const rule = this.settings.rule();
        if (!this.cacheKey || this.cacheKey.points !== points || this.cacheKey.rule !== rule) {
            this.cacheKey = {points, rule};
            if (interpolationRejection(points, rule)) {
                this.cacheValue = undefined;
            } else {
                const parameters = parametersOf(points, rule);
                this.cacheValue = {parameters, weights: barycentricWeights(parameters)};
            }
        }
        return this.cacheValue;
    }

    /** Lagrange point at parameter u, or NaN when the data are not interpolable. */
    lagrangeAt(u: number): [number, number] {
        const data = this.evaluator();
        if (!data) return [NaN, NaN];
        const points = this.settings.points();
        const basis = lagrangeBasis(data.parameters, u, data.weights);
        return [basis.reduce((s, l, j) => s + l * points[j][0], 0), basis.reduce((s, l, j) => s + l * points[j][1], 0)];
    }

    bezierAt(u: number): [number, number] {
        const points = this.settings.points();
        return points.length < 2 ? [NaN, NaN] : bezierCurvePoint(points, u).point;
    }

    private lastParameter(): number {
        const data = this.evaluator();
        return data ? data.parameters[data.parameters.length - 1] : 0;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const quiet = {fixed: true, highlight: false, withLabel: false};
        const points = this.settings.points();

        // Layers, lowest first: hull, Bezier, Lagrange, markers, data points, readout.
        // The hull is a closed polyline of the hull vertices: a data curve whose arrays are rebuilt on every update.
        const hull = this.create<GeometryElement & {dataX: number[]; dataY: number[]; updateDataArray: () => void}>('curve', [[], []],
            {...quiet, strokeColor: GraphPalette.controlPolygon, strokeWidth: 2, dash: 2, visible: () => this.settings.showHull()});
        hull.updateDataArray = () => {
            const vertices = convexHullOf(this.settings.points());
            const closed = vertices.length > 1 ? [...vertices, vertices[0]] : vertices;
            hull.dataX = closed.map(v => v[0]);
            hull.dataY = closed.map(v => v[1]);
        };

        this.create('curve', [(u: number) => this.bezierAt(u)[0], (u: number) => this.bezierAt(u)[1], 0, 1],
            {...quiet, strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2.5, dash: 3, visible: () => this.settings.showBezier()});

        this.create('curve', [(u: number) => this.lagrangeAt(u)[0], (u: number) => this.lagrangeAt(u)[1], 0, () => this.lastParameter()],
            {...quiet, strokeColor: GraphPalette.primaryCurve, strokeWidth: 2.5});

        const valid = () => !interpolationRejection(this.settings.points(), this.settings.rule());
        const marker = (color: string, face: string, which: 'lagrange' | 'bezier', visible: () => boolean) => {
            const at = (axis: 0 | 1) => () => valid()
                ? readoutAt(this.settings.points(), this.settings.rule(), this.settings.position())[which].point[axis] : NaN;
            return this.create<Point>('point', [at(0), at(1)], {...quiet, name: '', size: 4, face, strokeColor: color, fillColor: color, visible});
        };
        marker(GraphPalette.primaryCurve, 'o', 'lagrange', () => true);
        marker(GraphPalette.comparisonCurve, '[]', 'bezier', () => this.settings.showBezier());

        points.forEach((p, i) => {
            const point = this.create<Point>('point', [p[0], p[1]], {
                name: `P${i}`, withLabel: true, size: 4, strokeColor: GraphPalette.pointOutline, fillColor: GraphPalette.label, highlight: true,
            });
            point.on('drag', () => {
                this.settings.onMove(i, point.X(), point.Y());
                this.sync();
            });
            this.dataPoints.push(point);
        });

        const box = () => this.board.getBoundingBox();
        this.create<Text>('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => readoutLines(this.settings.points(), this.settings.rule(), this.settings.position(), this.settings.showBezier(), currentLanguage()).join("\n"),
        ], {anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false, fontSize: () => this.settings.fontSize(),
            strokeColor: GraphPalette.label});

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && this.board.renderer) this.board.update();
        });
    }

    /** Moves each data point to the state (after an edit, a rejected drag or a Preset change that kept the count). */
    sync(): void {
        const points = this.settings.points();
        if (points.length !== this.count) return;
        this.dataPoints.forEach((point, i) => {
            if (point.X() !== points[i][0] || point.Y() !== points[i][1]) point.moveTo([points[i][0], points[i][1]]);
        });
    }

    /** Removes every owned element (later ones first) and releases the language subscription. Idempotent. */
    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.stopLanguageUpdates?.();
        this.stopLanguageUpdates = undefined;
        const present = this.elements.filter(element => this.board.objectsList.includes(element)).reverse();
        this.elements = [];
        this.dataPoints = [];
        if (present.length) this.board.removeObject(present);
    }
}
