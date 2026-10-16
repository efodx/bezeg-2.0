import React from "react";
import {DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import IterativeFunctionGraph from "./IterativeFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, MINUS_SIGN, NOT_A_NUMBER_TEXT, NumberLanguage} from "../../analysis/format";
import {
    BISECTION_BOUND_MAX, BISECTION_BOUND_MIN, BISECTION_EXAMPLE_IDS, BISECTION_EXAMPLES, BISECTION_MAX_STEPS, bisectionExample, BisectionExample,
    BisectionExampleId, bisectionHistory, BisectionHistory, BisectionStep, isBisectionBracket, isBisectionEndpoint, isBisectionExampleId,
} from "../../analysis/bisection";
import {BisectionModel, DEFAULT_BISECTION_MODEL, parseBisectionModel} from "../../analysis/bisectionModel";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {GraphPalette} from "../styles/GraphPalette";

/**
 * Time between two playback steps. One step per interval, never more than one per frame, whatever the display refresh
 * rate is (see ADR 0012), so a projector shows the same sequence of steps as a laptop screen.
 */
export const BISECTION_STEP_INTERVAL_MS = 600;

/** The formulas as they are written on the board and in the example selector (the sign step is localized). */
const PRETTY_FORMULA: Readonly<Record<Exclude<BisectionExampleId, "sign-step">, string>> = {
    "square-minus-two": "x² − 2",
    "cubic": "x³ − x",
};

const exampleTitle = (id: BisectionExampleId): string => id === "sign-step" ? t("bisection_example_sign_step") : `f(x) = ${PRETTY_FORMULA[id]}`;

/** Numbers of an iteration go down to 2^-60: up to twelve decimals for readable sizes, exponent notation below 1e-9. Never "Infinity" or "NaN". */
export function formatPrecise(value: number, language: NumberLanguage): string {
    if (!Number.isFinite(value)) return NOT_A_NUMBER_TEXT;
    if (value === 0) return "0";
    if (Math.abs(value) >= 1e-9) return formatNumber(value, language, 12);
    const text = value.toExponential(3).replace(/\.?0+e/, "e");
    const unsigned = text.startsWith("-") ? text.slice(1) : text;
    const localized = language === "sl" ? unsigned.replace(".", ",") : unsigned;
    return value < 0 ? `${MINUS_SIGN}${localized}` : localized;
}

export interface SampledPieces {
    left: { x: number[]; y: number[] };
    right: { x: number[]; y: number[] };
}

/**
 * Samples a discontinuous example as two separate pieces so that the jump is never drawn as a connected vertical segment.
 * The value at the jump belongs to the right piece; the left piece ends at the jump with the left limit (the value just
 * left of it). A piece with no part in [from, to] is empty.
 */
export function sampleJumpPieces(example: BisectionExample, from: number, to: number, count = 120): SampledPieces {
    const jump = example.discontinuity;
    const empty = () => ({x: [] as number[], y: [] as number[]});
    if (jump === undefined || !Number.isFinite(from) || !Number.isFinite(to) || from > to) {
        return {left: empty(), right: empty()};
    }
    const piece = (start: number, end: number, value: (x: number) => number) => {
        const x: number[] = [];
        const y: number[] = [];
        for (let i = 0; i <= count; i++) {
            const xi = i === count ? end : start + ((end - start) * i) / count;
            x.push(xi);
            y.push(value(xi));
        }
        return {x, y};
    };
    const leftEnd = Math.min(to, jump);
    const left = from <= jump ? piece(from, leftEnd, x => example.value(x < jump ? x : leftLimit(example))) : empty();
    const right = to >= jump ? piece(Math.max(from, jump), to, x => example.value(x)) : empty();
    return {left, right};
}

/** The limit of a discontinuous example at its jump from the left: its value just left of the jump. */
export function leftLimit(example: BisectionExample): number {
    return example.discontinuity === undefined ? NaN : example.value(example.discontinuity - 1e-9);
}

/** What the board and the inspector show for a model: the bisection history and the step that was revealed last. */
interface View {
    history: BisectionHistory;
    last?: BisectionStep;
    /** The bracket that the revealed step bisected (the initial bracket at step 0) with its function values. */
    a: number; b: number; fa: number; fb: number;
}

type StatusKind = "ready" | "bracket" | "invalid-bracket" | "endpoint-root" | "exact-midpoint-root" | "stagnation" | "iteration-limit" | "hypothesis";

/**
 * Bisection on a root bracket [a, b], one revealed step at a time, for the intermediate value theorem lesson. The model is
 * `{example, a, b, step}`: `step` is the number of revealed steps and the history is recomputed from the other fields
 * (`src/analysis/bisection`), never stored. Next step and playback run the same transition, which advances `step` through
 * `commitModel`; playback itself (the `IterationController`) is not model data, so a reopened preset is paused. Editing
 * the example or an endpoint resets the step to 0 and pauses; so does anything that replaces the scene, exports a figure
 * or unmounts the graph.
 */
export class BisectionGraph extends IterativeFunctionGraph<BisectionModel> {
    /** A derived value keyed by the identity of the model it was computed from; it can never be stale. */
    private historyCache?: { model: BisectionModel; history: BisectionHistory };

    override presets(): string {
        return "bisection";
    }

    protected defaultModel(): BisectionModel {
        return {...DEFAULT_BISECTION_MODEL};
    }

    protected parseModel(data: unknown): BisectionModel | undefined {
        const parsed = parseBisectionModel(data);
        return parsed && this.normalized(parsed);
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-2.5, 4, 3.5, -3];
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "bisection";
    }

    protected stepIntervalMs(): number {
        return BISECTION_STEP_INTERVAL_MS;
    }

    protected maxIterations(): number {
        return BISECTION_MAX_STEPS;
    }

    protected iterationIndex(model: BisectionModel): number {
        return model.step;
    }

    protected override normalizeIterationModel(model: BisectionModel): BisectionModel {
        return this.normalized(model);
    }

    protected cannotAdvanceMessage(): string {
        return "The iteration cannot advance: it has finished or the bracket is not valid.";
    }

    private historyOf(model: BisectionModel): BisectionHistory {
        if (this.historyCache?.model !== model) {
            this.historyCache = {model, history: bisectionHistory(model.example, model.a, model.b, model.step)};
        }
        return this.historyCache.history;
    }

    private viewOf(model: BisectionModel): View {
        const history = this.historyOf(model);
        const last = history.steps.at(-1);
        return last
            ? {history, last, a: last.a, b: last.b, fa: last.fa, fb: last.fb}
            : {history, a: history.a, b: history.b, fa: history.fa, fb: history.fb};
    }

    /** The model with `step` cut to the steps the history can take (a stored step may lie beyond an exact root or stagnation). */
    private normalized(model: BisectionModel): BisectionModel {
        const taken = bisectionHistory(model.example, model.a, model.b, model.step).steps.length;
        return taken === model.step ? model : {...model, step: taken};
    }

    /** True while another step is possible: the bracket is valid and the iteration has not terminated. */
    protected canAdvance(model: BisectionModel = this.model): boolean {
        return this.historyOf(model).termination === undefined;
    }

    /** The one mathematical transition of the iteration: Next step and every playback step run it. */
    protected transition(): IterationOutcome {
        if (!this.canAdvance()) return "complete";
        const next = bisectionHistory(this.model.example, this.model.a, this.model.b, this.model.step + 1);
        this.commitModel({...this.model, step: next.steps.length});
        return next.termination === undefined ? "continue" : "complete";
    }

    /** Back to step 0 of the same example and bracket; playback stops. */
    protected resetIteration(): void {
        this.replaceModel({...this.model, step: 0});
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    protected setExample(value: unknown): void {
        if (!isBisectionExampleId(value)) throw new DomainError(`The example must be one of ${BISECTION_EXAMPLE_IDS.join(", ")}.`);
        const example = BISECTION_EXAMPLES[value];
        this.replaceModel({example: value, a: example.defaultA, b: example.defaultB, step: 0});
    }

    protected setA(value: number): void {
        if (!isBisectionEndpoint(value)) throw new DomainError(`The endpoint a must be a finite number between ${BISECTION_BOUND_MIN} and ${BISECTION_BOUND_MAX}.`);
        if (!isBisectionBracket(value, this.model.b)) throw new DomainError("The endpoint a must be less than b.");
        if (value !== this.model.a) this.replaceModel({...this.model, a: value, step: 0});
    }

    protected setB(value: number): void {
        if (!isBisectionEndpoint(value)) throw new DomainError(`The endpoint b must be a finite number between ${BISECTION_BOUND_MIN} and ${BISECTION_BOUND_MAX}.`);
        if (!isBisectionBracket(this.model.a, value)) throw new DomainError("The endpoint b must be greater than a.");
        if (value !== this.model.b) this.replaceModel({...this.model, b: value, step: 0});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"bisect-a": value => this.setA(value), "bisect-b": value => this.setB(value)},
            choices: {"bisection-example": value => this.setExample(value)},
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** A curve drawn from sample arrays recomputed on every board update (so each piece is clipped to its own domain). */
    private pieceCurve(piece: (left: number, right: number) => { x: number[]; y: number[] }, attributes: object) {
        const board = this.board;
        const curve: any = board.create("curve", [[0], [0]], attributes);
        curve.updateDataArray = function (this: any) {
            const [left, , right] = board.getBoundingBox();
            const {x, y} = piece(left, right);
            this.dataX = x;
            this.dataY = y;
        };
        return this.own(curve);
    }

    /** The short status line of the board, or undefined when there is nothing to warn about or confirm. */
    private boardStatus(model: BisectionModel, language: NumberLanguage): { text: string; ok: boolean } | undefined {
        const {history} = this.viewOf(model);
        if (history.exactRoot !== undefined) return {text: t("bisection_board_exact_root", {value0: formatPrecise(history.exactRoot, language)}), ok: true};
        if (history.bracket === "same-sign") return {text: t("bisection_board_invalid"), ok: false};
        if (!history.continuous) return {text: t("bisection_board_hypothesis"), ok: false};
        if (history.termination === "stagnation") return {text: t("bisection_board_stagnation"), ok: false};
        if (history.termination === "iteration-limit") return {text: t("bisection_board_limit"), ok: false};
        return undefined;
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const example = () => bisectionExample(this.model.example);
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thick = () => Math.max(3, this.displaySettings.strokeWidth * 2);
        const valid = () => view().history.bracket === "opposite-signs";
        const revealed = () => view().last !== undefined;
        const pieceStyle = {strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth};

        // The function: one curve for the continuous examples, two separate pieces for the jump (never a vertical segment).
        this.own(board.create("functiongraph", [(x: number) => example().value(x)], {
            ...pieceStyle, visible: () => example().continuous,
        }));
        this.pieceCurve((left, right) => sampleJumpPieces(example(), left, right).left, {...pieceStyle, visible: () => !example().continuous});
        this.pieceCurve((left, right) => sampleJumpPieces(example(), left, right).right, {...pieceStyle, visible: () => !example().continuous});

        // The value at the jump is the filled point (right piece); the left limit is the open ring.
        const jump = () => example().discontinuity ?? 0;
        this.own(board.create("point", [jump, () => leftLimit(example())], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, visible: () => !example().continuous,
            fillColor: GraphPalette.boardSurface, highlightFillColor: GraphPalette.boardSurface,
            strokeColor: GraphPalette.primaryCurve, highlightStrokeColor: GraphPalette.primaryCurve, strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
        }));
        this.own(board.create("point", [jump, () => example().value(jump())], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, visible: () => !example().continuous,
            size: () => Math.max(3, this.displaySettings.pointSize * 0.7), fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve,
        }));

        // Intervals on the x-axis: the discarded half of the last step (grey) under the retained interval (the bracket that still holds the root).
        this.own(board.create("segment", [[() => view().last?.retained === "left" ? view().last!.mid : view().a, 0], [() => view().last?.retained === "right" ? view().last!.mid : view().b, 0]], {
            strokeColor: GraphPalette.referenceCurve, strokeWidth: thick, highlight: false, fixed: true, withLabel: false,
            visible: () => view().last !== undefined && view().last!.retained !== "none",
        }));
        this.own(board.create("segment", [[() => view().history.currentA, 0], [() => view().history.currentB, 0]], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: thick, highlight: false, fixed: true, withLabel: false, visible: valid,
        }));

        // Drop lines from the axis to the function values at the endpoints and the midpoint.
        const dropLine = (x: () => number, y: () => number, visible: () => boolean) => this.own(board.create("segment", [[x, 0], [x, y]], {
            strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.7),
            highlight: false, fixed: true, withLabel: false, visible,
        }));
        dropLine(() => view().a, () => view().fa, () => true);
        dropLine(() => view().b, () => view().fb, () => true);
        dropLine(() => view().last?.mid ?? 0, () => view().last?.fMid ?? 0, revealed);

        // Endpoints a, b and midpoint m on the axis, and their function values on the graph.
        const axisPoint = (name: string, x: () => number, placement: "below-left" | "below-right" | "above", visible: () => boolean, color: string) =>
            this.own(board.create("point", [x, 0], {
                ...this.styles.point.fixed, name, highlight: false, label: this.pointLabel(placement, 1, visible), fillColor: color, highlightFillColor: color, visible,
            }));
        axisPoint("$$a$$", () => view().a, "below-left", () => true, GraphPalette.comparisonCurve);
        axisPoint("$$b$$", () => view().b, "below-right", () => true, GraphPalette.comparisonCurve);
        axisPoint("$$m$$", () => view().last?.mid ?? 0, "above", revealed, GraphPalette.constructionAccent);
        const valuePoint = (x: () => number, y: () => number, visible: () => boolean, color: string) =>
            this.own(board.create("point", [x, y], {
                ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, fillColor: color, highlightFillColor: color,
                size: () => Math.max(3, this.displaySettings.pointSize * 0.7), visible,
            }));
        valuePoint(() => view().a, () => view().fa, () => true, GraphPalette.comparisonCurve);
        valuePoint(() => view().b, () => view().fb, () => true, GraphPalette.comparisonCurve);
        valuePoint(() => view().last?.mid ?? 0, () => view().last?.fMid ?? 0, revealed, GraphPalette.constructionAccent);

        // The formula, the progress and the status, in text as well as colour, in the corner no default curve reaches.
        this.caption("bottom-right", [
            {text: () => exampleTitle(model().example), scale: 1.2, math: true},
            {text: () => t("bisection_board_progress", {value0: model().step, value1: formatPrecise(view().history.currentWidth, language())})},
            {
                text: () => this.boardStatus(model(), language())?.text ?? "",
                visible: () => this.boardStatus(model(), language()) !== undefined,
                color: () => this.boardStatus(model(), language())?.ok ? GraphPalette.primaryCurve : GraphPalette.warningText,
            },
        ]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {example, a, b, step} = this.state;
        const history = this.historyOf({example, a, b, step});
        const playing = this.controller.isPlaying();
        const canAdvance = history.termination === undefined;
        const nextUnavailable = !canAdvance || playing;
        const playUnavailable = !canAdvance && !playing;
        const resetUnavailable = step === 0 && !playing;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("bisection_example_label")} value={example} help={t("bisection_example_help")}
                              options={BISECTION_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("bisection_a_label")} value={a} min={BISECTION_BOUND_MIN} max={BISECTION_BOUND_MAX} step={0.1} decimals={9}
                             rejectedHint={t("bisection_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/>
                <NumberInput label={t("bisection_b_label")} value={b} min={BISECTION_BOUND_MIN} max={BISECTION_BOUND_MAX} step={0.1} decimals={9}
                             rejectedHint={t("bisection_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setB(next))}/>
                <p className="inspector-help">{t("bisection_bounds_help")}</p>
            </div>
            <div className="inspector-group">
                {/* An unavailable control stays focusable (aria-disabled, not disabled): a focused button that becomes
                    unavailable at termination or when Play starts must not drop keyboard focus to the page body. */}
                <div className="bisection-actions inspector-playback" role="group" aria-label={t("bisection_iteration_controls")}>
                    <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                            onClick={() => { if (!nextUnavailable) this.ignoreOutOfDomain(() => this.nextStep()); }}>{t("bisection_next_step")}</button>
                    <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                            onClick={() => { if (!playUnavailable) { if (playing) this.pauseIteration(); else this.play(); } }}>{playing ? t("pause") : t("play")}</button>
                    <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                            onClick={() => { if (!resetUnavailable) this.resetIteration(); }}>{t("bisection_reset")}</button>
                </div>
                <p className="inspector-help">{t("bisection_playback_note")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("bisection_legend_function"), kind: "line"},
            {id: "retained", color: GraphPalette.constructionAccent, label: t("bisection_legend_retained"), kind: "line"},
            {id: "discarded", color: GraphPalette.referenceCurve, label: t("bisection_legend_discarded"), kind: "line"},
        ]}/>;
    }

    /** The statuses to state in words, most important first; each has a stable id for tests and for assistive technology. */
    private statuses(model: BisectionModel, language: NumberLanguage): { id: StatusKind; text: string }[] {
        const {history, last} = this.viewOf(model);
        const result: { id: StatusKind; text: string }[] = [];
        if (history.termination === "invalid-bracket") return [{id: "invalid-bracket", text: t("bisection_status_invalid_bracket")}];
        if (history.termination === "endpoint-root") {
            return [{id: "endpoint-root", text: t("bisection_status_endpoint_root", {value0: formatPrecise(history.exactRoot ?? NaN, language)})}];
        }
        if (!history.continuous) result.push({id: "hypothesis", text: t("bisection_status_hypothesis")});
        else result.push(last ? {id: "bracket", text: t("bisection_status_bracket")} : {id: "ready", text: t("bisection_status_ready")});
        if (history.termination === "exact-midpoint-root") {
            result.push({id: "exact-midpoint-root", text: t("bisection_status_midpoint_root", {value0: formatPrecise(history.exactRoot ?? NaN, language)})});
        } else if (history.termination === "stagnation") {
            result.push({id: "stagnation", text: t("bisection_status_stagnation")});
        } else if (history.termination === "iteration-limit") {
            result.push({id: "iteration-limit", text: t("bisection_status_limit", {value0: BISECTION_MAX_STEPS})});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const {example, a, b, step} = this.state;
        const model: BisectionModel = {example, a, b, step};
        const language = currentLanguage();
        const view = this.viewOf(model);
        const {history, last} = view;
        const number = (value: number) => formatPrecise(value, language);
        const pending = history.bracket === "opposite-signs" ? t("bisection_retained_pending") : NOT_A_NUMBER_TEXT;
        const retained = !last ? pending
            : last.retained === "left" ? t("bisection_retained_left")
                : last.retained === "right" ? t("bisection_retained_right") : t("bisection_retained_none");
        const separator = language === "sl" ? "; " : ", ";
        const rows = [
            {id: "step", label: t("bisection_readout_step", {value0: BISECTION_MAX_STEPS}), value: String(history.steps.length)},
            {id: "a", label: t("bisection_readout_a"), value: number(view.a)},
            {id: "b", label: t("bisection_readout_b"), value: number(view.b)},
            {id: "f-a", label: "f(a)", value: number(view.fa)},
            {id: "f-b", label: "f(b)", value: number(view.fb)},
            {id: "mid", label: t("bisection_readout_mid"), value: last ? number(last.mid) : NOT_A_NUMBER_TEXT},
            {id: "f-mid", label: "f(m)", value: last ? number(last.fMid) : NOT_A_NUMBER_TEXT},
            {id: "retained", label: t("bisection_readout_retained"), value: retained},
            {id: "interval", label: t("bisection_readout_interval"), value: `[${number(history.currentA)}${separator}${number(history.currentB)}]`},
            {id: "width", label: t("bisection_readout_width"), value: number(history.currentWidth)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("bisection_note")}/>
            <div className="inspector-group bisection-status" role="status" aria-live="polite">
                {this.statuses(model, language).map(status => <p key={status.id} className="inspector-help" data-bisection-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default BisectionGraph;
