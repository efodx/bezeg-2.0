import React from "react";
import {BoundingBox, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import IterativeFunctionGraph from "./IterativeFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, Message, message, renderMessage, t} from "../../localization";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {
    CLT_EXAMPLE_IDS, CLT_HEIGHT_COUNT, CLT_HEIGHT_MAX, CLT_N_MAX, CltEdit, cltExampleOf, CltModel, cltView, CltViewResult,
    chooseCltExample, DEFAULT_CLT_MODEL, fitCltView, isCltExampleId, setCltCdf, setCltHeight, setCltN,
} from "../../analysis/cltModel";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {cltDistance, cltEditMessage, cltNumber} from "./cltMessages";
import {functionPresetCollections} from "./functionPresetCollections";

const CLT_COLORS = {sum: "#2468a2", normal: "#bd6047"} as const;

/** Time between two playback steps: one copy added per interval, never more than one per frame (ADR 0012). */
export const CLT_STEP_INTERVAL_MS = 700;

/**
 * The central limit theorem without randomness (lesson P3): the standardized density (or CDF) of the sum of n independent
 * copies of a piecewise linear base density, drawn over the standard normal curve on a fixed view. The model is
 * `{heights, n, cdf}` (`src/analysis/cltModel`); the iteration index is n (n - 1 additions), so Next step adds one copy
 * (one convolution thanks to the model's history cache) and Reset returns to n = 1.
 *
 * Board objects (the count does not depend on n): the n-fold curve and the normal curve, both rebuilt from point lists on
 * every board update, and the caption. The base shape is edited with sliders and number fields in the inspector (no handles
 * on the board: the board shows the standardized sum, whose coordinates are not the base shape's).
 */
export class CltGraph extends IterativeFunctionGraph<CltModel> {
    /** The reason the last refused edit gave; shown in the status region until an edit is accepted. */
    private notice?: Message;

    override presetCollection() {
        return functionPresetCollections["prob-clt"];
    }

    protected defaultModel(): CltModel {
        return {...DEFAULT_CLT_MODEL, heights: [...DEFAULT_CLT_MODEL.heights]};
    }

    protected defaultBoundingBox(): BoundingBox {
        return fitCltView(DEFAULT_CLT_MODEL);
    }

    /** The plot is a density in standardized units: the axes have different scales. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    /** The view follows the base shape (its peak sets the top) and the density/CDF choice, not n. */
    protected override exampleView() {
        return {key: `${this.model.heights.join(",")}|${this.model.cdf}`, box: fitCltView(this.model)};
    }

    private viewOf(model: CltModel): CltViewResult {
        return this.memoView(model, () => cltView(model));
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "clt-sum";
    }

    protected stepIntervalMs(): number {
        return CLT_STEP_INTERVAL_MS;
    }

    /** n runs 1..CLT_N_MAX, so CLT_N_MAX - 1 additions. */
    protected maxIterations(): number {
        return CLT_N_MAX - 1;
    }

    protected iterationIndex(model: CltModel): number {
        return model.n - 1;
    }

    protected canAdvance(): boolean {
        return this.model.n < CLT_N_MAX;
    }

    protected cannotAdvanceMessage(): Message {
        return message("prob_clt_cannot_advance", {value0: CLT_N_MAX});
    }

    /** Adds one copy: n + 1. */
    protected transition(): IterationOutcome {
        if (!this.canAdvance()) return "complete";
        const next = setCltN(this.model, this.model.n + 1);
        if (!next.ok) return "complete";
        this.commitModel(next.model);
        return next.model.n < CLT_N_MAX ? "continue" : "complete";
    }

