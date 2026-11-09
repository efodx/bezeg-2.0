import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, t} from "../../localization";
import {
    BINOMIAL_NORMAL_N_MAX, BinomialNormalEdit, BinomialNormalModel, BinomialNormalView, DEFAULT_BINOMIAL_NORMAL_MODEL,
    binomialBars, binomialNormalDensity, chooseBinomialCorrection, binomialNormalExampleOf, binomialNormalView, binomialShadedBars, chooseBinomialNormalExample,
    fitBinomialNormalView, isBinomialNormalExampleId, poissonBars, setBinomialFlag, setBinomialK, setBinomialN, setBinomialP,
} from "../../analysis/binomialNormalModel";
import {
    binomialNormalEditMessage, binomialNumber, binomialP, binomialProbability,
} from "./binomialNormalMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** Points of the polyline under the normal density that is shaded up to k (+ 1/2). */
const NORMAL_AREA_POINTS = 160;
/** The normal area starts this many standard deviations left of the mean (the mass further left is below 1e-15). */
const NORMAL_AREA_SIGMAS = 8;
/** The Poisson mass above n is mentioned when it exceeds this. */
const POISSON_TAIL_NOTE_MIN = 1e-4;

/**
 * From binomial to normal (lesson P2): the bars of B(n, p), the shaded bars of P(X <= k), the normal curve with the same mean
 * and variance and its area up to k + 1/2 (continuity correction on) or up to k (off), and optionally the Poisson(np) bars. The
 * model is `{n, p, k, correction, poisson}` (`src/analysis/binomialNormalModel`).
 *
 * Board objects (the count does not depend on n): the shaded bars, the normal area, the binomial bars outline (one curve), the
 * normal density, the Poisson bars (one curve whose data is empty while the overlay is off, so nothing is created or removed),
 * the draggable point k and the caption. The point k sits on the x-axis at x = k, the centre of the bar of k (that bar spans
 * [k - 1/2, k + 1/2]); a drag rounds to the integers 0..n.
 */
export class BinomialNormalGraph extends BaseFunctionGraph<BinomialNormalModel> {
    protected pointK?: JXG.Point;
    private readonly barsOf = this.modelCache((model: BinomialNormalModel) => binomialBars(model));
    private readonly shadedOf = this.modelCache((model: BinomialNormalModel) => binomialShadedBars(model));
    private readonly poissonOf = this.modelCache((model: BinomialNormalModel) => poissonBars(model));
    private readonly normalAreaOf = this.modelCache((model: BinomialNormalModel) => normalAreaPolyline(model));

    override presetCollection() {
        return functionPresetCollections["prob-binomial-normal"];
    }

