import {CONTROL_ROW_FILL} from "../../inputs/controlRow";
import React, {useState} from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FunctionLessonActions, FunctionPanel} from "./BaseFunctionGraph";
import {FunctionStatus} from "./FunctionStatus";
import Slider from "../../inputs/Slider";
import {PointListInput} from "../../inputs/PointListInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {currentLanguage, message, Message, messageNumber, renderMessage, t} from "../../localization";
import type {FormattedValue, GraphDeclaration, LegendEntry, StatusLine} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {formatNumber, formatSignificant} from "../../analysis/format";
import {EULER_EXAMPLE_IDS, EULER_X_MAX, EULER_X_MIN, eulerExample, EulerExampleId, STEP_SIZES} from "../../analysis/odeEuler";
import {
    chooseEulerExample, chooseEulerStep, DEFAULT_EULER_MODEL, EULER_DRAG_STEP, EULER_Y0_BOUND, EulerEdit, EulerModel, eulerView, EulerView, exactAt,
    exactReaches, moveEulerInitial, nextRevealed, setEulerEnd, setEulerRevealed, setEulerShowExact,
} from "../../analysis/eulerModel";
import {fieldMarks, FieldMarks, FieldSize} from "../../analysis/eulerField";
import {ERROR_DISPLAY_DIGITS} from "../../analysis/quadratureModel";
import {eulerEditMessage} from "./eulerMessages";
import {cleanNumber} from "../../analysis/numbers";
import {GraphPalette} from "../styles/GraphPalette";
import {bindMovablePointCursor} from "../base/bindMovablePointCursor";
import {functionPresetCollections} from "./functionPresetCollections";

/** The ids of the Euler declaration: the step (as halvings), the end x and the equation by arbiter key; the readout rows; the legend. */
export type EulerIds = {
    param: "euler-step" | "euler-end" | "euler-example";
    row: "h" | "steps" | "end" | "value" | "exact" | "error" | "double-error" | "ratio"; note: "about";
    legend: "field" | "polyline" | "exact" | "initial"; section: never; action: never;
};

const EXAMPLE_LABEL_KEYS = {
    exponential: "euler_ode_example_exponential",
    "linear-relaxation": "euler_ode_example_linear_relaxation",
    "blow-up": "euler_ode_example_blow_up",
} as const satisfies Record<EulerExampleId, Parameters<typeof message>[0]>;

