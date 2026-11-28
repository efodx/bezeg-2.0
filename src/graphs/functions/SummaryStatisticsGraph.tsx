import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React from "react";
import BaseFunctionGraph, {BoundingBox, cleanNumber, DomainError, FillCurve, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import {FunctionStatus} from "./FunctionStatus";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {guard} from "../base/controls/guard";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {ValueListInput} from "../../inputs/ValueListInput";
import {currentLanguage, message, messageNumber, renderMessage, t} from "../../localization";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {NOT_A_NUMBER_TEXT} from "../../analysis/format";
import type {QuartileRule} from "../../analysis/descriptiveStatistics";
import {
    addSummaryValue, chooseSummaryExample, DEFAULT_SUMMARY_MODEL, fitSummaryView, isSummaryExampleId, moveSummaryValue,
    removeSummaryValue, setSummaryBoxPlot, setSummaryRule, setSummarySigma, setSummarySigmaBand, summaryExampleOf,
    SUMMARY_EXAMPLE_IDS, summaryStatisticsView, SUMMARY_VALUE_MAX, SUMMARY_VALUE_MIN, SUMMARY_VALUES_MAX, SUMMARY_VALUES_MIN,
    SummaryEdit, SummaryModel, SummaryView, SUMMARY_VIEW_MARGIN,
} from "../../analysis/summaryStatisticsModel";
import {summaryEditMessage, summaryNumber} from "./summaryStatisticsMessages";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";

/** Height step of the next equal value in a stack of tied dots, and the rows of the box plot and the markers (board units). */
export const SUMMARY_STACK_STEP = 0.35;
/**
 * The follow box is at least this many times the width of the must marks. Workaround for the view director's zoom-out cap
 * (`DEFAULT_MAX_OUT` = 2.2 in src/workspace/view/fitIntent.ts, also the keep fallback in viewDirector.ts): the strip between the
 * cards is about a third of a small board, so a data-tight box left the outlier under Odčitki. That cap is an open owner
 * question (lesson mode, 2026-11-28); when it is raised, remove this constant and use `fitSummaryView` directly.
 */
const SUMMARY_FOLLOW_SPREAD = 1.5;
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
 * The ids of the summary declaration: the quartile rule and the kind of deviation are choice pucks, the box plot and the band
 * are switch pucks; the legend names every kind of drawn object.
 */
export type SummaryIds = {
    param: "summary-rule" | "summary-sigma";
    row: "n" | "mean" | "median" | "sigma" | "q1" | "q3" | "iqr" | "fences" | "outliers" | "convention";
    note: "summary"; legend: "values" | "mean" | "median" | "box" | "outlier" | "fence" | "band"; section: never; action: "box-plot" | "sigma-band";
};

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
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

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
            this.boardView.setIntent(fitSummaryView(this.model.values), {keepAspectRatio: this.equalAxisUnits});
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
        if (this.generatedObjectCount > 0) this.boardView.setIntent(fitSummaryView(next.values), {keepAspectRatio: this.equalAxisUnits});
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
        this.drawn.set("band", band as unknown as JXG.GeometryElement);
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
        this.drawn.set("box", box as unknown as JXG.GeometryElement);
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
        this.drawn.set("fence", fences as unknown as JXG.GeometryElement);
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
            const outlier = this.own(board.create("point", [() => outlierAt(i) ?? 0, (BOX_BOTTOM + BOX_TOP) / 2], {
                ...this.styles.point.default, name: "", withLabel: false, face: "diamond", fixed: true, highlight: false,
                fillColor: GraphPalette.warningText, strokeColor: GraphPalette.pointOutline,
                size: () => Math.max(7, this.displaySettings.pointSize + 3),
                visible: () => boxShown() && outlierAt(i) !== undefined,
            }));
            if (i === 0) this.drawn.set("outlier", outlier as JXG.GeometryElement);
        }

        // The mean (triangle) and median (square) markers below the axis, large enough for projection and captioned on the
        // board, so they are told apart by shape and word, not by colour alone.
        // A JSXGraph square of size s is 2s wide, a triangle of size s is narrower: `scale` evens their visual weight.
        const marker = (id: string, face: string, color: string, x: () => number, y: number, caption: () => string, scale = 1) => {
            this.drawn.set(id, this.own(board.create("point", [x, y], {
                ...this.styles.point.default, name: "", withLabel: false, face, fixed: true, highlight: false, fillColor: color,
                strokeColor: GraphPalette.pointOutline, size: () => scale * Math.max(10, this.displaySettings.pointSize + 6),
            })));
            this.own(board.create("text", [() => x() + 14 / board.unitX, y, caption], {
                anchorY: "middle", fixed: true, highlight: false, color, fontSize: 15,
            }));
        };
        marker("mean", "triangleup", MEAN_COLOR, () => view().mean, MEAN_Y, () => t("prob_summary_mark_mean"));
        marker("median", "square", MEDIAN_COLOR, () => view().median, MEDIAN_Y, () => t("prob_summary_mark_median"), 0.7);

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
            if (j === 0) this.drawn.set("values", point);
        }
    }

    protected override onSceneRemoved(): void {
        this.pointObjects = [];
        this.drawn.clear();
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
            <PuckOwnedGroup params={["summary-rule", "summary-sigma"]} className="inspector-group">
                <PuckOwned param="summary-rule"><ChoiceSelect label={t("prob_summary_rule_label")} value={state.rule} options={[
                    {value: "inclusive", text: t("prob_summary_rule_inclusive")}, {value: "exclusive", text: t("prob_summary_rule_exclusive")},
                ]} onChange={next => this.guarded(() => this.setRule(next))}/></PuckOwned>
                <PuckOwned param="summary-sigma"><ChoiceSelect label={t("prob_summary_sigma_label")} value={state.sigma} options={[
                    {value: "population", text: t("prob_summary_sigma_population")}, {value: "sample", text: t("prob_summary_sigma_sample")},
                ]} onChange={next => this.guarded(() => this.setSigma(next))}/></PuckOwned>
            </PuckOwnedGroup>
            <PuckOwnedGroup params={["box-plot", "sigma-band"]} className="inspector-group">
                <PuckOwned param="box-plot"><OnOffSwitch checked={state.boxPlot} label={t("prob_summary_box_label")} onChange={next => this.guarded(() => this.setBoxPlot(next))}/></PuckOwned>
                <PuckOwned param="sigma-band"><OnOffSwitch checked={state.sigmaBand} label={t("prob_summary_band_label")} onChange={next => this.guarded(() => this.setSigmaBand(next))}/></PuckOwned>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_summary_example_label")} value={example ?? "custom"} help={t("prob_summary_example_help")} options={options}
                              onChange={next => { if (isSummaryExampleId(next)) this.guarded(() => this.setExample(next)); }}/>
            </div>
        </>;
    }


    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys; the two choices are written like the inspector's. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "summary-rule": {read: () => this.model.rule, apply: (value: unknown) => this.setRule(value)},
            "summary-sigma": {read: () => this.model.sigma, apply: (value: unknown) => this.setSigma(value)},
        };
    }

    /**
     * The fitted view, widened about the centre of the must marks. The director maps the follow box into the strip between the
     * cards by shrinking at most 2.2 times (`DEFAULT_MAX_OUT`) whatever the box's width, so a box that only just covers the data
     * leaves the far dots (the outlier at 30) under a card; the box must be wide enough that the data fit that strip.
     */
    private followBox(): BoundingBox {
        const [left, top, right, bottom] = fitSummaryView(this.model.values);
        const xs = this.summaryMust(this.model).map(mark => mark.x);
        const lo = Math.min(left, ...xs), hi = Math.max(right, ...xs);
        const half = Math.max(hi - lo, SUMMARY_FOLLOW_SPREAD * (Math.max(...xs) - Math.min(...xs) + 2 * SUMMARY_VIEW_MARGIN)) / 2;
        const centre = (lo + hi) / 2;
        return [centre - half, top, centre + half, bottom];
    }

    /** The common declaration plus the quartile rule and the kind of deviation as choice pucks, the box plot and the band as switch pucks, and the legend. */
    protected override declaration(): GraphDeclaration {
        const {boxPlot, sigmaBand} = this.model;
        return {
            ...this.commonDeclaration(),
            // The dots, the box and the band are what the learner watches: the frame follows the data (and its fences), not the lesson scene's stored box.
            followView: this.followBox(),
            parameters: [
                {
                    key: "summary-rule", kind: "choice", label: message("prob_summary_rule_name"), help: message("prob_summary_rule_label"), placement: "board", puck: true,
                    options: [
                        {value: "inclusive", label: message("prob_summary_rule_inclusive"), short: message("prob_summary_rule_short_inclusive")},
                        {value: "exclusive", label: message("prob_summary_rule_exclusive"), short: message("prob_summary_rule_short_exclusive")},
                    ],
                },
                {
                    key: "summary-sigma", kind: "choice", label: message("prob_summary_sigma_name"), help: message("prob_summary_sigma_label"), placement: "board", puck: true,
                    options: [
                        {value: "population", label: message("prob_summary_sigma_population"), short: message("prob_summary_sigma_short_population")},
                        {value: "sample", label: message("prob_summary_sigma_sample"), short: message("prob_summary_sigma_short_sample")},
                    ],
                },
            ],
            legend: [
                {id: "values", label: message("prob_summary_legend_values"), kind: "point", object: "values"},
                {id: "mean", label: message("prob_summary_legend_mean"), kind: "point", object: "mean"},
                {id: "median", label: message("prob_summary_legend_median"), kind: "point", object: "median"},
                {id: "box", label: message("prob_summary_legend_box"), kind: "line", object: "box"},
                {id: "outlier", label: message("prob_summary_legend_outlier"), kind: "point", object: "outlier"},
                {id: "fence", label: message("prob_summary_legend_fence"), kind: "dashed", object: "fence"},
                {id: "band", label: message("prob_summary_legend_band"), kind: "area", object: "band"},
            ],
            actions: [
                {id: "box-plot", label: message("prob_summary_box_name"), help: message("prob_summary_box_label"), placement: "board", enabled: true, pressed: boxPlot, puck: true},
                {id: "sigma-band", label: message("prob_summary_band_name"), help: message("prob_summary_band_label"), placement: "board", enabled: true, pressed: sigmaBand, puck: true},
            ],
        };
    }

    override performAction(id: string): void {
        if (id === "box-plot") runAs("learner", () => this.setBoxPlot(!this.model.boxPlot));
        else if (id === "sigma-band") runAs("learner", () => this.setSigmaBand(!this.model.sigmaBand));
        else throw new Error("Unknown action");
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id === "box" || id === "fence" ? "strokecolor" : "fillcolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /**
     * What the learner watches and no card may cover: the dots (the ends of the data and the top of the tallest stack), the box
     * plot with its whiskers and fences while shown, the mean and median markers and the band while shown.
     */
    private summaryMust(model: SummaryModel): {x: number; y: number}[] {
        const view = this.viewOf(model);
        const s = view.summary;
        const low = Math.min(...model.values);
        const high = Math.max(...model.values);
        const stackTop = Math.max(...model.values.map((_, index) => this.stackY(index)));
        const must = [{x: low, y: 0}, {x: high, y: stackTop}, {x: view.mean, y: MEAN_Y}, {x: view.median, y: MEDIAN_Y}];
        if (model.boxPlot && s.status === "ok") {
            must.push({x: s.whiskerLow, y: BOX_BOTTOM}, {x: s.whiskerHigh, y: BOX_TOP}, {x: s.lowerFence, y: BOX_BOTTOM - 0.2}, {x: s.upperFence, y: BOX_TOP + 0.2});
        }
        if (model.sigmaBand && view.sigma !== undefined) must.push({x: view.mean - view.sigma, y: BAND_BOTTOM}, {x: view.mean + view.sigma, y: BAND_TOP});
        return must;
    }

    /** Declared by the base: the readout rows (the number of values the board caption gave, then the summary), the note and the status. */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const rule = message(model.rule === "inclusive" ? "prob_summary_rule_name_inclusive" : "prob_summary_rule_name_exclusive");
        const other = message(model.rule === "inclusive" ? "prob_summary_rule_name_exclusive" : "prob_summary_rule_name_inclusive");
        const sigmaName = message(model.sigma === "population" ? "prob_summary_sigma_name_population" : "prob_summary_sigma_name_sample");
        const formatted = (text: string) => ({kind: "formatted" as const, text});
        const dash = formatted(NOT_A_NUMBER_TEXT);
        const s = view.summary;
        const o = view.otherSummary;
        const okNumber = (value: number | undefined, decimals: number) => value === undefined ? dash : messageNumber(value, decimals);
        return {
            rows: [
                {id: "n", name: message("prob_summary_readout_n"), value: messageNumber(view.n)},
                {id: "mean", name: message("prob_summary_readout_mean"), value: messageNumber(view.mean, 6)},
                {id: "median", name: message("prob_summary_readout_median"), value: messageNumber(view.median, 2)},
                {id: "sigma", name: message("prob_summary_readout_sigma", {value0: sigmaName}), value: okNumber(view.sigma, 4)},
                {id: "q1", name: message("prob_summary_readout_q1", {value0: rule}), value: okNumber(s.status === "ok" ? s.q1 : undefined, 2)},
                {id: "q3", name: message("prob_summary_readout_q3", {value0: rule}), value: okNumber(s.status === "ok" ? s.q3 : undefined, 2)},
                {id: "iqr", name: message("prob_summary_readout_iqr", {value0: rule}), value: okNumber(s.status === "ok" ? s.iqr : undefined, 2)},
                {
                    id: "fences", name: message("prob_summary_readout_fences", {value0: rule}),
                    value: s.status === "ok" ? message("prob_summary_readout_and", {value0: messageNumber(s.lowerFence, 3), value1: messageNumber(s.upperFence, 3)}) : dash,
                },
                {
                    id: "outliers", name: message("prob_summary_readout_outliers", {value0: rule}),
                    value: s.status !== "ok" ? dash : s.outliers.length === 0 ? message("prob_summary_readout_none") : formatted(s.outliers.map(v => summaryNumber(v, language, 1)).join("; ")),
                },
                {
                    id: "convention", name: message("prob_summary_readout_convention", {value0: other}),
                    value: o.status === "ok" ? formatted([o.q1, o.q3, o.iqr].map(v => summaryNumber(v, language, 2)).join("; ")) : dash,
                },
            ],
            notes: [{id: "summary", text: message("prob_summary_note")}],
            ...(model.boxPlot && s.status === "too-few" ? {status: [{id: "too-few", text: message("prob_summary_board_too_few", {value0: 3}), tone: "warning" as const}]} : {}),
            must: this.summaryMust(model),
        };
    }

    protected renderReadout(): React.ReactNode {
        const status = this.functionPanel().status ?? [];
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus dataAttribute="prob-summary-status" lines={status.map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }
}

export default SummaryStatisticsGraph;
