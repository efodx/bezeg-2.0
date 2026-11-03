import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import Slider from "../../inputs/Slider";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, t} from "../../localization";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {EULER_EXAMPLE_IDS, EULER_X_MAX, EULER_X_MIN, eulerExample, EulerExampleId, STEP_SIZES} from "../../analysis/odeEuler";
import {
    chooseEulerExample, chooseEulerStep, DEFAULT_EULER_MODEL, EULER_DRAG_STEP, EULER_Y0_BOUND, EulerEdit, EulerModel, eulerView, EulerView, exactAt,
    exactReaches, moveEulerInitial, nextRevealed, setEulerEnd, setEulerRevealed, setEulerShowExact, setEulerX0, setEulerY0,
} from "../../analysis/eulerModel";
import {fieldMarks, FieldMarks, FieldSize} from "../../analysis/eulerField";
import {ERROR_DISPLAY_DIGITS} from "../../analysis/quadratureModel";
import {eulerEditMessage} from "./eulerMessages";
import {cleanNumber} from "../../analysis/numbers";
import {GraphPalette} from "../styles/GraphPalette";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {functionPresetCollections} from "./functionPresetCollections";

const RATIO_DIGITS = 3;
/** End values and exact values: four decimals, as the quadrature readouts. */
const PRECISE = 4;
/** Half the side of a node cross in pixels. */
const NODE_CROSS_PX = 3.5;
/** The board size assumed before the board has a canvas (the field still needs a size to be generated). */
const FALLBACK_SIZE: FieldSize = {widthPx: 800, heightPx: 560};

/** Per-example views: the default solution and some of the field around it (x from -2 to 3 or 4, y around the solution). */
const EXAMPLE_VIEWS: Readonly<Record<EulerExampleId, BoundingBox>> = {
    exponential: [-2, 5, 3.5, -1.5],
    "linear-relaxation": [-2, 3.5, 4, -1.5],
    "blow-up": [-2, 6, 3, -2],
};

/**
 * Direction field and Euler's method for y' = F(x, y) (numerical methods lesson N5). The model is `{example, x0, y0, step, xEnd,
 * showExact, revealed}`; the polyline, the end value, the exact value, the absolute error and the ratio of the error at 2h to the
 * error at h are recomputed from it by `src/analysis/eulerModel` and never stored.
 *
 * The board holds a constant number of objects, whatever the step or the grid (ADR 0037): the field is one curve of NaN-separated
 * slope marks of fixed length in pixels, regenerated only when the view, its size or the example changes (not when the initial point
 * or the step changes); the Euler polyline, its node crosses and the dashed exact solution are one curve each; then the draggable
 * initial point. A run that ends early (values beyond the bound) stops the polyline at its last finite point and says so.
 */
export class EulerGraph extends BaseFunctionGraph<EulerModel> {
    private pointP?: JXG.Point;
    /** How often the field marks were generated since the scene was created (tests assert that a drag does not regenerate them). */
    protected fieldBuilds = 0;

    override presetCollection() {
        return functionPresetCollections.euler;
    }

    protected defaultModel(): EulerModel {
        return {...DEFAULT_EULER_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...EXAMPLE_VIEWS[this.model.example]];
    }

    protected override exampleView() {
        return {key: this.model.example, box: EXAMPLE_VIEWS[this.model.example]};
    }

    // ---- Model operations (read and write the synchronous model, never this.state) ---------------------------------------

