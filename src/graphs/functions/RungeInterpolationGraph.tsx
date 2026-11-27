import React from "react";
import BaseFunctionGraph, {BoundingBox, DomainError, FillCurve, FunctionPanel} from "./BaseFunctionGraph";
import type {GraphDeclaration} from "../base/declare/graphDeclaration";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {PuckOwned, PuckOwnedGroup} from "../base/controls/PuckOwnership";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {CountSetter} from "../../inputs/CountSetter";
import {guard, guardField} from "../base/controls/guard";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {message, messageNumber, t} from "../../localization";
import {INTERPOLATION_ERROR_GRID, INTERPOLATION_FUNCTION_IDS, interpolationFunction, NodeRule} from "../../analysis/interpolation";
import {
    changeRungeDegree, chebyshevAngle, chooseRungeFunction, chooseRungeNodeRule, DEFAULT_RUNGE_MODEL, RUNGE_DEGREE_MAX, RUNGE_DEGREE_MIN, RUNGE_NODE_RULES,
    RungeData, RungeEdit, RungeInterpolationModel, rungeData,
} from "../../analysis/rungeInterpolationModel";
import {rungeEditMessage, rungeFunctionMessage, rungeFunctionName, rungeNumber} from "./rungeInterpolationMessages";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {GraphPalette} from "../styles/GraphPalette";
import {rungePresetCollection} from "../curves/interpolation/collections";

/** The default view (left, top, right, bottom): shows the n = 10 equispaced overshoot (about 1.96 near x = +-0.94) and the semicircle. */
const DEFAULT_VIEW: BoundingBox = [-1.25, 2.5, 1.25, -0.5];
const RESIZE_SETTLE_MS = 150;
/** The semicircle's top may reach this y (the view top is 2.5), leaving a small margin for the marker. */
const ARC_TOP_LIMIT = 2.35;

/**
 * The view for a canvas of the given size. The semicircle is a true circle on screen, so its height in y units is unitX / unitY
 * = (width * yRange) / (height * xRange). Where the canvas is wide enough for that to pass ARC_TOP_LIMIT, the x range is widened
 * symmetrically about 0 (the y range stays); otherwise, or for an unknown size, it is the default view.
 */
export function rungeViewFor(width: number, height: number): BoundingBox {
    const [left, top, right, bottom] = DEFAULT_VIEW; // symmetric: left = -right
    if (!(width > 0) || !(height > 0)) return [...DEFAULT_VIEW];
    const half = Math.max(right, (width * (top - bottom)) / (height * ARC_TOP_LIMIT) / 2);
    return half === right ? [left, top, right, bottom] : [-half, top, half, bottom];
}
/** At most this many nodes (degree 40 gives 41). */
const MAX_NODES = RUNGE_DEGREE_MAX + 1;
const ARC_POINTS = 121;
/** Above this grid maximum the cross would sit far outside the default view, so it is hidden; the readout still gives the value. */
const GRID_MAX_MARKER_LIMIT = DEFAULT_VIEW[1] * 4;

/** The ids of the Runge declaration: the degree, the node rule and the function are pucks; the legend names the drawn objects. */
export type RungeIds = {
    param: "runge-degree" | "runge-rule" | "runge-function";
    row: "function" | "degree" | "nodes" | "rule" | "grid-max" | "grid-max-at" | "grid"; note: "grid-note";
    legend: "f" | "p" | "nodes" | "error" | "max" | "semicircle"; section: never; action: never;
};

/**
 * Runge's phenomenon (lesson I2): the interpolating polynomial p of f on [-1, 1] through n + 1 equispaced or Chebyshev nodes,
 * evaluated by the barycentric formula only, with the error |f - p| and its grid maximum. The model is
 * `{functionId, degree, nodeRule, showError, showSemicircle}` (`src/analysis/rungeInterpolationModel`); nodes are not draggable.
 * The 20001-point error sample is computed once per (functionId, degree, nodeRule) and not on a view change or a display switch.
 */
