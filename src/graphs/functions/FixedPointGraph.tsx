import React from "react";
import {COMPACT_BOARD_WIDTH, DomainError, FillCurve, FunctionLessonActions, gridValue, LABEL_STYLE} from "./BaseFunctionGraph";
import IterativeFunctionGraph from "./IterativeFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, formatSignificant, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {
    FIXED_POINT_EXAMPLE_IDS, FIXED_POINT_EXAMPLES, FIXED_POINT_MAX_DIGITS, FIXED_POINT_MAX_STEPS, FIXED_POINT_MIN_DIGITS, fixedPointExample, FixedPointExample,
    FixedPointExampleId, FixedPointHistory, fixedPointHundredths, fixedPointLocation, isFixedPointDigits, isFixedPointExampleId, isFixedPointStart,
} from "../../analysis/fixedPoint";
import {
    defaultFixedPointModel, fixedPointCanAdvance, fixedPointHistoryOf, FixedPointModel, fixedPointTransition, normalizeFixedPointModel, parseFixedPointModel,
} from "../../analysis/fixedPointModel";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {GraphPalette} from "../styles/GraphPalette";

/**
 * Time between two playback steps. One iterate per interval, never more than one per frame, whatever the display refresh rate
 * is (see ADR 0012), so a projector shows the same sequence of steps as a laptop screen.
 */
export const FIXED_POINT_STEP_INTERVAL_MS = 600;

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * Each example has its own view. Equal axis units are kept (the cobweb is drawn against the 45 degree diagonal), and JSXGraph then
 * honors the vertical extent of the box and crops the horizontal one around its centre whenever the box is wider than the board
 * (width 2.4 times the height, wider than any board the app shows). So the height is the part that must hold everything: the interval
 * square, the axes and, above the square, the headroom for the caption in the top-right corner (0.9 units for the
 * affine map and 0.65 for the others, enough for the caption lines at 390 px and at 1280 px); the horizontal extent is centred on the interval.
 */
const EXAMPLE_VIEWS: Readonly<Record<FixedPointExampleId, BoundingBox>> = {
    "affine": [-2.84, 2.9, 4.84, -0.3],
    "cosine": [-1.72, 1.65, 2.72, -0.2],
    "reflection": [-1.72, 1.65, 2.72, -0.2],
};

/** Dash styles (JSXGraph numbering): the diagonal and the box edge are dashed, the drop line short-dashed. */
const DIAGONAL_DASH = 2;
const DROP_DASH = 3;

/** The largest step an iterate point exists for: the iterate x_k is a point on the diagonal for 1 <= k < step, so k <= FIXED_POINT_MAX_STEPS - 1. */
const ITERATE_POOL = FIXED_POINT_MAX_STEPS - 1;

const SUPERSCRIPT: Readonly<Record<string, string>> = {"0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"};

/** The threshold 10^-d as text, for example "10⁻³". */
const toleranceText = (digits: number): string => `10⁻${[...String(digits)].map(character => SUPERSCRIPT[character] ?? character).join("")}`;

/** The map as it is written on the board. */
const exampleFormula = (id: FixedPointExampleId): string => `T(x) = ${fixedPointExample(id).plain}`;

type StatusKind = "bound-hidden" | "hypotheses" | "bound-a-priori" | "bound-a-posteriori" | "bound-pending" | "no-bound" | "cycle"
    | "threshold" | "iteration-limit" | "fixed-point" | "stagnation";

/** The numbers every part of the display is derived from: one model gives one view, so the board and the inspector agree. */
interface View {
    example: FixedPointExample;
    history: FixedPointHistory;
    /** The fixed point x* where y = T(x) meets y = x (for display only; the bounds never use it). */
    location: number;
}