    /** Back to n = 1 with the same shape; playback stops. */
    protected resetIteration(): void {
        this.replaceModel({...this.model, n: 1});
        this.setNotice(undefined); // the button and the lesson reset/replay commands both land here
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    private accepted(edit: CltEdit): CltModel {
        if (!edit.ok) throw new DomainError(cltEditMessage(edit.issue));
        return edit.model;
    }

    /** Runs an inspector change: a refusal is kept as the visible notice, an accepted change clears it. */
    private guarded(action: () => void): boolean {
        try {
            action();
            this.setNotice(undefined);
            return true;
        } catch (error) {
            if (!(error instanceof DomainError)) throw error;
            this.setNotice(error.reason);
            return false;
        }
    }

    private setNotice(next: Message | undefined): void {
        if (this.notice === next) return;
        this.notice = next;
        this.requestRender();
    }

    /** Shows the whole standardized plot when the edit changed what the fixed view depends on (peak, density or CDF). */
    private refitIfChanged(before: CltModel, after: CltModel): void {
        if (this.generatedObjectCount === 0) return;
        const view = fitCltView(after);
        const previous = fitCltView(before);
        if (view.some((value, index) => value !== previous[index])) this.board.setBoundingBox(view, this.equalAxisUnits);
    }

    private replaceAndRefit(next: CltModel): void {
        const before = this.model;
        this.replaceModel(next);
        this.refitIfChanged(before, next);
    }

    /** Sets one base height: the shape is a new base, so the history restarts at the same n and playback stops. */
    protected setHeight(index: unknown, value: unknown): void {
        const next = this.accepted(setCltHeight(this.model, index, value));
        if (next !== this.model) this.replaceAndRefit(next);
        else this.pauseIteration();
    }

    protected setN(value: unknown): void {
        const next = this.accepted(setCltN(this.model, value));
        if (next !== this.model) this.replaceModel(next);
    }

    protected setCdf(value: unknown): void {
        const before = this.model;
        const next = this.accepted(setCltCdf(before, value));
        if (next === before) return;
        this.commitModel(next);
        this.refitIfChanged(before, next);
    }

    protected setExample(id: unknown): void {
        const next = this.accepted(chooseCltExample(this.model, id));
        if (next !== this.model) this.replaceAndRefit(next);
        else this.pauseIteration();
    }

    /**
     * Lesson steps go through the same validated setters as the inspector, so a refused value throws a DomainError. An
     * example step restarts the history at n = 1, pauses playback and refits like the UI; n keeps the view, and the CDF
     * step refits only when the plot height changes.
     */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"clt-n": value => this.setN(value)},
            visibility: {"clt-cdf": visible => this.setCdf(visible)},
            choices: {"clt-example": value => this.setExample(value)},
        };
    }

    override importPresetData(data: CltModel): void {
        super.importPresetData(data);
        this.notice = undefined;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;

        const polyline = (color: string, dash: number, data: () => { x: number[]; y: number[] }) => {
            const curve = this.own(board.create("curve", [[], []], {
                strokeColor: color, dash, fillOpacity: 0, highlight: false, fixed: true, strokeWidth,
            })) as unknown as { updateDataArray: () => void; dataX: number[]; dataY: number[] };
            curve.updateDataArray = () => {
                const {x, y} = data();
                curve.dataX = x;
                curve.dataY = y;
            };
        };
        const empty = {x: [] as number[], y: [] as number[]};
        polyline(CLT_COLORS.normal, 2, () => {
            const result = this.viewOf(this.model);
            return result.ok ? result.view.normal : empty;
        });
        polyline(CLT_COLORS.sum, 0, () => {
            const result = this.viewOf(this.model);
            return result.ok ? result.view.curve : empty;
        });

        this.caption("top-left", [
            {text: () => t("prob_clt_board_title", {value0: this.model.n}), scale: 1.2},
            {
                text: () => {
                    const result = this.viewOf(this.model);
                    return result.ok ? t("prob_clt_board_distance", {value0: cltDistance(result.view.kolmogorov, language())}) : "";
                },
                visible: () => this.viewOf(this.model).ok,
            },
        ]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const language = currentLanguage();
        const example = cltExampleOf(state);
        const options = [
            ...CLT_EXAMPLE_IDS.map(id => ({value: id, text: t(id === "uniform" ? "prob_clt_example_uniform" : "prob_clt_example_skewed")})),
            ...(example === undefined ? [{value: "custom", text: t("prob_clt_example_custom")}] : []),
        ];
        const playing = this.controller.isPlaying();
        const atMax = state.n >= CLT_N_MAX;
        const nextUnavailable = atMax || playing;
        const playUnavailable = atMax && !playing;
        const resetUnavailable = state.n === 1 && !playing;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_clt_example_label")} value={example ?? "custom"} help={t("prob_clt_example_help")} options={options}
                              onChange={next => { if (isCltExampleId(next)) this.guarded(() => this.setExample(next)); }}/>
            </div>
            <div className="inspector-group">
                <Slider customText={t("prob_clt_n_label")} min={1} max={CLT_N_MAX} step={1} value={state.n}
                        rejectedHint={t("prob_clt_n_rejected", {value0: CLT_N_MAX})} onChange={next => this.guarded(() => this.setN(next))}/>
                {/* An unavailable control stays focusable (aria-disabled): a focused button must not lose focus when it becomes unavailable. */}
                <div className="bisection-actions inspector-playback" role="group" aria-label={t("prob_clt_iteration_controls")}>
                    <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                            onClick={() => { if (!nextUnavailable) this.guarded(() => this.nextStep()); }}>{t("prob_clt_next_step")}</button>
                    <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                            onClick={() => { if (!playUnavailable) { if (playing) this.pauseIteration(); else this.play(); } }}>{playing ? t("pause") : t("play")}</button>
                    <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                            onClick={() => { if (!resetUnavailable) this.resetIteration(); }}>{t("prob_clt_reset")}</button>
                </div>
                <p className="inspector-help">{t("prob_clt_playback_note")}</p>
            </div>
            <div className="inspector-group">
                {state.heights.map((height, index) => <Slider key={index}
                    customText={t("prob_clt_height_label", {value0: index + 1, value1: formatNumber(index / (CLT_HEIGHT_COUNT - 1), language, 2)})}
                    min={0} max={CLT_HEIGHT_MAX} step={0.05} value={height}
                    rejectedHint={t("prob_clt_zero_rejected")} onChange={next => this.guarded(() => this.setHeight(index, next))}/>)}
                <p className="inspector-help">{t("prob_clt_heights_help")}</p>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.cdf} label={t("prob_clt_cdf_label")} onChange={next => this.guarded(() => this.setCdf(next))}/>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const language = currentLanguage();
        const result = this.viewOf(model);
        const number = (value: number) => cltNumber(value, language);
        const rows = result.ok ? [
            {id: "n", label: t("prob_clt_readout_n"), value: String(model.n)},
            {id: "mean", label: t("prob_clt_readout_mean"), value: number(result.view.mean)},
            {id: "variance", label: t("prob_clt_readout_variance"), value: number(result.view.variance)},
            {id: "sum-mean", label: t("prob_clt_readout_sum_mean"), value: number(result.view.sumMean)},
            {id: "sum-variance", label: t("prob_clt_readout_sum_variance"), value: number(result.view.sumVariance)},
            {id: "kolmogorov", label: t("prob_clt_readout_kolmogorov"), value: cltDistance(result.view.kolmogorov, language)},
            {id: "mass-residual", label: t("prob_clt_readout_residual"), value: formatSignificant(result.view.massResidual, language, 3)},
        ] : [{id: "n", label: t("prob_clt_readout_n"), value: String(model.n)}];
        const statuses: { id: string; text: string }[] = [];
        if (this.notice) statuses.push({id: "refused", text: renderMessage(this.notice)});
        if (!result.ok) statuses.push({id: "failed", text: renderMessage(cltEditMessage(result.issue))});
        if (model.n >= CLT_N_MAX) statuses.push({id: "max-n", text: renderMessage(this.cannotAdvanceMessage())});
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("prob_clt_note")}/>
            <div className="inspector-group" role="status" aria-live="polite">
                {statuses.map(status => <p key={status.id} className="inspector-help" data-prob-clt-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "sum", color: CLT_COLORS.sum, label: t("prob_clt_legend_sum"), kind: "line"},
            {id: "normal", color: CLT_COLORS.normal, label: t("prob_clt_legend_normal"), kind: "dashed-line"},
        ]}/>;
    }
}

export default CltGraph;
