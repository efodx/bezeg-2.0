import React from "react";
import BaseFunctionGraph, {BoundingBox, cleanNumber, DomainError, escapeHtml, FunctionLessonActions, FunctionPanel, LABEL_STYLE, SIGN_STYLE} from "./BaseFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {runAs} from "../base/writes/writeSource";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, MessageParameter, messageNumber, renderMessage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {
    analyzeExtrema, CandidateKind, DerivativeSign, EXTREMA_X_MAX, EXTREMA_X_MIN, EXTREMA_X_STEP, extremaExample, ExtremaAnalysis,
    ExtremaCandidate, ExtremaExample, ExtremaExampleId, EXTREMA_EXAMPLE_IDS,
} from "../../analysis/extrema";
import {chooseExtremaExample, EXTREMA_EXAMPLE_MODELS, ExtremaEndpoint, ExtremaModel, moveExtremaEndpoint} from "../../analysis/extremaModel";
import {extremaEditMessage} from "./extremaMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {RevealButton} from "../../inputs/RevealButton";

/** Values and positions show four decimals so that pi/2 = 1.5708 and sin(4) = -0.7568 can be read off. */
const PRECISE = 4;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<ExtremaExampleId, string>> = {square: "x²", cube: "x³", abs: "|x|", sine: "sin x"};
const FORMULA_TEX: Readonly<Record<ExtremaExampleId, string>> = {square: "x^{2}", cube: "x^{3}", abs: "|x|", sine: "\\sin x"};
const exampleTitle = (id: ExtremaExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;

/**
 * The ids of the extrema declaration: a and b are board pucks, the classification is a switch puck; the readout rows are a, b, one
 * row per candidate and per piece (as many as the example has) and the two global values; the drawn objects are the legend.
 */
export type ExtremaIds = {
    param: "extrema-a" | "extrema-b";
    row: "a" | "b" | "global-minimum" | "global-maximum" | `candidate-${number}` | `piece-${number}`; note: never;
    legend: "function" | "endpoint" | "stationary" | "corner" | "global" | "pieces"; section: never; action: "show-classification";
};


/**
 * Each example has its own view, which becomes the board view whenever the example changes (inspector select or the
 * `extrema-example` lesson action) and for the default scene; a view stored in a preset still wins on import. The bottom margin
 * is an empty band for the board caption (below the x-axis, the a and b labels and the labels under minima), the top margin
 * leaves room for the row of derivative signs. With a fixed aspect ratio the board shows `min(width, height)` of the box
 * vertically, so each box is at least as wide as it is tall and its height is what the board shows.
 */
const EXAMPLE_VIEWS: Readonly<Record<ExtremaExampleId, BoundingBox>> = {
    square: [-6, 4.6, 6, -5.6],
    cube: [-6, 3.4, 6, -4.4],
    abs: [-6, 3.6, 6, -4.2],
    sine: [-7, 3.4, 7, -5],
};

/**
 * How many markers of each kind the board keeps. The candidates of every example in the allowed range fit (sin x has at most
 * two stationary points in [-4, 4]); the graph test scans the range to prove it. The number of board objects never changes.
 */
const SLOTS: Readonly<Record<CandidateKind, number>> = {endpoint: 2, stationary: 2, corner: 1};
/** Below this board width the point labels shorten to the value line and the kind. */
const COMPACT_BOARD_WIDTH = 520;
/** How far beyond an endpoint the curve is probed to see on which side of the point its label has room. */
const OUTWARD_PROBE = 0.4;
/** Rough size of a three-line point label, of its characters and its padding, and of the row of x-axis tick labels (pixels). */
const LABEL_LINES_PX = 60;
const LABEL_CHAR_WIDTH = 0.52;
const LABEL_LINE_HEIGHT = 1.3;
const LABEL_PADDING_PX = 12;
const AXIS_LABEL_ROW_PX = 52;
const COMPACT_ENDPOINT_GAP_PX = 20;
const AXIS_LABEL_ROW_COMPACT_PX = 46;
const MAX_CANDIDATES = SLOTS.endpoint + SLOTS.stationary + SLOTS.corner;
const MAX_PIECES = MAX_CANDIDATES - 1;
const KINDS: readonly CandidateKind[] = ["endpoint", "stationary", "corner"];

/** One face per kind, so the kinds differ by shape and not only by colour. */
const FACES: Readonly<Record<CandidateKind, string>> = {endpoint: "[]", stationary: "<>", corner: "^"};
const KIND_COLORS = (): Readonly<Record<CandidateKind, string>> =>
    ({endpoint: GraphPalette.comparisonCurve, stationary: GraphPalette.constructionAccent, corner: GraphPalette.additionalCurves[1]});

type StatusKind = "hidden" | "revealed" | "corner" | "tie";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    example: ExtremaExample;
    analysis: ExtremaAnalysis;
}

