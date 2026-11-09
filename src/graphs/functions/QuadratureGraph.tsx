import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {catalogFunction, FUNCTION_IDS, FunctionId} from "../../analysis/functions";
import {BOUND_MAX, BOUND_MIN, BOUND_STEP} from "../../analysis/riemann";
import {simpsonParabolas} from "../../analysis/quadrature";
import {
    chooseQuadratureFunction, chooseQuadratureRule, countRule, DEFAULT_QUADRATURE_MODEL, ERROR_DISPLAY_DIGITS, moveQuadratureEndpoint, QUADRATURE_MIN_WIDTH,
    QUADRATURE_RULES, QuadratureEdit, QuadratureModel, QuadratureRule, quadratureView, QuadratureView, setQuadratureCount,
} from "../../analysis/quadratureModel";
import {quadratureEditMessage} from "./quadratureMessages";
import {cleanNumber} from "../../analysis/numbers";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** Errors and ratios are shown with significant digits: the errors span five orders of magnitude (0,4292 to 1,66·10⁻⁵). */
const ERROR_DIGITS = ERROR_DISPLAY_DIGITS;
const RATIO_DIGITS = 3;
/** Approximation and exact value: four decimals, as in the definite-integral lesson. */
const PRECISE = 4;
/** Points per parabola arc. */
const PARABOLA_SAMPLES = 24;

const RULE_LABELS: Readonly<Record<QuadratureRule, () => string>> = {
    trapezoid: () => t("quadrature_rule_trapezoid"),
    simpson: () => t("quadrature_rule_simpson"),
};

/** Per-function views (the interval [0, pi] needs a view of about 5 by 4 for sin; x^2 and e^x as in the definite-integral graph). */
const FUNCTION_VIEWS: Readonly<Record<FunctionId, BoundingBox>> = {
    square: [-1.5, 4.5, 5.5, -1],
    sin: [-1, 2.6, 4.8, -1.8],
    exp: [-3, 8.5, 9, -1],
};

/** The shapes of the rule as NaN-separated closed outlines: one trapezoid per subinterval, or one parabola-capped region per pair. */
export function quadratureShapes(model: QuadratureModel): { x: number[]; y: number[] } {
    const fn = catalogFunction(model.fn);
    const x: number[] = [];
    const y: number[] = [];
    const separate = () => {
        if (x.length > 0) {
            x.push(NaN);
            y.push(NaN);
        }
    };
    if (model.rule === "trapezoid") {
        const h = (model.b - model.a) / model.n;
        for (let i = 0; i < model.n; i++) {
            const x0 = model.a + i * h;
            const x1 = model.a + (i + 1) * h;
            separate();
            x.push(x0, x0, x1, x1, x0);
            y.push(0, fn.value(x0), fn.value(x1), 0, 0);
        }
    } else {
        for (const parabola of simpsonParabolas(fn, model.a, model.b, model.n)) {
            separate();
            x.push(parabola.x0);
            y.push(0);
            for (let k = 0; k <= PARABOLA_SAMPLES; k++) {
                const px = parabola.x0 + (parabola.x1 - parabola.x0) * k / PARABOLA_SAMPLES;
                x.push(px);
                y.push(parabola.at(px));
            }
            x.push(parabola.x1, parabola.x0);
            y.push(0, 0);
        }
    }
    return {x, y};
}

/**
 * The trapezoid and Simpson rules for the integral of x^2, sin x or e^x (numerical methods lesson N4). The model is
 * `{rule, fn, a, b, n}`; the approximation, the exact value (from the catalogue's antiderivative), the absolute error and the ratio
 * of the error at n/2 to the error at n are recomputed from it by `src/analysis/quadratureModel` and never stored. The shapes are
 * one filled curve (a trapezoid per subinterval, or a parabola-capped region per pair of subintervals), so the object count does
 * not depend on n or the rule.
 *
 * Simpson needs an even n (2 to 150, step 2). A typed or slider n that breaks the rule is rejected. Switching the rule from
 * trapezoid with an odd n to Simpson raises n by 1 and says so in the inspector until the next edit; it is never rounded silently.
 * This is a separate Demonstration from `DefiniteIntegralGraph` (ADR 0023 section 3): `SUM_METHODS` is unchanged.
 */
