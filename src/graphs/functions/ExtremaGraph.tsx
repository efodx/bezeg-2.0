import React from "react";
import BaseFunctionGraph, {BOARD_TEXT_STYLE, cleanNumber, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, NumberLanguage} from "../../analysis/format";
import {
    analyzeExtrema, CandidateKind, DerivativeSign, EXTREMA_EXAMPLE_IDS, EXTREMA_X_MAX, EXTREMA_X_MIN, EXTREMA_X_STEP, extremaExample, ExtremaAnalysis,
    ExtremaCandidate, ExtremaExample, ExtremaExampleId, isExtremaExampleId, isExtremaX,
} from "../../analysis/extrema";
import {EXTREMA_EXAMPLE_MODELS, ExtremaModel, parseExtremaModel} from "../../analysis/extremaModel";
import {Preset} from "../base/presets/Presets";
import {GraphPalette} from "../styles/GraphPalette";

/** Values and positions show four decimals so that pi/2 = 1.5708 and sin(4) = -0.7568 can be read off. */
const PRECISE = 4;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<ExtremaExampleId, string>> = {square: "x²", cube: "x³", abs: "|x|", sine: "sin x"};
const exampleTitle = (id: ExtremaExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * Each example has its own view, which becomes the board view whenever the example changes (inspector select or the
 * `extrema-example` lesson action) and for the default scene; a view stored in a preset still wins on import. The bottom margin
 * leaves room for the board caption, the top margin for the row of derivative signs.
 */
const EXAMPLE_VIEWS: Readonly<Record<ExtremaExampleId, BoundingBox>> = {
    square: [-3, 6.5, 4, -3],
    cube: [-2.5, 3.5, 2.5, -3.5],
    abs: [-3, 3.5, 3, -2.5],
    sine: [-5.5, 2.4, 5.5, -3.4],
};

/**
 * How many markers of each kind the board keeps. The candidates of every example in the allowed range fit (sin x has at most
 * two stationary points in [-4, 4]); the graph test scans the range to prove it. The number of board objects never changes.
 */
const SLOTS: Readonly<Record<CandidateKind, number>> = {endpoint: 2, stationary: 2, corner: 1};
const MAX_CANDIDATES = SLOTS.endpoint + SLOTS.stationary + SLOTS.corner;
const MAX_PIECES = MAX_CANDIDATES - 1;
const KINDS: readonly CandidateKind[] = ["endpoint", "stationary", "corner"];

/** One face per kind, so the kinds differ by shape and not only by colour. */
const FACES: Readonly<Record<CandidateKind, string>> = {endpoint: "[]", stationary: "<>", corner: "^"};
const KIND_COLORS = (): Readonly<Record<CandidateKind, string>> =>
    ({endpoint: GraphPalette.comparisonCurve, stationary: GraphPalette.constructionAccent, corner: GraphPalette.additionalCurves[1]});

const LABEL_STYLE = `${BOARD_TEXT_STYLE}background-color:rgba(255,253,245,0.88);padding:2px 6px;border-radius:2px;line-height:1.25;white-space:nowrap;pointer-events:none;`;
const SIGN_STYLE = `${BOARD_TEXT_STYLE}font-weight:700;pointer-events:none;`;
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
    private viewCache?: { model: ExtremaModel; view: View };

    override presets(): string {
        return "extrema";
    }

    protected defaultModel(): ExtremaModel {
        return {...EXTREMA_EXAMPLE_MODELS.square};
    }

    protected parseModel(data: unknown): ExtremaModel | undefined {
        return parseExtremaModel(data);
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    /** A preset or file whose example differs and which carries no view of its own shows that example's view, like the choice does. */
    override importPreset(preset: Preset): void {
        const previous = this.model.example;
        super.importPreset(preset);
        if (!preset.boardState && this.model.example !== previous && this.generatedObjectCount > 0) {
            this.board.setBoundingBox([...EXAMPLE_VIEWS[this.model.example]], true);
        }
    }

    // ---- View --------------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per model object however many board objects and readouts read them. */
    private viewOf(model: ExtremaModel): View {
        if (this.viewCache?.model !== model) {
            const example = extremaExample(model.example);
            this.viewCache = {model, view: {example, analysis: analyzeExtrema(example, model.a, model.b)}};
        }
        return this.viewCache.view;
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
        if (value !== this.model.a) this.commitModel({...this.model, a: value}, options);
    }

    protected setB(value: number, options: { syncScene?: boolean } = {}): void {
        if (!isExtremaX(value)) throw new DomainError(`The endpoint b must be a finite number between ${EXTREMA_X_MIN} and ${EXTREMA_X_MAX}.`);
        if (!(value > this.model.a)) throw new DomainError("The endpoint b must be greater than a (a < b): move a first.");
        if (value !== this.model.b) this.commitModel({...this.model, b: value}, options);
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
        const lines = [`f(${this.number(candidate.x)}) = ${this.number(candidate.value)}`];
        if (candidate.kind === "endpoint") {
            const extra = candidate.derivative === undefined ? t("extrema_board_corner") : candidate.derivative === 0 ? t("extrema_board_stationary") : undefined;
            lines.push(extra === undefined ? this.kindText("endpoint") : `${this.kindText("endpoint")}, ${extra}`);
        } else {
            lines.push(candidate.kind === "stationary" ? t("extrema_board_stationary") : t("extrema_board_corner"));
        }
        if (model.revealed) lines.push(this.classificationText(candidate));
        return lines;
    }

    private globalText(value: number, at: readonly number[]): string {
        return t("extrema_readout_global_value", {value0: this.number(value), value1: at.map(x => this.number(x)).join("; ")});
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
            this.own(board.create("text", [() => piece() ? (piece().from + piece().to) / 2 : 0, stripY, () => piece() ? SIGN_CHARACTER[piece().sign] : ""], {
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
                this.own(board.create("text", [() => current()?.x ?? 0, () => current()?.value ?? 0, html], {
                    anchorX: kind === "endpoint" ? (slot === 0 ? "left" : "right") : "middle",
                    anchorY: () => model().revealed && current()?.local === "localMinimum" ? "top" : "bottom",
                    fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label, fontSize: () => Math.max(10, fontSize() * 0.9),
                    cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE, visible: () => current() !== undefined,
                }));
            }
        }

        // a and b are dragged along the x-axis, projected onto the grid and onto the range a < b allows; a value the model still refuses puts the point back.
        const dragWrite = (apply: (x: number) => void) => (x: number) => {
            const accepted = this.ignoreOutOfDomain(() => apply(x));
            if (!accepted) this.syncSceneToModel();
            return accepted;
        };
        const axisPoint = (config: { x: number; name: string; placement: "below-left" | "below-right"; min: () => number; max: () => number; write: (x: number) => void }) =>
            this.slidingPoint({
                x: config.x, position: () => 0, min: config.min, max: config.max, step: EXTREMA_X_STEP,
                attributes: {...this.styles.point.default, name: config.name, label: this.pointLabel(config.placement, 1.6)},
                write: dragWrite(config.write),
            });
        this.pointA = axisPoint({
            x: model().a, name: "$$a$$", placement: "below-left",
            min: () => EXTREMA_X_MIN, max: () => cleanNumber(model().b - EXTREMA_X_STEP), write: x => this.setA(x, {syncScene: false}),
        });
        this.pointB = axisPoint({
            x: model().b, name: "$$b$$", placement: "below-right",
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
            {text: () => t("extrema_board_key")},
            {text: () => t("extrema_board_signs_key")},
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
        this.viewCache = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private stateModel(): ExtremaModel {
        const {example, a, b, revealed} = this.state;
        return {example, a, b, revealed};
    }

    protected renderControls(): React.ReactNode {
        const {example, a, b, revealed} = this.stateModel();
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
            <div className="inspector-group">
                <div className="extrema-actions" role="group" aria-label={t("extrema_actions_label")}>
                    <button type="button" data-action="toggle-classification" data-revealed={revealed}
                            onClick={() => this.setRevealed(!this.model.revealed)}>{revealed ? t("extrema_hide_classification") : t("extrema_show_classification")}</button>
                </div>
                <p className="inspector-help">{t("extrema_classification_help")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        const colors = KIND_COLORS();
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("extrema_legend_function"), kind: "line"},
            {id: "endpoint", color: colors.endpoint, label: t("extrema_legend_endpoint"), kind: "area"},
            {id: "stationary", color: colors.stationary, label: t("extrema_legend_stationary"), kind: "area"},
            {id: "corner", color: colors.corner, label: t("extrema_legend_corner"), kind: "area"},
            {id: "global", color: GraphPalette.referenceCurve, label: t("extrema_legend_global"), kind: "dashed"},
            {id: "pieces", color: GraphPalette.referenceCurve, label: t("extrema_legend_pieces"), kind: "dashed"},
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
