import type {Board, GeometryElement, Text} from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../../localization";
import {formatNumber} from "../../../analysis/format";
import {GraphPalette} from "../../styles/GraphPalette";
import {CombGeometry, CombJoin, computeComb, largestJoin, SpanRows} from "./curveComb";

interface CombSettings {
    board: Board;
    /** Control rows of every Bezier span of the curve studied, read lazily so dragging needs no listener. */
    spans: () => SpanRows | undefined;
    shown: () => boolean;
    count: () => number;
    gain: () => number;
    fontSize: () => number;
}

type DataCurve = GeometryElement & { dataX: number[]; dataY: number[]; updateDataArray: () => void };

const EMPTY: CombGeometry = {teethX: [], teethY: [], tipX: [], tipY: [], clippedX: [], clippedY: [], joins: [], toothCount: 0, clippedCount: 0};

/**
 * One owned comb: a JSXGraph curve for all teeth, one for the line through their tips, one for the cross-bars of clipped
 * teeth (ADR 0041), and a board text for the largest curvature jump at a join. All of them read the curve lazily in
 * `updateDataArray`, so no drag listener exists; the language subscription is released in {@link dispose}.
 */
export class CombOverlay {
    private readonly board: Board;
    private elements: GeometryElement[] = [];
    private stopLanguageUpdates?: () => void;
    private disposed = false;
    private cache?: { key: number[]; geometry: CombGeometry };

    constructor(private readonly settings: CombSettings) {
        this.board = settings.board;
        this.build();
    }

    /** The created elements, for ownership checks. */
    ownedElements(): readonly GeometryElement[] {
        return this.elements;
    }

    /**
     * The comb of the curve as it is now; empty while the comb is off. Memoised on the control rows, count and gain, so the
     * three curves and the readout of one board update compute it once.
     */
    geometry(): CombGeometry {
        if (!this.settings.shown()) return EMPTY;
        const spans = this.settings.spans();
        if (!spans) return EMPTY;
        const count = this.settings.count(), gain = this.settings.gain();
        const key: number[] = [count, gain];
        spans.forEach(rows => { key.push(rows.length); rows.forEach(row => key.push(...row)); });
        const cached = this.cache;
        if (cached && cached.key.length === key.length && cached.key.every((value, i) => Object.is(value, key[i]))) return cached.geometry;
        const geometry = computeComb(spans, count, gain);
        this.cache = {key, geometry};
        return geometry;
    }

    /** The join with the largest |jump| (see {@link largestJoin}), or undefined while the comb is off or no join has a jump. */
    largestJoin(): CombJoin | undefined {
        return largestJoin(this.geometry().joins);
    }

    /** Every interior join's one-sided curvatures, in order. */
    joinCurvatures(): readonly CombJoin[] {
        return this.geometry().joins;
    }

    private create<E extends GeometryElement>(type: string, parents: unknown[], attributes: Record<string, unknown>): E {
        const element = this.board.create(type, parents as never, attributes as never) as unknown as E;
        this.elements.push(element);
        return element;
    }

    private dataCurve(pick: (geometry: CombGeometry) => [number[], number[]], attributes: Record<string, unknown>) {
        const curve = this.create<DataCurve>('curve', [[], []], {fixed: true, highlight: false, withLabel: false, ...attributes});
        curve.updateDataArray = () => {
            const [x, y] = pick(this.geometry());
            curve.dataX = x;
            curve.dataY = y;
        };
    }

    private build() {
        const board = this.board;
        // Teeth are dashed-free thin strokes; the tip line is heavier so the two read apart without colour.
        this.dataCurve(g => [g.teethX, g.teethY], {strokeColor: GraphPalette.comparisonCurve, strokeWidth: 1.5});
        this.dataCurve(g => [g.tipX, g.tipY], {strokeColor: GraphPalette.primaryCurve, strokeWidth: 2.5});
        // A clipped tooth gets a cross-bar at its tip: a different shape from a tooth, not only another colour.
        this.dataCurve(g => [g.clippedX, g.clippedY], {strokeColor: GraphPalette.warningText, strokeWidth: 3});

        const box = () => board.getBoundingBox();
        this.create<Text>('text', [
            () => box()[0] + 0.02 * (box()[2] - box()[0]),
            () => box()[1] - 0.02 * (box()[1] - box()[3]),
            () => this.readoutText(),
        ], {
            anchorX: 'left', anchorY: 'top', fixed: true, highlight: false, useMathJax: false,
            fontSize: () => this.settings.fontSize(), strokeColor: GraphPalette.label,
        });

        // Board text is recomputed only on board update, which a language change does not trigger.
        this.stopLanguageUpdates = onLanguageChange(() => {
            if (!this.disposed && board.renderer) board.update();
        });
    }

    /**
     * The largest |jump| at a join; when some join has an undefined curvature, that is said as well, so a singular join
     * never disappears behind a defined one. Empty without joins or while off.
     */
    readoutText(): string {
        const joins = this.joinCurvatures();
        const num = (value: number) => formatNumber(value, currentLanguage(), 4);
        const best = largestJoin(joins);
        const singular = joins.find(join => join.jump === undefined);
        const lines: string[] = [];
        if (best) {
            lines.push(t("comb_readout_join", {
                value0: String(best.index + 1), value1: num(best.kappaLeft!), value2: num(best.kappaRight!), value3: num(best.jump!),
            }));
        }
        if (singular) lines.push(t("comb_readout_join_singular", {value0: String(singular.index + 1)}));
        return lines.join(" ");
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
