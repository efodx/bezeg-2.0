import React from "react";
import {guard, guardField} from "../base/controls/guard";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, MINUS_SIGN, NumberLanguage} from "../../analysis/format";
import {PlotPoint, plotPieces, POLY_BOUNDS} from "../../analysis/schoolFunctions";
import {MAX_POLY_DEGREE, polyDerivativeValue} from "../../analysis/polynomial";
import {
    addPolynomialZero, choosePolynomialExample, DEFAULT_POLYNOMIAL_ZEROS_MODEL, exampleOfPolynomial, movePolynomialZero, POLYNOMIAL_EXAMPLE_IDS,
    PolynomialExampleId, polynomialExampleModel, PolynomialFacts, polynomialFacts, PolynomialZerosEdit, PolynomialZerosModel,
    polynomialSpecOf, removePolynomialZero, setPolynomialK, setPolynomialMultiplicity,
} from "../../analysis/polynomialZerosModel";
import {ZERO_GRID_DECIMALS} from "../../analysis/zeroListModel";
import {polynomialProductText, polynomialRuleText, polynomialZerosEditMessage} from "./polynomialZerosMessages";
import {noticeOfEvent, ZeroListEditor, ZeroListNoticeStore, ZeroListNoticeView, zeroListNoticeText} from "./ZeroListEditor";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {TransientState} from "../base/BaseGraph";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";

/** Step of the arrow keys in the k field. */
const K_STEP = 0.5;

/** Samples of the derivative curve across the view. */
const DERIVATIVE_SAMPLES = 400;

/** Dash style (JSXGraph numbering) of the derivative: it differs from the polynomial by pattern and not only by colour. */
const DERIVATIVE_DASH = 2;

/**
 * Polynomial zeros and multiplicity (school function lesson S3). The model is `{k, zeros: [{z, m}], derivativeVisible}`
 * (`src/analysis/polynomialZerosModel`, which owns validity and the issues; the zero list rules are shared with the
 * rational-function graph in `zeroListModel`): p(x) = k * prod (x - z)^m with at most five zeros, multiplicity 1..3 and total degree
 * at most 5. Every zero is a glider on the x-axis (dragged on a grid of 0.1, or typed in a field whose arrow keys move it by one
 * grid step); a zero dragged or typed onto another merges with it and the live text says so; a merge above multiplicity 3 or a
 * degree above 5 is refused with its reason. The curve is sampled by `plotPieces`.
 */
export class PolynomialZerosGraph extends BaseFunctionGraph<PolynomialZerosModel> {
    private readonly notices = new ZeroListNoticeStore();
    private gliders: JXG.Point[] = [];
    /** Set when a drag merged its zero away: the rest of that drag is ignored, as the dragged glider no longer stands for a zero. */
    private dragMerged = false;

    override presetCollection() {
        return functionPresetCollections["polynomial-zeros"];
    }

    protected defaultModel(): PolynomialZerosModel {
        return DEFAULT_POLYNOMIAL_ZEROS_MODEL;
    }

