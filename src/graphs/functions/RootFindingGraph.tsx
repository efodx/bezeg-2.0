import React from "react";
import {DomainError, FunctionLessonActions} from "./BaseFunctionGraph";
import IterativeFunctionGraph from "./IterativeFunctionGraph";
import {FunctionLegend, FunctionReadout} from "./FunctionReadout";
import {FunctionStatus} from "./FunctionStatus";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, message, Message, t} from "../../localization";
import {NumberLanguage} from "../../analysis/format";
import {
    ROOT_FINDING_EXAMPLE_IDS, ROOT_FINDING_MAX_STEPS, ROOT_START_MAX, ROOT_START_MIN, rootFindingExample, RootFindingExampleId, RootFindingHistory,
    RootFindingTermination,
} from "../../analysis/rootFinding";
import {
    chooseRootFindingExample, chooseRootFindingMethod, DEFAULT_ROOT_FINDING_MODEL, moveRootFindingStart, ROOT_FINDING_METHODS, RootFindingMethod,
    RootFindingModel, rootFindingHistoryOf, RootFindingStart,
} from "../../analysis/rootFindingModel";
import {rootFindingEditMessage} from "./rootFindingMessages";
import {formatPrecise} from "./BisectionGraph";
import {IterationOutcome} from "../../learning/runtime/iterationController";
import {GraphPalette} from "../styles/GraphPalette";
import {functionPresetCollections} from "./functionPresetCollections";
import {PlaybackButtons, playbackBlocks} from "../base/controls/PlaybackButtons";
import {ReadoutHelp} from "../base/controls/ReadoutParts";

/** Time between two playback steps: one step per interval, never more than one per frame (ADR 0012), as for bisection. */
export const ROOT_FINDING_STEP_INTERVAL_MS = 600;

/** The number of iterates the table lists at most (the last ones); the readout rows always describe the last iterate. */
export const ROOT_FINDING_TABLE_ROWS = 10;

/** Drag grid of the start points. */
const START_DRAG_STEP = 0.05;

/** The formulas as they are written on the board and in the example selector. */
const PRETTY_FORMULA: Readonly<Record<RootFindingExampleId, string>> = {
    "square-minus-two": "x² − 2",
    "cubic-two-cycle": "x³ − 2x + 2",
    "cubic-three-roots": "x³ − x",
};

const exampleTitle = (id: RootFindingExampleId): string => `f(x) = ${PRETTY_FORMULA[id]}`;
const methodTitle = (method: RootFindingMethod): string => method === "newton" ? t("root_finding_method_newton") : t("root_finding_method_secant");

type StatusKind = "ready" | "running" | Exclude<RootFindingTermination, "running">;

/** One plotted line segment of the last step: from a graph point to where the tangent or secant meets the x-axis (or the second graph point). */
interface LineSegment {
    from: { x: number; y: number };
    to: { x: number; y: number };
}

interface View {
    history: RootFindingHistory;
    /** The last iterate and its function value. */
    last: number;
    fLast: number;
    /** The tangent or secant of the last step; absent before the first Newton step. */
    line?: LineSegment;
}

/**
 * Newton's and the secant method on a named example, one revealed step at a time (numerical methods lessons N1 to N3). The model
 * is `{method, example, x0, x1, step}`: `step` is the number of revealed steps and the history is recomputed from the other fields
 * (`src/analysis/rootFinding`), never stored. Next step and playback run the same transition. Editing the method, the example or a
 * start resets the step to 0 and pauses; so does anything that replaces the scene, exports a figure or unmounts the graph. A
 * reopened preset is paused at its stored step.
 */
export class RootFindingGraph extends IterativeFunctionGraph<RootFindingModel> {
    /** A derived value keyed by the identity of the model it was computed from; it can never be stale. */
    private readonly historyOf = this.modelCache(rootFindingHistoryOf);
    private startPoints: Partial<Record<RootFindingStart, JXG.Point>> = {};

    override presetCollection() {
        return functionPresetCollections["root-finding"];
    }

    protected defaultModel(): RootFindingModel {
        return {...DEFAULT_ROOT_FINDING_MODEL};
    }

    protected defaultBoundingBox(): [number, number, number, number] {
        return [-2.5, 4, 3.5, -3];
    }

    // ---- Iteration -----------------------------------------------------------------------------------------------

    protected animationId(): string {
        return "root-finding";
    }

    protected stepIntervalMs(): number {
        return ROOT_FINDING_STEP_INTERVAL_MS;
    }

    protected iterationIndex(model: RootFindingModel): number {
        return model.step;
    }

