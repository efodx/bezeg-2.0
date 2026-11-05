import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {GraphPalette} from "../../styles/GraphPalette";
import {OffsetCusp, offsetCusps, OffsetTrace, offsetTrace, SpeedFactorSamples, speedFactorSamples} from "./curveOffset";
import type {SpeedFactorPlotController} from "./SpeedFactorPlot";

/** The number of cusp markers: a fixed pool, so the board never creates or removes a marker while a curve is dragged. */
export const OFFSET_CUSP_MARKERS = 8;
/** Caption lines on the board: distance, cusps, the approximation note, and for a PH curve the exactness note. */
const CAPTION_LINES = 4;
/** The lines that are always short: d and the cusp count. */
const CAPTION_SHORT_LINES = 2;
/** Board width in font sizes below which the longest note wraps onto the next line, which sits at a fixed pitch. */
const CAPTION_NOTES_MIN_WIDTH = 24;

export type OffsetCurveKind = 'bezier' | 'ph';

type Rows = ReadonlyArray<ReadonlyArray<number>>;

interface OffsetSettings {
    board: Board;
    /** Polynomial control rows of the curve studied, read lazily so dragging needs no listener. */
    rows: () => Rows | undefined;
    kind: () => OffsetCurveKind;
    distance: () => number;
    samples: () => number;
    traceShown: () => boolean;
    cuspsShown: () => boolean;
    fontSize: () => number;
    /** Receives the factor samples on every recomputation (the inspector plot); survives overlay recreation. */
    plot?: SpeedFactorPlotController;
    /** Called with the readout text on every board update that draws it (for a live region). */
    onReadout?: (text: string) => void;
}

interface OffsetGeometry {
    trace: OffsetTrace;
    cusps: OffsetCusp[];
    factor: SpeedFactorSamples;
}

const EMPTY: OffsetGeometry = {trace: {x: [], y: []}, cusps: [], factor: {t: [], factor: []}};

type DataCurve = GeometryElement & { dataX: number[]; dataY: number[]; updateDataArray: () => void; needsUpdate: boolean; update: () => void };

/**
 * One owned offset overlay: the sampled offset trace (dashed, so an exact PH offset shows under it), a fixed pool of cusp
 * markers and a board caption. The trace, cusps and speed factor are computed once per change of rows, d and sample count
 * (memoised), so the elements of one board update share one computation. Elements read the curve lazily, so no drag
 * listener exists; the language subscription is released in {@link dispose}.
 */
export class OffsetOverlay {
    private readonly board: Board;
    private elements: GeometryElement[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private cache?: { key: number[]; geometry: OffsetGeometry };

    constructor(private readonly settings: OffsetSettings) {
        this.board = settings.board;
        this.build();
    }

    /** The created elements, for ownership checks. */
    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    /** The trace, cusps and speed factor of the curve as it is now. Memoised on the control rows, d and the sample count. */
    geometry(): OffsetGeometry {
        const rows = this.settings.rows();
        if (!rows || rows.length < 2) {
            if (this.cache) {
                this.cache = undefined;
                this.settings.plot?.push({t: [], factor: [], cusps: []});
            }
            return EMPTY;
        }
        const d = this.settings.distance(), samples = this.settings.samples();
        const key: number[] = [d, samples];
        rows.forEach(row => key.push(...row));
        const cached = this.cache;
        if (cached && cached.key.length === key.length && cached.key.every((value, i) => Object.is(value, key[i]))) return cached.geometry;
        const geometry: OffsetGeometry = {
            trace: offsetTrace(rows, d, samples), cusps: offsetCusps(rows, d, samples), factor: speedFactorSamples(rows, d, samples),
        };
        this.cache = {key, geometry};
        this.settings.plot?.push({t: geometry.factor.t, factor: geometry.factor.factor, cusps: geometry.cusps.map(cusp => cusp.t)});
        return geometry;
    }

    /** The true number of cusps (the markers show at most {@link OFFSET_CUSP_MARKERS}). */
    cuspCount(): number {
        return this.geometry().cusps.length;
    }

    /** The caption lines: d, the cusp count and, while the offset is drawn, the approximation note and for a PH curve the exactness note. Empty without a curve. */
    readoutLines(): string[] {
        if (!this.settings.rows()) return [];
        const num = (value: number) => formatNumber(value, currentLanguage(), 4);
        const count = this.cuspCount();
        const lines = [
            t("offset_readout_distance", {value0: num(this.settings.distance())}),
            count === 0 ? t("offset_readout_cusps_none") : t("offset_readout_cusps", {value0: String(count)}),
        ];
        if (this.settings.traceShown()) {
            lines.push(t("offset_readout_approx"));
            if (this.settings.kind() === 'ph') lines.push(t("offset_readout_exact_ph"));
        }
        return lines;
    }

    readoutText(): string {
        return this.readoutLines().join(" ");
    }

    /** What the board shows: a narrow board keeps the short lines, as the notes would cover the curve. The inspector and the live region always have them. An unmeasured board keeps every line. */
    private captionLines(): string[] {
        const lines = this.readoutLines();
        const width = this.board.canvasWidth;
        return width > 0 && width < CAPTION_NOTES_MIN_WIDTH * this.settings.fontSize() ? lines.slice(0, CAPTION_SHORT_LINES) : lines;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const board = this.board;
        const auxiliary = {fixed: true, withLabel: false, highlight: false, name: ''};

        const trace = this.create<DataCurve>('curve', [[], []], {
            fixed: true, highlight: false, withLabel: false, strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: 2,
            visible: () => this.settings.traceShown(),
        });
        trace.updateDataArray = () => {
            const data = this.settings.traceShown() ? this.geometry().trace : EMPTY.trace;
            trace.dataX = data.x;
            trace.dataY = data.y;
        };
        // Creation ran the default (empty) data; draw the real trace now rather than at the next board update.
        trace.needsUpdate = true;
        trace.update();

        // Diamonds, so a cusp is told apart without colour.
        for (let i = 0; i < OFFSET_CUSP_MARKERS; i++) {
            const filled = () => this.settings.cuspsShown() && i < this.geometry().cusps.length;
            this.create<Point>('point', [
                () => this.geometry().cusps[i]?.point[0] ?? NaN,
                () => this.geometry().cusps[i]?.point[1] ?? NaN,
            ], {
                ...auxiliary, visible: filled, size: 4, face: '<>', strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve,
            });
        }

        const box = () => board.getBoundingBox();
        // One line of the pixel height of the font, in graph units.
        const lineHeight = () => (box()[1] - box()[3]) / Math.max(1, board.canvasHeight) * this.settings.fontSize() * 1.35;
        for (let k = 0; k < CAPTION_LINES; k++) {
            this.create<Text>('text', [
                () => box()[0] + 0.02 * (box()[2] - box()[0]),
                () => box()[1] - 0.02 * (box()[1] - box()[3]) - k * lineHeight(),
                () => {
                    if (k === 0) this.settings.onReadout?.(this.readoutText());
                    return this.captionLines()[k] ?? "";
                },
            ], {
                anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false,
                fontSize: () => this.settings.fontSize(), strokeColor: GraphPalette.label,
            });
        }

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && board.renderer) board.update();
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
        this.cache = undefined;
        if (present.length) this.board.removeObject(present);
    }
}
