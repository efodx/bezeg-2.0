import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import {FunctionStatus} from "./FunctionStatus";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, messageNumber, renderMessage, t} from "../../localization";
import type {GraphDeclaration, ParameterDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {normalPdf} from "../../analysis/distributions";
import {
    DEFAULT_DENSITY_AREA_MODEL, DENSITY_BOUND_LIMIT, DENSITY_DRAG_STEP, DENSITY_MU_LIMIT, DENSITY_SIGMA_MAX, DENSITY_SIGMA_MIN,
    chooseDensityExample, DensityAreaEdit, DensityAreaModel, DensityAreaView, densityAreaFill, densityAreaView, densityExampleOf, fitDensityView,
    setDensityBound, setDensityMu, setDensitySigma,
} from "../../analysis/densityAreaModel";
import {
    densityAreaEditMessage, densityFraction, densityPercent, densityStatusMessage, densityZ,
} from "./densityAreaMessages";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

const AREA_COLOR = GraphPalette.comparisonCurve;

/** The ids of the density declaration: the mean, the deviation and the two ends are board pucks; the legend names the curve and the area. */
export type DensityAreaIds = {
    param: "density-mu" | "density-sigma" | "density-a" | "density-b";
    row: "mu" | "sigma" | "a" | "b" | "area-percent" | "area" | "za" | "zb"; note: "density"; legend: "curve" | "area"; section: never; action: never;
};

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
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();
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
        if (this.generatedObjectCount > 0) this.boardView.setIntent(fitDensityView(this.model), {keepAspectRatio: this.equalAxisUnits});
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
        const strokeWidth = () => this.displaySettings.strokeWidth;

        // Layers, lowest first: the area, the density, then the two ends on the axis.
        // The area is the subject: its own hue (blue, as the normal area of the binomial graph), with a visible boundary at a and b.
        this.drawn.set("area", this.signedFill(AREA_COLOR, () => this.fillOf(this.model)) as unknown as JXG.GeometryElement);
        for (const which of ["a", "b"] as const) {
            const height = () => normalPdf(model()[which], model().mu, model().sigma);
            this.own(board.create("curve", [() => model()[which], (t: number) => t * height(), 0, 1], {
                strokeColor: AREA_COLOR, strokeWidth: this.displayThinWidth(0.9), highlight: false, fixed: true, visible: () => model().a <= model().b,
            }));
        }
        this.drawn.set("curve", this.own(board.create("functiongraph", [(x: number) => normalPdf(x, model().mu, model().sigma)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        })));

        // The ends slide along the x-axis: a drag keeps y = 0 and writes x rounded to 0.01. a may pass b (an empty interval).
        const end = (which: "a" | "b") => this.slidingPoint({
            x: model()[which], position: () => 0, min: -DENSITY_BOUND_LIMIT, max: DENSITY_BOUND_LIMIT, step: DENSITY_DRAG_STEP,
            attributes: {...this.styles.point.default, name: `$$${which}$$`, label: this.pointLabel("below-right", 1.6)},
            write: x => this.setBound(which, x, {syncScene: false}),
        });
        this.pointA = end("a");
        this.pointB = end("b");
    }

    protected override syncSceneToModel(): void {
        const {a, b} = this.model;
        this.pointA?.moveTo([a, 0]);
        this.pointB?.moveTo([b, 0]);
    }

    protected override onSceneRemoved(): void {
        this.pointA = undefined;
        this.pointB = undefined;
        this.drawn.clear();
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
        return <>
            <PuckOwnedGroup params={["density-a", "density-b", "density-mu", "density-sigma"]} className="inspector-group">
                <p className="inspector-help">{t("prob_density_bounds_help")}</p>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <ChoiceSelect label={t("prob_density_example_label")} value={example ?? "custom"} help={t("prob_density_example_help")} options={options}
                              onChange={next => { if (next === "standard" || next === "iq") this.setExample(next); }}/>
            </div>
        </>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "density-mu": {read: () => this.model.mu, apply: (value: number) => this.setMu(value)},
            "density-sigma": {read: () => this.model.sigma, apply: (value: number) => this.setSigma(value)},
            "density-a": {read: () => this.model.a, apply: (value: number) => this.setBound("a", value)},
            "density-b": {read: () => this.model.b, apply: (value: number) => this.setBound("b", value)},
        };
    }

    /** The common declaration (rows, note, status, view marks) plus the ends, the mean and the deviation as board pucks and the legend. */
    protected override declaration(): GraphDeclaration {
        const bound = (which: "a" | "b"): ParameterDeclaration => ({
            key: `density-${which}`, kind: "range", label: message(which === "a" ? "prob_density_a_name" : "prob_density_b_name"), symbol: which,
            ...(which === "a" ? {help: message("prob_density_bounds_help")} : {}),
            placement: "board", min: -DENSITY_BOUND_LIMIT, max: DENSITY_BOUND_LIMIT, step: DENSITY_DRAG_STEP, maxDecimals: 2,
        });
        return {
            ...this.commonDeclaration(),
            parameters: [
                bound("a"),
                bound("b"),
                {key: "density-mu", kind: "range", label: message("prob_density_mu_name"), symbol: "μ", placement: "board", min: -DENSITY_MU_LIMIT, max: DENSITY_MU_LIMIT, step: 0.1, maxDecimals: 2},
                {key: "density-sigma", kind: "range", label: message("prob_density_sigma_name"), symbol: "σ", placement: "board", min: DENSITY_SIGMA_MIN, max: DENSITY_SIGMA_MAX, step: 0.1, maxDecimals: 2},
            ],
            legend: [
                {id: "curve", label: message("prob_density_legend_curve"), kind: "line", object: "curve"},
                {id: "area", label: message("prob_density_legend_area"), kind: "area", object: "area"},
            ],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp(id === "area" ? "fillcolor" : "strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** Declared by the base: the readout rows, the note, the status and the plotted density; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const {mu, sigma, a, b} = this.model;
        const view = this.viewOf(this.model);
        const language = currentLanguage();
        const formatted = (text: string) => ({kind: "formatted" as const, text});
        const status = densityStatusMessage(view.kind);
        return {
            rows: [
                {id: "mu", symbol: "μ", value: messageNumber(mu, 2)},
                {id: "sigma", symbol: "σ", value: messageNumber(sigma, 2)},
                {id: "a", symbol: "a", value: messageNumber(a, 2)},
                {id: "b", symbol: "b", value: messageNumber(b, 2)},
                {id: "area-percent", name: message("prob_density_readout_area_percent"), value: formatted(densityPercent(view.probability, language))},
                {id: "area", name: message("prob_density_readout_area"), value: formatted(densityFraction(view.probability, language))},
                {id: "za", name: message("prob_density_readout_za"), value: formatted(densityZ(view.za, language))},
                {id: "zb", name: message("prob_density_readout_zb"), value: formatted(densityZ(view.zb, language))},
            ],
            notes: [{id: "density", text: message("prob_density_note")}],
            ...(status ? {status: [{id: "status", text: status, tone: "warning" as const}]} : {}),
            plotted: x => normalPdf(x, mu, sigma),
        };
    }

    protected renderReadout(): React.ReactNode {
        const status = this.functionPanel().status ?? [];
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus dataAttribute="prob-density" lines={status.map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }
}

export default DensityAreaGraph;
