import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {GraphPalette} from "../../styles/GraphPalette";
import {envelopeFamily, EnvelopeFamily, isCollinear, tangentSegment} from "./curveEnvelope";

/** Caption lines on the board: the line count, t, and the collinear note. */
const CAPTION_LINES = 3;
/** The lines that are always short: the count and t. */
const CAPTION_SHORT_LINES = 2;
/** Board width in font sizes below which the collinear note is left to the inspector. */
const CAPTION_NOTE_MIN_WIDTH = 24;

type Rows = ReadonlyArray<ReadonlyArray<number>>;

interface EnvelopeSettings {
    board: Board;
    /** Polynomial control rows of the curve studied, read lazily so dragging needs no listener. */
    rows: () => Rows | undefined;
    t: () => number;
    count: () => number;
    linesShown: () => boolean;
    touchShown: () => boolean;
    fontSize: () => number;
    /** Called with the readout text on every board update that draws it (for a live region). */
    onReadout?: (text: string) => void;
    /** Called with the translated readout after a language change, which must not wait for the quiet period. */
    onLanguageReadout?: (text: string) => void;
}

type DataCurve = GeometryElement & { dataX: number[]; dataY: number[]; updateDataArray: () => void; needsUpdate: boolean; update: () => void };

const NONE: EnvelopeFamily = {x: [], y: []};

/** The family is drawn in this many bands of consecutive lines, one curve each; the colour runs along the bands. */
export const FAMILY_BANDS = 8;
const FAMILY_LINE_WIDTH = 1;
const CURRENT_LINE_WIDTH = 4;

function rgb(hex: string): number[] {
    return [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
}

/** Linear interpolation in RGB between two "#rrggbb" colours, `amount` from 0 (from) to 1 (to). */
export function mixColors(from: string, to: string, amount: number): string {
    const a = rgb(from), b = rgb(to);
    return '#' + a.map((value, k) => Math.round(value + (b[k] - value) * amount).toString(16).padStart(2, '0')).join('');
}

/** The colour of family band `band` of {@link FAMILY_BANDS}: the comparison blue at the first, teal at the last. */
export function familyBandColor(band: number): string {
    return mixColors(GraphPalette.comparisonCurve, GraphPalette.additionalCurves[0], band / (FAMILY_BANDS - 1));
}

/** The lines `first` to `end` (exclusive) of a family, as one NaN-separated curve. */
function familySlice(family: EnvelopeFamily, first: number, end: number): EnvelopeFamily {
    return end > first ? {x: family.x.slice(3 * first, 3 * end - 1), y: family.y.slice(3 * first, 3 * end - 1)} : NONE;
}

/**
 * One owned envelope overlay: the family of de Casteljau lines as one NaN-separated curve, the highlighted line at t, the
 * touching point and a board caption. Elements read the curve lazily, so no drag listener exists; the language
 * subscription is released in {@link dispose}.
 */
export class EnvelopeOverlay {
    private readonly board: Board;
    private elements: GeometryElement[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;

    constructor(private readonly settings: EnvelopeSettings) {
        this.board = settings.board;
        this.build();
    }

    /** The created elements, for ownership checks. */
    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    /** The family lines as they are now. */
    family(): EnvelopeFamily {
        const rows = this.settings.rows();
        return rows ? envelopeFamily(rows, this.settings.count()) : NONE;
    }

    /** The highlighted line and the touching point at t, or undefined without a curve. */
    current() {
        const rows = this.settings.rows();
        return rows ? tangentSegment(rows, this.settings.t()) : undefined;
    }

    /** Collinear to within one screen pixel: a drag cannot land closer, and at that distance the curve looks like the segment. A board without a size has no pixel. */
    collinear(): boolean {
        const rows = this.settings.rows();
        const unit = Math.min(this.board.unitX, this.board.unitY);
        const pixel = this.board.canvasWidth > 0 && this.board.canvasHeight > 0 && unit > 0 ? 1 / unit : 0;
        return rows !== undefined && isCollinear(rows, pixel);
    }

    /** The caption lines: number of lines, t, and for collinear control points the note that there is no envelope. Empty without a curve. */
    readoutLines(): string[] {
        if (!this.settings.rows()) return [];
        const num = (value: number) => formatNumber(value, currentLanguage(), 3);
        const lines = [
            t("envelope_readout_lines", {value0: String(this.settings.count())}),
            t("envelope_readout_t", {value0: num(this.settings.t())}),
        ];
        if (this.collinear()) lines.push(t("envelope_readout_collinear"));
        return lines;
    }

    readoutText(): string {
        return this.readoutLines().join(" ");
    }

    /** What the board shows: a narrow board keeps the short lines. The inspector and the live region always state the note. */
    private captionLines(): string[] {
        const lines = this.readoutLines();
        const width = this.board.canvasWidth;
        return width > 0 && width < CAPTION_NOTE_MIN_WIDTH * this.settings.fontSize() ? lines.slice(0, CAPTION_SHORT_LINES) : lines;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private dataCurve(attributes: Record<string, unknown>, data: () => EnvelopeFamily): DataCurve {
        const curve = this.create<DataCurve>('curve', [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes});
        curve.updateDataArray = () => {
            const values = data();
            curve.dataX = values.x;
            curve.dataY = values.y;
        };
        // Creation ran the default (empty) data; draw the real data now rather than at the next board update.
        curve.needsUpdate = true;
        curve.update();
        return curve;
    }

    private build() {
        const board = this.board;
        // Under the Bezier curve (layer 5), so at 200 lines the curve stays drawn on top of the family; above the control polygon's layer 3.
        // Eight bands of consecutive lines, cool and thin, blue to teal along the family, so the fan reads as an ordered family.
        for (let band = 0; band < FAMILY_BANDS; band++) {
            this.dataCurve({strokeColor: familyBandColor(band), strokeWidth: FAMILY_LINE_WIDTH, layer: 4, visible: () => this.settings.linesShown()}, () => {
                if (!this.settings.linesShown()) return NONE;
                const count = this.settings.count();
                return familySlice(this.family(), Math.floor(band * count / FAMILY_BANDS), Math.floor((band + 1) * count / FAMILY_BANDS));
            });
        }

        // The line at t and its touching point: the construction accent, above the family, the line clearly wider than a family line.
        this.dataCurve({strokeColor: GraphPalette.constructionAccent, strokeWidth: CURRENT_LINE_WIDTH, visible: () => this.settings.touchShown()}, () => {
            const segment = this.settings.touchShown() ? this.current() : undefined;
            return segment ? {x: [segment.q0[0], segment.q1[0]], y: [segment.q0[1], segment.q1[1]]} : NONE;
        });

        this.create<Point>('point', [
            () => this.current()?.touch[0] ?? NaN,
            () => this.current()?.touch[1] ?? NaN,
        ], {
            fixed: true, withLabel: false, highlight: false, name: '', size: 4, strokeColor: GraphPalette.pointOutline,
            fillColor: GraphPalette.constructionAccent, visible: () => this.settings.touchShown() && this.current() !== undefined,
        });

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
            if (this.disposed || !board.renderer) return;
            board.update();
            this.settings.onLanguageReadout?.(this.readoutText());
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
        if (present.length) this.board.removeObject(present);
    }
}