    protected override normalizeIterationModel(model: RootFindingModel): RootFindingModel {
        return this.normalized(model);
    }

    protected cannotAdvanceMessage(): Message {
        return message("root_finding_cannot_advance");
    }

    private viewOf(model: RootFindingModel): View {
        const history = this.historyOf(model);
        const {iterates, example, stepsTaken: taken} = history;
        const last = iterates[iterates.length - 1];
        const value = example.value;
        let line: LineSegment | undefined;
        if (taken >= 1) {
            line = {from: {x: iterates[taken - 1], y: value(iterates[taken - 1])}, to: {x: last, y: 0}};
        } else if (model.method === "secant") {
            // Before the first secant step only the line through the two starts is shown; its x-intercept is the prediction.
            line = {from: {x: iterates[0], y: value(iterates[0])}, to: {x: iterates[1], y: value(iterates[1])}};
        }
        return {history, last, fLast: value(last), line};
    }

    /** The model with `step` cut to the steps the history can take (a stored step may lie beyond a termination). */
    private normalized(model: RootFindingModel): RootFindingModel {
        const taken = rootFindingHistoryOf(model).stepsTaken;
        return taken === model.step ? model : {...model, step: taken};
    }

    protected canAdvance(model: RootFindingModel = this.model): boolean {
        return this.historyOf(model).termination === "running";
    }

    /** The one mathematical transition of the iteration: Next step and every playback step run it. */
    protected transition(): IterationOutcome {
        if (!this.canAdvance()) return "complete";
        const next = rootFindingHistoryOf({...this.model, step: this.model.step + 1});
        this.commitModel({...this.model, step: next.stepsTaken});
        return next.termination === "running" ? "continue" : "complete";
    }

    /** Back to step 0 of the same method, example and starts; playback stops. */
    protected resetIteration(): void {
        this.replaceModel({...this.model, step: 0});
    }

    // ---- Model operations (read and write the synchronous model) ------------------------------

    protected setMethod(value: unknown): void {
        const edit = chooseRootFindingMethod(this.model, value);
        if (!edit.ok) throw new DomainError(rootFindingEditMessage(edit.issue));
        if (edit.model !== this.model) this.replaceModel(edit.model);
    }

    protected setExample(value: unknown): void {
        const edit = chooseRootFindingExample(this.model, value);
        if (!edit.ok) throw new DomainError(rootFindingEditMessage(edit.issue));
        this.replaceModel(edit.model);
    }

    protected setStart(start: RootFindingStart, value: number): void {
        const edit = moveRootFindingStart(this.model, start, value);
        if (!edit.ok) throw new DomainError(rootFindingEditMessage(edit.issue));
        if (edit.model !== this.model) this.replaceModel(edit.model);
    }

    protected override lessonFunctionActions(): FunctionLessonActions {
        return {
            parameters: {"root-x0": value => this.setStart("x0", value), "root-x1": value => this.setStart("x1", value)},
            choices: {"root-finding-example": value => this.setExample(value), "root-finding-method": value => this.setMethod(value)},
        };
    }

    protected override syncSceneToModel(): void {
        this.startPoints.x0?.moveTo([this.model.x0, 0]);
        this.startPoints.x1?.moveTo([this.model.x1, 0]);
    }