    protected defaultModel(): BinomialNormalModel {
        return {...DEFAULT_BINOMIAL_NORMAL_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return fitBinomialNormalView(DEFAULT_BINOMIAL_NORMAL_MODEL);
    }

    /** Probabilities are about 0.1 to 0.4 while x runs to n. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    /** The view follows n and p (an example, an import without a view), not k or the flags. */
    protected override exampleView() {
        return {key: `${this.model.n}|${this.model.p}`, box: fitBinomialNormalView(this.model)};
    }

    private viewOf(model: BinomialNormalModel): BinomialNormalView {
        return this.memoView(model, () => binomialNormalView(model));
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    private accepted(edit: BinomialNormalEdit): BinomialNormalModel {
        if (!edit.ok) throw new DomainError(binomialNormalEditMessage(edit.issue));
        return edit.model;
    }

    private commitEdit(edit: BinomialNormalEdit, options: { syncScene?: boolean } = {}): void {
        const next = this.accepted(edit);
        if (next !== this.model) this.commitModel(next, options);
    }

    protected setN(value: unknown): void {
        this.commitEdit(setBinomialN(this.model, value));
    }

    protected setP(value: unknown): void {
        this.commitEdit(setBinomialP(this.model, value));
    }

    protected setK(value: unknown, options: { syncScene?: boolean } = {}): void {
        this.commitEdit(setBinomialK(this.model, value), options);
    }

    protected setFlag(field: "correction" | "poisson", value: unknown): void {
        this.commitEdit(setBinomialFlag(this.model, field, value));
    }

    /** The host Fit frames the bars, as choosing an example does (the former "fit the view to the bars" button). */
    protected override fitView(): BoundingBox {
        return [...fitBinomialNormalView(this.model)];
    }

    /** Shows the bars fully: the view of `fitBinomialNormalView` for the current n, p and Poisson overlay. */
    protected fitToBars(): void {
        if (this.generatedObjectCount > 0) this.board.setBoundingBox(fitBinomialNormalView(this.model), this.equalAxisUnits);
    }

    protected setExample(id: unknown): void {
        this.commitModel(this.accepted(chooseBinomialNormalExample(this.model, id)));
        this.fitToBars();
    }

    /**
     * Lesson steps. A step that sets n or p, or shows or hides the Poisson bars, also shows the bars fully, like choosing an
     * example: the inspector keeps the reader's view on such edits, but a lesson that moves from n = 20 to n = 100 would
     * otherwise leave most bars outside the view. k and the correction keep the view.
     */
    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "binomial-n": value => {
                    this.setN(value);
                    this.fitToBars();
                },
                "binomial-p": value => {
                    this.setP(value);
                    this.fitToBars();
                },
                "binomial-k": value => this.setK(value),
            },
            visibility: {
                "poisson-bars": visible => {
                    this.setFlag("poisson", visible);
                    this.fitToBars();
                },
            },
            choices: {
                "binomial-normal-example": value => this.setExample(value),
                "binomial-correction": value => this.commitEdit(chooseBinomialCorrection(this.model, value)),
            },
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const barColor = GraphPalette.additionalCurves[0];
        const poissonColor = GraphPalette.additionalCurves[1];

        // Layers, lowest first: shaded bars, normal area, bar outlines, normal density, Poisson bars, then the point k.
        this.signedFill(barColor, () => this.shadedOf(this.model));
        this.signedFill(GraphPalette.comparisonCurve, () => this.normalAreaOf(this.model));

        const polyline = (color: string, data: () => { x: number[]; y: number[] }, width: () => number) => {
            const curve = this.own(board.create("curve", [[], []], {
                strokeColor: color, fillOpacity: 0, highlight: false, fixed: true, strokeWidth: width,
            })) as unknown as { updateDataArray: () => void; dataX: number[]; dataY: number[] };
            curve.updateDataArray = () => {
                const {x, y} = data();
                curve.dataX = x;
                curve.dataY = y;
            };
        };
        polyline(barColor, () => this.barsOf(this.model), strokeWidth);
        this.own(board.create("functiongraph", [(x: number) => binomialNormalDensity(model())(x)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        }));
        polyline(poissonColor, () => model().poisson ? this.poissonOf(this.model) : {x: [], y: []}, strokeWidth);

        // The threshold slides along the x-axis in whole steps, at the centre of the bar of k.
        this.pointK = this.slidingPoint({
            x: model().k, position: () => 0, min: 0, max: () => model().n, step: 1,
            attributes: {...this.styles.point.default, name: "$$k$$", label: this.pointLabel("below-right", 1.6)},
            write: x => this.setK(x, {syncScene: false}),
        });

        this.caption("top-left", [
            {text: () => t("prob_binomial_board_title", {value0: binomialNumber(model().n, language()), value1: binomialP(model().p, language())}), scale: 1.2},
            {text: () => t("prob_binomial_board_moments", {
                value0: binomialNumber(this.viewOf(model()).mean, language()), value1: binomialNumber(this.viewOf(model()).sigma, language()),
            })},
            {text: () => t("prob_binomial_board_probability", {value0: binomialNumber(model().k, language()), value1: binomialProbability(this.viewOf(model()).exact, language())})},
        ]);
    }

