import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {normalPdf} from "../../analysis/distributions";
import {
    DEFAULT_DENSITY_AREA_MODEL, DENSITY_BOUND_LIMIT, DENSITY_DRAG_STEP, DENSITY_MU_LIMIT, DENSITY_SIGMA_MAX, DENSITY_SIGMA_MIN,
    chooseDensityExample, DensityAreaEdit, DensityAreaModel, DensityAreaView, densityAreaFill, densityAreaView, densityExampleOf, fitDensityView,
    setDensityBound, setDensityMu, setDensitySigma,
} from "../../analysis/densityAreaModel";
import {
    densityAreaEditMessage, densityFraction, densityNumber, densityPercent, densityStatus, densityZ,
} from "./densityAreaMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

const AREA_COLOR = GraphPalette.comparisonCurve;

/**
 * Density and probability as area (lesson P1): the density of X ~ N(mu, sigma^2) with the area between two draggable ends a and b
 * on the x-axis, its size as a percentage, and the standardized ends z_a and z_b. The model is `{mu, sigma, a, b}`
 * (`src/analysis/densityAreaModel`); the numbers come from the kernel `distributions` (a difference of tails, so far tails keep
 * their digits). The area is one filled curve whose point list is rebuilt on every update, as in `DefiniteIntegralGraph`, so the
 * object count does not depend on the interval; dragging an end rounds to 0.01.
 *
 * An example (N(0, 1) or N(100, 15)) sets all four numbers and the view; the view also follows an imported Preset without a view of
 * its own, and the host Fit rescales to the current mu and sigma. The view does not move while mu and sigma are dragged.
 */
export class DensityAreaGraph extends BaseFunctionGraph<DensityAreaModel> {
    protected pointA?: JXG.Point;
    protected pointB?: JXG.Point;
    private readonly fillOf = this.modelCache((model: DensityAreaModel) => densityAreaFill(model));

    override presetCollection() {
        return functionPresetCollections["prob-density"];
    }

