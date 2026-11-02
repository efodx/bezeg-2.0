import React, {useRef} from "react";
import BaseFunctionGraph, {BoundingBox, cleanNumber, COMPACT_BOARD_WIDTH, DomainError, FillCurve} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {CountSetter} from "../../inputs/CountSetter";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {PointListInput} from "../../inputs/PointListInput";
import Slider from "../../inputs/Slider";
import {currentLanguage, t, useT} from "../../localization";
import {formatLineEquation} from "../../analysis/format";
import {evaluatePolynomial} from "../../analysis/leastSquares";
import {
    addLsqPoint, changeLsqDegree, DEFAULT_LEAST_SQUARES_MODEL, leastSquaresView, LeastSquaresEdit, LeastSquaresModel, LeastSquaresView,
    LSQ_COORDINATE_LIMIT, LSQ_DEGREE_MIN, LSQ_DRAG_STEP, LSQ_INTERCEPT_LIMIT, LSQ_POINTS_MAX, LSQ_POINTS_MIN,
    LSQ_SLOPE_LIMIT, lsqDegreeMax, moveLsqPoint, normalEquations, removeLsqPoint, setLsqLine,
} from "../../analysis/leastSquaresModel";
import {
    leastSquaresCoefficient, leastSquaresEditMessage, leastSquaresNumber, leastSquaresReason, normalEquationsLatex, polynomialText,
} from "./leastSquaresMessages";
import {useTypesetMath} from "../../learning/useTypesetMath";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** The default view (left, top, right, bottom): shows the data, the fits up to degree 3 and the outlier (3, 8) of the sensitivity step. */
const DEFAULT_VIEW: BoundingBox = [-1.5, 9, 5.5, -2];

/**
 * Least squares (lesson I4): data points that can be dragged and typed, the least-squares polynomial of a chosen degree (or a
 * manual line) drawn as y = p(x), the vertical residuals, optional squares on them and the sum of squares. The model is
 * `{points, degree, manualLine, slope, intercept, showSquares, showNormalEquations}` (`src/analysis/leastSquaresModel`); every fit
 * comes from the kernel `leastSquares` (QR). The normal equations are only displayed.
 *
 * It extends `BaseFunctionGraph` (the model, Preset, Reset and language plumbing are the same as the other function graphs); the
 * draggable points are plain JSXGraph points owned like the sliding points of the base, written to the model on `drag`.
 */
export class LeastSquaresGraph extends BaseFunctionGraph<LeastSquaresModel> {
    protected pointObjects: JXG.Point[] = [];

    override presetCollection() {
        return functionPresetCollections["interp-least-squares"];
    }