    protected defaultBoundingBox(): BoundingBox {
        return [-6, 8, 6, -8];
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    /** Applies an edit: the notice follows the outcome (a merge is announced, a refused zero list rule is explained) and a refusal throws. */
    private applyEdit(edit: PolynomialZerosEdit, options: { syncScene?: boolean } = {}): void {
        if (!edit.ok) {
            this.notices.set(undefined); // a refusal is shown alone, through the refusal channel
            throw new DomainError(polynomialZerosEditMessage(edit.issue));
        }
        this.notices.set(edit.event ? noticeOfEvent(edit.event) : undefined);
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    /** A drag frame's edit: a refusal is shown (an equal one on the next frame is not announced again), an accepted frame clears it. */
    private dragEdit(action: () => void): void {
        try {
            action();
        } catch (error) {
            if (!(error instanceof DomainError)) throw error;
            this.refusals.refuse(error.reason ?? error.message);
            return;
        }
        this.refusals.clear();
    }

    protected setK(value: number): void {
        this.applyEdit(setPolynomialK(this.model, value));
    }

    /** Moves the zero at `index` (0-based); a zero landing on another merges with it. */
    protected setZeroPosition(index: number, value: number, options: { syncScene?: boolean } = {}): void {
        this.applyEdit(movePolynomialZero(this.model, index, value), options);
    }

    protected setMultiplicity(index: number, value: number): void {
        this.applyEdit(setPolynomialMultiplicity(this.model, index, value));
    }

    protected addZero(): void {
        this.applyEdit(addPolynomialZero(this.model));
    }

    protected removeZero(index: number): void {
        this.applyEdit(removePolynomialZero(this.model, index));
    }

    protected setExample(id: unknown): void {
        this.applyEdit(choosePolynomialExample(this.model, id));
    }

    protected setDerivativeVisible(visible: boolean): void {
        if (visible !== this.model.derivativeVisible) this.commitModel({...this.model, derivativeVisible: visible});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                k: value => this.setK(value),
                "poly-zero-1": value => this.setZeroPosition(0, value), "poly-zero-2": value => this.setZeroPosition(1, value),
                "poly-zero-3": value => this.setZeroPosition(2, value), "poly-zero-4": value => this.setZeroPosition(3, value),
                "poly-zero-5": value => this.setZeroPosition(4, value),
            },
            choices: {"polynomial-example": value => this.setExample(value)},
            visibility: {"polynomial-derivative": visible => this.setDerivativeVisible(visible)},
        };
    }