/** Messages joined by a separator message, left to right ("a, b, c"); one part is itself. */
const joinMessages = (key: "extrema_join_comma" | "extrema_join_semicolon", parts: readonly MessageParameter[]): MessageParameter =>
    parts.reduce((joined, part) => message(key, {value0: joined, value1: part}));

/** The sign of f' on a piece as the character the board and the readout show. */
const SIGN_CHARACTER: Readonly<Record<DerivativeSign, string>> = {[-1]: "−", 0: "0", 1: "+"};

/**
 * Local and global extrema of f on the closed interval [a, b]. The model is `{example, a, b, revealed}`; the candidates
 * (endpoints, stationary points, corners), the derivative sign on each piece and the classification are recomputed from it by
 * `src/analysis/extrema` (analytic, no sampling) and never stored.
 *
 * Convention: local extrema are RELATIVE TO THE SELECTED INTERVAL; at an endpoint only one side is compared. The inspector
 * and the board say so. Ties: every candidate that attains the extreme value is global.
 *
 * Rules (reject, never clamp): a < b, both in [-4, 4]. A setter that would break one throws a `DomainError` and leaves the
 * model unchanged; dragging is clamped to the allowed range (one grid step short of the other endpoint) and a drag the model
 * still refuses puts the point back. Number fields, lesson actions and drags use the same setters.
 *
 * `revealed` is part of the model (the Show classification action, lesson element `extrema-classification`), saved with a
 * preset and a lesson checkpoint. Before it is set the candidates are marked with the kind-specific shape and text but are not
 * classified, and neither are the global extreme values shown, so a prediction is not given away. Editing a or b keeps it;
 * choosing an example loads that example's model and hides it again.
 */
export class ExtremaGraph extends BaseFunctionGraph<ExtremaModel> {
    private pointA?: JXG.Point;
    private pointB?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    override presetCollection() {
        return functionPresetCollections.extrema;
    }