    protected override syncSceneToModel(): void {
        this.pointK?.moveTo([this.model.k, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointK = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const example = binomialNormalExampleOf(state);
        const options = [
            {value: "fair20", text: t("prob_binomial_example_fair20")},
            {value: "fair100", text: t("prob_binomial_example_fair100")},
            {value: "rare", text: t("prob_binomial_example_rare")},
            ...(example === undefined ? [{value: "custom", text: t("prob_binomial_example_custom")}] : []),
        ];
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_binomial_example_label")} value={example ?? "custom"} help={t("prob_binomial_example_help")} options={options}
                              onChange={next => { if (isBinomialNormalExampleId(next)) this.setExample(next); }}/>
            </div>
            <div className="inspector-group">
                <Slider customText={t("prob_binomial_n_label")} min={1} max={BINOMIAL_NORMAL_N_MAX} step={1} value={state.n}
                        rejectedHint={t("prob_binomial_n_rejected", {value0: BINOMIAL_NORMAL_N_MAX})}
                        onChange={next => this.ignoreOutOfDomain(() => this.setN(next))}/>
                <Slider customText={t("prob_binomial_p_label")} min={0.01} max={0.99} step={0.01} value={state.p}
                        rejectedHint={t("prob_binomial_p_slider_rejected")} onChange={next => this.ignoreOutOfDomain(() => this.setP(next))}/>
                <NumberInput label={t("prob_binomial_p_exact_label")} value={state.p} min={0} max={1} step={0.01} decimals={4}
                             rejectedHint={t("prob_binomial_p_help")} onChange={next => this.ignoreOutOfDomain(() => this.setP(next))}/>
                <NumberInput label={t("prob_binomial_k_label")} value={state.k} min={0} max={state.n} step={1} integer
                             rejectedHint={t("prob_binomial_k_rejected", {value0: state.n})}
                             onChange={next => this.ignoreOutOfDomain(() => this.setK(next))}/>
                <p className="inspector-help">{t("prob_binomial_k_help")}</p>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.correction} label={t("prob_binomial_correction_label")}
                             onChange={next => this.ignoreOutOfDomain(() => this.setFlag("correction", next))}/>
                <OnOffSwitch checked={state.poisson} label={t("prob_binomial_poisson_label")}
                             onChange={next => this.ignoreOutOfDomain(() => this.setFlag("poisson", next))}/>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const probability = (value: number) => binomialProbability(value, language);
        const rows = [
            {id: "exact", label: t("prob_binomial_readout_exact"), value: probability(view.exact)},
            {id: "corrected", label: t("prob_binomial_readout_corrected"), value: probability(view.corrected)},
            {id: "uncorrected", label: t("prob_binomial_readout_uncorrected"), value: probability(view.uncorrected)},
            {id: "poisson", label: t("prob_binomial_readout_poisson"), value: probability(view.poisson)},
            {id: "error-corrected", label: t("prob_binomial_readout_error_corrected"), value: probability(view.correctedError)},
            {id: "error-uncorrected", label: t("prob_binomial_readout_error_uncorrected"), value: probability(view.uncorrectedError)},
            {id: "error-poisson", label: t("prob_binomial_readout_error_poisson"), value: probability(view.poissonError)},
        ];
        const tail = model.poisson ? this.poissonOf(model).tail : 0;
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("prob_binomial_note")}/>
            <FunctionStatus dataAttribute="prob-binomial"
                            lines={tail > POISSON_TAIL_NOTE_MIN ? [{id: "poisson-tail", text: t("prob_binomial_poisson_tail", {value0: probability(tail)})}] : []}/>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "bars", color: GraphPalette.additionalCurves[0], label: t("prob_binomial_legend_bars"), kind: "line"},
            {id: "shaded", color: GraphPalette.additionalCurves[0], label: t("prob_binomial_legend_shaded"), kind: "area"},
            {id: "normal", color: GraphPalette.primaryCurve, label: t("prob_binomial_legend_normal"), kind: "line"},
            {id: "normal-area", color: GraphPalette.comparisonCurve, label: t("prob_binomial_legend_normal_area"), kind: "area"},
            {id: "poisson", color: GraphPalette.additionalCurves[1], label: t("prob_binomial_legend_poisson"), kind: "line"},
        ]}/>;
    }
}

/**
 * The region under the normal density from mean - 8 sigma to k + 1/2 (correction on) or k (off), closed along the x-axis; empty
 * when that end lies left of the start. A fixed number of points, so the object stays one curve.
 */
export function normalAreaPolyline(model: BinomialNormalModel): { x: number[]; y: number[] } {
    const density = binomialNormalDensity(model);
    const mu = model.n * model.p;
    const sigma = Math.sqrt(model.n * model.p * (1 - model.p));
    const from = mu - NORMAL_AREA_SIGMAS * sigma;
    const to = model.k + (model.correction ? 0.5 : 0);
    if (!(to > from)) return {x: [], y: []};
    const x = [from];
    const y = [0];
    for (let i = 0; i <= NORMAL_AREA_POINTS; i++) {
        const xi = from + (to - from) * i / NORMAL_AREA_POINTS;
        x.push(xi);
        y.push(density(xi));
    }
    x.push(to);
    y.push(0);
    return {x, y};
}

export default BinomialNormalGraph;