export class QuadratureGraph extends BaseFunctionGraph<QuadratureModel> {
    private pointA?: JXG.Point;
    private pointB?: JXG.Point;
    /** The n before and after the last rule switch that had to change it; cleared by any other edit, preset or reset. */
    private adjustment?: { from: number; to: number };

    override presetCollection() {
        return functionPresetCollections.quadrature;
    }

    protected defaultModel(): QuadratureModel {
        return {...DEFAULT_QUADRATURE_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...FUNCTION_VIEWS[this.model.fn]];
    }

    protected override exampleView() {
        return {key: this.model.fn, box: FUNCTION_VIEWS[this.model.fn]};
    }

    override importPresetData(data: QuadratureModel): void {
        this.adjustment = undefined;
        super.importPresetData(data);
    }

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    private apply(edit: QuadratureEdit, options: { syncScene?: boolean } = {}): void {
        if (!edit.ok) throw new DomainError(quadratureEditMessage(edit.issue));
        this.adjustment = edit.adjustedFrom === undefined ? undefined : {from: edit.adjustedFrom, to: edit.model.n};
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setRule(value: unknown): void {
        this.apply(chooseQuadratureRule(this.model, value));
    }

    protected setFunction(value: unknown): void {
        const edit = chooseQuadratureFunction(this.model, value);
        this.apply(edit);
        if (edit.ok && this.generatedObjectCount > 0) this.board.setBoundingBox([...FUNCTION_VIEWS[edit.model.fn]], true);
    }

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        this.apply(moveQuadratureEndpoint(this.model, which, value), options);
    }

    protected setCount(value: number): void {
        this.apply(setQuadratureCount(this.model, value));
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                "quadrature-a": value => this.setBound("a", value),
                "quadrature-b": value => this.setBound("b", value),
                "quadrature-n": value => this.setCount(value),
            },
            choices: {
                "quadrature-function": value => this.setFunction(value),
                "quadrature-rule": value => this.setRule(value),
            },
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    private viewOf(model: QuadratureModel): QuadratureView {
        return this.memoView(model, () => quadratureView(model));
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;

        // Layers, lowest first: the shapes of the rule, the function, then the bound points.
        this.signedFill(GraphPalette.additionalCurves[0], () => quadratureShapes(this.model));
        this.own(board.create("functiongraph", [(x: number) => catalogFunction(model().fn).value(x)], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        }));

        this.pointA = this.axisPoint({
            x: model().a, name: "$$a$$", placement: "below-left", step: BOUND_STEP,
            min: () => BOUND_MIN, max: () => cleanNumber(model().b - QUADRATURE_MIN_WIDTH), write: x => this.setBound("a", x, {syncScene: false}),
        });
        this.pointB = this.axisPoint({
            x: model().b, name: "$$b$$", placement: "below-right", step: BOUND_STEP,
            min: () => cleanNumber(model().a + QUADRATURE_MIN_WIDTH), max: () => BOUND_MAX, write: x => this.setBound("b", x, {syncScene: false}),
        });