    /** A freshly loaded scene starts without a notice; the notice is transient and never part of a captured scene. */
    protected override restoreTransientState(saved: TransientState | undefined): void {
        super.restoreTransientState(saved);
        this.notices.set(undefined);
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The polyline of p over the view, pieces joined with NaN gaps (a polynomial has none, but the sampler is the one drawing path). */
    private plotted(): { x: number[]; y: number[] } {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const x: number[] = [];
        const y: number[] = [];
        plotPieces({kind: "poly", ...polynomialSpecOf(this.model)}, left, right, bottom, top).forEach((piece: PlotPoint[], index) => {
            if (index > 0) {
                x.push(NaN);
                y.push(NaN);
            }
            for (const point of piece) {
                x.push(point.x);
                y.push(point.y);
            }
        });
        return {x, y};
    }

    /** The derivative sampled across the view and clipped to the view enlarged by its own height (a polynomial is defined everywhere). */
    private derivativeSamples(): { x: number[]; y: number[] } {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const spec = polynomialSpecOf(this.model);
        const height = top - bottom;
        const x: number[] = [];
        const y: number[] = [];
        for (let i = 0; i <= DERIVATIVE_SAMPLES; i++) {
            const at = left + (right - left) * i / DERIVATIVE_SAMPLES;
            x.push(at);
            y.push(Math.min(top + height, Math.max(bottom - height, polyDerivativeValue(spec, at, 1))));
        }
        return {x, y};
    }

    private curve(samples: () => { x: number[]; y: number[] }, attributes: object): void {
        const curve = this.own(this.board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes})) as unknown as {
            updateDataArray: () => void; dataX: number[]; dataY: number[];
        };
        curve.updateDataArray = () => {
            const {x, y} = samples();
            curve.dataX = x;
            curve.dataY = y;
        };
    }

    /**
     * The glider of the zero at `index`. Dragging projects the abscissa onto the grid and writes it through the model (so a collision merges
     * and a refused merge puts the glider back). After a merge the rest of that drag is ignored, because the dragged glider no longer
     * stands for a zero of its own.
     */
    private glider(index: number): JXG.Point {
        const present = () => index < this.model.zeros.length;
        const point = this.own(this.board.create("point", [0, 0], {
            ...this.styles.point.default, name: "", withLabel: false, fillColor: GraphPalette.constructionAccent,
            highlightFillColor: GraphPalette.constructionAccent, visible: present, size: () => Math.max(4, this.displaySettings.pointSize),
        })) as JXG.Point;
        bindMovablePointCursor(point, this.board);
        point.on("down", () => { this.dragMerged = false; });
        point.on("up", () => {
            this.dragMerged = false;
            this.syncSceneToModel();
        });
        point.on("drag", () => {
            if (!present() || this.dragMerged) {
                this.syncSceneToModel();
                return;
            }
            const x = Math.min(POLY_BOUNDS.z[1], Math.max(POLY_BOUNDS.z[0], point.X()));
            const before = this.model.zeros.length;
            this.dragEdit(() => this.setZeroPosition(index, x));
            if (this.model.zeros.length < before) this.dragMerged = true;
            this.syncSceneToModel();
        });
        // The multiplicity beside the glider, only for a multiple zero.
        this.own(this.board.create("text", [
            () => this.model.zeros[index]?.z ?? 0, () => 18 / this.board.unitY, () => `×${this.model.zeros[index]?.m ?? 1}`,
        ], {
            anchorX: "middle", anchorY: "bottom", fixed: true, highlight: false, parse: false, strokeColor: GraphPalette.label,
            visible: () => (this.model.zeros[index]?.m ?? 1) > 1, fontSize: () => this.displaySettings.fontSize,
        }));
        return point;
    }

    protected createScene(): void {
        const model = () => this.model;
        const strokeWidth = () => this.displaySettings.strokeWidth;

        // Layers, lowest first: the derivative, the polynomial, the zero gliders (each with its multiplicity label).
        this.curve(() => this.derivativeSamples(), {
            strokeColor: GraphPalette.referenceCurve, dash: DERIVATIVE_DASH, strokeWidth, visible: () => model().derivativeVisible,
        });
        this.curve(() => this.plotted(), {strokeColor: GraphPalette.primaryCurve, strokeWidth});
        this.gliders = Array.from({length: MAX_POLY_DEGREE}, (_, index) => this.glider(index));
        this.syncSceneToModel();

        // The rule and the degree stay on the board (projection needs them).
        this.caption("bottom-right", [
            {text: () => polynomialRuleText(polynomialSpecOf(model()), currentLanguage()), scale: 1.2},
            {text: () => t("polynomial_zeros_board_degree", {value0: polynomialFacts(model()).degree}), minBoardWidth: 520},
        ]);
    }

    protected override syncSceneToModel(): void {
        this.gliders.forEach((glider, index) => {
            const zero = this.model.zeros[index];
            if (zero) glider.moveTo([zero.z, 0]);
        });
    }

    protected override onSceneRemoved(): void {
        this.gliders = [];
        this.dragMerged = false;
    }

    // ---- Texts (shared by the board and the inspector) -----------------------------------------------------------------

    private number(value: number, language: NumberLanguage = currentLanguage()): string {
        return formatNumber(value, language, 4);
    }

    private position(value: number): string {
        return formatNumber(value, currentLanguage(), ZERO_GRID_DECIMALS);
    }

    private infinity(direction: "up" | "down"): string {
        return direction === "up" ? "+∞" : `${MINUS_SIGN}∞`;
    }

    private endText(facts: PolynomialFacts): string {
        if (facts.end.kind === "constant") return t("polynomial_zeros_end_constant");
        const parity = t(facts.degree % 2 === 0 ? "polynomial_zeros_parity_even" : "polynomial_zeros_parity_odd");
        return `${t("polynomial_zeros_end_value", {value0: this.infinity(facts.end.left), value1: this.infinity(facts.end.right)})}. `
            + t("polynomial_zeros_end_reason", {value0: this.model.k > 0 ? ">" : "<", value1: parity});
    }

    private zeroText(zero: PolynomialFacts["zeros"][number]): string {
        const params = {value0: this.position(zero.z), value1: zero.m};
        if (!zero.crosses) return t("polynomial_zeros_zero_touches", params);
        return t(zero.derivativeVanishes ? "polynomial_zeros_zero_crosses_flat" : "polynomial_zeros_zero_crosses", params);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private exampleText(id: PolynomialExampleId): string {
        return polynomialProductText(polynomialSpecOf(polynomialExampleModel(id)), currentLanguage());
    }

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const current = exampleOfPolynomial(state);
        const options = [
            ...(current === undefined ? [{value: "custom", text: t("polynomial_zeros_example_custom")}] : []),
            ...POLYNOMIAL_EXAMPLE_IDS.map(id => ({value: id, text: `p(x) = ${this.exampleText(id)}`})),
        ];
        const kRange = {value0: formatNumber(POLY_BOUNDS.k[0], currentLanguage()), value1: formatNumber(POLY_BOUNDS.k[1], currentLanguage())};
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("polynomial_zeros_example_label")} value={current ?? "custom"} help={t("polynomial_zeros_example_help")}
                              options={options} onChange={next => { if (next !== "custom") guard(this.refusals, () => this.setExample(next)); }}/>
                <NumberInput label={t("polynomial_zeros_k_label")} value={state.k} min={POLY_BOUNDS.k[0]} max={POLY_BOUNDS.k[1]} step={K_STEP} decimals={4}
                             rejectedHint={t("polynomial_zeros_k_hint", kRange)} onChange={next => guardField(this.refusals, () => this.setK(next))}/>
            </div>
            <ZeroListEditor zeros={state.zeros} maxDegree={MAX_POLY_DEGREE}
                            onMove={(index, next) => guardField(this.refusals, () => this.setZeroPosition(index, next))}
                            onMultiplicity={(index, next) => { guard(this.refusals, () => this.setMultiplicity(index, next)); }}
                            onAdd={() => { guard(this.refusals, () => this.addZero()); }}
                            onRemove={index => { guard(this.refusals, () => this.removeZero(index)); }}
                            onBlocked={reason => this.refusals.refuse(reason, true)}/>
            <ZeroListNoticeView store={this.notices} describe={zeroListNoticeText}/>
            <div className="convexity-actions" role="group" aria-label={t("polynomial_zeros_actions_label")}>
                <button type="button" data-action="toggle-derivative" data-revealed={state.derivativeVisible}
                        onClick={() => this.setDerivativeVisible(!this.model.derivativeVisible)}>
                    {state.derivativeVisible ? t("polynomial_zeros_derivative_hide") : t("polynomial_zeros_derivative_show")}
                </button>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "curve", color: GraphPalette.primaryCurve, label: t("polynomial_zeros_legend_curve"), kind: "line"},
            ...(this.model.derivativeVisible ? [{id: "derivative", color: GraphPalette.referenceCurve, label: t("polynomial_zeros_legend_derivative"), kind: "dashed-line" as const}] : []),
            {id: "zero", color: GraphPalette.constructionAccent, label: t("polynomial_zeros_legend_zero"), kind: "dot"},
        ]}/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const facts = polynomialFacts(model);
        const language = currentLanguage();
        const sum = facts.spec.zeros.length === 0 ? "0" : facts.spec.zeros.map(zero => zero.m).join(" + ");
        const rows = [
            {id: "rule", label: t("polynomial_zeros_readout_rule"), value: polynomialRuleText(facts.spec, language)},
            {id: "degree", label: t("polynomial_zeros_readout_degree"), value: t("polynomial_zeros_degree_value", {value0: facts.degree, value1: sum})},
            {id: "end", label: t("polynomial_zeros_readout_end"), value: this.endText(facts)},
            {id: "y-intercept", label: t("polynomial_zeros_readout_y_intercept"), value: t("polynomial_zeros_y_intercept_value", {value0: this.number(facts.yIntercept)})},
            ...facts.zeros.map((zero, index) => ({
                id: `zero-${index}`, label: t("polynomial_zeros_readout_zero", {value0: index + 1}), value: this.zeroText(zero),
            })),
        ];
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={t("polynomial_zeros_note")}/>;
    }
}

export default PolynomialZerosGraph;