/**
 * Fixed-point iteration x_{k+1} = T(x_k) of a named map on a closed interval, drawn as a cobweb between y = T(x) and y = x. The
 * model is `{example, x0, step, digits, boundVisible}` (`src/analysis/fixedPointModel`): `step` is the number of iterations taken,
 * and the whole history, its error bounds and the reason the iteration ended are recomputed from the model by `src/analysis/fixedPoint`,
 * never stored.
 *
 * Next step and playback run the same transition (`fixedPointTransition`) through `commitModel`; playback itself (the
 * `IterationController`) is not model data, so a reopened preset is paused. Editing the example, x0 or the tolerance stops playback
 * and returns the iteration to step 0 (the example loads its own default start and hides the bound; x0 and the tolerance keep the
 * rest); so does anything that replaces the scene, exports a figure or unmounts the graph. Show error bound does not stop playback.
 *
 * Rules (reject, never clamp): x0 is a multiple of 0.01 inside the interval of the example, the tolerance digits are an integer
 * 1..8. A setter that would break a rule throws a `DomainError` and leaves the model unchanged. Number fields and lesson actions use
 * the same setters. Error bounds exist only where the map is a contraction; for 1 - x the board and the inspector say why there is none.
 */
export class FixedPointGraph extends IterativeFunctionGraph<FixedPointModel> {
    override presets(): string {
        return "fixed-point";
    }

    protected defaultModel(): FixedPointModel {
        return defaultFixedPointModel("affine");
    }

    /** A stored step beyond the point where the iteration terminated is cut to the steps the history can take. */
    protected parseModel(data: unknown): FixedPointModel | undefined {
        const parsed = parseFixedPointModel(data);
        return parsed && normalizeFixedPointModel(parsed);
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    protected override exampleView() {
        return {key: this.model.example, box: EXAMPLE_VIEWS[this.model.example]};
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "fixed-point";
    }

    protected stepIntervalMs(): number {
        return FIXED_POINT_STEP_INTERVAL_MS;
    }

    protected maxIterations(): number {
        return FIXED_POINT_MAX_STEPS;
    }

    protected iterationIndex(model: FixedPointModel): number {
        return model.step;
    }

    protected override normalizeIterationModel(model: FixedPointModel): FixedPointModel {
        return normalizeFixedPointModel(model);
    }

    protected canAdvance(): boolean {
        return fixedPointCanAdvance(this.model);
    }

    protected cannotAdvanceMessage(): string {
        return "The iteration has ended; Reset returns it to step 0.";
    }

    /** The one mathematical transition of the iteration: Next step and every playback step take one more iterate. */
    protected transition(): IterationOutcome {
        const result = fixedPointTransition(this.model);
        if (result.model !== this.model) this.commitModel(result.model);
        return result.outcome;
    }

    /** Back to step 0 of the same example, x0, tolerance and reveal; playback stops. */
    protected resetIteration(): void {
        this.replaceModel({...this.model, step: 0});
    }

    // ---- View ----------------------------------------------------------------------------------------------------

    /** The derived numbers for a model, computed once per set of model values (see `memoView`). */
    private viewOf(model: FixedPointModel): View {
        return this.memoView(model, () => ({
            example: fixedPointExample(model.example),
            history: fixedPointHistoryOf(model),
            location: fixedPointLocation(model.example),
        }));
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    protected setExample(value: unknown): void {
        if (!isFixedPointExampleId(value)) throw new DomainError(`The example must be one of ${FIXED_POINT_EXAMPLE_IDS.join(", ")}.`);
        this.replaceModel(defaultFixedPointModel(value, this.model.digits));
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...EXAMPLE_VIEWS[value]], this.equalAxisUnits);
    }

    /** x0 is handed to the model as exact hundredths: arithmetic noise such as 0.06 + 0.01 is snapped, a value that is really off the grid is rejected. */
    protected setX0(value: number): void {
        const example = fixedPointExample(this.model.example);
        const next = gridValue(value, 0.01);
        if (next === undefined || fixedPointHundredths(next) === undefined || !isFixedPointStart(example.id, next)) {
            throw new DomainError(`The start x0 must be a multiple of 0.01 between ${example.a} and ${example.b} for this example.`);
        }
        if (next !== this.model.x0) this.replaceModel({...this.model, x0: next, step: 0});
    }

    protected setDigits(value: number): void {
        if (!isFixedPointDigits(value)) throw new DomainError(`The tolerance digits d must be an integer between ${FIXED_POINT_MIN_DIGITS} and ${FIXED_POINT_MAX_DIGITS}.`);
        if (value !== this.model.digits) this.replaceModel({...this.model, digits: value, step: 0});
    }