    private apply(edit: EulerEdit, options: { syncScene?: boolean } = {}): void {
        if (!edit.ok) throw new DomainError(eulerEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setExample(value: unknown): void {
        const edit = chooseEulerExample(this.model, value);
        this.apply(edit);
        if (edit.ok && this.generatedObjectCount > 0) this.board.setBoundingBox([...EXAMPLE_VIEWS[edit.model.example]], true);
    }

    protected setStep(value: unknown): void {
        this.apply(chooseEulerStep(this.model, value));
    }

    protected setInitial(x0: number, y0: number, options: { syncScene?: boolean } = {}): void {
        this.apply(moveEulerInitial(this.model, x0, y0), options);
    }

    protected setEnd(value: number): void {
        this.apply(setEulerEnd(this.model, value));
    }

    protected setShowExact(value: boolean): void {
        this.commitModel(setEulerShowExact(this.model, value));
    }

    protected nextStep(): void {
        const available = this.viewOf(this.model).stepsTaken;
        if (available < 1) return;
        this.commitModel(setEulerRevealed(this.model, nextRevealed(this.model, available)));
    }

    protected showAllSteps(): void {
        this.commitModel(setEulerRevealed(this.model, null));
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            visibility: {
                "euler-exact": visible => this.setShowExact(visible),
            },
            parameters: {
                "euler-x0": value => this.setInitial(value, this.model.y0),
                "euler-y0": value => this.setInitial(this.model.x0, value),
                "euler-end": value => this.setEnd(value),
            },
            choices: {
                "euler-example": value => this.setExample(value),
                "euler-step": value => this.setStep(Number(value)),
            },
        };
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    private viewOf(model: EulerModel): EulerView {
        return this.memoView(model, () => eulerView(model));
    }

    /** The board's size in pixels, or a fixed size where there is no canvas yet. */
    private boardSize(): FieldSize {
        const widthPx = this.board.canvasWidth;
        const heightPx = this.board.canvasHeight;
        return widthPx > 0 && heightPx > 0 ? {widthPx, heightPx} : FALLBACK_SIZE;
    }

    /** Pixels per unit of each axis for the current view (so marks and crosses keep their size on screen). */
    private pixelScale(): { pxPerX: number; pxPerY: number } {
        const [left, top, right, bottom] = this.board.getBoundingBox();
        const {widthPx, heightPx} = this.boardSize();
        return {pxPerX: widthPx / (right - left), pxPerY: heightPx / (top - bottom)};
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const language = () => currentLanguage();
        const thin = this.displayThinWidth(0.5);
        let cache: { key: string; marks: FieldMarks } | undefined;

        // Layers, lowest first: the field, the exact solution, the polyline with its nodes, then the initial point.
        const field = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.referenceCurve, strokeWidth: thin, highlight: false, fixed: true,
        })) as unknown as { dataX: number[]; dataY: number[]; updateDataArray: () => void };
        field.updateDataArray = () => {
            const [left, top, right, bottom] = board.getBoundingBox();
            const size = this.boardSize();
            const key = [model().example, left, top, right, bottom, size.widthPx, size.heightPx].join("|");
            if (cache?.key !== key) {
                this.fieldBuilds++;
                // A board without a usable view (hidden or not yet laid out) has no field to draw.
                const usable = [left, top, right, bottom].every(Number.isFinite) && left < right && bottom < top;
                cache = {key, marks: usable ? fieldMarks(eulerExample(model().example), {xMin: left, xMax: right, yMin: bottom, yMax: top}, size) : {x: [], y: [], cols: 0, rows: 0}};
            }
            // Shared with the cache, not copied each frame: JSXGraph only reads a curve's data arrays and nothing else writes them.
            field.dataX = cache.marks.x;
            field.dataY = cache.marks.y;
        };

        this.own(board.create("functiongraph", [(x: number) => exactAt(model(), x)], {
            strokeColor: GraphPalette.comparisonCurve, dash: 2, highlight: false, fixed: true, strokeWidth: this.displayStrokeWidth,
            visible: () => model().showExact,
        }));

