import React from "react";
import BaseFunctionGraph, {BoundingBox, COMPACT_BOARD_WIDTH, DomainError, FillCurve} from "./BaseFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import {currentLanguage, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {INTERPOLATION_ERROR_GRID, INTERPOLATION_FUNCTION_IDS, NodeRule} from "../../analysis/interpolation";
import {
    changeRungeDegree, chebyshevAngle, chooseRungeFunction, chooseRungeNodeRule, DEFAULT_RUNGE_MODEL, RUNGE_DEGREE_MAX, RUNGE_DEGREE_MIN, RUNGE_NODE_RULES,
    RungeData, RungeEdit, RungeInterpolationModel, rungeData,
} from "../../analysis/rungeInterpolationModel";
import {rungeEditMessage, rungeFunctionName, rungeNumber} from "./rungeInterpolationMessages";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";

/** The default view (left, top, right, bottom): shows the n = 10 equispaced overshoot (about 1.96 near x = +-0.94) and the semicircle. */
const DEFAULT_VIEW: BoundingBox = [-1.25, 2.5, 1.25, -0.5];
/** At most this many nodes (degree 40 gives 41). */
const MAX_NODES = RUNGE_DEGREE_MAX + 1;
const ARC_POINTS = 121;
/** Above this grid maximum the cross would sit far outside the default view, so it is hidden; the readout still gives the value. */
const GRID_MAX_MARKER_LIMIT = DEFAULT_VIEW[1] * 4;

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

    override presetCollection() {
        return functionPresetCollections["interp-runge"];
    }

    protected defaultModel(): RungeInterpolationModel {
        return {...DEFAULT_RUNGE_MODEL};
    }

    protected defaultBoundingBox(): BoundingBox {
        return [...DEFAULT_VIEW];
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
        const curve = (attributes: object, fill: (c: FillCurve) => void) => {
            const c = this.own(board.create("curve", [[], []], {highlight: false, fixed: true, ...attributes})) as unknown as FillCurve;
            c.updateDataArray = () => fill(c);
            return c;
        };

        // The axes have unequal units, so the arc's height is scaled by unitX / unitY to look like a circle on screen. Only the
        // heights change: the projections x = cos(angle) stay exact. Recomputed on every board update, so zoom keeps the circle.
        const arcY = (angle: number) => Math.sin(angle) * board.unitX / board.unitY;

        // Layers, lowest first: the semicircle, f (faint), the error, p, the nodes, the grid maximum.
        curve({strokeColor: GraphPalette.label, strokeWidth: thin, dash: 1, visible: () => this.semicircleShown(model())}, c => {
            c.dataX = Array.from({length: ARC_POINTS}, (_, i) => Math.cos((Math.PI * i) / (ARC_POINTS - 1)));
            c.dataY = Array.from({length: ARC_POINTS}, (_, i) => arcY((Math.PI * i) / (ARC_POINTS - 1)));
        });
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
        });
        curve({strokeColor: GraphPalette.warningText, strokeWidth: thin, visible: () => model().showError}, c => {
            c.dataX = [...data().xs];
            c.dataY = [...data().error];
        });
        curve({strokeColor: GraphPalette.primaryCurve, strokeWidth}, c => {
            c.dataX = [...data().xs];
            c.dataY = [...data().p];
        });

        const markerSize = () => Math.max(4, this.displaySettings.pointSize * 0.9);
        const marker = (x: () => number, y: () => number, visible: () => boolean, attributes: object) => this.own(board.create("point", [x, y], {
            ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, size: markerSize, visible, ...attributes,
        }));
        for (let j = 0; j < MAX_NODES; j++) {
            marker(() => data().nodes[j] ?? 0, () => data().values[j] ?? 0, () => j <= model().degree, {
                fillColor: GraphPalette.primaryCurve, highlightFillColor: GraphPalette.primaryCurve, strokeColor: GraphPalette.primaryCurve,
            });
            marker(() => Math.cos(chebyshevAngle(model().degree, j)), () => arcY(chebyshevAngle(model().degree, j)), () => j <= model().degree && this.semicircleShown(model()), {
                fillColor: GraphPalette.label, highlightFillColor: GraphPalette.label, strokeColor: GraphPalette.label,
                size: () => Math.max(3, this.displaySettings.pointSize * 0.7),
            });
        }
        marker(() => data().gridMaxAt, () => data().gridMax, () => model().showError && data().gridMax <= GRID_MAX_MARKER_LIMIT, {
            face: "x", strokeColor: GraphPalette.warningText, highlightStrokeColor: GraphPalette.warningText, size: () => Math.max(5, this.displaySettings.pointSize * 1.2),
            strokeWidth: () => Math.max(2, this.displaySettings.strokeWidth * 0.9),
        });

        this.caption("top-left", [
            {text: () => t("interp_runge_board_title", {value0: model().degree, value1: this.ruleName(model().nodeRule)}), scale: 1.2},
            {text: () => `f: ${rungeFunctionName(model().functionId)}`},
            {text: () => t("interp_runge_board_max", {value0: rungeNumber(data().gridMax), value1: formatNumber(data().gridMaxAt, currentLanguage(), 4)}), color: GraphPalette.warningText},
            {text: () => t("interp_runge_board_key"), minBoardWidth: COMPACT_BOARD_WIDTH},
        ]);
    }

    protected override onSceneRemoved(): void {
        this.sampled = undefined;
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const state = this.model;
        const atMinimum = state.degree <= RUNGE_DEGREE_MIN;
        const atMaximum = state.degree >= RUNGE_DEGREE_MAX;
        const help = atMinimum ? t("interp_runge_degree_limit_min", {value0: RUNGE_DEGREE_MIN})
            : atMaximum ? t("interp_runge_degree_limit_max", {value0: RUNGE_DEGREE_MAX})
                : t("interp_runge_degree_help", {value0: RUNGE_DEGREE_MIN, value1: RUNGE_DEGREE_MAX});
        const semicircleAvailable = state.nodeRule === "chebyshev";
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("interp_runge_function_label")} value={state.functionId} help={t("interp_runge_function_help")}
                              options={INTERPOLATION_FUNCTION_IDS.map(id => ({value: id, text: rungeFunctionName(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setFunction(next))}/>
            </div>
            <div className="inspector-group">
                <div className="count-setter">
                    <div className="count-setter-label">{t("interp_runge_degree_label")}</div>
                    {/* aria-disabled, not disabled: a focused button that becomes unavailable at the end of the range must not drop keyboard focus. */}
                    <div className="count-setter-controls">
                        <button type="button" className="count-setter-button" data-action="degree-decrease" aria-disabled={atMinimum} aria-describedby="interp-runge-degree-help"
                                aria-label={t("interp_runge_degree_decrease")} onClick={() => { if (!atMinimum) this.ignoreOutOfDomain(() => this.setDegree(this.model.degree - 1)); }}>−</button>
                        <NumberInput label={t("interp_runge_degree_label")} hideLabel compact integer value={state.degree} min={RUNGE_DEGREE_MIN} max={RUNGE_DEGREE_MAX} step={1} decimals={0}
                                     rejectedHint={t("interp_runge_degree_rejected", {value0: RUNGE_DEGREE_MIN, value1: RUNGE_DEGREE_MAX})}
                                     onChange={next => this.ignoreOutOfDomain(() => this.setDegree(next))}/>
                        <button type="button" className="count-setter-button" data-action="degree-increase" aria-disabled={atMaximum} aria-describedby="interp-runge-degree-help"
                                aria-label={t("interp_runge_degree_increase")} onClick={() => { if (!atMaximum) this.ignoreOutOfDomain(() => this.setDegree(this.model.degree + 1)); }}>+</button>
                    </div>
                </div>
                <p id="interp-runge-degree-help" className="inspector-help">{help}</p>
            </div>
            <div className="inspector-group">
                <ChoiceSelect label={t("interp_runge_rule_label")} value={state.nodeRule} help={t("interp_runge_rule_help")}
                              options={RUNGE_NODE_RULES.map(rule => ({value: rule, text: this.ruleName(rule)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setNodeRule(next))}/>
            </div>
            <div className="inspector-group">
                <OnOffSwitch checked={state.showError} label={t("interp_runge_show_error")} onChange={checked => this.setShowError(checked)}/>
                <OnOffSwitch checked={state.showSemicircle} label={t("interp_runge_show_semicircle")} disabled={!semicircleAvailable}
                             describedBy="interp-runge-semicircle-help" onChange={checked => this.setShowSemicircle(checked)}/>
                <p id="interp-runge-semicircle-help" className="inspector-help">{t("interp_runge_semicircle_help")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "f", color: GraphPalette.comparisonCurve, label: t("interp_runge_legend_f"), kind: "line"},
            {id: "p", color: GraphPalette.primaryCurve, label: t("interp_runge_legend_p"), kind: "line"},
            {id: "nodes", color: GraphPalette.primaryCurve, label: t("interp_runge_legend_nodes"), kind: "ring"},
            {id: "error", color: GraphPalette.warningText, label: t("interp_runge_legend_error"), kind: "line"},
            {id: "max", color: GraphPalette.warningText, label: t("interp_runge_legend_max"), kind: "cross"},
            {id: "semicircle", color: GraphPalette.label, label: t("interp_runge_legend_semicircle"), kind: "dotted-line"},
        ]}/>;
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const data = this.dataOf(model);
        const rows = [
            {id: "function", label: t("interp_runge_readout_function"), value: rungeFunctionName(model.functionId)},
            {id: "degree", label: t("interp_runge_readout_degree"), value: String(model.degree)},
            {id: "nodes", label: t("interp_runge_readout_nodes"), value: String(model.degree + 1)},
            {id: "rule", label: t("interp_runge_readout_rule"), value: this.ruleName(model.nodeRule)},
            {id: "grid-max", label: t("interp_runge_readout_max"), value: rungeNumber(data.gridMax)},
            {id: "grid-max-at", label: t("interp_runge_readout_max_at"), value: formatNumber(data.gridMaxAt, currentLanguage(), 4)},
            {id: "grid", label: t("interp_runge_readout_grid"), value: String(INTERPOLATION_ERROR_GRID)},
        ];
        return <FunctionReadout title={t("function_readouts")} rows={rows} note={t("interp_runge_note")}/>;
    }
}

export default RungeInterpolationGraph;
