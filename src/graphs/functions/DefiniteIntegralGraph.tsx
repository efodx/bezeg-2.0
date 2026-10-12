import React from "react";
import BaseFunctionGraph, {DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {catalogFunction, FUNCTION_IDS, FunctionId, isFunctionId} from "../../analysis/functions";
import {
    BOUND_MAX, BOUND_MIN, BOUND_STEP, exactIntegral, FillData, fillData, isBound, isSubintervalCount, isSumMethod, N_MAX, N_MIN, N_STEP,
    riemannSum, SUM_METHODS, SumMethod, subintervalWidth,
} from "../../analysis/riemann";
import {DEFAULT_RIEMANN_MODEL, parseRiemannModel, RiemannModel} from "../../analysis/riemannModel";
import {Preset} from "../base/presets/Presets";
import {GraphPalette} from "../styles/GraphPalette";

/** Sums and integrals show four decimals so that the lesson's 2.6268 and 2.6667 can be read off. */
const PRECISE = 4;

const METHOD_LABELS: Readonly<Record<SumMethod, () => string>> = {
    left: () => t("integral_method_left"),
    right: () => t("integral_method_right"),
    midpoint: () => t("integral_method_midpoint"),
    trapezoid: () => t("integral_method_trapezoid"),
};

/** A JSXGraph curve built from point lists whose data is rebuilt in `updateDataArray` (one object for any number of shapes). */
interface FillCurve {
    updateDataArray: () => void;
    dataX: number[];
    dataY: number[];
}

type BoundingBox = [left: number, top: number, right: number, bottom: number];

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
    private fillCache?: { model: RiemannModel; data: FillData };

    override presets(): string {
        return "definite-integral";
    }

    protected defaultModel(): RiemannModel {
        return {...DEFAULT_RIEMANN_MODEL};
    }

    protected parseModel(data: unknown): RiemannModel | undefined {
        return parseRiemannModel(data);
    }

    /** The view of the current function; the default model (x^2) gives the default scene's view. */
    protected defaultBoundingBox(): BoundingBox {
        return [...FUNCTION_VIEWS[this.model.fn]];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    private currentFunction() {
        return catalogFunction(this.model.fn);
    }

    protected setFunction(value: unknown): void {
        if (!isFunctionId(value)) throw new DomainError(`The function must be one of ${FUNCTION_IDS.join(", ")}.`);
        this.commitModel({...this.model, fn: value});
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...FUNCTION_VIEWS[value]], true);
    }

    protected setMethod(value: unknown): void {
        if (!isSumMethod(value)) throw new DomainError(`The sum method must be one of ${SUM_METHODS.join(", ")}.`);
        this.commitModel({...this.model, method: value});
    }

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        if (!isBound(value)) throw new DomainError(`The bound ${which} must be a finite number between ${BOUND_MIN} and ${BOUND_MAX}.`);
        this.commitModel({...this.model, [which]: value}, options);
    }

    protected setCount(value: number): void {
        if (!isSubintervalCount(value)) throw new DomainError(`The number of subintervals n must be an integer from ${N_MIN} to ${N_MAX}.`);
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
            this.board.setBoundingBox([...FUNCTION_VIEWS[this.model.fn]], true);
        }
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The drawing data for the current model, computed once per model however many curves read it. */
    private currentFill(): FillData {
        const model = this.model;
        if (this.fillCache?.model !== model) {
            this.fillCache = {model, data: fillData(catalogFunction(model.fn), model.a, model.b, model.n, model.method)};
        }
        return this.fillCache.data;
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const fn = () => this.currentFunction();
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;

        // Layers, lowest first: the shapes above the axis, the shapes below it, the function, then the bound points.
        const fill = (color: string, part: "positive" | "negative") => {
            const curve = this.own(board.create("curve", [[], []], {
                fillColor: color, fillOpacity: 0.42, strokeColor: color, strokeOpacity: 0.9, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.35),
                highlight: false, fixed: true,
            })) as unknown as FillCurve;
            curve.updateDataArray = () => {
                const data = this.currentFill()[part];
                curve.dataX = data.x;
                curve.dataY = data.y;
            };
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
        this.own(board.create("functiongraph", [clipped], {
            strokeColor: GraphPalette.comparisonCurve, highlight: false, fixed: true, strokeWidth,
        }));

        // The bounds slide along the x-axis: a drag keeps y = 0 and writes the rounded x to the model.
        // Their labels go below the axis, under the tick numbers, away from the graph that starts on the axis (x^2 and e^x touch it near a = 0).
        const bound = (which: "a" | "b") => this.slidingPoint({
            x: model()[which], position: () => 0, min: BOUND_MIN, max: BOUND_MAX, step: BOUND_STEP,
            attributes: {...this.styles.point.default, name: `$$${which}$$`, label: this.pointLabel("below-right", 1.6)},
            write: x => this.setBound(which, x, {syncScene: false}),
        });
        this.pointA = bound("a");
        this.pointB = bound("b");

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
        this.fillCache = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {fn, a, b, n, method} = this.state;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("integral_function_label")} value={fn} help={t("integral_function_help")}
                              options={FUNCTION_IDS.map(id => ({value: id, text: `f(x) = ${catalogFunction(id).plain}`}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("integral_a_label")} value={a} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/>
                <NumberInput label={t("integral_b_label")} value={b} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/>
                <p className="inspector-help">{t("integral_bounds_help")}</p>
            </div>
            <div className="inspector-group">
                <Slider customText={t("integral_n_label")} min={N_MIN} max={N_MAX} step={N_STEP} value={n}
                        help={t("integral_n_help")} formatValue={value => String(Math.round(value))}
                        onChange={next => this.ignoreOutOfDomain(() => this.setCount(Math.round(next)))}/>
                <ChoiceSelect label={t("integral_method_label")} value={method} help={t("integral_method_help")}
                              options={SUM_METHODS.map(id => ({value: id, text: METHOD_LABELS[id]()}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setMethod(next))}/>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const {fn, a, b, n, method} = this.state;
        const language = currentLanguage();
        const entry = catalogFunction(fn);
        const number = (value: number, decimals = 2) => formatNumber(value, language, decimals);
        const sum = riemannSum(entry, a, b, n, method);
        const exact = exactIntegral(entry, a, b);
        const rows = [
            {id: "a", label: "a", value: number(a)},
            {id: "b", label: "b", value: number(b)},
            {id: "n", label: "n", value: number(n, 0)},
            {id: "h", label: t("integral_width"), value: number(subintervalWidth(a, b, n), PRECISE)},
            {id: "sum", label: t("integral_sum"), value: number(sum, PRECISE)},
            {id: "exact", label: t("integral_exact"), value: number(exact, PRECISE)},
            {id: "difference", label: t("integral_difference"), value: number(sum - exact, PRECISE)},
        ];
        const notes = a > b ? [t("integral_note"), t("integral_reversed_note")] : t("integral_note");
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={notes}/>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "positive", color: GraphPalette.additionalCurves[0], label: t("integral_legend_positive")},
            {id: "negative", color: GraphPalette.additionalCurves[1], label: t("integral_legend_negative")},
        ]}/>;
    }
}

export default DefiniteIntegralGraph;
