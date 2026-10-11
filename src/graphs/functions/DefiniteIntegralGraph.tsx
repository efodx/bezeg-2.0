import React from "react";
import BaseFunctionGraph, {FunctionChoiceAction, FunctionParameterAction} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
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
import {UnsupportedLessonActionError} from "../../learning/model";
import {SizeContext} from "../context/SizeContext";
import {PointStyles} from "../styles/PointStyles";
import {GraphPalette} from "../styles/GraphPalette";

/** Removes floating-point noise left by rounding to the bound step without changing meaningful digits. */
const clean = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

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
        if (!isFunctionId(value)) throw new Error(`The function must be one of ${FUNCTION_IDS.join(", ")}.`);
        this.commitModel({...this.model, fn: value});
        if (this.generatedObjectCount > 0) this.board.setBoundingBox([...FUNCTION_VIEWS[value]], true);
    }

    protected setMethod(value: unknown): void {
        if (!isSumMethod(value)) throw new Error(`The sum method must be one of ${SUM_METHODS.join(", ")}.`);
        this.commitModel({...this.model, method: value});
    }

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        if (!isBound(value)) throw new Error(`The bound ${which} must be a finite number between ${BOUND_MIN} and ${BOUND_MAX}.`);
        this.commitModel({...this.model, [which]: value}, options);
    }

    protected setCount(value: number): void {
        if (!isSubintervalCount(value)) throw new Error(`The number of subintervals n must be an integer from ${N_MIN} to ${N_MAX}.`);
        this.commitModel({...this.model, n: value});
    }

    protected override applyFunctionParameter(action: FunctionParameterAction): void {
        switch (action.name) {
            case "a":
                return this.setBound("a", action.value);
            case "b":
                return this.setBound("b", action.value);
            case "n":
                return this.setCount(action.value);
            default:
                throw new UnsupportedLessonActionError(action);
        }
    }

    protected override applyFunctionChoice(action: FunctionChoiceAction): void {
        if (action.name === "integral-function") {
            this.setFunction(action.value);
            return;
        }
        if (action.name === "sum-method") {
            this.setMethod(action.value);
            return;
        }
        throw new UnsupportedLessonActionError(action);
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
        const fontSize = (scale: number) => () => SizeContext.fontSize * scale;
        const strokeWidth = () => SizeContext.strokeWidth;
        const topRight = (row: number) => [
            () => {
                const [left, , right] = board.getBoundingBox();
                return right - 0.04 * (right - left);
            },
            () => {
                const [, top, , bottom] = board.getBoundingBox();
                return top - (0.06 + 0.07 * row) * (top - bottom);
            },
        ];

        // Layers, lowest first: the shapes above the axis, the shapes below it, the function, then the bound points.
        const fill = (color: string, part: "positive" | "negative") => {
            const curve = this.own(board.create("curve", [[], []], {
                fillColor: color, fillOpacity: 0.42, strokeColor: color, strokeOpacity: 0.9, strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.35),
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
        const bound = (which: "a" | "b") => {
            const point = this.own(board.create("point", [model()[which], 0], {...PointStyles.default, name: `$$${which}$$`})) as JXG.Point;
            point.on("drag", () => {
                const x = Math.min(BOUND_MAX, Math.max(BOUND_MIN, Math.round(point.X() / BOUND_STEP) * BOUND_STEP + 0));
                if (!Number.isFinite(x)) return;
                const rounded = clean(x);
                this.setBound(which, rounded, {syncScene: false});
                point.moveTo([rounded, 0]);
            });
            return point;
        };
        this.pointA = bound("a");
        this.pointB = bound("b");

        // The function and the two results, the most important readouts, stay on the board, top right so that they clear the y-axis labels.
        this.own(board.create("text", [...topRight(0), () => `f(x) = ${fn().plain}`], {
            anchorX: "right", anchorY: "top", fixed: true, highlight: false, fontSize: fontSize(1.2), strokeColor: GraphPalette.label,
        }));
        this.own(board.create("text", [...topRight(1), () => t("integral_board_values", {
            value0: formatNumber(riemannSum(fn(), model().a, model().b, model().n, model().method), language(), PRECISE),
            value1: formatNumber(exactIntegral(fn(), model().a, model().b), language(), PRECISE),
        })], {
            anchorX: "right", anchorY: "top", fixed: true, highlight: false, fontSize: fontSize(1), strokeColor: GraphPalette.label,
        }));
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

    private ignoreOutOfDomain(action: () => void) {
        try {
            action();
        } catch {
            // The controls only offer values inside the domain.
        }
    }

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
                <Slider customText={t("integral_n_label")} min={N_MIN} max={N_MAX} step={N_STEP} fixedValue={n}
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
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={t("integral_note")}/>;
    }
}

export default DefiniteIntegralGraph;