    protected override onSceneRemoved(): void {
        this.startPoints = {};
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    /** The short status line of the board, or undefined while the iteration runs. */
    private boardStatus(model: RootFindingModel, language: NumberLanguage): { text: string; ok: boolean } | undefined {
        const {history, last} = this.viewOf(model);
        switch (history.termination) {
            case "root-found": return {text: t("root_finding_board_root_found", {value0: formatPrecise(last, language)}), ok: true};
            case "flat-tangent": return {text: t("root_finding_board_flat_tangent"), ok: false};
            case "flat-secant": return {text: t("root_finding_board_flat_secant"), ok: false};
            case "repeated-iterate": return {text: t("root_finding_board_repeated"), ok: false};
            case "non-finite": return {text: t("root_finding_board_non_finite"), ok: false};
            case "step-cap": return {text: t("root_finding_board_cap"), ok: false};
            case "running": return undefined;
        }
    }

    private errorOf(model: RootFindingModel, x: number): number {
        return Math.abs(x - rootFindingExample(model.example).referenceRoot);
    }

    protected createScene(): void {
        const board = this.board;
        const model = () => this.model;
        const view = () => this.viewOf(this.model);
        const example = () => rootFindingExample(this.model.example);
        const language = () => currentLanguage();
        const strokeWidth = () => this.displaySettings.strokeWidth;
        const thick = () => Math.max(3, this.displaySettings.strokeWidth * 2);
        const hasLine = () => view().line !== undefined;
        const secant = () => this.model.method === "secant";

        this.own(board.create("functiongraph", [(x: number) => example().value(x)], {
            strokeColor: GraphPalette.primaryCurve, highlight: false, fixed: true, strokeWidth,
        }));

        // The tangent or secant of the last step, as a segment from its graph point to the x-axis.
        this.own(board.create("segment", [[() => view().line?.from.x ?? 0, () => view().line?.from.y ?? 0], [() => view().line?.to.x ?? 0, () => view().line?.to.y ?? 0]], {
            strokeColor: GraphPalette.constructionAccent, strokeWidth: thick, highlight: false, fixed: true, withLabel: false, visible: hasLine,
        }));
        // Drop line from the last iterate on the axis to its function value.
        this.own(board.create("segment", [[() => view().last, 0], [() => view().last, () => view().fLast]], {
            strokeColor: GraphPalette.referenceCurve, dash: 2, strokeWidth: () => Math.max(1, this.displaySettings.strokeWidth * 0.7),
            highlight: false, fixed: true, withLabel: false,
        }));
        const marker = (x: () => number, y: () => number, color: string, visible: () => boolean = () => true) =>
            this.own(board.create("point", [x, y], {
                ...this.styles.point.fixed, name: "", withLabel: false, highlight: false, fillColor: color, highlightFillColor: color,
                size: () => Math.max(3, this.displaySettings.pointSize * 0.7), visible,
            }));
        marker(() => view().last, () => view().fLast, GraphPalette.constructionAccent);
        marker(() => view().last, () => 0, GraphPalette.constructionAccent);
        marker(() => view().line?.from.x ?? 0, () => view().line?.from.y ?? 0, GraphPalette.comparisonCurve, hasLine);

        // The starts: draggable points on the x-axis. x1 exists for the secant method only.
        const start = (which: RootFindingStart, name: string, placement: "below-left" | "below-right", visible: () => boolean) => {
            const point = this.axisPoint({
                x: this.model[which], name, placement, color: GraphPalette.comparisonCurve, min: ROOT_START_MIN, max: ROOT_START_MAX, step: START_DRAG_STEP,
                write: x => this.setStart(which, x),
            });
            point.setAttribute({visible});
            this.startPoints[which] = point;
        };
        start("x0", "$$x_0$$", "below-left", () => true);
        start("x1", "$$x_1$$", "below-right", secant);

        this.caption("bottom-right", [
            {text: () => exampleTitle(model().example), scale: 1.2, math: true},
            {text: () => t("root_finding_board_progress", {value0: model().step, value1: formatPrecise(this.errorOf(model(), view().last), language())})},
            {
                text: () => this.boardStatus(model(), language())?.text ?? "",
                visible: () => this.boardStatus(model(), language()) !== undefined,
                color: () => this.boardStatus(model(), language())?.ok ? GraphPalette.primaryCurve : GraphPalette.warningText,
            },
        ]);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    protected renderControls(): React.ReactNode {
        const {method, example, x0, x1, step} = this.model;
        const history = this.historyOf(this.model);
        const playing = this.playback.isPlaying;
        const canAdvance = history.termination === "running";
        return <>
            <div className="inspector-group">
                <ChoiceSelect label={t("root_finding_method_label")} value={method} help={t("root_finding_method_help")}
                              options={ROOT_FINDING_METHODS.map(id => ({value: id, text: methodTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setMethod(next))}/>
                <ChoiceSelect label={t("root_finding_example_label")} value={example} help={t("root_finding_example_help")}
                              options={ROOT_FINDING_EXAMPLE_IDS.map(id => ({value: id, text: exampleTitle(id)}))}
                              onChange={next => this.ignoreOutOfDomain(() => this.setExample(next))}/>
            </div>
            <div className="inspector-group">
                <NumberInput label={t("root_finding_x0_label")} value={x0} min={ROOT_START_MIN} max={ROOT_START_MAX} step={0.1} decimals={9}
                             rejectedHint={t("root_finding_x0_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setStart("x0", next))}/>
                {method === "secant" && <NumberInput label={t("root_finding_x1_label")} value={x1} min={ROOT_START_MIN} max={ROOT_START_MAX} step={0.1} decimals={9}
                             rejectedHint={t("root_finding_x1_rejected_hint")} onChange={next => this.ignoreOutOfDomain(() => this.setStart("x1", next))}/>}
                <p className="inspector-help">{t("root_finding_starts_help")}</p>
            </div>
            <div className="inspector-group">
                <PlaybackButtons groupLabel={t("root_finding_iteration_controls")} nextLabel={t("next_step")} resetLabel={t("root_finding_reset")} playing={playing}
                                 onNext={() => this.ignoreOutOfDomain(() => this.nextStep())}
                                 onPlayPause={() => { if (playing) this.pauseIteration(); else this.play(); }} onReset={() => this.resetIteration()}
                                 {...playbackBlocks({atStart: step === 0, atEnd: !canAdvance, playing})}/>
                <p className="inspector-help">{t("root_finding_playback_note")}</p>
            </div>
        </>;
    }

    protected override renderLegend(): React.ReactNode {
        return <FunctionLegend items={[
            {id: "function", color: GraphPalette.primaryCurve, label: t("root_finding_legend_function"), kind: "line"},
            {id: "line", color: GraphPalette.constructionAccent, label: t("root_finding_legend_line"), kind: "line"},
            {id: "iterate", color: GraphPalette.constructionAccent, label: t("root_finding_legend_iterate"), kind: "dot"},
            {id: "start", color: GraphPalette.comparisonCurve, label: t("root_finding_legend_start"), kind: "dot"},
        ]}/>;
    }

    /** The status to state in words, with a stable id for tests and for assistive technology. */
    private status(model: RootFindingModel, language: NumberLanguage): { id: StatusKind; text: string } {
        const {history, last} = this.viewOf(model);
        const newton = model.method === "newton";
        switch (history.termination) {
            case "running":
                return history.stepsTaken === 0
                    ? {id: "ready", text: t(newton ? "root_finding_status_ready_newton" : "root_finding_status_ready_secant")}
                    : {id: "running", text: t(newton ? "root_finding_status_running_newton" : "root_finding_status_running_secant")};
            case "root-found": return {id: "root-found", text: t("root_finding_status_root_found", {value0: formatPrecise(last, language)})};
            case "flat-tangent": return {id: "flat-tangent", text: t("root_finding_status_flat_tangent")};
            case "flat-secant": return {id: "flat-secant", text: t("root_finding_status_flat_secant")};
            case "repeated-iterate": return {id: "repeated-iterate", text: t("root_finding_status_repeated")};
            case "non-finite": return {id: "non-finite", text: t("root_finding_status_non_finite")};
            case "step-cap": return {id: "step-cap", text: t("root_finding_status_cap", {value0: ROOT_FINDING_MAX_STEPS})};
        }
    }

    protected renderReadout(): React.ReactNode {
        const model = this.model;
        const language = currentLanguage();
        const {history, last, fLast} = this.viewOf(model);
        const reference = rootFindingExample(model.example).referenceRoot;
        const number = (value: number) => formatPrecise(value, language);
        const rows = [
            {id: "step", label: t("root_finding_readout_step", {value0: ROOT_FINDING_MAX_STEPS}), value: String(history.stepsTaken)},
            {id: "iterate", label: t("root_finding_readout_iterate"), value: number(last)},
            {id: "f-iterate", label: t("root_finding_readout_value"), value: number(fLast)},
            {id: "error", label: t("root_finding_readout_error"), value: number(this.errorOf(model, last))},
            {id: "reference", label: t("root_finding_readout_reference"), value: number(reference)},
        ];
        const all = history.iterates;
        const first = Math.max(0, all.length - ROOT_FINDING_TABLE_ROWS);
        const status = this.status(model, language);
        return <>
            <FunctionReadout title={t("function_readouts")} rows={rows} note={t("root_finding_note", {value0: number(reference)})}/>
            <div className="inspector-group function-readout root-finding-table">
                <h3>{t("root_finding_table_title")}</h3>
                <table aria-label={t("root_finding_table_title")}>
                    <thead><tr>
                        <th scope="col">{t("root_finding_table_index")}</th><th scope="col">{t("root_finding_table_x")}</th>
                        <th scope="col">{t("root_finding_table_value")}</th><th scope="col">{t("root_finding_table_error")}</th>
                    </tr></thead>
                    <tbody>
                        {all.slice(first).map((x, offset) => <tr key={first + offset} data-iterate-row={first + offset}>
                            <th scope="row">{first + offset}</th><td>{number(x)}</td><td>{number(history.example.value(x))}</td><td>{number(this.errorOf(model, x))}</td>
                        </tr>)}
                    </tbody>
                </table>
                {first > 0 && <ReadoutHelp>{t("root_finding_table_truncated", {value0: ROOT_FINDING_TABLE_ROWS})}</ReadoutHelp>}
            </div>
            <FunctionStatus className="bisection-status" dataAttribute="root-finding-status" lines={[status]} muted={this.playback.isPlaying}/>
        </>;
    }
}

export default RootFindingGraph;
