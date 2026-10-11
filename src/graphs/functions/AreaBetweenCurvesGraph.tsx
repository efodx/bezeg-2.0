import React from "react";
import BaseFunctionGraph, {FunctionChoiceAction, FunctionParameterAction} from "./BaseFunctionGraph";
import {FunctionReadout} from "./FunctionReadout";
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
import {SizeContext} from "../context/SizeContext";
import {PointStyles} from "../styles/PointStyles";
import {SegmentStyles} from "../styles/SegmentStyles";
import {GraphPalette} from "../styles/GraphPalette";

/** Removes floating-point noise left by rounding to the bound step without changing meaningful digits. */
const clean = (value: number) => Math.round(value * 1e9) / 1e9 + 0;

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
        if (!isAreaMode(value)) throw new Error(`The area mode must be one of ${AREA_MODES.join(", ")}.`);
        this.commitModel({...this.model, mode: value});
    }

    protected setBound(which: "a" | "b", value: number, options: { syncScene?: boolean } = {}): void {
        if (!isBound(value)) throw new Error(`The bound ${which} must be a finite number between ${BOUND_MIN} and ${BOUND_MAX}.`);
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
        // The two results sit at the top centre, above the peak of g: within the default view neither curve passes there.
        const topCenter = (row: number) => [
            () => {
                const [left, , right] = board.getBoundingBox();
                return (left + right) / 2;
            },
            () => {
                const [, top, , bottom] = board.getBoundingBox();
                return top - (0.04 + 0.07 * row) * (top - bottom);
            },
        ];
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
                fillColor: color, fillOpacity: 0.42, strokeColor: color, strokeOpacity: 0.9, strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.35),
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
            ...SegmentStyles.default, color: GraphPalette.constructionAccent, dash: 2, highlight: false, fixed: true,
            strokeWidth: () => Math.max(1, SizeContext.strokeWidth * 0.7),
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
            this.own(board.create("point", [x, INTERSECTION_HEIGHT], {...PointStyles.fixed, name: `$$P_${index + 1}$$`, highlight: false}));
        });

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

        // Curve names and the two results stay on the board; the formulas are top right so that they clear the y-axis labels, the results top centre.
        const label = (x: number, anchorX: "left" | "middle", value: (x: number) => number, name: string, color: string) =>
            this.own(board.create("text", [x, () => value(x), name], {
                anchorX, anchorY: "bottom", fixed: true, highlight: false, fontSize: fontSize(1.2), strokeColor: color,
            }));
        label(3.95, "left", f, "f", GraphPalette.comparisonCurve);
        label(2, "middle", g, "g", GraphPalette.primaryCurve);
        this.own(board.create("text", [...topRight(0), "f(x) = (x − 2)²"], {
            anchorX: "right", anchorY: "top", fixed: true, highlight: false, fontSize: fontSize(1.1), strokeColor: GraphPalette.comparisonCurve,
        }));
        this.own(board.create("text", [...topRight(1), "g(x) = 3 − (x − 2)²"], {
            anchorX: "right", anchorY: "top", fixed: true, highlight: false, fontSize: fontSize(1.1), strokeColor: GraphPalette.primaryCurve,
        }));
        const result = (row: number, key: "area_board_signed" | "area_board_area", value: () => number) =>
            this.own(board.create("text", [...topCenter(row), () => t(key, {value0: formatNumber(value(), language(), PRECISE)})], {
                anchorX: "middle", anchorY: "top", fixed: true, highlight: false, fontSize: fontSize(1), strokeColor: GraphPalette.label,
            }));
        result(0, "area_board_signed", () => signedBetween(model().a, model().b));
        result(1, "area_board_area", () => unsignedBetween(model().a, model().b));
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
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={t("area_note")}/>;
    }
}

export default AreaBetweenCurvesGraph;
