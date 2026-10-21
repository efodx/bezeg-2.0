import React from "react";
import BaseFunctionGraph, {cleanNoise, cleanNumber, DomainError, escapeHtml, FunctionLessonActions, LABEL_STYLE, SIGN_STYLE} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {
    analyzeExtrema, CandidateKind, DerivativeSign, EXTREMA_EXAMPLE_IDS, EXTREMA_X_MAX, EXTREMA_X_MIN, EXTREMA_X_STEP, extremaExample, ExtremaAnalysis,
    ExtremaCandidate, ExtremaExample, ExtremaExampleId, isExtremaExampleId, isExtremaX,
} from "../../analysis/extrema";
import {EXTREMA_EXAMPLE_MODELS, ExtremaModel} from "../../analysis/extremaModel";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** Values and positions show four decimals so that pi/2 = 1.5708 and sin(4) = -0.7568 can be read off. */
const PRECISE = 4;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<ExtremaExampleId, string>> = {square: "x²", cube: "x³", abs: "|x|", sine: "sin x"};
const exampleTitle = (id: ExtremaExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;

type BoundingBox = [left: number, top: number, right: number, bottom: number];

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

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    protected setExample(value: unknown): void {
        if (!isExtremaExampleId(value)) throw new DomainError(`The example must be one of ${EXTREMA_EXAMPLE_IDS.join(", ")}.`);
        this.commitModel({...EXTREMA_EXAMPLE_MODELS[value], revealed: false});
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...EXAMPLE_VIEWS[value]], true);
    }

    protected setA(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isExtremaX(value)) throw new DomainError(`The endpoint a must be a finite number between ${EXTREMA_X_MIN} and ${EXTREMA_X_MAX}.`);
        if (!(value < this.model.b)) throw new DomainError("The endpoint a must be less than b (a < b): move b first.");
        const next = cleanNoise(value);
        if (next !== this.model.a) this.commitModel({...this.model, a: next}, options);
    }

    protected setB(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isExtremaX(value)) throw new DomainError(`The endpoint b must be a finite number between ${EXTREMA_X_MIN} and ${EXTREMA_X_MAX}.`);
        if (!(value > this.model.a)) throw new DomainError("The endpoint b must be greater than a (a < b): move a first.");
        const next = cleanNoise(value);
        if (next !== this.model.b) this.commitModel({...this.model, b: next}, options);
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

    private derivativeText(candidate: ExtremaCandidate): string {
        return candidate.derivative === undefined ? t("extrema_derivative_none") : this.number(candidate.derivative);
    }

    /** "local minimum, global minimum" and the like: what the classification says about one candidate. */
    private classificationText(candidate: ExtremaCandidate): string {
        const parts = [candidate.local === "localMinimum" ? t("extrema_local_minimum") : candidate.local === "localMaximum" ? t("extrema_local_maximum") : t("extrema_not_extremum")];
        if (candidate.isGlobalMinimum) parts.push(t("extrema_global_minimum"));
        if (candidate.isGlobalMaximum) parts.push(t("extrema_global_maximum"));
        return parts.join(", ");
    }

    private pieceText(sign: DerivativeSign): string {
        return t(sign > 0 ? "extrema_piece_increasing" : sign < 0 ? "extrema_piece_decreasing" : "extrema_piece_constant");
    }

    /** The lines of a candidate's board label: its value, what kind of point it is, and, once revealed, its classification. */
    private markerLines(model: ExtremaModel, candidate: ExtremaCandidate): string[] {
        const compact = this.boardWidth() < COMPACT_BOARD_WIDTH;
        const lines = [`f(${this.number(candidate.x)}) = ${this.number(candidate.value)}`];
        if (candidate.kind === "endpoint") {
            const extra = candidate.derivative === undefined ? t("extrema_board_corner") : candidate.derivative === 0 ? t("extrema_board_stationary") : undefined;
            lines.push(extra === undefined ? this.kindText("endpoint") : `${this.kindText("endpoint")}, ${extra}`);
        } else {
            lines.push(candidate.kind === "stationary" ? t("extrema_board_stationary") : t("extrema_board_corner"));
        }
        // On a narrow board the label is the value and the kind; the classification is in the readout.
        if (model.revealed && !compact) lines.push(this.classificationText(candidate));
        return lines;
    }

    private globalText(value: number, at: readonly number[]): string {
        return t("extrema_readout_global_value", {value0: this.number(value), value1: at.map(x => this.number(x)).join("; ")});
    }

    private labelFontSize(): number {
        return Math.max(10, this.displaySettings.fontSize * 0.9);
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
        const [left, , right] = this.board.getBoundingBox();
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
            else if (this.boardWidth() < COMPACT_BOARD_WIDTH) dx = outwardSign * COMPACT_ENDPOINT_GAP_PX / unitX; // clear of the a / b label
            const curveAhead = view.example.value(candidate.x + outward * OUTWARD_PROBE);
            const crossesAxis = (below: boolean) => below ? candidate.value > 0 && candidate.value - heightUnits < 0 : candidate.value < 0 && candidate.value + heightUnits > 0;
            const costBelow = (curveAhead < candidate.value ? 1 : 0) + (crossesAxis(true) ? 1.5 : 0);
            const costAbove = (curveAhead > candidate.value ? 1 : 0) + (crossesAxis(false) ? 1.5 : 0);
            anchorY = costBelow < costAbove ? "top" : costAbove < costBelow ? "bottom" : candidate.value > 0 ? "bottom" : "top";
        } else {
            anchorY = model.revealed && candidate.local === "localMinimum" ? "top" : "bottom";
        }
        const row = this.boardWidth() < COMPACT_BOARD_WIDTH ? AXIS_LABEL_ROW_COMPACT_PX : AXIS_LABEL_ROW_PX;
        const onAxis = Math.abs(candidate.value) * unitY < row;
        return {anchorX, anchorY, dx, dy: anchorY === "top" && kind !== "endpoint" && onAxis ? -row / unitY : 0};
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thin = () => Math.max(1, this.displaySettings.strokeWidth * 0.5);
        const fontSize = () => this.displaySettings.fontSize;
        const colors = KIND_COLORS();
        const candidate = (kind: CandidateKind, slot: number): ExtremaCandidate | undefined => this.candidatesOfKind(view(), kind)[slot];

        // Vertical dashed lines at the candidates separate the pieces; horizontal ones mark the global values once revealed.
        for (let index = 0; index < MAX_CANDIDATES; index++) {
            const x = () => view().analysis.candidates[index]?.x ?? 0;
            this.own(board.create("line", [[x, 0], [x, 1]], {
                straightFirst: true, straightLast: true, strokeColor: GraphPalette.referenceCurve, dash: 3, strokeWidth: thin, highlight: false, fixed: true,
                withLabel: false, visible: () => view().analysis.candidates[index] !== undefined,
            }));
        }
        const globalLine = (value: () => number) => this.own(board.create("line", [[0, value], [1, value]], {
            straightFirst: true, straightLast: true, strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: thin, highlight: false, fixed: true,
            withLabel: false, visible: () => model().revealed,
        }));
        globalLine(() => view().analysis.globalMinimum);
        globalLine(() => view().analysis.globalMaximum);

        this.own(board.create("functiongraph", [(x: number) => view().example.value(x)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        }));

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
                this.own(board.create("point", [() => current()?.x ?? 0, () => current()?.value ?? 0], {
                    ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, face: FACES[kind], visible: () => current() !== undefined,
                    size: () => Math.max(4, this.displaySettings.pointSize), fillColor: colors[kind], highlightFillColor: colors[kind],
                    strokeColor: colors[kind], highlightStrokeColor: colors[kind],
                }));
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

        // The formula, the interval, the global values (or the word hidden) and the two keys stay on the board (projection needs them).
        this.caption("bottom-right", [
            {text: () => exampleTitle(model().example), scale: 1.2, math: true},
            {text: () => t("extrema_board_interval", {value0: this.number(model().a), value1: this.number(model().b)})},
            {
                text: () => {
                    if (!model().revealed) return t("extrema_board_classification_hidden");
                    const {analysis} = view();
                    return t("extrema_board_global", {
                        value0: this.number(analysis.globalMinimum), value1: analysis.globalMinimumAt.map(x => this.number(x)).join("; "),
                        value2: this.number(analysis.globalMaximum), value3: analysis.globalMaximumAt.map(x => this.number(x)).join("; "),
                    });
                },
            },
            {text: () => t("extrema_board_key"), minBoardWidth: 520},
            {text: () => t("extrema_board_signs_key"), minBoardWidth: 520},
        ]);
    }

    protected override syncSceneToModel(): void {
        const {a, b} = this.model;
        this.pointA?.moveTo([a, 0]);
        this.pointB?.moveTo([b, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private stateModel(): ExtremaModel {
        const {example, a, b, revealed} = this.state;
        return {example, a, b, revealed};
    }

    protected renderControls(): React.ReactNode {
        const {example, a, b} = this.stateModel();
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("extrema_example_label")} value={example} help={t("extrema_example_help")}
                              options={EXTREMA_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("extrema_a_label")} value={a} min={EXTREMA_X_MIN} max={EXTREMA_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("extrema_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/>
                <NumberInput label={t("extrema_b_label")} value={b} min={EXTREMA_X_MIN} max={EXTREMA_X_MAX} step={0.1} decimals={PRECISE}
                             rejectedHint={t("extrema_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setB(next))}/>
                <p className="inspector-help">{t("extrema_order_help")}</p>
            </div>
        </>;
    }

    protected override renderReveals(): React.ReactNode {
        const {revealed} = this.stateModel();
        return <>
            <div className="extrema-actions" role="group" aria-label={t("extrema_actions_label")}>
                <button type="button" data-action="toggle-classification" data-revealed={revealed}
                        onClick={() => this.setRevealed(!this.model.revealed)}>{revealed ? t("extrema_hide_classification") : t("extrema_show_classification")}</button>
            </div>
            <p className="inspector-help">{t("extrema_classification_help")}</p>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        const colors = KIND_COLORS();
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("extrema_legend_function"), kind: "line"},
            {id: "endpoint", color: colors.endpoint, label: t("extrema_legend_endpoint"), kind: "area"},
            {id: "stationary", color: colors.stationary, label: t("extrema_legend_stationary"), kind: "area"},
            {id: "corner", color: colors.corner, label: t("extrema_legend_corner"), kind: "area"},
            {id: "global", color: GraphPalette.referenceCurve, label: t("extrema_legend_global"), kind: "dotted-line"},
            {id: "pieces", color: GraphPalette.referenceCurve, label: t("extrema_legend_pieces"), kind: "dashed-line"},
        ]}/>;
    }

    /** The statuses to state in words (no changing numbers: they are announced on every drag step); each has a stable id. */
    private statuses(model: ExtremaModel, view: View): { id: StatusKind; text: string }[] {
        const {analysis} = view;
        const result: { id: StatusKind; text: string }[] = [{id: model.revealed ? "revealed" : "hidden", text: t(model.revealed ? "extrema_status_revealed" : "extrema_status_hidden")}];
        if (analysis.candidates.some(candidate => candidate.kind === "corner")) result.push({id: "corner", text: t("extrema_status_corner")});
        if (model.revealed && (analysis.globalMinimumAt.length > 1 || analysis.globalMaximumAt.length > 1)) result.push({id: "tie", text: t("extrema_status_tie")});
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateModel();
        const language: NumberLanguage = currentLanguage();
        const view = this.viewOf(model);
        const {analysis} = view;
        const number = (value: number) => formatNumber(value, language, PRECISE);
        const hidden = t("extrema_hidden");
        const rows = [
            {id: "a", label: t("extrema_a_label"), value: number(model.a)},
            {id: "b", label: t("extrema_b_label"), value: number(model.b)},
            ...analysis.candidates.map((candidate, index) => ({
                id: `candidate-${index}`,
                label: t("extrema_readout_candidate", {value0: this.kindText(candidate.kind), value1: number(candidate.x)}),
                value: [t("extrema_readout_candidate_value", {value0: number(candidate.value), value1: this.derivativeText(candidate)}),
                    ...(model.revealed ? [this.classificationText(candidate)] : [])].join("; "),
            })),
            ...analysis.pieces.map((piece, index) => ({
                id: `piece-${index}`,
                label: t("extrema_readout_piece", {value0: number(piece.from), value1: number(piece.to)}),
                value: this.pieceText(piece.sign),
            })),
            {id: "global-minimum", label: t("extrema_readout_global_minimum"), value: model.revealed ? this.globalText(analysis.globalMinimum, analysis.globalMinimumAt) : hidden},
            {id: "global-maximum", label: t("extrema_readout_global_maximum"), value: model.revealed ? this.globalText(analysis.globalMaximum, analysis.globalMaximumAt) : hidden},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("extrema_note")}/>
            <div className="inspector-group extrema-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-extrema-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default ExtremaGraph;
