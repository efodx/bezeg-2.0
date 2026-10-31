import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {onLanguageChange, t} from "../../../localization";
import {GraphPalette} from "../../styles/GraphPalette";
import {chaikinLimitPolyline, MAX_SUBDIVISION_ROUNDS, Row, StageInput, stageOf, SubdivisionRule} from "./subdivisionModel";

export interface SceneInput extends StageInput {
    readonly showLimit: boolean;
}

interface SceneSettings {
    board: Board;
    /** Read lazily on every draw: the scene state is the only copy of the data. */
    input: () => SceneInput;
    fontSize: () => number;
    /** A drag of polygon point i to (x, y). The scene redraws from the state either way. */
    onMove: (index: number, x: number, y: number) => void;
}

/** The status line of the board: the rule, the revealed round and the vertex count of the shown stage. */
export function statusLine(rule: SubdivisionRule, round: number, vertices: number): string {
    return t(rule === 'chaikin' ? "subdiv_board_chaikin" : "subdiv_board_four_point",
        {value0: round, value1: MAX_SUBDIVISION_ROUNDS, value2: vertices});
}

type DataCurve = GeometryElement & {dataX: number[]; dataY: number[]; updateDataArray: () => void};

/**
 * The owned elements of the subdivision scene: the dashed original polygon (with its draggable points), the solid current
 * stage with small fixed vertices (a pool that grows to the largest stage seen; surplus points are hidden), the optional
 * Chaikin limit overlay and the status text. A scene is built for one polygon size; adding or removing a point (or importing
 * a Preset) builds a new one. {@link dispose} removes every element (the drag listeners go with their points) and releases the
 * language subscription.
 */
export class SubdivisionScene {
    private readonly board: Board;
    private readonly count: number;
    private elements: GeometryElement[] = [];
    private dataPoints: Point[] = [];
    private vertexPool: Point[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;

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

    /** The draggable polygon points. */
    pointElements(): readonly Point[] {
        return this.dataPoints;
    }

    /** The small vertex points that are currently shown (one per vertex of the stage). */
    vertexElements(): readonly Point[] {
        const shown = this.stage().length;
        return this.vertexPool.slice(0, shown);
    }

    get pointCount(): number {
        return this.count;
    }

    /** The stage drawn now (derived by `subdivisionRounds`). */
    stage(): readonly (readonly number[])[] {
        return stageOf(this.settings.input());
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private lineCurve(lines: () => readonly (readonly number[])[], attributes: Record<string, unknown>): DataCurve {
        const curve = this.create<DataCurve>('curve', [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes});
        curve.updateDataArray = () => {
            const rows = lines();
            curve.dataX = rows.map(r => r[0]);
            curve.dataY = rows.map(r => r[1]);
        };
        return curve;
    }

    /** A polygon row list; a closed one repeats its first row so the last edge is drawn. */
    private outline(rows: readonly (readonly number[])[]): readonly (readonly number[])[] {
        return this.settings.input().closed && rows.length > 0 ? [...rows, rows[0]] : rows;
    }

    private ensureVertexPool(size: number) {
        while (this.vertexPool.length < size) {
            const i = this.vertexPool.length;
            const at = (axis: 0 | 1) => () => this.stage()[i]?.[axis] ?? NaN;
            const point = this.create<Point>('point', [at(0), at(1)], {
                fixed: true, highlight: false, withLabel: false, name: '', size: 2, strokeColor: GraphPalette.primaryCurve,
                fillColor: GraphPalette.primaryCurve, visible: () => i < this.stage().length,
            });
            this.vertexPool.push(point);
        }
    }

    private build() {
        const input = this.settings.input();

        // Layers, lowest first: limit overlay, original polygon, current stage, stage vertices, draggable points, status text.
        this.lineCurve(() => {
            const now = this.settings.input();
            return now.showLimit && now.rule === 'chaikin' ? chaikinLimitPolyline(now.points, now.closed) : [];
        }, {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, visible: () => this.settings.input().showLimit && this.settings.input().rule === 'chaikin'});

        this.lineCurve(() => this.outline(this.settings.input().points), {strokeColor: GraphPalette.controlPolygon, strokeWidth: 2, dash: 2});

        this.lineCurve(() => this.outline(this.stage()), {strokeColor: GraphPalette.primaryCurve, strokeWidth: 2.5});

        // Enough pooled vertices for the stage shown at build time; sync() grows the pool when a larger stage appears.
        this.ensureVertexPool(this.stage().length);

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

        const box = () => this.board.getBoundingBox();
        this.create<Text>('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => {
                const now = this.settings.input();
                return statusLine(now.rule, now.round, this.stage().length);
            },
        ], {anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false, fontSize: () => this.settings.fontSize(),
            strokeColor: GraphPalette.label});

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && this.board.renderer) this.board.update();
        });
    }

    /** Moves each handle to the state (after an edit, a refused drag, a reset or a Preset change that kept the count) and grows the vertex pool. */
    sync(): void {
        if (this.disposed) return;
        const input = this.settings.input();
        if (input.points.length !== this.count) return;
        this.dataPoints.forEach((point, i) => {
            const target: Row = input.points[i];
            if (point.X() !== target[0] || point.Y() !== target[1]) point.moveTo([target[0], target[1]]);
        });
        this.ensureVertexPool(this.stage().length);
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
        this.vertexPool = [];
        if (present.length) this.board.removeObject(present);
    }
}
