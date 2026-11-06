import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {GAUSS_LEGENDRE_ORDER, TABLE_SUBINTERVALS, speedAt} from "../../../bezeg/impl/kernels/arc-length";
import {GraphPalette} from "../../styles/GraphPalette";
import {ARC_PIECES_MAX, ArcLengthModel, ArcMoverMode, buildArcLengthModel, moverArcLength, moverParameter} from "./arcLengthModel";
import type {ArcSpeedPlotController} from "./ArcSpeedPlot";
import type {ReadoutDetailsController} from "../ReadoutDetails";

/** The caption lines on the board: the mover, L, the exact value (PH) and the cusp or zero-length status; each one short. */
const CAPTION_LINES = 4;
/** At most this many cusp parameters are named on the board. */
const CAPTION_CUSPS_MAX = 2;

type Rows = ReadonlyArray<ReadonlyArray<number>>;

interface ArcSettings {
    board: Board;
    /** Polynomial control rows of the curve studied, read lazily so dragging needs no listener. */
    rows: () => Rows | undefined;
    pieces: () => number;
    equalTShown: () => boolean;
    equalArcShown: () => boolean;
    moverMode: () => ArcMoverMode;
    /** The live position of the mover: during playback this is the playback position, not the committed state. */
    moverPosition: () => number;
    /** The exact s(1) of a PH curve, undefined for any other curve. */
    exactLength: () => number | undefined;
    fontSize: () => number;
    plot?: ArcSpeedPlotController;
    details?: ReadoutDetailsController;
    onReadout?: (text: string) => void;
}

/**
 * One owned arc-length overlay: fixed pools of equal-t marks (filled circles) and equal-arc marks (hollow squares), the moving
 * point (a larger diamond) and a short board caption (the long readouts go to the inspector details list). The shapes differ,
 * so the two kinds of mark are told apart without colour.
 * The model (one table, one inversion per mark) is built once per change of rows and N and memoised, so the marks, the
 * caption and the plot of one board update share it. Nothing is draggable; elements read the curve lazily, so no drag
 * listener exists, and the language subscription is released in {@link dispose}.
 */
