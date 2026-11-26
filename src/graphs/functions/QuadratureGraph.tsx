import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, messageNumber, renderMessage, t} from "../../localization";
import type {FormattedValue, GraphDeclaration, LegendEntry, StatusLine} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
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

/** The ids of the quadrature declaration: the arbiter keys, the readout rows, the legend (the function, the bound points, the rule's shapes). */
export type QuadratureIds = {
    param: "quadrature-rule" | "quadrature-function" | "quadrature-a" | "quadrature-b" | "quadrature-n";
    row: "n" | "approximation" | "exact" | "error" | "half-error" | "ratio"; note: "about";
    legend: "function" | "bound" | "shapes"; section: never; action: never;
};

const FUNCTION_LABEL_KEYS = {
    square: "quadrature_function_square",
    sin: "quadrature_function_sin",
    exp: "quadrature_function_exp",
} as const satisfies Record<FunctionId, Parameters<typeof message>[0]>;

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
    /** The drawn objects the legend entries name (`drawnObject`); cleared with the scene. */
    private drawn: Partial<Record<"function" | "bound" | "shapes", unknown>> = {};
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
        if (edit.ok && this.generatedObjectCount > 0) this.boardView.setIntent(FUNCTION_VIEWS[edit.model.fn], {keepAspectRatio: true});
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
        this.drawn.shapes = this.signedFill(GraphPalette.additionalCurves[0], () => quadratureShapes(this.model));
        this.drawn.function = this.own(board.create("functiongraph", [(x: number) => catalogFunction(model().fn).value(x)], {
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
        this.drawn.bound = this.pointA;
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
        this.drawn = {};
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {rule, fn, a, b, n} = this.model;
        const counts = countRule(rule);
        return <>
            <div className="inspector-group">
                <PuckOwned param="quadrature-rule"><ChoiceSelect label={t("quadrature_rule_label")} value={rule} help={t("quadrature_rule_help")}
                              options={QUADRATURE_RULES.map(id => ({value: id, text: RULE_LABELS[id]()}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setRule(next))}/></PuckOwned>
                <ChoiceSelect label={t("quadrature_function_label")} value={fn} help={t("quadrature_function_help")}
                              options={FUNCTION_IDS.map(id => ({value: id, text: `f(x) = ${catalogFunction(id).plain}`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
            <div className="inspector-group">
                <Slider customText={t("quadrature_a_label")} value={a} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             rejectedHint={t("quadrature_a_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/>
                <Slider customText={t("quadrature_b_label")} value={b} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             rejectedHint={t("quadrature_b_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/>
                <p className="inspector-help">{t("quadrature_bounds_help")}</p>
            </div>
            <PuckOwnedGroup params={["quadrature-n"]} className="inspector-group">
                <PuckOwned param="quadrature-n"><Slider customText={t("quadrature_n_label")} min={counts.min} max={counts.max} step={counts.step} value={n}
                        help={rule === "simpson" ? t("quadrature_n_help_simpson") : t("quadrature_n_help_trapezoid")}
                        rejectedHint={rule === "simpson" ? t("quadrature_n_even_rejected", {value0: counts.min, value1: counts.max}) : undefined}
                        onChange={next => this.ignoreOutOfDomain(() => this.setCount(Math.round(next)))}/></PuckOwned>
            </PuckOwnedGroup>
        </>;
    }

    /** The statuses to state in words (no changing numbers); each has a stable id. */
    private statuses(model: QuadratureModel, view: QuadratureView): StatusLine[] {
        const result: StatusLine[] = [{id: model.rule, text: message(model.rule === "simpson" ? "quadrature_status_simpson" : "quadrature_status_trapezoid")}];
        if (view.halfN === undefined) result.push({id: "no-half", text: message("quadrature_status_no_half")});
        else if (view.ratio === undefined) result.push({id: "exact", text: message("quadrature_status_exact")});
        // The even count the rule chose instead of the typed one is stated with the other statuses, in the one announcement.
        if (this.adjustment) {
            result.push({
                id: "adjusted", tone: "warning",
                text: message("quadrature_adjusted", {value0: messageNumber(this.adjustment.from, 0), value1: messageNumber(this.adjustment.to, 0)}),
            });
        }
        return result;
    }

    // ---- Declaration ---------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys; every write goes through the validated setters. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "quadrature-rule": {read: () => this.model.rule, apply: (value: unknown) => this.setRule(value)},
            "quadrature-function": {read: () => this.model.fn, apply: (value: unknown) => this.setFunction(value)},
            "quadrature-a": {read: () => this.model.a, apply: (value: number) => this.setBound("a", value)},
            "quadrature-b": {read: () => this.model.b, apply: (value: number) => this.setBound("b", value)},
            "quadrature-n": {read: () => this.model.n, apply: (value: number) => this.setCount(Math.round(value))},
        };
    }

    /**
     * Board: the rule (two options the lessons switch between to compare errors) and the number of subintervals n (doubled again and again
     * while the error and its ratio are watched). Orodja: the function (a setup choice that replaces the view) and the bounds a and b (set
     * once; also draggable on the axis). The rows, note and statuses come from the panel.
     */
    protected override declaration(): GraphDeclaration {
        const {rule, a, b} = this.model;
        const counts = countRule(rule);
        const legend: LegendEntry<QuadratureIds>[] = [
            {id: "function", label: message("quadrature_legend_function"), kind: "line", object: "function"},
            {id: "bound", label: message("quadrature_legend_bound"), kind: "point", object: "bound"},
            {
                id: "shapes", kind: "area", object: "shapes",
                label: message(rule === "simpson" ? "quadrature_legend_simpson" : "quadrature_legend_trapezoid"),
            },
        ];
        return {
            ...this.commonDeclaration(),
            parameters: [
                {key: "quadrature-rule", kind: "choice", label: message("quadrature_rule_label"), help: message("quadrature_rule_help"), placement: "board", puck: true,
                    options: QUADRATURE_RULES.map(id => ({
                        value: id, label: message(id === "simpson" ? "quadrature_rule_simpson" : "quadrature_rule_trapezoid"),
                        short: message(id === "simpson" ? "quadrature_rule_simpson_short" : "quadrature_rule_trapezoid_short"),
                    }))},
                {key: "quadrature-n", kind: "range", label: message("quadrature_n_name"), symbol: "n", placement: "board",
                    help: message(rule === "simpson" ? "quadrature_n_help_simpson" : "quadrature_n_help_trapezoid"),
                    min: counts.min, max: counts.max, step: counts.step, maxDecimals: 0},
                {key: "quadrature-function", kind: "choice", label: message("quadrature_function_label"), help: message("quadrature_function_help"), placement: "tools",
                    options: FUNCTION_IDS.map(id => ({value: id, label: message(FUNCTION_LABEL_KEYS[id])}))},
                {key: "quadrature-a", kind: "range", label: message("quadrature_a_name"), symbol: "a", help: message("quadrature_bounds_help"), placement: "tools",
                    min: BOUND_MIN, max: cleanNumber(b - QUADRATURE_MIN_WIDTH), step: BOUND_STEP, maxDecimals: 2},
                {key: "quadrature-b", kind: "range", label: message("quadrature_b_name"), symbol: "b", help: message("quadrature_bounds_help"), placement: "tools",
                    min: cleanNumber(a + QUADRATURE_MIN_WIDTH), max: BOUND_MAX, step: BOUND_STEP, maxDecimals: 2},
            ],
            legend,
        };
    }

    /** The rows, the note and the statuses of the inspector as declared data (`renderReadout` draws them from it). */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const none = message("quadrature_none");
        const significant = (value: number | undefined, digits: number): Message | FormattedValue =>
            value === undefined ? none : {kind: "formatted", text: formatSignificant(value, language, digits)};
        const fn = catalogFunction(model.fn);
        return {
            rows: [
                {id: "n", name: message("quadrature_readout_n"), value: messageNumber(model.n, 0)},
                {id: "approximation", name: message("quadrature_readout_approximation"), value: messageNumber(view.approximation, PRECISE)},
                {id: "exact", name: message("quadrature_readout_exact"), value: messageNumber(view.exact, PRECISE)},
                {id: "error", name: message("quadrature_readout_error"), value: significant(view.error, ERROR_DIGITS)},
                {
                    id: "half-error", name: message("quadrature_readout_half_error", {value0: view.halfN === undefined ? none : messageNumber(view.halfN, 0)}),
                    value: significant(view.halfError, ERROR_DIGITS),
                },
                {id: "ratio", name: message("quadrature_readout_ratio"), value: significant(view.ratio, RATIO_DIGITS)},
            ],
            notes: [{id: "about", text: message("quadrature_note")}],
            status: this.statuses(model, view),
            // The learner watches f over the bounds and the shapes under it: the curve and the four corners of the region stay in view.
            plotted: x => fn.value(x),
            must: [model.a, model.b].flatMap(x => [{x, y: 0}, {x, y: fn.value(x)}]),
        };
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const element = id === "function" || id === "bound" || id === "shapes" ? this.drawn[id] : undefined;
        if (typeof element !== "object" || element === null || Array.isArray(element)) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp(id === "function" ? "strokecolor" : "fillcolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    protected renderReadout(): React.ReactNode {
        const lines = this.functionPanel().status ?? [];
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="quadrature-status" dataAttribute="quadrature-status" lines={lines.map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }

    /** A declared legend replaces the panel's own, so Orodja shows no second one. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }
}

export default QuadratureGraph;
