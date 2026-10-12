import React from "react";
import BaseFunctionGraph, {BOARD_TEXT_STYLE, DomainError, FunctionChoiceAction, FunctionParameterAction, mathTextHtml} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {
    AREA_MODES, AreaFill, areaFill, AreaMode, BOUND_MAX, BOUND_MIN, BOUND_STEP, f, g, INTERSECTION_HEIGHT, INTERSECTIONS, integralF, integralG,
    isAreaMode, isBound, shadedQuantity, signedBetween, unsignedBetween,
} from "../../analysis/areaBetween";
import {AreaBetweenModel, DEFAULT_AREA_BETWEEN_MODEL, parseAreaBetweenModel} from "../../analysis/areaBetweenModel";
import {UnsupportedLessonActionError} from "../../learning/model";
import {GraphPalette} from "../styles/GraphPalette";

/** Integrals and areas show four decimals so that the lesson's 4.8990, 4.8990 and 8.4646 can be read off. */
const PRECISE = 4;

const MODE_LABELS: Readonly<Record<AreaMode, () => string>> = {
    "under-f": () => t("area_mode_under_f"),
    "under-g": () => t("area_mode_under_g"),
    "between": () => t("area_mode_between"),
};

const SHADED_LABELS: Readonly<Record<AreaMode, () => string>> = {
    "under-f": () => t("area_shaded_under_f"),
    "under-g": () => t("area_shaded_under_g"),
    "between": () => t("area_shaded_between"),
};

/** A JSXGraph curve built from point lists whose data is rebuilt in `updateDataArray` (one object for any number of shapes). */
interface FillCurve {
    updateDataArray: () => void;
    dataX: number[];
    dataY: number[];
}

type BoundingBox = [left: number, top: number, right: number, bottom: number];

/**
 * f and g meet at (0.78, 1.5) and (3.22, 1.5); f reaches 4 at x = 0, g reaches -1 there. The box shows both curves from about
 * x = -0.5 to x = 4.5 around both intersections, and has about the aspect of the workspace (1.27), as JSXGraph fits a box of
 * another aspect to its shorter side.
 */
const DEFAULT_VIEW: BoundingBox = [-1.3, 4.2, 5.3, -1];

/** The formulas are written on the board only from this board width on; below it the legend in the inspector holds them. */
const WIDE_BOARD = 620;

/**
 * The area between f(x) = (x - 2)^2 and g(x) = 3 - (x - 2)^2 over bounds a and b that are points on the x-axis (dragging
 * keeps y = 0 and rounds x to 0.01). The mode chooses what is shaded: the region between f and the x-axis, between g and the
 * x-axis, or between the two curves. The shading is exactly two filled curves, one per sign (see `areaFill`), whose point
 * lists are rebuilt on every update; the object count therefore does not depend on the mode or the bounds. The model is
 * `{a, b, mode}`; the mathematics comes from `src/analysis/areaBetween`.
 */
export class AreaBetweenCurvesGraph extends BaseFunctionGraph<AreaBetweenModel> {
    private pointA?: JXG.Point;
    private pointB?: JXG.Point;
    private fillCache?: { model: AreaBetweenModel; data: AreaFill };

    override presets(): string {
        return "area-between-curves";
    }

    protected defaultModel(): AreaBetweenModel {
        return {...DEFAULT_AREA_BETWEEN_MODEL};
    }

    protected parseModel(data: unknown): AreaBetweenModel | undefined {
        return parseAreaBetweenModel(data);
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...DEFAULT_VIEW];
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ------------------------------