        const polyline = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth: this.displayStrokeWidth,
        })) as unknown as { dataX: number[]; dataY: number[]; updateDataArray: () => void };
        polyline.updateDataArray = () => {
            const nodes = this.viewOf(model()).visibleNodes;
            polyline.dataX = nodes.map(node => node.x);
            polyline.dataY = nodes.map(node => node.y);
        };

        const crosses = this.own(board.create("curve", [[], []], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth: thin,
        })) as unknown as { dataX: number[]; dataY: number[]; updateDataArray: () => void };
        crosses.updateDataArray = () => {
            const {pxPerX, pxPerY} = this.pixelScale();
            const dx = NODE_CROSS_PX / pxPerX;
            const dy = NODE_CROSS_PX / pxPerY;
            const x: number[] = [];
            const y: number[] = [];
            for (const node of this.viewOf(model()).visibleNodes) {
                x.push(node.x - dx, node.x + dx, NaN, node.x - dx, node.x + dx, NaN);
                y.push(node.y - dy, node.y + dy, NaN, node.y + dy, node.y - dy, NaN);
            }
            crosses.dataX = x;
            crosses.dataY = y;
        };

        const point = this.own(board.create("point", [model().x0, model().y0], {
            ...this.styles.point.default, name: "$$P_0$$", label: this.pointLabel("above-right", 1.6),
            fillColor: GraphPalette.constructionAccent, highlightFillColor: GraphPalette.constructionAccent,
        })) as JXG.Point;
        bindMovablePointCursor(point, board);
        point.on("drag", () => {
            const snap = (value: number) => Math.round(value / EULER_DRAG_STEP) * EULER_DRAG_STEP;
            const x = cleanNumber(Math.min(model().xEnd, EULER_X_MAX, Math.max(EULER_X_MIN, snap(point.X()))));
            const y = cleanNumber(Math.min(EULER_Y0_BOUND, Math.max(-EULER_Y0_BOUND, snap(point.Y()))));
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            if (!this.ignoreOutOfDomain(() => this.setInitial(x, y, {syncScene: false}))) {
                this.syncSceneToModel();
                return;
            }
            point.moveTo([x, y]);
        });
        this.pointP = point;

        // The equation, the end value with its error and the error ratio stay on the board (projection needs them), top left.
        this.caption("top-left", [
            {text: () => eulerExample(model().example).plain, scale: 1.2, math: true},
            {
                text: () => {
                    const view = this.viewOf(model());
                    return t("euler_ode_board_values", {
                        value0: formatNumber(model().step, language(), PRECISE), value1: formatNumber(model().xEnd, language(), PRECISE),
                        value2: formatNumber(view.endValue ?? NaN, language(), PRECISE),
                        value3: view.error === undefined ? t("euler_ode_none") : formatSignificant(view.error, language(), ERROR_DISPLAY_DIGITS),
                    });
                },
                visible: () => this.viewOf(model()).endValue !== undefined,
            },
            {
                text: () => t("euler_ode_board_ratio", {value0: formatSignificant(this.viewOf(model()).ratio ?? NaN, language(), RATIO_DIGITS)}),
                visible: () => this.viewOf(model()).ratio !== undefined,
            },
            {
                text: () => {
                    const nodes = this.viewOf(model()).path.nodes;
                    return t("euler_ode_board_stopped", {value0: formatNumber(nodes[nodes.length - 1].x, language(), PRECISE)});
                },
                visible: () => this.viewOf(model()).path.termination !== "reached-end",
            },
        ]);
    }

    protected override syncSceneToModel(): void {
        this.pointP?.moveTo([this.model.x0, this.model.y0]);
    }

    protected override onSceneRemoved(): void {
        this.pointP = undefined;
        this.fieldBuilds = 0;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private stateModel(): EulerModel {
        const {example, x0, y0, step, xEnd, showExact, revealed} = this.state;
        return {example, x0, y0, step, xEnd, showExact, revealed};
    }

    protected renderControls(): React.ReactNode {
        const model = this.stateModel();
        const view = this.viewOf(model);
        const language = currentLanguage();
        const stepIndex = STEP_SIZES.indexOf(model.step);
        const nextUnavailable = view.stepsTaken < 1;
        const showAllUnavailable = model.revealed === null;
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("euler_ode_example_label")} value={model.example} help={t("euler_ode_example_help")}
                              options={EULER_EXAMPLE_IDS.map(id => ({value: id, text: eulerExample(id).plain}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("euler_ode_x0_label")} value={model.x0} min={EULER_X_MIN} max={EULER_X_MAX} step={EULER_DRAG_STEP}
                             rejectedHint={t("euler_ode_x0_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.apply(setEulerX0(this.model, next)))}/>
                <NumberInput label={t("euler_ode_y0_label")} value={model.y0} min={-EULER_Y0_BOUND} max={EULER_Y0_BOUND} step={EULER_DRAG_STEP}
                             rejectedHint={t("euler_ode_y0_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.apply(setEulerY0(this.model, next)))}/>
                <p className="inspector-help">{t("euler_ode_initial_help")}</p>
            </div>
            <div className="inspector-group">
                <Slider customText={t("euler_ode_step_label")} min={0} max={STEP_SIZES.length - 1} step={1} value={stepIndex}
                        formatValue={index => formatNumber(STEP_SIZES[Math.round(index)] ?? NaN, language, PRECISE)} help={t("euler_ode_step_help")}
                        onChange={next => this.ignoreOutOfDomain(() => this.setStep(STEP_SIZES[Math.round(next)]))}/>
                <NumberInput label={t("euler_ode_end_label")} value={model.xEnd} min={EULER_X_MIN} max={EULER_X_MAX} step={EULER_DRAG_STEP}
                             rejectedHint={t("euler_ode_end_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setEnd(next))}/>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={model.showExact} label={t("euler_ode_exact_label")} onChange={next => this.setShowExact(next)}/>
            </div>
            <div className="inspector-group">
                {/* An unavailable control stays focusable (aria-disabled, not disabled), as in the bisection graph. */}
                <div className="inspector-playback" role="group" aria-label={t("euler_ode_steps_controls")}>
                    <button type="button" data-action="next-step" aria-disabled={nextUnavailable}
                            onClick={() => { if (!nextUnavailable) this.ignoreOutOfDomain(() => this.nextStep()); }}>{t("euler_ode_next_step")}</button>
                    <button type="button" data-action="show-all" aria-disabled={showAllUnavailable}
                            onClick={() => { if (!showAllUnavailable) this.showAllSteps(); }}>{t("euler_ode_show_all")}</button>
                </div>
                <p className="inspector-help">{t("euler_ode_reveal_note")}</p>
            </div>
        </>;
    }

    /** The statuses to state in words; each has a stable id. */
    private statuses(model: EulerModel, view: EulerView): { id: string; text: string }[] {
        const language = currentLanguage();
        const result: { id: string; text: string }[] = [];
        const lastX = formatNumber(view.path.nodes[view.path.nodes.length - 1].x, language, PRECISE);
        if (view.path.termination === "left-window") result.push({id: "left-window", text: t("euler_ode_status_left_window", {value0: lastX})});
        if (view.path.termination === "non-finite") result.push({id: "non-finite", text: t("euler_ode_status_non_finite", {value0: lastX})});
        if (!exactReaches(model)) result.push({id: "no-exact", text: t("euler_ode_status_no_exact")});
        if (model.revealed !== null) {
            result.push({id: "revealed", text: t("euler_ode_status_revealed", {value0: Math.min(model.revealed, view.stepsTaken), value1: view.stepsTaken})});
        }
        return result;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.stateModel();
        const view = this.viewOf(model);
        const language = currentLanguage();
        const number = (value: number | undefined) => value === undefined ? t("euler_ode_none") : formatNumber(value, language, PRECISE);
        const error = (value: number | undefined) => value === undefined ? t("euler_ode_none") : formatSignificant(value, language, ERROR_DISPLAY_DIGITS);
        const rows = [
            {id: "h", label: t("euler_ode_readout_h"), value: formatNumber(model.step, language, PRECISE)},
            {id: "steps", label: t("euler_ode_readout_steps"), value: String(view.stepsTaken)},
            {id: "end", label: t("euler_ode_readout_end"), value: formatNumber(model.xEnd, language, PRECISE)},
            {id: "value", label: t("euler_ode_readout_value"), value: number(view.endValue)},
            {id: "exact", label: t("euler_ode_readout_exact"), value: number(view.exact)},
            {id: "error", label: t("euler_ode_readout_error"), value: error(view.error)},
            {
                id: "double-error",
                label: t("euler_ode_readout_double_error", {value0: view.doubleStep === undefined ? t("euler_ode_none") : formatNumber(view.doubleStep, language, PRECISE)}),
                value: error(view.doubleError),
            },
            {id: "ratio", label: t("euler_ode_readout_ratio"), value: view.ratio === undefined ? t("euler_ode_none") : formatSignificant(view.ratio, language, RATIO_DIGITS)},
        ];
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("euler_ode_note")}/>
            <div className="inspector-group euler-status" role="status" aria-live="polite">
                {this.statuses(model, view).map(status => <p key={status.id} className="inspector-help" data-euler-status={status.id}>{status.text}</p>)}
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "field", color: GraphPalette.referenceCurve, label: t("euler_ode_legend_field"), kind: "line"},
            {id: "polyline", color: GraphPalette.primaryCurve, label: t("euler_ode_legend_polyline"), kind: "line"},
            {id: "exact", color: GraphPalette.comparisonCurve, label: t("euler_ode_legend_exact"), kind: "dashed-line"},
            {id: "initial", color: GraphPalette.constructionAccent, label: t("euler_ode_legend_initial"), kind: "dot"},
        ]}/>;
    }
}

export default EulerGraph;