const RATIO_DIGITS = 3;
/** End values and exact values: four decimals, as the quadrature readouts. */
const PRECISE = 4;
/** Keep the pervasive slope field behind the Euler path and its dashed exact reference. */
const EULER_COLORS = {
    field: "#91a9b3",
    polyline: "#2468a2",
    exact: "#bd6047",
    initial: GraphPalette.constructionAccent,
} as const;
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
    /** The drawn objects the legend entries name (`drawnObject`); cleared with the scene. */
    private drawn: Partial<Record<"field" | "polyline" | "exact" | "initial", unknown>> = {};
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

    // ---- Model operations (read and write the synchronous model) ---------------------------------------

    private apply(edit: EulerEdit, options: { syncScene?: boolean } = {}): void {
        if (!edit.ok) throw new DomainError(eulerEditMessage(edit.issue));
        if (edit.model !== this.model) this.commitModel(edit.model, options);
    }

    protected setExample(value: unknown): void {
        const edit = chooseEulerExample(this.model, value);
        this.apply(edit);
        if (edit.ok && this.generatedObjectCount > 0) this.boardView.setIntent(EXAMPLE_VIEWS[edit.model.example], {keepAspectRatio: true});
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
        if (available < 1 || (this.model.revealed !== null && this.model.revealed >= available)) return;
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
        const thin = this.displayThinWidth(0.5);
        let cache: { key: string; marks: FieldMarks } | undefined;

        // Layers, lowest first: the field, the exact solution, the polyline with its nodes, then the initial point.
        const field = this.drawn.field = this.own(board.create("curve", [[], []], {
            strokeColor: EULER_COLORS.field, strokeOpacity: 0.65, strokeWidth: thin, highlight: false, fixed: true,
        })) as unknown as { dataX: number[]; dataY: number[]; updateDataArray: () => void; viewportGenerated?: boolean };
        // Rebuilt for every view: guided-example capture checks this curve against the presented window instead of the opening one.
        field.viewportGenerated = true;
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

        this.drawn.exact = this.own(board.create("functiongraph", [(x: number) => exactAt(model(), x)], {
            strokeColor: EULER_COLORS.exact, dash: 2, highlight: false, fixed: true, strokeWidth: this.displayStrokeWidth,
            visible: () => model().showExact,
        }));

        const polyline = this.drawn.polyline = this.own(board.create("curve", [[], []], {
            strokeColor: EULER_COLORS.polyline, highlight: false, fixed: true, strokeWidth: this.displayStrokeWidth,
            // A single node (end x = x0, or a reveal of zero steps) is no polyline: hidden rather than a degenerate one-sample curve.
            visible: () => this.viewOf(model()).visibleNodes.length > 1,
        })) as unknown as { dataX: number[]; dataY: number[]; updateDataArray: () => void };
        polyline.updateDataArray = () => {
            const nodes = this.viewOf(model()).visibleNodes;
            polyline.dataX = nodes.map(node => node.x);
            polyline.dataY = nodes.map(node => node.y);
        };

        const crosses = this.own(board.create("curve", [[], []], {
            strokeColor: EULER_COLORS.polyline, highlight: false, fixed: true, strokeWidth: () => Math.max(1, thin()),
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
            fillColor: EULER_COLORS.initial, highlightFillColor: EULER_COLORS.initial,
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
        this.drawn.initial = point;
    }

    protected override syncSceneToModel(): void {
        this.pointP?.moveTo([this.model.x0, this.model.y0]);
    }

    protected override onSceneRemoved(): void {
        this.pointP = undefined;
        this.drawn = {};
        this.fieldBuilds = 0;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const stepIndex = STEP_SIZES.indexOf(model.step);
        const nextUnavailable = view.stepsTaken < 1 || (model.revealed !== null && model.revealed >= view.stepsTaken);
        const showAllUnavailable = model.revealed === null;
        return <>
            <div className="inspector-group">
                <EulerRevealButtons nextReason={nextUnavailable ? t("playback_block_no_more_steps") : undefined}
                                    showAllReason={showAllUnavailable ? t("euler_ode_show_all_done") : undefined}
                                    onNext={() => this.ignoreOutOfDomain(() => this.nextStep())} onShowAll={() => this.showAllSteps()}/>
                <p className="inspector-help">{t("euler_ode_reveal_note")}</p>
            </div>
            <PuckOwnedGroup params={["euler-step"]} className="inspector-group">
                <PuckOwned param="euler-step"><Slider customText={t("euler_ode_step_label")} min={0} max={STEP_SIZES.length - 1} step={1} value={stepIndex}
                        formatValue={index => formatNumber(STEP_SIZES[Math.round(index)] ?? NaN, language, PRECISE)} help={t("euler_ode_step_help")}
                        onChange={next => this.ignoreOutOfDomain(() => this.setStep(STEP_SIZES[Math.round(next)]))}/></PuckOwned>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <ChoiceSelect label={t("euler_ode_example_label")} value={model.example} help={t("euler_ode_example_help")}
                              options={EULER_EXAMPLE_IDS.map(id => ({value: id, text: eulerExample(id).plain}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <PointListInput title={t("euler_ode_start_title")} points={[[model.x0, model.y0]]} pointLabel={() => "P₀"}
                                axisLabels={["x₀", "y₀"]} min={-EULER_Y0_BOUND} max={EULER_Y0_BOUND} decimals={PRECISE} step={EULER_DRAG_STEP}
                                onCommit={(_, [x0, y0]) => {
                                    try {
                                        this.setInitial(x0, y0);
                                    } catch (error) {
                                        if (error instanceof DomainError) return error.message;
                                        throw error;
                                    }
                                }}/>
                <p className="inspector-help">{t("euler_ode_initial_help")}</p>
            </div>
            <PuckOwnedGroup params={["euler-end"]} className="inspector-group">
                <PuckOwned param="euler-end"><Slider customText={t("euler_ode_end_label")} value={model.xEnd} min={EULER_X_MIN} max={EULER_X_MAX} step={EULER_DRAG_STEP}
                             rejectedHint={t("euler_ode_end_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setEnd(next))}/></PuckOwned>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <OnOffSwitch checked={model.showExact} label={t("euler_ode_exact_label")} onChange={next => this.setShowExact(next)}/>
            </div>
        </>;
    }

    /** The statuses to state in words; each has a stable id. One source for the panel and the declaration. */
    private statuses(model: EulerModel, view: EulerView): StatusLine[] {
        const result: StatusLine[] = [];
        const lastX = messageNumber(view.path.nodes[view.path.nodes.length - 1].x, PRECISE);
        if (view.path.termination === "left-window") result.push({id: "left-window", text: message("euler_ode_status_left_window", {value0: lastX}), tone: "warning"});
        if (view.path.termination === "non-finite") result.push({id: "non-finite", text: message("euler_ode_status_non_finite", {value0: lastX}), tone: "warning"});
        if (!exactReaches(model)) result.push({id: "no-exact", text: message("euler_ode_status_no_exact")});
        if (model.revealed !== null) {
            result.push({id: "revealed", text: message("euler_ode_status_revealed", {value0: messageNumber(Math.min(model.revealed, view.stepsTaken), 0), value1: messageNumber(view.stepsTaken, 0)})});
        }
        return result;
    }

    // ---- Declaration ---------------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the lesson names are the keys; the step is bound as the number of halvings of 1 (index into the step sizes). */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "euler-step": {read: () => STEP_SIZES.indexOf(this.model.step), apply: (value: number) => this.setStep(STEP_SIZES[value])},
            "euler-end": {read: () => this.model.xEnd, apply: (value: number) => this.setEnd(value)},
            "euler-example": {read: () => this.model.example, apply: (value: unknown) => this.setExample(value)},
        };
    }

    /**
     * Pure data from the model. Board: the step (as halvings) and the end x, the two numbers compared while the polyline and the errors
     * are watched. Orodja: the equation, a setup choice that replaces the whole scene; the initial point (one row of the point editor, also
     * draggable), the reveal buttons and the exact-curve switch stay in Orodja undeclared. The rows, note and status come from the panel.
     */
    protected override declaration(): GraphDeclaration {
        const legend: LegendEntry<EulerIds>[] = [
            {id: "field", label: message("euler_ode_legend_field"), kind: "line", object: "field"},
            {id: "polyline", label: message("euler_ode_legend_polyline"), kind: "line", object: "polyline"},
            {id: "exact", label: message("euler_ode_legend_exact"), kind: "dashed", object: "exact"},
            {id: "initial", label: message("euler_ode_legend_initial"), kind: "point", object: "initial"},
        ];
        return {
            ...this.commonDeclaration(),
            formula: {label: message("euler_ode_formula_label"), tex: eulerExample(this.model.example).latex},
            parameters: [
                {key: "euler-step", kind: "count", label: message("euler_ode_halvings_name"), symbol: "k", help: message("euler_ode_halvings_help"), placement: "board",
                    min: 0, max: STEP_SIZES.length - 1},
                {key: "euler-end", kind: "range", label: message("euler_ode_end_label"), help: message("euler_ode_end_help"), placement: "board",
                    min: EULER_X_MIN, max: EULER_X_MAX, step: EULER_DRAG_STEP, maxDecimals: 2},
                {key: "euler-example", kind: "choice", label: message("euler_ode_example_label"), help: message("euler_ode_example_help"), placement: "tools",
                    options: EULER_EXAMPLE_IDS.map(id => ({value: id, label: message(EXAMPLE_LABEL_KEYS[id])}))},
            ],
            legend,
        };
    }

    /** The rows, the note and the statuses of the inspector as declared data (`renderReadout` draws them from it). */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const view = this.viewOf(model);
        const language = currentLanguage();
        const none = message("euler_ode_none");
        const precise = (value: number | undefined) => value === undefined ? none : messageNumber(value, PRECISE);
        const significant = (value: number | undefined, digits: number): Message | FormattedValue =>
            value === undefined ? none : {kind: "formatted", text: formatSignificant(value, language, digits)};
        return {
            rows: [
                {id: "h", name: message("euler_ode_readout_h"), value: messageNumber(model.step, PRECISE)},
                {id: "steps", name: message("euler_ode_readout_steps"), value: messageNumber(view.stepsTaken, 0)},
                {id: "end", name: message("euler_ode_readout_end"), value: messageNumber(model.xEnd, PRECISE)},
                {id: "value", name: message("euler_ode_readout_value"), value: precise(view.endValue)},
                {id: "exact", name: message("euler_ode_readout_exact"), value: precise(view.exact)},
                {id: "error", name: message("euler_ode_readout_error"), value: significant(view.error, ERROR_DISPLAY_DIGITS)},
                {id: "double-error", name: message("euler_ode_readout_double_error", {value0: precise(view.doubleStep)}), value: significant(view.doubleError, ERROR_DISPLAY_DIGITS)},
                {id: "ratio", name: message("euler_ode_readout_ratio"), value: significant(view.ratio, RATIO_DIGITS)},
            ],
            notes: [{id: "about", text: message("euler_ode_note")}],
            status: this.statuses(model, view),
            // The learner watches the polyline: every drawn node, the initial point among them, stays in view.
            must: view.visibleNodes.map(node => ({x: node.x, y: node.y})),
        };
    }

    /** The element a legend entry's `object` names, as the board holds it now. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const element = id === "field" || id === "polyline" || id === "exact" || id === "initial" ? this.drawn[id] : undefined;
        if (typeof element !== "object" || element === null || Array.isArray(element)) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const drawn = element as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(drawn.evalVisProp(id === "initial" ? "fillcolor" : "strokecolor")), visible: Boolean(drawn.evalVisProp("visible"))};
    }

    protected renderReadout(): React.ReactNode {
        const lines = this.functionPanel().status ?? [];
        return <>
            {this.renderDeclaredReadout()}
            <FunctionStatus className="euler-status" dataAttribute="euler-status" lines={lines.map(line => ({id: line.id, text: renderMessage(line.text)}))}/>
        </>;
    }

    /** A declared legend replaces the panel's own, so Orodja shows no second one. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }
}

export default EulerGraph;

/** Next step and Show all: a two-button group whose unavailable buttons stay focusable and say why (decision 56). */
function EulerRevealButtons(props: { nextReason: string | undefined; showAllReason: string | undefined; onNext: () => void; onShowAll: () => void }) {
    const [pressed, setPressed] = useState<"next-step" | "show-all">();
    const shown = pressed === "next-step" ? props.nextReason : pressed === "show-all" ? props.showAllReason : undefined;
    return <>
        <div className={CONTROL_ROW_FILL} role="group" aria-label={t("euler_ode_steps_controls")}>
            <UnavailableButton data-action="next-step" reason={props.nextReason} onPress={() => { setPressed(undefined); props.onNext(); }}
                               onBlockedPress={() => setPressed("next-step")}>{t("next_step")}</UnavailableButton>
            <UnavailableButton data-action="show-all" reason={props.showAllReason} onPress={() => { setPressed(undefined); props.onShowAll(); }}
                               onBlockedPress={() => setPressed("show-all")}>{t("euler_ode_show_all")}</UnavailableButton>
        </div>
        <div role="status" aria-live="polite">{shown && <p className="inspector-help" data-playback-reason={pressed}>{shown}</p>}</div>
    </>;
}