    protected defaultModel(): ExtremaModel {
        return {...EXTREMA_EXAMPLE_MODELS.square};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    protected override exampleView() {
        return {key: this.model.example, box: EXAMPLE_VIEWS[this.model.example]};
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per set of model values (see `memoView`). */
    private viewOf(model: ExtremaModel): View {
        return this.memoView(model, () => {
            const example = extremaExample(model.example);
            return {example, analysis: analyzeExtrema(example, model.a, model.b)};
        });
    }

    /** The candidates of one kind, ascending: marker slot k shows the k-th of them. */
    private candidatesOfKind(view: View, kind: CandidateKind): readonly ExtremaCandidate[] {
        return view.analysis.candidates.filter(candidate => candidate.kind === kind);
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    protected setExample(value: unknown): void {
        const choice = chooseExtremaExample(value);
        if (!choice.ok) throw new DomainError(extremaEditMessage(choice.issue));
        this.commitModel(choice.model);
        if (this.generatedObjectCount > 0) this.boardView.setIntent(EXAMPLE_VIEWS[choice.model.example], {keepAspectRatio: true});
    }

    protected setA(value: number, options: { syncScene?: boolean } = {}): void { this.moveEndpoint("a", value, options); }

    protected setB(value: number, options: { syncScene?: boolean } = {}): void { this.moveEndpoint("b", value, options); }

    /** The model module decides (range, order, normalization); a refusal becomes a localized `DomainError`. */
    private moveEndpoint(endpoint: ExtremaEndpoint, value: number, options: { syncScene?: boolean }): void {
        const move = moveExtremaEndpoint(this.model, endpoint, value);
        if (!move.ok) throw new DomainError(extremaEditMessage(move.issue));
        if (move.model !== this.model) this.commitModel(move.model, options);
    }

    protected setRevealed(visible: boolean): void {
        if (visible !== this.model.revealed) this.commitModel({...this.model, revealed: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"extrema-a": value => this.setA(value), "extrema-b": value => this.setB(value)},
            visibility: {"extrema-classification": visible => this.setRevealed(visible)},
            choices: {"extrema-example": value => this.setExample(value)},
        };
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number): string {
        return formatNumber(value, currentLanguage(), PRECISE);
    }

    private kindText(kind: CandidateKind): string {
        return t(kind === "endpoint" ? "extrema_kind_endpoint" : kind === "stationary" ? "extrema_kind_stationary" : "extrema_kind_corner");
    }

    /** "local minimum," and "global minimum" and the like, one part per line: what the classification says about one candidate. A label of two short lines fits the free area between the cards. */
    private classificationLines(candidate: ExtremaCandidate): string[] {
        const parts = [candidate.local === "localMinimum" ? t("extrema_local_minimum") : candidate.local === "localMaximum" ? t("extrema_local_maximum") : t("extrema_not_extremum")];
        if (candidate.isGlobalMinimum) parts.push(t("extrema_global_minimum"));
        if (candidate.isGlobalMaximum) parts.push(t("extrema_global_maximum"));
        return parts.map((part, index) => index < parts.length - 1 ? `${part},` : part);
    }

    /** The lines of a candidate's board label: its value, what kind of point it is, and, once revealed, its classification. */
    private markerLines(model: ExtremaModel, candidate: ExtremaCandidate): string[] {
        const compact = this.isCompact();
        const lines = [`f(${this.number(candidate.x)}) = ${this.number(candidate.value)}`];
        if (candidate.kind === "endpoint") {
            const extra = candidate.derivative === undefined ? t("extrema_board_corner") : candidate.derivative === 0 ? t("extrema_board_stationary") : undefined;
            lines.push(extra === undefined ? this.kindText("endpoint") : `${this.kindText("endpoint")}, ${extra}`);
        } else {
            lines.push(candidate.kind === "stationary" ? t("extrema_board_stationary") : t("extrema_board_corner"));
        }
        // On a narrow board the label is the value and the kind; the classification is in the readout.
        if (model.revealed && !compact) lines.push(...this.classificationLines(candidate));
        return lines;
    }

    private labelFontSize(): number {
        return Math.max(10, this.displaySettings.fontSize * 0.9);
    }

    /**
     * The x range a label may use: the view intent (the box the director maps into the area the cards leave free), not the box on
     * screen, which also reaches under the cards; the top is the board edge, where no card is. No intent yet: the box on screen.
     */
    private roomRange(): [number, number, number] {
        const [shownLeft, shownTop, shownRight] = this.board.getBoundingBox();
        const [left, , right] = this.boardView.intent().box;
        return left < right ? [left, right, shownTop] : [shownLeft, shownRight, shownTop];
    }

    /** The width in px of the card-free area the labels share (the view intent's x range). */
    private freeWidthPx(): number {
        const [left, right] = this.roomRange();
        return (right - left) * this.board.unitX;
    }

    /** A narrow free area gets short labels (the classification is in the readout). */
    private isCompact(): boolean {
        return this.freeWidthPx() < COMPACT_BOARD_WIDTH;
    }

    /**
     * Where a candidate's label sits. An endpoint's label goes outward (a's to the left of a, b's to the right of b) so the two
     * never meet, unless the board has no room on that side; it goes above or below the point, on the side where the curve does
     * not run through it and the x-axis (with the a and b labels) is not in the way. Labels under a point on the axis start below
     * the axis tick labels.
     */
    private labelPlacement(kind: CandidateKind, slot: number, candidate: ExtremaCandidate | undefined, view: View, model: ExtremaModel):
        { anchorX: "left" | "middle" | "right"; anchorY: "top" | "bottom"; dx: number; dy: number } {
        if (candidate === undefined || !this.board) return {anchorX: "middle", anchorY: "bottom", dx: 0, dy: 0};
        const {unitX, unitY} = this.board;
        const [left, right, top] = this.roomRange();
        const heightUnits = LABEL_LINES_PX / unitY;
        let anchorX: "left" | "middle" | "right" = "middle";
        let anchorY: "top" | "bottom";
        let dx = 0;
        if (kind === "endpoint") {
            const outwardSign = slot === 0 ? -1 : 1;
            const widthPx = Math.max(...this.markerLines(model, candidate).map(line => line.length)) * this.labelFontSize() * LABEL_CHAR_WIDTH + LABEL_PADDING_PX;
            const roomPx = (outwardSign < 0 ? candidate.x - left : right - candidate.x) * unitX;
            const outward = roomPx >= widthPx ? outwardSign : -outwardSign;
            // The anchor stays on the outward side (JSXGraph clips text to the board using the previous draw's position); a label
            // with no room outward is moved inward by its width instead.
            anchorX = outwardSign < 0 ? "right" : "left";
            if (outward !== outwardSign) dx = -outwardSign * widthPx / unitX;
            else if (this.isCompact()) dx = outwardSign * COMPACT_ENDPOINT_GAP_PX / unitX; // clear of the a / b label
            const curveAhead = view.example.value(candidate.x + outward * OUTWARD_PROBE);
            const crossesAxis = (below: boolean) => below ? candidate.value > 0 && candidate.value - heightUnits < 0 : candidate.value < 0 && candidate.value + heightUnits > 0;
            const costBelow = (curveAhead < candidate.value ? 1 : 0) + (crossesAxis(true) ? 1.5 : 0);
            // A label that would run past the top of the free area goes below its point instead of being cut.
            const labelHeightPx = this.markerLines(model, candidate).length * this.labelFontSize() * LABEL_LINE_HEIGHT;
            const costAbove = (curveAhead > candidate.value ? 1 : 0) + (crossesAxis(false) ? 1.5 : 0) + ((top - candidate.value) * unitY < labelHeightPx ? 2 : 0);
            anchorY = costBelow < costAbove ? "top" : costAbove < costBelow ? "bottom" : candidate.value > 0 ? "bottom" : "top";
        } else {
            anchorY = model.revealed && candidate.local === "localMinimum" ? "top" : "bottom";
        }
        const row = this.isCompact() ? AXIS_LABEL_ROW_COMPACT_PX : AXIS_LABEL_ROW_PX;
        const onAxis = Math.abs(candidate.value) * unitY < row;
        // A label below its point (and below the axis tick row) that would run past the bottom edge goes above the point instead, when that fits.
        if (anchorY === "top") {
            const [, shownTop, , shownBottom] = this.board.getBoundingBox();
            const heightPx = this.markerLines(model, candidate).length * this.labelFontSize() * LABEL_LINE_HEIGHT;
            const belowRoomPx = (candidate.value - shownBottom) * unitY - (kind !== "endpoint" && onAxis ? row : 0);
            if (belowRoomPx < heightPx && (shownTop - candidate.value) * unitY >= heightPx) anchorY = "bottom";
        }
        return {anchorX, anchorY, dx, dy: anchorY === "top" && kind !== "endpoint" && onAxis ? -row / unitY : 0};
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = this.displayThinWidth(0.5);
        const fontSize = () => this.displaySettings.fontSize;
        const colors = KIND_COLORS();
        const candidate = (kind: CandidateKind, slot: number): ExtremaCandidate | undefined => this.candidatesOfKind(view(), kind)[slot];

        // Vertical dashed lines at the candidates separate the pieces; horizontal ones mark the global values once revealed.
        for (let index = 0; index < MAX_CANDIDATES; index++) {
            const x = () => view().analysis.candidates[index]?.x ?? 0;
            const separator = this.own(board.create("line", [[x, 0], [x, 1]], {
                straightFirst: true, straightLast: true, strokeColor: GraphPalette.referenceCurve, dash: 3, strokeWidth: thin, highlight: false, fixed: true,
                withLabel: false, visible: () => view().analysis.candidates[index] !== undefined,
            }));
            if (index === 0) this.drawn.set("pieces", separator);
        }
        const globalLine = (value: () => number) => this.own(board.create("line", [[0, value], [1, value]], {
            straightFirst: true, straightLast: true, strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: thin, highlight: false, fixed: true,
            withLabel: false, visible: () => model().revealed,
        }));
        this.drawn.set("global", globalLine(() => view().analysis.globalMinimum));
        globalLine(() => view().analysis.globalMaximum);

        this.drawn.set("function", this.own(board.create("functiongraph", [(x: number) => view().example.value(x)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        })));

        // The derivative sign of every piece, in a row at the top of the view, centred on the piece.
        const stripY = () => {
            const [, top, , bottom] = board.getBoundingBox();
            return top - 0.07 * (top - bottom);
        };
        for (let index = 0; index < MAX_PIECES; index++) {
            const piece = () => view().analysis.pieces[index];
            this.own(board.create("text", [() => piece() ? this.signMarkX(piece().from, piece().to) : 0, stripY, () => piece() ? SIGN_CHARACTER[piece().sign] : ""], {
                anchorX: "middle", anchorY: "top", fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
                fontSize: () => fontSize() * 1.5, cssStyle: SIGN_STYLE, highlightCssStyle: SIGN_STYLE, visible: () => piece() !== undefined,
            }));
        }

        // The candidates: one marker and one label per slot of each kind (distinct shapes, texts in words).
        for (const kind of KINDS) {
            for (let slot = 0; slot < SLOTS[kind]; slot++) {
                const current = () => candidate(kind, slot);
                const marker = this.own(board.create("point", [() => current()?.x ?? 0, () => current()?.value ?? 0], {
                    ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, face: FACES[kind], visible: () => current() !== undefined,
                    size: () => Math.max(4, this.displaySettings.pointSize), fillColor: colors[kind], highlightFillColor: colors[kind],
                    strokeColor: colors[kind], highlightStrokeColor: colors[kind],
                }));
                if (slot === 0) this.drawn.set(kind, marker as JXG.GeometryElement);
                const html = () => {
                    const c = current();
                    return c ? this.markerLines(model(), c).map(line => `<div>${escapeHtml(line)}</div>`).join("") : "";
                };
                const placement = () => this.labelPlacement(kind, slot, current(), view(), model());
                this.own(board.create("text", [() => {
                    const c = current();
                    return c === undefined ? 0 : c.x + placement().dx;
                }, () => {
                    const c = current();
                    return c === undefined ? 0 : c.value + placement().dy;
                }, html], {
                    anchorX: () => placement().anchorX, anchorY: () => placement().anchorY,
                    fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label, fontSize: () => this.labelFontSize(),
                    cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE, visible: () => current() !== undefined,
                }));
            }
        }

        // a and b are dragged along the x-axis, projected onto the grid and onto the range a < b allows; a value the model still refuses puts the point back.
        this.pointA = this.axisPoint({
            x: model().a, name: "$$a$$", placement: "below-left", step: EXTREMA_X_STEP,
            min: () => EXTREMA_X_MIN, max: () => cleanNumber(model().b - EXTREMA_X_STEP), write: x => this.setA(x, {syncScene: false}),
        });
        this.pointB = this.axisPoint({
            x: model().b, name: "$$b$$", placement: "below-right", step: EXTREMA_X_STEP,
            min: () => cleanNumber(model().a + EXTREMA_X_STEP), max: () => EXTREMA_X_MAX, write: x => this.setB(x, {syncScene: false}),
        });

        // Nothing else stays on the board: the formula is a declared row, a, b, the global values and the pieces are readout rows, and the
        // two keys (the shapes of the kinds, the signs row) are legend entries (owner, 2026-11-27).
    }

    protected override syncSceneToModel(): void {
        const {a, b} = this.model;
        this.pointA?.moveTo([a, 0]);
        this.pointB?.moveTo([b, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {example, a, b} = this.model;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("extrema_example_label")} value={example} help={t("extrema_example_help")}
                              options={EXTREMA_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <PuckOwnedGroup params={["extrema-a", "extrema-b"]} className="inspector-group">
                <PuckOwned param="extrema-a"><Slider customText={t("extrema_a_label")} value={a} min={EXTREMA_X_MIN} max={EXTREMA_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("extrema_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/></PuckOwned>
                <PuckOwned param="extrema-b"><Slider customText={t("extrema_b_label")} value={b} min={EXTREMA_X_MIN} max={EXTREMA_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("extrema_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setB(next))}/></PuckOwned>
                <p className="inspector-help">{t("extrema_order_help")}</p>
            </PuckOwnedGroup>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const {revealed} = this.model;
        return <PuckOwnedGroup params={["show-classification"]}>
            <div className="extrema-actions" role="group" aria-label={t("extrema_actions_label")}>
                <RevealButton action="toggle-classification" revealed={revealed} showLabel={t("extrema_show_classification")} hideLabel={t("extrema_hide_classification")}
                              onToggle={() => this.setRevealed(!this.model.revealed)}/>
            </div>
            <p className="inspector-help">{t("extrema_classification_help")}</p>
        </PuckOwnedGroup>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "extrema-a": {read: () => this.model.a, apply: (value: number) => this.setA(value)},
            "extrema-b": {read: () => this.model.b, apply: (value: number) => this.setB(value)},
        };
    }

    /**
     * The common declaration (rows, note, view marks) plus a and b as board pucks, the classification as a switch puck and the legend
     * of the drawn objects. A legend entry is listed only while its object is drawn: a kind with no candidate in the interval has
     * none, and the global values are listed once the classification is shown (a hidden classification is not given away).
     */
    protected override declaration(): GraphDeclaration {
        const model = this.model;
        const {analysis} = this.viewOf(model);
        const has = (kind: CandidateKind) => analysis.candidates.some(candidate => candidate.kind === kind);
        const endpoint = (key: "extrema-a" | "extrema-b", label: "extrema_a_name" | "extrema_b_name", symbol: string) => ({
            key, kind: "range" as const, label: message(label), symbol, help: message("extrema_order_help"), placement: "board" as const,
            min: EXTREMA_X_MIN, max: EXTREMA_X_MAX, step: EXTREMA_X_STEP, maxDecimals: PRECISE,
        });
        return {
            ...this.commonDeclaration(),
            formula: {label: message("extrema_formula_label"), tex: `f(x)=${FORMULA_TEX[model.example]}`},
            parameters: [endpoint("extrema-a", "extrema_a_name", "a"), endpoint("extrema-b", "extrema_b_name", "b")],
            legend: [
                {id: "function", label: message("extrema_legend_function"), kind: "line", object: "function"},
                {id: "endpoint", label: message("extrema_legend_endpoint"), kind: "point", object: "endpoint"},
                ...(has("stationary") ? [{id: "stationary" as const, label: message("extrema_legend_stationary"), kind: "point" as const, object: "stationary"}] : []),
                ...(has("corner") ? [{id: "corner" as const, label: message("extrema_legend_corner"), kind: "point" as const, object: "corner"}] : []),
                ...(model.revealed ? [{id: "global" as const, label: message("extrema_legend_global"), kind: "dashed" as const, object: "global"}] : []),
                {id: "pieces", label: message("extrema_legend_pieces"), kind: "dashed", object: "pieces"},
            ],
            actions: [
                {id: "show-classification", label: message("extrema_actions_label"), help: message("extrema_classification_help"), placement: "board", enabled: true,
                    pressed: model.revealed, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "show-classification") runAs("learner", () => this.setRevealed(!this.model.revealed));
        else throw new Error("Unknown action");
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp("strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** The statuses to state in words (no changing numbers: they are announced on every drag step); each has a stable id. */
    private statuses(model: ExtremaModel, view: View): { id: StatusKind; text: Message }[] {
        const {analysis} = view;
        const result: { id: StatusKind; text: Message }[] = [{id: model.revealed ? "revealed" : "hidden", text: message(model.revealed ? "extrema_status_revealed" : "extrema_status_hidden")}];
        if (analysis.candidates.some(candidate => candidate.kind === "corner")) result.push({id: "corner", text: message("extrema_status_corner")});
        if (model.revealed && (analysis.globalMinimumAt.length > 1 || analysis.globalMaximumAt.length > 1)) result.push({id: "tie", text: message("extrema_status_tie")});
        return result;
    }

    private kindMessage(kind: CandidateKind): Message {
        return message(kind === "endpoint" ? "extrema_kind_endpoint" : kind === "stationary" ? "extrema_kind_stationary" : "extrema_kind_corner");
    }

    private classificationMessage(candidate: ExtremaCandidate): MessageParameter {
        const parts: Message[] = [message(candidate.local === "localMinimum" ? "extrema_local_minimum" : candidate.local === "localMaximum" ? "extrema_local_maximum" : "extrema_not_extremum")];
        if (candidate.isGlobalMinimum) parts.push(message("extrema_global_minimum"));
        if (candidate.isGlobalMaximum) parts.push(message("extrema_global_maximum"));
        return joinMessages("extrema_join_comma", parts);
    }

    private globalMessage(value: number, at: readonly number[]): Message {
        return message("extrema_readout_global_value", {value0: messageNumber(value, PRECISE), value1: joinMessages("extrema_join_semicolon", at.map(x => messageNumber(x, PRECISE)))});
    }

    /**
     * Declared by the base (task 08): the readout rows, the note, the statuses and the drawn curve; the readout panel is drawn from
     * the same data. The marks keep the labels of the candidates (above and below the point) and the row of signs in sight.
     */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const {analysis} = view;
        const hidden = message("extrema_hidden");
        const [, top, , bottom] = EXAMPLE_VIEWS[model.example];
        const labelHeight = 0.14 * (top - bottom);
        const signRow = top - 0.07 * (top - bottom);
        return {
            rows: [
                {id: "a", name: message("extrema_a_name"), symbol: "a", value: messageNumber(model.a, PRECISE)},
                {id: "b", name: message("extrema_b_name"), symbol: "b", value: messageNumber(model.b, PRECISE)},
                ...analysis.candidates.map((candidate, index) => {
                    const derivative = candidate.derivative === undefined ? message("extrema_derivative_none") : messageNumber(candidate.derivative, PRECISE);
                    const base = message("extrema_readout_candidate_value", {value0: messageNumber(candidate.value, PRECISE), value1: derivative});
                    return {
                        id: `candidate-${index}` as const,
                        name: message("extrema_readout_candidate", {value0: this.kindMessage(candidate.kind), value1: messageNumber(candidate.x, PRECISE)}),
                        value: model.revealed ? message("extrema_join_semicolon", {value0: base, value1: this.classificationMessage(candidate)}) : base,
                    };
                }),
                ...analysis.pieces.map((piece, index) => ({
                    id: `piece-${index}` as const,
                    name: message("extrema_readout_piece", {value0: messageNumber(piece.from, PRECISE), value1: messageNumber(piece.to, PRECISE)}),
                    value: message(piece.sign > 0 ? "extrema_piece_increasing" : piece.sign < 0 ? "extrema_piece_decreasing" : "extrema_piece_constant"),
                })),
                {id: "global-minimum", name: message("extrema_readout_global_minimum"), value: model.revealed ? this.globalMessage(analysis.globalMinimum, analysis.globalMinimumAt) : hidden},
                {id: "global-maximum", name: message("extrema_readout_global_maximum"), value: model.revealed ? this.globalMessage(analysis.globalMaximum, analysis.globalMaximumAt) : hidden},
            ],
            help: message("extrema_note"),
            status: this.statuses(model, view),
            plotted: [(x: number) => view.example.value(x)],
            must: [
                {x: model.a, y: 0}, {x: model.b, y: 0},
                // The label of a candidate stands above or below its point (see `labelPlacement`), the signs in a row at the top of the view.
                ...analysis.candidates.flatMap(candidate => [{x: candidate.x, y: candidate.value + labelHeight}, {x: candidate.x, y: candidate.value - labelHeight}]),
                ...analysis.pieces.map(piece => ({x: (piece.from + piece.to) / 2, y: signRow})),
            ],
        };
    }

    protected renderReadout(): React.ReactNode {
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="extrema-status" dataAttribute="extrema-status" lines={(this.functionPanel().status ?? []).map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }
}

export default ExtremaGraph;