        // The function, the approximation with its error and the error ratio stay on the board (projection needs them), top left.
        this.caption("top-left", [
            {text: () => `f(x) = ${catalogFunction(model().fn).plain}`, scale: 1.2, math: true},
            {
                text: () => t("quadrature_board_values", {
                    value0: String(model().n), value1: formatNumber(this.viewOf(model()).approximation, language(), PRECISE),
                    value2: formatSignificant(this.viewOf(model()).error, language(), ERROR_DIGITS),
                }),
            },
            {
                text: () => t("quadrature_board_ratio", {value0: formatSignificant(this.viewOf(model()).ratio ?? NaN, language(), RATIO_DIGITS)}),
                visible: () => this.viewOf(model()).ratio !== undefined,
            },
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
        const {rule, fn, a, b, n} = this.model;
        const counts = countRule(rule);
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("quadrature_rule_label")} value={rule} help={t("quadrature_rule_help")}
                              options={QUADRATURE_RULES.map(id => ({value: id, text: RULE_LABELS[id]()}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setRule(next))}/>
                <ChoiceSelect label={t("quadrature_function_label")} value={fn} help={t("quadrature_function_help")}
                              options={FUNCTION_IDS.map(id => ({value: id, text: `f(x) = ${catalogFunction(id).plain}`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("quadrature_a_label")} value={a} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             rejectedHint={t("quadrature_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/>
                <NumberInput label={t("quadrature_b_label")} value={b} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             rejectedHint={t("quadrature_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/>
                <p className="inspector-help">{t("quadrature_bounds_help")}</p>
            </div>
            <div className="inspector-group">
                <Slider customText={t("quadrature_n_label")} min={counts.min} max={counts.max} step={counts.step} value={n}
                        help={rule === "simpson" ? t("quadrature_n_help_simpson") : t("quadrature_n_help_trapezoid")}
                        rejectedHint={rule === "simpson" ? t("quadrature_n_even_rejected", {value0: counts.min, value1: counts.max}) : undefined}
                        onChange={next => this.ignoreOutOfDomain(() => this.setCount(Math.round(next)))}/>
            </div>
        </>;
    }

    /** The statuses to state in words (no changing numbers); each has a stable id. */
    private statuses(model: QuadratureModel, view: QuadratureView): { id: string; text: string }[] {
        const result: { id: string; text: string }[] = [{id: model.rule, text: model.rule === "simpson" ? t("quadrature_status_simpson") : t("quadrature_status_trapezoid")}];
        if (view.halfN === undefined) result.push({id: "no-half", text: t("quadrature_status_no_half")});
        else if (view.ratio === undefined) result.push({id: "exact", text: t("quadrature_status_exact")});
        // The even count the rule chose instead of the typed one is stated with the other statuses, in the one announcement.
        if (this.adjustment) result.push({id: "adjusted", text: t("quadrature_adjusted", {value0: this.adjustment.from, value1: this.adjustment.to})});
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const number = (value: number) => formatNumber(value, language, PRECISE);
        const none = t("quadrature_none");
        const rows = [
            {id: "n", label: t("quadrature_readout_n"), value: String(model.n)},
            {id: "approximation", label: t("quadrature_readout_approximation"), value: number(view.approximation)},
            {id: "exact", label: t("quadrature_readout_exact"), value: number(view.exact)},
            {id: "error", label: t("quadrature_readout_error"), value: formatSignificant(view.error, language, ERROR_DIGITS)},
            {
                id: "half-error", label: view.halfN === undefined ? t("quadrature_readout_half_error", {value0: none}) : t("quadrature_readout_half_error", {value0: view.halfN}),
                value: view.halfError === undefined ? none : formatSignificant(view.halfError, language, ERROR_DIGITS),
            },
            {id: "ratio", label: t("quadrature_readout_ratio"), value: view.ratio === undefined ? none : formatSignificant(view.ratio, language, RATIO_DIGITS)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("quadrature_note")}/>
            <FunctionStatus className="quadrature-status" dataAttribute="quadrature-status" lines={this.statuses(model, view)}/>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        const rule = this.model.rule;
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.comparisonCurve, label: t("quadrature_legend_function"), kind: "line"},
            {id: "bound", color: GraphPalette.constructionAccent, label: t("quadrature_legend_bound"), kind: "line"},
            rule === "simpson"
                ? {id: "simpson", color: GraphPalette.additionalCurves[0], label: t("quadrature_legend_simpson"), kind: "area"}
                : {id: "trapezoid", color: GraphPalette.additionalCurves[0], label: t("quadrature_legend_trapezoid"), kind: "area"},
        ]}/>;
    }
}

export default QuadratureGraph;
