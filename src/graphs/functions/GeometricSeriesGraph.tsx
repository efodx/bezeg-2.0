import React from "react";
import type JXG from "jsxgraph";
import {BoundingBox, DomainError, FillCurve, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import IterativeFunctionGraph, {IterationActionId} from "./IterativeFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {currentWrite} from "../base/writes/writeSource";
import {FunctionStatus} from "./FunctionStatus";
import {CountSetter} from "../../inputs/CountSetter";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, messageNumber, renderMessage, t} from "../../localization";
import {formatNumber, NOT_A_NUMBER_TEXT} from "../../analysis/format";
import {firstTermWithinTolerance, geometricPartialSum, geometricSeriesLimit, geometricTerm} from "../../analysis/geometricSeries";
import {
    canAdvanceSeries, chooseSeriesExample, defaultGeometricSeriesModel, GeometricSeriesModel, nextSeriesStep, resetSeriesTerms, SERIES_A_MAX, SERIES_A_MIN,
    SERIES_EXAMPLE_IDS, SERIES_EXAMPLE_MODELS, SERIES_Q_MAX, SERIES_Q_MIN, SERIES_TERMS_MAX, SERIES_TERMS_MIN, SERIES_TOLERANCE_MAX,
    SERIES_TOLERANCE_MIN, seriesExampleOf, SeriesEdit, seriesView, SeriesView, setSeriesA, setSeriesQ, setSeriesTerms, setSeriesTolerance,
} from "../../analysis/geometricSeriesModel";
import {geometricSeriesEditMessage} from "./geometricSeriesMessages";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";

/** Time between two playback steps: one term per interval, never more than one per frame (see ADR 0012). */
export const SERIES_STEP_INTERVAL_MS = 500;

/** Bar geometry in index units: the term bar sits left of its index, the partial-sum bar right of it, each thinner than half a unit. */
const TERM_OFFSET = -0.22;
const SUM_OFFSET = 0.18;
const TERM_WIDTH_UNITS = 0.25;
const SUM_WIDTH_UNITS = 0.35;
/** A bar is never wider than this on a view that shows only a few indices (pixels). */
const TERM_MAX_PX = 14;
const SUM_MAX_PX = 20;
const EDGE_DASH = 2;
/** The followed view counts the shown terms in steps of this many, so playback does not move the view at every term. */
const FOLLOW_TERM_STEP = 5;

/**
 * The view that follows the display: the indices up to the next multiple of {@link FOLLOW_TERM_STEP} above the shown terms, the bars
 * (terms and partial sums), the zero line, the limit and the band, with a left margin for the y tick labels. The director fits it into
 * the card-free area; for |q| > 1 the values grow without bound, so the view follows the same steps.
 */
const followBox = (model: GeometricSeriesModel): BoundingBox => {
    const count = Math.min(SERIES_TERMS_MAX, Math.max(FOLLOW_TERM_STEP, Math.ceil(model.terms / FOLLOW_TERM_STEP) * FOLLOW_TERM_STEP));
    const limit = geometricSeriesLimit(model.a, model.q);
    let low = 0, high = 0;
    const include = (value: number) => { if (Number.isFinite(value)) { low = Math.min(low, value); high = Math.max(high, value); } };
    if (limit !== null) {
        include(limit);
        if (model.tolerance > 0) { include(limit - model.tolerance); include(limit + model.tolerance); }
    }
    for (let k = 1; k <= count; k++) {
        include(geometricTerm(model.a, model.q, k));
        include(geometricPartialSum(model.a, model.q, k));
    }
    const span = high - low || 1;
    const reach = count + 1.5;
    return [-0.12 * reach, high + 0.15 * span, reach, low - 0.15 * span];
};

/** The example selector texts are the series' own numbers, so they are the same in both languages. */
const exampleText = (id: keyof typeof SERIES_EXAMPLE_MODELS): string => {
    const {a, q} = SERIES_EXAMPLE_MODELS[id];
    return `a = ${formatNumber(a, currentLanguage())}, q = ${formatNumber(q, currentLanguage())}`;
};

type StatusId = "convergent" | "oscillating" | "constant" | "divergent" | "tolerance" | "complete";

/**
 * The ids of the series declaration: the ratio q and the tolerance are board pucks (the steps that compare signs and size of q and
 * look for the first term inside the band); a, n, the example and the playback buttons stay in Orodja. The rows are the readouts,
 * the legend names every drawn object.
 */
export type SeriesIds = {
    param: "series-q" | "series-tolerance";
    row: "terms" | "last-term" | "sum" | "limit" | "error" | "first-within" | "behaviour"; note: "caveat";
    legend: "term" | "sum" | "limit" | "band"; section: never;
    action: IterationActionId;
};

