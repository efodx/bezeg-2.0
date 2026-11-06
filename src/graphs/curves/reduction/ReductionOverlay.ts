import type {ReadoutDetailsController} from "../ReadoutDetails";
import type {Board, GeometryElement, Point, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {GraphPalette} from "../../styles/GraphPalette";
import {
    controlPointBound, elevatedQuadratic, isExactlyReducible, l2Error, maxCurveError, reduce, ReductionMode, thirdDifference,
} from "../../../bezeg/impl/kernels/degree-reduction";

/** Points per drawn curve: the quadratic is smooth at this density at classroom sizes. */
export const REDUCTION_CURVE_SAMPLES = 100;
/** Caption lines on the board: reducibility and maximum error. The other readouts would cover the curve on a phone, so they stay in the inspector. */
const CAPTION_LINES = 2;

type Rows = ReadonlyArray<ReadonlyArray<number>>;

interface ReductionSettings {
    board: Board;
    /** The four control rows of the cubic, read lazily so dragging needs no listener. */
    rows: () => Rows | undefined;
    mode: () => ReductionMode;
    reducedShown: () => boolean;
    elevationShown: () => boolean;
    fontSize: () => number;
    /** Called with the readout text on every board update that draws it (for a live region). */
    onReadout?: (text: string) => void;
    /** Receives every readout line for the inspector list. */
    details?: ReadoutDetailsController;
}

/** Everything one reduction of the current cubic yields; computed once per change of control points or mode. */
export interface ReductionResult {
    cubic: number[][];
    quadratic: number[][];
    elevated: number[][];
    third: number[];
    reducible: boolean;
    maxError: number;
    l2: number;
    bound: number;
}

type DataCurve = GeometryElement & { dataX: number[]; dataY: number[]; updateDataArray: () => void; needsUpdate: boolean; update: () => void };

function quadraticSamples(q: number[][]): { x: number[]; y: number[] } {
    const x: number[] = [], y: number[] = [];
    for (let i = 0; i < REDUCTION_CURVE_SAMPLES; i++) {
        const s = i / (REDUCTION_CURVE_SAMPLES - 1), u = 1 - s;
        x.push(u * u * q[0][0] + 2 * u * s * q[1][0] + s * s * q[2][0]);
        y.push(u * u * q[0][1] + 2 * u * s * q[1][1] + s * s * q[2][1]);
    }
    return {x, y};
}

/**
 * One owned degree-reduction overlay (D1): the reduced quadratic, its three control points, the four-point elevated net of
 * the quadratic (dashed polygon with small points) and a board caption of the readouts. Nothing is draggable. The reduction is
 * memoised on the control points and the mode, so all elements of one board update share one computation. Elements read the
 * curve lazily, so no drag listener exists; the language subscription is released in {@link dispose}.
 */
export class ReductionOverlay {
    private readonly board: Board;
    private elements: GeometryElement[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private cache?: { key: number[]; result: ReductionResult };

    constructor(private readonly settings: ReductionSettings) {
        this.board = settings.board;
        this.build();
    }

    /** The created elements, for ownership checks. */
    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    /** The reduction of the cubic as it is now; undefined unless the curve has exactly four finite control points. */
    result(): ReductionResult | undefined {
        const rows = this.settings.rows();
        if (!rows || rows.length !== 4 || !rows.every(row => row.length === 2 && row.every(Number.isFinite))) {
            this.cache = undefined;
            return undefined;
        }
        const mode = this.settings.mode();
        const key = [mode === 'fixed' ? 0 : 1, ...rows.flat()];
        const cached = this.cache;
        if (cached && cached.key.every((value, i) => Object.is(value, key[i]))) return cached.result;
        const cubic = rows.map(row => [...row]);
        const quadratic = reduce(cubic, mode);
        const result: ReductionResult = {
            cubic, quadratic, elevated: elevatedQuadratic(quadratic), third: thirdDifference(cubic), reducible: isExactlyReducible(cubic),
            maxError: maxCurveError(cubic, quadratic), l2: l2Error(cubic, quadratic), bound: controlPointBound(cubic, quadratic),
        };
        this.cache = {key, result};
        return result;
    }

    /** Every readout line; feeds the live region and the inspector list. Empty without a four-point curve. */
    readoutLines(): string[] {
        const r = this.result();
        if (!r) return [];
        const num = (value: number, decimals = 4) => formatNumber(value, currentLanguage(), decimals);
        return [
            t("reduction_readout_third", {value0: num(r.third[0]), value1: num(r.third[1])}),
            r.reducible ? t("reduction_readout_reducible") : t("reduction_readout_not_reducible"),
            // Sampled, so only four decimals are meaningful.
            t("reduction_readout_max_error", {value0: num(r.maxError)}),
            t("reduction_readout_l2_error", {value0: num(r.l2, 6)}),
            t("reduction_readout_bound", {value0: num(r.bound)}),
        ];
    }

    readoutText(): string {
        return this.readoutLines().join(" ");
    }

    /** The board lines: reducibility and maximum error. */
    private captionLines(): string[] {
        return this.readoutLines().slice(1, 1 + CAPTION_LINES);
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private dataCurve(attributes: Record<string, unknown>, data: () => { x: number[]; y: number[] }): DataCurve {
        const curve = this.create<DataCurve>('curve', [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes});
        curve.updateDataArray = () => {
            const d = data();
            curve.dataX = d.x;
            curve.dataY = d.y;
        };
        // Creation ran the default (empty) data; draw the real data now rather than at the next board update.
        curve.needsUpdate = true;
        curve.update();
        return curve;
    }

    private build() {
        const board = this.board;
        const auxiliary = {fixed: true, withLabel: false, highlight: false, name: ''};
        const reduced = () => this.settings.reducedShown();
        const elevated = () => this.settings.elevationShown();
        const empty = {x: [] as number[], y: [] as number[]};

        this.dataCurve({strokeColor: GraphPalette.comparisonCurve, strokeWidth: 2, dash: 3, visible: reduced}, () => {
            const r = reduced() ? this.result() : undefined;
            return r ? quadraticSamples(r.quadratic) : empty;
        });
        for (let i = 0; i < 3; i++) {
            this.create<Point>('point', [() => this.result()?.quadratic[i][0] ?? NaN, () => this.result()?.quadratic[i][1] ?? NaN], {
                ...auxiliary, visible: reduced, size: 4, face: '<>', strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve,
            });
        }
        this.dataCurve({strokeColor: GraphPalette.comparisonCurve, strokeWidth: 1, dash: 2, visible: elevated}, () => {
            const r = elevated() ? this.result() : undefined;
            return r ? {x: r.elevated.map(p => p[0]), y: r.elevated.map(p => p[1])} : empty;
        });
        for (let i = 0; i < 4; i++) {
            this.create<Point>('point', [() => this.result()?.elevated[i][0] ?? NaN, () => this.result()?.elevated[i][1] ?? NaN], {
                ...auxiliary, visible: elevated, size: 2, face: 'o', strokeColor: GraphPalette.comparisonCurve, fillColor: GraphPalette.comparisonCurve,
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
                    if (k === 0) {
                        this.settings.onReadout?.(this.readoutText());
                        this.settings.details?.push(this.readoutLines());
                    }
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