    protected setBoundVisible(visible: boolean): void {
        if (visible !== this.model.boundVisible) this.commitModel({...this.model, boundVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"fixed-point-x0": value => this.setX0(value), "fixed-point-digits": value => this.setDigits(value)},
            visibility: {"fixed-point-bound": visible => this.setBoundVisible(visible)},
            choices: {"fixed-point-example": value => this.setExample(value)},
        };
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private position(value: number): string {
        return formatNumber(value, currentLanguage(), 6);
    }

    private small(value: number): string {
        return formatSignificant(value, currentLanguage(), 4);
    }

    /** The short reason the iteration ended, or the word that it continues. */
    private endText(history: FixedPointHistory): string {
        switch (history.termination) {
            case "threshold": return t("fixed_point_end_threshold");
            case "iteration-limit": return t("fixed_point_end_limit");
            case "fixed-point": return t("fixed_point_end_known");
            case "stagnation": return t("fixed_point_end_stagnation");
            default: return t("fixed_point_end_running");
        }
    }

    /** The one board line about the bound and its tone: hidden or pending (neutral), shown (confirmed) or impossible (warning). */
    private boardBound(model: FixedPointModel, view: View): { text: string; tone: "neutral" | "ok" | "warning" } {
        if (!model.boundVisible) return {text: t("fixed_point_board_bound_hidden"), tone: "neutral"};
        if (view.history.q === undefined) return {text: t("fixed_point_board_no_bound"), tone: "warning"};
        const posteriori = view.history.current.aPosteriori;
        if (posteriori === undefined) return {text: t("fixed_point_board_bound_pending"), tone: "neutral"};
        return {text: t("fixed_point_board_bound", {value0: this.small(posteriori)}), tone: "ok"};
    }

    /** The board line that says why the iteration ended, with its tone, or undefined while it continues. */
    private boardEnd(history: FixedPointHistory): { text: string; tone: "ok" | "warning" } | undefined {
        switch (history.termination) {
            case "threshold": return {text: t("fixed_point_board_end_threshold"), tone: "ok"};
            case "fixed-point": return {text: t("fixed_point_board_end_known"), tone: "ok"};
            case "iteration-limit": return {text: t("fixed_point_board_end_limit"), tone: "warning"};
            case "stagnation": return {text: t("fixed_point_board_end_stagnation"), tone: "warning"};
            default: return undefined;
        }
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const example = () => view().example;
        const history = () => view().history;
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const fontSize = this.displayFontSize;
        const left = () => board.getBoundingBox()[0];
        const top = () => board.getBoundingBox()[1];
        const bottom = () => board.getBoundingBox()[3];
        const right = () => board.getBoundingBox()[2];
        const current = () => history().current.x;
        const boundHalfWidth = () => model().boundVisible ? history().current.aPosteriori : undefined;

        // Layers, lowest first: the interval box, the diagonal, the map, the cobweb, the drop line and the bound bar, the iterates.
        const box = this.own(board.create("curve", [[0], [0]], {
            fillColor: GraphPalette.referenceCurve, fillOpacity: 0.1, strokeColor: GraphPalette.referenceCurve, strokeWidth: thin, dash: DIAGONAL_DASH,
            highlight: false, fixed: true,
        })) as unknown as FillCurve;
        box.updateDataArray = () => {
            const {a, b} = example();
            box.dataX = [a, b, b, a, a];
            box.dataY = [a, a, b, b, a];
        };
        this.own(board.create("segment", [[() => example().a, () => example().a], [() => example().b, () => example().b]], {
            strokeColor: GraphPalette.comparisonCurve, dash: DIAGONAL_DASH, strokeWidth, highlight: false, fixed: true, withLabel: false,
        }));
        this.own(board.create("functiongraph", [(x: number) => example().value(x), () => example().a, () => example().b], {
            strokeColor: GraphPalette.primaryCurve, strokeWidth, highlight: false, fixed: true,
        }));

        // The cobweb: (x_0, x_0), then for every step the vertical segment to (x_k, T(x_k)) and the horizontal one to (x_{k+1}, x_{k+1}).
        const cobweb = this.own(board.create("curve", [[0], [0]], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: thin, highlight: false, fixed: true,
        })) as unknown as FillCurve;
        cobweb.updateDataArray = () => {
            const {x0} = history();
            const xs = [x0, x0];
            const ys = [x0, x0];
            for (const step of history().steps) {
                xs.push(step.from, step.to);
                ys.push(step.to, step.to);
            }
            cobweb.dataX = xs;
            cobweb.dataY = ys;
        };

        // The current x_k on the x-axis: a drop line from the diagonal, the bound bar around it, and a marker with its label.
        this.own(board.create("segment", [[current, current], [current, 0]], {
            strokeColor: GraphPalette.referenceCurve, dash: DROP_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false,
        }));
        this.own(board.create("segment", [
            [() => Math.max(example().a, current() - (boundHalfWidth() ?? 0)), 0], [() => Math.min(example().b, current() + (boundHalfWidth() ?? 0)), 0],
        ], {
            strokeColor: GraphPalette.additionalCurves[0], strokeWidth: () => Math.max(8, this.displaySettings.strokeWidth * 4), strokeOpacity: 0.45,
            highlight: false, fixed: true, withLabel: false, visible: () => boundHalfWidth() !== undefined,
        }));

        // The iterates on the diagonal: filled circles for 1 <= k < step, an open circle for the start, a larger filled circle for the current one.
        const size = () => Math.max(3, this.displaySettings.pointSize * 0.6);
        const iteratePoint = (k: number) => this.own(board.create("point", [() => history().points[k]?.x ?? 0, () => history().points[k]?.x ?? 0], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size, face: "o",
            fillColor: GraphPalette.constructionAccent, highlightFillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.constructionAccent,
            visible: () => k < history().step,
        }));
        for (let k = 1; k <= ITERATE_POOL; k++) iteratePoint(k);
        this.own(board.create("point", [() => history().x0, () => history().x0], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, face: "o", size: () => Math.max(4, this.displaySettings.pointSize * 0.8),
            fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface,
            strokeColor: GraphPalette.constructionAccent, highlightStrokeColor: GraphPalette.constructionAccent, strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
            visible: () => history().step >= 1,
        }));
        this.own(board.create("point", [current, current], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, face: "o", size: () => Math.max(5, this.displaySettings.pointSize),
            fillColor: GraphPalette.constructionAccent, highlightFillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.label, highlightStrokeColor: GraphPalette.label,
        }));
        // The fixed point x*: a cross on the diagonal, where the map meets it.
        this.own(board.create("point", [() => view().location, () => view().location], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, face: "x", size: () => Math.max(5, this.displaySettings.pointSize),
            strokeColor: GraphPalette.label, highlightStrokeColor: GraphPalette.label, strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
        }));
        this.own(board.create("point", [current, 0], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size,
            fillColor: GraphPalette.constructionAccent, highlightFillColor: GraphPalette.constructionAccent, strokeColor: GraphPalette.constructionAccent,
        }));
        // The label x_k sits just above the axis and to the right of the drop line: off the axis and off the tick labels below it.
        this.own(board.create("text", [
            () => current() + 0.012 * (right() - left()),
            () => 0.012 * (top() - bottom()),
            () => `<div><i>x</i><sub>${history().step}</sub></div>`,
        ], {
            anchorX: "left", anchorY: "bottom", fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
            fontSize: () => Math.max(10, fontSize() * 0.9 * Math.min(1, this.boardWidth() / 700)), cssStyle: LABEL_STYLE, highlightCssStyle: LABEL_STYLE,
        }));

        // The formula, the step, the bound line, the two-cycle, the reason the iteration ended and the key stay on the board (projection needs them).
        this.caption("top-right", [
            {text: () => exampleFormula(model().example), scale: 1.2, math: true},
            {text: () => t("fixed_point_board_progress", {value0: history().step, value1: this.position(current())})},
            {
                text: () => this.boardBound(model(), view()).text,
                color: () => ({neutral: GraphPalette.label, ok: GraphPalette.primaryCurve, warning: GraphPalette.warningText})[this.boardBound(model(), view()).tone],
            },
            {
                text: () => t("fixed_point_board_cycle", {value0: this.position(history().cycle?.first ?? 0), value1: this.position(history().cycle?.second ?? 0)}),
                minBoardWidth: COMPACT_BOARD_WIDTH, visible: () => history().cycle !== undefined,
            },
            {
                text: () => this.boardEnd(history())?.text ?? "",
                color: () => this.boardEnd(history())?.tone === "ok" ? GraphPalette.primaryCurve : GraphPalette.warningText,
                visible: () => this.boardEnd(history()) !== undefined,
            },
            {text: () => t("fixed_point_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const language = currentLanguage();
        const example = fixedPointExample(state.example);
        const playing = this.controller.isPlaying();
        const canAdvance = fixedPointCanAdvance(state);
        const nextUnavailable = !canAdvance || playing;
        const playUnavailable = !canAdvance && !playing;
        const resetUnavailable = state.step === 0 && !playing;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("fixed_point_example_label")} value={state.example} help={t("fixed_point_example_help")}
                              options={FIXED_POINT_EXAMPLE_IDS.map(id => ({value: id, text: `${exampleFormula(id)}, x ∈ [${FIXED_POINT_EXAMPLES[id].a}, ${FIXED_POINT_EXAMPLES[id].b}]`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("fixed_point_x0_label")} value={state.x0} min={example.a} max={example.b} step={0.01} decimals={2}
                             rejectedHint={t("fixed_point_x0_rejected_hint", {value0: formatNumber(example.a, language), value1: formatNumber(example.b, language)})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setX0(next))}/>
                <NumberInput label={t("fixed_point_digits_label")} value={state.digits} min={FIXED_POINT_MIN_DIGITS} max={FIXED_POINT_MAX_DIGITS} step={1} decimals={0}
                             rejectedHint={t("fixed_point_digits_rejected_hint", {value0: FIXED_POINT_MIN_DIGITS, value1: FIXED_POINT_MAX_DIGITS})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setDigits(next))}/>
                <p className="inspector-help">{t("fixed_point_fields_help")}</p>
            </div>
            <div className="inspector-group">
                {/* An unavailable control stays focusable (aria-disabled, not disabled): a focused button that becomes
                    unavailable when the iteration ends or when Play starts must not drop keyboard focus to the page body. */}
                <div className="demo-actions" role="group" aria-label={t("fixed_point_iteration_controls")}>
                    <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                            onClick={() => { if (!nextUnavailable) this.ignoreOutOfDomain(() => this.nextStep()); }}>{t("fixed_point_next_step")}</button>
                    <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                            onClick={() => { if (!playUnavailable) { if (playing) this.pauseIteration(); else this.play(); } }}>{playing ? t("pause") : t("play")}</button>
                    <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                            onClick={() => { if (!resetUnavailable) this.resetIteration(); }}>{t("fixed_point_reset")}</button>
                </div>
                <p className="inspector-help">{t("fixed_point_playback_note", {value0: FIXED_POINT_MAX_STEPS})}</p>
            </div>
            <div className="inspector-group">
                <div className="demo-actions" role="group" aria-label={t("fixed_point_bound_actions_label")}>
                    <button type="button" data-action="toggle-fixed-point-bound" data-revealed={state.boundVisible}
                            onClick={() => this.setBoundVisible(!this.model.boundVisible)}>
                        {state.boundVisible ? t("fixed_point_hide_bound") : t("fixed_point_show_bound")}
                    </button>
                </div>
                <p className="inspector-help">{t("fixed_point_bound_help")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("fixed_point_legend_function"), kind: "line"},
            {id: "diagonal", color: GraphPalette.comparisonCurve, label: t("fixed_point_legend_diagonal"), kind: "dashed-line"},
            {id: "box", color: GraphPalette.referenceCurve, label: t("fixed_point_legend_box"), kind: "dashed"},
            {id: "cobweb", color: GraphPalette.constructionAccent, label: t("fixed_point_legend_cobweb"), kind: "line"},
            {id: "iterate", color: GraphPalette.constructionAccent, label: t("fixed_point_legend_iterate"), kind: "dot"},
            {id: "start", color: GraphPalette.constructionAccent, label: t("fixed_point_legend_start"), kind: "ring"},
            {id: "fixed-point", color: GraphPalette.label, label: t("fixed_point_legend_fixed"), kind: "cross"},
            {id: "bound", color: GraphPalette.additionalCurves[0], label: t("fixed_point_legend_bound"), kind: "line"},
        ]}/>;
    }

    /** The hypotheses of the theorem for the example, as one sentence per condition. */
    private hypothesisText(view: View): string {
        const {hypotheses} = view.history;
        const language = currentLanguage();
        const selfMap = hypotheses.selfMap.reason === "increasing-affine-image" ? t("fixed_point_hyp_selfmap_increasing")
            : hypotheses.selfMap.reason === "decreasing-cosine-image" ? t("fixed_point_hyp_selfmap_cosine") : t("fixed_point_hyp_selfmap_reflection");
        const contraction = hypotheses.contraction?.reason === "constant-derivative" ? t("fixed_point_hyp_contraction_constant")
            : hypotheses.contraction ? t("fixed_point_hyp_contraction_sine", {value0: formatNumber(hypotheses.contraction.q, language, 4)}) : "";
        return [
            t("fixed_point_hyp_interval", {value0: formatNumber(hypotheses.interval.a, language), value1: formatNumber(hypotheses.interval.b, language)}),
            selfMap, contraction,
        ].filter(Boolean).join(" ");
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: FixedPointModel, view: View): { id: StatusKind; text: string }[] {
        const result: { id: StatusKind; text: string }[] = [];
        const {history} = view;
        const language = currentLanguage();
        switch (history.termination) {
            case "threshold":
                result.push({id: "threshold", text: t("fixed_point_status_threshold", {value0: toleranceText(model.digits), value1: history.step})});
                break;
            case "iteration-limit":
                result.push({id: "iteration-limit", text: t("fixed_point_status_limit", {value0: FIXED_POINT_MAX_STEPS})});
                break;
            case "fixed-point":
                result.push({id: "fixed-point", text: t("fixed_point_status_fixed_point", {value0: formatNumber(model.x0, language, 2)})});
                break;
            case "stagnation":
                result.push({id: "stagnation", text: t("fixed_point_status_stagnation")});
                break;
        }
        if (history.cycle) {
            result.push({id: "cycle", text: t("fixed_point_status_cycle", {value0: this.position(history.cycle.first), value1: this.position(history.cycle.second)})});
        }
        if (!model.boundVisible) {
            result.push({id: "bound-hidden", text: t("fixed_point_status_bound_hidden")});
        } else if (history.q === undefined) {
            result.push({id: "no-bound", text: t("fixed_point_status_no_bound")});
        } else {
            result.push({id: "hypotheses", text: this.hypothesisText(view)});
            result.push({id: "bound-a-priori", text: t("fixed_point_status_bound_a_priori", {value0: this.small(history.current.aPriori ?? 0)})});
            result.push(history.current.aPosteriori === undefined
                ? {id: "bound-pending", text: t("fixed_point_status_bound_pending")}
                : {id: "bound-a-posteriori", text: t("fixed_point_status_bound_a_posteriori", {value0: this.small(history.current.aPosteriori)})});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const language = currentLanguage();
        const view = this.viewOf(model);
        const {history} = view;
        const shown = model.boundVisible;
        const hidden = t("fixed_point_hidden");
        const contraction = history.q !== undefined;
        const bound = (value: number | undefined): string => !shown ? hidden : !contraction ? t("fixed_point_no_bound") : value === undefined ? NOT_A_NUMBER_TEXT : this.small(value);
        const rows = [
            {id: "step", label: t("fixed_point_readout_step", {value0: FIXED_POINT_MAX_STEPS}), value: String(history.step)},
            {id: "x0", label: t("fixed_point_readout_x0"), value: formatNumber(model.x0, language, 2)},
            {id: "current", label: t("fixed_point_readout_current"), value: this.position(history.current.x)},
            {id: "delta", label: t("fixed_point_readout_delta"), value: history.current.delta === undefined ? NOT_A_NUMBER_TEXT : this.small(history.current.delta)},
            {id: "tolerance", label: t("fixed_point_readout_tolerance"), value: toleranceText(model.digits)},
            {id: "q", label: t("fixed_point_readout_q"), value: !shown ? hidden : contraction ? formatNumber(history.q ?? 0, language, 6) : t("fixed_point_no_bound")},
            {id: "a-priori", label: t("fixed_point_readout_a_priori"), value: bound(history.current.aPriori)},
            {id: "a-posteriori", label: t("fixed_point_readout_a_posteriori"), value: bound(history.current.aPosteriori)},
            {id: "end", label: t("fixed_point_readout_end"), value: this.endText(history)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("fixed_point_note")}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-fixed-point-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default FixedPointGraph;
