import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {Point2} from "../../../analysis/interpolation";
import {GraphPalette} from "../../styles/GraphPalette";
import {chainBezier, chainPoint, ChainInput, HermiteChain, hermiteChain} from "./hermiteModel";

interface SceneSettings {
    board: Board;
    /** Read lazily on every draw: the scene state is the only copy of the data. */
    input: () => ChainInput;
    showTangents: () => boolean;
    showBezier: () => boolean;
    fontSize: () => number;
    /** A drag of data point i to (x, y); returns whether the model accepted it. The scene redraws from the state either way. */
    onMove: (index: number, x: number, y: number) => boolean;
    /** A drag of the tip of tangent arrow i to (x, y); refused (false) outside Hermite mode. */
    onTangent: (index: number, x: number, y: number) => boolean;
}

/** The status line of the board: the curve type, and the tension in Catmull-Rom mode. */
export function statusLine(input: ChainInput, language = currentLanguage()): string {
    return input.mode === 'hermite'
        ? t("hermite_board_hermite")
        : t("hermite_board_catmull", {value0: formatNumber(input.tension, language, 3)});
}

/**
 * The owned elements of the Hermite and Catmull-Rom scene: the curve (one functional curve over the global parameter),
 * one control polygon and two control points per segment (the Bezier overlay), the draggable data points, the tangent
 * arrows with their tip handles and the status text. A scene is built for one point count; adding or removing a point (or
 * importing a Preset) builds a new one. {@link dispose} removes every element (the drag listeners go with their points)
 * and releases the language subscription.
 */
export class HermiteScene {
    private readonly board: Board;
    private readonly count: number;
    private elements: GeometryElement[] = [];
    private dataPoints: Point[] = [];
    private tips: Point[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private cacheKey?: unknown[];
    private cacheValue?: HermiteChain;

    constructor(private readonly settings: SceneSettings) {
        this.board = settings.board;
        this.count = settings.input().points.length;
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

    /** The draggable tip handle of each tangent arrow. */
    tipElements(): readonly Point[] {
        return this.tips;
    }

    get pointCount(): number {
        return this.count;
    }

    /** The chain of the current state, recomputed only when its inputs change; undefined when it cannot be drawn. */
    chain(): HermiteChain | undefined {
        const input = this.settings.input();
        const key = [input.points, input.mode, input.tangents, input.parameterRule, input.tension];
        if (!this.cacheKey || key.some((value, i) => value !== this.cacheKey![i])) {
            this.cacheKey = key;
            try {
                this.cacheValue = hermiteChain(input);
            } catch (error) {
                if (!(error instanceof RangeError)) throw error;
                this.cacheValue = undefined;
            }
        }
        return this.cacheValue;
    }

    /** Curve point at the global parameter t, or NaN when the data cannot be drawn. */
    curveAt(parameter: number): [number, number] {
        const chain = this.chain();
        return chain ? chainPoint(chain, parameter) : [NaN, NaN];
    }

    private lastParameter(): number {
        const chain = this.chain();
        return chain ? chain.parameters[chain.parameters.length - 1] : 0;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const quiet = {fixed: true, highlight: false, withLabel: false};
        const input = this.settings.input();
        const segments = this.count - 1;
        const bezierVisible = () => this.settings.showBezier();

        // Layers, lowest first: control polygons, curve, control points, arrows, tips, data points, status text.
        for (let i = 0; i < segments; i++) {
            const polygon = this.create<GeometryElement & {dataX: number[]; dataY: number[]; updateDataArray: () => void}>('curve', [[], []],
                {...quiet, strokeColor: GraphPalette.controlPolygon, strokeWidth: 2, dash: 2, visible: bezierVisible});
            polygon.updateDataArray = () => {
                const chain = this.chain();
                const control = chain ? chainBezier(chain)[i] : [];
                polygon.dataX = control.map(c => c[0]);
                polygon.dataY = control.map(c => c[1]);
            };
        }

        this.create('curve', [(u: number) => this.curveAt(u)[0], (u: number) => this.curveAt(u)[1], 0, () => this.lastParameter()],
            {...quiet, strokeColor: GraphPalette.primaryCurve, strokeWidth: 2.5});

        for (let i = 0; i < segments; i++) {
            for (const k of [1, 2] as const) {
                const at = (axis: 0 | 1) => () => {
                    const chain = this.chain();
                    return chain ? chainBezier(chain)[i][k][axis] : NaN;
                };
                this.create<Point>('point', [at(0), at(1)], {
                    ...quiet, name: '', size: 3, face: '[]', strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve,
                    visible: bezierVisible,
                });
            }
        }

        input.points.forEach((p, i) => {
            const point = this.create<Point>('point', [p[0], p[1]], {
                name: `P${i}`, withLabel: true, size: 4, strokeColor: GraphPalette.pointOutline, fillColor: GraphPalette.label, highlight: true,
            });
            point.on('drag', () => {
                this.settings.onMove(i, point.X(), point.Y());
                this.sync();
            });
            this.dataPoints.push(point);
        });

        input.points.forEach((p, i) => {
            const m = input.tangents[i] ?? [0, 0];
            const tip = this.create<Point>('point', [p[0] + m[0], p[1] + m[1]], {
                name: '', withLabel: false, size: 3, face: 'o', strokeColor: GraphPalette.constructionAccent, fillColor: GraphPalette.constructionAccent,
                highlight: true, fixed: input.mode === 'catmull-rom', visible: () => this.settings.showTangents(),
            });
            tip.on('drag', () => {
                this.settings.onTangent(i, tip.X(), tip.Y());
                this.sync();
            });
            this.tips.push(tip);
            this.create('arrow', [this.dataPoints[i], tip], {
                ...quiet, strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, lastArrow: {size: 5}, visible: () => this.settings.showTangents(),
            });
        });

        const box = () => this.board.getBoundingBox();
        this.create<Text>('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => statusLine(this.settings.input()),
        ], {anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false, fontSize: () => this.settings.fontSize(),
            strokeColor: GraphPalette.label});

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && this.board.renderer) this.board.update();
        });
    }

    /** Where tip i belongs: P_i plus the global derivative of the drawn chain (the stored tangent when the chain is undrawable). */
    private tipTarget(i: number): Point2 {
        const input = this.settings.input();
        const m = this.chain()?.tangents[i] ?? input.tangents[i] ?? [0, 0];
        return [input.points[i][0] + m[0], input.points[i][1] + m[1]];
    }

    /** Moves each handle to the state (after an edit, a refused drag or a Preset change that kept the count) and sets which tips are draggable. */
    sync(): void {
        const input = this.settings.input();
        if (input.points.length !== this.count) return;
        this.dataPoints.forEach((point, i) => {
            if (point.X() !== input.points[i][0] || point.Y() !== input.points[i][1]) point.moveTo([input.points[i][0], input.points[i][1]]);
        });
        const fixed = input.mode === 'catmull-rom';
        this.tips.forEach((tip, i) => {
            const target = this.tipTarget(i);
            if (tip.X() !== target[0] || tip.Y() !== target[1]) tip.moveTo([target[0], target[1]]);
            tip.setAttribute({fixed});
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
        this.tips = [];
        if (present.length) this.board.removeObject(present);
    }
}
