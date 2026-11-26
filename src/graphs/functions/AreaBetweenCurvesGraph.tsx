import React from "react";
import BaseFunctionGraph, {BoundingBox, BOARD_TEXT_STYLE, DomainError, mathTextHtml, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import Slider from "../../inputs/Slider";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, messageNumber, t} from "../../localization";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {formatNumber} from "../../analysis/format";
import {
    AREA_MODES, AreaFill, areaFill, AreaMode, BOUND_MAX, BOUND_MIN, BOUND_STEP, f, g, INTERSECTION_HEIGHT, INTERSECTIONS, integralF, integralG,
    isAreaMode, isBound, shadedQuantity, signedBetween, unsignedBetween,
} from "../../analysis/areaBetween";
import {AreaBetweenModel, DEFAULT_AREA_BETWEEN_MODEL} from "../../analysis/areaBetweenModel";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {choiceRejected, numberRangeRejected} from "./functionSetterMessages";

/** The ids of the area declaration: the bounds and the shaded quantity are board pucks; the two curves and the two fills are the legend. */
export type AreaBetweenIds = {
    param: "a" | "b" | "area-mode";
    row: "a" | "b" | "int-f" | "int-g" | "signed" | "unsigned" | "shaded"; note: "intersections" | "reversed";
    legend: "f" | "g" | "positive" | "negative"; section: never; action: never;
};

/** Integrals and areas show four decimals so that the lesson's 4.8990, 4.8990 and 8.4646 can be read off. */
const PRECISE = 4;

const MODE_KEYS = {
    "under-f": "area_mode_under_f", "under-g": "area_mode_under_g", "between": "area_mode_between",
} as const satisfies Record<AreaMode, string>;

/** The segment text of a mode on the choice puck. */
const MODE_SHORT_KEYS = {
    "under-f": "area_mode_short_under_f", "under-g": "area_mode_short_under_g", "between": "area_mode_short_between",
} as const satisfies Record<AreaMode, string>;

const SHADED_KEYS = {
    "under-f": "area_shaded_under_f", "under-g": "area_shaded_under_g", "between": "area_shaded_between",
} as const satisfies Record<AreaMode, string>;