/**
 * Geometric series and partial sums (lesson S5). The model is `{a, q, terms, tolerance}` (`src/analysis/geometricSeriesModel`):
 * `terms` is the number of revealed terms, the limit marker comes from the closed form and exists only for |q| < 1, and the bars, the
 * readout, the error and the tolerance status all come from `src/analysis/geometricSeries` (S_n by a formula that does not cancel
 * near |q| = 1, n a for q = 1; the error is the directly evaluated tail), never summed from the shown bars.
 *
 * Next step and playback run the same transition (one more term) through `commitModel`; playback itself (the
 * `IterationController`) is not model data, so a reopened preset is paused. Editing a, q, n, the example or the tolerance stops
 * playback, as does anything that replaces the scene, exports a figure or unmounts the graph.
 *
 * Rules (reject, never clamp): a in [0.1, 5], q in [-2, 2], tolerance in [0, 1] (0 = no band), n an integer 1..50. A setter that
 * would break a rule throws a `DomainError` and leaves the model unchanged.
 */
export class GeometricSeriesGraph extends IterativeFunctionGraph<GeometricSeriesModel> {
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`); cleared when the scene is rebuilt. */
    private readonly drawn = new Map<string, JXG.GeometryElement[]>();

    override presetCollection() {
        return functionPresetCollections["geometric-series"];
    }

    protected defaultModel(): GeometricSeriesModel {
        return defaultGeometricSeriesModel();
    }

    protected defaultBoundingBox(): BoundingBox {
        return followBox(this.model);
    }

    /** The index k and the value have different scales, so the stored view is applied exactly. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    protected override exampleView() {
        return {key: `${this.model.a}|${this.model.q}|${this.model.tolerance}`, box: followBox(this.model)};
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "series";
    }

    protected stepIntervalMs(): number {
        return SERIES_STEP_INTERVAL_MS;
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

    // ---- Model operations (read and write the synchronous model) ------------------------------

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
        // A lesson morph of q or the tolerance writes them as `animation` under a lease that holds only that parameter, not the view; the declared `followView` carries the view then.
        if (refit && this.generatedObjectCount > 0 && currentWrite()?.source !== "animation") this.boardView.setIntent(followBox(edit.model), {keepAspectRatio: this.equalAxisUnits});
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number): string {
        return formatNumber(value, currentLanguage(), 4);
    }

    /** The statuses in words; a series without a limit is a warning, the tone the removed "no limit" board caption gave it. */
    private statuses(model: GeometricSeriesModel, view: SeriesView): { id: StatusId; text: Message; tone?: "warning" }[] {
        const result: { id: StatusId; text: Message; tone?: "warning" }[] = [];
        if (view.limit !== null) result.push({id: "convergent", text: message("series_status_convergent", {value0: messageNumber(view.limit, 4)})});
        else if (view.behaviour === "oscillating") result.push({id: "oscillating", text: message("series_status_oscillating", {value0: messageNumber(model.a, 4)}), tone: "warning"});
        else if (model.q === 1) result.push({id: "constant", text: message("series_status_constant"), tone: "warning"});
        else result.push({id: "divergent", text: message("series_status_divergent"), tone: "warning"});
        if (view.limit !== null && model.tolerance > 0) {
            // "From n on" holds because the error |a q^n/(1-q)| decreases monotonically for |q| < 1 (see firstTermWithinTolerance).
            const first = firstTermWithinTolerance(model.a, model.q, model.tolerance);
            const tolerance = messageNumber(model.tolerance, 4);
            result.push({
                id: "tolerance",
                text: first === null
                    ? message("series_status_tolerance_none", {value0: tolerance, value1: messageNumber(SERIES_TERMS_MAX, 0)})
                    : message("series_status_tolerance", {value0: tolerance, value1: messageNumber(first, 0)}),
            });
        }
        if (model.terms >= SERIES_TERMS_MAX) result.push({id: "complete", text: message("series_status_complete", {value0: messageNumber(SERIES_TERMS_MAX, 0)})});
        return result;
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        this.drawn.clear();
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
        this.drawn.set("band", [band as unknown as JXG.GeometryElement]);
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
        const bar = (x: number, value: (k: number) => number, k: number, color: string, widthUnits: number, maxPx: number, opacity: number) =>
            this.own(board.create("segment", [[x, 0], [x, () => value(k)]], {
                strokeColor: color, strokeOpacity: opacity, strokeWidth: () => Math.min(maxPx, Math.max(1.5, widthUnits * pixelsPerUnit())), highlight: false, fixed: true,
                withLabel: false, firstArrow: false, lastArrow: false, visible: () => k <= model().terms,
            }));
        const terms: JXG.GeometryElement[] = [], sums: JXG.GeometryElement[] = [];
        for (let k = 1; k <= SERIES_TERMS_MAX; k++) {
            terms.push(bar(k + TERM_OFFSET, index => geometricTerm(model().a, model().q, index), k, GraphPalette.additionalCurves[0], TERM_WIDTH_UNITS, TERM_MAX_PX, 0.85) as unknown as JXG.GeometryElement);
            sums.push(bar(k + SUM_OFFSET, index => geometricPartialSum(model().a, model().q, index), k, GraphPalette.primaryCurve, SUM_WIDTH_UNITS, SUM_MAX_PX, 1) as unknown as JXG.GeometryElement);
        }
        this.drawn.set("term", terms);
        this.drawn.set("sum", sums);

        // The limit marker exists only for |q| < 1.
        this.drawn.set("limit", [this.own(board.create("segment", [[left, limit], [right, limit]], {
            strokeColor: GraphPalette.comparisonCurve, strokeWidth, highlight: false, fixed: true, withLabel: false, visible: hasLimit,
        })) as unknown as JXG.GeometryElement]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const language = currentLanguage();
        const playing = this.playback.isPlaying;
        const canAdvance = canAdvanceSeries(state);
        const example = seriesExampleOf(state);
        const options = SERIES_EXAMPLE_IDS.map(id => ({value: id as string, text: exampleText(id)}));
        const rangeHint = (min: number, max: number) => ({value0: formatNumber(min, language), value1: formatNumber(max, language)});
        return <>
            <PuckOwnedGroup params={["series-q", "series-tolerance"]} className="inspector-group">
                <PuckOwned param="series-q"><Slider customText={t("series_q_label")} min={SERIES_Q_MIN} max={SERIES_Q_MAX} step={0.05} value={state.q}
                        rejectedHint={t("series_q_rejected_hint", rangeHint(SERIES_Q_MIN, SERIES_Q_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setQ(next))}/></PuckOwned>
                <PuckOwned param="series-tolerance"><Slider customText={t("series_tolerance_label")} min={SERIES_TOLERANCE_MIN} max={SERIES_TOLERANCE_MAX} step={0.01} decimals={3} value={state.tolerance}
                        rejectedHint={t("series_tolerance_rejected_hint", rangeHint(SERIES_TOLERANCE_MIN, SERIES_TOLERANCE_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setTolerance(next))}/></PuckOwned>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <CountSetter label={t("series_terms_label")} n={state.terms} min={SERIES_TERMS_MIN} max={SERIES_TERMS_MAX}
                             rejectedHint={t("series_terms_rejected_hint", {value0: SERIES_TERMS_MIN, value1: SERIES_TERMS_MAX})}
                             onPlus={() => this.ignoreOutOfDomain(() => this.setTerms(state.terms + 1))}
                             onMinus={() => this.ignoreOutOfDomain(() => this.setTerms(state.terms - 1))}
                             onSet={next => this.ignoreOutOfDomain(() => this.setTerms(next))}/>
            </div>
            <div className="inspector-group">
                <PlaybackButtons placement="graph" groupLabel={t("series_iteration_controls")} nextLabel={t("next_step")} resetLabel={t("reset")} playing={playing}
                                 onNext={() => this.ignoreOutOfDomain(() => this.nextStep())}
                                 onPlayPause={() => { if (playing) this.pauseIteration(); else this.play(); }} onReset={() => this.resetIteration()}
                                 {...playbackBlocks({atStart: state.terms <= SERIES_TERMS_MIN, atEnd: !canAdvance, playing})}/>
                <p className="inspector-help">{t("series_playback_note", {value0: SERIES_TERMS_MAX})}</p>
            </div>
            <div className="inspector-group">
                <Slider customText={t("series_a_label")} min={SERIES_A_MIN} max={SERIES_A_MAX} step={0.1} value={state.a}
                        rejectedHint={t("series_a_rejected_hint", rangeHint(SERIES_A_MIN, SERIES_A_MAX))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setA(next))}/>
                <p className="inspector-help">{t("series_fields_help")}</p>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("series_example_label")} value={example ?? "custom"} help={t("series_example_help")}
                              options={example === undefined ? [...options, {value: "custom", text: t("series_example_custom")}] : options}
                              onChange={next => { if (next !== "custom") this.ignoreOutOfDomain(() => this.setExample(next)); }}/>
            </div>
        </>;
    }

    /** The declared legend replaces the panel's own, so Orodja shows no second one. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "series-q": {read: () => this.model.q, apply: (value: number) => this.setQ(value)},
            "series-tolerance": {read: () => this.model.tolerance, apply: (value: number) => this.setTolerance(value)},
        };
    }

    /**
     * The common declaration (rows, note, status, view marks) plus the ratio and the tolerance as board pucks, the playback actions, the
     * legend of every object the board draws and the closed form as the formula row. The first term a, the number of terms, the
     * example and the playback buttons stay in Orodja.
     */
    protected override declaration(): GraphDeclaration {
        return {
            ...this.commonDeclaration(),
            followView: followBox(this.model),
            formula: {label: message("series_formula_label"), tex: "S_n=a\\,\\dfrac{1-q^n}{1-q}"},
            parameters: [
                {key: "series-q", kind: "range", label: message("series_q_name"), symbol: "q", help: message("series_q_help"), placement: "board",
                    min: SERIES_Q_MIN, max: SERIES_Q_MAX, step: 0.05, maxDecimals: 2},
                {key: "series-tolerance", kind: "range", label: message("series_tolerance_name"), help: message("series_tolerance_help"), placement: "board",
                    min: SERIES_TOLERANCE_MIN, max: SERIES_TOLERANCE_MAX, step: 0.01, maxDecimals: 2},
            ],
            legend: [
                {id: "term", label: message("series_legend_term"), kind: "line", object: "term"},
                {id: "sum", label: message("series_legend_sum"), kind: "line", object: "sum"},
                {id: "limit", label: message("series_legend_limit"), kind: "line", object: "limit"},
                {id: "band", label: message("series_legend_band"), kind: "area", object: "band"},
            ],
            actions: this.iterationActions(),
        };
    }

    override performAction(id: string): void {
        if (!this.performIterationAction(id)) throw new Error("Unknown action");
    }

    /** A group of bars is drawn as one legend entry: its colour is the first bar's, it is visible while any of its bars is. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const elements = this.drawn.get(id);
        if (!elements || elements.length === 0) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const evaluate = (element: JXG.GeometryElement, name: string) => (element as JXG.GeometryElement & {evalVisProp(name: string): unknown}).evalVisProp(name);
        return {color: String(evaluate(elements[0], id === "band" ? "fillcolor" : "strokecolor")), visible: elements.some(element => Boolean(evaluate(element, "visible")))};
    }

    /**
     * The rows, the note and the statuses of the inspector as declared data (`renderReadout` draws them from it). The marks keep the
     * shown bars (the tops of every term and partial sum), the zero line and the limit in sight; the band spans the whole view.
     */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const first = view.limit !== null && model.tolerance > 0 ? firstTermWithinTolerance(model.a, model.q, model.tolerance) : null;
        const behaviour = view.behaviour === "convergent" ? message("series_behaviour_convergent")
            : view.behaviour === "oscillating" ? message("series_behaviour_oscillating") : message("series_behaviour_divergent");
        return {
            rows: [
                {id: "terms", name: message("series_readout_terms", {value0: messageNumber(SERIES_TERMS_MAX, 0)}), value: messageNumber(model.terms, 0)},
                {id: "last-term", name: message("series_readout_last_term"), value: messageNumber(view.lastTerm, 4)},
                {id: "sum", name: message("series_readout_sum"), value: messageNumber(view.partialSum, 4)},
                {id: "limit", name: message("series_readout_limit"), value: view.limit === null ? message("series_no_limit") : messageNumber(view.limit, 4)},
                {id: "error", name: message("series_readout_error"), value: view.error === null ? {kind: "formatted", text: NOT_A_NUMBER_TEXT} : messageNumber(view.error, 4)},
                {id: "first-within", name: message("series_readout_first_within"), value: first === null ? {kind: "formatted", text: NOT_A_NUMBER_TEXT} : messageNumber(first, 0)},
                {id: "behaviour", name: message("series_readout_behaviour"), value: behaviour},
            ],
            notes: [{id: "caveat", text: message("series_note", {value0: messageNumber(SERIES_TERMS_MAX, 0)})}],
            status: this.statuses(model, view),
            must: [
                {x: 1, y: 0},
                ...(view.limit === null ? [] : [{x: 1, y: view.limit}]),
                ...Array.from({length: model.terms}, (_, index) => [
                    {x: index + 1, y: geometricTerm(model.a, model.q, index + 1)},
                    {x: index + 1, y: geometricPartialSum(model.a, model.q, index + 1)},
                ]).flat(),
            ],
        };
    }

    protected renderReadout(): React.ReactNode {
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="demo-status" dataAttribute="series-status" lines={(this.functionPanel().status ?? []).map(line => ({id: line.id, text: renderMessage(line.text)}))} muted={this.playback.isPlaying}/>
        </>;
    }
}

export default GeometricSeriesGraph;