    protected setMode(value: unknown): void {
        if (!isAreaMode(value)) throw new DomainError(`The area mode must be one of ${AREA_MODES.join(", ")}.`);
        this.commitModel({...this.model, mode: value});
    }

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        if (!isBound(value)) throw new DomainError(`The bound ${which} must be a finite number between ${BOUND_MIN} and ${BOUND_MAX}.`);
        this.commitModel({...this.model, [which]: value}, options);
    }

    protected override applyFunctionParameter(action: FunctionParameterAction): void {
        switch (action.name) {
            case "a":
                return this.setBound("a", action.value);
            case "b":
                return this.setBound("b", action.value);
            default:
                throw new UnsupportedLessonActionError(action);
        }
    }

    protected override applyFunctionChoice(action: FunctionChoiceAction): void {
        if (action.name === "area-mode") {
            this.setMode(action.value);
            return;
        }
        throw new UnsupportedLessonActionError(action);
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The drawing data for the current model, computed once per model however many curves read it. */
    private currentFill(): AreaFill {
        const model = this.model;
        if (this.fillCache?.model !== model) this.fillCache = {model, data: areaFill(model.mode, model.a, model.b)};
        return this.fillCache.data;
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;
        // Values far above or below the view are left out or clamped (a quarter of the view height beyond it, much more than
        // the sampling step), so the drawn paths never reach f(-1) = 9; this keeps their extent, which framing tools read, close to the view.
        const limits = () => {
            const [, top, , bottom] = board.getBoundingBox();
            const margin = 0.25 * (top - bottom);
            return {high: top + margin, low: bottom - margin};
        };

        // Layers, lowest first: the shading, the dashed bound lines, the curves, the intersection and bound points.
        const fill = (color: string, part: "positive" | "negative") => {
            const curve = this.own(board.create("curve", [[], []], {
                fillColor: color, fillOpacity: 0.42, strokeColor: color, strokeOpacity: 0.9, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.35),
                highlight: false, fixed: true,
            })) as unknown as FillCurve;
            curve.updateDataArray = () => {
                const data = this.currentFill()[part];
                const {high, low} = limits();
                curve.dataX = data.x;
                curve.dataY = data.y.map(y => Math.min(high, Math.max(low, y)));
            };
        };
        fill(GraphPalette.additionalCurves[0], "positive");
        fill(GraphPalette.additionalCurves[1], "negative");

        // The dashed line at a bound spans what the mode shades there: from the axis to the curve, or from f to g.
        const boundLine = (which: "a" | "b") => this.own(board.create("segment", [
            [() => model()[which], () => model().mode === "between" ? f(model()[which]) : 0],
            [() => model()[which], () => model().mode === "under-f" ? f(model()[which]) : g(model()[which])],
        ], {
            ...this.styles.segment.default, color: GraphPalette.constructionAccent, dash: 2, highlight: false, fixed: true,
            strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.7),
        }));
        boundLine("a");
        boundLine("b");

        const curve = (value: (x: number) => number, color: string) => this.own(board.create("functiongraph", [(x: number) => {
            const {high, low} = limits();
            const y = value(x);
            return y > high || y < low ? NaN : y;
        }], {strokeColor: color, highlight: false, fixed: true, strokeWidth}));
        curve(f, GraphPalette.comparisonCurve);
        curve(g, GraphPalette.primaryCurve);

        // The intersections are fixed points of the figure, not of the model.
        INTERSECTIONS.forEach((x, index) => {
            // The curves cross there like an X: the free wedge is outside (left of P1, right of P2), the shaded one inside.
            this.own(board.create("point", [x, INTERSECTION_HEIGHT], {
                ...this.styles.point.fixed, name: `$$P_${index + 1}$$`, highlight: false, label: this.pointLabel(index === 0 ? "left" : "right", 1.4),
            }));
        });

        // The bounds slide along the x-axis: a drag keeps y = 0 and writes the rounded x to the model.
        const bound = (which: "a" | "b") => this.slidingPoint({
            x: model()[which], position: () => 0, min: BOUND_MIN, max: BOUND_MAX, step: BOUND_STEP,
            attributes: {...this.styles.point.default, name: `$$${which}$$`, label: this.pointLabel("below-right", 1.6)},
            write: x => this.setBound(which, x, {syncScene: false}),
        });
        this.pointA = bound("a");
        this.pointB = bound("b");

        // Curve names stay on the board, each on the outside of its curve (below-right of the rising branch of f, right of the falling branch of g).
        const label = (x: number, y: number, anchorX: "left" | "middle", anchorY: "top" | "bottom", name: string, color: string) =>
            this.own(board.create("text", [x, y, mathTextHtml(name)], {
                anchorX, anchorY, fixed: true, highlight: false, parse: false, fontSize: () => this.displaySettings.fontSize * 1.2, strokeColor: color,
                cssStyle: BOARD_TEXT_STYLE, highlightCssStyle: BOARD_TEXT_STYLE,
            }));
        label(4.08, f(3.95), "left", "top", "f", GraphPalette.comparisonCurve);
        label(3.72, g(3.6), "left", "bottom", "g", GraphPalette.primaryCurve);
        // The two results are the caption, at the top centre above the peak of g; at small widths only they remain (the formulas are in the inspector legend).
        this.caption("top-center", [
            {text: () => t("area_board_signed", {value0: formatNumber(signedBetween(model().a, model().b), language(), PRECISE)}), scale: 1.1},
            {text: () => t("area_board_area", {value0: formatNumber(unsignedBetween(model().a, model().b), language(), PRECISE)})},
            {text: () => "f(x) = (x − 2)²", color: GraphPalette.comparisonCurve, minBoardWidth: WIDE_BOARD, scale: 0.9, math: true},
            {text: () => "g(x) = 3 − (x − 2)²", color: GraphPalette.primaryCurve, minBoardWidth: WIDE_BOARD, scale: 0.9, math: true},
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
        const {a, b, mode} = this.state;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("area_mode_label")} value={mode} help={t("area_mode_help")}
                              options={AREA_MODES.map(id => ({value: id, text: MODE_LABELS[id]()}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setMode(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("area_a_label")} value={a} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/>
                <NumberInput label={t("area_b_label")} value={b} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/>
                <p className="inspector-help">{t("area_bounds_help")}</p>
            </div>
        </>;
    }

    protected renderReadout(): React.ReactNode {
        const {a, b, mode} = this.state;
        const language = currentLanguage();
        const number = (value: number, decimals = 2) => formatNumber(value, language, decimals);
        const rows = [
            {id: "a", label: "a", value: number(a)},
            {id: "b", label: "b", value: number(b)},
            {id: "int-f", label: "∫ f(x) dx", value: number(integralF(a, b), PRECISE)},
            {id: "int-g", label: "∫ g(x) dx", value: number(integralG(a, b), PRECISE)},
            {id: "signed", label: t("area_signed"), value: number(signedBetween(a, b), PRECISE)},
            {id: "unsigned", label: t("area_unsigned"), value: number(unsignedBetween(a, b), PRECISE)},
            {id: "shaded", label: SHADED_LABELS[mode](), value: number(shadedQuantity(mode, a, b), PRECISE)},
        ];
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={a > b ? [t("area_note"), t("area_reversed_note")] : t("area_note")}/>;
    }

    protected override renderLegend(): React.ReactNode {
        const {mode} = this.state;
        const legend = mode === "between"
            ? [
                {id: "positive", color: GraphPalette.additionalCurves[0], label: t("area_legend_g_top")},
                {id: "negative", color: GraphPalette.additionalCurves[1], label: t("area_legend_f_top")},
            ]
            : [
                {id: "positive", color: GraphPalette.additionalCurves[0], label: t("area_legend_above_axis")},
                {id: "negative", color: GraphPalette.additionalCurves[1], label: t("area_legend_below_axis")},
            ];
        return <FunctionLegend items={[
            {id: "f", kind: "line", color: GraphPalette.comparisonCurve, label: "f(x) = (x − 2)²"},
            {id: "g", kind: "line", color: GraphPalette.primaryCurve, label: "g(x) = 3 − (x − 2)²"},
            ...legend,
        ]}/>;
    }
}

export default AreaBetweenCurvesGraph;
