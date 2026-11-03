import React from "react";
import {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, FillCurve, FunctionLessonActions} from "./BaseFunctionGraph";
import IterativeFunctionGraph from "./IterativeFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, t} from "../../localization";
import {formatNumber, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {firstTermWithinTolerance, geometricPartialSum, geometricTerm} from "../../analysis/geometricSeries";
import {
    canAdvanceSeries, chooseSeriesExample, defaultGeometricSeriesModel, GeometricSeriesModel, nextSeriesStep, resetSeriesTerms, SERIES_A_MAX, SERIES_A_MIN,
    SERIES_EXAMPLE_IDS, SERIES_EXAMPLE_MODELS, SERIES_MAX_STEPS, SERIES_Q_MAX, SERIES_Q_MIN, SERIES_TERMS_MAX, SERIES_TERMS_MIN, SERIES_TOLERANCE_MAX,
    SERIES_TOLERANCE_MIN, seriesExampleOf, SeriesEdit, seriesView, SeriesView, seriesYRange, setSeriesA, setSeriesQ, setSeriesTerms, setSeriesTolerance,
} from "../../analysis/geometricSeriesModel";
import {geometricSeriesEditMessage} from "./geometricSeriesMessages";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** Time between two playback steps: one term per interval, never more than one per frame (see ADR 0012). */
export const SERIES_STEP_INTERVAL_MS = 500;

/** The x range holds the indices 1..50; the left margin keeps the y tick labels inside the board. */
const X_LEFT = -6;
const X_RIGHT = SERIES_TERMS_MAX + 3;
/** Bar geometry in index units: the term bar sits left of its index, the partial-sum bar right of it, each thinner than half a unit. */
const TERM_OFFSET = -0.22;
const SUM_OFFSET = 0.18;
const TERM_WIDTH_UNITS = 0.25;
const SUM_WIDTH_UNITS = 0.35;
const EDGE_DASH = 2;

const viewBox = (model: GeometricSeriesModel): BoundingBox => {
    const {bottom, top} = seriesYRange(model.a, model.q, model.tolerance);
    return [X_LEFT, top, X_RIGHT, bottom];
};

/** The example selector texts are the series' own numbers, so they are the same in both languages. */
const exampleText = (id: keyof typeof SERIES_EXAMPLE_MODELS): string => {
    const {a, q} = SERIES_EXAMPLE_MODELS[id];
    return `a = ${formatNumber(a, currentLanguage())}, q = ${formatNumber(q, currentLanguage())}`;
};

type StatusId = "convergent" | "oscillating" | "constant" | "divergent" | "tolerance" | "complete";

/**
 * Geometric series and partial sums (lesson S5). The model is `{a, q, terms, tolerance}` (`src/analysis/geometricSeriesModel`):
 * `terms` is the number of revealed terms, the limit marker comes from the closed form and exists only for |q| < 1, and S_n is the
 * closed form of `src/analysis/geometricSeries` (n a for q = 1), never summed from the shown bars.
 *
 * Next step and playback run the same transition (one more term) through `commitModel`; playback itself (the
 * `IterationController`) is not model data, so a reopened preset is paused. Editing a, q, n, the example or the tolerance stops
 * playback, as does anything that replaces the scene, exports a figure or unmounts the graph.
 *
 * Rules (reject, never clamp): a in [0.1, 5], q in [-2, 2], tolerance in [0, 1] (0 = no band), n an integer 1..50. A setter that
 * would break a rule throws a `DomainError` and leaves the model unchanged.
 */
export class GeometricSeriesGraph extends IterativeFunctionGraph<GeometricSeriesModel> {
    override presetCollection() {
        return functionPresetCollections["geometric-series"];
    }

    protected defaultModel(): GeometricSeriesModel {
        return defaultGeometricSeriesModel();
    }

    protected defaultBoundingBox(): BoundingBox {
        return viewBox(this.model);
    }

    /** The index k and the value have different scales, so the stored view is applied exactly. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    protected override exampleView() {
        return {key: `${this.model.a}|${this.model.q}|${this.model.tolerance}`, box: viewBox(this.model)};
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "series";
    }

    protected stepIntervalMs(): number {
        return SERIES_STEP_INTERVAL_MS;
    }

    protected maxIterations(): number {
        return SERIES_MAX_STEPS;
    }

    protected iterationIndex(model: GeometricSeriesModel): number {
        return model.terms - 1;
    }

    protected canAdvance(): boolean {
        return canAdvanceSeries(this.model);
    }

    protected cannotAdvanceMessage(): Message {
        return message("series_status_complete", {value0: SERIES_TERMS_MAX});
    }

    /** The one mathematical transition of the iteration: Next step and every playback step reveal one more term. */
    protected transition(): IterationOutcome {
        const step = nextSeriesStep(this.model);
        if (!step.advanced) return "complete";
        this.commitModel(step.model);
        return step.outcome;
    }

    /** Back to one revealed term of the same a, q and tolerance; playback stops. */
    protected resetIteration(): void {
        this.replaceModel(resetSeriesTerms(this.model));
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    private viewOf(model: GeometricSeriesModel): SeriesView {
        return this.memoView(model, () => seriesView(model));
    }

    protected setExample(value: unknown): void {
        this.applyEdit(chooseSeriesExample(value));
    }

    protected setA(value: number): void { this.applyEdit(setSeriesA(this.model, value)); }

    protected setQ(value: number): void { this.applyEdit(setSeriesQ(this.model, value)); }

    protected setTerms(value: number): void { this.applyEdit(setSeriesTerms(this.model, value)); }

    protected setTolerance(value: number): void { this.applyEdit(setSeriesTolerance(this.model, value)); }

    /** Lesson scenes set a, q, n, the tolerance and the example; a scene is a state, so none of them starts playback. */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "series-a": value => this.setA(value), "series-q": value => this.setQ(value),
                "series-n": value => this.setTerms(value), "series-tolerance": value => this.setTolerance(value),
            },
            choices: {"series-example": value => this.setExample(value)},
        };
    }

    /** The model module decides; a refusal becomes a localized `DomainError`, no change commits nothing. A new a, q or tolerance refits the view (the band edges stay on the board). */
    private applyEdit(edit: SeriesEdit): void {
        if (!edit.ok) throw new DomainError(geometricSeriesEditMessage(edit.issue));
        if (edit.model === this.model) return;
        const refit = edit.model.a !== this.model.a || edit.model.q !== this.model.q || edit.model.tolerance !== this.model.tolerance;
        this.replaceModel(edit.model);
        if (refit && this.generatedObjectCount > 0) this.board.setBoundingBox(viewBox(edit.model), this.equalAxisUnits);
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number): string {
        return formatNumber(value, currentLanguage(), 4);
    }

    private statuses(model: GeometricSeriesModel, view: SeriesView): { id: StatusId; text: string }[] {
        const result: { id: StatusId; text: string }[] = [];
        if (view.limit !== null) result.push({id: "convergent", text: t("series_status_convergent", {value0: this.number(view.limit)})});
        else if (view.behaviour === "oscillating") result.push({id: "oscillating", text: t("series_status_oscillating", {value0: this.number(model.a)})});
        else if (model.q === 1) result.push({id: "constant", text: t("series_status_constant")});
        else result.push({id: "divergent", text: t("series_status_divergent")});
        if (view.limit !== null && model.tolerance > 0) {
            // "From n on" holds because the error |a q^n/(1-q)| decreases monotonically for |q| < 1 (see firstTermWithinTolerance).
            const first = firstTermWithinTolerance(model.a, model.q, model.tolerance);
            const tolerance = this.number(model.tolerance);
            result.push({
                id: "tolerance",
                text: first === null ? t("series_status_tolerance_none", {value0: tolerance, value1: SERIES_TERMS_MAX}) : t("series_status_tolerance", {value0: tolerance, value1: first}),
            });
        }
        if (model.terms >= SERIES_TERMS_MAX) result.push({id: "complete", text: t("series_status_complete", {value0: SERIES_TERMS_MAX})});
        return result;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const compact = () => this.boardWidth() < COMPACT_BOARD_WIDTH;
        const left = () => board.getBoundingBox()[0];
        const right = () => board.getBoundingBox()[2];
        const pixelsPerUnit = () => this.boardWidth() / (right() - left());
        const hasLimit = () => view().limit !== null;
        const limit = () => view().limit ?? 0;
        const bandVisible = () => hasLimit() && model().tolerance > 0;
        const bandLow = () => limit() - model().tolerance;
        const bandHigh = () => limit() + model().tolerance;

        // Layers, lowest first: the tolerance band with dashed edges, the bars, the limit marker.
        const band = this.own(board.create("curve", [[], []], {
            fillColor: GraphPalette.additionalCurves[0], fillOpacity: 0.22, strokeOpacity: 0, strokeWidth: 0, highlight: false, fixed: true, visible: bandVisible,
        })) as unknown as FillCurve;
        band.updateDataArray = () => {
            band.dataX = [left(), right(), right(), left(), left()];
            band.dataY = [bandLow(), bandLow(), bandHigh(), bandHigh(), bandLow()];
        };
        for (const edge of [bandLow, bandHigh]) {
            this.own(board.create("segment", [[left, edge], [right, edge]], {
                strokeColor: GraphPalette.additionalCurves[0], dash: EDGE_DASH, strokeWidth: thin, highlight: false, fixed: true, withLabel: false, visible: bandVisible,
            }));
        }

        // One slot per possible term and per kind: the term a q^(k-1) as a thin bar left of k, the partial sum S_k as a thick bar right of it.
        const bar = (x: number, value: (k: number) => number, k: number, color: string, widthUnits: number, opacity: number) =>
            this.own(board.create("segment", [[x, 0], [x, () => value(k)]], {
                strokeColor: color, strokeOpacity: opacity, strokeWidth: () => Math.max(1.5, widthUnits * pixelsPerUnit()), highlight: false, fixed: true,
                withLabel: false, firstArrow: false, lastArrow: false, visible: () => k <= model().terms,
            }));
        for (let k = 1; k <= SERIES_TERMS_MAX; k++) {
            bar(k + TERM_OFFSET, index => geometricTerm(model().a, model().q, index), k, GraphPalette.additionalCurves[0], TERM_WIDTH_UNITS, 0.85);
            bar(k + SUM_OFFSET, index => geometricPartialSum(model().a, model().q, index), k, GraphPalette.primaryCurve, SUM_WIDTH_UNITS, 1);
        }

        // The limit marker exists only for |q| < 1.
        this.own(board.create("segment", [[left, limit], [right, limit]], {
            strokeColor: GraphPalette.comparisonCurve, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: hasLimit,
        }));

        this.caption("top-right", [
            {text: () => t("series_board_formula"), scale: 1.2, math: true},
            {text: () => t("series_board_parameters", {value0: this.number(model().a), value1: this.number(model().q), value2: model().terms})},
            {text: () => t("series_board_sum", {value0: this.number(view().partialSum)})},
            {
                text: () => {
                    const limitNow = view().limit;
                    return limitNow === null ? t("series_board_no_limit") : t("series_board_limit", {value0: this.number(limitNow)});
                },
                color: () => view().limit === null ? GraphPalette.warningText : GraphPalette.label,
            },
            {text: () => {
                const error = view().error;
                return error === null ? "" : t("series_board_error", {value0: this.number(error)});
            }, visible: hasLimit},
            {text: () => t("series_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH, visible: () => !compact()},
        ]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const language = currentLanguage();
        const playing = this.controller.isPlaying();
        const canAdvance = canAdvanceSeries(state);
        const nextUnavailable = !canAdvance || playing;
        const playUnavailable = !canAdvance && !playing;
        const resetUnavailable = state.terms <= SERIES_TERMS_MIN && !playing;
        const example = seriesExampleOf(state);
        const options = SERIES_EXAMPLE_IDS.map(id => ({value: id as string, text: exampleText(id)}));
        const rangeHint = (min: number, max: number) => ({value0: formatNumber(min, language), value1: formatNumber(max, language)});
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("series_example_label")} value={example ?? "custom"} help={t("series_example_help")}
                              options={example === undefined ? [...options, {value: "custom", text: t("series_example_custom")}] : options}
                              onChange={next => { if (next !== "custom") this.ignoreOutOfDomain(() => this.setExample(next)); }}/>
            </div>
            <div className="inspector-group">
                <Slider customText={t("series_a_label")} min={SERIES_A_MIN} max={SERIES_A_MAX} step={0.1} value={state.a}
                        rejectedHint={t("series_a_rejected_hint", rangeHint(SERIES_A_MIN, SERIES_A_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/>
                <Slider customText={t("series_q_label")} min={SERIES_Q_MIN} max={SERIES_Q_MAX} step={0.05} value={state.q}
                        rejectedHint={t("series_q_rejected_hint", rangeHint(SERIES_Q_MIN, SERIES_Q_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setQ(next))}/>
                <NumberInput label={t("series_terms_label")} value={state.terms} min={SERIES_TERMS_MIN} max={SERIES_TERMS_MAX} step={1} decimals={0} integer
                             rejectedHint={t("series_terms_rejected_hint", {value0: SERIES_TERMS_MIN, value1: SERIES_TERMS_MAX})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setTerms(next))}/>
                <NumberInput label={t("series_tolerance_label")} value={state.tolerance} min={SERIES_TOLERANCE_MIN} max={SERIES_TOLERANCE_MAX} step={0.01} decimals={3}
                             rejectedHint={t("series_tolerance_rejected_hint", rangeHint(SERIES_TOLERANCE_MIN, SERIES_TOLERANCE_MAX))}
                             onChange={next => this.ignoreOutOfDomain(() => this.setTolerance(next))}/>
                <p className="inspector-help">{t("series_fields_help")}</p>
            </div>
            <div className="inspector-group">
                {/* An unavailable control stays focusable (aria-disabled, not disabled): a focused button that becomes
                    unavailable at the last term or when Play starts must not drop keyboard focus to the page body. */}
                <div className="demo-actions inspector-playback" role="group" aria-label={t("series_iteration_controls")}>
                    <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                            onClick={() => { if (!nextUnavailable) this.ignoreOutOfDomain(() => this.nextStep()); }}>{t("series_next_step")}</button>
                    <button type="button" data-action="play-pause" aria-disabled={playUnavailable}
                            onClick={() => { if (!playUnavailable) { if (playing) this.pauseIteration(); else this.play(); } }}>{playing ? t("pause") : t("play")}</button>
                    <button type="button" data-action="reset" aria-disabled={resetUnavailable}
                            onClick={() => { if (!resetUnavailable) this.resetIteration(); }}>{t("series_reset")}</button>
                </div>
                <p className="inspector-help">{t("series_playback_note", {value0: SERIES_TERMS_MAX})}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "term", color: GraphPalette.additionalCurves[0], label: t("series_legend_term")},
            {id: "sum", color: GraphPalette.primaryCurve, label: t("series_legend_sum")},
            {id: "limit", color: GraphPalette.comparisonCurve, label: t("series_legend_limit"), kind: "line"},
            {id: "band", color: GraphPalette.additionalCurves[0], label: t("series_legend_band"), kind: "dashed"},
        ]}/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const view = this.viewOf(model);
        const first = view.limit !== null && model.tolerance > 0 ? firstTermWithinTolerance(model.a, model.q, model.tolerance) : null;
        const behaviour = view.behaviour === "convergent" ? t("series_behaviour_convergent")
            : view.behaviour === "oscillating" ? t("series_behaviour_oscillating") : t("series_behaviour_divergent");
        const rows = [
            {id: "terms", label: t("series_readout_terms", {value0: SERIES_TERMS_MAX}), value: String(model.terms)},
            {id: "last-term", label: t("series_readout_last_term"), value: this.number(view.lastTerm)},
            {id: "sum", label: t("series_readout_sum"), value: this.number(view.partialSum)},
            {id: "limit", label: t("series_readout_limit"), value: view.limit === null ? t("series_no_limit") : this.number(view.limit)},
            {id: "error", label: t("series_readout_error"), value: view.error === null ? NOT_A_NUMBER_TEXT : this.number(view.error)},
            {id: "first-within", label: t("series_readout_first_within"), value: first === null ? NOT_A_NUMBER_TEXT : String(first)},
            {id: "behaviour", label: t("series_readout_behaviour"), value: behaviour},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("series_note", {value0: SERIES_TERMS_MAX})}/>
            <div className="inspector-group demo-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-series-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }
}

export default GeometricSeriesGraph;
