import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, messageNumber, t} from "../../localization";
import type {GraphDeclaration, ParameterDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {formatNumber} from "../../analysis/format";
import {catalogFunction, FUNCTION_IDS, FunctionId, isFunctionId} from "../../analysis/functions";
import {
    BOUND_MAX, BOUND_MIN, BOUND_STEP, exactIntegral, FillData, fillData, isBound, isSubintervalCount, isSumMethod, N_MAX, N_MIN, N_STEP,
    riemannSum, SUM_METHODS, SumMethod, subintervalWidth,
} from "../../analysis/riemann";
import {DEFAULT_RIEMANN_MODEL, RiemannModel} from "../../analysis/riemannModel";
import {Preset} from "../base/presets/Presets";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {choiceRejected, integerRangeRejected, numberRangeRejected} from "./functionSetterMessages";

/** The ids of the definite-integral declaration: the count, the bounds and the sum type are board pucks; the drawn objects are the legend. */
export type DefiniteIntegralIds = {
    param: "a" | "b" | "n" | "sum-method";
    row: "a" | "b" | "n" | "h" | "sum" | "exact" | "difference"; note: "integral" | "reversed";
    legend: "curve" | "positive" | "negative" | "point-a" | "point-b"; section: never; action: never;
};

const METHOD_SHORT_KEYS = {
    left: "integral_method_short_left",
    right: "integral_method_short_right",
    midpoint: "integral_method_short_midpoint",
    trapezoid: "integral_method_short_trapezoid",
} as const satisfies Record<SumMethod, string>;
const METHOD_KEYS = {
    left: "integral_method_left",
    right: "integral_method_right",
    midpoint: "integral_method_midpoint",
    trapezoid: "integral_method_trapezoid",
} as const satisfies Record<SumMethod, string>;

/** Sums and integrals show four decimals so that the lesson's 2.6268 and 2.6667 can be read off. */
const PRECISE = 4;

const METHOD_LABELS: Readonly<Record<SumMethod, () => string>> = {
    left: () => t("integral_method_left"),
    right: () => t("integral_method_right"),
    midpoint: () => t("integral_method_midpoint"),
    trapezoid: () => t("integral_method_trapezoid"),
};


/**
 * Each function has its own view, which becomes the board view whenever the function choice changes (inspector select or
 * the `integral-function` lesson action) and for the default scene; a view stored in a preset still wins on import. This
 * deliberately differs from the derivative route, which keeps the view: x^2 on [0, 2] needs a small view (y up to about 4), while
 * the lesson's last step needs sin on [0, 2*pi], and one shared view would show x^2 up to 56 (or the rectangles tiny). The boxes have
 * about the aspect of the workspace (1.27): JSXGraph fits a box of another aspect to its shorter side, which showed too little.
 */
const FUNCTION_VIEWS: Readonly<Record<FunctionId, BoundingBox>> = {
    square: [-1.5, 4.5, 5.5, -1],
    sin: [-0.8, 3.1, 7.1, -3.1],
    exp: [-3, 8.5, 9, -1],
};

/**
 * Riemann sums and the exact definite integral of x^2, sin x or e^x. The bounds a and b are points on the x-axis (dragging
 * keeps y = 0 and rounds x to 0.01); the sum uses n subintervals with the left, right, midpoint or trapezoid rule. The shapes
 * (rectangles, or trapezoids for the trapezoid rule) are drawn as exactly two filled curves, one for the parts above and
 * one for the parts below the x-axis, whose point lists are rebuilt on every update; the object count therefore does not
 * depend on n or on the method. The model is `{fn, a, b, n, method}`; the mathematics comes from `src/analysis/riemann`
 * and the function catalog `src/analysis/functions`. Changing the function keeps the bounds, n and the method but resets the view to the function's own (see FUNCTION_VIEWS).
 */
export class DefiniteIntegralGraph extends BaseFunctionGraph<RiemannModel> {
    private pointA?: JXG.Point;
    private pointB?: JXG.Point;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();
    private readonly fillOf = this.modelCache((model: RiemannModel) => fillData(catalogFunction(model.fn), model.a, model.b, model.n, model.method));

    override presetCollection() {
        return functionPresetCollections["definite-integral"];
    }

    protected defaultModel(): RiemannModel {
        return {...DEFAULT_RIEMANN_MODEL};
    }

    /** The view of the current function; the default model (x^2) gives the default scene's view. */
    protected defaultBoundingBox(): BoundingBox {
        return [...FUNCTION_VIEWS[this.model.fn]];
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    private currentFunction() {
        return catalogFunction(this.model.fn);
    }

    protected setFunction(value: unknown): void {
        if (!isFunctionId(value)) throw new DomainError(choiceRejected("integral_function_label", FUNCTION_IDS));
        this.commitModel({...this.model, fn: value});
        if (this.generatedObjectCount > 0) this.boardView.setIntent(FUNCTION_VIEWS[value], {keepAspectRatio: true});
    }

    protected setMethod(value: unknown): void {
        if (!isSumMethod(value)) throw new DomainError(choiceRejected("integral_method_label", SUM_METHODS));
        this.commitModel({...this.model, method: value});
    }

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        if (!isBound(value)) throw new DomainError(numberRangeRejected(which === "a" ? "integral_a_label" : "integral_b_label", BOUND_MIN, BOUND_MAX));
        this.commitModel({...this.model, [which]: value}, options);
    }

    protected setCount(value: number): void {
        if (!isSubintervalCount(value)) throw new DomainError(integerRangeRejected("integral_n_label", N_MIN, N_MAX));
        this.commitModel({...this.model, n: value});
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                a: value => this.setBound("a", value),
                b: value => this.setBound("b", value),
                n: value => this.setCount(value),
            },
            choices: {
                "integral-function": value => this.setFunction(value),
                "sum-method": value => this.setMethod(value),
            },
        };
    }

    /** A preset or file whose function differs and which carries no view of its own shows that function's view, like the choice does. */
    override importPreset(preset: Preset): void {
        const previous = this.model.fn;
        super.importPreset(preset);
        if (!preset.boardState && this.model.fn !== previous && this.generatedObjectCount > 0) {
            this.boardView.setIntent(FUNCTION_VIEWS[this.model.fn], {keepAspectRatio: true});
        }
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The drawing data for the current model, computed once per model however many curves read it. */
    private currentFill(): FillData {
        return this.fillOf(this.model);
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const fn = () => this.currentFunction();
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;

        // Layers, lowest first: the shapes above the axis, the shapes below it, the function, then the bound points.
        const fill = (color: string, part: "positive" | "negative") => {
            this.drawn.set(part, this.signedFill(color, () => this.fillOf(this.model)[part]) as unknown as JXG.GeometryElement);
        };
        fill(GraphPalette.additionalCurves[0], "positive");
        fill(GraphPalette.additionalCurves[1], "negative");
        // Values far above or below the view are left out (NaN), so the drawn path never reaches y = 56 for x^2 at x = 7.5;
        // this keeps the path's own extent, which framing tools read, close to the view. The margin is a quarter of the view
        // height on each side, much more than the sampling step, so the visible part of the curve is unchanged.
        const clipped = (x: number) => {
            const [, top, , bottom] = board.getBoundingBox();
            const margin = 0.25 * (top - bottom);
            const y = fn().value(x);
            return y > top + margin || y < bottom - margin ? NaN : y;
        };
        this.drawn.set("curve", this.own(board.create("functiongraph", [clipped], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        })));

        // The bounds slide along the x-axis: a drag keeps y = 0 and writes the rounded x to the model.
        // Their labels go below the axis, under the tick numbers, away from the graph that starts on the axis (x^2 and e^x touch it near a = 0).
        const bound = (which: "a" | "b") => this.slidingPoint({
            x: model()[which], position: () => 0, min: BOUND_MIN, max: BOUND_MAX, step: BOUND_STEP,
            attributes: {...this.styles.point.default, name: `$$${which}$$`, label: this.pointLabel("below-right", 1.6)},
            write: x => this.setBound(which, x, {syncScene: false}),
        });
        this.pointA = bound("a");
        this.pointB = bound("b");
        this.drawn.set("point-a", this.pointA);
        this.drawn.set("point-b", this.pointB);

        // The function and the two results, the most important readouts, stay on the board, top left: every catalog graph rises to the right or is small there.
        this.caption("top-left", [
            {text: () => `f(x) = ${fn().plain}`, scale: 1.2, math: true},
            {text: () => t("integral_board_values", {
                value0: formatNumber(riemannSum(fn(), model().a, model().b, model().n, model().method), language(), PRECISE),
                value1: formatNumber(exactIntegral(fn(), model().a, model().b), language(), PRECISE),
            })},
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
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {fn, a, b, n, method} = this.model;
        return <>
            <PuckOwnedGroup params={["n"]} className="inspector-group">
                <Slider customText={t("integral_n_label")} min={N_MIN} max={N_MAX} step={N_STEP} value={n}
                        onChange={next => this.ignoreOutOfDomain(() => this.setCount(Math.round(next)))}/>
            </PuckOwnedGroup>
            <PuckOwnedGroup params={["sum-method", "a", "b"]} className="inspector-group">
                <PuckOwned param="sum-method"><ChoiceSelect label={t("integral_method_label")} value={method} help={t("integral_method_help")}
                              options={SUM_METHODS.map(id => ({value: id, text: METHOD_LABELS[id]()}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setMethod(next))}/></PuckOwned>
                <PuckOwned param="a"><Slider customText={t("integral_a_label")} value={a} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/></PuckOwned>
                <PuckOwned param="b"><Slider customText={t("integral_b_label")} value={b} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/></PuckOwned>
                <p className="inspector-help">{t("integral_bounds_help")}</p>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <ChoiceSelect label={t("integral_function_label")} value={fn} help={t("integral_function_help")}
                              options={FUNCTION_IDS.map(id => ({value: id, text: `f(x) = ${catalogFunction(id).plain}`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
        </>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            a: {read: () => this.model.a, apply: (value: number) => this.setBound("a", value)},
            b: {read: () => this.model.b, apply: (value: number) => this.setBound("b", value)},
            n: {read: () => this.model.n, apply: (value: number) => this.setCount(value)},
            "sum-method": {read: () => this.model.method, apply: (value: string) => this.setMethod(value)},
        };
    }

    /** The common declaration (rows, notes, view marks) plus the count, the bounds and the sum type as board pucks and the legend of the drawn objects. */
    protected override declaration(): GraphDeclaration {
        const bound = (key: "a" | "b"): ParameterDeclaration => ({
            key, kind: "range", label: message(key === "a" ? "integral_a_name" : "integral_b_name"), symbol: key, help: message("integral_bounds_help"),
            placement: "board", min: BOUND_MIN, max: BOUND_MAX, step: BOUND_STEP, maxDecimals: 2,
        });
        return {
            ...this.commonDeclaration(),
            parameters: [
                {key: "n", kind: "count", label: message("integral_n_name"), symbol: "n", placement: "board", min: N_MIN, max: N_MAX},
                bound("a"),
                bound("b"),
                {key: "sum-method", kind: "choice", label: message("integral_method_name"), help: message("integral_method_help"), placement: "board", puck: true,
                    options: SUM_METHODS.map(id => ({value: id, label: message(METHOD_KEYS[id]), short: message(METHOD_SHORT_KEYS[id])}))},
            ],
            legend: [
                {id: "curve", label: message("integral_legend_curve"), kind: "line", object: "curve"},
                {id: "positive", label: message("integral_legend_positive"), kind: "area", object: "positive"},
                {id: "negative", label: message("integral_legend_negative"), kind: "area", object: "negative"},
                {id: "point-a", label: message("integral_legend_point_a"), kind: "point", object: "point-a"},
                {id: "point-b", label: message("integral_legend_point_b"), kind: "point", object: "point-b"},
            ],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id === "positive" || id === "negative" || id === "point-a" || id === "point-b" ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** Declared by the base (task 08): the readout rows, the notes and the plotted curve; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const {a, b, n, method} = this.model;
        const entry = this.currentFunction();
        const sum = riemannSum(entry, a, b, n, method);
        const exact = exactIntegral(entry, a, b);
        return {
            rows: [
                {id: "a", symbol: "a", value: messageNumber(a)},
                {id: "b", symbol: "b", value: messageNumber(b)},
                {id: "n", symbol: "n", value: messageNumber(n, 0)},
                {id: "h", name: message("integral_width"), value: messageNumber(subintervalWidth(a, b, n), PRECISE)},
                {id: "sum", name: message("integral_sum"), value: messageNumber(sum, PRECISE)},
                {id: "exact", name: message("integral_exact"), value: messageNumber(exact, PRECISE)},
                {id: "difference", name: message("integral_difference"), value: messageNumber(sum - exact, PRECISE)},
            ],
            notes: [
                {id: "integral", text: message("integral_note")},
                ...(a > b ? [{id: "reversed", text: message("integral_reversed_note")}] : []),
            ],
            plotted: x => entry.value(x),
            must: [{x: a, y: 0}, {x: b, y: 0}],
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default DefiniteIntegralGraph;