const MODE_LABELS: Readonly<Record<AreaMode, () => string>> = {
    "under-f": () => t(MODE_KEYS["under-f"]),
    "under-g": () => t(MODE_KEYS["under-g"]),
    "between": () => t(MODE_KEYS.between),
};


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
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();
    private readonly fillOf = this.modelCache((model: AreaBetweenModel) => areaFill(model.mode, model.a, model.b));

    override presetCollection() {
        return functionPresetCollections["area-between-curves"];
    }

    protected defaultModel(): AreaBetweenModel {
        return {...DEFAULT_AREA_BETWEEN_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...DEFAULT_VIEW];
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    protected setMode(value: unknown): void {
        if (!isAreaMode(value)) throw new DomainError(choiceRejected("area_mode_label", AREA_MODES));
        this.commitModel({...this.model, mode: value});
    }

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        if (!isBound(value)) throw new DomainError(numberRangeRejected(which === "a" ? "area_a_label" : "area_b_label", BOUND_MIN, BOUND_MAX));
        this.commitModel({...this.model, [which]: value}, options);
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {
                a: value => this.setBound("a", value),
                b: value => this.setBound("b", value),
            },
            choices: {"area-mode": value => this.setMode(value)},
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The drawing data for the current model, computed once per model however many curves read it. */
    private currentFill(): AreaFill {
        return this.fillOf(this.model);
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
            this.drawn.set(part, this.signedFill(color, () => {
                const data = this.currentFill()[part];
                const {high, low} = limits();
                return {x: data.x, y: data.y.map(y => Math.min(high, Math.max(low, y)))};
            }) as unknown as JXG.GeometryElement);
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

        // JSXGraph 1.13 enabled RDP smoothing by default; retain the pre-upgrade samples across Preset round trips.
        const curve = (id: "f" | "g", value: (x: number) => number, color: string) => this.drawn.set(id, this.own(board.create("functiongraph", [(x: number) => {
            const {high, low} = limits();
            const y = value(x);
            return y > high || y < low ? NaN : y;
        }], {strokeColor: color, highlight: false, fixed: true, strokeWidth, RDPsmoothing: false})));
        curve("f", f, GraphPalette.comparisonCurve);
        curve("g", g, GraphPalette.primaryCurve);

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
        this.drawn.clear();
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {a, b, mode} = this.model;
        return <>
            <PuckOwnedGroup params={["a", "b"]} className="inspector-group">
                <PuckOwned param="a"><Slider customText={t("area_a_label")} value={a} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("a", next))}/></PuckOwned>
                <PuckOwned param="b"><Slider customText={t("area_b_label")} value={b} min={BOUND_MIN} max={BOUND_MAX} step={BOUND_STEP}
                             onChange={next => this.ignoreOutOfDomain(() => this.setBound("b", next))}/></PuckOwned>
                <p className="inspector-help">{t("area_bounds_help")}</p>
            </PuckOwnedGroup>
            <PuckOwnedGroup params={["area-mode"]} className="inspector-group">
                <ChoiceSelect label={t("area_mode_label")} value={mode} help={t("area_mode_help")}
                              options={AREA_MODES.map(id => ({value: id, text: MODE_LABELS[id]()}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setMode(next))}/>
            </PuckOwnedGroup>
        </>;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            a: {read: () => this.model.a, apply: (value: number) => this.setBound("a", value)},
            b: {read: () => this.model.b, apply: (value: number) => this.setBound("b", value)},
            "area-mode": {read: () => this.model.mode, apply: (value: unknown) => this.setMode(value)},
        };
    }

    /** The common declaration (rows, notes, view marks) plus the bounds and the shaded quantity as board pucks and the legend of the drawn objects. */
    protected override declaration(): GraphDeclaration {
        const {mode} = this.model;
        const bound = (key: "a" | "b") => ({
            key, kind: "range" as const, label: message(key === "a" ? "area_a_name" : "area_b_name"), symbol: key, help: message("area_bounds_help"),
            placement: "board" as const, min: BOUND_MIN, max: BOUND_MAX, step: BOUND_STEP, maxDecimals: 2,
        });
        const fills = mode === "between"
            ? [message("area_legend_g_top"), message("area_legend_f_top")]
            : [message("area_legend_above_axis"), message("area_legend_below_axis")];
        return {
            ...this.commonDeclaration(),
            parameters: [
                bound("a"),
                bound("b"),
                {key: "area-mode", kind: "choice", label: message("area_mode_label"), help: message("area_mode_help"), placement: "board", puck: true,
                    options: AREA_MODES.map(id => ({
                        value: id, label: message(MODE_KEYS[id]), short: message(MODE_SHORT_KEYS[id]),
                    }))},
            ],
            legend: [
                {id: "f", label: message("area_legend_f"), kind: "line", object: "f"},
                {id: "g", label: message("area_legend_g"), kind: "line", object: "g"},
                {id: "positive", label: fills[0], kind: "area", object: "positive"},
                {id: "negative", label: fills[1], kind: "area", object: "negative"},
            ],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        const colorProperty = id === "positive" || id === "negative" ? "fillcolor" : "strokecolor";
        return {color: String(element.evalVisProp(colorProperty)), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** Declared by the base (task 08): the readout rows, the notes and the plotted curves; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const {a, b, mode} = this.model;
        return {
            rows: [
                {id: "a", symbol: "a", value: messageNumber(a)},
                {id: "b", symbol: "b", value: messageNumber(b)},
                {id: "int-f", name: message("area_int_f"), value: messageNumber(integralF(a, b), PRECISE)},
                {id: "int-g", name: message("area_int_g"), value: messageNumber(integralG(a, b), PRECISE)},
                {id: "signed", name: message("area_signed"), value: messageNumber(signedBetween(a, b), PRECISE)},
                {id: "unsigned", name: message("area_unsigned"), value: messageNumber(unsignedBetween(a, b), PRECISE)},
                {id: "shaded", name: message(SHADED_KEYS[mode]), value: messageNumber(shadedQuantity(mode, a, b), PRECISE)},
            ],
            notes: [
                {id: "intersections", text: message("area_note")},
                ...(a > b ? [{id: "reversed", text: message("area_reversed_note")}] : []),
            ],
            plotted: [f, g],
            must: [{x: a, y: 0}, {x: b, y: 0}, ...INTERSECTIONS.map(x => ({x, y: INTERSECTION_HEIGHT}))],
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default AreaBetweenCurvesGraph;