export class ArcLengthOverlay {
    private readonly board: Board;
    private elements: GeometryElement[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private cache?: { key: number[], model: ArcLengthModel };
    private builds = 0;

    constructor(private readonly settings: ArcSettings) {
        this.board = settings.board;
        this.build();
    }

    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    /** How many times the model was built, for tests (once per change, not once per mark). */
    modelBuilds(): number {
        return this.builds;
    }

    /** The model of the curve as it is now. Memoised on the control rows and N; undefined without a curve. */
    model(): ArcLengthModel | undefined {
        const rows = this.settings.rows();
        if (!rows || rows.length < 2) {
            if (this.cache) {
                this.cache = undefined;
                this.settings.plot?.push({t: [], speed: [], cusps: []});
            }
            return undefined;
        }
        const pieces = this.settings.pieces();
        const key: number[] = [pieces];
        rows.forEach(row => key.push(...row));
        const cached = this.cache;
        if (cached && cached.key.length === key.length && cached.key.every((value, i) => Object.is(value, key[i]))) return cached.model;
        const model = buildArcLengthModel(rows, pieces);
        this.builds++;
        this.cache = {key, model};
        this.settings.plot?.push({
            t: model.speed.t, speed: model.speed.speed, cusps: model.status.kind === 'cusp' ? model.status.parameters : [],
        });
        return model;
    }

    /** The parameter and arc length of the moving point as drawn now. */
    mover(): { t: number, s: number } | undefined {
        const model = this.model();
        if (!model) return undefined;
        const t = moverParameter(model, this.settings.moverMode(), this.settings.moverPosition());
        return {t, s: moverArcLength(model, t)};
    }

    /** The full readout lines (live region and details). Empty without a curve. */
    readoutLines(): string[] {
        const model = this.model();
        if (!model) return [];
        const lang = currentLanguage();
        const num = (value: number, decimals = 4) => formatNumber(value, lang, decimals);
        const mover = this.mover()!;
        const lines = [t("arcparam_readout_t", {value0: num(mover.t), value1: num(mover.s)})];
        if (model.degenerate) {
            lines.push(t("arcparam_readout_degenerate"));
            return lines;
        }
        lines.push(t("arcparam_readout_length", {
            value0: num(model.length, 6), value1: String(GAUSS_LEGENDRE_ORDER), value2: String(TABLE_SUBINTERVALS),
        }));
        const exact = this.settings.exactLength();
        if (exact !== undefined) lines.push(t("arcparam_readout_exact", {value0: num(exact, 6)}));
        lines.push(t("arcparam_readout_bracket", {value0: num(model.bracket.chord, 6), value1: num(model.bracket.polygon, 6)}));
        const n = String(model.pieces);
        if (model.equalT.ratio !== undefined) lines.push(t("arcparam_readout_ratio_t", {value0: n, value1: num(model.equalT.ratio, 3)}));
        if (model.equalArc.ratio !== undefined) lines.push(t("arcparam_readout_ratio_arc", {value0: n, value1: num(model.equalArc.ratio, 3)}));
        lines.push(t("arcparam_readout_polyline", {value0: n, value1: num(model.polylineError, 6)}));
        lines.push(model.status.kind === 'cusp'
            ? t("arcparam_readout_cusp", {value0: model.status.parameters.map(p => num(p, 3)).join("; ")})
            : t("arcparam_readout_regular"));
        return lines;
    }

    readoutText(): string {
        return this.readoutLines().join(" ");
    }

    /** The long readouts for the inspector: every readout line but the mover's t and s(t), so playback leaves them unchanged. */
    detailLines(): string[] {
        return this.readoutLines().slice(1);
    }

    /** The short lines drawn on the board; empty without a curve. */
    captionLines(): string[] {
        const model = this.model();
        if (!model) return [];
        const lang = currentLanguage();
        const num = (value: number, decimals = 4) => formatNumber(value, lang, decimals);
        const mover = this.mover()!;
        const lines = [t("arcparam_readout_t", {value0: num(mover.t), value1: num(mover.s)}).replace(/\.$/, "")];
        if (model.degenerate) {
            lines.push(t("arcparam_caption_degenerate"));
            return lines;
        }
        lines.push(t("arcparam_caption_length", {value0: num(model.length, 6)}));
        const exact = this.settings.exactLength();
        if (exact !== undefined) lines.push(t("arcparam_caption_exact", {value0: num(exact, 6)}));
        if (model.status.kind === 'cusp') {
            const named = model.status.parameters.slice(0, CAPTION_CUSPS_MAX).map(p => num(p, 3)).join("; ");
            lines.push(t("arcparam_caption_cusp", {value0: named + (model.status.parameters.length > CAPTION_CUSPS_MAX ? "…" : "")}));
        }
        return lines;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private build() {
        const board = this.board;
        const auxiliary = {fixed: true, withLabel: false, highlight: false, name: ''};
        const pool = (kind: 'equalT' | 'equalArc', shown: () => boolean, style: Record<string, unknown>) => {
            for (let i = 0; i <= ARC_PIECES_MAX; i++) {
                const at = (axis: 0 | 1) => this.model()?.[kind].points[i]?.[axis] ?? NaN;
                this.create<Point>('point', [() => at(0), () => at(1)], {
                    ...auxiliary, ...style,
                    visible: () => shown() && i < (this.model()?.[kind].points.length ?? 0) && Number.isFinite(at(0)),
                });
            }
        };
        // Filled circles for equal steps in t, hollow squares for equal arcs: the shapes carry the difference, not the colour.
        pool('equalT', () => this.settings.equalTShown(), {
            size: 3, face: 'o', strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve, fillOpacity: 1,
        });
        pool('equalArc', () => this.settings.equalArcShown(), {
            size: 5, face: '[]', strokeColor: GraphPalette.constructionAccent, strokeWidth: 2, fillColor: GraphPalette.boardSurface, fillOpacity: 0,
        });

        const moverPoint = (axis: 0 | 1) => {
            const model = this.model();
            if (!model) return NaN;
            const t = moverParameter(model, this.settings.moverMode(), this.settings.moverPosition());
            return model.table.source.at(t).point[axis];
        };
        this.create<Point>('point', [() => moverPoint(0), () => moverPoint(1)], {
            ...auxiliary, size: 7, face: '<>', strokeColor: GraphPalette.label, strokeWidth: 2, fillColor: GraphPalette.selectedControlPoint, fillOpacity: 1,
            visible: () => Number.isFinite(moverPoint(0)),
        });

        const box = () => board.getBoundingBox();
        const lineHeight = () => (box()[1] - box()[3]) / Math.max(1, board.canvasHeight) * this.settings.fontSize() * 1.35;
        for (let k = 0; k < CAPTION_LINES; k++) {
            this.create<Text>('text', [
                () => box()[0] + 0.02 * (box()[2] - box()[0]),
                () => box()[1] - 0.02 * (box()[1] - box()[3]) - k * lineHeight(),
                () => {
                    if (k === 0) this.report();
                    return this.captionLines()[k] ?? "";
                },
            ], {
                anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false,
                fontSize: () => this.settings.fontSize(), strokeColor: GraphPalette.label,
            });
        }

        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && board.renderer) board.update();
        });
    }

    /** Sends the readout text, the detail lines and the mover marker of the plot; runs once per board update, on the first caption line. */
    private report() {
        this.settings.onReadout?.(this.readoutText());
        this.settings.details?.push(this.detailLines());
        const model = this.model();
        const mover = this.mover();
        if (model && mover) this.settings.plot?.setMarker(mover.t, speedAt(model.table.source, mover.t));
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