    protected defaultModel(): DensityAreaModel {
        return {...DEFAULT_DENSITY_AREA_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return fitDensityView(DEFAULT_DENSITY_AREA_MODEL);
    }

    /** The density's height is about 0.4/sigma, unrelated to the x units. */
    protected override get equalAxisUnits(): boolean {
        return false;
    }

    protected override exampleView() {
        return {key: `${this.model.mu}|${this.model.sigma}`, box: fitDensityView(this.model)};
    }

    private viewOf(model: DensityAreaModel): DensityAreaView {
        return this.memoView(model, () => densityAreaView(model));
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    private accepted(edit: DensityAreaEdit): DensityAreaModel {
        if (!edit.ok) throw new DomainError(densityAreaEditMessage(edit.issue));
        return edit.model;
    }

    private commitEdit(edit: DensityAreaEdit, options: { syncScene?: boolean } = {}): void {
        const next = this.accepted(edit);
        if (next !== this.model) this.commitModel(next, options);
    }

    protected setMu(value: unknown): void {
        this.commitEdit(setDensityMu(this.model, value));
    }

    protected setSigma(value: unknown): void {
        this.commitEdit(setDensitySigma(this.model, value));
    }

    protected setBound(which: "a" | "b", value: unknown, options: { syncScene?: boolean } = {}): void {
        this.commitEdit(setDensityBound(this.model, which, value), options);
    }

    /** The host Fit frames the curve, as choosing an example does (the former "fit the view to the curve" button). */
    protected override fitView(): BoundingBox {
        return [...fitDensityView(this.model)];
    }

    /** Shows the curve fully: the view becomes mu +- 4 sigma wide and as high as the peak. */
    protected fitToCurve(): void {
        if (this.generatedObjectCount > 0) this.board.setBoundingBox(fitDensityView(this.model), this.equalAxisUnits);
    }

    protected setExample(id: unknown): void {
        this.commitModel(this.accepted(chooseDensityExample(this.model, id)));
        this.fitToCurve();
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "density-mu": value => this.setMu(value),
                "density-sigma": value => this.setSigma(value),
                "density-a": value => this.setBound("a", value),
                "density-b": value => this.setBound("b", value),
            },
            choices: {"density-example": value => this.setExample(value)},
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;

        // Layers, lowest first: the area, the density, then the two ends on the axis.
        // The area is the subject: its own hue (blue, as the normal area of the binomial graph), with a visible boundary at a and b.
        this.signedFill(AREA_COLOR, () => this.fillOf(this.model));
        for (const which of ["a", "b"] as const) {
            const height = () => normalPdf(model()[which], model().mu, model().sigma);
            this.own(board.create("curve", [() => model()[which], (t: number) => t * height(), 0, 1], {
                strokeColor: AREA_COLOR, strokeWidth: this.displayThinWidth(0.9), highlight: false, fixed: true, visible: () => model().a <= model().b,
            }));
        }
        this.own(board.create("functiongraph", [(x: number) => normalPdf(x, model().mu, model().sigma)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        }));

        // The ends slide along the x-axis: a drag keeps y = 0 and writes x rounded to 0.01. a may pass b (an empty interval).
        const end = (which: "a" | "b") => this.slidingPoint({
            x: model()[which], position: () => 0, min: -DENSITY_BOUND_LIMIT, max: DENSITY_BOUND_LIMIT, step: DENSITY_DRAG_STEP,
            attributes: {...this.styles.point.default, name: `$$${which}$$`, label: this.pointLabel("below-right", 1.6)},
            write: x => this.setBound(which, x, {syncScene: false}),
        });
        this.pointA = end("a");
        this.pointB = end("b");

        this.caption("top-left", [
            {text: () => t("prob_density_board_title", {value0: densityNumber(model().mu, language()), value1: densityNumber(model().sigma, language())}), scale: 1.2},
            {text: () => t("prob_density_board_area", {value0: densityPercent(this.viewOf(model()).probability, language())})},
            {text: () => densityStatus(this.viewOf(model()).kind, language()), color: GraphPalette.warningText},
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

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const example = densityExampleOf(state);
        const options = [
            {value: "standard", text: t("prob_density_example_standard")},
            {value: "iq", text: t("prob_density_example_iq")},
            ...(example === undefined ? [{value: "custom", text: t("prob_density_example_custom")}] : []),
        ];
        const muRejected = t("prob_density_mu_rejected", {value0: DENSITY_MU_LIMIT});
        const sigmaRejected = t("prob_density_sigma_rejected");
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_density_example_label")} value={example ?? "custom"} help={t("prob_density_example_help")} options={options}
                              onChange={next => { if (next === "standard" || next === "iq") this.setExample(next); }}/>
            </div>
            <div className="inspector-group">
                <Slider customText={t("prob_density_mu_label")} min={-DENSITY_MU_LIMIT} max={DENSITY_MU_LIMIT} step={0.1} value={state.mu}
                        rejectedHint={muRejected} onChange={next => this.ignoreOutOfDomain(() => this.setMu(next))}/>
                <Slider customText={t("prob_density_sigma_label")} min={DENSITY_SIGMA_MIN} max={DENSITY_SIGMA_MAX} step={0.1} value={state.sigma}
                        rejectedHint={sigmaRejected} onChange={next => this.ignoreOutOfDomain(() => this.setSigma(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("prob_density_a_label")} value={state.a} min={-DENSITY_BOUND_LIMIT} max={DENSITY_BOUND_LIMIT} step={DENSITY_DRAG_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/>
                <NumberInput label={t("prob_density_b_label")} value={state.b} min={-DENSITY_BOUND_LIMIT} max={DENSITY_BOUND_LIMIT} step={DENSITY_DRAG_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/>
                <p className="inspector-help">{t("prob_density_bounds_help")}</p>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const rows = [
            {id: "area-percent", label: t("prob_density_readout_area_percent"), value: densityPercent(view.probability, language)},
            {id: "area", label: t("prob_density_readout_area"), value: densityFraction(view.probability, language)},
            {id: "za", label: t("prob_density_readout_za"), value: densityZ(view.za, language)},
            {id: "zb", label: t("prob_density_readout_zb"), value: densityZ(view.zb, language)},
        ];
        const status = densityStatus(view.kind, language);
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("prob_density_note")}/>
            <FunctionStatus dataAttribute="prob-density" lines={status ? [{id: "status", text: status}] : []}/>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "curve", color: GraphPalette.primaryCurve, label: t("prob_density_legend_curve"), kind: "line"},
            {id: "area", color: AREA_COLOR, label: t("prob_density_legend_area"), kind: "area"},
        ]}/>;
    }
}

export default DensityAreaGraph;