export class RungeInterpolationGraph extends BaseFunctionGraph<RungeInterpolationModel> {
    // Not the base `modelCache`: that keys on the whole model object and would sample again on a switch; this keys on three fields.
    private sampled?: { functionId: string; degree: number; nodeRule: NodeRule; data: RungeData };
    /** How many times the error sample was computed (an observation point for tests). */
    protected sampleRuns = 0;
    /** The elements the legend names, by the `object` id of their legend entry (`drawnObject`). */
    private readonly drawn = new Map<string, JXG.GeometryElement>();

    override presetCollection() {
        return rungePresetCollection;
    }

    protected defaultModel(): RungeInterpolationModel {
        return {...DEFAULT_RUNGE_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        const board = this.hasBoard ? this.board : undefined;
        const box = rungeViewFor(Number(board?.canvasWidth), Number(board?.canvasHeight));
        this.shownView = box;
        return [...box];
    }

    /** The box last chosen by this graph; a view still on it follows the board's size, a view the user moved is left alone. */
    private shownView?: BoundingBox;

    override initialize(): void {
        super.initialize();
        const session = this.graphSession;
        const container = this.hasBoard ? this.board.containerObj as HTMLElement | undefined : undefined;
        if (!session || !container || typeof ResizeObserver === "undefined") return;
        // The board follows a resize after a short delay of its own, so the view waits for the board's new size.
        let timer: ReturnType<typeof setTimeout> | undefined;
        const observer = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => this.reframeToSize(), RESIZE_SETTLE_MS);
        });
        observer.observe(container);
        session.registerCleanup(() => { clearTimeout(timer); observer.disconnect(); });
    }

    private reframeToSize(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive || !this.shownView) return;
        this.boardView.resizing(() => {
            const shown = this.shownView!;
            const current = this.board.getBoundingBox();
            if (!current.every((value, index) => Math.abs(value - shown[index]) <= 1e-6 * (1 + Math.abs(shown[index])))) return;
            const next = rungeViewFor(Number(this.board.canvasWidth), Number(this.board.canvasHeight));
            if (next.every((value, index) => value === shown[index])) return;
            this.shownView = next;
            this.boardView.setIntent([...next], {keepAspectRatio: false});
            this.board.update();
        });
    }

    protected override get equalAxisUnits(): boolean {
        return false;
    }

    private dataOf(model: RungeInterpolationModel): RungeData {
        const cached = this.sampled;
        if (!cached || cached.functionId !== model.functionId || cached.degree !== model.degree || cached.nodeRule !== model.nodeRule) {
            this.sampleRuns++;
            this.sampled = {functionId: model.functionId, degree: model.degree, nodeRule: model.nodeRule, data: rungeData(model.functionId, model.degree, model.nodeRule)};
        }
        return this.sampled!.data;
    }

    // ---- Model operations ----------------------------------------------------------------------------------------------

    private accepted(edit: RungeEdit): RungeInterpolationModel {
        if (!edit.ok) throw new DomainError(rungeEditMessage(edit.issue));
        return edit.model;
    }

    protected setFunction(value: unknown): void {
        const next = this.accepted(chooseRungeFunction(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setDegree(value: unknown): void {
        const next = this.accepted(changeRungeDegree(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setNodeRule(value: unknown): void {
        const next = this.accepted(chooseRungeNodeRule(this.model, value));
        if (next !== this.model) this.commitModel(next);
    }

    protected setShowError(value: boolean): void {
        this.commitModel({...this.model, showError: value});
    }

    protected setShowSemicircle(value: boolean): void {
        this.commitModel({...this.model, showSemicircle: value});
    }

    // ---- Lesson actions ------------------------------------------------------------------------------------------------

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("runge", action => {
            if (action.operation === "set-function") {
                this.setFunction(action.function);
            } else if (action.operation === "set-degree") {
                this.setDegree(action.value);
            } else if (action.operation === "set-rule") {
                this.setNodeRule(action.rule);
            } else if (action.operation === "set-overlay") {
                if (typeof action.visible !== "boolean") throw new Error("A runge set-overlay action needs a boolean visible.");
                if (action.overlay === "error") this.setShowError(action.visible);
                else if (action.overlay === "semicircle") this.setShowSemicircle(action.visible);
                else throw new Error('The overlay must be "error" or "semicircle".');
            } else {
                throw new Error("A runge action needs the operation set-function, set-degree, set-rule or set-overlay.");
            }
        });
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    private ruleName(rule: NodeRule): string {
        return rule === "chebyshev" ? t("interp_runge_rule_chebyshev") : t("interp_runge_rule_equispaced");
    }

    private semicircleShown(model: RungeInterpolationModel): boolean {
        return model.showSemicircle && model.nodeRule === "chebyshev";
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const data = () => this.dataOf(this.model);
        const strokeWidth = this.displayStrokeWidth;
        const thin = this.displayThinWidth(0.6);
        const curve = (attributes: object, fill: (c: FillCurve) => void, legendId?: string) => {
            const c = this.own(board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes})) as unknown as FillCurve;
            c.updateDataArray = () => fill(c);
            if (legendId) this.drawn.set(legendId, c as unknown as JXG.GeometryElement);
            return c;
        };

        // The axes have unequal units, so the arc's height is scaled by unitX / unitY to look like a circle on screen. Only the
        // heights change: the projections x = cos(angle) stay exact. Recomputed on every board update, so zoom keeps the circle.
        const arcY = (angle: number) => Math.sin(angle) * board.unitX / board.unitY;

        // Layers, lowest first: the semicircle, f (faint), the error, p, the nodes, the grid maximum.
        curve({strokeColor: GraphPalette.label, strokeWidth: thin, dash: 1, visible: () => this.semicircleShown(model())}, c => {
            c.dataX = Array.from({length: ARC_POINTS}, (_, i) => Math.cos((Math.PI * i) / (ARC_POINTS - 1)));
            c.dataY = Array.from({length: ARC_POINTS}, (_, i) => arcY((Math.PI * i) / (ARC_POINTS - 1)));
        }, "semicircle");
        curve({strokeColor: GraphPalette.label, strokeWidth: thin, dash: 2, visible: () => this.semicircleShown(model())}, c => {
            // vertical projections from the semicircle points to the axis, separated by NaN so that they are not joined
            const xs: number[] = [];
            const ys: number[] = [];
            if (this.semicircleShown(model())) {
                for (let j = 0; j <= model().degree; j++) {
                    const angle = chebyshevAngle(model().degree, j);
                    xs.push(Math.cos(angle), Math.cos(angle), NaN);
                    ys.push(arcY(angle), 0, NaN);
                }
            }
            c.dataX = xs;
            c.dataY = ys;
        });
        curve({strokeColor: GraphPalette.comparisonCurve, strokeWidth, strokeOpacity: 0.45}, c => {
            c.dataX = [...data().xs];
            c.dataY = [...data().f];
        }, "f");
        curve({strokeColor: GraphPalette.warningText, strokeWidth: thin, visible: () => model().showError}, c => {
            c.dataX = [...data().xs];
            c.dataY = [...data().error];
        }, "error");
        curve({strokeColor: GraphPalette.primaryCurve, strokeWidth}, c => {
            c.dataX = [...data().xs];
            c.dataY = [...data().p];
        }, "p");

        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);
        const marker = (x: () => number, y: () => number, visible: () => boolean, attributes: object, legendId?: string) => {
            const point = this.own(board.create("point", [x, y], {
                ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size: markerSize, visible, ...attributes,
            }));
            if (legendId) this.drawn.set(legendId, point as JXG.GeometryElement);
            return point;
        };
        for (let j = 0; j < MAX_NODES; j++) {
            marker(() => data().nodes[j] ?? 0, () => data().values[j] ?? 0, () => j <= model().degree, {
                fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve, strokeColor: GraphPalette.primaryCurve,
            }, j === 0 ? "nodes" : undefined);
            marker(() => Math.cos(chebyshevAngle(model().degree, j)), () => arcY(chebyshevAngle(model().degree, j)), () => j <= model().degree && this.semicircleShown(model()), {
                fillColor: GraphPalette.label, highlightFillColor: GraphPalette.label, strokeColor: GraphPalette.label,
                size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
            });
        }
        marker(() => data().gridMaxAt, () => data().gridMax, () => model().showError && data().gridMax <= GRID_MAX_MARKER_LIMIT, {
            name: "runge-grid-max", face: "x", strokeColor: GraphPalette.warningText, highlightStrokeColor: GraphPalette.warningText, size: () => Math.max(5, this.displaySettings.pointSize * 1.2),
            strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
        }, "max");
    }

    protected override onSceneRemoved(): void {
        this.sampled = undefined;
        this.drawn.clear();
    }

    /** Runs an inspector change: a refusal is kept as the visible notice, an accepted change clears it. */
    private guarded(action: () => void): boolean {
        return guard(this.refusals, action);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const semicircleAvailable = state.nodeRule === "chebyshev";
        return <>
            <PuckOwnedGroup params={["runge-degree"]} className="inspector-group">
                <PuckOwned param="runge-degree"><CountSetter label={t("interp_runge_degree_label")} n={state.degree} min={RUNGE_DEGREE_MIN} max={RUNGE_DEGREE_MAX}
                             help={t("interp_runge_degree_help", {value0: RUNGE_DEGREE_MIN, value1: RUNGE_DEGREE_MAX})}
                             rejectedHint={t("interp_runge_degree_rejected", {value0: RUNGE_DEGREE_MIN, value1: RUNGE_DEGREE_MAX})}
                             onPlus={() => this.guarded(() => this.setDegree(this.model.degree + 1))}
                             onMinus={() => this.guarded(() => this.setDegree(this.model.degree - 1))}
                             onSet={next => guardField(this.refusals, () => this.setDegree(next))}/></PuckOwned>
            </PuckOwnedGroup>
            <PuckOwnedGroup params={["runge-rule"]} className="inspector-group">
                <PuckOwned param="runge-rule"><ChoiceSelect label={t("interp_runge_rule_label")} value={state.nodeRule} help={t("interp_runge_rule_help")}
                              options={RUNGE_NODE_RULES.map(rule => ({value: rule, text: this.ruleName(rule)}))}
                              onChange={next => this.guarded(() => this.setNodeRule(next))}/></PuckOwned>
            </PuckOwnedGroup>
            <PuckOwnedGroup params={["runge-function"]} className="inspector-group">
                <PuckOwned param="runge-function"><ChoiceSelect label={t("interp_runge_function_label")} value={state.functionId} help={t("interp_runge_function_help")}
                              options={INTERPOLATION_FUNCTION_IDS.map(id => ({value: id, text: rungeFunctionName(id)}))}
                              onChange={next => this.guarded(() => this.setFunction(next))}/></PuckOwned>
            </PuckOwnedGroup>
            <div className="inspector-group">
                <OnOffSwitch checked={state.showError} label={t("interp_runge_show_error")} onChange={checked => this.setShowError(checked)}/>
                <OnOffSwitch checked={state.showSemicircle} label={t("interp_runge_show_semicircle")}
                             help={semicircleAvailable ? t("interp_runge_semicircle_help") : undefined}
                             unavailableReason={semicircleAvailable ? undefined : t("interp_runge_semicircle_help")}
                             onChange={checked => this.setShowSemicircle(checked)}/>
            </div>
        </>;
    }

    /** The legend is declared: the graph's own legend panel renders nothing. */
    protected override renderLegend(): React.ReactNode {
        return null;
    }

    // ---- Declaration (task 08) ---------------------------------------------------------------------------------------

    /** Parameter writes (ADR 0064): the setters validate and refuse with a `DomainError`. */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            "runge-degree": {read: () => this.model.degree, apply: (value: unknown) => this.setDegree(value)},
            "runge-rule": {read: () => this.model.nodeRule, apply: (value: unknown) => this.setNodeRule(value)},
            "runge-function": {read: () => this.model.functionId, apply: (value: unknown) => this.setFunction(value)},
        };
    }

    /**
     * The common declaration (rows, note, view marks) plus the degree (count), the node rule and the function (choice pucks) and the legend of
     * the drawn objects. The two display switches stay in Orodja: the lesson scenes set them, no step asks the learner to flip them.
     */
    protected override declaration(): GraphDeclaration {
        return {
            ...this.commonDeclaration(),
            parameters: [
                {key: "runge-degree", kind: "count", label: message("interp_runge_degree_label"), symbol: "n", placement: "board",
                    help: message("interp_runge_degree_help", {value0: RUNGE_DEGREE_MIN, value1: RUNGE_DEGREE_MAX}), min: RUNGE_DEGREE_MIN, max: RUNGE_DEGREE_MAX},
                {key: "runge-rule", kind: "choice", label: message("interp_runge_rule_name"), help: message("interp_runge_rule_help"), placement: "board", puck: true, options: [
                    {value: "equispaced", label: message("interp_runge_rule_equispaced"), short: message("interp_runge_rule_equispaced_short")},
                    {value: "chebyshev", label: message("interp_runge_rule_chebyshev"), short: message("interp_runge_rule_chebyshev_short")},
                ]},
                {key: "runge-function", kind: "choice", label: message("interp_runge_function_label"), help: message("interp_runge_function_help"), placement: "board", puck: true, options: [
                    {value: "runge", label: message("interp_runge_function_runge"), short: message("interp_runge_function_runge_short")},
                    {value: "abs", label: message("interp_runge_function_abs")},
                    {value: "sine", label: message("interp_runge_function_sine")},
                ]},
            ],
            legend: [
                {id: "f", label: message("interp_runge_legend_f"), kind: "line", object: "f"},
                {id: "p", label: message("interp_runge_legend_p"), kind: "line", object: "p"},
                {id: "nodes", label: message("interp_runge_legend_nodes"), kind: "ring", object: "nodes"},
                {id: "error", label: message("interp_runge_legend_error"), kind: "line", object: "error"},
                {id: "max", label: message("interp_runge_legend_max"), kind: "cross", object: "max"},
                {id: "semicircle", label: message("interp_runge_legend_semicircle"), kind: "dashed", object: "semicircle"},
            ],
        };
    }

    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const drawn = this.drawn.get(id);
        if (!drawn) return undefined;
        // JSXGraph 1.14 has `evalVisProp` (it resolves function-valued attributes) but its typings do not declare it.
        const element = drawn as JXG.GeometryElement & {evalVisProp(name: string): unknown};
        return {color: String(element.evalVisProp("strokecolor")), visible: Boolean(element.evalVisProp("visible"))};
    }

    /** The readout rows and the grid-maximum note, as declared data; the readout panel is drawn from the same data. */
    protected override functionPanel(): FunctionPanel {
        const model = this.model;
        const data = this.dataOf(model);
        const f = interpolationFunction(model.functionId);
        return {
            rows: [
                {id: "function", name: message("interp_runge_readout_function"), value: rungeFunctionMessage(model.functionId)},
                {id: "degree", name: message("interp_runge_readout_degree"), value: messageNumber(model.degree, 0)},
                {id: "nodes", name: message("interp_runge_readout_nodes"), value: messageNumber(model.degree + 1, 0)},
                {id: "rule", name: message("interp_runge_readout_rule"), value: message(model.nodeRule === "chebyshev" ? "interp_runge_rule_chebyshev" : "interp_runge_rule_equispaced")},
                {id: "grid-max", name: message("interp_runge_readout_max"), value: {kind: "formatted", text: rungeNumber(data.gridMax)}},
                {id: "grid-max-at", name: message("interp_runge_readout_max_at"), value: messageNumber(data.gridMaxAt, 4)},
                {id: "grid", name: message("interp_runge_readout_grid"), value: messageNumber(INTERPOLATION_ERROR_GRID, 0)},
            ],
            notes: [{id: "grid-note", text: message("interp_runge_note")}],
            // the function over the interval and its ends: the view keeps the interpolation interval and the unit height in sight
            plotted: f,
            // the cross of the grid maximum is a mark while it is drawn (error shown, inside the default view)
            must: [{x: -1, y: f(-1)}, {x: 1, y: f(1)}, {x: 0, y: f(0)},
                ...(model.showError && data.gridMax <= GRID_MAX_MARKER_LIMIT ? [{x: data.gridMaxAt, y: data.gridMax}] : [])],
        };
    }

    protected renderReadout(): React.ReactNode {
        return this.renderDeclaredReadout();
    }
}

export default RungeInterpolationGraph;
