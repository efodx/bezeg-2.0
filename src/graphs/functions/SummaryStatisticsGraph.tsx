import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React from "react";
import BaseFunctionGraph, {BoundingBox, cleanNumber, DomainError, FillCurve, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {FunctionStatus} from "./FunctionStatus";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {guard} from "../base/controls/guard";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {ValueListInput} from "../../inputs/ValueListInput";
import {currentLanguage, renderMessage, t} from "../../localization";
import {NOT_A_NUMBER_TEXT} from "../../analysis/format";
import type {QuartileRule} from "../../analysis/descriptiveStatistics";
import {
    addSummaryValue, chooseSummaryExample, DEFAULT_SUMMARY_MODEL, fitSummaryView, isSummaryExampleId, moveSummaryValue,
    removeSummaryValue, setSummaryBoxPlot, setSummaryRule, setSummarySigma, setSummarySigmaBand, summaryExampleOf,
    SUMMARY_EXAMPLE_IDS, summaryStatisticsView, SUMMARY_VALUE_MAX, SUMMARY_VALUE_MIN, SUMMARY_VALUES_MAX, SUMMARY_VALUES_MIN,
    SummaryEdit, SummaryModel, SummaryView,
} from "../../analysis/summaryStatisticsModel";
import {summaryEditMessage, summaryNumber} from "./summaryStatisticsMessages";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";

/** Height step of the next equal value in a stack of tied dots, and the rows of the box plot and the markers (board units). */
export const SUMMARY_STACK_STEP = 0.35;
const BOX_BOTTOM = 1;
const BOX_TOP = 2;
const MEAN_Y = -0.5;
const MEDIAN_Y = -0.95;
const BAND_BOTTOM = -1.7;
const BAND_TOP = -1.3;
/** Roles by hue (and shape): the mean and its spread are blue, a triangle; the median and the box it sits in are moss, a square; the data stay ochre. */
const MEAN_COLOR = GraphPalette.comparisonCurve;
const MEDIAN_COLOR = GraphPalette.primaryCurve;

/**
 * Mean, median, standard deviation and the box plot (lesson P4): up to 15 values as dots on a number line, a box plot above
 * them, the mean and median markers and an optional band mean +- sigma below. The model is `{values, rule, sigma, boxPlot,
 * sigmaBand}` (`src/analysis/summaryStatisticsModel`); every number comes from that model's view.
 *
 * Board objects (owned; the count does not depend on n except for the dots and the outlier markers, which are pools of
 * SUMMARY_VALUES_MAX): the dots (draggable horizontally only; a drag commits through `moveSummaryValue`, which snaps to tenths
 * and refuses a value outside the range, so the dot returns to its previous value), the mean marker (triangle), the median
 * marker (square), the box plot (one curve for box, median and whiskers), the fences (one dashed curve), the outlier markers
 * (diamonds in the box row) and the sigma band (one filled curve). Equal values stack upward.
 *
 * Keyboard: the typed value list in the inspector is the keyboard path; the dots themselves have no arrow-key handler (the
 * point-selection pattern of the point-set graphs needs a selection model that one-dimensional dots do not otherwise use).
 *
 * View policy: the view is `fitSummaryView(values)`; it is refitted when an example is chosen, on Reset, Preset restore and
 * the Fit button (through `exampleView`), and after an add or a typed edit only when a value would otherwise lie outside the
 * visible x range. A drag never refits (the view would move under the pointer).
 */
export class SummaryStatisticsGraph extends BaseFunctionGraph<SummaryModel> {
    protected pointObjects: JXG.Point[] = [];

    override presetCollection() {
        return functionPresetCollections["prob-summary"];
    }

    protected defaultModel(): SummaryModel {
        return {...DEFAULT_SUMMARY_MODEL, values: [...DEFAULT_SUMMARY_MODEL.values]};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...fitSummaryView(DEFAULT_SUMMARY_MODEL.values)];
    }

    /** The number line and the box rows have different scales. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    protected override exampleView() {
        return {key: this.model.values.join(","), box: [...fitSummaryView(this.model.values)] as BoundingBox};
    }

    private viewOf(model: SummaryModel): SummaryView {
        return this.memoView(model, () => summaryStatisticsView(model));
    }

    /** Height of dot `index`: tied dots stack upward in list order. */
    private stackY(index: number): number {
        const values = this.model.values;
        let ties = 0;
        for (let i = 0; i < index; i++) if (values[i] === values[index]) ties++;
        return cleanNumber(ties * SUMMARY_STACK_STEP);
    }

    // ---- Model operations ----------------------------------------------------------------------------------------

    private accepted(edit: SummaryEdit): SummaryModel {
        if (!edit.ok) throw new DomainError(summaryEditMessage(edit.issue));
        return edit.model;
    }

    /** Runs an inspector change: a refusal is shown alone in the graph's refusal notice, an accepted change clears it. */
    private guarded(action: () => void): boolean {
        return guard(this.refusals, action);
    }

    /** Refits only when a value lies outside the visible x range (after an add or a typed edit; never during a drag). */
    private ensureValuesVisible(): void {
        if (this.generatedObjectCount === 0) return;
        const [left, , right] = this.board.getBoundingBox();
        if (this.model.values.some(value => value < left || value > right)) {
            this.board.setBoundingBox([...fitSummaryView(this.model.values)], this.equalAxisUnits);
        }
    }

    protected moveValue(index: unknown, value: unknown): void {
        const next = this.accepted(moveSummaryValue(this.model, index, value));
        if (next !== this.model) this.commitModel(next);
        this.ensureValuesVisible();
    }

    protected addValue(value?: unknown): void {
        this.commitModel(this.accepted(addSummaryValue(this.model, value)));
        this.ensureValuesVisible();
    }

    protected removeValue(index: unknown): void {
        this.commitModel(this.accepted(removeSummaryValue(this.model, index)));
    }

    protected setRule(value: unknown): void {
        const next = this.accepted(setSummaryRule(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setSigma(value: unknown): void {
        const next = this.accepted(setSummarySigma(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setBoxPlot(value: unknown): void {
        const next = this.accepted(setSummaryBoxPlot(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setSigmaBand(value: unknown): void {
        const next = this.accepted(setSummarySigmaBand(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setExample(id: unknown): void {
        const next = this.accepted(chooseSummaryExample(this.model, id));
        if (next === this.model) return;
        this.commitModel(next);
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...fitSummaryView(next.values)], this.equalAxisUnits);
    }

    /** The typed list's edit: refused with the localized message, applied otherwise. */
    private editValue(index: number, value: number): string | void {
        const edit = moveSummaryValue(this.model, index, value);
        if (!edit.ok) return renderMessage(summaryEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model);
        this.ensureValuesVisible();
        this.refusals.clear();
    }

    /** A drag: the value follows the pointer snapped to tenths and stops at the value limit without a message (task 0 decision 3). */
    private dragValue(index: number, x: number): void {
        const edit = moveSummaryValue(this.model, index, Math.max(SUMMARY_VALUE_MIN, Math.min(SUMMARY_VALUE_MAX, x)));
        if (edit.ok) {
            this.refusals.clear();
            if (edit.model !== this.model) this.commitModel(edit.model, {syncScene: false});
        }
        this.syncSceneToModel();
    }

    // ---- Lesson actions ------------------------------------------------------------------------------------------------

    /**
     * Lesson steps go through the inspector's validated edits, so a refused value throws a DomainError. A value edit or an
     * added value refits only when a value would lie outside the visible x range (step 2 moves 8 to 30); an example refits.
     */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            visibility: {
                "summary-box-plot": visible => this.setBoxPlot(visible),
                "summary-sigma-band": visible => this.setSigmaBand(visible),
            },
            choices: {
                "summary-example": value => this.setExample(value),
                "summary-rule": value => this.setRule(value),
                "summary-sigma": value => this.setSigma(value),
            },
        };
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("summary", action => {
            if (action.operation === "set-value") this.moveValue(action.index, action.value);
            else if (action.operation === "add-value") this.addValue(action.value);
            else if (action.operation === "remove-value") this.removeValue(action.index);
            else throw new Error("A summary action needs the operation set-value, add-value or remove-value.");
        });
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** Puts every dot on its value and stack height (the dragged dot included, so it always sits on the tenth grid). */
    protected override syncSceneToModel(): void {
        this.model.values.forEach((value, index) => {
            const point = this.pointObjects[index];
            if (!point) return;
            const y = this.stackY(index);
            if (point.X() !== value || point.Y() !== y) point.moveTo([value, y]);
        });
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const boxShown = () => model().boxPlot && view().summary.status === "ok";
        const thin = this.displayThinWidth(0.6);

        // The sigma band: a filled strip below the axis, [mean - sigma, mean + sigma].
        const band = this.own(board.create("curve", [[], []], {
            fillColor: MEAN_COLOR, fillOpacity: 0.28, strokeColor: MEAN_COLOR, strokeWidth: this.displayThinWidth(0.8),
            highlight: false, fixed: true, visible: () => model().sigmaBand && view().sigma !== undefined,
        })) as unknown as FillCurve;
        band.updateDataArray = () => {
            const {mean, sigma} = view();
            if (sigma === undefined) {
                band.dataX = [];
                band.dataY = [];
                return;
            }
            band.dataX = [mean - sigma, mean + sigma, mean + sigma, mean - sigma, mean - sigma];
            band.dataY = [BAND_BOTTOM, BAND_BOTTOM, BAND_TOP, BAND_TOP, BAND_BOTTOM];
        };

        // The box plot: box, median line, whiskers and their caps in one curve (NaN separates the parts).
        const box = this.own(board.create("curve", [[], []], {
            strokeColor: MEDIAN_COLOR, fillOpacity: 0, strokeWidth: this.displayThinWidth(1.4), highlight: false, fixed: true,
            visible: boxShown,
        })) as unknown as FillCurve;
        box.updateDataArray = () => {
            const s = view().summary;
            if (s.status !== "ok") {
                box.dataX = [];
                box.dataY = [];
                return;
            }
            const mid = (BOX_BOTTOM + BOX_TOP) / 2;
            const cap = (BOX_TOP - BOX_BOTTOM) / 4;
            box.dataX = [s.q1, s.q3, s.q3, s.q1, s.q1, NaN, s.median, s.median, NaN, s.whiskerLow, s.q1, NaN, s.q3, s.whiskerHigh, NaN,
                s.whiskerLow, s.whiskerLow, NaN, s.whiskerHigh, s.whiskerHigh];
            box.dataY = [BOX_BOTTOM, BOX_BOTTOM, BOX_TOP, BOX_TOP, BOX_BOTTOM, NaN, BOX_BOTTOM, BOX_TOP, NaN, mid, mid, NaN, mid, mid, NaN,
                mid - cap, mid + cap, NaN, mid - cap, mid + cap];
        };

        // The fences: two faint dashed vertical marks.
        const fences = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.referenceCurve, strokeWidth: thin, dash: 2, fillOpacity: 0, highlight: false, fixed: true, visible: boxShown,
        })) as unknown as FillCurve;
        fences.updateDataArray = () => {
            const s = view().summary;
            if (s.status !== "ok") {
                fences.dataX = [];
                fences.dataY = [];
                return;
            }
            fences.dataX = [s.lowerFence, s.lowerFence, NaN, s.upperFence, s.upperFence];
            fences.dataY = [BOX_BOTTOM - 0.2, BOX_TOP + 0.2, NaN, BOX_BOTTOM - 0.2, BOX_TOP + 0.2];
        };

        // Outlier markers: diamonds in the box row (shape and colour, not colour alone).
        const outlierAt = (i: number) => {
            const s = view().summary;
            return s.status === "ok" ? s.outliers[i] : undefined;
        };
        for (let i = 0; i < SUMMARY_VALUES_MAX; i++) {
            this.own(board.create("point", [() => outlierAt(i) ?? 0, (BOX_BOTTOM + BOX_TOP) / 2], {
                ...this.styles.point.default, name: "", withLabel: false, face: "diamond", fixed: true, highlight: false,
                fillColor: GraphPalette.warningText, strokeColor: GraphPalette.pointOutline,
                size: () => Math.max(7, this.displaySettings.pointSize + 3),
                visible: () => boxShown() && outlierAt(i) !== undefined,
            }));
        }

        // The mean (triangle) and median (square) markers below the axis, large enough for projection and captioned on the
        // board, so they are told apart by shape and word, not by colour alone.
        // A JSXGraph square of size s is 2s wide, a triangle of size s is narrower: `scale` evens their visual weight.
        const marker = (face: string, color: string, x: () => number, y: number, caption: () => string, scale = 1) => {
            this.own(board.create("point", [x, y], {
                ...this.styles.point.default, name: "", withLabel: false, face, fixed: true, highlight: false, fillColor: color,
                strokeColor: GraphPalette.pointOutline, size: () => scale * Math.max(10, this.displaySettings.pointSize + 6),
            }));
            this.own(board.create("text", [() => x() + 14 / board.unitX, y, caption], {
                anchorY: "middle", fixed: true, highlight: false, color, fontSize: 15,
            }));
        };
        marker("triangleup", MEAN_COLOR, () => view().mean, MEAN_Y, () => t("prob_summary_mark_mean"));
        marker("square", MEDIAN_COLOR, () => view().median, MEDIAN_Y, () => t("prob_summary_mark_median"), 0.7);

        // The draggable dots, horizontally only.
        this.pointObjects = [];
        for (let j = 0; j < SUMMARY_VALUES_MAX; j++) {
            const start = model().values[j] ?? 0;
            const point = this.own(board.create("point", [start, j < model().values.length ? this.stackY(j) : 0], {
                ...this.styles.point.default, name: "", withLabel: false, fillColor: GraphPalette.controlPoint,
                highlightFillColor: GraphPalette.selectedControlPoint, strokeColor: GraphPalette.pointOutline,
                size: () => Math.max(4, this.displaySettings.pointSize), visible: () => j < model().values.length,
            })) as JXG.Point;
            bindMovablePointCursor(point, board);
            point.on("drag", () => {
                if (j >= model().values.length) return;
                this.dragValue(j, point.X());
            });
            this.pointObjects.push(point);
        }

        this.caption("top-left", [
            {text: () => t("prob_summary_board_title", {value0: model().values.length}), scale: 1.2},
            {
                text: () => t("prob_summary_board_too_few", {value0: 3}), color: GraphPalette.warningText,
                visible: () => model().boxPlot && view().summary.status === "too-few",
            },
        ]);
    }

    protected override onSceneRemoved(): void {
        this.pointObjects = [];
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private ruleName(rule: QuartileRule): string {
        return rule === "inclusive" ? t("prob_summary_rule_name_inclusive") : t("prob_summary_rule_name_exclusive");
    }

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const example = summaryExampleOf(state);
        const exampleText = (id: typeof SUMMARY_EXAMPLE_IDS[number]) =>
            id === "school" ? t("prob_summary_example_school") : id === "outlier" ? t("prob_summary_example_outlier") : t("prob_summary_example_even");
        const options = [
            ...SUMMARY_EXAMPLE_IDS.map(id => ({value: id, text: exampleText(id)})),
            ...(example === undefined ? [{value: "custom", text: t("prob_summary_example_custom")}] : []),
        ];
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_summary_example_label")} value={example ?? "custom"} help={t("prob_summary_example_help")} options={options}
                              onChange={next => { if (isSummaryExampleId(next)) this.guarded(() => this.setExample(next)); }}/>
            </div>
            <div className="inspector-group">
                <ValueListInput title={t("prob_summary_values_title")} values={state.values} valueLabel={i => t("prob_summary_value_name", {value0: i + 1})}
                                min={SUMMARY_VALUE_MIN} max={SUMMARY_VALUE_MAX} decimals={1} onCommit={(index, value) => this.editValue(index, value)}
                                onRemove={index => this.guarded(() => this.removeValue(index))}
                                removeLabel={i => t("prob_summary_value_remove", {value0: i + 1})}
                                removeText={t("prob_summary_remove_text")} canRemove={state.values.length > SUMMARY_VALUES_MIN}/>
                <div className={CONTROL_ROW_FILL} role="group" aria-label={t("prob_summary_values_title")}>
                    <UnavailableButton data-action="add-value"
                                       reason={state.values.length >= SUMMARY_VALUES_MAX ? renderMessage(summaryEditMessage({kind: "full", max: SUMMARY_VALUES_MAX})) : undefined}
                                       onPress={() => this.guarded(() => this.addValue())}
                                       onBlockedPress={() => this.guarded(() => this.addValue())}>{t("prob_summary_add")}</UnavailableButton>
                </div>
                <p className="inspector-help">{t("prob_summary_values_help", {value0: SUMMARY_VALUE_MIN, value1: SUMMARY_VALUE_MAX})}</p>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_summary_rule_label")} value={state.rule} options={[
                    {value: "inclusive", text: t("prob_summary_rule_inclusive")}, {value: "exclusive", text: t("prob_summary_rule_exclusive")},
                ]} onChange={next => this.guarded(() => this.setRule(next))}/>
                <ChoiceSelect label={t("prob_summary_sigma_label")} value={state.sigma} options={[
                    {value: "population", text: t("prob_summary_sigma_population")}, {value: "sample", text: t("prob_summary_sigma_sample")},
                ]} onChange={next => this.guarded(() => this.setSigma(next))}/>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.boxPlot} label={t("prob_summary_box_label")} onChange={next => this.guarded(() => this.setBoxPlot(next))}/>
                <OnOffSwitch checked={state.sigmaBand} label={t("prob_summary_band_label")} onChange={next => this.guarded(() => this.setSigmaBand(next))}/>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const rule = this.ruleName(model.rule);
        const other = this.ruleName(model.rule === "inclusive" ? "exclusive" : "inclusive");
        const sigmaName = model.sigma === "population" ? t("prob_summary_sigma_name_population") : t("prob_summary_sigma_name_sample");
        const f = (value: number, decimals: number) => summaryNumber(value, language, decimals);
        const s = view.summary;
        const o = view.otherSummary;
        const dash = NOT_A_NUMBER_TEXT;
        const rows = [
            {id: "n", label: t("prob_summary_readout_n"), value: String(view.n)},
            {id: "mean", label: t("prob_summary_readout_mean"), value: f(view.mean, 6)},
            {id: "median", label: t("prob_summary_readout_median"), value: f(view.median, 2)},
            {id: "sigma", label: t("prob_summary_readout_sigma", {value0: sigmaName}), value: view.sigma === undefined ? dash : f(view.sigma, 4)},
            {id: "q1", label: t("prob_summary_readout_q1", {value0: rule}), value: s.status === "ok" ? f(s.q1, 2) : dash},
            {id: "q3", label: t("prob_summary_readout_q3", {value0: rule}), value: s.status === "ok" ? f(s.q3, 2) : dash},
            {id: "iqr", label: t("prob_summary_readout_iqr", {value0: rule}), value: s.status === "ok" ? f(s.iqr, 2) : dash},
            {
                id: "fences", label: t("prob_summary_readout_fences", {value0: rule}),
                value: s.status === "ok" ? t("prob_summary_readout_and", {value0: f(s.lowerFence, 3), value1: f(s.upperFence, 3)}) : dash,
            },
            {
                id: "outliers", label: t("prob_summary_readout_outliers", {value0: rule}),
                value: s.status !== "ok" ? dash : s.outliers.length === 0 ? t("prob_summary_readout_none") : s.outliers.map(v => f(v, 1)).join("; "),
            },
            {
                id: "convention", label: t("prob_summary_readout_convention", {value0: other}),
                value: o.status === "ok" ? [f(o.q1, 2), f(o.q3, 2), f(o.iqr, 2)].join("; ") : dash,
            },
        ];
        const statuses: { id: string; text: string }[] = [];
        if (model.boxPlot && s.status === "too-few") statuses.push({id: "too-few", text: t("prob_summary_board_too_few", {value0: 3})});
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("prob_summary_note")}/>
            <FunctionStatus dataAttribute="prob-summary-status" lines={statuses}/>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "values", color: GraphPalette.controlPoint, label: t("prob_summary_legend_values"), kind: "dot"},
            {id: "mean", color: MEAN_COLOR, label: t("prob_summary_legend_mean"), kind: "dot"},
            {id: "median", color: MEDIAN_COLOR, label: t("prob_summary_legend_median"), kind: "dot"},
            {id: "box", color: MEDIAN_COLOR, label: t("prob_summary_legend_box"), kind: "line"},
            {id: "outlier", color: GraphPalette.warningText, label: t("prob_summary_legend_outlier"), kind: "dot"},
            {id: "fence", color: GraphPalette.referenceCurve, label: t("prob_summary_legend_fence"), kind: "dashed-line"},
            {id: "band", color: MEAN_COLOR, label: t("prob_summary_legend_band"), kind: "area"},
        ]}/>;
    }
}

export default SummaryStatisticsGraph;