    protected defaultModel(): LeastSquaresModel {
        return {...DEFAULT_LEAST_SQUARES_MODEL, points: DEFAULT_LEAST_SQUARES_MODEL.points.map(p => [p[0], p[1]] as const)};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...DEFAULT_VIEW];
    }

    protected override get equalAxisUnits(): boolean {
        return false;
    }

    private viewOf(model: LeastSquaresModel): LeastSquaresView {
        return this.memoView(model, () => leastSquaresView(model));
    }

    // ---- Model operations ----------------------------------------------------------------------------------------------

    private accepted(edit: LeastSquaresEdit): LeastSquaresModel {
        if (!edit.ok) throw new DomainError(leastSquaresEditMessage(edit.issue));
        return edit.model;
    }

    protected setDegree(value: unknown): void {
        const next = this.accepted(changeLsqDegree(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setPoint(index: number, value: unknown, options: { syncScene?: boolean } = {}): void {
        const next = this.accepted(moveLsqPoint(this.model, index, value));
        if (next !== this.model) this.commitModel(next, options);
    }

    protected addPoint(): void {
        this.commitModel(this.accepted(addLsqPoint(this.model)));
    }

    protected removePoint(): void {
        this.commitModel(this.accepted(removeLsqPoint(this.model)));
    }

    protected setLine(field: "slope" | "intercept", value: unknown): void {
        const next = this.accepted(setLsqLine(this.model, field, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setManualLine(value: boolean): void {
        this.commitModel({...this.model, manualLine: value});
    }

    protected setShowSquares(value: boolean): void {
        this.commitModel({...this.model, showSquares: value});
    }

    protected setShowNormalEquations(value: boolean): void {
        this.commitModel({...this.model, showNormalEquations: value});
    }

    /** The typed list's edit: refused with the localized message, applied otherwise. */
    private editPoint(index: number, value: readonly [number, number]): string | void {
        const edit = moveLsqPoint(this.model, index, value);
        if (!edit.ok) return String(leastSquaresEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model);
    }

    // ---- Lesson actions ------------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("lsq", action => {
            if (action.operation === "set-point") {
                this.setPoint(action.index, [action.x, action.y]);
            } else if (action.operation === "set-degree") {
                this.setDegree(action.value);
            } else if (action.operation === "set-mode") {
                if (action.mode !== "best" && action.mode !== "manual") throw new Error('The mode must be "best" or "manual".');
                this.setManualLine(action.mode === "manual");
            } else if (action.operation === "set-line") {
                // Both values are checked before either is written, so a refused line leaves the model alone.
                this.accepted(setLsqLine(this.model, "slope", action.slope));
                this.accepted(setLsqLine(this.model, "intercept", action.intercept));
                this.setLine("slope", action.slope);
                this.setLine("intercept", action.intercept);
            } else if (action.operation === "set-overlay") {
                if (typeof action.visible !== "boolean") throw new Error("An lsq set-overlay action needs a boolean visible.");
                if (action.overlay === "squares") this.setShowSquares(action.visible);
                else if (action.overlay === "normal-equations") this.setShowNormalEquations(action.visible);
                else throw new Error('The overlay must be "squares" or "normal-equations".');
            } else {
                throw new Error("An lsq action needs the operation set-point, set-degree, set-mode, set-line or set-overlay.");
            }
        });
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override syncSceneToModel(): void {
        this.model.points.forEach((p, j) => this.pointObjects[j]?.moveTo([p[0], p[1]]));
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const drawnAt = (x: number) => {
            const drawn = view().drawn;
            return drawn ? evaluatePolynomial(drawn, x) : NaN;
        };
        const hasCurve = () => view().drawn !== undefined;

        // The squares have sides of |r| screen units in y, so the axes' unequal units are undone: the horizontal side is
        // |r| * unitY / unitX in x units. Recomputed on every board update, so zoom keeps them square on screen.
        for (let i = 0; i < LSQ_POINTS_MAX; i++) {
            const square = this.own(board.create("curve", [[], []], {
                fillColor: GraphPalette.warningText, fillOpacity: 0.22, strokeColor: GraphPalette.warningText, strokeOpacity: 0.7,
                strokeWidth: this.displayThinWidth(0.35), highlight: false, fixed: true,
                visible: () => model().showSquares && i < model().points.length && hasCurve(),
            })) as unknown as FillCurve;
            square.updateDataArray = () => {
                const r = view().residuals[i];
                if (r === undefined || r === 0 || !hasCurve() || i >= model().points.length) {
                    square.dataX = [];
                    square.dataY = [];
                    return;
                }
                const [x, y] = model().points[i];
                const p = y - r;
                const w = Math.abs(r) * board.unitY / board.unitX;
                square.dataX = [x, x, x + w, x + w, x];
                square.dataY = [y, p, p, y, y];
            };
        }

        const residuals = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.warningText, strokeWidth: thin, dash: 2, highlight: false, fixed: true, visible: hasCurve,
        })) as unknown as FillCurve;
        residuals.updateDataArray = () => {
            const xs: number[] = [];
            const ys: number[] = [];
            model().points.forEach(([x, y], i) => {
                const r = view().residuals[i];
                if (r === undefined) return;
                xs.push(x, x, NaN);
                ys.push(y, y - r, NaN);
            });
            residuals.dataX = xs;
            residuals.dataY = ys;
        };

        this.own(board.create("functiongraph", [drawnAt], {
            strokeColor: GraphPalette.primaryCurve, strokeWidth, highlight: false, fixed: true, visible: () => !model().manualLine && hasCurve(),
        }));
        this.own(board.create("functiongraph", [drawnAt], {
            strokeColor: GraphPalette.comparisonCurve, strokeWidth, highlight: false, fixed: true, visible: () => model().manualLine,
        }));

        this.pointObjects = [];
        for (let j = 0; j < LSQ_POINTS_MAX; j++) {
            const start = model().points[j] ?? [0, 0];
            const point = this.own(board.create("point", [start[0], start[1]], {
                ...this.styles.point.default, name: "", withLabel: false, fillColor: GraphPalette.controlPoint, highlightFillColor: GraphPalette.selectedControlPoint,
                strokeColor: GraphPalette.pointOutline, size: () => Math.max(4, this.displaySettings.pointSize), visible: () => j < model().points.length,
            })) as JXG.Point;
            bindMovablePointCursor(point, board);
            point.on("drag", () => {
                if (j >= model().points.length) return;
                const snap = (value: number) => cleanNumber(Math.min(LSQ_COORDINATE_LIMIT, Math.max(-LSQ_COORDINATE_LIMIT, Math.round(value / LSQ_DRAG_STEP) * LSQ_DRAG_STEP)));
                const next = [snap(point.X()), snap(point.Y())] as const;
                if (next.every(Number.isFinite)) this.ignoreOutOfDomain(() => this.setPoint(j, next, {syncScene: false}));
                point.moveTo([model().points[j][0], model().points[j][1]]);
            });
            this.pointObjects.push(point);
        }

        const equation = () => {
            const drawn = view().drawn;
            if (!drawn) return "";
            return model().manualLine
                ? formatLineEquation({slope: drawn[1], intercept: drawn[0]}, currentLanguage(), 3)
                : polynomialText(drawn, currentLanguage());
        };
        this.caption("top-left", [
            {
                text: () => model().manualLine ? t("interp_lsq_board_manual_title") : t("interp_lsq_board_title", {value0: model().degree}), scale: 1.2,
            },
            {text: () => equation()},
            {text: () => {
                const v = view();
                return v.sumOfSquares === undefined ? "" : t("interp_lsq_board_sum", {value0: leastSquaresNumber(v.sumOfSquares)});
            }, color: GraphPalette.warningText},
            {text: () => {
                const v = view();
                return model().manualLine && v.optimalSumOfSquares !== undefined ? t("interp_lsq_board_optimal", {value0: leastSquaresNumber(v.optimalSumOfSquares)}) : "";
            }},
            {text: () => {
                const fit = view().fit;
                return !model().manualLine && !fit.ok ? t("interp_lsq_board_reason", {value0: leastSquaresReason(fit.reason)}) : "";
            }, color: GraphPalette.warningText},
            {text: () => t("interp_lsq_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ]);
    }

    protected override onSceneRemoved(): void {
        this.pointObjects = [];
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.stateSnapshot();
        const view = this.viewOf(state);
        const maxDegree = lsqDegreeMax(state.points.length);
        const equations = view.fit.ok ? normalEquations(view.fit.fit) : undefined;
        return <>
            <div className="inspector-group">
                <CountSetter label={t("interp_lsq_count_label")} n={state.points.length} min={LSQ_POINTS_MIN} max={LSQ_POINTS_MAX}
                             onPlus={() => this.ignoreOutOfDomain(() => this.addPoint())} onMinus={() => this.ignoreOutOfDomain(() => this.removePoint())}/>
                <PointListInput title={t("interp_point_list")} points={state.points} pointLabel={i => t("interp_point_name", {value0: i + 1})}
                                min={-LSQ_COORDINATE_LIMIT} max={LSQ_COORDINATE_LIMIT} onCommit={(index, value) => this.editPoint(index, value)}/>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.manualLine} label={t("interp_lsq_manual_label")} describedBy="interp-lsq-manual-help"
                             onChange={checked => this.setManualLine(checked)}/>
                <p id="interp-lsq-manual-help" className="inspector-help">{t("interp_lsq_manual_help")}</p>
                {state.manualLine ? <>
                    <Slider min={-LSQ_SLOPE_LIMIT} max={LSQ_SLOPE_LIMIT} step={0.05} value={state.slope} customText={t("slope_k_label")}
                            onChange={value => this.ignoreOutOfDomain(() => this.setLine("slope", value))}/>
                    <Slider min={-LSQ_INTERCEPT_LIMIT} max={LSQ_INTERCEPT_LIMIT} step={0.05} value={state.intercept} customText={t("intercept_n_label")}
                            onChange={value => this.ignoreOutOfDomain(() => this.setLine("intercept", value))}/>
                </> : <>
                    <CountSetter label={t("interp_lsq_degree_label")} n={state.degree} min={LSQ_DEGREE_MIN} max={maxDegree}
                                 onPlus={() => this.ignoreOutOfDomain(() => this.setDegree(this.model.degree + 1))}
                                 onMinus={() => this.ignoreOutOfDomain(() => this.setDegree(this.model.degree - 1))}
                                 onSet={value => this.ignoreOutOfDomain(() => this.setDegree(value))}/>
                    <p className="inspector-help">{t("interp_lsq_degree_help", {value0: LSQ_DEGREE_MIN, value1: maxDegree})}</p>
                </>}
                {state.manualLine && <p className="inspector-help">{t("interp_lsq_degree_manual")}</p>}
                {!state.manualLine && !view.fit.ok &&
                    <p role="status" className="inspector-help" data-lsq="reason">{t("interp_lsq_board_reason", {value0: leastSquaresReason(view.fit.reason)})}</p>}
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.showSquares} label={t("interp_lsq_show_squares")} onChange={checked => this.setShowSquares(checked)}/>
                <OnOffSwitch checked={state.showNormalEquations} label={t("interp_lsq_show_normal")} onChange={checked => this.setShowNormalEquations(checked)}/>
            </div>
            {state.showNormalEquations && <div className="inspector-group" data-lsq="normal-equations">
                <h3>{t("interp_lsq_normal_title")}</h3>
                {state.manualLine && <p className="inspector-help" data-lsq="normal-manual-note">{t("interp_lsq_normal_manual_note")}</p>}
                {equations
                    ? <>
                        <NormalEquationsDisplay latex={normalEquationsLatex(equations, currentLanguage())}/>
                        <p className="inspector-help">{t("interp_lsq_normal_help")}</p>
                    </>
                    : <p className="inspector-help">{view.fit.ok ? t("interp_lsq_normal_unavailable") : t("interp_lsq_board_reason", {value0: leastSquaresReason(view.fit.reason)})}</p>}
            </div>}
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "points", color: GraphPalette.controlPoint, label: t("interp_lsq_legend_points"), kind: "dot"},
            {id: "fit", color: GraphPalette.primaryCurve, label: t("interp_lsq_legend_fit"), kind: "line"},
            {id: "manual", color: GraphPalette.comparisonCurve, label: t("interp_lsq_legend_manual"), kind: "line"},
            {id: "residual", color: GraphPalette.warningText, label: t("interp_lsq_legend_residual"), kind: "dashed-line"},
            {id: "square", color: GraphPalette.warningText, label: t("interp_lsq_legend_square"), kind: "area"},
        ]}/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateSnapshot();
        const view = this.viewOf(model);
        const none = t("interp_lsq_readout_none");
        const sum = (value: number | undefined) => value === undefined ? none : leastSquaresNumber(value);
        const language = currentLanguage();
        const residuals = view.drawn ? view.residuals.map(leastSquaresCoefficient).join("; ") : none;
        const rows = model.manualLine
            ? [
                {id: "points", label: t("interp_lsq_readout_points"), value: String(model.points.length)},
                {id: "equation", label: t("interp_lsq_readout_manual_equation"), value: formatLineEquation({slope: model.slope, intercept: model.intercept}, language, 3)},
                {id: "sum", label: t("interp_lsq_readout_manual_sum"), value: sum(view.sumOfSquares)},
                {id: "optimal-sum", label: t("interp_lsq_readout_optimal_sum"), value: sum(view.optimalSumOfSquares)},
                {id: "residuals", label: t("interp_lsq_readout_residuals"), value: residuals},
            ]
            : [
                {id: "points", label: t("interp_lsq_readout_points"), value: String(model.points.length)},
                {id: "degree", label: t("interp_lsq_readout_degree"), value: String(model.degree)},
                {id: "equation", label: t("interp_lsq_readout_equation"), value: view.drawn ? polynomialText(view.drawn, language) : none},
                {id: "sum", label: t("interp_lsq_readout_sum"), value: sum(view.sumOfSquares)},
                {id: "residuals", label: t("interp_lsq_readout_residuals"), value: residuals},
            ];
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={t("interp_lsq_note")}/>;
    }
}

/** The normal equations as display math; MathJax typesets it again whenever the numbers or the language change. */
function NormalEquationsDisplay(props: { latex: string }) {
    useT();
    const ref = useRef<HTMLDivElement>(null);
    useTypesetMath(ref, props.latex);
    // Keyed on the LaTeX so that MathJax's output never meets React's own text node of the previous formula.
    return <div key={props.latex} ref={ref} className="lsq-normal-equations" data-lsq="normal-latex">{props.latex}</div>;
}

export default LeastSquaresGraph;
